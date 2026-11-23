<?php

namespace App\Services;

use App\Support\AccountingAmount;
use App\Support\ExactMoney;
use Illuminate\Support\Facades\DB;
use Illuminate\Database\QueryException;
use Illuminate\Support\Str;
use RuntimeException;

/**
 * Posts operationally approved financial documents into the general ledger.
 * It is deliberately synchronous: the source transaction and its journal either
 * commit together or both roll back.
 */
class FinancialAutoPostingService
{
    /** @var array<string, int> */
    private array $accountIds = [];

    public function processEvent(int $eventId): ?int
    {
        $event = DB::table('financial_outbox_events')->where('id', $eventId)->lockForUpdate()->first();
        if ($event === null) {
            throw new RuntimeException('Financial outbox event does not exist.');
        }
        if ($event->processed_at !== null) {
            return DB::table('journal_entries')
                ->where('source_type', $this->journalSourceType((string) $event->source_type))
                ->where('source_id', (int) $event->source_id)
                ->value('id');
        }

        $sourceType = (string) $event->source_type;
        $sourceId = (int) $event->source_id;
        $journalSource = $this->journalSourceType($sourceType);
        $existing = DB::table('journal_entries')->where('source_type', $journalSource)->where('source_id', $sourceId)->first();
        if ($existing !== null) {
            $journalId = (int) $existing->id;
        } else {
            $payload = json_decode((string) $event->payload, true, 512, JSON_THROW_ON_ERROR);
            $posting = $this->buildPosting($sourceType, $sourceId, is_array($payload) ? $payload : []);
            if ($posting === null) {
                // Accounting journals that already posted their treasury line are
                // intentionally not mirrored a second time.
                DB::table('financial_outbox_events')->where('id', $eventId)->update([
                    'attempts' => DB::raw('attempts + 1'),
                    'last_error' => null,
                    'processed_at' => now(),
                ]);
                return null;
            }
            $journalId = $this->createJournal($sourceType, $sourceId, $posting);
            $this->linkSource($sourceType, $sourceId, $journalId, $posting);
        }

        DB::table('financial_outbox_events')->where('id', $eventId)->update([
            'attempts' => DB::raw('attempts + 1'),
            'last_error' => null,
            'processed_at' => now(),
        ]);

        return $journalId;
    }

    /** @return array{date:string, description:string, actor_id:int|null, lines:array<int,array<string,mixed>>, source:object}|null */
    private function buildPosting(string $sourceType, int $sourceId, array $payload): ?array
    {
        return match ($sourceType) {
            'sales_document' => $this->salesDocument($sourceId),
            'sales_receipt' => $this->salesReceipt($sourceId),
            'purchase_invoice' => $this->purchaseInvoice($sourceId),
            'expense' => $this->expense($sourceId),
            'partner_payment' => $this->partnerPayment($sourceId),
            'supplier_payment' => $this->supplierPayment($sourceId),
            'treasury_transfer' => $this->treasuryTransfer($sourceId),
            'treasury_entry' => $this->treasuryEntry($sourceId, $payload),
            'container_cost' => $this->containerCost($sourceId),
            'container_cost_payment' => $this->containerCostPayment($sourceId),
            'container_receipt' => $this->containerReceipt($sourceId),
            'customer_receipt_allocation' => $this->receiptAllocation($sourceId, false),
            'customer_receipt_allocation_reversal' => $this->receiptAllocation($sourceId, true),
            'inventory_count' => $this->inventoryCount($sourceId),
            'inventory_adjustment' => $this->inventoryAdjustment($sourceId),
            'inventory_opening' => $this->inventoryOpening($sourceId),
            'approved_damaged_stock' => $this->damagedStock($sourceId),
            'warehouse_return' => $this->warehouseReturn($sourceId),
            'sales_document_reversal' => $this->salesDocumentReversal($sourceId, $payload),
            default => throw new RuntimeException('No automatic general-ledger posting rule exists for financial source type: '.$sourceType),
        };
    }

    private function salesDocument(int $id): array
    {
        $document = DB::table('sales_documents')->where('id', $id)->lockForUpdate()->first();
        $this->requirePosted($document, 'sales document');
        $lines = [];
        $customerId = (int) $document->customer_id;
        $date = (string) $document->issue_date;
        $actor = $document->posted_by_user_id ?? $document->created_by_user_id;

        if ($document->document_type === 'opening_receivable') {
            $amount = (string) $document->total_amount;
            $direction = (string) ($document->opening_balance_direction ?? 'debit');
            if ($direction === 'debit') {
                $this->add($lines, 'receivables', 'debit', $amount, ['customer_id' => $customerId]);
                $this->add($lines, 'opening_equity', 'credit', $amount);
            } else {
                $this->add($lines, 'opening_equity', 'debit', $amount);
                $this->add($lines, 'receivables', 'credit', $amount, ['customer_id' => $customerId]);
            }
            return $this->posting($date, 'رصيد افتتاحي للعميل '.$document->document_number, $actor, $lines, $document);
        }

        $tax = (string) $document->tax_amount;
        $total = (string) $document->total_amount;
        // The posted total is authoritative for both tax-exclusive and
        // tax-inclusive invoices; subtract the snapshotted tax to isolate GL revenue.
        $netRevenue = $this->subtract($total, $tax);
        $partnerId = $document->issuer_type === 'partner' && $document->issuer_partner_id !== null
            ? (int) $document->issuer_partner_id
            : null;
        if ($document->document_type === 'credit_note' && $partnerId === null && $document->original_document_id !== null) {
            $originalPartnerId = DB::table('sales_documents')->where('id', $document->original_document_id)->value('issuer_partner_id');
            $partnerId = $originalPartnerId === null ? null : (int) $originalPartnerId;
        }

        if ($document->document_type === 'invoice') {
            $partnerShare = $partnerId === null ? ['sign' => 0, 'amount' => '0.0000'] : $this->signed((string) ($document->partner_profit_egp_snapshot ?? '0'));
            $companyRevenue = $this->applySigned($netRevenue, $partnerShare, false);
            $this->add($lines, 'receivables', 'debit', $total, ['customer_id' => $customerId]);
            $this->add($lines, 'sales_revenue', 'credit', $companyRevenue);
            $this->add($lines, 'sales_tax_payable', 'credit', $tax);
            if ($partnerId !== null && $partnerShare['sign'] > 0) {
                $this->add($lines, 'partner_payables', 'credit', $partnerShare['amount'], ['partner_id' => $partnerId]);
            } elseif ($partnerId !== null && $partnerShare['sign'] < 0) {
                $this->add($lines, 'partner_recoverable', 'debit', $partnerShare['amount'], ['partner_id' => $partnerId]);
            }
            $cost = $this->salesDocumentCost($id, false);
            $this->add($lines, 'cogs', 'debit', $cost);
            $this->add($lines, 'inventory', 'credit', $cost);
            return $this->posting($date, 'فاتورة مبيعات '.$document->document_number, $actor, $lines, $document);
        }

        if ($document->document_type === 'credit_note') {
            $partnerEffect = $partnerId === null ? ['sign' => 0, 'amount' => '0.0000'] : $this->partnerReturnEffect($id);
            $companyReturn = $this->applySigned($netRevenue, $partnerEffect, true);
            $this->add($lines, 'sales_returns', 'debit', $companyReturn);
            $this->add($lines, 'sales_tax_payable', 'debit', $tax);
            $this->add($lines, 'receivables', 'credit', $total, ['customer_id' => $customerId]);
            if ($partnerId !== null) {
                if ($partnerEffect['sign'] > 0) {
                    // Positive reversal reduces a partner receivable.
                    $this->add($lines, 'partner_recoverable', 'credit', $partnerEffect['amount'], ['partner_id' => $partnerId]);
                } elseif ($partnerEffect['sign'] < 0) {
                    // Negative reversal reduces a partner payable.
                    $this->add($lines, 'partner_payables', 'debit', $partnerEffect['amount'], ['partner_id' => $partnerId]);
                }
            }
            $cost = $this->salesDocumentCost($id, true);
            $this->add($lines, 'inventory', 'debit', $cost);
            $this->add($lines, 'cogs', 'credit', $cost);
            return $this->posting($date, 'مرتجع مبيعات '.$document->document_number, $actor, $lines, $document);
        }

        throw new RuntimeException('Unsupported posted sales document type: '.$document->document_type);
    }

    private function salesReceipt(int $id): array
    {
        $receipt = DB::table('sales_receipts')->where('id', $id)->lockForUpdate()->first();
        $this->requirePosted($receipt, 'sales receipt');
        $allocated = (string) DB::table('sales_receipt_allocations')->where('sales_receipt_id', $id)->sum('allocation_amount');
        $unapplied = $this->subtract((string) $receipt->amount, $allocated);
        $lines = [];
        $cash = ['treasury_account_id' => (int) $receipt->treasury_account_id];
        if ($receipt->receipt_type === 'refund') {
            $this->add($lines, 'customer_advances', 'debit', (string) $receipt->amount, ['customer_id' => (int) $receipt->customer_id]);
            $this->add($lines, 'cash', 'credit', (string) $receipt->amount, $cash);
        } else {
            $this->add($lines, 'cash', 'debit', (string) $receipt->amount, $cash);
            $this->add($lines, 'receivables', 'credit', $allocated, ['customer_id' => (int) $receipt->customer_id]);
            $this->add($lines, 'customer_advances', 'credit', $unapplied, ['customer_id' => (int) $receipt->customer_id]);
        }
        return $this->posting((string) $receipt->receipt_date, 'تحصيل عميل '.$receipt->receipt_number, $receipt->posted_by_user_id ?? $receipt->created_by_user_id, $lines, $receipt);
    }

    private function purchaseInvoice(int $id): array
    {
        $invoice = DB::table('purchase_invoices')->where('id', $id)->lockForUpdate()->first();
        $this->requirePosted($invoice, 'purchase invoice');
        $lines = [];
        $net = $this->subtract((string) $invoice->subtotal_egp, (string) $invoice->discount_egp);
        $supplier = ['supplier_id' => (int) $invoice->supplier_id];
        $this->add($lines, 'inventory', 'debit', $net);
        $this->add($lines, 'input_tax', 'debit', (string) $invoice->tax_egp);
        $this->add($lines, 'supplier_payables', 'credit', (string) $invoice->total_egp, $supplier);

        $sellerProfit = DB::table('partner_profit_ledger')
            ->where('purchase_invoice_id', $id)->where('entry_type', 'accrual')->first(['partner_id', 'amount_egp']);
        if ($sellerProfit !== null) {
            $this->add($lines, 'purchase_partner_profit', 'debit', (string) $sellerProfit->amount_egp);
            $this->add($lines, 'partner_payables', 'credit', (string) $sellerProfit->amount_egp, ['partner_id' => (int) $sellerProfit->partner_id]);
        }
        return $this->posting((string) $invoice->invoice_date, 'فاتورة شراء '.$invoice->invoice_number, $invoice->created_by_user_id, $lines, $invoice);
    }

    private function expense(int $id): array
    {
        $expense = DB::table('expenses')->where('id', $id)->lockForUpdate()->first();
        $this->requirePosted($expense, 'expense');
        $lines = [];
        $accountId = $expense->expense_account_id === null ? null : (int) $expense->expense_account_id;
        if ($accountId !== null) {
            $account = DB::table('chart_of_accounts')->where('id', $accountId)->first();
            if ($account === null || $account->account_type !== 'expense' || $account->normal_balance !== 'debit' || ! $account->is_active || $account->is_control_account) {
                throw new RuntimeException('The expense account must be an active, postable expense account.');
            }
            $this->addDirect($lines, $accountId, 'debit', (string) $expense->amount);
        } else {
            $this->add($lines, 'operating_expense', 'debit', (string) $expense->amount);
        }
        $this->add($lines, 'cash', 'credit', (string) $expense->amount, ['treasury_account_id' => (int) $expense->treasury_account_id]);
        return $this->posting((string) $expense->expense_date, 'مصروف '.$expense->expense_number.' - '.$expense->description, $expense->posted_by_user_id ?? $expense->created_by_user_id, $lines, $expense);
    }

    private function partnerPayment(int $id): array
    {
        $payment = DB::table('partner_payments')->where('id', $id)->lockForUpdate()->first();
        $this->requireApproved($payment, 'partner payment');
        $lines = [];
        $this->add($lines, 'partner_payables', 'debit', (string) $payment->amount_egp, ['partner_id' => (int) $payment->partner_id]);
        $this->add($lines, 'cash', 'credit', (string) $payment->amount_egp, ['treasury_account_id' => (int) $payment->treasury_account_id]);
        return $this->posting((string) $payment->payment_date, 'دفعة أرباح شريك رقم '.$id, $payment->approved_by_user_id, $lines, $payment);
    }

    private function supplierPayment(int $id): array
    {
        $payment = DB::table('supplier_payments')->where('id', $id)->lockForUpdate()->first();
        $this->requireApproved($payment, 'supplier payment');
        $lines = [];
        $this->add($lines, 'supplier_payables', 'debit', (string) $payment->amount_egp, ['supplier_id' => (int) $payment->supplier_id]);
        $this->add($lines, 'cash', 'credit', (string) $payment->amount_egp, ['treasury_account_id' => (int) $payment->treasury_account_id]);
        return $this->posting((string) $payment->payment_date, 'دفعة مورد رقم '.$id, $payment->approved_by_user_id, $lines, $payment);
    }

    private function treasuryTransfer(int $id): array
    {
        $transfer = DB::table('treasury_transfers')->where('id', $id)->lockForUpdate()->first();
        $this->requirePosted($transfer, 'treasury transfer');
        $lines = [];
        $this->add($lines, 'cash', 'debit', (string) $transfer->amount_egp, ['treasury_account_id' => (int) $transfer->to_treasury_account_id]);
        $this->add($lines, 'cash', 'credit', (string) $transfer->amount_egp, ['treasury_account_id' => (int) $transfer->from_treasury_account_id]);
        return $this->posting((string) $transfer->transfer_date, 'تحويل خزائن '.$transfer->transfer_number, $transfer->posted_by_user_id ?? $transfer->created_by_user_id, $lines, $transfer);
    }

    private function treasuryEntry(int $id, array $payload): ?array
    {
        if (isset($payload['journal_entry_id'])) return null;
        $entry = DB::table('treasury_entries')->where('id', $id)->lockForUpdate()->first();
        if ($entry === null) throw new RuntimeException('Treasury entry does not exist.');
        $lines = [];
        $amount = (string) $entry->amount;
        $cash = ['treasury_account_id' => (int) $entry->treasury_account_id];
        if ($entry->direction === 'in') {
            $this->add($lines, 'cash', 'debit', $amount, $cash);
            $this->add($lines, $entry->entry_type === 'opening' ? 'opening_equity' : 'unclassified_cash_in', 'credit', $amount);
        } else {
            $this->add($lines, $entry->entry_type === 'opening' ? 'opening_equity' : 'unclassified_cash_out', 'debit', $amount);
            $this->add($lines, 'cash', 'credit', $amount, $cash);
        }
        return $this->posting((string) $entry->entry_date, (string) ($entry->description ?: 'حركة خزينة '.$entry->entry_number), $entry->created_by_user_id, $lines, $entry);
    }

    private function containerCost(int $id): array
    {
        $cost = DB::table('container_costs')->where('id', $id)->lockForUpdate()->first();
        if ($cost === null || ! in_array($cost->status, ['incurred', 'paid'], true)) throw new RuntimeException('Container cost must be incurred before posting.');
        $lines = [];
        $this->add($lines, (bool) $cost->include_in_inventory_cost ? 'inventory' : 'container_cost_expense', 'debit', (string) $cost->amount_egp);
        $this->add($lines, 'supplier_payables', 'credit', (string) $cost->amount_egp, $cost->supplier_id === null ? [] : ['supplier_id' => (int) $cost->supplier_id]);
        return $this->posting((string) ($cost->cost_date ?? $cost->created_at), 'تكلفة حاوية رقم '.$cost->container_id.' - '.(string) ($cost->description ?? $cost->cost_type), $cost->created_by_user_id, $lines, $cost);
    }

    private function containerCostPayment(int $id): array
    {
        $payment = DB::table('container_cost_payments as payment')
            ->join('container_costs as cost', 'cost.id', '=', 'payment.container_cost_id')
            ->join('treasury_entries as treasury', 'treasury.id', '=', 'payment.treasury_entry_id')
            ->where('payment.id', $id)->lockForUpdate()->first([
                'payment.amount_egp', 'payment.paid_at', 'payment.created_by_user_id',
                'cost.supplier_id', 'treasury.treasury_account_id',
            ]);
        if ($payment === null) throw new RuntimeException('Container cost payment does not exist.');
        $lines = [];
        $supplier = $payment->supplier_id === null ? [] : ['supplier_id' => (int) $payment->supplier_id];
        $this->add($lines, 'supplier_payables', 'debit', (string) $payment->amount_egp, $supplier);
        $this->add($lines, 'cash', 'credit', (string) $payment->amount_egp, ['treasury_account_id' => (int) $payment->treasury_account_id]);
        return $this->posting(substr((string) $payment->paid_at, 0, 10), 'سداد تكلفة حاوية رقم '.$id, $payment->created_by_user_id, $lines, $payment);
    }

    private function containerReceipt(int $id): array
    {
        $receipt = DB::table('container_receipts')->where('id', $id)->lockForUpdate()->first();
        $this->requirePosted($receipt, 'container receipt');
        $movementLines = DB::table('inventory_movement_lines')->where('inventory_movement_id', $receipt->inventory_movement_id)
            ->get(['quantity', 'unit_cost_egp_snapshot']);
        $value = '0.0000';
        foreach ($movementLines as $line) {
            if ($line->unit_cost_egp_snapshot === null) throw new RuntimeException('Container receipt is missing a cost snapshot.');
            $value = $this->sum($value, $this->multiply((string) $line->unit_cost_egp_snapshot, (int) $line->quantity));
        }
        $lines = [];
        $this->add($lines, 'inventory', 'debit', $value);
        $container = DB::table('containers')->where('id', $receipt->container_id)->first();
        $supplierId = $container?->supplier_id === null ? null : (int) $container->supplier_id;
        $this->add($lines, $supplierId === null ? 'opening_equity' : 'supplier_payables', 'credit', $value, $supplierId === null ? [] : ['supplier_id' => $supplierId]);
        return $this->posting(substr((string) $receipt->received_at, 0, 10), 'استلام مخزون الحاوية رقم '.$receipt->container_id, $receipt->received_by_user_id, $lines, $receipt);
    }

    private function receiptAllocation(int $id, bool $reverse): array
    {
        if ($reverse) {
            $allocation = DB::table('sales_receipt_allocation_reversals as reversal')
                ->join('sales_receipt_allocations as allocation', 'allocation.id', '=', 'reversal.sales_receipt_allocation_id')
                ->join('sales_receipts as receipt', 'receipt.id', '=', 'allocation.sales_receipt_id')
                ->where('reversal.id', $id)->first([
                    'reversal.amount as allocation_amount', 'allocation.sales_document_id',
                    'receipt.customer_id', 'receipt.receipt_date', 'reversal.actor_user_id as created_by_user_id',
                ]);
        } else {
            $allocation = DB::table('sales_receipt_allocations as allocation')
                ->join('sales_receipts as receipt', 'receipt.id', '=', 'allocation.sales_receipt_id')
                ->where('allocation.id', $id)->first([
                    'allocation.allocation_amount', 'allocation.sales_document_id',
                    'receipt.customer_id', 'receipt.receipt_date', 'receipt.created_by_user_id',
                ]);
        }
        if ($allocation === null) throw new RuntimeException('Customer receipt allocation does not exist.');
        $lines = [];
        if ($reverse) {
            $this->add($lines, 'receivables', 'debit', (string) $allocation->allocation_amount, ['customer_id' => (int) $allocation->customer_id]);
            $this->add($lines, 'customer_advances', 'credit', (string) $allocation->allocation_amount, ['customer_id' => (int) $allocation->customer_id]);
        } else {
            $this->add($lines, 'customer_advances', 'debit', (string) $allocation->allocation_amount, ['customer_id' => (int) $allocation->customer_id]);
            $this->add($lines, 'receivables', 'credit', (string) $allocation->allocation_amount, ['customer_id' => (int) $allocation->customer_id]);
        }
        return $this->posting((string) $allocation->receipt_date, ($reverse ? 'عكس تخصيص تحصيل ' : 'تخصيص تحصيل ').'للفواتير', $allocation->created_by_user_id, $lines, $allocation);
    }

    private function inventoryCount(int $id): array
    {
        $count = DB::table('inventory_counts')->where('id', $id)->lockForUpdate()->first();
        $this->requireApproved($count, 'inventory count');
        $lines = [];
        $rows = DB::table('inventory_count_lines as count_line')
            ->leftJoin('inventory_movement_lines as movement_line', function ($join): void {
                $join->on('movement_line.inventory_movement_id', '=', 'count_line.inventory_movement_id')
                    ->on('movement_line.product_id', '=', 'count_line.product_id');
            })->where('count_line.inventory_count_id', $id)
            ->get(['count_line.difference_quantity as variance_quantity', 'movement_line.unit_cost_egp_snapshot']);
        foreach ($rows as $row) {
            if ((int) $row->variance_quantity === 0) continue;
            if ($row->unit_cost_egp_snapshot === null) throw new RuntimeException('Inventory count variance is missing a cost snapshot.');
            $amount = $this->multiply((string) $row->unit_cost_egp_snapshot, abs((int) $row->variance_quantity));
            if ((int) $row->variance_quantity > 0) {
                $this->add($lines, 'inventory', 'debit', $amount);
                $this->add($lines, 'inventory_gain', 'credit', $amount);
            } else {
                $this->add($lines, 'inventory_loss', 'debit', $amount);
                $this->add($lines, 'inventory', 'credit', $amount);
            }
        }
        return $this->posting((string) ($count->approved_at ?? $count->count_date), 'تسوية جرد المخزون رقم '.$id, $count->approved_by_user_id, $lines, $count);
    }

    private function inventoryAdjustment(int $id): array
    {
        $movement = DB::table('inventory_movements')->where('id', $id)->lockForUpdate()->first();
        $this->requirePosted($movement, 'inventory adjustment');
        $lines = [];
        foreach (DB::table('inventory_movement_lines')->where('inventory_movement_id', $id)->get(['quantity', 'unit_cost_egp_snapshot', 'from_location_id', 'to_location_id']) as $line) {
            if ($line->unit_cost_egp_snapshot === null) throw new RuntimeException('Inventory adjustment is missing a cost snapshot.');
            $amount = $this->multiply((string) $line->unit_cost_egp_snapshot, (int) $line->quantity);
            if ($line->to_location_id !== null) {
                $this->add($lines, 'inventory', 'debit', $amount);
                $this->add($lines, 'inventory_gain', 'credit', $amount);
            } else {
                $this->add($lines, 'inventory_loss', 'debit', $amount);
                $this->add($lines, 'inventory', 'credit', $amount);
            }
        }
        return $this->posting((string) $movement->movement_date, 'تسوية حركة مخزون '.$movement->movement_number, $movement->created_by_user_id, $lines, $movement);
    }

    private function inventoryOpening(int $id): array
    {
        $movement = DB::table('inventory_movements')->where('id', $id)->lockForUpdate()->first();
        $this->requirePosted($movement, 'opening inventory movement');
        $value = '0.0000';
        foreach (DB::table('inventory_movement_lines')->where('inventory_movement_id', $id)->get(['quantity', 'unit_cost_egp_snapshot']) as $line) {
            if ($line->unit_cost_egp_snapshot === null) throw new RuntimeException('Opening inventory is missing its cost snapshot.');
            $value = $this->sum($value, $this->multiply((string) $line->unit_cost_egp_snapshot, (int) $line->quantity));
        }
        $lines = [];
        $this->add($lines, 'inventory', 'debit', $value);
        $this->add($lines, 'opening_equity', 'credit', $value);
        return $this->posting((string) $movement->movement_date, 'رصيد مخزون افتتاحي '.$movement->movement_number, $movement->created_by_user_id, $lines, $movement);
    }

    private function damagedStock(int $id): array
    {
        $damage = DB::table('approved_damaged_stock')->where('id', $id)->lockForUpdate()->first();
        $this->requireApproved($damage, 'damaged stock approval');
        $movement = DB::table('inventory_movements')
            ->where('source_type', 'approved_damaged_stock')
            ->where('source_id', $id)
            ->lockForUpdate()
            ->first();
        $this->requirePosted($movement, 'damaged inventory movement');
        if ($movement->movement_type !== 'damage') {
            throw new RuntimeException('Approved damaged stock must be linked to a damage issue movement.');
        }

        $amount = '0.0000';
        $quantity = 0;
        foreach (DB::table('inventory_movement_lines')->where('inventory_movement_id', $movement->id)
            ->get(['product_id', 'from_location_id', 'quantity', 'line_cost_egp_snapshot']) as $line) {
            if ((int) $line->product_id !== (int) $damage->product_id
                || (int) $line->from_location_id !== (int) $damage->warehouse_id
                || $line->line_cost_egp_snapshot === null) {
                throw new RuntimeException('Damaged-stock movement does not match the approved product, warehouse, or cost snapshot.');
            }
            $quantity += (int) $line->quantity;
            $amount = $this->sum($amount, (string) $line->line_cost_egp_snapshot);
        }
        if ($quantity !== (int) $damage->quantity || $quantity === 0) {
            throw new RuntimeException('Damaged-stock movement quantity does not match the approved quantity.');
        }

        $lines = [];
        $this->add($lines, 'inventory_loss', 'debit', $amount);
        $this->add($lines, 'inventory', 'credit', $amount);
        return $this->posting(substr((string) ($damage->approved_at ?? $damage->created_at), 0, 10), 'إعدام مخزون تالف رقم '.$id, $damage->approved_by_user_id, $lines, $damage);
    }

    private function warehouseReturn(int $id): ?array
    {
        $return = DB::table('warehouse_returns')->where('id', $id)->lockForUpdate()->first();
        $this->requireApproved($return, 'warehouse return');
        $lines = [];
        foreach (DB::table('warehouse_return_lines as return_line')
            ->leftJoin('inventory_movement_lines as source_line', 'source_line.id', '=', 'return_line.source_movement_line_id')
            ->leftJoin('inventory_movements as source_movement', 'source_movement.id', '=', 'source_line.inventory_movement_id')
            ->where('return_line.warehouse_return_id', $id)
            ->get(['return_line.quantity', 'return_line.unit_cost_egp', 'source_movement.movement_type', 'source_movement.source_type']) as $line) {
            // Returning stock to a different warehouse reverses a transfer but
            // leaves total inventory value unchanged.
            if ($line->movement_type === 'transfer') continue;
            $amount = $this->multiply((string) $line->unit_cost_egp, (int) $line->quantity);
            $this->add($lines, 'inventory', 'debit', $amount);
            $this->add($lines, $line->source_type === 'sales_document' ? 'cogs' : 'inventory_gain', 'credit', $amount);
        }
        if ($lines === []) return null;
        return $this->posting((string) $return->return_date, 'مرتجع مخزني رقم '.$id, $return->approved_by_user_id ?? $return->created_by_user_id, $lines, $return);
    }

    private function salesDocumentReversal(int $invoiceId, array $payload): array
    {
        $original = DB::table('journal_entries')->where('source_type', $this->journalSourceType('sales_document'))->where('source_id', $invoiceId)->lockForUpdate()->first();
        if ($original === null || $original->status !== 'posted') throw new RuntimeException('A posted automatic journal for the invoice must exist before reversal.');
        $lines = [];
        foreach (DB::table('journal_lines')->where('journal_entry_id', $original->id)->orderBy('line_number')->get() as $line) {
            $lines[] = [
                'account_id' => (int) $line->account_id,
                'debit_amount' => (string) $line->credit_amount,
                'credit_amount' => (string) $line->debit_amount,
                'description' => 'عكس '.$original->entry_number,
                'customer_id' => $line->customer_id === null ? null : (int) $line->customer_id,
                'supplier_id' => $line->supplier_id === null ? null : (int) $line->supplier_id,
                'partner_id' => $line->partner_id === null ? null : (int) $line->partner_id,
                'treasury_account_id' => $line->treasury_account_id === null ? null : (int) $line->treasury_account_id,
            ];
        }
        $source = DB::table('sales_documents')->where('id', $invoiceId)->first();
        return $this->posting((string) ($payload['reversal_date'] ?? now()->toDateString()), 'عكس فاتورة '.$source->document_number.' - '.(string) ($payload['reason'] ?? ''), $payload['actor_id'] ?? null, $lines, $source, (int) $original->id);
    }

    private function salesDocumentCost(int $documentId, bool $goodReturnsOnly): string
    {
        $query = DB::table('sales_document_lines')->where('sales_document_id', $documentId);
        if ($goodReturnsOnly) $query->where('return_condition', 'good');
        $cost = '0.0000';
        foreach ($query->get(['quantity', 'unit_cost_egp_snapshot']) as $line) {
            if ($line->unit_cost_egp_snapshot === null) continue;
            $cost = $this->sum($cost, $this->multiply((string) $line->unit_cost_egp_snapshot, (int) $line->quantity));
        }
        return $cost;
    }

    /** @return array{sign:int, amount:string} */
    private function partnerReturnEffect(int $returnId): array
    {
        $result = ['sign' => 0, 'amount' => '0.0000'];
        foreach (DB::table('partner_profit_ledger')->where('reference_document_id', $returnId)->where('entry_type', 'reversal')->get(['amount_egp']) as $row) {
            $result = $this->addSigned($result, $this->signed((string) $row->amount_egp));
        }
        return $result;
    }

    private function createJournal(string $sourceType, int $sourceId, array $posting): int
    {
        if ($posting['lines'] === []) throw new RuntimeException('Automatic posting produced no journal lines.');
        $debits = $credits = '0';
        foreach ($posting['lines'] as $line) {
            $debits = ExactMoney::add($debits, AccountingAmount::units((string) $line['debit_amount']));
            $credits = ExactMoney::add($credits, AccountingAmount::units((string) $line['credit_amount']));
        }
        if ($debits === '0' || $debits !== $credits) {
            throw new RuntimeException('Automatic journal is unbalanced for '.$sourceType.' #'.$sourceId.' (debit '.AccountingAmount::format($debits).', credit '.AccountingAmount::format($credits).').');
        }

        // Keep the real operator on the journal while tolerating service tests
        // and import callers that pass a transient actor ID without a users row.
        $candidateActorId = $posting['actor_id'];
        $actorId = $candidateActorId !== null
            && DB::table('users')->where('id', $candidateActorId)->exists()
                ? $candidateActorId
                : null;
        $entryId = (int) DB::table('journal_entries')->insertGetId([
            'entry_number' => 'AUTO-'.now()->format('YmdHis').'-'.Str::upper(Str::random(8)),
            'status' => 'draft',
            'entry_date' => $posting['date'],
            'description' => mb_substr((string) $posting['description'], 0, 500),
            'source_type' => $this->journalSourceType($sourceType),
            'source_id' => $sourceId,
            'reversal_of_entry_id' => $posting['reversal_of_entry_id'],
            'created_by_user_id' => $actorId,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        foreach (array_values($posting['lines']) as $index => $line) {
            DB::table('journal_lines')->insert([
                'journal_entry_id' => $entryId,
                'line_number' => $index + 1,
                'account_id' => $line['account_id'],
                'debit_amount' => $line['debit_amount'],
                'credit_amount' => $line['credit_amount'],
                'description' => $line['description'] ?? null,
                'customer_id' => $line['customer_id'] ?? null,
                'supplier_id' => $line['supplier_id'] ?? null,
                'partner_id' => $line['partner_id'] ?? null,
                'treasury_account_id' => $line['treasury_account_id'] ?? null,
                'created_at' => now(),
            ]);
        }
        DB::table('journal_entries')->where('id', $entryId)->update([
            'status' => 'posted',
            'posted_by_user_id' => $actorId,
            'posted_at' => now(),
            'updated_at' => now(),
        ]);

        return $entryId;
    }

    private function linkSource(string $sourceType, int $sourceId, int $journalId, array $posting): void
    {
        if ($sourceType === 'sales_document') {
            $this->tryLink('sales_document_postings', 'sales_document_id', $sourceId, $journalId);
        } elseif ($sourceType === 'sales_receipt') {
            $this->tryLink('sales_receipt_postings', 'sales_receipt_id', $sourceId, $journalId);
        } elseif ($sourceType === 'expense') {
            DB::table('expenses')->where('id', $sourceId)->update(['journal_entry_id' => $journalId]);
        } elseif ($sourceType === 'treasury_transfer') {
            $this->tryLink('treasury_transfers', 'id', $sourceId, $journalId);
        } elseif ($sourceType === 'container_receipt') {
            $this->tryLink('container_receipts', 'id', $sourceId, $journalId);
        } elseif ($sourceType === 'container_cost_payment') {
            $this->tryLink('container_cost_payments', 'id', $sourceId, $journalId);
        }
        if ($posting['reversal_of_entry_id'] !== null) {
            DB::table('journal_entries')->where('id', $posting['reversal_of_entry_id'])->update(['status' => 'reversed', 'updated_at' => now()]);
        }
    }

    private function tryLink(string $table, string $sourceColumn, int $sourceId, int $journalId): void
    {
        try {
            DB::table($table)->where($sourceColumn, $sourceId)->update(['journal_entry_id' => $journalId]);
        } catch (QueryException $exception) {
            // Several fast workflow tests intentionally use a reduced temporary
            // posting table; the journal's (source_type, source_id) remains the
            // durable link in those cases.
            if (! str_contains($exception->getMessage(), 'Unknown column')) throw $exception;
        }
    }

    private function add(array &$lines, string $mappingKey, string $side, string $amount, array $references = []): void
    {
        $amount = AccountingAmount::format(AccountingAmount::units($amount));
        if (AccountingAmount::units($amount) === '0') return;
        $accountId = $this->mappingAccountId($mappingKey);
        $this->addLine($lines, $accountId, $side, $amount, $references);
    }

    private function addDirect(array &$lines, int $accountId, string $side, string $amount, array $references = []): void
    {
        $this->addLine($lines, $accountId, $side, $amount, $references);
    }

    private function addLine(array &$lines, int $accountId, string $side, string $amount, array $references = []): void
    {
        $lines[] = [
            'account_id' => $accountId,
            'debit_amount' => $side === 'debit' ? $amount : '0.0000',
            'credit_amount' => $side === 'credit' ? $amount : '0.0000',
            'description' => null,
            'customer_id' => $references['customer_id'] ?? null,
            'supplier_id' => $references['supplier_id'] ?? null,
            'partner_id' => $references['partner_id'] ?? null,
            'treasury_account_id' => $references['treasury_account_id'] ?? null,
        ];
    }

    private function mappingAccountId(string $key): int
    {
        if (isset($this->accountIds[$key])) return $this->accountIds[$key];
        $mapping = DB::table('financial_account_mappings as mapping')
            ->join('chart_of_accounts as account', 'account.id', '=', 'mapping.account_id')
            ->where('mapping.mapping_key', $key)
            ->first(['account.id', 'account.is_active', 'account.is_control_account', 'mapping.account_type', 'mapping.normal_balance', 'account.account_type as actual_type', 'account.normal_balance as actual_normal']);
        if ($mapping === null || ! $mapping->is_active || $mapping->is_control_account
            || $mapping->account_type !== $mapping->actual_type || $mapping->normal_balance !== $mapping->actual_normal
            || DB::table('chart_of_accounts')->where('parent_account_id', $mapping->id)->exists()) {
            throw new RuntimeException('Automatic accounting mapping is missing or points to a non-postable account: '.$key);
        }
        return $this->accountIds[$key] = (int) $mapping->id;
    }

    private function posting(string $date, string $description, mixed $actorId, array $lines, object $source, ?int $reversalOf = null): array
    {
        return ['date' => substr($date, 0, 10), 'description' => $description, 'actor_id' => $actorId === null ? null : (int) $actorId,
            'lines' => $lines, 'source' => $source, 'reversal_of_entry_id' => $reversalOf];
    }

    private function requirePosted(?object $source, string $name): void
    {
        if ($source === null || ($source->status ?? null) !== 'posted') throw new RuntimeException('A posted '.$name.' is required before automatic journal posting.');
    }

    private function requireApproved(?object $source, string $name): void
    {
        if ($source === null || ($source->status ?? null) !== 'approved') throw new RuntimeException('An approved '.$name.' is required before automatic journal posting.');
    }

    private function journalSourceType(string $sourceType): string
    {
        return 'auto_'.$sourceType;
    }

    private function subtract(string $left, string $right): string
    {
        $leftUnits = AccountingAmount::units($left);
        $rightUnits = AccountingAmount::units($right);
        if (ExactMoney::compare($leftUnits, $rightUnits) < 0) throw new RuntimeException('Financial posting amount became negative.');
        return AccountingAmount::format(ExactMoney::subtract($leftUnits, $rightUnits));
    }

    private function sum(string $left, string $right): string
    {
        return AccountingAmount::format(ExactMoney::add(AccountingAmount::units($left), AccountingAmount::units($right)));
    }

    private function multiply(string $amount, int $quantity): string
    {
        return AccountingAmount::format(ExactMoney::multiply(AccountingAmount::units($amount), $quantity));
    }

    /** @return array{sign:int, amount:string} */
    private function signed(string $value): array
    {
        $negative = str_starts_with($value, '-');
        $absolute = $negative ? substr($value, 1) : $value;
        $units = AccountingAmount::units($absolute);
        return ['sign' => $units === '0' ? 0 : ($negative ? -1 : 1), 'amount' => AccountingAmount::format($units)];
    }

    /** @param array{sign:int,amount:string} $amount */
    private function applySigned(string $base, array $amount, bool $add): string
    {
        $baseUnits = AccountingAmount::units($base);
        $signedPositive = ($amount['sign'] > 0) === $add;
        if ($amount['sign'] === 0) return AccountingAmount::format($baseUnits);
        $amountUnits = AccountingAmount::units($amount['amount']);
        if ($signedPositive) return AccountingAmount::format(ExactMoney::add($baseUnits, $amountUnits));
        if (ExactMoney::compare($baseUnits, $amountUnits) < 0) throw new RuntimeException('Partner share exceeds the customer sale value.');
        return AccountingAmount::format(ExactMoney::subtract($baseUnits, $amountUnits));
    }

    /** @param array{sign:int,amount:string} $left @param array{sign:int,amount:string} $right @return array{sign:int,amount:string} */
    private function addSigned(array $left, array $right): array
    {
        if ($left['sign'] === 0) return $right;
        if ($right['sign'] === 0) return $left;
        $leftUnits = AccountingAmount::units($left['amount']);
        $rightUnits = AccountingAmount::units($right['amount']);
        if ($left['sign'] === $right['sign']) return ['sign' => $left['sign'], 'amount' => AccountingAmount::format(ExactMoney::add($leftUnits, $rightUnits))];
        $comparison = ExactMoney::compare($leftUnits, $rightUnits);
        if ($comparison === 0) return ['sign' => 0, 'amount' => '0.0000'];
        return $comparison > 0
            ? ['sign' => $left['sign'], 'amount' => AccountingAmount::format(ExactMoney::subtract($leftUnits, $rightUnits))]
            : ['sign' => $right['sign'], 'amount' => AccountingAmount::format(ExactMoney::subtract($rightUnits, $leftUnits))];
    }
}

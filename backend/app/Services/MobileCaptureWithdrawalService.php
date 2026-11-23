<?php

namespace App\Services;

use App\Support\ExactMoney;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class MobileCaptureWithdrawalService
{
    private const OTHER_WITHDRAWAL_CATEGORY_NAMES = ['other', 'مصاريف أخرى'];

    private const DRAWER_CATEGORY_NAME = 'الدرج';

    public function __construct(private readonly TreasuryService $treasury) {}

    public function post(Request $request, object $message, object $channel, object $category, string $notes): int
    {
        $date = Carbon::parse($message->received_at)->toDateString();
        $amount = ExactMoney::fromCents(ExactMoney::toCents((string) $message->amount));
        $isOtherCategory = $this->isOtherWithdrawalCategory($category);
        $targetAccountId = $isOtherCategory
            ? $this->drawerTargetAccountId()
            : ($category->category_kind === 'transfer' ? $category->target_treasury_account_id : null);

        if ($category->category_kind === 'transfer' || $isOtherCategory) {
            if ($targetAccountId === null) {
                throw ValidationException::withMessages(['category_id' => ['The drawer category has no target treasury account.']]);
            }
            return $this->treasury->postTransfer($request, [
                'transfer_date' => $date,
                'from_treasury_account_id' => (int) $channel->treasury_account_id,
                'to_treasury_account_id' => (int) $targetAccountId,
                'amount_egp' => $amount,
                'notes' => $notes !== '' ? $notes : $category->name,
            ]);
        }
        if ($category->expense_category_id === null) {
            throw ValidationException::withMessages(['category_id' => ['The selected category has no linked expense category.']]);
        }
        return $this->treasury->postExpense($request, [
            'expense_date' => $date,
            'treasury_account_id' => (int) $channel->treasury_account_id,
            'expense_category_id' => (int) $category->expense_category_id,
            'amount_egp' => $amount,
            'description' => $notes !== '' ? $notes : 'Mobile withdrawal - '.$category->name,
            'reference' => 'mobile-captured:'.$message->id,
        ]);
    }

    public function isOtherWithdrawalCategory(object $category): bool
    {
        $name = mb_strtolower(trim((string) $category->name));

        return in_array($name, $this->otherWithdrawalCategoryNames(), true);
    }

    /** @return list<string> */
    public function otherWithdrawalCategoryNames(): array
    {
        $aliases = config('mobile_categories.other_withdrawal_category_names', self::OTHER_WITHDRAWAL_CATEGORY_NAMES);

        return array_values(array_unique(array_map(
            static fn (string $alias): string => mb_strtolower(trim($alias)),
            is_array($aliases) ? $aliases : self::OTHER_WITHDRAWAL_CATEGORY_NAMES,
        )));
    }

    public function recordedAs(object $category): string
    {
        return $this->isOtherWithdrawalCategory($category) ? 'TREASURY_TRANSFER' : 'EXPENSE';
    }

    public function presentCategory(object $category): object
    {
        if ($this->isOtherWithdrawalCategory($category)) {
            $category->category_kind = 'transfer';
            $category->expense_category_id = null;
            $targetAccountId = $this->drawerTargetAccountId();
            $category->target_treasury_account_id = $targetAccountId;
            if (property_exists($category, 'expense_category_name')) $category->expense_category_name = null;
            if (property_exists($category, 'target_account_name')) {
                $category->target_account_name = DB::table('treasury_accounts')->where('id', $targetAccountId)->value('name');
            }
        }

        return $category;
    }

    private function drawerTargetAccountId(): int
    {
        $drawerCategory = DB::table('mobile_categories')
            ->where('name', config('mobile_categories.drawer_category_name', self::DRAWER_CATEGORY_NAME))
            ->where('category_kind', 'transfer')
            ->where('is_active', true)
            ->whereNotNull('target_treasury_account_id')
            ->first(['target_treasury_account_id']);

        if ($drawerCategory === null) {
            throw ValidationException::withMessages(['category_id' => ['The drawer transfer category has no configured target account.']]);
        }

        return (int) $drawerCategory->target_treasury_account_id;
    }
}

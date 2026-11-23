import { http, HttpResponse } from 'msw';
import { z } from 'zod';
import type { SessionUser } from '../shared/api/types';
import { referenceSeed } from './seed';
import type {
  Category,
  InventoryBalance,
  InventoryMovement,
  Product,
  Warehouse,
} from '../features/inventory/api';
import type { Customer } from '../features/customers/api';
import type {
  Invoice,
  InvoiceDraft,
  InvoiceMutationResult,
  CollectionReceipt,
  ReturnDocument,
  InvoiceInput,
  InvoicePreview,
  ReturnInput,
  ReturnPreview,
} from '../features/sales/api';
import type { InvoicePrintLine } from '../features/sales/api';
import type {
  AllocationBasis,
  ContainerCost,
  ContainerDetail,
  ContainerLine,
  ContainerReceipt,
  ContainerStatus,
  ContainerStatusHistory,
  ContainerReceiptPreview,
} from '../features/containers/api';
import type {
  DeliveryRecord,
  OrderDetail,
  OrderInput,
  OrderInvoiceResult,
  OrderPreview,
} from '../features/orders/api';
import type {
  Expense,
  ExpenseCategory,
  TreasuryAccount,
  TreasuryEntry,
  TreasuryTransfer,
} from '../features/finance/api';
import type {
  ContainerCostReportRow,
  CustomerBalanceReportRow,
  ProfitReportRow,
  SalesReportRow,
} from '../features/reports/api';
import type {
  AdminUser,
  AuditLogEntry,
  GeneralSettings,
  SalesTaxSettings,
} from '../features/admin/api';
const loginSchema = z.object({
  username: z.string().trim().min(1),
  password: z.string().min(1),
});

let currentUser: SessionUser | null = null;
const initialAdminUsers: AdminUser[] = [
  {
    id: 1,
    username: 'owner-demo',
    display_name: 'مالك النظام',
    phone: null,
    email: null,
    is_active: true,
    roles: ['owner'],
    permissions: ['*'],
  },
];
let adminUsers = initialAdminUsers.map((user) => ({ ...user }));
const initialGeneralSettings: GeneralSettings = {
  company_name: null,
  company_address: null,
  company_phone: null,
  company_email: null,
  company_tax_number: null,
  invoice_number_prefix: null,
  order_number_prefix: null,
  container_number_prefix: null,
};
let generalSettings = { ...initialGeneralSettings };
const categoryNames = [...new Set(referenceSeed.products.map((product) => product.category))];
const initialCategories: Category[] = categoryNames.map((name, index) => ({
  id: 301 + index,
  code: `CAT-${String(index + 1).padStart(3, '0')}`,
  name,
  parent_category_id: null,
  is_active: true,
}));
const initialWarehouses: Warehouse[] = [
  {
    id: 401,
    code: 'WH-MAIN',
    name: 'المستودع الرئيسي',
    location_type: 'main',
    parent_location_id: null,
    is_active: true,
    notes: null,
  },
  {
    id: 402,
    code: 'WH-SUB',
    name: 'مخزن قطع الغيار',
    location_type: 'sub',
    parent_location_id: 401,
    is_active: true,
    notes: null,
  },
];

function productRecords(): Product[] {
  return referenceSeed.products.map((product) => ({
    id: product.id,
    sku: product.sku,
    barcode: null,
    name: product.name,
    category_id:
      initialCategories.find((category) => category.name === product.category)?.id ?? null,
    category_name: product.category,
    unit_code: product.unit_code,
    default_location_id: null,
    description: null,
    default_tax_rate: null,
    last_purchase_price_reference: null,
    minimum_stock: null,
    quantity_on_hand: String(product.stock),
    is_active: true,
  }));
}

function balanceRecords(): InventoryBalance[] {
  return productRecords().map((product) => ({
    product_id: product.id,
    product_name: product.name,
    sku: product.sku,
    warehouse_id: initialWarehouses[0].id,
    warehouse_name: initialWarehouses[0].name,
    quantity_on_hand: product.quantity_on_hand ?? '0',
    minimum_stock: product.minimum_stock,
  }));
}

function movementRecords(): InventoryMovement[] {
  return referenceSeed.inventoryMovements.map((movement, index) => ({
    id: 501 + index,
    movement_type: movement.movement_type,
    product_id: productRecords().find((product) => product.name === movement.product_name)?.id ?? 0,
    product_name: movement.product_name,
    warehouse_id: initialWarehouses[0].id,
    warehouse_name: initialWarehouses[0].name,
    quantity: String(movement.quantity),
    reference: movement.reference,
    movement_date: movement.movement_date,
  }));
}

let categories = initialCategories.map((item) => ({ ...item }));
let warehouses = initialWarehouses.map((item) => ({ ...item }));
let products = productRecords();
let balances = balanceRecords();
let movements = movementRecords();
const initialCustomers: Customer[] = referenceSeed.customers.map((customer, index) => ({
  id: customer.id,
  name: customer.name,
  phone: customer.phone,
  governorate: customer.governorate,
  credit_limit: customer.credit_limit,
  balance_egp: ['4800.00', '3500.00', '0.00'][index] ?? '0.00',
  unallocated_collection_egp: ['0.00', '1500.00', '0.00'][index] ?? '0.00',
  is_active: customer.is_active,
}));
let customers = initialCustomers.map((customer) => ({ ...customer }));
const initialInvoices: Invoice[] = referenceSeed.invoices.map((invoice, index) => ({
  id: 701 + index,
  invoice_number: invoice.number,
  customer_id: invoice.customer_id,
  customer_name:
    referenceSeed.customers.find((customer) => customer.id === invoice.customer_id)?.name ?? '',
  issue_date: invoice.issue_date,
  due_date: ['2026-11-09', '2026-11-07', null][index] ?? null,
  total_egp: invoice.total_egp,
  paid_egp: invoice.paid_egp,
  remaining_egp: ['4800.00', '3500.00', '0.00'][index] ?? '0.00',
  issuer_name: 'مالك النظام',
  status: index === 2 ? 'paid' : 'issued',
}));
let invoices = initialInvoices.map((invoice) => ({ ...invoice }));
const initialOrders: OrderDetail[] = [];
let orders = initialOrders.map((order) => ({ ...order }));
let deliveries: DeliveryRecord[] = [];
let returns: ReturnDocument[] = [];
const initialTreasuryAccounts: TreasuryAccount[] = [
  {
    id: 901,
    code: 'CASH-EGP',
    name: 'الخزينة الرئيسية',
    account_type: 'cash',
    notes: null,
    is_active: true,
  },
];
let treasuryAccounts = initialTreasuryAccounts.map((account) => ({ ...account }));
let treasuryEntries: TreasuryEntry[] = [];
let treasuryTransfers: TreasuryTransfer[] = [];
let expenseCategories: ExpenseCategory[] = [];
let expenses: Expense[] = [];
const initialSalesTaxSettings: SalesTaxSettings = {
  enabled: false,
  rate: null,
  calculation_method: null,
};
let salesTaxSettings = { ...initialSalesTaxSettings };
const initialCollections: CollectionReceipt[] = referenceSeed.collections.map(
  (collection, index) => ({
    id: 501 + index,
    receipt_number: collection.number,
    customer_id: collection.customer_id,
    customer_name:
      referenceSeed.customers.find((customer) => customer.id === collection.customer_id)?.name ??
      '',
    treasury_account_id: treasuryAccounts[0].id,
    receipt_date: collection.issue_date,
    amount_egp: collection.amount_egp,
    allocated_egp: collection.allocated_egp,
    unallocated_egp: collection.unallocated_egp,
  }),
);
let collections = initialCollections.map((receipt) => ({ ...receipt }));
const initialContainers: ContainerDetail[] = referenceSeed.containers.map((container, index) => ({
  id: 16016 + index,
  container_number: container.number,
  supplier_id: null,
  supplier_name: null,
  origin: null,
  destination: null,
  status: container.status as ContainerDetail['status'],
  estimated_departure: null,
  estimated_arrival: null,
  notes: container.name,
  line_count: container.line_count,
  expenses_egp: null,
  allocation_basis: null,
  lines: [],
  costs: [],
  receipts: [],
  status_history: [],
}));
let containers = initialContainers.map((container) => ({ ...container }));
let nextId = 600;
let nextInvoiceId = 800;
let nextCollectionId = 600;
let nextContainerId = 16017;
let nextContainerLineId = 17001;
let nextContainerCostId = 18001;
let nextContainerReceiptId = 19001;
let nextOrderId = 20001;
let nextOrderLineId = 21001;
let nextDeliveryId = 22001;
let processedStockKeys = new Map<string, { data: InventoryMovement[] }>();
let processedInvoiceKeys = new Map<string, InvoiceDraft>();
let processedIssueKeys = new Map<string, InvoiceDraft>();
let processedCancelKeys = new Map<string, InvoiceMutationResult>();
let processedCollectionKeys = new Map<string, CollectionReceipt>();
let processedContainerKeys = new Map<string, unknown>();
let processedOrderKeys = new Map<string, unknown>();
let processedDeliveryKeys = new Map<string, unknown>();
let processedFinanceKeys = new Map<string, unknown>();
let invoiceLines = new Map<number, InvoicePrintLine[]>();

export function resetMockSession(): void {
  currentUser = null;
  adminUsers = initialAdminUsers.map((user) => ({ ...user }));
  generalSettings = { ...initialGeneralSettings };
  categories = initialCategories.map((item) => ({ ...item }));
  warehouses = initialWarehouses.map((item) => ({ ...item }));
  products = productRecords();
  balances = balanceRecords();
  movements = movementRecords();
  customers = initialCustomers.map((customer) => ({ ...customer }));
  invoices = initialInvoices.map((invoice) => ({ ...invoice }));
  orders = initialOrders.map((order) => ({ ...order }));
  deliveries = [];
  returns = [];
  treasuryAccounts = initialTreasuryAccounts.map((account) => ({ ...account }));
  treasuryEntries = [];
  treasuryTransfers = [];
  expenseCategories = [];
  expenses = [];
  salesTaxSettings = { ...initialSalesTaxSettings };
  collections = initialCollections.map((receipt) => ({ ...receipt }));
  containers = initialContainers.map((container) => ({ ...container }));
  nextId = 600;
  nextInvoiceId = 800;
  nextCollectionId = 600;
  nextContainerId = 16017;
  nextContainerLineId = 17001;
  nextContainerCostId = 18001;
  nextContainerReceiptId = 19001;
  nextOrderId = 20001;
  nextOrderLineId = 21001;
  nextDeliveryId = 22001;
  processedStockKeys = new Map();
  processedInvoiceKeys = new Map();
  processedIssueKeys = new Map();
  processedCancelKeys = new Map();
  processedCollectionKeys = new Map();
  processedContainerKeys = new Map();
  processedOrderKeys = new Map();
  processedDeliveryKeys = new Map();
  processedFinanceKeys = new Map();
  invoiceLines = new Map();
}

function mockUser(username: string): SessionUser {
  const isDriver = /driver|سائق|السواق/i.test(username);
  return {
    id: isDriver ? 3 : username === 'أبنوب' ? 2 : 1,
    username,
    name: username,
    role: isDriver ? 'driver' : 'owner',
    permissions: isDriver
      ? [
          'users.view_self',
          'invoices.view',
          'customers.view',
          'products.view',
          'inventory.view',
          'orders.view',
          'deliveries.view',
        ]
      : ['*'],
  };
}

const unauthorized = () =>
  HttpResponse.json(
    { error: { code: 'UNAUTHENTICATED', message: 'Unauthenticated.' } },
    { status: 401 },
  );

function paginated<T extends object>(items: T[], request: Request) {
  const url = new URL(request.url);
  const search = url.searchParams.get('search')?.toLocaleLowerCase('ar') ?? '';
  const page = Math.max(1, Number.parseInt(url.searchParams.get('page') ?? '1', 10) || 1);
  const perPage = Math.max(1, Number.parseInt(url.searchParams.get('per_page') ?? '10', 10) || 10);
  const filtered = items.filter((item) => {
    const record = item as Record<string, unknown>;
    const matchesSearch =
      !search ||
      Object.values(record).some((value) =>
        String(value ?? '')
          .toLocaleLowerCase('ar')
          .includes(search),
      );
    const matchesFilters = [...url.searchParams.entries()].every(([key, value]) => {
      if (['search', 'page', 'per_page', 'sort_by', 'sort_direction'].includes(key)) return true;
      const recordDate = String(
        record.movement_date ??
          record.issue_date ??
          record.estimated_arrival ??
          record.entry_date ??
          record.transfer_date ??
          record.expense_date ??
          record.order_date ??
          record.document_date ??
          '',
      );
      if (key === 'from_date' || key === 'date_from') return recordDate >= value;
      if (key === 'to_date' || key === 'date_to') return recordDate <= value;
      return String(record[key] ?? '') === value;
    });
    return matchesSearch && matchesFilters;
  });
  const sortBy = url.searchParams.get('sort_by');
  const sortDirection = url.searchParams.get('sort_direction') === 'desc' ? -1 : 1;
  const sorted = sortBy
    ? [...filtered].sort((left, right) => {
        const leftValue = (left as Record<string, unknown>)[sortBy];
        const rightValue = (right as Record<string, unknown>)[sortBy];
        if (typeof leftValue === 'number' && typeof rightValue === 'number') {
          return (leftValue - rightValue) * sortDirection;
        }
        return (
          String(leftValue ?? '').localeCompare(String(rightValue ?? ''), 'ar', {
            numeric: true,
          }) * sortDirection
        );
      })
    : filtered;
  const lastPage = Math.max(1, Math.ceil(sorted.length / perPage));
  return HttpResponse.json({
    data: sorted.slice((page - 1) * perPage, page * perPage),
    meta: { current_page: page, per_page: perPage, total: sorted.length, last_page: lastPage },
  });
}

async function applyStockPost(request: Request, mode: 'adjustment' | 'opening' | 'transfer') {
  const invalidInput = () =>
    HttpResponse.json(
      { error: { code: 'VALIDATION_FAILED', message: 'Validation failed.' } },
      { status: 422 },
    );
  type Input = {
    product_id: number;
    quantity: number;
    reason: string;
    movement_date?: string;
    warehouse_id?: number;
    source_warehouse_id?: number;
    destination_warehouse_id?: number;
  };
  let body: Input;
  const raw = await request.json();
  if (mode === 'adjustment') {
    const parsed = z
      .object({
        product_id: z.number().int().positive(),
        warehouse_id: z.number().int().positive(),
        quantity: z
          .number()
          .int()
          .refine((value) => value !== 0),
        movement_date: z.string().date().optional(),
        reason: z.string().min(1),
      })
      .safeParse(raw);
    if (!parsed.success) return invalidInput();
    body = parsed.data;
  } else if (mode === 'opening') {
    const parsed = z
      .object({
        product_id: z.number().int().positive(),
        warehouse_id: z.number().int().positive(),
        quantity: z.number().int().positive(),
        unit_cost_egp: z.string().regex(/^(0|[1-9][0-9]{0,14})(\.\d{1,4})?$/),
        movement_date: z.string().date(),
        reason: z.string().min(1),
      })
      .safeParse(raw);
    if (!parsed.success) return invalidInput();
    body = parsed.data;
  } else {
    const parsed = z
      .object({
        product_id: z.number().int().positive(),
        source_warehouse_id: z.number().int().positive(),
        destination_warehouse_id: z.number().int().positive(),
        quantity: z.number().int().positive(),
        movement_date: z.string().date().optional(),
        reason: z.string().min(1),
      })
      .safeParse(raw);
    if (!parsed.success) return invalidInput();
    body = parsed.data;
  }
  const idem = request.headers.get('Idempotency-Key');
  const replayKey = idem ? `${mode}:${idem}` : null;
  if (replayKey && processedStockKeys.has(replayKey)) {
    return HttpResponse.json(processedStockKeys.get(replayKey), { status: 201 });
  }
  const product = products.find((item) => item.id === body.product_id);
  const targetWarehouses =
    mode === 'transfer'
      ? [
          warehouses.find((item) => item.id === body.source_warehouse_id),
          warehouses.find((item) => item.id === body.destination_warehouse_id),
        ]
      : [warehouses.find((item) => item.id === body.warehouse_id)];
  if (!product || targetWarehouses.some((warehouse) => !warehouse)) {
    return HttpResponse.json(
      { error: { code: 'NOT_FOUND', message: 'Product or warehouse not found.' } },
      { status: 404 },
    );
  }
  if (mode === 'transfer' && body.source_warehouse_id === body.destination_warehouse_id) {
    return HttpResponse.json(
      { error: { code: 'VALIDATION_FAILED', message: 'Choose different warehouses.' } },
      { status: 422 },
    );
  }
  const quantity = BigInt(body.quantity);
  const sourceId = mode === 'transfer' ? body.source_warehouse_id : body.warehouse_id;
  if (sourceId === undefined) return invalidInput();
  const sourceBalance = balances.find(
    (item) => item.product_id === product.id && item.warehouse_id === sourceId,
  );
  const sourceQty = BigInt(sourceBalance?.quantity_on_hand ?? '0');
  if (
    (mode === 'transfer' || (mode === 'adjustment' && quantity < 0n)) &&
    sourceQty < (mode === 'adjustment' ? -quantity : quantity)
  ) {
    return HttpResponse.json(
      { error: { code: 'HTTP_ERROR', message: 'Insufficient stock.' } },
      { status: 409 },
    );
  }

  const currentDate = body.movement_date ?? new Date().toISOString().slice(0, 10);
  const updateBalance = (warehouseId: number, delta: bigint) => {
    const warehouse = warehouses.find((item) => item.id === warehouseId)!;
    const previous = balances.find(
      (item) => item.product_id === product.id && item.warehouse_id === warehouseId,
    );
    const nextQty = BigInt(previous?.quantity_on_hand ?? '0') + delta;
    balances = previous
      ? balances.map((item) =>
          item === previous ? { ...item, quantity_on_hand: nextQty.toString() } : item,
        )
      : [
          ...balances,
          {
            product_id: product.id,
            product_name: product.name,
            sku: product.sku,
            warehouse_id: warehouseId,
            warehouse_name: warehouse.name,
            quantity_on_hand: nextQty.toString(),
            minimum_stock: product.minimum_stock,
          },
        ];
    return {
      id: nextId++,
      movement_type: mode === 'opening' ? 'opening' : mode,
      product_id: product.id,
      product_name: product.name,
      warehouse_id: warehouse.id,
      warehouse_name: warehouse.name,
      quantity: delta.toString(),
      reference: null,
      movement_date: currentDate,
    } satisfies InventoryMovement;
  };
  let created: InventoryMovement[];
  if (mode === 'transfer') {
    if (
      body.source_warehouse_id === undefined ||
      body.destination_warehouse_id === undefined ||
      body.source_warehouse_id === body.destination_warehouse_id
    ) {
      return invalidInput();
    }
    created = [
      updateBalance(body.source_warehouse_id, -quantity),
      updateBalance(body.destination_warehouse_id, quantity),
    ];
  } else {
    if (body.warehouse_id === undefined) return invalidInput();
    created = [updateBalance(body.warehouse_id, quantity)];
  }
  movements = [...created, ...movements];
  const response = { data: created };
  if (replayKey) processedStockKeys.set(replayKey, response);
  return HttpResponse.json(response, { status: 201 });
}

function amountToUnits(value: string): bigint {
  const [whole = '0', fraction = ''] = value.split('.');
  return BigInt(whole) * 10_000n + BigInt(fraction.padEnd(4, '0'));
}

function unitsToAmount(units: bigint): string {
  const negative = units < 0n;
  const absolute = negative ? -units : units;
  const whole = absolute / 10_000n;
  const fraction = String(absolute % 10_000n).padStart(4, '0');
  return `${negative ? '-' : ''}${whole}.${fraction}`;
}

function rateToMicros(value: string): bigint {
  const [whole = '0', fraction = ''] = value.split('.');
  return BigInt(whole) * 1_000_000n + BigInt(fraction.slice(0, 6).padEnd(6, '0'));
}

function roundedRatio(numerator: bigint, denominator: bigint): bigint {
  return (numerator + denominator / 2n) / denominator;
}

function taxForAmount(amount: bigint, rate: string, method: 'inclusive' | 'exclusive' | null) {
  if (!salesTaxSettings.enabled || !method || !salesTaxSettings.rate) return 0n;
  const rateUnits = rateToMicros(rate);
  return method === 'inclusive'
    ? roundedRatio(amount * rateUnits, 100_000_000n + rateUnits)
    : roundedRatio(amount * rateUnits, 100_000_000n);
}

function makeInvoicePreview(input: InvoiceInput): InvoicePreview | null {
  if (!customers.some((customer) => customer.id === input.customer_id)) return null;
  let subtotal = 0n;
  let discountTotal = 0n;
  let taxTotal = 0n;
  let total = 0n;
  const previewLines: InvoicePreview['lines'] = [];
  const warnings: InvoicePreview['warnings'] = [];
  for (const [index, line] of input.lines.entries()) {
    const product = products.find((item) => item.id === line.product_id);
    const warehouse = warehouses.find((item) => item.id === line.warehouse_id);
    if (!product || !warehouse) return null;
    const gross = amountToUnits(line.unit_price_egp) * BigInt(line.quantity);
    const discount = amountToUnits(line.discount_amount_egp ?? '0');
    if (discount > gross) return null;
    const net = gross - discount;
    const tax = taxForAmount(
      net,
      salesTaxSettings.rate ?? '0',
      salesTaxSettings.calculation_method,
    );
    const lineTotal =
      salesTaxSettings.enabled && salesTaxSettings.calculation_method === 'inclusive'
        ? net
        : net + tax;
    subtotal += gross;
    discountTotal += discount;
    taxTotal += tax;
    total += lineTotal;
    previewLines.push({
      line_number: index + 1,
      product_id: product.id,
      sku: product.sku,
      product_name: product.name,
      warehouse_id: warehouse.id,
      quantity: line.quantity,
      unit_price_egp: line.unit_price_egp,
      discount_amount_egp: unitsToAmount(discount),
      tax_amount_egp: unitsToAmount(tax),
      line_total_egp: unitsToAmount(lineTotal),
    });
    const balance = balances.find(
      (item) => item.product_id === product.id && item.warehouse_id === warehouse.id,
    );
    if (BigInt(balance?.quantity_on_hand ?? '0') < BigInt(line.quantity)) {
      warnings.push({
        code: 'LOW_STOCK',
        product_id: product.id,
        product_name: product.name,
        available_quantity: balance?.quantity_on_hand ?? '0',
        requested_quantity: String(line.quantity),
      });
    }
  }
  return {
    lines: previewLines,
    subtotal_egp: unitsToAmount(subtotal),
    discount_amount_egp: unitsToAmount(discountTotal),
    tax_enabled: salesTaxSettings.enabled,
    tax_rate: salesTaxSettings.rate ?? '0',
    tax_calculation_method: salesTaxSettings.calculation_method,
    tax_amount_egp: unitsToAmount(taxTotal),
    grand_total_egp: unitsToAmount(total),
    warnings,
  };
}

function makeOrderPreview(input: OrderInput): OrderPreview | null {
  if (!customers.some((customer) => customer.id === input.customer_id)) return null;
  let subtotal = 0n;
  const previewLines: OrderPreview['lines'] = [];
  const warnings: OrderPreview['warnings'] = [];
  for (const [index, line] of input.lines.entries()) {
    const product = products.find((item) => item.id === line.product_id);
    if (!product) return null;
    const lineTotal = amountToUnits(line.unit_price_egp) * BigInt(line.quantity);
    subtotal += lineTotal;
    previewLines.push({
      line_number: index + 1,
      product_id: product.id,
      sku: product.sku,
      product_name: product.name,
      quantity: line.quantity,
      unit_price_egp: line.unit_price_egp,
      line_total_egp: unitsToAmount(lineTotal),
    });
    const available = balances
      .filter((balance) => balance.product_id === product.id)
      .reduce((amount, balance) => amount + BigInt(balance.quantity_on_hand), 0n);
    if (available < BigInt(line.quantity)) {
      warnings.push({
        code: 'LOW_STOCK',
        product_id: product.id,
        product_name: product.name,
        available_quantity: available.toString(),
        requested_quantity: String(line.quantity),
      });
    }
  }
  return {
    lines: previewLines,
    subtotal_egp: unitsToAmount(subtotal),
    discount_amount_egp: unitsToAmount(0n),
    tax_amount_egp: unitsToAmount(0n),
    tax_applied: false,
    grand_total_egp: unitsToAmount(subtotal),
    warnings,
  };
}

function makeReturnPreview(input: ReturnInput): ReturnPreview | null {
  if (!customers.some((customer) => customer.id === input.customer_id)) return null;
  let subtotal = 0n;
  let discountTotal = 0n;
  let taxTotal = 0n;
  let total = 0n;
  const previewLines: ReturnPreview['lines'] = [];
  for (const [index, line] of input.lines.entries()) {
    const product = line.product_id
      ? products.find((item) => item.id === line.product_id)
      : undefined;
    if (!product || !line.unit_price_egp) return null;
    const gross = amountToUnits(line.unit_price_egp) * BigInt(line.quantity);
    const discount = amountToUnits(line.discount_amount_egp ?? '0');
    if (discount > gross) return null;
    const net = gross - discount;
    const tax = taxForAmount(
      net,
      salesTaxSettings.rate ?? '0',
      salesTaxSettings.calculation_method,
    );
    const lineTotal =
      salesTaxSettings.enabled && salesTaxSettings.calculation_method === 'inclusive'
        ? net
        : net + tax;
    subtotal += gross;
    discountTotal += discount;
    taxTotal += tax;
    total += lineTotal;
    previewLines.push({
      line_number: index + 1,
      product_id: product.id,
      sku: product.sku,
      description: line.description ?? product.name,
      warehouse_id: line.warehouse_id,
      quantity: line.quantity,
      unit_price_egp: line.unit_price_egp,
      discount_amount_egp: unitsToAmount(discount),
      tax_amount_egp: unitsToAmount(tax),
      line_total_egp: unitsToAmount(lineTotal),
    });
  }
  return {
    lines: previewLines,
    subtotal_egp: unitsToAmount(subtotal),
    discount_amount_egp: unitsToAmount(discountTotal),
    tax_amount_egp: unitsToAmount(taxTotal),
    grand_total_egp: unitsToAmount(total),
    warnings: [],
  };
}

function treasuryAccountBalance(accountId: number): string {
  let units = 0n;
  for (const entry of treasuryEntries) {
    if (entry.treasury_account_id === accountId) {
      const amount = amountToUnits(entry.amount_egp);
      units += entry.direction === 'in' ? amount : -amount;
    }
  }
  for (const transfer of treasuryTransfers) {
    const amount = amountToUnits(transfer.amount_egp);
    if (transfer.from_treasury_account_id === accountId) units -= amount;
    if (transfer.to_treasury_account_id === accountId) units += amount;
  }
  return unitsToAmount(units);
}

export const handlers = [
  http.get('/api/v1/health', () => HttpResponse.json({ status: 'ok' })),
  http.get('/api/v1/auth/me', () =>
    currentUser ? HttpResponse.json(currentUser) : unauthorized(),
  ),
  http.post('/api/v1/auth/login', async ({ request }) => {
    const input = loginSchema.safeParse(await request.json());
    if (!input.success) {
      return HttpResponse.json(
        { error: { code: 'VALIDATION_FAILED', message: 'Validation failed.' } },
        { status: 422 },
      );
    }
    currentUser = mockUser(input.data.username);
    return HttpResponse.json(currentUser);
  }),
  http.post('/api/v1/auth/logout', () => {
    currentUser = null;
    return new HttpResponse(null, { status: 204 });
  }),
  http.post('/api/v1/auth/reauth', async ({ request }) => {
    const body: unknown = await request.json();
    if (typeof body !== 'object' || body === null || !('password' in body) || !body.password) {
      return HttpResponse.json(
        { error: { code: 'REAUTHENTICATION_FAILED', message: 'Reauthentication failed.' } },
        { status: 401 },
      );
    }
    return new HttpResponse(null, { status: 204 });
  }),
  http.get('/api/v1/users', ({ request }) => paginated(adminUsers, request)),
  http.post('/api/v1/users', async ({ request }) => {
    const input = z
      .object({
        username: z.string().trim().min(1).max(100),
        display_name: z.string().trim().min(1).max(160),
        phone: z.string().max(32).nullable(),
        email: z.string().email().nullable(),
        password: z.string().min(12),
        password_confirmation: z.string().min(12),
        role_codes: z.array(z.string().min(1)).min(1),
      })
      .safeParse(await request.json());
    if (
      !input.success ||
      (input.success && input.data.password !== input.data.password_confirmation)
    ) {
      return HttpResponse.json({ error: { code: 'VALIDATION_FAILED' } }, { status: 422 });
    }
    if (adminUsers.some((user) => user.username === input.data.username)) {
      return HttpResponse.json({ error: { code: 'CONFLICT' } }, { status: 409 });
    }
    const created: AdminUser = {
      id: nextId++,
      username: input.data.username,
      display_name: input.data.display_name,
      phone: input.data.phone,
      email: input.data.email,
      is_active: true,
      roles: input.data.role_codes,
      permissions: [],
    };
    adminUsers = [...adminUsers, created];
    return HttpResponse.json(created, { status: 201 });
  }),
  http.put('/api/v1/users/:userId', async ({ params, request }) => {
    const userId = Number(params.userId);
    const index = adminUsers.findIndex((user) => user.id === userId);
    if (index < 0) return HttpResponse.json({ error: { code: 'NOT_FOUND' } }, { status: 404 });
    const input = z
      .object({
        username: z.string().trim().min(1).max(100).optional(),
        display_name: z.string().trim().min(1).max(160).optional(),
        phone: z.string().max(32).nullable().optional(),
        email: z.string().email().nullable().optional(),
        is_active: z.boolean().optional(),
      })
      .strict()
      .refine((value) => Object.keys(value).length > 0)
      .safeParse(await request.json());
    if (!input.success)
      return HttpResponse.json({ error: { code: 'VALIDATION_FAILED' } }, { status: 422 });
    const updated = { ...adminUsers[index], ...input.data };
    adminUsers = adminUsers.map((user, itemIndex) => (itemIndex === index ? updated : user));
    return HttpResponse.json(updated);
  }),
  http.put('/api/v1/users/:userId/roles', async ({ params, request }) => {
    const userId = Number(params.userId);
    const input = z
      .object({ role_codes: z.array(z.string().min(1)).min(1) })
      .safeParse(await request.json());
    const user = adminUsers.find((item) => item.id === userId);
    if (!user) return HttpResponse.json({ error: { code: 'NOT_FOUND' } }, { status: 404 });
    if (!input.success)
      return HttpResponse.json({ error: { code: 'VALIDATION_FAILED' } }, { status: 422 });
    const updated = { ...user, roles: input.data.role_codes };
    adminUsers = adminUsers.map((item) => (item.id === userId ? updated : item));
    return HttpResponse.json(updated);
  }),
  http.get('/api/v1/settings/general', () => HttpResponse.json(generalSettings)),
  http.put('/api/v1/settings/general', async ({ request }) => {
    const input = z
      .object({
        company_name: z.string().max(200).nullable().optional(),
        company_address: z.string().max(500).nullable().optional(),
        company_phone: z.string().max(32).nullable().optional(),
        company_email: z.string().email().nullable().optional(),
        company_tax_number: z.string().max(100).nullable().optional(),
        invoice_number_prefix: z.string().max(32).nullable().optional(),
        order_number_prefix: z.string().max(32).nullable().optional(),
        container_number_prefix: z.string().max(32).nullable().optional(),
      })
      .refine((value) => Object.keys(value).length > 0)
      .safeParse(await request.json());
    if (!input.success)
      return HttpResponse.json({ error: { code: 'VALIDATION_FAILED' } }, { status: 422 });
    generalSettings = { ...generalSettings, ...input.data };
    return HttpResponse.json({ data: generalSettings });
  }),
  http.get('/api/v1/reports/dashboard', () => HttpResponse.json(referenceSeed.dashboard)),
  http.get('/api/v1/settings/sales-tax', () => HttpResponse.json(salesTaxSettings)),
  http.put('/api/v1/settings/sales-tax', async ({ request }) => {
    const input = z
      .object({
        enabled: z.boolean(),
        rate: z
          .string()
          .regex(/^\d+(\.\d{1,6})?$/)
          .nullable(),
        calculation_method: z.enum(['inclusive', 'exclusive']).nullable(),
      })
      .safeParse(await request.json());
    if (!input.success) {
      return HttpResponse.json({ error: { code: 'VALIDATION_FAILED' } }, { status: 422 });
    }
    salesTaxSettings = input.data;
    return HttpResponse.json(salesTaxSettings);
  }),
  http.get('/api/v1/audit-logs', ({ request }) => paginated<AuditLogEntry>([], request)),
  http.get('/api/v1/reports/sales', ({ request }) =>
    paginated<SalesReportRow>(
      invoices.map((invoice) => ({
        id: invoice.id,
        document_number: invoice.invoice_number,
        customer_name: invoice.customer_name,
        document_date: invoice.issue_date,
        document_type: 'invoice',
        status: invoice.status,
        total_egp: invoice.total_egp,
      })),
      request,
    ),
  ),
  http.get('/api/v1/reports/invoice-profit', ({ request }) =>
    paginated<ProfitReportRow>([], request),
  ),
  http.get('/api/v1/reports/stock', ({ request }) => paginated(balances, request)),
  http.get('/api/v1/reports/stock-movements', ({ request }) => paginated(movements, request)),
  http.get('/api/v1/reports/container-costs', ({ request }) =>
    paginated<ContainerCostReportRow>([], request),
  ),
  http.get('/api/v1/reports/customer-balances', ({ request }) =>
    paginated<CustomerBalanceReportRow>(
      customers.flatMap((customer) =>
        typeof customer.balance_egp === 'string' &&
        typeof customer.unallocated_collection_egp === 'string'
          ? [
              {
                id: customer.id,
                customer_name: customer.name,
                balance_egp: customer.balance_egp,
                unallocated_collection_egp: customer.unallocated_collection_egp,
              },
            ]
          : [],
      ),
      request,
    ),
  ),
  http.get('/api/v1/customers', ({ request }) => paginated(customers, request)),
  http.get('/api/v1/customers/:customerId', ({ params }) => {
    const customer = customers.find((item) => String(item.id) === params.customerId);
    return customer
      ? HttpResponse.json(customer)
      : HttpResponse.json({ error: { code: 'NOT_FOUND' } }, { status: 404 });
  }),
  http.get('/api/v1/invoices', ({ request }) => paginated(invoices, request)),
  http.get('/api/v1/orders', ({ request }) => paginated(orders, request)),
  http.post('/api/v1/orders/preview', async ({ request }) => {
    const input = z
      .object({
        customer_id: z.number().int().positive(),
        order_date: z.string().date(),
        requested_delivery_date: z.string().date().nullable(),
        notes: z.string().nullable(),
        lines: z
          .array(
            z.object({
              product_id: z.number().int().positive(),
              quantity: z.number().int().positive(),
              unit_price_egp: z.string().regex(/^(0|[1-9][0-9]{0,14})(\.[0-9]{1,4})?$/),
              notes: z.string().nullable(),
            }),
          )
          .min(1),
      })
      .safeParse(await request.json());
    if (!input.success)
      return HttpResponse.json({ error: { code: 'VALIDATION_FAILED' } }, { status: 422 });
    const result = makeOrderPreview(input.data);
    return result
      ? HttpResponse.json({ data: result })
      : HttpResponse.json({ error: { code: 'NOT_FOUND' } }, { status: 404 });
  }),
  http.post('/api/v1/orders', async ({ request }) => {
    const key = request.headers.get('Idempotency-Key');
    if (!key) return HttpResponse.json({ error: { code: 'VALIDATION_FAILED' } }, { status: 422 });
    const replay = processedOrderKeys.get(key);
    if (replay) return HttpResponse.json(replay, { status: 201 });
    const input = z
      .object({
        customer_id: z.number().int().positive(),
        order_date: z.string().date(),
        requested_delivery_date: z.string().date().nullable(),
        notes: z.string().nullable(),
        lines: z
          .array(
            z.object({
              product_id: z.number().int().positive(),
              quantity: z.number().int().positive(),
              unit_price_egp: z.string().regex(/^(0|[1-9][0-9]{0,14})(\.[0-9]{1,4})?$/),
              notes: z.string().nullable(),
            }),
          )
          .min(1),
      })
      .safeParse(await request.json());
    if (!input.success)
      return HttpResponse.json({ error: { code: 'VALIDATION_FAILED' } }, { status: 422 });
    const customer = customers.find((item) => item.id === input.data.customer_id);
    const orderProducts = input.data.lines.map((line) =>
      products.find((item) => item.id === line.product_id),
    );
    if (!customer || orderProducts.some((product) => !product)) {
      return HttpResponse.json({ error: { code: 'NOT_FOUND' } }, { status: 404 });
    }
    const lines: OrderDetail['lines'] = [];
    for (const [index, line] of input.data.lines.entries()) {
      const product = orderProducts[index];
      if (!product) return HttpResponse.json({ error: { code: 'NOT_FOUND' } }, { status: 404 });
      lines.push({
        id: nextOrderLineId++,
        product_id: line.product_id,
        product_name: product.name,
        sku: product.sku,
        quantity: String(line.quantity),
        unit_price_egp: line.unit_price_egp,
      });
    }
    const order: OrderDetail = {
      id: nextOrderId++,
      order_number: `ORD-2026-${String(nextOrderId - 20001).padStart(4, '0')}`,
      customer_id: customer.id,
      customer_name: customer.name,
      order_date: input.data.order_date,
      requested_delivery_date: input.data.requested_delivery_date,
      status: 'draft',
      total_egp: null,
      line_count: lines.length,
      notes: input.data.notes,
      lines,
      stock_warnings: [],
      invoice_ids: [],
      delivery_ids: [],
    };
    orders = [...orders, order];
    processedOrderKeys.set(key, order);
    return HttpResponse.json(order, { status: 201 });
  }),
  http.get('/api/v1/orders/:orderId', ({ params }) => {
    const order = orders.find((item) => String(item.id) === params.orderId);
    return order
      ? HttpResponse.json(order)
      : HttpResponse.json({ error: { code: 'NOT_FOUND' } }, { status: 404 });
  }),
  http.post('/api/v1/orders/:orderId/cancel', async ({ params, request }) => {
    const key = request.headers.get('Idempotency-Key');
    if (!key) return HttpResponse.json({ error: { code: 'VALIDATION_FAILED' } }, { status: 422 });
    const replay = processedOrderKeys.get(key);
    if (replay) return HttpResponse.json(replay);
    const parsed = z
      .object({ reason: z.string().trim().min(1).max(1000) })
      .safeParse(await request.json());
    if (!parsed.success)
      return HttpResponse.json({ error: { code: 'VALIDATION_FAILED' } }, { status: 422 });
    const index = orders.findIndex((item) => String(item.id) === params.orderId);
    if (index < 0) return HttpResponse.json({ error: { code: 'NOT_FOUND' } }, { status: 404 });
    if (!['draft', 'confirmed'].includes(orders[index].status)) {
      return HttpResponse.json({ error: { code: 'CONFLICT' } }, { status: 409 });
    }
    const updated: OrderDetail = { ...orders[index], status: 'cancelled' };
    orders = orders.map((item, itemIndex) => (itemIndex === index ? updated : item));
    processedOrderKeys.set(key, updated);
    return HttpResponse.json(updated);
  }),
  http.post('/api/v1/orders/:orderId/confirm', async ({ params, request }) => {
    const key = request.headers.get('Idempotency-Key');
    if (!key) return HttpResponse.json({ error: { code: 'VALIDATION_FAILED' } }, { status: 422 });
    const replay = processedOrderKeys.get(key);
    if (replay) return HttpResponse.json(replay);
    const index = orders.findIndex((item) => String(item.id) === params.orderId);
    if (index < 0) return HttpResponse.json({ error: { code: 'NOT_FOUND' } }, { status: 404 });
    if (orders[index].status !== 'draft') {
      return HttpResponse.json({ error: { code: 'CONFLICT' } }, { status: 409 });
    }
    const requestedByProduct = new Map<number, bigint>();
    for (const line of orders[index].lines) {
      requestedByProduct.set(
        line.product_id,
        (requestedByProduct.get(line.product_id) ?? 0n) + BigInt(line.quantity),
      );
    }
    const warnings = [...requestedByProduct].flatMap(([productId, requested]) => {
      const product = products.find((item) => item.id === productId);
      const available = balances
        .filter((balance) => balance.product_id === productId)
        .reduce((quantity, balance) => quantity + BigInt(balance.quantity_on_hand), 0n);
      return requested > available && product
        ? [
            {
              product_id: productId,
              product_name: product.name,
              available_quantity: available.toString(),
              requested_quantity: requested.toString(),
            },
          ]
        : [];
    });
    const confirmed: OrderDetail = {
      ...orders[index],
      status: 'confirmed',
      stock_warnings: warnings,
    };
    orders = orders.map((item, itemIndex) => (itemIndex === index ? confirmed : item));
    processedOrderKeys.set(key, confirmed);
    return HttpResponse.json(confirmed);
  }),
  http.post('/api/v1/orders/:orderId/invoice', async ({ params, request }) => {
    const key = request.headers.get('Idempotency-Key');
    if (!key) return HttpResponse.json({ error: { code: 'VALIDATION_FAILED' } }, { status: 422 });
    const replay = processedOrderKeys.get(key);
    if (replay) return HttpResponse.json(replay);
    const index = orders.findIndex((item) => String(item.id) === params.orderId);
    if (index < 0) return HttpResponse.json({ error: { code: 'NOT_FOUND' } }, { status: 404 });
    const input = z
      .object({
        lines: z
          .array(
            z.object({
              order_line_id: z.number().int().positive(),
              warehouse_id: z.number().int().positive(),
            }),
          )
          .min(1),
      })
      .safeParse(await request.json());
    if (!input.success || orders[index].status !== 'confirmed') {
      return HttpResponse.json(
        { error: { code: input.success ? 'CONFLICT' : 'VALIDATION_FAILED' } },
        { status: input.success ? 409 : 422 },
      );
    }
    const current = orders[index];
    const selected = new Map(
      input.data.lines.map((line) => [line.order_line_id, line.warehouse_id]),
    );
    if (
      selected.size !== current.lines.length ||
      current.lines.some((line) => !selected.has(line.id))
    ) {
      return HttpResponse.json({ error: { code: 'VALIDATION_FAILED' } }, { status: 422 });
    }
    const requested = new Map<string, bigint>();
    for (const line of current.lines) {
      const warehouseId = selected.get(line.id)!;
      const key = `${line.product_id}:${warehouseId}`;
      requested.set(key, (requested.get(key) ?? 0n) + BigInt(line.quantity));
    }
    const balanceByKey = new Map<string, InventoryBalance>();
    for (const [key, quantity] of requested) {
      const [productId, warehouseId] = key.split(':').map((value) => Number.parseInt(value, 10));
      const balance = balances.find(
        (item) => item.product_id === productId && item.warehouse_id === warehouseId,
      );
      if (!balance || BigInt(balance.quantity_on_hand) < quantity) {
        return HttpResponse.json({ error: { code: 'CONFLICT' } }, { status: 409 });
      }
      balanceByKey.set(key, balance);
    }
    for (const [key, quantity] of requested) {
      const balance = balanceByKey.get(key);
      if (!balance) return HttpResponse.json({ error: { code: 'CONFLICT' } }, { status: 409 });
      const nextQuantity = BigInt(balance.quantity_on_hand) - quantity;
      balances = balances.map((item) =>
        item === balance ? { ...item, quantity_on_hand: nextQuantity.toString() } : item,
      );
    }
    const invoiceId = nextInvoiceId++;
    const invoiceNumber = `INV-2026-${String(invoiceId).padStart(4, '0')}`;
    const invoice: Invoice = {
      id: invoiceId,
      invoice_number: invoiceNumber,
      customer_id: current.customer_id,
      customer_name: current.customer_name,
      issue_date: new Date().toISOString().slice(0, 10),
      due_date: null,
      total_egp: null,
      paid_egp: null,
      remaining_egp: null,
      issuer_name: currentUser?.name ?? '',
      status: 'issued',
    };
    invoices = [...invoices, invoice];
    invoiceLines.set(
      invoice.id,
      current.lines.map((line) => ({
        product_name: line.product_name,
        sku: line.sku,
        quantity: line.quantity,
        unit_price_egp: line.unit_price_egp,
        discount_amount_egp: null,
        line_total_egp: null,
      })),
    );
    for (const line of current.lines) {
      const warehouseId = selected.get(line.id)!;
      const product = products.find((item) => item.id === line.product_id);
      const warehouse = warehouses.find((item) => item.id === warehouseId);
      if (!product || !warehouse) {
        return HttpResponse.json({ error: { code: 'NOT_FOUND' } }, { status: 404 });
      }
      movements = [
        {
          id: nextId++,
          movement_type: 'sale',
          product_id: product.id,
          product_name: product.name,
          warehouse_id: warehouse.id,
          warehouse_name: warehouse.name,
          quantity: `-${line.quantity}`,
          reference: invoiceNumber,
          movement_date: invoice.issue_date,
        },
        ...movements,
      ];
    }
    const updated: OrderDetail = {
      ...current,
      status: 'fulfilled',
      invoice_ids: [...current.invoice_ids, invoice.id],
    };
    orders = orders.map((item, itemIndex) => (itemIndex === index ? updated : item));
    const result: OrderInvoiceResult = {
      order: updated,
      invoice: {
        id: invoice.id,
        invoice_number: invoice.invoice_number,
        total_egp: null,
        status: 'issued',
      },
    };
    processedOrderKeys.set(key, result);
    return HttpResponse.json(result);
  }),
  http.get('/api/v1/deliveries', ({ request }) => paginated(deliveries, request)),
  http.post('/api/v1/deliveries', async ({ request }) => {
    const key = request.headers.get('Idempotency-Key');
    if (!key) return HttpResponse.json({ error: { code: 'VALIDATION_FAILED' } }, { status: 422 });
    const replay = processedDeliveryKeys.get(key);
    if (replay) return HttpResponse.json(replay, { status: 201 });
    const input = z
      .object({
        sales_order_id: z.number().int().positive().optional(),
        sales_document_id: z.number().int().positive().optional(),
        driver_user_id: z.number().int().positive().nullable(),
        driver_name_snapshot: z.string().max(160).nullable(),
        vehicle_plate: z.string().max(40).nullable(),
        delivery_address: z.string().max(500).nullable(),
        notes: z.string().nullable(),
      })
      .refine((data) => Boolean(data.sales_order_id) !== Boolean(data.sales_document_id))
      .safeParse(await request.json());
    if (!input.success)
      return HttpResponse.json({ error: { code: 'VALIDATION_FAILED' } }, { status: 422 });
    const order = input.data.sales_order_id
      ? orders.find((item) => item.id === input.data.sales_order_id && item.status === 'fulfilled')
      : undefined;
    const invoice = input.data.sales_document_id
      ? invoices.find(
          (item) =>
            item.id === input.data.sales_document_id && ['issued', 'paid'].includes(item.status),
        )
      : undefined;
    if ((input.data.sales_order_id && !order) || (input.data.sales_document_id && !invoice)) {
      return HttpResponse.json({ error: { code: 'CONFLICT' } }, { status: 409 });
    }
    const delivery: DeliveryRecord = {
      id: nextDeliveryId++,
      delivery_number: `DEL-2026-${String(nextDeliveryId - 22001).padStart(4, '0')}`,
      sales_order_id: order?.id ?? null,
      sales_document_id: invoice?.id ?? null,
      source_number: order?.order_number ?? invoice?.invoice_number ?? '',
      recipient_name: order?.customer_name ?? invoice?.customer_name ?? null,
      driver_name_snapshot: input.data.driver_name_snapshot,
      vehicle_plate: input.data.vehicle_plate,
      delivery_address: input.data.delivery_address,
      notes: input.data.notes,
      status: 'draft',
    };
    deliveries = [...deliveries, delivery];
    if (order) {
      orders = orders.map((item) =>
        item.id === order.id
          ? { ...item, delivery_ids: [...item.delivery_ids, delivery.id] }
          : item,
      );
    }
    processedDeliveryKeys.set(key, delivery);
    return HttpResponse.json(delivery, { status: 201 });
  }),
  http.get('/api/v1/deliveries/:deliveryId', ({ params }) => {
    const delivery = deliveries.find((item) => String(item.id) === params.deliveryId);
    return delivery
      ? HttpResponse.json(delivery)
      : HttpResponse.json({ error: { code: 'NOT_FOUND' } }, { status: 404 });
  }),
  http.patch('/api/v1/deliveries/:deliveryId/status', async ({ params, request }) => {
    const input = z
      .object({
        status: z.enum(['preparing', 'in_transit', 'delivered', 'cancelled']),
      })
      .safeParse(await request.json());
    if (!input.success)
      return HttpResponse.json({ error: { code: 'VALIDATION_FAILED' } }, { status: 422 });
    const index = deliveries.findIndex((item) => String(item.id) === params.deliveryId);
    if (index < 0) return HttpResponse.json({ error: { code: 'NOT_FOUND' } }, { status: 404 });
    const updated: DeliveryRecord = {
      ...deliveries[index],
      status: input.data.status,
    };
    deliveries = deliveries.map((item, itemIndex) => (itemIndex === index ? updated : item));
    return HttpResponse.json(updated);
  }),
  http.get('/api/v1/returns', ({ request }) => paginated(returns, request)),
  http.post('/api/v1/returns/preview', async ({ request }) => {
    const input = z
      .object({
        customer_id: z.number().int().positive(),
        issue_date: z.string().date(),
        original_document_id: z.number().int().positive().nullable().optional(),
        notes: z.string().nullable().optional(),
        lines: z
          .array(
            z.object({
              warehouse_id: z.number().int().positive(),
              quantity: z.number().int().positive(),
              original_document_line_id: z.number().int().positive().optional(),
              product_id: z.number().int().positive().optional(),
              unit_price_egp: z
                .string()
                .regex(/^(0|[1-9][0-9]{0,14})(\.[0-9]{1,4})?$/)
                .optional(),
              discount_amount_egp: z
                .string()
                .regex(/^(0|[1-9][0-9]{0,14})(\.[0-9]{1,4})?$/)
                .optional(),
              description: z.string().max(500).nullable().optional(),
            }),
          )
          .min(1),
      })
      .safeParse(await request.json());
    if (!input.success) {
      return HttpResponse.json({ error: { code: 'VALIDATION_FAILED' } }, { status: 422 });
    }
    const result = makeReturnPreview({
      ...input.data,
      original_document_id: input.data.original_document_id ?? null,
      notes: input.data.notes ?? null,
    });
    return result
      ? HttpResponse.json({ data: result })
      : HttpResponse.json({ error: { code: 'VALIDATION_FAILED' } }, { status: 422 });
  }),
  http.get('/api/v1/treasury/accounts', ({ request }) => paginated(treasuryAccounts, request)),
  http.post('/api/v1/treasury/accounts', async ({ request }) => {
    const key = request.headers.get('Idempotency-Key');
    if (!key) return HttpResponse.json({ error: { code: 'VALIDATION_FAILED' } }, { status: 422 });
    const replay = processedFinanceKeys.get(key);
    if (replay) return HttpResponse.json(replay, { status: 201 });
    const input = z
      .object({
        code: z.string().trim().min(1).max(80),
        name: z.string().trim().min(1).max(160),
        account_type: z.enum(['cash', 'bank', 'other']),
        notes: z.string().max(500).nullable(),
      })
      .safeParse(await request.json());
    if (!input.success)
      return HttpResponse.json({ error: { code: 'VALIDATION_FAILED' } }, { status: 422 });
    const account: TreasuryAccount = { id: nextId++, ...input.data, is_active: true };
    treasuryAccounts = [...treasuryAccounts, account];
    processedFinanceKeys.set(key, account);
    return HttpResponse.json(account, { status: 201 });
  }),
  http.get('/api/v1/treasury/accounts/:accountId/balance', ({ params }) => {
    const account = treasuryAccounts.find((item) => String(item.id) === params.accountId);
    return account
      ? HttpResponse.json({ balance_egp: treasuryAccountBalance(account.id) })
      : HttpResponse.json({ error: { code: 'NOT_FOUND' } }, { status: 404 });
  }),
  http.get('/api/v1/treasury/entries', ({ request }) => paginated(treasuryEntries, request)),
  http.post('/api/v1/treasury/entries', async ({ request }) => {
    const key = request.headers.get('Idempotency-Key');
    if (!key) return HttpResponse.json({ error: { code: 'VALIDATION_FAILED' } }, { status: 422 });
    const replay = processedFinanceKeys.get(key);
    if (replay) return HttpResponse.json(replay, { status: 201 });
    const input = z
      .object({
        treasury_account_id: z.number().int().positive(),
        direction: z.enum(['in', 'out']),
        entry_date: z.string().date(),
        amount_egp: z.string().regex(/^(0|[1-9][0-9]{0,14})(\.[0-9]{1,4})?$/),
        description: z.string().trim().min(1).max(500),
      })
      .safeParse(await request.json());
    if (!input.success)
      return HttpResponse.json({ error: { code: 'VALIDATION_FAILED' } }, { status: 422 });
    if (!treasuryAccounts.some((item) => item.id === input.data.treasury_account_id)) {
      return HttpResponse.json({ error: { code: 'NOT_FOUND' } }, { status: 404 });
    }
    const entry: TreasuryEntry = {
      id: nextId++,
      ...input.data,
      reference: null,
    };
    treasuryEntries = [entry, ...treasuryEntries];
    processedFinanceKeys.set(key, entry);
    return HttpResponse.json(entry, { status: 201 });
  }),
  http.get('/api/v1/treasury/transfers', ({ request }) => paginated(treasuryTransfers, request)),
  http.post('/api/v1/treasury/transfers', async ({ request }) => {
    const key = request.headers.get('Idempotency-Key');
    if (!key) return HttpResponse.json({ error: { code: 'VALIDATION_FAILED' } }, { status: 422 });
    const replay = processedFinanceKeys.get(key);
    if (replay) return HttpResponse.json(replay, { status: 201 });
    const input = z
      .object({
        transfer_date: z.string().date(),
        from_treasury_account_id: z.number().int().positive(),
        to_treasury_account_id: z.number().int().positive(),
        amount_egp: z.string().regex(/^(0|[1-9][0-9]{0,14})(\.[0-9]{1,4})?$/),
        notes: z.string().max(1000).nullable(),
      })
      .safeParse(await request.json());
    if (!input.success)
      return HttpResponse.json({ error: { code: 'VALIDATION_FAILED' } }, { status: 422 });
    const from = treasuryAccounts.find((item) => item.id === input.data.from_treasury_account_id);
    const to = treasuryAccounts.find((item) => item.id === input.data.to_treasury_account_id);
    if (!from || !to) return HttpResponse.json({ error: { code: 'NOT_FOUND' } }, { status: 404 });
    if (from.id === to.id)
      return HttpResponse.json({ error: { code: 'VALIDATION_FAILED' } }, { status: 422 });
    const transfer: TreasuryTransfer = {
      id: nextId++,
      ...input.data,
      from_account_name: from.name,
      to_account_name: to.name,
    };
    treasuryTransfers = [transfer, ...treasuryTransfers];
    processedFinanceKeys.set(key, transfer);
    return HttpResponse.json(transfer, { status: 201 });
  }),
  http.get('/api/v1/expense-categories', ({ request }) => paginated(expenseCategories, request)),
  http.post('/api/v1/expense-categories', async ({ request }) => {
    const key = request.headers.get('Idempotency-Key');
    if (!key) return HttpResponse.json({ error: { code: 'VALIDATION_FAILED' } }, { status: 422 });
    const replay = processedFinanceKeys.get(key);
    if (replay) return HttpResponse.json(replay, { status: 201 });
    const input = z
      .object({ name: z.string().trim().min(1).max(160) })
      .safeParse(await request.json());
    if (!input.success)
      return HttpResponse.json({ error: { code: 'VALIDATION_FAILED' } }, { status: 422 });
    const category: ExpenseCategory = { id: nextId++, name: input.data.name, is_active: true };
    expenseCategories = [...expenseCategories, category];
    processedFinanceKeys.set(key, category);
    return HttpResponse.json(category, { status: 201 });
  }),
  http.get('/api/v1/expenses', ({ request }) => paginated(expenses, request)),
  http.post('/api/v1/expenses', async ({ request }) => {
    const key = request.headers.get('Idempotency-Key');
    if (!key) return HttpResponse.json({ error: { code: 'VALIDATION_FAILED' } }, { status: 422 });
    const replay = processedFinanceKeys.get(key);
    if (replay) return HttpResponse.json(replay, { status: 201 });
    const input = z
      .object({
        expense_date: z.string().date(),
        treasury_account_id: z.number().int().positive(),
        expense_category_id: z.number().int().positive(),
        amount_egp: z.string().regex(/^(0|[1-9][0-9]{0,14})(\.[0-9]{1,4})?$/),
        description: z.string().trim().min(1).max(500),
        reference: z.string().max(160).nullable(),
      })
      .safeParse(await request.json());
    if (!input.success)
      return HttpResponse.json({ error: { code: 'VALIDATION_FAILED' } }, { status: 422 });
    const account = treasuryAccounts.find((item) => item.id === input.data.treasury_account_id);
    const category = expenseCategories.find((item) => item.id === input.data.expense_category_id);
    if (!account || !category)
      return HttpResponse.json({ error: { code: 'NOT_FOUND' } }, { status: 404 });
    const expense: Expense = {
      id: nextId++,
      ...input.data,
      treasury_account_name: account.name,
      expense_category_name: category.name,
    };
    const entry: TreasuryEntry = {
      id: nextId++,
      treasury_account_id: account.id,
      direction: 'out',
      entry_date: expense.expense_date,
      amount_egp: expense.amount_egp,
      description: expense.description,
      reference: expense.reference,
    };
    expenses = [expense, ...expenses];
    treasuryEntries = [entry, ...treasuryEntries];
    processedFinanceKeys.set(key, expense);
    return HttpResponse.json(expense, { status: 201 });
  }),
  http.get('/api/v1/collections', ({ request }) => paginated(collections, request)),
  http.post('/api/v1/collections', async ({ request }) => {
    const idempotencyKey = request.headers.get('Idempotency-Key');
    if (!idempotencyKey) {
      return HttpResponse.json(
        { error: { code: 'VALIDATION_FAILED', message: 'Idempotency-Key is required.' } },
        { status: 422 },
      );
    }
    const replay = processedCollectionKeys.get(idempotencyKey);
    if (replay) return HttpResponse.json(replay, { status: 201 });
    const input = z
      .object({
        customer_id: z.number().int().positive(),
        treasury_account_id: z.number().int().positive(),
        receipt_date: z.string().date(),
        amount_egp: z.string().regex(/^(0|[1-9][0-9]{0,14})(\.[0-9]{1,4})?$/),
        allocations: z
          .array(
            z.object({
              document_id: z.number().int().positive(),
              amount_egp: z.string().regex(/^(0|[1-9][0-9]{0,14})(\.[0-9]{1,4})?$/),
            }),
          )
          .optional(),
      })
      .safeParse(await request.json());
    if (!input.success) {
      return HttpResponse.json(
        { error: { code: 'VALIDATION_FAILED', message: 'Validation failed.' } },
        { status: 422 },
      );
    }
    const customer = customers.find((item) => item.id === input.data.customer_id);
    if (!customer || !treasuryAccounts.some((item) => item.id === input.data.treasury_account_id)) {
      return HttpResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Customer or treasury account not found.' } },
        { status: 404 },
      );
    }
    const allocations = input.data.allocations ?? [];
    if (
      allocations.some(
        (allocation) =>
          !invoices.some(
            (invoice) =>
              invoice.id === allocation.document_id &&
              invoice.customer_id === input.data.customer_id &&
              invoice.status !== 'cancelled',
          ),
      )
    ) {
      return HttpResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Invoice not found for customer.' } },
        { status: 404 },
      );
    }
    const toUnits = (value: string) => {
      const [whole, fraction = ''] = value.split('.');
      return BigInt(whole) * 10000n + BigInt(fraction.padEnd(4, '0'));
    };
    const amountUnits = toUnits(input.data.amount_egp);
    const allocatedUnits = allocations.reduce(
      (sum, allocation) => sum + toUnits(allocation.amount_egp),
      0n,
    );
    if (allocatedUnits > amountUnits) {
      return HttpResponse.json(
        { error: { code: 'VALIDATION_FAILED', message: 'Allocation exceeds receipt amount.' } },
        { status: 422 },
      );
    }
    const unallocatedUnits = amountUnits - allocatedUnits;
    const decimal = (units: bigint) =>
      `${units / 10000n}.${String(units % 10000n).padStart(4, '0')}`;
    const receipt: CollectionReceipt = {
      id: nextCollectionId++,
      receipt_number: `COL-MOCK-${nextCollectionId - 1}`,
      customer_id: customer.id,
      customer_name: customer.name,
      treasury_account_id: input.data.treasury_account_id,
      receipt_date: input.data.receipt_date,
      amount_egp: input.data.amount_egp,
      allocated_egp: decimal(allocatedUnits),
      unallocated_egp: decimal(unallocatedUnits),
    };
    collections = [receipt, ...collections];
    processedCollectionKeys.set(idempotencyKey, receipt);
    return HttpResponse.json(receipt, { status: 201 });
  }),
  http.get('/api/v1/invoices/:documentId', ({ params }) => {
    const invoice = invoices.find((item) => String(item.id) === params.documentId);
    if (!invoice) {
      return HttpResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Invoice not found.' } },
        { status: 404 },
      );
    }
    const customer = customers.find((item) => item.id === invoice.customer_id);
    return HttpResponse.json({
      ...invoice,
      customer_phone: customer?.phone ?? null,
      lines: invoiceLines.get(invoice.id) ?? [],
    });
  }),
  http.get('/api/v1/invoices/:documentId/history', ({ params, request }) => {
    const exists = invoices.some((item) => String(item.id) === params.documentId);
    if (!exists) {
      return HttpResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Invoice not found.' } },
        { status: 404 },
      );
    }
    return paginated([], request);
  }),
  http.post('/api/v1/invoices/preview', async ({ request }) => {
    const input = z
      .object({
        customer_id: z.number().int().positive(),
        issue_date: z.string().date(),
        due_date: z.string().date().nullable(),
        notes: z.string().nullable(),
        lines: z
          .array(
            z.object({
              product_id: z.number().int().positive(),
              warehouse_id: z.number().int().positive(),
              quantity: z.number().int().positive(),
              unit_price_egp: z.string().regex(/^(0|[1-9][0-9]{0,14})(\.[0-9]{1,4})?$/),
              discount_amount_egp: z
                .string()
                .regex(/^(0|[1-9][0-9]{0,14})(\.[0-9]{1,4})?$/)
                .optional(),
            }),
          )
          .min(1),
      })
      .safeParse(await request.json());
    if (!input.success) {
      return HttpResponse.json({ error: { code: 'VALIDATION_FAILED' } }, { status: 422 });
    }
    const result = makeInvoicePreview(input.data);
    return result
      ? HttpResponse.json({ data: result })
      : HttpResponse.json({ error: { code: 'NOT_FOUND' } }, { status: 404 });
  }),
  http.post('/api/v1/invoices', async ({ request }) => {
    const idempotencyKey = request.headers.get('Idempotency-Key');
    if (!idempotencyKey) {
      return HttpResponse.json(
        { error: { code: 'VALIDATION_FAILED', message: 'Idempotency-Key is required.' } },
        { status: 422 },
      );
    }
    const replay = processedInvoiceKeys.get(idempotencyKey);
    if (replay) return HttpResponse.json(replay, { status: 201 });
    const input = z
      .object({
        customer_id: z.number().int().positive(),
        issue_date: z.string().date(),
        due_date: z.string().date().nullable(),
        notes: z.string().nullable(),
        lines: z
          .array(
            z.object({
              product_id: z.number().int().positive(),
              warehouse_id: z.number().int().positive(),
              quantity: z.number().int().positive(),
              unit_price_egp: z.string().regex(/^(0|[1-9][0-9]{0,14})(\.[0-9]{1,4})?$/),
              discount_amount_egp: z
                .string()
                .regex(/^(0|[1-9][0-9]{0,14})(\.[0-9]{1,4})?$/)
                .optional(),
            }),
          )
          .min(1)
          .max(500),
      })
      .safeParse(await request.json());
    if (!input.success) {
      return HttpResponse.json(
        { error: { code: 'VALIDATION_FAILED', message: 'Validation failed.' } },
        { status: 422 },
      );
    }
    const customer = customers.find((item) => item.id === input.data.customer_id);
    if (
      !customer ||
      input.data.lines.some(
        (line) =>
          !products.some((item) => item.id === line.product_id) ||
          !warehouses.some((item) => item.id === line.warehouse_id),
      )
    ) {
      return HttpResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Customer, product or warehouse not found.' } },
        { status: 404 },
      );
    }
    const invoiceId = nextInvoiceId++;
    const invoiceNumber = `INV-DRAFT-${invoiceId}`;
    const draft: InvoiceDraft = {
      id: invoiceId,
      invoice_number: invoiceNumber,
      status: 'draft',
    };
    invoices = [
      ...invoices,
      {
        id: invoiceId,
        invoice_number: invoiceNumber,
        customer_id: customer.id,
        customer_name: customer.name,
        issue_date: input.data.issue_date,
        due_date: input.data.due_date,
        total_egp: null,
        paid_egp: null,
        remaining_egp: null,
        issuer_name: currentUser?.name ?? '',
        status: 'draft',
      },
    ];
    invoiceLines.set(
      invoiceId,
      input.data.lines.map((line) => {
        const product = products.find((item) => item.id === line.product_id);
        return {
          product_name: product?.name ?? '',
          sku: product?.sku ?? null,
          quantity: String(line.quantity),
          unit_price_egp: line.unit_price_egp,
          discount_amount_egp: line.discount_amount_egp ?? null,
          line_total_egp: null,
        };
      }),
    );
    processedInvoiceKeys.set(idempotencyKey, draft);
    return HttpResponse.json(draft, { status: 201 });
  }),
  http.post('/api/v1/invoices/:documentId/issue', ({ params, request }) => {
    const idempotencyKey = request.headers.get('Idempotency-Key');
    if (!idempotencyKey) {
      return HttpResponse.json(
        { error: { code: 'VALIDATION_FAILED', message: 'Idempotency-Key is required.' } },
        { status: 422 },
      );
    }
    const replay = processedIssueKeys.get(idempotencyKey);
    if (replay) return HttpResponse.json(replay);
    const invoiceId = Number(params.documentId);
    const index = invoices.findIndex((invoice) => invoice.id === invoiceId);
    if (index < 0 || invoices[index].status !== 'draft') {
      return HttpResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Draft invoice not found.' } },
        { status: 404 },
      );
    }
    const invoice = { ...invoices[index], status: 'issued' as const };
    invoices = invoices.map((item, itemIndex) => (itemIndex === index ? invoice : item));
    const issued: InvoiceDraft = {
      id: invoice.id,
      invoice_number: invoice.invoice_number,
      status: 'issued',
    };
    processedIssueKeys.set(idempotencyKey, issued);
    return HttpResponse.json(issued);
  }),
  http.post('/api/v1/invoices/:documentId/cancel', async ({ params, request }) => {
    const idempotencyKey = request.headers.get('Idempotency-Key');
    const invalidInput = () =>
      HttpResponse.json(
        { error: { code: 'VALIDATION_FAILED', message: 'Validation failed.' } },
        { status: 422 },
      );
    if (!idempotencyKey) return invalidInput();
    const replay = processedCancelKeys.get(idempotencyKey);
    if (replay) return HttpResponse.json(replay);
    const parsed = z
      .object({ reason: z.string().trim().min(1).max(1000) })
      .safeParse(await request.json());
    if (!parsed.success) return invalidInput();
    const index = invoices.findIndex(
      (invoice) => String(invoice.id) === params.documentId && invoice.status !== 'cancelled',
    );
    if (index < 0) {
      return HttpResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Invoice not found or already cancelled.' } },
        { status: 404 },
      );
    }
    const cancelled = { ...invoices[index], status: 'cancelled' as const };
    invoices = invoices.map((invoice, itemIndex) => (itemIndex === index ? cancelled : invoice));
    const result: InvoiceMutationResult = {
      id: cancelled.id,
      invoice_number: cancelled.invoice_number,
      status: 'cancelled',
    };
    processedCancelKeys.set(idempotencyKey, result);
    return HttpResponse.json(result);
  }),
  http.post('/api/v1/customers', async ({ request }) => {
    const input = z
      .object({
        name: z.string().trim().min(1).max(200),
        phone: z.string().max(32).nullable(),
        email: z.string().email().nullable(),
        address: z.string().max(500).nullable(),
        salesperson: z.string().max(160).nullable().optional(),
        tax_number: z.string().max(64).nullable().optional(),
        payment_terms: z.string().max(160).nullable().optional(),
        governorate: z.string().max(120).nullable(),
        credit_limit: z
          .string()
          .regex(/^(0|[1-9][0-9]{0,14})(\.[0-9]{1,4})?$/)
          .optional(),
        notes: z.string().nullable(),
      })
      .safeParse(await request.json());
    if (!input.success) {
      return HttpResponse.json(
        { error: { code: 'VALIDATION_FAILED', message: 'Validation failed.' } },
        { status: 422 },
      );
    }
    const customer: Customer = {
      id: nextId++,
      ...input.data,
      credit_limit: input.data.credit_limit ?? null,
      balance_egp: '0.00',
      unallocated_collection_egp: '0.00',
      is_active: true,
    };
    customers = [...customers, customer];
    return HttpResponse.json(customer, { status: 201 });
  }),
  http.patch('/api/v1/customers/:customerId', async ({ params, request }) => {
    const customerId = Number(params.customerId);
    const index = customers.findIndex((item) => item.id === customerId);
    if (index < 0) {
      return HttpResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Customer not found.' } },
        { status: 404 },
      );
    }
    const input = z
      .object({
        name: z.string().trim().min(1).max(200),
        phone: z.string().max(32).nullable(),
        email: z.string().email().nullable(),
        address: z.string().max(500).nullable(),
        salesperson: z.string().max(160).nullable().optional(),
        tax_number: z.string().max(64).nullable().optional(),
        payment_terms: z.string().max(160).nullable().optional(),
        governorate: z.string().max(120).nullable(),
        credit_limit: z
          .string()
          .regex(/^(0|[1-9][0-9]{0,14})(\.[0-9]{1,4})?$/)
          .optional(),
        notes: z.string().nullable(),
        is_active: z.boolean().optional(),
      })
      .safeParse(await request.json());
    if (!input.success) {
      return HttpResponse.json(
        { error: { code: 'VALIDATION_FAILED', message: 'Validation failed.' } },
        { status: 422 },
      );
    }
    const updated: Customer = { ...customers[index], ...input.data };
    customers = customers.map((item, itemIndex) => (itemIndex === index ? updated : item));
    return HttpResponse.json(updated);
  }),
  http.get('/api/v1/reports/customers/:customerId/statement', ({ params, request }) => {
    const customerId = Number(params.customerId);
    const customer = customers.find((item) => item.id === customerId);
    if (!customer) {
      return HttpResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Customer not found.' } },
        { status: 404 },
      );
    }
    const invoices = referenceSeed.invoices
      .filter((invoice) => invoice.customer_id === customerId)
      .map((invoice, index) => {
        const hasAllocatedReceipt = referenceSeed.collections.some(
          (collection) =>
            collection.customer_id === customerId && collection.allocated_egp !== '0.00',
        );
        return {
          id: 10_000 + index,
          document_type: 'invoice',
          reference: invoice.number,
          document_date: invoice.issue_date,
          description: null,
          debit_egp: invoice.total_egp,
          credit_egp: hasAllocatedReceipt ? '0.00' : invoice.paid_egp,
          unallocated_egp: '0.00',
        };
      });
    const collections = referenceSeed.collections
      .filter((collection) => collection.customer_id === customerId)
      .map((collection, index) => ({
        id: 20_000 + index,
        document_type: 'collection',
        reference: collection.number,
        document_date: collection.issue_date,
        description: null,
        debit_egp: '0.00',
        credit_egp: collection.allocated_egp,
        unallocated_egp: collection.unallocated_egp,
      }));
    const url = new URL(request.url);
    const fromDate = url.searchParams.get('from_date') ?? '';
    const toDate = url.searchParams.get('to_date') ?? '';
    const search = (url.searchParams.get('search') ?? '').toLocaleLowerCase('ar');
    const filtered = [...invoices, ...collections]
      .filter(
        (row) =>
          (!fromDate || row.document_date >= fromDate) &&
          (!toDate || row.document_date <= toDate) &&
          (!search ||
            `${row.reference} ${row.document_type}`.toLocaleLowerCase('ar').includes(search)),
      )
      .sort((left, right) => right.document_date.localeCompare(left.document_date));
    const page = Math.max(1, Number.parseInt(url.searchParams.get('page') ?? '1', 10) || 1);
    const perPage = Math.max(
      1,
      Number.parseInt(url.searchParams.get('per_page') ?? '10', 10) || 10,
    );
    const lastPage = Math.max(1, Math.ceil(filtered.length / perPage));
    return HttpResponse.json({
      data: filtered.slice((page - 1) * perPage, page * perPage),
      meta: {
        current_page: page,
        per_page: perPage,
        total: filtered.length,
        last_page: lastPage,
      },
      summary: {
        current_balance_egp: customer.balance_egp ?? '0.00',
        unallocated_collections_egp: customer.unallocated_collection_egp ?? '0.00',
      },
    });
  }),
  http.get('/api/v1/categories', ({ request }) => paginated(categories, request)),
  http.post('/api/v1/categories', async ({ request }) => {
    const input = z
      .object({ name: z.string().min(1), code: z.string().nullable(), is_active: z.boolean() })
      .safeParse(await request.json());
    if (!input.success) {
      return HttpResponse.json(
        { error: { code: 'VALIDATION_FAILED', message: 'Validation failed.' } },
        { status: 422 },
      );
    }
    const category: Category = {
      id: nextId++,
      code: input.data.code,
      name: input.data.name,
      parent_category_id: null,
      is_active: input.data.is_active,
    };
    categories = [...categories, category];
    return HttpResponse.json(category, { status: 201 });
  }),
  http.patch('/api/v1/categories/:categoryId', async ({ params, request }) => {
    const categoryId = Number(params.categoryId);
    const index = categories.findIndex((category) => category.id === categoryId);
    if (index < 0) {
      return HttpResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Category not found.' } },
        { status: 404 },
      );
    }
    const input = z
      .object({ name: z.string().min(1), code: z.string().nullable(), is_active: z.boolean() })
      .safeParse(await request.json());
    if (!input.success) {
      return HttpResponse.json(
        { error: { code: 'VALIDATION_FAILED', message: 'Validation failed.' } },
        { status: 422 },
      );
    }
    const category = { ...categories[index], ...input.data };
    categories = categories.map((item, itemIndex) => (itemIndex === index ? category : item));
    return HttpResponse.json(category);
  }),
  http.get('/api/v1/products/:productId/cost-history', ({ params, request }) => {
    const product = products.find((item) => String(item.id) === params.productId);
    if (!product) return HttpResponse.json({ error: { code: 'NOT_FOUND' } }, { status: 404 });
    return paginated(
      movements.filter((movement) => String(movement.product_id) === params.productId),
      request,
    );
  }),
  http.get('/api/v1/products', ({ request }) => paginated(products, request)),
  http.post('/api/v1/products', async ({ request }) => {
    const input = z
      .object({
        sku: z.string().min(1),
        barcode: z.string().nullable(),
        name: z.string().min(1),
        category_id: z.number().nullable(),
        unit_code: z.string().min(1),
        company_price: z.string().nullable().optional(),
        default_location_id: z.number().nullable(),
        minimum_stock: z.number().int().nonnegative().nullable(),
        description: z.string().nullable(),
        default_tax_rate: z
          .string()
          .regex(/^(0|[1-9][0-9]{0,2})(\.[0-9]{1,6})?$/)
          .nullable()
          .optional(),
        last_purchase_price_reference: z
          .string()
          .regex(/^(0|[1-9][0-9]{0,14})(\.[0-9]{1,4})?$/)
          .nullable()
          .optional(),
        is_active: z.boolean(),
      })
      .safeParse(await request.json());
    if (!input.success) {
      return HttpResponse.json(
        { error: { code: 'VALIDATION_FAILED', message: 'Validation failed.' } },
        { status: 422 },
      );
    }
    const product: Product = {
      id: nextId++,
      ...input.data,
      minimum_stock: input.data.minimum_stock === null ? null : String(input.data.minimum_stock),
      category_name: categories.find((category) => category.id === input.data.category_id)?.name,
      quantity_on_hand: '0',
    };
    products = [...products, product];
    return HttpResponse.json(product, { status: 201 });
  }),
  http.patch('/api/v1/products/:productId', async ({ params, request }) => {
    const productId = Number(params.productId);
    const index = products.findIndex((product) => product.id === productId);
    if (index < 0) {
      return HttpResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Product not found.' } },
        { status: 404 },
      );
    }
    const input = z
      .object({
        sku: z.string().min(1),
        barcode: z.string().nullable(),
        name: z.string().min(1),
        category_id: z.number().nullable(),
        unit_code: z.string().min(1),
        company_price: z.string().nullable().optional(),
        default_location_id: z.number().nullable(),
        minimum_stock: z.number().int().nonnegative().nullable(),
        description: z.string().nullable(),
        default_tax_rate: z
          .string()
          .regex(/^(0|[1-9][0-9]{0,2})(\.[0-9]{1,6})?$/)
          .nullable()
          .optional(),
        last_purchase_price_reference: z
          .string()
          .regex(/^(0|[1-9][0-9]{0,14})(\.[0-9]{1,4})?$/)
          .nullable()
          .optional(),
        is_active: z.boolean(),
      })
      .safeParse(await request.json());
    if (!input.success) {
      return HttpResponse.json(
        { error: { code: 'VALIDATION_FAILED', message: 'Validation failed.' } },
        { status: 422 },
      );
    }
    const product: Product = {
      ...products[index],
      ...input.data,
      minimum_stock: input.data.minimum_stock === null ? null : String(input.data.minimum_stock),
      category_name: categories.find((category) => category.id === input.data.category_id)?.name,
    };
    products = products.map((item, itemIndex) => (itemIndex === index ? product : item));
    return HttpResponse.json(product);
  }),
  http.get('/api/v1/warehouses', ({ request }) => paginated(warehouses, request)),
  http.post('/api/v1/warehouses', async ({ request }) => {
    const input = z
      .object({
        code: z.string().min(1),
        name: z.string().min(1),
        location_type: z.enum(['main', 'sub', 'vehicle', 'damaged', 'other']),
        parent_location_id: z.number().nullable(),
        is_active: z.boolean(),
        notes: z.string().nullable(),
      })
      .safeParse(await request.json());
    if (!input.success) {
      return HttpResponse.json(
        { error: { code: 'VALIDATION_FAILED', message: 'Validation failed.' } },
        { status: 422 },
      );
    }
    const warehouse: Warehouse = {
      id: nextId++,
      ...input.data,
    };
    warehouses = [...warehouses, warehouse];
    return HttpResponse.json(warehouse, { status: 201 });
  }),
  http.patch('/api/v1/warehouses/:warehouseId', async ({ params, request }) => {
    const warehouseId = Number(params.warehouseId);
    const index = warehouses.findIndex((warehouse) => warehouse.id === warehouseId);
    if (index < 0) {
      return HttpResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Warehouse not found.' } },
        { status: 404 },
      );
    }
    const input = z
      .object({
        code: z.string().min(1),
        name: z.string().min(1),
        location_type: z.enum(['main', 'sub', 'vehicle', 'damaged', 'other']),
        parent_location_id: z.number().nullable(),
        is_active: z.boolean(),
        notes: z.string().nullable(),
      })
      .safeParse(await request.json());
    if (!input.success) {
      return HttpResponse.json(
        { error: { code: 'VALIDATION_FAILED', message: 'Validation failed.' } },
        { status: 422 },
      );
    }
    const warehouse = { ...warehouses[index], ...input.data };
    warehouses = warehouses.map((item, itemIndex) => (itemIndex === index ? warehouse : item));
    return HttpResponse.json(warehouse);
  }),
  http.get('/api/v1/inventory/balances', ({ request }) => paginated(balances, request)),
  http.get('/api/v1/inventory/movements', ({ request }) => paginated(movements, request)),
  http.get('/api/v1/inventory/adjustments', ({ request }) =>
    paginated(
      movements.filter((movement) => movement.movement_type === 'adjustment'),
      request,
    ),
  ),
  http.post('/api/v1/inventory/adjustments', async ({ request }) => {
    return applyStockPost(request, 'adjustment');
  }),
  http.post('/api/v1/inventory/opening-stock', async ({ request }) => {
    return applyStockPost(request, 'opening');
  }),
  http.post('/api/v1/inventory/transfers', async ({ request }) => {
    return applyStockPost(request, 'transfer');
  }),
  http.get('/api/v1/containers', ({ request }) => paginated(containers, request)),
  http.post('/api/v1/containers', async ({ request }) => {
    const key = request.headers.get('Idempotency-Key');
    if (!key) return HttpResponse.json({ error: { code: 'VALIDATION_FAILED' } }, { status: 422 });
    const replay = processedContainerKeys.get(key);
    if (replay) return HttpResponse.json(replay, { status: 201 });
    const input = z
      .object({
        container_number: z.string().trim().min(1).max(100),
        supplier_id: z.number().int().positive().nullable(),
        origin: z.string().nullable(),
        destination: z.string().nullable(),
        notes: z.string().nullable(),
        estimated_departure: z.string().date().nullable(),
        estimated_arrival: z.string().date().nullable(),
      })
      .safeParse(await request.json());
    if (!input.success) {
      return HttpResponse.json({ error: { code: 'VALIDATION_FAILED' } }, { status: 422 });
    }
    const created: ContainerDetail = {
      id: nextContainerId++,
      ...input.data,
      supplier_name: null,
      status: 'draft',
      line_count: 0,
      expenses_egp: null,
      allocation_basis: null,
      lines: [],
      costs: [],
      receipts: [],
      status_history: [],
    };
    containers = [...containers, created];
    processedContainerKeys.set(key, created);
    return HttpResponse.json(created, { status: 201 });
  }),
  http.get('/api/v1/containers/:containerId', ({ params }) => {
    const item = containers.find((container) => String(container.id) === params.containerId);
    return item
      ? HttpResponse.json(item)
      : HttpResponse.json({ error: { code: 'NOT_FOUND' } }, { status: 404 });
  }),
  http.get('/api/v1/containers/:containerId/receipts', ({ params, request }) => {
    const container = containers.find((item) => String(item.id) === params.containerId);
    return container
      ? paginated(container.receipts, request)
      : HttpResponse.json({ error: { code: 'NOT_FOUND' } }, { status: 404 });
  }),
  http.get('/api/v1/containers/:containerId/receipts/:receiptId', ({ params }) => {
    const container = containers.find((item) => String(item.id) === params.containerId);
    const receipt = container?.receipts.find((item) => String(item.id) === params.receiptId);
    return receipt
      ? HttpResponse.json(receipt)
      : HttpResponse.json({ error: { code: 'NOT_FOUND' } }, { status: 404 });
  }),
  http.post('/api/v1/containers/:containerId/lines', async ({ params, request }) => {
    const key = request.headers.get('Idempotency-Key');
    if (!key) return HttpResponse.json({ error: { code: 'VALIDATION_FAILED' } }, { status: 422 });
    const replay = processedContainerKeys.get(key);
    if (replay) return HttpResponse.json(replay, { status: 201 });
    const index = containers.findIndex((container) => String(container.id) === params.containerId);
    if (index < 0) return HttpResponse.json({ error: { code: 'NOT_FOUND' } }, { status: 404 });
    const input = z
      .object({
        product_id: z.number().int().positive(),
        expected_quantity: z.number().int().positive(),
        purchase_value_egp: z.string().regex(/^(0|[1-9][0-9]{0,14})(\.[0-9]{1,4})?$/),
        notes: z.string().nullable(),
      })
      .safeParse(await request.json());
    if (!input.success)
      return HttpResponse.json({ error: { code: 'VALIDATION_FAILED' } }, { status: 422 });
    const product = products.find((item) => item.id === input.data.product_id);
    if (!product) return HttpResponse.json({ error: { code: 'NOT_FOUND' } }, { status: 404 });
    const line: ContainerLine = {
      id: nextContainerLineId++,
      ...input.data,
      product_name: product.name,
      sku: product.sku,
      expected_quantity: String(input.data.expected_quantity),
      received_quantity: '0',
    };
    const updated = {
      ...containers[index],
      lines: [...containers[index].lines, line],
      line_count: containers[index].lines.length + 1,
    };
    containers = containers.map((item, itemIndex) => (itemIndex === index ? updated : item));
    processedContainerKeys.set(key, line);
    return HttpResponse.json(line, { status: 201 });
  }),
  http.put('/api/v1/containers/:containerId/allocation-basis', async ({ params, request }) => {
    const index = containers.findIndex((container) => String(container.id) === params.containerId);
    if (index < 0) return HttpResponse.json({ error: { code: 'NOT_FOUND' } }, { status: 404 });
    const input = z
      .object({ allocation_basis: z.enum(['value', 'quantity', 'manual']) })
      .safeParse(await request.json());
    if (!input.success)
      return HttpResponse.json({ error: { code: 'VALIDATION_FAILED' } }, { status: 422 });
    containers = containers.map((item, itemIndex) =>
      itemIndex === index
        ? { ...item, allocation_basis: input.data.allocation_basis as AllocationBasis }
        : item,
    );
    return new HttpResponse(null, { status: 204 });
  }),
  http.patch('/api/v1/containers/:containerId/status', async ({ params, request }) => {
    const index = containers.findIndex((container) => String(container.id) === params.containerId);
    if (index < 0) return HttpResponse.json({ error: { code: 'NOT_FOUND' } }, { status: 404 });
    const input = z
      .object({
        status: z.enum(['in_transit', 'at_port', 'cancelled']),
        reason: z.string().trim().min(1).max(1000),
      })
      .safeParse(await request.json());
    if (!input.success)
      return HttpResponse.json({ error: { code: 'VALIDATION_FAILED' } }, { status: 422 });
    const history: ContainerStatusHistory = {
      id: Date.now(),
      status: input.data.status as ContainerStatus,
      reason: input.data.reason,
      changed_at: new Date().toISOString(),
      actor_name: currentUser?.name ?? null,
    };
    const updated = {
      ...containers[index],
      status: history.status,
      status_history: [history, ...containers[index].status_history],
    };
    containers = containers.map((item, itemIndex) => (itemIndex === index ? updated : item));
    return HttpResponse.json(updated);
  }),
  http.post('/api/v1/containers/:containerId/costs', async ({ params, request }) => {
    const key = request.headers.get('Idempotency-Key');
    if (!key) return HttpResponse.json({ error: { code: 'VALIDATION_FAILED' } }, { status: 422 });
    const replay = processedContainerKeys.get(key);
    if (replay) return HttpResponse.json(replay, { status: 201 });
    const index = containers.findIndex((container) => String(container.id) === params.containerId);
    if (index < 0) return HttpResponse.json({ error: { code: 'NOT_FOUND' } }, { status: 404 });
    const input = z
      .object({
        supplier_id: z.number().int().positive().nullable(),
        cost_type: z.string().trim().min(1).max(80),
        amount_egp: z.string().regex(/^(0|[1-9][0-9]{0,14})(\.[0-9]{1,4})?$/),
        description: z.string().max(500).nullable(),
        cost_date: z.string().date().nullable(),
        include_in_inventory_cost: z.boolean(),
        original_amount_reference: z.string().nullable(),
        exchange_rate_reference: z.string().nullable(),
        original_currency_code_reference: z.string().nullable(),
      })
      .safeParse(await request.json());
    if (!input.success)
      return HttpResponse.json({ error: { code: 'VALIDATION_FAILED' } }, { status: 422 });
    const cost: ContainerCost = {
      id: nextContainerCostId++,
      ...input.data,
      payments: [],
    };
    const updated = { ...containers[index], costs: [...containers[index].costs, cost] };
    containers = containers.map((item, itemIndex) => (itemIndex === index ? updated : item));
    processedContainerKeys.set(key, cost);
    return HttpResponse.json(cost, { status: 201 });
  }),
  http.post('/api/v1/container-costs/:costId/payments', async ({ params, request }) => {
    const key = request.headers.get('Idempotency-Key');
    if (!key) return HttpResponse.json({ error: { code: 'VALIDATION_FAILED' } }, { status: 422 });
    const replay = processedContainerKeys.get(key);
    if (replay) return HttpResponse.json(replay, { status: 201 });
    const input = z
      .object({
        treasury_entry_id: z.number().int().positive(),
        amount_egp: z.string().regex(/^(0|[1-9][0-9]{0,14})(\.[0-9]{1,4})?$/),
      })
      .safeParse(await request.json());
    if (!input.success)
      return HttpResponse.json({ error: { code: 'VALIDATION_FAILED' } }, { status: 422 });
    for (const [containerIndex, container] of containers.entries()) {
      const costIndex = container.costs.findIndex((cost) => String(cost.id) === params.costId);
      if (costIndex < 0) continue;
      const payment = {
        id: Date.now(),
        ...input.data,
        paid_at: new Date().toISOString(),
      };
      const costs = container.costs.map((cost, index) =>
        index === costIndex ? { ...cost, payments: [...cost.payments, payment] } : cost,
      );
      containers = containers.map((item, index) =>
        index === containerIndex ? { ...item, costs } : item,
      );
      processedContainerKeys.set(key, payment);
      return HttpResponse.json(payment, { status: 201 });
    }
    return HttpResponse.json({ error: { code: 'NOT_FOUND' } }, { status: 404 });
  }),
  http.post('/api/v1/containers/:containerId/landed-cost/preview', async ({ params, request }) => {
    const container = containers.find((item) => String(item.id) === params.containerId);
    if (!container) return HttpResponse.json({ error: { code: 'NOT_FOUND' } }, { status: 404 });
    const parsed = z
      .object({
        warehouse_id: z.number().int().positive(),
        received_at: z.string().datetime().optional(),
        movement_date: z.string().date().optional(),
        lines: z
          .array(
            z.object({
              container_line_id: z.number().int().positive(),
              expected_quantity: z.number().int().positive(),
              received_quantity: z.number().int().positive(),
            }),
          )
          .min(1),
        manual_allocations: z
          .record(z.record(z.string().regex(/^(0|[1-9][0-9]{0,14})(\.[0-9]{1,4})?$/)))
          .optional(),
      })
      .safeParse(await request.json());
    if (
      !parsed.success ||
      !warehouses.some((warehouse) => warehouse.id === parsed.data.warehouse_id)
    ) {
      return HttpResponse.json({ error: { code: 'VALIDATION_FAILED' } }, { status: 422 });
    }
    if (container.allocation_basis === 'manual' && !parsed.data.manual_allocations) {
      return HttpResponse.json({ error: { code: 'VALIDATION_FAILED' } }, { status: 422 });
    }
    const sourceLines = parsed.data.lines.map((line) => {
      const source = container.lines.find((item) => item.id === line.container_line_id);
      if (
        !source ||
        source.expected_quantity !== String(line.expected_quantity) ||
        BigInt(source.received_quantity) + BigInt(line.received_quantity) >
          BigInt(source.expected_quantity)
      ) {
        return null;
      }
      const purchase = roundedRatio(
        amountToUnits(source.purchase_value_egp) * BigInt(line.received_quantity),
        BigInt(line.expected_quantity),
      );
      return { source, quantity: line.received_quantity, purchase };
    });
    if (sourceLines.some((line) => line === null)) {
      return HttpResponse.json({ error: { code: 'CONFLICT' } }, { status: 409 });
    }
    const validLines = sourceLines.filter((line) => line !== null);
    const costs = container.costs.filter((cost) => cost.include_in_inventory_cost);
    const totalCost = costs.reduce((sum, cost) => sum + amountToUnits(cost.amount_egp), 0n);
    const manualLineCosts = validLines.map((line) =>
      Object.values(parsed.data.manual_allocations?.[String(line.source.id)] ?? {}).reduce(
        (sum, amount) => sum + amountToUnits(amount),
        0n,
      ),
    );
    const manualTotal = manualLineCosts.reduce((sum, amount) => sum + amount, 0n);
    if (container.allocation_basis === 'manual' && manualTotal !== totalCost) {
      return HttpResponse.json({ error: { code: 'VALIDATION_FAILED' } }, { status: 422 });
    }
    const weights = validLines.map((line) =>
      container.allocation_basis === 'quantity' ? BigInt(line.quantity) : line.purchase,
    );
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0n);
    let allocatedSoFar = 0n;
    const previewLines: ContainerReceiptPreview['lines'] = validLines.map((line, index) => {
      const allocated =
        container.allocation_basis === 'manual'
          ? manualLineCosts[index]
          : totalWeight === 0n
            ? 0n
            : index === validLines.length - 1
              ? totalCost - allocatedSoFar
              : (totalCost * weights[index]) / totalWeight;
      allocatedSoFar += allocated;
      const totalLineCost = line.purchase + allocated;
      return {
        container_line_id: line.source.id,
        product_id: line.source.product_id,
        warehouse_id: parsed.data.warehouse_id,
        quantity: line.quantity,
        purchase_cost_egp: unitsToAmount(line.purchase),
        allocated_landed_cost_egp: unitsToAmount(allocated),
        line_cost_egp: unitsToAmount(totalLineCost),
        unit_cost_egp: unitsToAmount(roundedRatio(totalLineCost, BigInt(line.quantity))),
      };
    });
    return HttpResponse.json({
      data: {
        allocation_basis: container.allocation_basis ?? 'value',
        lines: previewLines,
        total_landed_cost_allocated_egp: unitsToAmount(allocatedSoFar),
      } satisfies ContainerReceiptPreview,
    });
  }),
  http.post('/api/v1/containers/:containerId/receipts', async ({ params, request }) => {
    const key = request.headers.get('Idempotency-Key');
    if (!key) return HttpResponse.json({ error: { code: 'VALIDATION_FAILED' } }, { status: 422 });
    const replay = processedContainerKeys.get(key);
    if (replay) return HttpResponse.json(replay, { status: 201 });
    const index = containers.findIndex((container) => String(container.id) === params.containerId);
    if (index < 0) return HttpResponse.json({ error: { code: 'NOT_FOUND' } }, { status: 404 });
    const input = z
      .object({
        warehouse_id: z.number().int().positive(),
        movement_date: z.string().date(),
        reason: z.string().max(1000).nullable(),
        lines: z
          .array(
            z.object({
              container_line_id: z.number().int().positive(),
              expected_quantity: z.number().int().positive(),
              received_quantity: z.number().int().positive(),
              discrepancy_reason: z.string().max(1000).nullable(),
            }),
          )
          .min(1),
        manual_allocations: z
          .record(z.record(z.string().regex(/^(0|[1-9][0-9]{0,14})(\.[0-9]{1,4})?$/)))
          .optional(),
      })
      .safeParse(await request.json());
    if (!input.success)
      return HttpResponse.json({ error: { code: 'VALIDATION_FAILED' } }, { status: 422 });
    const current = containers[index];
    const receiptLines = [];
    for (const received of input.data.lines) {
      const line = current.lines.find((item) => item.id === received.container_line_id);
      if (!line || line.expected_quantity !== String(received.expected_quantity)) {
        return HttpResponse.json({ error: { code: 'CONFLICT' } }, { status: 409 });
      }
      const nextQuantity = BigInt(line.received_quantity) + BigInt(received.received_quantity);
      if (nextQuantity > BigInt(line.expected_quantity)) {
        return HttpResponse.json({ error: { code: 'CONFLICT' } }, { status: 409 });
      }
      receiptLines.push({
        container_line_id: line.id,
        expected_quantity: line.expected_quantity,
        received_quantity: String(received.received_quantity),
        discrepancy_reason: received.discrepancy_reason,
      });
    }
    const receipt: ContainerReceipt = {
      id: nextContainerReceiptId++,
      received_at: new Date().toISOString(),
      warehouse_id: input.data.warehouse_id,
      status: 'posted',
      reason: input.data.reason,
      lines: receiptLines,
    };
    const warehouse = warehouses.find((item) => item.id === input.data.warehouse_id);
    if (!warehouse) return HttpResponse.json({ error: { code: 'NOT_FOUND' } }, { status: 404 });
    const receiptProducts = receiptLines.map((received) => {
      const line = current.lines.find((item) => item.id === received.container_line_id);
      return line ? (products.find((item) => item.id === line.product_id) ?? null) : null;
    });
    if (receiptProducts.some((product) => product === null)) {
      return HttpResponse.json({ error: { code: 'NOT_FOUND' } }, { status: 404 });
    }
    for (const [receiptIndex, received] of receiptLines.entries()) {
      const line = current.lines.find((item) => item.id === received.container_line_id);
      const product = receiptProducts[receiptIndex];
      if (!line || !product)
        return HttpResponse.json({ error: { code: 'NOT_FOUND' } }, { status: 404 });
      const previous = balances.find(
        (balance) => balance.product_id === product.id && balance.warehouse_id === warehouse.id,
      );
      const nextQuantity =
        BigInt(previous?.quantity_on_hand ?? '0') + BigInt(received.received_quantity);
      balances = previous
        ? balances.map((balance) =>
            balance === previous
              ? { ...balance, quantity_on_hand: nextQuantity.toString() }
              : balance,
          )
        : [
            ...balances,
            {
              product_id: product.id,
              product_name: product.name,
              sku: product.sku,
              warehouse_id: warehouse.id,
              warehouse_name: warehouse.name,
              quantity_on_hand: nextQuantity.toString(),
              minimum_stock: product.minimum_stock,
            },
          ];
      movements = [
        {
          id: nextId++,
          movement_type: 'container_receipt',
          product_id: product.id,
          product_name: product.name,
          warehouse_id: warehouse.id,
          warehouse_name: warehouse.name,
          quantity: received.received_quantity,
          reference: current.container_number,
          movement_date: input.data.movement_date,
        },
        ...movements,
      ];
    }
    const receivedByLine = new Map(
      receiptLines.map((line) => [line.container_line_id, line.received_quantity]),
    );
    const updatedLines = current.lines.map((line) => {
      const received = receivedByLine.get(line.id);
      return received
        ? {
            ...line,
            received_quantity: (BigInt(line.received_quantity) + BigInt(received)).toString(),
          }
        : line;
    });
    const fullyReceived = updatedLines.every(
      (line) => BigInt(line.received_quantity) >= BigInt(line.expected_quantity),
    );
    const updated = {
      ...current,
      lines: updatedLines,
      status: fullyReceived ? ('received' as const) : ('receiving' as const),
      receipts: [receipt, ...current.receipts],
    };
    containers = containers.map((item, itemIndex) => (itemIndex === index ? updated : item));
    processedContainerKeys.set(key, receipt);
    return HttpResponse.json(receipt, { status: 201 });
  }),
  http.post(
    '/api/v1/containers/:containerId/receipts/:receiptId/reverse',
    async ({ params, request }) => {
      const key = request.headers.get('Idempotency-Key');
      if (!key) return HttpResponse.json({ error: { code: 'VALIDATION_FAILED' } }, { status: 422 });
      if (processedContainerKeys.has(key)) return new HttpResponse(null, { status: 204 });
      const index = containers.findIndex(
        (container) => String(container.id) === params.containerId,
      );
      if (index < 0) return HttpResponse.json({ error: { code: 'NOT_FOUND' } }, { status: 404 });
      const input = z
        .object({ reason: z.string().trim().min(1).max(1000) })
        .safeParse(await request.json());
      if (!input.success)
        return HttpResponse.json({ error: { code: 'VALIDATION_FAILED' } }, { status: 422 });
      const current = containers[index];
      const receipt = current.receipts.find((item) => String(item.id) === params.receiptId);
      if (!receipt || receipt.status === 'reversed') {
        return HttpResponse.json({ error: { code: 'CONFLICT' } }, { status: 409 });
      }
      for (const received of receipt.lines) {
        const line = current.lines.find((item) => item.id === received.container_line_id);
        const balance = balances.find(
          (item) =>
            item.product_id === line?.product_id && item.warehouse_id === receipt.warehouse_id,
        );
        if (BigInt(balance?.quantity_on_hand ?? '0') < BigInt(received.received_quantity)) {
          return HttpResponse.json({ error: { code: 'CONFLICT' } }, { status: 409 });
        }
      }
      for (const received of receipt.lines) {
        const line = current.lines.find((item) => item.id === received.container_line_id)!;
        const product = products.find((item) => item.id === line.product_id)!;
        const warehouse = warehouses.find((item) => item.id === receipt.warehouse_id)!;
        const balance = balances.find(
          (item) => item.product_id === product.id && item.warehouse_id === warehouse.id,
        )!;
        const nextQuantity = BigInt(balance.quantity_on_hand) - BigInt(received.received_quantity);
        balances = balances.map((item) =>
          item === balance ? { ...item, quantity_on_hand: nextQuantity.toString() } : item,
        );
        movements = [
          {
            id: nextId++,
            movement_type: 'reversal',
            product_id: product.id,
            product_name: product.name,
            warehouse_id: warehouse.id,
            warehouse_name: warehouse.name,
            quantity: `-${received.received_quantity}`,
            reference: current.container_number,
            movement_date: new Date().toISOString().slice(0, 10),
          },
          ...movements,
        ];
      }
      const receipts = current.receipts.map((item) =>
        item.id === receipt.id
          ? { ...item, status: 'reversed' as const, reason: input.data.reason }
          : item,
      );
      const updatedLines = current.lines.map((line) => {
        const received = receipt.lines.find((item) => item.container_line_id === line.id);
        return received
          ? {
              ...line,
              received_quantity: (
                BigInt(line.received_quantity) - BigInt(received.received_quantity)
              ).toString(),
            }
          : line;
      });
      containers = containers.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              receipts,
              lines: updatedLines,
              status: updatedLines.every((line) => BigInt(line.received_quantity) === 0n)
                ? 'in_transit'
                : 'receiving',
            }
          : item,
      );
      processedContainerKeys.set(key, true);
      return new HttpResponse(null, { status: 204 });
    },
  ),
];

export type ReportCategoryId = 'sales' | 'containers' | 'profit' | 'inventory' | 'partners' | 'finance';

export type ReportDefinition = {
  id: string;
  name: string;
  purpose: string;
  filters: string[];
  outputs: string[];
  permissions: string[];
  path: string;
};

export type ReportCategory = {
  id: ReportCategoryId;
  name: string;
  description: string;
  reports: ReportDefinition[];
};

const entry = (
  id: string,
  name: string,
  purpose: string,
  filters: string[],
  outputs: string[],
  permissions: string[],
  path: string,
): ReportDefinition => ({ id, name, purpose, filters, outputs, permissions, path });

/** Reference declares 28 report templates in six categories. */
export const reportCatalog: ReportCategory[] = [
  {
    id: 'sales', name: 'تقارير المبيعات', description: 'إيرادات، أداء، عملاء',
    reports: [
      entry('sales-summary', 'ملخص المبيعات', 'متابعة إجمالي المبيعات وعدد الفواتير ومتوسطها.', ['من تاريخ', 'إلى تاريخ', 'الموظف', 'التجميع'], ['إجمالي المبيعات', 'عدد الفواتير', 'متوسط الفاتورة', 'تفصيل زمني وموظفين'], ['invoices.view'], '/reports/sales'),
      entry('sales-by-period', 'المبيعات حسب الفترة', 'مقارنة المبيعات أسبوعيًا أو شهريًا.', ['من تاريخ', 'إلى تاريخ', 'أسبوع أو شهر'], ['مبيعات كل فترة', 'عدد الفواتير'], ['invoices.view'], '/reports/sales?group_by=month'),
      entry('sales-by-employee', 'أداء الموظفين', 'عرض الفواتير والمبيعات حسب الموظف الذي اعتمد الفاتورة.', ['من تاريخ', 'إلى تاريخ', 'الموظف'], ['عدد الفواتير', 'إجمالي المبيعات', 'الخصومات'], ['invoices.view'], '/reports/sales?group_by=employee'),
      entry('sales-by-customer', 'مبيعات العملاء', 'مراجعة قيمة وعدد الفواتير المعتمدة لكل عميل.', ['من تاريخ', 'إلى تاريخ', 'العميل'], ['العميل', 'عدد الفواتير', 'إجمالي المبيعات'], ['invoices.view'], '/reports/sales?group_by=customer'),
      entry('sales-discounts', 'خصومات المبيعات', 'مراجعة الخصومات المثبتة على الفواتير المعتمدة.', ['من تاريخ', 'إلى تاريخ', 'العميل'], ['رقم الفاتورة', 'الخصم', 'صافي الفاتورة'], ['invoices.view'], '/reports/sales?group_by=discounts'),
      entry('sales-invoices', 'تفاصيل فواتير المبيعات', 'قائمة الفواتير المعتمدة الداخلة في إجمالي المبيعات.', ['من تاريخ', 'إلى تاريخ', 'الموظف', 'بحث'], ['رقم الفاتورة', 'العميل', 'التاريخ', 'الإجمالي'], ['invoices.view'], '/reports/sales?group_by=month'),
    ],
  },
  {
    id: 'containers', name: 'تقارير الحاويات', description: 'استلام، تكلفة فعلية',
    reports: [
      entry('container-costs', 'تكاليف الحاويات', 'عرض التكاليف المسجلة والمدفوعة والمتبقية لكل حاوية.', ['الحاوية', 'من تاريخ', 'إلى تاريخ', 'الحالة'], ['إجمالي التكلفة', 'المدفوع', 'المتبقي', 'بنود التكلفة'], ['reports.container_costs.view'], '/reports/container-costs'),
      entry('container-landed-cost', 'تكلفة الحاوية والموزع على المخزون', 'مراجعة إجمالي التكلفة والمدفوع والمتبقي والمبلغ الموزع على المخزون لكل حاوية.', ['الحاوية', 'حالة بند التكلفة', 'من تاريخ', 'إلى تاريخ'], ['إجمالي التكلفة', 'المدفوع', 'المتبقي', 'الموزع على المخزون', 'بنود التكلفة'], ['reports.container_costs.view'], '/reports/container-costs'),
      entry('container-receipts', 'استلامات الحاويات', 'متابعة الكميات المستلمة ومواقع تخزينها.', ['من تاريخ', 'إلى تاريخ', 'المخزن', 'نوع الحركة'], ['الصنف', 'الكمية المستلمة', 'المخزن', 'التاريخ'], ['inventory.view'], '/reports/stock-movements?movement_type=container_receipt'),
      entry('container-cost-payments', 'ملخص دفعات تكاليف الحاويات', 'مقارنة إجمالي المدفوع والمتبقي لكل حاوية.', ['الحاوية', 'الحالة', 'من تاريخ', 'إلى تاريخ'], ['إجمالي التكلفة', 'إجمالي المدفوع', 'المتبقي'], ['reports.container_costs.view'], '/reports/container-costs'),
    ],
  },
  {
    id: 'profit', name: 'تقارير الأرباح', description: 'ربحية، هوامش، P&L',
    reports: [
      entry('profit-loss', 'الأرباح والخسائر P&L', 'قائمة دخل مشتقة من القيود المحاسبية المرحّلة للفترة.', ['الشهر', 'فترة المقارنة'], ['الإيرادات', 'المصروفات', 'صافي الدخل', 'الهامش ونسبة المصروفات'], ['accounting.reports.view'], '/reports/profit-loss'),
      entry('invoice-profitability', 'ربحية الفواتير', 'مقارنة إيراد الفاتورة بتكلفة البضاعة المثبتة عليها.', ['من تاريخ', 'إلى تاريخ', 'العميل'], ['الإيراد', 'التكلفة', 'الربح', 'نسبة الزيادة'], ['profit.view', 'markup.view'], '/reports/invoice-profit'),
      entry('profit-distribution', 'توزيع الأرباح', 'عرض نصيب الشركة والشركاء وربط الإجماليات بدفتر التوزيع.', ['من تاريخ', 'إلى تاريخ'], ['ربح الشركة', 'ربح الشركاء', 'فرق المطابقة'], ['profit.view', 'costs.view'], '/reports/profit-distribution'),
      entry('profit-margins', 'تحليل هوامش الربح', 'تحليل هامش الربح على الفواتير ذات التكلفة المكتملة.', ['من تاريخ', 'إلى تاريخ', 'العميل'], ['الهامش', 'التكلفة', 'الإيراد'], ['profit.view', 'markup.view'], '/reports/invoice-profit'),
      entry('profit-by-container', 'ربحية الحاويات', 'مقارنة إيراد وتكلفة وربح الأصناف حسب الحاوية.', ['من تاريخ', 'إلى تاريخ', 'الحاوية'], ['الإيراد', 'تكلفة البضاعة', 'الربح', 'اكتمال التكلفة'], ['profit.view', 'costs.view'], '/reports/profit-distribution'),
    ],
  },
  {
    id: 'inventory', name: 'تقارير المخزون', description: 'حركات، تقييم، تحليل',
    reports: [
      entry('inventory-balance', 'تقرير المخزون', 'عرض الرصيد الحالي والقيمة والحالة لكل صنف ومخزن.', ['المخزن', 'الفئة', 'الصنف'], ['الرصيد', 'متوسط التكلفة', 'قيمة المخزون', 'حالة الحد الأدنى'], ['inventory.view'], '/reports/stock'),
      entry('inventory-movements', 'حركات المخزون', 'تتبع الاستلام والبيع والتحويل والتسوية والمرتجع والجرد.', ['من تاريخ', 'إلى تاريخ', 'المخزن', 'نوع الحركة'], ['التاريخ', 'الحركة', 'الصنف', 'الكمية', 'المرجع'], ['inventory.view'], '/reports/stock-movements'),
      entry('inventory-valuation', 'تقييم المخزون', 'عرض قيمة المخزون حسب متوسط التكلفة المسجل.', ['المخزن', 'الفئة'], ['الصنف', 'الرصيد', 'متوسط التكلفة', 'القيمة'], ['inventory.view', 'costs.view'], '/reports/stock'),
      entry('inventory-low-stock', 'ملخص الأصناف دون الحد الأدنى', 'عرض عدد الأصناف دون الحد الأدنى بجانب رصيد وقيمة المخزون الحاليين.', ['المخزن', 'الفئة', 'بحث'], ['عدد الأصناف دون الحد الأدنى', 'الرصيد الحالي لكل صنف', 'قيمة المخزون عند توفر صلاحيتها'], ['inventory.view'], '/reports/stock'),
      entry('inventory-stale', 'ملخص المخزون الراكد', 'عرض عدد الأصناف التي لم تتحرك منذ أكثر من 90 يومًا ضمن فلاتر المخزون الحالي.', ['المخزن', 'الفئة', 'بحث'], ['عدد الأصناف الراكدة', 'الرصيد الحالي', 'قيمة المخزون عند توفر صلاحيتها'], ['inventory.view'], '/reports/stock'),
    ],
  },
  {
    id: 'partners', name: 'العملاء والموردون', description: 'ذمم، كشوف، تحليل',
    reports: [
      entry('customer-balances', 'أرصدة العملاء', 'عرض الذمم والتحصيلات غير المخصصة لكل عميل.', ['العميل', 'بحث'], ['الرصيد', 'التحصيلات غير المخصصة'], ['reports.customer_balances.view'], '/reports/customer-balances'),
      entry('customer-statements', 'أرصدة العملاء وكشوف الحساب', 'ملخص الرصيد والتحصيلات غير المخصصة مع رابط لفتح كشف الحساب التفصيلي لكل عميل.', ['العميل', 'بحث'], ['الرصيد', 'التحصيلات غير المخصصة', 'فتح كشف الحساب التفصيلي'], ['reports.customer_balances.view'], '/reports/customer-balances'),
      entry('supplier-balances', 'إجمالي الالتزامات بالقوائم المالية', 'مراجعة أرصدة الالتزامات المرحلة في المركز المالي.', ['حتى تاريخ'], ['حسابات الالتزامات', 'الرصيد الختامي'], ['accounting.reports.view'], '/reports/financial?statement=balance'),
      entry('partner-balances', 'إجمالي حقوق الملكية بالقوائم المالية', 'مراجعة أرصدة حقوق الملكية المرحلة في المركز المالي.', ['حتى تاريخ'], ['حسابات حقوق الملكية', 'الرصيد الختامي'], ['accounting.reports.view'], '/reports/financial?statement=balance'),
    ],
  },
  {
    id: 'finance', name: 'التقارير المالية', description: 'قوائم مالية، تدفقات',
    reports: [
      entry('financial-statements', 'القوائم المالية', 'عرض القوائم الثلاث من القيود المرحّلة.', ['من تاريخ', 'إلى تاريخ'], ['قائمة الدخل', 'المركز المالي', 'التدفقات النقدية'], ['accounting.reports.view'], '/reports/financial'),
      entry('income-statement', 'قائمة الدخل', 'إجمالي الإيرادات والمصروفات وصافي الدخل في الفترة.', ['من تاريخ', 'إلى تاريخ'], ['الإيرادات', 'المصروفات', 'صافي الدخل'], ['accounting.reports.view'], '/reports/financial?statement=income'),
      entry('balance-sheet', 'المركز المالي', 'أرصدة الأصول والالتزامات وحقوق الملكية حتى تاريخ التقرير.', ['حتى تاريخ'], ['الأصول', 'الالتزامات', 'حقوق الملكية', 'فرق الاتزان'], ['accounting.reports.view'], '/reports/financial?statement=balance'),
      entry('cash-flow', 'التدفقات النقدية', 'حركة النقد الفعلية في الفترة من القيود المرحلة.', ['من تاريخ', 'إلى تاريخ'], ['رصيد أول المدة', 'المقبوضات', 'المدفوعات', 'رصيد آخر المدة'], ['accounting.reports.view'], '/reports/financial?statement=cash'),
    ],
  },
];

export const reportCount = reportCatalog.reduce((count, category) => count + category.reports.length, 0);

export function canViewReport(permissions: string[], report: ReportDefinition): boolean {
  return permissions.includes('*') || report.permissions.every((permission) => permissions.includes(permission));
}

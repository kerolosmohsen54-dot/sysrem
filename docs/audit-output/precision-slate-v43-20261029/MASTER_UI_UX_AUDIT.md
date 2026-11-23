# MASTER UI/UX AUDIT — Precision Slate ERP v43

Consolidated continuation of the existing audit. UI/UX screenshot evidence and actual click evidence are distinguished from static implementation inspection. Audit only; no application, backend, or database changes.


<a id="00-executive-summary"></a>

# 00 — الملخص التنفيذي

## الحالة

متابعة تشغيلية لتقرير MASTER_UI_UX_AUDIT.md بأدلة صور فعلية ونقرات مرئية في prototype المرجعي وواجهة React المعزولة. التدقيق غير مكتمل؛ الصور وMSW لا تثبت تكامل backend أو حفظ قاعدة البيانات.

## النطاق والتغطية المرئية

- المرجع: frontend/reference/precision-slate-erp-v43__3_ (1).html. النظام: React عبر Vite/MSW ببيانات اصطناعية؛ لا جلسة حقيقية أو اتصال قاعدة بيانات.
- 68 لوحة مرجعية وشاشة دخول واحدة، على 1280 و768 و390 بكسل. ظهرت 67/68 لوحة في DOM؛ sec-liq لم تظهر.
- 50/69 Screen IDs لها زوج صور على الأقل (49 لوحة والدخول). 47/69 لها نتيجة مقارنة مؤكدة واحدة على الأقل.
- 156 سجل مقارنة: 120 فرقًا بصريًا مؤكدًا، 3 سجل غياب ميزة، 15 سجل شاشة غائبة، 6 سجل placeholder، و12 غير متحققة.
- 19 لوحة من أصل 68 بلا زوج مرئي مباشر؛ أسبابها وسجلات صور النظام المرشحة في docs/ux-inventory/SCREEN_PAIR_BLOCKERS.csv.

## التفاعل والتدفقات

- جرد 592 عنصرًا؛ 13/592 عنصرًا لها نتيجة تفاعل مباشرة في هذه الجولة (تبويبات، فتح/إلغاء نوافذ آمنة، والرجوع/الانتقال). لا تمثل فحوص React/MSW تغطية العناصر فرديًا ولا تثبت backend.
- نقر المرجع على 60/105 محاولة لأهداف التنقل: 20/35 هدفًا فُعّل في المقاسات الثلاثة، و15 هدفًا بقيت محجوبة/غير مؤكدة. كما فُتحت تفاصيل العميل والفاتورة والحركة بالنقر على صفوف عند 1280/768/390 (9/9).
- تدفق end-to-end فعلي على backend/DB: 0/10؛ لم تُرسل عمليات حفظ أو حذف أو اعتماد أو تحصيل أو نقل.

## النتائج الأهم

- اختلافات الواجهة المؤكدة موزعة على الدخول، الطلبات والفواتير والعملاء، المخزون والحاويات، التقارير والتنقل العام.
- الميزانية والمصروفات المتكررة والمقارنة الشهرية وتوقع السيولة لها شاشات مرجعية غير موجودة؛ الاستيراد والملخص اليومي يفتحان placeholder؛ أداة ملصقات الباركود غائبة.
- تفاصيل العميل والفاتورة والحركة فُتحت بالنقر في المرجع عند المقاسات الثلاثة. تبويبات العميل الأربعة بدّلت محتواها، وزرا الرجوع في الفاتورة والحركة أعادا المستخدم للقائمة السابقة. فتح وإلغاء نافذتي الدفع والمرتجع نجح دون حفظ. تفاصيل حركة النظام مفقودة؛ انظر GAP-0073.
- مطابقة SCR-028 بمسار /warehouse-returns غير محسومة. 13 وجهة مالية فرعية لم تتفعّل بالنقر، وواجهتا alias للمالية لا تملكان وجهة مستقلة مؤكدة؛ SCR-055 غائبة من DOM، وSCR-068 محمية بـPIN.

## سجل الفجوات

73 Gap IDs: P0=0، P1=7، P2=62، P3=4. انظر سجل الفجوات 11 للحصول على المرجع والسلوك المتوقع والدليل ومعيار القبول لكل ID.

لم يتغير كود التطبيق أو backend أو قاعدة البيانات. حدود التحقق موضحة في 13، والحسابات التفصيلية في 14.

<a id="01-screen-inventory"></a>

# 01 — جرد الشاشات واللوحات

المصدر 68 لوحة section-content وشاشة دخول SCR-000. الحالة المرئية والدليل لكل شاشة بالأسفل؛ route closest لا يعني تطابقًا وظيفيًا.

| Screen ID | Reference DOM ID | الاسم | أقرب مسار | الحالة | الدليل |
|---|---|---|---|---|---|
| SCR-001 | sec-dashboard | لوحة التحكم | /dashboard | PARTIAL | docs/ux-inventory/screenshots/reference/screens/dashboard-1280.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/dashboard-1280.png; docs/ux-inventory/screenshots/system-mock/dashboard_visible_1280.png; docs/ux-inventory/screenshots/system-mock/dashboard_visible_390.png; docs/ux-inventory/screenshots/system-mock/all-dashboard-1280-side-by-side.png; docs/ux-inventory/screenshots/reference/screens/dashboard-390.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/dashboard-390.png; docs/ux-inventory/screenshots/system-mock/all-dashboard-390-side-by-side.png; docs/ux-inventory/screenshots/reference/screens/dashboard-768.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/dashboard-768.png; docs/ux-inventory/screenshots/system-mock/all-dashboard-768-side-by-side.png |
| SCR-002 | sec-customers | العملاء | /customers | NOT_VERIFIED | docs/ux-inventory/screenshots/reference/screens/customers-1280.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/customers-1280.png; docs/ux-inventory/screenshots/system-mock/all-customers-1280-side-by-side.png; docs/ux-inventory/screenshots/reference/screens/customers-390.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/customers-390.png; docs/ux-inventory/screenshots/system-mock/all-customers-390-side-by-side.png; docs/ux-inventory/screenshots/reference/screens/customers-768.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/customers-768.png; docs/ux-inventory/screenshots/system-mock/all-customers-768-side-by-side.png |
| SCR-003 | sec-orders | الطلبات | /orders | NOT_VERIFIED | docs/ux-inventory/screenshots/reference/screens/orders-1280.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/orders-1280.png; docs/ux-inventory/screenshots/system-mock/all-orders-1280-side-by-side.png; docs/ux-inventory/screenshots/reference/screens/orders-390.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/orders-390.png; docs/ux-inventory/screenshots/system-mock/all-orders-390-side-by-side.png; docs/ux-inventory/screenshots/reference/screens/orders-768.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/orders-768.png; docs/ux-inventory/screenshots/system-mock/all-orders-768-side-by-side.png |
| SCR-004 | sec-order-create | إنشاء طلب مبيعات جديد | /orders/new | PARTIAL | docs/ux-inventory/screenshots/reference/screens/order-create-1280.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/order-create-1280.png; docs/ux-inventory/screenshots/system-mock/fresh/order-create_1280.png; docs/ux-inventory/screenshots/system-mock/all-order-create-1280-side-by-side.png; docs/ux-inventory/screenshots/reference/screens/order-create-390.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/order-create-390.png; docs/ux-inventory/screenshots/system-mock/all-order-create-390-side-by-side.png; docs/ux-inventory/screenshots/reference/screens/order-create-768.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/order-create-768.png; docs/ux-inventory/screenshots/system-mock/all-order-create-768-side-by-side.png |
| SCR-005 | sec-order-detail | طلب مؤكد ومعتمد #ORD-2024-001 | /orders/:orderId | NOT_VERIFIED | docs/ux-inventory/screenshots/reference/screens/order-detail-1280.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/order-detail-1280.png; docs/ux-inventory/screenshots/system-mock/all-order-detail-1280-side-by-side.png; docs/ux-inventory/screenshots/reference/screens/order-detail-390.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/order-detail-390.png; docs/ux-inventory/screenshots/system-mock/all-order-detail-390-side-by-side.png; docs/ux-inventory/screenshots/reference/screens/order-detail-768.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/order-detail-768.png; docs/ux-inventory/screenshots/system-mock/all-order-detail-768-side-by-side.png |
| SCR-006 | sec-invoices | الفواتير | /invoices | NOT_VERIFIED | docs/ux-inventory/screenshots/reference/screens/invoices-1280.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/invoices-1280.png; docs/ux-inventory/screenshots/system-mock/all-invoices-1280-side-by-side.png; docs/ux-inventory/screenshots/reference/screens/invoices-390.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/invoices-390.png; docs/ux-inventory/screenshots/system-mock/all-invoices-390-side-by-side.png; docs/ux-inventory/screenshots/reference/screens/invoices-768.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/invoices-768.png; docs/ux-inventory/screenshots/system-mock/all-invoices-768-side-by-side.png |
| SCR-007 | sec-invoice-create | إنشاء فاتورة مبيعات جديدة | /invoices/new | NOT_VERIFIED | docs/ux-inventory/screenshots/reference/screens/invoice-create-1280.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/invoice-create-1280.png; docs/ux-inventory/screenshots/system-mock/all-invoice-create-1280-side-by-side.png; docs/ux-inventory/screenshots/reference/screens/invoice-create-390.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/invoice-create-390.png; docs/ux-inventory/screenshots/system-mock/all-invoice-create-390-side-by-side.png; docs/ux-inventory/screenshots/reference/screens/invoice-create-768.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/invoice-create-768.png; docs/ux-inventory/screenshots/system-mock/all-invoice-create-768-side-by-side.png; docs/ux-inventory/screenshots/reference/states/interaction-global-search-invoice-create-1280.png; docs/ux-inventory/screenshots/system-mock/react/states/interaction-global-search-invoice-create-1280.png; docs/ux-inventory/screenshots/system-mock/state-comparisons/global-search-1280-side-by-side.png; docs/ux-inventory/screenshots/reference/states/interaction-global-search-invoice-create-768.png; docs/ux-inventory/screenshots/system-mock/react/states/interaction-global-search-invoice-create-768.png; docs/ux-inventory/screenshots/system-mock/state-comparisons/global-search-768-side-by-side.png; docs/ux-inventory/screenshots/reference/states/interaction-global-search-invoice-create-390.png; docs/ux-inventory/screenshots/system-mock/react/states/interaction-global-search-invoice-create-390.png; docs/ux-inventory/screenshots/system-mock/state-comparisons/global-search-390-side-by-side.png; docs/ux-inventory/screenshots/reference/states/interaction-notifications-invoice-create-1280.png; docs/ux-inventory/screenshots/system-mock/react/states/interaction-notifications-invoice-create-1280.png; docs/ux-inventory/screenshots/system-mock/state-comparisons/notifications-1280-side-by-side.png; docs/ux-inventory/screenshots/reference/states/interaction-notifications-invoice-create-768.png; docs/ux-inventory/screenshots/system-mock/react/states/interaction-notifications-invoice-create-768.png; docs/ux-inventory/screenshots/system-mock/state-comparisons/notifications-768-side-by-side.png; docs/ux-inventory/screenshots/reference/states/interaction-notifications-invoice-create-390.png; docs/ux-inventory/screenshots/system-mock/react/states/interaction-notifications-invoice-create-390.png; docs/ux-inventory/screenshots/system-mock/state-comparisons/notifications-390-side-by-side.png |
| SCR-008 | sec-invoice-print | معاينة الطباعة | /invoices/:documentId/print | NOT_VERIFIED | docs/ux-inventory/screenshots/reference/screens/invoice-print-1280.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/invoice-print-1280.png; docs/ux-inventory/screenshots/system-mock/fresh/invoice-print_1280.png; docs/ux-inventory/screenshots/system-mock/all-invoice-print-1280-side-by-side.png; docs/ux-inventory/screenshots/reference/screens/invoice-print-390.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/invoice-print-390.png; docs/ux-inventory/screenshots/system-mock/all-invoice-print-390-side-by-side.png; docs/ux-inventory/screenshots/reference/screens/invoice-print-768.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/invoice-print-768.png; docs/ux-inventory/screenshots/system-mock/all-invoice-print-768-side-by-side.png |
| SCR-009 | sec-collections | لوحة التحصيل | /collections | NOT_VERIFIED | docs/ux-inventory/screenshots/reference/screens/collections-1280.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/collections-1280.png; docs/ux-inventory/screenshots/system-mock/all-collections-1280-side-by-side.png; docs/ux-inventory/screenshots/reference/screens/collections-390.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/collections-390.png; docs/ux-inventory/screenshots/system-mock/all-collections-390-side-by-side.png; docs/ux-inventory/screenshots/reference/screens/collections-768.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/collections-768.png; docs/ux-inventory/screenshots/system-mock/all-collections-768-side-by-side.png |
| SCR-010 | sec-deliveries | أذونات صرف المواد والتسليم | /deliveries | NOT_VERIFIED | docs/ux-inventory/screenshots/reference/screens/deliveries-1280.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/deliveries-1280.png; docs/ux-inventory/screenshots/system-mock/all-deliveries-1280-side-by-side.png; docs/ux-inventory/screenshots/reference/screens/deliveries-390.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/deliveries-390.png; docs/ux-inventory/screenshots/system-mock/all-deliveries-390-side-by-side.png; docs/ux-inventory/screenshots/reference/screens/deliveries-768.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/deliveries-768.png; docs/ux-inventory/screenshots/system-mock/all-deliveries-768-side-by-side.png |
| SCR-011 | sec-delivery-create | إنشاء إذن صرف وتوصيل جديد | /deliveries/new | NOT_VERIFIED | docs/ux-inventory/screenshots/reference/screens/delivery-create-1280.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/delivery-create-1280.png; docs/ux-inventory/screenshots/system-mock/all-delivery-create-1280-side-by-side.png; docs/ux-inventory/screenshots/reference/screens/delivery-create-390.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/delivery-create-390.png; docs/ux-inventory/screenshots/system-mock/all-delivery-create-390-side-by-side.png; docs/ux-inventory/screenshots/reference/screens/delivery-create-768.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/delivery-create-768.png; docs/ux-inventory/screenshots/system-mock/all-delivery-create-768-side-by-side.png |
| SCR-012 | sec-returns | المرتجعات | /returns | NOT_VERIFIED | docs/ux-inventory/screenshots/reference/screens/returns-1280.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/returns-1280.png; docs/ux-inventory/screenshots/system-mock/all-returns-1280-side-by-side.png; docs/ux-inventory/screenshots/reference/screens/returns-390.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/returns-390.png; docs/ux-inventory/screenshots/system-mock/all-returns-390-side-by-side.png; docs/ux-inventory/screenshots/reference/screens/returns-768.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/returns-768.png; docs/ux-inventory/screenshots/system-mock/all-returns-768-side-by-side.png |
| SCR-013 | sec-return-create | إنشاء مرتجع مبيعات جديد | /returns/new (InvoiceFormPage return mode) | NOT_VERIFIED | docs/ux-inventory/screenshots/reference/screens/return-create-1280.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/return-create-1280.png; docs/ux-inventory/screenshots/system-mock/all-return-create-1280-side-by-side.png; docs/ux-inventory/screenshots/reference/screens/return-create-390.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/return-create-390.png; docs/ux-inventory/screenshots/system-mock/all-return-create-390-side-by-side.png; docs/ux-inventory/screenshots/reference/screens/return-create-768.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/return-create-768.png; docs/ux-inventory/screenshots/system-mock/all-return-create-768-side-by-side.png |
| SCR-014 | sec-products | المنتجات والأصناف | /products | NOT_VERIFIED | docs/ux-inventory/screenshots/reference/screens/products-1280.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/products-1280.png; docs/ux-inventory/screenshots/system-mock/all-products-1280-side-by-side.png; docs/ux-inventory/screenshots/reference/screens/products-390.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/products-390.png; docs/ux-inventory/screenshots/system-mock/all-products-390-side-by-side.png; docs/ux-inventory/screenshots/reference/screens/products-768.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/products-768.png; docs/ux-inventory/screenshots/system-mock/all-products-768-side-by-side.png |
| SCR-015 | sec-inventory-summary | ملخص المخزون | /inventory | NOT_VERIFIED | docs/ux-inventory/screenshots/reference/screens/inventory-summary-1280.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/inventory-summary-1280.png; docs/ux-inventory/screenshots/system-mock/all-inventory-summary-1280-side-by-side.png; docs/ux-inventory/screenshots/reference/screens/inventory-summary-390.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/inventory-summary-390.png; docs/ux-inventory/screenshots/system-mock/all-inventory-summary-390-side-by-side.png; docs/ux-inventory/screenshots/reference/screens/inventory-summary-768.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/inventory-summary-768.png; docs/ux-inventory/screenshots/system-mock/all-inventory-summary-768-side-by-side.png |
| SCR-016 | sec-movements | حركات المخزون | /inventory/movements | NOT_VERIFIED | docs/ux-inventory/screenshots/reference/screens/movements-1280.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/movements-1280.png; docs/ux-inventory/screenshots/system-mock/all-movements-1280-side-by-side.png; docs/ux-inventory/screenshots/reference/screens/movements-390.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/movements-390.png; docs/ux-inventory/screenshots/system-mock/all-movements-390-side-by-side.png; docs/ux-inventory/screenshots/reference/screens/movements-768.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/movements-768.png; docs/ux-inventory/screenshots/system-mock/all-movements-768-side-by-side.png |
| SCR-017 | sec-finance | المالية | /finance | PARTIAL | docs/ux-inventory/screenshots/reference/screens/finance-1280.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/finance-1280.png; docs/ux-inventory/screenshots/system-mock/fresh/finance_390.png; docs/ux-inventory/screenshots/system-mock/all-finance-1280-side-by-side.png; docs/ux-inventory/screenshots/reference/screens/finance-390.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/finance-390.png; docs/ux-inventory/screenshots/system-mock/all-finance-390-side-by-side.png; docs/ux-inventory/screenshots/reference/screens/finance-768.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/finance-768.png; docs/ux-inventory/screenshots/system-mock/all-finance-768-side-by-side.png |
| SCR-018 | sec-containers | الحاويات | /containers | NOT_VERIFIED | docs/ux-inventory/screenshots/reference/screens/containers-1280.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/containers-1280.png; docs/ux-inventory/screenshots/system-mock/all-containers-1280-side-by-side.png; docs/ux-inventory/screenshots/reference/screens/containers-390.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/containers-390.png; docs/ux-inventory/screenshots/system-mock/all-containers-390-side-by-side.png; docs/ux-inventory/screenshots/reference/screens/containers-768.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/containers-768.png; docs/ux-inventory/screenshots/system-mock/all-containers-768-side-by-side.png |
| SCR-019 | sec-reports | مركز التقارير والذكاء التجاري | /reports | NOT_VERIFIED | docs/ux-inventory/screenshots/reference/screens/reports-1280.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/reports-1280.png; docs/ux-inventory/screenshots/system-mock/all-reports-1280-side-by-side.png; docs/ux-inventory/screenshots/reference/screens/reports-390.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/reports-390.png; docs/ux-inventory/screenshots/system-mock/all-reports-390-side-by-side.png; docs/ux-inventory/screenshots/reference/screens/reports-768.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/reports-768.png; docs/ux-inventory/screenshots/system-mock/all-reports-768-side-by-side.png |
| SCR-020 | sec-reports-sales | تقرير المبيعات | /reports/sales | NOT_VERIFIED | docs/ux-inventory/screenshots/reference/screens/reports-sales-1280.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/reports-sales-1280.png; docs/ux-inventory/screenshots/system-mock/all-reports-sales-1280-side-by-side.png; docs/ux-inventory/screenshots/reference/screens/reports-sales-390.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/reports-sales-390.png; docs/ux-inventory/screenshots/system-mock/all-reports-sales-390-side-by-side.png; docs/ux-inventory/screenshots/reference/screens/reports-sales-768.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/reports-sales-768.png; docs/ux-inventory/screenshots/system-mock/all-reports-sales-768-side-by-side.png |
| SCR-021 | sec-reports-profit | تقرير الأرباح والخسائر | /reports/invoice-profit | NOT_VERIFIED | docs/ux-inventory/screenshots/reference/screens/reports-profit-1280.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/reports-profit-1280.png; docs/ux-inventory/screenshots/system-mock/all-reports-profit-1280-side-by-side.png; docs/ux-inventory/screenshots/reference/screens/reports-profit-390.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/reports-profit-390.png; docs/ux-inventory/screenshots/system-mock/all-reports-profit-390-side-by-side.png; docs/ux-inventory/screenshots/reference/screens/reports-profit-768.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/reports-profit-768.png; docs/ux-inventory/screenshots/system-mock/all-reports-profit-768-side-by-side.png |
| SCR-022 | sec-users | المستخدم والصلاحيات | /admin/users | NOT_VERIFIED | docs/ux-inventory/screenshots/reference/screens/users-1280.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/users-1280.png; docs/ux-inventory/screenshots/system-mock/all-users-1280-side-by-side.png; docs/ux-inventory/screenshots/reference/screens/users-390.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/users-390.png; docs/ux-inventory/screenshots/system-mock/all-users-390-side-by-side.png; docs/ux-inventory/screenshots/reference/screens/users-768.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/users-768.png; docs/ux-inventory/screenshots/system-mock/all-users-768-side-by-side.png |
| SCR-023 | sec-warehouses | المخازن | /warehouses | NOT_VERIFIED | docs/ux-inventory/screenshots/reference/screens/warehouses-1280.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/warehouses-1280.png; docs/ux-inventory/screenshots/system-mock/all-warehouses-1280-side-by-side.png; docs/ux-inventory/screenshots/reference/screens/warehouses-390.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/warehouses-390.png; docs/ux-inventory/screenshots/system-mock/all-warehouses-390-side-by-side.png; docs/ux-inventory/screenshots/reference/screens/warehouses-768.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/warehouses-768.png; docs/ux-inventory/screenshots/system-mock/all-warehouses-768-side-by-side.png |
| SCR-024 | sec-reports-inventory | تقرير المخزون | /reports/stock | NOT_VERIFIED | docs/ux-inventory/screenshots/reference/screens/reports-inventory-1280.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/reports-inventory-1280.png; docs/ux-inventory/screenshots/system-mock/all-reports-inventory-1280-side-by-side.png; docs/ux-inventory/screenshots/reference/screens/reports-inventory-390.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/reports-inventory-390.png; docs/ux-inventory/screenshots/system-mock/all-reports-inventory-390-side-by-side.png; docs/ux-inventory/screenshots/reference/screens/reports-inventory-768.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/reports-inventory-768.png; docs/ux-inventory/screenshots/system-mock/all-reports-inventory-768-side-by-side.png |
| SCR-025 | sec-reports-financial | التقارير المالية | /reports/financial | NOT_VERIFIED | docs/ux-inventory/screenshots/reference/screens/reports-financial-1280.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/reports-financial-1280.png; docs/ux-inventory/screenshots/system-mock/all-reports-financial-1280-side-by-side.png; docs/ux-inventory/screenshots/reference/screens/reports-financial-390.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/reports-financial-390.png; docs/ux-inventory/screenshots/system-mock/all-reports-financial-390-side-by-side.png; docs/ux-inventory/screenshots/reference/screens/reports-financial-768.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/reports-financial-768.png; docs/ux-inventory/screenshots/system-mock/all-reports-financial-768-side-by-side.png |
| SCR-026 | sec-govs | المحافظات | /admin/governorates | PARTIAL | docs/ux-inventory/screenshots/reference/activated/governorates-1280.png; docs/ux-inventory/screenshots/reference/activated/governorates-768.png; docs/ux-inventory/screenshots/reference/activated/governorates-390.png; docs/ux-inventory/screenshots/system-mock/state-comparisons/round5-governorates-1280-side-by-side.png; docs/ux-inventory/screenshots/system-mock/state-comparisons/round5-governorates-768-side-by-side.png; docs/ux-inventory/screenshots/system-mock/state-comparisons/round5-governorates-390-side-by-side.png; docs/ux-inventory/screenshots/system-mock/react/visual-round3/governorates-1280.png; docs/ux-inventory/screenshots/system-mock/react/visual-round3/governorates-768.png; docs/ux-inventory/screenshots/system-mock/react/visual-round3/governorates-390.png |
| SCR-027 | sec-stock-add | إضافة إلى المخزون | /inventory/opening-stock (closest) | PARTIAL | docs/ux-inventory/screenshots/reference/activated/opening-stock-1280.png; docs/ux-inventory/screenshots/reference/activated/opening-stock-768.png; docs/ux-inventory/screenshots/reference/activated/opening-stock-390.png; docs/ux-inventory/screenshots/system-mock/state-comparisons/round5-opening-stock-1280-side-by-side.png; docs/ux-inventory/screenshots/system-mock/state-comparisons/round5-opening-stock-768-side-by-side.png; docs/ux-inventory/screenshots/system-mock/state-comparisons/round5-opening-stock-390-side-by-side.png; docs/ux-inventory/screenshots/system-mock/react/visual-round3/opening-stock-1280.png; docs/ux-inventory/screenshots/system-mock/react/visual-round3/opening-stock-768.png; docs/ux-inventory/screenshots/system-mock/react/visual-round3/opening-stock-390.png |
| SCR-028 | sec-stock-ret | المخزون المرتجع | /warehouse-returns | NOT_VERIFIED | docs/ux-inventory/screenshots/reference/activated/stock-returns-1280.png; docs/ux-inventory/screenshots/reference/activated/stock-returns-768.png; docs/ux-inventory/screenshots/reference/activated/stock-returns-390.png; docs/ux-inventory/screenshots/system-mock/state-comparisons/round5-stock-returns-1280-side-by-side.png; docs/ux-inventory/screenshots/system-mock/state-comparisons/round5-stock-returns-768-side-by-side.png; docs/ux-inventory/screenshots/system-mock/state-comparisons/round5-stock-returns-390-side-by-side.png; docs/ux-inventory/screenshots/system-mock/react/visual-round3/warehouse-returns-1280.png; docs/ux-inventory/screenshots/system-mock/react/visual-round3/warehouse-returns-768.png; docs/ux-inventory/screenshots/system-mock/react/visual-round3/warehouse-returns-390.png |
| SCR-029 | sec-trash | سلة المحذوفات | /admin/trash | PARTIAL | docs/ux-inventory/screenshots/reference/activated/trash-1280.png; docs/ux-inventory/screenshots/reference/activated/trash-768.png; docs/ux-inventory/screenshots/reference/activated/trash-390.png; docs/ux-inventory/screenshots/system-mock/state-comparisons/round5-trash-1280-side-by-side.png; docs/ux-inventory/screenshots/system-mock/state-comparisons/round5-trash-768-side-by-side.png; docs/ux-inventory/screenshots/system-mock/state-comparisons/round5-trash-390-side-by-side.png; docs/ux-inventory/screenshots/system-mock/react/visual-round3/trash-1280.png; docs/ux-inventory/screenshots/system-mock/react/visual-round3/trash-768.png; docs/ux-inventory/screenshots/system-mock/react/visual-round3/trash-390.png |
| SCR-030 | sec-cust-file | Generated panel (cust-file) | /customers/:customerId | PARTIAL | docs/ux-inventory/screenshots/reference/screens/cust-file-1280.png; docs/ux-inventory/screenshots/reference/row-click-details/customer-detail-1280.png; docs/ux-inventory/screenshots/system-mock/react/visual-round7/customer-detail-1280.png; docs/ux-inventory/screenshots/comparisons/row-click-details/scr-030-1280-side-by-side.png; docs/ux-inventory/screenshots/reference/row-click-details/customer-detail-768.png; docs/ux-inventory/screenshots/system-mock/react/visual-round7/customer-detail-768.png; docs/ux-inventory/screenshots/comparisons/row-click-details/scr-030-768-side-by-side.png; docs/ux-inventory/screenshots/reference/row-click-details/customer-detail-390.png; docs/ux-inventory/screenshots/system-mock/react/visual-round7/customer-detail-390.png; docs/ux-inventory/screenshots/comparisons/row-click-details/scr-030-390-side-by-side.png |
| SCR-031 | sec-inv-detail | Generated panel (inv-detail) | /invoices/:documentId | PARTIAL | docs/ux-inventory/screenshots/reference/screens/inv-detail-1280.png; docs/ux-inventory/screenshots/reference/row-click-details/invoice-detail-1280.png; docs/ux-inventory/screenshots/system-mock/react/visual-round7/invoice-detail-1280.png; docs/ux-inventory/screenshots/comparisons/row-click-details/scr-031-1280-side-by-side.png; docs/ux-inventory/screenshots/reference/row-click-details/invoice-detail-768.png; docs/ux-inventory/screenshots/system-mock/react/visual-round7/invoice-detail-768.png; docs/ux-inventory/screenshots/comparisons/row-click-details/scr-031-768-side-by-side.png; docs/ux-inventory/screenshots/reference/row-click-details/invoice-detail-390.png; docs/ux-inventory/screenshots/system-mock/react/visual-round7/invoice-detail-390.png; docs/ux-inventory/screenshots/comparisons/row-click-details/scr-031-390-side-by-side.png |
| SCR-032 | sec-drivers | سائق شركة الشحن | /admin/drivers | PARTIAL | docs/ux-inventory/screenshots/reference/activated/drivers-1280.png; docs/ux-inventory/screenshots/reference/activated/drivers-768.png; docs/ux-inventory/screenshots/reference/activated/drivers-390.png; docs/ux-inventory/screenshots/system-mock/state-comparisons/round5-drivers-1280-side-by-side.png; docs/ux-inventory/screenshots/system-mock/state-comparisons/round5-drivers-768-side-by-side.png; docs/ux-inventory/screenshots/system-mock/state-comparisons/round5-drivers-390-side-by-side.png; docs/ux-inventory/screenshots/system-mock/react/visual-round3/drivers-1280.png; docs/ux-inventory/screenshots/system-mock/react/visual-round3/drivers-768.png; docs/ux-inventory/screenshots/system-mock/react/visual-round3/drivers-390.png |
| SCR-033 | sec-log | سجل العمليات | /admin/audit | PARTIAL | docs/ux-inventory/screenshots/reference/activated/audit-1280.png; docs/ux-inventory/screenshots/reference/activated/audit-768.png; docs/ux-inventory/screenshots/reference/activated/audit-390.png; docs/ux-inventory/screenshots/system-mock/state-comparisons/round5-audit-1280-side-by-side.png; docs/ux-inventory/screenshots/system-mock/state-comparisons/round5-audit-768-side-by-side.png; docs/ux-inventory/screenshots/system-mock/state-comparisons/round5-audit-390-side-by-side.png; docs/ux-inventory/screenshots/system-mock/react/visual-round3/audit-1280.png; docs/ux-inventory/screenshots/system-mock/react/visual-round3/audit-768.png; docs/ux-inventory/screenshots/system-mock/react/visual-round3/audit-390.png |
| SCR-034 | sec-fin-overview | نظرة عامة مالية | /finance | NOT_VERIFIED | docs/ux-inventory/screenshots/reference/screens/fin-overview-1280.png |
| SCR-035 | sec-f-receipts | Generated panel (f-receipts) | /finance/inbox | NOT_VERIFIED | docs/ux-inventory/screenshots/reference/screens/f-receipts-1280.png |
| SCR-036 | sec-f-otherinc | Generated panel (f-otherinc) | /finance/inbox (closest | NOT_VERIFIED | docs/ux-inventory/screenshots/reference/screens/f-otherinc-1280.png |
| SCR-037 | sec-f-payments | Generated panel (f-payments) | /finance/withdrawals | NOT_VERIFIED | docs/ux-inventory/screenshots/reference/screens/f-payments-1280.png |
| SCR-038 | sec-f-expenses | Generated panel (f-expenses) | /finance/expenses | NOT_VERIFIED | docs/ux-inventory/screenshots/reference/screens/f-expenses-1280.png |
| SCR-039 | sec-f-transfers | Generated panel (f-transfers) | /finance/transfers | NOT_VERIFIED | docs/ux-inventory/screenshots/reference/screens/f-transfers-1280.png |
| SCR-040 | sec-f-treasury | Generated panel (f-treasury) | /finance/treasury | NOT_VERIFIED | docs/ux-inventory/screenshots/reference/screens/f-treasury-1280.png |
| SCR-041 | sec-f-custbal | Generated panel (f-custbal) | /reports/customer-balances | NOT_VERIFIED | docs/ux-inventory/screenshots/reference/screens/f-custbal-1280.png |
| SCR-042 | sec-f-supbal | Generated panel (f-supbal) | /purchase-invoices (supplier statement not verified) | NOT_VERIFIED | docs/ux-inventory/screenshots/reference/screens/f-supbal-1280.png |
| SCR-043 | sec-f-finret | Generated panel (f-finret) | /returns | NOT_VERIFIED | docs/ux-inventory/screenshots/reference/screens/f-finret-1280.png |
| SCR-044 | sec-f-coa | Generated panel (f-coa) | /finance/chart-of-accounts | NOT_VERIFIED | docs/ux-inventory/screenshots/reference/screens/f-coa-1280.png |
| SCR-045 | sec-f-journal | Generated panel (f-journal) | No direct route found | NOT_VERIFIED | docs/ux-inventory/screenshots/reference/screens/f-journal-1280.png |
| SCR-046 | sec-f-ledger | Generated panel (f-ledger) | No direct route found | NOT_VERIFIED | docs/ux-inventory/screenshots/reference/screens/f-ledger-1280.png |
| SCR-047 | sec-f-trial | Generated panel (f-trial) | No direct route found | NOT_VERIFIED | docs/ux-inventory/screenshots/reference/screens/f-trial-1280.png |
| SCR-048 | sec-f-reports | Generated panel (f-reports) | /reports/financial | NOT_VERIFIED | docs/ux-inventory/screenshots/reference/screens/f-reports-1280.png |
| SCR-049 | sec-f-stmt | Generated panel (f-stmt) | /customers/:customerId/statement | NOT_VERIFIED | docs/ux-inventory/screenshots/reference/screens/f-stmt-1280.png |
| SCR-050 | sec-transfers | نقل الحاويات بين المواقع | /container-transfers | PARTIAL | docs/ux-inventory/screenshots/reference/screens/transfers-1280.png; docs/ux-inventory/screenshots/reference/screens/transfers-768.png; docs/ux-inventory/screenshots/reference/screens/transfers-390.png; docs/ux-inventory/screenshots/system-mock/state-comparisons/round3-container-transfers-1280-side-by-side.png; docs/ux-inventory/screenshots/system-mock/state-comparisons/round3-container-transfers-768-side-by-side.png; docs/ux-inventory/screenshots/system-mock/state-comparisons/round3-container-transfers-390-side-by-side.png; docs/ux-inventory/screenshots/system-mock/react/visual-round3/container-transfers-1280.png; docs/ux-inventory/screenshots/system-mock/react/visual-round3/container-transfers-768.png; docs/ux-inventory/screenshots/system-mock/react/visual-round3/container-transfers-390.png |
| SCR-051 | sec-wh-returns | مرتجع المخازن | /warehouse-returns | PARTIAL | docs/ux-inventory/screenshots/reference/activated/warehouse-returns-1280.png; docs/ux-inventory/screenshots/reference/activated/warehouse-returns-768.png; docs/ux-inventory/screenshots/reference/activated/warehouse-returns-390.png; docs/ux-inventory/screenshots/system-mock/state-comparisons/round5-warehouse-returns-1280-side-by-side.png; docs/ux-inventory/screenshots/system-mock/state-comparisons/round5-warehouse-returns-768-side-by-side.png; docs/ux-inventory/screenshots/system-mock/state-comparisons/round5-warehouse-returns-390-side-by-side.png; docs/ux-inventory/screenshots/system-mock/react/visual-round3/warehouse-returns-1280.png; docs/ux-inventory/screenshots/system-mock/react/visual-round3/warehouse-returns-768.png; docs/ux-inventory/screenshots/system-mock/react/visual-round3/warehouse-returns-390.png |
| SCR-052 | sec-cont-money | أموال الحاويات | /container-funds | PARTIAL | docs/ux-inventory/screenshots/reference/activated/container-funds-1280.png; docs/ux-inventory/screenshots/reference/activated/container-funds-768.png; docs/ux-inventory/screenshots/reference/activated/container-funds-390.png; docs/ux-inventory/screenshots/system-mock/state-comparisons/round5-container-funds-1280-side-by-side.png; docs/ux-inventory/screenshots/system-mock/state-comparisons/round5-container-funds-768-side-by-side.png; docs/ux-inventory/screenshots/system-mock/state-comparisons/round5-container-funds-390-side-by-side.png; docs/ux-inventory/screenshots/system-mock/react/visual-round5/container-funds-selected-1280.png; docs/ux-inventory/screenshots/system-mock/react/visual-round5/container-funds-selected-768.png; docs/ux-inventory/screenshots/system-mock/react/visual-round5/container-funds-selected-390.png |
| SCR-053 | sec-move-detail | تفاصيل حركة المخزون | /inventory/movements (قائمة مرشحة؛ لا يوجد مسار تفاصيل) | MISSING | docs/ux-inventory/screenshots/reference/row-click-details/movement-detail-1280.png; docs/ux-inventory/screenshots/system-mock/react/visual-round7/movement-list-click-review-1280.png; docs/ux-inventory/screenshots/comparisons/row-click-details/scr-053-1280-side-by-side.png; docs/ux-inventory/screenshots/reference/row-click-details/movement-detail-768.png; docs/ux-inventory/screenshots/system-mock/react/visual-round7/movement-list-click-review-768.png; docs/ux-inventory/screenshots/comparisons/row-click-details/scr-053-768-side-by-side.png; docs/ux-inventory/screenshots/reference/row-click-details/movement-detail-390.png; docs/ux-inventory/screenshots/system-mock/react/visual-round7/movement-list-click-review-390.png; docs/ux-inventory/screenshots/comparisons/row-click-details/scr-053-390-side-by-side.png |
| SCR-054 | sec-fin2 | المالية | /finance | NOT_VERIFIED | docs/ux-inventory/screenshots/reference/screens/fin2-1280.png |
| SCR-055 | sec-liq | تصفية العميل | /customers/:customerId/liquidation | NOT_VERIFIED | docs/ux-inventory/screenshots/reference/manifest.json (panel absent) |
| SCR-056 | sec-x-budget | ميزانية المصروفات | No direct route found | MISSING | docs/ux-inventory/screenshots/reference/activated/expense-budget-1280.png; docs/ux-inventory/screenshots/reference/activated/expense-budget-768.png; docs/ux-inventory/screenshots/reference/activated/expense-budget-390.png; docs/ux-inventory/screenshots/system-mock/react/finance-overview-bottom.png; docs/ux-inventory/screenshots/system-mock/react/visual-round6/finance-overview-bottom-1280.png; docs/ux-inventory/screenshots/system-mock/state-comparisons/round6-expense-budget-1280-side-by-side.png; docs/ux-inventory/screenshots/system-mock/react/visual-round6/finance-overview-bottom-768.png; docs/ux-inventory/screenshots/system-mock/state-comparisons/round6-expense-budget-768-side-by-side.png; docs/ux-inventory/screenshots/system-mock/react/visual-round6/finance-overview-bottom-390.png; docs/ux-inventory/screenshots/system-mock/state-comparisons/round6-expense-budget-390-side-by-side.png |
| SCR-057 | sec-x-recur | مصروفات متكررة | No direct route found | MISSING | docs/ux-inventory/screenshots/reference/activated/recurring-expenses-1280.png; docs/ux-inventory/screenshots/reference/activated/recurring-expenses-768.png; docs/ux-inventory/screenshots/reference/activated/recurring-expenses-390.png; docs/ux-inventory/screenshots/system-mock/react/finance-overview-bottom.png; docs/ux-inventory/screenshots/system-mock/react/visual-round6/finance-overview-bottom-1280.png; docs/ux-inventory/screenshots/system-mock/state-comparisons/round6-recurring-expenses-1280-side-by-side.png; docs/ux-inventory/screenshots/system-mock/react/visual-round6/finance-overview-bottom-768.png; docs/ux-inventory/screenshots/system-mock/state-comparisons/round6-recurring-expenses-768-side-by-side.png; docs/ux-inventory/screenshots/system-mock/react/visual-round6/finance-overview-bottom-390.png; docs/ux-inventory/screenshots/system-mock/state-comparisons/round6-recurring-expenses-390-side-by-side.png |
| SCR-058 | sec-x-compare | مقارنة شهر بشهر | No direct route found | MISSING | docs/ux-inventory/screenshots/reference/activated/monthly-comparison-1280.png; docs/ux-inventory/screenshots/reference/activated/monthly-comparison-768.png; docs/ux-inventory/screenshots/reference/activated/monthly-comparison-390.png; docs/ux-inventory/screenshots/system-mock/react/finance-overview-bottom.png; docs/ux-inventory/screenshots/system-mock/react/visual-round6/finance-overview-bottom-1280.png; docs/ux-inventory/screenshots/system-mock/state-comparisons/round6-monthly-comparison-1280-side-by-side.png; docs/ux-inventory/screenshots/system-mock/react/visual-round6/finance-overview-bottom-768.png; docs/ux-inventory/screenshots/system-mock/state-comparisons/round6-monthly-comparison-768-side-by-side.png; docs/ux-inventory/screenshots/system-mock/react/visual-round6/finance-overview-bottom-390.png; docs/ux-inventory/screenshots/system-mock/state-comparisons/round6-monthly-comparison-390-side-by-side.png |
| SCR-059 | sec-x-cash | توقع السيولة | No direct route found | MISSING | docs/ux-inventory/screenshots/reference/activated/cash-forecast-1280.png; docs/ux-inventory/screenshots/reference/activated/cash-forecast-768.png; docs/ux-inventory/screenshots/reference/activated/cash-forecast-390.png; docs/ux-inventory/screenshots/system-mock/react/finance-overview-bottom.png; docs/ux-inventory/screenshots/system-mock/react/visual-round6/finance-overview-bottom-1280.png; docs/ux-inventory/screenshots/system-mock/state-comparisons/round6-cash-forecast-1280-side-by-side.png; docs/ux-inventory/screenshots/system-mock/react/visual-round6/finance-overview-bottom-768.png; docs/ux-inventory/screenshots/system-mock/state-comparisons/round6-cash-forecast-768-side-by-side.png; docs/ux-inventory/screenshots/system-mock/react/visual-round6/finance-overview-bottom-390.png; docs/ux-inventory/screenshots/system-mock/state-comparisons/round6-cash-forecast-390-side-by-side.png |
| SCR-060 | sec-x-track | تتبع الحاويات | /containers (related | PARTIAL | docs/ux-inventory/screenshots/reference/activated/container-tracking-1280.png; docs/ux-inventory/screenshots/reference/activated/container-tracking-768.png; docs/ux-inventory/screenshots/reference/activated/container-tracking-390.png; docs/ux-inventory/screenshots/system-mock/state-comparisons/round5-container-tracking-1280-side-by-side.png; docs/ux-inventory/screenshots/system-mock/state-comparisons/round5-container-tracking-768-side-by-side.png; docs/ux-inventory/screenshots/system-mock/state-comparisons/round5-container-tracking-390-side-by-side.png; docs/ux-inventory/screenshots/system-mock/react/visual-round5/container-tracking-candidate-1280.png; docs/ux-inventory/screenshots/system-mock/react/visual-round5/container-tracking-candidate-768.png; docs/ux-inventory/screenshots/system-mock/react/visual-round5/container-tracking-candidate-390.png |
| SCR-061 | sec-x-low | حد أدنى للمخزون | /inventory/minimum-stock | PARTIAL | docs/ux-inventory/screenshots/reference/activated/minimum-stock-1280.png; docs/ux-inventory/screenshots/reference/activated/minimum-stock-768.png; docs/ux-inventory/screenshots/reference/activated/minimum-stock-390.png; docs/ux-inventory/screenshots/system-mock/state-comparisons/round5-minimum-stock-1280-side-by-side.png; docs/ux-inventory/screenshots/system-mock/state-comparisons/round5-minimum-stock-768-side-by-side.png; docs/ux-inventory/screenshots/system-mock/state-comparisons/round5-minimum-stock-390-side-by-side.png; docs/ux-inventory/screenshots/system-mock/react/visual-round3/minimum-stock-1280.png; docs/ux-inventory/screenshots/system-mock/react/visual-round3/minimum-stock-768.png; docs/ux-inventory/screenshots/system-mock/react/visual-round3/minimum-stock-390.png |
| SCR-062 | sec-x-count | الجرد الدوري | /inventory/counts | PARTIAL | docs/ux-inventory/screenshots/reference/activated/inventory-counts-1280.png; docs/ux-inventory/screenshots/reference/activated/inventory-counts-768.png; docs/ux-inventory/screenshots/reference/activated/inventory-counts-390.png; docs/ux-inventory/screenshots/system-mock/state-comparisons/round5-inventory-counts-1280-side-by-side.png; docs/ux-inventory/screenshots/system-mock/state-comparisons/round5-inventory-counts-768-side-by-side.png; docs/ux-inventory/screenshots/system-mock/state-comparisons/round5-inventory-counts-390-side-by-side.png; docs/ux-inventory/screenshots/system-mock/react/visual-round3/inventory-counts-1280.png; docs/ux-inventory/screenshots/system-mock/react/visual-round3/inventory-counts-768.png; docs/ux-inventory/screenshots/system-mock/react/visual-round3/inventory-counts-390.png |
| SCR-063 | sec-x-bar | باركود الأصناف | No direct route found | MISSING | docs/ux-inventory/screenshots/reference/activated/barcode-labels-1280.png; docs/ux-inventory/screenshots/reference/activated/barcode-labels-768.png; docs/ux-inventory/screenshots/reference/activated/barcode-labels-390.png; docs/ux-inventory/screenshots/system-mock/state-comparisons/round5-barcode-labels-1280-side-by-side.png; docs/ux-inventory/screenshots/system-mock/state-comparisons/round5-barcode-labels-768-side-by-side.png; docs/ux-inventory/screenshots/system-mock/state-comparisons/round5-barcode-labels-390-side-by-side.png; docs/ux-inventory/screenshots/system-mock/react/visual-round5/products-1280.png; docs/ux-inventory/screenshots/system-mock/react/visual-round5/products-768.png; docs/ux-inventory/screenshots/system-mock/react/visual-round5/products-390.png |
| SCR-064 | sec-x-price | سجل أسعار الشراء | /products/:productId/cost-history | PARTIAL | docs/ux-inventory/screenshots/reference/activated/product-cost-history-1280.png; docs/ux-inventory/screenshots/reference/activated/product-cost-history-768.png; docs/ux-inventory/screenshots/reference/activated/product-cost-history-390.png; docs/ux-inventory/screenshots/system-mock/state-comparisons/round5-product-cost-history-1280-side-by-side.png; docs/ux-inventory/screenshots/system-mock/state-comparisons/round5-product-cost-history-768-side-by-side.png; docs/ux-inventory/screenshots/system-mock/state-comparisons/round5-product-cost-history-390-side-by-side.png; docs/ux-inventory/screenshots/system-mock/react/visual-round5/product-cost-history-1280.png; docs/ux-inventory/screenshots/system-mock/react/visual-round5/product-cost-history-768.png; docs/ux-inventory/screenshots/system-mock/react/visual-round5/product-cost-history-390.png |
| SCR-065 | sec-x-import | استيراد من إكسل | AppShell demo modal | UI_ONLY | docs/ux-inventory/screenshots/reference/activated/excel-import-1280.png; docs/ux-inventory/screenshots/reference/activated/excel-import-768.png; docs/ux-inventory/screenshots/reference/activated/excel-import-390.png; docs/ux-inventory/screenshots/system-mock/react/locked-excel-import.png; docs/ux-inventory/screenshots/system-mock/react/visual-round6/locked-excel-import-1280.png; docs/ux-inventory/screenshots/system-mock/state-comparisons/round6-excel-import-1280-side-by-side.png; docs/ux-inventory/screenshots/system-mock/react/visual-round6/locked-excel-import-768.png; docs/ux-inventory/screenshots/system-mock/state-comparisons/round6-excel-import-768-side-by-side.png; docs/ux-inventory/screenshots/system-mock/react/visual-round6/locked-excel-import-390.png; docs/ux-inventory/screenshots/system-mock/state-comparisons/round6-excel-import-390-side-by-side.png |
| SCR-066 | sec-x-daily | الملخص اليومي | AppShell demo modal | UI_ONLY | docs/ux-inventory/screenshots/reference/activated/daily-summary-1280.png; docs/ux-inventory/screenshots/reference/activated/daily-summary-768.png; docs/ux-inventory/screenshots/reference/activated/daily-summary-390.png; docs/ux-inventory/screenshots/system-mock/react/locked-daily-summary.png; docs/ux-inventory/screenshots/system-mock/react/visual-round6/locked-daily-summary-1280.png; docs/ux-inventory/screenshots/system-mock/state-comparisons/round6-daily-summary-1280-side-by-side.png; docs/ux-inventory/screenshots/system-mock/react/visual-round6/locked-daily-summary-768.png; docs/ux-inventory/screenshots/system-mock/state-comparisons/round6-daily-summary-768-side-by-side.png; docs/ux-inventory/screenshots/system-mock/react/visual-round6/locked-daily-summary-390.png; docs/ux-inventory/screenshots/system-mock/state-comparisons/round6-daily-summary-390-side-by-side.png |
| SCR-067 | sec-x-app | تثبيت كتطبيق | /admin/install | PARTIAL | docs/ux-inventory/screenshots/reference/activated/install-app-1280.png; docs/ux-inventory/screenshots/reference/activated/install-app-768.png; docs/ux-inventory/screenshots/reference/activated/install-app-390.png; docs/ux-inventory/screenshots/system-mock/state-comparisons/round5-install-app-1280-side-by-side.png; docs/ux-inventory/screenshots/system-mock/state-comparisons/round5-install-app-768-side-by-side.png; docs/ux-inventory/screenshots/system-mock/state-comparisons/round5-install-app-390-side-by-side.png; docs/ux-inventory/screenshots/system-mock/react/visual-round3/pwa-install-1280.png; docs/ux-inventory/screenshots/system-mock/react/visual-round3/pwa-install-768.png; docs/ux-inventory/screenshots/system-mock/react/visual-round3/pwa-install-390.png |
| SCR-068 | sec-x-priv | ملاحظاتي | No direct route found | NOT_VERIFIED | docs/ux-inventory/screenshots/reference/screens/x-priv-1280.png |
| SCR-000 | login-user / login-pass | تسجيل الدخول | /login | PARTIAL | docs/ux-inventory/screenshots/reference/states/login-390.png; docs/ux-inventory/screenshots/system-live/login_390.png; docs/ux-inventory/screenshots/reference/states/login-1280.png; docs/ux-inventory/screenshots/system-mock/react/login/login-1280.png; docs/ux-inventory/screenshots/visual-review-round2/login-1280-side-by-side.png; docs/ux-inventory/screenshots/reference/states/login-768.png; docs/ux-inventory/screenshots/system-mock/react/login/login-768.png; docs/ux-inventory/screenshots/visual-review-round2/login-768-side-by-side.png; docs/ux-inventory/screenshots/system-mock/react/login/login-390.png; docs/ux-inventory/screenshots/visual-review-round2/login-390-side-by-side.png |

## التغطية

50 من 69 Screen IDs لها زوج صور على الأقل (49 لوحة ودخول)، و47 لها نتيجة مقارنة مؤكدة. بقيت 19 لوحة بلا زوج مباشر. sec-liq لم تظهر. 13 وجهة مالية فرعية لم تتفعل بالنقر؛ SCR-028 لها مرشح /warehouse-returns غير محسوم، وSCR-068 محمية بـPIN. جرد overlays الثمانية محفوظ في المواصفات، لكن فتح كل حالة واختبارها غير مكتمل.

<a id="02-screen-by-screen-specification"></a>

# 02 - Screen-by-screen source specification

This inventory records reference headings, descriptions, field labels, table headers, and interactive content found in the initialized DOM. It does not claim that every interaction state has been tested.

## SCR-001 - لوحة التحكم

- Reference panel: sec-dashboard; area: core screen, sub-screen or state.
- Purpose text: آخر تحديث: اليوم الساعة 11:42 ص.
- Closest React route: /dashboard; implementation file candidate: frontend/src/features/dashboard/DashboardPage.tsx.
- Section headings: الطلبات والتسليمات.
- Fields: none visible in current DOM state.
- Table headers: النوع / المرجع / الطرف / المبلغ / الوقت / الحالة.
- Interactive labels and inline actions: تصدير -> onclick=exportTableCSV(this); إجمالي المبيعات 0 +12.5% مقارنة بالشهر السابق -> onclick=showSection('reports-sales'); إجمالي التحصيلات 0 +8.2% مقارنة بالشهر السابق -> onclick=showSection('collections'); إجمالي المصروفات 0 -3.1% مقارنة بالشهر السابق -> onclick=showSection('expenses'); صافي الربح 0 +18.4% مقارنة بالشهر السابق -> onclick=showSection('reports-profit'); 0 طلبات معلقة -> onclick=showSection('orders'); 0 منتجات مخزون منخفض -> onclick=showSection('products'); ج.م 0 رصيد الخزائن -> onclick=showSection('cashiers'); عرض الفواتير ← -> onclick=showSection('invoices'); متابعة ← -> onclick=showSection('containers'); إعداد الحسابات ← -> onclick=showSection('cashiers'); إعداد الحسابات المالية العامة -> onclick=showSection('cashiers'); ← تسجيل أول فاتورة تجريبية -> onclick=showSection('invoices'); معاينة مع بيانات (تجريبي) -> onclick=toggleChart(); ＋ إضافة بيانات تجريبية; عرض الكل; الطلبات0اضغط لعرض كل الطلبات -> onclick=showSection('orders'); التسليمات0اضغط لعرض كل التسليمات -> onclick=showSection('deliveries').
- Destinations found in inline handlers: reports-sales, collections, expenses, reports-profit, orders, products, cashiers, invoices, containers, deliveries.
- State coverage: initial content captured; hover/focus/disabled/loading/success/error/permission states are not verified per screen. Data-driven panels that require selecting a row or entering a pin remain unverified.
- Implementation parity status: NOT_VERIFIED at individual-control level; see the gap register for confirmed source-backed exceptions.

## SCR-002 - العملاء

- Reference panel: sec-customers; area: core screen, sub-screen or state.
- Purpose text: إجمالي 0 عملاء — 0 نشط.
- Closest React route: /customers; implementation file candidate: frontend/src/features/customers/CustomerListPage.tsx.
- Section headings: none in current DOM state.
- Fields: input/text: بحث بالاسم أو الهاتف...; select/select-one: كل العملات ج.م USD; input/text: بحث بالاسم أو الهاتف أو المحافظة; select/select-one: كل المحافظاتالقاهرةالجيزةالإسكندريةالقليوبيةالشرقيةالدقهليةالبحيرةالغربيةالمنوفيةكفر الشيخدمياطبورسعيدالإسماعيليةالسويسا.
- Table headers: الاسم / رقم الهاتف / المحافظة / إجمالي الفواتير / المدفوع / المتبقي / آخر تعامل; رقم الطلب / التاريخ / المبلغ / الحالة; رقم الفاتورة / الإجمالي / المتبقي / الحالة; التاريخ / المبلغ / الطريقة / المرجع; التاريخ / البيان / مدين / دائن / الرصيد.
- Interactive labels and inline actions: تصدير -> onclick=exportTableCSV(this); إضافة عميل -> onclick=openModal('modal-add-customer'); ‹; 1; 2; 3; ›; 🔁 تكرار آخر فاتورة -> onclick=repeatLastInvoice('c2'); ✕ -> onclick=closeCustomerDetail(); نظرة عامة -> onclick=switchCustTab('overview',this); الطلبات -> onclick=switchCustTab('orders-tab',this); الفواتير -> onclick=switchCustTab('invoices-tab',this); الدفعات -> onclick=switchCustTab('payments-tab',this); كشف الحساب -> onclick=switchCustTab('statement-tab',this); سجل النشاط -> onclick=switchCustTab('activity-tab',this); إنشاء طلب; إنشاء فاتورة; تسجيل دفعة -> onclick=openModal('modal-payment').
- Destinations found in inline handlers: none parsed.
- State coverage: initial content captured; hover/focus/disabled/loading/success/error/permission states are not verified per screen. Data-driven panels that require selecting a row or entering a pin remain unverified.
- Implementation parity status: NOT_VERIFIED at individual-control level; see the gap register for confirmed source-backed exceptions.

## SCR-003 - الطلبات

- Reference panel: sec-orders; area: core screen, sub-screen or state.
- Purpose text: إدارة طلبات البيع.
- Closest React route: /orders; implementation file candidate: frontend/src/features/orders/OrdersPage.tsx.
- Section headings: none in current DOM state.
- Fields: input/text: بحث بالرقم أو العميل...; input/checkbox: (unlabeled).
- Table headers: رقم الطلب / العميل / التاريخ / الإجمالي / الحجز / الحالة.
- Interactive labels and inline actions: تصدير -> onclick=exportTableCSV(this); + إنشاء طلب -> onclick=showSection('order-create'); الكل -> onclick=filterRows('orders-tbody', null, this); مسودة -> onclick=filterRows('orders-tbody', 'مسودة', this); مؤكد -> onclick=filterRows('orders-tbody', 'مؤكد', this); قيد التجهيز -> onclick=filterRows('orders-tbody', 'قيد التجهيز', this); مكتمل -> onclick=filterRows('orders-tbody', 'مكتمل', this); ملغي -> onclick=filterRows('orders-tbody', 'ملغي', this); ＋ إضافة بيانات تجريبية; ‹; 1; 2; ›.
- Destinations found in inline handlers: order-create.
- State coverage: initial content captured; hover/focus/disabled/loading/success/error/permission states are not verified per screen. Data-driven panels that require selecting a row or entering a pin remain unverified.
- Implementation parity status: NOT_VERIFIED at individual-control level; see the gap register for confirmed source-backed exceptions.

## SCR-004 - إنشاء طلب مبيعات جديد

- Reference panel: sec-order-create; area: core screen, sub-screen or state.
- Purpose text: الطلبات › إنشاء طلب جديد.
- Closest React route: /orders/new; implementation file candidate: frontend/src/features/orders/OrderFormPage.tsx.
- Section headings: none in current DOM state.
- Fields: input/text: (unlabeled) [disabled]; select/select-one: شركة رواف الخليج للتجارة والمقاولاتمحمد أحمد العليعبدالله سالم; input/date: (unlabeled); select/select-one: جنيه مصري (ج.م)دولار أمريكي (USD); select/select-one: المستودع الرئيسي - الرياضمستودع جدةمستودع الدمام; select/select-one: 30 يوم من تاريخ الفاتورةفوري15 يوم60 يوم; select/select-one: كراسأبنوب; textarea/textarea: اكتب ملاحظات خاصة بشروط العميل هنا....
- Table headers: المنتج / الصنف / كود المنتج / المتاح بالمخزن / الكمية المطلوبة / سعر الوحدة / الخصم % / إجمالي الصنف.
- Interactive labels and inline actions: استيراد من مسودة عرض أسعار; + عميل جديد -> onclick=openModal('modal-add-customer'); + إضافة صنف جديد -> onclick=addOrderRow(); إلغاء الأمر -> onclick=showSection('orders'); حفظ كمسودة -> onclick=showToast('success','تم حفظ الطلب كمسودة','يمكنك إكماله لاحقًا من قائمة الطلبات'); تأكيد وإرسال الطلب للاعتماد -> onclick=confirmNewOrder().
- Destinations found in inline handlers: orders.
- State coverage: initial content captured; hover/focus/disabled/loading/success/error/permission states are not verified per screen. Data-driven panels that require selecting a row or entering a pin remain unverified.
- Implementation parity status: NOT_VERIFIED at individual-control level; see the gap register for confirmed source-backed exceptions.

## SCR-005 - طلب مؤكد ومعتمد #ORD-2024-001

- Reference panel: sec-order-detail; area: core screen, sub-screen or state.
- Purpose text: العميل: شركة رواف الخليج للتجارة والمقاولات • تاريخ الطلب: 2024-10-26.
- Closest React route: /orders/:orderId; implementation file candidate: frontend/src/features/orders/OrderDetailPage.tsx.
- Section headings: none in current DOM state.
- Fields: none visible in current DOM state.
- Table headers: كود المنتج / الصنف المطلوب / الكمية / الوحدة / سعر الوحدة / الضريبة (%15) / إجمالي السعر; كود المنتج / الصنف / الكمية / السعر قبل الخصم / الخصم / السعر بعد الخصم; رقم الحجز / المستودع / الصنف / الكمية المحجوزة / الحالة; رقم الإذن / تاريخ التسليم / الكمية / الحالة; رقم الفاتورة / التاريخ / الإجمالي / الحالة.
- Interactive labels and inline actions: إلغاء الطلب -> onclick=openModal('modal-confirm'); حجز المخزون -> onclick=showToast('success','تم إنشاء إذن حجز مخزون','تم حجز الكميات من المستودع الرئيسي'); إنشاء تسليم -> onclick=showSection('delivery-create'); إنشاء فاتورة -> onclick=showSection('invoice-create'); بيانات الطلب -> onclick=switchModalTab('od','tab-data',this); الأصناف والأسعار -> onclick=switchModalTab('od','tab-items',this); الحجوزات -> onclick=switchModalTab('od','tab-reservations',this); التسليمات -> onclick=switchModalTab('od','tab-deliveries',this); الفواتير -> onclick=switchModalTab('od','tab-invoices',this); + إنشاء تسليم -> onclick=showSection('delivery-create'); معاينة طباعة -> onclick=printInvoice('INV-2024-090'); تصدير -> onclick=printInvoice('INV-2024-090'); + إنشاء فاتورة -> onclick=showSection('invoice-create').
- Destinations found in inline handlers: delivery-create, invoice-create.
- State coverage: initial content captured; hover/focus/disabled/loading/success/error/permission states are not verified per screen. Data-driven panels that require selecting a row or entering a pin remain unverified.
- Implementation parity status: NOT_VERIFIED at individual-control level; see the gap register for confirmed source-backed exceptions.

## SCR-006 - الفواتير

- Reference panel: sec-invoices; area: core screen, sub-screen or state.
- Purpose text: إجمالي مستحقات: ج.م 0.
- Closest React route: /invoices; implementation file candidate: frontend/src/features/sales/InvoiceListPage.tsx.
- Section headings: none in current DOM state.
- Fields: input/text: بحث برقم الفاتورة أو العميل...; select/select-one: كل العملاءمحمد أحمدشركة الأمل; input/date: (unlabeled); input/text: بحث: رقم الفاتورة، العميل، الهاتف، التاريخ; input/checkbox: (unlabeled).
- Table headers: رقم الفاتورة / العميل / التاريخ / الاستحقاق / الإجمالي / المدفوع / المتبقي / طلّعها / الحالة.
- Interactive labels and inline actions: معاينة طباعة -> onclick=printLast(); تصدير -> onclick=printLast(); + إنشاء فاتورة -> onclick=showSection('invoice-create'); كراس0 فاتورة0 إجمالي -> onclick=filterIssuer('كراس'); أبنوب0 فاتورة0 إجمالي -> onclick=filterIssuer('أبنوب'); السائق0 فاتورة0 إجمالي -> onclick=filterIssuer('السائق'); الكل -> onclick=filterRows('invoices-tbody', null, this); مسودة -> onclick=filterRows('invoices-tbody', 'مسودة', this); غير مدفوعة -> onclick=filterRows('invoices-tbody', 'غير مدفوعة', this); متأخرة 🔴 -> onclick=filterRows('invoices-tbody', 'متأخرة', this); مدفوعة -> onclick=filterRows('invoices-tbody', 'مدفوعة', this); 🖨️ طباعة -> onclick=bulkAction('print'); PDF -> onclick=bulkAction('pdf'); 📱 إرسال واتساب -> onclick=bulkAction('whatsapp'); ‹; 1; 2; ›.
- Destinations found in inline handlers: invoice-create.
- State coverage: initial content captured; hover/focus/disabled/loading/success/error/permission states are not verified per screen. Data-driven panels that require selecting a row or entering a pin remain unverified.
- Implementation parity status: NOT_VERIFIED at individual-control level; see the gap register for confirmed source-backed exceptions.

## SCR-007 - إنشاء فاتورة مبيعات جديدة

- Reference panel: sec-invoice-create; area: core screen, sub-screen or state.
- Purpose text: إدارة المبيعات › إنشاء فاتورة.
- Closest React route: /invoices/new; implementation file candidate: frontend/src/features/sales/InvoiceFormPage.tsx.
- Section headings: none in current DOM state.
- Fields: select/select-one: — اختر —كراسأبنوبالسائق; input/hidden: inv-created-by; select/select-one: — اختر العميل —; input/text: اكتب الرقم لاختيار العميل; input/tel: رقم التليفون (مطلوب); input/text: اسم العميل; select/select-one: qc-gov; input/text: inv-cust-phone [disabled]; input/text: inv-cust-email [disabled]; input/text: inv-cust-bd [disabled]; input/text: inv-cust-balance [disabled]; input/text: inv-cust-credit [disabled]; input/text: inv-date [disabled]; input/text: inv-time [disabled]; input/text: inv-number [disabled]; select/select-one: فوريآجل; input/date: inv-due; input/text: اختياري; input/text: اختياري; select/select-one: مؤسسة الإتقانشركة ماستر لاستيراد المواتير; select/select-one: المستودع الرئيسي - الرياضمستودع جدةمستودع الدمامالمخزن الفرعيالسيارة; input/text: اكتب اسم الصنف أو الكود أو امسح الباركود; select/select-one: المصدر: حسب الفاتورةالمستودع الرئيسي - الرياضمستودع جدةمستودع الدمامالمخزن الفرعيالسيارة; input/number: (unlabeled); input/number: سعر الشركة — تلقائي ولا يُعدَّل; input/hidden: inv-extra; input/hidden: inv-discount; select/select-one: amt; input/number: inv-pay-now; input/text: inv-collect-amount; select/select-one: كاش (الخزينة الرئيسية)تحويل بنكي / شيك; select/select-one: النقدية في الدرجفودافون كاش — كراسفودافون كاش — أبنوبأورنج كاشإنستا بايماستر بايحساب البوسطةالبنك الأهلي; textarea/textarea: اكتب أي ملاحظة تظهر أسفل الأصناف في الفاتورة; input/checkbox: فاتورة مرتجع; select/select-one: — اختر الفاتورة —; select/select-one: تالفخطأ في الصنفغير مطابق للطلب; select/select-one: لا يوجد إصلاحإصلاح على الشركةإصلاح على العميل; input/text: سبب الإصلاح; input/number: تكلفة الإصلاح; input/number: المبلغ المدفوع; input/text: رقم الفاتورة (مثال INV-2026-005).
- Table headers: # / اسم الصنف (بحث بالاسم/الكود/الباركود) / الفئة / الكمية / سعر الوحدة / إجمالي الصنف.
- Interactive labels and inline actions: ↩ إنشاء مرتجع -> onclick=xRet(); إلغاء -> onclick=showSection('invoices'); 👁 معاينة الفاتورة -> onclick=previewDraft(); حفظ كمسودة -> onclick=showToast('success','تم حفظ الفاتورة كمسودة'); Ctrl + Enter -> onclick=confirmNewInvoice(); ↩️ مرتجعات -> onclick=newReturn(); واتساب -> onclick=var w=byId('inv-wa-who').value;w?waOpen(w):showToast('error','اختر الشخص أولًا'); فاتورة بيع -> onclick=setInvoiceOpType('sale'); مرتجع -> onclick=setInvoiceOpType('return'); نعم — تحصيل فوري -> onclick=setInvoiceCollect('yes'); لا — آجل -> onclick=setInvoiceCollect('no'); كراس -> onclick=setIssuer('كراس'); أبنوب -> onclick=setIssuer('أبنوب'); السائق -> onclick=setIssuer('السائق'); ＋ عميل جديد (بيانات كاملة: بريد، ميلاد، عنوان...) -> onclick=openNewCustomer(function(id){refreshCustomerSelects();quickPickCustomer(id,CUSTOMER_LOOKUP[id].name)}); + عميل جديد -> onclick=var b=byId('inv-newcust');b.style.display=b.style.display==='none'?'':'none';if(b.style.display===''){byId('qc-gov').innerHTML='<option value="">— المحا; ＋ إضافة عميل -> onclick=openNewCustomer(id=>{refreshCustomerSelects();quickPickCustomer(id,CUSTOMER_LOOKUP[id].name)}); حفظ العميل -> onclick=quickAddCust(); ▸ خيارات التوصيل والتركيب -> onclick=toggleInvoiceAdvanced(); 📋 نسخ من فاتورة سابقة لنفس العميل -> onclick=copyFromPreviousInvoice(); + إضافة صنف -> onclick=addInvoiceRow(); 🗑 -> onclick=this.closest('tr').remove();recalcInvoice(); + تقسيم الدفع على وسيلة أخرى; حفظ الفاتورة وتسجيل التحصيل -> onclick=confirmNewInvoice(); بحث -> onclick=xRetFind(); كل المرتجعات -> onclick=showSection('returns').
- Destinations found in inline handlers: invoices, returns.
- State coverage: initial content captured; hover/focus/disabled/loading/success/error/permission states are not verified per screen. Data-driven panels that require selecting a row or entering a pin remain unverified.
- Implementation parity status: NOT_VERIFIED at individual-control level; see the gap register for confirmed source-backed exceptions.

## SCR-008 - معاينة الطباعة

- Reference panel: sec-invoice-print; area: core screen, sub-screen or state.
- Purpose text: فاتورة #INV-2024-091.
- Closest React route: /invoices/:documentId/print; implementation file candidate: frontend/src/features/sales/InvoicePrintPage.tsx.
- Section headings: فاتورة مبيعات.
- Fields: none visible in current DOM state.
- Table headers: # / الصنف / الفئة / الكمية / سعر الوحدة / إجمالي الصنف.
- Interactive labels and inline actions: ← رجوع -> onclick=showSection('invoices'); 📱 واتساب -> onclick=showToast('success','جاري إرسال الفاتورة عبر واتساب'); تحميل PDF -> onclick=window.print(); طباعة -> onclick=window.print(); فاتورة الشركة -> onclick=finCoInv(curNoG()); تعديل كامل -> onclick=finEdit(curNoG()); مرتجع -> onclick=finRetFrom(curNoG()).
- Destinations found in inline handlers: invoices.
- State coverage: initial content captured; hover/focus/disabled/loading/success/error/permission states are not verified per screen. Data-driven panels that require selecting a row or entering a pin remain unverified.
- Implementation parity status: NOT_VERIFIED at individual-control level; see the gap register for confirmed source-backed exceptions.

## SCR-009 - لوحة التحصيل

- Reference panel: sec-collections; area: core screen, sub-screen or state.
- Purpose text: متابعة المستحقات والدفعات.
- Closest React route: /collections; implementation file candidate: frontend/src/features/sales/CollectionsPage.tsx.
- Section headings: سجل المدفوعات.
- Fields: none visible in current DOM state.
- Table headers: رقم الفاتورة / العميل / الاستحقاق / التأخير / المتبقي / الحالة; التاريخ / العميل / الفاتورة / المبلغ / طريقة الدفع / الخزينة / الرصيد قبل / الرصيد بعد.
- Interactive labels and inline actions: + تسجيل دفعة -> onclick=openModal('modal-payment').
- Destinations found in inline handlers: none parsed.
- State coverage: initial content captured; hover/focus/disabled/loading/success/error/permission states are not verified per screen. Data-driven panels that require selecting a row or entering a pin remain unverified.
- Implementation parity status: NOT_VERIFIED at individual-control level; see the gap register for confirmed source-backed exceptions.

## SCR-010 - أذونات صرف المواد والتسليم

- Reference panel: sec-deliveries; area: core screen, sub-screen or state.
- Purpose text: المخزون واللوجستيات › التسليمات اللوجستية.
- Closest React route: /deliveries; implementation file candidate: frontend/src/features/orders/DeliveriesPage.tsx.
- Section headings: none in current DOM state.
- Fields: none visible in current DOM state.
- Table headers: رقم إذن التسليم / رقم الطلب / العميل المستلم / تاريخ التسليم / المستودع / المصدر / الكمية المطلوبة / الكمية المسلمة / الحالة.
- Interactive labels and inline actions: 📷 مسح رمز QR للتسليم; + إذن صرف وتوصيل جديد -> onclick=showSection('delivery-create'); الكل -> onclick=filterRows('deliveries-tbody', null, this); قيد الانتظار -> onclick=filterRows('deliveries-tbody', 'قيد الانتظار', this); جاري التجهيز -> onclick=filterRows('deliveries-tbody', 'جاري التجهيز', this); تم التسليم -> onclick=filterRows('deliveries-tbody', 'تم التسليم', this); ملغى -> onclick=filterRows('deliveries-tbody', 'ملغى', this); ＋ إضافة بيانات تجريبية.
- Destinations found in inline handlers: delivery-create.
- State coverage: initial content captured; hover/focus/disabled/loading/success/error/permission states are not verified per screen. Data-driven panels that require selecting a row or entering a pin remain unverified.
- Implementation parity status: NOT_VERIFIED at individual-control level; see the gap register for confirmed source-backed exceptions.

## SCR-011 - إنشاء إذن صرف وتوصيل جديد

- Reference panel: sec-delivery-create; area: core screen, sub-screen or state.
- Purpose text: التسليمات › إذن جديد.
- Closest React route: /deliveries/new; implementation file candidate: frontend/src/features/orders/DeliveryFormPage.tsx.
- Section headings: none in current DOM state.
- Fields: select/select-one: إذن صرف وتوصيلإذن صرف فقط (استلام من المستودع)إذن توصيل فقط (بدون صرف مخزون); select/select-one: ORD-2024-812 — شركة رواف الخليجORD-2024-811 — مؤسسة البناء الحديث; input/text: (unlabeled) [disabled]; select/select-one: المستودع الرئيسي - الرياضمستودع فرع جدةمستودع المنطقة الشرقية; input/date: (unlabeled); select/select-one: شاحنة الشركةشركة شحن خارجيةاستلام مباشر من العميل; input/text: اسم السائق; input/text: مثال: أ ب ج 1234; textarea/textarea: أي تعليمات خاصة بموقع التسليم أو الاستلام....
- Table headers: كود المنتج / الصنف / الكمية المطلوبة بالطلب / المتاح بالمستودع / الكمية المراد صرفها الآن.
- Interactive labels and inline actions: إلغاء -> onclick=showSection('deliveries'); حفظ وطباعة الإذن -> onclick=showToast('success','تم إنشاء إذن التسليم بنجاح','رقم الإذن: DLV-2024-433');showSection('deliveries'); إلغاء -> onclick=showSection('deliveries'); تأكيد وإنشاء الإذن -> onclick=showToast('success','تم إنشاء إذن التسليم بنجاح','رقم الإذن: DLV-2024-433');showSection('deliveries').
- Destinations found in inline handlers: deliveries.
- State coverage: initial content captured; hover/focus/disabled/loading/success/error/permission states are not verified per screen. Data-driven panels that require selecting a row or entering a pin remain unverified.
- Implementation parity status: NOT_VERIFIED at individual-control level; see the gap register for confirmed source-backed exceptions.

## SCR-012 - المرتجعات

- Reference panel: sec-returns; area: core screen, sub-screen or state.
- Purpose text: كل مرتجعات الفواتير مع المخزن المرتجع إليه وحالة الإصلاح.
- Closest React route: /returns; implementation file candidate: frontend/src/features/sales/ReturnsPage.tsx.
- Section headings: none in current DOM state.
- Fields: none visible in current DOM state.
- Table headers: رقم المرتجع / التاريخ / العميل / الفاتورة الأصلية / المنتج / الكمية / المخزن / الإصلاح / القيمة.
- Interactive labels and inline actions: + مرتجع جديد -> onclick=newReturn().
- Destinations found in inline handlers: none parsed.
- State coverage: initial content captured; hover/focus/disabled/loading/success/error/permission states are not verified per screen. Data-driven panels that require selecting a row or entering a pin remain unverified.
- Implementation parity status: NOT_VERIFIED at individual-control level; see the gap register for confirmed source-backed exceptions.

## SCR-013 - إنشاء مرتجع مبيعات جديد

- Reference panel: sec-return-create; area: core screen, sub-screen or state.
- Purpose text: المرتجعات › إنشاء مرتجع.
- Closest React route: /returns/new (InvoiceFormPage return mode); implementation file candidate: frontend/src/features/sales/InvoiceFormPage.tsx.
- Section headings: none in current DOM state.
- Fields: select/select-one: #INV-2024-087 — محمد أحمد#INV-2024-089 — شركة الأمل; input/text: (unlabeled) [disabled]; input/date: (unlabeled); select/select-one: منتج تالفخطأ في الشحنةعدم مطابقة المواصفاترغبة العميلأخرى; select/select-one: استرداد نقدي للعميلإضافة كرصيد دائن للعميلاستبدال بمنتج آخر; select/select-one: المستودع الرئيسي - الرياضمستودع جدة; textarea/textarea: تفاصيل إضافية حول حالة المنتج المرتجع....
- Table headers: المنتج / الكمية بالفاتورة / الكمية المرتجعة / سعر الوحدة / حالة الصنف / الإجمالي.
- Interactive labels and inline actions: إلغاء -> onclick=showSection('returns'); تأكيد المرتجع -> onclick=showToast('success','تم إنشاء المرتجع بنجاح','رقم المرتجع: RET-2024-009');showSection('returns'); + إضافة صنف -> onclick=addReturnRow().
- Destinations found in inline handlers: returns.
- State coverage: initial content captured; hover/focus/disabled/loading/success/error/permission states are not verified per screen. Data-driven panels that require selecting a row or entering a pin remain unverified.
- Implementation parity status: NOT_VERIFIED at individual-control level; see the gap register for confirmed source-backed exceptions.

## SCR-014 - المنتجات والأصناف

- Reference panel: sec-products; area: core screen, sub-screen or state.
- Purpose text: 0 منتج — 0 مخزون منخفض.
- Closest React route: /products; implementation file candidate: frontend/src/features/inventory/CatalogPages.tsx.
- Section headings: none in current DOM state.
- Fields: input/text: بحث: اسم المنتج أو الكود.
- Table headers: الكود / اسم المنتج / الفئة / الإجمالي / محجوز / الباقي / سعر البيع / الحالة.
- Interactive labels and inline actions: تصدير -> onclick=exportTableCSV(this); + إضافة منتج -> onclick=openModal('modal-add-product'); عرضها ← -> onclick=showSection('inventory-summary').
- Destinations found in inline handlers: inventory-summary.
- State coverage: initial content captured; hover/focus/disabled/loading/success/error/permission states are not verified per screen. Data-driven panels that require selecting a row or entering a pin remain unverified.
- Implementation parity status: NOT_VERIFIED at individual-control level; see the gap register for confirmed source-backed exceptions.

## SCR-015 - ملخص المخزون

- Reference panel: sec-inventory-summary; area: core screen, sub-screen or state.
- Purpose text: الأرصدة حسب المستودعات.
- Closest React route: /inventory; implementation file candidate: frontend/src/features/inventory/CatalogPages.tsx.
- Section headings: none in current DOM state.
- Fields: none visible in current DOM state.
- Table headers: none present in current DOM state.
- Interactive labels and inline actions: تصدير -> onclick=exportTableCSV(this); + تسوية مخزون -> onclick=openModal('modal-confirm').
- Destinations found in inline handlers: none parsed.
- State coverage: initial content captured; hover/focus/disabled/loading/success/error/permission states are not verified per screen. Data-driven panels that require selecting a row or entering a pin remain unverified.
- Implementation parity status: NOT_VERIFIED at individual-control level; see the gap register for confirmed source-backed exceptions.

## SCR-016 - حركات المخزون

- Reference panel: sec-movements; area: core screen, sub-screen or state.
- Purpose text: سجل جميع الحركات الوارد والصادر.
- Closest React route: /inventory/movements; implementation file candidate: frontend/src/features/inventory/StockPages.tsx.
- Section headings: none in current DOM state.
- Fields: none visible in current DOM state.
- Table headers: التاريخ / نوع الحركة / المنتج / المستودع / الكمية / المرجع / المستخدم.
- Interactive labels and inline actions: تصدير -> onclick=exportTableCSV(this).
- Destinations found in inline handlers: none parsed.
- State coverage: initial content captured; hover/focus/disabled/loading/success/error/permission states are not verified per screen. Data-driven panels that require selecting a row or entering a pin remain unverified.
- Implementation parity status: NOT_VERIFIED at individual-control level; see the gap register for confirmed source-backed exceptions.

## SCR-017 - المالية

- Reference panel: sec-finance; area: core screen, sub-screen or state.
- Purpose text: مرتبة حسب دورة الحسابات: حسابات العملاء ← المصروفات ← الخزينة ← التحويلات ← التعديلات ← العملات ← دليل الحسابات.
- Closest React route: /finance; implementation file candidate: frontend/src/features/finance/FinancePage.tsx.
- Section headings: none in current DOM state.
- Fields: input/text: بحث بالعميل...; select/select-one: ديسمبر 2024نوفمبر 2024; select/select-one: الخزينة الرئيسية (ج.م 45,800)البنك الأهليبنك الراجحي; select/select-one: البنك الأهلي (ج.م 38,600)الخزينة الرئيسيةبنك الراجحي; input/number: 0.00; input/date: (unlabeled); input/text: وصف التحويل...; select/select-one: إضافة مبلغ خصم مبلغ مصروف إيراد تسوية مالية تصحيح قيد مالي; input/number: 0.00; input/date: fa-date; select/select-one: الخزينة الرئيسية البنك الأهلي بنك الراجحي; input/text: سبب التعديل المالي...; input/text: مثال: عقد، فاتورة، إذن...; textarea/textarea: تفاصيل إضافية...; input/text: مثال: 1110; select/select-one: أصولخصومإيراداتمصروفاتحقوق ملكية; input/text: اسم الحساب بالعربية; select/select-one: بدون (حساب رئيسي)1000 — الأصول1100 — الأصول المتداولة; textarea/textarea: وصف الحساب....
- Table headers: العميل / المحافظة / إجمالي الفواتير / إجمالي المدفوعات / الرصيد المستحق / آخر دفعة / تاريخ آخر دفعة / الحالة; التاريخ / البند / الوصف / المبلغ / الخزينة / طريقة الدفع / الجهة / القسم / المستخدم; طريقة الدفع / المحصّل (وارد) / المصروف (صادر); التاريخ / البيان / المرجع / وارد / صادر / الرصيد; التاريخ / من / إلى / المبلغ / المستخدم; رقم المرجع / النوع / الحساب/الخزينة / التاريخ / السبب / المبلغ / الرصيد بعد التعديل; الرمز / اسم العملة / سعر الصرف مقابل ج.م / العملة الافتراضية / الحالة.
- Interactive labels and inline actions: المصروفات -> onclick=finGo('expenses'); الخزائن -> onclick=finGo('cashiers'); التحويلات -> onclick=finGo('transfers'); التعديلات المالية -> onclick=finGo('financial-adjustments'); العملات -> onclick=finGo('currencies'); دليل الحسابات -> onclick=finGo('coa'); تصدير -> onclick=exportTableCSV(this); ＋ إضافة بيانات تجريبية; + تسجيل مصروف -> onclick=openModal('modal-expense'); ＋ إضافة بيانات تجريبية; + تسجيل معاملة -> onclick=openModal('modal-payment'); ＋ إضافة بيانات تجريبية; + تحويل جديد -> onclick=document.getElementById('transfer-form').scrollIntoView({behavior:'smooth'}); إلغاء; تأكيد التحويل -> onclick=openModal('modal-confirm'); ＋ إضافة بيانات تجريبية; + تعديل مالي جديد -> onclick=document.getElementById('fa-form').scrollIntoView({behavior:'smooth'}); ＋ إضافة بيانات تجريبية; إلغاء -> onclick=document.getElementById('fa-amount').value='';document.getElementById('fa-reason').value='';document.getElementById('fa-notes').value='';document.getEle; حفظ التعديل -> onclick=saveFinancialAdjustment(); + إضافة عملة -> onclick=showToast('success','تم إضافة العملة بنجاح'); ＋ إضافة بيانات تجريبية; حفظ أسعار الصرف -> onclick=showToast('success','تم تحديث أسعار الصرف'); + حساب رئيسي; ▼الأصول1000ج.م 1,450,000 -> onclick=toggleCOA(this); ▼الأصول المتداولة1100ج.م 980,000 -> onclick=toggleCOA(this); ▼الخصوم2000ج.م 580,000 -> onclick=toggleCOA(this); ►حقوق الملكية3000ج.م 870,000 -> onclick=toggleCOA(this); ▼الإيرادات4000ج.م 428,600 -> onclick=toggleCOA(this); ►المصروفات5000ج.م 213,850 -> onclick=toggleCOA(this); إلغاء; حفظ الحساب.
- Destinations found in inline handlers: none parsed.
- State coverage: initial content captured; hover/focus/disabled/loading/success/error/permission states are not verified per screen. Data-driven panels that require selecting a row or entering a pin remain unverified.
- Implementation parity status: NOT_VERIFIED at individual-control level; see the gap register for confirmed source-backed exceptions.

## SCR-018 - الحاويات

- Reference panel: sec-containers; area: core screen, sub-screen or state.
- Purpose text: إضافة الحاويات وتكاليفها واستلامها للمخزون.
- Closest React route: /containers; implementation file candidate: frontend/src/features/containers/ContainerListPage.tsx.
- Section headings: none in current DOM state.
- Fields: none visible in current DOM state.
- Table headers: اسم الحاوية / رقم الحاوية / جهة القدوم / تاريخ الوصول / أنواع المنتجات / إجمالي التكلفة / الحالة.
- Interactive labels and inline actions: + إضافة حاوية -> onclick=ctNew().
- Destinations found in inline handlers: none parsed.
- State coverage: initial content captured; hover/focus/disabled/loading/success/error/permission states are not verified per screen. Data-driven panels that require selecting a row or entering a pin remain unverified.
- Implementation parity status: NOT_VERIFIED at individual-control level; see the gap register for confirmed source-backed exceptions.

## SCR-019 - مركز التقارير والذكاء التجاري

- Reference panel: sec-reports; area: core screen, sub-screen or state.
- Purpose text: 28 نموذج تقرير جاهز في 6 فئات.
- Closest React route: /reports; implementation file candidate: frontend/src/features/reports/ReportsPage.tsx.
- Section headings: none in current DOM state.
- Fields: none visible in current DOM state.
- Table headers: none present in current DOM state.
- Interactive labels and inline actions: 📊 تقارير المبيعات 6 تقارير — إيرادات، أداء، عملاء مفضّل -> onclick=showSection('reports-sales'); 🚢 تقارير الحاويات 4 تقارير — استلام، تكلفة فعلية -> onclick=showSection('containers'); 💹 تقارير الأرباح 5 تقارير — ربحية، هوامش، P&L -> onclick=showSection('reports-profit'); 📦 تقارير المخزون 5 تقارير — حركات، تقييم، تحليل -> onclick=showSection('reports-inventory'); 💰 التقارير المالية 4 تقارير — قوائم مالية، تدفقات -> onclick=showSection('reports-financial').
- Destinations found in inline handlers: reports-sales, containers, reports-profit, reports-inventory, reports-financial.
- State coverage: initial content captured; hover/focus/disabled/loading/success/error/permission states are not verified per screen. Data-driven panels that require selecting a row or entering a pin remain unverified.
- Implementation parity status: NOT_VERIFIED at individual-control level; see the gap register for confirmed source-backed exceptions.

## SCR-020 - تقرير المبيعات

- Reference panel: sec-reports-sales; area: core screen, sub-screen or state.
- Purpose text: تحليل تفصيلي لأداء المبيعات.
- Closest React route: /reports/sales; implementation file candidate: requires further source tracing.
- Section headings: none in current DOM state.
- Fields: input/date: (unlabeled); input/date: (unlabeled); select/select-one: كل الموظفينأبنوبسارة محمد; select/select-one: Group By: شهرGroup By: أسبوعGroup By: موظف.
- Table headers: الموظف / عدد الطلبات / المبيعات / الخصومات / الصافي / الحصة%.
- Interactive labels and inline actions: 📄 Excel; 📋 CSV; 🖨️ طباعة; إعادة تعيين; تطبيق.
- Destinations found in inline handlers: none parsed.
- State coverage: initial content captured; hover/focus/disabled/loading/success/error/permission states are not verified per screen. Data-driven panels that require selecting a row or entering a pin remain unverified.
- Implementation parity status: NOT_VERIFIED at individual-control level; see the gap register for confirmed source-backed exceptions.

## SCR-021 - تقرير الأرباح والخسائر

- Reference panel: sec-reports-profit; area: core screen, sub-screen or state.
- Purpose text: P&L Statement.
- Closest React route: /reports/invoice-profit; implementation file candidate: requires further source tracing.
- Section headings: none in current DOM state.
- Fields: select/select-one: ديسمبر 2024نوفمبر 2024; select/select-one: مقارنة: الشهر السابقمقارنة: السنة الماضية.
- Table headers: البند / الشهر الحالي / الشهر السابق / الفرق.
- Interactive labels and inline actions: 📄 Excel; 🖨️ طباعة; تطبيق.
- Destinations found in inline handlers: none parsed.
- State coverage: initial content captured; hover/focus/disabled/loading/success/error/permission states are not verified per screen. Data-driven panels that require selecting a row or entering a pin remain unverified.
- Implementation parity status: NOT_VERIFIED at individual-control level; see the gap register for confirmed source-backed exceptions.

## SCR-022 - المستخدم والصلاحيات

- Reference panel: sec-users; area: core screen, sub-screen or state.
- Purpose text: ثلاثة مستخدمين: كراس وأبنوب والسائق.
- Closest React route: /admin/users; implementation file candidate: frontend/src/features/admin/UsersPage.tsx.
- Section headings: none in current DOM state.
- Fields: input/text: مثال: 01012345678; input/text: مثال: 01012345678; input/text: مثال: 01012345678.
- Table headers: المستخدم / رقم واتساب.
- Interactive labels and inline actions: حفظ -> onclick=waSave('كراس'); حذف الرقم -> onclick=waDel('كراس'); واتساب -> onclick=waOpen('كراس'); حفظ -> onclick=waSave('أبنوب'); حذف الرقم -> onclick=waDel('أبنوب'); واتساب -> onclick=waOpen('أبنوب'); حفظ -> onclick=waSave('السائق'); حذف الرقم -> onclick=waDel('السائق'); واتساب -> onclick=waOpen('السائق').
- Destinations found in inline handlers: none parsed.
- State coverage: initial content captured; hover/focus/disabled/loading/success/error/permission states are not verified per screen. Data-driven panels that require selecting a row or entering a pin remain unverified.
- Implementation parity status: NOT_VERIFIED at individual-control level; see the gap register for confirmed source-backed exceptions.

## SCR-023 - المخازن

- Reference panel: sec-warehouses; area: core screen, sub-screen or state.
- Purpose text: إدارة مواقع التخزين والمستودعات.
- Closest React route: /warehouses; implementation file candidate: frontend/src/features/inventory/CatalogPages.tsx.
- Section headings: none in current DOM state.
- Fields: none visible in current DOM state.
- Table headers: اسم المستودع / الموقع / المسؤول / عدد الأصناف / نسبة الإشغال / الحالة.
- Interactive labels and inline actions: + إضافة مستودع -> onclick=openModal('modal-add-warehouse'); ＋ إضافة بيانات تجريبية.
- Destinations found in inline handlers: none parsed.
- State coverage: initial content captured; hover/focus/disabled/loading/success/error/permission states are not verified per screen. Data-driven panels that require selecting a row or entering a pin remain unverified.
- Implementation parity status: NOT_VERIFIED at individual-control level; see the gap register for confirmed source-backed exceptions.

## SCR-024 - تقرير المخزون

- Reference panel: sec-reports-inventory; area: core screen, sub-screen or state.
- Purpose text: تحليل الكميات والحركات والقيمة.
- Closest React route: /reports/stock; implementation file candidate: requires further source tracing.
- Section headings: none in current DOM state.
- Fields: select/select-one: كل المستودعاتمستودع الرياضمستودع جدة; select/select-one: كل الفئاتمستلزمات صناعيةمواد كيميائية.
- Table headers: المنتج / المستودع / الرصيد الحالي / متوسط تكلفة الوحدة / القيمة الإجمالية / الحالة.
- Interactive labels and inline actions: 📄 Excel; 🖨️ طباعة; ＋ إضافة بيانات تجريبية.
- Destinations found in inline handlers: none parsed.
- State coverage: initial content captured; hover/focus/disabled/loading/success/error/permission states are not verified per screen. Data-driven panels that require selecting a row or entering a pin remain unverified.
- Implementation parity status: NOT_VERIFIED at individual-control level; see the gap register for confirmed source-backed exceptions.

## SCR-025 - التقارير المالية

- Reference panel: sec-reports-financial; area: core screen, sub-screen or state.
- Purpose text: القوائم المالية الأساسية للمنشأة.
- Closest React route: /reports/financial; implementation file candidate: requires further source tracing.
- Section headings: مؤشرات فعلية من بيانات النظام; القوائم المالية (نموذج توضيحي).
- Fields: none visible in current DOM state.
- Table headers: العميل / المحافظة / الرصيد المستحق; الطريقة / المحصّل; التاريخ / العميل / الفاتورة / المبلغ; التاريخ / البند / المبلغ; الفاتورة / العميل / الاستحقاق / المتبقي / الحالة.
- Interactive labels and inline actions: 📄 Excel; 🖨️ طباعة.
- Destinations found in inline handlers: none parsed.
- State coverage: initial content captured; hover/focus/disabled/loading/success/error/permission states are not verified per screen. Data-driven panels that require selecting a row or entering a pin remain unverified.
- Implementation parity status: NOT_VERIFIED at individual-control level; see the gap register for confirmed source-backed exceptions.

## SCR-026 - المحافظات

- Reference panel: sec-govs; area: core screen, sub-screen or state.
- Purpose text: المحافظات.
- Closest React route: /admin/governorates; implementation file candidate: frontend/src/features/customers/GovernoratesPage.tsx.
- Section headings: none in current DOM state.
- Fields: input/text: اسم محافظة جديدة.
- Table headers: المحافظة / عدد العملاء / الحالة.
- Interactive labels and inline actions: إضافة -> onclick=govAdd().
- Destinations found in inline handlers: none parsed.
- State coverage: initial content captured; hover/focus/disabled/loading/success/error/permission states are not verified per screen. Data-driven panels that require selecting a row or entering a pin remain unverified.
- Implementation parity status: NOT_VERIFIED at individual-control level; see the gap register for confirmed source-backed exceptions.

## SCR-027 - إضافة إلى المخزون

- Reference panel: sec-stock-add; area: core screen, sub-screen or state.
- Purpose text: إضافة إلى المخزون.
- Closest React route: /inventory/opening-stock (closest); implementation file candidate: requires further source tracing.
- Section headings: none in current DOM state.
- Fields: select/select-one: sa-p; select/select-one: sa-w; input/number: sa-q.
- Table headers: none present in current DOM state.
- Interactive labels and inline actions: إضافة -> onclick=stockAdd().
- Destinations found in inline handlers: none parsed.
- State coverage: initial content captured; hover/focus/disabled/loading/success/error/permission states are not verified per screen. Data-driven panels that require selecting a row or entering a pin remain unverified.
- Implementation parity status: NOT_VERIFIED at individual-control level; see the gap register for confirmed source-backed exceptions.

## SCR-028 - المخزون المرتجع

- Reference panel: sec-stock-ret; area: core screen, sub-screen or state.
- Purpose text: المخزون المرتجع.
- Closest React route: /warehouse-returns; implementation file candidate: frontend/src/features/inventory/WarehouseReturnsPage.tsx.
- Section headings: none in current DOM state.
- Fields: none visible in current DOM state.
- Table headers: none present in current DOM state.
- Interactive labels and inline actions: none visible in current DOM state.
- Destinations found in inline handlers: none parsed.
- State coverage: initial content captured; hover/focus/disabled/loading/success/error/permission states are not verified per screen. Data-driven panels that require selecting a row or entering a pin remain unverified.
- Implementation parity status: NOT_VERIFIED at individual-control level; see the gap register for confirmed source-backed exceptions.

## SCR-029 - سلة المحذوفات

- Reference panel: sec-trash; area: core screen, sub-screen or state.
- Purpose text: سلة المحذوفات.
- Closest React route: /admin/trash; implementation file candidate: requires further source tracing.
- Section headings: none in current DOM state.
- Fields: none visible in current DOM state.
- Table headers: none present in current DOM state.
- Interactive labels and inline actions: none visible in current DOM state.
- Destinations found in inline handlers: none parsed.
- State coverage: initial content captured; hover/focus/disabled/loading/success/error/permission states are not verified per screen. Data-driven panels that require selecting a row or entering a pin remain unverified.
- Implementation parity status: NOT_VERIFIED at individual-control level; see the gap register for confirmed source-backed exceptions.

## SCR-030 — ملف العميل (sec-cust-file)

- **Entry:** customer list row clicked in the reference and React system.
- **Reference behavior observed:** opens at 1280/768/390; shows customer name, add-payment/back actions, tabs for overview/invoices/payments/history, and a compact summary.
- **System counterpart:** /customers/:customerId opens at all three sizes; its profile-card grid and action buttons differ and the same tab strip is absent.
- **Visual evidence:** screenshots/reference/row-click-details/customer-detail-{1280,768,390}.png; screenshots/system-mock/react/visual-round7/customer-detail-{1280,768,390}.png; screenshots/comparisons/row-click-details/scr-030-{1280,768,390}-side-by-side.png.
- **State/data note:** fixture balance values differ and are excluded from parity judgment.
- **Interaction coverage:** row navigation verified; tab contents/actions and payment submission were not exercised.
- **Finding:** confirmed UI mismatch GAP-0002; API and persisted behavior unverified.


- Reference panel: sec-cust-file; area: core screen, sub-screen or state.
- Purpose text: Generated panel cust-file.
- Closest React route: /customers/:customerId; implementation file candidate: requires further source tracing.
- Section headings: none in current DOM state.
- Fields: none visible in current DOM state.
- Table headers: none present in current DOM state.
- Interactive labels and inline actions: none visible in current DOM state.
- Destinations found in inline handlers: none parsed.
- State coverage: initial content captured; hover/focus/disabled/loading/success/error/permission states are not verified per screen. Data-driven panels that require selecting a row or entering a pin remain unverified.
- Implementation parity status: NOT_VERIFIED at individual-control level; see the gap register for confirmed source-backed exceptions.

## SCR-031 — تفاصيل الفاتورة (sec-inv-detail)

- **Entry:** invoice row clicked from the customer invoice tab in the reference and from the invoice list in React.
- **Reference behavior observed:** opens at 1280/768/390; displays invoice metadata, line item, totals, linked payment, warehouse, and compact actions.
- **System counterpart:** /invoices/:documentId opens at all three sizes; displays metadata and total cards, unavailable item-details panel, and audit history.
- **Visual evidence:** screenshots/reference/row-click-details/invoice-detail-{1280,768,390}.png; screenshots/system-mock/react/visual-round7/invoice-detail-{1280,768,390}.png; screenshots/comparisons/row-click-details/scr-031-{1280,768,390}-side-by-side.png.
- **State/data note:** invoice number, customer, total, and paid amount match the fixtures; status differs (partially paid vs issued), so it is not treated as a visual equivalence.
- **Interaction coverage:** route opening verified; edit, cancel, print, return, delete, and payment actions were not exercised.
- **Finding:** confirmed visual difference GAP-0072; underlying API and state remain unverified.


- Reference panel: sec-inv-detail; area: core screen, sub-screen or state.
- Purpose text: Generated panel inv-detail.
- Closest React route: /invoices/:documentId; implementation file candidate: requires further source tracing.
- Section headings: none in current DOM state.
- Fields: none visible in current DOM state.
- Table headers: none present in current DOM state.
- Interactive labels and inline actions: none visible in current DOM state.
- Destinations found in inline handlers: none parsed.
- State coverage: initial content captured; hover/focus/disabled/loading/success/error/permission states are not verified per screen. Data-driven panels that require selecting a row or entering a pin remain unverified.
- Implementation parity status: NOT_VERIFIED at individual-control level; see the gap register for confirmed source-backed exceptions.

## SCR-032 - سائق شركة الشحن

- Reference panel: sec-drivers; area: core screen, sub-screen or state.
- Purpose text: سائق شركة الشحن.
- Closest React route: /admin/drivers; implementation file candidate: frontend/src/features/admin/ReferenceAdminPages.tsx.
- Section headings: none in current DOM state.
- Fields: input/text: اسم السائق; input/text: شركة الشحن الخاصة بالشركة.
- Table headers: السائق / شركة الشحن الخاصة بالشركة.
- Interactive labels and inline actions: إضافة -> onclick=drvAdd().
- Destinations found in inline handlers: none parsed.
- State coverage: initial content captured; hover/focus/disabled/loading/success/error/permission states are not verified per screen. Data-driven panels that require selecting a row or entering a pin remain unverified.
- Implementation parity status: NOT_VERIFIED at individual-control level; see the gap register for confirmed source-backed exceptions.

## SCR-033 - سجل العمليات

- Reference panel: sec-log; area: core screen, sub-screen or state.
- Purpose text: سجل العمليات.
- Closest React route: /admin/audit; implementation file candidate: frontend/src/features/admin/AuditPage.tsx.
- Section headings: none in current DOM state.
- Fields: none visible in current DOM state.
- Table headers: none present in current DOM state.
- Interactive labels and inline actions: none visible in current DOM state.
- Destinations found in inline handlers: none parsed.
- State coverage: initial content captured; hover/focus/disabled/loading/success/error/permission states are not verified per screen. Data-driven panels that require selecting a row or entering a pin remain unverified.
- Implementation parity status: NOT_VERIFIED at individual-control level; see the gap register for confirmed source-backed exceptions.

## SCR-034 - نظرة عامة مالية

- Reference panel: sec-fin-overview; area: core screen, sub-screen or state.
- Purpose text: العميل ← الطلب ← الفاتورة ← الدفع ← رصيد العميل ← التقارير — والمصروف ← الخزينة ← التقارير.
- Closest React route: /finance; implementation file candidate: requires further source tracing.
- Section headings: none in current DOM state.
- Fields: none visible in current DOM state.
- Table headers: العميل / المحافظة / الرصيد المستحق; الطريقة / المحصّل; التاريخ / العميل / الفاتورة / المبلغ; التاريخ / البند / المبلغ.
- Interactive labels and inline actions: + تسجيل دفعة -> onclick=showSection('collections');openModal('modal-payment'); + تسجيل مصروف -> onclick=showSection('expenses');openModal('modal-expense').
- Destinations found in inline handlers: collections, expenses.
- State coverage: initial content captured; hover/focus/disabled/loading/success/error/permission states are not verified per screen. Data-driven panels that require selecting a row or entering a pin remain unverified.
- Implementation parity status: NOT_VERIFIED at individual-control level; see the gap register for confirmed source-backed exceptions.

## SCR-035 - Generated panel f-receipts

- Reference panel: sec-f-receipts; area: nested finance/report panel.
- Purpose text: Generated panel f-receipts.
- Closest React route: /finance/inbox; implementation file candidate: requires further source tracing.
- Section headings: none in current DOM state.
- Fields: none visible in current DOM state.
- Table headers: none present in current DOM state.
- Interactive labels and inline actions: none visible in current DOM state.
- Destinations found in inline handlers: none parsed.
- State coverage: initial content captured; hover/focus/disabled/loading/success/error/permission states are not verified per screen. Data-driven panels that require selecting a row or entering a pin remain unverified.
- Implementation parity status: NOT_VERIFIED at individual-control level; see the gap register for confirmed source-backed exceptions.

## SCR-036 - Generated panel f-otherinc

- Reference panel: sec-f-otherinc; area: nested finance/report panel.
- Purpose text: Generated panel f-otherinc.
- Closest React route: /finance/inbox (closest; extra income has no direct route verified); implementation file candidate: requires further source tracing.
- Section headings: none in current DOM state.
- Fields: none visible in current DOM state.
- Table headers: none present in current DOM state.
- Interactive labels and inline actions: none visible in current DOM state.
- Destinations found in inline handlers: none parsed.
- State coverage: initial content captured; hover/focus/disabled/loading/success/error/permission states are not verified per screen. Data-driven panels that require selecting a row or entering a pin remain unverified.
- Implementation parity status: NOT_VERIFIED at individual-control level; see the gap register for confirmed source-backed exceptions.

## SCR-037 - Generated panel f-payments

- Reference panel: sec-f-payments; area: nested finance/report panel.
- Purpose text: Generated panel f-payments.
- Closest React route: /finance/withdrawals; implementation file candidate: requires further source tracing.
- Section headings: none in current DOM state.
- Fields: none visible in current DOM state.
- Table headers: none present in current DOM state.
- Interactive labels and inline actions: none visible in current DOM state.
- Destinations found in inline handlers: none parsed.
- State coverage: initial content captured; hover/focus/disabled/loading/success/error/permission states are not verified per screen. Data-driven panels that require selecting a row or entering a pin remain unverified.
- Implementation parity status: NOT_VERIFIED at individual-control level; see the gap register for confirmed source-backed exceptions.

## SCR-038 - Generated panel f-expenses

- Reference panel: sec-f-expenses; area: nested finance/report panel.
- Purpose text: Generated panel f-expenses.
- Closest React route: /finance/expenses; implementation file candidate: requires further source tracing.
- Section headings: none in current DOM state.
- Fields: none visible in current DOM state.
- Table headers: none present in current DOM state.
- Interactive labels and inline actions: none visible in current DOM state.
- Destinations found in inline handlers: none parsed.
- State coverage: initial content captured; hover/focus/disabled/loading/success/error/permission states are not verified per screen. Data-driven panels that require selecting a row or entering a pin remain unverified.
- Implementation parity status: NOT_VERIFIED at individual-control level; see the gap register for confirmed source-backed exceptions.

## SCR-039 - Generated panel f-transfers

- Reference panel: sec-f-transfers; area: nested finance/report panel.
- Purpose text: Generated panel f-transfers.
- Closest React route: /finance/transfers; implementation file candidate: requires further source tracing.
- Section headings: none in current DOM state.
- Fields: none visible in current DOM state.
- Table headers: none present in current DOM state.
- Interactive labels and inline actions: none visible in current DOM state.
- Destinations found in inline handlers: none parsed.
- State coverage: initial content captured; hover/focus/disabled/loading/success/error/permission states are not verified per screen. Data-driven panels that require selecting a row or entering a pin remain unverified.
- Implementation parity status: NOT_VERIFIED at individual-control level; see the gap register for confirmed source-backed exceptions.

## SCR-040 - Generated panel f-treasury

- Reference panel: sec-f-treasury; area: nested finance/report panel.
- Purpose text: Generated panel f-treasury.
- Closest React route: /finance/treasury; implementation file candidate: requires further source tracing.
- Section headings: none in current DOM state.
- Fields: none visible in current DOM state.
- Table headers: none present in current DOM state.
- Interactive labels and inline actions: none visible in current DOM state.
- Destinations found in inline handlers: none parsed.
- State coverage: initial content captured; hover/focus/disabled/loading/success/error/permission states are not verified per screen. Data-driven panels that require selecting a row or entering a pin remain unverified.
- Implementation parity status: NOT_VERIFIED at individual-control level; see the gap register for confirmed source-backed exceptions.

## SCR-041 - Generated panel f-custbal

- Reference panel: sec-f-custbal; area: nested finance/report panel.
- Purpose text: Generated panel f-custbal.
- Closest React route: /reports/customer-balances; implementation file candidate: requires further source tracing.
- Section headings: none in current DOM state.
- Fields: none visible in current DOM state.
- Table headers: none present in current DOM state.
- Interactive labels and inline actions: none visible in current DOM state.
- Destinations found in inline handlers: none parsed.
- State coverage: initial content captured; hover/focus/disabled/loading/success/error/permission states are not verified per screen. Data-driven panels that require selecting a row or entering a pin remain unverified.
- Implementation parity status: NOT_VERIFIED at individual-control level; see the gap register for confirmed source-backed exceptions.

## SCR-042 - Generated panel f-supbal

- Reference panel: sec-f-supbal; area: nested finance/report panel.
- Purpose text: Generated panel f-supbal.
- Closest React route: /purchase-invoices (supplier statement not verified); implementation file candidate: requires further source tracing.
- Section headings: none in current DOM state.
- Fields: none visible in current DOM state.
- Table headers: none present in current DOM state.
- Interactive labels and inline actions: none visible in current DOM state.
- Destinations found in inline handlers: none parsed.
- State coverage: initial content captured; hover/focus/disabled/loading/success/error/permission states are not verified per screen. Data-driven panels that require selecting a row or entering a pin remain unverified.
- Implementation parity status: NOT_VERIFIED at individual-control level; see the gap register for confirmed source-backed exceptions.

## SCR-043 - Generated panel f-finret

- Reference panel: sec-f-finret; area: nested finance/report panel.
- Purpose text: Generated panel f-finret.
- Closest React route: /returns; implementation file candidate: requires further source tracing.
- Section headings: none in current DOM state.
- Fields: none visible in current DOM state.
- Table headers: none present in current DOM state.
- Interactive labels and inline actions: none visible in current DOM state.
- Destinations found in inline handlers: none parsed.
- State coverage: initial content captured; hover/focus/disabled/loading/success/error/permission states are not verified per screen. Data-driven panels that require selecting a row or entering a pin remain unverified.
- Implementation parity status: NOT_VERIFIED at individual-control level; see the gap register for confirmed source-backed exceptions.

## SCR-044 - Generated panel f-coa

- Reference panel: sec-f-coa; area: nested finance/report panel.
- Purpose text: Generated panel f-coa.
- Closest React route: /finance/chart-of-accounts; implementation file candidate: requires further source tracing.
- Section headings: none in current DOM state.
- Fields: none visible in current DOM state.
- Table headers: none present in current DOM state.
- Interactive labels and inline actions: none visible in current DOM state.
- Destinations found in inline handlers: none parsed.
- State coverage: initial content captured; hover/focus/disabled/loading/success/error/permission states are not verified per screen. Data-driven panels that require selecting a row or entering a pin remain unverified.
- Implementation parity status: NOT_VERIFIED at individual-control level; see the gap register for confirmed source-backed exceptions.

## SCR-045 - Generated panel f-journal

- Reference panel: sec-f-journal; area: nested finance/report panel.
- Purpose text: Generated panel f-journal.
- Closest React route: No direct route found; implementation file candidate: requires further source tracing.
- Section headings: none in current DOM state.
- Fields: none visible in current DOM state.
- Table headers: none present in current DOM state.
- Interactive labels and inline actions: none visible in current DOM state.
- Destinations found in inline handlers: none parsed.
- State coverage: initial content captured; hover/focus/disabled/loading/success/error/permission states are not verified per screen. Data-driven panels that require selecting a row or entering a pin remain unverified.
- Implementation parity status: NOT_VERIFIED at individual-control level; see the gap register for confirmed source-backed exceptions.

## SCR-046 - Generated panel f-ledger

- Reference panel: sec-f-ledger; area: nested finance/report panel.
- Purpose text: Generated panel f-ledger.
- Closest React route: No direct route found; implementation file candidate: requires further source tracing.
- Section headings: none in current DOM state.
- Fields: none visible in current DOM state.
- Table headers: none present in current DOM state.
- Interactive labels and inline actions: none visible in current DOM state.
- Destinations found in inline handlers: none parsed.
- State coverage: initial content captured; hover/focus/disabled/loading/success/error/permission states are not verified per screen. Data-driven panels that require selecting a row or entering a pin remain unverified.
- Implementation parity status: NOT_VERIFIED at individual-control level; see the gap register for confirmed source-backed exceptions.

## SCR-047 - Generated panel f-trial

- Reference panel: sec-f-trial; area: nested finance/report panel.
- Purpose text: Generated panel f-trial.
- Closest React route: No direct route found; implementation file candidate: requires further source tracing.
- Section headings: none in current DOM state.
- Fields: none visible in current DOM state.
- Table headers: none present in current DOM state.
- Interactive labels and inline actions: none visible in current DOM state.
- Destinations found in inline handlers: none parsed.
- State coverage: initial content captured; hover/focus/disabled/loading/success/error/permission states are not verified per screen. Data-driven panels that require selecting a row or entering a pin remain unverified.
- Implementation parity status: NOT_VERIFIED at individual-control level; see the gap register for confirmed source-backed exceptions.

## SCR-048 - Generated panel f-reports

- Reference panel: sec-f-reports; area: nested finance/report panel.
- Purpose text: Generated panel f-reports.
- Closest React route: /reports/financial; implementation file candidate: requires further source tracing.
- Section headings: none in current DOM state.
- Fields: none visible in current DOM state.
- Table headers: none present in current DOM state.
- Interactive labels and inline actions: none visible in current DOM state.
- Destinations found in inline handlers: none parsed.
- State coverage: initial content captured; hover/focus/disabled/loading/success/error/permission states are not verified per screen. Data-driven panels that require selecting a row or entering a pin remain unverified.
- Implementation parity status: NOT_VERIFIED at individual-control level; see the gap register for confirmed source-backed exceptions.

## SCR-049 - Generated panel f-stmt

- Reference panel: sec-f-stmt; area: nested finance/report panel.
- Purpose text: Generated panel f-stmt.
- Closest React route: /customers/:customerId/statement; implementation file candidate: requires further source tracing.
- Section headings: none in current DOM state.
- Fields: none visible in current DOM state.
- Table headers: none present in current DOM state.
- Interactive labels and inline actions: none visible in current DOM state.
- Destinations found in inline handlers: none parsed.
- State coverage: initial content captured; hover/focus/disabled/loading/success/error/permission states are not verified per screen. Data-driven panels that require selecting a row or entering a pin remain unverified.
- Implementation parity status: NOT_VERIFIED at individual-control level; see the gap register for confirmed source-backed exceptions.

## SCR-050 - نقل الحاويات بين المواقع

- Reference panel: sec-transfers; area: core screen, sub-screen or state.
- Purpose text: من الحاوية إلى الرئيسي ثم الفرعي ثم السيارة — كل نقل يخصم من المصدر ويضيف إلى المستلم ويُسجَّل برقم مرجعي.
- Closest React route: /container-transfers; implementation file candidate: requires further source tracing.
- Section headings: none in current DOM state.
- Fields: select/select-one: tr-p; select/select-one: tr-f; select/select-one: tr-t; input/number: tr-q.
- Table headers: none present in current DOM state.
- Interactive labels and inline actions: تنفيذ النقل -> onclick=doTransfer().
- Destinations found in inline handlers: none parsed.
- State coverage: initial content captured; hover/focus/disabled/loading/success/error/permission states are not verified per screen. Data-driven panels that require selecting a row or entering a pin remain unverified.
- Implementation parity status: NOT_VERIFIED at individual-control level; see the gap register for confirmed source-backed exceptions.

## SCR-051 - مرتجع المخازن

- Reference panel: sec-wh-returns; area: core screen, sub-screen or state.
- Purpose text: إرجاع الأصناف إلى الموقع الذي خرجت منه — الصالح يعود للمصدر والتالف يُسجَّل في رصيد التالف.
- Closest React route: /warehouse-returns; implementation file candidate: requires further source tracing.
- Section headings: none in current DOM state.
- Fields: none visible in current DOM state.
- Table headers: none present in current DOM state.
- Interactive labels and inline actions: none visible in current DOM state.
- Destinations found in inline handlers: none parsed.
- State coverage: initial content captured; hover/focus/disabled/loading/success/error/permission states are not verified per screen. Data-driven panels that require selecting a row or entering a pin remain unverified.
- Implementation parity status: NOT_VERIFIED at individual-control level; see the gap register for confirmed source-backed exceptions.

## SCR-052 - أموال الحاويات

- Reference panel: sec-cont-money; area: core screen, sub-screen or state.
- Purpose text: إضافة وسحب مرتبطان بكل حاوية — الرصيد = الإضافات − السحوبات.
- Closest React route: /container-funds; implementation file candidate: frontend/src/features/containers/ContainerLedgerPages.tsx.
- Section headings: none in current DOM state.
- Fields: select/select-one: cm-c; select/select-one: إضافةسحب; input/number: cm-a; select/select-one: cm-d; input/text: cm-r; input/text: cm-f; input/text: cm-n.
- Table headers: none present in current DOM state.
- Interactive labels and inline actions: تسجيل الحركة -> onclick=cmAdd().
- Destinations found in inline handlers: none parsed.
- State coverage: initial content captured; hover/focus/disabled/loading/success/error/permission states are not verified per screen. Data-driven panels that require selecting a row or entering a pin remain unverified.
- Implementation parity status: NOT_VERIFIED at individual-control level; see the gap register for confirmed source-backed exceptions.

## SCR-053 — تفاصيل حركة المخزون (sec-move-detail)

- **Entry in reference:** actual movement-reference click from the movement list opened this panel at 1280/768/390.
- **Expected content:** linked movement/source reference and a one-row detail table with date, type, item, warehouse, and quantity.
- **System candidate:** /inventory/movements list exists, but all visible table rows have zero link/button/role=button controls. At 1280 a row click leaves the route unchanged; at 768/390 locator clicks timed out.
- **Visual evidence:** screenshots/reference/row-click-details/movement-detail-{1280,768,390}.png; screenshots/system-mock/react/visual-round7/movement-list-click-review-{1280,768,390}.png; screenshots/comparisons/row-click-details/scr-053-{1280,768,390}-side-by-side.png.
- **Finding:** missing system detail screen and row interaction GAP-0073. Backend support was not tested.


- Reference panel: sec-move-detail; area: core screen, sub-screen or state.
- Purpose text: Generated panel move-detail.
- Closest React route: /finance/movements (closest; detail route not verified); implementation file candidate: requires further source tracing.
- Section headings: none in current DOM state.
- Fields: none visible in current DOM state.
- Table headers: none present in current DOM state.
- Interactive labels and inline actions: none visible in current DOM state.
- Destinations found in inline handlers: none parsed.
- State coverage: initial content captured; hover/focus/disabled/loading/success/error/permission states are not verified per screen. Data-driven panels that require selecting a row or entering a pin remain unverified.
- Implementation parity status: NOT_VERIFIED at individual-control level; see the gap register for confirmed source-backed exceptions.

## SCR-054 - المالية

- Reference panel: sec-fin2; area: core screen, sub-screen or state.
- Purpose text: الجنيه المصري فقط.
- Closest React route: /finance; implementation file candidate: requires further source tracing.
- Section headings: رصيد كل حساب; حركات اليوم; ملخص إضافي.
- Fields: none visible in current DOM state.
- Table headers: الرقم / التاريخ / النوع / الحساب / المبلغ / الجهة / المرجع / ملاحظات.
- Interactive labels and inline actions: الرئيسية -> onclick=finTab('home'); السحب -> onclick=finTab('accts'); الصندوق الوارد -> onclick=finTab('inbox'); فلوس منتظرة -> onclick=finTab('wait'); المصروفات -> onclick=finTab('exp'); الحاويات -> onclick=finTab('cont'); الحركات -> onclick=finTab('led'); الشركاء -> onclick=finTab('part'); دفعات الشركاء -> onclick=finTab('inst'); فواتير الشراء -> onclick=finTab('purch'); إجمالي الأرصدة0 -> onclick=finTab('accts'); المستلم من العملاء0 -> onclick=finTab('led'); المصروفات المدفوعة0 -> onclick=finTab('exp'); المسترد للعملاء0 -> onclick=finTab('led'); المستحق على العملاء0 -> onclick=finTab('led'); المستحق للمصنع0 -> onclick=finTab('led'); مدفوع مقدمًا (متبقي)0 -> onclick=finTab('led'); النقدية في الدرج0 -> onclick=finTab('accts'); فودافون كاش — كراس0 -> onclick=finTab('accts'); فودافون كاش — أبنوب0 -> onclick=finTab('accts'); أورنج كاش0 -> onclick=finTab('accts'); إنستا باي0 -> onclick=finTab('accts'); ماستر باي0 -> onclick=finTab('accts'); حساب البوسطة0 -> onclick=finTab('accts'); البنك الأهلي0 -> onclick=finTab('accts'); إجمالي البنوك0 -> onclick=finTab('accts'); إجمالي الحاويات وتكاليفها0 -> onclick=finTab('cont'); مكاسب الشركاء المستحقة0 -> onclick=finTab('part'); ربح الشركة من السائق0 -> onclick=finTab('part'); أقساط الشركاء المتبقية0 -> onclick=finTab('inst'); فلوس منتظرة عند الشركاء0 -> onclick=finTab('wait').
- Destinations found in inline handlers: none parsed.
- State coverage: initial content captured; hover/focus/disabled/loading/success/error/permission states are not verified per screen. Data-driven panels that require selecting a row or entering a pin remain unverified.
- Implementation parity status: NOT_VERIFIED at individual-control level; see the gap register for confirmed source-backed exceptions.

## SCR-055 - تصفية العميل

- Reference panel: sec-liq; area: core screen, sub-screen or state.
- Purpose text: كل بيانات العميل من النظام كله (للقراءة فقط).
- Closest React route: /customers/:customerId/liquidation; implementation file candidate: requires further source tracing.
- Section headings: none in current DOM state.
- Fields: select/select-one: lq-c.
- Table headers: none present in current DOM state.
- Interactive labels and inline actions: none visible in current DOM state.
- Destinations found in inline handlers: none parsed.
- State coverage: initial content captured; hover/focus/disabled/loading/success/error/permission states are not verified per screen. Data-driven panels that require selecting a row or entering a pin remain unverified.
- Implementation parity status: NOT_VERIFIED at individual-control level; see the gap register for confirmed source-backed exceptions.

## SCR-056 - ميزانية المصروفات

- Reference panel: sec-x-budget; area: advanced reference add-on.
- Purpose text: الميزانية الشهرية لكل بند.
- Closest React route: No direct route found; implementation file candidate: requires further source tracing.
- Section headings: none in current DOM state.
- Fields: input/number: (unlabeled); input/number: (unlabeled); input/number: (unlabeled); input/number: (unlabeled); input/number: (unlabeled); input/number: (unlabeled); input/number: (unlabeled); input/number: (unlabeled); input/number: (unlabeled); input/number: (unlabeled).
- Table headers: البند / السقف / المصروف / النسبة / الحالة.
- Interactive labels and inline actions: none visible in current DOM state.
- Destinations found in inline handlers: none parsed.
- State coverage: initial content captured; hover/focus/disabled/loading/success/error/permission states are not verified per screen. Data-driven panels that require selecting a row or entering a pin remain unverified.
- Implementation parity status: NOT_VERIFIED at individual-control level; see the gap register for confirmed source-backed exceptions.

## SCR-057 - مصروفات متكررة

- Reference panel: sec-x-recur; area: advanced reference add-on.
- Purpose text: تُسجَّل تلقائيًا كل شهر.
- Closest React route: No direct route found; implementation file candidate: requires further source tracing.
- Section headings: none in current DOM state.
- Fields: input/text: الاسم (إيجار، مرتب...); select/select-one: صيانات الشركةالمرتباتمصروفات المخازنمصروفات التشغيلالنقل والشحنالجمارك والتخليصالأختامأخرىفواتير المديرينحساب بيتر; input/number: المبلغ; input/number: يوم الشهر.
- Table headers: الاسم / البند / المبلغ / يوم التسجيل / آخر تسجيل.
- Interactive labels and inline actions: + إضافة -> onclick=xRecAdd().
- Destinations found in inline handlers: none parsed.
- State coverage: initial content captured; hover/focus/disabled/loading/success/error/permission states are not verified per screen. Data-driven panels that require selecting a row or entering a pin remain unverified.
- Implementation parity status: NOT_VERIFIED at individual-control level; see the gap register for confirmed source-backed exceptions.

## SCR-058 - مقارنة شهر بشهر

- Reference panel: sec-x-compare; area: advanced reference add-on.
- Purpose text: مبيعات ومصروفات وربح.
- Closest React route: No direct route found; implementation file candidate: requires further source tracing.
- Section headings: none in current DOM state.
- Fields: none visible in current DOM state.
- Table headers: الشهر / المبيعات / المصروفات / الربح / تغيّر المبيعات.
- Interactive labels and inline actions: none visible in current DOM state.
- Destinations found in inline handlers: none parsed.
- State coverage: initial content captured; hover/focus/disabled/loading/success/error/permission states are not verified per screen. Data-driven panels that require selecting a row or entering a pin remain unverified.
- Implementation parity status: NOT_VERIFIED at individual-control level; see the gap register for confirmed source-backed exceptions.

## SCR-059 - توقع السيولة

- Reference panel: sec-x-cash; area: advanced reference add-on.
- Purpose text: الداخل والخارج في الأسابيع القادمة.
- Closest React route: No direct route found; implementation file candidate: requires further source tracing.
- Section headings: none in current DOM state.
- Fields: none visible in current DOM state.
- Table headers: الأسبوع / داخل (فواتير مستحقة) / خارج (مستحقات) / الصافي / الرصيد المتوقع.
- Interactive labels and inline actions: none visible in current DOM state.
- Destinations found in inline handlers: none parsed.
- State coverage: initial content captured; hover/focus/disabled/loading/success/error/permission states are not verified per screen. Data-driven panels that require selecting a row or entering a pin remain unverified.
- Implementation parity status: NOT_VERIFIED at individual-control level; see the gap register for confirmed source-backed exceptions.

## SCR-060 - تتبع الحاويات

- Reference panel: sec-x-track; area: advanced reference add-on.
- Purpose text: مراحل الحاوية من الشراء للاستلام.
- Closest React route: /containers (related; no separate route verified); implementation file candidate: requires further source tracing.
- Section headings: none in current DOM state.
- Fields: none visible in current DOM state.
- Table headers: الحاوية / المورد / المرحلة / الوصول المتوقع / تنبيه.
- Interactive labels and inline actions: none visible in current DOM state.
- Destinations found in inline handlers: none parsed.
- State coverage: initial content captured; hover/focus/disabled/loading/success/error/permission states are not verified per screen. Data-driven panels that require selecting a row or entering a pin remain unverified.
- Implementation parity status: NOT_VERIFIED at individual-control level; see the gap register for confirmed source-backed exceptions.

## SCR-061 - حد أدنى للمخزون

- Reference panel: sec-x-low; area: advanced reference add-on.
- Purpose text: أصناف محتاجة طلب حاوية.
- Closest React route: /inventory/minimum-stock; implementation file candidate: frontend/src/features/inventory/AdvancedInventoryPages.tsx.
- Section headings: none in current DOM state.
- Fields: none visible in current DOM state.
- Table headers: الصنف / المتاح / الحد الأدنى / التنبيه; الصنف / المتاح / الحد الأدنى.
- Interactive labels and inline actions: none visible in current DOM state.
- Destinations found in inline handlers: none parsed.
- State coverage: initial content captured; hover/focus/disabled/loading/success/error/permission states are not verified per screen. Data-driven panels that require selecting a row or entering a pin remain unverified.
- Implementation parity status: NOT_VERIFIED at individual-control level; see the gap register for confirmed source-backed exceptions.

## SCR-062 - الجرد الدوري

- Reference panel: sec-x-count; area: advanced reference add-on.
- Purpose text: مقارنة الفعلي بالنظام وتسجيل التسوية.
- Closest React route: /inventory/counts; implementation file candidate: frontend/src/features/inventory/AdvancedInventoryPages.tsx.
- Section headings: none in current DOM state.
- Fields: none visible in current DOM state.
- Table headers: الصنف / بالنظام / الفعلي / الفرق / السبب; التاريخ / الصنف / قبل / بعد / الفرق / السبب.
- Interactive labels and inline actions: اعتماد الجرد وتسجيل التسويات -> onclick=xCountSave().
- Destinations found in inline handlers: none parsed.
- State coverage: initial content captured; hover/focus/disabled/loading/success/error/permission states are not verified per screen. Data-driven panels that require selecting a row or entering a pin remain unverified.
- Implementation parity status: NOT_VERIFIED at individual-control level; see the gap register for confirmed source-backed exceptions.

## SCR-063 - باركود الأصناف

- Reference panel: sec-x-bar; area: advanced reference add-on.
- Purpose text: طباعة ملصقات ومسح.
- Closest React route: No direct route found; implementation file candidate: requires further source tracing.
- Section headings: none in current DOM state.
- Fields: input/text: امسح أو اكتب الباركود ثم Enter.
- Table headers: الصنف / الباركود (SKU) / معاينة.
- Interactive labels and inline actions: 📷 مسح بالكاميرا -> onclick=xCam(); 🖨 طباعة المحدد -> onclick=xPrint().
- Destinations found in inline handlers: none parsed.
- State coverage: initial content captured; hover/focus/disabled/loading/success/error/permission states are not verified per screen. Data-driven panels that require selecting a row or entering a pin remain unverified.
- Implementation parity status: NOT_VERIFIED at individual-control level; see the gap register for confirmed source-backed exceptions.

## SCR-064 - سجل أسعار الشراء

- Reference panel: sec-x-price; area: advanced reference add-on.
- Purpose text: سعر الصنف في كل حاوية.
- Closest React route: /products/:productId/cost-history; implementation file candidate: frontend/src/features/inventory/CostHistoryPage.tsx.
- Section headings: none in current DOM state.
- Fields: none visible in current DOM state.
- Table headers: الصنف / الحاوية / التاريخ / سعر الشراء / التغير.
- Interactive labels and inline actions: none visible in current DOM state.
- Destinations found in inline handlers: none parsed.
- State coverage: initial content captured; hover/focus/disabled/loading/success/error/permission states are not verified per screen. Data-driven panels that require selecting a row or entering a pin remain unverified.
- Implementation parity status: NOT_VERIFIED at individual-control level; see the gap register for confirmed source-backed exceptions.

## SCR-065 - استيراد من إكسل

- Reference panel: sec-x-import; area: advanced reference add-on.
- Purpose text: ارفع ملف المنتجات أو العملاء مرة واحدة.
- Closest React route: AppShell demo modal; no import route; implementation file candidate: requires further source tracing.
- Section headings: none in current DOM state.
- Fields: input/file: xi-f.
- Table headers: none present in current DOM state.
- Interactive labels and inline actions: منتجات -> onclick=xKind('p'); عملاء -> onclick=xKind('c'); ⬇ تحميل نموذج -> onclick=xTpl().
- Destinations found in inline handlers: none parsed.
- State coverage: initial content captured; hover/focus/disabled/loading/success/error/permission states are not verified per screen. Data-driven panels that require selecting a row or entering a pin remain unverified.
- Implementation parity status: NOT_VERIFIED at individual-control level; see the gap register for confirmed source-backed exceptions.

## SCR-066 - الملخص اليومي

- Reference panel: sec-x-daily; area: advanced reference add-on.
- Purpose text: مبيعات اليوم والتحصيل والأرباح.
- Closest React route: AppShell demo modal; no daily summary route; implementation file candidate: requires further source tracing.
- Section headings: none in current DOM state.
- Fields: input/checkbox: فعّل التذكير; input/time: xd-t; input/text: رقم واتساب (2010...).
- Table headers: none present in current DOM state.
- Interactive labels and inline actions: إرسال واتساب -> onclick=xWA(); نسخ -> onclick=xCp(); حفظ -> onclick=xDSave().
- Destinations found in inline handlers: none parsed.
- State coverage: initial content captured; hover/focus/disabled/loading/success/error/permission states are not verified per screen. Data-driven panels that require selecting a row or entering a pin remain unverified.
- Implementation parity status: NOT_VERIFIED at individual-control level; see the gap register for confirmed source-backed exceptions.

## SCR-067 - تثبيت كتطبيق

- Reference panel: sec-x-app; area: advanced reference add-on.
- Purpose text: أيقونة على شاشة الموبايل.
- Closest React route: /admin/install; implementation file candidate: frontend/src/features/admin/PwaInstallPage.tsx.
- Section headings: none in current DOM state.
- Fields: none visible in current DOM state.
- Table headers: none present in current DOM state.
- Interactive labels and inline actions: 📲 تثبيت التطبيق -> onclick=xInst().
- Destinations found in inline handlers: none parsed.
- State coverage: initial content captured; hover/focus/disabled/loading/success/error/permission states are not verified per screen. Data-driven panels that require selecting a row or entering a pin remain unverified.
- Implementation parity status: NOT_VERIFIED at individual-control level; see the gap register for confirmed source-backed exceptions.

## SCR-068 - ملاحظاتي

- Reference panel: sec-x-priv; area: advanced reference add-on.
- Purpose text: سجل خاص.
- Closest React route: No direct route found; implementation file candidate: requires further source tracing.
- Section headings: none in current DOM state.
- Fields: none visible in current DOM state.
- Table headers: none present in current DOM state.
- Interactive labels and inline actions: none visible in current DOM state.
- Destinations found in inline handlers: none parsed.
- State coverage: initial content captured; hover/focus/disabled/loading/success/error/permission states are not verified per screen. Data-driven panels that require selecting a row or entering a pin remain unverified.
- Implementation parity status: NOT_VERIFIED at individual-control level; see the gap register for confirmed source-backed exceptions.

## OVR-001 - إضافة عميل جديد

- Hidden overlay. Open/close behavior, focus, Escape, click-away, and submit are not exercised.
- Fields: input/text: الاسم الكامل; input/date: nc-bd; input/text: تلقائي; input/email: email@example.com; input/tel: رقم الهاتف; select/select-one: — اختر —القاهرةالجيزةالإسكندريةالقليوبيةالشرقيةالدقهليةالبحيرةالغربيةالمنوفيةكفر الشيخدمياطبورسعيدالإسماعيليةالسويسالفيو; input/text: nc-fb; textarea/textarea: العنوان التفصيلي...; select/select-one: ج.م — جنيه مصريUSD — دولار أمريكي; input/number: 0; select/select-one: 30 يومفوري15 يوم60 يوم; input/number: 0.
- Buttons: ✕; إلغاء; حفظ وإضافة آخر; حفظ العميل.
- Implementation parity: NOT_VERIFIED.

## OVR-002 - تسجيل دفعة

- Hidden overlay. Open/close behavior, focus, Escape, click-away, and submit are not exercised.
- Fields: select/select-one: pay-cust; select/select-one: نقديتحويل بنكيشيك; select/select-one: pay-cashier; input/number: 0.00; input/text: pay-date.
- Buttons: ✕; ＋ عميل; إلغاء; تأكيد الدفعة.
- Implementation parity: NOT_VERIFIED.

## OVR-003 - تسجيل مصروف جديد

- Hidden overlay. Open/close behavior, focus, Escape, click-away, and submit are not exercised.
- Fields: select/select-one: شحن ولوجستياتإيجاراترواتبمصاريف إداريةصيانةأخرى; input/number: 0.00; select/select-one: ex-cash; select/select-one: نقديتحويل بنكيشيك; input/text: ex-date; input/text: اختياري; input/text: وصف المصروف...; input/text: اختياري; input/text: اختياري.
- Buttons: ✕; إلغاء; تسجيل المصروف.
- Implementation parity: NOT_VERIFIED.

## OVR-004 - إضافة منتج جديد

- Hidden overlay. Open/close behavior, focus, Escape, click-away, and submit are not exercised.
- Fields: input/text: اسم المنتج الكامل; input/text: تلقائي; input/text: اكتب فئة جديدة أو اختر; select/select-one: حبةكيسطنلترمتر; select/select-one: المستودع الرئيسي - الرياضمستودع جدة; select/select-one: 15% (خاضع)0% (معفى); input/number: 0.00; input/number: 0.00; input/number: 0; input/number: 0; textarea/textarea: وصف مختصر للمنتج....
- Buttons: ✕; إلغاء; حفظ وإضافة آخر; حفظ المنتج.
- Implementation parity: NOT_VERIFIED.

## OVR-005 - إضافة / تعديل مستودع

- Hidden overlay. Open/close behavior, focus, Escape, click-away, and submit are not exercised.
- Fields: input/text: مثال: مستودع فرع الدمام; input/text: المدينة — الحي; select/select-one: أبنوبفهد العتيبيسارة محمد; input/number: 0; select/select-one: نشطتحت الصيانةموقوف.
- Buttons: ✕; إلغاء; حفظ المستودع.
- Implementation parity: NOT_VERIFIED.

## OVR-006 - ⚠️ تأكيد الإجراء

- Hidden overlay. Open/close behavior, focus, Escape, click-away, and submit are not exercised.
- Fields: textarea/textarea: اختياري — أضف سببًا أو ملاحظة للسجل....
- Buttons: ✕; إلغاء; تأكيد التنفيذ.
- Implementation parity: NOT_VERIFIED.

## OVR-007 - Untitled overlay 7

- Hidden overlay. Open/close behavior, focus, Escape, click-away, and submit are not exercised.
- Fields: none.
- Buttons: ✕; إلغاء; حفظ.
- Implementation parity: NOT_VERIFIED.

## OVR-008 - إضافة حاوية

- Hidden overlay. Open/close behavior, focus, Escape, click-away, and submit are not exercised.
- Fields: input/text: cont-no; input/text: cont-supplier; input/text: cont-origin; input/date: cont-eta; input/number: cont-exp; select/select-one: في الطريقفي الميناءتحت التخليص; input/checkbox: تم الاستلام الآن — أضف الكميات للمخزون فورًا.
- Buttons: ✕; + صنف; إلغاء; حفظ الحاوية.
- Implementation parity: NOT_VERIFIED.

## SCR-000 — تسجيل الدخول

- المرجع: حقلا login-user وlogin-pass خارج عقدة section-content؛ لا frame/prototype مستقل متاح.
- الهدف: بدء جلسة مستخدم وإظهار وجهة تسمح بها الصلاحية.
- عناصر DOM: إدخال مستخدم وحقل كلمة مرور وإرسال؛ CSV يسجل ELM-0001 وELM-0002.
- التطبيق المرشح: frontend/src/features/auth/LoginPage.tsx وAuthProvider.
- الحالات والتفاعل: لم يُرسل النموذج؛ حالة استجابة/شبكة/صلاحيات غير مختبرة.
- الحالة: وجود DOM مسجل؛ التطابق البصري والسلوك NOT_VERIFIED.

## Runtime visual follow-up — 2026-10-29

Selected pairs manually reviewed: SCR-000 login/390, SCR-001 dashboard/1280 and /390, SCR-004 order-create/1280, SCR-017 finance/390. SCR-008 invoice-print/1280 was inspected but content is NOT_VERIFIED because fixtures differ. Other captures are not manual parity passes. See docs/ux-inventory/INVENTORY.csv.

<a id="03-interactive-element-inventory"></a>

# 03 — جرد العناصر التفاعلية

هذا الجدول يضم 592 عنصرًا تفاعليًا؛ أضيفت 35 ملاحظة تفاعل/حقل من شاشات تفاصيل العميل والفاتورة والحركة. تم تنفيذ 13 نقرة/فتح/إلغاء آمنًا مباشرة في الجولة الحالية. الحالة NOT_VERIFIED لا تعني أن العنصر يعمل.

| Element ID | Screen ID | Element Name | Element Type | Label | Design Reference | Expected Action | Expected Destination | Preconditions | Permission Requirements | Expected States | Existing Implementation | Actual Behavior | Status | Gap IDs | Evidence | Confidence |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| ELM-0001 | SCR-000 | select#login-user.input | select | كراسأبنوبالسائق | v43 global shell | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | AppShell shell; implementation mapping pending | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM SCR-000; select#login-user.input | High: element presence; Not Verified: action and app parity |
| ELM-0002 | SCR-000 | input#login-pass.input | input/password | اكتب رقم تليفونك | v43 global shell | onkeydown=if(event.key==='Enter')doLogin() | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | AppShell shell; implementation mapping pending | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM SCR-000; input#login-pass.input | High: element presence; Not Verified: action and app parity |
| ELM-0003 | SCR-000 | button.btn.btn-primary | button | تسجيل الدخول | v43 global shell | onclick=doLogin() | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | AppShell shell; implementation mapping pending | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM SCR-000; button.btn.btn-primary | High: element presence; Not Verified: action and app parity |
| ELM-0004 | SCR-000 | button.nav-group-btn | button | الفواتير | v43 global shell | onclick=toggleSub('sales-sub') | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | AppShell shell; implementation mapping pending | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM SCR-000; button.nav-group-btn | High: element presence; Not Verified: action and app parity |
| ELM-0005 | SCR-000 | div.nav-item | div | الفواتير | v43 global shell | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | AppShell shell; implementation mapping pending | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM SCR-000; div.nav-item | High: element presence; Not Verified: action and app parity |
| ELM-0006 | SCR-000 | div.nav-sub-item | div | كل الفواتير 0 | v43 global shell | onclick=showSection('invoices') | invoices | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | AppShell shell; implementation mapping pending | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM SCR-000; div.nav-sub-item | High: element presence; Not Verified: action and app parity |
| ELM-0007 | SCR-000 | div.nav-sub-item | div | إنشاء فاتورة | v43 global shell | onclick=showSection('invoice-create') | invoice-create | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | AppShell shell; implementation mapping pending | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM SCR-000; div.nav-sub-item | High: element presence; Not Verified: action and app parity |
| ELM-0008 | SCR-000 | div#x-nav-ret.nav-sub-item | div | إنشاء مرتجع | v43 global shell | onclick=window.__retGo=1;showSection('invoice-create');window.__retGo=0;xRet(true) | invoice-create | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | AppShell shell; implementation mapping pending | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM SCR-000; div#x-nav-ret.nav-sub-item | High: element presence; Not Verified: action and app parity |
| ELM-0009 | SCR-000 | div.nav-sub-item | div | المرتجعات | v43 global shell | onclick=showSection('returns') | returns | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | AppShell shell; implementation mapping pending | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM SCR-000; div.nav-sub-item | High: element presence; Not Verified: action and app parity |
| ELM-0010 | SCR-000 | button.nav-group-btn | button | العملاء | v43 global shell | onclick=toggleSub('cust-sub') | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | AppShell shell; implementation mapping pending | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM SCR-000; button.nav-group-btn | High: element presence; Not Verified: action and app parity |
| ELM-0011 | SCR-000 | div.nav-item | div | العملاء | v43 global shell | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | AppShell shell; implementation mapping pending | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM SCR-000; div.nav-item | High: element presence; Not Verified: action and app parity |
| ELM-0012 | SCR-000 | div.nav-sub-item | div | كل العملاء | v43 global shell | onclick=showSection('customers') | customers | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | AppShell shell; implementation mapping pending | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM SCR-000; div.nav-sub-item | High: element presence; Not Verified: action and app parity |
| ELM-0013 | SCR-000 | div.nav-sub-item | div | إضافة عميل | v43 global shell | onclick=showSection('customers');if(byId('sec-customers').classList.contains('active'))openNewCustomer() | customers | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | AppShell shell; implementation mapping pending | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM SCR-000; div.nav-sub-item | High: element presence; Not Verified: action and app parity |
| ELM-0014 | SCR-000 | div.nav-sub-item | div | المحافظات | v43 global shell | onclick=showSection('govs') | govs | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | AppShell shell; implementation mapping pending | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM SCR-000; div.nav-sub-item | High: element presence; Not Verified: action and app parity |
| ELM-0015 | SCR-000 | div.nav-item | div | تصفية العميل | v43 global shell | onclick=finLiqFill();showSection('liq') | liq | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | AppShell shell; implementation mapping pending | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM SCR-000; div.nav-item | High: element presence; Not Verified: action and app parity |
| ELM-0016 | SCR-000 | button.nav-group-btn | button | المخزون | v43 global shell | onclick=toggleSub('inv-sub') | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | AppShell shell; implementation mapping pending | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM SCR-000; button.nav-group-btn | High: element presence; Not Verified: action and app parity |
| ELM-0017 | SCR-000 | div.nav-item | div | المخزون | v43 global shell | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | AppShell shell; implementation mapping pending | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM SCR-000; div.nav-item | High: element presence; Not Verified: action and app parity |
| ELM-0018 | SCR-000 | div.nav-sub-item | div | المنتجات | v43 global shell | onclick=showSection('products') | products | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | AppShell shell; implementation mapping pending | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM SCR-000; div.nav-sub-item | High: element presence; Not Verified: action and app parity |
| ELM-0019 | SCR-000 | div.nav-sub-item | div | المخازن | v43 global shell | onclick=showSection('warehouses') | warehouses | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | AppShell shell; implementation mapping pending | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM SCR-000; div.nav-sub-item | High: element presence; Not Verified: action and app parity |
| ELM-0020 | SCR-000 | div.nav-sub-item | div | ملخص المخزون | v43 global shell | onclick=showSection('inventory-summary') | inventory-summary | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | AppShell shell; implementation mapping pending | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM SCR-000; div.nav-sub-item | High: element presence; Not Verified: action and app parity |
| ELM-0021 | SCR-000 | div.nav-sub-item | div | حركة المخزون | v43 global shell | onclick=showSection('movements') | movements | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | AppShell shell; implementation mapping pending | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM SCR-000; div.nav-sub-item | High: element presence; Not Verified: action and app parity |
| ELM-0022 | SCR-000 | div.nav-sub-item | div | إضافة إلى المخزون | v43 global shell | onclick=showSection('stock-add') | stock-add | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | AppShell shell; implementation mapping pending | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM SCR-000; div.nav-sub-item | High: element presence; Not Verified: action and app parity |
| ELM-0023 | SCR-000 | div.nav-sub-item | div | المخزون المرتجع | v43 global shell | onclick=showSection('stock-ret') | stock-ret | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | AppShell shell; implementation mapping pending | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM SCR-000; div.nav-sub-item | High: element presence; Not Verified: action and app parity |
| ELM-0024 | SCR-000 | div.nav-item | div | المالية | v43 global shell | onclick=finOpen('home');toggleSub('fin2-sub') | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | AppShell shell; implementation mapping pending | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM SCR-000; div.nav-item | High: element presence; Not Verified: action and app parity |
| ELM-0025 | SCR-000 | div.nav-sub-item | div | الصندوق الوارد | v43 global shell | onclick=finOpen('inbox') | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | AppShell shell; implementation mapping pending | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM SCR-000; div.nav-sub-item | High: element presence; Not Verified: action and app parity |
| ELM-0026 | SCR-000 | div.nav-sub-item | div | السحب | v43 global shell | onclick=finOpen('accts') | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | AppShell shell; implementation mapping pending | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM SCR-000; div.nav-sub-item | High: element presence; Not Verified: action and app parity |
| ELM-0027 | SCR-000 | div.nav-sub-item | div | المصروفات | v43 global shell | onclick=finOpen('exp') | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | AppShell shell; implementation mapping pending | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM SCR-000; div.nav-sub-item | High: element presence; Not Verified: action and app parity |
| ELM-0028 | SCR-000 | div.nav-sub-item | div | الحركات | v43 global shell | onclick=finOpen('led') | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | AppShell shell; implementation mapping pending | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM SCR-000; div.nav-sub-item | High: element presence; Not Verified: action and app parity |
| ELM-0029 | SCR-000 | div.nav-sub-item | div | الشركاء | v43 global shell | onclick=finOpen('part') | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | AppShell shell; implementation mapping pending | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM SCR-000; div.nav-sub-item | High: element presence; Not Verified: action and app parity |
| ELM-0030 | SCR-000 | div.nav-sub-item | div | دفعات الشركاء | v43 global shell | onclick=finOpen('inst') | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | AppShell shell; implementation mapping pending | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM SCR-000; div.nav-sub-item | High: element presence; Not Verified: action and app parity |
| ELM-0031 | SCR-000 | div.nav-sub-item | div | فواتير الشراء | v43 global shell | onclick=finOpen('purch') | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | AppShell shell; implementation mapping pending | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM SCR-000; div.nav-sub-item | High: element presence; Not Verified: action and app parity |
| ELM-0032 | SCR-000 | div.nav-item | div | مرتجع المخازن | v43 global shell | onclick=showSection('wh-returns') | wh-returns | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | AppShell shell; implementation mapping pending | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM SCR-000; div.nav-item | High: element presence; Not Verified: action and app parity |
| ELM-0033 | SCR-000 | button.nav-group-btn | button | الحاويات | v43 global shell | onclick=toggleSub('cont-sub') | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | AppShell shell; implementation mapping pending | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM SCR-000; button.nav-group-btn | High: element presence; Not Verified: action and app parity |
| ELM-0034 | SCR-000 | div.nav-item | div | الحاويات | v43 global shell | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | AppShell shell; implementation mapping pending | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM SCR-000; div.nav-item | High: element presence; Not Verified: action and app parity |
| ELM-0035 | SCR-000 | div.nav-sub-item | div | كل الحاويات | v43 global shell | onclick=showSection('containers') | containers | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | AppShell shell; implementation mapping pending | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM SCR-000; div.nav-sub-item | High: element presence; Not Verified: action and app parity |
| ELM-0036 | SCR-000 | button.nav-group-btn | button | التقارير | v43 global shell | onclick=toggleSub('rep-sub') | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | AppShell shell; implementation mapping pending | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM SCR-000; button.nav-group-btn | High: element presence; Not Verified: action and app parity |
| ELM-0037 | SCR-000 | div.nav-item | div | التقارير | v43 global shell | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | AppShell shell; implementation mapping pending | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM SCR-000; div.nav-item | High: element presence; Not Verified: action and app parity |
| ELM-0038 | SCR-000 | div.nav-sub-item | div | مركز التقارير | v43 global shell | onclick=showSection('reports') | reports | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | AppShell shell; implementation mapping pending | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM SCR-000; div.nav-sub-item | High: element presence; Not Verified: action and app parity |
| ELM-0039 | SCR-000 | div.nav-sub-item | div | تقارير المبيعات | v43 global shell | onclick=showSection('reports-sales') | reports-sales | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | AppShell shell; implementation mapping pending | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM SCR-000; div.nav-sub-item | High: element presence; Not Verified: action and app parity |
| ELM-0040 | SCR-000 | div.nav-sub-item | div | تقارير الأرباح | v43 global shell | onclick=showSection('reports-profit') | reports-profit | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | AppShell shell; implementation mapping pending | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM SCR-000; div.nav-sub-item | High: element presence; Not Verified: action and app parity |
| ELM-0041 | SCR-000 | div.nav-sub-item | div | تقارير المخزون | v43 global shell | onclick=showSection('reports-inventory') | reports-inventory | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | AppShell shell; implementation mapping pending | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM SCR-000; div.nav-sub-item | High: element presence; Not Verified: action and app parity |
| ELM-0042 | SCR-000 | div.nav-item | div | المستخدم | v43 global shell | onclick=toggleSub('user-sub') | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | AppShell shell; implementation mapping pending | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM SCR-000; div.nav-item | High: element presence; Not Verified: action and app parity |
| ELM-0043 | SCR-000 | div.nav-sub-item | div | المستخدمون والصلاحيات | v43 global shell | onclick=showSection('users') | users | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | AppShell shell; implementation mapping pending | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM SCR-000; div.nav-sub-item | High: element presence; Not Verified: action and app parity |
| ELM-0044 | SCR-000 | div.nav-sub-item | div | سائق شركة الشحن | v43 global shell | onclick=showSection('drivers') | drivers | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | AppShell shell; implementation mapping pending | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM SCR-000; div.nav-sub-item | High: element presence; Not Verified: action and app parity |
| ELM-0045 | SCR-000 | div.nav-sub-item | div | سلة المحذوفات | v43 global shell | onclick=showSection('trash') | trash | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | AppShell shell; implementation mapping pending | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM SCR-000; div.nav-sub-item | High: element presence; Not Verified: action and app parity |
| ELM-0046 | SCR-000 | div.nav-sub-item | div | سجل العمليات | v43 global shell | onclick=showSection('log') | log | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | AppShell shell; implementation mapping pending | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM SCR-000; div.nav-sub-item | High: element presence; Not Verified: action and app parity |
| ELM-0047 | SCR-000 | div.nav-sub-item | div | مركز التحكم | v43 global shell | onclick=showSection('settings') | settings | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | AppShell shell; implementation mapping pending | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM SCR-000; div.nav-sub-item | High: element presence; Not Verified: action and app parity |
| ELM-0048 | SCR-000 | div.nav-sub-item | div | لوحة التحكم | v43 global shell | onclick=showSection('dashboard') | dashboard | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | AppShell shell; implementation mapping pending | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM SCR-000; div.nav-sub-item | High: element presence; Not Verified: action and app parity |
| ELM-0049 | SCR-000 | div.nav-item | div | سائق شركة الشحن | v43 global shell | onclick=showSection('drivers') | drivers | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | AppShell shell; implementation mapping pending | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM SCR-000; div.nav-item | High: element presence; Not Verified: action and app parity |
| ELM-0050 | SCR-000 | div.nav-item | div | سلة المحذوفات | v43 global shell | onclick=showSection('trash') | trash | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | AppShell shell; implementation mapping pending | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM SCR-000; div.nav-item | High: element presence; Not Verified: action and app parity |
| ELM-0051 | SCR-000 | div.nav-item | div | سجل العمليات | v43 global shell | onclick=showSection('log') | log | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | AppShell shell; implementation mapping pending | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM SCR-000; div.nav-item | High: element presence; Not Verified: action and app parity |
| ELM-0052 | SCR-000 | div.nav-item | div | لوحة التحكم | v43 global shell | onclick=showSection('dashboard') | dashboard | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | AppShell shell; implementation mapping pending | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM SCR-000; div.nav-item | High: element presence; Not Verified: action and app parity |
| ELM-0053 | SCR-000 | div.nav-item | div | ميزانية المصروفات | v43 global shell | onclick=xGo('x-budget') | x-budget | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | AppShell shell; implementation mapping pending | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM SCR-000; div.nav-item | High: element presence; Not Verified: action and app parity |
| ELM-0054 | SCR-000 | div.nav-item | div | مصروفات متكررة | v43 global shell | onclick=xGo('x-recur') | x-recur | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | AppShell shell; implementation mapping pending | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM SCR-000; div.nav-item | High: element presence; Not Verified: action and app parity |
| ELM-0055 | SCR-000 | div.nav-item | div | مقارنة شهر بشهر | v43 global shell | onclick=xGo('x-compare') | x-compare | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | AppShell shell; implementation mapping pending | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM SCR-000; div.nav-item | High: element presence; Not Verified: action and app parity |
| ELM-0056 | SCR-000 | div.nav-item | div | توقع السيولة | v43 global shell | onclick=xGo('x-cash') | x-cash | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | AppShell shell; implementation mapping pending | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM SCR-000; div.nav-item | High: element presence; Not Verified: action and app parity |
| ELM-0057 | SCR-000 | div.nav-item | div | تتبع الحاويات | v43 global shell | onclick=xGo('x-track') | x-track | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | AppShell shell; implementation mapping pending | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM SCR-000; div.nav-item | High: element presence; Not Verified: action and app parity |
| ELM-0058 | SCR-000 | div.nav-item | div | حد أدنى للمخزون | v43 global shell | onclick=xGo('x-low') | x-low | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | AppShell shell; implementation mapping pending | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM SCR-000; div.nav-item | High: element presence; Not Verified: action and app parity |
| ELM-0059 | SCR-000 | div.nav-item | div | الجرد الدوري | v43 global shell | onclick=xGo('x-count') | x-count | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | AppShell shell; implementation mapping pending | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM SCR-000; div.nav-item | High: element presence; Not Verified: action and app parity |
| ELM-0060 | SCR-000 | div.nav-item | div | باركود الأصناف | v43 global shell | onclick=xGo('x-bar') | x-bar | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | AppShell shell; implementation mapping pending | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM SCR-000; div.nav-item | High: element presence; Not Verified: action and app parity |
| ELM-0061 | SCR-000 | div.nav-item | div | سجل أسعار الشراء | v43 global shell | onclick=xGo('x-price') | x-price | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | AppShell shell; implementation mapping pending | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM SCR-000; div.nav-item | High: element presence; Not Verified: action and app parity |
| ELM-0062 | SCR-000 | div.nav-item | div | استيراد من إكسل | v43 global shell | onclick=xGo2('x-import') | x-import | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | AppShell shell; implementation mapping pending | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM SCR-000; div.nav-item | High: element presence; Not Verified: action and app parity |
| ELM-0063 | SCR-000 | div.nav-item | div | الملخص اليومي | v43 global shell | onclick=xGo2('x-daily') | x-daily | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | AppShell shell; implementation mapping pending | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM SCR-000; div.nav-item | High: element presence; Not Verified: action and app parity |
| ELM-0064 | SCR-000 | div.nav-item | div | تثبيت كتطبيق | v43 global shell | onclick=xGo2('x-app') | x-app | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | AppShell shell; implementation mapping pending | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM SCR-000; div.nav-item | High: element presence; Not Verified: action and app parity |
| ELM-0065 | SCR-000 | div.nav-item | div | ملاحظاتي | v43 global shell | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | AppShell shell; implementation mapping pending | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM SCR-000; div.nav-item | High: element presence; Not Verified: action and app parity |
| ELM-0066 | SCR-000 | div.sidebar-user | div | أح أحمد الشريف مدير عام | v43 global shell | onclick=openRowMenu(event,[{label:'الملف الشخصي',icon:'👤',action:()=>showSection('users')},{label:'تسجيل الخروج',icon:'🚪',danger:true,action:()=>doLogout()}]) | users | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | AppShell shell; implementation mapping pending | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM SCR-000; div.sidebar-user | High: element presence; Not Verified: action and app parity |
| ELM-0067 | SCR-000 | div#search-wrap.search-wrap | div | بحث شامل... Ctrl+K | v43 global shell | onclick=toggleSearch() | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | AppShell shell; implementation mapping pending | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM SCR-000; div#search-wrap.search-wrap | High: element presence; Not Verified: action and app parity |
| ELM-0068 | SCR-000 | button#x-menu-btn.icon-btn | button | القائمة | v43 global shell | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | AppShell shell; implementation mapping pending | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM SCR-000; button#x-menu-btn.icon-btn | High: element presence; Not Verified: action and app parity |
| ELM-0069 | SCR-000 | button#x-theme.icon-btn | button | فاتح / داكن | v43 global shell | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | AppShell shell; implementation mapping pending | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM SCR-000; button#x-theme.icon-btn | High: element presence; Not Verified: action and app parity |
| ELM-0070 | SCR-000 | button.icon-btn | button | الإشعارات | v43 global shell | onclick=toggleNotif() | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | AppShell shell; implementation mapping pending | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM SCR-000; button.icon-btn | High: element presence; Not Verified: action and app parity |
| ELM-0071 | SCR-000 | button.icon-btn | button | إعدادات | v43 global shell | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | AppShell shell; implementation mapping pending | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM SCR-000; button.icon-btn | High: element presence; Not Verified: action and app parity |
| ELM-0072 | SCR-000 | div.avatar | div | الملف الشخصي | v43 global shell | onclick=openRowMenu(event,[{label:'الملف الشخصي',icon:'👤',action:()=>showSection('users')},{label:'تسجيل الخروج',icon:'🚪',danger:true,action:()=>doLogout()}]) | users | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | AppShell shell; implementation mapping pending | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM SCR-000; div.avatar | High: element presence; Not Verified: action and app parity |
| ELM-0073 | SCR-000 | button.btn.btn-ghost | button | تعليم الكل مقروء | v43 global shell | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | AppShell shell; implementation mapping pending | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM SCR-000; button.btn.btn-ghost | High: element presence; Not Verified: action and app parity |
| ELM-0074 | SCR-000 | input | input | ابحث في العملاء، الفواتير، المنتجات... | v43 global shell | oninput=runGlobalSearch(this.value) \| onkeydown=if(event.key==='Enter')openSearchHit(0) | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | AppShell shell; implementation mapping pending | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM SCR-000; input | High: element presence; Not Verified: action and app parity |
| ELM-0075 | SCR-000 | button | button | سائق شركة الشحن | v43 global shell | onclick=showSection('drivers') | drivers | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | AppShell shell; implementation mapping pending | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM SCR-000; button | High: element presence; Not Verified: action and app parity |
| ELM-0076 | SCR-000 | button | button | سلة المحذوفات | v43 global shell | onclick=showSection('trash') | trash | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | AppShell shell; implementation mapping pending | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM SCR-000; button | High: element presence; Not Verified: action and app parity |
| ELM-0077 | SCR-000 | button | button | سجل العمليات | v43 global shell | onclick=showSection('log') | log | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | AppShell shell; implementation mapping pending | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM SCR-000; button | High: element presence; Not Verified: action and app parity |
| ELM-0078 | SCR-000 | button | button | مركز التحكم | v43 global shell | onclick=showSection('settings') | settings | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | AppShell shell; implementation mapping pending | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM SCR-000; button | High: element presence; Not Verified: action and app parity |
| ELM-0079 | SCR-000 | button | button | لوحة التحكم | v43 global shell | onclick=showSection('dashboard') | dashboard | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | AppShell shell; implementation mapping pending | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM SCR-000; button | High: element presence; Not Verified: action and app parity |
| ELM-0080 | SCR-001 | button.btn.btn-ghost | button | تصدير | v43 DOM #sec-dashboard | onclick=exportTableCSV(this) | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /dashboard | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-dashboard; button.btn.btn-ghost | High: element presence; Not Verified: action and app parity |
| ELM-0081 | SCR-001 | div.stat-card | div | إجمالي المبيعات 0 +12.5% مقارنة بالشهر السابق | v43 DOM #sec-dashboard | onclick=showSection('reports-sales') | reports-sales | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /dashboard | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-dashboard; div.stat-card | High: element presence; Not Verified: action and app parity |
| ELM-0082 | SCR-001 | div.stat-card | div | إجمالي التحصيلات 0 +8.2% مقارنة بالشهر السابق | v43 DOM #sec-dashboard | onclick=showSection('collections') | collections | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /dashboard | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-dashboard; div.stat-card | High: element presence; Not Verified: action and app parity |
| ELM-0083 | SCR-001 | div.stat-card | div | إجمالي المصروفات 0 -3.1% مقارنة بالشهر السابق | v43 DOM #sec-dashboard | onclick=showSection('expenses') | expenses | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /dashboard | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-dashboard; div.stat-card | High: element presence; Not Verified: action and app parity |
| ELM-0084 | SCR-001 | div.stat-card | div | صافي الربح 0 +18.4% مقارنة بالشهر السابق | v43 DOM #sec-dashboard | onclick=showSection('reports-profit') | reports-profit | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /dashboard | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-dashboard; div.stat-card | High: element presence; Not Verified: action and app parity |
| ELM-0085 | SCR-001 | div.stat-card | div | 0 طلبات معلقة | v43 DOM #sec-dashboard | onclick=showSection('orders') | orders | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /dashboard | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-dashboard; div.stat-card | High: element presence; Not Verified: action and app parity |
| ELM-0086 | SCR-001 | div.stat-card | div | 0 منتجات مخزون منخفض | v43 DOM #sec-dashboard | onclick=showSection('products') | products | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /dashboard | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-dashboard; div.stat-card | High: element presence; Not Verified: action and app parity |
| ELM-0087 | SCR-001 | div.stat-card | div | ج.م 0 رصيد الخزائن | v43 DOM #sec-dashboard | onclick=showSection('cashiers') | cashiers | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /dashboard | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-dashboard; div.stat-card | High: element presence; Not Verified: action and app parity |
| ELM-0088 | SCR-001 | span.td-link | span | عرض الفواتير ← | v43 DOM #sec-dashboard | onclick=showSection('invoices') | invoices | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /dashboard | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-dashboard; span.td-link | High: element presence; Not Verified: action and app parity |
| ELM-0089 | SCR-001 | span.td-link | span | متابعة ← | v43 DOM #sec-dashboard | onclick=showSection('containers') | containers | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /dashboard | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-dashboard; span.td-link | High: element presence; Not Verified: action and app parity |
| ELM-0090 | SCR-001 | button.btn.btn-ghost | button | إعداد الحسابات ← | v43 DOM #sec-dashboard | onclick=showSection('cashiers') | cashiers | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /dashboard | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-dashboard; button.btn.btn-ghost | High: element presence; Not Verified: action and app parity |
| ELM-0091 | SCR-001 | a | a | إعداد الحسابات المالية العامة | v43 DOM #sec-dashboard | onclick=showSection('cashiers') | cashiers | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /dashboard | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-dashboard; a | High: element presence; Not Verified: action and app parity |
| ELM-0092 | SCR-001 | button.btn.btn-ghost | button | ← تسجيل أول فاتورة تجريبية | v43 DOM #sec-dashboard | onclick=showSection('invoices') | invoices | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /dashboard | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-dashboard; button.btn.btn-ghost | High: element presence; Not Verified: action and app parity |
| ELM-0093 | SCR-001 | button.btn.btn-ghost | button | معاينة مع بيانات (تجريبي) | v43 DOM #sec-dashboard | onclick=toggleChart() | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /dashboard | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-dashboard; button.btn.btn-ghost | High: element presence; Not Verified: action and app parity |
| ELM-0094 | SCR-001 | button.btn.btn-primary | button | ＋ إضافة بيانات تجريبية | v43 DOM #sec-dashboard | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /dashboard | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-dashboard; button.btn.btn-primary | High: element presence; Not Verified: action and app parity |
| ELM-0095 | SCR-001 | button.btn.btn-ghost | button | عرض الكل | v43 DOM #sec-dashboard | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /dashboard | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-dashboard; button.btn.btn-ghost | High: element presence; Not Verified: action and app parity |
| ELM-0096 | SCR-001 | div.stat-card | div | الطلبات0اضغط لعرض كل الطلبات | v43 DOM #sec-dashboard | onclick=showSection('orders') | orders | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /dashboard | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-dashboard; div.stat-card | High: element presence; Not Verified: action and app parity |
| ELM-0097 | SCR-001 | div.stat-card | div | التسليمات0اضغط لعرض كل التسليمات | v43 DOM #sec-dashboard | onclick=showSection('deliveries') | deliveries | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /dashboard | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-dashboard; div.stat-card | High: element presence; Not Verified: action and app parity |
| ELM-0098 | SCR-002 | button.btn.btn-ghost | button | تصدير | v43 DOM #sec-customers | onclick=exportTableCSV(this) | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /customers | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-customers; button.btn.btn-ghost | High: element presence; Not Verified: action and app parity |
| ELM-0099 | SCR-002 | button.btn.btn-primary | button | إضافة عميل | v43 DOM #sec-customers | onclick=openModal('modal-add-customer') | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /customers | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-customers; button.btn.btn-primary | High: element presence; Not Verified: action and app parity |
| ELM-0100 | SCR-002 | input | input | بحث بالاسم أو الهاتف... | v43 DOM #sec-customers | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /customers | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-customers; input | High: element presence; Not Verified: action and app parity |
| ELM-0101 | SCR-002 | select.select | select | كل العملات ج.م USD | v43 DOM #sec-customers | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /customers | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-customers; select.select | High: element presence; Not Verified: action and app parity |
| ELM-0102 | SCR-002 | input#cs-q.input | input | بحث بالاسم أو الهاتف أو المحافظة | v43 DOM #sec-customers | oninput=renderCustomers() | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /customers | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-customers; input#cs-q.input | High: element presence; Not Verified: action and app parity |
| ELM-0103 | SCR-002 | select#cs-g.select | select | كل المحافظاتالقاهرةالجيزةالإسكندريةالقليوبيةالشرقيةالدقهليةالبحيرةالغربيةالمنوفيةكفر الشيخدمياطبورسعيدالإسماعيليةالسويسا | v43 DOM #sec-customers | onchange=renderCustomers() | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /customers | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-customers; select#cs-g.select | High: element presence; Not Verified: action and app parity |
| ELM-0104 | SCR-002 | button.pg-btn | button | ‹ | v43 DOM #sec-customers | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /customers | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-customers; button.pg-btn | High: element presence; Not Verified: action and app parity |
| ELM-0105 | SCR-002 | button.pg-btn.active | button | 1 | v43 DOM #sec-customers | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /customers | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-customers; button.pg-btn.active | High: element presence; Not Verified: action and app parity |
| ELM-0106 | SCR-002 | button.pg-btn | button | 2 | v43 DOM #sec-customers | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /customers | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-customers; button.pg-btn | High: element presence; Not Verified: action and app parity |
| ELM-0107 | SCR-002 | button.pg-btn | button | 3 | v43 DOM #sec-customers | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /customers | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-customers; button.pg-btn | High: element presence; Not Verified: action and app parity |
| ELM-0108 | SCR-002 | button.pg-btn | button | › | v43 DOM #sec-customers | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /customers | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-customers; button.pg-btn | High: element presence; Not Verified: action and app parity |
| ELM-0109 | SCR-002 | button.btn.btn-secondary | button | 🔁 تكرار آخر فاتورة | v43 DOM #sec-customers | onclick=repeatLastInvoice('c2') | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /customers | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-customers; button.btn.btn-secondary | High: element presence; Not Verified: action and app parity |
| ELM-0110 | SCR-002 | button.tbl-btn | button | ✕ | v43 DOM #sec-customers | onclick=closeCustomerDetail() | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /customers | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-customers; button.tbl-btn | High: element presence; Not Verified: action and app parity |
| ELM-0111 | SCR-002 | div.tab-item.active | div | نظرة عامة | v43 DOM #sec-customers | onclick=switchCustTab('overview',this) | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /customers | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-customers; div.tab-item.active | High: element presence; Not Verified: action and app parity |
| ELM-0112 | SCR-002 | div.tab-item | div | الطلبات | v43 DOM #sec-customers | onclick=switchCustTab('orders-tab',this) | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /customers | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-customers; div.tab-item | High: element presence; Not Verified: action and app parity |
| ELM-0113 | SCR-002 | div.tab-item | div | الفواتير | v43 DOM #sec-customers | onclick=switchCustTab('invoices-tab',this) | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /customers | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-customers; div.tab-item | High: element presence; Not Verified: action and app parity |
| ELM-0114 | SCR-002 | div.tab-item | div | الدفعات | v43 DOM #sec-customers | onclick=switchCustTab('payments-tab',this) | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /customers | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-customers; div.tab-item | High: element presence; Not Verified: action and app parity |
| ELM-0115 | SCR-002 | div.tab-item | div | كشف الحساب | v43 DOM #sec-customers | onclick=switchCustTab('statement-tab',this) | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /customers | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-customers; div.tab-item | High: element presence; Not Verified: action and app parity |
| ELM-0116 | SCR-002 | div.tab-item | div | سجل النشاط | v43 DOM #sec-customers | onclick=switchCustTab('activity-tab',this) | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /customers | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-customers; div.tab-item | High: element presence; Not Verified: action and app parity |
| ELM-0117 | SCR-002 | button.btn.btn-primary | button | إنشاء طلب | v43 DOM #sec-customers | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /customers | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-customers; button.btn.btn-primary | High: element presence; Not Verified: action and app parity |
| ELM-0118 | SCR-002 | button.btn.btn-secondary | button | إنشاء فاتورة | v43 DOM #sec-customers | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /customers | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-customers; button.btn.btn-secondary | High: element presence; Not Verified: action and app parity |
| ELM-0119 | SCR-002 | button.btn.btn-ghost | button | تسجيل دفعة | v43 DOM #sec-customers | onclick=openModal('modal-payment') | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /customers | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-customers; button.btn.btn-ghost | High: element presence; Not Verified: action and app parity |
| ELM-0120 | SCR-003 | button.btn.btn-ghost | button | تصدير | v43 DOM #sec-orders | onclick=exportTableCSV(this) | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /orders | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-orders; button.btn.btn-ghost | High: element presence; Not Verified: action and app parity |
| ELM-0121 | SCR-003 | button.btn.btn-primary | button | + إنشاء طلب | v43 DOM #sec-orders | onclick=showSection('order-create') | order-create | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /orders | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-orders; button.btn.btn-primary | High: element presence; Not Verified: action and app parity |
| ELM-0122 | SCR-003 | input | input | بحث بالرقم أو العميل... | v43 DOM #sec-orders | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /orders | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-orders; input | High: element presence; Not Verified: action and app parity |
| ELM-0123 | SCR-003 | div.filter-chip.active | div | الكل | v43 DOM #sec-orders | onclick=filterRows('orders-tbody', null, this) | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /orders | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-orders; div.filter-chip.active | High: element presence; Not Verified: action and app parity |
| ELM-0124 | SCR-003 | div.filter-chip | div | مسودة | v43 DOM #sec-orders | onclick=filterRows('orders-tbody', 'مسودة', this) | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /orders | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-orders; div.filter-chip | High: element presence; Not Verified: action and app parity |
| ELM-0125 | SCR-003 | div.filter-chip | div | مؤكد | v43 DOM #sec-orders | onclick=filterRows('orders-tbody', 'مؤكد', this) | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /orders | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-orders; div.filter-chip | High: element presence; Not Verified: action and app parity |
| ELM-0126 | SCR-003 | div.filter-chip | div | قيد التجهيز | v43 DOM #sec-orders | onclick=filterRows('orders-tbody', 'قيد التجهيز', this) | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /orders | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-orders; div.filter-chip | High: element presence; Not Verified: action and app parity |
| ELM-0127 | SCR-003 | div.filter-chip | div | مكتمل | v43 DOM #sec-orders | onclick=filterRows('orders-tbody', 'مكتمل', this) | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /orders | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-orders; div.filter-chip | High: element presence; Not Verified: action and app parity |
| ELM-0128 | SCR-003 | div.filter-chip | div | ملغي | v43 DOM #sec-orders | onclick=filterRows('orders-tbody', 'ملغي', this) | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /orders | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-orders; div.filter-chip | High: element presence; Not Verified: action and app parity |
| ELM-0129 | SCR-003 | button.btn.btn-primary | button | ＋ إضافة بيانات تجريبية | v43 DOM #sec-orders | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /orders | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-orders; button.btn.btn-primary | High: element presence; Not Verified: action and app parity |
| ELM-0130 | SCR-003 | input.perm-check | input/checkbox |  | v43 DOM #sec-orders | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /orders | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-orders; input.perm-check | High: element presence; Not Verified: action and app parity |
| ELM-0131 | SCR-003 | button.pg-btn | button | ‹ | v43 DOM #sec-orders | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /orders | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-orders; button.pg-btn | High: element presence; Not Verified: action and app parity |
| ELM-0132 | SCR-003 | button.pg-btn.active | button | 1 | v43 DOM #sec-orders | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /orders | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-orders; button.pg-btn.active | High: element presence; Not Verified: action and app parity |
| ELM-0133 | SCR-003 | button.pg-btn | button | 2 | v43 DOM #sec-orders | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /orders | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-orders; button.pg-btn | High: element presence; Not Verified: action and app parity |
| ELM-0134 | SCR-003 | button.pg-btn | button | › | v43 DOM #sec-orders | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /orders | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-orders; button.pg-btn | High: element presence; Not Verified: action and app parity |
| ELM-0135 | SCR-004 | button.btn.btn-ghost | button | استيراد من مسودة عرض أسعار | v43 DOM #sec-order-create | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /orders/new | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-order-create; button.btn.btn-ghost | High: element presence; Not Verified: action and app parity |
| ELM-0136 | SCR-004 | input.input | input |  | v43 DOM #sec-order-create | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /orders/new | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-order-create; input.input | High: element presence; Not Verified: action and app parity |
| ELM-0137 | SCR-004 | select.select | select | شركة رواف الخليج للتجارة والمقاولاتمحمد أحمد العليعبدالله سالم | v43 DOM #sec-order-create | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /orders/new | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-order-create; select.select | High: element presence; Not Verified: action and app parity |
| ELM-0138 | SCR-004 | button.btn.btn-ghost | button | + عميل جديد | v43 DOM #sec-order-create | onclick=openModal('modal-add-customer') | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /orders/new | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-order-create; button.btn.btn-ghost | High: element presence; Not Verified: action and app parity |
| ELM-0139 | SCR-004 | input.input | input/date |  | v43 DOM #sec-order-create | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /orders/new | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-order-create; input.input | High: element presence; Not Verified: action and app parity |
| ELM-0140 | SCR-004 | select.select | select | جنيه مصري (ج.م)دولار أمريكي (USD) | v43 DOM #sec-order-create | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /orders/new | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-order-create; select.select | High: element presence; Not Verified: action and app parity |
| ELM-0141 | SCR-004 | select.select | select | المستودع الرئيسي - الرياضمستودع جدةمستودع الدمام | v43 DOM #sec-order-create | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /orders/new | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-order-create; select.select | High: element presence; Not Verified: action and app parity |
| ELM-0142 | SCR-004 | select.select | select | 30 يوم من تاريخ الفاتورةفوري15 يوم60 يوم | v43 DOM #sec-order-create | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /orders/new | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-order-create; select.select | High: element presence; Not Verified: action and app parity |
| ELM-0143 | SCR-004 | select.select | select | كراسأبنوب | v43 DOM #sec-order-create | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /orders/new | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-order-create; select.select | High: element presence; Not Verified: action and app parity |
| ELM-0144 | SCR-004 | textarea.textarea | textarea | اكتب ملاحظات خاصة بشروط العميل هنا... | v43 DOM #sec-order-create | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /orders/new | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-order-create; textarea.textarea | High: element presence; Not Verified: action and app parity |
| ELM-0145 | SCR-004 | button.btn.btn-primary | button | + إضافة صنف جديد | v43 DOM #sec-order-create | onclick=addOrderRow() | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /orders/new | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-order-create; button.btn.btn-primary | High: element presence; Not Verified: action and app parity |
| ELM-0146 | SCR-004 | button.btn.btn-ghost | button | إلغاء الأمر | v43 DOM #sec-order-create | onclick=showSection('orders') | orders | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /orders/new | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-order-create; button.btn.btn-ghost | High: element presence; Not Verified: action and app parity |
| ELM-0147 | SCR-004 | button.btn.btn-secondary | button | حفظ كمسودة | v43 DOM #sec-order-create | onclick=showToast('success','تم حفظ الطلب كمسودة','يمكنك إكماله لاحقًا من قائمة الطلبات') | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /orders/new | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-order-create; button.btn.btn-secondary | High: element presence; Not Verified: action and app parity |
| ELM-0148 | SCR-004 | button.btn.btn-primary | button | تأكيد وإرسال الطلب للاعتماد | v43 DOM #sec-order-create | onclick=confirmNewOrder() | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /orders/new | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-order-create; button.btn.btn-primary | High: element presence; Not Verified: action and app parity |
| ELM-0149 | SCR-005 | button.btn.btn-danger | button | إلغاء الطلب | v43 DOM #sec-order-detail | onclick=openModal('modal-confirm') | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /orders/:orderId | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-order-detail; button.btn.btn-danger | High: element presence; Not Verified: action and app parity |
| ELM-0150 | SCR-005 | button.btn.btn-secondary | button | حجز المخزون | v43 DOM #sec-order-detail | onclick=showToast('success','تم إنشاء إذن حجز مخزون','تم حجز الكميات من المستودع الرئيسي') | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /orders/:orderId | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-order-detail; button.btn.btn-secondary | High: element presence; Not Verified: action and app parity |
| ELM-0151 | SCR-005 | button.btn.btn-secondary | button | إنشاء تسليم | v43 DOM #sec-order-detail | onclick=showSection('delivery-create') | delivery-create | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /orders/:orderId | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-order-detail; button.btn.btn-secondary | High: element presence; Not Verified: action and app parity |
| ELM-0152 | SCR-005 | button.btn.btn-primary | button | إنشاء فاتورة | v43 DOM #sec-order-detail | onclick=showSection('invoice-create') | invoice-create | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /orders/:orderId | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-order-detail; button.btn.btn-primary | High: element presence; Not Verified: action and app parity |
| ELM-0153 | SCR-005 | div.tab-item.active | div | بيانات الطلب | v43 DOM #sec-order-detail | onclick=switchModalTab('od','tab-data',this) | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /orders/:orderId | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-order-detail; div.tab-item.active | High: element presence; Not Verified: action and app parity |
| ELM-0154 | SCR-005 | div.tab-item | div | الأصناف والأسعار | v43 DOM #sec-order-detail | onclick=switchModalTab('od','tab-items',this) | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /orders/:orderId | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-order-detail; div.tab-item | High: element presence; Not Verified: action and app parity |
| ELM-0155 | SCR-005 | div.tab-item | div | الحجوزات | v43 DOM #sec-order-detail | onclick=switchModalTab('od','tab-reservations',this) | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /orders/:orderId | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-order-detail; div.tab-item | High: element presence; Not Verified: action and app parity |
| ELM-0156 | SCR-005 | div.tab-item | div | التسليمات | v43 DOM #sec-order-detail | onclick=switchModalTab('od','tab-deliveries',this) | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /orders/:orderId | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-order-detail; div.tab-item | High: element presence; Not Verified: action and app parity |
| ELM-0157 | SCR-005 | div.tab-item | div | الفواتير | v43 DOM #sec-order-detail | onclick=switchModalTab('od','tab-invoices',this) | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /orders/:orderId | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-order-detail; div.tab-item | High: element presence; Not Verified: action and app parity |
| ELM-0158 | SCR-005 | button.btn.btn-primary | button | + إنشاء تسليم | v43 DOM #sec-order-detail | onclick=showSection('delivery-create') | delivery-create | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /orders/:orderId | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-order-detail; button.btn.btn-primary | High: element presence; Not Verified: action and app parity |
| ELM-0159 | SCR-005 | button.btn.btn-ghost | button | معاينة طباعة | v43 DOM #sec-order-detail | onclick=printInvoice('INV-2024-090') | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /orders/:orderId | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-order-detail; button.btn.btn-ghost | High: element presence; Not Verified: action and app parity |
| ELM-0160 | SCR-005 | button.btn.btn-ghost | button | تصدير | v43 DOM #sec-order-detail | onclick=printInvoice('INV-2024-090') | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /orders/:orderId | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-order-detail; button.btn.btn-ghost | High: element presence; Not Verified: action and app parity |
| ELM-0161 | SCR-005 | button.btn.btn-primary | button | + إنشاء فاتورة | v43 DOM #sec-order-detail | onclick=showSection('invoice-create') | invoice-create | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /orders/:orderId | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-order-detail; button.btn.btn-primary | High: element presence; Not Verified: action and app parity |
| ELM-0162 | SCR-006 | button.btn.btn-ghost | button | معاينة طباعة | v43 DOM #sec-invoices | onclick=printLast() | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /invoices | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-invoices; button.btn.btn-ghost | High: element presence; Not Verified: action and app parity |
| ELM-0163 | SCR-006 | button.btn.btn-ghost | button | تصدير | v43 DOM #sec-invoices | onclick=printLast() | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /invoices | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-invoices; button.btn.btn-ghost | High: element presence; Not Verified: action and app parity |
| ELM-0164 | SCR-006 | button.btn.btn-primary | button | + إنشاء فاتورة | v43 DOM #sec-invoices | onclick=showSection('invoice-create') | invoice-create | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /invoices | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-invoices; button.btn.btn-primary | High: element presence; Not Verified: action and app parity |
| ELM-0165 | SCR-006 | div | div | كراس0 فاتورة0 إجمالي | v43 DOM #sec-invoices | onclick=filterIssuer('كراس') | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /invoices | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-invoices; div | High: element presence; Not Verified: action and app parity |
| ELM-0166 | SCR-006 | div | div | أبنوب0 فاتورة0 إجمالي | v43 DOM #sec-invoices | onclick=filterIssuer('أبنوب') | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /invoices | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-invoices; div | High: element presence; Not Verified: action and app parity |
| ELM-0167 | SCR-006 | div | div | السائق0 فاتورة0 إجمالي | v43 DOM #sec-invoices | onclick=filterIssuer('السائق') | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /invoices | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-invoices; div | High: element presence; Not Verified: action and app parity |
| ELM-0168 | SCR-006 | input | input | بحث برقم الفاتورة أو العميل... | v43 DOM #sec-invoices | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /invoices | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-invoices; input | High: element presence; Not Verified: action and app parity |
| ELM-0169 | SCR-006 | select.select | select | كل العملاءمحمد أحمدشركة الأمل | v43 DOM #sec-invoices | onchange=filterRows('invoices-tbody', this.value \|\| null, this.parentElement.querySelector('.filter-chip.active') \|\| this.parentElement.querySelectorAll('.filter-chip')[0]) | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /invoices | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-invoices; select.select | High: element presence; Not Verified: action and app parity |
| ELM-0170 | SCR-006 | input.input | input/date |  | v43 DOM #sec-invoices | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /invoices | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-invoices; input.input | High: element presence; Not Verified: action and app parity |
| ELM-0171 | SCR-006 | div.filter-chip.active | div | الكل | v43 DOM #sec-invoices | onclick=filterRows('invoices-tbody', null, this) | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /invoices | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-invoices; div.filter-chip.active | High: element presence; Not Verified: action and app parity |
| ELM-0172 | SCR-006 | div.filter-chip | div | مسودة | v43 DOM #sec-invoices | onclick=filterRows('invoices-tbody', 'مسودة', this) | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /invoices | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-invoices; div.filter-chip | High: element presence; Not Verified: action and app parity |
| ELM-0173 | SCR-006 | div.filter-chip | div | غير مدفوعة | v43 DOM #sec-invoices | onclick=filterRows('invoices-tbody', 'غير مدفوعة', this) | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /invoices | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-invoices; div.filter-chip | High: element presence; Not Verified: action and app parity |
| ELM-0174 | SCR-006 | div.filter-chip | div | متأخرة 🔴 | v43 DOM #sec-invoices | onclick=filterRows('invoices-tbody', 'متأخرة', this) | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /invoices | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-invoices; div.filter-chip | High: element presence; Not Verified: action and app parity |
| ELM-0175 | SCR-006 | div.filter-chip | div | مدفوعة | v43 DOM #sec-invoices | onclick=filterRows('invoices-tbody', 'مدفوعة', this) | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /invoices | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-invoices; div.filter-chip | High: element presence; Not Verified: action and app parity |
| ELM-0176 | SCR-006 | button.btn.btn-ghost | button | 🖨️ طباعة | v43 DOM #sec-invoices | onclick=bulkAction('print') | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /invoices | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-invoices; button.btn.btn-ghost | High: element presence; Not Verified: action and app parity |
| ELM-0177 | SCR-006 | button.btn.btn-ghost | button | PDF | v43 DOM #sec-invoices | onclick=bulkAction('pdf') | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /invoices | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-invoices; button.btn.btn-ghost | High: element presence; Not Verified: action and app parity |
| ELM-0178 | SCR-006 | button.btn.btn-primary | button | 📱 إرسال واتساب | v43 DOM #sec-invoices | onclick=bulkAction('whatsapp') | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /invoices | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-invoices; button.btn.btn-primary | High: element presence; Not Verified: action and app parity |
| ELM-0179 | SCR-006 | input.input | input | بحث: رقم الفاتورة، العميل، الهاتف، التاريخ | v43 DOM #sec-invoices | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /invoices | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-invoices; input.input | High: element presence; Not Verified: action and app parity |
| ELM-0180 | SCR-006 | input.perm-check | input/checkbox |  | v43 DOM #sec-invoices | onchange=bulkSelectAll(this) | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /invoices | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-invoices; input.perm-check | High: element presence; Not Verified: action and app parity |
| ELM-0181 | SCR-006 | button.pg-btn | button | ‹ | v43 DOM #sec-invoices | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /invoices | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-invoices; button.pg-btn | High: element presence; Not Verified: action and app parity |
| ELM-0182 | SCR-006 | button.pg-btn.active | button | 1 | v43 DOM #sec-invoices | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /invoices | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-invoices; button.pg-btn.active | High: element presence; Not Verified: action and app parity |
| ELM-0183 | SCR-006 | button.pg-btn | button | 2 | v43 DOM #sec-invoices | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /invoices | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-invoices; button.pg-btn | High: element presence; Not Verified: action and app parity |
| ELM-0184 | SCR-006 | button.pg-btn | button | › | v43 DOM #sec-invoices | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /invoices | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-invoices; button.pg-btn | High: element presence; Not Verified: action and app parity |
| ELM-0185 | SCR-007 | button#x-retbtn.btn.btn-ghost | button | ↩ إنشاء مرتجع | v43 DOM #sec-invoice-create | onclick=xRet() | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /invoices/new | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-invoice-create; button#x-retbtn.btn.btn-ghost | High: element presence; Not Verified: action and app parity |
| ELM-0186 | SCR-007 | button.btn.btn-ghost | button | إلغاء | v43 DOM #sec-invoice-create | onclick=showSection('invoices') | invoices | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /invoices/new | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-invoice-create; button.btn.btn-ghost | High: element presence; Not Verified: action and app parity |
| ELM-0187 | SCR-007 | button.btn.btn-ghost | button | 👁 معاينة الفاتورة | v43 DOM #sec-invoice-create | onclick=previewDraft() | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /invoices/new | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-invoice-create; button.btn.btn-ghost | High: element presence; Not Verified: action and app parity |
| ELM-0188 | SCR-007 | button.btn.btn-secondary | button | حفظ كمسودة | v43 DOM #sec-invoice-create | onclick=showToast('success','تم حفظ الفاتورة كمسودة') | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /invoices/new | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-invoice-create; button.btn.btn-secondary | High: element presence; Not Verified: action and app parity |
| ELM-0189 | SCR-007 | button.btn.btn-primary | button | Ctrl + Enter | v43 DOM #sec-invoice-create | onclick=confirmNewInvoice() | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /invoices/new | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-invoice-create; button.btn.btn-primary | High: element presence; Not Verified: action and app parity |
| ELM-0190 | SCR-007 | button#inv-ret-btn.btn.btn-secondary | button | ↩️ مرتجعات | v43 DOM #sec-invoice-create | onclick=newReturn() | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /invoices/new | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-invoice-create; button#inv-ret-btn.btn.btn-secondary | High: element presence; Not Verified: action and app parity |
| ELM-0191 | SCR-007 | select#inv-wa-who.input | select | — اختر —كراسأبنوبالسائق | v43 DOM #sec-invoice-create | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /invoices/new | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-invoice-create; select#inv-wa-who.input | High: element presence; Not Verified: action and app parity |
| ELM-0192 | SCR-007 | button.btn.btn-secondary | button | واتساب | v43 DOM #sec-invoice-create | onclick=var w=byId('inv-wa-who').value;w?waOpen(w):showToast('error','اختر الشخص أولًا') | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /invoices/new | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-invoice-create; button.btn.btn-secondary | High: element presence; Not Verified: action and app parity |
| ELM-0193 | SCR-007 | div.toggle-btn.active | div | فاتورة بيع | v43 DOM #sec-invoice-create | onclick=setInvoiceOpType('sale') | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /invoices/new | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-invoice-create; div.toggle-btn.active | High: element presence; Not Verified: action and app parity |
| ELM-0194 | SCR-007 | div.toggle-btn | div | مرتجع | v43 DOM #sec-invoice-create | onclick=setInvoiceOpType('return') | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /invoices/new | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-invoice-create; div.toggle-btn | High: element presence; Not Verified: action and app parity |
| ELM-0195 | SCR-007 | div.toggle-btn | div | نعم — تحصيل فوري | v43 DOM #sec-invoice-create | onclick=setInvoiceCollect('yes') | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /invoices/new | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-invoice-create; div.toggle-btn | High: element presence; Not Verified: action and app parity |
| ELM-0196 | SCR-007 | div.toggle-btn.active | div | لا — آجل | v43 DOM #sec-invoice-create | onclick=setInvoiceCollect('no') | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /invoices/new | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-invoice-create; div.toggle-btn.active | High: element presence; Not Verified: action and app parity |
| ELM-0197 | SCR-007 | input#inv-created-by | input/hidden |  | v43 DOM #sec-invoice-create | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /invoices/new | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-invoice-create; input#inv-created-by | High: element presence; Not Verified: action and app parity |
| ELM-0198 | SCR-007 | div.toggle-btn.active | div | كراس | v43 DOM #sec-invoice-create | onclick=setIssuer('كراس') | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /invoices/new | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-invoice-create; div.toggle-btn.active | High: element presence; Not Verified: action and app parity |
| ELM-0199 | SCR-007 | div.toggle-btn | div | أبنوب | v43 DOM #sec-invoice-create | onclick=setIssuer('أبنوب') | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /invoices/new | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-invoice-create; div.toggle-btn | High: element presence; Not Verified: action and app parity |
| ELM-0200 | SCR-007 | div.toggle-btn | div | السائق | v43 DOM #sec-invoice-create | onclick=setIssuer('السائق') | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /invoices/new | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-invoice-create; div.toggle-btn | High: element presence; Not Verified: action and app parity |
| ELM-0201 | SCR-007 | select#inv-customer.select | select | — اختر العميل — | v43 DOM #sec-invoice-create | onchange=onInvoiceCustomerChange(this.value) | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /invoices/new | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-invoice-create; select#inv-customer.select | High: element presence; Not Verified: action and app parity |
| ELM-0202 | SCR-007 | button#inv-newcust-btn.btn.btn-secondary | button/button | ＋ عميل جديد (بيانات كاملة: بريد، ميلاد، عنوان...) | v43 DOM #sec-invoice-create | onclick=openNewCustomer(function(id){refreshCustomerSelects();quickPickCustomer(id,CUSTOMER_LOOKUP[id].name)}) | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /invoices/new | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-invoice-create; button#inv-newcust-btn.btn.btn-secondary | High: element presence; Not Verified: action and app parity |
| ELM-0203 | SCR-007 | button.btn.btn-ghost | button/button | + عميل جديد | v43 DOM #sec-invoice-create | onclick=var b=byId('inv-newcust');b.style.display=b.style.display==='none'?'':'none';if(b.style.display===''){byId('qc-gov').innerHTML='<option value="">— المحافظة —</option>'+__T.GOVS.filter(function(x){return __T.GOVOFF.indexOf(x)<0}).map(function(x){return'<option>'+esc(x)+'</option>'}).join('')} | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /invoices/new | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-invoice-create; button.btn.btn-ghost | High: element presence; Not Verified: action and app parity |
| ELM-0204 | SCR-007 | button.chip | button/button | ＋ إضافة عميل | v43 DOM #sec-invoice-create | onclick=openNewCustomer(id=>{refreshCustomerSelects();quickPickCustomer(id,CUSTOMER_LOOKUP[id].name)}) | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /invoices/new | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-invoice-create; button.chip | High: element presence; Not Verified: action and app parity |
| ELM-0205 | SCR-007 | input#inv-cust-phone.input | input | اكتب الرقم لاختيار العميل | v43 DOM #sec-invoice-create | oninput=phoneToCust(this.value) | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /invoices/new | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-invoice-create; input#inv-cust-phone.input | High: element presence; Not Verified: action and app parity |
| ELM-0206 | SCR-007 | input#qc-phone.input | input/tel | رقم التليفون (مطلوب) | v43 DOM #sec-invoice-create | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /invoices/new | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-invoice-create; input#qc-phone.input | High: element presence; Not Verified: action and app parity |
| ELM-0207 | SCR-007 | input#qc-name.input | input | اسم العميل | v43 DOM #sec-invoice-create | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /invoices/new | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-invoice-create; input#qc-name.input | High: element presence; Not Verified: action and app parity |
| ELM-0208 | SCR-007 | select#qc-gov.select | select |  | v43 DOM #sec-invoice-create | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /invoices/new | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-invoice-create; select#qc-gov.select | High: element presence; Not Verified: action and app parity |
| ELM-0209 | SCR-007 | button.btn.btn-primary | button | حفظ العميل | v43 DOM #sec-invoice-create | onclick=quickAddCust() | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /invoices/new | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-invoice-create; button.btn.btn-primary | High: element presence; Not Verified: action and app parity |
| ELM-0210 | SCR-007 | input#inv-cust-phone.input | input |  | v43 DOM #sec-invoice-create | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /invoices/new | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-invoice-create; input#inv-cust-phone.input | High: element presence; Not Verified: action and app parity |
| ELM-0211 | SCR-007 | input#inv-cust-email.input | input |  | v43 DOM #sec-invoice-create | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /invoices/new | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-invoice-create; input#inv-cust-email.input | High: element presence; Not Verified: action and app parity |
| ELM-0212 | SCR-007 | input#inv-cust-bd.input | input |  | v43 DOM #sec-invoice-create | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /invoices/new | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-invoice-create; input#inv-cust-bd.input | High: element presence; Not Verified: action and app parity |
| ELM-0213 | SCR-007 | input#inv-cust-balance.input | input |  | v43 DOM #sec-invoice-create | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /invoices/new | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-invoice-create; input#inv-cust-balance.input | High: element presence; Not Verified: action and app parity |
| ELM-0214 | SCR-007 | input#inv-cust-credit.input | input |  | v43 DOM #sec-invoice-create | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /invoices/new | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-invoice-create; input#inv-cust-credit.input | High: element presence; Not Verified: action and app parity |
| ELM-0215 | SCR-007 | input#inv-date.input | input |  | v43 DOM #sec-invoice-create | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /invoices/new | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-invoice-create; input#inv-date.input | High: element presence; Not Verified: action and app parity |
| ELM-0216 | SCR-007 | input#inv-time.input | input |  | v43 DOM #sec-invoice-create | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /invoices/new | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-invoice-create; input#inv-time.input | High: element presence; Not Verified: action and app parity |
| ELM-0217 | SCR-007 | input#inv-number.input | input |  | v43 DOM #sec-invoice-create | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /invoices/new | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-invoice-create; input#inv-number.input | High: element presence; Not Verified: action and app parity |
| ELM-0218 | SCR-007 | select#inv-payment-terms.select | select | فوريآجل | v43 DOM #sec-invoice-create | onchange=onInvoicePaymentTermsChange(this.value) | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /invoices/new | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-invoice-create; select#inv-payment-terms.select | High: element presence; Not Verified: action and app parity |
| ELM-0219 | SCR-007 | input#inv-due.input | input/date |  | v43 DOM #sec-invoice-create | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /invoices/new | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-invoice-create; input#inv-due.input | High: element presence; Not Verified: action and app parity |
| ELM-0220 | SCR-007 | div.collapse-toggle | div | ▸ خيارات التوصيل والتركيب | v43 DOM #sec-invoice-create | onclick=toggleInvoiceAdvanced() | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /invoices/new | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-invoice-create; div.collapse-toggle | High: element presence; Not Verified: action and app parity |
| ELM-0221 | SCR-007 | input#inv-driver.input | input | اختياري | v43 DOM #sec-invoice-create | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /invoices/new | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-invoice-create; input#inv-driver.input | High: element presence; Not Verified: action and app parity |
| ELM-0222 | SCR-007 | input#inv-install.input | input | اختياري | v43 DOM #sec-invoice-create | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /invoices/new | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-invoice-create; input#inv-install.input | High: element presence; Not Verified: action and app parity |
| ELM-0223 | SCR-007 | select#inv-company.select | select | مؤسسة الإتقانشركة ماستر لاستيراد المواتير | v43 DOM #sec-invoice-create | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /invoices/new | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-invoice-create; select#inv-company.select | High: element presence; Not Verified: action and app parity |
| ELM-0224 | SCR-007 | select#inv-warehouse.select | select | المستودع الرئيسي - الرياضمستودع جدةمستودع الدمامالمخزن الفرعيالسيارة | v43 DOM #sec-invoice-create | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /invoices/new | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-invoice-create; select#inv-warehouse.select | High: element presence; Not Verified: action and app parity |
| ELM-0225 | SCR-007 | button.btn.btn-ghost | button | 📋 نسخ من فاتورة سابقة لنفس العميل | v43 DOM #sec-invoice-create | onclick=copyFromPreviousInvoice() | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /invoices/new | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-invoice-create; button.btn.btn-ghost | High: element presence; Not Verified: action and app parity |
| ELM-0226 | SCR-007 | button.btn.btn-primary | button | + إضافة صنف | v43 DOM #sec-invoice-create | onclick=addInvoiceRow() | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /invoices/new | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-invoice-create; button.btn.btn-primary | High: element presence; Not Verified: action and app parity |
| ELM-0227 | SCR-007 | input.input.it-product | input | اكتب اسم الصنف أو الكود أو امسح الباركود | v43 DOM #sec-invoice-create | onchange=onItemProductChange(this) | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /invoices/new | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-invoice-create; input.input.it-product | High: element presence; Not Verified: action and app parity |
| ELM-0228 | SCR-007 | select.select.it-loc | select | المصدر: حسب الفاتورةالمستودع الرئيسي - الرياضمستودع جدةمستودع الدمامالمخزن الفرعيالسيارة | v43 DOM #sec-invoice-create | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /invoices/new | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-invoice-create; select.select.it-loc | High: element presence; Not Verified: action and app parity |
| ELM-0229 | SCR-007 | input.input.it-qty | input/number |  | v43 DOM #sec-invoice-create | oninput=recalcInvoice() | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /invoices/new | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-invoice-create; input.input.it-qty | High: element presence; Not Verified: action and app parity |
| ELM-0230 | SCR-007 | input.input.it-price | input/number | سعر الشركة — تلقائي ولا يُعدَّل | v43 DOM #sec-invoice-create | oninput=recalcInvoice() | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /invoices/new | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-invoice-create; input.input.it-price | High: element presence; Not Verified: action and app parity |
| ELM-0231 | SCR-007 | button.tbl-btn | button | 🗑 | v43 DOM #sec-invoice-create | onclick=this.closest('tr').remove();recalcInvoice() | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /invoices/new | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-invoice-create; button.tbl-btn | High: element presence; Not Verified: action and app parity |
| ELM-0232 | SCR-007 | input#inv-extra | input/hidden |  | v43 DOM #sec-invoice-create | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /invoices/new | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-invoice-create; input#inv-extra | High: element presence; Not Verified: action and app parity |
| ELM-0233 | SCR-007 | input#inv-discount | input/hidden |  | v43 DOM #sec-invoice-create | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /invoices/new | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-invoice-create; input#inv-discount | High: element presence; Not Verified: action and app parity |
| ELM-0234 | SCR-007 | select#inv-disc-type | select | amt | v43 DOM #sec-invoice-create | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /invoices/new | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-invoice-create; select#inv-disc-type | High: element presence; Not Verified: action and app parity |
| ELM-0235 | SCR-007 | input#inv-pay-now.input | input/number |  | v43 DOM #sec-invoice-create | oninput=syncInvPayment() | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /invoices/new | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-invoice-create; input#inv-pay-now.input | High: element presence; Not Verified: action and app parity |
| ELM-0236 | SCR-007 | input#inv-collect-amount.input | input |  | v43 DOM #sec-invoice-create | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /invoices/new | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-invoice-create; input#inv-collect-amount.input | High: element presence; Not Verified: action and app parity |
| ELM-0237 | SCR-007 | select#inv-collect-method.select | select | كاش (الخزينة الرئيسية)تحويل بنكي / شيك | v43 DOM #sec-invoice-create | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /invoices/new | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-invoice-create; select#inv-collect-method.select | High: element presence; Not Verified: action and app parity |
| ELM-0238 | SCR-007 | select#inv-pay-acct.select | select | النقدية في الدرجفودافون كاش — كراسفودافون كاش — أبنوبأورنج كاشإنستا بايماستر بايحساب البوسطةالبنك الأهلي | v43 DOM #sec-invoice-create | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /invoices/new | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-invoice-create; select#inv-pay-acct.select | High: element presence; Not Verified: action and app parity |
| ELM-0239 | SCR-007 | button#ps-add.btn.btn-ghost | button/button | + تقسيم الدفع على وسيلة أخرى | v43 DOM #sec-invoice-create | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /invoices/new | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-invoice-create; button#ps-add.btn.btn-ghost | High: element presence; Not Verified: action and app parity |
| ELM-0240 | SCR-007 | button#inv-collect-btn.btn.btn-secondary | button | حفظ الفاتورة وتسجيل التحصيل | v43 DOM #sec-invoice-create | onclick=confirmNewInvoice() | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /invoices/new | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-invoice-create; button#inv-collect-btn.btn.btn-secondary | High: element presence; Not Verified: action and app parity |
| ELM-0241 | SCR-007 | textarea#inv-notes.textarea | textarea | اكتب أي ملاحظة تظهر أسفل الأصناف في الفاتورة | v43 DOM #sec-invoice-create | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /invoices/new | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-invoice-create; textarea#inv-notes.textarea | High: element presence; Not Verified: action and app parity |
| ELM-0242 | SCR-007 | input#inv-is-ret | input/checkbox | فاتورة مرتجع | v43 DOM #sec-invoice-create | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /invoices/new | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-invoice-create; input#inv-is-ret | High: element presence; Not Verified: action and app parity |
| ELM-0243 | SCR-007 | select#inv-ret-ref.select | select | — اختر الفاتورة — | v43 DOM #sec-invoice-create | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /invoices/new | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-invoice-create; select#inv-ret-ref.select | High: element presence; Not Verified: action and app parity |
| ELM-0244 | SCR-007 | select#inv-ret-reason.select | select | تالفخطأ في الصنفغير مطابق للطلب | v43 DOM #sec-invoice-create | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /invoices/new | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-invoice-create; select#inv-ret-reason.select | High: element presence; Not Verified: action and app parity |
| ELM-0245 | SCR-007 | select#rp-mode.select | select | لا يوجد إصلاحإصلاح على الشركةإصلاح على العميل | v43 DOM #sec-invoice-create | onchange=rpToggle() | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /invoices/new | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-invoice-create; select#rp-mode.select | High: element presence; Not Verified: action and app parity |
| ELM-0246 | SCR-007 | input#rp-reason.input | input | سبب الإصلاح | v43 DOM #sec-invoice-create | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /invoices/new | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-invoice-create; input#rp-reason.input | High: element presence; Not Verified: action and app parity |
| ELM-0247 | SCR-007 | input#rp-cost.input | input/number | تكلفة الإصلاح | v43 DOM #sec-invoice-create | oninput=rpToggle() | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /invoices/new | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-invoice-create; input#rp-cost.input | High: element presence; Not Verified: action and app parity |
| ELM-0248 | SCR-007 | input#rp-paid.input | input/number | المبلغ المدفوع | v43 DOM #sec-invoice-create | oninput=rpToggle() | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /invoices/new | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-invoice-create; input#rp-paid.input | High: element presence; Not Verified: action and app parity |
| ELM-0249 | SCR-007 | input#x-rq.input | input | رقم الفاتورة (مثال INV-2026-005) | v43 DOM #sec-invoice-create | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /invoices/new | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-invoice-create; input#x-rq.input | High: element presence; Not Verified: action and app parity |
| ELM-0250 | SCR-007 | button.btn.btn-primary | button | بحث | v43 DOM #sec-invoice-create | onclick=xRetFind() | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /invoices/new | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-invoice-create; button.btn.btn-primary | High: element presence; Not Verified: action and app parity |
| ELM-0251 | SCR-007 | button.btn.btn-ghost | button | كل المرتجعات | v43 DOM #sec-invoice-create | onclick=showSection('returns') | returns | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /invoices/new | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-invoice-create; button.btn.btn-ghost | High: element presence; Not Verified: action and app parity |
| ELM-0252 | SCR-008 | button#ip-back.btn.btn-ghost | button | ← رجوع | v43 DOM #sec-invoice-print | onclick=showSection('invoices') | invoices | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /invoices/:documentId/print | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-invoice-print; button#ip-back.btn.btn-ghost | High: element presence; Not Verified: action and app parity |
| ELM-0253 | SCR-008 | button.btn.btn-ghost | button | 📱 واتساب | v43 DOM #sec-invoice-print | onclick=showToast('success','جاري إرسال الفاتورة عبر واتساب') | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /invoices/:documentId/print | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-invoice-print; button.btn.btn-ghost | High: element presence; Not Verified: action and app parity |
| ELM-0254 | SCR-008 | button.btn.btn-ghost | button | تحميل PDF | v43 DOM #sec-invoice-print | onclick=window.print() | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /invoices/:documentId/print | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-invoice-print; button.btn.btn-ghost | High: element presence; Not Verified: action and app parity |
| ELM-0255 | SCR-008 | button.btn.btn-primary | button | طباعة | v43 DOM #sec-invoice-print | onclick=window.print() | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /invoices/:documentId/print | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-invoice-print; button.btn.btn-primary | High: element presence; Not Verified: action and app parity |
| ELM-0256 | SCR-008 | button.btn.btn-secondary | button | فاتورة الشركة | v43 DOM #sec-invoice-print | onclick=finCoInv(curNoG()) | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /invoices/:documentId/print | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-invoice-print; button.btn.btn-secondary | High: element presence; Not Verified: action and app parity |
| ELM-0257 | SCR-008 | button.btn.btn-secondary | button | تعديل كامل | v43 DOM #sec-invoice-print | onclick=finEdit(curNoG()) | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /invoices/:documentId/print | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-invoice-print; button.btn.btn-secondary | High: element presence; Not Verified: action and app parity |
| ELM-0258 | SCR-008 | button.btn.btn-secondary | button | مرتجع | v43 DOM #sec-invoice-print | onclick=finRetFrom(curNoG()) | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /invoices/:documentId/print | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-invoice-print; button.btn.btn-secondary | High: element presence; Not Verified: action and app parity |
| ELM-0259 | SCR-009 | button.btn.btn-primary | button | + تسجيل دفعة | v43 DOM #sec-collections | onclick=openModal('modal-payment') | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /collections | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-collections; button.btn.btn-primary | High: element presence; Not Verified: action and app parity |
| ELM-0260 | SCR-010 | button.btn.btn-ghost | button | 📷 مسح رمز QR للتسليم | v43 DOM #sec-deliveries | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /deliveries | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-deliveries; button.btn.btn-ghost | High: element presence; Not Verified: action and app parity |
| ELM-0261 | SCR-010 | button.btn.btn-primary | button | + إذن صرف وتوصيل جديد | v43 DOM #sec-deliveries | onclick=showSection('delivery-create') | delivery-create | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /deliveries | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-deliveries; button.btn.btn-primary | High: element presence; Not Verified: action and app parity |
| ELM-0262 | SCR-010 | div.filter-chip.active | div | الكل | v43 DOM #sec-deliveries | onclick=filterRows('deliveries-tbody', null, this) | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /deliveries | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-deliveries; div.filter-chip.active | High: element presence; Not Verified: action and app parity |
| ELM-0263 | SCR-010 | div.filter-chip | div | قيد الانتظار | v43 DOM #sec-deliveries | onclick=filterRows('deliveries-tbody', 'قيد الانتظار', this) | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /deliveries | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-deliveries; div.filter-chip | High: element presence; Not Verified: action and app parity |
| ELM-0264 | SCR-010 | div.filter-chip | div | جاري التجهيز | v43 DOM #sec-deliveries | onclick=filterRows('deliveries-tbody', 'جاري التجهيز', this) | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /deliveries | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-deliveries; div.filter-chip | High: element presence; Not Verified: action and app parity |
| ELM-0265 | SCR-010 | div.filter-chip | div | تم التسليم | v43 DOM #sec-deliveries | onclick=filterRows('deliveries-tbody', 'تم التسليم', this) | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /deliveries | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-deliveries; div.filter-chip | High: element presence; Not Verified: action and app parity |
| ELM-0266 | SCR-010 | div.filter-chip | div | ملغى | v43 DOM #sec-deliveries | onclick=filterRows('deliveries-tbody', 'ملغى', this) | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /deliveries | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-deliveries; div.filter-chip | High: element presence; Not Verified: action and app parity |
| ELM-0267 | SCR-010 | button.btn.btn-primary | button | ＋ إضافة بيانات تجريبية | v43 DOM #sec-deliveries | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /deliveries | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-deliveries; button.btn.btn-primary | High: element presence; Not Verified: action and app parity |
| ELM-0268 | SCR-011 | button.btn.btn-ghost | button | إلغاء | v43 DOM #sec-delivery-create | onclick=showSection('deliveries') | deliveries | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /deliveries/new | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-delivery-create; button.btn.btn-ghost | High: element presence; Not Verified: action and app parity |
| ELM-0269 | SCR-011 | button.btn.btn-primary | button | حفظ وطباعة الإذن | v43 DOM #sec-delivery-create | onclick=showToast('success','تم إنشاء إذن التسليم بنجاح','رقم الإذن: DLV-2024-433');showSection('deliveries') | deliveries | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /deliveries/new | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-delivery-create; button.btn.btn-primary | High: element presence; Not Verified: action and app parity |
| ELM-0270 | SCR-011 | select.select | select | إذن صرف وتوصيلإذن صرف فقط (استلام من المستودع)إذن توصيل فقط (بدون صرف مخزون) | v43 DOM #sec-delivery-create | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /deliveries/new | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-delivery-create; select.select | High: element presence; Not Verified: action and app parity |
| ELM-0271 | SCR-011 | select.select | select | ORD-2024-812 — شركة رواف الخليجORD-2024-811 — مؤسسة البناء الحديث | v43 DOM #sec-delivery-create | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /deliveries/new | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-delivery-create; select.select | High: element presence; Not Verified: action and app parity |
| ELM-0272 | SCR-011 | input.input | input |  | v43 DOM #sec-delivery-create | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /deliveries/new | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-delivery-create; input.input | High: element presence; Not Verified: action and app parity |
| ELM-0273 | SCR-011 | select.select | select | المستودع الرئيسي - الرياضمستودع فرع جدةمستودع المنطقة الشرقية | v43 DOM #sec-delivery-create | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /deliveries/new | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-delivery-create; select.select | High: element presence; Not Verified: action and app parity |
| ELM-0274 | SCR-011 | input.input | input/date |  | v43 DOM #sec-delivery-create | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /deliveries/new | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-delivery-create; input.input | High: element presence; Not Verified: action and app parity |
| ELM-0275 | SCR-011 | select.select | select | شاحنة الشركةشركة شحن خارجيةاستلام مباشر من العميل | v43 DOM #sec-delivery-create | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /deliveries/new | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-delivery-create; select.select | High: element presence; Not Verified: action and app parity |
| ELM-0276 | SCR-011 | input.input | input | اسم السائق | v43 DOM #sec-delivery-create | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /deliveries/new | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-delivery-create; input.input | High: element presence; Not Verified: action and app parity |
| ELM-0277 | SCR-011 | input.input | input | مثال: أ ب ج 1234 | v43 DOM #sec-delivery-create | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /deliveries/new | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-delivery-create; input.input | High: element presence; Not Verified: action and app parity |
| ELM-0278 | SCR-011 | textarea.textarea | textarea | أي تعليمات خاصة بموقع التسليم أو الاستلام... | v43 DOM #sec-delivery-create | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /deliveries/new | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-delivery-create; textarea.textarea | High: element presence; Not Verified: action and app parity |
| ELM-0279 | SCR-011 | button.btn.btn-ghost | button | إلغاء | v43 DOM #sec-delivery-create | onclick=showSection('deliveries') | deliveries | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /deliveries/new | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-delivery-create; button.btn.btn-ghost | High: element presence; Not Verified: action and app parity |
| ELM-0280 | SCR-011 | button.btn.btn-primary | button | تأكيد وإنشاء الإذن | v43 DOM #sec-delivery-create | onclick=showToast('success','تم إنشاء إذن التسليم بنجاح','رقم الإذن: DLV-2024-433');showSection('deliveries') | deliveries | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /deliveries/new | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-delivery-create; button.btn.btn-primary | High: element presence; Not Verified: action and app parity |
| ELM-0281 | SCR-012 | button.btn.btn-primary | button | + مرتجع جديد | v43 DOM #sec-returns | onclick=newReturn() | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /returns | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-returns; button.btn.btn-primary | High: element presence; Not Verified: action and app parity |
| ELM-0282 | SCR-013 | button.btn.btn-ghost | button | إلغاء | v43 DOM #sec-return-create | onclick=showSection('returns') | returns | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /returns/new (InvoiceFormPage return mode) | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-return-create; button.btn.btn-ghost | High: element presence; Not Verified: action and app parity |
| ELM-0283 | SCR-013 | button.btn.btn-primary | button | تأكيد المرتجع | v43 DOM #sec-return-create | onclick=showToast('success','تم إنشاء المرتجع بنجاح','رقم المرتجع: RET-2024-009');showSection('returns') | returns | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /returns/new (InvoiceFormPage return mode) | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-return-create; button.btn.btn-primary | High: element presence; Not Verified: action and app parity |
| ELM-0284 | SCR-013 | select.select | select | #INV-2024-087 — محمد أحمد#INV-2024-089 — شركة الأمل | v43 DOM #sec-return-create | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /returns/new (InvoiceFormPage return mode) | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-return-create; select.select | High: element presence; Not Verified: action and app parity |
| ELM-0285 | SCR-013 | input.input | input |  | v43 DOM #sec-return-create | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /returns/new (InvoiceFormPage return mode) | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-return-create; input.input | High: element presence; Not Verified: action and app parity |
| ELM-0286 | SCR-013 | input.input | input/date |  | v43 DOM #sec-return-create | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /returns/new (InvoiceFormPage return mode) | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-return-create; input.input | High: element presence; Not Verified: action and app parity |
| ELM-0287 | SCR-013 | select.select | select | منتج تالفخطأ في الشحنةعدم مطابقة المواصفاترغبة العميلأخرى | v43 DOM #sec-return-create | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /returns/new (InvoiceFormPage return mode) | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-return-create; select.select | High: element presence; Not Verified: action and app parity |
| ELM-0288 | SCR-013 | select.select | select | استرداد نقدي للعميلإضافة كرصيد دائن للعميلاستبدال بمنتج آخر | v43 DOM #sec-return-create | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /returns/new (InvoiceFormPage return mode) | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-return-create; select.select | High: element presence; Not Verified: action and app parity |
| ELM-0289 | SCR-013 | select.select | select | المستودع الرئيسي - الرياضمستودع جدة | v43 DOM #sec-return-create | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /returns/new (InvoiceFormPage return mode) | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-return-create; select.select | High: element presence; Not Verified: action and app parity |
| ELM-0290 | SCR-013 | button.btn.btn-ghost | button | + إضافة صنف | v43 DOM #sec-return-create | onclick=addReturnRow() | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /returns/new (InvoiceFormPage return mode) | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-return-create; button.btn.btn-ghost | High: element presence; Not Verified: action and app parity |
| ELM-0291 | SCR-013 | textarea.textarea | textarea | تفاصيل إضافية حول حالة المنتج المرتجع... | v43 DOM #sec-return-create | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /returns/new (InvoiceFormPage return mode) | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-return-create; textarea.textarea | High: element presence; Not Verified: action and app parity |
| ELM-0292 | SCR-014 | button.btn.btn-ghost | button | تصدير | v43 DOM #sec-products | onclick=exportTableCSV(this) | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /products | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-products; button.btn.btn-ghost | High: element presence; Not Verified: action and app parity |
| ELM-0293 | SCR-014 | button.btn.btn-primary | button | + إضافة منتج | v43 DOM #sec-products | onclick=openModal('modal-add-product') | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /products | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-products; button.btn.btn-primary | High: element presence; Not Verified: action and app parity |
| ELM-0294 | SCR-014 | span.td-link | span | عرضها ← | v43 DOM #sec-products | onclick=showSection('inventory-summary') | inventory-summary | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /products | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-products; span.td-link | High: element presence; Not Verified: action and app parity |
| ELM-0295 | SCR-014 | input.input | input | بحث: اسم المنتج أو الكود | v43 DOM #sec-products | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /products | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-products; input.input | High: element presence; Not Verified: action and app parity |
| ELM-0296 | SCR-015 | button.btn.btn-ghost | button | تصدير | v43 DOM #sec-inventory-summary | onclick=exportTableCSV(this) | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /inventory | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-inventory-summary; button.btn.btn-ghost | High: element presence; Not Verified: action and app parity |
| ELM-0297 | SCR-015 | button.btn.btn-primary | button | + تسوية مخزون | v43 DOM #sec-inventory-summary | onclick=openModal('modal-confirm') | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /inventory | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-inventory-summary; button.btn.btn-primary | High: element presence; Not Verified: action and app parity |
| ELM-0298 | SCR-016 | button.btn.btn-ghost | button | تصدير | v43 DOM #sec-movements | onclick=exportTableCSV(this) | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /inventory/movements | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-movements; button.btn.btn-ghost | High: element presence; Not Verified: action and app parity |
| ELM-0299 | SCR-017 | button.chip.fin-chip | button | المصروفات | v43 DOM #sec-finance | onclick=finGo('expenses') | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /finance | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-finance; button.chip.fin-chip | High: element presence; Not Verified: action and app parity |
| ELM-0300 | SCR-017 | button.chip.fin-chip | button | الخزائن | v43 DOM #sec-finance | onclick=finGo('cashiers') | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /finance | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-finance; button.chip.fin-chip | High: element presence; Not Verified: action and app parity |
| ELM-0301 | SCR-017 | button.chip.fin-chip | button | التحويلات | v43 DOM #sec-finance | onclick=finGo('transfers') | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /finance | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-finance; button.chip.fin-chip | High: element presence; Not Verified: action and app parity |
| ELM-0302 | SCR-017 | button.chip.fin-chip | button | التعديلات المالية | v43 DOM #sec-finance | onclick=finGo('financial-adjustments') | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /finance | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-finance; button.chip.fin-chip | High: element presence; Not Verified: action and app parity |
| ELM-0303 | SCR-017 | button.chip.fin-chip | button | العملات | v43 DOM #sec-finance | onclick=finGo('currencies') | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /finance | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-finance; button.chip.fin-chip | High: element presence; Not Verified: action and app parity |
| ELM-0304 | SCR-017 | button.chip.fin-chip | button | دليل الحسابات | v43 DOM #sec-finance | onclick=finGo('coa') | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /finance | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-finance; button.chip.fin-chip | High: element presence; Not Verified: action and app parity |
| ELM-0305 | SCR-017 | button.btn.btn-ghost | button | تصدير | v43 DOM #sec-finance | onclick=exportTableCSV(this) | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /finance | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-finance; button.btn.btn-ghost | High: element presence; Not Verified: action and app parity |
| ELM-0306 | SCR-017 | input | input | بحث بالعميل... | v43 DOM #sec-finance | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /finance | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-finance; input | High: element presence; Not Verified: action and app parity |
| ELM-0307 | SCR-017 | select.select | select | ديسمبر 2024نوفمبر 2024 | v43 DOM #sec-finance | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /finance | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-finance; select.select | High: element presence; Not Verified: action and app parity |
| ELM-0308 | SCR-017 | button.btn.btn-primary | button | ＋ إضافة بيانات تجريبية | v43 DOM #sec-finance | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /finance | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-finance; button.btn.btn-primary | High: element presence; Not Verified: action and app parity |
| ELM-0309 | SCR-017 | button.btn.btn-primary | button | + تسجيل مصروف | v43 DOM #sec-finance | onclick=openModal('modal-expense') | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /finance | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-finance; button.btn.btn-primary | High: element presence; Not Verified: action and app parity |
| ELM-0310 | SCR-017 | button.btn.btn-primary | button | ＋ إضافة بيانات تجريبية | v43 DOM #sec-finance | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /finance | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-finance; button.btn.btn-primary | High: element presence; Not Verified: action and app parity |
| ELM-0311 | SCR-017 | button.btn.btn-primary | button | + تسجيل معاملة | v43 DOM #sec-finance | onclick=openModal('modal-payment') | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /finance | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-finance; button.btn.btn-primary | High: element presence; Not Verified: action and app parity |
| ELM-0312 | SCR-017 | button.btn.btn-primary | button | ＋ إضافة بيانات تجريبية | v43 DOM #sec-finance | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /finance | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-finance; button.btn.btn-primary | High: element presence; Not Verified: action and app parity |
| ELM-0313 | SCR-017 | button.btn.btn-primary | button | + تحويل جديد | v43 DOM #sec-finance | onclick=document.getElementById('transfer-form').scrollIntoView({behavior:'smooth'}) | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /finance | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-finance; button.btn.btn-primary | High: element presence; Not Verified: action and app parity |
| ELM-0314 | SCR-017 | select.select | select | الخزينة الرئيسية (ج.م 45,800)البنك الأهليبنك الراجحي | v43 DOM #sec-finance | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /finance | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-finance; select.select | High: element presence; Not Verified: action and app parity |
| ELM-0315 | SCR-017 | select.select | select | البنك الأهلي (ج.م 38,600)الخزينة الرئيسيةبنك الراجحي | v43 DOM #sec-finance | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /finance | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-finance; select.select | High: element presence; Not Verified: action and app parity |
| ELM-0316 | SCR-017 | input.input | input/number | 0.00 | v43 DOM #sec-finance | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /finance | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-finance; input.input | High: element presence; Not Verified: action and app parity |
| ELM-0317 | SCR-017 | input.input | input/date |  | v43 DOM #sec-finance | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /finance | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-finance; input.input | High: element presence; Not Verified: action and app parity |
| ELM-0318 | SCR-017 | input.input | input | وصف التحويل... | v43 DOM #sec-finance | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /finance | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-finance; input.input | High: element presence; Not Verified: action and app parity |
| ELM-0319 | SCR-017 | button.btn.btn-ghost | button | إلغاء | v43 DOM #sec-finance | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /finance | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-finance; button.btn.btn-ghost | High: element presence; Not Verified: action and app parity |
| ELM-0320 | SCR-017 | button.btn.btn-primary | button | تأكيد التحويل | v43 DOM #sec-finance | onclick=openModal('modal-confirm') | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /finance | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-finance; button.btn.btn-primary | High: element presence; Not Verified: action and app parity |
| ELM-0321 | SCR-017 | button.btn.btn-primary | button | ＋ إضافة بيانات تجريبية | v43 DOM #sec-finance | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /finance | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-finance; button.btn.btn-primary | High: element presence; Not Verified: action and app parity |
| ELM-0322 | SCR-017 | button.btn.btn-primary | button | + تعديل مالي جديد | v43 DOM #sec-finance | onclick=document.getElementById('fa-form').scrollIntoView({behavior:'smooth'}) | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /finance | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-finance; button.btn.btn-primary | High: element presence; Not Verified: action and app parity |
| ELM-0323 | SCR-017 | button.btn.btn-primary | button | ＋ إضافة بيانات تجريبية | v43 DOM #sec-finance | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /finance | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-finance; button.btn.btn-primary | High: element presence; Not Verified: action and app parity |
| ELM-0324 | SCR-017 | select#fa-type.select | select | إضافة مبلغ خصم مبلغ مصروف إيراد تسوية مالية تصحيح قيد مالي | v43 DOM #sec-finance | onchange=faUpdateDirectionHint() | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /finance | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-finance; select#fa-type.select | High: element presence; Not Verified: action and app parity |
| ELM-0325 | SCR-017 | input#fa-amount.input | input/number | 0.00 | v43 DOM #sec-finance | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /finance | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-finance; input#fa-amount.input | High: element presence; Not Verified: action and app parity |
| ELM-0326 | SCR-017 | input#fa-date.input | input/date |  | v43 DOM #sec-finance | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /finance | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-finance; input#fa-date.input | High: element presence; Not Verified: action and app parity |
| ELM-0327 | SCR-017 | select#fa-account.select | select | الخزينة الرئيسية البنك الأهلي بنك الراجحي | v43 DOM #sec-finance | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /finance | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-finance; select#fa-account.select | High: element presence; Not Verified: action and app parity |
| ELM-0328 | SCR-017 | input#fa-reason.input | input | سبب التعديل المالي... | v43 DOM #sec-finance | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /finance | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-finance; input#fa-reason.input | High: element presence; Not Verified: action and app parity |
| ELM-0329 | SCR-017 | input#fa-ref.input | input | مثال: عقد، فاتورة، إذن... | v43 DOM #sec-finance | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /finance | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-finance; input#fa-ref.input | High: element presence; Not Verified: action and app parity |
| ELM-0330 | SCR-017 | textarea#fa-notes.textarea | textarea | تفاصيل إضافية... | v43 DOM #sec-finance | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /finance | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-finance; textarea#fa-notes.textarea | High: element presence; Not Verified: action and app parity |
| ELM-0331 | SCR-017 | button.btn.btn-ghost | button | إلغاء | v43 DOM #sec-finance | onclick=document.getElementById('fa-amount').value='';document.getElementById('fa-reason').value='';document.getElementById('fa-notes').value='';document.getElementById('fa-ref').value='' | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /finance | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-finance; button.btn.btn-ghost | High: element presence; Not Verified: action and app parity |
| ELM-0332 | SCR-017 | button.btn.btn-primary | button | حفظ التعديل | v43 DOM #sec-finance | onclick=saveFinancialAdjustment() | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /finance | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-finance; button.btn.btn-primary | High: element presence; Not Verified: action and app parity |
| ELM-0333 | SCR-017 | button.btn.btn-primary | button | + إضافة عملة | v43 DOM #sec-finance | onclick=showToast('success','تم إضافة العملة بنجاح') | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /finance | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-finance; button.btn.btn-primary | High: element presence; Not Verified: action and app parity |
| ELM-0334 | SCR-017 | button.btn.btn-primary | button | ＋ إضافة بيانات تجريبية | v43 DOM #sec-finance | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /finance | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-finance; button.btn.btn-primary | High: element presence; Not Verified: action and app parity |
| ELM-0335 | SCR-017 | button.btn.btn-primary | button | حفظ أسعار الصرف | v43 DOM #sec-finance | onclick=showToast('success','تم تحديث أسعار الصرف') | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /finance | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-finance; button.btn.btn-primary | High: element presence; Not Verified: action and app parity |
| ELM-0336 | SCR-017 | button.btn.btn-ghost | button | + حساب رئيسي | v43 DOM #sec-finance | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /finance | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-finance; button.btn.btn-ghost | High: element presence; Not Verified: action and app parity |
| ELM-0337 | SCR-017 | div.coa-item | div | ▼الأصول1000ج.م 1,450,000 | v43 DOM #sec-finance | onclick=toggleCOA(this) | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /finance | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-finance; div.coa-item | High: element presence; Not Verified: action and app parity |
| ELM-0338 | SCR-017 | div.coa-item | div | ▼الأصول المتداولة1100ج.م 980,000 | v43 DOM #sec-finance | onclick=toggleCOA(this) | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /finance | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-finance; div.coa-item | High: element presence; Not Verified: action and app parity |
| ELM-0339 | SCR-017 | div.coa-item | div | ▼الخصوم2000ج.م 580,000 | v43 DOM #sec-finance | onclick=toggleCOA(this) | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /finance | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-finance; div.coa-item | High: element presence; Not Verified: action and app parity |
| ELM-0340 | SCR-017 | div.coa-item | div | ►حقوق الملكية3000ج.م 870,000 | v43 DOM #sec-finance | onclick=toggleCOA(this) | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /finance | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-finance; div.coa-item | High: element presence; Not Verified: action and app parity |
| ELM-0341 | SCR-017 | div.coa-item | div | ▼الإيرادات4000ج.م 428,600 | v43 DOM #sec-finance | onclick=toggleCOA(this) | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /finance | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-finance; div.coa-item | High: element presence; Not Verified: action and app parity |
| ELM-0342 | SCR-017 | div.coa-item | div | ►المصروفات5000ج.م 213,850 | v43 DOM #sec-finance | onclick=toggleCOA(this) | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /finance | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-finance; div.coa-item | High: element presence; Not Verified: action and app parity |
| ELM-0343 | SCR-017 | input.input | input | مثال: 1110 | v43 DOM #sec-finance | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /finance | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-finance; input.input | High: element presence; Not Verified: action and app parity |
| ELM-0344 | SCR-017 | select.select | select | أصولخصومإيراداتمصروفاتحقوق ملكية | v43 DOM #sec-finance | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /finance | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-finance; select.select | High: element presence; Not Verified: action and app parity |
| ELM-0345 | SCR-017 | input.input | input | اسم الحساب بالعربية | v43 DOM #sec-finance | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /finance | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-finance; input.input | High: element presence; Not Verified: action and app parity |
| ELM-0346 | SCR-017 | select.select | select | بدون (حساب رئيسي)1000 — الأصول1100 — الأصول المتداولة | v43 DOM #sec-finance | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /finance | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-finance; select.select | High: element presence; Not Verified: action and app parity |
| ELM-0347 | SCR-017 | textarea.textarea | textarea | وصف الحساب... | v43 DOM #sec-finance | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /finance | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-finance; textarea.textarea | High: element presence; Not Verified: action and app parity |
| ELM-0348 | SCR-017 | button.btn.btn-ghost | button | إلغاء | v43 DOM #sec-finance | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /finance | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-finance; button.btn.btn-ghost | High: element presence; Not Verified: action and app parity |
| ELM-0349 | SCR-017 | button.btn.btn-primary | button | حفظ الحساب | v43 DOM #sec-finance | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /finance | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-finance; button.btn.btn-primary | High: element presence; Not Verified: action and app parity |
| ELM-0350 | SCR-018 | button.btn.btn-primary | button | + إضافة حاوية | v43 DOM #sec-containers | onclick=ctNew() | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /containers | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-containers; button.btn.btn-primary | High: element presence; Not Verified: action and app parity |
| ELM-0351 | SCR-019 | div.stat-card | div | 📊 تقارير المبيعات 6 تقارير — إيرادات، أداء، عملاء مفضّل | v43 DOM #sec-reports | onclick=showSection('reports-sales') | reports-sales | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /reports | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-reports; div.stat-card | High: element presence; Not Verified: action and app parity |
| ELM-0352 | SCR-019 | div.stat-card | div | 🚢 تقارير الحاويات 4 تقارير — استلام، تكلفة فعلية | v43 DOM #sec-reports | onclick=showSection('containers') | containers | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /reports | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-reports; div.stat-card | High: element presence; Not Verified: action and app parity |
| ELM-0353 | SCR-019 | div.stat-card | div | 💹 تقارير الأرباح 5 تقارير — ربحية، هوامش، P&L | v43 DOM #sec-reports | onclick=showSection('reports-profit') | reports-profit | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /reports | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-reports; div.stat-card | High: element presence; Not Verified: action and app parity |
| ELM-0354 | SCR-019 | div.stat-card | div | 📦 تقارير المخزون 5 تقارير — حركات، تقييم، تحليل | v43 DOM #sec-reports | onclick=showSection('reports-inventory') | reports-inventory | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /reports | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-reports; div.stat-card | High: element presence; Not Verified: action and app parity |
| ELM-0355 | SCR-019 | div.stat-card | div | 💰 التقارير المالية 4 تقارير — قوائم مالية، تدفقات | v43 DOM #sec-reports | onclick=showSection('reports-financial') | reports-financial | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /reports | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-reports; div.stat-card | High: element presence; Not Verified: action and app parity |
| ELM-0356 | SCR-020 | button.btn.btn-ghost | button | 📄 Excel | v43 DOM #sec-reports-sales | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /reports/sales | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-reports-sales; button.btn.btn-ghost | High: element presence; Not Verified: action and app parity |
| ELM-0357 | SCR-020 | button.btn.btn-ghost | button | 📋 CSV | v43 DOM #sec-reports-sales | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /reports/sales | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-reports-sales; button.btn.btn-ghost | High: element presence; Not Verified: action and app parity |
| ELM-0358 | SCR-020 | button.btn.btn-ghost | button | 🖨️ طباعة | v43 DOM #sec-reports-sales | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /reports/sales | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-reports-sales; button.btn.btn-ghost | High: element presence; Not Verified: action and app parity |
| ELM-0359 | SCR-020 | input.input | input/date |  | v43 DOM #sec-reports-sales | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /reports/sales | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-reports-sales; input.input | High: element presence; Not Verified: action and app parity |
| ELM-0360 | SCR-020 | input.input | input/date |  | v43 DOM #sec-reports-sales | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /reports/sales | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-reports-sales; input.input | High: element presence; Not Verified: action and app parity |
| ELM-0361 | SCR-020 | select.select | select | كل الموظفينأبنوبسارة محمد | v43 DOM #sec-reports-sales | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /reports/sales | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-reports-sales; select.select | High: element presence; Not Verified: action and app parity |
| ELM-0362 | SCR-020 | select.select | select | Group By: شهرGroup By: أسبوعGroup By: موظف | v43 DOM #sec-reports-sales | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /reports/sales | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-reports-sales; select.select | High: element presence; Not Verified: action and app parity |
| ELM-0363 | SCR-020 | button.btn.btn-ghost | button | إعادة تعيين | v43 DOM #sec-reports-sales | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /reports/sales | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-reports-sales; button.btn.btn-ghost | High: element presence; Not Verified: action and app parity |
| ELM-0364 | SCR-020 | button.btn.btn-primary | button | تطبيق | v43 DOM #sec-reports-sales | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /reports/sales | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-reports-sales; button.btn.btn-primary | High: element presence; Not Verified: action and app parity |
| ELM-0365 | SCR-021 | button.btn.btn-ghost | button | 📄 Excel | v43 DOM #sec-reports-profit | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /reports/invoice-profit | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-reports-profit; button.btn.btn-ghost | High: element presence; Not Verified: action and app parity |
| ELM-0366 | SCR-021 | button.btn.btn-ghost | button | 🖨️ طباعة | v43 DOM #sec-reports-profit | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /reports/invoice-profit | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-reports-profit; button.btn.btn-ghost | High: element presence; Not Verified: action and app parity |
| ELM-0367 | SCR-021 | select.select | select | ديسمبر 2024نوفمبر 2024 | v43 DOM #sec-reports-profit | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /reports/invoice-profit | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-reports-profit; select.select | High: element presence; Not Verified: action and app parity |
| ELM-0368 | SCR-021 | select.select | select | مقارنة: الشهر السابقمقارنة: السنة الماضية | v43 DOM #sec-reports-profit | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /reports/invoice-profit | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-reports-profit; select.select | High: element presence; Not Verified: action and app parity |
| ELM-0369 | SCR-021 | button.btn.btn-primary | button | تطبيق | v43 DOM #sec-reports-profit | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /reports/invoice-profit | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-reports-profit; button.btn.btn-primary | High: element presence; Not Verified: action and app parity |
| ELM-0370 | SCR-022 | input#wa-كراس.input | input | مثال: 01012345678 | v43 DOM #sec-users | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /admin/users | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-users; input#wa-كراس.input | High: element presence; Not Verified: action and app parity |
| ELM-0371 | SCR-022 | button.btn.btn-primary | button | حفظ | v43 DOM #sec-users | onclick=waSave('كراس') | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /admin/users | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-users; button.btn.btn-primary | High: element presence; Not Verified: action and app parity |
| ELM-0372 | SCR-022 | button.btn.btn-ghost | button | حذف الرقم | v43 DOM #sec-users | onclick=waDel('كراس') | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /admin/users | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-users; button.btn.btn-ghost | High: element presence; Not Verified: action and app parity |
| ELM-0373 | SCR-022 | button.btn.btn-secondary | button | واتساب | v43 DOM #sec-users | onclick=waOpen('كراس') | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /admin/users | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-users; button.btn.btn-secondary | High: element presence; Not Verified: action and app parity |
| ELM-0374 | SCR-022 | input#wa-أبنوب.input | input | مثال: 01012345678 | v43 DOM #sec-users | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /admin/users | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-users; input#wa-أبنوب.input | High: element presence; Not Verified: action and app parity |
| ELM-0375 | SCR-022 | button.btn.btn-primary | button | حفظ | v43 DOM #sec-users | onclick=waSave('أبنوب') | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /admin/users | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-users; button.btn.btn-primary | High: element presence; Not Verified: action and app parity |
| ELM-0376 | SCR-022 | button.btn.btn-ghost | button | حذف الرقم | v43 DOM #sec-users | onclick=waDel('أبنوب') | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /admin/users | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-users; button.btn.btn-ghost | High: element presence; Not Verified: action and app parity |
| ELM-0377 | SCR-022 | button.btn.btn-secondary | button | واتساب | v43 DOM #sec-users | onclick=waOpen('أبنوب') | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /admin/users | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-users; button.btn.btn-secondary | High: element presence; Not Verified: action and app parity |
| ELM-0378 | SCR-022 | input#wa-السائق.input | input | مثال: 01012345678 | v43 DOM #sec-users | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /admin/users | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-users; input#wa-السائق.input | High: element presence; Not Verified: action and app parity |
| ELM-0379 | SCR-022 | button.btn.btn-primary | button | حفظ | v43 DOM #sec-users | onclick=waSave('السائق') | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /admin/users | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-users; button.btn.btn-primary | High: element presence; Not Verified: action and app parity |
| ELM-0380 | SCR-022 | button.btn.btn-ghost | button | حذف الرقم | v43 DOM #sec-users | onclick=waDel('السائق') | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /admin/users | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-users; button.btn.btn-ghost | High: element presence; Not Verified: action and app parity |
| ELM-0381 | SCR-022 | button.btn.btn-secondary | button | واتساب | v43 DOM #sec-users | onclick=waOpen('السائق') | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /admin/users | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-users; button.btn.btn-secondary | High: element presence; Not Verified: action and app parity |
| ELM-0382 | SCR-023 | button.btn.btn-primary | button | + إضافة مستودع | v43 DOM #sec-warehouses | onclick=openModal('modal-add-warehouse') | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /warehouses | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-warehouses; button.btn.btn-primary | High: element presence; Not Verified: action and app parity |
| ELM-0383 | SCR-023 | button.btn.btn-primary | button | ＋ إضافة بيانات تجريبية | v43 DOM #sec-warehouses | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /warehouses | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-warehouses; button.btn.btn-primary | High: element presence; Not Verified: action and app parity |
| ELM-0384 | SCR-024 | button.btn.btn-ghost | button | 📄 Excel | v43 DOM #sec-reports-inventory | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /reports/stock | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-reports-inventory; button.btn.btn-ghost | High: element presence; Not Verified: action and app parity |
| ELM-0385 | SCR-024 | button.btn.btn-ghost | button | 🖨️ طباعة | v43 DOM #sec-reports-inventory | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /reports/stock | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-reports-inventory; button.btn.btn-ghost | High: element presence; Not Verified: action and app parity |
| ELM-0386 | SCR-024 | select.select | select | كل المستودعاتمستودع الرياضمستودع جدة | v43 DOM #sec-reports-inventory | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /reports/stock | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-reports-inventory; select.select | High: element presence; Not Verified: action and app parity |
| ELM-0387 | SCR-024 | select.select | select | كل الفئاتمستلزمات صناعيةمواد كيميائية | v43 DOM #sec-reports-inventory | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /reports/stock | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-reports-inventory; select.select | High: element presence; Not Verified: action and app parity |
| ELM-0388 | SCR-024 | button.btn.btn-primary | button | ＋ إضافة بيانات تجريبية | v43 DOM #sec-reports-inventory | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /reports/stock | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-reports-inventory; button.btn.btn-primary | High: element presence; Not Verified: action and app parity |
| ELM-0389 | SCR-025 | button.btn.btn-ghost | button | 📄 Excel | v43 DOM #sec-reports-financial | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /reports/financial | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-reports-financial; button.btn.btn-ghost | High: element presence; Not Verified: action and app parity |
| ELM-0390 | SCR-025 | button.btn.btn-ghost | button | 🖨️ طباعة | v43 DOM #sec-reports-financial | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /reports/financial | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-reports-financial; button.btn.btn-ghost | High: element presence; Not Verified: action and app parity |
| ELM-0391 | SCR-026 | input#gov-new.input | input | اسم محافظة جديدة | v43 DOM #sec-govs | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /admin/governorates | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-govs; input#gov-new.input | High: element presence; Not Verified: action and app parity |
| ELM-0392 | SCR-026 | button.btn.btn-primary | button | إضافة | v43 DOM #sec-govs | onclick=govAdd() | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /admin/governorates | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-govs; button.btn.btn-primary | High: element presence; Not Verified: action and app parity |
| ELM-0393 | SCR-027 | select#sa-p.select | select |  | v43 DOM #sec-stock-add | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /inventory/opening-stock (closest) | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-stock-add; select#sa-p.select | High: element presence; Not Verified: action and app parity |
| ELM-0394 | SCR-027 | select#sa-w.select | select |  | v43 DOM #sec-stock-add | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /inventory/opening-stock (closest) | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-stock-add; select#sa-w.select | High: element presence; Not Verified: action and app parity |
| ELM-0395 | SCR-027 | input#sa-q.input | input/number |  | v43 DOM #sec-stock-add | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /inventory/opening-stock (closest) | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-stock-add; input#sa-q.input | High: element presence; Not Verified: action and app parity |
| ELM-0396 | SCR-027 | button.btn.btn-primary | button | إضافة | v43 DOM #sec-stock-add | onclick=stockAdd() | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /inventory/opening-stock (closest) | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-stock-add; button.btn.btn-primary | High: element presence; Not Verified: action and app parity |
| ELM-0397 | SCR-032 | input#dr-n.input | input | اسم السائق | v43 DOM #sec-drivers | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /admin/drivers | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-drivers; input#dr-n.input | High: element presence; Not Verified: action and app parity |
| ELM-0398 | SCR-032 | input#dr-c.input | input | شركة الشحن الخاصة بالشركة | v43 DOM #sec-drivers | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /admin/drivers | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-drivers; input#dr-c.input | High: element presence; Not Verified: action and app parity |
| ELM-0399 | SCR-032 | button.btn.btn-primary | button | إضافة | v43 DOM #sec-drivers | onclick=drvAdd() | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /admin/drivers | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-drivers; button.btn.btn-primary | High: element presence; Not Verified: action and app parity |
| ELM-0400 | SCR-034 | button.btn.btn-primary | button | + تسجيل دفعة | v43 DOM #sec-fin-overview | onclick=showSection('collections');openModal('modal-payment') | collections | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /finance | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-fin-overview; button.btn.btn-primary | High: element presence; Not Verified: action and app parity |
| ELM-0401 | SCR-034 | button.btn.btn-ghost | button | + تسجيل مصروف | v43 DOM #sec-fin-overview | onclick=showSection('expenses');openModal('modal-expense') | expenses | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /finance | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-fin-overview; button.btn.btn-ghost | High: element presence; Not Verified: action and app parity |
| ELM-0402 | SCR-050 | select#tr-p.select | select |  | v43 DOM #sec-transfers | onchange=trAv() | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /container-transfers | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-transfers; select#tr-p.select | High: element presence; Not Verified: action and app parity |
| ELM-0403 | SCR-050 | select#tr-f.select | select |  | v43 DOM #sec-transfers | onchange=trAv() | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /container-transfers | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-transfers; select#tr-f.select | High: element presence; Not Verified: action and app parity |
| ELM-0404 | SCR-050 | select#tr-t.select | select |  | v43 DOM #sec-transfers | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /container-transfers | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-transfers; select#tr-t.select | High: element presence; Not Verified: action and app parity |
| ELM-0405 | SCR-050 | input#tr-q.input | input/number |  | v43 DOM #sec-transfers | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /container-transfers | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-transfers; input#tr-q.input | High: element presence; Not Verified: action and app parity |
| ELM-0406 | SCR-050 | button.btn.btn-primary | button | تنفيذ النقل | v43 DOM #sec-transfers | onclick=doTransfer() | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /container-transfers | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-transfers; button.btn.btn-primary | High: element presence; Not Verified: action and app parity |
| ELM-0407 | SCR-052 | select#cm-c.select | select |  | v43 DOM #sec-cont-money | onchange=renderCM() | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /container-funds | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-cont-money; select#cm-c.select | High: element presence; Not Verified: action and app parity |
| ELM-0408 | SCR-052 | select#cm-t.select | select | إضافةسحب | v43 DOM #sec-cont-money | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /container-funds | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-cont-money; select#cm-t.select | High: element presence; Not Verified: action and app parity |
| ELM-0409 | SCR-052 | input#cm-a.input | input/number |  | v43 DOM #sec-cont-money | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /container-funds | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-cont-money; input#cm-a.input | High: element presence; Not Verified: action and app parity |
| ELM-0410 | SCR-052 | select#cm-d.select | select |  | v43 DOM #sec-cont-money | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /container-funds | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-cont-money; select#cm-d.select | High: element presence; Not Verified: action and app parity |
| ELM-0411 | SCR-052 | input#cm-r.input | input |  | v43 DOM #sec-cont-money | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /container-funds | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-cont-money; input#cm-r.input | High: element presence; Not Verified: action and app parity |
| ELM-0412 | SCR-052 | input#cm-f.input | input |  | v43 DOM #sec-cont-money | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /container-funds | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-cont-money; input#cm-f.input | High: element presence; Not Verified: action and app parity |
| ELM-0413 | SCR-052 | input#cm-n.input | input |  | v43 DOM #sec-cont-money | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /container-funds | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-cont-money; input#cm-n.input | High: element presence; Not Verified: action and app parity |
| ELM-0414 | SCR-052 | button#cm-ok.btn.btn-primary | button | تسجيل الحركة | v43 DOM #sec-cont-money | onclick=cmAdd() | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /container-funds | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-cont-money; button#cm-ok.btn.btn-primary | High: element presence; Not Verified: action and app parity |
| ELM-0415 | SCR-054 | button.btn.btn-sm | button | الرئيسية | v43 DOM #sec-fin2 | onclick=finTab('home') | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /finance | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-fin2; button.btn.btn-sm | High: element presence; Not Verified: action and app parity |
| ELM-0416 | SCR-054 | button.btn.btn-sm | button | السحب | v43 DOM #sec-fin2 | onclick=finTab('accts') | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /finance | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-fin2; button.btn.btn-sm | High: element presence; Not Verified: action and app parity |
| ELM-0417 | SCR-054 | button.btn.btn-sm | button | الصندوق الوارد | v43 DOM #sec-fin2 | onclick=finTab('inbox') | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /finance | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-fin2; button.btn.btn-sm | High: element presence; Not Verified: action and app parity |
| ELM-0418 | SCR-054 | button.btn.btn-sm | button | فلوس منتظرة | v43 DOM #sec-fin2 | onclick=finTab('wait') | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /finance | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-fin2; button.btn.btn-sm | High: element presence; Not Verified: action and app parity |
| ELM-0419 | SCR-054 | button.btn.btn-sm | button | المصروفات | v43 DOM #sec-fin2 | onclick=finTab('exp') | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /finance | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-fin2; button.btn.btn-sm | High: element presence; Not Verified: action and app parity |
| ELM-0420 | SCR-054 | button.btn.btn-sm | button | الحاويات | v43 DOM #sec-fin2 | onclick=finTab('cont') | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /finance | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-fin2; button.btn.btn-sm | High: element presence; Not Verified: action and app parity |
| ELM-0421 | SCR-054 | button.btn.btn-sm | button | الحركات | v43 DOM #sec-fin2 | onclick=finTab('led') | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /finance | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-fin2; button.btn.btn-sm | High: element presence; Not Verified: action and app parity |
| ELM-0422 | SCR-054 | button.btn.btn-sm | button | الشركاء | v43 DOM #sec-fin2 | onclick=finTab('part') | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /finance | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-fin2; button.btn.btn-sm | High: element presence; Not Verified: action and app parity |
| ELM-0423 | SCR-054 | button.btn.btn-sm | button | دفعات الشركاء | v43 DOM #sec-fin2 | onclick=finTab('inst') | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /finance | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-fin2; button.btn.btn-sm | High: element presence; Not Verified: action and app parity |
| ELM-0424 | SCR-054 | button.btn.btn-sm | button | فواتير الشراء | v43 DOM #sec-fin2 | onclick=finTab('purch') | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /finance | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-fin2; button.btn.btn-sm | High: element presence; Not Verified: action and app parity |
| ELM-0425 | SCR-054 | div.fn-c | div | إجمالي الأرصدة0 | v43 DOM #sec-fin2 | onclick=finTab('accts') | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /finance | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-fin2; div.fn-c | High: element presence; Not Verified: action and app parity |
| ELM-0426 | SCR-054 | div.fn-c | div | المستلم من العملاء0 | v43 DOM #sec-fin2 | onclick=finTab('led') | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /finance | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-fin2; div.fn-c | High: element presence; Not Verified: action and app parity |
| ELM-0427 | SCR-054 | div.fn-c | div | المصروفات المدفوعة0 | v43 DOM #sec-fin2 | onclick=finTab('exp') | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /finance | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-fin2; div.fn-c | High: element presence; Not Verified: action and app parity |
| ELM-0428 | SCR-054 | div.fn-c | div | المسترد للعملاء0 | v43 DOM #sec-fin2 | onclick=finTab('led') | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /finance | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-fin2; div.fn-c | High: element presence; Not Verified: action and app parity |
| ELM-0429 | SCR-054 | div.fn-c | div | المستحق على العملاء0 | v43 DOM #sec-fin2 | onclick=finTab('led') | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /finance | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-fin2; div.fn-c | High: element presence; Not Verified: action and app parity |
| ELM-0430 | SCR-054 | div.fn-c | div | المستحق للمصنع0 | v43 DOM #sec-fin2 | onclick=finTab('led') | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /finance | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-fin2; div.fn-c | High: element presence; Not Verified: action and app parity |
| ELM-0431 | SCR-054 | div.fn-c | div | مدفوع مقدمًا (متبقي)0 | v43 DOM #sec-fin2 | onclick=finTab('led') | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /finance | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-fin2; div.fn-c | High: element presence; Not Verified: action and app parity |
| ELM-0432 | SCR-054 | div.fn-c | div | النقدية في الدرج0 | v43 DOM #sec-fin2 | onclick=finTab('accts') | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /finance | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-fin2; div.fn-c | High: element presence; Not Verified: action and app parity |
| ELM-0433 | SCR-054 | div.fn-c | div | فودافون كاش — كراس0 | v43 DOM #sec-fin2 | onclick=finTab('accts') | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /finance | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-fin2; div.fn-c | High: element presence; Not Verified: action and app parity |
| ELM-0434 | SCR-054 | div.fn-c | div | فودافون كاش — أبنوب0 | v43 DOM #sec-fin2 | onclick=finTab('accts') | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /finance | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-fin2; div.fn-c | High: element presence; Not Verified: action and app parity |
| ELM-0435 | SCR-054 | div.fn-c | div | أورنج كاش0 | v43 DOM #sec-fin2 | onclick=finTab('accts') | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /finance | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-fin2; div.fn-c | High: element presence; Not Verified: action and app parity |
| ELM-0436 | SCR-054 | div.fn-c | div | إنستا باي0 | v43 DOM #sec-fin2 | onclick=finTab('accts') | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /finance | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-fin2; div.fn-c | High: element presence; Not Verified: action and app parity |
| ELM-0437 | SCR-054 | div.fn-c | div | ماستر باي0 | v43 DOM #sec-fin2 | onclick=finTab('accts') | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /finance | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-fin2; div.fn-c | High: element presence; Not Verified: action and app parity |
| ELM-0438 | SCR-054 | div.fn-c | div | حساب البوسطة0 | v43 DOM #sec-fin2 | onclick=finTab('accts') | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /finance | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-fin2; div.fn-c | High: element presence; Not Verified: action and app parity |
| ELM-0439 | SCR-054 | div.fn-c | div | البنك الأهلي0 | v43 DOM #sec-fin2 | onclick=finTab('accts') | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /finance | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-fin2; div.fn-c | High: element presence; Not Verified: action and app parity |
| ELM-0440 | SCR-054 | div.fn-c | div | إجمالي البنوك0 | v43 DOM #sec-fin2 | onclick=finTab('accts') | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /finance | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-fin2; div.fn-c | High: element presence; Not Verified: action and app parity |
| ELM-0441 | SCR-054 | div.fn-c | div | إجمالي الحاويات وتكاليفها0 | v43 DOM #sec-fin2 | onclick=finTab('cont') | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /finance | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-fin2; div.fn-c | High: element presence; Not Verified: action and app parity |
| ELM-0442 | SCR-054 | div.fn-c | div | مكاسب الشركاء المستحقة0 | v43 DOM #sec-fin2 | onclick=finTab('part') | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /finance | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-fin2; div.fn-c | High: element presence; Not Verified: action and app parity |
| ELM-0443 | SCR-054 | div.fn-c | div | ربح الشركة من السائق0 | v43 DOM #sec-fin2 | onclick=finTab('part') | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /finance | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-fin2; div.fn-c | High: element presence; Not Verified: action and app parity |
| ELM-0444 | SCR-054 | div.fn-c | div | أقساط الشركاء المتبقية0 | v43 DOM #sec-fin2 | onclick=finTab('inst') | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /finance | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-fin2; div.fn-c | High: element presence; Not Verified: action and app parity |
| ELM-0445 | SCR-054 | div.fn-c | div | فلوس منتظرة عند الشركاء0 | v43 DOM #sec-fin2 | onclick=finTab('wait') | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /finance | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-fin2; div.fn-c | High: element presence; Not Verified: action and app parity |
| ELM-0446 | SCR-055 | select#lq-c.select | select |  | v43 DOM #sec-liq | onchange=finLiq() | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /customers/:customerId/liquidation | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-liq; select#lq-c.select | High: element presence; Not Verified: action and app parity |
| ELM-0447 | SCR-056 | input.xi | input/number |  | v43 DOM #sec-x-budget | onchange=xBud('صيانات الشركة',this.value) | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | No direct route found | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-x-budget; input.xi | High: element presence; Not Verified: action and app parity |
| ELM-0448 | SCR-056 | input.xi | input/number |  | v43 DOM #sec-x-budget | onchange=xBud('المرتبات',this.value) | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | No direct route found | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-x-budget; input.xi | High: element presence; Not Verified: action and app parity |
| ELM-0449 | SCR-056 | input.xi | input/number |  | v43 DOM #sec-x-budget | onchange=xBud('مصروفات المخازن',this.value) | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | No direct route found | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-x-budget; input.xi | High: element presence; Not Verified: action and app parity |
| ELM-0450 | SCR-056 | input.xi | input/number |  | v43 DOM #sec-x-budget | onchange=xBud('مصروفات التشغيل',this.value) | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | No direct route found | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-x-budget; input.xi | High: element presence; Not Verified: action and app parity |
| ELM-0451 | SCR-056 | input.xi | input/number |  | v43 DOM #sec-x-budget | onchange=xBud('النقل والشحن',this.value) | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | No direct route found | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-x-budget; input.xi | High: element presence; Not Verified: action and app parity |
| ELM-0452 | SCR-056 | input.xi | input/number |  | v43 DOM #sec-x-budget | onchange=xBud('الجمارك والتخليص',this.value) | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | No direct route found | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-x-budget; input.xi | High: element presence; Not Verified: action and app parity |
| ELM-0453 | SCR-056 | input.xi | input/number |  | v43 DOM #sec-x-budget | onchange=xBud('الأختام',this.value) | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | No direct route found | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-x-budget; input.xi | High: element presence; Not Verified: action and app parity |
| ELM-0454 | SCR-056 | input.xi | input/number |  | v43 DOM #sec-x-budget | onchange=xBud('أخرى',this.value) | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | No direct route found | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-x-budget; input.xi | High: element presence; Not Verified: action and app parity |
| ELM-0455 | SCR-056 | input.xi | input/number |  | v43 DOM #sec-x-budget | onchange=xBud('فواتير المديرين',this.value) | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | No direct route found | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-x-budget; input.xi | High: element presence; Not Verified: action and app parity |
| ELM-0456 | SCR-056 | input.xi | input/number |  | v43 DOM #sec-x-budget | onchange=xBud('حساب بيتر',this.value) | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | No direct route found | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-x-budget; input.xi | High: element presence; Not Verified: action and app parity |
| ELM-0457 | SCR-057 | input#xr-n.xi.wide | input | الاسم (إيجار، مرتب...) | v43 DOM #sec-x-recur | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | No direct route found | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-x-recur; input#xr-n.xi.wide | High: element presence; Not Verified: action and app parity |
| ELM-0458 | SCR-057 | select#xr-i.xi | select | صيانات الشركةالمرتباتمصروفات المخازنمصروفات التشغيلالنقل والشحنالجمارك والتخليصالأختامأخرىفواتير المديرينحساب بيتر | v43 DOM #sec-x-recur | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | No direct route found | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-x-recur; select#xr-i.xi | High: element presence; Not Verified: action and app parity |
| ELM-0459 | SCR-057 | input#xr-a.xi | input/number | المبلغ | v43 DOM #sec-x-recur | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | No direct route found | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-x-recur; input#xr-a.xi | High: element presence; Not Verified: action and app parity |
| ELM-0460 | SCR-057 | input#xr-d.xi | input/number | يوم الشهر | v43 DOM #sec-x-recur | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | No direct route found | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-x-recur; input#xr-d.xi | High: element presence; Not Verified: action and app parity |
| ELM-0461 | SCR-057 | button.btn.btn-primary | button | + إضافة | v43 DOM #sec-x-recur | onclick=xRecAdd() | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | No direct route found | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-x-recur; button.btn.btn-primary | High: element presence; Not Verified: action and app parity |
| ELM-0462 | SCR-062 | button.btn.btn-primary | button | اعتماد الجرد وتسجيل التسويات | v43 DOM #sec-x-count | onclick=xCountSave() | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /inventory/counts | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-x-count; button.btn.btn-primary | High: element presence; Not Verified: action and app parity |
| ELM-0463 | SCR-063 | input#xb-s.xi.wide | input | امسح أو اكتب الباركود ثم Enter | v43 DOM #sec-x-bar | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | No direct route found | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-x-bar; input#xb-s.xi.wide | High: element presence; Not Verified: action and app parity |
| ELM-0464 | SCR-063 | button.btn.btn-ghost | button | 📷 مسح بالكاميرا | v43 DOM #sec-x-bar | onclick=xCam() | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | No direct route found | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-x-bar; button.btn.btn-ghost | High: element presence; Not Verified: action and app parity |
| ELM-0465 | SCR-063 | button.btn.btn-primary | button | 🖨 طباعة المحدد | v43 DOM #sec-x-bar | onclick=xPrint() | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | No direct route found | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-x-bar; button.btn.btn-primary | High: element presence; Not Verified: action and app parity |
| ELM-0466 | SCR-065 | button#xi-p.on | button | منتجات | v43 DOM #sec-x-import | onclick=xKind('p') | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | AppShell demo modal; no import route | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-x-import; button#xi-p.on | High: element presence; Not Verified: action and app parity |
| ELM-0467 | SCR-065 | button#xi-c | button | عملاء | v43 DOM #sec-x-import | onclick=xKind('c') | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | AppShell demo modal; no import route | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-x-import; button#xi-c | High: element presence; Not Verified: action and app parity |
| ELM-0468 | SCR-065 | input#xi-f.xi.wide | input/file |  | v43 DOM #sec-x-import | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | AppShell demo modal; no import route | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-x-import; input#xi-f.xi.wide | High: element presence; Not Verified: action and app parity |
| ELM-0469 | SCR-065 | button.btn.btn-ghost | button | ⬇ تحميل نموذج | v43 DOM #sec-x-import | onclick=xTpl() | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | AppShell demo modal; no import route | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-x-import; button.btn.btn-ghost | High: element presence; Not Verified: action and app parity |
| ELM-0470 | SCR-066 | button.btn.btn-primary | button | إرسال واتساب | v43 DOM #sec-x-daily | onclick=xWA() | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | AppShell demo modal; no daily summary route | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-x-daily; button.btn.btn-primary | High: element presence; Not Verified: action and app parity |
| ELM-0471 | SCR-066 | button.btn.btn-ghost | button | نسخ | v43 DOM #sec-x-daily | onclick=xCp() | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | AppShell demo modal; no daily summary route | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-x-daily; button.btn.btn-ghost | High: element presence; Not Verified: action and app parity |
| ELM-0472 | SCR-066 | input#xd-on | input/checkbox | فعّل التذكير | v43 DOM #sec-x-daily | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | AppShell demo modal; no daily summary route | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-x-daily; input#xd-on | High: element presence; Not Verified: action and app parity |
| ELM-0473 | SCR-066 | input#xd-t.xi | input/time |  | v43 DOM #sec-x-daily | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | AppShell demo modal; no daily summary route | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-x-daily; input#xd-t.xi | High: element presence; Not Verified: action and app parity |
| ELM-0474 | SCR-066 | input#xd-p.xi.wide | input | رقم واتساب (2010...) | v43 DOM #sec-x-daily | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | AppShell demo modal; no daily summary route | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-x-daily; input#xd-p.xi.wide | High: element presence; Not Verified: action and app parity |
| ELM-0475 | SCR-066 | button.btn.btn-ghost | button | حفظ | v43 DOM #sec-x-daily | onclick=xDSave() | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | AppShell demo modal; no daily summary route | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-x-daily; button.btn.btn-ghost | High: element presence; Not Verified: action and app parity |
| ELM-0476 | SCR-067 | button#xa-b.btn.btn-primary | button | 📲 تثبيت التطبيق | v43 DOM #sec-x-app | onclick=xInst() | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | /admin/install | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM sec-x-app; button#xa-b.btn.btn-primary | High: element presence; Not Verified: action and app parity |
| ELM-0477 | OVR-001 | button.modal-close | button | ✕ | v43 overlay OVR-001 | onclick=closeModal('modal-add-customer') | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | Depends on opener | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM OVR-001; button.modal-close | High: element presence; Not Verified: action and app parity |
| ELM-0478 | OVR-001 | div.tab-item.active | div | البيانات الأساسية | v43 overlay OVR-001 | onclick=switchModalTab('cust-modal','tab-basic',this) | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | Depends on opener | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM OVR-001; div.tab-item.active | High: element presence; Not Verified: action and app parity |
| ELM-0479 | OVR-001 | div.tab-item | div | البيانات المالية | v43 overlay OVR-001 | onclick=switchModalTab('cust-modal','tab-financial',this) | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | Depends on opener | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM OVR-001; div.tab-item | High: element presence; Not Verified: action and app parity |
| ELM-0480 | OVR-001 | div.tab-item | div | المرفقات | v43 overlay OVR-001 | onclick=switchModalTab('cust-modal','tab-attachments',this) | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | Depends on opener | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM OVR-001; div.tab-item | High: element presence; Not Verified: action and app parity |
| ELM-0481 | OVR-001 | input#nc-name.input | input | الاسم الكامل | v43 overlay OVR-001 | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | Depends on opener | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM OVR-001; input#nc-name.input | High: element presence; Not Verified: action and app parity |
| ELM-0482 | OVR-001 | input#nc-bd.input | input/date |  | v43 overlay OVR-001 | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | Depends on opener | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM OVR-001; input#nc-bd.input | High: element presence; Not Verified: action and app parity |
| ELM-0483 | OVR-001 | input#nc-code.input | input | تلقائي | v43 overlay OVR-001 | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | Depends on opener | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM OVR-001; input#nc-code.input | High: element presence; Not Verified: action and app parity |
| ELM-0484 | OVR-001 | input#nc-email.input | input/email | email@example.com | v43 overlay OVR-001 | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | Depends on opener | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM OVR-001; input#nc-email.input | High: element presence; Not Verified: action and app parity |
| ELM-0485 | OVR-001 | input#nc-phone.input | input/tel | رقم الهاتف | v43 overlay OVR-001 | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | Depends on opener | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM OVR-001; input#nc-phone.input | High: element presence; Not Verified: action and app parity |
| ELM-0486 | OVR-001 | select#nc-gov.select | select | — اختر —القاهرةالجيزةالإسكندريةالقليوبيةالشرقيةالدقهليةالبحيرةالغربيةالمنوفيةكفر الشيخدمياطبورسعيدالإسماعيليةالسويسالفيو | v43 overlay OVR-001 | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | Depends on opener | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM OVR-001; select#nc-gov.select | High: element presence; Not Verified: action and app parity |
| ELM-0487 | OVR-001 | input#nc-fb.input | input |  | v43 overlay OVR-001 | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | Depends on opener | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM OVR-001; input#nc-fb.input | High: element presence; Not Verified: action and app parity |
| ELM-0488 | OVR-001 | textarea#nc-addr.textarea | textarea | العنوان التفصيلي... | v43 overlay OVR-001 | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | Depends on opener | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM OVR-001; textarea#nc-addr.textarea | High: element presence; Not Verified: action and app parity |
| ELM-0489 | OVR-001 | select#nc-cur.select | select | ج.م — جنيه مصريUSD — دولار أمريكي | v43 overlay OVR-001 | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | Depends on opener | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM OVR-001; select#nc-cur.select | High: element presence; Not Verified: action and app parity |
| ELM-0490 | OVR-001 | input#nc-credit.input | input/number | 0 | v43 overlay OVR-001 | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | Depends on opener | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM OVR-001; input#nc-credit.input | High: element presence; Not Verified: action and app parity |
| ELM-0491 | OVR-001 | select.select | select | 30 يومفوري15 يوم60 يوم | v43 overlay OVR-001 | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | Depends on opener | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM OVR-001; select.select | High: element presence; Not Verified: action and app parity |
| ELM-0492 | OVR-001 | input#nc-open.input | input/number | 0 | v43 overlay OVR-001 | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | Depends on opener | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM OVR-001; input#nc-open.input | High: element presence; Not Verified: action and app parity |
| ELM-0493 | OVR-001 | button.btn.btn-ghost | button | إلغاء | v43 overlay OVR-001 | onclick=closeModal('modal-add-customer') | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | Depends on opener | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM OVR-001; button.btn.btn-ghost | High: element presence; Not Verified: action and app parity |
| ELM-0494 | OVR-001 | button.btn.btn-secondary | button | حفظ وإضافة آخر | v43 overlay OVR-001 | onclick=saveCustomer(true) | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | Depends on opener | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM OVR-001; button.btn.btn-secondary | High: element presence; Not Verified: action and app parity |
| ELM-0495 | OVR-001 | button.btn.btn-primary | button | حفظ العميل | v43 overlay OVR-001 | onclick=saveCustomer(false) | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | Depends on opener | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM OVR-001; button.btn.btn-primary | High: element presence; Not Verified: action and app parity |
| ELM-0496 | OVR-002 | button.modal-close | button | ✕ | v43 overlay OVR-002 | onclick=closeModal('modal-payment') | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | Depends on opener | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM OVR-002; button.modal-close | High: element presence; Not Verified: action and app parity |
| ELM-0497 | OVR-002 | select#pay-cust.select | select |  | v43 overlay OVR-002 | onchange=payCustChanged() | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | Depends on opener | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM OVR-002; select#pay-cust.select | High: element presence; Not Verified: action and app parity |
| ELM-0498 | OVR-002 | button.btn.btn-ghost | button/button | ＋ عميل | v43 overlay OVR-002 | onclick=openNewCustomer(id=>{preparePayment();byId('pay-cust').value=id;payCustChanged()}) | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | Depends on opener | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM OVR-002; button.btn.btn-ghost | High: element presence; Not Verified: action and app parity |
| ELM-0499 | OVR-002 | select#pay-method.select | select | نقديتحويل بنكيشيك | v43 overlay OVR-002 | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | Depends on opener | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM OVR-002; select#pay-method.select | High: element presence; Not Verified: action and app parity |
| ELM-0500 | OVR-002 | select#pay-cashier.select | select |  | v43 overlay OVR-002 | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | Depends on opener | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM OVR-002; select#pay-cashier.select | High: element presence; Not Verified: action and app parity |
| ELM-0501 | OVR-002 | input#pay-amount.input | input/number | 0.00 | v43 overlay OVR-002 | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | Depends on opener | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM OVR-002; input#pay-amount.input | High: element presence; Not Verified: action and app parity |
| ELM-0502 | OVR-002 | input#pay-date.input | input |  | v43 overlay OVR-002 | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | Depends on opener | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM OVR-002; input#pay-date.input | High: element presence; Not Verified: action and app parity |
| ELM-0503 | OVR-002 | button.btn.btn-ghost | button | إلغاء | v43 overlay OVR-002 | onclick=closeModal('modal-payment') | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | Depends on opener | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM OVR-002; button.btn.btn-ghost | High: element presence; Not Verified: action and app parity |
| ELM-0504 | OVR-002 | button.btn.btn-primary | button | تأكيد الدفعة | v43 overlay OVR-002 | onclick=savePayment() | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | Depends on opener | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM OVR-002; button.btn.btn-primary | High: element presence; Not Verified: action and app parity |
| ELM-0505 | OVR-003 | button.modal-close | button | ✕ | v43 overlay OVR-003 | onclick=closeModal('modal-expense') | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | Depends on opener | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM OVR-003; button.modal-close | High: element presence; Not Verified: action and app parity |
| ELM-0506 | OVR-003 | select#ex-cat.select | select | شحن ولوجستياتإيجاراترواتبمصاريف إداريةصيانةأخرى | v43 overlay OVR-003 | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | Depends on opener | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM OVR-003; select#ex-cat.select | High: element presence; Not Verified: action and app parity |
| ELM-0507 | OVR-003 | input#ex-amt.input | input/number | 0.00 | v43 overlay OVR-003 | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | Depends on opener | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM OVR-003; input#ex-amt.input | High: element presence; Not Verified: action and app parity |
| ELM-0508 | OVR-003 | select#ex-cash.select | select |  | v43 overlay OVR-003 | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | Depends on opener | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM OVR-003; select#ex-cash.select | High: element presence; Not Verified: action and app parity |
| ELM-0509 | OVR-003 | select#ex-method.select | select | نقديتحويل بنكيشيك | v43 overlay OVR-003 | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | Depends on opener | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM OVR-003; select#ex-method.select | High: element presence; Not Verified: action and app parity |
| ELM-0510 | OVR-003 | input#ex-date.input | input |  | v43 overlay OVR-003 | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | Depends on opener | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM OVR-003; input#ex-date.input | High: element presence; Not Verified: action and app parity |
| ELM-0511 | OVR-003 | input#ex-dept.input | input | اختياري | v43 overlay OVR-003 | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | Depends on opener | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM OVR-003; input#ex-dept.input | High: element presence; Not Verified: action and app parity |
| ELM-0512 | OVR-003 | input#ex-desc.input | input | وصف المصروف... | v43 overlay OVR-003 | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | Depends on opener | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM OVR-003; input#ex-desc.input | High: element presence; Not Verified: action and app parity |
| ELM-0513 | OVR-003 | input#ex-notes.input | input | اختياري | v43 overlay OVR-003 | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | Depends on opener | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM OVR-003; input#ex-notes.input | High: element presence; Not Verified: action and app parity |
| ELM-0514 | OVR-003 | input#ex-payee.input | input | اختياري | v43 overlay OVR-003 | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | Depends on opener | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM OVR-003; input#ex-payee.input | High: element presence; Not Verified: action and app parity |
| ELM-0515 | OVR-003 | button.btn.btn-ghost | button | إلغاء | v43 overlay OVR-003 | onclick=closeModal('modal-expense') | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | Depends on opener | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM OVR-003; button.btn.btn-ghost | High: element presence; Not Verified: action and app parity |
| ELM-0516 | OVR-003 | button.btn.btn-primary | button | تسجيل المصروف | v43 overlay OVR-003 | onclick=saveExpenseReal() | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | Depends on opener | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM OVR-003; button.btn.btn-primary | High: element presence; Not Verified: action and app parity |
| ELM-0517 | OVR-004 | button.modal-close | button | ✕ | v43 overlay OVR-004 | onclick=closeModal('modal-add-product') | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | Depends on opener | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM OVR-004; button.modal-close | High: element presence; Not Verified: action and app parity |
| ELM-0518 | OVR-004 | input#np-name.input | input | اسم المنتج الكامل | v43 overlay OVR-004 | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | Depends on opener | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM OVR-004; input#np-name.input | High: element presence; Not Verified: action and app parity |
| ELM-0519 | OVR-004 | input#np-sku.input | input | تلقائي | v43 overlay OVR-004 | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | Depends on opener | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM OVR-004; input#np-sku.input | High: element presence; Not Verified: action and app parity |
| ELM-0520 | OVR-004 | input#np-cat.input | input | اكتب فئة جديدة أو اختر | v43 overlay OVR-004 | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | Depends on opener | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM OVR-004; input#np-cat.input | High: element presence; Not Verified: action and app parity |
| ELM-0521 | OVR-004 | select#np-unit.select | select | حبةكيسطنلترمتر | v43 overlay OVR-004 | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | Depends on opener | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM OVR-004; select#np-unit.select | High: element presence; Not Verified: action and app parity |
| ELM-0522 | OVR-004 | select.select | select | المستودع الرئيسي - الرياضمستودع جدة | v43 overlay OVR-004 | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | Depends on opener | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM OVR-004; select.select | High: element presence; Not Verified: action and app parity |
| ELM-0523 | OVR-004 | select.select | select | 15% (خاضع)0% (معفى) | v43 overlay OVR-004 | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | Depends on opener | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM OVR-004; select.select | High: element presence; Not Verified: action and app parity |
| ELM-0524 | OVR-004 | input.input | input/number | 0.00 | v43 overlay OVR-004 | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | Depends on opener | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM OVR-004; input.input | High: element presence; Not Verified: action and app parity |
| ELM-0525 | OVR-004 | input#np-price.input | input/number | 0.00 | v43 overlay OVR-004 | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | Depends on opener | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM OVR-004; input#np-price.input | High: element presence; Not Verified: action and app parity |
| ELM-0526 | OVR-004 | input#np-qty.input | input/number | 0 | v43 overlay OVR-004 | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | Depends on opener | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM OVR-004; input#np-qty.input | High: element presence; Not Verified: action and app parity |
| ELM-0527 | OVR-004 | input#np-min.input | input/number | 0 | v43 overlay OVR-004 | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | Depends on opener | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM OVR-004; input#np-min.input | High: element presence; Not Verified: action and app parity |
| ELM-0528 | OVR-004 | textarea.textarea | textarea | وصف مختصر للمنتج... | v43 overlay OVR-004 | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | Depends on opener | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM OVR-004; textarea.textarea | High: element presence; Not Verified: action and app parity |
| ELM-0529 | OVR-004 | button.btn.btn-ghost | button | إلغاء | v43 overlay OVR-004 | onclick=closeModal('modal-add-product') | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | Depends on opener | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM OVR-004; button.btn.btn-ghost | High: element presence; Not Verified: action and app parity |
| ELM-0530 | OVR-004 | button.btn.btn-secondary | button | حفظ وإضافة آخر | v43 overlay OVR-004 | onclick=saveProduct(true) | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | Depends on opener | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM OVR-004; button.btn.btn-secondary | High: element presence; Not Verified: action and app parity |
| ELM-0531 | OVR-004 | button.btn.btn-primary | button | حفظ المنتج | v43 overlay OVR-004 | onclick=saveProduct(false) | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | Depends on opener | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM OVR-004; button.btn.btn-primary | High: element presence; Not Verified: action and app parity |
| ELM-0532 | OVR-005 | button.modal-close | button | ✕ | v43 overlay OVR-005 | onclick=closeModal('modal-add-warehouse') | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | Depends on opener | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM OVR-005; button.modal-close | High: element presence; Not Verified: action and app parity |
| ELM-0533 | OVR-005 | input.input | input | مثال: مستودع فرع الدمام | v43 overlay OVR-005 | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | Depends on opener | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM OVR-005; input.input | High: element presence; Not Verified: action and app parity |
| ELM-0534 | OVR-005 | input.input | input | المدينة — الحي | v43 overlay OVR-005 | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | Depends on opener | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM OVR-005; input.input | High: element presence; Not Verified: action and app parity |
| ELM-0535 | OVR-005 | select.select | select | أبنوبفهد العتيبيسارة محمد | v43 overlay OVR-005 | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | Depends on opener | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM OVR-005; select.select | High: element presence; Not Verified: action and app parity |
| ELM-0536 | OVR-005 | input.input | input/number | 0 | v43 overlay OVR-005 | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | Depends on opener | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM OVR-005; input.input | High: element presence; Not Verified: action and app parity |
| ELM-0537 | OVR-005 | select.select | select | نشطتحت الصيانةموقوف | v43 overlay OVR-005 | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | Depends on opener | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM OVR-005; select.select | High: element presence; Not Verified: action and app parity |
| ELM-0538 | OVR-005 | button.btn.btn-ghost | button | إلغاء | v43 overlay OVR-005 | onclick=closeModal('modal-add-warehouse') | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | Depends on opener | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM OVR-005; button.btn.btn-ghost | High: element presence; Not Verified: action and app parity |
| ELM-0539 | OVR-005 | button.btn.btn-primary | button | حفظ المستودع | v43 overlay OVR-005 | onclick=showToast('success','تم حفظ بيانات المستودع بنجاح');closeModal('modal-add-warehouse') | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | Depends on opener | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM OVR-005; button.btn.btn-primary | High: element presence; Not Verified: action and app parity |
| ELM-0540 | OVR-006 | button.modal-close | button | ✕ | v43 overlay OVR-006 | onclick=closeModal('modal-confirm') | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | Depends on opener | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM OVR-006; button.modal-close | High: element presence; Not Verified: action and app parity |
| ELM-0541 | OVR-006 | textarea.textarea | textarea | اختياري — أضف سببًا أو ملاحظة للسجل... | v43 overlay OVR-006 | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | Depends on opener | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM OVR-006; textarea.textarea | High: element presence; Not Verified: action and app parity |
| ELM-0542 | OVR-006 | button.btn.btn-ghost | button | إلغاء | v43 overlay OVR-006 | onclick=closeModal('modal-confirm') | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | Depends on opener | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM OVR-006; button.btn.btn-ghost | High: element presence; Not Verified: action and app parity |
| ELM-0543 | OVR-006 | button.btn.btn-danger | button | تأكيد التنفيذ | v43 overlay OVR-006 | onclick=showToast('success','تم تنفيذ الإجراء بنجاح','تم تسجيله في سجل العمليات');closeModal('modal-confirm') | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | Depends on opener | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM OVR-006; button.btn.btn-danger | High: element presence; Not Verified: action and app parity |
| ELM-0544 | OVR-007 | button.modal-close | button | ✕ | v43 overlay OVR-007 | onclick=closeModal('modal-demo') | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | Depends on opener | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM OVR-007; button.modal-close | High: element presence; Not Verified: action and app parity |
| ELM-0545 | OVR-007 | button.btn.btn-ghost | button | إلغاء | v43 overlay OVR-007 | onclick=closeModal('modal-demo') | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | Depends on opener | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM OVR-007; button.btn.btn-ghost | High: element presence; Not Verified: action and app parity |
| ELM-0546 | OVR-007 | button#demo-save.btn.btn-primary | button | حفظ | v43 overlay OVR-007 | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | Depends on opener | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM OVR-007; button#demo-save.btn.btn-primary | High: element presence; Not Verified: action and app parity |
| ELM-0547 | OVR-008 | button.modal-close | button | ✕ | v43 overlay OVR-008 | onclick=closeModal('modal-container') | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | Depends on opener | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM OVR-008; button.modal-close | High: element presence; Not Verified: action and app parity |
| ELM-0548 | OVR-008 | input#cont-no.input | input |  | v43 overlay OVR-008 | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | Depends on opener | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM OVR-008; input#cont-no.input | High: element presence; Not Verified: action and app parity |
| ELM-0549 | OVR-008 | input#cont-supplier.input | input |  | v43 overlay OVR-008 | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | Depends on opener | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM OVR-008; input#cont-supplier.input | High: element presence; Not Verified: action and app parity |
| ELM-0550 | OVR-008 | input#cont-origin.input | input |  | v43 overlay OVR-008 | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | Depends on opener | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM OVR-008; input#cont-origin.input | High: element presence; Not Verified: action and app parity |
| ELM-0551 | OVR-008 | input#cont-eta.input | input/date |  | v43 overlay OVR-008 | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | Depends on opener | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM OVR-008; input#cont-eta.input | High: element presence; Not Verified: action and app parity |
| ELM-0552 | OVR-008 | input#cont-exp.input | input/number |  | v43 overlay OVR-008 | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | Depends on opener | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM OVR-008; input#cont-exp.input | High: element presence; Not Verified: action and app parity |
| ELM-0553 | OVR-008 | select#cont-status.select | select | في الطريقفي الميناءتحت التخليص | v43 overlay OVR-008 | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | Depends on opener | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM OVR-008; select#cont-status.select | High: element presence; Not Verified: action and app parity |
| ELM-0554 | OVR-008 | button.btn.btn-ghost | button | + صنف | v43 overlay OVR-008 | onclick=addContLine() | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | Depends on opener | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM OVR-008; button.btn.btn-ghost | High: element presence; Not Verified: action and app parity |
| ELM-0555 | OVR-008 | input#cont-recv | input/checkbox | تم الاستلام الآن — أضف الكميات للمخزون فورًا | v43 overlay OVR-008 | No inline event visible; inspect source for addEventListener | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | Depends on opener | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM OVR-008; input#cont-recv | High: element presence; Not Verified: action and app parity |
| ELM-0556 | OVR-008 | button.btn.btn-ghost | button | إلغاء | v43 overlay OVR-008 | onclick=closeModal('modal-container') | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | Depends on opener | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM OVR-008; button.btn.btn-ghost | High: element presence; Not Verified: action and app parity |
| ELM-0557 | OVR-008 | button.btn.btn-primary | button | حفظ الحاوية | v43 overlay OVR-008 | onclick=saveContainer() | Not encoded directly | Not specified in DOM; not tested | Prototype does not define reliable permissions | Initial state captured; focus/hover/disabled/loading/error/success not exercised | Depends on opener | Not activated; static presence or handler does not prove result | NOT_VERIFIED |  | DOM OVR-008; button.btn.btn-primary | High: element presence; Not Verified: action and app parity |
| ELM-0558 | SCR-002 | Customer list data row | table row | شركة النور | v43 SCR-002; see REFERENCE_DETAIL_ROW_CLICK_REVIEW.json | Click opens the selected customer detail file. | SCR-030 | Reference detail state opened from a visible list row; test fixture only. | Not specified; not tested. | Default visible state captured; hover/focus/keyboard/disabled/error states not individually tested. | Reference panel only; no system detail route found. | Existing customer row in system also opened /customers/101. | IMPLEMENTED_AND_VERIFIED |  | REFERENCE_DETAIL_ROW_CLICK_REVIEW.json; DETAIL_SCREEN_CLICK_REVIEW.json | High; actual click at all viewports. |
| ELM-0559 | SCR-030 | Register customer payment | button | + تسجيل دفعة | v43 SCR-030; see REFERENCE_DETAIL_MODAL_REVIEW.json | Open the payment modal preselected for this customer; do not submit during audit. | Modal: تسجيل دفعة | Reference detail state opened from a visible list row; test fixture only. | Customer section prompt was accepted with the isolated fixture setting; do not infer production permissions. | Default visible state captured; hover/focus/keyboard/disabled/error states not individually tested. | /customers/:customerId or reference customer panel; see evidence. | Reference opened dialog; Cancel closed it. System customer-detail shows View Statement, Liquidate, Back and no equivalent register-payment control. | MISSING | GAP-0002 | REFERENCE_DETAIL_MODAL_REVIEW.json; screenshots/reference/row-click-details/payment-modal-1280.png; DETAIL_SCREEN_CLICK_REVIEW.json | High for reference action and missing system control; no payment was saved. |
| ELM-0560 | SCR-030 | Return to customers | button | ← رجوع | v43 SCR-030; see REFERENCE_DETAIL_ROW_CLICK_REVIEW.json | Return to customer list. | /customers | Reference detail state opened from a visible list row; test fixture only. | Customer section prompt was accepted with the isolated fixture setting; do not infer production permissions. | Default visible state captured; hover/focus/keyboard/disabled/error states not individually tested. | /customers/:customerId or reference customer panel; see evidence. | Visible in reference and system; this action was not clicked in this round. | NOT_VERIFIED |  | REFERENCE_DETAIL_ROW_CLICK_REVIEW.json; DETAIL_SCREEN_CLICK_REVIEW.json | Medium; control visible, action not exercised. |
| ELM-0561 | SCR-030 | Change section password | button | كلمة مرور القسم | v43 SCR-030; see REFERENCE_DETAIL_ROW_CLICK_REVIEW.json | Open the section-password change prompt. | None observed on system detail | Reference detail state opened from a visible list row; test fixture only. | Customer section prompt was accepted with the isolated fixture setting; do not infer production permissions. | Default visible state captured; hover/focus/keyboard/disabled/error states not individually tested. | /customers/:customerId or reference customer panel; see evidence. | Not activated because it changes access settings. | NOT_VERIFIED |  | REFERENCE_DETAIL_ROW_CLICK_REVIEW.json | High for visible reference control; behavior intentionally untested. |
| ELM-0562 | SCR-030 | Customer overview tab | tab-like div | نظرة عامة | v43 SCR-030; see REFERENCE_DETAIL_ROW_CLICK_REVIEW.json | Switch visible customer file panel to overview. | Equivalent tab absent from system detail. | Reference detail state opened from a visible list row; test fixture only. | Customer section prompt was accepted with the isolated fixture setting; do not infer production permissions. | Default visible state captured; hover/focus/keyboard/disabled/error states not individually tested. | /customers/:customerId or reference customer panel; see evidence. | Actual click showed customer summary panel at 1280/768/390. | MISSING | GAP-0002 | REFERENCE_DETAIL_ROW_CLICK_REVIEW.json; customer-detail screenshots | High for reference click and system screenshot. |
| ELM-0563 | SCR-030 | Customer invoices tab | tab-like div | الفواتير | v43 SCR-030; see REFERENCE_DETAIL_ROW_CLICK_REVIEW.json | Switch to invoice list; clicking an invoice row opens invoice detail. | Equivalent tab absent from system detail. | Reference detail state opened from a visible list row; test fixture only. | Customer section prompt was accepted with the isolated fixture setting; do not infer production permissions. | Default visible state captured; hover/focus/keyboard/disabled/error states not individually tested. | /customers/:customerId or reference customer panel; see evidence. | Actual tab click showed invoice list; invoice row opened SCR-031 at all viewports. | MISSING | GAP-0002 | REFERENCE_DETAIL_ROW_CLICK_REVIEW.json | High for tested reference behavior; system tab absent. |
| ELM-0564 | SCR-030 | Customer payments tab | tab-like div | الدفعات | v43 SCR-030; see REFERENCE_DETAIL_ROW_CLICK_REVIEW.json | Switch to payments list and summary. | Equivalent tab absent from system detail. | Reference detail state opened from a visible list row; test fixture only. | Customer section prompt was accepted with the isolated fixture setting; do not infer production permissions. | Default visible state captured; hover/focus/keyboard/disabled/error states not individually tested. | /customers/:customerId or reference customer panel; see evidence. | Actual click showed payment table and totals at 1280/768/390. Delete action was not clicked. | MISSING | GAP-0002 | REFERENCE_DETAIL_ROW_CLICK_REVIEW.json | High for tested reference behavior; system tab absent. |
| ELM-0565 | SCR-030 | Customer history tab | tab-like div | سجل العميل | v43 SCR-030; see REFERENCE_DETAIL_ROW_CLICK_REVIEW.json | Switch to customer activity history. | Equivalent tab absent from system detail. | Reference detail state opened from a visible list row; test fixture only. | Customer section prompt was accepted with the isolated fixture setting; do not infer production permissions. | Default visible state captured; hover/focus/keyboard/disabled/error states not individually tested. | /customers/:customerId or reference customer panel; see evidence. | Actual click showed dated invoice/payment rows at 1280/768/390. | MISSING | GAP-0002 | REFERENCE_DETAIL_ROW_CLICK_REVIEW.json | High for tested reference behavior; system tab absent. |
| ELM-0566 | SCR-030 | Delete payment row | icon button | 🗑 | v43 SCR-030; see REFERENCE_DETAIL_ROW_CLICK_REVIEW.json | Ask for confirmation then remove/void payment; consequential action. | No matching payment history row in system detail. | Reference detail state opened from a visible list row; test fixture only. | Customer section prompt was accepted with the isolated fixture setting; do not infer production permissions. | Default visible state captured; hover/focus/keyboard/disabled/error states not individually tested. | /customers/:customerId or reference customer panel; see evidence. | Visible in reference payments tab; not clicked because it is destructive. | NOT_VERIFIED |  | REFERENCE_DETAIL_ROW_CLICK_REVIEW.json | High for presence; action not tested. |
| ELM-0567 | SCR-030 | Invoice row in customer file | table row | INV-2026-1041 | v43 SCR-030; see REFERENCE_DETAIL_ROW_CLICK_REVIEW.json | Open selected invoice detail. | System has invoice rows in the invoice list, but no customer-file invoice tab. | Reference detail state opened from a visible list row; test fixture only. | Customer section prompt was accepted with the isolated fixture setting; do not infer production permissions. | Default visible state captured; hover/focus/keyboard/disabled/error states not individually tested. | /customers/:customerId or reference customer panel; see evidence. | Reference invoice row opened SCR-031; system invoice-list row separately opened /invoices/701. | PARTIALLY_IMPLEMENTED | GAP-0002/GAP-0072 | REFERENCE_DETAIL_ROW_CLICK_REVIEW.json; DETAIL_SCREEN_CLICK_REVIEW.json | High for route clicks; customer-file entry point missing in system detail. |
| ELM-0568 | SCR-031 | Register return | button | ↩ تسجيل مرتجع | v43 SCR-031; see REFERENCE_DETAIL_MODAL_REVIEW.json | Open return form; Cancel closes it without saving. | System offers إلغاء الفاتورة, which is a different operation. | Reference detail state opened from a visible list row; test fixture only. | Not specified; not tested. | Default visible state captured; hover/focus/keyboard/disabled/error states not individually tested. | /invoices/:documentId or reference invoice panel; see evidence. | Actual click opened return form and Cancel closed it; Confirm not clicked. | IMPLEMENTED_BUT_FUNCTIONALLY_MISMATCHED | GAP-0072 | REFERENCE_DETAIL_MODAL_REVIEW.json; screenshots/reference/row-click-details/return-modal-1280.png; DETAIL_SCREEN_CLICK_REVIEW.json | High for reference modal and candidate action labels; no return was saved. |
| ELM-0569 | SCR-031 | Edit invoice | button | ✏️ تعديل | v43 SCR-031; see REFERENCE_DETAIL_ROW_CLICK_REVIEW.json | Open invoice edit flow. | Edit invoice control visible on system detail; action not clicked. | Reference detail state opened from a visible list row; test fixture only. | Not specified; not tested. | Default visible state captured; hover/focus/keyboard/disabled/error states not individually tested. | /invoices/:documentId or reference invoice panel; see evidence. | Reference action not activated; source indicates edit can affect stock and customer balance. | NOT_VERIFIED |  | REFERENCE_DETAIL_ROW_CLICK_REVIEW.json; DETAIL_SCREEN_CLICK_REVIEW.json | High for presence; behavior not tested. |
| ELM-0570 | SCR-031 | Return to customer file | button | ← رجوع | v43 SCR-031; see REFERENCE_DETAIL_ROW_CLICK_REVIEW.json | Return to previous customer detail. | System Back control visible; not clicked. | Reference detail state opened from a visible list row; test fixture only. | Not specified; not tested. | Default visible state captured; hover/focus/keyboard/disabled/error states not individually tested. | /invoices/:documentId or reference invoice panel; see evidence. | Actual reference click returned to sec-cust-file. | NOT_VERIFIED |  | REFERENCE_DETAIL_ROW_CLICK_REVIEW.json; DETAIL_SCREEN_CLICK_REVIEW.json | High for reference result; system result not tested. |
| ELM-0571 | SCR-031 | Preview / print invoice | button | معاينة / طباعة | v43 SCR-031; see REFERENCE_DETAIL_ROW_CLICK_REVIEW.json | Open print preview or printing. | System print control visible; not clicked. | Reference detail state opened from a visible list row; test fixture only. | Not specified; not tested. | Default visible state captured; hover/focus/keyboard/disabled/error states not individually tested. | /invoices/:documentId or reference invoice panel; see evidence. | Not activated to avoid opening/triggering a print operation. | NOT_VERIFIED |  | REFERENCE_DETAIL_ROW_CLICK_REVIEW.json; DETAIL_SCREEN_CLICK_REVIEW.json | High for presence; behavior intentionally untested. |
| ELM-0572 | SCR-031 | Delete invoice | button | 🗑 حذف | v43 SCR-031; see REFERENCE_DETAIL_ROW_CLICK_REVIEW.json | Request destructive invoice deletion. | System exposes إلغاء الفاتورة instead; no delete control visible in the candidate screenshot. | Reference detail state opened from a visible list row; test fixture only. | Not specified; not tested. | Default visible state captured; hover/focus/keyboard/disabled/error states not individually tested. | /invoices/:documentId or reference invoice panel; see evidence. | Not clicked because destructive. | MISSING | GAP-0072 | REFERENCE_DETAIL_ROW_CLICK_REVIEW.json; DETAIL_SCREEN_CLICK_REVIEW.json | High for visible control difference; deletion semantics not tested. |
| ELM-0573 | SCR-016 | Movement reference row link | row link | INV-2026-1042 / RET-2026-001 | v43 SCR-016; see REFERENCE_DETAIL_ROW_CLICK_REVIEW.json | Open movement detail for selected reference. | Movement table has no link, button, or role=button in its rows. | Reference detail state opened from a visible list row; test fixture only. | Not specified; not tested. | Default visible state captured; hover/focus/keyboard/disabled/error states not individually tested. | /inventory/movements; reference row link exists. | Reference link opened SCR-053 at 1280/768/390; system row click stayed on /inventory/movements at 1280 and did not expose a control at all viewports. | MISSING | GAP-0073 | REFERENCE_DETAIL_ROW_CLICK_REVIEW.json; SYSTEM_MOVEMENT_CLICK_REVIEW.json | High for the observed UI route/control absence; backend unverified. |
| ELM-0574 | SCR-053 | Return to movement list | button | رجوع لحركة المخزون | v43 SCR-053; see REFERENCE_DETAIL_ROW_CLICK_REVIEW.json | Return to the movement list. | System movement-detail screen does not exist in the observed UI. | Reference detail state opened from a visible list row; test fixture only. | Not specified; not tested. | Default visible state captured; hover/focus/keyboard/disabled/error states not individually tested. | Reference panel only; no system detail route found. | Actual reference click returned to sec-movements at all three viewports. | MISSING | GAP-0073 | REFERENCE_DETAIL_ROW_CLICK_REVIEW.json; SYSTEM_MOVEMENT_CLICK_REVIEW.json | High for reference behavior and missing system detail UI. |
| ELM-0575 | SCR-030 | Close payment modal | button | ✕ | v43 SCR-030; see REFERENCE_DETAIL_MODAL_REVIEW.json | Close payment modal without submitting. | Payment modal action not available on system customer detail. | Reference detail state opened from a visible list row; test fixture only. | Customer section prompt was accepted with the isolated fixture setting; do not infer production permissions. | Default visible state captured; hover/focus/keyboard/disabled/error states not individually tested. | /customers/:customerId or reference customer panel; see evidence. | Present in modal; not the control used to close during audit. | NOT_VERIFIED |  | REFERENCE_DETAIL_MODAL_REVIEW.json | High for presence; click not separately exercised. |
| ELM-0576 | SCR-030 | Create customer from payment modal | button | ＋ عميل | v43 SCR-030; see REFERENCE_DETAIL_MODAL_REVIEW.json | Open new-customer form from payment modal. | No equivalent modal on system customer detail. | Reference detail state opened from a visible list row; test fixture only. | Customer section prompt was accepted with the isolated fixture setting; do not infer production permissions. | Default visible state captured; hover/focus/keyboard/disabled/error states not individually tested. | /customers/:customerId or reference customer panel; see evidence. | Present in modal; not clicked. | NOT_VERIFIED |  | REFERENCE_DETAIL_MODAL_REVIEW.json | High for presence; action not tested. |
| ELM-0577 | SCR-030 | Cancel payment modal | button | إلغاء | v43 SCR-030; see REFERENCE_DETAIL_MODAL_REVIEW.json | Close payment modal without writing a payment. | No equivalent modal on system customer detail. | Reference detail state opened from a visible list row; test fixture only. | Customer section prompt was accepted with the isolated fixture setting; do not infer production permissions. | Default visible state captured; hover/focus/keyboard/disabled/error states not individually tested. | /customers/:customerId or reference customer panel; see evidence. | Actual click closed the modal; no submit/save occurred. | IMPLEMENTED_AND_VERIFIED |  | REFERENCE_DETAIL_MODAL_REVIEW.json; payment-modal-1280.png | High; read-only open/cancel verified. |
| ELM-0578 | SCR-030 | Confirm payment | button | تأكيد الدفعة | v43 SCR-030; see REFERENCE_DETAIL_MODAL_REVIEW.json | Validate and save a payment to customer and cashbox. | No equivalent modal on system customer detail. | Reference detail state opened from a visible list row; test fixture only. | Customer section prompt was accepted with the isolated fixture setting; do not infer production permissions. | Default visible state captured; hover/focus/keyboard/disabled/error states not individually tested. | /customers/:customerId or reference customer panel; see evidence. | Not clicked; would modify financial state. | NOT_VERIFIED |  | REFERENCE_DETAIL_MODAL_REVIEW.json | High for presence; data-changing submit intentionally not tested. |
| ELM-0579 | SCR-030 | Payment customer field | select | العميل * | v43 SCR-030; see REFERENCE_DETAIL_MODAL_REVIEW.json | Select the customer receiving payment. | No equivalent modal on system customer detail. | Dialog opened from the matching reference detail screen; test fixture only. | Customer section prompt was accepted with the isolated fixture setting; do not infer production permissions. | Default/value captured; validation, focus, keyboard, error and submission states not tested. | /customers/:customerId or reference customer panel; see evidence. | Modal showed c101 preselected. No value changed or submitted. | NOT_VERIFIED |  | REFERENCE_DETAIL_MODAL_REVIEW.json; payment-modal-1280.png | High for field presence; validation not tested. |
| ELM-0580 | SCR-030 | Payment method field | select | طريقة الدفع | v43 SCR-030; see REFERENCE_DETAIL_MODAL_REVIEW.json | Choose cash, bank transfer, or cheque. | No equivalent modal on system customer detail. | Dialog opened from the matching reference detail screen; test fixture only. | Customer section prompt was accepted with the isolated fixture setting; do not infer production permissions. | Default/value captured; validation, focus, keyboard, error and submission states not tested. | /customers/:customerId or reference customer panel; see evidence. | Modal showed cash by default. No value changed or submitted. | NOT_VERIFIED |  | REFERENCE_DETAIL_MODAL_REVIEW.json; payment-modal-1280.png | High for field/options visible; validation not tested. |
| ELM-0581 | SCR-030 | Cashbox field | select | الخزينة | v43 SCR-030; see REFERENCE_DETAIL_MODAL_REVIEW.json | Choose the cashbox/bank account receiving payment. | No equivalent modal on system customer detail. | Dialog opened from the matching reference detail screen; test fixture only. | Customer section prompt was accepted with the isolated fixture setting; do not infer production permissions. | Default/value captured; validation, focus, keyboard, error and submission states not tested. | /customers/:customerId or reference customer panel; see evidence. | Modal showed main cashbox by default. No value changed or submitted. | NOT_VERIFIED |  | REFERENCE_DETAIL_MODAL_REVIEW.json; payment-modal-1280.png | High for field presence; submit not tested. |
| ELM-0582 | SCR-030 | Payment amount field | number input | المبلغ * | v43 SCR-030; see REFERENCE_DETAIL_MODAL_REVIEW.json | Enter a positive amount to collect. | No equivalent modal on system customer detail. | Dialog opened from the matching reference detail screen; test fixture only. | Customer section prompt was accepted with the isolated fixture setting; do not infer production permissions. | Default/value captured; validation, focus, keyboard, error and submission states not tested. | /customers/:customerId or reference customer panel; see evidence. | Modal prefilled 18,500 from the reference fixture. No value changed or submitted. | NOT_VERIFIED |  | REFERENCE_DETAIL_MODAL_REVIEW.json; payment-modal-1280.png | High for field presence; constraints/submit not tested. |
| ELM-0583 | SCR-030 | Payment date field | disabled text input | التاريخ (تلقائي) | v43 SCR-030; see REFERENCE_DETAIL_MODAL_REVIEW.json | Display the automatically selected payment date. | No equivalent modal on system customer detail. | Dialog opened from the matching reference detail screen; test fixture only. | Customer section prompt was accepted with the isolated fixture setting; do not infer production permissions. | Default/value captured; validation, focus, keyboard, error and submission states not tested. | /customers/:customerId or reference customer panel; see evidence. | Disabled field displayed the local test date/time. | NOT_VERIFIED |  | REFERENCE_DETAIL_MODAL_REVIEW.json; payment-modal-1280.png | High for visible state; timezone/business rule not tested. |
| ELM-0584 | SCR-031 | Confirm return | button | تأكيد المرتجع | v43 SCR-031; see REFERENCE_DETAIL_MODAL_REVIEW.json | Validate and create return, restore stock, update customer balance. | No matching return form on system detail. | Reference detail state opened from a visible list row; test fixture only. | Not specified; not tested. | Default visible state captured; hover/focus/keyboard/disabled/error states not individually tested. | /invoices/:documentId or reference invoice panel; see evidence. | Not clicked; it would alter inventory and customer financial state. | NOT_VERIFIED |  | REFERENCE_DETAIL_MODAL_REVIEW.json | High for presence; write action intentionally not tested. |
| ELM-0585 | SCR-031 | Cancel return modal | button | إلغاء | v43 SCR-031; see REFERENCE_DETAIL_MODAL_REVIEW.json | Close return modal without saving. | No matching return form on system detail. | Reference detail state opened from a visible list row; test fixture only. | Not specified; not tested. | Default visible state captured; hover/focus/keyboard/disabled/error states not individually tested. | /invoices/:documentId or reference invoice panel; see evidence. | Actual click removed the dialog; no return was created. | IMPLEMENTED_AND_VERIFIED |  | REFERENCE_DETAIL_MODAL_REVIEW.json; return-modal-1280.png | High; read-only open/cancel verified. |
| ELM-0586 | SCR-031 | Return product field | select | المنتج | v43 SCR-031; see REFERENCE_DETAIL_MODAL_REVIEW.json | Select an invoice item and show its returnable quantity. | No matching return form on system detail. | Dialog opened from the matching reference detail screen; test fixture only. | Not specified; not tested. | Default/value captured; validation, focus, keyboard, error and submission states not tested. | /invoices/:documentId or reference invoice panel; see evidence. | Modal listed the invoice item and available quantity 12. | NOT_VERIFIED |  | REFERENCE_DETAIL_MODAL_REVIEW.json; return-modal-1280.png | High for presence/options; validation not tested. |
| ELM-0587 | SCR-031 | Return quantity field | number input | الكمية | v43 SCR-031; see REFERENCE_DETAIL_MODAL_REVIEW.json | Enter a positive quantity within remaining returnable units. | No matching return form on system detail. | Dialog opened from the matching reference detail screen; test fixture only. | Not specified; not tested. | Default/value captured; validation, focus, keyboard, error and submission states not tested. | /invoices/:documentId or reference invoice panel; see evidence. | Default quantity 1; source includes a quantity bound check; no submit. | NOT_VERIFIED |  | REFERENCE_DETAIL_MODAL_REVIEW.json; return-modal-1280.png | High for visible constraints; submit not tested. |
| ELM-0588 | SCR-031 | Return warehouse field | select | إلى أي مخزن تريد إرجاع المنتج؟ | v43 SCR-031; see REFERENCE_DETAIL_MODAL_REVIEW.json | Choose the destination warehouse. | No matching return form on system detail. | Dialog opened from the matching reference detail screen; test fixture only. | Not specified; not tested. | Default/value captured; validation, focus, keyboard, error and submission states not tested. | /invoices/:documentId or reference invoice panel; see evidence. | Modal listed five warehouses and selected the main warehouse. | NOT_VERIFIED |  | REFERENCE_DETAIL_MODAL_REVIEW.json; return-modal-1280.png | High for field/options visible; submit not tested. |
| ELM-0589 | SCR-031 | Repair type field | select | نوع الإصلاح | v43 SCR-031; see REFERENCE_DETAIL_MODAL_REVIEW.json | Choose no repair, company repair, or customer repair. | No matching return form on system detail. | Dialog opened from the matching reference detail screen; test fixture only. | Not specified; not tested. | Default/value captured; validation, focus, keyboard, error and submission states not tested. | /invoices/:documentId or reference invoice panel; see evidence. | Modal showed three options; conditional behavior not tested. | NOT_VERIFIED |  | REFERENCE_DETAIL_MODAL_REVIEW.json; return-modal-1280.png | High for visible options; conditional states unverified. |
| ELM-0590 | SCR-031 | Return reason field | text input | سبب الإصلاح / المرتجع | v43 SCR-031; see REFERENCE_DETAIL_MODAL_REVIEW.json | Enter the reason for return/repair. | No matching return form on system detail. | Dialog opened from the matching reference detail screen; test fixture only. | Not specified; not tested. | Default/value captured; validation, focus, keyboard, error and submission states not tested. | /invoices/:documentId or reference invoice panel; see evidence. | Empty input visible; validation not submitted. | NOT_VERIFIED |  | REFERENCE_DETAIL_MODAL_REVIEW.json; return-modal-1280.png | High for presence; validation not tested. |
| ELM-0591 | SCR-031 | Repair cost field | conditional number input | تكلفة الإصلاح | v43 SCR-031; see REFERENCE_DETAIL_MODAL_REVIEW.json | Enter repair cost when customer repair is selected. | No matching return form on system detail. | Dialog opened from the matching reference detail screen; test fixture only. | Not specified; not tested. | Default/value captured; validation, focus, keyboard, error and submission states not tested. | /invoices/:documentId or reference invoice panel; see evidence. | Conditional field is hidden by default; condition was not activated. | NOT_VERIFIED |  | REFERENCE_DETAIL_MODAL_REVIEW.json; return-modal-1280.png | High for source/DOM presence; conditional state unverified. |
| ELM-0592 | SCR-031 | Repair amount paid field | conditional number input | المبلغ المدفوع للإصلاح | v43 SCR-031; see REFERENCE_DETAIL_MODAL_REVIEW.json | Enter amount already paid when customer repair applies. | No matching return form on system detail. | Dialog opened from the matching reference detail screen; test fixture only. | Not specified; not tested. | Default/value captured; validation, focus, keyboard, error and submission states not tested. | /invoices/:documentId or reference invoice panel; see evidence. | Conditional field is hidden by default; condition was not activated. | NOT_VERIFIED |  | REFERENCE_DETAIL_MODAL_REVIEW.json; return-modal-1280.png | High for source/DOM presence; conditional state unverified. |

<a id="04-feature-inventory"></a>

# 04 — جرد الميزات

هذه 44 مساحة ميزة محددة من UI_SPEC ومرجع v43 ومسارات النظام. حالة المصدر لا تعني نجاح runtime؛ لا توجد طلبات API أو عمليات حفظ مختبرة في هذا التدقيق. الصلاحيات التفصيلية يجب أن تُقرأ من PermissionGate وعقود الخادم، ولم تُختبر بحسابات حية.

| Feature ID | الميزة | المرجع/الشاشة | السلوك المتوقع | الصلاحيات/التبعيات | حالة المصدر | Gap | Flow |
|---|---|---|---|---|---|---|---|
| F-001 | تسجيل الدخول والجلسة | SCR-000 | فتح جلسة مستخدم وإظهار وجهة مسموحة | AuthProvider وصلاحيات الخادم | NOT_VERIFIED | — | FLOW-001 |
| F-002 | لوحة التحكم | SCR-001 | مؤشرات ورسوم وتنبيهات ونشاط من الخادم | API تقارير ولوحة أدوار | PARTIALLY_IMPLEMENTED | GAP-0020 | FLOW-001 |
| F-003 | قائمة العملاء وCRUD | SCR-002 | بحث وفلاتر وصفحات وبيانات عميل | customers permissions وSales API | NOT_VERIFIED | — | FLOW-002 |
| F-004 | ملف العميل وتاريخه | SCR-030 | ملخص وطلبات وفواتير ومدفوعات وكشف | Customer API وتقارير | PARTIALLY_IMPLEMENTED | GAP-0002 | FLOW-002 |
| F-005 | كشف حساب العميل | SCR-041/049 | قائمة حركة ورصيد موثوقان | Reports API وصلاحية كشف الحساب | NOT_VERIFIED | — | FLOW-002 |
| F-006 | تصفية العميل | SCR-055 | ملخص قراءة فقط من بيانات العميل | CustomerLiquidation API | NOT_VERIFIED | — | FLOW-002 |
| F-007 | قائمة الطلبات | SCR-003 | بحث وتصفية حالة وفتح التفاصيل | Orders API | NOT_VERIFIED | — | FLOW-003 |
| F-008 | إنشاء وتأكيد الطلب | SCR-004/005 | معاينة خادمية ومسودة وتأكيد | OrdersService والمخزون | NOT_VERIFIED | — | FLOW-003 |
| F-009 | حجز مخزون الطلب | SCR-005 | حفظ الحجز وعرضه وتحريره عند التحول | قرار D8 والمخزون | PARTIALLY_IMPLEMENTED | GAP-0001 | FLOW-003 |
| F-010 | فواتير البيع وتعديلها وطباعتها | SCR-006/007/008/031 | إنشاء وإصدار ومراجعة وطباعة | Sales API وصلاحيات المستندات | PARTIALLY_IMPLEMENTED | GAP-0033/GAP-0072 | FLOW-003 |
| F-011 | التحصيل والتخصيص والعكس | SCR-009/035 | قبض وربط بالفواتير ومراجعة | Sales API والخزينة | NOT_VERIFIED | — | FLOW-006 |
| F-012 | مرتجعات المبيعات | SCR-012/013 | مرتجع مرتبط أو حر ومعاينة وحفظ | Sales API ومخزون | PARTIALLY_IMPLEMENTED | GAP-0004 | FLOW-005 |
| F-013 | التسليمات | SCR-010/011 | اختيار مصدر وسائق وبيانات التسليم وتغيير الحالة | Orders API | NOT_VERIFIED | — | FLOW-003 |
| F-014 | المنتجات والفئات والباركود | SCR-014 | إدارة الكتالوج والرموز والبحث | Catalog API | NOT_VERIFIED | — | FLOW-004 |
| F-015 | المخازن | SCR-026 | مواقع التخزين وربط أرصدتها | Inventory API | NOT_VERIFIED | — | FLOW-004 |
| F-016 | رصيد وحركات المخزون | SCR-015/SCR-016/SCR-053 | عرض الكميات والحركات والتفاصيل ومصدرها | Inventory API | PARTIALLY_IMPLEMENTED | GAP-0061/GAP-0062/GAP-0073 | FLOW-004 |
| F-017 | التسويات والافتتاحي والتحويل | SCR-016/027 | تسجيل حركة مخزون موثقة | Inventory API وصلاحيات | NOT_VERIFIED | — | FLOW-004 |
| F-018 | الحد الأدنى والجرد والتالف ومرتجع المخزن | SCR-028 وملاحق | إعداد حدود وجرد واعتماد وإرجاع | Inventory API | NOT_VERIFIED | — | FLOW-004 |
| F-019 | إدخال الحاوية | SCR-018 | إنشاء الحاوية ومحتواها وحالتها | Containers API | NOT_VERIFIED | — | FLOW-004 |
| F-020 | استلام الحاوية | SCR-020 | استلام موثق وربط الكميات بالمواقع | Containers API | NOT_VERIFIED | — | FLOW-004 |
| F-021 | التكلفة الفعلية للحاوية | SCR-021 | إدخال وتوزيع التكلفة وفق أساس | Costs API وقاعدة التكلفة | NOT_VERIFIED | — | FLOW-004 |
| F-022 | تحويل الحاويات وأموالها | SCR-050/052 | تسجيل تحويلات ومبالغ مرتبطة | Container Ledger API | NOT_VERIFIED | — | FLOW-006 |
| F-023 | الخزينة والوارد والصادر والتحويل | SCR-037/039/040 | حركات مالية وأرصدة الحسابات | Treasury API | NOT_VERIFIED | — | FLOW-006 |
| F-024 | المصروفات وتصنيفاتها | SCR-038 | تسجيل المصروف ومراجعته | Expenses API | NOT_VERIFIED | — | FLOW-006 |
| F-025 | العملات وأسعار الصرف | المالية | إدارة القيم المرجعية | Currencies API | NOT_VERIFIED | — | FLOW-006 |
| F-026 | الشركاء ودفعاتهم والمشتريات | المالية | حسابات الشريك والدفعات وفواتير الشراء | APIs للمجالات | NOT_VERIFIED | — | FLOW-006 |
| F-027 | مركز التقارير وفهرس الفئات | SCR-019 | قائمة تقارير حسب الفئة والصلاحية | أسماء وواجهات كل تقرير | PARTIALLY_IMPLEMENTED | GAP-0019 | FLOW-007 |
| F-028 | تقارير المبيعات والربح والمخزون والعميل والحاوية | SCR-023/024/027/041/048 | نتائج قابلة للتصفية من الخادم | ReportsService | NOT_VERIFIED | — | FLOW-007 |
| F-029 | دليل الحسابات | SCR-044 | قراءة وإدارة شجرة الحسابات | COA API وجداول موجودة | UI_ONLY | GAP-0005 | FLOW-007 |
| F-030 | التسويات المالية | SCR-054 | تسوية موثقة ومراجعة أثرها | قواعد محاسبية وعقد API | UI_ONLY | GAP-0006 | FLOW-007 |
| F-031 | قيود اليومية | SCR-045 | قيد متوازن مع ترحيل وعكس | جداول journal موجودة؛ API ناقص | MISSING | GAP-0007 | FLOW-007 |
| F-032 | دفتر الأستاذ | SCR-046 | حركات الحساب ورصيد الفترة | قيود مرحّلة وendpoint | MISSING | GAP-0008 | FLOW-007 |
| F-033 | ميزان المراجعة | SCR-047 | مجموع مدين/دائن قابل للمطابقة | قيود مرحّلة وendpoint | MISSING | GAP-0009 | FLOW-007 |
| F-034 | قائمة الدخل والمركز المالي والتدفقات | SCR-048 | قوائم مالية بفترة وتفاصيل | حسابات/قيود وتعريف محاسبي | PARTIALLY_IMPLEMENTED | GAP-0010 | FLOW-007 |
| F-035 | الأموال المنتظرة | المالية | متابعة المصدر والاستحقاق والتحصيل | تعريفات عمل وسياسة التسوية | MISSING | GAP-0011 | FLOW-006 |
| F-036 | أقساط الشركاء | المالية | جدولة المستحق والمدفوع والمتبقي | قواعد الشركاء | MISSING | GAP-0012 | FLOW-006 |
| F-037 | ميزانية المصروفات | SCR-056 | مقارنة الفعلي بالمخطط | فترة وتصنيف وموافقة | MISSING | GAP-0013 | FLOW-006 |
| F-038 | المصروفات المتكررة | SCR-057 | جدولة ثم مراجعة/تسجيل دوري | تكرار ومنع الازدواج | MISSING | GAP-0014 | FLOW-006 |
| F-039 | مقارنة شهر بشهر | SCR-058 | مقارنة فترتين وفروق المقاييس | تعريف المقاييس | MISSING | GAP-0015 | FLOW-007 |
| F-040 | توقع السيولة | SCR-059 | فصل المتوقع عن الفعلي مع مصدر | منهجية معتمدة | MISSING | GAP-0016 | FLOW-007 |
| F-041 | المستخدمون والإعدادات والتدقيق والسلة وPWA | SCR-025/029/032/033 | إدارة وأمن وإعدادات واستعادة | Admin APIs وصلاحيات | PARTIALLY_IMPLEMENTED | GAP-0021/GAP-0022 | FLOW-009 |
| F-042 | استيراد بيانات وملخص يومي | أدوات البيانات | معاينة واستيراد ونتيجة ثم ملخص | Import API وواجهات المستخدم | UI_ONLY | GAP-0017 | FLOW-008 |
| F-043 | مرفقات العميل | SCR-002 | رفع وعرض ملفات مرتبطة بعميل | تخزين وملكية وصلاحيات | MISSING | GAP-0003 | FLOW-002 |
| F-044 | نسخ احتياطي واستعادة من الويب | SCR-025 | عرض وتشغيل محكوم لعملية النسخ | عمليات موجودة CLI؛ واجهة ويب ناقصة | MISSING | GAP-0018 | FLOW-010 |

### قواعد قراءة الحالة

- NOT_VERIFIED: وجود الكود أو المسار لا يكفي لإثبات سلوك المنتج؛ لم يجر اختبار runtime.
- PARTIALLY_IMPLEMENTED: يوجد جزء مصدره واضح وتوجد فجوة محددة.
- UI_ONLY: توجد وجهة انتظار أو أداة واجهة نموذجية لا تقدم الوظيفة المتوقعة.
- MISSING: الوظيفة المحددة غير موجودة في واجهة الويب/API التي أمكن تتبعها.
- لم يُفحص backend/DB حيًا؛ جدول schema لا يثبت اكتمال business logic.

<a id="05-feature-gap-matrix"></a>

# 05 — مصفوفة فجوات الميزات

| Feature ID | Module | Feature Name | Design Reference | Screen IDs | Expected Behavior | Frontend Evidence | Backend Evidence | Database Evidence | Status | Gap IDs | Priority | Confidence | Verification Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| F-001 | Auth | تسجيل الدخول والجلسة | SCR-000 | SCR-000 | فتح جلسة مستخدم وإظهار وجهة مسموحة | Candidate route/component mapped; actual behavior not exercised. | Check report 08 for matched routes/controllers; no API request was executed. | Static schema artifacts only; no live DB query. See report 08. | NOT_VERIFIED | GAP-0028 | - | Medium; mapped source exists but behavior not verified | Source-only comparison; no browser/API/database execution. |
| F-002 | Dashboard | لوحة التحكم | SCR-001 | SCR-001 | مؤشرات ورسوم وتنبيهات ونشاط من الخادم | Source contains the partial flow identified in gap register; runtime unverified. | Check report 08 for matched routes/controllers; no API request was executed. | Static schema artifacts only; no live DB query. See report 08. | PARTIALLY_IMPLEMENTED | GAP-0027/GAP-0031 | P2 | High for cited source state; runtime not verified | Source-only comparison; no browser/API/database execution. |
| F-003 | Customers | قائمة العملاء وCRUD | SCR-002 | SCR-002 | بحث وفلاتر وصفحات وبيانات عميل | Candidate route/component mapped; actual behavior not exercised. | Check report 08 for matched routes/controllers; no API request was executed. | Static schema artifacts only; no live DB query. See report 08. | NOT_VERIFIED | GAP-0036 | - | Medium; mapped source exists but behavior not verified | Source-only comparison; no browser/API/database execution. |
| F-004 | Customers | ملف العميل وتاريخه | SCR-030 | SCR-030 | ملخص وطلبات وفواتير ومدفوعات وكشف | Source contains the partial flow identified in gap register; runtime unverified. | Check report 08 for matched routes/controllers; no API request was executed. | Static schema artifacts only; no live DB query. See report 08. | PARTIALLY_IMPLEMENTED | GAP-0002 | P2 | High for cited source state; runtime not verified | Source-only comparison; no browser/API/database execution. |
| F-005 | Customers | كشف حساب العميل | SCR-041/049 | SCR-041/049 | قائمة حركة ورصيد موثوقان | Candidate route/component mapped; actual behavior not exercised. | Check report 08 for matched routes/controllers; no API request was executed. | Static schema artifacts only; no live DB query. See report 08. | NOT_VERIFIED |  | - | Medium; mapped source exists but behavior not verified | Source-only comparison; no browser/API/database execution. |
| F-006 | Customers | تصفية العميل | SCR-055 | SCR-055 | ملخص قراءة فقط من بيانات العميل | Candidate route/component mapped; actual behavior not exercised. | Check report 08 for matched routes/controllers; no API request was executed. | Static schema artifacts only; no live DB query. See report 08. | NOT_VERIFIED |  | - | Medium; mapped source exists but behavior not verified | Source-only comparison; no browser/API/database execution. |
| F-007 | Sales | قائمة الطلبات | SCR-003 | SCR-003 | بحث وتصفية حالة وفتح التفاصيل | Candidate route/component mapped; actual behavior not exercised. | Check report 08 for matched routes/controllers; no API request was executed. | Static schema artifacts only; no live DB query. See report 08. | NOT_VERIFIED | GAP-0032 | - | Medium; mapped source exists but behavior not verified | Source-only comparison; no browser/API/database execution. |
| F-008 | Sales | إنشاء وتأكيد الطلب | SCR-004/005 | SCR-004/005 | معاينة خادمية ومسودة وتأكيد | Candidate route/component mapped; actual behavior not exercised. | Check report 08 for matched routes/controllers; no API request was executed. | Static schema artifacts only; no live DB query. See report 08. | NOT_VERIFIED | GAP-0030 | - | Medium; mapped source exists but behavior not verified | Source-only comparison; no browser/API/database execution. |
| F-009 | Inventory | حجز مخزون الطلب | SCR-005 | SCR-005 | حفظ الحجز وعرضه وتحريره عند التحول | Source contains the partial flow identified in gap register; runtime unverified. | Check report 08 for matched routes/controllers; no API request was executed. | Static schema artifacts only; no live DB query. See report 08. | PARTIALLY_IMPLEMENTED | GAP-0070 | P1 | High for cited source state; runtime not verified | Source-only comparison; no browser/API/database execution. |
| F-010 | Sales | فواتير البيع وتعديلها وطباعتها | SCR-006/007/008/031 | SCR-006/SCR-007/SCR-008/SCR-031 | إنشاء وإصدار ومراجعة وطباعة | Actual visible customer/invoice list clicks opened the invoice detail at 1280/768/390 in isolated React/MSW. Detail screenshots show a confirmed reference composition mismatch and item details unavailable for this fixture; status text differs. Backend/API was not invoked. | Check report 08 for matched routes/controllers; no API request was executed. | Static schema artifacts only; no live DB query. See report 08. | PARTIALLY_IMPLEMENTED | GAP-0033/GAP-0072 | - | High for UI route and visual mismatch; backend and persistence not verified | Reference row-click pair review; no save/edit/payment action executed. |
| F-011 | Finance | التحصيل والتخصيص والعكس | SCR-009/035 | SCR-009/035 | قبض وربط بالفواتير ومراجعة | Candidate route/component mapped; actual behavior not exercised. | Check report 08 for matched routes/controllers; no API request was executed. | Static schema artifacts only; no live DB query. See report 08. | NOT_VERIFIED | GAP-0040 | - | Medium; mapped source exists but behavior not verified | Source-only comparison; no browser/API/database execution. |
| F-012 | Sales | مرتجعات المبيعات | SCR-012/013 | SCR-012/013 | مرتجع مرتبط أو حر ومعاينة وحفظ | Source contains the partial flow identified in gap register; runtime unverified. | Check report 08 for matched routes/controllers; no API request was executed. | Static schema artifacts only; no live DB query. See report 08. | PARTIALLY_IMPLEMENTED | GAP-0035 | P2 | High for cited source state; runtime not verified | Source-only comparison; no browser/API/database execution. |
| F-013 | Sales | التسليمات | SCR-010/011 | SCR-010/011 | اختيار مصدر وسائق وبيانات التسليم وتغيير الحالة | Candidate route/component mapped; actual behavior not exercised. | Check report 08 for matched routes/controllers; no API request was executed. | Static schema artifacts only; no live DB query. See report 08. | NOT_VERIFIED | GAP-0041 | - | Medium; mapped source exists but behavior not verified | Source-only comparison; no browser/API/database execution. |
| F-014 | Catalog | المنتجات والفئات والباركود | SCR-014 | SCR-014/SCR-063/SCR-064 | إدارة الكتالوج والرموز والبحث | Runtime screenshot and click evidence in docs/ux-inventory; نقرة رابط تكلفة المنتج فتحت السجل؛ لم يظهر تحكم باركود/ملصقات. الصور: round5-product-cost-history وround5-barcode-labels. | Check report 08 for matched routes/controllers; no API request was executed. | Static schema artifacts only; no live DB query. See report 08. | PARTIALLY_IMPLEMENTED | GAP-0038/GAP-0055/GAP-0056 | - | Medium; mapped source exists but behavior not verified | Source-only comparison; no browser/API/database execution. نقرة رابط تكلفة المنتج فتحت السجل؛ لم يظهر تحكم باركود/ملصقات. الصور: round5-product-cost-history وround5-barcode-labels. |
| F-015 | Inventory | المخازن | SCR-026 | SCR-023 | مواقع التخزين وربط أرصدتها | Runtime screenshot and click evidence in docs/ux-inventory; تصحيح Screen ID: المخازن SCR-023؛ SCR-026 هي المحافظات. المقارنة تثبت شكلًا فقط. | Check report 08 for matched routes/controllers; no API request was executed. | Static schema artifacts only; no live DB query. See report 08. | NOT_VERIFIED | GAP-0043 | - | Medium; mapped source exists but behavior not verified | Source-only comparison; no browser/API/database execution. تصحيح Screen ID: المخازن SCR-023؛ SCR-026 هي المحافظات. المقارنة تثبت شكلًا فقط. |
| F-016 | Inventory | رصيد وحركات المخزون | SCR-015/016 | SCR-015/SCR-016/SCR-053 | عرض الكميات والحركات ومصدرها | Inventory movement list reached by visible global-search click. At all three viewports table rows have zero links/buttons/role=button; 1280 row click kept the route unchanged. Reference detail opened through an actual row-reference click at 1280/768/390. | Check report 08 for matched routes/controllers; no API request was executed. | Static schema artifacts only; no live DB query. See report 08. | PARTIALLY_IMPLEMENTED | GAP-0061/GAP-0062/GAP-0073 | - | High for list and missing detail UI; backend support not verified | See REFERENCE_DETAIL_ROW_CLICK_REVIEW.json and SYSTEM_MOVEMENT_CLICK_REVIEW.json. |
| F-017 | Inventory | التسويات والافتتاحي والتحويل | SCR-016/027 | SCR-016/027 | تسجيل حركة مخزون موثقة | Candidate route/component mapped; actual behavior not exercised. | Check report 08 for matched routes/controllers; no API request was executed. | Static schema artifacts only; no live DB query. See report 08. | NOT_VERIFIED | GAP-0062 | - | Medium; mapped source exists but behavior not verified | Source-only comparison; no browser/API/database execution. |
| F-018 | Inventory | الحد الأدنى والجرد والتالف ومرتجع المخزن | SCR-028 وملاحق | SCR-028/SCR-051/SCR-061/SCR-062 | إعداد حدود وجرد واعتماد وإرجاع | Runtime screenshot and click evidence in docs/ux-inventory; SCR-028 مرشحها /warehouse-returns لكن تطابقها مع SCR-051 غير محسوم. | Check report 08 for matched routes/controllers; no API request was executed. | Static schema artifacts only; no live DB query. See report 08. | PARTIALLY_IMPLEMENTED | GAP-0050/GAP-0052/GAP-0053/GAP-0058 | - | Medium; mapped source exists but behavior not verified | Source-only comparison; no browser/API/database execution. SCR-028 مرشحها /warehouse-returns لكن تطابقها مع SCR-051 غير محسوم. |
| F-019 | Containers | إدخال الحاوية | SCR-018 | SCR-018 | إنشاء الحاوية ومحتواها وحالتها | Candidate route/component mapped; actual behavior not exercised. | Check report 08 for matched routes/controllers; no API request was executed. | Static schema artifacts only; no live DB query. See report 08. | NOT_VERIFIED | GAP-0037 | - | Medium; mapped source exists but behavior not verified | Source-only comparison; no browser/API/database execution. |
| F-020 | Containers | استلام الحاوية | SCR-020 | SCR-020 | استلام موثق وربط الكميات بالمواقع | Candidate route/component mapped; actual behavior not exercised. | Check report 08 for matched routes/controllers; no API request was executed. | Static schema artifacts only; no live DB query. See report 08. | NOT_VERIFIED | GAP-0065 | - | Medium; mapped source exists but behavior not verified | Source-only comparison; no browser/API/database execution. |
| F-021 | Containers | التكلفة الفعلية للحاوية | SCR-021 | SCR-021 | إدخال وتوزيع التكلفة وفق أساس | Candidate route/component mapped; actual behavior not exercised. | Check report 08 for matched routes/controllers; no API request was executed. | Static schema artifacts only; no live DB query. See report 08. | NOT_VERIFIED | GAP-0064 | - | Medium; mapped source exists but behavior not verified | Source-only comparison; no browser/API/database execution. |
| F-022 | Containers/Finance | تحويل الحاويات وأموالها | SCR-050/052 | SCR-050/052 | تسجيل تحويلات ومبالغ مرتبطة | Candidate route/component mapped; actual behavior not exercised. | Check report 08 for matched routes/controllers; no API request was executed. | Static schema artifacts only; no live DB query. See report 08. | NOT_VERIFIED | GAP-0059 | - | Medium; mapped source exists but behavior not verified | Source-only comparison; no browser/API/database execution. |
| F-023 | Finance | الخزينة والوارد والصادر والتحويل | SCR-037/039/040 | SCR-037/039/040 | حركات مالية وأرصدة الحسابات | Candidate route/component mapped; actual behavior not exercised. | Check report 08 for matched routes/controllers; no API request was executed. | Static schema artifacts only; no live DB query. See report 08. | NOT_VERIFIED |  | - | Medium; mapped source exists but behavior not verified | Source-only comparison; no browser/API/database execution. |
| F-024 | Finance | المصروفات وتصنيفاتها | SCR-038 | SCR-038 | تسجيل المصروف ومراجعته | Candidate route/component mapped; actual behavior not exercised. | Check report 08 for matched routes/controllers; no API request was executed. | Static schema artifacts only; no live DB query. See report 08. | NOT_VERIFIED |  | - | Medium; mapped source exists but behavior not verified | Source-only comparison; no browser/API/database execution. |
| F-025 | Finance | العملات وأسعار الصرف | المالية | المالية | إدارة القيم المرجعية | Candidate route/component mapped; actual behavior not exercised. | Check report 08 for matched routes/controllers; no API request was executed. | Static schema artifacts only; no live DB query. See report 08. | NOT_VERIFIED |  | - | Medium; mapped source exists but behavior not verified | Source-only comparison; no browser/API/database execution. |
| F-026 | Purchases/Partners | الشركاء ودفعاتهم والمشتريات | المالية | المالية | حسابات الشريك والدفعات وفواتير الشراء | Candidate route/component mapped; actual behavior not exercised. | Check report 08 for matched routes/controllers; no API request was executed. | Static schema artifacts only; no live DB query. See report 08. | NOT_VERIFIED |  | - | Medium; mapped source exists but behavior not verified | Source-only comparison; no browser/API/database execution. |
| F-027 | Reports | مركز التقارير وفهرس الفئات | SCR-019 | SCR-019 | قائمة تقارير حسب الفئة والصلاحية | Source contains the partial flow identified in gap register; runtime unverified. | Check report 08 for matched routes/controllers; no API request was executed. | Static schema artifacts only; no live DB query. See report 08. | PARTIALLY_IMPLEMENTED | GAP-0039 | P2 | High for cited source state; runtime not verified | Source-only comparison; no browser/API/database execution. |
| F-028 | Reports | تقارير المبيعات والربح والمخزون والعميل والحاوية | SCR-023/024/027/041/048 | SCR-023/024/027/041/048 | نتائج قابلة للتصفية من الخادم | Candidate route/component mapped; actual behavior not exercised. | Check report 08 for matched routes/controllers; no API request was executed. | Static schema artifacts only; no live DB query. See report 08. | NOT_VERIFIED | GAP-0043 | - | Medium; mapped source exists but behavior not verified | Source-only comparison; no browser/API/database execution. |
| F-029 | Accounting | دليل الحسابات | SCR-044 | SCR-044 | قراءة وإدارة شجرة الحسابات | Mapped page/entry exists but renders waiting or mock behavior; see gap register. | No matching web API found for the complete feature; details and scope limits in report 08. | Static schema artifacts only; no live DB query. See report 08. | UI_ONLY | GAP-0005 | P1 | High for cited source state; runtime not verified | Source-only comparison; no browser/API/database execution. |
| F-030 | Accounting | التسويات المالية | SCR-054 | SCR-054 | تسوية موثقة ومراجعة أثرها | Mapped page/entry exists but renders waiting or mock behavior; see gap register. | No matching web API found for the complete feature; details and scope limits in report 08. | Static schema artifacts only; no live DB query. See report 08. | UI_ONLY | GAP-0006 | P2 | High for cited source state; runtime not verified | Source-only comparison; no browser/API/database execution. |
| F-031 | Accounting | قيود اليومية | SCR-045 | SCR-045 | قيد متوازن مع ترحيل وعكس | No implementing web page/interaction found in static route/component search; see gap register. | No matching web API found for the complete feature; details and scope limits in report 08. | Static schema artifacts only; no live DB query. See report 08. | MISSING | GAP-0007 | P1 | High for cited source state; runtime not verified | Source-only comparison; no browser/API/database execution. |
| F-032 | Accounting | دفتر الأستاذ | SCR-046 | SCR-046 | حركات الحساب ورصيد الفترة | No implementing web page/interaction found in static route/component search; see gap register. | No matching web API found for the complete feature; details and scope limits in report 08. | Static schema artifacts only; no live DB query. See report 08. | MISSING | GAP-0008 | P1 | High for cited source state; runtime not verified | Source-only comparison; no browser/API/database execution. |
| F-033 | Accounting | ميزان المراجعة | SCR-047 | SCR-047 | مجموع مدين/دائن قابل للمطابقة | No implementing web page/interaction found in static route/component search; see gap register. | No matching web API found for the complete feature; details and scope limits in report 08. | Static schema artifacts only; no live DB query. See report 08. | MISSING | GAP-0009 | P1 | High for cited source state; runtime not verified | Source-only comparison; no browser/API/database execution. |
| F-034 | Accounting | قائمة الدخل والمركز المالي والتدفقات | SCR-048 | SCR-048 | قوائم مالية بفترة وتفاصيل | Source contains the partial flow identified in gap register; runtime unverified. | Check report 08 for matched routes/controllers; no API request was executed. | Static schema artifacts only; no live DB query. See report 08. | PARTIALLY_IMPLEMENTED | GAP-0010 | P1 | High for cited source state; runtime not verified | Source-only comparison; no browser/API/database execution. |
| F-035 | Finance | الأموال المنتظرة | المالية | المالية | متابعة المصدر والاستحقاق والتحصيل | No implementing web page/interaction found in static route/component search; see gap register. | No matching web API found for the complete feature; details and scope limits in report 08. | Static schema artifacts only; no live DB query. See report 08. | MISSING | GAP-0011 | P2 | High for cited source state; runtime not verified | Source-only comparison; no browser/API/database execution. |
| F-036 | Finance | أقساط الشركاء | المالية | المالية | جدولة المستحق والمدفوع والمتبقي | No implementing web page/interaction found in static route/component search; see gap register. | No matching web API found for the complete feature; details and scope limits in report 08. | Static schema artifacts only; no live DB query. See report 08. | MISSING | GAP-0012 | P2 | High for cited source state; runtime not verified | Source-only comparison; no browser/API/database execution. |
| F-037 | Finance | ميزانية المصروفات | SCR-056 | SCR-056 | مقارنة الفعلي بالمخطط | No implementing web page/interaction found in static route/component search; see gap register. | No matching web API found for the complete feature; details and scope limits in report 08. | Static schema artifacts only; no live DB query. See report 08. | MISSING | GAP-0013 | P2 | High for cited source state; runtime not verified | Source-only comparison; no browser/API/database execution. لوحة المرجع فتحت بالنقر بالمقاسات الثلاثة؛ FinancePage يعلن أنها غير مرتبطة ولا توجد شاشة حفظ. |
| F-038 | Finance | المصروفات المتكررة | SCR-057 | SCR-057 | جدولة ثم مراجعة/تسجيل دوري | No implementing web page/interaction found in static route/component search; see gap register. | No matching web API found for the complete feature; details and scope limits in report 08. | Static schema artifacts only; no live DB query. See report 08. | MISSING | GAP-0014 | P2 | High for cited source state; runtime not verified | Source-only comparison; no browser/API/database execution. لوحة المرجع فتحت بالنقر بالمقاسات الثلاثة؛ FinancePage يعلن أنها غير مرتبطة ولا توجد شاشة حفظ. |
| F-039 | Finance | مقارنة شهر بشهر | SCR-058 | SCR-058 | مقارنة فترتين وفروق المقاييس | No implementing web page/interaction found in static route/component search; see gap register. | No matching web API found for the complete feature; details and scope limits in report 08. | Static schema artifacts only; no live DB query. See report 08. | MISSING | GAP-0015 | P2 | High for cited source state; runtime not verified | Source-only comparison; no browser/API/database execution. لوحة المرجع فتحت بالنقر بالمقاسات الثلاثة؛ FinancePage يعلن أنها غير مرتبطة ولا توجد شاشة مقارنة. |
| F-040 | Finance | توقع السيولة | SCR-059 | SCR-059 | فصل المتوقع عن الفعلي مع مصدر | No implementing web page/interaction found in static route/component search; see gap register. | No matching web API found for the complete feature; details and scope limits in report 08. | Static schema artifacts only; no live DB query. See report 08. | MISSING | GAP-0016 | P2 | High for cited source state; runtime not verified | Source-only comparison; no browser/API/database execution. لوحة المرجع فتحت بالنقر بالمقاسات الثلاثة؛ FinancePage يعلن أنها غير مرتبطة ولا توجد شاشة توقع. |
| F-041 | Administration | المستخدمون والإعدادات والتدقيق والسلة وPWA | SCR-025/029/032/033 | SCR-022/SCR-029/SCR-032/SCR-033/SCR-067 | إدارة وأمن وإعدادات واستعادة | Runtime screenshot and click evidence in docs/ux-inventory; تصحيح Screen IDs: المستخدمون SCR-022، السلة SCR-029، السائقون SCR-032، سجل العمليات SCR-033، PWA SCR-067. | Check report 08 for matched routes/controllers; no API request was executed. | Static schema artifacts only; no live DB query. See report 08. | PARTIALLY_IMPLEMENTED | GAP-0047/GAP-0048/GAP-0049/GAP-0057/GAP-0067 | P2 | High for cited source state; runtime not verified | Source-only comparison; no browser/API/database execution. تصحيح Screen IDs: المستخدمون SCR-022، السلة SCR-029، السائقون SCR-032، سجل العمليات SCR-033، PWA SCR-067. |
| F-042 | Data tools | استيراد بيانات وملخص يومي | أدوات البيانات | SCR-065/SCR-066 | معاينة واستيراد ونتيجة ثم ملخص | Runtime screenshot and click evidence in docs/ux-inventory; نقر النافذتين عند 1280/768/390 ثم Escape؛ نافذة تجريبية عامة بلا استيراد أو تقرير يومي. | No matching web API found for the complete feature; details and scope limits in report 08. | Static schema artifacts only; no live DB query. See report 08. | UI_ONLY | GAP-0017 | P2 | High for cited source state; runtime not verified | Source-only comparison; no browser/API/database execution. نقر النافذتين عند 1280/768/390 ثم Escape؛ نافذة تجريبية عامة بلا استيراد أو تقرير يومي. |
| F-043 | Customer files | مرفقات العميل | SCR-002 | SCR-002 | رفع وعرض ملفات مرتبطة بعميل | No implementing web page/interaction found in static route/component search; see gap register. | No matching web API found for the complete feature; details and scope limits in report 08. | Static schema artifacts only; no live DB query. See report 08. | MISSING | GAP-0036 | P2 | High for cited source state; runtime not verified | Source-only comparison; no browser/API/database execution. |
| F-044 | Administration | نسخ احتياطي واستعادة من الويب | SCR-025 | SCR-025 | عرض وتشغيل محكوم لعملية النسخ | No implementing web page/interaction found in static route/component search; see gap register. | No matching web API found for the complete feature; details and scope limits in report 08. | Static schema artifacts only; no live DB query. See report 08. | MISSING | GAP-0044 | P2 | High for cited source state; runtime not verified | Source-only comparison; no browser/API/database execution. |

<a id="06-user-flow-audit"></a>

# 06 — تدقيق تدفقات المستخدم

هذه خرائط ساكنة من UI_SPEC وhandlers المرجع وReact routes وAPI declarations. لم تُنفذ خطوات في المتصفح أو ترسل طلبات.

## FLOW-001 — تسجيل الدخول والوصول
بدء: مستخدم غير مسجل. المتوقع: صفحة الدخول ← تحقق الجلسة ← Shell محمي ← وجهة تسمح بها الصلاحية. LoginPage/AuthProvider/PermissionGate موجودة في المصدر؛ نجاح تسجيل الدخول والأدوار غير مختبر.

## FLOW-002 — العميل إلى كشف الحساب
قائمة العملاء ← ملف عميل ← تاريخ الطلبات/الفواتير/التحصيلات ← كشف أو تصفية. مسارات التفاصيل والكشف والتصفية موجودة. CustomerDetailPage يعرض الحقول وروابط كشف/تصفية، لكن لا يعرض تبويبات السجل الموصوفة في UI_SPEC؛ مرفقات العميل غير موجودة.

## FLOW-003 — الطلب إلى التسليم والفاتورة
إنشاء طلب ← معاينة خادمية ← حفظ مسودة ← تأكيد ← حجز ← تسليم ← إصدار فاتورة. تتوفر routes للمسودة والتأكيد والتسليم والفاتورة في المصدر. التدفق ينكسر عند الحجز: التبويب يقول إنه غير متاح والخدمة لا تحدث quantity_reserved.

~~~mermaid
flowchart LR
 A[إنشاء طلب] --> B[معاينة وحفظ]
 B --> C[تأكيد الطلب]
 C --> D{حجز المخزون}
 D -->|غير منفذ| X[لا يوجد حجز محفوظ]
 D -->|بعد إكمال GAP-0001| E[إنشاء تسليم]
 E --> F[فاتورة]
~~~

## FLOW-004 — الحاوية إلى المخزون
قائمة/إدخال حاوية ← استلام ← مراجعة التكلفة الفعلية ← تسجيل أثر التكلفة ← مراجعة الرصيد والحركة. صفحات React وAPI للاستلام والتكلفة والحركة موجودة؛ لا تحقق runtime أو مطابقة للمجاميع.

## FLOW-005 — إنشاء المرتجع
قائمة المرتجعات ← /returns/new ← اختيار مصدر/سبب/أصناف ← معاينة ← إنشاء ← طباعة. API المرتجعات موجود وReturnFormPage يتضمن نموذجًا مستقلاً؛ route الحالي يستعمل InvoiceFormPage بنمط return. لا تحقق من تكافؤ النموذجين ولا وصول المستخدم لتدفق المرتجع الحر.

~~~mermaid
flowchart LR
 A[قائمة المرتجعات] --> B[/returns/new]
 B --> C[InvoiceFormPage بنمط مرتجع]
 D[ReturnFormPage مستقل] -. غير موصول .-> B
 C --> E[API المرتجعات]
~~~

## FLOW-006 — الحركة المالية اليومية
قبض/صرف/تحويل/مصروف ← أثر في الخزينة ← مراجعة تقرير. واجهات ومسارات API الأساسية موجودة في المصدر؛ لم تُختبر. الأموال المنتظرة والأقساط والميزانيات والمصروفات المتكررة غير متاحة.

## FLOW-007 — المحاسبة والتقارير
مركز التقارير ← اختيار التقرير والفترة ← نتيجة ← طباعة/تصدير. توجد بعض تقارير تشغيلية. دليل الحسابات والتسويات صفحات انتظار؛ journal/ledger/trial balance لا تظهر لها API أو واجهة؛ التقرير المالي ملخص وليس القوائم الثلاث. لا تعريف فردي كامل للـ28 تقريرًا.

~~~mermaid
flowchart LR
 A[معاملة مالية] --> B[قيد يومية]
 B --> C[دفتر الأستاذ]
 C --> D[ميزان المراجعة]
 D --> E[قائمة الدخل]
 D --> F[المركز المالي]
 B --> G[التدفقات النقدية]
 B -. GAP-0007/8/9 .-> C
~~~

## FLOW-008 — استيراد البيانات والملخص اليومي
فتح أدوات البيانات ← اختيار ملف/فترة ← معاينة/تحقق ← تنفيذ بعد تأكيد ← عرض نتيجة. الواجهة الحالية تعرض locked/mock؛ أوامر CSV موجودة CLI دون واجهة ويب متصلة.

## FLOW-009 — إعدادات النظام والمستخدمين
إدارة ← إعدادات الشركة/الترقيم/الضريبة/الأمان ← حفظ. واجهة وإعدادات عامة وضريبة ومستخدمون موجودون؛ تبويبات المرجع الإضافية غير ظاهرة.

## FLOW-010 — النسخ والاستعادة
الإعدادات ← إنشاء/عرض نسخة ← تحقق ← استعادة مؤكدة. أوامر تشغيلية موجودة لكن لا تدفق ويب. لم نشغل أوامر النسخ أو الاستعادة.

## حالة التدفقات
- فجوة مصدر واضحة: FLOW-002 و003 و005 و007 و008 و009 و010: ‏7/10.
- لا فجوة وظيفية مؤكدة من الفحص الساكن، لكنها غير مختبرة: FLOW-001 و004 و006: ‏3/10.
- المسارات لا تثبت نجاح الطلب أو تسجيل البيانات أو صلاحية الحساب.

## Runtime follow-up — 2026-10-29

FLOW-001: partial mock login click, API 200 and /dashboard; live auth/me is 401. FLOW-003: direct mock API order create 201 and confirm 200/status confirmed; no UI submission, invoice, collection, print or DB persistence. The other eight flows were not driven. Zero full flows were verified against Laravel/MySQL.


<a id="07-ui-ux-visual-mismatches"></a>

# 07 — الفروق البصرية والميزات الغائبة

المصدر المعتمد هو مرجع v43. كل نتيجة هنا تصف الصور عند viewport مطابق؛ لا تدّعي تطابق البيانات أو إتمام التفاعل. كل سجل وصورته وGap ID في docs/ux-inventory/VISUAL_PAIR_REVIEW.csv.

## النتائج المصورة

156 سجل مقارنة: 120 فرقًا بصريًا مؤكدًا، 3 سجل غياب ميزة، 15 سجل شاشة غائبة، 6 سجل placeholder، و12 غير متحققة.

- الشاشة/اللوحة التي لها زوج واحد على الأقل: 50/69 معرف شاشة؛ منها 49/68 لوحة ودخول واحد.
- نتائج فرق الشكل تشمل ترتيب الأقسام، كثافة الجداول، المرشحات، النموذج، مواضع التفاعل، وحالة الهاتف. اختلاف قيم الاختبارات لم يُحسب فرقًا بصريًا.
- نتائج الشاشات الغائبة تخص الميزانية والمصروفات المتكررة والمقارنة الشهرية وتوقع السيولة. الاستيراد والملخص اليومي UI-only، وملصقات الباركود ميزة غائبة.

## سجلات مقارنة غير محسومة

- SCR-005 وSCR-025: لقطة النظام في حالة تحميل/خطأ ولم تُلتقط حالة ناجحة ببيانات مطابقة.
- SCR-007 إشعارات: محتوى fixture مختلف؛ موضع فتح اللوحة فقط ظاهر.
- SCR-028: /warehouse-returns مرشح دلالي لكنه يخدم أيضًا SCR-051.
- 19 شاشة بلا زوج مرجعي/نظامي مباشر؛ يسرد SCREEN_PAIR_BLOCKERS.csv كل معرف وسبب الحجب والدليل المطلوب.

## تفاصيل أضيفت في جولة النقر الأخيرة

- SCR-030: العميل؛ تبويبات النظرة العامة والفواتير والمدفوعات والسجل تعمل في المرجع، بينما شاشة React المقابلة تعرض بطاقة معلومات بلا هذه التبويبات (GAP-0002).
- SCR-031: الفاتورة؛ المرجع يعرض بند الصنف والمدفوعات المرتبطة والمخزن؛ واجهة النظام تعرض بطاقات وبيانات صنف غير متاحة في fixture الحالي (GAP-0072).
- SCR-053: المرجع يفتح تفاصيل الحركة بالنقر، بينما جدول النظام لا يحتوي عنصرًا تفاعليًا للصف ولا شاشة تفاصيل (GAP-0073).

## تفاصيل أضيفت في جولة النقر الأخيرة

- SCR-030: العميل؛ تبويبات النظرة العامة والفواتير والمدفوعات والسجل تعمل في المرجع، بينما شاشة React المقابلة تعرض بطاقة معلومات بلا هذه التبويبات (GAP-0002).
- SCR-031: الفاتورة؛ المرجع يعرض بند الصنف والمدفوعات المرتبطة والمخزن؛ واجهة النظام تعرض بطاقات وبيانات صنف غير متاحة في fixture الحالي (GAP-0072).
- SCR-053: المرجع يفتح تفاصيل الحركة بالنقر، بينما جدول النظام لا يحتوي عنصرًا تفاعليًا للصف ولا شاشة تفاصيل (GAP-0073).

## تفاصيل أضيفت في جولة النقر الأخيرة

- SCR-030: العميل؛ تبويبات النظرة العامة والفواتير والمدفوعات والسجل تعمل في المرجع، بينما شاشة React المقابلة تعرض بطاقة معلومات بلا هذه التبويبات (GAP-0002).
- SCR-031: الفاتورة؛ المرجع يعرض بند الصنف والمدفوعات المرتبطة والمخزن؛ واجهة النظام تعرض بطاقات وبيانات صنف غير متاحة في fixture الحالي (GAP-0072).
- SCR-053: المرجع يفتح تفاصيل الحركة بالنقر، بينما جدول النظام لا يحتوي عنصرًا تفاعليًا للصف ولا شاشة تفاصيل (GAP-0073).

## تفاصيل أضيفت في جولة النقر الأخيرة

- SCR-030: العميل؛ تبويبات النظرة العامة والفواتير والمدفوعات والسجل تعمل في المرجع، بينما شاشة React المقابلة تعرض بطاقة معلومات بلا هذه التبويبات (GAP-0002).
- SCR-031: الفاتورة؛ المرجع يعرض بند الصنف والمدفوعات المرتبطة والمخزن؛ واجهة النظام تعرض بطاقات وبيانات صنف غير متاحة في fixture الحالي (GAP-0072).
- SCR-053: المرجع يفتح تفاصيل الحركة بالنقر، بينما جدول النظام لا يحتوي عنصرًا تفاعليًا للصف ولا شاشة تفاصيل (GAP-0073).

## تفاصيل أضيفت في جولة النقر الأخيرة

- SCR-030: العميل؛ تبويبات النظرة العامة والفواتير والمدفوعات والسجل تعمل في المرجع، بينما شاشة React المقابلة تعرض بطاقة معلومات بلا هذه التبويبات (GAP-0002).
- SCR-031: الفاتورة؛ المرجع يعرض بند الصنف والمدفوعات المرتبطة والمخزن؛ واجهة النظام تعرض بطاقات وبيانات صنف غير متاحة في fixture الحالي (GAP-0072).
- SCR-053: المرجع يفتح تفاصيل الحركة بالنقر، بينما جدول النظام لا يحتوي عنصرًا تفاعليًا للصف ولا شاشة تفاصيل (GAP-0073).

## تفاصيل أضيفت في جولة النقر الأخيرة

- SCR-030: العميل؛ تبويبات النظرة العامة والفواتير والمدفوعات والسجل تعمل في المرجع، بينما شاشة React المقابلة تعرض بطاقة معلومات بلا هذه التبويبات (GAP-0002).
- SCR-031: الفاتورة؛ المرجع يعرض بند الصنف والمدفوعات المرتبطة والمخزن؛ واجهة النظام تعرض بطاقات وبيانات صنف غير متاحة في fixture الحالي (GAP-0072).
- SCR-053: المرجع يفتح تفاصيل الحركة بالنقر، بينما جدول النظام لا يحتوي عنصرًا تفاعليًا للصف ولا شاشة تفاصيل (GAP-0073).

## ما لا تثبته هذه النتائج

الصور لا تثبت استجابة API أو الحفظ أو الصلاحيات أو سلامة التقارير. لا تُصنف أي لقطة ثابتة على أنها نجاح نقر أو رحلة كاملة.

<a id="08-backend-api-database-gaps"></a>

# 08 — فجوات Backend وAPI وقاعدة البيانات

هذا تحليل ساكن للملفات. لم يحدث اتصال بقاعدة محلية أو إنتاجية، ولم تُقرأ بيانات فعلية أو تُشغّل migrations.

## الطلب وحجز المخزون — GAP-0001

- الواجهة: OrderDetailPage.tsx:16–20 و246–251 تعرض تبويب reservations ورسالة أن الحجز غير متاح.
- عنصر المرجع ELM-0150 يعرض toast حجز؛ لا يثبت أن خادمًا سجل شيئًا.
- OrdersService.php:163–210 يتحقق من الكميات ويحدث status الطلب إلى confirmed؛ لا يظهر تحديث quantity_reserved.
- المخطط precision_slate_v4_1.sql:622 يصف quantity_reserved بأنه projection ويترك reservation behavior مفتوحًا D8.
- السلسلة تنقطع بين الحدث المتوقع والتحديث الدائم؛ يلزم حسم القاعدة التجارية D8 أولًا.

## الحسابات العامة

- schema/precision_slate_v4_1.sql:394–450 يتضمن chart_of_accounts وjournal_entries وjournal_lines.
- ChartOfAccountsPage وFinancialAdjustmentsPage يعرضان AccountingWaitingPage.
- بحث declarations في backend/routes/api_v1.php لم يجد endpoints مطابقة لقيود اليومية أو دفتر الأستاذ أو ميزان المراجعة أو القوائم.
- وجود جداول لا يعني وجود API أو سلوك أعمال. لا استنتاج عن قاعدة البيانات الحية.

## التقارير والقوائم

- ReportsController/ReportsService يتضمنان dashboard ومبيعات ومخزون وحركات مخزون وأرصدة/كشف عميل وتكاليف حاويات وربح/توزيع أرباح.
- FinancialReportPage يعرض مؤشرات محدودة وأرصدة خزائن؛ لا يعرض قائمة الدخل أو المركز المالي أو التدفقات.
- لم يظهر endpoint لهذه القوائم في api_v1.php. يمكن اشتقاقها مستقبلًا من القيود؛ عدم وجود جداول خاصة باسم كل قائمة لا يثبت نقصًا في المخطط.

## مرفقات العميل

- UI_SPEC يصف سحب/إفلات وجدول ملفات.
- attachment_metadata في schema:1037–1053 metadata اختيارية بلا علاقة مالك أو bytes.
- لم يُعثر على واجهة/endpoint مرفقات عميل. يلزم تعريف التخزين والملكية والصلاحيات والاحتفاظ.

## أدوات الاستيراد والنسخ

- backend يحتوي أوامر imports:customers وimports:products وimports:opening-stock وimports:customer-opening-balances؛ لم تُشغّل.
- AppShell يعرض أدوات البيانات باعتبارها locked/mock؛ لم يظهر endpoint import ويب في api_v1.php.
- أوامر backup:mysql وbackup:offsite وbackup:restore-test موجودة في Console؛ لا واجهة/API إدارة نسخ في التطبيق. لم تُشغّل.

## تغطية API

- في الفحص السابق المباشر لملف api_v1.php عُدّ 183 route declaration و176 method/path فريدًا.
- مسارات البيع والمخزون والحاويات والخزينة والمصروفات والتقارير والإدارة موجودة جزئيًا بحسب الشاشة؛ لم يُختبر أي طلب فعلي.
- كل غياب مذكور يعني أنه لم يُعثر عليه في المصادر التي جرى البحث فيها، لا أنه يستحيل وجود تكامل خارجي أو مسار غير قياسي.

## عقود تحتاج قرارًا

- قائمة names/fields وصلاحيات تقارير v43 الـ28.
- سياسة حجز المخزون D8 وفك الحجز والتزامن.
- مصادر وحقول الأموال المنتظرة والأقساط والتوقع والميزانيات.
- عقد آمن لمعاينة import ثم التطبيق.
- تعريف مرفقات العميل وملفاتها.
- قواعد القيد والتسويات والقوائم المالية.

## Runtime API/database evidence — 2026-10-29

Loopback Laravel returned 404 for GET / and GET /up and 401 for unauthenticated GET /api/v1/auth/me. No credentialed request or protected route was sent. Mock-mode login was 200; direct MSW order create/confirm was 201/200. No MySQL connection, query, migration, seeder or database write was performed. Frontend tests use jsdom/MSW.


<a id="09-accessibility-responsive-states"></a>

# 09 — الوصولية والاستجابة والحالات

## أدلة ساكنة من الكود

- AppShell يضيف أسماء aria لبعض أدوات التنقل والبحث، ويغلق بعض القوائم بـEscape والنقر خارجها (AppShell.tsx:273–325 و353–389 و602–650).
- SettingsPage يستخدم form/FormField ورسائل role=alert/status (SettingsPage.tsx:147–245).
- DashboardPage يعرض loading/error/retry؛ مناطق التحليل/المخزون/النشاط تعلن انتظار مخطط البيانات (DashboardPage.tsx:51–115).
- توجد breakpoints في design-tokens.css وملفات CSS؛ وجود breakpoint لا يثبت سلامة كل viewport.
- يوجد تقرير آلي سابق في docs/integration لكنه تاريخي ولم يُعَد في هذا التدقيق.

## حالات المرجع مقابل التطبيق

| الحالة | التصميم/المصدر | التحقق الحالي |
|---|---|---|
| Initial / populated | DOM initial sections والبيانات النموذجية | جرد ساكن فقط |
| Empty / loading / error | بعض صفحات React تستخدم PageState | لم تُشغّل طلبات |
| Slow/network/server error | بعض إعادة المحاولة موجودة في المصدر | لم تُختبر |
| Unauthorized/forbidden/session expiry | PermissionGate/AuthProvider | لم تُختبر بحسابات |
| Disabled/focus/hover/pressed | CSS/DOM جزئيًا | لم تُختبر لكل عنصر |
| Long content/large data | غير محاكى | غير متحقق |
| Offline/mobile/RTL-LTR | PWA وCSS ظاهران | لا اختبار فعلي |

## فحوص لم تجر

لا حصر مكتمل للأسماء accessible لكل عنصر؛ ترتيب Tab وfocus trap/restoration في كل modal؛ contrast ratio؛ قارئ شاشة؛ تكبير النص؛ overflow عند 390/768/desktop؛ دعم LTR؛ اتجاه أرقام وتواريخ طويلة؛ تبدل الدور أثناء الجلسة.

لا أرفع هذه النقاط كعيوب مؤكدة دون فحص. المطلوب للإغلاق: فحص axe يدوي/آلي للصفحات، مراجعة لوحة مفاتيح ومودالات، صور viewport متفق عليها، واختبار حالات تحميل/فراغ/خطأ وصلاحيات محلي.

## Runtime responsive/accessibility follow-up — 2026-10-29

Screenshots were captured at 390/768/1280 and the mobile navigation difference is GAP-0027. Keyboard order, focus trap/return, Escape, screen-reader names, contrast sampling, role-limited actions and application overlay states remain NOT_VERIFIED. jsdom accessibility tests do not establish WCAG conformance.


<a id="10-system-features-without-design"></a>

# 10 — وظائف في النظام دون مقابل واضح في مرجع v43

القائمة لا توصي بحذف أي قدرة. تعني أن مقابلها غير واضح أو غير مفصل في مرجع الويب المفتوح؛ قد توجد في صفحات أو نسخ أخرى. الثقة متوسطة.

| Capability | دليل التطبيق | مقابل التصميم المفتوح | التوصية |
|---|---|---|---|
| تثبيت PWA | PwaInstallPage و/admin/install | لا شاشة baseline مفصلة | Preserve؛ أضف حالة التثبيت أو وثق أنها إدارية |
| تدقيق الأحداث | AuditPage وaudit API | يوجد section للسجل لكن تفاصيل البحث/التصدير محدودة | Preserve؛ اعتمد قائمة الحدث والمرشحات |
| سلة المحذوفات والاستعادة | RecycleBinPage وrestore endpoints | توجد إشارة للسلة دون تفصيل الأنواع والحالات | Preserve؛ صمم كل نوع وحالة |
| صندوق تطبيق الهاتف وقنوات الرسائل | MobileInboxPage/MobileChannelsPage | لا تدفق web واضح في v43 | Preserve؛ وثق مصدر الرسائل وحالات المراجعة |
| حساب الشريك والدفعات | PartnersPage/PartnerPaymentsPage | لا وصف كامل لاعتماد الدفعات | Preserve؛ صمم القائمة والتفاصيل والاعتماد |
| فواتير الموردين | PurchaseInvoicesPage وAPI | لا شاشة شراء baseline مفصلة | Preserve؛ أكد حدود الموردين وAP |
| اعتماد الجرد والتالف | InventoryCount/DamagedStock pages/APIs | بعض الجرد والتالف يظهر جزئيًا | Preserve؛ طابق انتقالات الحالة والصلاحيات |
| تاريخ تكلفة المنتج | CostHistoryPage وCatalogController | لا شاشة تاريخ مستقلة واضحة | Preserve؛ أضف entry point من ملف المنتج |
| تخصيص وعكس التحصيل | CollectionsPage وallocation/reverse APIs | شاشة تحصيل موجودة، تفاصيل العكس غير واضحة | Preserve؛ صمم التأكيد والنتيجة |
| تصفية العميل | CustomerLiquidationPage وendpoint | يوجد sec-liq دون تدفق واضح بالكامل | Preserve؛ وثق الحقول والنتيجة |
| حركة أموال الحاوية | ContainerLedgerPages وAPI | يوجد قسم أموال لكن الربط المحاسبي غير مفصل | Preserve؛ وثق أثر الحركة على الخزينة |

غياب النظير المباشر لا يبرر تعطيل الوظيفة. اربط كل capability بصفحة/قرار أو سجل أنها مقصودة دون شاشة.


<a id="11-master-gap-register"></a>

# 11 — Master Gap Register

Recovery note: The expanded entries below were reconstructed from the persisted implementation backlog, feature matrix, screen inventory, and screenshot-pair register. Any detail that cannot be supported by those records is explicitly marked unknown or not verified; this reconstruction does not claim the lost prose was recovered verbatim.

71 unique Gap IDs are retained. The status and confidence of each entry remain evidence-scoped; a completed audit record does not imply implementation success.

## GAP-0001 — حجز كميات الطلب غير منفذ

- **Category:** UNVERIFIED_BEHAVIOR
- **Priority:** P1
- **Confidence:** Medium or Not Verified; see source classification
- **Affected Module:** SCR-005 — طلب مؤكد ومعتمد #ORD-2024-001
- **Affected Screen IDs:** SCR-005
- **Affected Element IDs:** Not mapped in surviving traceability records; see interactive inventory by Screen ID.
- **Related Feature IDs:** F-009
- **Related Flow IDs:** See 06_USER_FLOW_AUDIT.md; no flow is claimed from a screenshot alone.
- **Design Reference:** See screen inventory and feature matrix.
- **Current System Evidence:** docs/ux-inventory/screenshots/reference/screens/order-detail-1280.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/order-detail-1280.png; docs/ux-inventory/screenshots/system-mock/all-order-detail-1280-side-by-side.png; docs/ux-inventory/screenshots/reference/screens/order-detail-390.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/order-detail-390.png; docs/ux-inventory/screenshots/system-mock/all-order-detail-390-side-by-side.png; docs/ux-inventory/screenshots/reference/screens/order-detail-768.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/order-detail-768.png; docs/ux-inventory/screenshots/system-mock/all-order-detail-768-side-by-side.png
- **Expected Behavior:** حفظ حجز فعلي وإظهاره ثم تحريره وفق انتقالات معتمدة.
- **Actual Behavior:** Not verified; No runtime evidence recorded.
- **Exact Missing or Incorrect Detail:** حجز كميات الطلب غير منفذ
- **Why This Is a Gap:** The persisted backlog records this expected behavior and acceptance condition; current evidence above records the observed or classified implementation state.
- **User Impact:** Not independently rated in the surviving evidence; priority is inherited from the persisted backlog.
- **Business Impact:** Not independently rated in the surviving evidence; consult the feature and flow records before implementation.
- **Technical Impact:** See frontend/backend/database evidence above; where absent, implementation layer is unverified.
- **Root Cause:** Unknown unless identified in cited system evidence.
- **Dependencies:** تعريف D8 والإلغاء والفوترة والتزامن.
- **Suggested Corrective Action:** حجز كميات الطلب غير منفذ: حفظ حجز فعلي وإظهاره ثم تحريره وفق انتقالات معتمدة.
- **Acceptance Criteria:** حجز محفوظ واحد، عرض واضح، لا تجاوز للمتاح، وتحرير مرة واحدة عند الإلغاء/التحول.
- **Recommended Verification Method:** مراجعة معاملات concurrent في قاعدة اختبار بعد اعتماد القرار.
- **Implementation Complexity:** Unknown; no new estimate assigned.
- **Open Questions:** Use the linked feature, flow, and unverified-items reports for unresolved product or runtime questions.
- **Evidence references:** audit-output/precision-slate-v43-20261029/05_FEATURE_GAP_MATRIX.csv; docs/ux-inventory/VISUAL_PAIR_REVIEW.csv; docs/ux-inventory/INVENTORY.csv


## GAP-0005 — دليل الحسابات صفحة انتظار

- **Category:** PARTIAL_FEATURE
- **Priority:** P1
- **Confidence:** Medium or Not Verified; see source classification
- **Affected Module:** Accounting
- **Affected Screen IDs:** SCR-044
- **Affected Element IDs:** Not mapped in surviving traceability records; see interactive inventory by Screen ID.
- **Related Feature IDs:** F-029
- **Related Flow IDs:** See 06_USER_FLOW_AUDIT.md; no flow is claimed from a screenshot alone.
- **Design Reference:** SCR-044
- **Current System Evidence:** Mapped page/entry exists but renders waiting or mock behavior; see gap register.; No matching web API found for the complete feature; details and scope limits in report 08.; Static schema artifacts only; no live DB query. See report 08.
- **Expected Behavior:** قراءة وإدارة شجرة الحسابات وفق صلاحية وقواعد محاسبية.
- **Actual Behavior:** UI_ONLY; Source-only comparison; no browser/API/database execution.
- **Exact Missing or Incorrect Detail:** دليل الحسابات صفحة انتظار
- **Why This Is a Gap:** The persisted backlog records this expected behavior and acceptance condition; current evidence above records the observed or classified implementation state.
- **User Impact:** Not independently rated in the surviving evidence; priority is inherited from the persisted backlog.
- **Business Impact:** Not independently rated in the surviving evidence; consult the feature and flow records before implementation.
- **Technical Impact:** See frontend/backend/database evidence above; where absent, implementation layer is unverified.
- **Root Cause:** Unknown unless identified in cited system evidence.
- **Dependencies:** صلاحيات وقواعد الكود والحساب المرحّل.
- **Suggested Corrective Action:** دليل الحسابات صفحة انتظار: قراءة وإدارة شجرة الحسابات وفق صلاحية وقواعد محاسبية.
- **Acceptance Criteria:** عرض الشجرة، الحالات الفارغة/الخطأ، وأفعال مسموحة دون تكرار/دورة.
- **Recommended Verification Method:** اختبارات شجرة صغيرة مع حساب مستخدم محدود.
- **Implementation Complexity:** Unknown; no new estimate assigned.
- **Open Questions:** Use the linked feature, flow, and unverified-items reports for unresolved product or runtime questions.
- **Evidence references:** audit-output/precision-slate-v43-20261029/05_FEATURE_GAP_MATRIX.csv; docs/ux-inventory/VISUAL_PAIR_REVIEW.csv; docs/ux-inventory/INVENTORY.csv


## GAP-0007 — لا واجهة/API لقيود اليومية

- **Category:** MISSING_FEATURE
- **Priority:** P1
- **Confidence:** Medium or Not Verified; see source classification
- **Affected Module:** Accounting
- **Affected Screen IDs:** SCR-045
- **Affected Element IDs:** Not mapped in surviving traceability records; see interactive inventory by Screen ID.
- **Related Feature IDs:** F-031
- **Related Flow IDs:** See 06_USER_FLOW_AUDIT.md; no flow is claimed from a screenshot alone.
- **Design Reference:** SCR-045
- **Current System Evidence:** No implementing web page/interaction found in static route/component search; see gap register.; No matching web API found for the complete feature; details and scope limits in report 08.; Static schema artifacts only; no live DB query. See report 08.
- **Expected Behavior:** إنشاء قيد متوازن واعتماده/عكسه وربطه بمصدر.
- **Actual Behavior:** MISSING; Source-only comparison; no browser/API/database execution.
- **Exact Missing or Incorrect Detail:** لا واجهة/API لقيود اليومية
- **Why This Is a Gap:** The persisted backlog records this expected behavior and acceptance condition; current evidence above records the observed or classified implementation state.
- **User Impact:** Not independently rated in the surviving evidence; priority is inherited from the persisted backlog.
- **Business Impact:** Not independently rated in the surviving evidence; consult the feature and flow records before implementation.
- **Technical Impact:** See frontend/backend/database evidence above; where absent, implementation layer is unverified.
- **Root Cause:** Unknown unless identified in cited system evidence.
- **Dependencies:** قواعد double-entry والصلاحيات والرقم والتكرار والعكس.
- **Suggested Corrective Action:** لا واجهة/API لقيود اليومية: إنشاء قيد متوازن واعتماده/عكسه وربطه بمصدر.
- **Acceptance Criteria:** كل قيد متوازن ومصدره واضح ولا يكرر ولا يترحل بلا صلاحية.
- **Recommended Verification Method:** اختبارات ميزان وتكرار وعكس.
- **Implementation Complexity:** Unknown; no new estimate assigned.
- **Open Questions:** Use the linked feature, flow, and unverified-items reports for unresolved product or runtime questions.
- **Evidence references:** audit-output/precision-slate-v43-20261029/05_FEATURE_GAP_MATRIX.csv; docs/ux-inventory/VISUAL_PAIR_REVIEW.csv; docs/ux-inventory/INVENTORY.csv


## GAP-0008 — دفتر الأستاذ غير متاح

- **Category:** MISSING_FEATURE
- **Priority:** P1
- **Confidence:** Medium or Not Verified; see source classification
- **Affected Module:** Accounting
- **Affected Screen IDs:** SCR-046
- **Affected Element IDs:** Not mapped in surviving traceability records; see interactive inventory by Screen ID.
- **Related Feature IDs:** F-032
- **Related Flow IDs:** See 06_USER_FLOW_AUDIT.md; no flow is claimed from a screenshot alone.
- **Design Reference:** SCR-046
- **Current System Evidence:** No implementing web page/interaction found in static route/component search; see gap register.; No matching web API found for the complete feature; details and scope limits in report 08.; Static schema artifacts only; no live DB query. See report 08.
- **Expected Behavior:** حركة كل حساب ورصيد افتتاحي وختامي ضمن فترة مع رابط القيد.
- **Actual Behavior:** MISSING; Source-only comparison; no browser/API/database execution.
- **Exact Missing or Incorrect Detail:** دفتر الأستاذ غير متاح
- **Why This Is a Gap:** The persisted backlog records this expected behavior and acceptance condition; current evidence above records the observed or classified implementation state.
- **User Impact:** Not independently rated in the surviving evidence; priority is inherited from the persisted backlog.
- **Business Impact:** Not independently rated in the surviving evidence; consult the feature and flow records before implementation.
- **Technical Impact:** See frontend/backend/database evidence above; where absent, implementation layer is unverified.
- **Root Cause:** Unknown unless identified in cited system evidence.
- **Dependencies:** قيود يومية معتمدة وتعريف العملة والفترة.
- **Suggested Corrective Action:** دفتر الأستاذ غير متاح: حركة كل حساب ورصيد افتتاحي وختامي ضمن فترة مع رابط القيد.
- **Acceptance Criteria:** يعرض القيود المرحّلة فقط ويتطابق مجموع الحركة والرصيد.
- **Recommended Verification Method:** مطابقة حركة fixture مع دفاترها.
- **Implementation Complexity:** Unknown; no new estimate assigned.
- **Open Questions:** Use the linked feature, flow, and unverified-items reports for unresolved product or runtime questions.
- **Evidence references:** audit-output/precision-slate-v43-20261029/05_FEATURE_GAP_MATRIX.csv; docs/ux-inventory/VISUAL_PAIR_REVIEW.csv; docs/ux-inventory/INVENTORY.csv


## GAP-0009 — ميزان المراجعة غير متاح

- **Category:** MISSING_FEATURE
- **Priority:** P1
- **Confidence:** Medium or Not Verified; see source classification
- **Affected Module:** Accounting
- **Affected Screen IDs:** SCR-047
- **Affected Element IDs:** Not mapped in surviving traceability records; see interactive inventory by Screen ID.
- **Related Feature IDs:** F-033
- **Related Flow IDs:** See 06_USER_FLOW_AUDIT.md; no flow is claimed from a screenshot alone.
- **Design Reference:** SCR-047
- **Current System Evidence:** No implementing web page/interaction found in static route/component search; see gap register.; No matching web API found for the complete feature; details and scope limits in report 08.; Static schema artifacts only; no live DB query. See report 08.
- **Expected Behavior:** تجميع أرصدة الحسابات المدينة والدائنة للفترة.
- **Actual Behavior:** MISSING; Source-only comparison; no browser/API/database execution.
- **Exact Missing or Incorrect Detail:** ميزان المراجعة غير متاح
- **Why This Is a Gap:** The persisted backlog records this expected behavior and acceptance condition; current evidence above records the observed or classified implementation state.
- **User Impact:** Not independently rated in the surviving evidence; priority is inherited from the persisted backlog.
- **Business Impact:** Not independently rated in the surviving evidence; consult the feature and flow records before implementation.
- **Technical Impact:** See frontend/backend/database evidence above; where absent, implementation layer is unverified.
- **Root Cause:** Unknown unless identified in cited system evidence.
- **Dependencies:** دفتر قيود مرحّل وقاعدة رصيد.
- **Suggested Corrective Action:** ميزان المراجعة غير متاح: تجميع أرصدة الحسابات المدينة والدائنة للفترة.
- **Acceptance Criteria:** المدين يساوي الدائن للفترة المحددة؛ تعرض الأرصدة والحسابات بوضوح.
- **Recommended Verification Method:** حساب fixture معروف مع قيود متوازنة وغير متوازنة.
- **Implementation Complexity:** Unknown; no new estimate assigned.
- **Open Questions:** Use the linked feature, flow, and unverified-items reports for unresolved product or runtime questions.
- **Evidence references:** audit-output/precision-slate-v43-20261029/05_FEATURE_GAP_MATRIX.csv; docs/ux-inventory/VISUAL_PAIR_REVIEW.csv; docs/ux-inventory/INVENTORY.csv


## GAP-0010 — التقرير المالي لا يعرض القوائم الثلاث

- **Category:** PARTIAL_FEATURE
- **Priority:** P1
- **Confidence:** Medium or Not Verified; see source classification
- **Affected Module:** Accounting
- **Affected Screen IDs:** SCR-048
- **Affected Element IDs:** Not mapped in surviving traceability records; see interactive inventory by Screen ID.
- **Related Feature IDs:** F-034
- **Related Flow IDs:** See 06_USER_FLOW_AUDIT.md; no flow is claimed from a screenshot alone.
- **Design Reference:** SCR-048
- **Current System Evidence:** Source contains the partial flow identified in gap register; runtime unverified.; Check report 08 for matched routes/controllers; no API request was executed.; Static schema artifacts only; no live DB query. See report 08.
- **Expected Behavior:** قوائم مالية بفترة مع تفصيل البنود ومصدرها.
- **Actual Behavior:** PARTIALLY_IMPLEMENTED; Source-only comparison; no browser/API/database execution.
- **Exact Missing or Incorrect Detail:** التقرير المالي لا يعرض القوائم الثلاث
- **Why This Is a Gap:** The persisted backlog records this expected behavior and acceptance condition; current evidence above records the observed or classified implementation state.
- **User Impact:** Not independently rated in the surviving evidence; priority is inherited from the persisted backlog.
- **Business Impact:** Not independently rated in the surviving evidence; consult the feature and flow records before implementation.
- **Technical Impact:** See frontend/backend/database evidence above; where absent, implementation layer is unverified.
- **Root Cause:** Unknown unless identified in cited system evidence.
- **Dependencies:** دفتر القيود وتعريفات البنود والفترات وموافقة محاسبية.
- **Suggested Corrective Action:** التقرير المالي لا يعرض القوائم الثلاث: قوائم مالية بفترة مع تفصيل البنود ومصدرها.
- **Acceptance Criteria:** الثلاثة متاحة وتطابق القيود وتعرض فترة ومصدرًا وحالات فارغة/خطأ.
- **Recommended Verification Method:** مطابقة مجاميع نتائج بقيد fixture معتمد.
- **Implementation Complexity:** Unknown; no new estimate assigned.
- **Open Questions:** Use the linked feature, flow, and unverified-items reports for unresolved product or runtime questions.
- **Evidence references:** audit-output/precision-slate-v43-20261029/05_FEATURE_GAP_MATRIX.csv; docs/ux-inventory/VISUAL_PAIR_REVIEW.csv; docs/ux-inventory/INVENTORY.csv


## GAP-0056 — ميزة ملصقات الباركود غائبة من الواجهة

- **Category:** MISSING_FEATURE
- **Priority:** P1
- **Confidence:** High for recorded visual/result evidence
- **Affected Module:** Catalog
- **Affected Screen IDs:** SCR-063
- **Affected Element IDs:** Not mapped in surviving traceability records; see interactive inventory by Screen ID.
- **Related Feature IDs:** F-014
- **Related Flow IDs:** See 06_USER_FLOW_AUDIT.md; no flow is claimed from a screenshot alone.
- **Design Reference:** docs/ux-inventory/screenshots/reference/activated/barcode-labels-1280.png; docs/ux-inventory/screenshots/reference/activated/barcode-labels-768.png; docs/ux-inventory/screenshots/reference/activated/barcode-labels-390.png
- **Current System Evidence:** docs/ux-inventory/screenshots/system-mock/react/visual-round5/products-1280.png; docs/ux-inventory/screenshots/system-mock/react/visual-round5/products-768.png; docs/ux-inventory/screenshots/system-mock/react/visual-round5/products-390.png; Runtime screenshot and click evidence in docs/ux-inventory; نقرة رابط تكلفة المنتج فتحت السجل؛ لم يظهر تحكم باركود/ملصقات. الصور: round5-product-cost-history وround5-barcode-labels.; Check report 08 for matched routes/controllers; no API request was executed.; Static schema artifacts only; no live DB query. See report 08.
- **Expected Behavior:** بحث/مسح كاميرا وطباعة جماعية وجدول ملصقات.
- **Actual Behavior:** المرجع يعرض البحث/مسح الكاميرا والطباعة الجماعية وجدول الملصقات؛ صفحة المنتجات لا تعرض أداة أو مسارًا مطابقًا بعد فحص الواجهة.
- **Exact Missing or Incorrect Detail:** ميزة ملصقات الباركود غائبة من الواجهة
- **Why This Is a Gap:** The persisted backlog records this expected behavior and acceptance condition; current evidence above records the observed or classified implementation state.
- **User Impact:** Not independently rated in the surviving evidence; priority is inherited from the persisted backlog.
- **Business Impact:** Not independently rated in the surviving evidence; consult the feature and flow records before implementation.
- **Technical Impact:** See frontend/backend/database evidence above; where absent, implementation layer is unverified.
- **Root Cause:** Unknown unless identified in cited system evidence.
- **Dependencies:** fixtures متطابقة ودور اختبار محدود؛ لا تستخدم بيانات إنتاجية.
- **Suggested Corrective Action:** ميزة ملصقات الباركود غائبة من الواجهة: بحث/مسح كاميرا وطباعة جماعية وجدول ملصقات.
- **Acceptance Criteria:** التحكم ظاهر ويتيح البحث/المسح والطباعة وحالات الفراغ.
- **Recommended Verification Method:** إعادة مقارنة المقاسات الثلاثة ثم اختبار النقر/حالات الواجهة في بيئة fixture دون إرسال بيانات خارجية.
- **Implementation Complexity:** Unknown; no new estimate assigned.
- **Open Questions:** Use the linked feature, flow, and unverified-items reports for unresolved product or runtime questions.
- **Evidence references:** docs/ux-inventory/screenshots/system-mock/state-comparisons/round5-barcode-labels-1280-side-by-side.png; docs/ux-inventory/screenshots/system-mock/state-comparisons/round5-barcode-labels-768-side-by-side.png; docs/ux-inventory/screenshots/system-mock/state-comparisons/round5-barcode-labels-390-side-by-side.png; audit-output/precision-slate-v43-20261029/05_FEATURE_GAP_MATRIX.csv; docs/ux-inventory/VISUAL_PAIR_REVIEW.csv; docs/ux-inventory/INVENTORY.csv


## GAP-0002 — ملف العميل لا يعرض تبويبات السجل

- **Category:** PARTIAL_FEATURE
- **Priority:** P2
- **Confidence:** Medium or Not Verified; see source classification
- **Affected Module:** Customers
- **Affected Screen IDs:** SCR-030
- **Affected Element IDs:** Not mapped in surviving traceability records; see interactive inventory by Screen ID.
- **Related Feature IDs:** F-004
- **Related Flow IDs:** See 06_USER_FLOW_AUDIT.md; no flow is claimed from a screenshot alone.
- **Design Reference:** SCR-030
- **Current System Evidence:** Source contains the partial flow identified in gap register; runtime unverified.; Check report 08 for matched routes/controllers; no API request was executed.; Static schema artifacts only; no live DB query. See report 08.
- **Expected Behavior:** عرض تبويبات سجل العميل مع فتح العناصر أو تصفيتها عليه.
- **Actual Behavior:** PARTIALLY_IMPLEMENTED; Source-only comparison; no browser/API/database execution.
- **Exact Missing or Incorrect Detail:** ملف العميل لا يعرض تبويبات السجل
- **Why This Is a Gap:** The persisted backlog records this expected behavior and acceptance condition; current evidence above records the observed or classified implementation state.
- **User Impact:** Not independently rated in the surviving evidence; priority is inherited from the persisted backlog.
- **Business Impact:** Not independently rated in the surviving evidence; consult the feature and flow records before implementation.
- **Technical Impact:** See frontend/backend/database evidence above; where absent, implementation layer is unverified.
- **Root Cause:** Unknown unless identified in cited system evidence.
- **Dependencies:** تحديد عناصر التاريخ وواجهات query.
- **Suggested Corrective Action:** ملف العميل لا يعرض تبويبات السجل: عرض تبويبات سجل العميل مع فتح العناصر أو تصفيتها عليه.
- **Acceptance Criteria:** تظهر التبويبات والروابط والفراغ/التحميل/الخطأ لكل سجل.
- **Recommended Verification Method:** اختبار مصدر كل تبويب وعميل بلا حركات.
- **Implementation Complexity:** Unknown; no new estimate assigned.
- **Open Questions:** Use the linked feature, flow, and unverified-items reports for unresolved product or runtime questions.
- **Evidence references:** audit-output/precision-slate-v43-20261029/05_FEATURE_GAP_MATRIX.csv; docs/ux-inventory/VISUAL_PAIR_REVIEW.csv; docs/ux-inventory/INVENTORY.csv


## GAP-0003 — مرفقات العميل غير متاحة

- **Category:** UNVERIFIED_BEHAVIOR
- **Priority:** P2
- **Confidence:** Medium or Not Verified; see source classification
- **Affected Module:** SCR-002 — العملاء
- **Affected Screen IDs:** SCR-002
- **Affected Element IDs:** Not mapped in surviving traceability records; see interactive inventory by Screen ID.
- **Related Feature IDs:** F-043
- **Related Flow IDs:** See 06_USER_FLOW_AUDIT.md; no flow is claimed from a screenshot alone.
- **Design Reference:** See screen inventory and feature matrix.
- **Current System Evidence:** docs/ux-inventory/screenshots/reference/screens/customers-1280.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/customers-1280.png; docs/ux-inventory/screenshots/system-mock/all-customers-1280-side-by-side.png; docs/ux-inventory/screenshots/reference/screens/customers-390.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/customers-390.png; docs/ux-inventory/screenshots/system-mock/all-customers-390-side-by-side.png; docs/ux-inventory/screenshots/reference/screens/customers-768.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/customers-768.png; docs/ux-inventory/screenshots/system-mock/all-customers-768-side-by-side.png
- **Expected Behavior:** رفع ملف مرتبط بالعميل وعرض بياناته للمستخدم المصرح.
- **Actual Behavior:** Not verified; No runtime evidence recorded.
- **Exact Missing or Incorrect Detail:** مرفقات العميل غير متاحة
- **Why This Is a Gap:** The persisted backlog records this expected behavior and acceptance condition; current evidence above records the observed or classified implementation state.
- **User Impact:** Not independently rated in the surviving evidence; priority is inherited from the persisted backlog.
- **Business Impact:** Not independently rated in the surviving evidence; consult the feature and flow records before implementation.
- **Technical Impact:** See frontend/backend/database evidence above; where absent, implementation layer is unverified.
- **Root Cause:** Unknown unless identified in cited system evidence.
- **Dependencies:** سياسة التخزين والأنواع والأحجام والصلاحيات والاحتفاظ.
- **Suggested Corrective Action:** مرفقات العميل غير متاحة: رفع ملف مرتبط بالعميل وعرض بياناته للمستخدم المصرح.
- **Acceptance Criteria:** الرفع والحذف/العرض والصلاحية وحالات الفشل تحفظ الارتباط الصحيح.
- **Recommended Verification Method:** اختبارات أنواع/أحجام/مستخدم ممنوع في تخزين محلي.
- **Implementation Complexity:** Unknown; no new estimate assigned.
- **Open Questions:** Use the linked feature, flow, and unverified-items reports for unresolved product or runtime questions.
- **Evidence references:** audit-output/precision-slate-v43-20261029/05_FEATURE_GAP_MATRIX.csv; docs/ux-inventory/VISUAL_PAIR_REVIEW.csv; docs/ux-inventory/INVENTORY.csv


## GAP-0004 — route إنشاء المرتجع لا يستخدم النموذج المستقل

- **Category:** UNVERIFIED_BEHAVIOR
- **Priority:** P2
- **Confidence:** Medium or Not Verified; see source classification
- **Affected Module:** SCR-013 — إنشاء مرتجع مبيعات جديد
- **Affected Screen IDs:** SCR-013
- **Affected Element IDs:** Not mapped in surviving traceability records; see interactive inventory by Screen ID.
- **Related Feature IDs:** F-012
- **Related Flow IDs:** See 06_USER_FLOW_AUDIT.md; no flow is claimed from a screenshot alone.
- **Design Reference:** See screen inventory and feature matrix.
- **Current System Evidence:** docs/ux-inventory/screenshots/reference/screens/return-create-1280.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/return-create-1280.png; docs/ux-inventory/screenshots/system-mock/all-return-create-1280-side-by-side.png; docs/ux-inventory/screenshots/reference/screens/return-create-390.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/return-create-390.png; docs/ux-inventory/screenshots/system-mock/all-return-create-390-side-by-side.png; docs/ux-inventory/screenshots/reference/screens/return-create-768.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/return-create-768.png; docs/ux-inventory/screenshots/system-mock/all-return-create-768-side-by-side.png
- **Expected Behavior:** يفتح زر الإنشاء نموذجًا موحدًا يغطي الحالات المعتمدة.
- **Actual Behavior:** Not verified; No runtime evidence recorded.
- **Exact Missing or Incorrect Detail:** route إنشاء المرتجع لا يستخدم النموذج المستقل
- **Why This Is a Gap:** The persisted backlog records this expected behavior and acceptance condition; current evidence above records the observed or classified implementation state.
- **User Impact:** Not independently rated in the surviving evidence; priority is inherited from the persisted backlog.
- **Business Impact:** Not independently rated in the surviving evidence; consult the feature and flow records before implementation.
- **Technical Impact:** See frontend/backend/database evidence above; where absent, implementation layer is unverified.
- **Root Cause:** Unknown unless identified in cited system evidence.
- **Dependencies:** تحديد النموذج المقصود ونطاق المرتجع الحر.
- **Suggested Corrective Action:** route إنشاء المرتجع لا يستخدم النموذج المستقل: يفتح زر الإنشاء نموذجًا موحدًا يغطي الحالات المعتمدة.
- **Acceptance Criteria:** الرابط والمسار المباشر يفتحان النموذج المعتمد؛ linked/free مطابقان للقرار.
- **Recommended Verification Method:** مراجعة route وتجربة preview/create ببيئة معزولة.
- **Implementation Complexity:** Unknown; no new estimate assigned.
- **Open Questions:** Use the linked feature, flow, and unverified-items reports for unresolved product or runtime questions.
- **Evidence references:** audit-output/precision-slate-v43-20261029/05_FEATURE_GAP_MATRIX.csv; docs/ux-inventory/VISUAL_PAIR_REVIEW.csv; docs/ux-inventory/INVENTORY.csv


## GAP-0006 — التسويات المالية صفحة انتظار

- **Category:** PARTIAL_FEATURE
- **Priority:** P2
- **Confidence:** Medium or Not Verified; see source classification
- **Affected Module:** Accounting
- **Affected Screen IDs:** SCR-054
- **Affected Element IDs:** Not mapped in surviving traceability records; see interactive inventory by Screen ID.
- **Related Feature IDs:** F-030
- **Related Flow IDs:** See 06_USER_FLOW_AUDIT.md; no flow is claimed from a screenshot alone.
- **Design Reference:** SCR-054
- **Current System Evidence:** Mapped page/entry exists but renders waiting or mock behavior; see gap register.; No matching web API found for the complete feature; details and scope limits in report 08.; Static schema artifacts only; no live DB query. See report 08.
- **Expected Behavior:** إنشاء تسوية بمرجع وسبب ثم عرض أثرها وسجلها.
- **Actual Behavior:** UI_ONLY; Source-only comparison; no browser/API/database execution.
- **Exact Missing or Incorrect Detail:** التسويات المالية صفحة انتظار
- **Why This Is a Gap:** The persisted backlog records this expected behavior and acceptance condition; current evidence above records the observed or classified implementation state.
- **User Impact:** Not independently rated in the surviving evidence; priority is inherited from the persisted backlog.
- **Business Impact:** Not independently rated in the surviving evidence; consult the feature and flow records before implementation.
- **Technical Impact:** See frontend/backend/database evidence above; where absent, implementation layer is unverified.
- **Root Cause:** Unknown unless identified in cited system evidence.
- **Dependencies:** تعريف التسوية والترحيل والعكس.
- **Suggested Corrective Action:** التسويات المالية صفحة انتظار: إنشاء تسوية بمرجع وسبب ثم عرض أثرها وسجلها.
- **Acceptance Criteria:** العملية تسجل مرة واحدة وسببًا ومنفذًا وأثرًا قابلًا للمراجعة.
- **Recommended Verification Method:** حالات قبول/رفض/تكرار في test fixture.
- **Implementation Complexity:** Unknown; no new estimate assigned.
- **Open Questions:** Use the linked feature, flow, and unverified-items reports for unresolved product or runtime questions.
- **Evidence references:** audit-output/precision-slate-v43-20261029/05_FEATURE_GAP_MATRIX.csv; docs/ux-inventory/VISUAL_PAIR_REVIEW.csv; docs/ux-inventory/INVENTORY.csv


## GAP-0011 — الأموال المنتظرة غير متاحة

- **Category:** MISSING_FEATURE
- **Priority:** P2
- **Confidence:** Medium or Not Verified; see source classification
- **Affected Module:** Finance
- **Affected Screen IDs:** SCR-017/035
- **Affected Element IDs:** Not mapped in surviving traceability records; see interactive inventory by Screen ID.
- **Related Feature IDs:** F-035
- **Related Flow IDs:** See 06_USER_FLOW_AUDIT.md; no flow is claimed from a screenshot alone.
- **Design Reference:** المالية
- **Current System Evidence:** No implementing web page/interaction found in static route/component search; see gap register.; No matching web API found for the complete feature; details and scope limits in report 08.; Static schema artifacts only; no live DB query. See report 08.
- **Expected Behavior:** قائمة مبالغ متوقعة بمصدر واستحقاق وحالة وتسوية.
- **Actual Behavior:** MISSING; Source-only comparison; no browser/API/database execution.
- **Exact Missing or Incorrect Detail:** الأموال المنتظرة غير متاحة
- **Why This Is a Gap:** The persisted backlog records this expected behavior and acceptance condition; current evidence above records the observed or classified implementation state.
- **User Impact:** Not independently rated in the surviving evidence; priority is inherited from the persisted backlog.
- **Business Impact:** Not independently rated in the surviving evidence; consult the feature and flow records before implementation.
- **Technical Impact:** See frontend/backend/database evidence above; where absent, implementation layer is unverified.
- **Root Cause:** Unknown unless identified in cited system evidence.
- **Dependencies:** تعريف مصادر الأموال والتمييز عن الذمم.
- **Suggested Corrective Action:** الأموال المنتظرة غير متاحة: قائمة مبالغ متوقعة بمصدر واستحقاق وحالة وتسوية.
- **Acceptance Criteria:** كل مبلغ له مصدر وتاريخ وحالة وانتقال موثق دون تكرار.
- **Recommended Verification Method:** مراجعة قواعد العمل وسيناريوهات وصول/تأخر.
- **Implementation Complexity:** Unknown; no new estimate assigned.
- **Open Questions:** Use the linked feature, flow, and unverified-items reports for unresolved product or runtime questions.
- **Evidence references:** audit-output/precision-slate-v43-20261029/05_FEATURE_GAP_MATRIX.csv; docs/ux-inventory/VISUAL_PAIR_REVIEW.csv; docs/ux-inventory/INVENTORY.csv


## GAP-0012 — خطط أقساط الشركاء غير متاحة

- **Category:** MISSING_FEATURE
- **Priority:** P2
- **Confidence:** Medium or Not Verified; see source classification
- **Affected Module:** Finance
- **Affected Screen IDs:** SCR-017
- **Affected Element IDs:** Not mapped in surviving traceability records; see interactive inventory by Screen ID.
- **Related Feature IDs:** F-036
- **Related Flow IDs:** See 06_USER_FLOW_AUDIT.md; no flow is claimed from a screenshot alone.
- **Design Reference:** المالية
- **Current System Evidence:** No implementing web page/interaction found in static route/component search; see gap register.; No matching web API found for the complete feature; details and scope limits in report 08.; Static schema artifacts only; no live DB query. See report 08.
- **Expected Behavior:** متابعة قسط مستحق ومدفوع ومتأخر ومتبقي.
- **Actual Behavior:** MISSING; Source-only comparison; no browser/API/database execution.
- **Exact Missing or Incorrect Detail:** خطط أقساط الشركاء غير متاحة
- **Why This Is a Gap:** The persisted backlog records this expected behavior and acceptance condition; current evidence above records the observed or classified implementation state.
- **User Impact:** Not independently rated in the surviving evidence; priority is inherited from the persisted backlog.
- **Business Impact:** Not independently rated in the surviving evidence; consult the feature and flow records before implementation.
- **Technical Impact:** See frontend/backend/database evidence above; where absent, implementation layer is unverified.
- **Root Cause:** Unknown unless identified in cited system evidence.
- **Dependencies:** قواعد الشريك والاعتماد والربط بالدفعات.
- **Suggested Corrective Action:** خطط أقساط الشركاء غير متاحة: متابعة قسط مستحق ومدفوع ومتأخر ومتبقي.
- **Acceptance Criteria:** تعرض الاستحقاق والمدفوع والمتبقي والحالة مع سجل تعديل.
- **Recommended Verification Method:** اختبار قسط متأخر ومدفوع جزئيًا على بيانات fixture.
- **Implementation Complexity:** Unknown; no new estimate assigned.
- **Open Questions:** Use the linked feature, flow, and unverified-items reports for unresolved product or runtime questions.
- **Evidence references:** audit-output/precision-slate-v43-20261029/05_FEATURE_GAP_MATRIX.csv; docs/ux-inventory/VISUAL_PAIR_REVIEW.csv; docs/ux-inventory/INVENTORY.csv


## GAP-0013 — ميزانية المصروفات غير متاحة

- **Category:** MISSING_SCREEN
- **Priority:** P2
- **Confidence:** High for recorded visual/result evidence
- **Affected Module:** Finance
- **Affected Screen IDs:** SCR-056
- **Affected Element IDs:** Not mapped in surviving traceability records; see interactive inventory by Screen ID.
- **Related Feature IDs:** F-037
- **Related Flow IDs:** See 06_USER_FLOW_AUDIT.md; no flow is claimed from a screenshot alone.
- **Design Reference:** docs/ux-inventory/screenshots/reference/activated/expense-budget-1280.png; docs/ux-inventory/screenshots/reference/activated/expense-budget-768.png; docs/ux-inventory/screenshots/reference/activated/expense-budget-390.png
- **Current System Evidence:** docs/ux-inventory/screenshots/system-mock/react/visual-round6/finance-overview-bottom-1280.png; docs/ux-inventory/screenshots/system-mock/react/visual-round6/finance-overview-bottom-768.png; docs/ux-inventory/screenshots/system-mock/react/visual-round6/finance-overview-bottom-390.png; No implementing web page/interaction found in static route/component search; see gap register.; No matching web API found for the complete feature; details and scope limits in report 08.; Static schema artifacts only; no live DB query. See report 08.
- **Expected Behavior:** مبلغ مخطط حسب تصنيف وفترة مع مقارنة الفعلي والانحراف.
- **Actual Behavior:** المرجع يعرض ميزانية حسب البند والسقف/الفعلي والنسبة/الحالة؛ النظام يعلن عدم ارتباط الميزة ولا يفتح شاشة.
- **Exact Missing or Incorrect Detail:** ميزانية المصروفات غير متاحة
- **Why This Is a Gap:** The persisted backlog records this expected behavior and acceptance condition; current evidence above records the observed or classified implementation state.
- **User Impact:** Not independently rated in the surviving evidence; priority is inherited from the persisted backlog.
- **Business Impact:** Not independently rated in the surviving evidence; consult the feature and flow records before implementation.
- **Technical Impact:** See frontend/backend/database evidence above; where absent, implementation layer is unverified.
- **Root Cause:** Unknown unless identified in cited system evidence.
- **Dependencies:** سياسة تجاوز الحد والعملة والفترة والتصنيف.
- **Suggested Corrective Action:** ميزانية المصروفات غير متاحة: مبلغ مخطط حسب تصنيف وفترة مع مقارنة الفعلي والانحراف.
- **Acceptance Criteria:** تعرض المخطط والفعلي والمتبقي والفارق بمصدر واضح.
- **Recommended Verification Method:** مقارنة حسابات على مجموعة مصروفات معلومة.
- **Implementation Complexity:** Unknown; no new estimate assigned.
- **Open Questions:** Use the linked feature, flow, and unverified-items reports for unresolved product or runtime questions.
- **Evidence references:** docs/ux-inventory/screenshots/system-mock/state-comparisons/round6-expense-budget-1280-side-by-side.png; docs/ux-inventory/screenshots/system-mock/state-comparisons/round6-expense-budget-768-side-by-side.png; docs/ux-inventory/screenshots/system-mock/state-comparisons/round6-expense-budget-390-side-by-side.png; audit-output/precision-slate-v43-20261029/05_FEATURE_GAP_MATRIX.csv; docs/ux-inventory/VISUAL_PAIR_REVIEW.csv; docs/ux-inventory/INVENTORY.csv


## GAP-0014 — المصروفات المتكررة غير متاحة

- **Category:** MISSING_SCREEN
- **Priority:** P2
- **Confidence:** High for recorded visual/result evidence
- **Affected Module:** Finance
- **Affected Screen IDs:** SCR-057
- **Affected Element IDs:** Not mapped in surviving traceability records; see interactive inventory by Screen ID.
- **Related Feature IDs:** F-038
- **Related Flow IDs:** See 06_USER_FLOW_AUDIT.md; no flow is claimed from a screenshot alone.
- **Design Reference:** docs/ux-inventory/screenshots/reference/activated/recurring-expenses-1280.png; docs/ux-inventory/screenshots/reference/activated/recurring-expenses-768.png; docs/ux-inventory/screenshots/reference/activated/recurring-expenses-390.png
- **Current System Evidence:** docs/ux-inventory/screenshots/system-mock/react/visual-round6/finance-overview-bottom-1280.png; docs/ux-inventory/screenshots/system-mock/react/visual-round6/finance-overview-bottom-768.png; docs/ux-inventory/screenshots/system-mock/react/visual-round6/finance-overview-bottom-390.png; No implementing web page/interaction found in static route/component search; see gap register.; No matching web API found for the complete feature; details and scope limits in report 08.; Static schema artifacts only; no live DB query. See report 08.
- **Expected Behavior:** جدولة دورية مع مراجعة أو تسجيل محدد.
- **Actual Behavior:** المرجع يعرض إعداد المصروف المتكرر وجدول السجلات؛ النظام يعلن عدم ارتباط الميزة ولا يعرض صفحة/نموذجًا.
- **Exact Missing or Incorrect Detail:** المصروفات المتكررة غير متاحة
- **Why This Is a Gap:** The persisted backlog records this expected behavior and acceptance condition; current evidence above records the observed or classified implementation state.
- **User Impact:** Not independently rated in the surviving evidence; priority is inherited from the persisted backlog.
- **Business Impact:** Not independently rated in the surviving evidence; consult the feature and flow records before implementation.
- **Technical Impact:** See frontend/backend/database evidence above; where absent, implementation layer is unverified.
- **Root Cause:** Unknown unless identified in cited system evidence.
- **Dependencies:** اعتماد بشري أو تلقائي وسياسة إيقاف وتعديل.
- **Suggested Corrective Action:** المصروفات المتكررة غير متاحة: جدولة دورية مع مراجعة أو تسجيل محدد.
- **Acceptance Criteria:** الاستحقاق ينشأ مرة واحدة ويمكن إيقافه وتعديله مع سجل.
- **Recommended Verification Method:** اختبار استحقاق واحد وإعادة تشغيل scheduler بلا ازدواج.
- **Implementation Complexity:** Unknown; no new estimate assigned.
- **Open Questions:** Use the linked feature, flow, and unverified-items reports for unresolved product or runtime questions.
- **Evidence references:** docs/ux-inventory/screenshots/system-mock/state-comparisons/round6-recurring-expenses-1280-side-by-side.png; docs/ux-inventory/screenshots/system-mock/state-comparisons/round6-recurring-expenses-768-side-by-side.png; docs/ux-inventory/screenshots/system-mock/state-comparisons/round6-recurring-expenses-390-side-by-side.png; audit-output/precision-slate-v43-20261029/05_FEATURE_GAP_MATRIX.csv; docs/ux-inventory/VISUAL_PAIR_REVIEW.csv; docs/ux-inventory/INVENTORY.csv


## GAP-0015 — مقارنة شهر بشهر غير موجودة

- **Category:** MISSING_SCREEN
- **Priority:** P2
- **Confidence:** High for recorded visual/result evidence
- **Affected Module:** Finance
- **Affected Screen IDs:** SCR-058
- **Affected Element IDs:** Not mapped in surviving traceability records; see interactive inventory by Screen ID.
- **Related Feature IDs:** F-039
- **Related Flow IDs:** See 06_USER_FLOW_AUDIT.md; no flow is claimed from a screenshot alone.
- **Design Reference:** docs/ux-inventory/screenshots/reference/activated/monthly-comparison-1280.png; docs/ux-inventory/screenshots/reference/activated/monthly-comparison-768.png; docs/ux-inventory/screenshots/reference/activated/monthly-comparison-390.png
- **Current System Evidence:** docs/ux-inventory/screenshots/system-mock/react/visual-round6/finance-overview-bottom-1280.png; docs/ux-inventory/screenshots/system-mock/react/visual-round6/finance-overview-bottom-768.png; docs/ux-inventory/screenshots/system-mock/react/visual-round6/finance-overview-bottom-390.png; No implementing web page/interaction found in static route/component search; see gap register.; No matching web API found for the complete feature; details and scope limits in report 08.; Static schema artifacts only; no live DB query. See report 08.
- **Expected Behavior:** اختيار فترتين وعرض المؤشر والفارق العددي/النسبي.
- **Actual Behavior:** المرجع يعرض مقارنة مبيعات ومصروفات وربح شهري؛ النظام يعلن عدم ارتباط الميزة ولا يعرض شاشة مقارنة.
- **Exact Missing or Incorrect Detail:** مقارنة شهر بشهر غير موجودة
- **Why This Is a Gap:** The persisted backlog records this expected behavior and acceptance condition; current evidence above records the observed or classified implementation state.
- **User Impact:** Not independently rated in the surviving evidence; priority is inherited from the persisted backlog.
- **Business Impact:** Not independently rated in the surviving evidence; consult the feature and flow records before implementation.
- **Technical Impact:** See frontend/backend/database evidence above; where absent, implementation layer is unverified.
- **Root Cause:** Unknown unless identified in cited system evidence.
- **Dependencies:** قائمة المقاييس وقاعدة الفترات والصفر.
- **Suggested Corrective Action:** مقارنة شهر بشهر غير موجودة: اختيار فترتين وعرض المؤشر والفارق العددي/النسبي.
- **Acceptance Criteria:** الفترة والقيمة والفارق مع معالجة صفر/فترة بلا بيانات.
- **Recommended Verification Method:** مقارنة فترتين fixture مع إجمالي محسوب يدويًا.
- **Implementation Complexity:** Unknown; no new estimate assigned.
- **Open Questions:** Use the linked feature, flow, and unverified-items reports for unresolved product or runtime questions.
- **Evidence references:** docs/ux-inventory/screenshots/system-mock/state-comparisons/round6-monthly-comparison-1280-side-by-side.png; docs/ux-inventory/screenshots/system-mock/state-comparisons/round6-monthly-comparison-768-side-by-side.png; docs/ux-inventory/screenshots/system-mock/state-comparisons/round6-monthly-comparison-390-side-by-side.png; audit-output/precision-slate-v43-20261029/05_FEATURE_GAP_MATRIX.csv; docs/ux-inventory/VISUAL_PAIR_REVIEW.csv; docs/ux-inventory/INVENTORY.csv


## GAP-0016 — توقع السيولة غير موجود

- **Category:** MISSING_SCREEN
- **Priority:** P2
- **Confidence:** High for recorded visual/result evidence
- **Affected Module:** Finance
- **Affected Screen IDs:** SCR-059
- **Affected Element IDs:** Not mapped in surviving traceability records; see interactive inventory by Screen ID.
- **Related Feature IDs:** F-040
- **Related Flow IDs:** See 06_USER_FLOW_AUDIT.md; no flow is claimed from a screenshot alone.
- **Design Reference:** docs/ux-inventory/screenshots/reference/activated/cash-forecast-1280.png; docs/ux-inventory/screenshots/reference/activated/cash-forecast-768.png; docs/ux-inventory/screenshots/reference/activated/cash-forecast-390.png
- **Current System Evidence:** docs/ux-inventory/screenshots/system-mock/react/visual-round6/finance-overview-bottom-1280.png; docs/ux-inventory/screenshots/system-mock/react/visual-round6/finance-overview-bottom-768.png; docs/ux-inventory/screenshots/system-mock/react/visual-round6/finance-overview-bottom-390.png; No implementing web page/interaction found in static route/component search; see gap register.; No matching web API found for the complete feature; details and scope limits in report 08.; Static schema artifacts only; no live DB query. See report 08.
- **Expected Behavior:** توقع الداخل والخارج بفترة مع فصل المتوقع عن الفعلي والمصدر.
- **Actual Behavior:** المرجع يعرض رصيدًا وتدفقات أسبوعية؛ النظام يعلن عدم ارتباط الميزة ولا يعرض شاشة توقع.
- **Exact Missing or Incorrect Detail:** توقع السيولة غير موجود
- **Why This Is a Gap:** The persisted backlog records this expected behavior and acceptance condition; current evidence above records the observed or classified implementation state.
- **User Impact:** Not independently rated in the surviving evidence; priority is inherited from the persisted backlog.
- **Business Impact:** Not independently rated in the surviving evidence; consult the feature and flow records before implementation.
- **Technical Impact:** See frontend/backend/database evidence above; where absent, implementation layer is unverified.
- **Root Cause:** Unknown unless identified in cited system evidence.
- **Dependencies:** تعريف الذمم والأقساط والمصروفات المتكررة.
- **Suggested Corrective Action:** توقع السيولة غير موجود: توقع الداخل والخارج بفترة مع فصل المتوقع عن الفعلي والمصدر.
- **Acceptance Criteria:** كل مبلغ متوقع موسوم ومصدره معروف ومجموعه قابل للمراجعة.
- **Recommended Verification Method:** reconciliation على سيناريو تواريخ ومصادر معروف.
- **Implementation Complexity:** Unknown; no new estimate assigned.
- **Open Questions:** Use the linked feature, flow, and unverified-items reports for unresolved product or runtime questions.
- **Evidence references:** docs/ux-inventory/screenshots/system-mock/state-comparisons/round6-cash-forecast-1280-side-by-side.png; docs/ux-inventory/screenshots/system-mock/state-comparisons/round6-cash-forecast-768-side-by-side.png; docs/ux-inventory/screenshots/system-mock/state-comparisons/round6-cash-forecast-390-side-by-side.png; audit-output/precision-slate-v43-20261029/05_FEATURE_GAP_MATRIX.csv; docs/ux-inventory/VISUAL_PAIR_REVIEW.csv; docs/ux-inventory/INVENTORY.csv


## GAP-0017 — أدوات البيانات في الويب mock وليست متصلة

- **Category:** PARTIAL_FEATURE
- **Priority:** P2
- **Confidence:** High for recorded visual/result evidence
- **Affected Module:** Data tools
- **Affected Screen IDs:** أدوات البيانات الديناميكية؛ لا SCR ثابت.
- **Affected Element IDs:** Not mapped in surviving traceability records; see interactive inventory by Screen ID.
- **Related Feature IDs:** F-042
- **Related Flow IDs:** See 06_USER_FLOW_AUDIT.md; no flow is claimed from a screenshot alone.
- **Design Reference:** docs/ux-inventory/screenshots/reference/activated/excel-import-1280.png; docs/ux-inventory/screenshots/reference/activated/excel-import-768.png; docs/ux-inventory/screenshots/reference/activated/excel-import-390.png; docs/ux-inventory/screenshots/reference/activated/daily-summary-1280.png; docs/ux-inventory/screenshots/reference/activated/daily-summary-768.png; docs/ux-inventory/screenshots/reference/activated/daily-summary-390.png
- **Current System Evidence:** docs/ux-inventory/screenshots/system-mock/react/visual-round6/locked-excel-import-1280.png; docs/ux-inventory/screenshots/system-mock/react/visual-round6/locked-excel-import-768.png; docs/ux-inventory/screenshots/system-mock/react/visual-round6/locked-excel-import-390.png; docs/ux-inventory/screenshots/system-mock/react/visual-round6/locked-daily-summary-1280.png; docs/ux-inventory/screenshots/system-mock/react/visual-round6/locked-daily-summary-768.png; docs/ux-inventory/screenshots/system-mock/react/visual-round6/locked-daily-summary-390.png; Runtime screenshot and click evidence in docs/ux-inventory; نقر النافذتين عند 1280/768/390 ثم Escape؛ نافذة تجريبية عامة بلا استيراد أو تقرير يومي.; No matching web API found for the complete feature; details and scope limits in report 08.; Static schema artifacts only; no live DB query. See report 08.
- **Expected Behavior:** رفع ومعاينة وتحقق ثم تطبيق بعد تأكيد وعرض ملخص يومي.
- **Actual Behavior:** النقر عند 1280/768/390 يفتح نافذة تجريبية عامة بلا رفع/معاينة؛ المرجع يعرض التبويبات وحقل الملف والقالب. / النقر عند 1280/768/390 يفتح نافذة عامة؛ المرجع يعرض التقرير وخيارات النسخ والتذكير.
- **Exact Missing or Incorrect Detail:** أدوات البيانات في الويب mock وليست متصلة
- **Why This Is a Gap:** The persisted backlog records this expected behavior and acceptance condition; current evidence above records the observed or classified implementation state.
- **User Impact:** Not independently rated in the surviving evidence; priority is inherited from the persisted backlog.
- **Business Impact:** Not independently rated in the surviving evidence; consult the feature and flow records before implementation.
- **Technical Impact:** See frontend/backend/database evidence above; where absent, implementation layer is unverified.
- **Root Cause:** Unknown unless identified in cited system evidence.
- **Dependencies:** أمان الرفع والمعاينة والصلاحيات وidempotency.
- **Suggested Corrective Action:** أدوات البيانات في الويب mock وليست متصلة: رفع ومعاينة وتحقق ثم تطبيق بعد تأكيد وعرض ملخص يومي.
- **Acceptance Criteria:** preview لا يكتب؛ apply مؤكد؛ أخطاء الصفوف والنتيجة تظهر بوضوح.
- **Recommended Verification Method:** ملف اختبار سليم ومعيب؛ لا apply على أي بيانات حقيقية.
- **Implementation Complexity:** Unknown; no new estimate assigned.
- **Open Questions:** Use the linked feature, flow, and unverified-items reports for unresolved product or runtime questions.
- **Evidence references:** docs/ux-inventory/screenshots/system-mock/state-comparisons/round6-excel-import-1280-side-by-side.png; docs/ux-inventory/screenshots/system-mock/state-comparisons/round6-excel-import-768-side-by-side.png; docs/ux-inventory/screenshots/system-mock/state-comparisons/round6-excel-import-390-side-by-side.png; docs/ux-inventory/screenshots/system-mock/state-comparisons/round6-daily-summary-1280-side-by-side.png; docs/ux-inventory/screenshots/system-mock/state-comparisons/round6-daily-summary-768-side-by-side.png; docs/ux-inventory/screenshots/system-mock/state-comparisons/round6-daily-summary-390-side-by-side.png; audit-output/precision-slate-v43-20261029/05_FEATURE_GAP_MATRIX.csv; docs/ux-inventory/VISUAL_PAIR_REVIEW.csv; docs/ux-inventory/INVENTORY.csv


## GAP-0018 — النسخ والاستعادة لا تظهر للمستخدم

- **Category:** UNVERIFIED_BEHAVIOR
- **Priority:** P2
- **Confidence:** Medium or Not Verified; see source classification
- **Affected Module:** SCR-025 — التقارير المالية
- **Affected Screen IDs:** SCR-025
- **Affected Element IDs:** Not mapped in surviving traceability records; see interactive inventory by Screen ID.
- **Related Feature IDs:** F-044
- **Related Flow IDs:** See 06_USER_FLOW_AUDIT.md; no flow is claimed from a screenshot alone.
- **Design Reference:** See screen inventory and feature matrix.
- **Current System Evidence:** docs/ux-inventory/screenshots/reference/screens/reports-financial-1280.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/reports-financial-1280.png; docs/ux-inventory/screenshots/system-mock/all-reports-financial-1280-side-by-side.png; docs/ux-inventory/screenshots/reference/screens/reports-financial-390.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/reports-financial-390.png; docs/ux-inventory/screenshots/system-mock/all-reports-financial-390-side-by-side.png; docs/ux-inventory/screenshots/reference/screens/reports-financial-768.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/reports-financial-768.png; docs/ux-inventory/screenshots/system-mock/all-reports-financial-768-side-by-side.png
- **Expected Behavior:** استعراض حالة النسخ وإنشاء نسخة محكومة وإظهار النتيجة.
- **Actual Behavior:** Not verified; No runtime evidence recorded.
- **Exact Missing or Incorrect Detail:** النسخ والاستعادة لا تظهر للمستخدم
- **Why This Is a Gap:** The persisted backlog records this expected behavior and acceptance condition; current evidence above records the observed or classified implementation state.
- **User Impact:** Not independently rated in the surviving evidence; priority is inherited from the persisted backlog.
- **Business Impact:** Not independently rated in the surviving evidence; consult the feature and flow records before implementation.
- **Technical Impact:** See frontend/backend/database evidence above; where absent, implementation layer is unverified.
- **Root Cause:** Unknown unless identified in cited system evidence.
- **Dependencies:** صلاحيات، سجلات تدقيق، نطاق scratch للاستعادة.
- **Suggested Corrective Action:** النسخ والاستعادة لا تظهر للمستخدم: استعراض حالة النسخ وإنشاء نسخة محكومة وإظهار النتيجة.
- **Acceptance Criteria:** يظهر آخر وقت ونتيجة؛ لا restore بلا تأكيد وفحص scratch وتسجيل أثر.
- **Recommended Verification Method:** مراجعة أوامر read-only الآن؛ sandbox مستقل بعد التنفيذ.
- **Implementation Complexity:** Unknown; no new estimate assigned.
- **Open Questions:** Use the linked feature, flow, and unverified-items reports for unresolved product or runtime questions.
- **Evidence references:** audit-output/precision-slate-v43-20261029/05_FEATURE_GAP_MATRIX.csv; docs/ux-inventory/VISUAL_PAIR_REVIEW.csv; docs/ux-inventory/INVENTORY.csv


## GAP-0019 — عدد التقارير المعلن بلا فهرس تقارير مكتمل

- **Category:** UNVERIFIED_BEHAVIOR
- **Priority:** P2
- **Confidence:** Medium or Not Verified; see source classification
- **Affected Module:** See screen and feature inventory.
- **Affected Screen IDs:** SCR-019 وما يرتبط به
- **Affected Element IDs:** Not mapped in surviving traceability records; see interactive inventory by Screen ID.
- **Related Feature IDs:** F-027/F-028
- **Related Flow IDs:** See 06_USER_FLOW_AUDIT.md; no flow is claimed from a screenshot alone.
- **Design Reference:** See screen inventory and feature matrix.
- **Current System Evidence:** See source and screen inventory references in the feature matrix.
- **Expected Behavior:** قائمة canonical باسم وهدف وفلاتر ومخرجات وصلاحية كل تقرير.
- **Actual Behavior:** Not verified; No runtime evidence recorded.
- **Exact Missing or Incorrect Detail:** عدد التقارير المعلن بلا فهرس تقارير مكتمل
- **Why This Is a Gap:** The persisted backlog records this expected behavior and acceptance condition; current evidence above records the observed or classified implementation state.
- **User Impact:** Not independently rated in the surviving evidence; priority is inherited from the persisted backlog.
- **Business Impact:** Not independently rated in the surviving evidence; consult the feature and flow records before implementation.
- **Technical Impact:** See frontend/backend/database evidence above; where absent, implementation layer is unverified.
- **Root Cause:** Unknown unless identified in cited system evidence.
- **Dependencies:** اعتماد مالك المنتج للتصميم.
- **Suggested Corrective Action:** عدد التقارير المعلن بلا فهرس تقارير مكتمل: قائمة canonical باسم وهدف وفلاتر ومخرجات وصلاحية كل تقرير.
- **Acceptance Criteria:** كل رقم يطابق قائمة محددة؛ كل بطاقة لها target وحقول ومصدر.
- **Recommended Verification Method:** مقارنة الفهرس المعتمد مع routes وواجهات ReportsPage.
- **Implementation Complexity:** Unknown; no new estimate assigned.
- **Open Questions:** Use the linked feature, flow, and unverified-items reports for unresolved product or runtime questions.
- **Evidence references:** audit-output/precision-slate-v43-20261029/05_FEATURE_GAP_MATRIX.csv; docs/ux-inventory/VISUAL_PAIR_REVIEW.csv; docs/ux-inventory/INVENTORY.csv


## GAP-0020 — بيانات التحليل بلوحة التحكم تنتظر schema

- **Category:** UNVERIFIED_BEHAVIOR
- **Priority:** P2
- **Confidence:** Medium or Not Verified; see source classification
- **Affected Module:** SCR-001 — لوحة التحكم
- **Affected Screen IDs:** SCR-001
- **Affected Element IDs:** Not mapped in surviving traceability records; see interactive inventory by Screen ID.
- **Related Feature IDs:** F-002
- **Related Flow IDs:** See 06_USER_FLOW_AUDIT.md; no flow is claimed from a screenshot alone.
- **Design Reference:** See screen inventory and feature matrix.
- **Current System Evidence:** docs/ux-inventory/screenshots/reference/screens/dashboard-1280.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/dashboard-1280.png; docs/ux-inventory/screenshots/system-mock/dashboard_visible_1280.png; docs/ux-inventory/screenshots/system-mock/dashboard_visible_390.png; docs/ux-inventory/screenshots/system-mock/all-dashboard-1280-side-by-side.png; docs/ux-inventory/screenshots/reference/screens/dashboard-390.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/dashboard-390.png; docs/ux-inventory/screenshots/system-mock/all-dashboard-390-side-by-side.png; docs/ux-inventory/screenshots/reference/screens/dashboard-768.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/dashboard-768.png; docs/ux-inventory/screenshots/system-mock/all-dashboard-768-side-by-side.png
- **Expected Behavior:** إظهار تحليلات وتنبيهات مستمدة من endpoints.
- **Actual Behavior:** Not verified; No runtime evidence recorded.
- **Exact Missing or Incorrect Detail:** بيانات التحليل بلوحة التحكم تنتظر schema
- **Why This Is a Gap:** The persisted backlog records this expected behavior and acceptance condition; current evidence above records the observed or classified implementation state.
- **User Impact:** Not independently rated in the surviving evidence; priority is inherited from the persisted backlog.
- **Business Impact:** Not independently rated in the surviving evidence; consult the feature and flow records before implementation.
- **Technical Impact:** See frontend/backend/database evidence above; where absent, implementation layer is unverified.
- **Root Cause:** Unknown unless identified in cited system evidence.
- **Dependencies:** تعريف مؤشرات وفترات وصلاحيات البيانات.
- **Suggested Corrective Action:** بيانات التحليل بلوحة التحكم تنتظر schema: إظهار تحليلات وتنبيهات مستمدة من endpoints.
- **Acceptance Criteria:** بيانات موثقة مع تاريخ تحديث وحالات empty/loading/error/retry.
- **Recommended Verification Method:** مطابقة values لتجميعة بيانات fixture.
- **Implementation Complexity:** Unknown; no new estimate assigned.
- **Open Questions:** Use the linked feature, flow, and unverified-items reports for unresolved product or runtime questions.
- **Evidence references:** audit-output/precision-slate-v43-20261029/05_FEATURE_GAP_MATRIX.csv; docs/ux-inventory/VISUAL_PAIR_REVIEW.csv; docs/ux-inventory/INVENTORY.csv


## GAP-0021 — إعدادات أقل من نطاق المرجع

- **Category:** UNVERIFIED_BEHAVIOR
- **Priority:** P2
- **Confidence:** Medium or Not Verified; see source classification
- **Affected Module:** SCR-025 — التقارير المالية
- **Affected Screen IDs:** SCR-025
- **Affected Element IDs:** Not mapped in surviving traceability records; see interactive inventory by Screen ID.
- **Related Feature IDs:** F-041
- **Related Flow IDs:** See 06_USER_FLOW_AUDIT.md; no flow is claimed from a screenshot alone.
- **Design Reference:** See screen inventory and feature matrix.
- **Current System Evidence:** docs/ux-inventory/screenshots/reference/screens/reports-financial-1280.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/reports-financial-1280.png; docs/ux-inventory/screenshots/system-mock/all-reports-financial-1280-side-by-side.png; docs/ux-inventory/screenshots/reference/screens/reports-financial-390.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/reports-financial-390.png; docs/ux-inventory/screenshots/system-mock/all-reports-financial-390-side-by-side.png; docs/ux-inventory/screenshots/reference/screens/reports-financial-768.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/reports-financial-768.png; docs/ux-inventory/screenshots/system-mock/all-reports-financial-768-side-by-side.png
- **Expected Behavior:** تقسيم الإعدادات المرجعية مع حفظ وتغذية من API.
- **Actual Behavior:** Not verified; No runtime evidence recorded.
- **Exact Missing or Incorrect Detail:** إعدادات أقل من نطاق المرجع
- **Why This Is a Gap:** The persisted backlog records this expected behavior and acceptance condition; current evidence above records the observed or classified implementation state.
- **User Impact:** Not independently rated in the surviving evidence; priority is inherited from the persisted backlog.
- **Business Impact:** Not independently rated in the surviving evidence; consult the feature and flow records before implementation.
- **Technical Impact:** See frontend/backend/database evidence above; where absent, implementation layer is unverified.
- **Root Cause:** Unknown unless identified in cited system evidence.
- **Dependencies:** تعريف الحقول المسموحة لكل دور وAPI.
- **Suggested Corrective Action:** إعدادات أقل من نطاق المرجع: تقسيم الإعدادات المرجعية مع حفظ وتغذية من API.
- **Acceptance Criteria:** كل field إما موصول بخدمة أو موضح أنه غير متاح؛ حالات حفظ/خطأ سليمة.
- **Recommended Verification Method:** مقارنة مصدر tab-by-tab مع صفحات/مسارات API.
- **Implementation Complexity:** Unknown; no new estimate assigned.
- **Open Questions:** Use the linked feature, flow, and unverified-items reports for unresolved product or runtime questions.
- **Evidence references:** audit-output/precision-slate-v43-20261029/05_FEATURE_GAP_MATRIX.csv; docs/ux-inventory/VISUAL_PAIR_REVIEW.csv; docs/ux-inventory/INVENTORY.csv


## GAP-0022 — handlers في المرجع تصل إلى panels غير موجودة

- **Category:** UNVERIFIED_BEHAVIOR
- **Priority:** P2
- **Confidence:** Medium or Not Verified; see source classification
- **Affected Module:** See screen and feature inventory.
- **Affected Screen IDs:** SCR-001 ومقاطع الإعدادات والتنقل
- **Affected Element IDs:** Not mapped in surviving traceability records; see interactive inventory by Screen ID.
- **Related Feature IDs:** F-027/F-041
- **Related Flow IDs:** See 06_USER_FLOW_AUDIT.md; no flow is claimed from a screenshot alone.
- **Design Reference:** See screen inventory and feature matrix.
- **Current System Evidence:** See source and screen inventory references in the feature matrix.
- **Expected Behavior:** كل رابط إلى شاشة موجودة أو وجهة موثقة.
- **Actual Behavior:** Not verified; No runtime evidence recorded.
- **Exact Missing or Incorrect Detail:** handlers في المرجع تصل إلى panels غير موجودة
- **Why This Is a Gap:** The persisted backlog records this expected behavior and acceptance condition; current evidence above records the observed or classified implementation state.
- **User Impact:** Not independently rated in the surviving evidence; priority is inherited from the persisted backlog.
- **Business Impact:** Not independently rated in the surviving evidence; consult the feature and flow records before implementation.
- **Technical Impact:** See frontend/backend/database evidence above; where absent, implementation layer is unverified.
- **Root Cause:** Unknown unless identified in cited system evidence.
- **Dependencies:** قرار target لكل عنصر.
- **Suggested Corrective Action:** handlers في المرجع تصل إلى panels غير موجودة: كل رابط إلى شاشة موجودة أو وجهة موثقة.
- **Acceptance Criteria:** كل handler يجد panel/route صالحًا أو يصنف صراحة خارج النطاق.
- **Recommended Verification Method:** مقارنة handler targets بقائمة panel IDs ثم تفاعل prototype لاحقًا.
- **Implementation Complexity:** Unknown; no new estimate assigned.
- **Open Questions:** Use the linked feature, flow, and unverified-items reports for unresolved product or runtime questions.
- **Evidence references:** audit-output/precision-slate-v43-20261029/05_FEATURE_GAP_MATRIX.csv; docs/ux-inventory/VISUAL_PAIR_REVIEW.csv; docs/ux-inventory/INVENTORY.csv


## GAP-0027 — Mobile navigation differs from the v43 reference

- **Category:** VISUAL_MISMATCH
- **Priority:** P2
- **Confidence:** High for recorded visual/result evidence
- **Affected Module:** Dashboard
- **Affected Screen IDs:** SCR-001 and mobile shell
- **Affected Element IDs:** Not mapped in surviving traceability records; see interactive inventory by Screen ID.
- **Related Feature IDs:** F-002
- **Related Flow IDs:** See 06_USER_FLOW_AUDIT.md; no flow is claimed from a screenshot alone.
- **Design Reference:** docs/ux-inventory/screenshots/reference/screens/dashboard-1280.png; docs/ux-inventory/screenshots/reference/screens/dashboard-390.png; docs/ux-inventory/screenshots/reference/screens/dashboard-768.png
- **Current System Evidence:** docs/ux-inventory/screenshots/system-mock/react/all-screens/dashboard-1280.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/dashboard-390.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/dashboard-768.png; Source contains the partial flow identified in gap register; runtime unverified.; Check report 08 for matched routes/controllers; no API request was executed.; Static schema artifacts only; no live DB query. See report 08.
- **Expected Behavior:** At 390px, use the navigation controls and placement shown in the approved reference.
- **Actual Behavior:** بنية لوحة المؤشرات والرسوم وترتيبها تختلف؛ بيانات الأرقام غير موحّدة، واختلاف شريط تنقل الهاتف موثق منفصلًا.
- **Exact Missing or Incorrect Detail:** Mobile navigation differs from the v43 reference
- **Why This Is a Gap:** The persisted backlog records this expected behavior and acceptance condition; current evidence above records the observed or classified implementation state.
- **User Impact:** Not independently rated in the surviving evidence; priority is inherited from the persisted backlog.
- **Business Impact:** Not independently rated in the surviving evidence; consult the feature and flow records before implementation.
- **Technical Impact:** See frontend/backend/database evidence above; where absent, implementation layer is unverified.
- **Root Cause:** Unknown unless identified in cited system evidence.
- **Dependencies:** None identified for the visual correction.
- **Suggested Corrective Action:** Mobile navigation differs from the v43 reference: At 390px, use the navigation controls and placement shown in the approved reference.
- **Acceptance Criteria:** At 390px the same navigation controls appear in the same locations as v43 and do not cover screen content.
- **Recommended Verification Method:** Matched screenshots plus touch and keyboard navigation through each item.
- **Implementation Complexity:** Unknown; no new estimate assigned.
- **Open Questions:** Use the linked feature, flow, and unverified-items reports for unresolved product or runtime questions.
- **Evidence references:** docs/ux-inventory/screenshots/system-mock/all-dashboard-1280-side-by-side.png; docs/ux-inventory/screenshots/system-mock/all-dashboard-390-side-by-side.png; docs/ux-inventory/screenshots/system-mock/all-dashboard-768-side-by-side.png; audit-output/precision-slate-v43-20261029/05_FEATURE_GAP_MATRIX.csv; docs/ux-inventory/VISUAL_PAIR_REVIEW.csv; docs/ux-inventory/INVENTORY.csv


## GAP-0028 — Login form presentation differs from the v43 reference

- **Category:** VISUAL_MISMATCH
- **Priority:** P2
- **Confidence:** High for recorded visual/result evidence
- **Affected Module:** Auth
- **Affected Screen IDs:** SCR-000
- **Affected Element IDs:** Not mapped in surviving traceability records; see interactive inventory by Screen ID.
- **Related Feature IDs:** F-001
- **Related Flow IDs:** See 06_USER_FLOW_AUDIT.md; no flow is claimed from a screenshot alone.
- **Design Reference:** docs/ux-inventory/screenshots/reference/states/login-1280.png; docs/ux-inventory/screenshots/reference/states/login-768.png; docs/ux-inventory/screenshots/reference/states/login-390.png
- **Current System Evidence:** docs/ux-inventory/screenshots/system-mock/react/login/login-1280.png; docs/ux-inventory/screenshots/system-mock/react/login/login-768.png; docs/ux-inventory/screenshots/system-mock/react/login/login-390.png; Candidate route/component mapped; actual behavior not exercised.; Check report 08 for matched routes/controllers; no API request was executed.; Static schema artifacts only; no live DB query. See report 08.
- **Expected Behavior:** Match the reference username control, labels, logo scale, and submit-button copy/layout.
- **Actual Behavior:** موضع/حجم العلامة وبطاقة الدخول والحقل الافتراضي وتوزيع المساحة تختلف بين المرجع وReact عند هذا المقاس.
- **Exact Missing or Incorrect Detail:** Login form presentation differs from the v43 reference
- **Why This Is a Gap:** The persisted backlog records this expected behavior and acceptance condition; current evidence above records the observed or classified implementation state.
- **User Impact:** Not independently rated in the surviving evidence; priority is inherited from the persisted backlog.
- **Business Impact:** Not independently rated in the surviving evidence; consult the feature and flow records before implementation.
- **Technical Impact:** See frontend/backend/database evidence above; where absent, implementation layer is unverified.
- **Root Cause:** Unknown unless identified in cited system evidence.
- **Dependencies:** Live valid/invalid authentication remains unverified.
- **Suggested Corrective Action:** Login form presentation differs from the v43 reference: Match the reference username control, labels, logo scale, and submit-button copy/layout.
- **Acceptance Criteria:** At 390px the field type, copy, logo scale, and spacing match v43; valid login still uses the API.
- **Recommended Verification Method:** Matched screenshots and live isolated-account valid/invalid login tests.
- **Implementation Complexity:** Unknown; no new estimate assigned.
- **Open Questions:** Use the linked feature, flow, and unverified-items reports for unresolved product or runtime questions.
- **Evidence references:** docs/ux-inventory/screenshots/visual-review-round2/login-1280-side-by-side.png; docs/ux-inventory/screenshots/visual-review-round2/login-768-side-by-side.png; docs/ux-inventory/screenshots/visual-review-round2/login-390-side-by-side.png; audit-output/precision-slate-v43-20261029/05_FEATURE_GAP_MATRIX.csv; docs/ux-inventory/VISUAL_PAIR_REVIEW.csv; docs/ux-inventory/INVENTORY.csv


## GAP-0029 — Finance screen hierarchy differs from the v43 reference

- **Category:** VISUAL_MISMATCH
- **Priority:** P2
- **Confidence:** High for recorded visual/result evidence
- **Affected Module:** SCR-017 — المالية
- **Affected Screen IDs:** SCR-017
- **Affected Element IDs:** Not mapped in surviving traceability records; see interactive inventory by Screen ID.
- **Related Feature IDs:** Finance feature records in INVENTORY.csv
- **Related Flow IDs:** See 06_USER_FLOW_AUDIT.md; no flow is claimed from a screenshot alone.
- **Design Reference:** docs/ux-inventory/screenshots/reference/screens/finance-1280.png; docs/ux-inventory/screenshots/reference/screens/finance-390.png; docs/ux-inventory/screenshots/reference/screens/finance-768.png
- **Current System Evidence:** docs/ux-inventory/screenshots/system-mock/react/all-screens/finance-1280.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/finance-390.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/finance-768.png
- **Expected Behavior:** Preserve the reference finance tabs, customer-account table, expense section, and their hierarchy at 390px.
- **Actual Behavior:** ترتيب أقسام المالية وبطاقاتها يختلف عن تسلسل المرجع؛ لا تُقارن الأرصدة بسبب اختلاف fixtures.
- **Exact Missing or Incorrect Detail:** Finance screen hierarchy differs from the v43 reference
- **Why This Is a Gap:** The persisted backlog records this expected behavior and acceptance condition; current evidence above records the observed or classified implementation state.
- **User Impact:** Not independently rated in the surviving evidence; priority is inherited from the persisted backlog.
- **Business Impact:** Not independently rated in the surviving evidence; consult the feature and flow records before implementation.
- **Technical Impact:** See frontend/backend/database evidence above; where absent, implementation layer is unverified.
- **Root Cause:** Unknown unless identified in cited system evidence.
- **Dependencies:** Matching finance fixtures are needed to compare values and rows.
- **Suggested Corrective Action:** Finance screen hierarchy differs from the v43 reference: Preserve the reference finance tabs, customer-account table, expense section, and their hierarchy at 390px.
- **Acceptance Criteria:** Tabs, table, and expense section follow reference order at 390px; all current actions remain reachable.
- **Recommended Verification Method:** Matched 390px images and API-backed interaction checks for each section.
- **Implementation Complexity:** Unknown; no new estimate assigned.
- **Open Questions:** Use the linked feature, flow, and unverified-items reports for unresolved product or runtime questions.
- **Evidence references:** docs/ux-inventory/screenshots/system-mock/all-finance-1280-side-by-side.png; docs/ux-inventory/screenshots/system-mock/all-finance-390-side-by-side.png; docs/ux-inventory/screenshots/system-mock/all-finance-768-side-by-side.png; audit-output/precision-slate-v43-20261029/05_FEATURE_GAP_MATRIX.csv; docs/ux-inventory/VISUAL_PAIR_REVIEW.csv; docs/ux-inventory/INVENTORY.csv


## GAP-0030 — Order creation omits reference form sections and controls

- **Category:** VISUAL_MISMATCH
- **Priority:** P2
- **Confidence:** High for recorded visual/result evidence
- **Affected Module:** Sales
- **Affected Screen IDs:** SCR-004
- **Affected Element IDs:** Not mapped in surviving traceability records; see interactive inventory by Screen ID.
- **Related Feature IDs:** F-008
- **Related Flow IDs:** See 06_USER_FLOW_AUDIT.md; no flow is claimed from a screenshot alone.
- **Design Reference:** docs/ux-inventory/screenshots/reference/screens/order-create-1280.png; docs/ux-inventory/screenshots/reference/screens/order-create-390.png; docs/ux-inventory/screenshots/reference/screens/order-create-768.png
- **Current System Evidence:** docs/ux-inventory/screenshots/system-mock/react/all-screens/order-create-1280.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/order-create-390.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/order-create-768.png; Candidate route/component mapped; actual behavior not exercised.; Check report 08 for matched routes/controllers; no API request was executed.; Static schema artifacts only; no live DB query. See report 08.
- **Expected Behavior:** Show the reference order-number/customer/date/currency/sales-representative/payment-terms/warehouse groups, item table, and financial summary.
- **Actual Behavior:** ترتيب مجموعات حقول الطلب والملخص مختلف؛ التطبيق يطيل النموذج رأسيًا قبل إظهار الأصناف.
- **Exact Missing or Incorrect Detail:** Order creation omits reference form sections and controls
- **Why This Is a Gap:** The persisted backlog records this expected behavior and acceptance condition; current evidence above records the observed or classified implementation state.
- **User Impact:** Not independently rated in the surviving evidence; priority is inherited from the persisted backlog.
- **Business Impact:** Not independently rated in the surviving evidence; consult the feature and flow records before implementation.
- **Technical Impact:** See frontend/backend/database evidence above; where absent, implementation layer is unverified.
- **Root Cause:** Unknown unless identified in cited system evidence.
- **Dependencies:** Same seeded customer/catalog/order data is needed for behavior comparison.
- **Suggested Corrective Action:** Order creation omits reference form sections and controls: Show the reference order-number/customer/date/currency/sales-representative/payment-terms/warehouse groups, item table, and financial summary.
- **Acceptance Criteria:** Each reference field is present or its unsupported contract is explicitly documented; item rows and totals follow the reference hierarchy.
- **Recommended Verification Method:** Same-fixture screenshots, then create/cancel/confirm in an isolated backend fixture.
- **Implementation Complexity:** Unknown; no new estimate assigned.
- **Open Questions:** Use the linked feature, flow, and unverified-items reports for unresolved product or runtime questions.
- **Evidence references:** docs/ux-inventory/screenshots/system-mock/all-order-create-1280-side-by-side.png; docs/ux-inventory/screenshots/system-mock/all-order-create-390-side-by-side.png; docs/ux-inventory/screenshots/system-mock/all-order-create-768-side-by-side.png; audit-output/precision-slate-v43-20261029/05_FEATURE_GAP_MATRIX.csv; docs/ux-inventory/VISUAL_PAIR_REVIEW.csv; docs/ux-inventory/INVENTORY.csv


## GAP-0031 — اختلاف ترتيب ومحتوى لوحة التحكم

- **Category:** VISUAL_MISMATCH
- **Priority:** P2
- **Confidence:** High for recorded visual/result evidence
- **Affected Module:** Dashboard
- **Affected Screen IDs:** SCR-001
- **Affected Element IDs:** Not mapped in surviving traceability records; see interactive inventory by Screen ID.
- **Related Feature IDs:** F-002
- **Related Flow IDs:** See 06_USER_FLOW_AUDIT.md; no flow is claimed from a screenshot alone.
- **Design Reference:** docs/ux-inventory/screenshots/reference/screens/dashboard-1280.png; docs/ux-inventory/screenshots/reference/screens/dashboard-390.png; docs/ux-inventory/screenshots/reference/screens/dashboard-768.png
- **Current System Evidence:** docs/ux-inventory/screenshots/system-mock/react/all-screens/dashboard-1280.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/dashboard-390.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/dashboard-768.png; Source contains the partial flow identified in gap register; runtime unverified.; Check report 08 for matched routes/controllers; no API request was executed.; Static schema artifacts only; no live DB query. See report 08.
- **Expected Behavior:** عرض مؤشرات الأداء والرسم والنشاط والخزينة وفق ترتيب مرجع v43.
- **Actual Behavior:** بنية لوحة المؤشرات والرسوم وترتيبها تختلف؛ بيانات الأرقام غير موحّدة، واختلاف شريط تنقل الهاتف موثق منفصلًا.
- **Exact Missing or Incorrect Detail:** اختلاف ترتيب ومحتوى لوحة التحكم
- **Why This Is a Gap:** The persisted backlog records this expected behavior and acceptance condition; current evidence above records the observed or classified implementation state.
- **User Impact:** Not independently rated in the surviving evidence; priority is inherited from the persisted backlog.
- **Business Impact:** Not independently rated in the surviving evidence; consult the feature and flow records before implementation.
- **Technical Impact:** See frontend/backend/database evidence above; where absent, implementation layer is unverified.
- **Root Cause:** Unknown unless identified in cited system evidence.
- **Dependencies:** الرجوع إلى الحالة نفسها والبيانات الاصطناعية نفسها عند التحقق.
- **Suggested Corrective Action:** اختلاف ترتيب ومحتوى لوحة التحكم: عرض مؤشرات الأداء والرسم والنشاط والخزينة وفق ترتيب مرجع v43.
- **Acceptance Criteria:** تتطابق البنية والترتيب المرئي مع المرجع عند 1280 و768 و390 بكسل على الحالة والبيانات نفسها: عرض مؤشرات الأداء والرسم والنشاط والخزينة وفق ترتيب مرجع v43.
- **Recommended Verification Method:** مقارنة مباشرة بصور 1280/768/390 بعد إعادة التقاط الطرفين على حالة وfixture متطابقتين.
- **Implementation Complexity:** Unknown; no new estimate assigned.
- **Open Questions:** Use the linked feature, flow, and unverified-items reports for unresolved product or runtime questions.
- **Evidence references:** docs/ux-inventory/screenshots/system-mock/all-dashboard-1280-side-by-side.png; docs/ux-inventory/screenshots/system-mock/all-dashboard-390-side-by-side.png; docs/ux-inventory/screenshots/system-mock/all-dashboard-768-side-by-side.png; audit-output/precision-slate-v43-20261029/05_FEATURE_GAP_MATRIX.csv; docs/ux-inventory/VISUAL_PAIR_REVIEW.csv; docs/ux-inventory/INVENTORY.csv


## GAP-0032 — اختلاف تكوين قائمة الطلبات

- **Category:** VISUAL_MISMATCH
- **Priority:** P2
- **Confidence:** High for recorded visual/result evidence
- **Affected Module:** Sales
- **Affected Screen IDs:** SCR-003
- **Affected Element IDs:** Not mapped in surviving traceability records; see interactive inventory by Screen ID.
- **Related Feature IDs:** F-007
- **Related Flow IDs:** See 06_USER_FLOW_AUDIT.md; no flow is claimed from a screenshot alone.
- **Design Reference:** docs/ux-inventory/screenshots/reference/screens/orders-1280.png; docs/ux-inventory/screenshots/reference/screens/orders-390.png; docs/ux-inventory/screenshots/reference/screens/orders-768.png
- **Current System Evidence:** docs/ux-inventory/screenshots/system-mock/react/all-screens/orders-1280.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/orders-390.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/orders-768.png; Candidate route/component mapped; actual behavior not exercised.; Check report 08 for matched routes/controllers; no API request was executed.; Static schema artifacts only; no live DB query. See report 08.
- **Expected Behavior:** تجميع البحث والمرشحات والجدول والترقيم وفق بنية المرجع.
- **Actual Behavior:** صف البحث والمرشحات والجدول وترقيم الصفحات أكثر اتساعًا من بنية المرجع؛ القيم والصفوف مستبعدة.
- **Exact Missing or Incorrect Detail:** اختلاف تكوين قائمة الطلبات
- **Why This Is a Gap:** The persisted backlog records this expected behavior and acceptance condition; current evidence above records the observed or classified implementation state.
- **User Impact:** Not independently rated in the surviving evidence; priority is inherited from the persisted backlog.
- **Business Impact:** Not independently rated in the surviving evidence; consult the feature and flow records before implementation.
- **Technical Impact:** See frontend/backend/database evidence above; where absent, implementation layer is unverified.
- **Root Cause:** Unknown unless identified in cited system evidence.
- **Dependencies:** الرجوع إلى الحالة نفسها والبيانات الاصطناعية نفسها عند التحقق.
- **Suggested Corrective Action:** اختلاف تكوين قائمة الطلبات: تجميع البحث والمرشحات والجدول والترقيم وفق بنية المرجع.
- **Acceptance Criteria:** تتطابق البنية والترتيب المرئي مع المرجع عند 1280 و768 و390 بكسل على الحالة والبيانات نفسها: تجميع البحث والمرشحات والجدول والترقيم وفق بنية المرجع.
- **Recommended Verification Method:** مقارنة مباشرة بصور 1280/768/390 بعد إعادة التقاط الطرفين على حالة وfixture متطابقتين.
- **Implementation Complexity:** Unknown; no new estimate assigned.
- **Open Questions:** Use the linked feature, flow, and unverified-items reports for unresolved product or runtime questions.
- **Evidence references:** docs/ux-inventory/screenshots/system-mock/all-orders-1280-side-by-side.png; docs/ux-inventory/screenshots/system-mock/all-orders-390-side-by-side.png; docs/ux-inventory/screenshots/system-mock/all-orders-768-side-by-side.png; audit-output/precision-slate-v43-20261029/05_FEATURE_GAP_MATRIX.csv; docs/ux-inventory/VISUAL_PAIR_REVIEW.csv; docs/ux-inventory/INVENTORY.csv


## GAP-0033 — اختلاف تكوين قائمة الفواتير

- **Category:** VISUAL_MISMATCH
- **Priority:** P2
- **Confidence:** High for recorded visual/result evidence
- **Affected Module:** Sales
- **Affected Screen IDs:** SCR-006
- **Affected Element IDs:** Not mapped in surviving traceability records; see interactive inventory by Screen ID.
- **Related Feature IDs:** F-010
- **Related Flow IDs:** See 06_USER_FLOW_AUDIT.md; no flow is claimed from a screenshot alone.
- **Design Reference:** docs/ux-inventory/screenshots/reference/screens/invoices-1280.png; docs/ux-inventory/screenshots/reference/screens/invoices-390.png; docs/ux-inventory/screenshots/reference/screens/invoices-768.png
- **Current System Evidence:** docs/ux-inventory/screenshots/system-mock/react/all-screens/invoices-1280.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/invoices-390.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/invoices-768.png; Candidate route/component mapped; actual behavior not exercised.; Check report 08 for matched routes/controllers; no API request was executed.; Static schema artifacts only; no live DB query. See report 08.
- **Expected Behavior:** عرض ملخصات الفواتير والمرشحات والجدول حسب ترتيب المرجع.
- **Actual Behavior:** تكوين ملخصات الفواتير والمرشحات والجدول يختلف بصريًا؛ أعداد الصفوف والقيم مستبعدة لاختلاف البيانات.
- **Exact Missing or Incorrect Detail:** اختلاف تكوين قائمة الفواتير
- **Why This Is a Gap:** The persisted backlog records this expected behavior and acceptance condition; current evidence above records the observed or classified implementation state.
- **User Impact:** Not independently rated in the surviving evidence; priority is inherited from the persisted backlog.
- **Business Impact:** Not independently rated in the surviving evidence; consult the feature and flow records before implementation.
- **Technical Impact:** See frontend/backend/database evidence above; where absent, implementation layer is unverified.
- **Root Cause:** Unknown unless identified in cited system evidence.
- **Dependencies:** الرجوع إلى الحالة نفسها والبيانات الاصطناعية نفسها عند التحقق.
- **Suggested Corrective Action:** اختلاف تكوين قائمة الفواتير: عرض ملخصات الفواتير والمرشحات والجدول حسب ترتيب المرجع.
- **Acceptance Criteria:** تتطابق البنية والترتيب المرئي مع المرجع عند 1280 و768 و390 بكسل على الحالة والبيانات نفسها: عرض ملخصات الفواتير والمرشحات والجدول حسب ترتيب المرجع.
- **Recommended Verification Method:** مقارنة مباشرة بصور 1280/768/390 بعد إعادة التقاط الطرفين على حالة وfixture متطابقتين.
- **Implementation Complexity:** Unknown; no new estimate assigned.
- **Open Questions:** Use the linked feature, flow, and unverified-items reports for unresolved product or runtime questions.
- **Evidence references:** docs/ux-inventory/screenshots/system-mock/all-invoices-1280-side-by-side.png; docs/ux-inventory/screenshots/system-mock/all-invoices-390-side-by-side.png; docs/ux-inventory/screenshots/system-mock/all-invoices-768-side-by-side.png; audit-output/precision-slate-v43-20261029/05_FEATURE_GAP_MATRIX.csv; docs/ux-inventory/VISUAL_PAIR_REVIEW.csv; docs/ux-inventory/INVENTORY.csv


## GAP-0034 — اختلاف توزيع نموذج إنشاء الفاتورة

- **Category:** VISUAL_MISMATCH
- **Priority:** P2
- **Confidence:** High for recorded visual/result evidence
- **Affected Module:** SCR-007 — إنشاء فاتورة مبيعات جديدة
- **Affected Screen IDs:** SCR-007
- **Affected Element IDs:** Not mapped in surviving traceability records; see interactive inventory by Screen ID.
- **Related Feature IDs:** Not mapped; see 05_FEATURE_GAP_MATRIX.csv.
- **Related Flow IDs:** See 06_USER_FLOW_AUDIT.md; no flow is claimed from a screenshot alone.
- **Design Reference:** docs/ux-inventory/screenshots/reference/screens/invoice-create-1280.png; docs/ux-inventory/screenshots/reference/screens/invoice-create-390.png; docs/ux-inventory/screenshots/reference/screens/invoice-create-768.png
- **Current System Evidence:** docs/ux-inventory/screenshots/system-mock/react/all-screens/invoice-create-1280.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/invoice-create-390.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/invoice-create-768.png
- **Expected Behavior:** توزيع شريط الإجراءات ونوع العملية وأقسام العميل والفاتورة على نحو المرجع.
- **Actual Behavior:** شريط الإجراءات ونوع العملية وأقسام العميل والفاتورة تتراكم رأسيًا في النظام بدل التوزيع المرجعي.
- **Exact Missing or Incorrect Detail:** اختلاف توزيع نموذج إنشاء الفاتورة
- **Why This Is a Gap:** The persisted backlog records this expected behavior and acceptance condition; current evidence above records the observed or classified implementation state.
- **User Impact:** Not independently rated in the surviving evidence; priority is inherited from the persisted backlog.
- **Business Impact:** Not independently rated in the surviving evidence; consult the feature and flow records before implementation.
- **Technical Impact:** See frontend/backend/database evidence above; where absent, implementation layer is unverified.
- **Root Cause:** Unknown unless identified in cited system evidence.
- **Dependencies:** الرجوع إلى الحالة نفسها والبيانات الاصطناعية نفسها عند التحقق.
- **Suggested Corrective Action:** اختلاف توزيع نموذج إنشاء الفاتورة: توزيع شريط الإجراءات ونوع العملية وأقسام العميل والفاتورة على نحو المرجع.
- **Acceptance Criteria:** تتطابق البنية والترتيب المرئي مع المرجع عند 1280 و768 و390 بكسل على الحالة والبيانات نفسها: توزيع شريط الإجراءات ونوع العملية وأقسام العميل والفاتورة على نحو المرجع.
- **Recommended Verification Method:** مقارنة مباشرة بصور 1280/768/390 بعد إعادة التقاط الطرفين على حالة وfixture متطابقتين.
- **Implementation Complexity:** Unknown; no new estimate assigned.
- **Open Questions:** Use the linked feature, flow, and unverified-items reports for unresolved product or runtime questions.
- **Evidence references:** docs/ux-inventory/screenshots/system-mock/all-invoice-create-1280-side-by-side.png; docs/ux-inventory/screenshots/system-mock/all-invoice-create-390-side-by-side.png; docs/ux-inventory/screenshots/system-mock/all-invoice-create-768-side-by-side.png; audit-output/precision-slate-v43-20261029/05_FEATURE_GAP_MATRIX.csv; docs/ux-inventory/VISUAL_PAIR_REVIEW.csv; docs/ux-inventory/INVENTORY.csv


## GAP-0035 — اختلاف حالة قائمة المرتجعات

- **Category:** VISUAL_MISMATCH
- **Priority:** P2
- **Confidence:** High for recorded visual/result evidence
- **Affected Module:** Sales
- **Affected Screen IDs:** SCR-012
- **Affected Element IDs:** Not mapped in surviving traceability records; see interactive inventory by Screen ID.
- **Related Feature IDs:** F-012
- **Related Flow IDs:** See 06_USER_FLOW_AUDIT.md; no flow is claimed from a screenshot alone.
- **Design Reference:** docs/ux-inventory/screenshots/reference/screens/returns-1280.png; docs/ux-inventory/screenshots/reference/screens/returns-390.png; docs/ux-inventory/screenshots/reference/screens/returns-768.png
- **Current System Evidence:** docs/ux-inventory/screenshots/system-mock/react/all-screens/returns-1280.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/returns-390.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/returns-768.png; Source contains the partial flow identified in gap register; runtime unverified.; Check report 08 for matched routes/controllers; no API request was executed.; Static schema artifacts only; no live DB query. See report 08.
- **Expected Behavior:** إبراز زر الإنشاء والجدول كما في المرجع حتى عند عدم وجود صفوف.
- **Actual Behavior:** حالة القائمة الفارغة في النظام أكبر بصريًا من الجدول وزر الإنشاء في المرجع؛ Screen ID المعتمد SCR-012.
- **Exact Missing or Incorrect Detail:** اختلاف حالة قائمة المرتجعات
- **Why This Is a Gap:** The persisted backlog records this expected behavior and acceptance condition; current evidence above records the observed or classified implementation state.
- **User Impact:** Not independently rated in the surviving evidence; priority is inherited from the persisted backlog.
- **Business Impact:** Not independently rated in the surviving evidence; consult the feature and flow records before implementation.
- **Technical Impact:** See frontend/backend/database evidence above; where absent, implementation layer is unverified.
- **Root Cause:** Unknown unless identified in cited system evidence.
- **Dependencies:** الرجوع إلى الحالة نفسها والبيانات الاصطناعية نفسها عند التحقق.
- **Suggested Corrective Action:** اختلاف حالة قائمة المرتجعات: إبراز زر الإنشاء والجدول كما في المرجع حتى عند عدم وجود صفوف.
- **Acceptance Criteria:** تتطابق البنية والترتيب المرئي مع المرجع عند 1280 و768 و390 بكسل على الحالة والبيانات نفسها: إبراز زر الإنشاء والجدول كما في المرجع حتى عند عدم وجود صفوف.
- **Recommended Verification Method:** مقارنة مباشرة بصور 1280/768/390 بعد إعادة التقاط الطرفين على حالة وfixture متطابقتين.
- **Implementation Complexity:** Unknown; no new estimate assigned.
- **Open Questions:** Use the linked feature, flow, and unverified-items reports for unresolved product or runtime questions.
- **Evidence references:** docs/ux-inventory/screenshots/system-mock/all-returns-1280-side-by-side.png; docs/ux-inventory/screenshots/system-mock/all-returns-390-side-by-side.png; docs/ux-inventory/screenshots/system-mock/all-returns-768-side-by-side.png; audit-output/precision-slate-v43-20261029/05_FEATURE_GAP_MATRIX.csv; docs/ux-inventory/VISUAL_PAIR_REVIEW.csv; docs/ux-inventory/INVENTORY.csv


## GAP-0036 — اختلاف كثافة قائمة العملاء ومرشحاتها

- **Category:** VISUAL_MISMATCH
- **Priority:** P2
- **Confidence:** High for recorded visual/result evidence
- **Affected Module:** Customer files
- **Affected Screen IDs:** SCR-002
- **Affected Element IDs:** Not mapped in surviving traceability records; see interactive inventory by Screen ID.
- **Related Feature IDs:** F-043
- **Related Flow IDs:** See 06_USER_FLOW_AUDIT.md; no flow is claimed from a screenshot alone.
- **Design Reference:** docs/ux-inventory/screenshots/reference/screens/customers-1280.png; docs/ux-inventory/screenshots/reference/screens/customers-390.png; docs/ux-inventory/screenshots/reference/screens/customers-768.png
- **Current System Evidence:** docs/ux-inventory/screenshots/system-mock/react/all-screens/customers-1280.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/customers-390.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/customers-768.png; No implementing web page/interaction found in static route/component search; see gap register.; No matching web API found for the complete feature; details and scope limits in report 08.; Static schema artifacts only; no live DB query. See report 08.
- **Expected Behavior:** الحفاظ على ترتيب المرشحات وكثافة الجدول المرجعي مع سلوك هاتف مناسب.
- **Actual Behavior:** لوحة المرشحات والجدول أعرض في النظام؛ على الهاتف تتحول الصفوف إلى بطاقات طويلة بدل كثافة جدول المرجع.
- **Exact Missing or Incorrect Detail:** اختلاف كثافة قائمة العملاء ومرشحاتها
- **Why This Is a Gap:** The persisted backlog records this expected behavior and acceptance condition; current evidence above records the observed or classified implementation state.
- **User Impact:** Not independently rated in the surviving evidence; priority is inherited from the persisted backlog.
- **Business Impact:** Not independently rated in the surviving evidence; consult the feature and flow records before implementation.
- **Technical Impact:** See frontend/backend/database evidence above; where absent, implementation layer is unverified.
- **Root Cause:** Unknown unless identified in cited system evidence.
- **Dependencies:** الرجوع إلى الحالة نفسها والبيانات الاصطناعية نفسها عند التحقق.
- **Suggested Corrective Action:** اختلاف كثافة قائمة العملاء ومرشحاتها: الحفاظ على ترتيب المرشحات وكثافة الجدول المرجعي مع سلوك هاتف مناسب.
- **Acceptance Criteria:** تتطابق البنية والترتيب المرئي مع المرجع عند 1280 و768 و390 بكسل على الحالة والبيانات نفسها: الحفاظ على ترتيب المرشحات وكثافة الجدول المرجعي مع سلوك هاتف مناسب.
- **Recommended Verification Method:** مقارنة مباشرة بصور 1280/768/390 بعد إعادة التقاط الطرفين على حالة وfixture متطابقتين.
- **Implementation Complexity:** Unknown; no new estimate assigned.
- **Open Questions:** Use the linked feature, flow, and unverified-items reports for unresolved product or runtime questions.
- **Evidence references:** docs/ux-inventory/screenshots/system-mock/all-customers-1280-side-by-side.png; docs/ux-inventory/screenshots/system-mock/all-customers-390-side-by-side.png; docs/ux-inventory/screenshots/system-mock/all-customers-768-side-by-side.png; audit-output/precision-slate-v43-20261029/05_FEATURE_GAP_MATRIX.csv; docs/ux-inventory/VISUAL_PAIR_REVIEW.csv; docs/ux-inventory/INVENTORY.csv


## GAP-0037 — اختلاف بنية قائمة الحاويات

- **Category:** VISUAL_MISMATCH
- **Priority:** P2
- **Confidence:** High for recorded visual/result evidence
- **Affected Module:** Containers
- **Affected Screen IDs:** SCR-018
- **Affected Element IDs:** Not mapped in surviving traceability records; see interactive inventory by Screen ID.
- **Related Feature IDs:** F-019
- **Related Flow IDs:** See 06_USER_FLOW_AUDIT.md; no flow is claimed from a screenshot alone.
- **Design Reference:** docs/ux-inventory/screenshots/reference/screens/containers-1280.png; docs/ux-inventory/screenshots/reference/screens/containers-390.png; docs/ux-inventory/screenshots/reference/screens/containers-768.png
- **Current System Evidence:** docs/ux-inventory/screenshots/system-mock/react/all-screens/containers-1280.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/containers-390.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/containers-768.png; Candidate route/component mapped; actual behavior not exercised.; Check report 08 for matched routes/controllers; no API request was executed.; Static schema artifacts only; no live DB query. See report 08.
- **Expected Behavior:** عرض القائمة المختصرة وترتيب بيانات الحاويات كما في المرجع.
- **Actual Behavior:** المرجع يعرض قائمة مباشرة ومختصرة؛ النظام يضع مرشحات أكبر ويحوّل الصفوف إلى بطاقات أطول على الهاتف.
- **Exact Missing or Incorrect Detail:** اختلاف بنية قائمة الحاويات
- **Why This Is a Gap:** The persisted backlog records this expected behavior and acceptance condition; current evidence above records the observed or classified implementation state.
- **User Impact:** Not independently rated in the surviving evidence; priority is inherited from the persisted backlog.
- **Business Impact:** Not independently rated in the surviving evidence; consult the feature and flow records before implementation.
- **Technical Impact:** See frontend/backend/database evidence above; where absent, implementation layer is unverified.
- **Root Cause:** Unknown unless identified in cited system evidence.
- **Dependencies:** الرجوع إلى الحالة نفسها والبيانات الاصطناعية نفسها عند التحقق.
- **Suggested Corrective Action:** اختلاف بنية قائمة الحاويات: عرض القائمة المختصرة وترتيب بيانات الحاويات كما في المرجع.
- **Acceptance Criteria:** تتطابق البنية والترتيب المرئي مع المرجع عند 1280 و768 و390 بكسل على الحالة والبيانات نفسها: عرض القائمة المختصرة وترتيب بيانات الحاويات كما في المرجع.
- **Recommended Verification Method:** مقارنة مباشرة بصور 1280/768/390 بعد إعادة التقاط الطرفين على حالة وfixture متطابقتين.
- **Implementation Complexity:** Unknown; no new estimate assigned.
- **Open Questions:** Use the linked feature, flow, and unverified-items reports for unresolved product or runtime questions.
- **Evidence references:** docs/ux-inventory/screenshots/system-mock/all-containers-1280-side-by-side.png; docs/ux-inventory/screenshots/system-mock/all-containers-390-side-by-side.png; docs/ux-inventory/screenshots/system-mock/all-containers-768-side-by-side.png; audit-output/precision-slate-v43-20261029/05_FEATURE_GAP_MATRIX.csv; docs/ux-inventory/VISUAL_PAIR_REVIEW.csv; docs/ux-inventory/INVENTORY.csv


## GAP-0038 — اختلاف مرشحات وأعمدة شاشة المنتجات

- **Category:** VISUAL_MISMATCH
- **Priority:** P2
- **Confidence:** High for recorded visual/result evidence
- **Affected Module:** Catalog
- **Affected Screen IDs:** SCR-014
- **Affected Element IDs:** Not mapped in surviving traceability records; see interactive inventory by Screen ID.
- **Related Feature IDs:** F-014
- **Related Flow IDs:** See 06_USER_FLOW_AUDIT.md; no flow is claimed from a screenshot alone.
- **Design Reference:** docs/ux-inventory/screenshots/reference/screens/products-1280.png; docs/ux-inventory/screenshots/reference/screens/products-390.png; docs/ux-inventory/screenshots/reference/screens/products-768.png
- **Current System Evidence:** docs/ux-inventory/screenshots/system-mock/react/all-screens/products-1280.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/products-390.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/products-768.png; Runtime screenshot and click evidence in docs/ux-inventory; نقرة رابط تكلفة المنتج فتحت السجل؛ لم يظهر تحكم باركود/ملصقات. الصور: round5-product-cost-history وround5-barcode-labels.; Check report 08 for matched routes/controllers; no API request was executed.; Static schema artifacts only; no live DB query. See report 08.
- **Expected Behavior:** مطابقة كثافة جدول المنتجات ومرشحاته وأعمدته للمرجع عند المقاسات الثلاثة.
- **Actual Behavior:** النظام يعرض مرشحات وأعمدة أكثر وبطاقات طويلة على الهاتف مقابل جدول المرجع؛ قيم الأصناف ليست fixture مشتركة.
- **Exact Missing or Incorrect Detail:** اختلاف مرشحات وأعمدة شاشة المنتجات
- **Why This Is a Gap:** The persisted backlog records this expected behavior and acceptance condition; current evidence above records the observed or classified implementation state.
- **User Impact:** Not independently rated in the surviving evidence; priority is inherited from the persisted backlog.
- **Business Impact:** Not independently rated in the surviving evidence; consult the feature and flow records before implementation.
- **Technical Impact:** See frontend/backend/database evidence above; where absent, implementation layer is unverified.
- **Root Cause:** Unknown unless identified in cited system evidence.
- **Dependencies:** الرجوع إلى الحالة نفسها والبيانات الاصطناعية نفسها عند التحقق.
- **Suggested Corrective Action:** اختلاف مرشحات وأعمدة شاشة المنتجات: مطابقة كثافة جدول المنتجات ومرشحاته وأعمدته للمرجع عند المقاسات الثلاثة.
- **Acceptance Criteria:** تتطابق البنية والترتيب المرئي مع المرجع عند 1280 و768 و390 بكسل على الحالة والبيانات نفسها: مطابقة كثافة جدول المنتجات ومرشحاته وأعمدته للمرجع عند المقاسات الثلاثة.
- **Recommended Verification Method:** مقارنة مباشرة بصور 1280/768/390 بعد إعادة التقاط الطرفين على حالة وfixture متطابقتين.
- **Implementation Complexity:** Unknown; no new estimate assigned.
- **Open Questions:** Use the linked feature, flow, and unverified-items reports for unresolved product or runtime questions.
- **Evidence references:** docs/ux-inventory/screenshots/system-mock/all-products-1280-side-by-side.png; docs/ux-inventory/screenshots/system-mock/all-products-390-side-by-side.png; docs/ux-inventory/screenshots/system-mock/all-products-768-side-by-side.png; audit-output/precision-slate-v43-20261029/05_FEATURE_GAP_MATRIX.csv; docs/ux-inventory/VISUAL_PAIR_REVIEW.csv; docs/ux-inventory/INVENTORY.csv


## GAP-0039 — اختلاف شبكة مركز التقارير

- **Category:** VISUAL_MISMATCH
- **Priority:** P2
- **Confidence:** High for recorded visual/result evidence
- **Affected Module:** Reports
- **Affected Screen IDs:** SCR-019
- **Affected Element IDs:** Not mapped in surviving traceability records; see interactive inventory by Screen ID.
- **Related Feature IDs:** F-027
- **Related Flow IDs:** See 06_USER_FLOW_AUDIT.md; no flow is claimed from a screenshot alone.
- **Design Reference:** docs/ux-inventory/screenshots/reference/screens/reports-1280.png; docs/ux-inventory/screenshots/reference/screens/reports-390.png; docs/ux-inventory/screenshots/reference/screens/reports-768.png
- **Current System Evidence:** docs/ux-inventory/screenshots/system-mock/react/all-screens/reports-1280.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/reports-390.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/reports-768.png; Source contains the partial flow identified in gap register; runtime unverified.; Check report 08 for matched routes/controllers; no API request was executed.; Static schema artifacts only; no live DB query. See report 08.
- **Expected Behavior:** عرض بطاقات التقارير في شبكة وترتيب المرجع.
- **Actual Behavior:** المرجع يستخدم شبكة بطاقات تقارير، بينما النظام يعرض قائمة مجموعات رأسية أطول.
- **Exact Missing or Incorrect Detail:** اختلاف شبكة مركز التقارير
- **Why This Is a Gap:** The persisted backlog records this expected behavior and acceptance condition; current evidence above records the observed or classified implementation state.
- **User Impact:** Not independently rated in the surviving evidence; priority is inherited from the persisted backlog.
- **Business Impact:** Not independently rated in the surviving evidence; consult the feature and flow records before implementation.
- **Technical Impact:** See frontend/backend/database evidence above; where absent, implementation layer is unverified.
- **Root Cause:** Unknown unless identified in cited system evidence.
- **Dependencies:** الرجوع إلى الحالة نفسها والبيانات الاصطناعية نفسها عند التحقق.
- **Suggested Corrective Action:** اختلاف شبكة مركز التقارير: عرض بطاقات التقارير في شبكة وترتيب المرجع.
- **Acceptance Criteria:** تتطابق البنية والترتيب المرئي مع المرجع عند 1280 و768 و390 بكسل على الحالة والبيانات نفسها: عرض بطاقات التقارير في شبكة وترتيب المرجع.
- **Recommended Verification Method:** مقارنة مباشرة بصور 1280/768/390 بعد إعادة التقاط الطرفين على حالة وfixture متطابقتين.
- **Implementation Complexity:** Unknown; no new estimate assigned.
- **Open Questions:** Use the linked feature, flow, and unverified-items reports for unresolved product or runtime questions.
- **Evidence references:** docs/ux-inventory/screenshots/system-mock/all-reports-1280-side-by-side.png; docs/ux-inventory/screenshots/system-mock/all-reports-390-side-by-side.png; docs/ux-inventory/screenshots/system-mock/all-reports-768-side-by-side.png; audit-output/precision-slate-v43-20261029/05_FEATURE_GAP_MATRIX.csv; docs/ux-inventory/VISUAL_PAIR_REVIEW.csv; docs/ux-inventory/INVENTORY.csv


## GAP-0040 — اختلاف تسلسل لوحة التحصيل

- **Category:** VISUAL_MISMATCH
- **Priority:** P2
- **Confidence:** High for recorded visual/result evidence
- **Affected Module:** Finance
- **Affected Screen IDs:** SCR-009
- **Affected Element IDs:** Not mapped in surviving traceability records; see interactive inventory by Screen ID.
- **Related Feature IDs:** F-011
- **Related Flow IDs:** See 06_USER_FLOW_AUDIT.md; no flow is claimed from a screenshot alone.
- **Design Reference:** docs/ux-inventory/screenshots/reference/screens/collections-1280.png; docs/ux-inventory/screenshots/reference/screens/collections-390.png; docs/ux-inventory/screenshots/reference/screens/collections-768.png
- **Current System Evidence:** docs/ux-inventory/screenshots/system-mock/react/all-screens/collections-1280.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/collections-390.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/collections-768.png; Candidate route/component mapped; actual behavior not exercised.; Check report 08 for matched routes/controllers; no API request was executed.; Static schema artifacts only; no live DB query. See report 08.
- **Expected Behavior:** عرض مؤشرات التحصيل ثم المستحقات والدفعات وفق المرجع.
- **Actual Behavior:** تسلسل المرجع: مؤشرات التحصيل ثم المستحقات والدفعات؛ النظام يبدأ بالبحث/التاريخ وجدول الفواتير. اختلاف بيانات الاختبار مستبعد من المقارنة.
- **Exact Missing or Incorrect Detail:** اختلاف تسلسل لوحة التحصيل
- **Why This Is a Gap:** The persisted backlog records this expected behavior and acceptance condition; current evidence above records the observed or classified implementation state.
- **User Impact:** Not independently rated in the surviving evidence; priority is inherited from the persisted backlog.
- **Business Impact:** Not independently rated in the surviving evidence; consult the feature and flow records before implementation.
- **Technical Impact:** See frontend/backend/database evidence above; where absent, implementation layer is unverified.
- **Root Cause:** Unknown unless identified in cited system evidence.
- **Dependencies:** الرجوع إلى الحالة نفسها والبيانات الاصطناعية نفسها عند التحقق.
- **Suggested Corrective Action:** اختلاف تسلسل لوحة التحصيل: عرض مؤشرات التحصيل ثم المستحقات والدفعات وفق المرجع.
- **Acceptance Criteria:** تتطابق البنية والترتيب المرئي مع المرجع عند 1280 و768 و390 بكسل على الحالة والبيانات نفسها: عرض مؤشرات التحصيل ثم المستحقات والدفعات وفق المرجع.
- **Recommended Verification Method:** مقارنة مباشرة بصور 1280/768/390 بعد إعادة التقاط الطرفين على حالة وfixture متطابقتين.
- **Implementation Complexity:** Unknown; no new estimate assigned.
- **Open Questions:** Use the linked feature, flow, and unverified-items reports for unresolved product or runtime questions.
- **Evidence references:** docs/ux-inventory/screenshots/system-mock/all-collections-1280-side-by-side.png; docs/ux-inventory/screenshots/system-mock/all-collections-390-side-by-side.png; docs/ux-inventory/screenshots/system-mock/all-collections-768-side-by-side.png; audit-output/precision-slate-v43-20261029/05_FEATURE_GAP_MATRIX.csv; docs/ux-inventory/VISUAL_PAIR_REVIEW.csv; docs/ux-inventory/INVENTORY.csv


## GAP-0041 — اختلاف مؤشرات وإجراءات أذونات التسليم

- **Category:** VISUAL_MISMATCH
- **Priority:** P2
- **Confidence:** High for recorded visual/result evidence
- **Affected Module:** Sales
- **Affected Screen IDs:** SCR-010
- **Affected Element IDs:** Not mapped in surviving traceability records; see interactive inventory by Screen ID.
- **Related Feature IDs:** F-013
- **Related Flow IDs:** See 06_USER_FLOW_AUDIT.md; no flow is claimed from a screenshot alone.
- **Design Reference:** docs/ux-inventory/screenshots/reference/screens/deliveries-1280.png; docs/ux-inventory/screenshots/reference/screens/deliveries-390.png; docs/ux-inventory/screenshots/reference/screens/deliveries-768.png
- **Current System Evidence:** docs/ux-inventory/screenshots/system-mock/react/all-screens/deliveries-1280.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/deliveries-390.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/deliveries-768.png; Candidate route/component mapped; actual behavior not exercised.; Check report 08 for matched routes/controllers; no API request was executed.; Static schema artifacts only; no live DB query. See report 08.
- **Expected Behavior:** عرض شبكة المؤشرات وإجراءات المرجع مع حالة فراغ مدمجة.
- **Actual Behavior:** شبكة المؤشرات وإجراءات المرجع لا تظهر بنفس الترتيب؛ حالة القائمة الفارغة في التطبيق تأخذ مساحة أكبر.
- **Exact Missing or Incorrect Detail:** اختلاف مؤشرات وإجراءات أذونات التسليم
- **Why This Is a Gap:** The persisted backlog records this expected behavior and acceptance condition; current evidence above records the observed or classified implementation state.
- **User Impact:** Not independently rated in the surviving evidence; priority is inherited from the persisted backlog.
- **Business Impact:** Not independently rated in the surviving evidence; consult the feature and flow records before implementation.
- **Technical Impact:** See frontend/backend/database evidence above; where absent, implementation layer is unverified.
- **Root Cause:** Unknown unless identified in cited system evidence.
- **Dependencies:** الرجوع إلى الحالة نفسها والبيانات الاصطناعية نفسها عند التحقق.
- **Suggested Corrective Action:** اختلاف مؤشرات وإجراءات أذونات التسليم: عرض شبكة المؤشرات وإجراءات المرجع مع حالة فراغ مدمجة.
- **Acceptance Criteria:** تتطابق البنية والترتيب المرئي مع المرجع عند 1280 و768 و390 بكسل على الحالة والبيانات نفسها: عرض شبكة المؤشرات وإجراءات المرجع مع حالة فراغ مدمجة.
- **Recommended Verification Method:** مقارنة مباشرة بصور 1280/768/390 بعد إعادة التقاط الطرفين على حالة وfixture متطابقتين.
- **Implementation Complexity:** Unknown; no new estimate assigned.
- **Open Questions:** Use the linked feature, flow, and unverified-items reports for unresolved product or runtime questions.
- **Evidence references:** docs/ux-inventory/screenshots/system-mock/all-deliveries-1280-side-by-side.png; docs/ux-inventory/screenshots/system-mock/all-deliveries-390-side-by-side.png; docs/ux-inventory/screenshots/system-mock/all-deliveries-768-side-by-side.png; audit-output/precision-slate-v43-20261029/05_FEATURE_GAP_MATRIX.csv; docs/ux-inventory/VISUAL_PAIR_REVIEW.csv; docs/ux-inventory/INVENTORY.csv


## GAP-0042 — اختلاف توزيع نموذج إذن التسليم

- **Category:** VISUAL_MISMATCH
- **Priority:** P2
- **Confidence:** High for recorded visual/result evidence
- **Affected Module:** SCR-011 — إنشاء إذن صرف وتوصيل جديد
- **Affected Screen IDs:** SCR-011
- **Affected Element IDs:** Not mapped in surviving traceability records; see interactive inventory by Screen ID.
- **Related Feature IDs:** Not mapped; see 05_FEATURE_GAP_MATRIX.csv.
- **Related Flow IDs:** See 06_USER_FLOW_AUDIT.md; no flow is claimed from a screenshot alone.
- **Design Reference:** docs/ux-inventory/screenshots/reference/screens/delivery-create-1280.png; docs/ux-inventory/screenshots/reference/screens/delivery-create-390.png; docs/ux-inventory/screenshots/reference/screens/delivery-create-768.png
- **Current System Evidence:** docs/ux-inventory/screenshots/system-mock/react/all-screens/delivery-create-1280.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/delivery-create-390.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/delivery-create-768.png
- **Expected Behavior:** توزيع الحقول في العمودين وعرض الأصناف حسب المرجع.
- **Actual Behavior:** المرجع يوزع الحقول في عمودين ويعرض الأصناف؛ النظام يكدس الأقسام والحقول رأسيًا.
- **Exact Missing or Incorrect Detail:** اختلاف توزيع نموذج إذن التسليم
- **Why This Is a Gap:** The persisted backlog records this expected behavior and acceptance condition; current evidence above records the observed or classified implementation state.
- **User Impact:** Not independently rated in the surviving evidence; priority is inherited from the persisted backlog.
- **Business Impact:** Not independently rated in the surviving evidence; consult the feature and flow records before implementation.
- **Technical Impact:** See frontend/backend/database evidence above; where absent, implementation layer is unverified.
- **Root Cause:** Unknown unless identified in cited system evidence.
- **Dependencies:** الرجوع إلى الحالة نفسها والبيانات الاصطناعية نفسها عند التحقق.
- **Suggested Corrective Action:** اختلاف توزيع نموذج إذن التسليم: توزيع الحقول في العمودين وعرض الأصناف حسب المرجع.
- **Acceptance Criteria:** تتطابق البنية والترتيب المرئي مع المرجع عند 1280 و768 و390 بكسل على الحالة والبيانات نفسها: توزيع الحقول في العمودين وعرض الأصناف حسب المرجع.
- **Recommended Verification Method:** مقارنة مباشرة بصور 1280/768/390 بعد إعادة التقاط الطرفين على حالة وfixture متطابقتين.
- **Implementation Complexity:** Unknown; no new estimate assigned.
- **Open Questions:** Use the linked feature, flow, and unverified-items reports for unresolved product or runtime questions.
- **Evidence references:** docs/ux-inventory/screenshots/system-mock/all-delivery-create-1280-side-by-side.png; docs/ux-inventory/screenshots/system-mock/all-delivery-create-390-side-by-side.png; docs/ux-inventory/screenshots/system-mock/all-delivery-create-768-side-by-side.png; audit-output/precision-slate-v43-20261029/05_FEATURE_GAP_MATRIX.csv; docs/ux-inventory/VISUAL_PAIR_REVIEW.csv; docs/ux-inventory/INVENTORY.csv


## GAP-0043 — اختلاف قائمة المخازن ومرشحاتها

- **Category:** VISUAL_MISMATCH
- **Priority:** P2
- **Confidence:** High for recorded visual/result evidence
- **Affected Module:** Reports
- **Affected Screen IDs:** SCR-023
- **Affected Element IDs:** Not mapped in surviving traceability records; see interactive inventory by Screen ID.
- **Related Feature IDs:** F-028
- **Related Flow IDs:** See 06_USER_FLOW_AUDIT.md; no flow is claimed from a screenshot alone.
- **Design Reference:** docs/ux-inventory/screenshots/reference/screens/warehouses-1280.png; docs/ux-inventory/screenshots/reference/screens/warehouses-390.png; docs/ux-inventory/screenshots/reference/screens/warehouses-768.png
- **Current System Evidence:** docs/ux-inventory/screenshots/system-mock/react/all-screens/warehouses-1280.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/warehouses-390.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/warehouses-768.png; Candidate route/component mapped; actual behavior not exercised.; Check report 08 for matched routes/controllers; no API request was executed.; Static schema artifacts only; no live DB query. See report 08.
- **Expected Behavior:** عرض قائمة المخازن المختصرة دون مساحة بحث وترتيب زائدة عن المرجع.
- **Actual Behavior:** النظام يضيف لوحة بحث/ترتيب وجدولًا أكثر اتساعًا بدل القائمة المباشرة المختصرة في المرجع.
- **Exact Missing or Incorrect Detail:** اختلاف قائمة المخازن ومرشحاتها
- **Why This Is a Gap:** The persisted backlog records this expected behavior and acceptance condition; current evidence above records the observed or classified implementation state.
- **User Impact:** Not independently rated in the surviving evidence; priority is inherited from the persisted backlog.
- **Business Impact:** Not independently rated in the surviving evidence; consult the feature and flow records before implementation.
- **Technical Impact:** See frontend/backend/database evidence above; where absent, implementation layer is unverified.
- **Root Cause:** Unknown unless identified in cited system evidence.
- **Dependencies:** الرجوع إلى الحالة نفسها والبيانات الاصطناعية نفسها عند التحقق.
- **Suggested Corrective Action:** اختلاف قائمة المخازن ومرشحاتها: عرض قائمة المخازن المختصرة دون مساحة بحث وترتيب زائدة عن المرجع.
- **Acceptance Criteria:** تتطابق البنية والترتيب المرئي مع المرجع عند 1280 و768 و390 بكسل على الحالة والبيانات نفسها: عرض قائمة المخازن المختصرة دون مساحة بحث وترتيب زائدة عن المرجع.
- **Recommended Verification Method:** مقارنة مباشرة بصور 1280/768/390 بعد إعادة التقاط الطرفين على حالة وfixture متطابقتين.
- **Implementation Complexity:** Unknown; no new estimate assigned.
- **Open Questions:** Use the linked feature, flow, and unverified-items reports for unresolved product or runtime questions.
- **Evidence references:** docs/ux-inventory/screenshots/system-mock/all-warehouses-1280-side-by-side.png; docs/ux-inventory/screenshots/system-mock/all-warehouses-390-side-by-side.png; docs/ux-inventory/screenshots/system-mock/all-warehouses-768-side-by-side.png; audit-output/precision-slate-v43-20261029/05_FEATURE_GAP_MATRIX.csv; docs/ux-inventory/VISUAL_PAIR_REVIEW.csv; docs/ux-inventory/INVENTORY.csv


## GAP-0044 — حالة التقرير المالي لم تسمح بمقارنة صالحة

- **Category:** UNVERIFIED_BEHAVIOR
- **Priority:** P2
- **Confidence:** Medium or Not Verified; see source classification
- **Affected Module:** Administration
- **Affected Screen IDs:** SCR-025
- **Affected Element IDs:** Not mapped in surviving traceability records; see interactive inventory by Screen ID.
- **Related Feature IDs:** F-044
- **Related Flow IDs:** See 06_USER_FLOW_AUDIT.md; no flow is claimed from a screenshot alone.
- **Design Reference:** docs/ux-inventory/screenshots/reference/screens/reports-financial-1280.png; docs/ux-inventory/screenshots/reference/screens/reports-financial-390.png; docs/ux-inventory/screenshots/reference/screens/reports-financial-768.png
- **Current System Evidence:** docs/ux-inventory/screenshots/system-mock/react/all-screens/reports-financial-1280.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/reports-financial-390.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/reports-financial-768.png; No implementing web page/interaction found in static route/component search; see gap register.; No matching web API found for the complete feature; details and scope limits in report 08.; Static schema artifacts only; no live DB query. See report 08.
- **Expected Behavior:** إظهار التقرير المالي المرجعي وحالاته على بيانات fixture موحدة.
- **Actual Behavior:** لقطة النظام تعرض خطأ/إعادة محاولة؛ لا توجد لقطة ناجحة بنفس fixture، لذلك لا يُحكم على محتوى الصفحة.
- **Exact Missing or Incorrect Detail:** حالة التقرير المالي لم تسمح بمقارنة صالحة
- **Why This Is a Gap:** The persisted backlog records this expected behavior and acceptance condition; current evidence above records the observed or classified implementation state.
- **User Impact:** Not independently rated in the surviving evidence; priority is inherited from the persisted backlog.
- **Business Impact:** Not independently rated in the surviving evidence; consult the feature and flow records before implementation.
- **Technical Impact:** See frontend/backend/database evidence above; where absent, implementation layer is unverified.
- **Root Cause:** Unknown unless identified in cited system evidence.
- **Dependencies:** حالة/fixture متطابقة أو إتاحة محتوى لوحة المرجع.
- **Suggested Corrective Action:** حالة التقرير المالي لم تسمح بمقارنة صالحة: إظهار التقرير المالي المرجعي وحالاته على بيانات fixture موحدة.
- **Acceptance Criteria:** لقطة مرجع ونظام ناجحتان على بيانات موحدة، مع نتيجة مصنفة ومسنودة بالأدلة.
- **Recommended Verification Method:** مقارنة مباشرة بصور 1280/768/390 بعد إعادة التقاط الطرفين على حالة وfixture متطابقتين.
- **Implementation Complexity:** Unknown; no new estimate assigned.
- **Open Questions:** Use the linked feature, flow, and unverified-items reports for unresolved product or runtime questions.
- **Evidence references:** docs/ux-inventory/screenshots/system-mock/all-reports-financial-1280-side-by-side.png; docs/ux-inventory/screenshots/system-mock/all-reports-financial-390-side-by-side.png; docs/ux-inventory/screenshots/system-mock/all-reports-financial-768-side-by-side.png; audit-output/precision-slate-v43-20261029/05_FEATURE_GAP_MATRIX.csv; docs/ux-inventory/VISUAL_PAIR_REVIEW.csv; docs/ux-inventory/INVENTORY.csv


## GAP-0045 — اختلاف بنية شاشة المحافظات

- **Category:** VISUAL_MISMATCH
- **Priority:** P2
- **Confidence:** High for recorded visual/result evidence
- **Affected Module:** SCR-026 — المحافظات
- **Affected Screen IDs:** SCR-026
- **Affected Element IDs:** Not mapped in surviving traceability records; see interactive inventory by Screen ID.
- **Related Feature IDs:** راجع مصفوفة الميزات
- **Related Flow IDs:** See 06_USER_FLOW_AUDIT.md; no flow is claimed from a screenshot alone.
- **Design Reference:** docs/ux-inventory/screenshots/reference/activated/governorates-1280.png; docs/ux-inventory/screenshots/reference/activated/governorates-768.png; docs/ux-inventory/screenshots/reference/activated/governorates-390.png
- **Current System Evidence:** docs/ux-inventory/screenshots/system-mock/react/visual-round3/governorates-1280.png; docs/ux-inventory/screenshots/system-mock/react/visual-round3/governorates-768.png; docs/ux-inventory/screenshots/system-mock/react/visual-round3/governorates-390.png
- **Expected Behavior:** جدول مضغوط وإضافة قريبة من القائمة.
- **Actual Behavior:** المرجع يعرض جدول محافظات مضغوطًا وإضافة قريبة؛ النظام يعرض حالة فارغة ونموذج إضافة منفصلًا. قيم الصفوف غير مقارنة.
- **Exact Missing or Incorrect Detail:** اختلاف بنية شاشة المحافظات
- **Why This Is a Gap:** The persisted backlog records this expected behavior and acceptance condition; current evidence above records the observed or classified implementation state.
- **User Impact:** Not independently rated in the surviving evidence; priority is inherited from the persisted backlog.
- **Business Impact:** Not independently rated in the surviving evidence; consult the feature and flow records before implementation.
- **Technical Impact:** See frontend/backend/database evidence above; where absent, implementation layer is unverified.
- **Root Cause:** Unknown unless identified in cited system evidence.
- **Dependencies:** fixtures متطابقة ودور اختبار محدود؛ لا تستخدم بيانات إنتاجية.
- **Suggested Corrective Action:** اختلاف بنية شاشة المحافظات: جدول مضغوط وإضافة قريبة من القائمة.
- **Acceptance Criteria:** الترتيب والفراغ والإضافة تطابق المرجع بالمقاسات الثلاثة.
- **Recommended Verification Method:** إعادة مقارنة المقاسات الثلاثة ثم اختبار النقر/حالات الواجهة في بيئة fixture دون إرسال بيانات خارجية.
- **Implementation Complexity:** Unknown; no new estimate assigned.
- **Open Questions:** Use the linked feature, flow, and unverified-items reports for unresolved product or runtime questions.
- **Evidence references:** docs/ux-inventory/screenshots/system-mock/state-comparisons/round5-governorates-1280-side-by-side.png; docs/ux-inventory/screenshots/system-mock/state-comparisons/round5-governorates-768-side-by-side.png; docs/ux-inventory/screenshots/system-mock/state-comparisons/round5-governorates-390-side-by-side.png; audit-output/precision-slate-v43-20261029/05_FEATURE_GAP_MATRIX.csv; docs/ux-inventory/VISUAL_PAIR_REVIEW.csv; docs/ux-inventory/INVENTORY.csv


## GAP-0046 — اختلاف نموذج الرصيد الافتتاحي

- **Category:** VISUAL_MISMATCH
- **Priority:** P2
- **Confidence:** High for recorded visual/result evidence
- **Affected Module:** SCR-027 — إضافة إلى المخزون
- **Affected Screen IDs:** SCR-027
- **Affected Element IDs:** Not mapped in surviving traceability records; see interactive inventory by Screen ID.
- **Related Feature IDs:** راجع مصفوفة الميزات
- **Related Flow IDs:** See 06_USER_FLOW_AUDIT.md; no flow is claimed from a screenshot alone.
- **Design Reference:** docs/ux-inventory/screenshots/reference/activated/opening-stock-1280.png; docs/ux-inventory/screenshots/reference/activated/opening-stock-768.png; docs/ux-inventory/screenshots/reference/activated/opening-stock-390.png
- **Current System Evidence:** docs/ux-inventory/screenshots/system-mock/react/visual-round3/opening-stock-1280.png; docs/ux-inventory/screenshots/system-mock/react/visual-round3/opening-stock-768.png; docs/ux-inventory/screenshots/system-mock/react/visual-round3/opening-stock-390.png
- **Expected Behavior:** نموذج افتتاحي مختصر.
- **Actual Behavior:** المرجع يقدّم نموذجًا مختصرًا؛ نموذج النظام أطول ومتباعد ويعرض حقول تكلفة/تاريخ/سبب إضافية.
- **Exact Missing or Incorrect Detail:** اختلاف نموذج الرصيد الافتتاحي
- **Why This Is a Gap:** The persisted backlog records this expected behavior and acceptance condition; current evidence above records the observed or classified implementation state.
- **User Impact:** Not independently rated in the surviving evidence; priority is inherited from the persisted backlog.
- **Business Impact:** Not independently rated in the surviving evidence; consult the feature and flow records before implementation.
- **Technical Impact:** See frontend/backend/database evidence above; where absent, implementation layer is unverified.
- **Root Cause:** Unknown unless identified in cited system evidence.
- **Dependencies:** fixtures متطابقة ودور اختبار محدود؛ لا تستخدم بيانات إنتاجية.
- **Suggested Corrective Action:** اختلاف نموذج الرصيد الافتتاحي: نموذج افتتاحي مختصر.
- **Acceptance Criteria:** الحقول المرجعية بالترتيب أو توثيق إضافات النظام.
- **Recommended Verification Method:** إعادة مقارنة المقاسات الثلاثة ثم اختبار النقر/حالات الواجهة في بيئة fixture دون إرسال بيانات خارجية.
- **Implementation Complexity:** Unknown; no new estimate assigned.
- **Open Questions:** Use the linked feature, flow, and unverified-items reports for unresolved product or runtime questions.
- **Evidence references:** docs/ux-inventory/screenshots/system-mock/state-comparisons/round5-opening-stock-1280-side-by-side.png; docs/ux-inventory/screenshots/system-mock/state-comparisons/round5-opening-stock-768-side-by-side.png; docs/ux-inventory/screenshots/system-mock/state-comparisons/round5-opening-stock-390-side-by-side.png; audit-output/precision-slate-v43-20261029/05_FEATURE_GAP_MATRIX.csv; docs/ux-inventory/VISUAL_PAIR_REVIEW.csv; docs/ux-inventory/INVENTORY.csv


## GAP-0047 — اختلاف شاشة سلة المحذوفات

- **Category:** VISUAL_MISMATCH
- **Priority:** P2
- **Confidence:** High for recorded visual/result evidence
- **Affected Module:** Administration
- **Affected Screen IDs:** SCR-029
- **Affected Element IDs:** Not mapped in surviving traceability records; see interactive inventory by Screen ID.
- **Related Feature IDs:** F-041
- **Related Flow IDs:** See 06_USER_FLOW_AUDIT.md; no flow is claimed from a screenshot alone.
- **Design Reference:** docs/ux-inventory/screenshots/reference/activated/trash-1280.png; docs/ux-inventory/screenshots/reference/activated/trash-768.png; docs/ux-inventory/screenshots/reference/activated/trash-390.png
- **Current System Evidence:** docs/ux-inventory/screenshots/system-mock/react/visual-round3/trash-1280.png; docs/ux-inventory/screenshots/system-mock/react/visual-round3/trash-768.png; docs/ux-inventory/screenshots/system-mock/react/visual-round3/trash-390.png; Runtime screenshot and click evidence in docs/ux-inventory; تصحيح Screen IDs: المستخدمون SCR-022، السلة SCR-029، السائقون SCR-032، سجل العمليات SCR-033، PWA SCR-067.; Check report 08 for matched routes/controllers; no API request was executed.; Static schema artifacts only; no live DB query. See report 08.
- **Expected Behavior:** قائمة مضغوطة وإجراءاتها.
- **Actual Behavior:** المرجع يقدّم جدولًا مضغوطًا؛ النظام يعرض حالة فارغة كبيرة وبطاقة وترقيمًا. لم تُنفذ استعادة أو حذف.
- **Exact Missing or Incorrect Detail:** اختلاف شاشة سلة المحذوفات
- **Why This Is a Gap:** The persisted backlog records this expected behavior and acceptance condition; current evidence above records the observed or classified implementation state.
- **User Impact:** Not independently rated in the surviving evidence; priority is inherited from the persisted backlog.
- **Business Impact:** Not independently rated in the surviving evidence; consult the feature and flow records before implementation.
- **Technical Impact:** See frontend/backend/database evidence above; where absent, implementation layer is unverified.
- **Root Cause:** Unknown unless identified in cited system evidence.
- **Dependencies:** fixtures متطابقة ودور اختبار محدود؛ لا تستخدم بيانات إنتاجية.
- **Suggested Corrective Action:** اختلاف شاشة سلة المحذوفات: قائمة مضغوطة وإجراءاتها.
- **Acceptance Criteria:** تطابق كثافة القائمة ومساحة الفراغ.
- **Recommended Verification Method:** إعادة مقارنة المقاسات الثلاثة ثم اختبار النقر/حالات الواجهة في بيئة fixture دون إرسال بيانات خارجية.
- **Implementation Complexity:** Unknown; no new estimate assigned.
- **Open Questions:** Use the linked feature, flow, and unverified-items reports for unresolved product or runtime questions.
- **Evidence references:** docs/ux-inventory/screenshots/system-mock/state-comparisons/round5-trash-1280-side-by-side.png; docs/ux-inventory/screenshots/system-mock/state-comparisons/round5-trash-768-side-by-side.png; docs/ux-inventory/screenshots/system-mock/state-comparisons/round5-trash-390-side-by-side.png; audit-output/precision-slate-v43-20261029/05_FEATURE_GAP_MATRIX.csv; docs/ux-inventory/VISUAL_PAIR_REVIEW.csv; docs/ux-inventory/INVENTORY.csv


## GAP-0048 — اختلاف شاشة سائقي الشحن

- **Category:** VISUAL_MISMATCH
- **Priority:** P2
- **Confidence:** High for recorded visual/result evidence
- **Affected Module:** Administration
- **Affected Screen IDs:** SCR-032
- **Affected Element IDs:** Not mapped in surviving traceability records; see interactive inventory by Screen ID.
- **Related Feature IDs:** F-041
- **Related Flow IDs:** See 06_USER_FLOW_AUDIT.md; no flow is claimed from a screenshot alone.
- **Design Reference:** docs/ux-inventory/screenshots/reference/activated/drivers-1280.png; docs/ux-inventory/screenshots/reference/activated/drivers-768.png; docs/ux-inventory/screenshots/reference/activated/drivers-390.png
- **Current System Evidence:** docs/ux-inventory/screenshots/system-mock/react/visual-round3/drivers-1280.png; docs/ux-inventory/screenshots/system-mock/react/visual-round3/drivers-768.png; docs/ux-inventory/screenshots/system-mock/react/visual-round3/drivers-390.png; Runtime screenshot and click evidence in docs/ux-inventory; تصحيح Screen IDs: المستخدمون SCR-022، السلة SCR-029، السائقون SCR-032، سجل العمليات SCR-033، PWA SCR-067.; Check report 08 for matched routes/controllers; no API request was executed.; Static schema artifacts only; no live DB query. See report 08.
- **Expected Behavior:** سجل السائقين وإجراءات مضمنة.
- **Actual Behavior:** المرجع يركّز على سجل السائقين وإجراءاته؛ النظام يعرض empty state ونموذجًا منفصلًا.
- **Exact Missing or Incorrect Detail:** اختلاف شاشة سائقي الشحن
- **Why This Is a Gap:** The persisted backlog records this expected behavior and acceptance condition; current evidence above records the observed or classified implementation state.
- **User Impact:** Not independently rated in the surviving evidence; priority is inherited from the persisted backlog.
- **Business Impact:** Not independently rated in the surviving evidence; consult the feature and flow records before implementation.
- **Technical Impact:** See frontend/backend/database evidence above; where absent, implementation layer is unverified.
- **Root Cause:** Unknown unless identified in cited system evidence.
- **Dependencies:** fixtures متطابقة ودور اختبار محدود؛ لا تستخدم بيانات إنتاجية.
- **Suggested Corrective Action:** اختلاف شاشة سائقي الشحن: سجل السائقين وإجراءات مضمنة.
- **Acceptance Criteria:** السجل والإجراءات في مواضع المرجع.
- **Recommended Verification Method:** إعادة مقارنة المقاسات الثلاثة ثم اختبار النقر/حالات الواجهة في بيئة fixture دون إرسال بيانات خارجية.
- **Implementation Complexity:** Unknown; no new estimate assigned.
- **Open Questions:** Use the linked feature, flow, and unverified-items reports for unresolved product or runtime questions.
- **Evidence references:** docs/ux-inventory/screenshots/system-mock/state-comparisons/round5-drivers-1280-side-by-side.png; docs/ux-inventory/screenshots/system-mock/state-comparisons/round5-drivers-768-side-by-side.png; docs/ux-inventory/screenshots/system-mock/state-comparisons/round5-drivers-390-side-by-side.png; audit-output/precision-slate-v43-20261029/05_FEATURE_GAP_MATRIX.csv; docs/ux-inventory/VISUAL_PAIR_REVIEW.csv; docs/ux-inventory/INVENTORY.csv


## GAP-0049 — اختلاف سجل العمليات

- **Category:** VISUAL_MISMATCH
- **Priority:** P2
- **Confidence:** High for recorded visual/result evidence
- **Affected Module:** Administration
- **Affected Screen IDs:** SCR-033
- **Affected Element IDs:** Not mapped in surviving traceability records; see interactive inventory by Screen ID.
- **Related Feature IDs:** F-041
- **Related Flow IDs:** See 06_USER_FLOW_AUDIT.md; no flow is claimed from a screenshot alone.
- **Design Reference:** docs/ux-inventory/screenshots/reference/activated/audit-1280.png; docs/ux-inventory/screenshots/reference/activated/audit-768.png; docs/ux-inventory/screenshots/reference/activated/audit-390.png
- **Current System Evidence:** docs/ux-inventory/screenshots/system-mock/react/visual-round3/audit-1280.png; docs/ux-inventory/screenshots/system-mock/react/visual-round3/audit-768.png; docs/ux-inventory/screenshots/system-mock/react/visual-round3/audit-390.png; Runtime screenshot and click evidence in docs/ux-inventory; تصحيح Screen IDs: المستخدمون SCR-022، السلة SCR-029، السائقون SCR-032، سجل العمليات SCR-033، PWA SCR-067.; Check report 08 for matched routes/controllers; no API request was executed.; Static schema artifacts only; no live DB query. See report 08.
- **Expected Behavior:** مرشحات وسجل جدولي.
- **Actual Behavior:** ترتيب المرشحات وبنية الجدول في النظام يختلفان عن المرجع؛ قيم fixtures مستبعدة.
- **Exact Missing or Incorrect Detail:** اختلاف سجل العمليات
- **Why This Is a Gap:** The persisted backlog records this expected behavior and acceptance condition; current evidence above records the observed or classified implementation state.
- **User Impact:** Not independently rated in the surviving evidence; priority is inherited from the persisted backlog.
- **Business Impact:** Not independently rated in the surviving evidence; consult the feature and flow records before implementation.
- **Technical Impact:** See frontend/backend/database evidence above; where absent, implementation layer is unverified.
- **Root Cause:** Unknown unless identified in cited system evidence.
- **Dependencies:** fixtures متطابقة ودور اختبار محدود؛ لا تستخدم بيانات إنتاجية.
- **Suggested Corrective Action:** اختلاف سجل العمليات: مرشحات وسجل جدولي.
- **Acceptance Criteria:** ترتيب المرشحات والأعمدة مثل المرجع.
- **Recommended Verification Method:** إعادة مقارنة المقاسات الثلاثة ثم اختبار النقر/حالات الواجهة في بيئة fixture دون إرسال بيانات خارجية.
- **Implementation Complexity:** Unknown; no new estimate assigned.
- **Open Questions:** Use the linked feature, flow, and unverified-items reports for unresolved product or runtime questions.
- **Evidence references:** docs/ux-inventory/screenshots/system-mock/state-comparisons/round5-audit-1280-side-by-side.png; docs/ux-inventory/screenshots/system-mock/state-comparisons/round5-audit-768-side-by-side.png; docs/ux-inventory/screenshots/system-mock/state-comparisons/round5-audit-390-side-by-side.png; audit-output/precision-slate-v43-20261029/05_FEATURE_GAP_MATRIX.csv; docs/ux-inventory/VISUAL_PAIR_REVIEW.csv; docs/ux-inventory/INVENTORY.csv


## GAP-0050 — اختلاف شاشة مرتجعات المخازن

- **Category:** VISUAL_MISMATCH
- **Priority:** P2
- **Confidence:** High for recorded visual/result evidence
- **Affected Module:** Inventory
- **Affected Screen IDs:** SCR-051
- **Affected Element IDs:** Not mapped in surviving traceability records; see interactive inventory by Screen ID.
- **Related Feature IDs:** F-018
- **Related Flow IDs:** See 06_USER_FLOW_AUDIT.md; no flow is claimed from a screenshot alone.
- **Design Reference:** docs/ux-inventory/screenshots/reference/activated/warehouse-returns-1280.png; docs/ux-inventory/screenshots/reference/activated/warehouse-returns-768.png; docs/ux-inventory/screenshots/reference/activated/warehouse-returns-390.png
- **Current System Evidence:** docs/ux-inventory/screenshots/system-mock/react/visual-round3/warehouse-returns-1280.png; docs/ux-inventory/screenshots/system-mock/react/visual-round3/warehouse-returns-768.png; docs/ux-inventory/screenshots/system-mock/react/visual-round3/warehouse-returns-390.png; Runtime screenshot and click evidence in docs/ux-inventory; SCR-028 مرشحها /warehouse-returns لكن تطابقها مع SCR-051 غير محسوم.; Check report 08 for matched routes/controllers; no API request was executed.; Static schema artifacts only; no live DB query. See report 08.
- **Expected Behavior:** سجل مرتجعات مع اعتماد/كمية.
- **Actual Behavior:** المرجع يعرض سجل مرتجعات وإجراءات اعتماد/كمية؛ النظام يعرض جدولًا فارغًا ونموذج إنشاء منفصلًا. لم يُحفظ نموذج.
- **Exact Missing or Incorrect Detail:** اختلاف شاشة مرتجعات المخازن
- **Why This Is a Gap:** The persisted backlog records this expected behavior and acceptance condition; current evidence above records the observed or classified implementation state.
- **User Impact:** Not independently rated in the surviving evidence; priority is inherited from the persisted backlog.
- **Business Impact:** Not independently rated in the surviving evidence; consult the feature and flow records before implementation.
- **Technical Impact:** See frontend/backend/database evidence above; where absent, implementation layer is unverified.
- **Root Cause:** Unknown unless identified in cited system evidence.
- **Dependencies:** fixtures متطابقة ودور اختبار محدود؛ لا تستخدم بيانات إنتاجية.
- **Suggested Corrective Action:** اختلاف شاشة مرتجعات المخازن: سجل مرتجعات مع اعتماد/كمية.
- **Acceptance Criteria:** أعمدة السجل وإجراءاته حسب المرجع.
- **Recommended Verification Method:** إعادة مقارنة المقاسات الثلاثة ثم اختبار النقر/حالات الواجهة في بيئة fixture دون إرسال بيانات خارجية.
- **Implementation Complexity:** Unknown; no new estimate assigned.
- **Open Questions:** Use the linked feature, flow, and unverified-items reports for unresolved product or runtime questions.
- **Evidence references:** docs/ux-inventory/screenshots/system-mock/state-comparisons/round5-warehouse-returns-1280-side-by-side.png; docs/ux-inventory/screenshots/system-mock/state-comparisons/round5-warehouse-returns-768-side-by-side.png; docs/ux-inventory/screenshots/system-mock/state-comparisons/round5-warehouse-returns-390-side-by-side.png; audit-output/precision-slate-v43-20261029/05_FEATURE_GAP_MATRIX.csv; docs/ux-inventory/VISUAL_PAIR_REVIEW.csv; docs/ux-inventory/INVENTORY.csv


## GAP-0051 — اختلاف شاشة أموال الحاويات

- **Category:** VISUAL_MISMATCH
- **Priority:** P2
- **Confidence:** High for recorded visual/result evidence
- **Affected Module:** SCR-052 — أموال الحاويات
- **Affected Screen IDs:** SCR-052
- **Affected Element IDs:** Not mapped in surviving traceability records; see interactive inventory by Screen ID.
- **Related Feature IDs:** راجع مصفوفة الميزات
- **Related Flow IDs:** See 06_USER_FLOW_AUDIT.md; no flow is claimed from a screenshot alone.
- **Design Reference:** docs/ux-inventory/screenshots/reference/activated/container-funds-1280.png; docs/ux-inventory/screenshots/reference/activated/container-funds-768.png; docs/ux-inventory/screenshots/reference/activated/container-funds-390.png
- **Current System Evidence:** docs/ux-inventory/screenshots/system-mock/react/visual-round5/container-funds-selected-1280.png; docs/ux-inventory/screenshots/system-mock/react/visual-round5/container-funds-selected-768.png; docs/ux-inventory/screenshots/system-mock/react/visual-round5/container-funds-selected-390.png
- **Expected Behavior:** نموذج حركة عمودان وسجل حركة.
- **Actual Behavior:** بعد اختيار الحاوية بالنقر، يعرض النظام النموذج رأسيًا وقائمة فارغة؛ المرجع يعرض نموذج عمودين وسجل حركة. لم تُسجل حركة.
- **Exact Missing or Incorrect Detail:** اختلاف شاشة أموال الحاويات
- **Why This Is a Gap:** The persisted backlog records this expected behavior and acceptance condition; current evidence above records the observed or classified implementation state.
- **User Impact:** Not independently rated in the surviving evidence; priority is inherited from the persisted backlog.
- **Business Impact:** Not independently rated in the surviving evidence; consult the feature and flow records before implementation.
- **Technical Impact:** See frontend/backend/database evidence above; where absent, implementation layer is unverified.
- **Root Cause:** Unknown unless identified in cited system evidence.
- **Dependencies:** fixtures متطابقة ودور اختبار محدود؛ لا تستخدم بيانات إنتاجية.
- **Suggested Corrective Action:** اختلاف شاشة أموال الحاويات: نموذج حركة عمودان وسجل حركة.
- **Acceptance Criteria:** تخطيط قريب من المرجع؛ لا يشترط حفظ في مقارنة الشكل.
- **Recommended Verification Method:** إعادة مقارنة المقاسات الثلاثة ثم اختبار النقر/حالات الواجهة في بيئة fixture دون إرسال بيانات خارجية.
- **Implementation Complexity:** Unknown; no new estimate assigned.
- **Open Questions:** Use the linked feature, flow, and unverified-items reports for unresolved product or runtime questions.
- **Evidence references:** docs/ux-inventory/screenshots/system-mock/state-comparisons/round5-container-funds-1280-side-by-side.png; docs/ux-inventory/screenshots/system-mock/state-comparisons/round5-container-funds-768-side-by-side.png; docs/ux-inventory/screenshots/system-mock/state-comparisons/round5-container-funds-390-side-by-side.png; audit-output/precision-slate-v43-20261029/05_FEATURE_GAP_MATRIX.csv; docs/ux-inventory/VISUAL_PAIR_REVIEW.csv; docs/ux-inventory/INVENTORY.csv


## GAP-0052 — اختلاف شاشة الحد الأدنى للمخزون

- **Category:** VISUAL_MISMATCH
- **Priority:** P2
- **Confidence:** High for recorded visual/result evidence
- **Affected Module:** Inventory
- **Affected Screen IDs:** SCR-061
- **Affected Element IDs:** Not mapped in surviving traceability records; see interactive inventory by Screen ID.
- **Related Feature IDs:** F-018
- **Related Flow IDs:** See 06_USER_FLOW_AUDIT.md; no flow is claimed from a screenshot alone.
- **Design Reference:** docs/ux-inventory/screenshots/reference/activated/minimum-stock-1280.png; docs/ux-inventory/screenshots/reference/activated/minimum-stock-768.png; docs/ux-inventory/screenshots/reference/activated/minimum-stock-390.png
- **Current System Evidence:** docs/ux-inventory/screenshots/system-mock/react/visual-round3/minimum-stock-1280.png; docs/ux-inventory/screenshots/system-mock/react/visual-round3/minimum-stock-768.png; docs/ux-inventory/screenshots/system-mock/react/visual-round3/minimum-stock-390.png; Runtime screenshot and click evidence in docs/ux-inventory; SCR-028 مرشحها /warehouse-returns لكن تطابقها مع SCR-051 غير محسوم.; Check report 08 for matched routes/controllers; no API request was executed.; Static schema artifacts only; no live DB query. See report 08.
- **Expected Behavior:** تنبيه وجدول حدود منتجات.
- **Actual Behavior:** المرجع يعرض تنبيهًا وجدول حدود المنتجات؛ النظام يعرض empty state ونموذج تحديد حد منتج/مخزن.
- **Exact Missing or Incorrect Detail:** اختلاف شاشة الحد الأدنى للمخزون
- **Why This Is a Gap:** The persisted backlog records this expected behavior and acceptance condition; current evidence above records the observed or classified implementation state.
- **User Impact:** Not independently rated in the surviving evidence; priority is inherited from the persisted backlog.
- **Business Impact:** Not independently rated in the surviving evidence; consult the feature and flow records before implementation.
- **Technical Impact:** See frontend/backend/database evidence above; where absent, implementation layer is unverified.
- **Root Cause:** Unknown unless identified in cited system evidence.
- **Dependencies:** fixtures متطابقة ودور اختبار محدود؛ لا تستخدم بيانات إنتاجية.
- **Suggested Corrective Action:** اختلاف شاشة الحد الأدنى للمخزون: تنبيه وجدول حدود منتجات.
- **Acceptance Criteria:** الجدول/حالة الفراغ مثل المرجع.
- **Recommended Verification Method:** إعادة مقارنة المقاسات الثلاثة ثم اختبار النقر/حالات الواجهة في بيئة fixture دون إرسال بيانات خارجية.
- **Implementation Complexity:** Unknown; no new estimate assigned.
- **Open Questions:** Use the linked feature, flow, and unverified-items reports for unresolved product or runtime questions.
- **Evidence references:** docs/ux-inventory/screenshots/system-mock/state-comparisons/round5-minimum-stock-1280-side-by-side.png; docs/ux-inventory/screenshots/system-mock/state-comparisons/round5-minimum-stock-768-side-by-side.png; docs/ux-inventory/screenshots/system-mock/state-comparisons/round5-minimum-stock-390-side-by-side.png; audit-output/precision-slate-v43-20261029/05_FEATURE_GAP_MATRIX.csv; docs/ux-inventory/VISUAL_PAIR_REVIEW.csv; docs/ux-inventory/INVENTORY.csv


## GAP-0053 — اختلاف شاشة الجرد الدوري

- **Category:** VISUAL_MISMATCH
- **Priority:** P2
- **Confidence:** High for recorded visual/result evidence
- **Affected Module:** Inventory
- **Affected Screen IDs:** SCR-062
- **Affected Element IDs:** Not mapped in surviving traceability records; see interactive inventory by Screen ID.
- **Related Feature IDs:** F-018
- **Related Flow IDs:** See 06_USER_FLOW_AUDIT.md; no flow is claimed from a screenshot alone.
- **Design Reference:** docs/ux-inventory/screenshots/reference/activated/inventory-counts-1280.png; docs/ux-inventory/screenshots/reference/activated/inventory-counts-768.png; docs/ux-inventory/screenshots/reference/activated/inventory-counts-390.png
- **Current System Evidence:** docs/ux-inventory/screenshots/system-mock/react/visual-round3/inventory-counts-1280.png; docs/ux-inventory/screenshots/system-mock/react/visual-round3/inventory-counts-768.png; docs/ux-inventory/screenshots/system-mock/react/visual-round3/inventory-counts-390.png; Runtime screenshot and click evidence in docs/ux-inventory; SCR-028 مرشحها /warehouse-returns لكن تطابقها مع SCR-051 غير محسوم.; Check report 08 for matched routes/controllers; no API request was executed.; Static schema artifacts only; no live DB query. See report 08.
- **Expected Behavior:** قائمة كمية النظام/الفعلي/الفارق وإجراء إنهاء.
- **Actual Behavior:** المرجع يعرض كمية النظام والفعلي والفارق وإجراء إنهاء؛ النظام يعرض حالة فارغة ونموذج جلسة.
- **Exact Missing or Incorrect Detail:** اختلاف شاشة الجرد الدوري
- **Why This Is a Gap:** The persisted backlog records this expected behavior and acceptance condition; current evidence above records the observed or classified implementation state.
- **User Impact:** Not independently rated in the surviving evidence; priority is inherited from the persisted backlog.
- **Business Impact:** Not independently rated in the surviving evidence; consult the feature and flow records before implementation.
- **Technical Impact:** See frontend/backend/database evidence above; where absent, implementation layer is unverified.
- **Root Cause:** Unknown unless identified in cited system evidence.
- **Dependencies:** fixtures متطابقة ودور اختبار محدود؛ لا تستخدم بيانات إنتاجية.
- **Suggested Corrective Action:** اختلاف شاشة الجرد الدوري: قائمة كمية النظام/الفعلي/الفارق وإجراء إنهاء.
- **Acceptance Criteria:** الكميات والفارق وسجل الجلسة في التسلسل المرجعي.
- **Recommended Verification Method:** إعادة مقارنة المقاسات الثلاثة ثم اختبار النقر/حالات الواجهة في بيئة fixture دون إرسال بيانات خارجية.
- **Implementation Complexity:** Unknown; no new estimate assigned.
- **Open Questions:** Use the linked feature, flow, and unverified-items reports for unresolved product or runtime questions.
- **Evidence references:** docs/ux-inventory/screenshots/system-mock/state-comparisons/round5-inventory-counts-1280-side-by-side.png; docs/ux-inventory/screenshots/system-mock/state-comparisons/round5-inventory-counts-768-side-by-side.png; docs/ux-inventory/screenshots/system-mock/state-comparisons/round5-inventory-counts-390-side-by-side.png; audit-output/precision-slate-v43-20261029/05_FEATURE_GAP_MATRIX.csv; docs/ux-inventory/VISUAL_PAIR_REVIEW.csv; docs/ux-inventory/INVENTORY.csv


## GAP-0054 — قائمة تتبع الحاويات لا تعرض تسلسل المرجع

- **Category:** VISUAL_MISMATCH
- **Priority:** P2
- **Confidence:** High for recorded visual/result evidence
- **Affected Module:** SCR-060 — تتبع الحاويات
- **Affected Screen IDs:** SCR-060
- **Affected Element IDs:** Not mapped in surviving traceability records; see interactive inventory by Screen ID.
- **Related Feature IDs:** راجع مصفوفة الميزات
- **Related Flow IDs:** See 06_USER_FLOW_AUDIT.md; no flow is claimed from a screenshot alone.
- **Design Reference:** docs/ux-inventory/screenshots/reference/activated/container-tracking-1280.png; docs/ux-inventory/screenshots/reference/activated/container-tracking-768.png; docs/ux-inventory/screenshots/reference/activated/container-tracking-390.png
- **Current System Evidence:** docs/ux-inventory/screenshots/system-mock/react/visual-round5/container-tracking-candidate-1280.png; docs/ux-inventory/screenshots/system-mock/react/visual-round5/container-tracking-candidate-768.png; docs/ux-inventory/screenshots/system-mock/react/visual-round5/container-tracking-candidate-390.png
- **Expected Behavior:** مراحل وحالة وETA/تأخير وإجراء المرحلة التالية.
- **Actual Behavior:** المسار المرتبط موجود؛ نقرة رقم الحاوية فتحت /containers/16016. القائمة لا تعرض مراحل الحالة وETA/التأخير وإجراء المرحلة التالية كما في المرجع.
- **Exact Missing or Incorrect Detail:** قائمة تتبع الحاويات لا تعرض تسلسل المرجع
- **Why This Is a Gap:** The persisted backlog records this expected behavior and acceptance condition; current evidence above records the observed or classified implementation state.
- **User Impact:** Not independently rated in the surviving evidence; priority is inherited from the persisted backlog.
- **Business Impact:** Not independently rated in the surviving evidence; consult the feature and flow records before implementation.
- **Technical Impact:** See frontend/backend/database evidence above; where absent, implementation layer is unverified.
- **Root Cause:** Unknown unless identified in cited system evidence.
- **Dependencies:** fixtures متطابقة ودور اختبار محدود؛ لا تستخدم بيانات إنتاجية.
- **Suggested Corrective Action:** قائمة تتبع الحاويات لا تعرض تسلسل المرجع: مراحل وحالة وETA/تأخير وإجراء المرحلة التالية.
- **Acceptance Criteria:** تظهر المرحلة التالية والموعد وتفتح التفاصيل الصحيحة.
- **Recommended Verification Method:** إعادة مقارنة المقاسات الثلاثة ثم اختبار النقر/حالات الواجهة في بيئة fixture دون إرسال بيانات خارجية.
- **Implementation Complexity:** Unknown; no new estimate assigned.
- **Open Questions:** Use the linked feature, flow, and unverified-items reports for unresolved product or runtime questions.
- **Evidence references:** docs/ux-inventory/screenshots/system-mock/state-comparisons/round5-container-tracking-1280-side-by-side.png; docs/ux-inventory/screenshots/system-mock/state-comparisons/round5-container-tracking-768-side-by-side.png; docs/ux-inventory/screenshots/system-mock/state-comparisons/round5-container-tracking-390-side-by-side.png; audit-output/precision-slate-v43-20261029/05_FEATURE_GAP_MATRIX.csv; docs/ux-inventory/VISUAL_PAIR_REVIEW.csv; docs/ux-inventory/INVENTORY.csv


## GAP-0055 — اختلاف شاشة سجل تكلفة المنتج

- **Category:** VISUAL_MISMATCH
- **Priority:** P2
- **Confidence:** High for recorded visual/result evidence
- **Affected Module:** Catalog
- **Affected Screen IDs:** SCR-064
- **Affected Element IDs:** Not mapped in surviving traceability records; see interactive inventory by Screen ID.
- **Related Feature IDs:** F-014
- **Related Flow IDs:** See 06_USER_FLOW_AUDIT.md; no flow is claimed from a screenshot alone.
- **Design Reference:** docs/ux-inventory/screenshots/reference/activated/product-cost-history-1280.png; docs/ux-inventory/screenshots/reference/activated/product-cost-history-768.png; docs/ux-inventory/screenshots/reference/activated/product-cost-history-390.png
- **Current System Evidence:** docs/ux-inventory/screenshots/system-mock/react/visual-round5/product-cost-history-1280.png; docs/ux-inventory/screenshots/system-mock/react/visual-round5/product-cost-history-768.png; docs/ux-inventory/screenshots/system-mock/react/visual-round5/product-cost-history-390.png; Runtime screenshot and click evidence in docs/ux-inventory; نقرة رابط تكلفة المنتج فتحت السجل؛ لم يظهر تحكم باركود/ملصقات. الصور: round5-product-cost-history وround5-barcode-labels.; Check report 08 for matched routes/controllers; no API request was executed.; Static schema artifacts only; no live DB query. See report 08.
- **Expected Behavior:** سجل تاريخ شراء/صنف/حاوية وتغيرات.
- **Actual Behavior:** نقرة رابط تكلفة المنتج تفتح السجل؛ أعمدة التاريخ/النوع/المخزن/الكمية/تكلفة الوحدة وترتيبها تختلف عن المرجع.
- **Exact Missing or Incorrect Detail:** اختلاف شاشة سجل تكلفة المنتج
- **Why This Is a Gap:** The persisted backlog records this expected behavior and acceptance condition; current evidence above records the observed or classified implementation state.
- **User Impact:** Not independently rated in the surviving evidence; priority is inherited from the persisted backlog.
- **Business Impact:** Not independently rated in the surviving evidence; consult the feature and flow records before implementation.
- **Technical Impact:** See frontend/backend/database evidence above; where absent, implementation layer is unverified.
- **Root Cause:** Unknown unless identified in cited system evidence.
- **Dependencies:** fixtures متطابقة ودور اختبار محدود؛ لا تستخدم بيانات إنتاجية.
- **Suggested Corrective Action:** اختلاف شاشة سجل تكلفة المنتج: سجل تاريخ شراء/صنف/حاوية وتغيرات.
- **Acceptance Criteria:** نقرة رابط المنتج تفتح سجلًا بهيكل المرجع.
- **Recommended Verification Method:** إعادة مقارنة المقاسات الثلاثة ثم اختبار النقر/حالات الواجهة في بيئة fixture دون إرسال بيانات خارجية.
- **Implementation Complexity:** Unknown; no new estimate assigned.
- **Open Questions:** Use the linked feature, flow, and unverified-items reports for unresolved product or runtime questions.
- **Evidence references:** docs/ux-inventory/screenshots/system-mock/state-comparisons/round5-product-cost-history-1280-side-by-side.png; docs/ux-inventory/screenshots/system-mock/state-comparisons/round5-product-cost-history-768-side-by-side.png; docs/ux-inventory/screenshots/system-mock/state-comparisons/round5-product-cost-history-390-side-by-side.png; audit-output/precision-slate-v43-20261029/05_FEATURE_GAP_MATRIX.csv; docs/ux-inventory/VISUAL_PAIR_REVIEW.csv; docs/ux-inventory/INVENTORY.csv


## GAP-0057 — اختلاف شاشة تثبيت التطبيق

- **Category:** VISUAL_MISMATCH
- **Priority:** P2
- **Confidence:** High for recorded visual/result evidence
- **Affected Module:** Administration
- **Affected Screen IDs:** SCR-067
- **Affected Element IDs:** Not mapped in surviving traceability records; see interactive inventory by Screen ID.
- **Related Feature IDs:** F-041
- **Related Flow IDs:** See 06_USER_FLOW_AUDIT.md; no flow is claimed from a screenshot alone.
- **Design Reference:** docs/ux-inventory/screenshots/reference/activated/install-app-1280.png; docs/ux-inventory/screenshots/reference/activated/install-app-768.png; docs/ux-inventory/screenshots/reference/activated/install-app-390.png
- **Current System Evidence:** docs/ux-inventory/screenshots/system-mock/react/visual-round3/pwa-install-1280.png; docs/ux-inventory/screenshots/system-mock/react/visual-round3/pwa-install-768.png; docs/ux-inventory/screenshots/system-mock/react/visual-round3/pwa-install-390.png; Runtime screenshot and click evidence in docs/ux-inventory; تصحيح Screen IDs: المستخدمون SCR-022، السلة SCR-029، السائقون SCR-032، سجل العمليات SCR-033، PWA SCR-067.; Check report 08 for matched routes/controllers; no API request was executed.; Static schema artifacts only; no live DB query. See report 08.
- **Expected Behavior:** خطوات وحالات تثبيت لكل منصة.
- **Actual Behavior:** المرجع يشرح خطوات وحالات تثبيت بحسب المنصة؛ النظام يعرض تعليمات عامة لتشغيل MASTER كتطبيق مستقل.
- **Exact Missing or Incorrect Detail:** اختلاف شاشة تثبيت التطبيق
- **Why This Is a Gap:** The persisted backlog records this expected behavior and acceptance condition; current evidence above records the observed or classified implementation state.
- **User Impact:** Not independently rated in the surviving evidence; priority is inherited from the persisted backlog.
- **Business Impact:** Not independently rated in the surviving evidence; consult the feature and flow records before implementation.
- **Technical Impact:** See frontend/backend/database evidence above; where absent, implementation layer is unverified.
- **Root Cause:** Unknown unless identified in cited system evidence.
- **Dependencies:** fixtures متطابقة ودور اختبار محدود؛ لا تستخدم بيانات إنتاجية.
- **Suggested Corrective Action:** اختلاف شاشة تثبيت التطبيق: خطوات وحالات تثبيت لكل منصة.
- **Acceptance Criteria:** حالات التثبيت تتبع PWA الفعلية وتطابق المرجع.
- **Recommended Verification Method:** إعادة مقارنة المقاسات الثلاثة ثم اختبار النقر/حالات الواجهة في بيئة fixture دون إرسال بيانات خارجية.
- **Implementation Complexity:** Unknown; no new estimate assigned.
- **Open Questions:** Use the linked feature, flow, and unverified-items reports for unresolved product or runtime questions.
- **Evidence references:** docs/ux-inventory/screenshots/system-mock/state-comparisons/round5-install-app-1280-side-by-side.png; docs/ux-inventory/screenshots/system-mock/state-comparisons/round5-install-app-768-side-by-side.png; docs/ux-inventory/screenshots/system-mock/state-comparisons/round5-install-app-390-side-by-side.png; audit-output/precision-slate-v43-20261029/05_FEATURE_GAP_MATRIX.csv; docs/ux-inventory/VISUAL_PAIR_REVIEW.csv; docs/ux-inventory/INVENTORY.csv


## GAP-0058 — مطابقة مسار المخزون المرتجع غير محسومة

- **Category:** UNVERIFIED_BEHAVIOR
- **Priority:** P2
- **Confidence:** Medium or Not Verified; see source classification
- **Affected Module:** Inventory
- **Affected Screen IDs:** SCR-028
- **Affected Element IDs:** Not mapped in surviving traceability records; see interactive inventory by Screen ID.
- **Related Feature IDs:** F-018
- **Related Flow IDs:** See 06_USER_FLOW_AUDIT.md; no flow is claimed from a screenshot alone.
- **Design Reference:** docs/ux-inventory/screenshots/reference/activated/stock-returns-1280.png; docs/ux-inventory/screenshots/reference/activated/stock-returns-768.png; docs/ux-inventory/screenshots/reference/activated/stock-returns-390.png
- **Current System Evidence:** docs/ux-inventory/screenshots/system-mock/react/visual-round3/warehouse-returns-1280.png; docs/ux-inventory/screenshots/system-mock/react/visual-round3/warehouse-returns-768.png; docs/ux-inventory/screenshots/system-mock/react/visual-round3/warehouse-returns-390.png; Runtime screenshot and click evidence in docs/ux-inventory; SCR-028 مرشحها /warehouse-returns لكن تطابقها مع SCR-051 غير محسوم.; Check report 08 for matched routes/controllers; no API request was executed.; Static schema artifacts only; no live DB query. See report 08.
- **Expected Behavior:** لوحة sec-stock-ret تعرض تاريخًا ومنتجًا ومخزنًا وكمية ومرجعًا.
- **Actual Behavior:** /warehouse-returns أقرب دلاليًا لكنه يخدم أيضًا SCR-051؛ لا يمكن تأكيد أن هذا هو تنفيذ sec-stock-ret أو أن اللوحتين متكافئتان.
- **Exact Missing or Incorrect Detail:** مطابقة مسار المخزون المرتجع غير محسومة
- **Why This Is a Gap:** The persisted backlog records this expected behavior and acceptance condition; current evidence above records the observed or classified implementation state.
- **User Impact:** Not independently rated in the surviving evidence; priority is inherited from the persisted backlog.
- **Business Impact:** Not independently rated in the surviving evidence; consult the feature and flow records before implementation.
- **Technical Impact:** See frontend/backend/database evidence above; where absent, implementation layer is unverified.
- **Root Cause:** Unknown unless identified in cited system evidence.
- **Dependencies:** fixtures متطابقة ودور اختبار محدود؛ حسم علاقة SCR-028 وSCR-051.
- **Suggested Corrective Action:** مطابقة مسار المخزون المرتجع غير محسومة: لوحة sec-stock-ret تعرض تاريخًا ومنتجًا ومخزنًا وكمية ومرجعًا.
- **Acceptance Criteria:** قرار يوضح إن كان لكل لوحة route مستقل ثم تُعاد المقارنة.
- **Recommended Verification Method:** إعادة مقارنة المقاسات الثلاثة ثم اختبار النقر/حالات الواجهة في بيئة fixture دون إرسال بيانات خارجية.
- **Implementation Complexity:** Unknown; no new estimate assigned.
- **Open Questions:** Use the linked feature, flow, and unverified-items reports for unresolved product or runtime questions.
- **Evidence references:** docs/ux-inventory/screenshots/system-mock/state-comparisons/round5-stock-returns-1280-side-by-side.png; docs/ux-inventory/screenshots/system-mock/state-comparisons/round5-stock-returns-768-side-by-side.png; docs/ux-inventory/screenshots/system-mock/state-comparisons/round5-stock-returns-390-side-by-side.png; audit-output/precision-slate-v43-20261029/05_FEATURE_GAP_MATRIX.csv; docs/ux-inventory/VISUAL_PAIR_REVIEW.csv; docs/ux-inventory/INVENTORY.csv


## GAP-0059 — اختلاف شاشة نقل الحاويات بين المواقع

- **Category:** VISUAL_MISMATCH
- **Priority:** P2
- **Confidence:** High for recorded visual/result evidence
- **Affected Module:** Containers/Finance
- **Affected Screen IDs:** SCR-050
- **Affected Element IDs:** Not mapped in surviving traceability records; see interactive inventory by Screen ID.
- **Related Feature IDs:** F-022
- **Related Flow IDs:** See 06_USER_FLOW_AUDIT.md; no flow is claimed from a screenshot alone.
- **Design Reference:** docs/ux-inventory/screenshots/reference/screens/transfers-1280.png; docs/ux-inventory/screenshots/reference/screens/transfers-768.png; docs/ux-inventory/screenshots/reference/screens/transfers-390.png
- **Current System Evidence:** docs/ux-inventory/screenshots/system-mock/react/visual-round3/container-transfers-1280.png; docs/ux-inventory/screenshots/system-mock/react/visual-round3/container-transfers-768.png; docs/ux-inventory/screenshots/system-mock/react/visual-round3/container-transfers-390.png; Candidate route/component mapped; actual behavior not exercised.; Check report 08 for matched routes/controllers; no API request was executed.; Static schema artifacts only; no live DB query. See report 08.
- **Expected Behavior:** نموذج داخل بطاقة من عمودين.
- **Actual Behavior:** بطاقة المرجع ذات عمودين؛ النظام يعرض قائمة فارغة ونموذجًا رأسيًا منفصلًا. استخدام صورة اللوحة المرجعية الساكنة لأن النقرة لم تفعّلها.
- **Exact Missing or Incorrect Detail:** اختلاف شاشة نقل الحاويات بين المواقع
- **Why This Is a Gap:** The persisted backlog records this expected behavior and acceptance condition; current evidence above records the observed or classified implementation state.
- **User Impact:** Not independently rated in the surviving evidence; priority is inherited from the persisted backlog.
- **Business Impact:** Not independently rated in the surviving evidence; consult the feature and flow records before implementation.
- **Technical Impact:** See frontend/backend/database evidence above; where absent, implementation layer is unverified.
- **Root Cause:** Unknown unless identified in cited system evidence.
- **Dependencies:** fixtures متطابقة ودور اختبار محدود؛ لا تستخدم بيانات إنتاجية.
- **Suggested Corrective Action:** اختلاف شاشة نقل الحاويات بين المواقع: نموذج داخل بطاقة من عمودين.
- **Acceptance Criteria:** تجميع الحقول والمسافات حسب المرجع.
- **Recommended Verification Method:** إعادة مقارنة المقاسات الثلاثة ثم اختبار النقر/حالات الواجهة في بيئة fixture دون إرسال بيانات خارجية.
- **Implementation Complexity:** Unknown; no new estimate assigned.
- **Open Questions:** Use the linked feature, flow, and unverified-items reports for unresolved product or runtime questions.
- **Evidence references:** docs/ux-inventory/screenshots/system-mock/state-comparisons/round3-container-transfers-1280-side-by-side.png; docs/ux-inventory/screenshots/system-mock/state-comparisons/round3-container-transfers-768-side-by-side.png; docs/ux-inventory/screenshots/system-mock/state-comparisons/round3-container-transfers-390-side-by-side.png; audit-output/precision-slate-v43-20261029/05_FEATURE_GAP_MATRIX.csv; docs/ux-inventory/VISUAL_PAIR_REVIEW.csv; docs/ux-inventory/INVENTORY.csv


## GAP-0060 — تنقل لوحة نقل الحاويات في المرجع لا يثبت فتح هدفه

- **Category:** UNVERIFIED_BEHAVIOR
- **Priority:** P2
- **Confidence:** Medium or Not Verified; see source classification
- **Affected Module:** SCR-050 — نقل الحاويات بين المواقع
- **Affected Screen IDs:** SCR-050
- **Affected Element IDs:** Not mapped in surviving traceability records; see interactive inventory by Screen ID.
- **Related Feature IDs:** راجع مصفوفة الميزات
- **Related Flow IDs:** See 06_USER_FLOW_AUDIT.md; no flow is claimed from a screenshot alone.
- **Design Reference:** See screen inventory and feature matrix.
- **Current System Evidence:** docs/ux-inventory/screenshots/reference/screens/transfers-1280.png; docs/ux-inventory/screenshots/reference/screens/transfers-768.png; docs/ux-inventory/screenshots/reference/screens/transfers-390.png; docs/ux-inventory/screenshots/system-mock/react/visual-round3/container-transfers.png; docs/ux-inventory/screenshots/system-mock/react/visual-round3/container-transfers-1280.png; docs/ux-inventory/screenshots/system-mock/state-comparisons/round3-container-transfers-1280-side-by-side.png; docs/ux-inventory/screenshots/system-mock/react/visual-round3/container-transfers-768.png; docs/ux-inventory/screenshots/system-mock/state-comparisons/round3-container-transfers-768-side-by-side.png; docs/ux-inventory/screenshots/system-mock/react/visual-round3/container-transfers-390.png; docs/ux-inventory/screenshots/system-mock/state-comparisons/round3-container-transfers-390-side-by-side.png
- **Expected Behavior:** النقرة كان يجب أن تفعّل sec-transfers.
- **Actual Behavior:** Not verified; No runtime evidence recorded.
- **Exact Missing or Incorrect Detail:** تنقل لوحة نقل الحاويات في المرجع لا يثبت فتح هدفه
- **Why This Is a Gap:** The persisted backlog records this expected behavior and acceptance condition; current evidence above records the observed or classified implementation state.
- **User Impact:** Not independently rated in the surviving evidence; priority is inherited from the persisted backlog.
- **Business Impact:** Not independently rated in the surviving evidence; consult the feature and flow records before implementation.
- **Technical Impact:** See frontend/backend/database evidence above; where absent, implementation layer is unverified.
- **Root Cause:** Unknown unless identified in cited system evidence.
- **Dependencies:** fixtures متطابقة ودور اختبار محدود؛ لا تستخدم بيانات إنتاجية.
- **Suggested Corrective Action:** تنقل لوحة نقل الحاويات في المرجع لا يثبت فتح هدفه: النقرة كان يجب أن تفعّل sec-transfers.
- **Acceptance Criteria:** نقرة مرئية تفتح sec-transfers أو alias واضح.
- **Recommended Verification Method:** إعادة مقارنة المقاسات الثلاثة ثم اختبار النقر/حالات الواجهة في بيئة fixture دون إرسال بيانات خارجية.
- **Implementation Complexity:** Unknown; no new estimate assigned.
- **Open Questions:** Use the linked feature, flow, and unverified-items reports for unresolved product or runtime questions.
- **Evidence references:** audit-output/precision-slate-v43-20261029/05_FEATURE_GAP_MATRIX.csv; docs/ux-inventory/VISUAL_PAIR_REVIEW.csv; docs/ux-inventory/INVENTORY.csv


## GAP-0061 — اختلاف ملخص المخزون ومرشحاته

- **Category:** VISUAL_MISMATCH
- **Priority:** P2
- **Confidence:** High for recorded visual/result evidence
- **Affected Module:** Inventory
- **Affected Screen IDs:** SCR-015
- **Affected Element IDs:** Not mapped in surviving traceability records; see interactive inventory by Screen ID.
- **Related Feature IDs:** F-016
- **Related Flow IDs:** See 06_USER_FLOW_AUDIT.md; no flow is claimed from a screenshot alone.
- **Design Reference:** docs/ux-inventory/screenshots/reference/screens/inventory-summary-1280.png; docs/ux-inventory/screenshots/reference/screens/inventory-summary-390.png; docs/ux-inventory/screenshots/reference/screens/inventory-summary-768.png
- **Current System Evidence:** docs/ux-inventory/screenshots/system-mock/react/all-screens/inventory-summary-1280.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/inventory-summary-390.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/inventory-summary-768.png; Candidate route/component mapped; actual behavior not exercised.; Check report 08 for matched routes/controllers; no API request was executed.; Static schema artifacts only; no live DB query. See report 08.
- **Expected Behavior:** إبراز ملخص المخزون وبنيته المختصرة كما في المرجع.
- **Actual Behavior:** النظام يضيف بحثًا وترتيبًا ومرشحات بارزة قبل المحتوى؛ المرجع يبدأ بملخص المخزون وبنية أقصر.
- **Exact Missing or Incorrect Detail:** اختلاف ملخص المخزون ومرشحاته
- **Why This Is a Gap:** The persisted backlog records this expected behavior and acceptance condition; current evidence above records the observed or classified implementation state.
- **User Impact:** Not independently rated in the surviving evidence; priority is inherited from the persisted backlog.
- **Business Impact:** Not independently rated in the surviving evidence; consult the feature and flow records before implementation.
- **Technical Impact:** See frontend/backend/database evidence above; where absent, implementation layer is unverified.
- **Root Cause:** Unknown unless identified in cited system evidence.
- **Dependencies:** الرجوع إلى الحالة نفسها والبيانات الاصطناعية نفسها عند التحقق.
- **Suggested Corrective Action:** اختلاف ملخص المخزون ومرشحاته: إبراز ملخص المخزون وبنيته المختصرة كما في المرجع.
- **Acceptance Criteria:** تتطابق البنية والترتيب المرئي مع المرجع عند 1280 و768 و390 بكسل على الحالة والبيانات نفسها: إبراز ملخص المخزون وبنيته المختصرة كما في المرجع.
- **Recommended Verification Method:** مقارنة مباشرة بصور 1280/768/390 بعد إعادة التقاط الطرفين على حالة وfixture متطابقتين.
- **Implementation Complexity:** Unknown; no new estimate assigned.
- **Open Questions:** Use the linked feature, flow, and unverified-items reports for unresolved product or runtime questions.
- **Evidence references:** docs/ux-inventory/screenshots/system-mock/all-inventory-summary-1280-side-by-side.png; docs/ux-inventory/screenshots/system-mock/all-inventory-summary-390-side-by-side.png; docs/ux-inventory/screenshots/system-mock/all-inventory-summary-768-side-by-side.png; audit-output/precision-slate-v43-20261029/05_FEATURE_GAP_MATRIX.csv; docs/ux-inventory/VISUAL_PAIR_REVIEW.csv; docs/ux-inventory/INVENTORY.csv


## GAP-0062 — اختلاف سجل حركات المخزون

- **Category:** VISUAL_MISMATCH
- **Priority:** P2
- **Confidence:** High for recorded visual/result evidence
- **Affected Module:** Inventory
- **Affected Screen IDs:** SCR-016
- **Affected Element IDs:** Not mapped in surviving traceability records; see interactive inventory by Screen ID.
- **Related Feature IDs:** F-017
- **Related Flow IDs:** See 06_USER_FLOW_AUDIT.md; no flow is claimed from a screenshot alone.
- **Design Reference:** docs/ux-inventory/screenshots/reference/screens/movements-1280.png; docs/ux-inventory/screenshots/reference/screens/movements-390.png; docs/ux-inventory/screenshots/reference/screens/movements-768.png
- **Current System Evidence:** docs/ux-inventory/screenshots/system-mock/react/all-screens/movements-1280.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/movements-390.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/movements-768.png; Candidate route/component mapped; actual behavior not exercised.; Check report 08 for matched routes/controllers; no API request was executed.; Static schema artifacts only; no live DB query. See report 08.
- **Expected Behavior:** إبراز حالات الحركة وسجلها بكثافة وترتيب المرجع.
- **Actual Behavior:** النظام يعرض لوحة مرشحات متعددة الحقول؛ المرجع يقدّم حالات الحركة والسجل بكثافة أكبر.
- **Exact Missing or Incorrect Detail:** اختلاف سجل حركات المخزون
- **Why This Is a Gap:** The persisted backlog records this expected behavior and acceptance condition; current evidence above records the observed or classified implementation state.
- **User Impact:** Not independently rated in the surviving evidence; priority is inherited from the persisted backlog.
- **Business Impact:** Not independently rated in the surviving evidence; consult the feature and flow records before implementation.
- **Technical Impact:** See frontend/backend/database evidence above; where absent, implementation layer is unverified.
- **Root Cause:** Unknown unless identified in cited system evidence.
- **Dependencies:** الرجوع إلى الحالة نفسها والبيانات الاصطناعية نفسها عند التحقق.
- **Suggested Corrective Action:** اختلاف سجل حركات المخزون: إبراز حالات الحركة وسجلها بكثافة وترتيب المرجع.
- **Acceptance Criteria:** تتطابق البنية والترتيب المرئي مع المرجع عند 1280 و768 و390 بكسل على الحالة والبيانات نفسها: إبراز حالات الحركة وسجلها بكثافة وترتيب المرجع.
- **Recommended Verification Method:** مقارنة مباشرة بصور 1280/768/390 بعد إعادة التقاط الطرفين على حالة وfixture متطابقتين.
- **Implementation Complexity:** Unknown; no new estimate assigned.
- **Open Questions:** Use the linked feature, flow, and unverified-items reports for unresolved product or runtime questions.
- **Evidence references:** docs/ux-inventory/screenshots/system-mock/all-movements-1280-side-by-side.png; docs/ux-inventory/screenshots/system-mock/all-movements-390-side-by-side.png; docs/ux-inventory/screenshots/system-mock/all-movements-768-side-by-side.png; audit-output/precision-slate-v43-20261029/05_FEATURE_GAP_MATRIX.csv; docs/ux-inventory/VISUAL_PAIR_REVIEW.csv; docs/ux-inventory/INVENTORY.csv


## GAP-0063 — اختلاف شاشة تقرير المخزون

- **Category:** VISUAL_MISMATCH
- **Priority:** P2
- **Confidence:** High for recorded visual/result evidence
- **Affected Module:** SCR-024 — تقرير المخزون
- **Affected Screen IDs:** SCR-024
- **Affected Element IDs:** Not mapped in surviving traceability records; see interactive inventory by Screen ID.
- **Related Feature IDs:** Not mapped; see 05_FEATURE_GAP_MATRIX.csv.
- **Related Flow IDs:** See 06_USER_FLOW_AUDIT.md; no flow is claimed from a screenshot alone.
- **Design Reference:** docs/ux-inventory/screenshots/reference/screens/reports-inventory-1280.png; docs/ux-inventory/screenshots/reference/screens/reports-inventory-390.png; docs/ux-inventory/screenshots/reference/screens/reports-inventory-768.png
- **Current System Evidence:** docs/ux-inventory/screenshots/system-mock/react/all-screens/reports-inventory-1280.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/reports-inventory-390.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/reports-inventory-768.png
- **Expected Behavior:** عرض المؤشرات والملخص والجدول كما في مرجع التقرير.
- **Actual Behavior:** المرجع يعرض مؤشرات وملخصًا وجدولًا؛ النظام يعرض البحث/المرشحات وقائمة تفاصيل. لا تُقارن أرقام المخزون لاختلاف البيانات.
- **Exact Missing or Incorrect Detail:** اختلاف شاشة تقرير المخزون
- **Why This Is a Gap:** The persisted backlog records this expected behavior and acceptance condition; current evidence above records the observed or classified implementation state.
- **User Impact:** Not independently rated in the surviving evidence; priority is inherited from the persisted backlog.
- **Business Impact:** Not independently rated in the surviving evidence; consult the feature and flow records before implementation.
- **Technical Impact:** See frontend/backend/database evidence above; where absent, implementation layer is unverified.
- **Root Cause:** Unknown unless identified in cited system evidence.
- **Dependencies:** الرجوع إلى الحالة نفسها والبيانات الاصطناعية نفسها عند التحقق.
- **Suggested Corrective Action:** اختلاف شاشة تقرير المخزون: عرض المؤشرات والملخص والجدول كما في مرجع التقرير.
- **Acceptance Criteria:** تتطابق البنية والترتيب المرئي مع المرجع عند 1280 و768 و390 بكسل على الحالة والبيانات نفسها: عرض المؤشرات والملخص والجدول كما في مرجع التقرير.
- **Recommended Verification Method:** مقارنة مباشرة بصور 1280/768/390 بعد إعادة التقاط الطرفين على حالة وfixture متطابقتين.
- **Implementation Complexity:** Unknown; no new estimate assigned.
- **Open Questions:** Use the linked feature, flow, and unverified-items reports for unresolved product or runtime questions.
- **Evidence references:** docs/ux-inventory/screenshots/system-mock/all-reports-inventory-1280-side-by-side.png; docs/ux-inventory/screenshots/system-mock/all-reports-inventory-390-side-by-side.png; docs/ux-inventory/screenshots/system-mock/all-reports-inventory-768-side-by-side.png; audit-output/precision-slate-v43-20261029/05_FEATURE_GAP_MATRIX.csv; docs/ux-inventory/VISUAL_PAIR_REVIEW.csv; docs/ux-inventory/INVENTORY.csv


## GAP-0064 — اختلاف شاشة تقرير الأرباح والخسائر

- **Category:** VISUAL_MISMATCH
- **Priority:** P2
- **Confidence:** High for recorded visual/result evidence
- **Affected Module:** Containers
- **Affected Screen IDs:** SCR-021
- **Affected Element IDs:** Not mapped in surviving traceability records; see interactive inventory by Screen ID.
- **Related Feature IDs:** F-021
- **Related Flow IDs:** See 06_USER_FLOW_AUDIT.md; no flow is claimed from a screenshot alone.
- **Design Reference:** docs/ux-inventory/screenshots/reference/screens/reports-profit-1280.png; docs/ux-inventory/screenshots/reference/screens/reports-profit-390.png; docs/ux-inventory/screenshots/reference/screens/reports-profit-768.png
- **Current System Evidence:** docs/ux-inventory/screenshots/system-mock/react/all-screens/reports-profit-1280.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/reports-profit-390.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/reports-profit-768.png; Candidate route/component mapped; actual behavior not exercised.; Check report 08 for matched routes/controllers; no API request was executed.; Static schema artifacts only; no live DB query. See report 08.
- **Expected Behavior:** عرض المؤشرات ومخططات التحليل المرجعية بعد توحيد بيانات التقرير.
- **Actual Behavior:** المرجع يعرض مؤشرات ومخططات تحليلية؛ لقطة النظام تعرض نطاق تاريخ وحالة بلا بيانات. القيم غير قابلة للمقارنة.
- **Exact Missing or Incorrect Detail:** اختلاف شاشة تقرير الأرباح والخسائر
- **Why This Is a Gap:** The persisted backlog records this expected behavior and acceptance condition; current evidence above records the observed or classified implementation state.
- **User Impact:** Not independently rated in the surviving evidence; priority is inherited from the persisted backlog.
- **Business Impact:** Not independently rated in the surviving evidence; consult the feature and flow records before implementation.
- **Technical Impact:** See frontend/backend/database evidence above; where absent, implementation layer is unverified.
- **Root Cause:** Unknown unless identified in cited system evidence.
- **Dependencies:** الرجوع إلى الحالة نفسها والبيانات الاصطناعية نفسها عند التحقق.
- **Suggested Corrective Action:** اختلاف شاشة تقرير الأرباح والخسائر: عرض المؤشرات ومخططات التحليل المرجعية بعد توحيد بيانات التقرير.
- **Acceptance Criteria:** تتطابق البنية والترتيب المرئي مع المرجع عند 1280 و768 و390 بكسل على الحالة والبيانات نفسها: عرض المؤشرات ومخططات التحليل المرجعية بعد توحيد بيانات التقرير.
- **Recommended Verification Method:** مقارنة مباشرة بصور 1280/768/390 بعد إعادة التقاط الطرفين على حالة وfixture متطابقتين.
- **Implementation Complexity:** Unknown; no new estimate assigned.
- **Open Questions:** Use the linked feature, flow, and unverified-items reports for unresolved product or runtime questions.
- **Evidence references:** docs/ux-inventory/screenshots/system-mock/all-reports-profit-1280-side-by-side.png; docs/ux-inventory/screenshots/system-mock/all-reports-profit-390-side-by-side.png; docs/ux-inventory/screenshots/system-mock/all-reports-profit-768-side-by-side.png; audit-output/precision-slate-v43-20261029/05_FEATURE_GAP_MATRIX.csv; docs/ux-inventory/VISUAL_PAIR_REVIEW.csv; docs/ux-inventory/INVENTORY.csv


## GAP-0065 — اختلاف شاشة تقرير المبيعات

- **Category:** VISUAL_MISMATCH
- **Priority:** P2
- **Confidence:** High for recorded visual/result evidence
- **Affected Module:** Containers
- **Affected Screen IDs:** SCR-020
- **Affected Element IDs:** Not mapped in surviving traceability records; see interactive inventory by Screen ID.
- **Related Feature IDs:** F-020
- **Related Flow IDs:** See 06_USER_FLOW_AUDIT.md; no flow is claimed from a screenshot alone.
- **Design Reference:** docs/ux-inventory/screenshots/reference/screens/reports-sales-1280.png; docs/ux-inventory/screenshots/reference/screens/reports-sales-390.png; docs/ux-inventory/screenshots/reference/screens/reports-sales-768.png
- **Current System Evidence:** docs/ux-inventory/screenshots/system-mock/react/all-screens/reports-sales-1280.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/reports-sales-390.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/reports-sales-768.png; Candidate route/component mapped; actual behavior not exercised.; Check report 08 for matched routes/controllers; no API request was executed.; Static schema artifacts only; no live DB query. See report 08.
- **Expected Behavior:** جمع المرشحات والمؤشرات والمخطط والجداول في ترتيب المرجع.
- **Actual Behavior:** المرجع يجمع الفلاتر والمؤشرات والمخطط والجداول؛ النظام يعرض بحثًا وتاريخًا وقائمة فواتير.
- **Exact Missing or Incorrect Detail:** اختلاف شاشة تقرير المبيعات
- **Why This Is a Gap:** The persisted backlog records this expected behavior and acceptance condition; current evidence above records the observed or classified implementation state.
- **User Impact:** Not independently rated in the surviving evidence; priority is inherited from the persisted backlog.
- **Business Impact:** Not independently rated in the surviving evidence; consult the feature and flow records before implementation.
- **Technical Impact:** See frontend/backend/database evidence above; where absent, implementation layer is unverified.
- **Root Cause:** Unknown unless identified in cited system evidence.
- **Dependencies:** الرجوع إلى الحالة نفسها والبيانات الاصطناعية نفسها عند التحقق.
- **Suggested Corrective Action:** اختلاف شاشة تقرير المبيعات: جمع المرشحات والمؤشرات والمخطط والجداول في ترتيب المرجع.
- **Acceptance Criteria:** تتطابق البنية والترتيب المرئي مع المرجع عند 1280 و768 و390 بكسل على الحالة والبيانات نفسها: جمع المرشحات والمؤشرات والمخطط والجداول في ترتيب المرجع.
- **Recommended Verification Method:** مقارنة مباشرة بصور 1280/768/390 بعد إعادة التقاط الطرفين على حالة وfixture متطابقتين.
- **Implementation Complexity:** Unknown; no new estimate assigned.
- **Open Questions:** Use the linked feature, flow, and unverified-items reports for unresolved product or runtime questions.
- **Evidence references:** docs/ux-inventory/screenshots/system-mock/all-reports-sales-1280-side-by-side.png; docs/ux-inventory/screenshots/system-mock/all-reports-sales-390-side-by-side.png; docs/ux-inventory/screenshots/system-mock/all-reports-sales-768-side-by-side.png; audit-output/precision-slate-v43-20261029/05_FEATURE_GAP_MATRIX.csv; docs/ux-inventory/VISUAL_PAIR_REVIEW.csv; docs/ux-inventory/INVENTORY.csv


## GAP-0066 — اختلاف ترتيب نموذج إنشاء مرتجع المبيعات

- **Category:** VISUAL_MISMATCH
- **Priority:** P2
- **Confidence:** High for recorded visual/result evidence
- **Affected Module:** SCR-013 — إنشاء مرتجع مبيعات جديد
- **Affected Screen IDs:** SCR-013
- **Affected Element IDs:** Not mapped in surviving traceability records; see interactive inventory by Screen ID.
- **Related Feature IDs:** Not mapped; see 05_FEATURE_GAP_MATRIX.csv.
- **Related Flow IDs:** See 06_USER_FLOW_AUDIT.md; no flow is claimed from a screenshot alone.
- **Design Reference:** docs/ux-inventory/screenshots/reference/screens/return-create-1280.png; docs/ux-inventory/screenshots/reference/screens/return-create-390.png; docs/ux-inventory/screenshots/reference/screens/return-create-768.png
- **Current System Evidence:** docs/ux-inventory/screenshots/system-mock/react/all-screens/return-create-1280.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/return-create-390.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/return-create-768.png
- **Expected Behavior:** عرض مصدر المرتجع والعميل والبنود وتوزيع النموذج حسب المرجع.
- **Actual Behavior:** ترتيب أقسام مصدر المرتجع والعميل والبنود وتوزيع النموذج مختلف عن المرجع.
- **Exact Missing or Incorrect Detail:** اختلاف ترتيب نموذج إنشاء مرتجع المبيعات
- **Why This Is a Gap:** The persisted backlog records this expected behavior and acceptance condition; current evidence above records the observed or classified implementation state.
- **User Impact:** Not independently rated in the surviving evidence; priority is inherited from the persisted backlog.
- **Business Impact:** Not independently rated in the surviving evidence; consult the feature and flow records before implementation.
- **Technical Impact:** See frontend/backend/database evidence above; where absent, implementation layer is unverified.
- **Root Cause:** Unknown unless identified in cited system evidence.
- **Dependencies:** الرجوع إلى الحالة نفسها والبيانات الاصطناعية نفسها عند التحقق.
- **Suggested Corrective Action:** اختلاف ترتيب نموذج إنشاء مرتجع المبيعات: عرض مصدر المرتجع والعميل والبنود وتوزيع النموذج حسب المرجع.
- **Acceptance Criteria:** تتطابق البنية والترتيب المرئي مع المرجع عند 1280 و768 و390 بكسل على الحالة والبيانات نفسها: عرض مصدر المرتجع والعميل والبنود وتوزيع النموذج حسب المرجع.
- **Recommended Verification Method:** مقارنة مباشرة بصور 1280/768/390 بعد إعادة التقاط الطرفين على حالة وfixture متطابقتين.
- **Implementation Complexity:** Unknown; no new estimate assigned.
- **Open Questions:** Use the linked feature, flow, and unverified-items reports for unresolved product or runtime questions.
- **Evidence references:** docs/ux-inventory/screenshots/system-mock/all-return-create-1280-side-by-side.png; docs/ux-inventory/screenshots/system-mock/all-return-create-390-side-by-side.png; docs/ux-inventory/screenshots/system-mock/all-return-create-768-side-by-side.png; audit-output/precision-slate-v43-20261029/05_FEATURE_GAP_MATRIX.csv; docs/ux-inventory/VISUAL_PAIR_REVIEW.csv; docs/ux-inventory/INVENTORY.csv


## GAP-0067 — اختلاف شاشة المستخدمين والصلاحيات

- **Category:** VISUAL_MISMATCH
- **Priority:** P2
- **Confidence:** High for recorded visual/result evidence
- **Affected Module:** Administration
- **Affected Screen IDs:** SCR-022
- **Affected Element IDs:** Not mapped in surviving traceability records; see interactive inventory by Screen ID.
- **Related Feature IDs:** F-041
- **Related Flow IDs:** See 06_USER_FLOW_AUDIT.md; no flow is claimed from a screenshot alone.
- **Design Reference:** docs/ux-inventory/screenshots/reference/screens/users-1280.png; docs/ux-inventory/screenshots/reference/screens/users-390.png; docs/ux-inventory/screenshots/reference/screens/users-768.png
- **Current System Evidence:** docs/ux-inventory/screenshots/system-mock/react/all-screens/users-1280.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/users-390.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/users-768.png; Runtime screenshot and click evidence in docs/ux-inventory; تصحيح Screen IDs: المستخدمون SCR-022، السلة SCR-029، السائقون SCR-032، سجل العمليات SCR-033، PWA SCR-067.; Check report 08 for matched routes/controllers; no API request was executed.; Static schema artifacts only; no live DB query. See report 08.
- **Expected Behavior:** عرض قائمة المستخدمين والصلاحيات وفق مرجع التصميم.
- **Actual Behavior:** المرجع يعرض قائمة مستخدمين وصلاحيات؛ لقطة النظام تركز على نموذج/بطاقة تفاصيل. قيم المستخدمين غير موحدة.
- **Exact Missing or Incorrect Detail:** اختلاف شاشة المستخدمين والصلاحيات
- **Why This Is a Gap:** The persisted backlog records this expected behavior and acceptance condition; current evidence above records the observed or classified implementation state.
- **User Impact:** Not independently rated in the surviving evidence; priority is inherited from the persisted backlog.
- **Business Impact:** Not independently rated in the surviving evidence; consult the feature and flow records before implementation.
- **Technical Impact:** See frontend/backend/database evidence above; where absent, implementation layer is unverified.
- **Root Cause:** Unknown unless identified in cited system evidence.
- **Dependencies:** الرجوع إلى الحالة نفسها والبيانات الاصطناعية نفسها عند التحقق.
- **Suggested Corrective Action:** اختلاف شاشة المستخدمين والصلاحيات: عرض قائمة المستخدمين والصلاحيات وفق مرجع التصميم.
- **Acceptance Criteria:** تتطابق البنية والترتيب المرئي مع المرجع عند 1280 و768 و390 بكسل على الحالة والبيانات نفسها: عرض قائمة المستخدمين والصلاحيات وفق مرجع التصميم.
- **Recommended Verification Method:** مقارنة مباشرة بصور 1280/768/390 بعد إعادة التقاط الطرفين على حالة وfixture متطابقتين.
- **Implementation Complexity:** Unknown; no new estimate assigned.
- **Open Questions:** Use the linked feature, flow, and unverified-items reports for unresolved product or runtime questions.
- **Evidence references:** docs/ux-inventory/screenshots/system-mock/all-users-1280-side-by-side.png; docs/ux-inventory/screenshots/system-mock/all-users-390-side-by-side.png; docs/ux-inventory/screenshots/system-mock/all-users-768-side-by-side.png; audit-output/precision-slate-v43-20261029/05_FEATURE_GAP_MATRIX.csv; docs/ux-inventory/VISUAL_PAIR_REVIEW.csv; docs/ux-inventory/INVENTORY.csv


## GAP-0068 — اختلاف مواضع عناصر معاينة الطباعة

- **Category:** VISUAL_MISMATCH
- **Priority:** P2
- **Confidence:** High for recorded visual/result evidence
- **Affected Module:** SCR-008 — معاينة الطباعة
- **Affected Screen IDs:** SCR-008
- **Affected Element IDs:** Not mapped in surviving traceability records; see interactive inventory by Screen ID.
- **Related Feature IDs:** Not mapped; see 05_FEATURE_GAP_MATRIX.csv.
- **Related Flow IDs:** See 06_USER_FLOW_AUDIT.md; no flow is claimed from a screenshot alone.
- **Design Reference:** docs/ux-inventory/screenshots/reference/screens/invoice-print-1280.png; docs/ux-inventory/screenshots/reference/screens/invoice-print-390.png; docs/ux-inventory/screenshots/reference/screens/invoice-print-768.png
- **Current System Evidence:** docs/ux-inventory/screenshots/system-mock/react/all-screens/invoice-print-1280.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/invoice-print-390.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/invoice-print-768.png
- **Expected Behavior:** مطابقة توزيع بيانات المستند والورقة والعلامة المائية ببيانات الفاتورة نفسها.
- **Actual Behavior:** توزيع الورقة ومواضع بيانات المستند والعلامة المائية تختلف؛ اختلاف سجلات الفاتورة يمنع التحقق من المحتوى والأرقام.
- **Exact Missing or Incorrect Detail:** اختلاف مواضع عناصر معاينة الطباعة
- **Why This Is a Gap:** The persisted backlog records this expected behavior and acceptance condition; current evidence above records the observed or classified implementation state.
- **User Impact:** Not independently rated in the surviving evidence; priority is inherited from the persisted backlog.
- **Business Impact:** Not independently rated in the surviving evidence; consult the feature and flow records before implementation.
- **Technical Impact:** See frontend/backend/database evidence above; where absent, implementation layer is unverified.
- **Root Cause:** Unknown unless identified in cited system evidence.
- **Dependencies:** حالة/fixture متطابقة أو إتاحة محتوى لوحة المرجع.
- **Suggested Corrective Action:** اختلاف مواضع عناصر معاينة الطباعة: مطابقة توزيع بيانات المستند والورقة والعلامة المائية ببيانات الفاتورة نفسها.
- **Acceptance Criteria:** لقطة مرجع ونظام ناجحتان على بيانات موحدة، مع نتيجة مصنفة ومسنودة بالأدلة.
- **Recommended Verification Method:** مقارنة مباشرة بصور 1280/768/390 بعد إعادة التقاط الطرفين على حالة وfixture متطابقتين.
- **Implementation Complexity:** Unknown; no new estimate assigned.
- **Open Questions:** Use the linked feature, flow, and unverified-items reports for unresolved product or runtime questions.
- **Evidence references:** docs/ux-inventory/screenshots/system-mock/all-invoice-print-1280-side-by-side.png; docs/ux-inventory/screenshots/system-mock/all-invoice-print-390-side-by-side.png; docs/ux-inventory/screenshots/system-mock/all-invoice-print-768-side-by-side.png; audit-output/precision-slate-v43-20261029/05_FEATURE_GAP_MATRIX.csv; docs/ux-inventory/VISUAL_PAIR_REVIEW.csv; docs/ux-inventory/INVENTORY.csv


## GAP-0069 — اختلاف موضع وحجم نافذة البحث الشامل

- **Category:** VISUAL_MISMATCH
- **Priority:** P2
- **Confidence:** High for recorded visual/result evidence
- **Affected Module:** SCR-007 — إنشاء فاتورة مبيعات جديدة
- **Affected Screen IDs:** SCR-007
- **Affected Element IDs:** Not mapped in surviving traceability records; see interactive inventory by Screen ID.
- **Related Feature IDs:** Not mapped; see 05_FEATURE_GAP_MATRIX.csv.
- **Related Flow IDs:** See 06_USER_FLOW_AUDIT.md; no flow is claimed from a screenshot alone.
- **Design Reference:** docs/ux-inventory/screenshots/reference/states/interaction-global-search-invoice-create-1280.png; docs/ux-inventory/screenshots/reference/states/interaction-global-search-invoice-create-768.png; docs/ux-inventory/screenshots/reference/states/interaction-global-search-invoice-create-390.png
- **Current System Evidence:** docs/ux-inventory/screenshots/system-mock/react/states/interaction-global-search-invoice-create-1280.png; docs/ux-inventory/screenshots/system-mock/react/states/interaction-global-search-invoice-create-768.png; docs/ux-inventory/screenshots/system-mock/react/states/interaction-global-search-invoice-create-390.png
- **Expected Behavior:** فتح البحث كقائمة ضيقة متصلة بالشريط العلوي وفق المرجع.
- **Actual Behavior:** المرجع يفتح قائمة بحث ضيقة متصلة بشريط الرأس؛ التطبيق يفتح نافذة مركزية أعرض وتعتيمًا يغطي بقية الصفحة. / المرجع يفتح قائمة البحث قرب شريط الرأس؛ التطبيق يعرض نافذة بحث مركزية مع طبقة تعتيم. الخلفية هي صفحة إنشاء فاتورة في الطرفين.
- **Exact Missing or Incorrect Detail:** اختلاف موضع وحجم نافذة البحث الشامل
- **Why This Is a Gap:** The persisted backlog records this expected behavior and acceptance condition; current evidence above records the observed or classified implementation state.
- **User Impact:** Not independently rated in the surviving evidence; priority is inherited from the persisted backlog.
- **Business Impact:** Not independently rated in the surviving evidence; consult the feature and flow records before implementation.
- **Technical Impact:** See frontend/backend/database evidence above; where absent, implementation layer is unverified.
- **Root Cause:** Unknown unless identified in cited system evidence.
- **Dependencies:** الرجوع إلى الحالة نفسها والبيانات الاصطناعية نفسها عند التحقق.
- **Suggested Corrective Action:** اختلاف موضع وحجم نافذة البحث الشامل: فتح البحث كقائمة ضيقة متصلة بالشريط العلوي وفق المرجع.
- **Acceptance Criteria:** تتطابق البنية والترتيب المرئي مع المرجع عند 1280 و768 و390 بكسل على الحالة والبيانات نفسها: فتح البحث كقائمة ضيقة متصلة بالشريط العلوي وفق المرجع.
- **Recommended Verification Method:** مقارنة مباشرة بصور 1280/768/390 بعد إعادة التقاط الطرفين على حالة وfixture متطابقتين.
- **Implementation Complexity:** Unknown; no new estimate assigned.
- **Open Questions:** Use the linked feature, flow, and unverified-items reports for unresolved product or runtime questions.
- **Evidence references:** docs/ux-inventory/screenshots/system-mock/state-comparisons/global-search-1280-side-by-side.png; docs/ux-inventory/screenshots/system-mock/state-comparisons/global-search-768-side-by-side.png; docs/ux-inventory/screenshots/system-mock/state-comparisons/global-search-390-side-by-side.png; audit-output/precision-slate-v43-20261029/05_FEATURE_GAP_MATRIX.csv; docs/ux-inventory/VISUAL_PAIR_REVIEW.csv; docs/ux-inventory/INVENTORY.csv


## GAP-0070 — تفاصيل الطلب لم تصل إلى حالة قابلة للمقارنة

- **Category:** UNVERIFIED_BEHAVIOR
- **Priority:** P2
- **Confidence:** Medium or Not Verified; see source classification
- **Affected Module:** Inventory
- **Affected Screen IDs:** SCR-005
- **Affected Element IDs:** Not mapped in surviving traceability records; see interactive inventory by Screen ID.
- **Related Feature IDs:** F-009
- **Related Flow IDs:** See 06_USER_FLOW_AUDIT.md; no flow is claimed from a screenshot alone.
- **Design Reference:** docs/ux-inventory/screenshots/reference/screens/order-detail-1280.png; docs/ux-inventory/screenshots/reference/screens/order-detail-390.png; docs/ux-inventory/screenshots/reference/screens/order-detail-768.png
- **Current System Evidence:** docs/ux-inventory/screenshots/system-mock/react/all-screens/order-detail-1280.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/order-detail-390.png; docs/ux-inventory/screenshots/system-mock/react/all-screens/order-detail-768.png; Source contains the partial flow identified in gap register; runtime unverified.; Check report 08 for matched routes/controllers; no API request was executed.; Static schema artifacts only; no live DB query. See report 08.
- **Expected Behavior:** عرض تفاصيل الطلب المعتمد وحالته وبنوده كما في مرجع الشاشة.
- **Actual Behavior:** الصورة تعرض حالة تحقق/تحميل بدل التفاصيل، لكن الالتقاط انتظر 350ms فقط وسجل الطلب غير موحد؛ النتيجة غير محسومة.
- **Exact Missing or Incorrect Detail:** تفاصيل الطلب لم تصل إلى حالة قابلة للمقارنة
- **Why This Is a Gap:** The persisted backlog records this expected behavior and acceptance condition; current evidence above records the observed or classified implementation state.
- **User Impact:** Not independently rated in the surviving evidence; priority is inherited from the persisted backlog.
- **Business Impact:** Not independently rated in the surviving evidence; consult the feature and flow records before implementation.
- **Technical Impact:** See frontend/backend/database evidence above; where absent, implementation layer is unverified.
- **Root Cause:** Unknown unless identified in cited system evidence.
- **Dependencies:** حالة/fixture متطابقة أو إتاحة محتوى لوحة المرجع.
- **Suggested Corrective Action:** تفاصيل الطلب لم تصل إلى حالة قابلة للمقارنة: عرض تفاصيل الطلب المعتمد وحالته وبنوده كما في مرجع الشاشة.
- **Acceptance Criteria:** لقطة مرجع ونظام ناجحتان على بيانات موحدة، مع نتيجة مصنفة ومسنودة بالأدلة.
- **Recommended Verification Method:** مقارنة مباشرة بصور 1280/768/390 بعد إعادة التقاط الطرفين على حالة وfixture متطابقتين.
- **Implementation Complexity:** Unknown; no new estimate assigned.
- **Open Questions:** Use the linked feature, flow, and unverified-items reports for unresolved product or runtime questions.
- **Evidence references:** docs/ux-inventory/screenshots/system-mock/all-order-detail-1280-side-by-side.png; docs/ux-inventory/screenshots/system-mock/all-order-detail-390-side-by-side.png; docs/ux-inventory/screenshots/system-mock/all-order-detail-768-side-by-side.png; audit-output/precision-slate-v43-20261029/05_FEATURE_GAP_MATRIX.csv; docs/ux-inventory/VISUAL_PAIR_REVIEW.csv; docs/ux-inventory/INVENTORY.csv


## GAP-0071 — محتوى لوحة الإشعارات لم يقارن ببيانات موحدة

- **Category:** UNVERIFIED_BEHAVIOR
- **Priority:** P2
- **Confidence:** Medium or Not Verified; see source classification
- **Affected Module:** SCR-007 — إنشاء فاتورة مبيعات جديدة
- **Affected Screen IDs:** SCR-007
- **Affected Element IDs:** Not mapped in surviving traceability records; see interactive inventory by Screen ID.
- **Related Feature IDs:** Not mapped; see 05_FEATURE_GAP_MATRIX.csv.
- **Related Flow IDs:** See 06_USER_FLOW_AUDIT.md; no flow is claimed from a screenshot alone.
- **Design Reference:** docs/ux-inventory/screenshots/reference/states/interaction-notifications-invoice-create-1280.png; docs/ux-inventory/screenshots/reference/states/interaction-notifications-invoice-create-768.png; docs/ux-inventory/screenshots/reference/states/interaction-notifications-invoice-create-390.png
- **Current System Evidence:** docs/ux-inventory/screenshots/system-mock/react/states/interaction-notifications-invoice-create-1280.png; docs/ux-inventory/screenshots/system-mock/react/states/interaction-notifications-invoice-create-768.png; docs/ux-inventory/screenshots/system-mock/react/states/interaction-notifications-invoice-create-390.png
- **Expected Behavior:** مطابقة محتوى الإشعارات وارتفاع اللوحة بعد توفير نفس fixture في الطرفين.
- **Actual Behavior:** تم فتح اللوحة بالنقر في الطرفين. المرجع يعرض إشعارات تجريبية والنظام يعرض حالة فارغة؛ مجموعة البيانات غير موحدة، لذلك محتوى اللوحة وارتفاعها غير محسومين. موضع الفتح قابل للمشاهدة فقط.
- **Exact Missing or Incorrect Detail:** محتوى لوحة الإشعارات لم يقارن ببيانات موحدة
- **Why This Is a Gap:** The persisted backlog records this expected behavior and acceptance condition; current evidence above records the observed or classified implementation state.
- **User Impact:** Not independently rated in the surviving evidence; priority is inherited from the persisted backlog.
- **Business Impact:** Not independently rated in the surviving evidence; consult the feature and flow records before implementation.
- **Technical Impact:** See frontend/backend/database evidence above; where absent, implementation layer is unverified.
- **Root Cause:** Unknown unless identified in cited system evidence.
- **Dependencies:** حالة/fixture متطابقة أو إتاحة محتوى لوحة المرجع.
- **Suggested Corrective Action:** محتوى لوحة الإشعارات لم يقارن ببيانات موحدة: مطابقة محتوى الإشعارات وارتفاع اللوحة بعد توفير نفس fixture في الطرفين.
- **Acceptance Criteria:** لقطة مرجع ونظام ناجحتان على بيانات موحدة، مع نتيجة مصنفة ومسنودة بالأدلة.
- **Recommended Verification Method:** مقارنة مباشرة بصور 1280/768/390 بعد إعادة التقاط الطرفين على حالة وfixture متطابقتين.
- **Implementation Complexity:** Unknown; no new estimate assigned.
- **Open Questions:** Use the linked feature, flow, and unverified-items reports for unresolved product or runtime questions.
- **Evidence references:** docs/ux-inventory/screenshots/system-mock/state-comparisons/notifications-1280-side-by-side.png; docs/ux-inventory/screenshots/system-mock/state-comparisons/notifications-768-side-by-side.png; docs/ux-inventory/screenshots/system-mock/state-comparisons/notifications-390-side-by-side.png; audit-output/precision-slate-v43-20261029/05_FEATURE_GAP_MATRIX.csv; docs/ux-inventory/VISUAL_PAIR_REVIEW.csv; docs/ux-inventory/INVENTORY.csv


## GAP-0023 — فرق token الخط الأساسي

- **Category:** UNVERIFIED_BEHAVIOR
- **Priority:** P3
- **Confidence:** Medium or Not Verified; see source classification
- **Affected Module:** See screen and feature inventory.
- **Affected Screen IDs:** كل الشاشات
- **Affected Element IDs:** Not mapped in surviving traceability records; see interactive inventory by Screen ID.
- **Related Feature IDs:** F-001–F-044
- **Related Flow IDs:** See 06_USER_FLOW_AUDIT.md; no flow is claimed from a screenshot alone.
- **Design Reference:** See screen inventory and feature matrix.
- **Current System Evidence:** See source and screen inventory references in the feature matrix.
- **Expected Behavior:** توافق المقاس المحسوب مع التصميم المعتمد.
- **Actual Behavior:** Not verified; No runtime evidence recorded.
- **Exact Missing or Incorrect Detail:** فرق token الخط الأساسي
- **Why This Is a Gap:** The persisted backlog records this expected behavior and acceptance condition; current evidence above records the observed or classified implementation state.
- **User Impact:** Not independently rated in the surviving evidence; priority is inherited from the persisted backlog.
- **Business Impact:** Not independently rated in the surviving evidence; consult the feature and flow records before implementation.
- **Technical Impact:** See frontend/backend/database evidence above; where absent, implementation layer is unverified.
- **Root Cause:** Unknown unless identified in cited system evidence.
- **Dependencies:** حسم إصدار الواجهة المعتمد.
- **Suggested Corrective Action:** فرق token الخط الأساسي: توافق المقاس المحسوب مع التصميم المعتمد.
- **Acceptance Criteria:** مقاس المصدر المعتمد متحقق على عناصر نموذجية.
- **Recommended Verification Method:** browser computed style ولقطات عند viewport ثابت.
- **Implementation Complexity:** Unknown; no new estimate assigned.
- **Open Questions:** Use the linked feature, flow, and unverified-items reports for unresolved product or runtime questions.
- **Evidence references:** audit-output/precision-slate-v43-20261029/05_FEATURE_GAP_MATRIX.csv; docs/ux-inventory/VISUAL_PAIR_REVIEW.csv; docs/ux-inventory/INVENTORY.csv


## GAP-0024 — عرض الشريط الجانبي مختلف

- **Category:** UNVERIFIED_BEHAVIOR
- **Priority:** P3
- **Confidence:** Medium or Not Verified; see source classification
- **Affected Module:** See screen and feature inventory.
- **Affected Screen IDs:** كل الشاشات الرئيسية
- **Affected Element IDs:** Not mapped in surviving traceability records; see interactive inventory by Screen ID.
- **Related Feature IDs:** F-001–F-044
- **Related Flow IDs:** See 06_USER_FLOW_AUDIT.md; no flow is claimed from a screenshot alone.
- **Design Reference:** See screen inventory and feature matrix.
- **Current System Evidence:** See source and screen inventory references in the feature matrix.
- **Expected Behavior:** عرض يطابق مصدر التصميم المعتمد.
- **Actual Behavior:** Not verified; No runtime evidence recorded.
- **Exact Missing or Incorrect Detail:** عرض الشريط الجانبي مختلف
- **Why This Is a Gap:** The persisted backlog records this expected behavior and acceptance condition; current evidence above records the observed or classified implementation state.
- **User Impact:** Not independently rated in the surviving evidence; priority is inherited from the persisted backlog.
- **Business Impact:** Not independently rated in the surviving evidence; consult the feature and flow records before implementation.
- **Technical Impact:** See frontend/backend/database evidence above; where absent, implementation layer is unverified.
- **Root Cause:** Unknown unless identified in cited system evidence.
- **Dependencies:** اعتماد 240 أم 248 كقيمة نهائية.
- **Suggested Corrective Action:** عرض الشريط الجانبي مختلف: عرض يطابق مصدر التصميم المعتمد.
- **Acceptance Criteria:** computed width يطابق القيمة المعتمدة على desktop.
- **Recommended Verification Method:** لقطة متطابقة وقياس DOM بعد render.
- **Implementation Complexity:** Unknown; no new estimate assigned.
- **Open Questions:** Use the linked feature, flow, and unverified-items reports for unresolved product or runtime questions.
- **Evidence references:** audit-output/precision-slate-v43-20261029/05_FEATURE_GAP_MATRIX.csv; docs/ux-inventory/VISUAL_PAIR_REVIEW.csv; docs/ux-inventory/INVENTORY.csv


## GAP-0025 — ارتفاع الشريط العلوي مختلف

- **Category:** UNVERIFIED_BEHAVIOR
- **Priority:** P3
- **Confidence:** Medium or Not Verified; see source classification
- **Affected Module:** See screen and feature inventory.
- **Affected Screen IDs:** كل الشاشات الرئيسية
- **Affected Element IDs:** Not mapped in surviving traceability records; see interactive inventory by Screen ID.
- **Related Feature IDs:** F-001–F-044
- **Related Flow IDs:** See 06_USER_FLOW_AUDIT.md; no flow is claimed from a screenshot alone.
- **Design Reference:** See screen inventory and feature matrix.
- **Current System Evidence:** See source and screen inventory references in the feature matrix.
- **Expected Behavior:** تطابق ارتفاع الرأس مع design baseline المعتمد.
- **Actual Behavior:** Not verified; No runtime evidence recorded.
- **Exact Missing or Incorrect Detail:** ارتفاع الشريط العلوي مختلف
- **Why This Is a Gap:** The persisted backlog records this expected behavior and acceptance condition; current evidence above records the observed or classified implementation state.
- **User Impact:** Not independently rated in the surviving evidence; priority is inherited from the persisted backlog.
- **Business Impact:** Not independently rated in the surviving evidence; consult the feature and flow records before implementation.
- **Technical Impact:** See frontend/backend/database evidence above; where absent, implementation layer is unverified.
- **Root Cause:** Unknown unless identified in cited system evidence.
- **Dependencies:** اعتماد baseline النهائي.
- **Suggested Corrective Action:** ارتفاع الشريط العلوي مختلف: تطابق ارتفاع الرأس مع design baseline المعتمد.
- **Acceptance Criteria:** الارتفاع المحسوب يطابق المرجع النهائي ولا يقص محتوى.
- **Recommended Verification Method:** تصوير DOM عند viewport نفسه.
- **Implementation Complexity:** Unknown; no new estimate assigned.
- **Open Questions:** Use the linked feature, flow, and unverified-items reports for unresolved product or runtime questions.
- **Evidence references:** audit-output/precision-slate-v43-20261029/05_FEATURE_GAP_MATRIX.csv; docs/ux-inventory/VISUAL_PAIR_REVIEW.csv; docs/ux-inventory/INVENTORY.csv


## GAP-0026 — سلم radius مختلف

- **Category:** UNVERIFIED_BEHAVIOR
- **Priority:** P3
- **Confidence:** Medium or Not Verified; see source classification
- **Affected Module:** See screen and feature inventory.
- **Affected Screen IDs:** كل البطاقات والأزرار والمودالات
- **Affected Element IDs:** Not mapped in surviving traceability records; see interactive inventory by Screen ID.
- **Related Feature IDs:** F-001–F-044
- **Related Flow IDs:** See 06_USER_FLOW_AUDIT.md; no flow is claimed from a screenshot alone.
- **Design Reference:** See screen inventory and feature matrix.
- **Current System Evidence:** See source and screen inventory references in the feature matrix.
- **Expected Behavior:** زوايا المكونات توافق قيم design baseline.
- **Actual Behavior:** Not verified; No runtime evidence recorded.
- **Exact Missing or Incorrect Detail:** سلم radius مختلف
- **Why This Is a Gap:** The persisted backlog records this expected behavior and acceptance condition; current evidence above records the observed or classified implementation state.
- **User Impact:** Not independently rated in the surviving evidence; priority is inherited from the persisted backlog.
- **Business Impact:** Not independently rated in the surviving evidence; consult the feature and flow records before implementation.
- **Technical Impact:** See frontend/backend/database evidence above; where absent, implementation layer is unverified.
- **Root Cause:** Unknown unless identified in cited system evidence.
- **Dependencies:** اعتماد مصدر القيم.
- **Suggested Corrective Action:** سلم radius مختلف: زوايا المكونات توافق قيم design baseline.
- **Acceptance Criteria:** computed radius للمكونات النموذجية يطابق المرجع المعتمد.
- **Recommended Verification Method:** browser computed style وصور للمكونات عند حالة ثابتة.
- **Implementation Complexity:** Unknown; no new estimate assigned.
- **Open Questions:** Use the linked feature, flow, and unverified-items reports for unresolved product or runtime questions.
- **Evidence references:** audit-output/precision-slate-v43-20261029/05_FEATURE_GAP_MATRIX.csv; docs/ux-inventory/VISUAL_PAIR_REVIEW.csv; docs/ux-inventory/INVENTORY.csv


## GAP-0072 — اختلاف تكوين تفاصيل الفاتورة

- **Category:** VISUAL_MISMATCH
- **Priority:** P2
- **Confidence:** High for visible layout; status and record-state difference are not resolved.
- **Affected Module:** الفواتير
- **Affected Screen IDs:** SCR-031
- **Affected Element IDs:** عناصر تفاصيل الفاتورة؛ لم يُنشأ جرد مستقل لكل زر في هذه الجولة.
- **Related Feature IDs:** F-010
- **Related Flow IDs:** FLOW-003; لم يُختبر مسار الحفظ أو التحصيل.
- **Design Reference:** لقطات فتح تفاصيل الفاتورة بالنقر من صف مرجعي: docs/ux-inventory/screenshots/reference/row-click-details/invoice-detail-{1280,768,390}.png.
- **Current System Evidence:** النقر من قائمة النظام يفتح /invoices/:documentId عند المقاسات الثلاثة؛ docs/ux-inventory/screenshots/system-mock/react/visual-round7/invoice-detail-{1280,768,390}.png؛ المقارنات docs/ux-inventory/screenshots/comparisons/row-click-details/scr-031-{1280,768,390}-side-by-side.png.
- **Expected Behavior:** عرض بيانات الفاتورة ثم بنودها وجدول المدفوعات المرتبطة والمخزن، مع ترتيب إجراءات المرجع.
- **Actual Behavior:** يعرض النظام بيانات الفاتورة وبطاقات الإجمالي والمدفوع والمتبقي، ثم رسالة أن تفاصيل الأصناف غير متاحة وكتلة سجل تعديلات. المرجع يعرض سطر صنف ومدفوعة مرتبطة ومخزنًا. حالة المرجع «مدفوعة جزئيًا» وحالة النظام «صادرة» رغم تطابق بعض قيم العينة.
- **Exact Missing or Incorrect Detail:** ترتيب المحتوى مختلف، وبيانات بنود الفاتورة/الدفعة/المخزن غير ظاهرة في واجهة النظام لهذه العينة؛ نص الحالة مختلف ويحتاج توحيد fixture قبل تفسيره كخلل وظيفي.
- **Why This Is a Gap:** لقطات المقاسات الثلاثة تبين تكوينًا مختلفًا بوضوح؛ الأرقام المتطابقة لا تثبت تطابق البيانات أو حفظ العمليات.
- **User Impact:** يصعب مراجعة الصنف والمدفوعات والمخزن من شاشة التفاصيل بالطريقة المعروضة في المرجع.
- **Business Impact:** لا يُستنتج أثر محاسبي؛ حالة المستند تحتاج تحققًا ببيانات موحدة.
- **Technical Impact:** يلزم إكمال عرض البيانات وربط التخطيط بالمراجع المناسبة بعد التحقق من توفر بيانات العينة.
- **Root Cause:** Unknown؛ طبقة API/قاعدة البيانات لم تُختبر.
- **Dependencies:** fixture موحد لحالة الفاتورة وبنودها ومدفوعاتها ومخزنها.
- **Suggested Corrective Action:** مطابقة توزيع قسم البيانات وبنود الفاتورة والمدفوعات المرتبطة والمخزن مع المرجع، ثم توحيد حالة العينة قبل الحكم على الحالة الوظيفية.
- **Acceptance Criteria:** على البيانات نفسها تظهر بيانات الفاتورة وسطر الصنف والمدفوعات والمخزن بالترتيب المرجعي عند 1280 و768 و390، وتعرض حالة مستند واحدة متسقة مع مصدرها.
- **Recommended Verification Method:** إعادة فتح الفاتورة بالنقر من القائمة والتقاط المقاسات الثلاثة على fixture موحد؛ تحقق من الاستجابة الفعلية للبيانات دون اعتماد Toast وحده.
- **Implementation Complexity:** Medium
- **Open Questions:** هل حالة «صادرة» في النظام تمثل حالة غير مسددة أم أن عينة النظام لم تُحمّل دفعتها؟ لا يمكن حسمه من MSW.

## GAP-0073 — تفاصيل حركة المخزون لا تفتح من السجل

- **Category:** MISSING_SCREEN
- **Priority:** P2
- **Confidence:** High for the current React/MSW UI route and the tested row controls; backend support is not verified.
- **Affected Module:** المخزون
- **Affected Screen IDs:** SCR-053
- **Affected Element IDs:** مرجع الحركة في صف السجل؛ لا يوجد عنصر تفاعلي في الصف الحالي.
- **Related Feature IDs:** F-016
- **Related Flow IDs:** FLOW-004
- **Design Reference:** تفاصيل الحركة المفتوحة بنقرة مرئية من سجل المرجع: docs/ux-inventory/screenshots/reference/row-click-details/movement-detail-{1280,768,390}.png.
- **Current System Evidence:** النظام يعرض /inventory/movements عبر رابط بحث مرئي؛ صفوف الجدول بلا link/button/role=button عند 1280 و768 و390. نقر الصف على 1280 لا يغير المسار، وتعذر locator click عند 768 و390. الأدلة: docs/ux-inventory/SYSTEM_MOVEMENT_CLICK_REVIEW.json وصور النظام وside-by-side ضمن docs/ux-inventory/screenshots/comparisons/row-click-details/.
- **Expected Behavior:** اختيار مرجع الحركة يفتح شاشة تفاصيل تعرض المرجع المرتبط ونوع الحركة والصنف والمخزن والكمية والتاريخ.
- **Actual Behavior:** لا توجد شاشة تفاصيل أو وسيلة تفاعل في صفوف السجل في واجهة React المرصودة؛ النقر لا ينقل إلى مسار آخر.
- **Exact Missing or Incorrect Detail:** غياب رابط/إجراء مرجع الحركة، ومسار أو شاشة تفاصيل الحركة.
- **Why This Is a Gap:** سلوك المرجع يؤكد فتح التفاصيل من صف حركة، بينما فحص DOM والنقر في النظام يثبت بقاء المستخدم في قائمة الحركات.
- **User Impact:** لا يستطيع المستخدم مراجعة مصدر الحركة وتفاصيلها من السجل.
- **Business Impact:** لا يُفترض فقدان بيانات أو غياب دعم backend؛ تم تأكيد غياب واجهة التفاصيل فقط.
- **Technical Impact:** يلزم تحديد وجهة تفاصيل مرتبطة بمعرّف الحركة وإضافة عنصر تنقل مع حالات تحميل/خطأ/عودة.
- **Root Cause:** Confirmed for UI absence; backend support unknown.
- **Dependencies:** تحديد معرف الحركة والوجهة من API قبل التنفيذ.
- **Suggested Corrective Action:** أضف عنصرًا قابلًا للوحة المفاتيح في مرجع الصف يفتح تفاصيل الحركة، مع رجوع واضح وحالة عدم وجود الحركة.
- **Acceptance Criteria:** من أي صف ذي مرجع يمكن فتح صفحة التفاصيل بالنقر والكيبورد في desktop/mobile، وتعرض بيانات الحركة الصحيحة، ويمكن الرجوع للقائمة دون فقد المرشحات.
- **Recommended Verification Method:** تحقق من عناصر DOM ثم اختبر النقر والكيبورد عند 1280 و768 و390 على بيانات اصطناعية؛ تحقق من تفاصيل الصف المعروض.
- **Implementation Complexity:** Medium
- **Open Questions:** ما معرف الحركة المستقر الذي يعيده API؟ لم يُختبر backend.

<a id="12-prioritized-implementation-backlog"></a>

# 12 — قائمة التنفيذ المستقبلية حسب الأولوية والاعتماد

هذه قائمة عمل مستقبلية مبنية على سجل الفجوات الحالي. لم تُنفّذ أي نقطة أثناء التدقيق. العناصر الموسومة NOT_VERIFIED تحتاج جمع الدليل أولًا؛ لا تُعامل كخلل مؤكد.

## الأولويات

- P0: لا توجد فجوات حرجة مؤكدة.
- P1: 7 فجوات عالية الأولوية؛ تُراجع أولًا قبل الميزات غير الحرجة.
- P2: 62 فجوة متوسطة تشمل غالبية اختلافات الواجهة وسلوك الحالات.
- P3: 4 فروق منخفضة التأثير.

## ترتيب الاعتماد المقترح

1. احسم البنود غير المتحققة وأسماء الوجهات والـfixtures قبل تغيير واجهاتها.
2. نفّذ فجوات P1 بحسب اعتمادها على قرارات المخزون والمحاسبة والصلاحيات.
3. طابق مسارات المستخدم الأساسية والواجهات المرتبطة بها.
4. عالج الفروق البصرية المتكررة عبر المكونات المشتركة بعد اعتماد القيم المرجعية.
5. نفّذ اختبارات التفاعل والحالات على بيانات اختبار معزولة، ثم أعد التقاط المقاسات الثلاثة.

## سجل العمل المرتبط بالفجوات

| Priority | Gap ID | Feature ID | Screen ID | وصف العمل | النتيجة المتوقعة | معيار القبول | الاعتماد | طريقة التحقق |
|---|---|---|---|---|---|---|---|---|
| P1 | GAP-0001 | F-009 | SCR-005 | حجز كميات الطلب غير منفذ | حفظ حجز فعلي وإظهاره ثم تحريره وفق انتقالات معتمدة. | حجز محفوظ واحد، عرض واضح، لا تجاوز للمتاح، وتحرير مرة واحدة عند الإلغاء/التحول. | تعريف D8 والإلغاء والفوترة والتزامن. | مراجعة معاملات concurrent في قاعدة اختبار بعد اعتماد القرار. |
| P1 | GAP-0005 | F-029 | SCR-044 | دليل الحسابات صفحة انتظار | قراءة وإدارة شجرة الحسابات وفق صلاحية وقواعد محاسبية. | عرض الشجرة، الحالات الفارغة/الخطأ، وأفعال مسموحة دون تكرار/دورة. | صلاحيات وقواعد الكود والحساب المرحّل. | اختبارات شجرة صغيرة مع حساب مستخدم محدود. |
| P1 | GAP-0007 | F-031 | SCR-045 | لا واجهة/API لقيود اليومية | إنشاء قيد متوازن واعتماده/عكسه وربطه بمصدر. | كل قيد متوازن ومصدره واضح ولا يكرر ولا يترحل بلا صلاحية. | قواعد double-entry والصلاحيات والرقم والتكرار والعكس. | اختبارات ميزان وتكرار وعكس. |
| P1 | GAP-0008 | F-032 | SCR-046 | دفتر الأستاذ غير متاح | حركة كل حساب ورصيد افتتاحي وختامي ضمن فترة مع رابط القيد. | يعرض القيود المرحّلة فقط ويتطابق مجموع الحركة والرصيد. | قيود يومية معتمدة وتعريف العملة والفترة. | مطابقة حركة fixture مع دفاترها. |
| P1 | GAP-0009 | F-033 | SCR-047 | ميزان المراجعة غير متاح | تجميع أرصدة الحسابات المدينة والدائنة للفترة. | المدين يساوي الدائن للفترة المحددة؛ تعرض الأرصدة والحسابات بوضوح. | دفتر قيود مرحّل وقاعدة رصيد. | حساب fixture معروف مع قيود متوازنة وغير متوازنة. |
| P1 | GAP-0010 | F-034 | SCR-048 | التقرير المالي لا يعرض القوائم الثلاث | قوائم مالية بفترة مع تفصيل البنود ومصدرها. | الثلاثة متاحة وتطابق القيود وتعرض فترة ومصدرًا وحالات فارغة/خطأ. | دفتر القيود وتعريفات البنود والفترات وموافقة محاسبية. | مطابقة مجاميع نتائج بقيد fixture معتمد. |
| P1 | GAP-0056 | F-014 | SCR-063 | ميزة ملصقات الباركود غائبة من الواجهة | بحث/مسح كاميرا وطباعة جماعية وجدول ملصقات. | التحكم ظاهر ويتيح البحث/المسح والطباعة وحالات الفراغ. | fixtures متطابقة ودور اختبار محدود؛ لا تستخدم بيانات إنتاجية. | إعادة مقارنة المقاسات الثلاثة ثم اختبار النقر/حالات الواجهة في بيئة fixture دون إرسال بيانات خارجية. |
| P2 | GAP-0002 | F-004 | SCR-030 | ملف العميل لا يعرض تبويبات السجل | عرض تبويبات سجل العميل مع فتح العناصر أو تصفيتها عليه. | تظهر التبويبات والروابط والفراغ/التحميل/الخطأ لكل سجل. | تحديد عناصر التاريخ وواجهات query. | اختبار مصدر كل تبويب وعميل بلا حركات. |
| P2 | GAP-0003 | F-043 | SCR-002 | مرفقات العميل غير متاحة | رفع ملف مرتبط بالعميل وعرض بياناته للمستخدم المصرح. | الرفع والحذف/العرض والصلاحية وحالات الفشل تحفظ الارتباط الصحيح. | سياسة التخزين والأنواع والأحجام والصلاحيات والاحتفاظ. | اختبارات أنواع/أحجام/مستخدم ممنوع في تخزين محلي. |
| P2 | GAP-0004 | F-012 | SCR-013 | route إنشاء المرتجع لا يستخدم النموذج المستقل | يفتح زر الإنشاء نموذجًا موحدًا يغطي الحالات المعتمدة. | الرابط والمسار المباشر يفتحان النموذج المعتمد؛ linked/free مطابقان للقرار. | تحديد النموذج المقصود ونطاق المرتجع الحر. | مراجعة route وتجربة preview/create ببيئة معزولة. |
| P2 | GAP-0006 | F-030 | SCR-054 | التسويات المالية صفحة انتظار | إنشاء تسوية بمرجع وسبب ثم عرض أثرها وسجلها. | العملية تسجل مرة واحدة وسببًا ومنفذًا وأثرًا قابلًا للمراجعة. | تعريف التسوية والترحيل والعكس. | حالات قبول/رفض/تكرار في test fixture. |
| P2 | GAP-0011 | F-035 | SCR-017/035 | الأموال المنتظرة غير متاحة | قائمة مبالغ متوقعة بمصدر واستحقاق وحالة وتسوية. | كل مبلغ له مصدر وتاريخ وحالة وانتقال موثق دون تكرار. | تعريف مصادر الأموال والتمييز عن الذمم. | مراجعة قواعد العمل وسيناريوهات وصول/تأخر. |
| P2 | GAP-0012 | F-036 | SCR-017 | خطط أقساط الشركاء غير متاحة | متابعة قسط مستحق ومدفوع ومتأخر ومتبقي. | تعرض الاستحقاق والمدفوع والمتبقي والحالة مع سجل تعديل. | قواعد الشريك والاعتماد والربط بالدفعات. | اختبار قسط متأخر ومدفوع جزئيًا على بيانات fixture. |
| P2 | GAP-0013 | F-037 | SCR-056 | ميزانية المصروفات غير متاحة | مبلغ مخطط حسب تصنيف وفترة مع مقارنة الفعلي والانحراف. | تعرض المخطط والفعلي والمتبقي والفارق بمصدر واضح. | سياسة تجاوز الحد والعملة والفترة والتصنيف. | مقارنة حسابات على مجموعة مصروفات معلومة. |
| P2 | GAP-0014 | F-038 | SCR-057 | المصروفات المتكررة غير متاحة | جدولة دورية مع مراجعة أو تسجيل محدد. | الاستحقاق ينشأ مرة واحدة ويمكن إيقافه وتعديله مع سجل. | اعتماد بشري أو تلقائي وسياسة إيقاف وتعديل. | اختبار استحقاق واحد وإعادة تشغيل scheduler بلا ازدواج. |
| P2 | GAP-0015 | F-039 | SCR-058 | مقارنة شهر بشهر غير موجودة | اختيار فترتين وعرض المؤشر والفارق العددي/النسبي. | الفترة والقيمة والفارق مع معالجة صفر/فترة بلا بيانات. | قائمة المقاييس وقاعدة الفترات والصفر. | مقارنة فترتين fixture مع إجمالي محسوب يدويًا. |
| P2 | GAP-0016 | F-040 | SCR-059 | توقع السيولة غير موجود | توقع الداخل والخارج بفترة مع فصل المتوقع عن الفعلي والمصدر. | كل مبلغ متوقع موسوم ومصدره معروف ومجموعه قابل للمراجعة. | تعريف الذمم والأقساط والمصروفات المتكررة. | reconciliation على سيناريو تواريخ ومصادر معروف. |
| P2 | GAP-0017 | F-042 | أدوات البيانات الديناميكية؛ لا SCR ثابت. | أدوات البيانات في الويب mock وليست متصلة | رفع ومعاينة وتحقق ثم تطبيق بعد تأكيد وعرض ملخص يومي. | preview لا يكتب؛ apply مؤكد؛ أخطاء الصفوف والنتيجة تظهر بوضوح. | أمان الرفع والمعاينة والصلاحيات وidempotency. | ملف اختبار سليم ومعيب؛ لا apply على أي بيانات حقيقية. |
| P2 | GAP-0018 | F-044 | SCR-025 | النسخ والاستعادة لا تظهر للمستخدم | استعراض حالة النسخ وإنشاء نسخة محكومة وإظهار النتيجة. | يظهر آخر وقت ونتيجة؛ لا restore بلا تأكيد وفحص scratch وتسجيل أثر. | صلاحيات، سجلات تدقيق، نطاق scratch للاستعادة. | مراجعة أوامر read-only الآن؛ sandbox مستقل بعد التنفيذ. |
| P2 | GAP-0019 | F-027/F-028 | SCR-019 وما يرتبط به | عدد التقارير المعلن بلا فهرس تقارير مكتمل | قائمة canonical باسم وهدف وفلاتر ومخرجات وصلاحية كل تقرير. | كل رقم يطابق قائمة محددة؛ كل بطاقة لها target وحقول ومصدر. | اعتماد مالك المنتج للتصميم. | مقارنة الفهرس المعتمد مع routes وواجهات ReportsPage. |
| P2 | GAP-0020 | F-002 | SCR-001 | بيانات التحليل بلوحة التحكم تنتظر schema | إظهار تحليلات وتنبيهات مستمدة من endpoints. | بيانات موثقة مع تاريخ تحديث وحالات empty/loading/error/retry. | تعريف مؤشرات وفترات وصلاحيات البيانات. | مطابقة values لتجميعة بيانات fixture. |
| P2 | GAP-0021 | F-041 | SCR-025 | إعدادات أقل من نطاق المرجع | تقسيم الإعدادات المرجعية مع حفظ وتغذية من API. | كل field إما موصول بخدمة أو موضح أنه غير متاح؛ حالات حفظ/خطأ سليمة. | تعريف الحقول المسموحة لكل دور وAPI. | مقارنة مصدر tab-by-tab مع صفحات/مسارات API. |
| P2 | GAP-0022 | F-027/F-041 | SCR-001 ومقاطع الإعدادات والتنقل | handlers في المرجع تصل إلى panels غير موجودة | كل رابط إلى شاشة موجودة أو وجهة موثقة. | كل handler يجد panel/route صالحًا أو يصنف صراحة خارج النطاق. | قرار target لكل عنصر. | مقارنة handler targets بقائمة panel IDs ثم تفاعل prototype لاحقًا. |
| P2 | GAP-0027 | F-002 | SCR-001 and mobile shell | Mobile navigation differs from the v43 reference | At 390px, use the navigation controls and placement shown in the approved reference. | At 390px the same navigation controls appear in the same locations as v43 and do not cover screen content. | None identified for the visual correction. | Matched screenshots plus touch and keyboard navigation through each item. |
| P2 | GAP-0028 | F-001 | SCR-000 | Login form presentation differs from the v43 reference | Match the reference username control, labels, logo scale, and submit-button copy/layout. | At 390px the field type, copy, logo scale, and spacing match v43; valid login still uses the API. | Live valid/invalid authentication remains unverified. | Matched screenshots and live isolated-account valid/invalid login tests. |
| P2 | GAP-0029 | Finance feature records in INVENTORY.csv | SCR-017 | Finance screen hierarchy differs from the v43 reference | Preserve the reference finance tabs, customer-account table, expense section, and their hierarchy at 390px. | Tabs, table, and expense section follow reference order at 390px; all current actions remain reachable. | Matching finance fixtures are needed to compare values and rows. | Matched 390px images and API-backed interaction checks for each section. |
| P2 | GAP-0030 | F-008 | SCR-004 | Order creation omits reference form sections and controls | Show the reference order-number/customer/date/currency/sales-representative/payment-terms/warehouse groups, item table, and financial summary. | Each reference field is present or its unsupported contract is explicitly documented; item rows and totals follow the reference hierarchy. | Same seeded customer/catalog/order data is needed for behavior comparison. | Same-fixture screenshots, then create/cancel/confirm in an isolated backend fixture. |
| P2 | GAP-0031 | F-002 | SCR-001 | اختلاف ترتيب ومحتوى لوحة التحكم | عرض مؤشرات الأداء والرسم والنشاط والخزينة وفق ترتيب مرجع v43. | تتطابق البنية والترتيب المرئي مع المرجع عند 1280 و768 و390 بكسل على الحالة والبيانات نفسها: عرض مؤشرات الأداء والرسم والنشاط والخزينة وفق ترتيب مرجع v43. | الرجوع إلى الحالة نفسها والبيانات الاصطناعية نفسها عند التحقق. | مقارنة مباشرة بصور 1280/768/390 بعد إعادة التقاط الطرفين على حالة وfixture متطابقتين. |
| P2 | GAP-0032 | F-007 | SCR-003 | اختلاف تكوين قائمة الطلبات | تجميع البحث والمرشحات والجدول والترقيم وفق بنية المرجع. | تتطابق البنية والترتيب المرئي مع المرجع عند 1280 و768 و390 بكسل على الحالة والبيانات نفسها: تجميع البحث والمرشحات والجدول والترقيم وفق بنية المرجع. | الرجوع إلى الحالة نفسها والبيانات الاصطناعية نفسها عند التحقق. | مقارنة مباشرة بصور 1280/768/390 بعد إعادة التقاط الطرفين على حالة وfixture متطابقتين. |
| P2 | GAP-0033 | F-010 | SCR-006 | اختلاف تكوين قائمة الفواتير | عرض ملخصات الفواتير والمرشحات والجدول حسب ترتيب المرجع. | تتطابق البنية والترتيب المرئي مع المرجع عند 1280 و768 و390 بكسل على الحالة والبيانات نفسها: عرض ملخصات الفواتير والمرشحات والجدول حسب ترتيب المرجع. | الرجوع إلى الحالة نفسها والبيانات الاصطناعية نفسها عند التحقق. | مقارنة مباشرة بصور 1280/768/390 بعد إعادة التقاط الطرفين على حالة وfixture متطابقتين. |
| P2 | GAP-0034 | Not mapped; see 05_FEATURE_GAP_MATRIX.csv. | SCR-007 | اختلاف توزيع نموذج إنشاء الفاتورة | توزيع شريط الإجراءات ونوع العملية وأقسام العميل والفاتورة على نحو المرجع. | تتطابق البنية والترتيب المرئي مع المرجع عند 1280 و768 و390 بكسل على الحالة والبيانات نفسها: توزيع شريط الإجراءات ونوع العملية وأقسام العميل والفاتورة على نحو المرجع. | الرجوع إلى الحالة نفسها والبيانات الاصطناعية نفسها عند التحقق. | مقارنة مباشرة بصور 1280/768/390 بعد إعادة التقاط الطرفين على حالة وfixture متطابقتين. |
| P2 | GAP-0035 | F-012 | SCR-012 | اختلاف حالة قائمة المرتجعات | إبراز زر الإنشاء والجدول كما في المرجع حتى عند عدم وجود صفوف. | تتطابق البنية والترتيب المرئي مع المرجع عند 1280 و768 و390 بكسل على الحالة والبيانات نفسها: إبراز زر الإنشاء والجدول كما في المرجع حتى عند عدم وجود صفوف. | الرجوع إلى الحالة نفسها والبيانات الاصطناعية نفسها عند التحقق. | مقارنة مباشرة بصور 1280/768/390 بعد إعادة التقاط الطرفين على حالة وfixture متطابقتين. |
| P2 | GAP-0036 | F-043 | SCR-002 | اختلاف كثافة قائمة العملاء ومرشحاتها | الحفاظ على ترتيب المرشحات وكثافة الجدول المرجعي مع سلوك هاتف مناسب. | تتطابق البنية والترتيب المرئي مع المرجع عند 1280 و768 و390 بكسل على الحالة والبيانات نفسها: الحفاظ على ترتيب المرشحات وكثافة الجدول المرجعي مع سلوك هاتف مناسب. | الرجوع إلى الحالة نفسها والبيانات الاصطناعية نفسها عند التحقق. | مقارنة مباشرة بصور 1280/768/390 بعد إعادة التقاط الطرفين على حالة وfixture متطابقتين. |
| P2 | GAP-0037 | F-019 | SCR-018 | اختلاف بنية قائمة الحاويات | عرض القائمة المختصرة وترتيب بيانات الحاويات كما في المرجع. | تتطابق البنية والترتيب المرئي مع المرجع عند 1280 و768 و390 بكسل على الحالة والبيانات نفسها: عرض القائمة المختصرة وترتيب بيانات الحاويات كما في المرجع. | الرجوع إلى الحالة نفسها والبيانات الاصطناعية نفسها عند التحقق. | مقارنة مباشرة بصور 1280/768/390 بعد إعادة التقاط الطرفين على حالة وfixture متطابقتين. |
| P2 | GAP-0038 | F-014 | SCR-014 | اختلاف مرشحات وأعمدة شاشة المنتجات | مطابقة كثافة جدول المنتجات ومرشحاته وأعمدته للمرجع عند المقاسات الثلاثة. | تتطابق البنية والترتيب المرئي مع المرجع عند 1280 و768 و390 بكسل على الحالة والبيانات نفسها: مطابقة كثافة جدول المنتجات ومرشحاته وأعمدته للمرجع عند المقاسات الثلاثة. | الرجوع إلى الحالة نفسها والبيانات الاصطناعية نفسها عند التحقق. | مقارنة مباشرة بصور 1280/768/390 بعد إعادة التقاط الطرفين على حالة وfixture متطابقتين. |
| P2 | GAP-0039 | F-027 | SCR-019 | اختلاف شبكة مركز التقارير | عرض بطاقات التقارير في شبكة وترتيب المرجع. | تتطابق البنية والترتيب المرئي مع المرجع عند 1280 و768 و390 بكسل على الحالة والبيانات نفسها: عرض بطاقات التقارير في شبكة وترتيب المرجع. | الرجوع إلى الحالة نفسها والبيانات الاصطناعية نفسها عند التحقق. | مقارنة مباشرة بصور 1280/768/390 بعد إعادة التقاط الطرفين على حالة وfixture متطابقتين. |
| P2 | GAP-0040 | F-011 | SCR-009 | اختلاف تسلسل لوحة التحصيل | عرض مؤشرات التحصيل ثم المستحقات والدفعات وفق المرجع. | تتطابق البنية والترتيب المرئي مع المرجع عند 1280 و768 و390 بكسل على الحالة والبيانات نفسها: عرض مؤشرات التحصيل ثم المستحقات والدفعات وفق المرجع. | الرجوع إلى الحالة نفسها والبيانات الاصطناعية نفسها عند التحقق. | مقارنة مباشرة بصور 1280/768/390 بعد إعادة التقاط الطرفين على حالة وfixture متطابقتين. |
| P2 | GAP-0041 | F-013 | SCR-010 | اختلاف مؤشرات وإجراءات أذونات التسليم | عرض شبكة المؤشرات وإجراءات المرجع مع حالة فراغ مدمجة. | تتطابق البنية والترتيب المرئي مع المرجع عند 1280 و768 و390 بكسل على الحالة والبيانات نفسها: عرض شبكة المؤشرات وإجراءات المرجع مع حالة فراغ مدمجة. | الرجوع إلى الحالة نفسها والبيانات الاصطناعية نفسها عند التحقق. | مقارنة مباشرة بصور 1280/768/390 بعد إعادة التقاط الطرفين على حالة وfixture متطابقتين. |
| P2 | GAP-0042 | Not mapped; see 05_FEATURE_GAP_MATRIX.csv. | SCR-011 | اختلاف توزيع نموذج إذن التسليم | توزيع الحقول في العمودين وعرض الأصناف حسب المرجع. | تتطابق البنية والترتيب المرئي مع المرجع عند 1280 و768 و390 بكسل على الحالة والبيانات نفسها: توزيع الحقول في العمودين وعرض الأصناف حسب المرجع. | الرجوع إلى الحالة نفسها والبيانات الاصطناعية نفسها عند التحقق. | مقارنة مباشرة بصور 1280/768/390 بعد إعادة التقاط الطرفين على حالة وfixture متطابقتين. |
| P2 | GAP-0043 | F-028 | SCR-023 | اختلاف قائمة المخازن ومرشحاتها | عرض قائمة المخازن المختصرة دون مساحة بحث وترتيب زائدة عن المرجع. | تتطابق البنية والترتيب المرئي مع المرجع عند 1280 و768 و390 بكسل على الحالة والبيانات نفسها: عرض قائمة المخازن المختصرة دون مساحة بحث وترتيب زائدة عن المرجع. | الرجوع إلى الحالة نفسها والبيانات الاصطناعية نفسها عند التحقق. | مقارنة مباشرة بصور 1280/768/390 بعد إعادة التقاط الطرفين على حالة وfixture متطابقتين. |
| P2 | GAP-0044 | F-044 | SCR-025 | حالة التقرير المالي لم تسمح بمقارنة صالحة | إظهار التقرير المالي المرجعي وحالاته على بيانات fixture موحدة. | لقطة مرجع ونظام ناجحتان على بيانات موحدة، مع نتيجة مصنفة ومسنودة بالأدلة. | حالة/fixture متطابقة أو إتاحة محتوى لوحة المرجع. | مقارنة مباشرة بصور 1280/768/390 بعد إعادة التقاط الطرفين على حالة وfixture متطابقتين. |
| P2 | GAP-0045 | راجع مصفوفة الميزات | SCR-026 | اختلاف بنية شاشة المحافظات | جدول مضغوط وإضافة قريبة من القائمة. | الترتيب والفراغ والإضافة تطابق المرجع بالمقاسات الثلاثة. | fixtures متطابقة ودور اختبار محدود؛ لا تستخدم بيانات إنتاجية. | إعادة مقارنة المقاسات الثلاثة ثم اختبار النقر/حالات الواجهة في بيئة fixture دون إرسال بيانات خارجية. |
| P2 | GAP-0046 | راجع مصفوفة الميزات | SCR-027 | اختلاف نموذج الرصيد الافتتاحي | نموذج افتتاحي مختصر. | الحقول المرجعية بالترتيب أو توثيق إضافات النظام. | fixtures متطابقة ودور اختبار محدود؛ لا تستخدم بيانات إنتاجية. | إعادة مقارنة المقاسات الثلاثة ثم اختبار النقر/حالات الواجهة في بيئة fixture دون إرسال بيانات خارجية. |
| P2 | GAP-0047 | F-041 | SCR-029 | اختلاف شاشة سلة المحذوفات | قائمة مضغوطة وإجراءاتها. | تطابق كثافة القائمة ومساحة الفراغ. | fixtures متطابقة ودور اختبار محدود؛ لا تستخدم بيانات إنتاجية. | إعادة مقارنة المقاسات الثلاثة ثم اختبار النقر/حالات الواجهة في بيئة fixture دون إرسال بيانات خارجية. |
| P2 | GAP-0048 | F-041 | SCR-032 | اختلاف شاشة سائقي الشحن | سجل السائقين وإجراءات مضمنة. | السجل والإجراءات في مواضع المرجع. | fixtures متطابقة ودور اختبار محدود؛ لا تستخدم بيانات إنتاجية. | إعادة مقارنة المقاسات الثلاثة ثم اختبار النقر/حالات الواجهة في بيئة fixture دون إرسال بيانات خارجية. |
| P2 | GAP-0049 | F-041 | SCR-033 | اختلاف سجل العمليات | مرشحات وسجل جدولي. | ترتيب المرشحات والأعمدة مثل المرجع. | fixtures متطابقة ودور اختبار محدود؛ لا تستخدم بيانات إنتاجية. | إعادة مقارنة المقاسات الثلاثة ثم اختبار النقر/حالات الواجهة في بيئة fixture دون إرسال بيانات خارجية. |
| P2 | GAP-0050 | F-018 | SCR-051 | اختلاف شاشة مرتجعات المخازن | سجل مرتجعات مع اعتماد/كمية. | أعمدة السجل وإجراءاته حسب المرجع. | fixtures متطابقة ودور اختبار محدود؛ لا تستخدم بيانات إنتاجية. | إعادة مقارنة المقاسات الثلاثة ثم اختبار النقر/حالات الواجهة في بيئة fixture دون إرسال بيانات خارجية. |
| P2 | GAP-0051 | راجع مصفوفة الميزات | SCR-052 | اختلاف شاشة أموال الحاويات | نموذج حركة عمودان وسجل حركة. | تخطيط قريب من المرجع؛ لا يشترط حفظ في مقارنة الشكل. | fixtures متطابقة ودور اختبار محدود؛ لا تستخدم بيانات إنتاجية. | إعادة مقارنة المقاسات الثلاثة ثم اختبار النقر/حالات الواجهة في بيئة fixture دون إرسال بيانات خارجية. |
| P2 | GAP-0052 | F-018 | SCR-061 | اختلاف شاشة الحد الأدنى للمخزون | تنبيه وجدول حدود منتجات. | الجدول/حالة الفراغ مثل المرجع. | fixtures متطابقة ودور اختبار محدود؛ لا تستخدم بيانات إنتاجية. | إعادة مقارنة المقاسات الثلاثة ثم اختبار النقر/حالات الواجهة في بيئة fixture دون إرسال بيانات خارجية. |
| P2 | GAP-0053 | F-018 | SCR-062 | اختلاف شاشة الجرد الدوري | قائمة كمية النظام/الفعلي/الفارق وإجراء إنهاء. | الكميات والفارق وسجل الجلسة في التسلسل المرجعي. | fixtures متطابقة ودور اختبار محدود؛ لا تستخدم بيانات إنتاجية. | إعادة مقارنة المقاسات الثلاثة ثم اختبار النقر/حالات الواجهة في بيئة fixture دون إرسال بيانات خارجية. |
| P2 | GAP-0054 | راجع مصفوفة الميزات | SCR-060 | قائمة تتبع الحاويات لا تعرض تسلسل المرجع | مراحل وحالة وETA/تأخير وإجراء المرحلة التالية. | تظهر المرحلة التالية والموعد وتفتح التفاصيل الصحيحة. | fixtures متطابقة ودور اختبار محدود؛ لا تستخدم بيانات إنتاجية. | إعادة مقارنة المقاسات الثلاثة ثم اختبار النقر/حالات الواجهة في بيئة fixture دون إرسال بيانات خارجية. |
| P2 | GAP-0055 | F-014 | SCR-064 | اختلاف شاشة سجل تكلفة المنتج | سجل تاريخ شراء/صنف/حاوية وتغيرات. | نقرة رابط المنتج تفتح سجلًا بهيكل المرجع. | fixtures متطابقة ودور اختبار محدود؛ لا تستخدم بيانات إنتاجية. | إعادة مقارنة المقاسات الثلاثة ثم اختبار النقر/حالات الواجهة في بيئة fixture دون إرسال بيانات خارجية. |
| P2 | GAP-0057 | F-041 | SCR-067 | اختلاف شاشة تثبيت التطبيق | خطوات وحالات تثبيت لكل منصة. | حالات التثبيت تتبع PWA الفعلية وتطابق المرجع. | fixtures متطابقة ودور اختبار محدود؛ لا تستخدم بيانات إنتاجية. | إعادة مقارنة المقاسات الثلاثة ثم اختبار النقر/حالات الواجهة في بيئة fixture دون إرسال بيانات خارجية. |
| P2 | GAP-0058 | F-018 | SCR-028 | مطابقة مسار المخزون المرتجع غير محسومة | لوحة sec-stock-ret تعرض تاريخًا ومنتجًا ومخزنًا وكمية ومرجعًا. | قرار يوضح إن كان لكل لوحة route مستقل ثم تُعاد المقارنة. | fixtures متطابقة ودور اختبار محدود؛ حسم علاقة SCR-028 وSCR-051. | إعادة مقارنة المقاسات الثلاثة ثم اختبار النقر/حالات الواجهة في بيئة fixture دون إرسال بيانات خارجية. |
| P2 | GAP-0059 | F-022 | SCR-050 | اختلاف شاشة نقل الحاويات بين المواقع | نموذج داخل بطاقة من عمودين. | تجميع الحقول والمسافات حسب المرجع. | fixtures متطابقة ودور اختبار محدود؛ لا تستخدم بيانات إنتاجية. | إعادة مقارنة المقاسات الثلاثة ثم اختبار النقر/حالات الواجهة في بيئة fixture دون إرسال بيانات خارجية. |
| P2 | GAP-0060 | راجع مصفوفة الميزات | SCR-050 | تنقل لوحة نقل الحاويات في المرجع لا يثبت فتح هدفه | النقرة كان يجب أن تفعّل sec-transfers. | نقرة مرئية تفتح sec-transfers أو alias واضح. | fixtures متطابقة ودور اختبار محدود؛ لا تستخدم بيانات إنتاجية. | إعادة مقارنة المقاسات الثلاثة ثم اختبار النقر/حالات الواجهة في بيئة fixture دون إرسال بيانات خارجية. |
| P2 | GAP-0061 | F-016 | SCR-015 | اختلاف ملخص المخزون ومرشحاته | إبراز ملخص المخزون وبنيته المختصرة كما في المرجع. | تتطابق البنية والترتيب المرئي مع المرجع عند 1280 و768 و390 بكسل على الحالة والبيانات نفسها: إبراز ملخص المخزون وبنيته المختصرة كما في المرجع. | الرجوع إلى الحالة نفسها والبيانات الاصطناعية نفسها عند التحقق. | مقارنة مباشرة بصور 1280/768/390 بعد إعادة التقاط الطرفين على حالة وfixture متطابقتين. |
| P2 | GAP-0062 | F-017 | SCR-016 | اختلاف سجل حركات المخزون | إبراز حالات الحركة وسجلها بكثافة وترتيب المرجع. | تتطابق البنية والترتيب المرئي مع المرجع عند 1280 و768 و390 بكسل على الحالة والبيانات نفسها: إبراز حالات الحركة وسجلها بكثافة وترتيب المرجع. | الرجوع إلى الحالة نفسها والبيانات الاصطناعية نفسها عند التحقق. | مقارنة مباشرة بصور 1280/768/390 بعد إعادة التقاط الطرفين على حالة وfixture متطابقتين. |
| P2 | GAP-0063 | Not mapped; see 05_FEATURE_GAP_MATRIX.csv. | SCR-024 | اختلاف شاشة تقرير المخزون | عرض المؤشرات والملخص والجدول كما في مرجع التقرير. | تتطابق البنية والترتيب المرئي مع المرجع عند 1280 و768 و390 بكسل على الحالة والبيانات نفسها: عرض المؤشرات والملخص والجدول كما في مرجع التقرير. | الرجوع إلى الحالة نفسها والبيانات الاصطناعية نفسها عند التحقق. | مقارنة مباشرة بصور 1280/768/390 بعد إعادة التقاط الطرفين على حالة وfixture متطابقتين. |
| P2 | GAP-0064 | F-021 | SCR-021 | اختلاف شاشة تقرير الأرباح والخسائر | عرض المؤشرات ومخططات التحليل المرجعية بعد توحيد بيانات التقرير. | تتطابق البنية والترتيب المرئي مع المرجع عند 1280 و768 و390 بكسل على الحالة والبيانات نفسها: عرض المؤشرات ومخططات التحليل المرجعية بعد توحيد بيانات التقرير. | الرجوع إلى الحالة نفسها والبيانات الاصطناعية نفسها عند التحقق. | مقارنة مباشرة بصور 1280/768/390 بعد إعادة التقاط الطرفين على حالة وfixture متطابقتين. |
| P2 | GAP-0065 | F-020 | SCR-020 | اختلاف شاشة تقرير المبيعات | جمع المرشحات والمؤشرات والمخطط والجداول في ترتيب المرجع. | تتطابق البنية والترتيب المرئي مع المرجع عند 1280 و768 و390 بكسل على الحالة والبيانات نفسها: جمع المرشحات والمؤشرات والمخطط والجداول في ترتيب المرجع. | الرجوع إلى الحالة نفسها والبيانات الاصطناعية نفسها عند التحقق. | مقارنة مباشرة بصور 1280/768/390 بعد إعادة التقاط الطرفين على حالة وfixture متطابقتين. |
| P2 | GAP-0066 | Not mapped; see 05_FEATURE_GAP_MATRIX.csv. | SCR-013 | اختلاف ترتيب نموذج إنشاء مرتجع المبيعات | عرض مصدر المرتجع والعميل والبنود وتوزيع النموذج حسب المرجع. | تتطابق البنية والترتيب المرئي مع المرجع عند 1280 و768 و390 بكسل على الحالة والبيانات نفسها: عرض مصدر المرتجع والعميل والبنود وتوزيع النموذج حسب المرجع. | الرجوع إلى الحالة نفسها والبيانات الاصطناعية نفسها عند التحقق. | مقارنة مباشرة بصور 1280/768/390 بعد إعادة التقاط الطرفين على حالة وfixture متطابقتين. |
| P2 | GAP-0067 | F-041 | SCR-022 | اختلاف شاشة المستخدمين والصلاحيات | عرض قائمة المستخدمين والصلاحيات وفق مرجع التصميم. | تتطابق البنية والترتيب المرئي مع المرجع عند 1280 و768 و390 بكسل على الحالة والبيانات نفسها: عرض قائمة المستخدمين والصلاحيات وفق مرجع التصميم. | الرجوع إلى الحالة نفسها والبيانات الاصطناعية نفسها عند التحقق. | مقارنة مباشرة بصور 1280/768/390 بعد إعادة التقاط الطرفين على حالة وfixture متطابقتين. |
| P2 | GAP-0068 | Not mapped; see 05_FEATURE_GAP_MATRIX.csv. | SCR-008 | اختلاف مواضع عناصر معاينة الطباعة | مطابقة توزيع بيانات المستند والورقة والعلامة المائية ببيانات الفاتورة نفسها. | لقطة مرجع ونظام ناجحتان على بيانات موحدة، مع نتيجة مصنفة ومسنودة بالأدلة. | حالة/fixture متطابقة أو إتاحة محتوى لوحة المرجع. | مقارنة مباشرة بصور 1280/768/390 بعد إعادة التقاط الطرفين على حالة وfixture متطابقتين. |
| P2 | GAP-0069 | Not mapped; see 05_FEATURE_GAP_MATRIX.csv. | SCR-007 | اختلاف موضع وحجم نافذة البحث الشامل | فتح البحث كقائمة ضيقة متصلة بالشريط العلوي وفق المرجع. | تتطابق البنية والترتيب المرئي مع المرجع عند 1280 و768 و390 بكسل على الحالة والبيانات نفسها: فتح البحث كقائمة ضيقة متصلة بالشريط العلوي وفق المرجع. | الرجوع إلى الحالة نفسها والبيانات الاصطناعية نفسها عند التحقق. | مقارنة مباشرة بصور 1280/768/390 بعد إعادة التقاط الطرفين على حالة وfixture متطابقتين. |
| P2 | GAP-0070 | F-009 | SCR-005 | تفاصيل الطلب لم تصل إلى حالة قابلة للمقارنة | عرض تفاصيل الطلب المعتمد وحالته وبنوده كما في مرجع الشاشة. | لقطة مرجع ونظام ناجحتان على بيانات موحدة، مع نتيجة مصنفة ومسنودة بالأدلة. | حالة/fixture متطابقة أو إتاحة محتوى لوحة المرجع. | مقارنة مباشرة بصور 1280/768/390 بعد إعادة التقاط الطرفين على حالة وfixture متطابقتين. |
| P2 | GAP-0071 | Not mapped; see 05_FEATURE_GAP_MATRIX.csv. | SCR-007 | محتوى لوحة الإشعارات لم يقارن ببيانات موحدة | مطابقة محتوى الإشعارات وارتفاع اللوحة بعد توفير نفس fixture في الطرفين. | لقطة مرجع ونظام ناجحتان على بيانات موحدة، مع نتيجة مصنفة ومسنودة بالأدلة. | حالة/fixture متطابقة أو إتاحة محتوى لوحة المرجع. | مقارنة مباشرة بصور 1280/768/390 بعد إعادة التقاط الطرفين على حالة وfixture متطابقتين. |
| P2 | GAP-0072 | F-010 | SCR-031 | اختلاف تكوين تفاصيل الفاتورة | عرض بيانات الفاتورة ثم بنودها وجدول المدفوعات المرتبطة والمخزن، مع ترتيب إجراءات المرجع. | على البيانات نفسها تظهر بيانات الفاتورة وسطر الصنف والمدفوعات والمخزن بالترتيب المرجعي عند 1280 و768 و390، وتعرض حالة مستند واحدة متسقة مع مصدرها. | fixture موحد لحالة الفاتورة وبنودها ومدفوعاتها ومخزنها. | إعادة فتح الفاتورة بالنقر من القائمة والتقاط المقاسات الثلاثة على fixture موحد؛ تحقق من الاستجابة الفعلية للبيانات دون اعتماد Toast وحده. |
| P2 | GAP-0073 | F-016 | SCR-053 | تفاصيل حركة المخزون لا تفتح من السجل | اختيار مرجع الحركة يفتح شاشة تفاصيل تعرض المرجع المرتبط ونوع الحركة والصنف والمخزن والكمية والتاريخ. | من أي صف ذي مرجع يمكن فتح صفحة التفاصيل بالنقر والكيبورد في desktop/mobile، وتعرض بيانات الحركة الصحيحة، ويمكن الرجوع للقائمة دون فقد المرشحات. | تحديد معرف الحركة والوجهة من API قبل التنفيذ. | تحقق من عناصر DOM ثم اختبر النقر والكيبورد عند 1280 و768 و390 على بيانات اصطناعية؛ تحقق من تفاصيل الصف المعروض. |
| P3 | GAP-0023 | F-001–F-044 | كل الشاشات | فرق token الخط الأساسي | توافق المقاس المحسوب مع التصميم المعتمد. | مقاس المصدر المعتمد متحقق على عناصر نموذجية. | حسم إصدار الواجهة المعتمد. | browser computed style ولقطات عند viewport ثابت. |
| P3 | GAP-0024 | F-001–F-044 | كل الشاشات الرئيسية | عرض الشريط الجانبي مختلف | عرض يطابق مصدر التصميم المعتمد. | computed width يطابق القيمة المعتمدة على desktop. | اعتماد 240 أم 248 كقيمة نهائية. | لقطة متطابقة وقياس DOM بعد render. |
| P3 | GAP-0025 | F-001–F-044 | كل الشاشات الرئيسية | ارتفاع الشريط العلوي مختلف | تطابق ارتفاع الرأس مع design baseline المعتمد. | الارتفاع المحسوب يطابق المرجع النهائي ولا يقص محتوى. | اعتماد baseline النهائي. | تصوير DOM عند viewport نفسه. |
| P3 | GAP-0026 | F-001–F-044 | كل البطاقات والأزرار والمودالات | سلم radius مختلف | زوايا المكونات توافق قيم design baseline. | computed radius للمكونات النموذجية يطابق المرجع المعتمد. | اعتماد مصدر القيم. | browser computed style وصور للمكونات عند حالة ثابتة. |

<a id="13-unverified-items-and-limitations"></a>

# 13 — العناصر غير المتحققة والقيود

## المرجع والصور

- جرد المرجع 68 لوحة ودخول. ظهرت 67/68 لوحة في Chromium؛ sec-liq غائبة من DOM.
- توجد 156 سجلات مقارنة مصورة و50/69 معرف شاشة ذات زوج واحد على الأقل. بقيت 19 لوحة بلا زوج مباشر؛ كل لوحة وسياقها ودليلها في docs/ux-inventory/SCREEN_PAIR_BLOCKERS.csv.
- 20/35 هدف تنقل فُعّلت بالنقر عند المقاسات الثلاثة (60 لقطة). 15 هدفًا/45 محاولة لم تثبت التفعيل: 13 لوحة مالية nested، نقل الحاويات، وملاحظاتي المحمية بـPIN.
- المرجع فتح تفاصيل العميل والفاتورة والحركة 9/9 نقرات عند المقاسات الثلاثة. النظام فتح العميل والفاتورة 6/6؛ تفاصيل الحركة غير متاحة في واجهة النظام. تبويبات العميل وفتح/إلغاء نافذتي الدفع والمرتجع اختبرت دون حفظ.

## التفاعل والحالات

- جرد 592 عنصرًا تفاعليًا؛ 68/68 تحقق UI مسجلًا في INTERACTION_REVIEW.json، لكنه لا يقابل عناصر ELM واحدًا بواحد. 13/592 تفاعلًا لها نتيجة فعلية في الجولة الأخيرة؛ بقية العناصر لا تُعد PASS.
- مرجع التفاعل الأولي: 13/67 لوحة ذات نقرة ونتيجة مؤكدة، و140 عنصرًا تخطى الاختبار لها لكونها مخفية أو غير مأمونة أو غير واضحة السلامة؛ الجولة الأحدث فتحت 20/35 هدفًا مختلفًا موثقًا.
- فُحصت حقول دخول فارغة ونموذج طلب فارغ، والبحث والإشعارات والثيم والتنقل في React/MSW. بقيت معظم حالات hover/focus/disabled/loading/error/empty لكل عنصر، وcontrast وTab/focus trap وقارئ الشاشة، غير متحققة.

## البيانات والتدفقات

- React يعمل في اختبار Vite/MSW بمالك اصطناعي. لا جلسة حقيقية ولا قراءة DB. 0/10 تدفقات end-to-end فعلية على backend/DB.
- لم تُرسل عمليات حفظ/حذف/اعتماد/تحصيل/نقل أو رسائل خارجية.
- صور الشاشات المالية المرشحة لا تثبت parity لأن محتوى المرجع غير متاح بالدور الحالي؛ 32/33 لقطة route مالية للنظام موجودة، والصورة المالية عند 390 ناقصة.

## حالات غير محسومة

- SCR-005 وSCR-025: انتظار/خطأ؛ يلزم فتح صفحة ناجحة بfixture مطابق.
- إشعارات SCR-007: تختلف fixtures؛ يلزم توحيد المحتوى.
- SCR-028: يلزم حسم علاقته بـSCR-051 و/warehouse-returns.
- SCR-050: النقرة المرجعية انتهت بمهلة.
- SCR-034–SCR-049 وSCR-054: لوحات مالية لها مسارات مرشحة لكن لم تُفتح عبر عناصر مرئية بالدور المتاح؛ `#fin-sub` غير موجود في DOM المهيأ. SCR-055: sec-liq غير موجودة في DOM المهيأ.
- SCR-068: يحتاج دورًا مخولًا لفتح اللوحة؛ لم يتم إدخال PIN أو تجاوز الحماية.
- الشاشات غير المقارنة بالتفصيل في SCREEN_PAIR_BLOCKERS.csv؛ السبب محدد لكل Screen ID.

## المطلوب لإغلاق هذه البنود

إتاحة حالة مرجعية تعرض اللوحات المحجوبة، وfixture موحد فارغ/معبأ، ثم استكمال اختبار كل عنصر تفاعلي وحالة آمنة وتدفق كامل في بيئة معزولة.

<a id="14-coverage-and-completeness-report"></a>

# 14 — تقرير التغطية والاكتمال

هذا التقرير يقيس الفحص فقط؛ لا يقيس اكتمال تنفيذ النظام.

## المقامات

- الشاشات: 68 لوحة + دخول = 69 Screen IDs.
- عرض المرجع: 67/68 لوحة؛ sec-liq لم تظهر.
- أزواج viewport الممكنة للفهرس: 69 × 3 = 207 (1280 و768 و390).
- العناصر التفاعلية المفهرسة: 592.
- الميزات: 44.
- الرحلات الكبرى: 10.

## مقارنة الصور

| المقياس | البسط / المقام | النسبة | التفسير |
|---|---:|---:|---|
| معرفات الشاشة ذات زوج واحد على الأقل | 50/69 | 72.5% | 49 لوحة والدخول. |
| معرفات ذات نتيجة مؤكدة واحدة على الأقل | 47/69 | 68.1% | وجود نتيجة مؤكدة لا يعني خلو الشاشة من حالات غير متحققة. |
| معرفات Screen × viewport ذات زوج صور | 150/207 | 72.5% | 156 سجل مقارنة يتضمن تكرار حالات لبعض المعرفات؛ هناك 19 شاشات بلا زوج مباشر. |
| نتائج مقارنة حاسمة | 144/156 | 92.3% | تشمل فرقًا مرئيًا أو شاشة/ميزة غائبة أو placeholder. |
| حالات مقارنة غير محسومة | 12/156 | 7.7% | 6 حالة/بيانات، 3 fixture mismatch، 3 route mapping. |
| أهداف تنقل المرجع التي فُعّلت | 20/35 أهداف | 57.1% | 20 هدفًا فُعّل في 3 مقاسات؛ 15 بقيت محجوبة. |

## اختبار التفاعل والرحلات

| المقياس | البسط / المقام | النسبة | التفسير |
|---|---:|---:|---|
| تحقق UI مسجل في React/MSW | 68/68 | 100% لهذه الفحوص | لا يمثل العناصر المفهرسة واحدًا بواحد ولا اتصال backend. |
| العناصر ذات تفاعل فردي موثق في هذه الجولة | 13/592 | 2.2% | بقية الجرد لم يُختبر بالنقر الفردي؛ راجع 03_INTERACTIVE_ELEMENT_INVENTORY.csv. |
| تفاعل العناصر الجديدة في هذه الجولة | 13/35 | 37.1% | 35 عنصرًا جديدًا موثقًا؛ 13 تم النقر عليها/فتحها بأمان. باقي الأزرار والحقول غير مختبرة. |
| فتح تفاصيل المرجع من صفوف (عميل/فاتورة/حركة) | 9/9 | 100% | actual clicks at 1280/768/390; read-only fixture. |
| فتح تفاصيل النظام من صفوف العميل/الفاتورة | 6/6 | 100% لهذه الوجهات | movement detail is missing; movement list rows are not interactive. |
| رحلات end-to-end على backend/DB | 0/10 | 0% | لم تُختبر عملية محفوظة كاملة على backend/DB. |

## حالة الميزات والفجوات

- 44 ميزة: 19 NOT_VERIFIED، 11 PARTIALLY_IMPLEMENTED، 3 UI_ONLY، 11 MISSING.
- 73 Gap IDs: P0=0، P1=7، P2=62، P3=4.
- result rows: visual diff=120؛ missing feature=3؛ missing screen=15؛ UI placeholder=6؛ unresolved=12.

## الحالة النهائية

التدقيق غير مكتمل: 19 شاشة بلا زوج مباشر، و592 عنصرًا في الجرد؛ تم اختبار 13 من عناصر هذه الجولة بالنقر الآمن. بقيت معظم العناصر الأخرى وحالاتها دون تفاعل فردي، و0/10 رحلة backend/DB مكتملة.

<a id="latest-runtime-evidence-2026-10-29"></a>

# أحدث أدلة التشغيل — 2026-10-29

- Visual pair review: 156 screenshot records; 150/207 unique screen×viewport pairs; 50/69 screens represented; 12 pair rows remain unresolved.
- Reference detail clicks: customer, invoice, movement opened 9/9 across 1280/768/390; system customer/invoice detail opened 6/6. Movement detail has no system row control or detail route.
- Customer file: four tabs changed visible content in all three reference viewports. Invoice and movement back controls returned to their previous panels; payment and return dialogs were opened and canceled without saving.
- UI/MSW checks: 68/68; these are separate from 592 indexed interactive elements. undefined/35 newly documented detail elements were individually exercised; other controls and all save/delete/print/API/DB flows remain untested.
- 19 screens have no direct reference/system pair; reasons are listed in SCREEN_PAIR_BLOCKERS.csv.
- Backend/database end-to-end flows: 0/10. No application source, backend, or database was modified.

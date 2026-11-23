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

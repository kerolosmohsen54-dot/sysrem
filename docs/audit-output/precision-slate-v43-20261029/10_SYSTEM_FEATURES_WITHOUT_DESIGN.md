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

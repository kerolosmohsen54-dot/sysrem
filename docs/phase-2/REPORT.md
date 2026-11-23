# تقرير المرحلة 2 — طلبات البيع والفواتير والمرتجعات

**الحالة:** فجوات المرحلة الإحدى عشرة منفذة ومتحقق منها على باك Laravel وقاعدة MariaDB `erp_acceptance_tests` ببيانات acceptance fixtures. لا تشمل هذه المرحلة GAP-0056 الملغاة.

## حالة الفجوات

| الفجوة | الحالة | التنفيذ والتحقق |
|---|---|---|
| GAP-0001 | PASS | تأكيد الطلب يحجز المتاح تحت transaction و`lockForUpdate`. الإلغاء يحرر الحجز، والتحويل لفاتورة يخصم من المخزون ويستهلك الحجز. سجل الحجز وتوزيعه على المخازن محفوظان، ومفتاح دورة الحجز يمنع التكرار. تحقق Playwright من إلغاء طلب ثم قبول طلب آخر بالكمية نفسها، ثم خصمها عند الفوترة. |
| GAP-0030 | PASS | نموذج الطلب يحفظ المندوب وطريقة الدفع والمخزن والعملة وملخص الإجماليات وبنود الطلب في قاعدة البيانات؛ تظل العملة EGP إلى أن تتوفر أسعار صرف معتمدة. |
| GAP-0032 | PASS | قائمة الطلبات موصولة بالـAPI مع البحث والفلاتر والترتيب والترقيم، ورابط إذن التسليم بجوار الطلب المؤهل. |
| GAP-0070 | PASS | تفاصيل الطلب تعرض بياناته وحجوزه وتوفر التأكيد والإلغاء والتحويل والطباعة. كل إجراء يرسل إلى API، والطباعة تسجل عدادها وتاريخها. |
| GAP-0033 | PASS | قائمة الفواتير تعرض ملخص المستحقات وبطاقات المُصدرين والفلاتر والبحث والترتيب والترقيم من بيانات API. |
| GAP-0034 | PASS | نموذج الإنشاء يحفظ المسودة أو يصدر الفاتورة مع العميل والمُصدر وشروط الدفع والمخزن والأصناف والإجماليات التي يحسبها الخادم. |
| GAP-0072 | PASS | التفاصيل والتعديل ينشئان إصداراً جديداً مع سجل مراجعة؛ الطباعة من بيانات الفاتورة الفعلية وتسجل `printed_at` و`print_count`. |
| GAP-0068 | PASS | معاينات طباعة الطلب والفاتورة والمرتجع تعرض بيانات المستند الحقيقية وتستخدم إجراء تسجيل الطباعة في الخادم. |
| GAP-0035 | PASS | شاشة المرتجعات تعرض قائمة API وحالة فارغة قابلة للاستخدام ورابط نموذج الإنشاء المستقل. |
| GAP-0066 | PASS | النموذج المرتبط يتحقق من الكمية مقابل المبيع ناقص المرتجعات السابقة في الواجهة والخادم، ولا يسمح بالحفظ قبل معاينة سليمة. |
| GAP-0004 | PASS | إنشاء المرتجع يفتح النموذج المستقل. المرتجع المرتبط يحفظ مرجع الفاتورة، والحر يتطلب سبباً وصلاحية مخصصة، وكلاهما يحفظ ويطبع من سجل قاعدة البيانات. |

## تغييرات التنفيذ

- أضيفت migrationان إضافيتان فقط: `2026_10_30_000001_create_sales_order_reservations` لسجل الحجز وتوزيعه، و`2026_10_30_000002_add_sales_order_details_and_return_processing` لحقول الطلب والإجماليات والطباعة ونوع المرتجع. تحققت حالة MariaDB من أن كليهما `Ran`. لا تحذف migrations البيانات عند rollback.
- طبقة الباك تشمل نماذج الطلب والحجز والمستند، خدمات الحجز والمبيعات، سياسات الطلبات والحجوزات، validation ومسارات API وسجل التدقيق. إجراءات المخزون والمرتجع تمر بمعاملات قاعدة البيانات؛ الطلبات المتكررة تُعاد بنتيجتها دون تكرار الأثر.
- الفرونت يقرأ ويكتب عبر API الفعلي، وفيه حالات التحميل والخطأ وإعادة المحاولة والحالة الفارغة، وتسميات RTL مع القيم المناسبة لـLTR.
- أضيفت acceptance seeder مخصصة لقاعدة `erp_acceptance_tests`. لم تُضف مكتبة جديدة.

## الاختبارات ونتائج التشغيل

| النوع | الأمر / التدفق | النتيجة |
|---|---|---|
| Backend unit | `php vendor/phpunit/phpunit/phpunit --no-configuration --bootstrap vendor/autoload.php tests/Unit/OrderReservationAllocatorTest.php` | PASS — اختباران، 4 assertions. |
| Backend feature | `php vendor/phpunit/phpunit/phpunit --no-configuration --bootstrap vendor/autoload.php --filter SalesWorkflowEngineTest tests/Feature/SalesWorkflowEngineTest.php` مع `AUTH_TEST_CONNECTION=mariadb_test` و`DB_MARIADB_TEST_DATABASE=erp_test` وبيانات اتصال MariaDB المحلية | PASS — 27 اختباراً، 182 assertions. |
| Frontend components | `npx vitest run tests/integration/orders-deliveries.test.tsx tests/integration/return-form.test.tsx tests/integration/returns-page.test.tsx tests/integration/invoice-form.test.tsx tests/integration/invoice-list.test.tsx tests/integration/invoice-edit.test.tsx tests/integration/invoice-print.test.tsx --pool=threads --maxWorkers=1 --minWorkers=1 --fileParallelism=false --reporter=dot` | PASS — 7 ملفات، 23 اختباراً. |
| Frontend types | `npm run typecheck` | PASS — `tsc --noEmit`, exit 0. |
| Playwright الطلبات | `npm run test:e2e:reservations -- --grep 'real order creation'` على Laravel وMariaDB وChromium | PASS — الإنشاء، الحجز، الإلغاء والتحرير، إعادة الحجز، الفوترة والاستهلاك، رابط إذن التسليم والطباعة. |
| Playwright المرتجعات | `npm run test:e2e:reservations -- --grep 'linked and free returns'` على Laravel وMariaDB وChromium | PASS — تجاوز الكمية مرفوض، المرتجع المرتبط والحر بسبب محفوظان، والطباعة تسجل الأثر. |
| Playwright الفواتير | `npm run test:e2e:reservations -- --grep 'invoice create, list filters'` على Laravel وMariaDB وChromium | PASS — المسودة، الترحيل، المراجعة، الفلاتر، التفاصيل والمعاينة، وتسجيل الطباعة. |
| Migrations | `php artisan migrate:status --database=mariadb` على `erp_acceptance_tests` | PASS — migrationان المرحلة بحالة `Ran`. |

جرت محاولة تشغيل مجموعة Vitest كاملة بعامل واحد، لكنها توقفت بسبب `FATAL ERROR: Zone Allocation failed - process out of memory`. اختبارات مكونات تدفقات المبيعات السبعة أعلاه اكتملت بنجاح؛ فشل مورد التشغيل لا يغير نتائجها.

## تحقق قاعدة البيانات الفعلية

بعد تشغيل تدفقات Playwright، قُرئت النتائج مباشرة من MariaDB `erp_acceptance_tests`:

- سجلات الحجز: 8 محررة بإجمالي 16 وحدة، و6 مستهلكة بإجمالي 14 وحدة. فحص التدفق نفسه أكد أن الطلب الذي أُلغي أعاد `quantity_reserved` إلى صفر، وأن فاتورة الطلب البديل خفضت `quantity_on_hand` بمقدار وحدتين وأعادت المحجوز إلى صفر.
- مستندات المرتجع ذات النوع المسجل: مرتجعان مرتبطان ومرتجع حر واحد. استجابة API وسجل الفاتورة المصدر أثبتا الكميات المتبقية والسبب الحر.
- أحدث فاتورة acceptance هي `INV-2026-153` بحالة `posted` وإجمالي `25.0000`، وسجل قاعدة البيانات يحتوي `print_count=1` و`printed_at`.
- قاعدة القبول تحتفظ أيضاً بصف حجز واحد بحالة `reserved` لطلب acceptance آخر مؤكد. لم أعدّل هذا السجل القائم؛ مسار الطلب الذي اختبره Playwright تحقق من التحرير والاستهلاك على سجلاته الخاصة.

## لقطات الشاشة

المجلد: [`docs/phase-2/screenshots/`](screenshots/)

- الطلبات: `orders-filtered-list.png`, `order-reservation-held.png`, `order-reservation-released.png`, `order-invoiced-and-consumed.png`, `order-print-preview.png`.
- الفواتير: `invoice-create-form.png`, `invoice-draft-details.png`, `invoice-list-filtered.png`, `invoice-revision-form.png`, `invoice-revised-details.png`, `invoice-print-preview.png`.
- المرتجعات: `return-linked-over-quantity-blocked.png`, `return-linked-form-preview.png`, `return-linked-print.png`, `return-free-form.png`, `return-free-print.png`.

## الملفات ضمن نطاق المرحلة

- قاعدة البيانات والباك: migrationان المبيّنتان أعلاه؛ `SalesOrder`, `SalesOrderLine`, `SalesOrderReservation`, `SalesOrderReservationAllocation`, `SalesDocument`; `OrderReservationService`, `OrdersService`, `SalesService`; `OrdersController`, `SalesController`; `SalesOrderPolicy`, `SalesOrderReservationPolicy`, ومسارات API.
- بيانات واختبارات الباك: `SalesWorkflowAcceptanceSeeder.php`, `OrderReservationAllocatorTest.php`, `SalesWorkflowEngineTest.php`.
- الواجهة واختباراتها: صفحات الطلبات والفواتير والمرتجعات والطباعة وواجهات API والترجمة العربية، واختبارات المكونات السبعة في الجدول، وملفات `frontend/e2e/sales-orders.spec.ts`, `sales-returns.spec.ts`, `sales-z-invoices.spec.ts`.
- القرارات المعتمدة موثقة في [`docs/DECISIONS.md`](../DECISIONS.md).

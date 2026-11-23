# المرحلة 1 — GAP-0001: حجز مخزون الطلب

**الحالة: COMPLETE**

اكتمل تدفق الحجز على الباك الحقيقي وMariaDB محليًا باستخدام بيانات fixture مخصصة. فحص GAP-0001 يطلب حجزًا محفوظًا واحدًا، عرضه بوضوح، عدم تجاوز المتاح، وتحريره عند الإلغاء أو التحويل. نفّذت التدفق واختبرت نتائجه عبر API ثم تحققت من الصفوف النهائية في قاعدة البيانات. GAP-0056 ملغاة ولم تُنفذ.

## التنفيذ

- Migration إضافية للأمام أنشأت `sales_order_reservations` و`sales_order_reservation_allocations` مع مفاتيح خارجية وفهارس وقيد يمنع تكرار دورة الحجز للسطر والمخزن.
- `OrderReservationAllocator` يحسب المتاح كـ `quantity_on_hand - quantity_reserved` ويقسم الكمية على المخازن؛ `OrderReservationService` ينفذ الحجز والتحرير والاستهلاك بمعاملة وقفل `lockForUpdate` ويسجل التغييرات في سجل التدقيق.
- التأكيد المتكرر لا ينشئ حجزًا ثانيًا. الإلغاء يحرر الحجز. الفوترة تخصم الكمية المحجوزة من on-hand وتحرر reserved في المعاملة نفسها. الإلغاء اللاحق للفاتورة يعيد حجز دورة جديدة.
- عمليات التأكيد والإلغاء والفوترة محمية بـPolicy وصلاحيات الخادم. إصدار الطلب يتحقق من المخزون المتاح حتى لا تتجاوز العمليات الأخرى الكمية المحجوزة.
- شاشة تفاصيل الطلب تعرض سجل الحجوزات ومخزن كل تخصيص وحالته، مع حالة فارغة. البيانات تأتي من API Laravel؛ MSW مستخدم في الاختبارات فقط.

## الملفات

- **Backend:** `backend/database/migrations/2026_10_30_000001_create_sales_order_reservations.php`؛ `backend/app/Models/SalesOrderLine.php` و`SalesOrderReservation.php` و`SalesOrderReservationAllocation.php`؛ `backend/app/Policies/SalesOrderReservationPolicy.php`؛ `backend/app/Providers/AppServiceProvider.php`؛ `backend/app/Services/OrderReservationService.php` و`OrdersService.php` و`SalesService.php` و`InventoryService.php`؛ `backend/app/Support/OrderReservationAllocator.php` و`InsufficientOrderStock.php`؛ `backend/app/Http/Controllers/OrdersController.php`؛ `backend/database/seeders/OrderReservationAcceptanceSeeder.php`؛ `backend/tests/Feature/SalesWorkflowEngineTest.php`؛ `backend/tests/Unit/OrderReservationAllocatorTest.php`.
- **Frontend:** `frontend/src/features/orders/api.ts` و`OrderDetailPage.tsx`؛ `frontend/src/features/inventory/api.ts`؛ `frontend/src/shared/i18n/ar.ts`؛ `frontend/src/mocks/handlers.ts`؛ `frontend/tests/integration/orders-deliveries.test.tsx`؛ `frontend/e2e/global-setup.cjs` و`order-reservations.spec.ts`؛ `frontend/playwright.config.ts`؛ `frontend/package.json`.
- **توثيق وإثبات:** `docs/DECISIONS.md`؛ لقطات `docs/phase-1/screenshots/`.

## قاعدة البيانات وتدفق القبول

طُبقت migration الجديدة فقط عبر أمر migration محدد على `erp_scratch`. كانت قاعدة scratch تفتقد أعمدة يحتاجها إنشاء الفاتورة، لذلك طُبقت عليها أيضًا migration الإضافية الموجودة `2026_10_16_000002_expand_invoice_issue_workflow.php` و`2026_10_16_000004_add_profit_ledger_and_landed_cost_revaluation.php` لمواءمة مخطط الفوترة. لم تُعدّل ملفات migrations القديمة ولم تُشغّل بقية migrations المعلقة. الـSeeder محمي بحيث لا يكتب إلا إلى `erp_scratch` أو `erp_acceptance_tests`.

سجّل Playwright الخطوات التالية على الشاشة، وكانت استجابات API وقيم قاعدة البيانات متوافقة معها:

1. تأكيد طلب fixture كميته 2؛ الحالة `confirmed` والحجز `reserved` والكمية المحجوزة 2.
2. إلغاء الطلب؛ الحالة `cancelled` والحجز `released` والكمية المحجوزة تعود إلى صفر.
3. تأكيد طلب fixture كميته 3 ثم إصدار فاتورة كاملة؛ الطلب `fulfilled`، الفاتورة `posted`، الحجز `consumed`، وميزان المنتج `quantity_on_hand = 9` و`quantity_reserved = 0` من رصيد أولي 12.

تحقق مباشر من MariaDB بعد التشغيل: طلب الإلغاء رقم `RSV-E2E-cancel-B4966174` (id 17) حالته `cancelled` وحجزه `released` لكمية 2؛ طلب الفاتورة `RSV-E2E-invoice-B4966174` (id 18) حالته `fulfilled`، والفاتورة id 2 حالتها `posted`، والحجز `consumed` لكمية 3، والميزان 9/0. هذه صفوف fixture فقط.

## الاختبارات وأوامر التشغيل

| الاختبار | الأمر | النتيجة |
|---|---|---|
| Backend feature + unit | `php vendor/bin/phpunit --no-configuration --bootstrap vendor/autoload.php tests/Feature/SalesWorkflowEngineTest.php tests/Unit/OrderReservationAllocatorTest.php` مع `DB_CONNECTION=mariadb_test` و`DB_MARIADB_TEST_DATABASE=erp_test` | ناجح: 27 اختبارًا، 171 assertion |
| Component | `npm test -- --run tests/integration/orders-deliveries.test.tsx` | ناجح: 6 اختبارات |
| TypeScript | `npm run typecheck` | ناجح، exit code 0 |
| Playwright على Laravel وMariaDB | `npm run test:e2e:reservations -- --timeout=60000` | ناجح: 1 تدفق، 30.6 ثانية |

يتطلب تشغيل Playwright محليًا PHP 8.3 مع `pdo_mysql` و`PHPRC` يشير إلى php.ini المفعّل، وMariaDB على `127.0.0.1:3307`، مع ضبط `PHP83_BIN` و`DB_MARIADB_DATABASE=erp_scratch`. عند استخدام Chromium مثبت محليًا، يقبل الإعداد `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`؛ وإلا يستخدم Playwright المتصفح المدار بإصداره.

## لقطات الشاشة

- [بعد التأكيد والحجز](screenshots/order-reservation-confirmed.png)
- [بعد الإلغاء والتحرير](screenshots/order-reservation-released.png)
- [بعد الفوترة واستهلاك الحجز](screenshots/order-invoice-consumed-reservation.png)

لا تبدأ فجوة أخرى ضمن هذا التقرير؛ هذه المرحلة تقتصر على GAP-0001.

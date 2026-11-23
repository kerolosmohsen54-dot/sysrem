# تقرير المرحلة 5: العملاء والمحافظات

الفرع: `codex/precision-slate-customer-workflows-20261030`. التنفيذ على قاعدة MariaDB الاختبارية `erp_acceptance_tests` وواجهة React المتصلة بخادم Laravel الحقيقي. استُخدمت fixtures فقط، ولم تُحذف التغييرات الموجودة مسبقاً في المستودع.

| الفجوة | الحالة | التنفيذ والملفات الرئيسية | التحقق |
| --- | --- | --- | --- |
| GAP-0002 | DONE | `frontend/src/features/customers/CustomerDetailPage.tsx`, `frontend/src/features/customers/api.ts`, `frontend/src/features/sales/CollectionsPage.tsx`, `backend/app/Http/Controllers/SalesController.php`؛ تبويبات الطلبات والفواتير والمدفوعات وكشف الحساب من API وروابط السجلات | اختبار المكوّن وPlaywright؛ ظهرت سجلات fixture الحقيقية |
| GAP-0003 | DONE | migration `backend/database/migrations/2026_10_30_000007_create_customer_attachments.php`، و`backend/app/Models/CustomerAttachment.php`، و`backend/app/Services/CustomerAttachmentService.php`، و`backend/app/Http/Controllers/CustomerAttachmentController.php`، و`backend/app/Http/Requests/StoreCustomerAttachmentRequest.php`، و`backend/app/Policies/CustomerAttachmentPolicy.php`، و`backend/app/Support/CustomerAttachmentMime.php`، و`backend/app/Rules/MaxCustomerAttachmentBytes.php`، والمسارات والصلاحيات والقرص الخاص | PDF 201 وعرض وتنزيل بمحتوى PDF؛ `.exe` وملف أكبر من 10 MiB رجعا 422؛ مستخدم read-only مُنع من الرابط المباشر في Feature test؛ الحذف منطقي وتحقق قاعدة البيانات في Feature test |
| GAP-0036 | DONE | `frontend/src/features/customers/CustomerListPage.tsx`, `frontend/src/styles/global.css`, `backend/app/Http/Controllers/SalesController.php`؛ بحث ومرشحات حالة/محافظة وترقيم وعرض المبالغ والنشاط الفعلي، وجدول مدمج للموبايل | فحص TypeScript ولقطة الموبايل وPlaywright على API حقيقي |
| GAP-0045 | DONE | `frontend/src/features/customers/GovernoratesPage.tsx`, `backend/app/Services/GovernorateService.php`, `backend/app/Models/Governorate.php`, `backend/app/Policies/GovernoratePolicy.php`, `backend/app/Http/Controllers/ReferenceCatalogController.php`؛ قائمة بأعداد العملاء الحقيقية وإضافة وتعديل وتعطيل مسجل | Playwright أنشأ محافظة وعدّلها وتحقق من استجابة API والقراءة اللاحقة؛ اختبار Feature المرجعي |

## الاختبارات والتشغيل

- `php artisan migrate --database=mysql_test`: نجح على `erp_acceptance_tests`.
- `php artisan test --filter='CustomerAttachment|CustomerAttachmentMime|PhaseDReferenceData'`: **10 ناجحة، 71 assertion**.
- `npm run typecheck`: ناجح.
- `npm test -- --run tests/components/CustomerDetailPage.test.tsx`: **1 ناجح**.
- `npx playwright test --config=playwright.config.ts e2e/customer-workflows.spec.ts`: **1 ناجح**، بواجهة Vite وخادم Laravel وMariaDB حقيقيين؛ fixture من `CustomerWorkflowAcceptanceSeeder`.
- بيئة Playwright تستخدم `PHPRC` مع `post_max_size=12M` و`upload_max_filesize=11M` كي تصل ملفات 10 MiB إلى تحقق Laravel. قبل هذا الضبط أرجع PHP تحذيراً وحالة 200 لأن إعداد 8M رفض POST قبل التطبيق؛ بعد الضبط رفض التطبيق الملف الكبير بحالة 422.

## اللقطات

`docs/phase-5/screenshots/`: ملف العميل (نظرة عامة، الطلبات، الفواتير، المدفوعات، الكشف، المرفقات)، المحافظات على الحاسوب والموبايل، والعملاء على الموبايل.

## حدود التحقق

اختبار المتصفح يغطي تدفقاً واحداً شاملاً؛ اختبارات Feature تغطي صلاحيات المرفق، محتواه، حد الحجم، نوعه، والحذف المنطقي مباشرة مع قاعدة الاختبار. تُترك بيانات fixture في قاعدة القبول لتيسير مراجعة السجلات، ولا تُستخدم بيانات إنتاجية.

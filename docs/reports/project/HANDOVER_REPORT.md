# تقرير التسليم النهائي

التاريخ: 17 أكتوبر 2026

## قاعدة البيانات والنسخ الاحتياطية

- تم التحقق من إعداد backend/.env قبل المسح: MySQL على 127.0.0.1:3306، قاعدة erp_scratch، والخادم DESKTOP-FPGNR7B.
- النسخة الجديدة بعد الاختبار: D:/system karas/backups/system-end-post-test-handover-20261017-100907
- بصمة ملف قاعدة البيانات: SHA-256 8a2f01b2ade99c040399931802dfedc701ca6c668c212ee5aeb5d526526e0c68.
- بصمة ملف backend.env داخل النسخة: SHA-256 a10d76d70137f2f46f348f5b4c8515dc3b924f40797e97d92faaf74d696a3a46.
- بصمة MANIFEST.json: SHA-256 3ba43cca5f92b034aee9719e240410aca9098e4350a308110e8d120f9ff9cf18. تمت مطابقة بصمات جميع العناصر الـ24 المذكورة في البيان.
- شملت النسخة dump قاعدة البيانات و22 ملفًا من backend/storage بحجم 113,692 بايت وملف البيئة. النسخة السابقة D:/system karas/backups/system-end-pre-acceptance-20261017-042017 باقية دون تغيير.

## نتيجة تنظيف البيانات

- جرى التنظيف على erp_scratch فقط؛ لا توجد صفوف في جداول بيانات التشغيل، ولا توجد جداول إضافية أو محذوفة.
- بقيت جداول الإعدادات والمرجعيات والصلاحيات والمستخدمين. المستخدم النشط الوحيد هو karas (مالك النظام). حُذفت حسابات الاختبار؛ لم يُنشأ أو يُحذف مستخدم حقيقي.
- بقيت 7 أدوار، و79 صلاحية، و206 روابط صلاحيات، وإعداد نظام واحد، و27 محافظة، و3 بنود مصروفات، و8 أنواع تكاليف حاويات، و4 فئات موبايل.
- بقي تعريف حساب خزينة واحد للدرج، وسجل حركات الخزينة صفر، لذلك رصيده المحسوب صفر. لا توجد تعريفات بنك أو محفظة حالية؛ تعريفات الاختبار أزيلت. يلزم تحديد الحسابات التشغيلية المراد إعدادها إذا كانت مطلوبة.
- بقيت 39 migration كما هي. document_sequences فارغ. عدادات الفواتير والتحصيل والحاويات والعملاء والمنتجات وجلسات الدخول وسجل التدقيق تبدأ من 1.

## عدد الصفوف في الجداول بعد التنظيف


| الجدول | الصفوف |
|---|---:|
| app_settings | 1 |
| approved_damaged_stock | 0 |
| attachment_metadata | 0 |
| audit_logs | 0 |
| auth_sessions | 0 |
| chart_of_accounts | 0 |
| container_cost_allocations | 0 |
| container_cost_payments | 0 |
| container_cost_revaluations | 0 |
| container_cost_type_settings | 8 |
| container_costs | 0 |
| container_fund_movements | 0 |
| container_lines | 0 |
| container_location_transfers | 0 |
| container_receipt_lines | 0 |
| container_receipts | 0 |
| container_status_history | 0 |
| containers | 0 |
| currency_references | 0 |
| customers | 0 |
| deliveries | 0 |
| delivery_lines | 0 |
| document_sequences | 0 |
| expense_categories | 3 |
| expenses | 0 |
| financial_outbox_events | 0 |
| governorates | 27 |
| idempotency_records | 0 |
| inventory_balances | 0 |
| inventory_count_lines | 0 |
| inventory_counts | 0 |
| inventory_movement_lines | 0 |
| inventory_movements | 0 |
| journal_entries | 0 |
| journal_lines | 0 |
| locations | 0 |
| migrations | 39 |
| mobile_captured_messages | 0 |
| mobile_categories | 4 |
| mobile_channels | 0 |
| mobile_device_sources | 0 |
| mobile_devices | 0 |
| mobile_idempotency_records | 0 |
| mobile_messages | 0 |
| mobile_payment_channels | 0 |
| mobile_sources | 0 |
| mobile_sync_events | 0 |
| partner_payments | 0 |
| partner_profit_ledger | 0 |
| partners | 0 |
| password_reset_tokens | 0 |
| permissions | 79 |
| product_categories | 0 |
| product_location_minimum_stock | 0 |
| products | 0 |
| purchase_invoice_lines | 0 |
| purchase_invoices | 0 |
| role_permissions | 206 |
| roles | 7 |
| sales_document_lines | 0 |
| sales_document_postings | 0 |
| sales_documents | 0 |
| sales_order_invoice_allocations | 0 |
| sales_order_lines | 0 |
| sales_orders | 0 |
| sales_receipt_allocation_reversals | 0 |
| sales_receipt_allocations | 0 |
| sales_receipt_postings | 0 |
| sales_receipts | 0 |
| shipping_drivers | 0 |
| suppliers | 0 |
| trash_items | 0 |
| treasury_accounts | 1 |
| treasury_entries | 0 |
| treasury_transfer_entries | 0 |
| treasury_transfers | 0 |
| user_roles | 1 |
| users | 1 |
| warehouse_return_lines | 0 |
| warehouse_returns | 0 |
## التخزين والمتصفح والهاتف

- نُقلت لقطات الشاشة وسكريبتات الفحص إلى D:/system karas/handover-artifacts-20261017 خارج المشروع. حُدثت روابط الصور والملفات في TEST_REPORT.md إلى موقع الأرشيف، وتم التحقق من وجود 91 رابطًا دون روابط مفقودة.
- أُفرغ backend/storage/logs/laravel.log؛ حجمه النهائي صفر. نُفذ php artisan optimize:clear وphp artisan cache:clear، ومجلد cache/data لا يحتوي إلا ملف .gitignore.
- بقيت نسخ قواعد البيانات القديمة داخل backend/storage/app/backups؛ لم تُحذف أي نسخة احتياطية.
- مُسحت ملفات الارتباط وlocalStorage وsessionStorage وبيانات IndexedDB وCache Storage وعمال الخدمة من بروفايل Chrome. نتيجة الفحص: localStorage=0، sessionStorage=0، ولا قواعد IndexedDB أو caches أو service workers مسجلة.
- مجلد D:/acceptance-run/chrome-profile نفسه ما زال موجودًا. المراجعة الآلية منعت أمر حذف المجلد المتولد؛ لم أعد المحاولة بصيغة أخرى. بيانات الموقع داخله مُفرغة.
- سبق نجاح أمر Android pm clear للتطبيق com.erp.companion، لكن ADB الآن لا يعرض جهازًا متصلًا، لذلك تعذر التحقق من شاشة الموبايل أو تأكيد الحالة الحالية للجهاز RKGL20244XY.
- بقي frontend/dist لأنه ناتج البناء المتولد والمُتجاهل في Git. المراجعة الآلية منعت أمر حذف المجلد؛ لم أكرر محاولة الحذف. البناء الموجود يطابق آخر مصدر.
- قد يظل Vite يستخدم ذاكرة تحسين التبعيات أثناء عمله؛ لم أعد تشغيل الخدمة أو أعبث بذاكرتها الحية.

## التعريب

- تمت إضافة ترجمات عرض للأدوار والحالات والحركات والوحدات مع إبقاء قيم الأكواد المخزنة كما هي. عولج ظهور الدور unknown بإرجاع role وroles من endpoint الجلسة وتطبيع كائنات الأدوار في الواجهة.
- عُرّبت رسائل التحقق وأخطاء API الافتراضية، ورسائل أخطاء API في الويب والموبايل، وأسماء الأدوار في Seeder للمستقبل.
- عُرّب اسم تطبيق Android ونصوص إشعاراته، ونص الاختصار الظاهر للبحث إلى «تحكم + K».
- شملت التغييرات: backend/app/Http/Controllers/AuthController.php، backend/bootstrap/app.php، backend/config/app.php، backend/lang/ar.json، backend/lang/ar/validation.php، backend/database/seeders/RolePermissionMatrixSeeder.php، frontend/src/shared/utils/labels.ts، frontend/src/shared/auth/normalizeSessionUser.ts، frontend/src/shared/api/errors.ts، frontend/src/features/mobile/api.ts، frontend/src/features/admin/api.ts، frontend/src/app/layouts/AppShell.tsx، وأنواع واختبارات الواجهة، وملفات AndroidManifest.xml وstrings.xml.
- فحص النصوص المرئية في مصادر TS/TSX/JS لم يجد نصًا إنجليزيًا غير مترجم بعد تعديل الاختصار. بقي K رمزًا لمفتاح لوحة المفاتيح.

## المراجعة والاختبارات

- تمت مراجعة 58 مسارًا في Chrome بقراءة فقط، ثم إعادة فحص الصفحات الأبطأ بعد المصادقة. الشاشات كانت RTL، وحالات الفراغ بالعربية، ولم يظهر تمرير أفقي أو أخطاء JavaScript في جولة إعادة الفحص. الأدلة في D:/system karas/handover-artifacts-20261017/screenshots.
- بعد المصادقة لم تتكرر استجابات 4xx/5xx في مراجعة الصفحات. ظهر 428 قبل إعادة التحقق، وهو تحدي المصادقة الإضافية. ظهرت في فحص الدخول الأول 401 و404 بلا عنوان مورد؛ لم يتكرر الخطأ بعد المصادقة، لكن مصدر 404 الأول لم يمكن تحديده بشكل قاطع.
- تسجيل دخول karas نجح، و/auth/me أعاد دور owner والصلاحيات؛ الواجهة عرضت الدور بالعربية «المالك». لا توجد حسابات مستخدمين حالية لأبنوب أو السائق أو الأدمن، لذلك تعذر اختبار دخولهم فعليًا. اختبار الواجهة لمسار المستخدم ذي دور السائق نجح ضمن اختبارات التكامل.
- الموبايل غير متاح للفحص النهائي لأن ADB يعرض قائمة أجهزة فارغة.
- اختبارات الواجهة: 44 ملفًا و190 اختبارًا ناجحة. بعد تعريب الاختصار، اجتاز اختبار شاشة الإدارة والاختصارات 8/8، واجتاز lint. typecheck/build نجحا؛ build فحص 86 ملفًا إنتاجيًا.
- اختبار الباك اند المستهدف للمصادقة نجح: اختبار واحد و7 assertions. المجموعة الكاملة السابقة: 200 اختبار، 29 ناجحًا، و59 خطأ، و112 متجاوزًا؛ معظم الأخطاء بسبب غياب الجداول في SQLite :memory: وعدم توافق migrations المكتوبة لـ MySQL. لم تستخدم المجموعة قاعدة erp_scratch. إعداد suite ما زال يحتاج معالجة منفصلة.
- خدمات التشغيل ما زالت قائمة: backend على 192.168.100.4:8000/health أعاد 200، frontend على 192.168.100.4:5173 أعاد 200، وMetro على 192.168.100.4:8081 أعاد packager-status:running.

## Git

- الفرع المحلي: handover-localization-20261017.
- commits التعريب والإصلاح المحلي: 2a7ac9b، 301a85d، b7c5866، a03fd5d، a9d41a3. لم يحدث push أو merge.
- بقيت تغييرات سابقة كثيرة في شجرة العمل، بينها تعديلات وحذف ملفات موثق سابقًا وملفات غير متتبعة. لم أعدها أو أنظفها أو أضمّنها في commits التسليم. ستجد فقط تقارير التسليم مضافة في commit منفصل.

## عناصر مفتوحة

- توفير حسابات تشغيلية حقيقية لأبنوب والسائق والأدمن واختبار صلاحياتها.
- توصيل RKGL20244XY لإعادة فحص واجهة الموبايل بعد المسح.
- تحديد ما إذا كان يلزم إعداد حسابات بنك أو محافظ حقيقية؛ الحالي حساب الدرج فقط.
- إصلاح إعداد suite الباك اند حتى تنشئ مخطط اختبار MySQL/SQLite معزولًا صالحًا.
- مصدر 404 الذي ظهر مرة في فحص الدخول الأول غير معروف ولم يظهر مجددًا.
- بروفايل Chrome ومجلد frontend/dist باقيان بسبب منع المراجعة الآلية لحذف المجلدات؛ بيانات الموقع في بروفايل Chrome ممسوحة.

## تنظيم الملفات المحيطة بالمشروع - 2026-10-18

- حُفظت نسختا قاعدة البيانات الأصليتان داخل backups/external-snapshots مع MANIFEST.json وبصماتهما؛ النسخ الأصلية الخارجية لم تُمس.
- حُفظت نسخ المستودعات التاريخية داخل backups/historical-repositories للرجوع إليها، دون دمج كودها في المصدر الحالي.
- نُقلت المراجع والمتطلبات المحيطة إلى docs/reference، وأدلة الصور والملفات المرتبطة بالتقرير إلى docs/evidence. رُبطت الأدلة في هذا التقرير وتقرير الاختبار بمسارات داخل المشروع.
- استُبعدت مجلدات Chrome المؤقتة وحالة تسجيل الدخول، ولم تُنقل ملفات التطبيق الاجتماعي التجريبي من mobile-application أو _backup_mobile_found لأنها ليست تطبيق ERP المرافق.
- لم يُحذف أي ملف من المجلد الأب. ما زالت النسخ والمصادر الأصلية هناك إلى أن يحذفها المستخدم بنفسه بعد التحقق من النسخ الموجودة داخل المشروع والنسخة الكاملة karas system.
## التحقق من النسخة الشقيقة

- أُنشئت النسخة الكاملة في D:\system karas\karas system. اكتملت Robocopy بنجاح، والنسخة تشمل ملفات Git وملفات الاعتماد والبناء والسجلات كما كانت في المصدر. تقرير النسخ: 176,664 ملفًا و36.8 GB حجمًا منطقيًا.
- مقارنة Robocopy الجافة لم تجد ملفات ناقصة أو مختلفة. بصمات SHA-256 تطابقت للملفين الرئيسيين والتقرير والمراجع وعينة من كود الباك اند، كما تطابقت بصمات الملفات الـ25 المدرجة في MANIFEST لنسخة ما بعد الاختبار.
- الفرع وHEAD في النسخة يطابقان المصدر: final-test-fixes-all و731c33c7cdb5f5827b94985fa36cf4a0398d83bb. أُعيد إنشاء وصلات node_modules المحلية داخل النسخة.
- يتضمن Git في النسخة تسجيل worktree تاريخيًا لمسار D:\system karas\erp-frontend خارج النسخة. هذا تسجيل إضافي فقط؛ المستودع الرئيسي في karas system يعمل محليًا. لو حُذف المسار الخارجي، سيظهر التسجيل قديمًا ويمكن تنظيفه لاحقًا من داخل النسخة وحدها.
- تقرير الاختبار لديه 127 رابط دليل داخليًا، وجميعها تشير إلى ملفات موجودة. لا push أو merge أو حذف لأي أصل خارجي.
## أرشفة ملفات الاختبار المؤقتة

حُفظت ملفات الأدلة والسكربتات والسجلات من مجلدي handover-artifacts-20261017 وacceptance-run داخل docs/archive/test-artifacts للاحتفاظ بها. بعض السكربتات تنفذ كتابة أو تنظيفًا لقاعدة البيانات، لذلك تُعامل كأرشيف ولا تُشغّل دون مراجعة. لم تُنسخ بروفايلات Chrome أو بيانات الجلسة.
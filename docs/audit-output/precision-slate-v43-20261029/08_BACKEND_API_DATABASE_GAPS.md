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

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

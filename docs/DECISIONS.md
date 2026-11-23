# قرارات التدقيق

> الملاحظات حتى الفقرة التالية توثق مرحلة التدقيق السابقة لتنفيذ GAP-0001؛ قرارات التنفيذ وحالة التحقق الفعلية موضحتان في الأقسام أدناه وفي `docs/phase-1/REPORT.md`.

هذه المهمة تدقيق فقط؛ لم أتخذ قرارًا محاسبيًا أو مخزونيًا ولم أغيّر أي سلوك.

- اعتُمد ملف v43 المحلي مرجعًا بصريًا أساسيًا.
- استُخدمت fixtures المحلية فقط في مرجع التصميم ووضع MSW.
- فُصلت نتائج MSW عن استجابات Laravel الفعلية.
- لم أرسل كلمة مرور للحساب الحي، ولم أتصل بـMySQL أو أقرأ/أكتب بيانات.
- عندما اختلفت بيانات الفاتورة بين المرجع والنظام، أبقيت مقارنة المحتوى NOT_VERIFIED.
- بقيت لوحة sec-liq وحالات المرجع الست غير الظاهرة مسجلة كقيود، ولم أعتبرها غائبة من النظام الفعلي.
- لم أعدّل migrations أو التطبيق أو ملفات المستخدم؛ أضيفت فقط مخرجات التدقيق والصور.

## قرارات التنفيذ المعتمدة

تسري القرارات التالية على تنفيذ الفجوات، وتستبدل أي افتراض تدقيقي سابق يتعارض معها:

- **حجز المخزون (D8):** عند تأكيد الطلب يُحجز المتاح فعليًا برفع `quantity_reserved`. إلغاء الطلب يحرر الحجز، وتحويل الطلب إلى فاتورة يخصم الكمية من `quantity_on_hand` ويحرر الحجز. المتاح هو `quantity_on_hand - quantity_reserved`. فحص الرصيد وتعديلاته كلها داخل transaction مع `lockForUpdate`، ولا يُسمح بحجز يتجاوز المتاح.
- **القيد المحاسبي:** القيد مزدوج ومتوازن (مجموع المدين يساوي مجموع الدائن). القيد المرحّل غير قابل للتعديل أو الحذف؛ التصحيح بقيد عكسي. الترحيل idempotent ولا ينتج أثرًا إضافيًا عند تكراره.
- **مرفقات العميل:** تخزين خاص، والأنواع PDF/JPG/PNG، والحد الأقصى 10 MB، وفحص MIME من المحتوى، والتنزيل عبر route محمي بالصلاحية، والحذف منطقي.

### تنفيذ مرفقات العميل، المرحلة 5

- يُفسَّر حد 10 MB على أنه 10 MiB بالضبط (10,485,760 بايت). يفحص الخادم الحجم بالبايت وMIME من محتوى الملف، ثم يخزنه على قرص خاص. يجب ضبط `post_max_size` في PHP أعلى من 10 MiB مع هامش لحدود multipart، و`upload_max_filesize` على 10 MiB أو أكثر؛ في اختبار المتصفح استُخدم 12M و11M على الترتيب.
- **التقارير:** يُبنى الكتالوج من التقارير المعلنة في قسم التقارير بمرجع v43، بأسمائها كما وردت؛ لا تُضاف تقارير غير معلنة.
- **الثيم والتصميم:** قيم v43 المستهدفة هي خط 13px وشريط جانبي 240px وشريط علوي 52px وradius بقيمتي 4px و8px. تعديل tokens العامة مؤجل إلى البرومبت 9.
- **الصلاحيات:** كل إنشاء أو تعديل أو حذف أو ترحيل أو تحصيل أو نقل حساس محمي بـPolicy في الخادم. `PermissionGate` للعرض فقط.
- **سجل التدقيق:** كل عملية حساسة تسجل المستخدم والوقت والإجراء والقيم قبل العملية وبعدها.


## Sales workflow implementation notes

- Sales orders persist the selected currency code, but order and invoice amounts remain EGP because the current currency reference catalog has no managed exchange rates or rate snapshots. The order currency selector therefore offers EGP only; other currencies require an approved FX-rate workflow before they can affect totals.
- Order line discounts are percentage discounts, followed by an optional order-wide fixed or percentage discount. Tax follows the configured sales-tax setting and is calculated per line so the order preview and posted invoice use the same rounding path.
- An unlinked sales return requires the dedicated `returns.free.create` permission and a non-empty reason. Linked returns use the source invoice snapshots and cumulative posted return quantities.

## Accounting workflows (GAP-0005–0010)

- The chart of accounts is a parent-linked tree. Account codes are unique, parent changes are rejected when they create a cycle, and a posted account with journal activity cannot be edited or removed.
- Journal entries use exact four-decimal amounts and double-entry balancing. Drafts can be corrected; posted entries are immutable. Corrections use a new posted reversal entry, and both journal posting and reversal are idempotent.
- Ledger and trial-balance periods include posted entries only. The ledger opening balance includes posted activity before the period; the period movement is bounded by the requested dates. Trial-balance differences remain visible, including legacy out-of-balance data.
- The income statement uses posted movement in the requested period. The balance sheet uses posted balances through the requested end date and includes accumulated income. Cash-flow closing balances are derived from posted treasury-linked journal lines.
- A financial adjustment is a reference-and-reason backed, idempotent operation that creates and posts one balanced journal entry. Treasury-linked sides create treasury ledger entries in the same transaction. Corrections are recorded as new accounting activity; the original posted adjustment and journal remain immutable.
- Sensitive accounting writes are authorized by server-side policies and write before/after audit records with actor and timestamp. Frontend permission gates control visibility only.

## Finance planning and collections (GAP-0011–0016, GAP-0029, GAP-0040)

- Expected funds are forecasts only and never change treasury balances until a receipt is recorded. Each receipt has its own idempotency key and treasury source identity, so partial receipts remain separate and retries do not duplicate cash.
- Partner plans generate monthly installments by applying the requested installment amount and placing any remainder in the final installment. Payments allocate FIFO to the earliest installment with an outstanding balance; payment state and plan totals are derived from the recorded payments.
- Expense budgets are monthly per active expense category. Actuals include posted expenses only. Remaining budget may be negative to keep an overspend visible; the forecast caps unused budget at zero.
- Recurring templates materialize one due occurrence per template per month. A daily 01:00 scheduler catches up due cycles; a unique template/month key prevents duplicates. Materialization records a due item only; treasury is changed only when that occurrence is explicitly posted. Stopping a template preserves its history and records the reason.
- For a forecast month, posted expenses and due recurring occurrences reduce the budget envelope. Any remaining envelope is spread evenly over future days in that month beginning the day after the forecast start (or the first day for later months). It is shown separately from actual treasury outflows.
- A cash forecast starts with all actual treasury movements before its first day, then includes actual movements from that day, pending funds, unpaid partner installments, due recurring expenses, and the remaining budget envelope in weekly periods. Expected sources remain itemized so an operator can reconcile each total.
- Month comparison uses posted invoices less posted credit notes and posted expenses; profit is net sales less posted expenses. Empty periods are zero. A percent change is null when its baseline is zero.
- Planning reference options use a session-authenticated policy-protected read endpoint. Reference data reads do not require mutation step-up; sensitive create, receive, post, stop, and reversal actions still use server-side policies and step-up protection.

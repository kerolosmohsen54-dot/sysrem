import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const file = path.join(root, 'docs/ux-inventory/VISUAL_PAIR_REVIEW.csv');

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') { field += '"'; i += 1; }
      else if (char === '"') quoted = false;
      else field += char;
    } else if (char === '"') quoted = true;
    else if (char === ',') { row.push(field); field = ''; }
    else if (char === '\n') { row.push(field.replace(/\r$/, '')); rows.push(row); row = []; field = ''; }
    else field += char;
  }
  if (field.length || row.length) { row.push(field.replace(/\r$/, '')); rows.push(row); }
  const [headers, ...data] = rows;
  return data.filter((values) => values.length).map((values) => Object.fromEntries(headers.map((header, i) => [header, values[i] ?? ''])));
}

function csvCell(value) { return `"${String(value ?? '').replaceAll('"', '""')}"`; }
function serialize(rows, headers) { return [headers, ...rows.map((row) => headers.map((header) => row[header] ?? ''))].map((values) => values.map(csvCell).join(',')).join('\r\n') + '\r\n'; }

const screenIds = {
  collections: 'SCR-009', containers: 'SCR-018', customers: 'SCR-002', dashboard: 'SCR-001',
  deliveries: 'SCR-010', 'delivery-create': 'SCR-011', finance: 'SCR-017', 'inventory-summary': 'SCR-015',
  'invoice-create': 'SCR-007', 'invoice-print': 'SCR-008', invoices: 'SCR-006', movements: 'SCR-016',
  'order-create': 'SCR-004', 'order-detail': 'SCR-005', orders: 'SCR-003', products: 'SCR-014',
  reports: 'SCR-019', 'reports-financial': 'SCR-025', 'reports-inventory': 'SCR-024',
  'reports-profit': 'SCR-021', 'reports-sales': 'SCR-020', 'return-create': 'SCR-013', returns: 'SCR-012',
  users: 'SCR-022', warehouses: 'SCR-023', login: 'SCR-000',
};

const findings = {
  collections: ['GAP-0040', 'المرجع يبدأ بمؤشرات التحصيل ثم المستحقات والمدفوعات؛ النظام يقدّم البحث/التاريخ وجدول الفواتير قبل سجل التحصيل. لا تقارن القيم بسبب اختلاف بيانات الاختبار.'],
  containers: ['GAP-0037', 'النظام يضع البحث والحالة ومدى التاريخ قبل القائمة؛ الهاتف يعرض بطاقات تفاصيل طويلة بدل كثافة قائمة المرجع.'],
  customers: ['GAP-0036', 'لوحة المرشحات والحقول/الأعمدة أوسع، وصفوف الهاتف تتحول إلى بطاقات طويلة بخلاف جدول المرجع.'],
  dashboard: ['GAP-0031; GAP-0027', 'ترتيب وبنية اللوحة ومؤشراتها مختلفان؛ في 390px نمط التنقل السفلي في React يختلف عن موضع تنقل المرجع. بيانات المؤشرات غير موحدة.'],
  deliveries: ['GAP-0041', 'النظام يعرض صف حالات وحالة فارغة كبيرة؛ شبكة مؤشرات وأدوات المرجع ليست ظاهرة بالبنية نفسها.'],
  'delivery-create': ['GAP-0042', 'المرجع يوزع الحقول في عمودين مع جدول أصناف؛ النظام يكدس الحقول ويعرض تحذيرًا وزرًا عريضًا.'],
  finance: ['GAP-0029', 'ترتيب أقسام المالية وأزرارها يختلف عن تبويبات/جداول المرجع؛ لا تُستنتج مطابقة الأرصدة من fixtures مختلفة.'],
  'inventory-summary': ['GAP-0045', 'النظام يضيف لوحة بحث وترتيب ومرشحات كبيرة قبل الجدول؛ المرجع يقدّم بطاقات ملخص وترتيبًا أكثر اختصارًا.'],
  'invoice-create': ['GAP-0034', 'أشرطة الإجراءات ونوع العملية والأقسام أطول ومتراكمة رأسيًا في النظام مقارنة بتسلسل المرجع؛ القص الرأسي أوضح على الهاتف.'],
  'invoice-print': ['GAP-0052', 'معاينة الطباعة تختلف في مساحة الورقة وتوزيع بيانات الفاتورة والعلامة المائية؛ أرقام/تواريخ المستندات غير موحدة لذا المحتوى غير محسوم.'],
  invoices: ['GAP-0033', 'شبكة ملخص المرجع تتحول إلى لوحة/مرشحات طويلة في النظام، وتختلف كثافة القائمة على الهاتف. القيم وعدد الصفوف غير مستخدمين لإثبات الفجوة.'],
  movements: ['GAP-0046', 'النظام يعرض نموذج مرشحات متعدد الحقول قبل السجل؛ المرجع يقدّم أدوات الحالة وسجل الحركة بكثافة أعلى.'],
  'order-create': ['GAP-0030', 'مجموعات حقول وملخص المرجع لا تظهر بالترتيب نفسه؛ النظام يكدّس نموذجًا أبسط مع اختيار الصنف والكمية والسعر.'],
  'order-detail': ['GAP-0053', 'صورة React تُظهر مؤشر «جار التحقق من الجلسة» بدل تفاصيل الطلب في المقاسات الثلاثة؛ لا يمكن الجزم بعيب مستمر لأن الالتقاط انتظر 350ms فقط ولم يستخدم سجلًا موحدًا.'],
  orders: ['GAP-0032', 'المرجع يضع البحث والمرشحات في صف مضغوط؛ React يوسع البحث والحالات ويعرض جدولًا/صفحة فارغة مختلفة.'],
  products: ['GAP-0038', 'تكوين المرشحات والأعمدة يختلف؛ على الهاتف المرجع يعرض جدولًا مضغوطًا بينما React يعرض بطاقة تفصيل طويلة.'],
  reports: ['GAP-0039', 'المرجع يستخدم شبكة بطاقات تقارير؛ React يعرض قائمة مجموعات طويلة بوصف نصي.'],
  'reports-financial': ['GAP-0044', 'لقطة React تظهر حالة خطأ عامة وزر إعادة المحاولة بدل لوحة التقرير؛ الحالة الناجحة والبيانات المطابقة غير متاحة.'],
  'reports-inventory': ['GAP-0047', 'المرجع يعرض مؤشرات المخزون وأدوات تقرير وجدولًا مختصرًا؛ React يعرض مرشحات/بحثًا وقائمة تفاصيل أصناف بدل شبكة الملخص.'],
  'reports-profit': ['GAP-0048', 'المرجع يعرض مؤشرات أداء ومخططات؛ React يعرض نطاق تاريخ وحالة «لا توجد بيانات مطابقة». لا تُقارن القيم دون fixtures مشتركة.'],
  'reports-sales': ['GAP-0049', 'المرجع يعرض فلاتر ومؤشرات ومخططًا وجداول تجميع؛ React يعرض بحثًا وتاريخًا وقائمة فواتير دون نفس طبقات التحليل.'],
  'return-create': ['GAP-0050', 'تسلسل/تبويبات إنشاء المرتجع وتقسيم بيانات المصدر والعميل والبنود مختلف بنيويًا؛ لا تُستنتج صحة الحسابات من بيانات غير موحدة.'],
  returns: ['GAP-0035', 'حالة القائمة الفارغة في React أكبر من تكوين الجدول وزر الإنشاء في المرجع؛ تأكد أن المعرف الصحيح SCR-012.'],
  users: ['GAP-0051', 'المرجع يعرض جدول مستخدمين وصلاحيات؛ لقطة React تركز على بطاقة مستخدم/تفاصيل مع حالة قائمة مختلفة. اختلاف fixture يمنع مقارنة الحسابات نفسها.'],
  warehouses: ['GAP-0043', 'المرجع يعرض جدولًا مختصرًا وإجراءات مباشرة؛ React يضيف لوحة بحث/ترتيب وقائمة/بطاقات أطول، خصوصًا على الهاتف.'],
};

const initial = parseCsv(await readFile(file, 'utf8'));
const headers = ['Slug', 'Screen ID', 'Viewport', 'Status', 'Visual Result', 'Reference', 'System', 'Diff', 'Evidence', 'Observation', 'Gap IDs', 'Review Method', 'Confidence'];
const rows = initial.map((row) => {
  const oldStatus = row.Status;
  const [gapIds, observation] = findings[row.Slug] ?? ['', 'لم تُسجل ملاحظة محددة.'];
  const unverified = row.Slug === 'order-detail' || row.Slug === 'reports-financial';
  const evidence = `docs/ux-inventory/screenshots/system-mock/${row.Diff.replace('-diff.png', '-side-by-side.png')}`;
  return {
    ...row,
    'Screen ID': screenIds[row.Slug] ?? 'UNKNOWN',
    Status: 'REVIEWED_MANUAL_PAIR',
    'Visual Result': unverified ? 'NOT_VERIFIED_STATE_OR_DATA' : 'CONFIRMED_VISUAL_DIFFERENCE',
    Evidence: evidence,
    Observation: observation,
    'Gap IDs': gapIds,
    'Review Method': oldStatus === 'REVIEWED_PRIOR_PASS' ? 'Full-size side-by-side image manually reviewed in prior pass.' : 'Matched viewport pair visually reviewed from a 2x2 contact sheet; detailed pixel measurements were not made.',
    Confidence: unverified ? 'Medium/Not Verified' : 'High for composition/layout; fixture values excluded.',
  };
});

for (const viewport of ['1280', '768', '390']) {
  rows.push({
    Slug: 'login', 'Screen ID': screenIds.login, Viewport: viewport, Status: 'REVIEWED_MANUAL_PAIR',
    'Visual Result': 'CONFIRMED_VISUAL_DIFFERENCE',
    Reference: `docs/ux-inventory/screenshots/reference/states/login-${viewport}.png`,
    System: `docs/ux-inventory/screenshots/system-mock/react/login/login-${viewport}.png`,
    Diff: '',
    Evidence: `docs/ux-inventory/screenshots/visual-review-round2/login-${viewport}-side-by-side.png`,
    Observation: 'موضع/حجم العلامة وبطاقة الدخول والحقل الافتراضي وتوزيع المساحة تختلف بين المرجع وReact عند هذا المقاس.',
    'Gap IDs': 'GAP-0028',
    'Review Method': 'Full-size reference and test-mode React screenshots inspected side by side.',
    Confidence: 'High for visible layout; reference/demo field values not treated as application requirements.',
  });
}

await writeFile(file, serialize(rows, headers), 'utf8');
console.log(JSON.stringify({ rows: rows.length, eligibleRoutePairs: rows.filter((row) => row.Slug !== 'login').length, loginPairs: rows.filter((row) => row.Slug === 'login').length, pending: rows.filter((row) => row.Status !== 'REVIEWED_MANUAL_PAIR').length, output: 'docs/ux-inventory/VISUAL_PAIR_REVIEW.csv' }, null, 2));

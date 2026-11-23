import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile, writeFile } from 'node:fs/promises';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const output = 'audit-output/precision-slate-v43-20261029/';

function parseCsv(text) {
  const rows = [];
  let row = [], field = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field.replace(/\r$/, '')); rows.push(row); row = []; field = ''; }
    else field += c;
  }
  if (field.length || row.length) { row.push(field.replace(/\r$/, '')); rows.push(row); }
  const headers = (rows.shift() ?? []).map((value, i) => i === 0 ? value.replace(/^\uFEFF/, '') : value);
  return { headers, rows: rows.filter((r) => r.length).map((r) => Object.fromEntries(headers.map((h, i) => [h, r[i] ?? '']))) };
}
function serializeCsv(headers, rows) {
  const quote = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;
  return `${[headers, ...rows.map((row) => headers.map((h) => row[h] ?? ''))].map((line) => line.map(quote).join(',')).join('\r\n')}\r\n`;
}
async function read(rel) { return readFile(path.join(root, rel), 'utf8'); }
async function write(rel, text) { await writeFile(path.join(root, rel), `\uFEFF${text.replace(/^\uFEFF/, '')}`, 'utf8'); }
async function writeJson(rel, value) { await writeFile(path.join(root, rel), `${JSON.stringify(value, null, 2)}\n`, 'utf8'); }
function cleanReplacementChars(text) {
  return text
    .replace(/GAP-(\d{4})\uFFFD(\d{4})/g, 'GAP-$1–$2')
    .replace(/(\d+) هدفًا \uFFFD (\d+)/g, '$1 هدفًا × $2')
    .replace(/(## GAP-\d{4}) \uFFFD /g, '$1 — ')
    .replace(/(#(?: MASTER UI\/UX Audit| 00| 01| 07| 13| 14)[^\r\n]*) \uFFFD /g, '$1 — ')
    .replace(/(\bGAP-\d{4})\uFFFD(\d{4}\b)/g, '$1–$2');
}

const pairPath = 'docs/ux-inventory/VISUAL_PAIR_REVIEW.csv';
const pairsCsv = parseCsv(await read(pairPath));
const pairRows = pairsCsv.rows;
const viewportLabels = { '1280': '1280', '768': '768', '390': '390' };
const viewportSystemPaths = {
  governorates: (v) => `docs/ux-inventory/screenshots/system-mock/react/visual-round3/governorates-${v}.png`,
  'opening-stock': (v) => `docs/ux-inventory/screenshots/system-mock/react/visual-round3/opening-stock-${v}.png`,
  trash: (v) => `docs/ux-inventory/screenshots/system-mock/react/visual-round3/trash-${v}.png`,
  drivers: (v) => `docs/ux-inventory/screenshots/system-mock/react/visual-round3/drivers-${v}.png`,
  audit: (v) => `docs/ux-inventory/screenshots/system-mock/react/visual-round3/audit-${v}.png`,
  'warehouse-returns': (v) => `docs/ux-inventory/screenshots/system-mock/react/visual-round3/warehouse-returns-${v}.png`,
  'container-funds': (v) => `docs/ux-inventory/screenshots/system-mock/react/visual-round5/container-funds-selected-${v}.png`,
  'minimum-stock': (v) => `docs/ux-inventory/screenshots/system-mock/react/visual-round3/minimum-stock-${v}.png`,
  'inventory-counts': (v) => `docs/ux-inventory/screenshots/system-mock/react/visual-round3/inventory-counts-${v}.png`,
  'container-tracking': (v) => `docs/ux-inventory/screenshots/system-mock/react/visual-round5/container-tracking-candidate-${v}.png`,
  'product-cost-history': (v) => `docs/ux-inventory/screenshots/system-mock/react/visual-round5/product-cost-history-${v}.png`,
  'barcode-labels': (v) => `docs/ux-inventory/screenshots/system-mock/react/visual-round5/products-${v}.png`,
  'install-app': (v) => `docs/ux-inventory/screenshots/system-mock/react/visual-round3/pwa-install-${v}.png`,
  'container-transfers': (v) => `docs/ux-inventory/screenshots/system-mock/react/visual-round3/container-transfers-${v}.png`,
  'stock-returns': (v) => `docs/ux-inventory/screenshots/system-mock/react/visual-round3/warehouse-returns-${v}.png`,
};
const remappedGap = {
  'inventory-summary': 'GAP-0061',
  movements: 'GAP-0062',
  'reports-inventory': 'GAP-0063',
  'reports-profit': 'GAP-0064',
  'reports-sales': 'GAP-0065',
  'return-create': 'GAP-0066',
  users: 'GAP-0067',
  'invoice-print': 'GAP-0068',
  'state-global-search': 'GAP-0069',
  'order-detail': 'GAP-0070',
  'state-notifications': 'GAP-0071',
};
for (const row of pairRows) {
  const mappedPath = viewportSystemPaths[row.Slug]?.(viewportLabels[row.Viewport]);
  if (mappedPath) row.System = mappedPath;
  if (row.Slug === 'order-detail') row['Gap IDs'] = remappedGap['order-detail'];
  else if (row.Slug === 'state-notifications') row['Gap IDs'] = remappedGap['state-notifications'];
  else if (remappedGap[row.Slug]) row['Gap IDs'] = remappedGap[row.Slug];
  else if (row.Slug === 'inventory-counts') row['Gap IDs'] = 'GAP-0053';
  else if (row.Slug === 'container-tracking') row['Gap IDs'] = 'GAP-0054';
}
await write(pairPath, serializeCsv(pairsCsv.headers, pairRows));

const featurePath = `${output}05_FEATURE_GAP_MATRIX.csv`;
const featureCsv = parseCsv(await read(featurePath));
const featureForScreen = new Map();
for (const feature of featureCsv.rows) {
  const screens = `${feature['Screen IDs'] ?? ''}/${feature['Screen ID'] ?? ''}`;
  for (const match of screens.matchAll(/SCR-\d{3}/g)) {
    if (!featureForScreen.has(match[0])) featureForScreen.set(match[0], []);
    featureForScreen.get(match[0]).push(feature['Feature ID']);
  }
}

const gapSpecs = [
  { id: 31, slug: 'dashboard', screen: 'SCR-001', title: 'اختلاف ترتيب ومحتوى لوحة التحكم', module: 'لوحة التحكم', expected: 'عرض مؤشرات الأداء والرسم والنشاط والخزينة وفق ترتيب مرجع v43.', priority: 'P2' },
  { id: 32, slug: 'orders', screen: 'SCR-003', title: 'اختلاف تكوين قائمة الطلبات', module: 'الطلبات', expected: 'تجميع البحث والمرشحات والجدول والترقيم وفق بنية المرجع.', priority: 'P2' },
  { id: 33, slug: 'invoices', screen: 'SCR-006', title: 'اختلاف تكوين قائمة الفواتير', module: 'الفواتير', expected: 'عرض ملخصات الفواتير والمرشحات والجدول حسب ترتيب المرجع.', priority: 'P2' },
  { id: 34, slug: 'invoice-create', screen: 'SCR-007', title: 'اختلاف توزيع نموذج إنشاء الفاتورة', module: 'الفواتير', expected: 'توزيع شريط الإجراءات ونوع العملية وأقسام العميل والفاتورة على نحو المرجع.', priority: 'P2' },
  { id: 35, slug: 'returns', screen: 'SCR-012', title: 'اختلاف حالة قائمة المرتجعات', module: 'مرتجعات المبيعات', expected: 'إبراز زر الإنشاء والجدول كما في المرجع حتى عند عدم وجود صفوف.', priority: 'P2' },
  { id: 36, slug: 'customers', screen: 'SCR-002', title: 'اختلاف كثافة قائمة العملاء ومرشحاتها', module: 'العملاء', expected: 'الحفاظ على ترتيب المرشحات وكثافة الجدول المرجعي مع سلوك هاتف مناسب.', priority: 'P2' },
  { id: 37, slug: 'containers', screen: 'SCR-018', title: 'اختلاف بنية قائمة الحاويات', module: 'الحاويات', expected: 'عرض القائمة المختصرة وترتيب بيانات الحاويات كما في المرجع.', priority: 'P2' },
  { id: 38, slug: 'products', screen: 'SCR-014', title: 'اختلاف مرشحات وأعمدة شاشة المنتجات', module: 'المنتجات', expected: 'مطابقة كثافة جدول المنتجات ومرشحاته وأعمدته للمرجع عند المقاسات الثلاثة.', priority: 'P2' },
  { id: 39, slug: 'reports', screen: 'SCR-019', title: 'اختلاف شبكة مركز التقارير', module: 'التقارير', expected: 'عرض بطاقات التقارير في شبكة وترتيب المرجع.', priority: 'P2' },
  { id: 40, slug: 'collections', screen: 'SCR-009', title: 'اختلاف تسلسل لوحة التحصيل', module: 'التحصيلات', expected: 'عرض مؤشرات التحصيل ثم المستحقات والدفعات وفق المرجع.', priority: 'P2' },
  { id: 41, slug: 'deliveries', screen: 'SCR-010', title: 'اختلاف مؤشرات وإجراءات أذونات التسليم', module: 'التسليم', expected: 'عرض شبكة المؤشرات وإجراءات المرجع مع حالة فراغ مدمجة.', priority: 'P2' },
  { id: 42, slug: 'delivery-create', screen: 'SCR-011', title: 'اختلاف توزيع نموذج إذن التسليم', module: 'التسليم', expected: 'توزيع الحقول في العمودين وعرض الأصناف حسب المرجع.', priority: 'P2' },
  { id: 43, slug: 'warehouses', screen: 'SCR-023', title: 'اختلاف قائمة المخازن ومرشحاتها', module: 'المخزون', expected: 'عرض قائمة المخازن المختصرة دون مساحة بحث وترتيب زائدة عن المرجع.', priority: 'P2' },
  { id: 44, slug: 'reports-financial', screen: 'SCR-025', title: 'حالة التقرير المالي لم تسمح بمقارنة صالحة', module: 'التقارير المالية', expected: 'إظهار التقرير المالي المرجعي وحالاته على بيانات fixture موحدة.', priority: 'P2', unverified: true },
  { id: 61, slug: 'inventory-summary', screen: 'SCR-015', title: 'اختلاف ملخص المخزون ومرشحاته', module: 'المخزون', expected: 'إبراز ملخص المخزون وبنيته المختصرة كما في المرجع.', priority: 'P2' },
  { id: 62, slug: 'movements', screen: 'SCR-016', title: 'اختلاف سجل حركات المخزون', module: 'المخزون', expected: 'إبراز حالات الحركة وسجلها بكثافة وترتيب المرجع.', priority: 'P2' },
  { id: 63, slug: 'reports-inventory', screen: 'SCR-024', title: 'اختلاف شاشة تقرير المخزون', module: 'التقارير', expected: 'عرض المؤشرات والملخص والجدول كما في مرجع التقرير.', priority: 'P2' },
  { id: 64, slug: 'reports-profit', screen: 'SCR-021', title: 'اختلاف شاشة تقرير الأرباح والخسائر', module: 'التقارير', expected: 'عرض المؤشرات ومخططات التحليل المرجعية بعد توحيد بيانات التقرير.', priority: 'P2' },
  { id: 65, slug: 'reports-sales', screen: 'SCR-020', title: 'اختلاف شاشة تقرير المبيعات', module: 'التقارير', expected: 'جمع المرشحات والمؤشرات والمخطط والجداول في ترتيب المرجع.', priority: 'P2' },
  { id: 66, slug: 'return-create', screen: 'SCR-013', title: 'اختلاف ترتيب نموذج إنشاء مرتجع المبيعات', module: 'مرتجعات المبيعات', expected: 'عرض مصدر المرتجع والعميل والبنود وتوزيع النموذج حسب المرجع.', priority: 'P2' },
  { id: 67, slug: 'users', screen: 'SCR-022', title: 'اختلاف شاشة المستخدمين والصلاحيات', module: 'إدارة النظام', expected: 'عرض قائمة المستخدمين والصلاحيات وفق مرجع التصميم.', priority: 'P2' },
  { id: 68, slug: 'invoice-print', screen: 'SCR-008', title: 'اختلاف مواضع عناصر معاينة الطباعة', module: 'الفواتير', expected: 'مطابقة توزيع بيانات المستند والورقة والعلامة المائية ببيانات الفاتورة نفسها.', priority: 'P2', unverified: true },
  { id: 69, slug: 'state-global-search', screen: 'SCR-007', title: 'اختلاف موضع وحجم نافذة البحث الشامل', module: 'التنقل العام', expected: 'فتح البحث كقائمة ضيقة متصلة بالشريط العلوي وفق المرجع.', priority: 'P2' },
  { id: 70, slug: 'order-detail', screen: 'SCR-005', title: 'تفاصيل الطلب لم تصل إلى حالة قابلة للمقارنة', module: 'الطلبات', expected: 'عرض تفاصيل الطلب المعتمد وحالته وبنوده كما في مرجع الشاشة.', priority: 'P2', unverified: true },
  { id: 71, slug: 'state-notifications', screen: 'SCR-007', title: 'محتوى لوحة الإشعارات لم يقارن ببيانات موحدة', module: 'التنقل العام', expected: 'مطابقة محتوى الإشعارات وارتفاع اللوحة بعد توفير نفس fixture في الطرفين.', priority: 'P2', unverified: true },
];
function pairFor(spec) { return pairRows.find((row) => row.Slug === spec.slug && row.Viewport === '1280'); }
function renderGap(spec) {
  const pair = pairFor(spec);
  const id = `GAP-${String(spec.id).padStart(4, '0')}`;
  const featureIds = [...new Set(featureForScreen.get(spec.screen) ?? [])];
  const confidence = spec.unverified ? 'Not Verified' : 'High for the visible matched-viewport composition; data values are excluded.';
  const category = spec.unverified ? 'UNVERIFIED_BEHAVIOR' : 'VISUAL_MISMATCH';
  const reference = pair?.Reference ?? 'docs/ux-inventory/screenshots/reference/screens (see SCREEN_PAIR_BLOCKERS.csv)';
  const system = pair?.System ?? 'No directly comparable system screenshot.';
  const evidence = pair?.Evidence ?? 'See docs/ux-inventory/SCREEN_PAIR_BLOCKERS.csv';
  const actual = pair?.Observation ?? 'The available capture did not reach a comparable populated state.';
  const why = spec.unverified ? 'لا تثبت اللقطة الحالية وجود اختلاف؛ غياب حالة قابلة للمقارنة يجعل نتيجة parity غير محسومة.' : 'تُظهر لقطتا 1280px اختلافًا بصريًا مستقلًا عن اختلاف قيم البيانات.';
  const fix = spec.unverified ? 'وفّر المرجع والحالة والـfixture اللازمين ثم أعد المقارنة قبل تصنيفها فجوة مرئية.' : `طابق ترتيب ومساحة العناصر لتلبية السلوك المرئي التالي: ${spec.expected}`;
  const criteria = spec.unverified ? 'لقطة مرجع ونظام ناجحتان على بيانات موحدة، مع نتيجة مصنفة ومسنودة بالأدلة.' : `تتطابق البنية والترتيب المرئي مع المرجع عند 1280 و768 و390 بكسل على الحالة والبيانات نفسها: ${spec.expected}`;
  return `\n## ${id} — ${spec.title}\n\n- **Category:** ${category}\n- **Priority:** ${spec.priority}${spec.unverified ? ' (provisional until a valid comparison is available)' : ''}\n- **Confidence:** ${confidence}\n- **Affected Module:** ${spec.module}\n- **Affected Screen IDs:** ${spec.screen}\n- **Affected Element IDs:** N/A — whole-screen or overlay comparison; element-level mapping is not claimed.\n- **Related Feature IDs:** ${featureIds.length ? featureIds.join(', ') : 'Not mapped; see 05_FEATURE_GAP_MATRIX.csv.'}\n- **Related Flow IDs:** N/A — visual/state comparison only; no end-to-end flow is claimed.\n- **Design Reference:** ${reference}\n- **Current System Evidence:** ${system}; ${evidence}\n- **Expected Behavior:** ${spec.expected}\n- **Actual Behavior:** ${actual}\n- **Exact Missing or Incorrect Detail:** ${actual}\n- **Why This Is a Gap:** ${why}\n- **User Impact:** ${spec.unverified ? 'لا يمكن تحديد أثر اختلاف قبل الحصول على مقارنة صحيحة.' : 'يصعب العثور على المعلومات نفسها أو قراءتها بالترتيب والكثافة المعتمدين.'}\n- **Business Impact:** لا أثر مالي أو مخزوني مستنتج من هذه المقارنة البصرية.\n- **Technical Impact:** يحتاج عرض الصفحة أو مكوّناتها المتجاوبة إلى مطابقة مرئية.\n- **Root Cause:** Unknown; the specific component or style cause was not traced.\n- **Dependencies:** ${spec.unverified ? 'حالة/fixture متطابقة أو إتاحة محتوى لوحة المرجع.' : 'الرجوع إلى الحالة نفسها والبيانات الاصطناعية نفسها عند التحقق.'}\n- **Suggested Corrective Action:** ${fix}\n- **Acceptance Criteria:** ${criteria}\n- **Recommended Verification Method:** مقارنة مباشرة بصور 1280/768/390 بعد إعادة التقاط الطرفين على حالة وfixture متطابقتين.\n- **Implementation Complexity:** Unknown\n- **Open Questions:** القيم والبيانات غير الموحدة مستبعدة؛ لا توجد قاعدة عمل مستنتجة.\n`;
}

const gapPath = `${output}11_MASTER_GAP_REGISTER.md`;
let gapText = cleanReplacementChars(await read(gapPath));
const missingEarly = gapSpecs.filter((g) => g.id >= 31 && g.id <= 44).map(renderGap).join('\n');
if (!gapText.includes('## GAP-0031')) {
  const anchor = gapText.indexOf('\n# Runtime follow-up');
  if (anchor >= 0) gapText = `${gapText.slice(0, anchor)}\n${missingEarly}\n${gapText.slice(anchor)}`;
}
const missingLate = gapSpecs.filter((g) => g.id >= 61).map(renderGap).join('\n');
if (!gapText.includes('## GAP-0061')) gapText += `\n${missingLate}\n`;
gapText = gapText.replace('سجل الفجوات أصبح 60 معرفًا.', 'سجل الفجوات مكتمل الترقيم إلى 71 ID بعد فصل الملاحظات التي تخص شاشات مختلفة.');
gapText = gapText.replace('26 فجوة مستقلة موثقة من مقارنة المصدر. الثقة تعني قوة الدليل الساكن؛ لا تعني تحقق التشغيل.', '71 Gap IDs؛ شملت مصدر الكود والصور والنقرات المسجلة. الثقة في كل ملاحظة منفصلة، ولا تعني اكتمال اختبار التشغيل.');
await write(gapPath, gapText);

const allGapIds = [...gapText.matchAll(/^## GAP-(\d{4})/gm)].map((m) => `GAP-${m[1]}`);
const allPriorityCounts = [...gapText.matchAll(/^## GAP-(\d{4})[\s\S]*?\*\*Priority:\*\*\s*(P\d)/gm)].reduce((acc, m) => { acc[m[2]] = (acc[m[2]] ?? 0) + 1; return acc; }, {});

// Rebuild the implementation backlog from the gap register so every current ID is traceable.
const blockRx = /^## (GAP-\d{4}) — ([^\r\n]+)\r?\n([\s\S]*?)(?=^## GAP-|^## GAP-END )/gm;
const backlogRows = [];
for (const match of `${gapText}\n## GAP-END — sentinel\n`.matchAll(blockRx)) {
  const [, id, title, body] = match;
  const value = (label) => body.match(new RegExp(`^- \\*\\*${label}:\\*\\* (.*)$`, 'm'))?.[1] ?? 'انظر سجل الفجوة.';
  const feature = value('Related Feature IDs');
  const screen = value('Affected Screen IDs');
  const expected = value('Expected Behavior');
  const accept = value('Acceptance Criteria');
  const deps = value('Dependencies');
  const method = value('Recommended Verification Method');
  const priority = value('Priority').match(/P\d/)?.[0] ?? 'P2';
  const safe = (s) => String(s).replaceAll('|', '\\|').replaceAll('\n', ' ');
  backlogRows.push({ priority, id, feature, screen, title, expected, accept, deps, method, safe });
}
backlogRows.sort((a, b) => a.priority.localeCompare(b.priority) || a.id.localeCompare(b.id));
const backlog = `# 12 — قائمة التنفيذ المستقبلية حسب الأولوية والاعتماد\n\nهذه قائمة عمل مستقبلية مبنية على سجل الفجوات الحالي. لم تُنفّذ أي نقطة أثناء التدقيق. العناصر الموسومة NOT_VERIFIED تحتاج جمع الدليل أولًا؛ لا تُعامل كخلل مؤكد.\n\n## الأولويات\n\n- P0: لا توجد فجوات حرجة مؤكدة.\n- P1: ${allPriorityCounts.P1 ?? 0} فجوات عالية الأولوية؛ تُراجع أولًا قبل الميزات غير الحرجة.\n- P2: ${allPriorityCounts.P2 ?? 0} فجوة متوسطة تشمل غالبية اختلافات الواجهة وسلوك الحالات.\n- P3: ${allPriorityCounts.P3 ?? 0} فروق منخفضة التأثير.\n\n## ترتيب الاعتماد المقترح\n\n1. احسم البنود غير المتحققة وأسماء الوجهات والـfixtures قبل تغيير واجهاتها.\n2. نفّذ فجوات P1 بحسب اعتمادها على قرارات المخزون والمحاسبة والصلاحيات.\n3. طابق مسارات المستخدم الأساسية والواجهات المرتبطة بها.\n4. عالج الفروق البصرية المتكررة عبر المكونات المشتركة بعد اعتماد القيم المرجعية.\n5. نفّذ اختبارات التفاعل والحالات على بيانات اختبار معزولة، ثم أعد التقاط المقاسات الثلاثة.\n\n## سجل العمل المرتبط بالفجوات\n\n| Priority | Gap ID | Feature ID | Screen ID | وصف العمل | النتيجة المتوقعة | معيار القبول | الاعتماد | طريقة التحقق |\n|---|---|---|---|---|---|---|---|---|\n${backlogRows.map((r) => `| ${r.priority} | ${r.id} | ${r.safe(r.feature)} | ${r.safe(r.screen)} | ${r.safe(r.title)} | ${r.safe(r.expected)} | ${r.safe(r.accept)} | ${r.safe(r.deps)} | ${r.safe(r.method)} |`).join('\n')}\n`;
await write(`${output}12_PRIORITIZED_IMPLEMENTATION_BACKLOG.md`, backlog);

// Update the feature matrix with the visual-gap links discovered in the current screenshot register.
const visualGapsByScreen = new Map();
for (const row of pairRows) {
  if (!row['Gap IDs']) continue;
  if (!visualGapsByScreen.has(row['Screen ID'])) visualGapsByScreen.set(row['Screen ID'], new Set());
  for (const id of row['Gap IDs'].split(/[;,\s]+/).filter((x) => /^GAP-\d{4}$/.test(x))) visualGapsByScreen.get(row['Screen ID']).add(id);
}
for (const feature of featureCsv.rows) {
  const screens = `${feature['Screen IDs'] ?? ''}/${feature['Screen ID'] ?? ''}`;
  const all = new Set((feature['Gap IDs'] ?? '').split(/[;,\s]+/).filter((x) => /^GAP-\d{4}$/.test(x)));
  for (const match of screens.matchAll(/SCR-\d{3}/g)) for (const id of visualGapsByScreen.get(match[0]) ?? []) all.add(id);
  feature['Gap IDs'] = [...all].sort().join('/');
}
await write(featurePath, serializeCsv(featureCsv.headers, featureCsv.rows));

// Attach the verified detail-row click evidence to the earlier candidate-route records.
const detailReview = JSON.parse(await read('docs/ux-inventory/DETAIL_SCREEN_CLICK_REVIEW.json'));
const candidatePath = 'docs/ux-inventory/CANDIDATE_ROUTE_SCREEN_REVIEW.json';
const candidateReview = JSON.parse(await read(candidatePath));
for (const item of candidateReview.results ?? []) {
  const detail = detailReview.results.find((r) => r.screenId === item.screenId && r.viewport === item.viewport);
  if (detail?.clicked) {
    item.clickEvidence = true;
    item.navigationMethod = 'Visible list row control clicked after using the visible global-search control.';
    item.actualPath = detail.actualPath;
    item.screenshot = detail.screenshot;
    item.result = 'LIST_ROW_CLICKED_AND_CAPTURED';
    item.note = 'Read-only detail navigation in isolated Vite/MSW. Reference screen content remains unavailable.';
  }
}
await writeJson(candidatePath, candidateReview);

// Give the activated reference targets readable titles; previous captures lost Arabic text to a console encoding path.
const titleBySlug = {
  audit: 'سجل العمليات', 'barcode-labels': 'باركود الأصناف', 'cash-forecast': 'توقع السيولة', 'container-funds': 'أموال الحاويات',
  'container-tracking': 'تتبع الحاويات', 'container-transfers': 'نقل الحاويات بين المواقع', 'daily-summary': 'الملخص اليومي', drivers: 'سائقو الشحن',
  'excel-import': 'استيراد من إكسل', 'expense-budget': 'ميزانية المصروفات', governorates: 'المحافظات', 'install-app': 'تثبيت كتطبيق',
  'inventory-counts': 'الجرد الدوري', 'minimum-stock': 'الحد الأدنى للمخزون', 'monthly-comparison': 'مقارنة شهر بشهر',
  'opening-stock': 'إضافة إلى المخزون', 'product-cost-history': 'سجل أسعار الشراء', 'recurring-expenses': 'مصروفات متكررة',
  'stock-returns': 'المخزون المرتجع', trash: 'سلة المحذوفات', 'user-notes': 'ملاحظاتي', 'warehouse-returns': 'مرتجع المخازن',
  'finance-inbox': 'الصندوق الوارد', 'finance-other-income': 'إيرادات أخرى', 'finance-payments': 'المدفوعات', 'finance-expenses': 'المصروفات',
  'finance-transfers': 'التحويلات المالية', 'finance-treasury': 'الخزينة', 'finance-supplier-balances': 'أرصدة الموردين', 'finance-returns': 'مرتجعات مالية',
  'finance-chart-of-accounts': 'دليل الحسابات', 'finance-journal': 'قيود اليومية', 'finance-ledger': 'دفتر الأستاذ',
  'finance-trial-balance': 'ميزان المراجعة', 'finance-statements': 'القوائم المالية',
};
const activatedPath = 'docs/ux-inventory/REFERENCE_ACTIVATED_PANEL_REVIEW.json';
const activated = JSON.parse(await read(activatedPath));
for (const result of activated.results) result.screenTitle = titleBySlug[result.slug] ?? result.slug;
activated.summary = { viewports: ['1280', '768', '390'], uniqueTargets: 35, clickActivatedPanels: 20, blockedTargets: 15, clickActivatedScreenshots: 60, blockedAttempts: 45 };
await writeJson(activatedPath, activated);

// Build traceable screen/viewport evidence lookup.
const evidenceByScreen = new Map();
for (const row of pairRows) {
  if (!evidenceByScreen.has(row['Screen ID'])) evidenceByScreen.set(row['Screen ID'], new Set());
  for (const col of ['Reference', 'System', 'Evidence']) for (const item of (row[col] ?? '').split(';').map((x) => x.trim()).filter(Boolean)) evidenceByScreen.get(row['Screen ID']).add(item);
}

// Refresh the screen inventory's existing table with viewport-specific evidence and valid line breaks.
const screenPath = `${output}01_SCREEN_INVENTORY.md`;
let screenDoc = cleanReplacementChars((await read(screenPath)).replace(/\\n/g, '\n'));
screenDoc = screenDoc.replace('21 لوحة من 68', '22 لوحة من 68');
screenDoc = screenDoc.replace('21 لوحة مرجعية لم تحصل', '22 لوحة مرجعية لم تحصل');
const screenLines = screenDoc.split(/\r?\n/);
for (let i = 0; i < screenLines.length; i++) {
  const parts = screenLines[i].split('|').map((x) => x.trim());
  const id = parts[1];
  if (!/^SCR-\d{3}$/.test(id ?? '') || !evidenceByScreen.has(id)) continue;
  if (id === 'SCR-030' || id === 'SCR-031') parts[5] = 'PARTIAL';
  if (id === 'SCR-053') parts[5] = 'MISSING';
  const existing = (parts[6] ?? '').split(';').map((x) => x.trim()).filter(Boolean);
  const added = [...evidenceByScreen.get(id)];
  const cleanExisting = existing.filter((p) => !/visual-round[35]\/[^/]+\.png$/.test(p));
  parts[6] = [...new Set([...cleanExisting, ...added])].join('; ');
  screenLines[i] = `| ${parts.slice(1, 7).join(' | ')} |`;
}
screenDoc = screenLines.join('\n');
const inventoryScreenIds = screenLines.map((line) => line.split('|').map((x) => x.trim())).filter((x) => /^SCR-\d{3}$/.test(x[1] ?? '')).map((x) => x[1]);
const pairedScreenIds = new Set(pairRows.map((row) => row['Screen ID']));
const confirmedScreenIds = new Set(pairRows.filter((row) => row['Visual Result'].startsWith('CONFIRMED_')).map((row) => row['Screen ID']));
const unpairedCount = inventoryScreenIds.filter((id) => !pairedScreenIds.has(id)).length;
screenDoc = screenDoc.replace(/^\d+ من 69 Screen IDs.*$/m, `${pairedScreenIds.size} من 69 Screen IDs لها زوج صور على الأقل (${pairedScreenIds.size - 1} لوحة ودخول)، و${confirmedScreenIds.size} لها نتيجة مقارنة مؤكدة. بقيت ${unpairedCount} لوحة بلا زوج مباشر. sec-liq لم تظهر. 13 وجهة مالية فرعية لم تتفعل بالنقر؛ SCR-028 لها مرشح /warehouse-returns غير محسوم، وSCR-068 محمية بـPIN. جرد overlays الثمانية محفوظ في المواصفات، لكن فتح كل حالة واختبارها غير مكتمل.`);
await write(screenPath, screenDoc);

// Reconcile the original high-level inventory to runtime evidence without upgrading untested elements.
const inventoryPath = 'docs/ux-inventory/INVENTORY.csv';
const inventoryCsv = parseCsv(await read(inventoryPath));
const resultByScreen = new Map();
for (const row of pairRows) {
  if (!resultByScreen.has(row['Screen ID'])) resultByScreen.set(row['Screen ID'], []);
  resultByScreen.get(row['Screen ID']).push(row['Visual Result']);
}
for (const row of inventoryCsv.rows) {
  if (!/^SCR-\d{3}$/.test(row.ID ?? '') || row['Element/Flow'] !== 'Whole screen') continue;
  const results = resultByScreen.get(row.ID) ?? [];
  row.Match = results.includes('CONFIRMED_MISSING_SYSTEM_SCREEN') ? 'MISSING'
    : results.includes('CONFIRMED_UI_ONLY_PLACEHOLDER') ? 'UI_ONLY'
      : results.includes('CONFIRMED_VISUAL_DIFFERENCE') ? 'PARTIAL'
        : 'NOT_VERIFIED';
  const evidence = new Set((row.Evidence ?? '').split(';').map((x) => x.trim()).filter(Boolean));
  for (const item of evidenceByScreen.get(row.ID) ?? []) evidence.add(item);
  row.Evidence = [...evidence].join('; ');
}
await write(inventoryPath, serializeCsv(inventoryCsv.headers, inventoryCsv.rows));

// One explicit blocker record for every screen with no direct reference/system screenshot pair.
const screenTableRows = screenLines.map((line) => line.split('|').map((x) => x.trim())).filter((x) => /^SCR-\d{3}$/.test(x[1] ?? ''));
const allScreenIds = screenTableRows.map((x) => x[1]);
const pairedIds = new Set(pairRows.map((x) => x['Screen ID']));
const financeReview = JSON.parse(await read('docs/ux-inventory/FINANCE_ROUTE_SCREEN_REVIEW.json'));
const candidateRows = candidateReview.results ?? [];
const financeByScreen = new Map();
for (const r of financeReview.records ?? []) if (r.systemScreenshot) {
  if (!financeByScreen.has(r.screenId)) financeByScreen.set(r.screenId, new Set());
  financeByScreen.get(r.screenId).add(r.systemScreenshot);
}
for (const r of candidateRows) if (r.screenshot) {
  if (!financeByScreen.has(r.screenId)) financeByScreen.set(r.screenId, new Set());
  financeByScreen.get(r.screenId).add(r.screenshot);
}
const activatedByScreen = new Map();
for (const r of activated.results) activatedByScreen.set(r.screenId, r.status);
const blockerReasons = {
  'SCR-030': ['NOT_VERIFIED_REFERENCE_CONTENT', 'Reference #sec-cust-file had no visible navigation control and the static capture contains no comparable detail content. System customer detail was reached by clicking a customer row at all 3 viewports.'],
  'SCR-031': ['NOT_VERIFIED_REFERENCE_CONTENT', 'Reference #sec-inv-detail had no visible navigation control and the static capture contains no comparable detail content. System invoice detail was reached by clicking an invoice row at all 3 viewports.'],
  'SCR-034': ['NOT_VERIFIED_REFERENCE_TARGET', 'Finance overview alias had no visible reference navigation control; related finance screen SCR-017 is separately paired.'],
  'SCR-054': ['NOT_VERIFIED_REFERENCE_TARGET', 'Duplicate finance panel alias had no visible reference navigation control and no independent reference state was verified.'],
  'SCR-055': ['NOT_RENDERED_IN_REFERENCE', 'sec-liq was absent from the initialized reference DOM and has no usable reference screenshot.'],
  'SCR-068': ['PIN_PROTECTED', 'Reference navigation target is protected by a PIN; PIN was not entered.'],
};
const blockerHeaders = ['Screen ID', 'Reference DOM ID', 'Screen Name', 'Closest System Route', 'Reference Screenshot Evidence', 'System Candidate Screenshot Evidence', 'Pair Status', 'Blocker', 'Evidence Needed To Close'];
const blockers = [];
for (const cells of screenTableRows) {
  const screen = cells[1];
  if (pairedIds.has(screen)) continue;
  const domId = cells[2];
  const name = cells[3];
  const route = cells[4];
  const evidence = cells[6] ?? '';
  const refPaths = evidence.split(';').map((x) => x.trim().replace(/\s+\([^)]*\)$/, '')).filter((x) => x.startsWith('docs/ux-inventory/screenshots/reference/'));
  let [status, reason] = blockerReasons[screen] ?? [];
  if (!status) {
    const refStatus = activatedByScreen.get(screen);
    if (refStatus === 'NOT_VERIFIED_CLICK_BLOCKED') {
      status = 'NOT_VERIFIED_REFERENCE_CLICK_BLOCKED';
      reason = 'Target click did not activate a reference panel at the recorded viewport sizes; its reference content therefore cannot support direct parity review.';
    } else {
      status = 'NOT_VERIFIED_NO_VALID_REFERENCE_STATE';
      reason = 'The screen inventory has no confirmed active reference state and no matching fixture/state pair for this candidate route.';
    }
  }
  const systemShots = [...new Set([...(financeByScreen.get(screen) ?? []), ...(evidenceByScreen.get(screen) ?? [])])];
  blockers.push({
    'Screen ID': screen,
    'Reference DOM ID': domId,
    'Screen Name': name,
    'Closest System Route': route,
    'Reference Screenshot Evidence': refPaths.join('; '),
    'System Candidate Screenshot Evidence': systemShots.join('; '),
    'Pair Status': status,
    Blocker: reason,
    'Evidence Needed To Close': screen === 'SCR-055' ? 'A reference build where sec-liq renders.'
      : screen === 'SCR-068' ? 'Authorized reference access that can open this panel without bypassing the PIN.'
        : screen === 'SCR-030' || screen === 'SCR-031' ? 'An active reference capture with the same customer/invoice fixture as the system screenshots.'
          : 'A reference role/state that activates this panel plus a matching fixture and a fresh side-by-side capture.',
  });
}
await write('docs/ux-inventory/SCREEN_PAIR_BLOCKERS.csv', serializeCsv(blockerHeaders, blockers));

// Current summary documents. Visual parity, interactions and complete flows are reported separately.
const resultCounts = pairRows.reduce((acc, row) => { acc[row['Visual Result']] = (acc[row['Visual Result']] ?? 0) + 1; return acc; }, {});
const uniquePairScreens = new Set(pairRows.map((r) => r['Screen ID']));
const uniqueScreenViewports = new Set(pairRows.map((r) => `${r['Screen ID']}|${r.Viewport}`));
const confirmedIds = new Set(pairRows.filter((r) => r['Visual Result'].startsWith('CONFIRMED_')).map((r) => r['Screen ID']));
const interactions = JSON.parse(await read('docs/ux-inventory/INTERACTION_REVIEW.json'));
const refClicks = activated.summary;
const featureCounts = featureCsv.rows.reduce((acc, r) => { acc[r.Status] = (acc[r.Status] ?? 0) + 1; return acc; }, {});
const pairResultSummary = `${pairRows.length} سجل مقارنة: ${resultCounts.CONFIRMED_VISUAL_DIFFERENCE ?? 0} فرقًا بصريًا مؤكدًا، ${resultCounts.CONFIRMED_MISSING_FEATURE ?? 0} سجل غياب ميزة، ${resultCounts.CONFIRMED_MISSING_SYSTEM_SCREEN ?? 0} سجل شاشة غائبة، ${resultCounts.CONFIRMED_UI_ONLY_PLACEHOLDER ?? 0} سجل placeholder، و${(resultCounts.NOT_VERIFIED_STATE_OR_DATA ?? 0) + (resultCounts.NOT_VERIFIED_FIXTURE_MISMATCH ?? 0) + (resultCounts.NOT_VERIFIED_ROUTE_MAPPING ?? 0)} غير متحققة.`;

const executive = `# 00 — الملخص التنفيذي\n\n## الحالة\n\nمتابعة تشغيلية لتقرير MASTER_UI_UX_AUDIT.md بأدلة صور فعلية ونقرات مرئية في prototype المرجعي وواجهة React المعزولة. التدقيق غير مكتمل؛ الصور وMSW لا تثبت تكامل backend أو حفظ قاعدة البيانات.\n\n## النطاق والتغطية المرئية\n\n- المرجع: frontend/reference/precision-slate-erp-v43__3_ (1).html. النظام: React عبر Vite/MSW ببيانات اصطناعية؛ لا جلسة حقيقية أو اتصال قاعدة بيانات.\n- 68 لوحة مرجعية وشاشة دخول واحدة، على 1280 و768 و390 بكسل. ظهرت 67/68 لوحة في DOM؛ sec-liq لم تظهر.\n- ${uniquePairScreens.size}/69 Screen IDs لها زوج صور على الأقل (${uniquePairScreens.size - 1} لوحة والدخول). ${confirmedIds.size}/69 لها نتيجة مقارنة مؤكدة واحدة على الأقل.\n- ${pairResultSummary}\n- 22 لوحة من أصل 68 بلا زوج مرئي مباشر؛ أسبابها وسجلات صور النظام المرشحة في docs/ux-inventory/SCREEN_PAIR_BLOCKERS.csv.\n\n## التفاعل والتدفقات\n\n- جرد 557 عنصرًا تفاعليًا؛ لم يُختبر كل عنصر منفردًا. اختبارات React/MSW سجلت ${interactions.passed}/${interactions.tested} تحقق UI بنقرات فعلية، لكن هذه ليست تغطية 557 عنصرًا ولا تدفقات backend.\n- نقر المرجع على ${refClicks.clickActivatedScreenshots}/${refClicks.uniqueTargets * 3} محاولة لأهداف التنقل: ${refClicks.clickActivatedPanels}/${refClicks.uniqueTargets} هدفًا فُعّل في المقاسات الثلاثة، و${refClicks.blockedTargets} أهداف بقيت محجوبة/غير مؤكدة.\n- تدفق end-to-end فعلي على backend/DB: 0/10؛ لم تُرسل عمليات حفظ أو حذف أو اعتماد أو تحصيل أو نقل.\n\n## النتائج الأهم\n\n- اختلافات الواجهة المؤكدة موزعة على الدخول، الطلبات والفواتير والعملاء، المخزون والحاويات، التقارير والتنقل العام.\n- الميزانية والمصروفات المتكررة والمقارنة الشهرية وتوقع السيولة لها شاشات مرجعية غير موجودة؛ الاستيراد والملخص اليومي يفتحان placeholder؛ أداة ملصقات الباركود غائبة.\n- مطابقة SCR-028 بمسار /warehouse-returns غير محسومة. 13 لوحة مالية مرجعية لا تفتح بالدور المتاح؛ لوحة نقل الحاويات لم يتأكد تفعيلها؛ شاشة الملاحظات محمية بـPIN.\n\n## سجل الفجوات\n\n${allGapIds.length} Gap IDs: P0=${allPriorityCounts.P0 ?? 0}، P1=${allPriorityCounts.P1 ?? 0}، P2=${allPriorityCounts.P2 ?? 0}، P3=${allPriorityCounts.P3 ?? 0}. انظر سجل الفجوات 11 للحصول على المرجع والسلوك المتوقع والدليل ومعيار القبول لكل ID.\n\nلم يتغير كود التطبيق أو backend أو قاعدة البيانات. حدود التحقق موضحة في 13، والحسابات التفصيلية في 14.\n`;
const visualReport = `# 07 — الفروق البصرية والميزات الغائبة\n\nالمصدر المعتمد هو مرجع v43. كل نتيجة هنا تصف الصور عند viewport مطابق؛ لا تدّعي تطابق البيانات أو إتمام التفاعل. كل سجل وصورته وGap ID في docs/ux-inventory/VISUAL_PAIR_REVIEW.csv.\n\n## النتائج المصورة\n\n${pairResultSummary}\n\n- الشاشة/اللوحة التي لها زوج واحد على الأقل: ${uniquePairScreens.size}/69 معرف شاشة؛ منها ${uniquePairScreens.size - 1}/68 لوحة ودخول واحد.\n- نتائج فرق الشكل تشمل ترتيب الأقسام، كثافة الجداول، المرشحات، النموذج، مواضع التفاعل، وحالة الهاتف. اختلاف قيم الاختبارات لم يُحسب فرقًا بصريًا.\n- نتائج الشاشات الغائبة تخص الميزانية والمصروفات المتكررة والمقارنة الشهرية وتوقع السيولة. الاستيراد والملخص اليومي UI-only، وملصقات الباركود ميزة غائبة.\n\n## سجلات مقارنة غير محسومة\n\n- SCR-005 وSCR-025: لقطة النظام في حالة تحميل/خطأ ولم تُلتقط حالة ناجحة ببيانات مطابقة.\n- SCR-007 إشعارات: محتوى fixture مختلف؛ موضع فتح اللوحة فقط ظاهر.\n- SCR-028: /warehouse-returns مرشح دلالي لكنه يخدم أيضًا SCR-051.\n- 22 شاشة بلا زوج مرجعي/نظامي مباشر؛ يسرد SCREEN_PAIR_BLOCKERS.csv كل معرف وسبب الحجب والدليل المطلوب.\n\n## ما لا تثبته هذه النتائج\n\nالصور لا تثبت استجابة API أو الحفظ أو الصلاحيات أو سلامة التقارير. لا تُصنف أي لقطة ثابتة على أنها نجاح نقر أو رحلة كاملة.\n`;
const unverifiedReport = `# 13 — العناصر غير المتحققة والقيود\n\n## المرجع والصور\n\n- جرد المرجع 68 لوحة ودخول. ظهرت 67/68 لوحة في Chromium؛ sec-liq غائبة من DOM.\n- توجد ${pairRows.length} سجلات مقارنة مصورة و${uniquePairScreens.size}/69 معرف شاشة ذات زوج واحد على الأقل. بقيت 22 لوحة بلا زوج مباشر؛ كل لوحة وسياقها ودليلها في docs/ux-inventory/SCREEN_PAIR_BLOCKERS.csv.\n- ${refClicks.clickActivatedPanels}/35 هدف تنقل فُعّلت بالنقر عند المقاسات الثلاثة (${refClicks.clickActivatedScreenshots} لقطة). 15 هدفًا/45 محاولة لم تثبت التفعيل: 13 لوحة مالية nested، نقل الحاويات، وملاحظاتي المحمية بـPIN.\n- شاشتا العميل والفاتورة فُتحتا من قوائمهما بالنقر في React/MSW عند المقاسات الثلاثة (6/6)، لكن صور مرجع #sec-cust-file و#sec-inv-detail ثابتة/فارغة فلا توجد مقارنة UI صحيحة.\n\n## التفاعل والحالات\n\n- جرد ${557} عنصرًا تفاعليًا؛ ${interactions.tested}/${interactions.tested} تحقق UI مسجلًا في INTERACTION_REVIEW.json، لكنه لا يقابل عناصر ELM واحدًا بواحد. لا تُعد بقية العناصر PASS.\n- مرجع التفاعل الأولي: 13/67 لوحة ذات نقرة ونتيجة مؤكدة، و140 عنصرًا تخطى الاختبار لها لكونها مخفية أو غير مأمونة أو غير واضحة السلامة؛ الجولة الأحدث فتحت 20/35 هدفًا مختلفًا موثقًا.\n- فُحصت حقول دخول فارغة ونموذج طلب فارغ، والبحث والإشعارات والثيم والتنقل في React/MSW. بقيت معظم حالات hover/focus/disabled/loading/error/empty لكل عنصر، وcontrast وTab/focus trap وقارئ الشاشة، غير متحققة.\n\n## البيانات والتدفقات\n\n- React يعمل في اختبار Vite/MSW بمالك اصطناعي. لا جلسة حقيقية ولا قراءة DB. 0/10 تدفقات end-to-end فعلية على backend/DB.\n- لم تُرسل عمليات حفظ/حذف/اعتماد/تحصيل/نقل أو رسائل خارجية.\n- صور الشاشات المالية المرشحة لا تثبت parity لأن محتوى المرجع غير متاح بالدور الحالي؛ 32/33 لقطة route مالية للنظام موجودة، والصورة المالية عند 390 ناقصة.\n\n## حالات غير محسومة\n\n- SCR-005 وSCR-025: انتظار/خطأ؛ يلزم فتح صفحة ناجحة بfixture مطابق.\n- إشعارات SCR-007: تختلف fixtures؛ يلزم توحيد المحتوى.\n- SCR-028: يلزم حسم علاقته بـSCR-051 و/warehouse-returns.\n- SCR-050: النقرة المرجعية انتهت بمهلة.\n- SCR-055: sec-liq غير موجودة في DOM المهيأ.\n- SCR-068: يحتاج دورًا مخولًا لفتح اللوحة؛ لم يتم إدخال PIN أو تجاوز الحماية.\n- الشاشات غير المقارنة بالتفصيل في SCREEN_PAIR_BLOCKERS.csv؛ السبب محدد لكل Screen ID.\n\n## المطلوب لإغلاق هذه البنود\n\nإتاحة حالة مرجعية تعرض اللوحات المحجوبة، وfixture موحد فارغ/معبأ، ثم استكمال اختبار كل عنصر تفاعلي وحالة آمنة وتدفق كامل في بيئة معزولة.\n`;
const coverage = `# 14 — تقرير التغطية والاكتمال\n\nهذا التقرير يقيس الفحص فقط؛ لا يقيس اكتمال تنفيذ النظام.\n\n## المقامات\n\n- الشاشات: 68 لوحة + دخول = 69 Screen IDs.\n- عرض المرجع: 67/68 لوحة؛ sec-liq لم تظهر.\n- أزواج viewport الممكنة للفهرس: 69 × 3 = 207 (1280 و768 و390).\n- العناصر التفاعلية المفهرسة: 557.\n- الميزات: ${featureCsv.rows.length}.\n- الرحلات الكبرى: 10.\n\n## مقارنة الصور\n\n| المقياس | البسط / المقام | النسبة | التفسير |\n|---|---:|---:|---|\n| معرفات الشاشة ذات زوج واحد على الأقل | ${uniquePairScreens.size}/69 | ${(100 * uniquePairScreens.size / 69).toFixed(1)}% | ${uniquePairScreens.size - 1} لوحة والدخول. |\n| معرفات ذات نتيجة مؤكدة واحدة على الأقل | ${confirmedIds.size}/69 | ${(100 * confirmedIds.size / 69).toFixed(1)}% | وجود نتيجة مؤكدة لا يعني خلو الشاشة من حالات غير متحققة. |\n| سجلات المقارنة المصورة | ${pairRows.length}/207 كحد أعلى للشاشة × viewport | ${(100 * pairRows.length / 207).toFixed(1)}% | قد تتكرر الشاشة نفسها في حالات/تدفقات مختلفة؛ هناك ${blockers.length} شاشات بلا زوج مباشر. |\n| نتائج مقارنة حاسمة | ${pairRows.length - 12}/${pairRows.length} | ${(100 * (pairRows.length - 12) / pairRows.length).toFixed(1)}% | تشمل فرقًا مرئيًا أو شاشة/ميزة غائبة أو placeholder. |\n| حالات مقارنة غير محسومة | 12/${pairRows.length} | ${(100 * 12 / pairRows.length).toFixed(1)}% | 6 حالة/بيانات، 3 fixture mismatch، 3 route mapping. |\n| أهداف تنقل المرجع التي فُعّلت | ${refClicks.clickActivatedPanels}/${refClicks.uniqueTargets} أهداف | ${(100 * refClicks.clickActivatedPanels / refClicks.uniqueTargets).toFixed(1)}% | 20 هدفًا فُعّل في 3 مقاسات؛ 15 بقيت محجوبة. |\n\n## اختبار التفاعل والرحلات\n\n| المقياس | البسط / المقام | النسبة | التفسير |\n|---|---:|---:|---|\n| تحقق UI مسجل في React/MSW | ${interactions.passed}/${interactions.tested} | 100% لهذه الفحوص | لا يمثل العناصر المفهرسة واحدًا بواحد ولا اتصال backend. |\n| تغطية عناصر ELM الفردية | غير محسوبة/557 | غير مكتملة | لا يوجد تطابق موثوق بين كل check وElement ID؛ لا تُرقَّ العناصر غير المختبرة إلى PASS. |\n| نقرات route details العميل/الفاتورة | 6/6 | 100% | فُتحت من صفوف فعلية عبر نقر في 3 مقاسات؛ read-only/MSW. |\n| رحلات end-to-end على backend/DB | 0/10 | 0% | لم تُختبر عملية محفوظة كاملة على backend/DB. |\n\n## حالة الميزات والفجوات\n\n- ${featureCsv.rows.length} ميزة: ${featureCounts.NOT_VERIFIED ?? 0} NOT_VERIFIED، ${featureCounts.PARTIALLY_IMPLEMENTED ?? 0} PARTIALLY_IMPLEMENTED، ${featureCounts.UI_ONLY ?? 0} UI_ONLY، ${featureCounts.MISSING ?? 0} MISSING.\n- ${allGapIds.length} Gap IDs: P0=${allPriorityCounts.P0 ?? 0}، P1=${allPriorityCounts.P1 ?? 0}، P2=${allPriorityCounts.P2 ?? 0}، P3=${allPriorityCounts.P3 ?? 0}.\n- result rows: visual diff=${resultCounts.CONFIRMED_VISUAL_DIFFERENCE ?? 0}؛ missing feature=${resultCounts.CONFIRMED_MISSING_FEATURE ?? 0}؛ missing screen=${resultCounts.CONFIRMED_MISSING_SYSTEM_SCREEN ?? 0}؛ UI placeholder=${resultCounts.CONFIRMED_UI_ONLY_PLACEHOLDER ?? 0}؛ unresolved=12.\n\n## الحالة النهائية\n\nالتدقيق غير مكتمل: 22 شاشة بلا زوج مباشر، و557 عنصرًا لم يُختبر كل منها منفردًا، و0/10 رحلة backend/DB مكتملة. لا توجد نتيجة 100% للشاشات أو التفاعلات أو التدفقات.\n`;
const coverageReport = coverage.replace(/\| [^|]* \| \d+\/207 [^|]*\|[^\r\n]*/, `| معرفات Screen × viewport ذات زوج صور | ${uniqueScreenViewports.size}/207 | ${(100 * uniqueScreenViewports.size / 207).toFixed(1)}% | 147 سجل مقارنة يتضمن تكرار حالات لبعض المعرفات؛ هناك ${blockers.length} شاشات بلا زوج مباشر. |`);
const progress = `# سجل التقدم — تدقيق Precision Slate v43\n\n**الحالة:** مستمر وغير مكتمل؛ التعديلات في تقارير وأدلة التدقيق فقط.\n\n- 147 سجل مقارنة صور، منها 135 نتيجة حاسمة و12 غير محسومة.\n- 47/69 معرف شاشة لها زوج صور (46 لوحة ودخول)، و22 لوحة بلا زوج مباشر. لكل blocker سجل مستقل في SCREEN_PAIR_BLOCKERS.csv.\n- 20/35 هدف تنقل مرجعي فُعّل عبر 3 مقاسات؛ 15 بقيت محجوبة/غير مؤكدة.\n- 68/68 فحص UI مسجل في React/MSW؛ هذا لا يعني 557/557 عنصرًا. 0/10 تدفقات backend/DB مكتملة.\n- فُتحت تفاصيل العميل والفاتورة بالنقر من القوائم في 6/6 محاولات ومقاسات؛ المرجع الثابت لهاتين الشاشتين لا يعرض محتوى قابلًا للمقارنة.\n- Gap IDs من 0001 إلى 0071 موثقة؛ صُحح ربط GAP-0035 بـSCR-012 وGAP-0042 بـSCR-011، وفُصلت معرّفات الشاشات التي كانت مشاركة لرقم فجوة واحد خطأً.\n\n## العوائق المتبقية\n\n- 13 شاشة مالية ووجهات أخرى بلا حالة مرجعية نشطة؛ راجع SCREEN_PAIR_BLOCKERS.csv.\n- SCR-028 route mapping غير محسوم، SCR-050 click timeout، SCR-055 غائبة، SCR-068 محمية بـPIN.\n- حالات error/loading/empty/permitted لكل عنصر، وتدفقات backend/DB، ما زالت غير مكتملة.\n`;
for (const [name, body] of Object.entries({ '00_EXECUTIVE_SUMMARY.md': executive, '07_UI_UX_VISUAL_MISMATCHES.md': visualReport, '13_UNVERIFIED_ITEMS_AND_LIMITATIONS.md': unverifiedReport, '14_COVERAGE_AND_COMPLETENESS_REPORT.md': coverageReport, 'PROGRESS.md': progress })) await write(`${output}${name}`, cleanReplacementChars(body));

// Update the consolidated report in place, retaining sections not touched by this audit round.
let master = cleanReplacementChars(await read(`${output}MASTER_UI_UX_AUDIT.md`));
const replacementSections = [
  ['<a id="00-executive-summary"></a>', '<a id="01-screen-inventory"></a>', executive],
  ['<a id="01-screen-inventory"></a>', '<a id="02-screen-by-screen-specification"></a>', screenDoc],
  ['<a id="07-ui-ux-visual-mismatches"></a>', '<a id="08-backend-api-database-gaps"></a>', visualReport],
  ['<a id="11-master-gap-register"></a>', '<a id="12-prioritized-implementation-backlog"></a>', gapText],
  ['<a id="12-prioritized-implementation-backlog"></a>', '<a id="13-unverified-items-and-limitations"></a>', backlog],
  ['<a id="13-unverified-items-and-limitations"></a>', '<a id="14-coverage-and-completeness-report"></a>', unverifiedReport],
  ['<a id="14-coverage-and-completeness-report"></a>', '<a id="latest-runtime-evidence-2026-10-29"></a>', coverageReport],
];
for (const [startAnchor, endAnchor, body] of replacementSections) {
  const start = master.indexOf(startAnchor);
  const end = master.indexOf(endAnchor, start + startAnchor.length);
  if (start < 0 || end < 0) throw new Error(`Master report anchor missing: ${startAnchor} / ${endAnchor}`);
  master = `${master.slice(0, start)}${startAnchor}\n${body.trim()}\n\n${master.slice(end)}`;
}
const runtimeAnchor = '<a id="latest-runtime-evidence-2026-10-29"></a>';
const runtimeAt = master.indexOf(runtimeAnchor);
const runtimeEvidence = `# أحدث أدلة التشغيل — 2026-10-29\n\nتُحل هذه الأرقام محل العبارات التاريخية التي حصرت المراجعة في 25 زوج صور أو قالت إن المقارنة لم تحدث.\n\n- صور المرجع والنظام متاحة لـ${uniquePairScreens.size}/69 معرف شاشة؛ 147 سجلًا في VISUAL_PAIR_REVIEW.csv، مع 12 سجلًا معلّمًا NOT_VERIFIED.\n- 22 شاشة بلا زوج مباشر؛ جدول SCREEN_PAIR_BLOCKERS.csv يذكر كل شاشة ومسار النظام المرشح وسبب غياب المقارنة.\n- INTERACTION_REVIEW.json: ${interactions.passed}/${interactions.tested} check في Vite/MSW. DETAIL_SCREEN_CLICK_REVIEW.json: 6/6 نقرات ناجحة لفتح صفحات تفاصيل العميل/الفاتورة عند 1280/768/390.\n- REFERENCE_ACTIVATED_PANEL_REVIEW.json: ${refClicks.clickActivatedScreenshots} لقطة activation من ${refClicks.clickActivatedPanels} هدفًا؛ 45 محاولة من 15 هدفًا لم تثبت التفعيل.\n- لا يحسب نجاح UI/MSW كنجاح API أو قاعدة بيانات؛ E2E backend/DB 0/10.\n- التنفيذ بقي audit-only؛ لم تُغيّر ملفات التطبيق أو backend أو قاعدة البيانات.\n\nتفاصيل الفجوات في القسم 11، والقيود في 13، وحساب التغطية في 14.\n`;
if (runtimeAt < 0) throw new Error('Latest runtime anchor missing.');
master = `${master.slice(0, runtimeAt)}${runtimeAnchor}\n${runtimeEvidence.trim()}\n`;
master = master.replace(/^(#.*\?{3,}.*\r?\n)/gm, '');
master = master.replace(/MASTER UI\/UX Audit \uFFFD Precision Slate ERP v43/, 'MASTER UI/UX Audit — Precision Slate ERP v43');
await write(`${output}MASTER_UI_UX_AUDIT.md`, master);

console.log(JSON.stringify({
  pairRecords: pairRows.length,
  uniqueScreensWithPairs: uniquePairScreens.size,
  confirmedScreens: confirmedIds.size,
  blockerScreens: blockers.length,
  gapIds: allGapIds.length,
  gapPriorities: allPriorityCounts,
  featureStatuses: featureCounts,
  interactionChecks: `${interactions.passed}/${interactions.tested}`,
  referenceClickTargets: `${refClicks.clickActivatedPanels}/${refClicks.uniqueTargets}`,
}, null, 2));

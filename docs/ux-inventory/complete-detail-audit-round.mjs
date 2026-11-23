import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile, writeFile } from 'node:fs/promises';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const out = 'audit-output/precision-slate-v43-20261029/';
const vps = ['1280', '768', '390'];

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
  const headers = (rows.shift() ?? []).map((v, i) => i === 0 ? v.replace(/^\uFEFF/, '') : v);
  return { headers, rows: rows.filter((r) => r.length).map((r) => Object.fromEntries(headers.map((h, i) => [h, r[i] ?? '']))) };
}
function csv(headers, rows) {
  const q = (v) => `"${String(v ?? '').replaceAll('"', '""')}"`;
  return `\uFEFF${[headers, ...rows.map((r) => headers.map((h) => r[h] ?? ''))].map((r) => r.map(q).join(',')).join('\r\n')}\r\n`;
}
async function read(rel) { return readFile(path.join(root, rel), 'utf8'); }
async function write(rel, text) { await writeFile(path.join(root, rel), text, 'utf8'); }
const has = async (rel) => { try { await read(rel); return true; } catch { return false; } };

const pairPath = 'docs/ux-inventory/VISUAL_PAIR_REVIEW.csv';
const pairsCsv = parseCsv(await read(pairPath));
const knownPairs = new Set(pairsCsv.rows.map((r) => `${r['Screen ID']}|${r.Viewport}`));
const details = {
  'SCR-030': {
    slug: 'customer-detail', gap: 'GAP-0002',
    ref: (v) => `docs/ux-inventory/screenshots/reference/row-click-details/customer-detail-${v}.png`,
    system: (v) => `docs/ux-inventory/screenshots/system-mock/react/visual-round7/customer-detail-${v}.png`,
    diff: (v) => `docs/ux-inventory/screenshots/comparisons/row-click-details/scr-030-${v}-side-by-side.png`,
    result: 'CONFIRMED_VISUAL_DIFFERENCE',
    observation: 'Reference row click opens a compact customer file with summary tabs (overview, invoices, payments, history). React route /customers/:customerId opens a profile-card grid with different action buttons and without the same history tabs. Customer balance values differ between fixtures and were excluded from parity judgment.',
  },
  'SCR-031': {
    slug: 'invoice-detail', gap: 'GAP-0072',
    ref: (v) => `docs/ux-inventory/screenshots/reference/row-click-details/invoice-detail-${v}.png`,
    system: (v) => `docs/ux-inventory/screenshots/system-mock/react/visual-round7/invoice-detail-${v}.png`,
    diff: (v) => `docs/ux-inventory/screenshots/comparisons/row-click-details/scr-031-${v}-side-by-side.png`,
    result: 'CONFIRMED_VISUAL_DIFFERENCE',
    observation: 'Reference detail uses a compact metadata panel, a line-item table, a linked-payment row, and a warehouse footer. React route /invoices/:documentId uses metadata and totals cards, an unavailable-item-details panel, and an audit-history section. Number, customer, total, and paid amount match this fixture; reference says partially paid while system says issued, so status is recorded as a fixture/state mismatch, not as visual parity evidence.',
  },
  'SCR-053': {
    slug: 'movement-detail', gap: 'GAP-0073',
    ref: (v) => `docs/ux-inventory/screenshots/reference/row-click-details/movement-detail-${v}.png`,
    system: (v) => `docs/ux-inventory/screenshots/system-mock/react/visual-round7/movement-list-click-review-${v}.png`,
    diff: (v) => `docs/ux-inventory/screenshots/comparisons/row-click-details/scr-053-${v}-side-by-side.png`,
    result: 'CONFIRMED_MISSING_SYSTEM_SCREEN',
    observation: 'Reference row-reference click opens movement detail with the linked source and a one-row movement table. The system remains on /inventory/movements: the table row has zero links/buttons/role=button at all three viewports. A row click at 1280 left the route unchanged; at 768 and 390 the locator click timed out. System screenshot is the closest list candidate, not a detail-screen match.',
  },
};
for (const [screenId, d] of Object.entries(details)) for (const viewport of vps) {
  const key = `${screenId}|${viewport}`;
  if (knownPairs.has(key)) continue;
  const ref = d.ref(viewport), system = d.system(viewport), diff = d.diff(viewport);
  for (const p of [ref, system, diff]) if (!(await has(p))) throw new Error(`Missing evidence file: ${p}`);
  pairsCsv.rows.push({
    Slug: d.slug, 'Screen ID': screenId, Viewport: viewport,
    Status: 'REVIEWED_MANUAL_PAIR', 'Visual Result': d.result,
    Reference: ref, System: system, Diff: diff, Evidence: diff,
    Observation: d.observation, 'Gap IDs': d.gap,
    'Review Method': 'Actual visible reference row clicks followed by matched-viewport side-by-side manual screenshot inspection; system details were opened by visible row clicks where present. See REFERENCE_DETAIL_ROW_CLICK_REVIEW.json and SYSTEM_MOVEMENT_CLICK_REVIEW.json.',
    Confidence: screenId === 'SCR-053' ? 'High for the visible missing detail route and row controls; backend support was not tested.' : 'High for visible layout; customer/invoice state and data differences are excluded where fixtures differ.',
  });
  knownPairs.add(key);
}
await write(pairPath, csv(pairsCsv.headers, pairsCsv.rows));

const gapPath = `${out}11_MASTER_GAP_REGISTER.md`;
let gaps = await read(gapPath);
const newGaps = [
`## GAP-0072 — اختلاف تكوين تفاصيل الفاتورة

- **Category:** VISUAL_MISMATCH
- **Priority:** P2
- **Confidence:** High for visible layout; status and record-state difference are not resolved.
- **Affected Module:** الفواتير
- **Affected Screen IDs:** SCR-031
- **Affected Element IDs:** عناصر تفاصيل الفاتورة؛ لم يُنشأ جرد مستقل لكل زر في هذه الجولة.
- **Related Feature IDs:** F-010
- **Related Flow IDs:** FLOW-003; لم يُختبر مسار الحفظ أو التحصيل.
- **Design Reference:** لقطات فتح تفاصيل الفاتورة بالنقر من صف مرجعي: docs/ux-inventory/screenshots/reference/row-click-details/invoice-detail-{1280,768,390}.png.
- **Current System Evidence:** النقر من قائمة النظام يفتح /invoices/:documentId عند المقاسات الثلاثة؛ docs/ux-inventory/screenshots/system-mock/react/visual-round7/invoice-detail-{1280,768,390}.png؛ المقارنات docs/ux-inventory/screenshots/comparisons/row-click-details/scr-031-{1280,768,390}-side-by-side.png.
- **Expected Behavior:** عرض بيانات الفاتورة ثم بنودها وجدول المدفوعات المرتبطة والمخزن، مع ترتيب إجراءات المرجع.
- **Actual Behavior:** يعرض النظام بيانات الفاتورة وبطاقات الإجمالي والمدفوع والمتبقي، ثم رسالة أن تفاصيل الأصناف غير متاحة وكتلة سجل تعديلات. المرجع يعرض سطر صنف ومدفوعة مرتبطة ومخزنًا. حالة المرجع «مدفوعة جزئيًا» وحالة النظام «صادرة» رغم تطابق بعض قيم العينة.
- **Exact Missing or Incorrect Detail:** ترتيب المحتوى مختلف، وبيانات بنود الفاتورة/الدفعة/المخزن غير ظاهرة في واجهة النظام لهذه العينة؛ نص الحالة مختلف ويحتاج توحيد fixture قبل تفسيره كخلل وظيفي.
- **Why This Is a Gap:** لقطات المقاسات الثلاثة تبين تكوينًا مختلفًا بوضوح؛ الأرقام المتطابقة لا تثبت تطابق البيانات أو حفظ العمليات.
- **User Impact:** يصعب مراجعة الصنف والمدفوعات والمخزن من شاشة التفاصيل بالطريقة المعروضة في المرجع.
- **Business Impact:** لا يُستنتج أثر محاسبي؛ حالة المستند تحتاج تحققًا ببيانات موحدة.
- **Technical Impact:** يلزم إكمال عرض البيانات وربط التخطيط بالمراجع المناسبة بعد التحقق من توفر بيانات العينة.
- **Root Cause:** Unknown؛ طبقة API/قاعدة البيانات لم تُختبر.
- **Dependencies:** fixture موحد لحالة الفاتورة وبنودها ومدفوعاتها ومخزنها.
- **Suggested Corrective Action:** مطابقة توزيع قسم البيانات وبنود الفاتورة والمدفوعات المرتبطة والمخزن مع المرجع، ثم توحيد حالة العينة قبل الحكم على الحالة الوظيفية.
- **Acceptance Criteria:** على البيانات نفسها تظهر بيانات الفاتورة وسطر الصنف والمدفوعات والمخزن بالترتيب المرجعي عند 1280 و768 و390، وتعرض حالة مستند واحدة متسقة مع مصدرها.
- **Recommended Verification Method:** إعادة فتح الفاتورة بالنقر من القائمة والتقاط المقاسات الثلاثة على fixture موحد؛ تحقق من الاستجابة الفعلية للبيانات دون اعتماد Toast وحده.
- **Implementation Complexity:** Medium
- **Open Questions:** هل حالة «صادرة» في النظام تمثل حالة غير مسددة أم أن عينة النظام لم تُحمّل دفعتها؟ لا يمكن حسمه من MSW.
`,
`## GAP-0073 — تفاصيل حركة المخزون لا تفتح من السجل

- **Category:** MISSING_SCREEN
- **Priority:** P2
- **Confidence:** High for the current React/MSW UI route and the tested row controls; backend support is not verified.
- **Affected Module:** المخزون
- **Affected Screen IDs:** SCR-053
- **Affected Element IDs:** مرجع الحركة في صف السجل؛ لا يوجد عنصر تفاعلي في الصف الحالي.
- **Related Feature IDs:** F-016
- **Related Flow IDs:** FLOW-004
- **Design Reference:** تفاصيل الحركة المفتوحة بنقرة مرئية من سجل المرجع: docs/ux-inventory/screenshots/reference/row-click-details/movement-detail-{1280,768,390}.png.
- **Current System Evidence:** النظام يعرض /inventory/movements عبر رابط بحث مرئي؛ صفوف الجدول بلا link/button/role=button عند 1280 و768 و390. نقر الصف على 1280 لا يغير المسار، وتعذر locator click عند 768 و390. الأدلة: docs/ux-inventory/SYSTEM_MOVEMENT_CLICK_REVIEW.json وصور النظام وside-by-side ضمن docs/ux-inventory/screenshots/comparisons/row-click-details/.
- **Expected Behavior:** اختيار مرجع الحركة يفتح شاشة تفاصيل تعرض المرجع المرتبط ونوع الحركة والصنف والمخزن والكمية والتاريخ.
- **Actual Behavior:** لا توجد شاشة تفاصيل أو وسيلة تفاعل في صفوف السجل في واجهة React المرصودة؛ النقر لا ينقل إلى مسار آخر.
- **Exact Missing or Incorrect Detail:** غياب رابط/إجراء مرجع الحركة، ومسار أو شاشة تفاصيل الحركة.
- **Why This Is a Gap:** سلوك المرجع يؤكد فتح التفاصيل من صف حركة، بينما فحص DOM والنقر في النظام يثبت بقاء المستخدم في قائمة الحركات.
- **User Impact:** لا يستطيع المستخدم مراجعة مصدر الحركة وتفاصيلها من السجل.
- **Business Impact:** لا يُفترض فقدان بيانات أو غياب دعم backend؛ تم تأكيد غياب واجهة التفاصيل فقط.
- **Technical Impact:** يلزم تحديد وجهة تفاصيل مرتبطة بمعرّف الحركة وإضافة عنصر تنقل مع حالات تحميل/خطأ/عودة.
- **Root Cause:** Confirmed for UI absence; backend support unknown.
- **Dependencies:** تحديد معرف الحركة والوجهة من API قبل التنفيذ.
- **Suggested Corrective Action:** أضف عنصرًا قابلًا للوحة المفاتيح في مرجع الصف يفتح تفاصيل الحركة، مع رجوع واضح وحالة عدم وجود الحركة.
- **Acceptance Criteria:** من أي صف ذي مرجع يمكن فتح صفحة التفاصيل بالنقر والكيبورد في desktop/mobile، وتعرض بيانات الحركة الصحيحة، ويمكن الرجوع للقائمة دون فقد المرشحات.
- **Recommended Verification Method:** تحقق من عناصر DOM ثم اختبر النقر والكيبورد عند 1280 و768 و390 على بيانات اصطناعية؛ تحقق من تفاصيل الصف المعروض.
- **Implementation Complexity:** Medium
- **Open Questions:** ما معرف الحركة المستقر الذي يعيده API؟ لم يُختبر backend.
`,
];
for (const section of newGaps) {
  const id = section.match(/^## (GAP-\d{4})/m)?.[1];
  if (!gaps.includes(`## ${id} —`)) gaps += `\n${section}`;
}
const gap2 = gaps.match(/^## GAP-0002 —[\s\S]*?(?=^## GAP-|\s*$)/m)?.[0];
if (gap2) {
  let revised = gap2
    .replace('- **Confidence:** Medium or Not Verified; see source classification', '- **Confidence:** High for the visible tab/layout mismatch; individual tab actions and backend records remain unverified.')
    .replace('- **Current System Evidence:** Source contains the partial flow identified in gap register; runtime unverified.; Check report 08 for matched routes/controllers; no API request was executed.; Static schema artifacts only; no live DB query. See report 08.', '- **Current System Evidence:** Reference row click opened SCR-030 at 1280/768/390 (REFERENCE_DETAIL_ROW_CLICK_REVIEW.json). System customer row click opened /customers/:customerId at all three sizes; screenshots are in screenshots/system-mock/react/visual-round7 and side-by-side comparisons in screenshots/comparisons/row-click-details. Backend/API was not called.')
    .replace('- **Actual Behavior:** PARTIALLY_IMPLEMENTED; Source-only comparison; no browser/API/database execution.', '- **Actual Behavior:** The system shows a profile-card grid and action buttons but does not show the reference tabs for overview, invoices, payments, and customer history. Customer balance differs between fixtures and was excluded from visual scoring.')
    .replace('- **Exact Missing or Incorrect Detail:** ملف العميل لا يعرض تبويبات السجل', '- **Exact Missing or Incorrect Detail:** The system customer file lacks the reference tab strip and corresponding history views.')
    .replace('- **Why This Is a Gap:** The persisted backlog records this expected behavior and acceptance condition; current evidence above records the observed or classified implementation state.', '- **Why This Is a Gap:** Matched viewport screenshots show a confirmed difference in the customer-detail hierarchy and navigation tabs.')
    .replace('- **User Impact:** Not independently rated in the surviving evidence; priority is inherited from the persisted backlog.', '- **User Impact:** Users cannot switch between the customer summary, invoices, payments, and customer history in the reference layout.')
    .replace('- **Technical Impact:** See frontend/backend/database evidence above; where absent, implementation layer is unverified.', '- **Technical Impact:** The detail screen needs the missing tab views or an explicitly equivalent navigation pattern; API support remains unverified.')
    .replace('- **Root Cause:** Unknown unless identified in cited system evidence.', '- **Root Cause:** Confirmed UI difference; code-level cause not traced.')
    .replace('- **Suggested Corrective Action:** ملف العميل لا يعرض تبويبات السجل: عرض تبويبات سجل العميل مع فتح العناصر أو تصفيتها عليه.', '- **Suggested Corrective Action:** Add the reference tab structure and implement each tab against verified customer data.')
    .replace('- **Acceptance Criteria:** تظهر التبويبات والروابط والفراغ/التحميل/الخطأ لكل سجل.', '- **Acceptance Criteria:** The reference tab set and order are visible at 1280/768/390; each tab opens its content and has empty/loading/error states.')
    .replace('- **Recommended Verification Method:** اختبار مصدر كل تبويب وعميل بلا حركات.', '- **Recommended Verification Method:** Repeat the customer-list row click and compare all three viewports; separately exercise every tab on a test fixture.')
  gaps = gaps.replace(gap2, revised);
}
await write(gapPath, gaps);

// Add the newly reachable reference screens to their feature mappings.
const featurePath = `${out}05_FEATURE_GAP_MATRIX.csv`;
const featuresCsv = parseCsv(await read(featurePath));
for (const row of featuresCsv.rows) {
  if (row['Feature ID'] === 'F-010') {
    row['Status'] = 'PARTIALLY_IMPLEMENTED';
    row['Gap IDs'] = [...new Set(`${row['Gap IDs']} GAP-0033 GAP-0072`.split(/[\s;/,]+/).filter((x) => /^GAP-\d{4}$/.test(x)))].join('/');
    row['Frontend Evidence'] = 'Actual visible customer/invoice list clicks opened the invoice detail at 1280/768/390 in isolated React/MSW. Detail screenshots show a confirmed reference composition mismatch and item details unavailable for this fixture; status text differs. Backend/API was not invoked.';
    row['Confidence'] = 'High for UI route and visual mismatch; backend and persistence not verified';
    row['Verification Notes'] = 'Reference row-click pair review; no save/edit/payment action executed.';
  }
  if (row['Feature ID'] === 'F-016') {
    row['Screen IDs'] = [...new Set(`${row['Screen IDs']} SCR-053`.split(/[\s;/,]+/).filter((x) => /^SCR-\d{3}$/.test(x)))].join('/');
    row['Status'] = 'PARTIALLY_IMPLEMENTED';
    row['Gap IDs'] = [...new Set(`${row['Gap IDs']} GAP-0061 GAP-0062 GAP-0073`.split(/[\s;/,]+/).filter((x) => /^GAP-\d{4}$/.test(x)))].join('/');
    row['Frontend Evidence'] = 'Inventory movement list reached by visible global-search click. At all three viewports table rows have zero links/buttons/role=button; 1280 row click kept the route unchanged. Reference detail opened through an actual row-reference click at 1280/768/390.';
    row['Confidence'] = 'High for list and missing detail UI; backend support not verified';
    row['Verification Notes'] = 'See REFERENCE_DETAIL_ROW_CLICK_REVIEW.json and SYSTEM_MOVEMENT_CLICK_REVIEW.json.';
  }
}
await write(featurePath, csv(featuresCsv.headers, featuresCsv.rows));

// Replace generated placeholder specifications with the actual click and screen evidence.
const specPath = `${out}02_SCREEN_BY_SCREEN_SPECIFICATION.md`;
let specs = await read(specPath);
const specText = {
  'SCR-030': `## SCR-030 — ملف العميل (sec-cust-file)\n\n- **Entry:** customer list row clicked in the reference and React system.\n- **Reference behavior observed:** opens at 1280/768/390; shows customer name, add-payment/back actions, tabs for overview/invoices/payments/history, and a compact summary.\n- **System counterpart:** /customers/:customerId opens at all three sizes; its profile-card grid and action buttons differ and the same tab strip is absent.\n- **Visual evidence:** screenshots/reference/row-click-details/customer-detail-{1280,768,390}.png; screenshots/system-mock/react/visual-round7/customer-detail-{1280,768,390}.png; screenshots/comparisons/row-click-details/scr-030-{1280,768,390}-side-by-side.png.\n- **State/data note:** fixture balance values differ and are excluded from parity judgment.\n- **Interaction coverage:** row navigation verified; tab contents/actions and payment submission were not exercised.\n- **Finding:** confirmed UI mismatch GAP-0002; API and persisted behavior unverified.\n`,
  'SCR-031': `## SCR-031 — تفاصيل الفاتورة (sec-inv-detail)\n\n- **Entry:** invoice row clicked from the customer invoice tab in the reference and from the invoice list in React.\n- **Reference behavior observed:** opens at 1280/768/390; displays invoice metadata, line item, totals, linked payment, warehouse, and compact actions.\n- **System counterpart:** /invoices/:documentId opens at all three sizes; displays metadata and total cards, unavailable item-details panel, and audit history.\n- **Visual evidence:** screenshots/reference/row-click-details/invoice-detail-{1280,768,390}.png; screenshots/system-mock/react/visual-round7/invoice-detail-{1280,768,390}.png; screenshots/comparisons/row-click-details/scr-031-{1280,768,390}-side-by-side.png.\n- **State/data note:** invoice number, customer, total, and paid amount match the fixtures; status differs (partially paid vs issued), so it is not treated as a visual equivalence.\n- **Interaction coverage:** route opening verified; edit, cancel, print, return, delete, and payment actions were not exercised.\n- **Finding:** confirmed visual difference GAP-0072; underlying API and state remain unverified.\n`,
  'SCR-053': `## SCR-053 — تفاصيل حركة المخزون (sec-move-detail)\n\n- **Entry in reference:** actual movement-reference click from the movement list opened this panel at 1280/768/390.\n- **Expected content:** linked movement/source reference and a one-row detail table with date, type, item, warehouse, and quantity.\n- **System candidate:** /inventory/movements list exists, but all visible table rows have zero link/button/role=button controls. At 1280 a row click leaves the route unchanged; at 768/390 locator clicks timed out.\n- **Visual evidence:** screenshots/reference/row-click-details/movement-detail-{1280,768,390}.png; screenshots/system-mock/react/visual-round7/movement-list-click-review-{1280,768,390}.png; screenshots/comparisons/row-click-details/scr-053-{1280,768,390}-side-by-side.png.\n- **Finding:** missing system detail screen and row interaction GAP-0073. Backend support was not tested.\n`,
};
for (const [id, replacement] of Object.entries(specText)) {
  const rx = new RegExp(`^## ${id}[^\\r\\n]*\\r?\\n[\\s\\S]*?(?=^## SCR-|\\s*$)`, 'm');
  if (!rx.test(specs)) throw new Error(`Missing screen specification ${id}`);
  specs = specs.replace(rx, `${replacement}\n`);
}
await write(specPath, specs);

console.log(JSON.stringify({ pairRows: pairsCsv.rows.length, newPairs: 9, newGaps: ['GAP-0072', 'GAP-0073'], featureMappingsUpdated: ['F-010', 'F-016'] }, null, 2));

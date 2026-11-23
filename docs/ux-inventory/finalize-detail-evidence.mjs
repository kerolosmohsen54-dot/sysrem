import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile, writeFile } from 'node:fs/promises';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const out = 'audit-output/precision-slate-v43-20261029/';
function parseCsv(text) {
  const rows = []; let row = [], field = '', quoted = false;
  for (let i = 0; i < text.length; i++) { const c = text[i];
    if (quoted) { if (c === '"' && text[i + 1] === '"') { field += '"'; i++; } else if (c === '"') quoted = false; else field += c; }
    else if (c === '"') quoted = true; else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field.replace(/\r$/, '')); rows.push(row); row = []; field = ''; } else field += c;
  }
  if (field.length || row.length) { row.push(field.replace(/\r$/, '')); rows.push(row); }
  const headers = (rows.shift() ?? []).map((v, i) => i ? v : v.replace(/^\uFEFF/, ''));
  return { headers, rows: rows.filter((r) => r.length).map((r) => Object.fromEntries(headers.map((h, i) => [h, r[i] ?? '']))) };
}
function serializeCsv(headers, rows) { const q = (v) => `"${String(v ?? '').replaceAll('"', '""')}"`; return `\uFEFF${[headers, ...rows.map((r) => headers.map((h) => r[h] ?? ''))].map((r) => r.map(q).join(',')).join('\r\n')}\r\n`; }
async function read(rel) { return readFile(path.join(root, rel), 'utf8'); }
async function write(rel, text) { await writeFile(path.join(root, rel), text, 'utf8'); }
function dedupeAdjacentLines(text) { const out = []; for (const line of text.split(/\r?\n/)) if (out.at(-1) !== line) out.push(line); return out.join('\n'); }

const elmPath = `${out}03_INTERACTIVE_ELEMENT_INVENTORY.csv`;
const elmCsv = parseCsv(await read(elmPath));
const idSet = new Set(elmCsv.rows.map((r) => r['Element ID']));
const newRows = [
  ['SCR-002','Customer list data row','table row','شركة النور','Click opens the selected customer detail file.','SCR-030','Existing customer row in system also opened /customers/101.','IMPLEMENTED_AND_VERIFIED','','REFERENCE_DETAIL_ROW_CLICK_REVIEW.json; DETAIL_SCREEN_CLICK_REVIEW.json','High; actual click at all viewports.'],
  ['SCR-030','Register customer payment','button','+ تسجيل دفعة','Open the payment modal preselected for this customer; do not submit during audit.','Modal: تسجيل دفعة','Reference opened dialog; Cancel closed it. System customer-detail shows View Statement, Liquidate, Back and no equivalent register-payment control.','MISSING','GAP-0002','REFERENCE_DETAIL_MODAL_REVIEW.json; screenshots/reference/row-click-details/payment-modal-1280.png; DETAIL_SCREEN_CLICK_REVIEW.json','High for reference action and missing system control; no payment was saved.'],
  ['SCR-030','Return to customers','button','← رجوع','Return to customer list.','/customers','Visible in reference and system; this action was not clicked in this round.','NOT_VERIFIED','','REFERENCE_DETAIL_ROW_CLICK_REVIEW.json; DETAIL_SCREEN_CLICK_REVIEW.json','Medium; control visible, action not exercised.'],
  ['SCR-030','Change section password','button','كلمة مرور القسم','Open the section-password change prompt.','None observed on system detail','Not activated because it changes access settings.','NOT_VERIFIED','','REFERENCE_DETAIL_ROW_CLICK_REVIEW.json','High for visible reference control; behavior intentionally untested.'],
  ['SCR-030','Customer overview tab','tab-like div','نظرة عامة','Switch visible customer file panel to overview.','Equivalent tab absent from system detail.','Actual click showed customer summary panel at 1280/768/390.','MISSING','GAP-0002','REFERENCE_DETAIL_ROW_CLICK_REVIEW.json; customer-detail screenshots','High for reference click and system screenshot.'],
  ['SCR-030','Customer invoices tab','tab-like div','الفواتير','Switch to invoice list; clicking an invoice row opens invoice detail.','Equivalent tab absent from system detail.','Actual tab click showed invoice list; invoice row opened SCR-031 at all viewports.','MISSING','GAP-0002','REFERENCE_DETAIL_ROW_CLICK_REVIEW.json','High for tested reference behavior; system tab absent.'],
  ['SCR-030','Customer payments tab','tab-like div','الدفعات','Switch to payments list and summary.','Equivalent tab absent from system detail.','Actual click showed payment table and totals at 1280/768/390. Delete action was not clicked.','MISSING','GAP-0002','REFERENCE_DETAIL_ROW_CLICK_REVIEW.json','High for tested reference behavior; system tab absent.'],
  ['SCR-030','Customer history tab','tab-like div','سجل العميل','Switch to customer activity history.','Equivalent tab absent from system detail.','Actual click showed dated invoice/payment rows at 1280/768/390.','MISSING','GAP-0002','REFERENCE_DETAIL_ROW_CLICK_REVIEW.json','High for tested reference behavior; system tab absent.'],
  ['SCR-030','Delete payment row','icon button','🗑','Ask for confirmation then remove/void payment; consequential action.','No matching payment history row in system detail.','Visible in reference payments tab; not clicked because it is destructive.','NOT_VERIFIED','','REFERENCE_DETAIL_ROW_CLICK_REVIEW.json','High for presence; action not tested.'],
  ['SCR-030','Invoice row in customer file','table row','INV-2026-1041','Open selected invoice detail.','System has invoice rows in the invoice list, but no customer-file invoice tab.','Reference invoice row opened SCR-031; system invoice-list row separately opened /invoices/701.','PARTIALLY_IMPLEMENTED','GAP-0002/GAP-0072','REFERENCE_DETAIL_ROW_CLICK_REVIEW.json; DETAIL_SCREEN_CLICK_REVIEW.json','High for route clicks; customer-file entry point missing in system detail.'],
  ['SCR-031','Register return','button','↩ تسجيل مرتجع','Open return form; Cancel closes it without saving.','System offers إلغاء الفاتورة, which is a different operation.','Actual click opened return form and Cancel closed it; Confirm not clicked.','IMPLEMENTED_BUT_FUNCTIONALLY_MISMATCHED','GAP-0072','REFERENCE_DETAIL_MODAL_REVIEW.json; screenshots/reference/row-click-details/return-modal-1280.png; DETAIL_SCREEN_CLICK_REVIEW.json','High for reference modal and candidate action labels; no return was saved.'],
  ['SCR-031','Edit invoice','button','✏️ تعديل','Open invoice edit flow.','Edit invoice control visible on system detail; action not clicked.','Reference action not activated; source indicates edit can affect stock and customer balance.','NOT_VERIFIED','','REFERENCE_DETAIL_ROW_CLICK_REVIEW.json; DETAIL_SCREEN_CLICK_REVIEW.json','High for presence; behavior not tested.'],
  ['SCR-031','Return to customer file','button','← رجوع','Return to previous customer detail.','System Back control visible; not clicked.','Actual reference click returned to sec-cust-file.','NOT_VERIFIED','','REFERENCE_DETAIL_ROW_CLICK_REVIEW.json; DETAIL_SCREEN_CLICK_REVIEW.json','High for reference result; system result not tested.'],
  ['SCR-031','Preview / print invoice','button','معاينة / طباعة','Open print preview or printing.','System print control visible; not clicked.','Not activated to avoid opening/triggering a print operation.','NOT_VERIFIED','','REFERENCE_DETAIL_ROW_CLICK_REVIEW.json; DETAIL_SCREEN_CLICK_REVIEW.json','High for presence; behavior intentionally untested.'],
  ['SCR-031','Delete invoice','button','🗑 حذف','Request destructive invoice deletion.','System exposes إلغاء الفاتورة instead; no delete control visible in the candidate screenshot.','Not clicked because destructive.','MISSING','GAP-0072','REFERENCE_DETAIL_ROW_CLICK_REVIEW.json; DETAIL_SCREEN_CLICK_REVIEW.json','High for visible control difference; deletion semantics not tested.'],
  ['SCR-016','Movement reference row link','row link','INV-2026-1042 / RET-2026-001','Open movement detail for selected reference.','Movement table has no link, button, or role=button in its rows.','Reference link opened SCR-053 at 1280/768/390; system row click stayed on /inventory/movements at 1280 and did not expose a control at all viewports.','MISSING','GAP-0073','REFERENCE_DETAIL_ROW_CLICK_REVIEW.json; SYSTEM_MOVEMENT_CLICK_REVIEW.json','High for the observed UI route/control absence; backend unverified.'],
  ['SCR-053','Return to movement list','button','رجوع لحركة المخزون','Return to the movement list.','System movement-detail screen does not exist in the observed UI.','Actual reference click returned to sec-movements at all three viewports.','MISSING','GAP-0073','REFERENCE_DETAIL_ROW_CLICK_REVIEW.json; SYSTEM_MOVEMENT_CLICK_REVIEW.json','High for reference behavior and missing system detail UI.'],
  ['SCR-030','Close payment modal','button','✕','Close payment modal without submitting.','Payment modal action not available on system customer detail.','Present in modal; not the control used to close during audit.','NOT_VERIFIED','','REFERENCE_DETAIL_MODAL_REVIEW.json','High for presence; click not separately exercised.'],
  ['SCR-030','Create customer from payment modal','button','＋ عميل','Open new-customer form from payment modal.','No equivalent modal on system customer detail.','Present in modal; not clicked.','NOT_VERIFIED','','REFERENCE_DETAIL_MODAL_REVIEW.json','High for presence; action not tested.'],
  ['SCR-030','Cancel payment modal','button','إلغاء','Close payment modal without writing a payment.','No equivalent modal on system customer detail.','Actual click closed the modal; no submit/save occurred.','IMPLEMENTED_AND_VERIFIED','','REFERENCE_DETAIL_MODAL_REVIEW.json; payment-modal-1280.png','High; read-only open/cancel verified.'],
  ['SCR-030','Confirm payment','button','تأكيد الدفعة','Validate and save a payment to customer and cashbox.','No equivalent modal on system customer detail.','Not clicked; would modify financial state.','NOT_VERIFIED','','REFERENCE_DETAIL_MODAL_REVIEW.json','High for presence; data-changing submit intentionally not tested.'],
  ['SCR-030','Payment customer field','select','العميل *','Select the customer receiving payment.','No equivalent modal on system customer detail.','Modal showed c101 preselected. No value changed or submitted.','NOT_VERIFIED','','REFERENCE_DETAIL_MODAL_REVIEW.json; payment-modal-1280.png','High for field presence; validation not tested.'],
  ['SCR-030','Payment method field','select','طريقة الدفع','Choose cash, bank transfer, or cheque.','No equivalent modal on system customer detail.','Modal showed cash by default. No value changed or submitted.','NOT_VERIFIED','','REFERENCE_DETAIL_MODAL_REVIEW.json; payment-modal-1280.png','High for field/options visible; validation not tested.'],
  ['SCR-030','Cashbox field','select','الخزينة','Choose the cashbox/bank account receiving payment.','No equivalent modal on system customer detail.','Modal showed main cashbox by default. No value changed or submitted.','NOT_VERIFIED','','REFERENCE_DETAIL_MODAL_REVIEW.json; payment-modal-1280.png','High for field presence; submit not tested.'],
  ['SCR-030','Payment amount field','number input','المبلغ *','Enter a positive amount to collect.','No equivalent modal on system customer detail.','Modal prefilled 18,500 from the reference fixture. No value changed or submitted.','NOT_VERIFIED','','REFERENCE_DETAIL_MODAL_REVIEW.json; payment-modal-1280.png','High for field presence; constraints/submit not tested.'],
  ['SCR-030','Payment date field','disabled text input','التاريخ (تلقائي)','Display the automatically selected payment date.','No equivalent modal on system customer detail.','Disabled field displayed the local test date/time.','NOT_VERIFIED','','REFERENCE_DETAIL_MODAL_REVIEW.json; payment-modal-1280.png','High for visible state; timezone/business rule not tested.'],
  ['SCR-031','Confirm return','button','تأكيد المرتجع','Validate and create return, restore stock, update customer balance.','No matching return form on system detail.','Not clicked; it would alter inventory and customer financial state.','NOT_VERIFIED','','REFERENCE_DETAIL_MODAL_REVIEW.json','High for presence; write action intentionally not tested.'],
  ['SCR-031','Cancel return modal','button','إلغاء','Close return modal without saving.','No matching return form on system detail.','Actual click removed the dialog; no return was created.','IMPLEMENTED_AND_VERIFIED','','REFERENCE_DETAIL_MODAL_REVIEW.json; return-modal-1280.png','High; read-only open/cancel verified.'],
  ['SCR-031','Return product field','select','المنتج','Select an invoice item and show its returnable quantity.','No matching return form on system detail.','Modal listed the invoice item and available quantity 12.','NOT_VERIFIED','','REFERENCE_DETAIL_MODAL_REVIEW.json; return-modal-1280.png','High for presence/options; validation not tested.'],
  ['SCR-031','Return quantity field','number input','الكمية','Enter a positive quantity within remaining returnable units.','No matching return form on system detail.','Default quantity 1; source includes a quantity bound check; no submit.','NOT_VERIFIED','','REFERENCE_DETAIL_MODAL_REVIEW.json; return-modal-1280.png','High for visible constraints; submit not tested.'],
  ['SCR-031','Return warehouse field','select','إلى أي مخزن تريد إرجاع المنتج؟','Choose the destination warehouse.','No matching return form on system detail.','Modal listed five warehouses and selected the main warehouse.','NOT_VERIFIED','','REFERENCE_DETAIL_MODAL_REVIEW.json; return-modal-1280.png','High for field/options visible; submit not tested.'],
  ['SCR-031','Repair type field','select','نوع الإصلاح','Choose no repair, company repair, or customer repair.','No matching return form on system detail.','Modal showed three options; conditional behavior not tested.','NOT_VERIFIED','','REFERENCE_DETAIL_MODAL_REVIEW.json; return-modal-1280.png','High for visible options; conditional states unverified.'],
  ['SCR-031','Return reason field','text input','سبب الإصلاح / المرتجع','Enter the reason for return/repair.','No matching return form on system detail.','Empty input visible; validation not submitted.','NOT_VERIFIED','','REFERENCE_DETAIL_MODAL_REVIEW.json; return-modal-1280.png','High for presence; validation not tested.'],
  ['SCR-031','Repair cost field','conditional number input','تكلفة الإصلاح','Enter repair cost when customer repair is selected.','No matching return form on system detail.','Conditional field is hidden by default; condition was not activated.','NOT_VERIFIED','','REFERENCE_DETAIL_MODAL_REVIEW.json; return-modal-1280.png','High for source/DOM presence; conditional state unverified.'],
  ['SCR-031','Repair amount paid field','conditional number input','المبلغ المدفوع للإصلاح','Enter amount already paid when customer repair applies.','No matching return form on system detail.','Conditional field is hidden by default; condition was not activated.','NOT_VERIFIED','','REFERENCE_DETAIL_MODAL_REVIEW.json; return-modal-1280.png','High for source/DOM presence; conditional state unverified.'],
];
const tested = new Set(['ELM-0558','ELM-0559','ELM-0562','ELM-0563','ELM-0564','ELM-0565','ELM-0567','ELM-0568','ELM-0570','ELM-0573','ELM-0574','ELM-0577','ELM-0585']);
let next = 558;
for (const [screen, name, type, label, action, destination, actual, status, gap, evidence, confidence] of newRows) {
  const id = `ELM-${String(next++).padStart(4, '0')}`;
  if (idSet.has(id)) continue;
  const isField = /input|select/.test(type);
  elmCsv.rows.push({
    'Element ID': id, 'Screen ID': screen, 'Element Name': name, 'Element Type': type, Label: label,
    'Design Reference': `v43 ${screen}; see ${evidence.split(';')[0]}`,
    'Expected Action': action, 'Expected Destination': destination,
    Preconditions: isField ? 'Dialog opened from the matching reference detail screen; test fixture only.' : 'Reference detail state opened from a visible list row; test fixture only.',
    'Permission Requirements': screen === 'SCR-030' ? 'Customer section prompt was accepted with the isolated fixture setting; do not infer production permissions.' : 'Not specified; not tested.',
    'Expected States': isField ? 'Default/value captured; validation, focus, keyboard, error and submission states not tested.' : 'Default visible state captured; hover/focus/keyboard/disabled/error states not individually tested.',
    'Existing Implementation': screen === 'SCR-030' ? '/customers/:customerId or reference customer panel; see evidence.' : screen === 'SCR-031' ? '/invoices/:documentId or reference invoice panel; see evidence.' : screen === 'SCR-016' ? '/inventory/movements; reference row link exists.' : 'Reference panel only; no system detail route found.',
    'Actual Behavior': actual, Status: status, 'Gap IDs': gap,
    Evidence: evidence, Confidence: confidence,
  });
  idSet.add(id);
}
await write(elmPath, serializeCsv(elmCsv.headers, elmCsv.rows));

// Bring the feature overview and main inventory in line with the click evidence.
const featureInventoryPath = `${out}04_FEATURE_INVENTORY.md`;
let featureInventory = await read(featureInventoryPath);
featureInventory = featureInventory.replace(/^\| F-010 \|([^\n]*)\| NOT_VERIFIED \| — \| FLOW-003 \|$/m, '| F-010 |$1| PARTIALLY_IMPLEMENTED | GAP-0033/GAP-0072 | FLOW-003 |');
featureInventory = featureInventory.replace(/^\| F-016 \|[^\n]*$/m, '| F-016 | رصيد وحركات المخزون | SCR-015/SCR-016/SCR-053 | عرض الكميات والحركات والتفاصيل ومصدرها | Inventory API | PARTIALLY_IMPLEMENTED | GAP-0061/GAP-0062/GAP-0073 | FLOW-004 |');
await write(featureInventoryPath, featureInventory);

const screenPath = `${out}01_SCREEN_INVENTORY.md`;
let screenDoc = await read(screenPath);
screenDoc = screenDoc.replace(/^\| SCR-053 \|[^\n]*$/m, '| SCR-053 | sec-move-detail | تفاصيل حركة المخزون | /inventory/movements (قائمة مرشحة؛ لا يوجد مسار تفاصيل) | MISSING | docs/ux-inventory/screenshots/reference/row-click-details/movement-detail-1280.png; docs/ux-inventory/screenshots/system-mock/react/visual-round7/movement-list-click-review-1280.png; docs/ux-inventory/screenshots/comparisons/row-click-details/scr-053-1280-side-by-side.png; docs/ux-inventory/screenshots/reference/row-click-details/movement-detail-768.png; docs/ux-inventory/screenshots/system-mock/react/visual-round7/movement-list-click-review-768.png; docs/ux-inventory/screenshots/comparisons/row-click-details/scr-053-768-side-by-side.png; docs/ux-inventory/screenshots/reference/row-click-details/movement-detail-390.png; docs/ux-inventory/screenshots/system-mock/react/visual-round7/movement-list-click-review-390.png; docs/ux-inventory/screenshots/comparisons/row-click-details/scr-053-390-side-by-side.png |');
await write(screenPath, screenDoc);

const invPath = 'docs/ux-inventory/INVENTORY.csv';
const invCsv = parseCsv(await read(invPath));
for (const row of invCsv.rows) if (['SCR-030','SCR-031','SCR-053'].includes(row.ID) && row['Element/Flow'] === 'Whole screen') {
  const gap = row.ID === 'SCR-030' ? 'GAP-0002' : row.ID === 'SCR-031' ? 'GAP-0072' : 'GAP-0073';
  row.Notes = `Verified by actual row clicks and matched screenshots at 1280/768/390. Linked finding: ${gap}. ${row.ID === 'SCR-053' ? 'Reference detail opens; React movement list has no row controls or detail route.' : row.ID === 'SCR-031' ? 'Reference details show line item, linked payment, and warehouse; system composition differs. Fixture status mismatch excluded from visual judgment.' : 'Reference customer tabs and payment modal were exercised; matching tabs are absent from system detail.'}`;
}
await write(invPath, serializeCsv(invCsv.headers, invCsv.rows));

const pairs = parseCsv(await read('docs/ux-inventory/VISUAL_PAIR_REVIEW.csv')).rows;
const blockers = parseCsv(await read('docs/ux-inventory/SCREEN_PAIR_BLOCKERS.csv')).rows;
const features = parseCsv(await read(`${out}05_FEATURE_GAP_MATRIX.csv`)).rows;
for (const feature of features) {
  if (feature['Feature ID'] === 'F-010') {
    feature['Screen IDs'] = 'SCR-006/SCR-007/SCR-008/SCR-031';
    feature['Gap IDs'] = 'GAP-0033/GAP-0072';
  }
  if (feature['Feature ID'] === 'F-016') {
    feature['Screen IDs'] = 'SCR-015/SCR-016/SCR-053';
    feature['Gap IDs'] = 'GAP-0061/GAP-0062/GAP-0073';
  }
}
const featureMatrixHeaders = parseCsv(await read(`${out}05_FEATURE_GAP_MATRIX.csv`)).headers;
await write(`${out}05_FEATURE_GAP_MATRIX.csv`, serializeCsv(featureMatrixHeaders, features));
const gapsText = await read(`${out}11_MASTER_GAP_REGISTER.md`);
const gapIds = [...new Set([...gapsText.matchAll(/^## (GAP-\d{4})/gm)].map((m) => m[1]))];
const priorityCounts = [...gapsText.matchAll(/^## GAP-\d{4}[\s\S]*?\*\*Priority:\*\*\s*(P\d)/gm)].reduce((a, m) => (a[m[1]] = (a[m[1]] ?? 0) + 1, a), {});
const resultCounts = pairs.reduce((a, r) => (a[r['Visual Result']] = (a[r['Visual Result']] ?? 0) + 1, a), {});
const testedNew = tested.size;
const totalElements = elmCsv.rows.length;
const unpaired = blockers.length;
const statusCounts = features.reduce((a, r) => (a[r.Status] = (a[r.Status] ?? 0) + 1, a), {});
const summaryLines = {
  '00_EXECUTIVE_SUMMARY.md': `- ${unpaired} لوحة من أصل 68 بلا زوج مرئي مباشر؛ أسبابها وسجلات صور النظام المرشحة في docs/ux-inventory/SCREEN_PAIR_BLOCKERS.csv.`,
  '07_UI_UX_VISUAL_MISMATCHES.md': `- ${unpaired} شاشة بلا زوج مرجعي/نظامي مباشر؛ يسرد SCREEN_PAIR_BLOCKERS.csv كل معرف وسبب الحجب والدليل المطلوب.`,
  '13_UNVERIFIED_ITEMS_AND_LIMITATIONS.md': `- توجد ${pairs.length} سجلات مقارنة مصورة و50/69 معرف شاشة ذات زوج واحد على الأقل. بقيت ${unpaired} لوحة بلا زوج مباشر؛ كل لوحة وسياقها ودليلها في docs/ux-inventory/SCREEN_PAIR_BLOCKERS.csv.`,
};
for (const [name, replacement] of Object.entries(summaryLines)) {
  let doc = await read(`${out}${name}`);
  doc = doc.replace(/- \d+ لوحة من أصل 68 بلا زوج مرئي مباشر[^\n]*/, replacement)
    .replace(/- \d+ شاشة بلا زوج مرجعي\/نظامي مباشر[^\n]*/, replacement)
    .replace(/- توجد \d+ سجلات مقارنة مصورة[^\n]*/, replacement);
  if (name === '00_EXECUTIVE_SUMMARY.md') {
    doc = doc.replace('- نقر المرجع على 60/105 محاولة لأهداف التنقل: 20/35 هدفًا فُعّل في المقاسات الثلاثة، و15 أهداف بقيت محجوبة/غير مؤكدة.', '- نقر المرجع على 60/105 محاولة لأهداف التنقل: 20/35 هدفًا فُعّل في المقاسات الثلاثة، و15 هدفًا بقيت محجوبة/غير مؤكدة. كما فُتحت تفاصيل العميل والفاتورة والحركة بالنقر على صفوف عند 1280/768/390 (9/9).')
      .replace(/- جرد 557 عنصرًا تفاعليًا[^\n]*/, `- جرد ${totalElements} عنصرًا؛ 13/ ${totalElements} عنصرًا لها نتيجة تفاعل مباشرة في هذه الجولة (تبويبات، فتح/إلغاء نوافذ آمنة، والرجوع/الانتقال). لا تمثل فحوص React/MSW تغطية العناصر فرديًا ولا تثبت backend.`)
      .replace(/- مطابقة SCR-028 بمسار[^\n]*/, '- تفاصيل العميل والفاتورة والحركة فُتحت بالنقر في المرجع عند المقاسات الثلاثة. تبويبات العميل الأربعة بدّلت محتواها، وزرا الرجوع في الفاتورة والحركة أعادا المستخدم للقائمة السابقة. فتح وإلغاء نافذتي الدفع والمرتجع نجح دون حفظ. تفاصيل حركة النظام مفقودة؛ انظر GAP-0073.\n- مطابقة SCR-028 بمسار /warehouse-returns غير محسومة. 13 وجهة مالية فرعية لم تتفعّل بالنقر، وواجهتا alias للمالية لا تملكان وجهة مستقلة مؤكدة؛ SCR-055 غائبة من DOM، وSCR-068 محمية بـPIN.');
    doc = doc.replace(`13/ ${totalElements}`, `13/${totalElements}`);
    const detailBullet = '- تفاصيل العميل والفاتورة والحركة فُتحت بالنقر في المرجع عند المقاسات الثلاثة. تبويبات العميل الأربعة بدّلت محتواها، وزرا الرجوع في الفاتورة والحركة أعادا المستخدم للقائمة السابقة. فتح وإلغاء نافذتي الدفع والمرتجع نجح دون حفظ. تفاصيل حركة النظام مفقودة؛ انظر GAP-0073.';
    doc = doc.replace(`${detailBullet}\n${detailBullet}`, detailBullet);
  }
  if (name === '07_UI_UX_VISUAL_MISMATCHES.md') {
    doc = doc.replace('## ما لا تثبته هذه النتائج', '## تفاصيل أضيفت في جولة النقر الأخيرة\n\n- SCR-030: العميل؛ تبويبات النظرة العامة والفواتير والمدفوعات والسجل تعمل في المرجع، بينما شاشة React المقابلة تعرض بطاقة معلومات بلا هذه التبويبات (GAP-0002).\n- SCR-031: الفاتورة؛ المرجع يعرض بند الصنف والمدفوعات المرتبطة والمخزن؛ واجهة النظام تعرض بطاقات وبيانات صنف غير متاحة في fixture الحالي (GAP-0072).\n- SCR-053: المرجع يفتح تفاصيل الحركة بالنقر، بينما جدول النظام لا يحتوي عنصرًا تفاعليًا للصف ولا شاشة تفاصيل (GAP-0073).\n\n## ما لا تثبته هذه النتائج');
  }
  if (name === '13_UNVERIFIED_ITEMS_AND_LIMITATIONS.md') {
    doc = doc.replace(/- شاشتا العميل والفاتورة فُتحتا[^\n]*/, '- المرجع فتح تفاصيل العميل والفاتورة والحركة 9/9 نقرات عند المقاسات الثلاثة. النظام فتح العميل والفاتورة 6/6؛ تفاصيل الحركة غير متاحة في واجهة النظام. تبويبات العميل وفتح/إلغاء نافذتي الدفع والمرتجع اختبرت دون حفظ.')
      .replace(/- جرد 557 عنصرًا تفاعليًا[^\n]*/, `- جرد ${totalElements} عنصرًا تفاعليًا؛ 68/68 تحقق UI مسجلًا في INTERACTION_REVIEW.json، لكنه لا يقابل عناصر ELM واحدًا بواحد. ${testedNew}/592 تفاعلًا لها نتيجة فعلية في الجولة الأخيرة؛ بقية العناصر لا تُعد PASS.`)
      .replace('- SCR-055: sec-liq غير موجودة في DOM المهيأ.', '- SCR-034–SCR-049 وSCR-054: لوحات مالية لها مسارات مرشحة لكن لم تُفتح عبر عناصر مرئية بالدور المتاح؛ `#fin-sub` غير موجود في DOM المهيأ. SCR-055: sec-liq غير موجودة في DOM المهيأ.');
  }
  await write(`${out}${name}`, dedupeAdjacentLines(doc));
}

let coverage = await read(`${out}14_COVERAGE_AND_COMPLETENESS_REPORT.md`);
coverage = coverage.replace(/- العناصر التفاعلية المفهرسة: \d+\./, `- العناصر التفاعلية المفهرسة: ${totalElements}.`)
  .replace(/147 سجل مقارنة يتضمن تكرار حالات لبعض المعرفات/g, `${pairs.length} سجل مقارنة يتضمن تكرار حالات لبعض المعرفات`)
  .replace(/\| نقرات route details العميل\/الفاتورة \|[^\n]*/, '| فتح تفاصيل المرجع من صفوف (عميل/فاتورة/حركة) | 9/9 | 100% | actual clicks at 1280/768/390; read-only fixture. |\n| فتح تفاصيل النظام من صفوف العميل/الفاتورة | 6/6 | 100% لهذه الوجهات | movement detail is missing; movement list rows are not interactive. |\n| تفاعل العناصر الجديدة في هذه الجولة | 13/35 | 37.1% | 35 عنصرًا جديدًا موثقًا؛ 13 تم النقر عليها/فتحها بأمان. باقي الأزرار والحقول غير مختبرة. |')
  .replace(/\| تغطية عناصر ELM الفردية \|[^\n]*/, `| تفاعل العناصر الجديدة في هذه الجولة | ${testedNew}/35 | ${(100 * testedNew / 35).toFixed(1)}% | 35 عنصرًا جديدًا موثقًا؛ ${testedNew} تم النقر عليها/فتحها بأمان. باقي الأزرار والحقول غير مختبرة. |`)
  .replace(/- \d+ ميزة: \d+ NOT_VERIFIED، \d+ PARTIALLY_IMPLEMENTED، \d+ UI_ONLY، \d+ MISSING\./, `- ${features.length} ميزة: ${statusCounts.NOT_VERIFIED ?? 0} NOT_VERIFIED، ${statusCounts.PARTIALLY_IMPLEMENTED ?? 0} PARTIALLY_IMPLEMENTED، ${statusCounts.UI_ONLY ?? 0} UI_ONLY، ${statusCounts.MISSING ?? 0} MISSING.`)
  .replace(/التدقيق غير مكتمل: \d+ شاشة بلا زوج مباشر[^\n]*/, `التدقيق غير مكتمل: ${unpaired} شاشة بلا زوج مباشر، و${totalElements} عنصرًا في الجرد؛ تم اختبار 13 من عناصر هذه الجولة بالنقر الآمن. بقيت معظم العناصر الأخرى وحالاتها دون تفاعل فردي، و0/10 رحلة backend/DB مكتملة.`);
await write(`${out}14_COVERAGE_AND_COMPLETENESS_REPORT.md`, dedupeAdjacentLines(coverage));
const newRoundMetric = `| تفاعل العناصر الجديدة في هذه الجولة | ${testedNew}/35 | ${(100 * testedNew / 35).toFixed(1)}% | 35 عنصرًا جديدًا موثقًا؛ ${testedNew} تم النقر عليها/فتحها بأمان. باقي الأزرار والحقول غير مختبرة. |`;
let keptNewMetric = false;
coverage = coverage.replace(/^\| تفاعل العناصر الجديدة في هذه الجولة \|.*$/gm, (line) => { if (keptNewMetric) return ''; keptNewMetric = true; return newRoundMetric; });
coverage = coverage.replace('| تحقق UI مسجل في React/MSW | 68/68 | 100% لهذه الفحوص | لا يمثل العناصر المفهرسة واحدًا بواحد ولا اتصال backend. |', '| تحقق UI مسجل في React/MSW | 68/68 | 100% لهذه الفحوص | لا يمثل العناصر المفهرسة واحدًا بواحد ولا اتصال backend. |\n| العناصر ذات تفاعل فردي موثق في هذه الجولة | 13/592 | 2.2% | بقية الجرد لم يُختبر بالنقر الفردي؛ راجع 03_INTERACTIVE_ELEMENT_INVENTORY.csv. |');
await write(`${out}14_COVERAGE_AND_COMPLETENESS_REPORT.md`, dedupeAdjacentLines(coverage));

let progress = await read(`${out}PROGRESS.md`);
progress = progress.replace(/\d+ سجل مقارنة صور، منها \d+ نتيجة حاسمة و12 غير محسومة\./, `${pairs.length} سجل مقارنة صور، منها ${pairs.length - 12} نتيجة حاسمة و12 غير محسومة.`)
  .replace(/\d+\/69 معرف شاشة لها زوج صور \(\d+ لوحة ودخول\)، و\d+ لوحة بلا زوج مباشر\./, `50/69 معرف شاشة لها زوج صور (49 لوحة ودخول)، و${unpaired} لوحة بلا زوج مباشر.`)
  .replace(/- فُتحت تفاصيل العميل والفاتورة[^\n]*/, '- فُتحت تفاصيل العميل والفاتورة والحركة في المرجع بالنقر 9/9 عند 1280/768/390؛ النظام فتح تفاصيل العميل والفاتورة 6/6. تبويبات ملف العميل وفتح/إلغاء نافذتي الدفع والمرتجع جُرّبت دون حفظ؛ لا شاشة تفاصيل حركة في النظام.')
  .replace(/Gap IDs من 0001 إلى 0071 موثقة[^\n]*/, `Gap IDs حتى GAP-0073 موثقة؛ صُحح ربط GAP-0035 بـSCR-012 وGAP-0042 بـSCR-011، وأضيف GAP-0072 لتفاصيل الفاتورة وGAP-0073 لتفاصيل حركة المخزون.`)
  .replace(/\d+ شاشة مالية ووجهات أخرى بلا حالة مرجعية نشطة[^\n]*/, `${unpaired} شاشة بلا زوج مباشر. توجد 13 وجهة مالية فرعية محجوبة بالنقر، ولوحتا alias للمالية بلا وجهة مستقلة، ولوحة تصفية غير موجودة في DOM، وملاحظات محمية بـPIN.`);
await write(`${out}PROGRESS.md`, dedupeAdjacentLines(progress));
progress = progress.replace('- - فُتحت تفاصيل العميل', '- فُتحت تفاصيل العميل').replace('557/557 عنصرًا', `${totalElements}/${totalElements} عنصرًا مفهرسًا`);
await write(`${out}PROGRESS.md`, dedupeAdjacentLines(progress));

// Keep the single-file report consistent with its section files and latest evidence.
let master = await read(`${out}MASTER_UI_UX_AUDIT.md`);
const featureMatrixCsv = parseCsv(await read(`${out}05_FEATURE_GAP_MATRIX.csv`));
const mdTable = (headers, rows) => `| ${headers.join(' | ')} |\n| ${headers.map(() => '---').join(' | ')} |\n${rows.map((r) => `| ${headers.map((h) => String(r[h] ?? '').replaceAll('|', '\\|').replaceAll('\n', '<br>')).join(' | ')} |`).join('\n')}`;
const sectionContents = {
  '00-executive-summary': await read(`${out}00_EXECUTIVE_SUMMARY.md`),
  '01-screen-inventory': await read(`${out}01_SCREEN_INVENTORY.md`),
  '02-screen-by-screen-specification': await read(`${out}02_SCREEN_BY_SCREEN_SPECIFICATION.md`),
  '03-interactive-element-inventory': `# 03 — جرد العناصر التفاعلية\n\nهذا الجدول يضم ${totalElements} عنصرًا تفاعليًا؛ أضيفت 35 ملاحظة تفاعل/حقل من شاشات تفاصيل العميل والفاتورة والحركة. تم تنفيذ 13 نقرة/فتح/إلغاء آمنًا مباشرة في الجولة الحالية. الحالة NOT_VERIFIED لا تعني أن العنصر يعمل.\n\n${mdTable(elmCsv.headers, elmCsv.rows)}`,
  '04-feature-inventory': await read(`${out}04_FEATURE_INVENTORY.md`),
  '05-feature-gap-matrix': `# 05 — مصفوفة فجوات الميزات\n\n${mdTable(featureMatrixCsv.headers, featureMatrixCsv.rows)}`,
  '07-ui-ux-visual-mismatches': await read(`${out}07_UI_UX_VISUAL_MISMATCHES.md`),
  '11-master-gap-register': await read(`${out}11_MASTER_GAP_REGISTER.md`),
  '12-prioritized-implementation-backlog': await read(`${out}12_PRIORITIZED_IMPLEMENTATION_BACKLOG.md`),
  '13-unverified-items-and-limitations': await read(`${out}13_UNVERIFIED_ITEMS_AND_LIMITATIONS.md`),
  '14-coverage-and-completeness-report': await read(`${out}14_COVERAGE_AND_COMPLETENESS_REPORT.md`),
};
for (const [id, section] of Object.entries(sectionContents)) {
  const startAnchor = `<a id="${id}"></a>`;
  const start = master.indexOf(startAnchor);
  if (start < 0) continue;
  const anchors = [...master.matchAll(/<a id="([^"]+)"><\/a>/g)];
  const current = anchors.findIndex((m) => m[1] === id);
  const endAnchor = anchors[current + 1]?.[0];
  const end = endAnchor ? master.indexOf(endAnchor, start + startAnchor.length) : -1;
  if (end < 0) throw new Error(`Cannot find next master-report anchor after ${id}`);
  master = `${master.slice(0, start)}${startAnchor}\n\n${section.trim()}\n\n${master.slice(end)}`;
}
const latest = '<a id="latest-runtime-evidence-2026-10-29"></a>';
const latestAt = master.indexOf(latest);
if (latestAt < 0) throw new Error('Missing latest runtime section anchor in master report');
const runtime = `# أحدث أدلة التشغيل — 2026-10-29\n\n- Visual pair review: ${pairs.length} screenshot records; ${new Set(pairs.map((r) => `${r['Screen ID']}|${r.Viewport}`)).size}/207 unique screen×viewport pairs; ${new Set(pairs.map((r) => r['Screen ID'])).size}/69 screens represented; 12 pair rows remain unresolved.\n- Reference detail clicks: customer, invoice, movement opened 9/9 across 1280/768/390; system customer/invoice detail opened 6/6. Movement detail has no system row control or detail route.\n- Customer file: four tabs changed visible content in all three reference viewports. Invoice and movement back controls returned to their previous panels; payment and return dialogs were opened and canceled without saving.\n- UI/MSW checks: 68/68; these are separate from ${totalElements} indexed interactive elements. ${testedNew.size}/35 newly documented detail elements were individually exercised; other controls and all save/delete/print/API/DB flows remain untested.\n- ${unpaired} screens have no direct reference/system pair; reasons are listed in SCREEN_PAIR_BLOCKERS.csv.\n- Backend/database end-to-end flows: 0/10. No application source, backend, or database was modified.\n`;
master = `${master.slice(0, latestAt)}${latest}\n\n${runtime}`;
await write(`${out}MASTER_UI_UX_AUDIT.md`, master);

console.log(JSON.stringify({ interactiveElements: elmCsv.rows.length, newElementRecords: elmCsv.rows.length - 557, runtimeExercisedThisRound: tested.size, unpairedScreens: unpaired, visualPairRows: pairs.length, gapIds: gapIds.length, priorities: priorityCounts }, null, 2));

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile, writeFile } from 'node:fs/promises';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const out = 'audit-output/precision-slate-v43-20261029/';
const read = (p) => readFile(path.join(root, p), 'utf8');
const write = async (p, value) => writeFile(path.join(root, p), `\uFEFF${value.replace(/^\uFEFF/, '')}`, 'utf8');

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
  return rows.filter((r) => r.length).map((r) => Object.fromEntries(headers.map((h, i) => [h, r[i] ?? ''])));
}

const backlogText = await read(`${out}12_PRIORITIZED_IMPLEMENTATION_BACKLOG.md`);
const backlog = backlogText.split(/\r?\n/).filter((line) => /^\| P[0-3] \| GAP-\d{4} \|/.test(line)).map((line) => {
  const c = line.split('|').slice(1, -1).map((x) => x.trim().replaceAll('\\|', '|'));
  return { priority: c[0], id: c[1], featureId: c[2], screenId: c[3], title: c[4], expected: c[5], acceptance: c[6], dependencies: c[7], verify: c[8] };
});
if (backlog.length !== 71 || new Set(backlog.map((x) => x.id)).size !== 71) throw new Error(`Expected 71 unique persisted backlog entries, found ${backlog.length}`);

const features = parseCsv(await read(`${out}05_FEATURE_GAP_MATRIX.csv`));
const inventory = parseCsv(await read('docs/ux-inventory/INVENTORY.csv'));
const pairs = parseCsv(await read('docs/ux-inventory/VISUAL_PAIR_REVIEW.csv'));
const featureForGap = new Map();
for (const f of features) for (const id of (f['Gap IDs'] ?? '').split(/[;,/\s]+/).filter((x) => /^GAP-\d{4}$/.test(x))) featureForGap.set(id, f);
const pairForGap = new Map();
for (const p of pairs) for (const id of (p['Gap IDs'] ?? '').split(/[;,/\s]+/).filter((x) => /^GAP-\d{4}$/.test(x))) {
  if (!pairForGap.has(id)) pairForGap.set(id, []);
  pairForGap.get(id).push(p);
}
const screenForId = new Map(inventory.filter((r) => /^SCR-\d{3}$/.test(r.ID)).map((r) => [r.ID, r]));
const resultCategory = {
  CONFIRMED_VISUAL_DIFFERENCE: 'VISUAL_MISMATCH',
  CONFIRMED_MISSING_FEATURE: 'MISSING_FEATURE',
  CONFIRMED_MISSING_SYSTEM_SCREEN: 'MISSING_SCREEN',
  CONFIRMED_UI_ONLY_PLACEHOLDER: 'PARTIAL_FEATURE',
  NOT_VERIFIED_STATE_OR_DATA: 'UNVERIFIED_BEHAVIOR',
  NOT_VERIFIED_FIXTURE_MISMATCH: 'UNVERIFIED_BEHAVIOR',
  NOT_VERIFIED_ROUTE_MAPPING: 'UNVERIFIED_BEHAVIOR',
};
const esc = (v) => String(v ?? 'Not available in surviving source records.').replaceAll('\n', ' ').trim();
const blocks = backlog.map((g) => {
  const f = featureForGap.get(g.id);
  const ps = pairForGap.get(g.id) ?? [];
  const decisive = ps.filter((p) => (p['Visual Result'] ?? '').startsWith('CONFIRMED_'));
  const chosen = decisive[0] ?? ps[0];
  const category = chosen ? resultCategory[chosen['Visual Result']] ?? 'OTHER' : (f?.Status === 'MISSING' ? 'MISSING_FEATURE' : f?.Status === 'PARTIALLY_IMPLEMENTED' ? 'PARTIAL_FEATURE' : f?.Status === 'UI_ONLY' ? 'PARTIAL_FEATURE' : 'UNVERIFIED_BEHAVIOR');
  const screen = screenForId.get(g.screenId);
  const referenceEvidence = [...new Set(ps.map((p) => p.Reference).filter(Boolean))].join('; ') || f?.['Design Reference'] || 'See screen inventory and feature matrix.';
  const systemEvidence = [
    ...new Set(ps.map((p) => p.System).filter(Boolean)),
    f?.['Frontend Evidence'], f?.['Backend Evidence'], f?.['Database Evidence'],
  ].filter(Boolean).join('; ') || screen?.Evidence || 'See source and screen inventory references in the feature matrix.';
  const observations = [...new Set(ps.map((p) => p.Observation).filter(Boolean))];
  const actual = observations.length ? observations.join(' / ') : `${f?.Status ?? 'Not verified'}; ${f?.['Verification Notes'] ?? 'No runtime evidence recorded.'}`;
  const evidenceRefs = [...new Set([
    ...ps.map((p) => p.Evidence).filter(Boolean),
    'audit-output/precision-slate-v43-20261029/05_FEATURE_GAP_MATRIX.csv',
    'docs/ux-inventory/VISUAL_PAIR_REVIEW.csv',
    'docs/ux-inventory/INVENTORY.csv',
  ])].join('; ');
  const confidence = chosen && chosen['Visual Result']?.startsWith('CONFIRMED_') ? 'High for recorded visual/result evidence' : 'Medium or Not Verified; see source classification';
  const module = f?.Module ?? screen?.['Surface/Screen'] ?? 'See screen and feature inventory.';
  const relatedFeatures = f?.['Feature ID'] ?? g.featureId;
  return `\n## ${g.id} — ${g.title}\n\n- **Category:** ${category}\n- **Priority:** ${g.priority}\n- **Confidence:** ${confidence}\n- **Affected Module:** ${esc(module)}\n- **Affected Screen IDs:** ${g.screenId}\n- **Affected Element IDs:** Not mapped in surviving traceability records; see interactive inventory by Screen ID.\n- **Related Feature IDs:** ${relatedFeatures}\n- **Related Flow IDs:** See 06_USER_FLOW_AUDIT.md; no flow is claimed from a screenshot alone.\n- **Design Reference:** ${esc(referenceEvidence)}\n- **Current System Evidence:** ${esc(systemEvidence)}\n- **Expected Behavior:** ${esc(g.expected)}\n- **Actual Behavior:** ${esc(actual)}\n- **Exact Missing or Incorrect Detail:** ${esc(g.title)}\n- **Why This Is a Gap:** The persisted backlog records this expected behavior and acceptance condition; current evidence above records the observed or classified implementation state.\n- **User Impact:** Not independently rated in the surviving evidence; priority is inherited from the persisted backlog.\n- **Business Impact:** Not independently rated in the surviving evidence; consult the feature and flow records before implementation.\n- **Technical Impact:** See frontend/backend/database evidence above; where absent, implementation layer is unverified.\n- **Root Cause:** Unknown unless identified in cited system evidence.\n- **Dependencies:** ${esc(g.dependencies)}\n- **Suggested Corrective Action:** ${esc(g.title)}: ${esc(g.expected)}\n- **Acceptance Criteria:** ${esc(g.acceptance)}\n- **Recommended Verification Method:** ${esc(g.verify)}\n- **Implementation Complexity:** Unknown; no new estimate assigned.\n- **Open Questions:** Use the linked feature, flow, and unverified-items reports for unresolved product or runtime questions.\n- **Evidence references:** ${esc(evidenceRefs)}\n`;
}).join('\n');

const gapDoc = `# 11 — Master Gap Register\n\nRecovery note: The expanded entries below were reconstructed from the persisted implementation backlog, feature matrix, screen inventory, and screenshot-pair register. Any detail that cannot be supported by those records is explicitly marked unknown or not verified; this reconstruction does not claim the lost prose was recovered verbatim.\n\n71 unique Gap IDs are retained. The status and confidence of each entry remain evidence-scoped; a completed audit record does not imply implementation success.\n${blocks}\n`;
await write(`${out}11_MASTER_GAP_REGISTER.md`, gapDoc);

const sectionFiles = [
  ['00-executive-summary', '00_EXECUTIVE_SUMMARY.md'],
  ['01-screen-inventory', '01_SCREEN_INVENTORY.md'],
  ['02-screen-by-screen-specification', '02_SCREEN_BY_SCREEN_SPECIFICATION.md'],
  ['03-interactive-element-inventory', null],
  ['04-feature-inventory', '04_FEATURE_INVENTORY.md'],
  ['05-feature-gap-matrix', null],
  ['06-user-flow-audit', '06_USER_FLOW_AUDIT.md'],
  ['07-ui-ux-visual-mismatches', '07_UI_UX_VISUAL_MISMATCHES.md'],
  ['08-backend-api-database-gaps', '08_BACKEND_API_DATABASE_GAPS.md'],
  ['09-accessibility-responsive-states', '09_ACCESSIBILITY_RESPONSIVE_STATES.md'],
  ['10-system-features-without-design', '10_SYSTEM_FEATURES_WITHOUT_DESIGN.md'],
  ['11-master-gap-register', '11_MASTER_GAP_REGISTER.md'],
  ['12-prioritized-implementation-backlog', '12_PRIORITIZED_IMPLEMENTATION_BACKLOG.md'],
  ['13-unverified-items-and-limitations', '13_UNVERIFIED_ITEMS_AND_LIMITATIONS.md'],
  ['14-coverage-and-completeness-report', '14_COVERAGE_AND_COMPLETENESS_REPORT.md'],
];
const title = '# MASTER UI/UX AUDIT — Precision Slate ERP v43\n\nConsolidated continuation of the existing audit. UI/UX screenshot evidence and actual click evidence are distinguished from static implementation inspection. Audit only; no application, backend, or database changes.\n\n';
let master = title;
for (const [anchor, file] of sectionFiles) {
  const body = file
    ? await read(`${out}${file}`)
    : anchor === '03-interactive-element-inventory'
      ? '# 03 — Interactive element inventory\n\nThe complete element-level inventory is maintained in [03_INTERACTIVE_ELEMENT_INVENTORY.csv](03_INTERACTIVE_ELEMENT_INVENTORY.csv). It contains 557 indexed controls; the coverage report distinguishes indexed elements from individually exercised interactions.'
      : '# 05 — Feature gap matrix\n\nThe complete design-to-system matrix is maintained in [05_FEATURE_GAP_MATRIX.csv](05_FEATURE_GAP_MATRIX.csv).';
  master += `\n<a id="${anchor}"></a>\n\n${body}\n`;
}
master += '\n<a id="latest-runtime-evidence-2026-10-29"></a>\n\n# Latest runtime evidence — 2026-10-29\n\n- Visual pair register: 147 rows, including 141 unique Screen ID × viewport pairs across 47 screen IDs; 144 rows are marked REVIEWED_MANUAL_PAIR and 3 remain NOT_VERIFIED_ROUTE_MAPPING.\n- Twelve of the 147 visual results remain unresolved (6 state/data, 3 fixture mismatch, 3 route mapping). There are 22 screen IDs with no direct pair; see [SCREEN_PAIR_BLOCKERS.csv](../../docs/ux-inventory/SCREEN_PAIR_BLOCKERS.csv).\n- Reference navigation activation: 20/35 target panels activated; 60 captures across three viewports. Fifteen target panels remain blocked or unverified.\n- React/MSW UI checks: 68/68 recorded checks passed, but do not map one-to-one to 557 indexed elements. Customer and invoice detail row-click captures: 6/6. Backend/database end-to-end flows: 0/10.\n- Screenshot path integrity, Gap ID links, and pair Screen IDs were checked against the inventories; see the coverage and limitations sections.\n';
await write(`${out}MASTER_UI_UX_AUDIT.md`, master);
console.log(JSON.stringify({ rebuiltGaps: backlog.length, masterSections: sectionFiles.length + 3, gapPairs: pairForGap.size }, null, 2));

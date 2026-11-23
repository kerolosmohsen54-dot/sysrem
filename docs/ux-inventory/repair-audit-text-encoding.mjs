import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile, writeFile } from 'node:fs/promises';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const cp1252Special=new Map([[0x20ac,0x80],[0x201a,0x82],[0x0192,0x83],[0x201e,0x84],[0x2026,0x85],[0x2020,0x86],[0x2021,0x87],[0x02c6,0x88],[0x2030,0x89],[0x0160,0x8a],[0x2039,0x8b],[0x0152,0x8c],[0x017d,0x8e],[0x2018,0x91],[0x2019,0x92],[0x201c,0x93],[0x201d,0x94],[0x2022,0x95],[0x2013,0x96],[0x2014,0x97],[0x02dc,0x98],[0x2122,0x99],[0x0161,0x9a],[0x203a,0x9b],[0x0153,0x9c],[0x017e,0x9e],[0x0178,0x9f]]);
function repair(text){const bytes=[];for(const ch of text){const cp=ch.codePointAt(0);if(cp<=0xff)bytes.push(cp);else if(cp1252Special.has(cp))bytes.push(cp1252Special.get(cp));else bytes.push(...Buffer.from(ch,'utf8'));}return Buffer.from(bytes).toString('utf8');}
async function get(file){return readFile(path.join(root,file),'utf8');}
async function put(file,text){await writeFile(path.join(root,file),'\uFEFF'+text.replace(/^\uFEFF/,''),'utf8');}
function parseCsv(text){const lines=[];let row=[],field='',quoted=false;for(let i=0;i<text.length;i++){const c=text[i];if(quoted){if(c==='"'&&text[i+1]==='"'){field+='"';i++;}else if(c==='"')quoted=false;else field+=c;}else if(c==='"')quoted=true;else if(c===','){row.push(field);field='';}else if(c==='\n'){row.push(field.replace(/\r$/,''));lines.push(row);row=[];field='';}else field+=c;}if(field.length||row.length){row.push(field.replace(/\r$/,''));lines.push(row);}const [raw,...data]=lines;const h=raw.map((x,i)=>i===0?x.replace(/^\uFEFF/,''):x);return{h,rows:data.filter(x=>x.length).map(x=>Object.fromEntries(h.map((key,i)=>[key,x[i]??''])))};}
function csv(headers,rows){const q=v=>'"'+String(v??'').replaceAll('"','""')+'"';return[headers,...rows.map(r=>headers.map(h=>r[h]??''))].map(r=>r.map(q).join(',')).join('\r\n')+'\r\n';}

for(const file of ['audit-output/precision-slate-v43-20261029/00_EXECUTIVE_SUMMARY.md','audit-output/precision-slate-v43-20261029/07_UI_UX_VISUAL_MISMATCHES.md','audit-output/precision-slate-v43-20261029/13_UNVERIFIED_ITEMS_AND_LIMITATIONS.md','audit-output/precision-slate-v43-20261029/14_COVERAGE_AND_COMPLETENESS_REPORT.md','audit-output/precision-slate-v43-20261029/PROGRESS.md'])await put(file,repair(await get(file)));

let screenDoc=await get('audit-output/precision-slate-v43-20261029/01_SCREEN_INVENTORY.md');
const tableAt=screenDoc.indexOf('| Screen ID |');
const afterTable=screenDoc.indexOf('\n\n## ',tableAt);
const tableEnd=afterTable<0?screenDoc.length:afterTable;
const tableText=screenDoc.slice(tableAt,tableEnd);
let pre=repair(screenDoc.slice(0,tableAt));
let post=repair(screenDoc.slice(tableEnd));
screenDoc=pre+tableText+post;
screenDoc=screenDoc.replace('| Evidence |\\n|---|---|---|---|---|---|','| Evidence |\n|---|---|---|---|---|---|');
await put('audit-output/precision-slate-v43-20261029/01_SCREEN_INVENTORY.md',screenDoc);

let gapFile='audit-output/precision-slate-v43-20261029/11_MASTER_GAP_REGISTER.md';
let gapText=await get(gapFile);
const gap45=gapText.indexOf('## GAP-0045');
if(gap45>=0){let start=gapText.lastIndexOf('\n## ',gap45);if(start<0)start=gap45;gapText=gapText.slice(0,start)+repair(gapText.slice(start));}
await put(gapFile,gapText);

const newScreens=new Set(['SCR-026','SCR-027','SCR-028','SCR-029','SCR-032','SCR-033','SCR-050','SCR-051','SCR-052','SCR-056','SCR-057','SCR-058','SCR-059','SCR-060','SCR-061','SCR-062','SCR-063','SCR-064','SCR-065','SCR-066','SCR-067']);
const visualFile='docs/ux-inventory/VISUAL_PAIR_REVIEW.csv';
let parsed=parseCsv(await get(visualFile));
for(const row of parsed.rows)if(newScreens.has(row['Screen ID']))row.Observation=repair(row.Observation);
await put(visualFile,csv(parsed.h,parsed.rows));

const featureFile='audit-output/precision-slate-v43-20261029/05_FEATURE_GAP_MATRIX.csv';
parsed=parseCsv(await get(featureFile));
for(const row of parsed.rows)if(['F-014','F-015','F-018','F-041','F-042','F-037','F-038','F-039','F-040'].includes(row['Feature ID'])){row['Verification Notes']=repair(row['Verification Notes']);if(['F-014','F-015','F-018','F-041','F-042'].includes(row['Feature ID']))row['Frontend Evidence']=repair(row['Frontend Evidence']);}
await put(featureFile,csv(parsed.h,parsed.rows));

let masterFile='audit-output/precision-slate-v43-20261029/MASTER_UI_UX_AUDIT.md';
let master=await get(masterFile);
const a=master.indexOf('<a id="00-executive-summary"></a>');
const one=master.indexOf('<a id="01-screen-inventory"></a>');
const two=master.indexOf('<a id="02-screen-by-screen-specification"></a>');
if(a>=0&&one>a&&two>one){
  master=repair(master.slice(0,one))+master.slice(one,two)+(await get('audit-output/precision-slate-v43-20261029/01_SCREEN_INVENTORY.md')).replace(/^\uFEFF/,'')+'\n\n'+master.slice(two);
}
const cov=master.indexOf('<a id="14-coverage-and-completeness-report"></a>');
const latest=master.indexOf('<a id="latest-runtime-evidence-2026-10-29"></a>',cov);
if(cov>=0&&latest>cov)master=master.slice(0,cov)+repair(master.slice(cov,latest))+master.slice(latest);
const g45=master.indexOf('## GAP-0045');
if(g45>=0){let start=master.lastIndexOf('\n## ',g45);if(start<0)start=g45;master=master.slice(0,start)+repair(master.slice(start));}
await put(masterFile,master);
console.log(JSON.stringify({fixed:'UTF-8 mojibake in new audit blocks; added UTF-8 BOM; preserved old source sections',pairRows:parsed.rows.length},null,2));


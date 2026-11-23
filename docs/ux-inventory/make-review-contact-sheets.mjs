import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile, writeFile } from 'node:fs/promises';
import { chromium } from '../../frontend/node_modules/@playwright/test/index.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const dir='docs/ux-inventory/screenshots/system-mock/state-comparisons';
const groups=[
 ['governorates','opening-stock','trash','drivers','audit','warehouse-returns','container-funds','minimum-stock','inventory-counts'],
 ['container-tracking','product-cost-history','barcode-labels','stock-returns-candidate','install-app']
];
const vp=[['1280',2560,930],['768',1536,1054],['390',780,874]];
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--headless=new']});
try { for(const [name,width,height] of vp) for(let gi=0;gi<groups.length;gi++) {
 const files=groups[gi].map(slug=>`${dir}/round5-${slug}-${name}-side-by-side.png`);
 const embeds=await Promise.all(files.map(async(file,i)=>({file,slug:groups[gi][i],data:(await readFile(path.join(root,file))).toString('base64')})));
 const scale=name==='1280'?0.5:name==='768'?0.6:0.7;
 const tileW=Math.round(width*scale), tileH=Math.round((height+30)*scale);
 const html=`<html><head><meta charset="utf-8"><style>*{box-sizing:border-box}body{margin:0;padding:8px;background:#101114;color:#fff;font:16px Arial;display:grid;grid-template-columns:repeat(2,${tileW}px);gap:8px;align-content:start}.card{background:#24262b;border:1px solid #555}.label{height:26px;padding:4px 8px;font-weight:bold}.card img{display:block;width:${tileW}px;height:${tileH}px;object-fit:fill}</style></head><body>${embeds.map(x=>`<div class="card"><div class="label">${x.slug} — ${name}px pair</div><img src="data:image/png;base64,${x.data}"></div>`).join('')}</body></html>`;
 const page=await browser.newPage({viewport:{width:tileW*2+24,height:tileH*Math.ceil(embeds.length/2)+80}}); await page.setContent(html); const out=`docs/ux-inventory/screenshots/system-mock/state-comparisons/contact-${name}-g${gi+1}.png`; await page.screenshot({path:path.join(root,out),fullPage:true}); await page.close();
 }
} finally { await browser.close(); }
console.log('created contact sheets');

import path from 'node:path';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { mkdir, readFile } from 'node:fs/promises';
import { chromium } from '../../frontend/node_modules/playwright/index.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const out=path.join(root,'docs/ux-inventory/screenshots/comparisons/row-click-details');
const chrome='C:/Program Files/Google/Chrome/Application/chrome.exe';
const browser=await chromium.launch({headless:true,...(existsSync(chrome)?{executablePath:chrome,args:['--headless=new']}: {})});
const specs=[
  {slug:'customer-detail',screen:'SCR-030',viewports:[['1280',1280,900],['768',768,1024],['390',390,844]]},
  {slug:'invoice-detail',screen:'SCR-031',viewports:[['1280',1280,900],['768',768,1024],['390',390,844]]},
  {slug:'movement-detail-vs-system-list',screen:'SCR-053',viewports:[['1280',1280,900],['768',768,1024],['390',390,844]]},
];
try{
  await mkdir(out,{recursive:true});
  for(const spec of specs)for(const [name,width,height] of spec.viewports){
    const refPath=path.join(root,`docs/ux-inventory/screenshots/reference/row-click-details/${spec.slug==='movement-detail-vs-system-list'?'movement-detail':spec.slug}-${name}.png`);
    const sysPath=path.join(root,`docs/ux-inventory/screenshots/system-mock/react/visual-round7/${spec.slug==='customer-detail'?'customer-detail':spec.slug==='invoice-detail'?'invoice-detail':`movement-list-click-review`}-${name}.png`);
    const [ref,sys]=await Promise.all([readFile(refPath),readFile(sysPath)]);
    const context=await browser.newContext({viewport:{width:width*2,height:height+40},deviceScaleFactor:1});
    const page=await context.newPage();
    const data=(b)=>`data:image/png;base64,${b.toString('base64')}`;
    await page.setContent(`<!doctype html><html><head><style>*{box-sizing:border-box}html,body{margin:0;background:#090909;color:#fff;font:14px Segoe UI,Tahoma,sans-serif}.pair{display:grid;grid-template-columns:1fr 1fr;height:100vh}.side{display:flex;flex-direction:column;min-width:0;border-right:1px solid #666}.label{height:40px;flex:none;padding:10px 14px;background:#202329;color:#fff;direction:ltr;font-weight:700}.image{height:calc(100vh - 40px);display:flex;align-items:flex-start;justify-content:center;overflow:hidden;background:#000}.image img{width:100%;height:100%;object-fit:contain;object-position:top center}</style></head><body><div class="pair"><div class="side"><div class="label">REFERENCE — ${spec.screen}, ${name}px</div><div class="image"><img src="${data(ref)}"></div></div><div class="side"><div class="label">SYSTEM CANDIDATE — ${spec.screen}, ${name}px</div><div class="image"><img src="${data(sys)}"></div></div></div></body></html>`);
    const filename=`${spec.screen.toLowerCase()}-${name}-side-by-side.png`;
    await page.screenshot({path:path.join(out,filename)});
    await context.close();
  }
  console.log(JSON.stringify({pairs:specs.reduce((n,s)=>n+s.viewports.length,0),output:'docs/ux-inventory/screenshots/comparisons/row-click-details'},null,2));
}finally{await browser.close();}

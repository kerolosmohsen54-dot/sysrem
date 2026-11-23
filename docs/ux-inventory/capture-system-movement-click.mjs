import path from 'node:path';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from '../../frontend/node_modules/@playwright/test/index.mjs';
import { createServer } from '../../frontend/node_modules/vite/dist/node/index.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const frontend=path.join(root,'frontend');
const output=path.join(root,'docs/ux-inventory/screenshots/system-mock/react/visual-round7');
const browserPath=process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE??(existsSync('C:/Program Files/Google/Chrome/Application/chrome.exe')?'C:/Program Files/Google/Chrome/Application/chrome.exe':undefined);
const browser=await chromium.launch({headless:true,...(browserPath?{executablePath:browserPath,args:['--headless=new']}: {})});
const server=await createServer({configFile:path.join(frontend,'vite.config.ts'),root:frontend,mode:'test',define:{'import.meta.env.VITE_MOCK_API':JSON.stringify('true')},server:{host:'127.0.0.1',port:5190,strictPort:true,proxy:{'/api/v1':{target:'http://127.0.0.1:1',changeOrigin:true}}}});
const results=[];
const viewports=[{name:'1280',width:1280,height:900},{name:'768',width:768,height:1024},{name:'390',width:390,height:844}];
async function navigateByVisibleSearch(page,label,href){
  const trigger=page.locator('.global-search-trigger');
  if(await trigger.isVisible().catch(()=>false))await trigger.click();
  else await page.locator('.mobile-bottom-nav button').filter({hasText:/بحث/}).first().click();
  const dialog=page.locator('[role="dialog"]').last();const input=dialog.locator('input[type="search"]');await input.fill(label);
  const link=dialog.locator(`.global-search-results a[href="${href}"]`).first();await link.waitFor({state:'visible',timeout:5000});await link.click();
  await page.waitForFunction((p)=>location.pathname===p,href,{timeout:5000});
}
try{
  await server.listen();const origin=server.resolvedUrls?.local?.[0]?.replace(/\/$/,'');if(!origin)throw new Error('Vite test server did not expose a local URL.');await mkdir(output,{recursive:true});
  for(const vp of viewports){
    const context=await browser.newContext({viewport:{width:vp.width,height:vp.height}});const page=await context.newPage();
    await page.goto(`${origin}/login`,{waitUntil:'networkidle'});await page.locator('#login-username').fill('owner-demo');await page.locator('#login-password').fill('demo');await page.locator('button[type="submit"]').click();await page.locator('.app-shell').waitFor({timeout:10000});
    await navigateByVisibleSearch(page,'حركات المخزون','/inventory/movements');await page.waitForTimeout(400);
    const before=await page.evaluate(()=>({path:location.pathname,title:document.querySelector('main h1')?.textContent?.trim()??'',text:document.querySelector('main')?.innerText.trim().slice(0,1200)??'',rows:[...document.querySelectorAll('main tbody tr')].slice(0,8).map(r=>({text:r.innerText.trim(),interactive:r.querySelectorAll('a,button,[role="button"]')?.length??0,html:r.outerHTML.slice(0,500)}))}));
    await page.screenshot({path:path.join(output,`movement-list-click-review-${vp.name}.png`),fullPage:true});
    const firstInteractive=page.locator('main tbody tr a, main tbody tr button, main tbody tr [role="button"]').first();
    const firstRow=page.locator('main tbody tr').first();
    const targetCount=await page.locator('main tbody tr a, main tbody tr button, main tbody tr [role="button"]').count();
    let after=null,clicked=false,clickError=null,clickedTargetType=null;
    try{
      if(targetCount){await firstInteractive.click({timeout:4000});clickedTargetType='interactive table control';}
      else if(await firstRow.count()){await firstRow.click({timeout:4000});clickedTargetType='first table row (no link/button/role=button present)';}
      if(clickedTargetType){await page.waitForTimeout(300);clicked=true;after=await page.evaluate(()=>({path:location.pathname,activeDialogs:[...document.querySelectorAll('[role="dialog"]')].filter(e=>e.offsetWidth||e.offsetHeight).map(e=>e.innerText.trim().slice(0,300)),title:document.querySelector('main h1')?.textContent?.trim()??'',text:document.querySelector('main')?.innerText.trim().slice(0,800)??''}));await page.screenshot({path:path.join(output,`movement-row-click-result-${vp.name}.png`),fullPage:true});}
    }catch(e){clickError=String(e).split('\n')[0];}
    results.push({viewport:vp.name,actualPath:before.path,observedTitle:before.title,firstRows:before.rows,tableInteractiveCount:targetCount,clicked,clickedTargetType,clickError,after,navigation:'Visible global-search result clicked; route transition observed.',listScreenshot:`docs/ux-inventory/screenshots/system-mock/react/visual-round7/movement-list-click-review-${vp.name}.png`});await context.close();
  }
  await writeFile(path.join(root,'docs/ux-inventory/SYSTEM_MOVEMENT_CLICK_REVIEW.json'),JSON.stringify({environment:'isolated Vite/MSW synthetic owner-demo session; route reached through visible global-search link; list-row interaction only; no forms or writes',results},null,2)+'\n','utf8');
  console.log(JSON.stringify(results.map(r=>({viewport:r.viewport,route:r.actualPath,title:r.observedTitle,rowControls:r.tableInteractiveCount,clicked:r.clicked,resultPath:r.after?.path??null,error:r.clickError??null})),null,2));
}finally{await browser.close();await server.close();}

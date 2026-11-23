import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from '../../frontend/node_modules/@playwright/test/index.mjs';
import { createServer } from '../../frontend/node_modules/vite/dist/node/index.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const frontend = path.join(root, 'frontend');
const out = path.join(root, 'docs/ux-inventory/screenshots/system-mock/react/visual-round3');
const routes = [
  { slug:'governorates', href:'/admin/governorates', reference:'govs', screenId:'SCR-026', label:'governorates admin' },
  { slug:'opening-stock', href:'/inventory/opening-stock', reference:'stock-add', screenId:'SCR-027', label:'opening stock / add stock' },
  { slug:'trash', href:'/admin/trash', reference:'trash', screenId:'SCR-029', label:'recycle bin' },
  { slug:'drivers', href:'/admin/drivers', reference:'drivers', screenId:'SCR-032', label:'shipping drivers' },
  { slug:'audit', href:'/admin/audit', reference:'log', screenId:'SCR-033', label:'audit log' },
  { slug:'container-transfers', href:'/container-transfers', reference:'transfers', screenId:'SCR-050', label:'container transfers' },
  { slug:'warehouse-returns', href:'/warehouse-returns', reference:'wh-returns', screenId:'SCR-051', label:'warehouse returns' },
  { slug:'container-funds', href:'/container-funds', reference:'cont-money', screenId:'SCR-052', label:'container funds' },
  { slug:'customer-balances', href:'/reports/customer-balances', reference:'f-custbal', screenId:'SCR-041', label:'customer balances' },
  { slug:'minimum-stock', href:'/inventory/minimum-stock', reference:'x-low', screenId:'SCR-061', label:'minimum stock' },
  { slug:'inventory-counts', href:'/inventory/counts', reference:'x-count', screenId:'SCR-062', label:'inventory counts' },
  { slug:'pwa-install', href:'/admin/install', reference:'x-app', screenId:'SCR-067', label:'install app' },
];
const viewports=[{name:'1280',width:1280,height:900},{name:'768',width:768,height:1024},{name:'390',width:390,height:844}];
const results=[];
const browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,args:['--headless=new']}: {})});
const server=await createServer({configFile:path.join(frontend,'vite.config.ts'),root:frontend,mode:'test',define:{'import.meta.env.VITE_MOCK_API':JSON.stringify('true')},server:{host:'127.0.0.1',port:5192,strictPort:true,proxy:{'/api/v1':{target:'http://127.0.0.1:1',changeOrigin:true}}}});
try{
  await server.listen(); const origin=server.resolvedUrls?.local?.[0]?.replace(/\/$/,''); if(!origin)throw new Error('Isolated Vite test server did not start.'); await mkdir(out,{recursive:true});
  for(const viewport of viewports){
    const context=await browser.newContext({viewport:{width:viewport.width,height:viewport.height},serviceWorkers:'allow'});const page=await context.newPage();
    await page.goto(`${origin}/login`,{waitUntil:'networkidle'});await page.locator('#login-username').fill('owner-demo');await page.locator('#login-password').fill('demo');await page.locator('button[type="submit"]').click();await page.locator('.app-shell').waitFor({timeout:10000});
    for(const route of routes){
      const searchTrigger=await page.locator('.global-search-trigger').isVisible().catch(()=>false)?page.locator('.global-search-trigger'):page.locator('.mobile-bottom-nav button').first();
      if(!(await searchTrigger.isVisible().catch(()=>false))){results.push({viewport:viewport.name,...route,result:'NOT_VERIFIED_NO_VISIBLE_SEARCH_CONTROL'});continue;}
      await searchTrigger.click();const dialog=page.locator('[role="dialog"]').first();await dialog.waitFor({state:'visible',timeout:3000});
      const link=page.locator(`.global-search-results a[href="${route.href}"]`).first();
      let navigationLink=link;let navigationSource='global-search result click';
      const directVisualCapture=!(await link.count());
      if(directVisualCapture){
        await page.keyboard.press('Escape');
        if(viewport.width<900){const menu=page.locator('.mobile-menu-toggle');if(await menu.isVisible().catch(()=>false)&&await menu.getAttribute('aria-expanded')!=='true')await menu.click();}
        const sidebar=page.locator('.sidebar-nav');await sidebar.evaluate(el=>{el.scrollTop=0;});
        navigationLink=page.locator(`.sidebar-nav a[href="${route.href}"]`).first();navigationSource='visible sidebar link click (global search has no result for this auxiliary route)';
        if(!(await navigationLink.count())){results.push({viewport:viewport.name,...route,result:'NOT_VERIFIED_LINK_ABSENT_IN_SEARCH_AND_SIDEBAR'});continue;}
        const group=navigationLink.locator('xpath=ancestor::details[1]');if(await group.count()&&!(await group.evaluate(el=>el.open))){const summary=group.locator('summary');if(await summary.isVisible().catch(()=>false)){await summary.evaluate(el=>el.scrollIntoView({block:'center'}));try{await summary.click({timeout:1000});}catch(error){results.push({viewport:viewport.name,...route,result:'NOT_VERIFIED_SIDEBAR_GROUP_OUTSIDE_VIEWPORT',note:String(error).split('\n')[0]});continue;}}}
        await navigationLink.scrollIntoViewIfNeeded();
      }
      const beforePath=await page.evaluate(()=>location.pathname);const beforeHeading=(await page.locator('.main-content h1').first().textContent().catch(()=>''))?.trim()??'';
      try{
        await navigationLink.click({timeout:5000});await page.waitForFunction(pathname=>location.pathname===pathname,route.href, {timeout:5000});
        await page.waitForFunction(({pathname,heading})=>location.pathname===pathname&&((document.querySelector('.main-content h1')?.textContent?.trim()??'')!==heading),{pathname:route.href,heading:beforeHeading},{timeout:2000}).catch(()=>undefined);
        await page.waitForTimeout(250);
        const heading=(await page.locator('.main-content h1').first().textContent().catch(()=>''))?.trim()??'';
        const screenshot=`docs/ux-inventory/screenshots/system-mock/react/visual-round3/${route.slug}-${viewport.name}.png`;
        await page.screenshot({path:path.join(root,screenshot)});
        const actualPath=await page.evaluate(()=>location.pathname);
        results.push({viewport:viewport.name,...route,navigationSource,beforePath,actualPath,heading,renderedDifferentHeading:heading!==beforeHeading,screenshot,result:actualPath===route.href?'CLICK_PATH_CONFIRMED':'CLICK_PATH_MISMATCH'});
      }catch(error){results.push({viewport:viewport.name,...route,beforePath,headingBefore:beforeHeading,result:'CLICK_OR_RENDER_NOT_VERIFIED',note:String(error).split('\n')[0]});}
    }
    await context.close();
  }
  await writeFile(path.join(root,'docs/ux-inventory/ADDITIONAL_ROUTE_SCREEN_REVIEW.json'),`${JSON.stringify({environment:'React Vite/MSW only; navigated by visible sidebar clicks; proxy fallback closed at 127.0.0.1:1',results},null,2)}\n`,'utf8');
  console.log(JSON.stringify({total:results.length,clickPathConfirmed:results.filter(x=>x.result==='CLICK_PATH_CONFIRMED').length,clickOrRenderUnverified:results.filter(x=>x.result!=='CLICK_PATH_CONFIRMED').length,output:'docs/ux-inventory/ADDITIONAL_ROUTE_SCREEN_REVIEW.json'},null,2));
}finally{await server.close();await browser.close();}

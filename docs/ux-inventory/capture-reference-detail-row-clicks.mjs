import path from 'node:path';
import { existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { chromium } from '../../frontend/node_modules/playwright/index.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const html = path.join(root, 'frontend/reference/precision-slate-erp-v43__3_ (1).html');
const fixture = JSON.parse(await readFile(path.join(root, 'frontend/reference/reference-fixture.json'), 'utf8'));
const out = path.join(root, 'docs/ux-inventory/screenshots/reference/row-click-details');
const chrome = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const browser = await chromium.launch({headless:true,...(existsSync(chrome)?{executablePath:chrome,args:['--headless=new']}: {})});
const results=[];
const allViewports=[{name:'1280',width:1280,height:900},{name:'768',width:768,height:1024},{name:'390',width:390,height:844}];
const selected=new Set((process.env.DETAIL_VIEWPORTS??'').split(',').map(x=>x.trim()).filter(Boolean));
const viewports=selected.size?allViewports.filter(v=>selected.has(v.name)):allViewports;
try {
  await mkdir(out,{recursive:true});
  for (const vp of viewports) {
    const context=await browser.newContext({viewport:{width:vp.width,height:vp.height}});
    await context.addInitScript((entries)=>{for(const[k,v]of Object.entries(entries))localStorage.setItem(k,typeof v==='string'?v:JSON.stringify(v));},fixture.localStorage);
    const page=await context.newPage();const dialogs=[];page.on('dialog',async d=>{dialogs.push({type:d.type(),message:d.message()});if(d.type()==='prompt'&&d.message().includes('قسم العملاء'))await d.accept('1234');else await d.dismiss();});await page.route(/^https?:\/\//,r=>r.abort());await page.goto(pathToFileURL(html).href,{waitUntil:'load'});
    await page.locator('#login-user').selectOption({index:0});await page.locator('#login-pass').fill('1234');await page.locator('#login-screen .login-btn').click();await page.waitForFunction(()=>!document.body.classList.contains('logged-out'));
    await page.waitForTimeout(5000); // allow login toasts to disappear before visual comparison
    const result={viewport:vp.name};
    try {
      if(vp.width<900){const m=page.locator('#x-menu-btn');if(await m.isVisible().catch(()=>false))await m.click();}
      const customersGroup=page.locator('.sidebar-nav .nav-group-btn').filter({hasText:'العملاء'}).first();
      const customersSub=page.locator('#cust-sub');
      if(await customersGroup.count()&&await customersGroup.isVisible().catch(()=>false)&&!(await customersSub.getAttribute('class')??'').includes('open'))await customersGroup.click();
      const customersLink=page.locator('#cust-sub .nav-sub-item').filter({hasText:'كل العملاء'}).first();
      if(await customersLink.count()&&await customersLink.isVisible().catch(()=>false))await customersLink.click();
      else {const direct=page.locator('.sidebar-nav [onclick*="showSection(\'customers\')"]').first();if(await direct.count()&&await direct.isVisible().catch(()=>false))await direct.click();}
      await page.waitForFunction(()=>document.querySelector('#sec-customers')?.classList.contains('active'),null,{timeout:3000});
      if(vp.width<900){const m=page.locator('#x-menu-btn');if(await m.isVisible().catch(()=>false)&&((await page.locator('.sidebar').getAttribute('class'))??'').includes('open'))await m.click();}
      const custRow=page.locator('#sec-customers tbody tr[onclick*="openCust"], #customers-tbody tr[onclick*="openCust"]').first();
      result.customerRowCount=await page.locator('#sec-customers tbody tr[onclick*="openCust"], #customers-tbody tr[onclick*="openCust"]').count();
      if(await custRow.count()){
        await custRow.click();await page.waitForTimeout(250);
        result.customerState=await page.evaluate(()=>({active:[...document.querySelectorAll('.section-content.active')].map(e=>e.id),visibleDetails:[...document.querySelectorAll('#sec-cust-file,#customer-detail-panel,.detail-panel')].filter(e=>e.offsetWidth||e.offsetHeight).map(e=>({id:e.id,cls:e.className,text:e.innerText.trim().slice(0,260)})),heading:document.querySelector('.page-hd h1')?.textContent?.trim()??null}));result.dialogs=dialogs;
        result.customerControls=await page.locator('#sec-cust-file button, #sec-cust-file a, #sec-cust-file [role="tab"], #sec-cust-file .tab-item').evaluateAll(nodes=>nodes.map((e,i)=>({index:i,tag:e.tagName,label:(e.innerText||e.getAttribute('aria-label')||e.title||'').trim(),role:e.getAttribute('role'),class:e.className,disabled:e.disabled??false,href:e.getAttribute('href'),onclick:e.getAttribute('onclick')})));
        result.customerTabResults=[];
        for(const label of ['نظرة عامة','الفواتير','الدفعات','سجل العميل']){
          const tab=page.locator('#sec-cust-file .tab-item').filter({hasText:label}).first();
          if(await tab.count()){
            await tab.click({timeout:3000});await page.waitForTimeout(120);
            const tabId={ 'نظرة عامة':'ov','الفواتير':'inv','الدفعات':'pay','سجل العميل':'log' }[label];
            const panel=page.locator(`#cf-${tabId}`);
            result.customerTabResults.push({label,clicked:true,panelVisible:await panel.evaluate(e=>getComputedStyle(e).display!=='none').catch(()=>false),panelText:await panel.innerText().catch(()=>''),screenshot:`docs/ux-inventory/screenshots/reference/row-click-details/customer-tabs/customer-${tabId}-${vp.name}.png`});
          }else result.customerTabResults.push({label,clicked:false});
        }
        await page.locator('#sec-cust-file .tab-item').filter({hasText:'نظرة عامة'}).first().click({timeout:3000});await page.waitForTimeout(150);
        result.customerScreenshot=`docs/ux-inventory/screenshots/reference/row-click-details/customer-detail-${vp.name}.png`;await page.waitForTimeout(700);await page.screenshot({path:path.join(root,result.customerScreenshot),animations:'disabled',timeout:15000});
      } else result.customerError='No customer row with openCust handler was visible.';
    } catch(e){result.customerError=String(e).split('\n')[0];}
    try {
      const custTab=page.locator('#sec-cust-file .tab-item').filter({hasText:'الفواتير'}).first();
      if(await custTab.count())await custTab.click();
      const invRow=page.locator('#sec-cust-file #cf-inv tbody tr[onclick*="invDetail"]').first();
      result.invoiceRowCount=await page.locator('#sec-cust-file #cf-inv tbody tr[onclick*="invDetail"]').count();
      if(await invRow.count()){
        await invRow.click();await page.waitForTimeout(250);
        result.invoiceState=await page.evaluate(()=>({active:[...document.querySelectorAll('.section-content.active')].map(e=>e.id),visibleDetails:[...document.querySelectorAll('#sec-inv-detail,.invoice-detail,.modal,.overlay')].filter(e=>e.offsetWidth||e.offsetHeight).map(e=>({id:e.id,cls:e.className,text:e.innerText.trim().slice(0,260)})),heading:document.querySelector('.page-hd h1')?.textContent?.trim()??null}));
        result.invoiceScreenshot=`docs/ux-inventory/screenshots/reference/row-click-details/invoice-detail-${vp.name}.png`;await page.screenshot({path:path.join(root,result.invoiceScreenshot)});
        result.invoiceControls=await page.locator('#sec-inv-detail button, #sec-inv-detail a, #sec-inv-detail [role="button"]').evaluateAll(nodes=>nodes.map((e,i)=>({index:i,tag:e.tagName,label:(e.innerText||e.getAttribute('aria-label')||e.title||'').trim(),role:e.getAttribute('role'),class:e.className,disabled:e.disabled??false,href:e.getAttribute('href'),onclick:e.getAttribute('onclick')})));
        const invoiceBack=page.locator('#sec-inv-detail button, #sec-inv-detail a').filter({hasText:'رجوع'}).first();
        if(await invoiceBack.count()){await invoiceBack.click();await page.waitForTimeout(200);result.invoiceBackNavigation={clicked:true,active:await page.evaluate(()=>[...document.querySelectorAll('.section-content.active')].map(e=>e.id))};}else result.invoiceBackNavigation={clicked:false};
      } else result.invoiceError='No invoice row was visible in the customer detail invoice tab.';
    } catch(e){result.invoiceError=String(e).split('\n')[0];}
    try {
      const invSub=page.locator('#inv-sub');
      const invGroup=page.locator('.sidebar-nav .nav-group-btn').filter({hasText:'المخزون'}).first();
      if(vp.width<900){const m=page.locator('#x-menu-btn');if(await m.isVisible().catch(()=>false)&&!((await page.locator('.sidebar').getAttribute('class'))??'').includes('open'))await m.click();}
      if(await invGroup.count()&&await invGroup.isVisible().catch(()=>false)&&!(await invSub.getAttribute('class')??'').includes('open'))await invGroup.click();
      const movementsLink=page.locator('#inv-sub .nav-sub-item').filter({hasText:'حركة المخزون'}).first();
      if(await movementsLink.count()&&await movementsLink.isVisible().catch(()=>false))await movementsLink.click();
      await page.waitForFunction(()=>document.querySelector('#sec-movements')?.classList.contains('active'),null,{timeout:3000});
      if(vp.width<900){const m=page.locator('#x-menu-btn');if(await m.isVisible().catch(()=>false)&&((await page.locator('.sidebar').getAttribute('class'))??'').includes('open'))await m.click();}
      const refLink=page.locator('#sec-movements a[onclick*="openMoveRef"]').first();
      result.movementRefCount=await page.locator('#sec-movements a[onclick*="openMoveRef"]').count();
      if(await refLink.count()){
        await refLink.scrollIntoViewIfNeeded();await refLink.click({timeout:5000});await page.waitForFunction(()=>document.querySelector('#sec-move-detail')?.classList.contains('active'),null,{timeout:3000});
        result.movementState=await page.evaluate(()=>({active:[...document.querySelectorAll('.section-content.active')].map(e=>e.id),text:document.querySelector('#sec-move-detail')?.innerText.trim().slice(0,300)??null}));
        result.movementScreenshot=`docs/ux-inventory/screenshots/reference/row-click-details/movement-detail-${vp.name}.png`;await page.screenshot({path:path.join(root,result.movementScreenshot),animations:'disabled',timeout:15000});
        result.movementControls=await page.locator('#sec-move-detail button, #sec-move-detail a, #sec-move-detail [role="button"]').evaluateAll(nodes=>nodes.map((e,i)=>({index:i,tag:e.tagName,label:(e.innerText||e.getAttribute('aria-label')||e.title||'').trim(),role:e.getAttribute('role'),class:e.className,disabled:e.disabled??false,href:e.getAttribute('href'),onclick:e.getAttribute('onclick')})));
        const movementBack=page.locator('#sec-move-detail button, #sec-move-detail a').filter({hasText:'رجوع لحركة المخزون'}).first();
        if(await movementBack.count()){await movementBack.click();await page.waitForTimeout(200);result.movementBackNavigation={clicked:true,active:await page.evaluate(()=>[...document.querySelectorAll('.section-content.active')].map(e=>e.id))};}else result.movementBackNavigation={clicked:false};
      } else result.movementError='No movement-reference link was present in the fixture list.';
    } catch(e){result.movementError=String(e).split('\n')[0];}
    results.push(result);await context.close();
  }
  const reviewPath=path.join(root,'docs/ux-inventory/REFERENCE_DETAIL_ROW_CLICK_REVIEW.json');
  let combined=results;
  try { const old=JSON.parse(await readFile(reviewPath,'utf8'));const byViewport=new Map((old.results??[]).map(x=>[x.viewport,x]));for(const item of results)byViewport.set(item.viewport,item);combined=[...byViewport.values()].sort((a,b)=>Number(b.viewport)-Number(a.viewport)); } catch {}
  await writeFile(reviewPath,JSON.stringify({environment:'Reference HTML, saved local fixture, actual visible navigation and row clicks only; no form submission or data-changing operation',results:combined},null,2)+'\n','utf8');
  console.log(JSON.stringify(results,null,2));
} finally {await browser.close();}

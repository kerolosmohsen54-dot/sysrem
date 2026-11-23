import path from 'node:path';
import { existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { readFile, writeFile } from 'node:fs/promises';
import { chromium } from '../../frontend/node_modules/playwright/index.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const html = path.join(root, 'frontend/reference/precision-slate-erp-v43__3_ (1).html');
const fixture = JSON.parse(await readFile(path.join(root, 'frontend/reference/reference-fixture.json'), 'utf8'));
const targets = ['cust-file','inv-detail','fin-overview','f-receipts','f-otherinc','f-payments','f-expenses','f-transfers','f-treasury','f-custbal','f-supbal','f-finret','f-coa','f-journal','f-ledger','f-trial','f-reports','f-stmt','move-detail','fin2','liq','x-priv','transfers'];
const chrome = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const browser = await chromium.launch({ headless: true, ...(existsSync(chrome) ? { executablePath: chrome, args: ['--headless=new'] } : {}) });
const results = [];
try {
  for (const viewport of [{width:1280,height:900},{width:390,height:844}]) {
    const context = await browser.newContext({ viewport });
    await context.addInitScript((entries) => { for (const [k,v] of Object.entries(entries)) localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v)); }, fixture.localStorage);
    const page = await context.newPage();
    await page.route(/^https?:\/\//, (route) => route.abort());
    await page.goto(pathToFileURL(html).href, { waitUntil: 'load' });
    await page.locator('#login-user').selectOption({index:0});
    await page.locator('#login-pass').fill('1234');
    await page.locator('#login-screen .login-btn').click();
    await page.waitForFunction(() => !document.body.classList.contains('logged-out'));
    await page.waitForTimeout(1000);
    const before = await page.evaluate((ids) => ({
      financeNav: [...document.querySelectorAll('.sidebar-nav .nav-group-btn')].map((e) => ({text:e.innerText.trim(),onclick:e.getAttribute('onclick'),cls:e.className})),
      financeSub: (() => { const e=document.querySelector('#fin-sub'); return e ? {class:e.className, visible:!!(e.offsetWidth||e.offsetHeight), html:e.innerHTML.slice(0,1800), items:[...e.querySelectorAll('.fs-it,[data-sec]')].map(x=>({text:x.innerText.trim(),onclick:x.getAttribute('onclick'),dataSec:x.getAttribute('data-sec'),cls:x.className}))} : null; })(),
      panels: ids.map((id) => {const e=document.querySelector(`#sec-${id}`);return {id,present:!!e,cls:e?.className??null,content:e?.innerText.trim().slice(0,160)??null};}),
      role: document.querySelector('#login-user')?.value ?? null,
      title: document.title,
    }), targets);
    // Re-run real visible click navigation for the financial group, then report DOM state.
    const financeButton = page.locator('.sidebar-nav .nav-group-btn').filter({hasText:'المالية'}).first();
    const clicked = await financeButton.count() ? await financeButton.isVisible().catch(()=>false) : false;
    if (clicked) await financeButton.click({timeout:3000}).catch(()=>{});
    await page.waitForTimeout(200);
    const after = await page.evaluate((ids) => ({
      financeSubClass:document.querySelector('#fin-sub')?.className??null,
      financeItems:[...document.querySelectorAll('#fin-sub .fs-it,#fin-sub [data-sec]')].map(x=>({text:x.innerText.trim(),onclick:x.getAttribute('onclick'),dataSec:x.getAttribute('data-sec'),cls:x.className,visible:!!(x.offsetWidth||x.offsetHeight)})),
      active:[...document.querySelectorAll('.section-content.active')].map(x=>x.id),
      panelStates:ids.map(id=>{const e=document.querySelector(`#sec-${id}`);return{id,present:!!e,active:e?.classList.contains('active')??false,html:e?.innerHTML.slice(0,120)??null};}),
    }),targets);
    results.push({viewport,clickedFinanceButton:clicked,before,after});
    await context.close();
  }
  await writeFile(path.join(root,'docs/ux-inventory/REFERENCE_BLOCKER_DIAGNOSTICS.json'),JSON.stringify({environment:'Read-only reference HTML, isolated saved fixture, user-facing navigation click attempted; no forms submitted or state writes',results},null,2)+'\n','utf8');
  console.log(JSON.stringify(results.map(x=>({viewport:x.viewport,clickedFinanceButton:x.clickedFinanceButton,financeNavCount:x.before.financeNav.length,financeSubPresent:!!x.before.financeSub,financeItemCount:x.after.financeItems.length,active:x.after.active,liqPresent:x.after.panelStates.find(p=>p.id==='liq')?.present,privPresent:x.after.panelStates.find(p=>p.id==='x-priv')?.present})),null,2));
} finally { await browser.close(); }

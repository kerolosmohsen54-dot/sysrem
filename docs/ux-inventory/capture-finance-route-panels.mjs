import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {existsSync} from 'node:fs';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from '../../frontend/node_modules/@playwright/test/index.mjs';
import {createServer} from '../../frontend/node_modules/vite/dist/node/index.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const frontend=path.join(root,'frontend');
const out=path.join(root,'docs/ux-inventory/screenshots/system-mock/react/visual-round6');
const viewports=[{name:'1280',width:1280,height:900},{name:'768',width:768,height:1024},{name:'390',width:390,height:844}];
const routes=[
 {slug:'finance-inbox',path:'/finance/inbox',screenId:'SCR-035'},
 {slug:'finance-withdrawals',path:'/finance/withdrawals',screenId:'SCR-037'},
 {slug:'finance-expenses',path:'/finance/expenses',screenId:'SCR-038'},
 {slug:'finance-transfers',path:'/finance/transfers',screenId:'SCR-039'},
 {slug:'finance-treasury',path:'/finance/treasury',screenId:'SCR-040'},
 {slug:'customer-balances',path:'/reports/customer-balances',screenId:'SCR-041'},
 {slug:'customer-returns',path:'/returns',screenId:'SCR-043'},
 {slug:'chart-of-accounts',path:'/finance/chart-of-accounts',screenId:'SCR-044'},
 {slug:'finance-movements',path:'/finance/movements',screenId:'SCR-053'},
 {slug:'financial-report',path:'/reports/financial',screenId:'SCR-048'},
];
const installedChrome='C:/Program Files/Google/Chrome/Application/chrome.exe';
const browser=await chromium.launch({headless:true,...(existsSync(installedChrome)?{executablePath:installedChrome,args:['--headless=new']}:{})});
const server=await createServer({configFile:path.join(frontend,'vite.config.ts'),root:frontend,mode:'test',define:{'import.meta.env.VITE_MOCK_API':JSON.stringify('true')},server:{host:'127.0.0.1',port:5195,strictPort:true,proxy:{'/api/v1':{target:'http://127.0.0.1:1',changeOrigin:true}}}});
const records=[];
async function clickRoute(page,href){const toast=page.locator('.toast-error button').first();if(await toast.isVisible().catch(()=>false))await toast.click().catch(()=>{});const search=page.locator('.global-search-trigger').first();const mobile=page.locator('.mobile-bottom-nav button.mobile-dock-action').first();const trigger=await search.isVisible().catch(()=>false)?search:mobile;if(!await trigger.isVisible().catch(()=>false))return false;await trigger.click();await page.locator('[role="dialog"]').first().waitFor({state:'visible',timeout:3000});const a=page.locator(`.global-search-results a[href="${href}"]`).first();if(!await a.count()){await page.keyboard.press('Escape');return false;}await a.click();await page.waitForFunction(p=>location.pathname===p,href,{timeout:5000});await page.waitForTimeout(500);return true;}
try{await server.listen();const origin=server.resolvedUrls?.local?.[0]?.replace(/\/$/,'');await mkdir(out,{recursive:true});for(const vp of viewports){const ctx=await browser.newContext({viewport:{width:vp.width,height:vp.height}});const page=await ctx.newPage();await page.goto(`${origin}/login`,{waitUntil:'networkidle'});await page.locator('#login-username').fill('owner-demo');await page.locator('#login-password').fill('demo');await page.locator('button[type="submit"]').click();await page.locator('.app-shell').waitFor({timeout:10000});for(const r of routes){let clicked=false;if(r.path==='/finance/inbox'||r.path==='/finance/withdrawals'||r.path==='/finance/expenses'||r.path==='/finance/transfers'||r.path==='/finance/treasury'||r.path==='/finance/chart-of-accounts'||r.path==='/reports/financial'||r.path==='/reports/customer-balances'||r.path==='/returns'||r.path==='/purchase-invoices'||r.path==='/finance/movements'){const home=await clickRoute(page,'/finance');if(home){const card=page.locator(`.finance-overview-page a[href="${r.path}"]`).first();if(await card.count()){await card.scrollIntoViewIfNeeded();await card.click();await page.waitForFunction(p=>location.pathname===p,r.path,{timeout:5000});await page.waitForTimeout(600);clicked=true;}}}const actualPath=await page.evaluate(()=>location.pathname);const heading=(await page.locator('.main-content h1').first().textContent().catch(()=>''))?.trim()??'';const screenshot=clicked?`docs/ux-inventory/screenshots/system-mock/react/visual-round6/${r.slug}-${vp.name}.png`:null;if(screenshot)await page.screenshot({path:path.join(root,screenshot)});records.push({viewport:vp.name,...r,clicked,actualPath,heading,screenshot});}await ctx.close();}}finally{await server.close();await browser.close();}
await writeFile(path.join(root,'docs/ux-inventory/FINANCE_ROUTE_SCREEN_REVIEW.json'),JSON.stringify({environment:'isolated React Vite/MSW; synthetic owner demo; finance cards clicked; no form submission or API/database writes',records},null,2)+'\n','utf8');console.log(JSON.stringify({attempts:records.length,captured:records.filter(r=>r.clicked).length,output:'docs/ux-inventory/FINANCE_ROUTE_SCREEN_REVIEW.json'},null,2));


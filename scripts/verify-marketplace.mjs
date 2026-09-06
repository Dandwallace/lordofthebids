import { chromium } from 'playwright';
const B='http://localhost:3222';
const browser = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium', args:['--no-sandbox'] });
const ctx = await browser.newContext({ viewport:{width:1440,height:1000}, deviceScaleFactor:2 });
const p = await ctx.newPage();
const errs=[]; p.on('pageerror',e=>errs.push(String(e))); p.on('console',m=>{if(m.type()==='error')errs.push(m.text());});
const out=[]; const check=(n,ok,d='')=>{out.push(`${ok?'PASS':'FAIL'}  ${n}${d?` — ${d}`:''}`);};

async function example(){
  // Wait for hydration: a click before React attaches its handlers is
  // silently swallowed and the tab never changes.
  await p.waitForTimeout(600);
  await p.locator('.nav__item').nth(1).click();
  await p.waitForSelector('.nav__item[aria-current="page"]');
  // Results from a previous run stay on screen, and the example button is
  // only rendered when there are none. Clear first so this is repeatable.
  const exit = p.locator('button').filter({hasText:/Exit example|Salir del ejemplo/i});
  if (await exit.count()) { await exit.first().click(); await p.waitForTimeout(300); }
  await p.locator('button').filter({hasText:/example results|resultados de ejemplo/i}).first().click();
  await p.waitForSelector('.results tbody tr');
}
await p.goto(B,{waitUntil:'networkidle'});
await example();
const gbpCost = await p.locator('.results tbody tr td').nth(1).innerText();
const gbpProfit = await p.locator('.results tbody tr td').nth(2).innerText();
check('UK shows pounds', gbpCost.includes('£'), gbpCost.split('\n')[0]);

// Switch to Spain.
await p.getByRole('button',{name:/Settings|Ajustes/}).click();
await p.waitForTimeout(300);
await p.selectOption('#marketplace','EBAY_ES');
await p.waitForTimeout(300);
await p.keyboard.press('Escape');
await p.waitForTimeout(300);
await example();
const eurCost = await p.locator('.results tbody tr td').nth(1).innerText();
const eurProfit = await p.locator('.results tbody tr td').nth(2).innerText();
check('Spain shows euros', eurCost.includes('€'), eurCost.split('\n')[0]);
check('Spain shows no pound signs', !eurCost.includes('£') && !eurProfit.includes('£'));
check('Private seller profit DIFFERS in Spain (fees apply)', gbpProfit!==eurProfit, `${gbpProfit.split('\n')[0]} vs ${eurProfit.split('\n')[0]}`);

// Language toggle.
await p.getByRole('button',{name:/Settings|Ajustes/}).click();
await p.waitForTimeout(300);
await p.getByRole('button',{name:'Español'}).click();
await p.waitForTimeout(400);
const settingsTitle = await p.locator('.drawer__header h2').innerText();
check('Settings drawer title translates', settingsTitle==='Ajustes', settingsTitle);
await p.keyboard.press('Escape');
await p.waitForTimeout(300);
const navText = await p.locator('.nav').innerText();
check('Navigation translates', navText.includes('Descubrir')&&navText.includes('Buscar')&&navText.includes('Guardados'), navText.replace(/\n/g,' '));
await p.locator('.nav__item').nth(2).click();
await p.waitForTimeout(300);
const savedHead = await p.locator('.page-head h1').innerText();
check('Saved page translates', savedHead==='Guardados', savedHead);
await p.screenshot({path: process.argv[2]+'/es-saved.png'});
await p.locator('.nav__item').nth(0).click();
await p.waitForTimeout(400);
const discoverHead = await p.locator('.hero h1').innerText();
check('Discover page translates', discoverHead.includes('Empieza'), discoverHead);
await p.screenshot({path: process.argv[2]+'/es-discover.png', fullPage:false});

// Persistence across reload.
await p.reload({waitUntil:'networkidle'});
await p.waitForTimeout(500);
const afterReload = await p.locator('.nav').innerText();
check('Language persists across reload', afterReload.includes('Descubrir'), afterReload.replace(/\n/g,' '));

console.log(out.join('\n'));
console.log('\nConsole errors:', errs.length?errs.slice(0,3):'none');
const failed=out.filter(o=>o.startsWith('FAIL'));
console.log(`\n${out.length-failed.length}/${out.length} passed`);
await browser.close();

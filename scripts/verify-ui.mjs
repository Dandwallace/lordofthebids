import { chromium } from 'playwright';

const BASE = 'http://localhost:3222';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();

const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push(String(e)));

const results = [];
function check(name, pass, detail = '') {
  results.push({ name, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
}

async function loadExample() {
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.locator('.nav__item').nth(1).click();
  await page.getByRole('button', { name: 'View example results' }).first().click();
  await page.waitForSelector('.results tbody tr');
}

// ---- 1. Keyboard: reach the search field and the Scan button by Tab ----
await page.goto(BASE, { waitUntil: 'networkidle' });
await page.locator('.nav__item').nth(1).click();
await page.waitForTimeout(200);
await page.locator('body').press('Tab');
let reachedSearch = false;
for (let i = 0; i < 25; i++) {
  const tag = await page.evaluate(() => {
    const el = document.activeElement;
    return el ? `${el.tagName}:${el.getAttribute('type') || ''}:${el.getAttribute('aria-label') || el.textContent?.slice(0, 20) || ''}` : '';
  });
  if (tag.includes('Search term or eBay listing link')) { reachedSearch = true; break; }
  await page.keyboard.press('Tab');
}
check('Search field is reachable by keyboard', reachedSearch);

// Focus ring must actually be visible
const outline = await page.evaluate(() => {
  const input = document.querySelector('input[type=search]');
  input.focus();
  const s = getComputedStyle(input);
  return { width: s.outlineWidth, style: s.outlineStyle };
});
check('Focused input shows a visible outline', outline.style !== 'none' && parseFloat(outline.width) > 0, JSON.stringify(outline));

// ---- 2. Sorting ----
await loadExample();
const profitsDesc = await page.$$eval('.results tbody tr td:nth-child(3)', (tds) =>
  tds.map((td) => parseFloat(td.textContent.replace(/[^0-9.-]/g, ''))),
);
const sortedDesc = [...profitsDesc].sort((a, b) => b - a);
check('Default sort is profit, highest first', JSON.stringify(profitsDesc) === JSON.stringify(sortedDesc), profitsDesc.join(','));

await page.getByRole('button', { name: /Est. profit/ }).click();
await page.waitForTimeout(200);
const profitsAsc = await page.$$eval('.results tbody tr td:nth-child(3)', (tds) =>
  tds.map((td) => parseFloat(td.textContent.replace(/[^0-9.-]/g, ''))),
);
check('Clicking a column header reverses the sort', JSON.stringify(profitsAsc) === JSON.stringify([...profitsAsc].sort((a, b) => a - b)), profitsAsc.join(','));

const ariaSort = await page.getAttribute('.results th:nth-child(3) .results__sort', 'aria-sort');
check('Sorted column exposes aria-sort', ariaSort === 'ascending' || ariaSort === 'descending', String(ariaSort));

// ---- 3. Unknown values sort last ----
await page.getByRole('button', { name: /Max price/ }).click();
await page.waitForTimeout(150);
await page.getByRole('button', { name: /Max price/ }).click(); // ascending
await page.waitForTimeout(150);
const maxAsc = await page.$$eval('.results tbody tr td:nth-child(5)', (tds) => tds.map((td) => td.textContent.trim()));
const firstDash = maxAsc.findIndex((v) => v === '—');
check('Unknown values sort to the bottom, not the top', firstDash === -1 || firstDash === maxAsc.length - maxAsc.filter((v) => v === '—').length, maxAsc.join(' | '));

// ---- 4. Filter chips remove filters ----
await loadExample();
const chipsBefore = await page.locator('.chip').count();
await page.locator('.chip button').first().click();
await page.waitForTimeout(200);
const chipsAfter = await page.locator('.chip').count();
check('A filter chip can be removed', chipsAfter === chipsBefore - 1, `${chipsBefore} -> ${chipsAfter}`);

// ---- 5. Show excluded reveals rows with reasons ----
await loadExample();
const before = await page.locator('.results tbody tr').count();
await page.getByText(/Show excluded/).click();
await page.waitForTimeout(250);
const after = await page.locator('.results tbody tr').count();
const hasReason = await page.locator('.results tbody tr.is-excluded .badge', { hasText: 'Excluded:' }).count();
check('Show excluded reveals more rows', after > before, `${before} -> ${after}`);
check('Excluded rows state a reason', hasReason > 0, `${hasReason} rows labelled`);

// ---- 6. Saving persists across a reload ----
await loadExample();
await page.locator('.icon-btn[aria-pressed]').first().click();
await page.waitForTimeout(200);
const savedCount = await page.locator('.nav__count').textContent();
check('Saving an item updates the Saved count', savedCount === '1', String(savedCount));

await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(400);
const savedAfterReload = await page.locator('.nav__count').textContent().catch(() => null);
check('Saved items survive a reload', savedAfterReload === '1', String(savedAfterReload));

await page.locator('.nav__item').nth(2).click();
await page.waitForTimeout(300);
const noteBox = page.locator('.saved-item__note').first();
await noteBox.fill('Check the screen scratch in daylight');
await page.waitForTimeout(200);
await page.getByRole('button', { name: 'Purchased' }).first().click();
await page.waitForTimeout(200);
await page.reload({ waitUntil: 'networkidle' });
await page.locator('.nav__item').nth(2).click();
await page.waitForTimeout(400);
const noteAfter = await page.locator('.saved-item__note').first().inputValue();
const statusPressed = await page.locator('.status-picker button[aria-pressed="true"]').first().textContent();
check('Notes survive a reload', noteAfter === 'Check the screen scratch in daylight', noteAfter);
check('Status survives a reload', statusPressed?.trim() === 'Purchased', String(statusPressed));

// ---- 7. Preferences persist ----
await page.goto(BASE, { waitUntil: 'networkidle' });
await page.getByRole('button', { name: /Settings/ }).click();
await page.waitForTimeout(300);
await page.getByRole('button', { name: 'Private' }).click();
await page.waitForTimeout(200);
await page.keyboard.press('Escape');
await page.reload({ waitUntil: 'networkidle' });
await page.getByRole('button', { name: /Settings/ }).click();
await page.waitForTimeout(400);
const sellerPressed = await page.locator('.segmented button[aria-pressed="true"]').first().textContent();
check('Selling preferences persist', sellerPressed?.trim() === 'Private', String(sellerPressed));

// ---- 8. Drawer keyboard behaviour ----
await page.keyboard.press('Escape');
await page.waitForTimeout(300);
const drawerGone = await page.locator('.drawer').count();
check('Escape closes the drawer', drawerGone === 0);

await loadExample();
await page.locator('.cell-title__name').first().click();
await page.waitForTimeout(400);
const focusInside = await page.evaluate(() => !!document.querySelector('.drawer')?.contains(document.activeElement));
check('Opening the drawer moves focus inside it', focusInside);
const dialogAttrs = await page.evaluate(() => {
  const d = document.querySelector('.drawer');
  return { role: d?.getAttribute('role'), modal: d?.getAttribute('aria-modal'), labelled: d?.getAttribute('aria-labelledby') };
});
check('Drawer is a labelled modal dialog', dialogAttrs.role === 'dialog' && dialogAttrs.modal === 'true' && !!dialogAttrs.labelled, JSON.stringify(dialogAttrs));

// ---- 9. Manual resale scenario relabels the figures ----
await page.locator('#manual-resale').fill('250');
await page.waitForTimeout(300);
const manualBadge = await page.locator('.badge--example', { hasText: 'Manual scenario' }).count();
check('A manual resale figure is labelled as a scenario', manualBadge > 0);

// ---- 10. Purchase cap does not restrict the reference market ----
await page.keyboard.press('Escape');
await page.waitForTimeout(200);
const refBefore = await page.locator('.summary__cell').nth(1).locator('.summary__value').textContent();
await page.locator('.disclosure__toggle').click();
await page.waitForTimeout(200);
await page.locator('#max-purchase').fill('100');
await page.waitForTimeout(200);
// Re-render example with the tighter cap
await page.getByRole('button', { name: 'Exit example' }).click();
await page.waitForTimeout(200);
await page.getByRole('button', { name: 'View example results' }).first().click();
await page.waitForSelector('.results tbody tr');
const refAfter = await page.locator('.summary__cell').nth(1).locator('.summary__value').textContent();
check('Reference value is unchanged by a tighter purchase cap', refBefore === refAfter, `${refBefore} vs ${refAfter}`);

console.log('\nConsole errors:', errors.length ? errors : 'none');
const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
await browser.close();
process.exit(failed.length > 0 || errors.length > 0 ? 1 : 0);

import { chromium } from 'playwright';

const OUT = process.argv[2];
const BASE = 'http://localhost:3222';

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });

async function page(width, height) {
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 2 });
  const p = await context.newPage();
  const errors = [];
  p.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  p.on('pageerror', (e) => errors.push(String(e)));
  return { p, context, errors };
}

const allErrors = [];

// --- Desktop: Discover ---
{
  const { p, context, errors } = await page(1440, 900);
  await p.goto(BASE, { waitUntil: 'networkidle' });
  await p.screenshot({ path: `${OUT}/01-discover-desktop.png`, fullPage: true });
  allErrors.push(...errors.map(e => ['discover', e]));
  await context.close();
}

// --- Desktop: not connected state ---
{
  const { p, context, errors } = await page(1440, 900);
  await p.goto(BASE, { waitUntil: 'networkidle' });
  await p.getByRole('button', { name: 'Search' }).first().click();
  await p.waitForTimeout(400);
  await p.screenshot({ path: `${OUT}/02-search-notconnected.png`, fullPage: true });
  allErrors.push(...errors.map(e => ['notconnected', e]));
  await context.close();
}

// --- Desktop: example results ---
{
  const { p, context, errors } = await page(1440, 1000);
  await p.goto(BASE, { waitUntil: 'networkidle' });
  await p.getByRole('button', { name: 'Search' }).first().click();
  await p.waitForTimeout(300);
  await p.getByRole('button', { name: 'View example results' }).first().click();
  await p.waitForTimeout(700);
  await p.screenshot({ path: `${OUT}/03-results-desktop.png`, fullPage: true });

  // Details drawer
  await p.locator('.cell-title__name').first().click();
  await p.waitForTimeout(500);
  await p.screenshot({ path: `${OUT}/04-drawer-desktop.png` });
  // Scroll the drawer to see the calculation
  await p.locator('.drawer__scroll').evaluate((el) => { el.scrollTop = 1200; });
  await p.waitForTimeout(300);
  await p.screenshot({ path: `${OUT}/05-drawer-calc.png` });
  await p.keyboard.press('Escape');
  await p.waitForTimeout(300);

  // Settings drawer
  await p.getByRole('button', { name: /Settings/ }).click();
  await p.waitForTimeout(400);
  await p.screenshot({ path: `${OUT}/06-settings.png` });
  allErrors.push(...errors.map(e => ['results', e]));
  await context.close();
}

// --- Mobile ---
{
  const { p, context, errors } = await page(390, 844);
  await p.goto(BASE, { waitUntil: 'networkidle' });
  await p.screenshot({ path: `${OUT}/07-discover-mobile.png`, fullPage: true });

  await p.locator('.nav__item').nth(1).click();
  await p.waitForTimeout(300);
  await p.getByRole('button', { name: 'View example results' }).first().click();
  await p.waitForTimeout(700);
  await p.screenshot({ path: `${OUT}/08-results-mobile.png`, fullPage: true });

  await p.locator('.result-card__main').first().click();
  await p.waitForTimeout(500);
  await p.screenshot({ path: `${OUT}/09-drawer-mobile.png` });
  allErrors.push(...errors.map(e => ['mobile', e]));
  await context.close();
}

// --- Tablet + saved empty ---
{
  const { p, context, errors } = await page(834, 1112);
  await p.goto(BASE, { waitUntil: 'networkidle' });
  await p.locator('.nav__item').nth(2).click();
  await p.waitForTimeout(400);
  await p.screenshot({ path: `${OUT}/10-saved-empty-tablet.png`, fullPage: true });
  allErrors.push(...errors.map(e => ['saved', e]));
  await context.close();
}

console.log(JSON.stringify(allErrors, null, 1));
await browser.close();

import { test, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

const frozenTime = new Date('2026-10-22T15:00:00+03:00');
const promo = '.welcome-discount';
const closedBadge = '.welcome-discount-reopen';

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: frozenTime });
  await page.route('https://kinescope.io/**', (route) =>
    route.fulfill({ status: 200, contentType: 'text/html', body: '<html></html>' }));
  await page.route('**/api/lead', (route) => route.abort());
});
async function ready(page, url = '/') {
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#site-preloader')).toHaveCount(0, { timeout: 30000 });
}
async function show(page) {
  await page.clock.fastForward(60_100);
  await expect(page.getByRole('dialog', { name: 'Скидка' })).toBeVisible();
}

test('the new offer opens once after a fresh 60 seconds, never immediately, and is not the retired popup', async ({ page }) => {
  // Emulate the stale session timestamp that caused the previous immediate popup.
  await page.addInitScript(() => sessionStorage.setItem('debt2026-welcome50-entry-at', '1'));
  await ready(page);
  await expect(page.locator(promo)).toHaveCount(0);
  await page.clock.fastForward(50_000);
  await expect(page.locator(promo)).toHaveCount(0);
  await page.clock.fastForward(10_200);
  await expect(page.locator(promo)).toHaveCount(1);
  await expect(page.locator('.ticket-offer-modal')).toHaveCount(0);
  await expect(page.locator('.welcome-discount__percent')).toHaveText('50%');
  await expect(page.locator('.welcome-discount__promo-heading')).toHaveText('По промокоду');
  await expect(page.locator('.welcome-discount__code')).toHaveText('WELCOME');
  await expect(page.locator('.welcome-discount__description')).toContainText('на один билет любого тарифа');
  await expect(page.locator('.welcome-discount__description')).toContainText('впервые');
  await expect(page.locator('.welcome-discount__terms')).toContainText('по согласованию с организаторами');
  await expect(page.locator(promo).getByRole('button', { name: 'Выбрать тариф' })).toBeVisible();
  await expect(page.locator('.welcome-discount__copy')).toHaveCount(1);
  await page.locator(promo).getByRole('button', { name: 'Закрыть предложение' }).click();
  await expect(page.locator(promo)).toHaveCount(0);
  await expect(page.locator(closedBadge)).toBeVisible();
  await page.clock.fastForward(120_000);
  await expect(page.locator(promo)).toHaveCount(0);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.locator('#site-preloader')).toHaveCount(0, { timeout: 30000 });
  await expect(page.locator(promo)).toHaveCount(0);
  await expect(page.locator(closedBadge)).toHaveCount(0);
  await page.clock.fastForward(60_200);
  await expect(page.locator(promo)).toHaveCount(0);
  await expect(page.locator(closedBadge)).toBeVisible();
  await page.getByRole('button', { name: 'Открыть предложение со скидкой 50%' }).click();
  await expect(page.locator(promo)).toBeVisible();
});

test('reloading the page starts a new full minute even when the popup was previously visible', async ({ page }) => {
  await ready(page);
  await show(page);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.locator('#site-preloader')).toHaveCount(0, { timeout: 30000 });
  await expect(page.locator(promo)).toHaveCount(0);
  await page.clock.fastForward(50_000);
  await expect(page.locator(promo)).toHaveCount(0);
  await page.clock.fastForward(10_200);
  await expect(page.locator(promo)).toBeVisible();
});

test('copy icon writes WELCOME to the actual clipboard and reports success', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await ready(page);
  await show(page);
  await page.getByRole('button', { name: 'Скопировать промокод WELCOME' }).click();
  await expect(page.getByRole('button', { name: 'Промокод скопирован' })).toBeVisible();
  await expect(page.locator('.welcome-discount__copy-status')).toContainText('WELCOME скопирован');
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('WELCOME');
});

test('tariff button closes modal and scrolls to real tariff plans without changing current path', async ({ page }) => {
  await ready(page, '/2/');
  await show(page);
  await page.getByRole('button', { name: 'Выбрать тариф' }).click();
  await expect(page.locator(promo)).toHaveCount(0);
  await expect(page).toHaveURL(/\/2\/#tariff-plans$/);
  const top = await page.locator('#tariff-plans').evaluate((node) => node.getBoundingClientRect().top);
  expect(top).toBeLessThan(130);
  await expect(page.locator(closedBadge)).toBeVisible();
});

test('offer waits until the registration form is closed, without interrupting it', async ({ page }) => {
  await ready(page);
  await page.locator('.tariff--business').getByRole('button', { name: 'Принять участие' }).click();
  await expect(page.locator('[role="dialog"].form-dialog--business')).toBeVisible();
  await page.clock.fastForward(60_100);
  await expect(page.locator(promo)).toHaveCount(0);
  await page.locator('[role="dialog"].form-dialog--business')
    .getByRole('button', { name: 'Закрыть форму' }).click();
  await expect(page.locator(promo)).toHaveCount(1);
});

for (const width of [320, 390, 768, 1024, 1440]) {
  test('visual proportions, original astronaut, readable code and touch targets at ' + width + 'px', async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await ready(page);
    await show(page);
    const image = page.locator('.welcome-discount__astronaut');
    await expect(image).toHaveAttribute('src', /\/assets\/promotions\/welcome-astronaut\.png$/);
    await expect.poll(async () => image.evaluate((element) =>
      element.complete && element.naturalWidth === 897 && element.naturalHeight === 861
    ), { timeout: 18000 }).toBe(true);
    await image.evaluate((element) => element.decode());
    const geometry = await page.locator(promo).evaluate((root) => {
      const dialog = root.getBoundingClientRect();
      const code = root.querySelector('.welcome-discount__code').getBoundingClientRect();
      const promoPanel = root.querySelector('.welcome-discount__promo').getBoundingClientRect();
      const copy = root.querySelector('.welcome-discount__copy').getBoundingClientRect();
      const cta = root.querySelector('.welcome-discount__cta').getBoundingClientRect();
      return {
        viewport: innerWidth,
        documentOverflow: document.documentElement.scrollWidth - innerWidth,
        left: dialog.left, right: dialog.right,
        width: dialog.width,
        height: dialog.height,
        bounded50: getComputedStyle(root.querySelector('.welcome-discount__percent')).fontFamily.includes('Bounded'),
        promoCodeFits: code.left >= promoPanel.left - 2 && code.right <= copy.left + 1,
        copyInPromo: copy.left >= promoPanel.left - 2 && copy.right <= promoPanel.right + 2,
        ctaWidth: cta.width,
        ctaVisibleWithoutScrolling: cta.bottom <= dialog.bottom + 1 && cta.top >= dialog.top,
        codeFont: parseFloat(getComputedStyle(root.querySelector('.welcome-discount__code')).fontSize),
      };
    });
    expect(geometry.documentOverflow).toBeLessThanOrEqual(2);
    expect(geometry.left).toBeGreaterThanOrEqual(0);
    expect(geometry.right).toBeLessThanOrEqual(width + 1);
    expect(geometry.width).toBeLessThanOrEqual(width > 900 ? 700 : width - 12);
    expect(geometry.height).toBeLessThanOrEqual(width > 600 ? 690 : 590);
    expect(geometry.bounded50).toBe(true);
    expect(geometry.promoCodeFits).toBe(true);
    expect(geometry.copyInPromo).toBe(true);
    expect(geometry.ctaWidth).toBeGreaterThanOrEqual(200);
    expect(geometry.ctaVisibleWithoutScrolling).toBe(true);
    expect(geometry.codeFont).toBeGreaterThanOrEqual(40);
    await mkdir('test-results/welcome-discount', { recursive: true });
    await page.screenshot({
      path: 'test-results/welcome-discount/offer-' + width + '.png',
      animations: 'disabled',
    });
    await page.keyboard.press('Escape');
    await expect(page.locator(promo)).toHaveCount(0);
    await expect(page.locator(closedBadge)).toBeVisible();
  });
}

import { test, expect } from '@playwright/test';

const name = 'НБКИ';
const tier = 'Специальный партнер';
const description =
  'Национальное бюро кредитных историй (НБКИ) предоставляет для рынка взыскания кредитные отчеты должников, скоринг склонности к банкротству (Bankrupt score), данные из базы ИП ФССП в онлайн и пакетном режиме, а также более 50 уникальных сервисов и данных для эффективной работы с должниками.';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() =>
    sessionStorage.setItem('debt2026-early-booking-dismissed', '1'));
  await page.route('**/api/lead', (route) => route.abort());
  await page.route('https://kinescope.io/**', (route) =>
    route.fulfill({ status: 200, contentType: 'text/html', body: '<html></html>' }));
});

for (const width of [320, 390, 760, 768, 1024, 1440]) {
  test('NBKI special partner and supplied SVG display correctly at ' + width + 'px', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/#partners', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#site-preloader')).toHaveCount(0, { timeout: 30000 });

    const cards = page.locator('.conference-partners-list > article');
    await expect(cards).toHaveCount(12);
    const card = cards.nth(4);
    await expect(card.locator('.conference-partner-name')).toHaveText(name);
    await expect(card.locator('.conference-partner-tier')).toHaveText(tier);
    await expect(card.locator('.conference-partner-copy p')).toHaveText(description);
    await expect(card.locator('a')).toHaveCount(0);
    await expect(card.locator('.conference-partner-planet'))
      .toHaveAttribute('src', /\/assets\/partners\/planets\/planet-special\.webp$/);
    const image = card.locator('.conference-partner-logo img');
    await expect(image).toHaveAttribute('src', /\/assets\/partners\/nbki\.svg$/);
    await card.scrollIntoViewIfNeeded();
    await expect.poll(async () => image.evaluate((el) =>
      el.complete && el.naturalWidth === 831 && el.naturalHeight === 151
    ), { timeout: 18000 }).toBe(true);
    const assetResponse = await page.request.get(new URL(await image.getAttribute('src'), page.url()).href);
    expect(assetResponse.status()).toBe(200);
    expect(assetResponse.headers()['content-type']).toContain('image/svg+xml');
    const original = await assetResponse.body();
    expect(original.byteLength).toBe(2695);

    const layout = await card.evaluate((node) => {
      const logo = node.querySelector('.conference-partner-logo img').getBoundingClientRect();
      const shell = node.getBoundingClientRect();
      const visual = node.querySelector('.conference-partner-visual').getBoundingClientRect();
      const copy = node.querySelector('.conference-partner-copy').getBoundingClientRect();
      return {
        logoFits: logo.width > 100 && logo.right <= shell.right + 2 &&
          logo.left >= shell.left - 2,
        verticallyStacked: copy.top >= visual.bottom - 2,
        horizontalOverflow: document.documentElement.scrollWidth - innerWidth,
      };
    });
    expect(layout.logoFits).toBe(true);
    expect(layout.verticallyStacked).toBe(true);
    expect(layout.horizontalOverflow).toBeLessThanOrEqual(2);
    expect(errors).toEqual([]);
  });
}

test('NBKI is the fifth slide before Intel Collect in the mobile partner carousel', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#partners', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#site-preloader')).toHaveCount(0, { timeout: 30000 });
  const carousel = page.locator('.conference-partners-list');
  const indicator = page.locator('.conference-partners-controls span').first();
  await carousel.scrollIntoViewIfNeeded();
  await carousel.evaluate((node) => node.scrollTo({ left: 0, behavior: 'instant' }));
  const next = page.getByRole('button', { name: 'Следующий партнер' });
  for (let i = 0; i < 4; i++) await next.click();
  await expect(indicator).toContainText('05 / 12');
  await expect(carousel.locator('.conference-partner-name').nth(4)).toHaveText('НБКИ');
  await expect(carousel.locator('article').nth(4)).toBeInViewport({ ratio: 0.5 });
  await next.click();
  await expect(indicator).toContainText('06 / 12');
  await expect(carousel.locator('.conference-partner-name').nth(5)).toHaveText('ПКО «Интел коллект»');
});

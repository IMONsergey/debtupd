import { test, expect } from '@playwright/test';

const name = 'ПКО «Бустер.Ру»';
const description = 'ПКО «Бустер.Ру» (ГК IT Smart Finance) — технологичная компания по управлению проблемными кредитными активами. Работает по модели полного цикла: от досудебного урегулирования до судебного и исполнительного производства. Развивает агентское сопровождение и покупку портфелей по цессии, используя собственные IT-решения и аналитику.';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem('debt2026-early-booking-dismissed', '1'));
  await page.route('**/api/lead', route => route.abort());
  await page.route('https://kinescope.io/**', route =>
    route.fulfill({ contentType: 'text/html', body: '<html></html>' }),
  );
});

for (const width of [320, 390, 768, 1024, 1440]) {
  test('Boostr partner appears with original logo and text at ' + width + 'px', async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('/#partners', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#site-preloader')).toHaveCount(0, { timeout: 20000 });
    const section = page.locator('#partners');
    const cards = section.locator('.conference-partners-list > article');
    await expect(cards).toHaveCount(10);
    const card = cards.last();
    await expect(card.getByRole('heading', { name })).toHaveCount(1);
    await expect(card.locator('.conference-partner-tier')).toHaveText('Партнер');
    await expect(card.locator('.conference-partner-copy')).toHaveText(description);
    expect((await card.locator('.conference-partner-planet').getAttribute('src'))
      .endsWith('/assets/partners/planets/planet-standard.webp')).toBe(true);

    const image = card.locator('.conference-partner-logo img');
    expect((await image.getAttribute('src')).endsWith('/assets/partners/boostr-ru.png')).toBe(true);
    await expect(card.locator('.conference-partner-logo')).toHaveCount(1);
    // No website was supplied; keep the logo inert rather than guessing a link.
    await expect(card.locator('a')).toHaveCount(0);
    await image.scrollIntoViewIfNeeded();
    await expect.poll(() => image.evaluate(img =>
      img.complete && img.naturalWidth === 582 && img.naturalHeight === 128
    ), { timeout: 15000 }).toBe(true);
    const response = await page.request.get(new URL(await image.getAttribute('src'), page.url()).href);
    expect(response.ok()).toBe(true);
    expect(response.headers()['content-type']).toContain('image/png');
    await expect(section.locator('.sponsor-panel--featured-partner')).toContainText('МигКредит');
    await expect(page.locator('.speaker')).toHaveCount(32);
    await expect(page.locator('#fincifra-seminar')).toHaveCount(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width + 2);
    expect(errors).toEqual([]);
  });
}

test('mobile carousel reaches tenth partner and can navigate back', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#partners', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#site-preloader')).toHaveCount(0, { timeout: 20000 });
  const controls = page.locator('.conference-partners-controls');
  const counter = controls.locator('span').first();
  const rail = page.locator('.conference-partners-list');
  await rail.scrollIntoViewIfNeeded();
  await rail.evaluate(node => node.scrollTo({ left: 0, behavior: 'instant' }));
  await expect(counter).toContainText('01 / 10');
  await rail.evaluate(node => node.scrollTo({ left: node.scrollWidth, behavior: 'instant' }));
  await expect(counter).toContainText('10 / 10');
  await expect(rail.locator('article').last()).toBeInViewport({ ratio: 0.5 });
  await controls.getByRole('button', { name: 'Предыдущий партнер' }).click();
  await expect(counter).toContainText('09 / 10');
});

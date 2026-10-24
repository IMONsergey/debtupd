import { test, expect } from '@playwright/test';

const name = 'Юнисервис Капитал';
const description = [
  'Инвестиционная компания «Юнисервис Капитал» — стратегический партнер, профессиональный управляющий капиталом.',
  'Уже 17 лет оказывает финансовые, юридические, консалтинговые и информационные услуги для среднего бизнеса.',
  'Является организатором более 60 облигационных выпусков для более 30 эмитентов и стала одной из 15 команд в России, имеющих 2 успешно реализованные сделки IPO.',
];

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem('debt2026-early-booking-dismissed', '1'));
  // Don't interact with production leads while verifying presentation.
  await page.route('**/api/lead', (route) => route.abort());
  await page.route('https://kinescope.io/**', (route) =>
    route.fulfill({ contentType: 'text/html', body: '<html></html>' }));
});

for (const width of [320, 390, 768, 1024, 1440]) {
  test('Uniservice Capital partner with original transparent logo at ' + width + 'px', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/#partners', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#site-preloader')).toHaveCount(0, { timeout: 25000 });
    const section = page.locator('#partners');
    const cards = section.locator('.conference-partners-list > article');
    await expect(cards).toHaveCount(12);
    const card = cards.nth(11);
    await expect(card.getByRole('heading', { name })).toBeVisible();
    await expect(card.locator('.conference-partner-tier')).toHaveText('Партнер');
    await expect(card.locator('.conference-partner-copy p')).toHaveText(description);
    await expect(card.locator('.conference-partner-planet'))
      .toHaveAttribute('src', /\/assets\/partners\/planets\/planet-standard\.webp$/);
    const logo = card.locator('.conference-partner-logo img');
    await expect(logo).toHaveAttribute('src', /\/assets\/partners\/uniservice-capital\.png$/);
    await expect(card.locator('a')).toHaveCount(0);
    await card.scrollIntoViewIfNeeded();
    await expect.poll(() => logo.evaluate((img) =>
      img.complete && img.naturalWidth === 876 && img.naturalHeight === 204
    ), { timeout: 18000 }).toBe(true);
    const imageResponse = await page.request.get(new URL(await logo.getAttribute('src'), page.url()).href);
    expect(imageResponse.status()).toBe(200);
    expect(imageResponse.headers()['content-type']).toContain('image/png');
    const geometry = await card.evaluate((node) => {
      const box = node.getBoundingClientRect();
      const img = node.querySelector('.conference-partner-logo img').getBoundingClientRect();
      const visual = node.querySelector('.conference-partner-visual').getBoundingClientRect();
      const copy = node.querySelector('.conference-partner-copy').getBoundingClientRect();
      return {
        logoFits: img.width > 0 && img.right <= box.right + 2 && img.left >= box.left - 2,
        stackedCopy: copy.top >= visual.bottom - 2,
      };
    });
    expect(geometry.logoFits).toBe(true);
    expect(geometry.stackedCopy).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth))
      .toBeLessThanOrEqual(2);
    expect(errors).toEqual([]);
  });
}

test('last partner is reachable through mobile carousel', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#partners', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#site-preloader')).toHaveCount(0, { timeout: 25000 });
  const rail = page.locator('.conference-partners-list');
  const count = page.locator('.conference-partners-controls span').first();
  await rail.scrollIntoViewIfNeeded();
  await rail.locator('article').nth(11).scrollIntoViewIfNeeded();
  await expect(count).toContainText('12 / 12');
  await expect(rail.locator('.conference-partner-name').nth(11)).toHaveText(name);
  await expect(rail.locator('article').nth(11)).toBeInViewport({ ratio: 0.5 });
  await page.getByRole('button', { name: 'Предыдущий партнер' }).click();
  await expect(count).toContainText('11 / 12');
});

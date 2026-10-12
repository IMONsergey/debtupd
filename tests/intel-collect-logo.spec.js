import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem('debt2026-early-booking-dismissed', '1'));
});

for (const width of [320, 390, 768, 1440]) {
  test('Intel Collect displays the new logo at ' + width + 'px', async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/#partners', { waitUntil: 'domcontentloaded' });
    const cards = page.locator('.conference-partners-list .sponsor-panel--partner');
    await expect(cards).toHaveCount(7);
    const partner = cards.filter({
      has: page.locator('.conference-partner-name', { hasText: 'Интел коллект' }),
    });
    await expect(partner).toHaveCount(1);
    await expect(partner.locator('.conference-partner-name')).toContainText('Интел коллект');
    const anchor = partner.locator('.conference-partner-logo');
    await expect(anchor).toHaveAttribute('href', 'https://intelcollect.ru/');
    const image = anchor.locator('img');
    await expect(image).toHaveAttribute('src', /\/assets\/partners\/intel-collect-20261012\.webp$/);
    await image.scrollIntoViewIfNeeded();
    await expect
      .poll(
        () =>
          image.evaluate(
            (img) => img.complete && img.naturalWidth === 1251 && img.naturalHeight === 198,
          ),
        { timeout: 12000 },
      )
      .toBe(true);
    const dimensions = await image.evaluate((img) => {
      const imageBox = img.getBoundingClientRect();
      const frame = img.closest('.conference-partner-logo').getBoundingClientRect();
      return {
        width: imageBox.width,
        height: imageBox.height,
        fits: imageBox.left >= frame.left - 1 && imageBox.right <= frame.right + 1,
      };
    });
    expect(dimensions.fits).toBe(true);
    expect(dimensions.width).toBeGreaterThan(100);
    expect(dimensions.height).toBeGreaterThan(15);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2)).toBe(
      true,
    );
    expect(errors).toEqual([]);
  });
}

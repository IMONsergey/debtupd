import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() =>
    sessionStorage.setItem('debt2026-early-booking-dismissed', '1'),
  );
});

for (const width of [320, 390, 768, 1024, 1440]) {
  test('information partners include PRObankrotstvo at ' + width + 'px', async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/#information-partners', { waitUntil: 'domcontentloaded' });

    const cards = page.locator('.partners-grid > .partner-card');
    await expect(cards).toHaveCount(9);
    const logo = cards.last().locator('img');
    await expect(logo).toHaveAttribute('alt', 'Портал PROбанкротство');
    await expect(logo).toHaveAttribute('src', /\/assets\/figma\/partner-9\.svg$/);
    await logo.scrollIntoViewIfNeeded();
    await expect.poll(() =>
      logo.evaluate((img) => img.complete && img.naturalWidth === 1273 && img.naturalHeight === 887),
      { timeout: 12000 },
    ).toBe(true);

    const geometry = await cards.last().evaluate((card) => {
      const grid = card.parentElement.getBoundingClientRect();
      const rect = card.getBoundingClientRect();
      const img = card.querySelector('img').getBoundingClientRect();
      return {
        inside: rect.left >= grid.left - 2 && rect.right <= grid.right + 2,
        imageInside: img.left >= rect.left - 2 && img.right <= rect.right + 2,
        hasDimensions: rect.width > 100 && rect.height > 80,
        row: getComputedStyle(card).gridRowStart,
        column: getComputedStyle(card).gridColumnStart,
      };
    });
    expect(geometry.inside).toBe(true);
    expect(geometry.imageInside).toBe(true);
    expect(geometry.hasDimensions).toBe(true);
    if (width > 1180) {
      expect(geometry.row).toBe('3');
      expect(geometry.column).toBe('3');
    }

    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2)).toBe(true);
    expect(errors).toEqual([]);
  });
}

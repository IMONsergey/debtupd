import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem('debt2026-early-booking-dismissed', '1'));
  await page.route('**/api/lead', (route) => route.abort());
});

for (const width of [390, 1440]) {
  test('Info: Logistics occupies stand 12 across map, detail and carousel at ' + width + 'px', async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/#exhibition');
    const section = page.locator('#exhibition');
    const standOnMap = section.locator('.exhibition-map-stand[data-stand="12"]');
    await expect(standOnMap).toHaveAttribute('data-status', 'occupied');
    await expect(section.locator('[data-occupied-stand="12"]')).toHaveCount(1);
    const standInList = section.locator('.exhibition-stand-list button[aria-label="Стенд 12 забронирован"]');
    await expect(standInList).toHaveAttribute('data-status', 'occupied');

    await standInList.click();
    const detail = section.locator('#exhibition-stand-detail');
    await expect(detail).toContainText('Стенд №12');
    await expect(detail).toContainText('Автоматизация обработки судебной документации');
    await expect(detail.locator('.exhibition-status')).toContainText('Стенд забронирован');
    await expect(detail.getByRole('button', { name: 'Стать партнером' })).toHaveCount(0);

    const logo = detail.locator('img[alt="Info: Logistics"]');
    await expect(logo).toHaveCount(1);
    await expect.poll(() => logo.evaluate((img) => img.complete && img.naturalWidth === 756 && img.naturalHeight === 277)).toBe(true);

    const card = section.locator('.exhibition-company[data-primary]').filter({
      hasText: 'Автоматизация обработки судебной документации',
    });
    await expect(card).toHaveCount(1);
    await expect(card.locator('.exhibition-company__stand')).toContainText('Стенд №12');
    await expect(card.locator('img[alt="Info: Logistics"]')).toHaveCount(1);
    await expect(section.locator('.exhibition-availability__count')).toHaveText('11');
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width + 2);
    await detail.screenshot({ path: 'test-results/stand12-info-logistics-' + width + '.png' });
  });
}

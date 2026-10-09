import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem('debt2026-early-booking-dismissed', '1'));
});

for (const width of [320, 390, 768, 1440]) {
  test('product stage title is correct at ' + width + 'px', async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/#participants', { waitUntil: 'domcontentloaded' });
    const stages = page.locator('.participant-panel.active .participant-card');
    await expect(stages).toHaveCount(3);
    const third = stages.nth(2);
    await expect(third.locator('h3')).toHaveText(/Продуктовая\s+сцена/i);
    await expect(third.locator('p').first()).toHaveText('Демонстрация решений в экспозоне.');
    const text = await stages.allTextContents();
    expect(text.join(' ')).not.toContain('Вендорская сцена');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2)).toBe(
      true,
    );
    expect(errors).toEqual([]);
  });
}

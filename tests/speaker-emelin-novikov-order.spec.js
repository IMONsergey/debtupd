import { test, expect } from '@playwright/test';

const firstFour = [
  'Владимир Вербицкий',
  'Константин Виноградов',
  'Андрей Емелин',
  'Евгений Новиков',
];

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem('debt2026-early-booking-dismissed', '1'));
});

for (const width of [390, 768, 1024, 1440]) {
  test(
    'Emelin at 03 and Novikov at 04, images and titles stay paired at ' + width + 'px',
    async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      const errors = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await page.goto('/#speakers', { waitUntil: 'domcontentloaded' });
      const cards = page.locator('.speakers-grid .speaker');
      await expect(cards).toHaveCount(33);
      const names = await cards.evaluateAll((nodes) =>
        nodes.slice(0, 4).map((n) => n.querySelector('.speaker-portrait img').alt),
      );
      expect(names).toEqual(firstFour);
      await expect(cards.nth(2).locator('.speaker-portrait img')).toHaveAttribute(
        'src',
        /speaker-hd-03\.webp$/,
      );
      await expect(cards.nth(3).locator('.speaker-portrait img')).toHaveAttribute(
        'src',
        /speaker-novikov\.webp$/,
      );
      await expect(cards.nth(2).locator('.speaker-info p')).toHaveText(
        'Председатель Национального совета финансового рынка (НСФР)',
      );
      await expect(cards.nth(3).locator('.speaker-info p')).toHaveText(
        'Руководитель Департамента финансового урегулирования, вице-президент ВТБ',
      );
      await expect(page.locator('.speaker-portrait img[alt="Александр Пустовит"]')).toHaveCount(0);
      const pageCount = width >= 900 ? 11 : width >= 600 ? 17 : 33;
      await expect(page.locator('.speakers-controls > span')).toContainText(
        '/ ' + String(pageCount).padStart(2, '0'),
      );
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2),
      ).toBe(true);
      expect(errors).toEqual([]);
    },
  );
}

test('desktop first two slides contain the correct three speakers', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/#speakers', { waitUntil: 'domcontentloaded' });
  await page.locator('#site-preloader').waitFor({ state: 'detached', timeout: 20000 });
  const counter = page.locator('.speakers-controls > span');
  await expect(counter).toContainText('01 / 11');
  await expect(page.locator('.speakers-grid .speaker').nth(2)).toHaveAttribute(
    'aria-label',
    '3 из 33: Андрей Емелин',
  );
  await page.getByRole('button', { name: 'Следующий слайд' }).click();
  await expect(counter).toContainText('02 / 11');
  await expect(page.locator('.speakers-grid .speaker').nth(3)).toHaveAttribute(
    'aria-label',
    '4 из 33: Евгений Новиков',
  );
});

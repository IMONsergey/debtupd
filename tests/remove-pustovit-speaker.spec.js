import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem('debt2026-early-booking-dismissed', '1'));
});

for (const [width, lastPage] of [
  [320, 19],
  [390, 19],
  [768, 10],
  [1024, 7],
  [1440, 7],
]) {
  test(
    'roster without Alexander Pustovit and correct pagination at ' + width + 'px',
    async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      const errors = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await page.goto('/#speakers', { waitUntil: 'domcontentloaded' });
      await page.locator('#site-preloader').waitFor({ state: 'detached', timeout: 20000 });
      const roster = page.locator('.speakers-grid .speaker');
      await expect(roster).toHaveCount(19);
      await expect(page.locator('.speaker-portrait img[alt="Александр Пустовит"]')).toHaveCount(0);
      const names = await page
        .locator('.speaker-info h3')
        .evaluateAll((nodes) =>
          nodes.map((node) =>
            [...node.querySelectorAll('span')].map((part) => part.textContent.trim()).join(' '),
          ),
        );
      expect(names.join(' ')).not.toContain('Пустовит');
      expect(names).toContain('Андрей Емелин');
      expect(names).toContain('Рената Золотарева');
      expect(names).toContain('Максим Лифенцев');
      expect(names).toContain('Максим Миронов');
      expect(names).toContain('Илья Скворцов');

      const counter = page.locator('.speakers-controls > span');
      await expect(counter).toHaveText(
        new RegExp('01\\s*/\\s*' + String(lastPage).padStart(2, '0')),
      );
      const track = page.locator('.speakers-grid');
      await track.focus();
      await page.keyboard.press('End');
      await expect(counter).toHaveText(
        new RegExp(
          String(lastPage).padStart(2, '0') + '\\s*/\\s*' + String(lastPage).padStart(2, '0'),
        ),
      );
      await expect(page.getByRole('button', { name: 'Следующий слайд' })).toBeDisabled();
      await page.keyboard.press('Home');
      await expect(counter).toContainText('01');
      await expect(page.locator('.speaker-collection .speaker-view-toggle')).toBeVisible();
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2),
      ).toBe(true);
      expect(errors).toEqual([]);
    },
  );
}

test('expanded full roster shows 19 speakers without the removed profile', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/#speakers', { waitUntil: 'domcontentloaded' });
  await page.locator('#site-preloader').waitFor({ state: 'detached', timeout: 20000 });
  await page.getByRole('button', { name: 'Показать всех спикеров' }).click();
  await expect(page.locator('.speaker-collection')).toHaveClass(/is-expanded/);
  await expect(page.locator('.speakers-grid .speaker')).toHaveCount(19);
  expect((await page.locator('.speaker-info h3').allTextContents()).join(' ')).not.toContain(
    'Пустовит',
  );
});

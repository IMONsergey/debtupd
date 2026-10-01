import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem('debt2026-early-booking-dismissed', '1'));
  // Never send test leads to production integrations.
  await page.route('**/api/lead', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true }),
    }),
  );
});

for (const width of [390, 1440]) {
  test(`Exhibition selection and application at ${width}px`, async ({ page }, testInfo) => {
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    await page.locator('#site-preloader').waitFor({ state: 'detached' });
    await page.evaluate(() => document.fonts.ready);
    const section = page.locator('#exhibition');
    await section.scrollIntoViewIfNeeded();
    await expect(section.locator('.exhibition-map-stand')).toHaveCount(24);
    await expect(section.locator('.exhibition-photo img')).toHaveJSProperty('naturalWidth', 1920);
    const geometry = await section
      .locator('.exhibition-map-canvas')
      .evaluate((canvas) => ({ width: canvas.clientWidth, height: canvas.clientHeight }));
    expect(Math.abs(geometry.width / geometry.height - 2780 / 1591)).toBeLessThan(0.02);
    await section.getByRole('button', { name: 'Показать стенд 8', exact: true }).click();
    await expect(section.locator('[data-stand="8"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(section.getByRole('heading', { name: 'Стенд №8' })).toBeVisible();
    // A list selection recenters the correct stand inside the independently scrolling map.
    expect(
      await section.locator('[data-stand="8"]').evaluate((el) => {
        const box = el.getBoundingClientRect();
        const view = el.closest('.exhibition-map-viewport').getBoundingClientRect();
        return (
          box.left >= view.left - 1 &&
          box.right <= view.right + 1 &&
          box.top >= view.top - 1 &&
          box.bottom <= view.bottom + 1
        );
      }),
    ).toBe(true);
    await section.getByRole('tab', { name: '2-й этаж' }).click();
    await expect(section.locator('.exhibition-map-stand')).toHaveCount(3);
    await expect(section.locator('output')).toHaveText('100%');
    await section.getByRole('button', { name: 'Показать стенд 26', exact: true }).click();
    await expect(section.getByRole('heading', { name: 'Стенд №26' })).toBeVisible();
    await section.getByRole('button', { name: 'Узнать условия' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.locator('textarea[name=comment]')).toHaveValue(
      'Интересует стенд №26, 2-й этаж, выставка решений DEBT TECH 2026.',
    );
    await dialog
      .locator('textarea[name=comment]')
      .fill('Стенд №26, 2-й этаж. Требуется демонстрация продукта.');
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    // Direct map selection works as well as the mobile-friendly numbered list.
    await section.getByRole('button', { name: 'Показать схему целиком' }).click();
    await section.locator('[data-stand="25"]').click();
    await expect(section.getByRole('heading', { name: 'Стенд №25' })).toBeVisible();
    await section.getByRole('tab', { name: '2-й этаж' }).focus();
    await page.keyboard.press('ArrowLeft');
    await expect(section.getByRole('tab', { name: '1-й этаж' })).toBeFocused();
    await expect(section.locator('.exhibition-map-stand')).toHaveCount(24);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    expect(errors).toEqual([]);
    await section.screenshot({ path: testInfo.outputPath(`exhibition-${width}.png`) });
  });
}

test('Small-screen controls fit and no fabricated company allocation is shown', async ({
  page,
}) => {
  for (const width of [320, 768, 1024]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/#exhibition');
    await page.locator('#site-preloader').waitFor({ state: 'detached' });
    const section = page.locator('#exhibition');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    const clipped = await section
      .locator('h2,h3,h4,.button,.exhibition-tabs')
      .evaluateAll((els) =>
        els.filter((el) => el.scrollWidth > el.clientWidth + 2).map((el) => el.className),
      );
    expect(clipped).toEqual([]);
    await expect(section.locator('.exhibition-company')).toHaveCount(0);
    await expect(
      section.getByText(
        'Информация о компаниях и их стендах появится здесь после подтверждения участия.',
      ),
    ).toBeVisible();
  }
});

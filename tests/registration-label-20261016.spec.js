import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem('debt2026-early-booking-dismissed', '1'));
  await page.route('**/api/lead', route => route.abort());
  await page.route('https://kinescope.io/**', route =>
    route.fulfill({ contentType: 'text/html', body: '<html></html>' }),
  );
});

for (const width of [390, 768, 1440]) {
  test('register CTA labels and tariff form are consistent at ' + width + 'px', async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#site-preloader')).toHaveCount(0, { timeout: 20000 });
    const hero = page.locator('.hero-register');
    await expect(hero).toHaveText('Зарегистрироваться');

    if (width >= 1181) {
      const cta = page.locator('.fixed-menu__cta[href="#tariff-plans"]');
      await expect(cta).toHaveText('Зарегистрироваться');
      await expect(cta).toHaveAttribute('href', '#tariff-plans');
    } else {
      await page.getByRole('button', { name: 'Открыть меню' }).click();
      const cta = page.locator('.space-navigation--mobile .space-route__register');
      await expect(cta).toContainText('Зарегистрироваться');
      await expect(cta).toHaveAttribute('href', '#tariff-plans');
      await cta.click();
      await expect(page.locator('.space-navigation--mobile')).not.toHaveClass(/is-open/);
      await expect(page).toHaveURL(/#tariff-plans$/);
    }

    await expect(page.locator('#page-content')).not.toContainText('Ранняя регистрация');
    await page.locator('.tariff--business').getByRole('button', { name: 'Принять участие' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.locator('#application-title')).toHaveText('Регистрация');
    await expect(dialog).toHaveAttribute('data-tariff-id', 'business');
    await expect(dialog.locator('.selected-tariff')).toContainText('Деловой');
    await expect(dialog.locator('#early-registration-form')).toHaveCount(1);
    await dialog.getByRole('button', { name: 'Закрыть форму' }).click();
    await expect(dialog).toHaveCount(0);

    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width + 2);
  });
}

test('stand booking retains its own descriptive form title', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#site-preloader')).toHaveCount(0, { timeout: 20000 });
  await page.locator('.fixed-menu__cta--secondary').click();
  const stand = page.getByRole('dialog');
  await expect(stand.locator('#application-title')).toHaveText('Забронировать стенд');
  await stand.getByRole('button', { name: 'Закрыть форму' }).click();
});

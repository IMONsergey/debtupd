import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.route('**/api/lead', route => route.abort());
  await page.route('https://kinescope.io/**', route =>
    route.fulfill({ contentType: 'text/html', body: '<html></html>' }),
  );
});

for (const width of [390, 1440]) {
  test('retired booking popup stays disabled while WELCOME discount opens at ' + width + 'px', async ({ page }) => {
    await page.clock.install({ time: new Date('2026-10-19T12:00:00+03:00') });
    await page.setViewportSize({ width, height: 900 });
    // Do not set the former session-dismissed flag: the former popup would have appeared.
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#site-preloader')).toHaveCount(0, { timeout: 20000 });
    expect(await page.evaluate(() => sessionStorage.getItem('debt2026-early-booking-dismissed'))).toBeNull();

    await expect(page.locator('.ticket-offer-modal')).toHaveCount(0);
    await page.clock.fastForward(60_100);
    await expect(page.locator('.ticket-offer-modal')).toHaveCount(0);
    const welcome = page.getByRole('dialog', { name: 'Скидка' });
    await expect(welcome).toBeVisible();
    await welcome.getByRole('button', { name: 'Закрыть предложение' }).click();
    await expect(welcome).toHaveCount(0);
    await expect(page.locator('.welcome-discount-reopen')).toHaveCount(0);
    await expect(page.locator('#root')).not.toHaveAttribute('inert', '');

    // The regular registration CTA and tariff modal remain functional.
    const cta = width >= 1181
      ? page.locator('.fixed-menu__cta[href="#tariff-plans"]')
      : page.locator('.hero-register');
    await expect(cta).toContainText('Зарегистрироваться');
    await cta.click();
    await expect(page).toHaveURL(/#tariff-plans$/);
    await page.locator('.tariff--business')
      .getByRole('button', { name: 'Принять участие' }).click();
    const dialog = page.locator('[role="dialog"].form-dialog--business');
    await expect(dialog).toHaveCount(1);
    await expect(dialog.locator('#application-title')).toHaveText('Регистрация');
    await expect(dialog.locator('.selected-tariff')).toContainText('Деловой');
    await expect(dialog.locator('#early-registration-form')).toHaveCount(1);
    await page.clock.fastForward(35_000);
    await expect(page.locator('.ticket-offer-modal')).toHaveCount(0);
    await dialog.getByRole('button', { name: 'Закрыть форму' }).click();
    await expect(dialog).toHaveCount(0);
    await expect(page.locator('.ticket-offer-modal')).toHaveCount(0);
  });
}

test('the booking popup remains disabled even when the former promotional date is simulated', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-01T12:00:00+03:00') });
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#site-preloader')).toHaveCount(0, { timeout: 20000 });
  await page.clock.fastForward(25_000);
  await expect(page.locator('.ticket-offer-modal')).toHaveCount(0);
});

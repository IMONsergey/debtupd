import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem('debt2026-early-booking-dismissed', '1'));
  // Keep all CRM and Telegram deliveries disabled for UI checks.
  await page.route('**/api/lead', route => route.abort());
  await page.route('https://kinescope.io/**', route =>
    route.fulfill({ contentType: 'text/html', body: '<html></html>' }),
  );
});

for (const width of [320, 390, 768, 1024, 1440]) {
  test('sandbox FinCifra section and highlighted menu transfer intact at ' + width + 'px', async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const route = width < 1181 ? '/m#fincifra-seminar' : '/#fincifra-seminar';
    await page.goto(route, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#site-preloader')).toHaveCount(0, { timeout: 20000 });

    const block = page.locator('#fincifra-seminar');
    await expect(block).toHaveCount(1);
    await expect(page.locator('#topics + #fincifra-seminar + #speakers')).toHaveCount(1);
    await expect(block.getByRole('heading', { name: /ФинЦифра–2026/ })).toBeVisible();
    await expect(block).toContainText('МАЛАЯ СЦЕНА, СЕССИИ 2 И 3');
    await expect(block).toContainText('12:30–16:30');
    await expect(block).toContainText('Взаимодействие финансовых организаций с ГИС');
    await expect(block).toContainText('Антифрод-новации и работа с ГИС «Антифрод»');
    await expect(block).toContainText('Андрей Емелин');
    await expect(block).toContainText('Иван Зимин');

    const featured = page.locator('.space-route__stop--featured');
    await expect(featured).toHaveCount(1);
    await expect(featured).toHaveAttribute('href', '#fincifra-seminar');
    await expect(featured.locator('.space-route__label')).toHaveText('ФИНЦИФРА-2026');
    const planet = await featured.locator('.space-planet').evaluate(el => getComputedStyle(el).backgroundImage);
    const ordinary = await page.locator('.space-route__stop:not(.space-route__stop--featured) .space-planet').first()
      .evaluate(el => getComputedStyle(el).backgroundImage);
    expect(planet).not.toEqual(ordinary);

    for (const name of ['Андрей Емелин', 'Иван Зимин']) {
      const img = block.locator('.fincifra-seminar__portrait img[alt="' + name + '"]');
      await expect(img).toHaveCount(1);
      await expect.poll(() => img.evaluate(el => el.complete && el.naturalWidth === 256)).toBe(true);
    }
    await expect(block.getByRole('button', { name: 'Зарегистрироваться' })).toBeVisible();
    await expect(page.locator('.speakers-grid .speaker')).toHaveCount(32);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width + 2);
    expect(errors).toEqual([]);
  });
}

test('mobile menu link opens the seminar and closes navigation', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/m', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#site-preloader')).toHaveCount(0, { timeout: 20000 });
  await page.getByRole('button', { name: 'Открыть меню' }).click();
  const nav = page.locator('.space-navigation--mobile');
  await expect(nav).toHaveClass(/is-open/);
  await nav.locator('a.space-route__stop--featured').click();
  await expect(nav).not.toHaveClass(/is-open/);
  await expect(page).toHaveURL(/#fincifra-seminar$/);
});

test('FinCifra registration uses existing production tariff modal, not a new endpoint', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  let sent = 0;
  page.on('request', request => { if (request.url().includes('/api/lead')) sent++; });
  await page.goto('/m#fincifra-seminar', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#site-preloader')).toHaveCount(0, { timeout: 20000 });
  await page.locator('#fincifra-seminar .fincifra-seminar__register').click();
  const modal = page.locator('[role="dialog"].form-dialog--fincifra');
  await expect(modal).toHaveCount(1);
  await expect(modal).toHaveAttribute('data-tariff-id', 'fincifra');
  await expect(modal.locator('.selected-tariff')).toContainText('ФинЦифра');
  await expect(modal.locator('form#early-registration-form')).toHaveCount(1);
  expect(sent).toBe(0);
  await page.getByRole('button', { name: 'Закрыть форму' }).click();
  await expect(modal).toHaveCount(0);
});

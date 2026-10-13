import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() =>
    sessionStorage.setItem('debt2026-early-booking-dismissed', '1'),
  );
  await page.route('https://kinescope.io/**', (route) =>
    route.fulfill({ contentType: 'text/html', body: '<html></html>' }),
  );
});

for (const width of [320, 390, 768, 1024, 1440, 1920]) {
  test('FinCifra seminar is readable and integrated at ' + width + 'px', async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/#fincifra-seminar', { waitUntil: 'domcontentloaded' });
    await page.locator('#site-preloader').waitFor({ state: 'detached', timeout: 25000 });

    const seminar = page.locator('#fincifra-seminar');
    await expect(seminar.getByRole('heading', { level: 2 })).toContainText('ФинЦифра');
    await expect(seminar.getByText('IX Практический семинар')).toBeVisible();
    await expect(seminar.locator('.fincifra-seminar__agenda-row')).toHaveCount(2);
    await expect(seminar.locator('.fincifra-seminar__agenda-row li')).toHaveCount(6);
    await expect(seminar.locator('.fincifra-seminar__host')).toHaveCount(2);
    await expect(seminar).toContainText('Андрей Емелин');
    await expect(seminar).toContainText('Иван Зимин');
    await expect(seminar).toContainText('12:30');
    await expect(seminar).toContainText('16:30');

    const order = await page.locator('main > .section').evaluateAll((nodes) =>
      nodes.map((node) => node.id).filter(Boolean),
    );
    expect(order.indexOf('fincifra-seminar')).toBe(order.indexOf('topics') + 1);
    expect(order.indexOf('speakers')).toBe(order.indexOf('fincifra-seminar') + 1);

    for (const path of [
      'assets/figma/review/support-nsfr.svg',
      'assets/images/organizer/rvz-logo.svg',
      'assets/figma/debtprice-logo.svg',
    ]) {
      const logo = seminar.locator('img[src$="' + path + '"]');
      await expect(logo).toHaveCount(1);
      const response = await page.request.get(await logo.getAttribute('src'));
      expect(response.ok()).toBe(true);
    }

    if (width === 390 || width === 1440) {
      await page.evaluate(() => document.fonts.ready);
      await seminar.screenshot({
        path: 'test-results/fincifra-preview-' + width + '.png',
        animations: 'disabled',
        style: '.space-navigation--mobile, .skip-link { visibility: hidden !important; }',
      });
    }

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 2);
    expect(overflow).toBe(false);
    expect(errors).toEqual([]);

    await seminar.getByRole('button', { name: 'Зарегистрироваться' }).click();
    const modal = page.locator('.form-dialog[data-tariff-id="fincifra"]');
    await expect(modal).toBeVisible();
    await expect(modal.locator('[name="participants_count"]')).toHaveAttribute('max', '2');
    await page.keyboard.press('Escape');
    await expect(modal).toHaveCount(0);
  });
}

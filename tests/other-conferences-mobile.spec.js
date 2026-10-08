import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem('debt2026-early-booking-dismissed', '1'));
  await page.route('https://kinescope.io/**', (route) =>
    route.fulfill({ contentType: 'text/html', body: '<html></html>' }),
  );
});

for (const width of [320, 390, 768, 899]) {
  test('archive uses standard mobile carousel navigation at ' + width + 'px', async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/#other-conferences', { waitUntil: 'domcontentloaded' });

    const mobile = page.locator('.other-conferences-mobile');
    const track = mobile.locator('.other-conferences-mobile__track');
    const cards = track.locator('.conference-link-card');
    const controls = mobile.locator('.other-conferences-mobile__controls');
    const counter = controls.locator('span').first();
    const prev = controls.getByRole('button', { name: 'Предыдущая конференция' });
    const next = controls.getByRole('button', { name: 'Следующая конференция' });

    await expect(mobile).toBeVisible();
    await expect(page.locator('.other-conferences-carousel')).toBeHidden();
    await expect(cards).toHaveCount(10);
    await expect(controls).toBeVisible();
    await expect(counter).toContainText('01 / 10');
    await expect(prev).toBeDisabled();
    await expect(next).toBeEnabled();
    expect(await next.getAttribute('class')).toContain('ui-icon-button');
    const measurements = await track.evaluate((el) => ({
      display: getComputedStyle(el).display,
      scrollWidth: el.scrollWidth,
      clientWidth: el.clientWidth,
      first: el.children[0].getBoundingClientRect().width,
      controlInsideCard: !!el.querySelector('.other-conferences-carousel__control'),
    }));
    expect(measurements.display).toBe('flex');
    expect(measurements.scrollWidth).toBeGreaterThan(measurements.clientWidth);
    expect(measurements.first).toBeLessThan(measurements.clientWidth);
    expect(measurements.controlInsideCard).toBe(false);

    await next.click();
    await expect(counter).toContainText('02 / 10');
    await expect.poll(() => track.evaluate((el) => el.scrollLeft)).toBeGreaterThan(20);
    await prev.click();
    await expect(counter).toContainText('01 / 10');
    await expect.poll(() => track.evaluate((el) => el.scrollLeft)).toBeLessThan(2);

    await track.focus();
    await page.keyboard.press('End');
    await expect(counter).toContainText('10 / 10');
    await expect(next).toBeDisabled();
    await page.keyboard.press('Home');
    await expect(counter).toContainText('01 / 10');
    await expect.poll(() => track.evaluate((el) => el.scrollLeft)).toBeLessThan(2);

    // Native touch-scrolling remains supported, without desyncing the counter.
    await track.evaluate((el) => el.scrollTo({ left: el.scrollWidth, behavior: 'instant' }));
    await expect(counter).toContainText('10 / 10');
    await track.evaluate((el) => el.scrollTo({ left: 0, behavior: 'instant' }));
    await expect(counter).toContainText('01 / 10');

    await expect(cards.first()).toHaveAttribute('href', 'https://kazan.dolgtalk.ru/');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2)).toBe(
      true,
    );
    expect(errors).toEqual([]);
  });
}

for (const width of [1024, 1440]) {
  test('desktop keeps original infinite archive carousel at ' + width + 'px', async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/#other-conferences', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.other-conferences-mobile')).toBeHidden();
    const desktop = page.locator('.other-conferences-carousel');
    await expect(desktop).toBeVisible();
    await expect(desktop.locator('.conference-link-card')).toHaveCount(30);
    await expect(desktop.getByRole('button', { name: 'Предыдущая конференция' })).toBeVisible();
    await expect(desktop.getByRole('button', { name: 'Следующая конференция' })).toBeVisible();
  });
}

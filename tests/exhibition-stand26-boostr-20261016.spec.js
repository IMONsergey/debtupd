import { test, expect } from '@playwright/test';

const name = 'ПКО «Бустер.Ру»';
const description = 'ПКО «Бустер.Ру» (ГК IT Smart Finance)';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() =>
    sessionStorage.setItem('debt2026-early-booking-dismissed', '1'),
  );
  // UI-only tests: never deliver test leads to production.
  await page.route('**/api/lead', route => route.abort());
  await page.route('https://kinescope.io/**', route =>
    route.fulfill({ contentType: 'text/html', body: '<html></html>' }),
  );
});

for (const width of [390, 768, 1440]) {
  test('stand 26 is occupied by Boostr.Ru on floor 2 at ' + width + 'px', async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('/#exhibition', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#site-preloader')).toHaveCount(0, { timeout: 20000 });

    const section = page.locator('#exhibition');
    const floor2 = section.getByRole('tab', { name: '2-й этаж' });
    await floor2.click();
    await expect(floor2).toHaveAttribute('aria-selected', 'true');
    await expect(section.locator('#exhibition-floor-panel')).toHaveAttribute(
      'aria-labelledby', 'exhibition-tab-2',
    );
    const onMap = section.locator('.exhibition-map-stand[data-stand="26"]');
    await expect(onMap).toHaveAttribute('data-status', 'occupied');
    await expect(onMap).toHaveAttribute('title', 'Стенд забронирован');
    await expect(section.locator('[data-occupied-stand="26"]')).toHaveCount(1);
    const mappedShape = section.locator('[data-occupied-stand="26"] path');
    await expect(mappedShape).toHaveAttribute('class', /exhibition-occupied-shape/);
    await expect(section.locator('.exhibition-map-stand[data-stand="25"]')).toHaveAttribute('data-status', 'free');
    await expect(section.locator('.exhibition-map-stand[data-stand="27"]')).toHaveAttribute('data-status', 'free');

    const listEntry = section.locator('.exhibition-stand-list button[aria-label="Стенд 26 забронирован"]');
    await expect(listEntry).toHaveAttribute('data-status', 'occupied');
    await listEntry.click();
    const detail = section.locator('#exhibition-stand-detail');
    await expect(detail).toContainText('Стенд №26');
    await expect(detail).toContainText(description);
    await expect(detail.locator('.exhibition-status')).toContainText('Стенд забронирован');
    await expect(detail.getByRole('button', { name: 'Стать партнером' })).toHaveCount(0);

    const img = detail.locator('img[alt="' + name + '"]');
    await expect(img).toHaveAttribute('src', /\/assets\/partners\/boostr-ru\.png$/);
    await img.scrollIntoViewIfNeeded();
    await expect.poll(() => img.evaluate(el =>
      el.complete && el.naturalWidth === 582 && el.naturalHeight === 128
    ), { timeout: 15000 }).toBe(true);
    await expect(section.locator('.exhibition-availability__count')).toHaveText('10');
    const card = section.locator('.exhibition-company[data-primary]').filter({ hasText: description });
    await expect(card).toHaveCount(1);
    await expect(card.locator('img[alt="' + name + '"]')).toHaveCount(1);
    await expect(card.locator('.exhibition-company__stand')).toContainText('Стенд №26');
    const logoResponse = await page.request.get(new URL(await img.getAttribute('src'), page.url()).href);
    expect(logoResponse.ok()).toBe(true);
    expect(logoResponse.headers()['content-type']).toContain('image/png');
    await expect(page.locator('.conference-partners-list .conference-partner-name').last()).toHaveText(name);
    await expect(page.locator('.speaker')).toHaveCount(29);
    await expect(page.locator('#fincifra-seminar')).toHaveCount(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width + 2);
    expect(errors).toEqual([]);
  });
}

test('exhibitor carousel navigates to stand 26 on the second floor', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#exhibition', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#site-preloader')).toHaveCount(0, { timeout: 20000 });
  const card = page.locator('.exhibition-company[data-primary]')
    .filter({ hasText: description });
  await expect(card).toHaveCount(1);
  const selectStand = card.getByRole('button', { name: 'Стенд №26' });
  await selectStand.scrollIntoViewIfNeeded();
  await selectStand.focus();
  await selectStand.click();
  await expect(page.getByRole('tab', { name: '2-й этаж' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('#exhibition-stand-detail')).toContainText(description);
  await expect(page.locator('.exhibition-map-stand[data-stand="26"]')).toHaveAttribute('data-status', 'occupied');
});

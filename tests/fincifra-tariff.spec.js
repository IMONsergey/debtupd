import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    sessionStorage.setItem('debt2026-early-booking-dismissed', '1');
  });
  await page.route('https://kinescope.io/**', (route) =>
    route.fulfill({ contentType: 'text/html', body: '<html></html>' }),
  );
  await page.route('**/api/lead', (route) =>
    route.fulfill({ status: 503, contentType: 'application/json', body: '{"success":false}' }),
  );
});

const included = [
  'Посещение практического семинара «ФинЦифра»',
  'Кофе-брейк, обед',
  'Фотоотчет',
  'Презентации спикеров',
  'Видеозапись практического семинара «ФинЦифра»',
];
const excluded = ['Креативная вечерняя программа', 'Space Disco Afterparty'];

for (const width of [1440, 1024, 768, 390, 320]) {
  test('NSFR tariff is responsive, correct and standalone at ' + width + 'px', async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const pageErrors = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));
    await page.goto('/#tariff-plans', { waitUntil: 'domcontentloaded' });
    const tariff = page.locator('.tariff--fincifra');
    await expect(page.locator('.tariff')).toHaveCount(4);
    await expect(tariff).toBeVisible();
    await expect(tariff.locator('h3')).toHaveText('«ФинЦифра» для членов НСФР');
    await expect(tariff.locator('.tariff-limit-note')).toContainText('Не более двух билетов');
    await expect(tariff.locator('.tariff-bottom > strong')).toHaveText('24 500 ₽');
    await expect(tariff.locator('.tariff-bottom > span')).toHaveText('Стоимость');
    await expect(tariff.locator('li')).toHaveCount(7);
    await expect(tariff.locator('.included > span')).toContainText(
      included.map((label) => label + ' — входит в тариф'),
    );
    await expect(tariff.locator('.not-included > span')).toContainText(
      excluded.map((label) => label + ' — не входит в тариф'),
    );
    await expect(page.locator('.tariff--business .tariff-bottom > strong')).toHaveText('49 000 ₽');
    await expect(page.locator('.tariff--full .tariff-bottom > strong')).toHaveText('54 000 ₽');
    await expect(page.locator('.tariff--full-plus .tariff-bottom > strong')).toHaveText('66 000 ₽');
    const geometry = await tariff.evaluate((el) => {
      const tariffBox = el.getBoundingClientRect();
      const cards = el.parentElement.getBoundingClientRect();
      const ul = el.querySelector('ul').getBoundingClientRect();
      const h3 = el.querySelector('h3').getBoundingClientRect();
      return {
        width: tariffBox.width,
        groupWidth: cards.width,
        featuresToRight:
          ul.left > h3.left && ul.top <= h3.bottom && ul.right <= tariffBox.right + 1,
        featureWithin: ul.right <= tariffBox.right + 1 && ul.left >= tariffBox.left - 1,
      };
    });
    expect(geometry.featureWithin).toBe(true);
    if (width >= 900) {
      expect(Math.abs(geometry.width - geometry.groupWidth)).toBeLessThan(3);
      expect(geometry.featuresToRight).toBe(true);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2)).toBe(
      true,
    );
    expect(pageErrors).toEqual([]);
  });
}

test('NSFR ticket booking carries correct tariff, limit and price to modal', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/#tariff-plans', { waitUntil: 'domcontentloaded' });
  await page.locator('.tariff--fincifra').getByRole('button', { name: 'Принять участие' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toHaveAttribute('data-tariff-id', 'fincifra');
  await expect(dialog.locator('#application-title')).toContainText('«ФинЦифра» для членов НСФР');
  await expect(dialog.locator('.selected-tariff')).toContainText('24 500 ₽');
  await expect(dialog.locator('.tariff-form-limit')).toContainText('Не более двух билетов');
  const count = dialog.locator('[name="participants_count"]');
  await expect(count).toHaveAttribute('min', '1');
  await expect(count).toHaveAttribute('max', '2');
  await count.fill('3');
  expect(await count.evaluate((el) => el.validity.rangeOverflow)).toBe(true);
  await count.fill('2');
  expect(await count.evaluate((el) => el.validity.valid)).toBe(true);
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);

  // A single NSFR participant is limited to 2 tickets, while corporate
  // group discounts must not advertise this individual membership offer.
  await expect(
    page.locator('.corporate-form select[name="tariff_id"] option[value="fincifra"]'),
  ).toHaveCount(0);
});

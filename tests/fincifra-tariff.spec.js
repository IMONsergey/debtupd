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
    const layout = await page.locator('.tariff-grid').evaluate((grid) => {
      const columns = getComputedStyle(grid).gridTemplateColumns.split(' ').filter(Boolean).length;
      const cards = Array.from(grid.children).map((card) => {
        const r = card.getBoundingClientRect();
        const ul = card.querySelector('ul').getBoundingClientRect();
        return {
          x: r.x,
          y: r.y,
          width: r.width,
          height: r.height,
          contentInside: ul.left >= r.left - 1 && ul.right <= r.right + 1,
        };
      });
      return { columns, cards, groupWidth: grid.getBoundingClientRect().width };
    });
    const expectedColumns = width > 1180 ? 4 : width >= 900 ? 2 : 1;
    expect(layout.columns).toBe(expectedColumns);
    expect(layout.cards.every((card) => card.contentInside)).toBe(true);
    if (width > 1180) {
      expect(layout.cards.every((card) => Math.abs(card.y - layout.cards[0].y) < 2)).toBe(true);
      expect(layout.cards.every((card) => Math.abs(card.height - layout.cards[0].height) < 2)).toBe(
        true,
      );
      expect(Math.abs(layout.cards[3].width - layout.cards[0].width)).toBeLessThan(2);
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

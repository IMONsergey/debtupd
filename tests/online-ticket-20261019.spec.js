import { test, expect } from '@playwright/test';

const expectedFeatures = ['Онлайн-трансляция форума', 'Презентации спикеров', 'Видеозапись форума'];

test.beforeEach(async ({ page }) => {
  // Visual and form-contract checks must never send real CRM or Telegram requests.
  await page.route('**/api/lead', (route) =>
    route.fulfill({ status: 503, contentType: 'application/json', body: '{"success":false}' }),
  );
  await page.route('https://kinescope.io/**', (route) =>
    route.fulfill({ contentType: 'text/html', body: '<html></html>' }),
  );
});

for (const width of [320, 390, 600, 768, 899, 900, 1024, 1180, 1181, 1440, 1920]) {
  test(`online ticket preserves tariff layout and opens the correct form at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/#tariff-plans', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#site-preloader')).toHaveCount(0, { timeout: 20000 });

    const grid = page.locator('#tariff-plans');
    const cards = grid.locator(':scope > .tariff');
    await expect(cards).toHaveCount(5);
    await expect(cards.first()).toHaveClass(/tariff--business/);
    await expect(cards.nth(1)).toHaveClass(/tariff--full/);
    await expect(cards.nth(2)).toHaveClass(/tariff--full-plus/);
    await expect(cards.nth(3)).toHaveClass(/tariff--fincifra/);
    const online = cards.last();
    await expect(online).toHaveClass(/tariff--online/);
    await expect(online.locator('h3')).toHaveText('Онлайн-участие');
    await expect(online.locator('li')).toHaveCount(3);
    await expect(online.locator('li.included')).toHaveCount(3);
    const benefits = await online.locator('li > span').allTextContents();
    for (const [index, label] of expectedFeatures.entries()) {
      expect(benefits[index].replace(/\s+/g, ' ').trim()).toContain(label);
    }
    await expect(online.locator('.tariff-bottom > span')).toHaveText('Стоимость');
    await expect(online.locator('.tariff-bottom > strong')).toHaveText('25 000 ₽');
    const illustration = online.locator('.tariff-online__visual');
    const satellite = illustration.locator('img');
    await expect(illustration).toHaveAttribute('aria-hidden', 'true');
    await expect(satellite).toHaveAttribute('alt', '');
    await expect(satellite).toHaveAttribute(
      'src',
      /\/assets\/images\/tariffs\/online-satellite\.webp$/,
    );
    if (width >= 900) {
      await online.scrollIntoViewIfNeeded();
      await expect(illustration).toBeVisible();
      await expect
        .poll(() => satellite.evaluate((image) => image.complete && image.naturalWidth > 0), {
          timeout: 20000,
        })
        .toBe(true);
      const positions = await online.evaluate((article) => {
        const rect = (selector) => article.querySelector(selector).getBoundingClientRect();
        const heading = rect('h3');
        const benefits = rect('ul');
        const price = rect('.tariff-bottom');
        const image = rect('.tariff-online__visual');
        const card = article.getBoundingClientRect();
        return {
          titleAligned: Math.abs(heading.left - benefits.left) <= 2,
          compactText: benefits.top - heading.bottom < 35,
          priceNextToFeatures: price.left >= benefits.right - 2,
          priceTopAligned: Math.abs(price.top - benefits.top) <= 2,
          imageRightOfPrice: image.left >= price.right - 2,
          artThird: image.width >= card.width * 0.23 && image.width <= card.width * 0.4,
          compactHeight: card.height <= 310,
          buttonTextSingleLine: (() => {
            const label = article.querySelector('.tariff-bottom .button-label');
            const lineHeight = parseFloat(getComputedStyle(label).lineHeight);
            return (
              label.clientHeight <= lineHeight + 2 && label.scrollWidth <= label.clientWidth + 2
            );
          })(),
        };
      });
      expect(positions).toEqual({
        titleAligned: true,
        compactText: true,
        priceNextToFeatures: true,
        priceTopAligned: true,
        imageRightOfPrice: true,
        artThird: true,
        compactHeight: true,
        buttonTextSingleLine: true,
      });
    } else {
      await expect(illustration).toBeHidden();
    }

    const layout = await grid.evaluate((element) => {
      const children = [...element.querySelectorAll(':scope > .tariff')];
      const first = children[0].getBoundingClientRect();
      const fifth = children[4].getBoundingClientRect();
      const lastOfFirstRow = children[3].getBoundingClientRect();
      return {
        alignX: Math.abs(first.left - fifth.left),
        onlineBelow: fifth.top >= lastOfFirstRow.top + lastOfFirstRow.height - 2,
        cardOverflow: children.some((item) => item.scrollWidth > item.clientWidth + 2),
      };
    });
    expect(layout.alignX).toBeLessThanOrEqual(2);
    expect(layout.onlineBelow).toBe(true);
    expect(layout.cardOverflow).toBe(false);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      width + 2,
    );
    expect(errors).toEqual([]);

    await online.getByRole('button', { name: 'Принять участие' }).click();
    const dialog = page.getByRole('dialog', { name: 'Регистрация' });
    await expect(dialog).toHaveAttribute('data-tariff-id', 'online');
    await expect(dialog.locator('.selected-tariff')).toContainText('Онлайн-участие');
    await expect(dialog.locator('.selected-tariff')).toContainText('25 000 ₽');
    await expect(dialog.locator('input[name="participants_count"]')).toHaveAttribute('min', '1');
    await dialog.getByRole('button', { name: 'Закрыть форму' }).click();
    await expect(dialog).toHaveCount(0);
  });
}

test('online registration posts the fixed ticket selection and quantity, never a real request', async ({
  page,
}) => {
  let submitted;
  await page.unroute('**/api/lead');
  await page.route('**/api/lead', (route) => {
    submitted = route.request().postDataJSON();
    return route.fulfill({ json: { success: true, deal_id: 4242 } });
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/?utm_source=online-ticket-test#tariff-plans', {
    waitUntil: 'domcontentloaded',
  });
  await expect(page.locator('#site-preloader')).toHaveCount(0, { timeout: 20000 });
  const corporateTariffs = await page
    .locator('#corporate-package-form select[name="tariff_id"] option')
    .evaluateAll((options) => options.map((option) => option.value));
  expect(corporateTariffs).not.toContain('online');

  await page.locator('.tariff--online').getByRole('button', { name: 'Принять участие' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.locator('[name="full_name"]').fill('Тест интерфейса');
  await dialog.locator('[name="company"]').fill('Проверка песочницы');
  await dialog.locator('[name="participants_count"]').fill('2');
  await dialog.locator('[name="phone"]').fill('+7 999 111 22 33');
  await dialog.locator('[name="email"]').fill('sandbox@example.test');
  await dialog.locator('[name="consent"]').check();
  await dialog.getByRole('button', { name: 'Отправить заявку' }).click();
  await expect(dialog.getByText('Спасибо! Заявка отправлена')).toBeVisible();
  expect(submitted).toMatchObject({
    form_id: 'early-registration-form',
    tariff_id: 'online',
    tariff_name: 'Онлайн-участие',
    tariff_price: '25 000 ₽',
    participants_count: '2',
    utm_source: 'online-ticket-test',
    consent: true,
  });
});

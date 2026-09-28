import { test, expect } from '@playwright/test';
const widths = [320, 360, 390, 430, 600, 768, 1024, 1180, 1181, 1280, 1440, 1920, 2560];
test.beforeEach(async ({ page }) => {
  await page.route('**/api/lead', (r) =>
    r.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ success: false, message: 'Тестовая отправка перехвачена.' }),
    }),
  );
});
for (const width of widths)
  test(`Responsive layout ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('/');
    await page.evaluate(() => document.fonts.ready);
    await expect(page.locator('.speaker')).toHaveCount(13);
    await expect(page.locator('.tariff')).toHaveCount(3);
    await expect(page.getByRole('heading', { name: 'MULTIPASS' })).toBeVisible();
    const issues = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth > innerWidth,
      clipped: [
        ...document.querySelectorAll('h2,h3,.button,.speaker,.organizer-card,.participant-card'),
      ]
        .filter((e) => e.scrollWidth > e.clientWidth + 2)
        .map((e) => e.textContent),
      broken: [...document.images].filter((i) => i.complete && !i.naturalWidth).map((i) => i.src),
    }));
    expect(issues).toEqual({ overflow: false, clipped: [], broken: [] });
    expect(errors).toEqual([]);
    const section = page.locator('#participants');
    const h1 = (await section.boundingBox()).height;
    await page.getByRole('tab', { name: /Пространств/ }).click();
    await expect(page.locator('#panel-1')).toBeVisible();
    await expect(page.locator('#panel-0')).toHaveAttribute('inert', '');
    expect(Math.abs((await section.boundingBox()).height - h1)).toBeLessThan(2);
  });
test('Production mobile menu closes on Escape, outside click and navigation', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const trigger = page.getByRole('button', { name: 'Открыть меню' });
  const menu = page.getByRole('navigation', { name: 'Разделы сайта' });
  await trigger.click();
  await expect(menu).toBeVisible();
  await expect(menu.getByRole('link')).toHaveCount(7);
  await page.keyboard.press('Escape');
  await expect(menu).toBeHidden();
  await expect(trigger).toBeFocused();
  await trigger.click();
  await page.locator('.hero-lead p').click();
  await expect(menu).toBeHidden();
  await trigger.click();
  await menu.getByRole('link', { name: 'Тарифы', exact: true }).click();
  await expect(menu).toBeHidden();
  await expect
    .poll(() =>
      page.evaluate(() =>
        Math.abs(document.querySelector('#tariffs').getBoundingClientRect().top - 80),
      ),
    )
    .toBeLessThan(3);
});
async function openRegistration(page) {
  await page.goto('/?utm_source=qa&utm_campaign=local');
  await page.locator('.tariff--business').getByRole('button', { name: 'Принять участие' }).click();
  const form = page.locator('#early-registration-form');
  await form.locator('[name="full_name"]').fill('Проверка интерфейса');
  await form.locator('[name="company"]').fill('Тест без отправки');
  await form.locator('[name="phone"]').fill('+7 999 111 22 33');
  await form.locator('[name="email"]').fill('qa@example.test');
  return form;
}
test('Consent is required, valid registration preserves tariff and attribution', async ({
  page,
}) => {
  let calls = [];
  await page.unroute('**/api/lead');
  await page.route('**/api/lead', (r) => {
    calls.push(r.request().postDataJSON());
    return r.fulfill({ json: { success: true, deal_id: 123 } });
  });
  const form = await openRegistration(page);
  await form.getByRole('button', { name: 'Отправить заявку' }).click();
  expect(calls).toHaveLength(0);
  await form.locator('[name="consent"]').check();
  await form.getByRole('button', { name: 'Отправить заявку' }).click();
  await expect(page.getByText('Спасибо! Заявка отправлена')).toBeVisible();
  expect(calls).toHaveLength(1);
  expect(calls[0]).toMatchObject({
    form_id: 'early-registration-form',
    event_id: 'debt-tech-2026',
    tariff_id: 'business',
    consent: true,
    utm_source: 'qa',
    utm_campaign: 'local',
  });
});
for (const response of [
  { name: '500', status: 500, body: '{"success":false}' },
  { name: 'false success', status: 200, body: '{"success":false}' },
  { name: 'HTML fallback', status: 200, body: '<!doctype html><p>Not an API</p>' },
])
  test(`No false success on ${response.name}`, async ({ page }) => {
    await page.unroute('**/api/lead');
    await page.route('**/api/lead', (r) =>
      r.fulfill({ status: response.status, body: response.body, contentType: 'application/json' }),
    );
    const form = await openRegistration(page);
    await form.locator('[name="consent"]').check();
    await form.getByRole('button', { name: 'Отправить заявку' }).click();
    await expect(form.locator('.form-feedback')).not.toBeEmpty();
    await expect(page.getByText('Спасибо! Заявка отправлена')).toHaveCount(0);
    await expect(form.locator('[name="full_name"]')).toHaveValue('Проверка интерфейса');
    await expect(form.getByRole('button', { name: 'Отправить заявку' })).toBeEnabled();
  });
test('Corporate calculation uses ticket-specific discounts after confirmed delivery', async ({
  page,
}) => {
  let sent;
  await page.unroute('**/api/lead');
  await page.route('**/api/lead', (r) => {
    sent = r.request().postDataJSON();
    return r.fulfill({ json: { success: true } });
  });
  await page.goto('/');
  const form = page.locator('#corporate-package-form');
  await form.locator('[name="participants_count"]').fill('5');
  await form.locator('select').selectOption('business');
  await form.locator('[name="full_name"]').fill('Тест без отправки');
  await form.locator('[name="phone"]').fill('+79991112233');
  await form.locator('[name="consent"]').check();
  await form.getByRole('button', { name: 'Рассчитать стоимость' }).click();
  await expect(form.getByText('Заявка отправлена', { exact: true })).toBeVisible();
  await expect(form.getByText(/202\s*400/)).toBeVisible();
  expect(sent).toMatchObject({
    form_id: 'corporate-package-form',
    participants_count: '5',
    tariff_id: 'business',
    consent: true,
  });
});
test('Stand form retains the production payload contract', async ({ page }) => {
  let sent;
  await page.unroute('**/api/lead');
  await page.route('**/api/lead', (r) => {
    sent = r.request().postDataJSON();
    return r.fulfill({ json: { success: true } });
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/');
  await page.locator('.fixed-menu').getByRole('button', { name: 'Забронировать стенд' }).click();
  const form = page.locator('#stand-booking-form');
  for (const [key, val] of Object.entries({
    full_name: 'Тест интерфейса',
    company: 'Тест без отправки',
    phone: '+79991112233',
    email: 'qa@example.test',
    job_title: 'Тест',
    comment: 'Локальный тест',
  }))
    await form.locator(`[name="${key}"]`).fill(val);
  await form.locator('[name="consent"]').check();
  await form.getByRole('button', { name: 'Отправить заявку' }).click();
  await expect(page.getByText('Спасибо! Заявка отправлена')).toBeVisible();
  expect(sent).toMatchObject({
    form_id: 'stand-booking-form',
    job_title: 'Тест',
    comment: 'Локальный тест',
  });
});
test('Video loads on demand; gallery and conference controls work', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.route('https://kinescope.io/**', (r) =>
    r.fulfill({ body: '<p>Video embed intercepted</p>', contentType: 'text/html' }),
  );
  await page.goto('/');
  await expect(page.locator('.media-dialog iframe')).toHaveCount(0);
  await page.locator('.fixed-menu').getByRole('button', { name: 'Открыть видео' }).click();
  await expect(page.locator('.media-dialog iframe')).toHaveAttribute(
    'src',
    /dd7dQ3BMbTCeSfteZFXCiS/,
  );
  await page.keyboard.press('Escape');
  await expect(page.locator('.media-dialog iframe')).toHaveCount(0);
  await page.locator('.fixed-menu').getByRole('link', { name: 'Кадры с DEBT TECH 2025' }).click();
  await expect(page.locator('.gallery-controls')).toContainText('1 / 20');
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('.gallery-controls')).toContainText('2 / 20');
  await page.keyboard.press('Escape');
  const before = await page.locator('.conference-main').getAttribute('href');
  await page.getByRole('button', { name: 'Следующая конференция' }).click();
  expect(await page.locator('.conference-main').getAttribute('href')).not.toBe(before);
  await page.getByRole('button', { name: 'Предыдущая конференция' }).click();
  await expect(page.locator('.conference-main')).toHaveAttribute('href', before);
});
test('Reduced motion and preview analytics isolation', async ({ page }) => {
  await page.goto('/');
  expect(
    await page
      .locator('.cosmos i')
      .first()
      .evaluate((n) => getComputedStyle(n).animationName),
  ).toBe('none');
  expect(await page.evaluate(() => typeof window.ym)).toBe('undefined');
});

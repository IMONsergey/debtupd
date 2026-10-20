import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.route('https://kinescope.io/**', (route) =>
    route.fulfill({ contentType: 'text/html', body: '<html></html>' }),
  );
});

for (const kind of ['stand', 'business', 'full', 'full-plus', 'fincifra', 'online']) {
  test('mobile fills and submits every field in ' + kind, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 700 });
    const submissions = [];
    await page.route('**/api/lead', (route) => {
      submissions.push(route.request().postDataJSON());
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: '{"success":true,"deal_id":123}',
      });
    });
    await page.goto('/#tariffs', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#site-preloader')).toHaveCount(0, { timeout: 20000 });
    if (kind === 'stand') await page.locator('.hero-stand').click();
    else
      await page
        .locator('.tariff--' + kind)
        .getByRole('button', { name: 'Принять участие' })
        .click();
    const dlg = page.getByRole('dialog'),
      form = dlg.locator('form');
    await expect(form).toBeVisible();
    const before = await form.locator('.field input').evaluateAll((elements) =>
      elements.map((el) => ({
        name: el.name,
        required: el.required,
        inputType: el.type,
        autoComplete: el.autocomplete,
        inputMode: el.inputMode,
      })),
    );
    expect(before.find((el) => el.name === 'phone').inputMode).toBe('tel');
    expect(before.find((el) => el.name === 'email').inputMode).toBe('email');
    await form.locator('[name=full_name]').fill('  Тестовая Персона  ');
    await form.locator('[name=company]').fill('  Компания для проверки  ');
    await form.locator('[name=phone]').fill('+49 170 1234567');
    await expect(form.locator('[name=phone]')).toHaveValue('+491701234567');
    await form.locator('[name=email]').fill('person@example');
    await form.locator('[name=email]').blur();
    await expect(form.locator('[name=email]')).toHaveAttribute('aria-invalid', 'true');
    await form.locator('[name=email]').fill('email@example.test');
    await expect(form.locator('[name=email]')).not.toHaveAttribute('aria-invalid', 'true');

    if (kind === 'stand') {
      await form.locator('[name=job_title]').fill('  Руководитель  ');
      await form.locator('[name=comment]').fill('Только локальная проверка\nМногострочное поле');
    } else {
      await form.locator('[name=participants_count]').fill(kind === 'fincifra' ? '3' : '0');
      await form.locator('button[type=submit]').click();
      await expect(form.locator('[name=participants_count]')).toHaveAttribute(
        'aria-invalid',
        'true',
      );
      await form.locator('[name=participants_count]').fill(kind === 'fincifra' ? '2' : '3');
      await form.locator('[name=promo_code]').fill('CHECK-2026');
    }
    await form.locator('button[type=submit]').click();
    await expect(form.locator('[name=consent]')).toHaveAttribute('aria-invalid', 'true');
    await form.locator('[name=consent]').check();
    await form.locator('button[type=submit]').click();
    await expect(dlg.locator('.form-success')).toBeVisible();
    expect(submissions).toHaveLength(1);
    expect(submissions[0]).toMatchObject({
      form_id: kind === 'stand' ? 'stand-booking-form' : 'early-registration-form',
      consent: true,
      full_name: 'Тестовая Персона',
      company: 'Компания для проверки',
      phone: '+491701234567',
      email: 'email@example.test',
    });
    if (kind === 'stand') {
      expect(submissions[0].comment).toContain('Многострочное поле');
      expect(submissions[0].job_title).toBe('Руководитель');
    } else {
      expect(submissions[0].promo_code).toBe('CHECK-2026');
      expect(submissions[0].participants_count).toBe(kind === 'fincifra' ? '2' : '3');
      expect(submissions[0].tariff_id).toBe(kind);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      392,
    );
  });
}

test('mobile form retains values after a failed request and allows retry', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 620 });
  let tries = 0;
  await page.route('**/api/lead', (route) => {
    tries++;
    return route.fulfill({
      status: tries === 1 ? 502 : 200,
      contentType: 'application/json',
      body:
        tries === 1
          ? '{"success":false,"message":"Временная ошибка сервера"}'
          : '{"success":true,"deal_id":321}',
    });
  });
  await page.goto('/#exhibition', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#site-preloader')).toHaveCount(0, { timeout: 20000 });
  await page.locator('.exhibition-cta--mobile').click();
  const dlg = page.getByRole('dialog'),
    form = dlg.locator('form');
  await form.locator('[name=full_name]').fill('Сотрудник Партнера');
  await form.locator('[name=company]').fill('Организация');
  await form.locator('[name=phone]').fill('89991112233');
  await form.locator('[name=email]').fill('contact@example.test');
  await form.locator('[name=comment]').fill('Стенд 17 — пример');
  await form.locator('[name=consent]').check();
  await form.locator('button[type=submit]').click();
  await expect(form.locator('.form-feedback')).toContainText('Временная ошибка сервера');
  await expect(form.locator('[name=company]')).toHaveValue('Организация');
  await expect(form.locator('button[type=submit]')).toBeEnabled();
  await form.locator('button[type=submit]').click();
  await expect(dlg.locator('.form-success')).toBeVisible();
  expect(tries).toBe(2);
});

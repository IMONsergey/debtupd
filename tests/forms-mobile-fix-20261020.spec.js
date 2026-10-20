import { test, expect } from '@playwright/test';

const role = 'Партнерское участие';

test.beforeEach(async ({ page }) => {
  await page.route('**/api/lead', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: '{"success":true,"deal_id":555}',
    }),
  );
  await page.route('https://kinescope.io/**', (route) =>
    route.fulfill({ contentType: 'text/html', body: '<html></html>' }),
  );
});

for (const width of [320, 390, 768, 1440]) {
  test(
    'partner form validates mobile fields and retains telephone caret at ' + width + 'px',
    async ({ page }) => {
      await page.setViewportSize({ width, height: width === 320 ? 640 : 820 });
      const posts = [];
      await page.unroute('**/api/lead');
      await page.route('**/api/lead', (route) => {
        posts.push(route.request().postDataJSON());
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: '{"success":true,"deal_id":555}',
        });
      });
      await page.goto('/#exhibition', { waitUntil: 'domcontentloaded' });
      await expect(page.locator('#site-preloader')).toHaveCount(0, { timeout: 20000 });
      await page
        .locator(width < 768 ? '.exhibition-cta--mobile' : '.exhibition-cta--desktop')
        .click();
      const dlg = page.getByRole('dialog');
      await expect(dlg).toContainText(role);
      const form = dlg.locator('form');
      await expect(form).toHaveAttribute('id', 'partner-participation-form');
      const phone = form.locator('[name=phone]');
      await phone.fill('+86 138 1234 5678');
      await expect(phone).toHaveValue('+8613812345678');
      await phone.fill('89991112233');
      await expect(phone).toHaveValue('+7 999 111-22-33');
      await phone.evaluate((el) => {
        el.focus();
        el.setSelectionRange(7, 7);
      });
      await page.keyboard.press('Backspace');
      const state = await phone.evaluate((el) => ({ v: el.value, caret: el.selectionStart }));
      expect(state.caret).toBeLessThan(state.v.length - 3);
      expect(state.v.replace(/\D/g, '').length).toBe(10);

      await form.locator('[name=full_name]').fill('   ');
      await form.locator('[name=company]').fill(' ');
      await form.locator('[name=email]').fill('name@example');
      await form.getByRole('button', { name: 'Стать партнером' }).click();
      expect(posts).toHaveLength(0);
      await expect(form.locator('[name=full_name]')).toHaveAttribute('aria-invalid', 'true');
      await expect(form.locator('[name=email]')).toHaveAttribute('aria-invalid', 'true');
      await expect(form.locator('.field-error').first()).toBeVisible();

      await form.locator('[name=full_name]').fill('Тестовое лицо');
      await form.locator('[name=company]').fill('Тестовая компания');
      await form.locator('[name=email]').fill('abc@example.test');
      await form.locator('[name=phone]').fill('89991112233');
      await form.locator('[name=consent]').check();
      await form.getByRole('button', { name: 'Стать партнером' }).click();
      await expect(dlg.locator('.form-success')).toBeVisible();
      expect(posts).toHaveLength(1);
      expect(posts[0]).toMatchObject({
        form_id: 'partner-participation-form',
        full_name: 'Тестовое лицо',
        company: 'Тестовая компания',
        consent: true,
      });
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
        width + 2,
      );
    },
  );
}

test('corporate form phone, name and count show inline errors on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 744 });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#site-preloader')).toHaveCount(0, { timeout: 20000 });
  const form = page.locator('#corporate-package-form');
  await form.locator('[name=participants_count]').fill('0');
  await form.locator('[name=full_name]').fill('  ');
  await form.locator('[name=phone]').fill('+7 999');
  await form.locator('button[type=submit]').click();
  await expect(form.locator('#corporate-participants-error')).toBeVisible();
  await expect(form.locator('#corporate-name-error')).toBeVisible();
  await expect(form.locator('#corporate-phone-error')).toBeVisible();
  await form.locator('[name=participants_count]').fill('5');
  await form.locator('[name=full_name]').fill('Тестовый участник');
  await form.locator('[name=phone]').fill('89991112233');
  await form.locator('[name=consent]').check();
  await form.locator('button[type=submit]').click();
  await expect(page.getByRole('dialog', { name: 'Корпоративное участие' })).toBeVisible();
});

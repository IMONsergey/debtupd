import { test, expect } from '@playwright/test';

const archivedOffer =
  'Скидка 50% на один билет любого тарифа для представителя компании, которая впервые участвует в DEBT TECH.';
const approvedTerms = 'Скидка предоставляется по согласованию с организаторами.';

test.beforeEach(async ({ page }) => {
  // Live Bitrix24 and Telegram must never receive a lead from automated checks.
  await page.route('**/api/lead', (route) =>
    route.fulfill({ status: 503, json: { success: false } }),
  );
  await page.route('https://kinescope.io/**', (route) =>
    route.fulfill({ contentType: 'text/html', body: '<html></html>' }),
  );
});

for (const width of [320, 390, 599, 600, 700, 768, 900, 1024, 1180, 1181, 1440, 1920]) {
  test(
    'Welcome Pass archive offer and astronaut artwork fit at ' + width + 'px',
    async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      const pageErrors = [];
      page.on('pageerror', (error) => pageErrors.push(error.message));
      await page.goto('/#tariffs', { waitUntil: 'domcontentloaded' });
      await expect(page.locator('#site-preloader')).toHaveCount(0, { timeout: 20000 });

      const welcome = page.locator('#tariffs #welcome-pass.welcome-pass');
      await expect(welcome).toHaveCount(1);
      await welcome.scrollIntoViewIfNeeded();
      await expect(welcome.getByRole('heading', { name: 'Welcome Pass' })).toBeVisible();
      await expect(welcome.locator('.welcome-pass__eyebrow')).toHaveText('Multipass');
      await expect(welcome.locator('.welcome-pass__offer > strong')).toHaveText('50%');
      await expect(welcome.locator('.welcome-pass__label')).toHaveText('Для новых компаний');
      await expect(welcome.locator('.welcome-pass__description p')).toHaveText(archivedOffer);
      await expect(welcome.locator('.welcome-pass__footer p')).toHaveText(approvedTerms);
      const art = welcome.locator('.welcome-pass__art');
      await expect(art).toHaveAttribute('src', /\/assets\/images\/tariffs\/hand-spaceman\.webp$/);
      await expect(art).toHaveAttribute('alt', '');
      await expect
        .poll(() => art.evaluate((img) => img.complete && img.naturalWidth > 0), { timeout: 20000 })
        .toBe(true);

      const layout = await welcome.evaluate((root) => {
        const rootBox = root.getBoundingClientRect();
        const title = root.querySelector('h3').getBoundingClientRect();
        const copy = root.querySelector('.welcome-pass__description').getBoundingClientRect();
        const conditions = root.querySelector('.welcome-pass__footer p').getBoundingClientRect();
        const action = root.querySelector('.welcome-pass__cta').getBoundingClientRect();
        const artBox = root.querySelector('.welcome-pass__art').getBoundingClientRect();
        const gridBox = document.querySelector('#tariff-plans').getBoundingClientRect();
        return {
          inTariffs: root.closest('#tariffs') !== null,
          beforeTariffs: rootBox.bottom <= gridBox.top,
          copyVisible: copy.top >= rootBox.top && copy.bottom < rootBox.bottom,
          headingVisible: title.top >= rootBox.top && title.bottom <= rootBox.bottom,
          termsVisible: conditions.bottom <= rootBox.bottom,
          actionVisible: action.bottom <= rootBox.bottom,
          // The decorative glove deliberately extends beyond the panel and is clipped.
          artworkClipped: getComputedStyle(root).overflowX === 'hidden',
          noHorizontalScroll: document.documentElement.scrollWidth <= innerWidth + 2,
          artPresent: artBox.width > 130 && artBox.height > 60,
        };
      });
      expect(layout).toEqual({
        inTariffs: true,
        beforeTariffs: true,
        copyVisible: true,
        headingVisible: true,
        termsVisible: true,
        actionVisible: true,
        artworkClipped: true,
        noHorizontalScroll: true,
        artPresent: true,
      });
      expect(pageErrors).toEqual([]);

      const cards = page.locator('#tariff-plans > .tariff');
      await expect(cards).toHaveCount(5);
      const online = cards.last();
      await expect(online.locator('h3')).toHaveText('Онлайн-участие');
      await expect(online.locator('.tariff-bottom strong')).toHaveText('25 000 ₽');
      await expect(welcome.getByRole('link', { name: 'Выбрать тариф' })).toHaveAttribute(
        'href',
        '#tariff-plans',
      );
      await welcome.getByRole('link', { name: 'Выбрать тариф' }).click();
      await expect(page).toHaveURL(/#tariff-plans$/);
    },
  );
}

test('Welcome Pass never automatically applies 50% to ticket form or creates fake tariff', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#tariffs', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#site-preloader')).toHaveCount(0, { timeout: 20000 });
  await page.locator('.welcome-pass__cta').click();
  await page.locator('.tariff--business').getByRole('button', { name: 'Принять участие' }).click();
  const form = page.getByRole('dialog', { name: 'Регистрация' });
  await expect(form).toHaveAttribute('data-tariff-id', 'business');
  await expect(form.locator('.selected-tariff')).toContainText('Деловой');
  await expect(form.locator('.selected-tariff')).not.toContainText('50%');
  await expect(page.locator('#tariff-plans > .tariff')).toHaveCount(5);
});

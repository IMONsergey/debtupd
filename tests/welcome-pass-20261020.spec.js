import { test, expect } from '@playwright/test';

const offer =
  'Скидка 50% на один билет любого тарифа для представителя компании, которая впервые участвует в DEBT TECH.';
const terms = 'Скидка предоставляется по согласованию с организаторами.';

test.beforeEach(async ({ page }) => {
  // Do not deliver test traffic to live Bitrix24 or Telegram.
  await page.route('**/api/lead', (route) =>
    route.fulfill({ status: 503, json: { success: false } }),
  );
  await page.route('https://kinescope.io/**', (route) =>
    route.fulfill({ contentType: 'text/html', body: '<html></html>' }),
  );
});

for (const width of [320, 390, 599, 600, 700, 768, 900, 1024, 1180, 1181, 1440, 1920]) {
  test(
    'compact Welcome Pass aligns with the tariff section at ' + width + 'px',
    async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      const errors = [];
      page.on('pageerror', (error) => errors.push(error.message));

      await page.goto('/#welcome-pass', { waitUntil: 'domcontentloaded' });
      await expect(page.locator('#site-preloader')).toHaveCount(0, { timeout: 20000 });
      const welcome = page.locator('#tariffs #welcome-pass.welcome-pass');
      await expect(welcome).toHaveCount(1);
      await welcome.scrollIntoViewIfNeeded();

      await expect(welcome.getByRole('heading', { name: /Multipass Welcome/i })).toBeVisible();
      await expect(welcome.locator('.welcome-pass__headline')).toHaveText('Multipass');
      await expect(welcome.locator('.welcome-pass__outline')).toHaveText('Welcome');
      await expect(welcome.locator('.welcome-pass__offer')).toHaveText(offer);
      await expect(welcome.locator('.welcome-pass__terms')).toHaveText(terms);

      // No redundant visual, registration CTA, extra pricing or oversized percentage.
      await expect(welcome.locator('img, picture, button, a')).toHaveCount(0);
      await expect(welcome.locator('.welcome-pass__art, .welcome-pass__cta')).toHaveCount(0);
      await expect(page.locator('.tariff-astronaut')).toHaveCount(1);
      await expect(page.locator('.tariffs-heading .tariffs-title')).toBeVisible();

      const geometry = await welcome.evaluate((root) => {
        const block = root.getBoundingClientRect();
        const heading = root.querySelector('.welcome-pass__heading').getBoundingClientRect();
        const panel = root.querySelector('.welcome-pass__panel').getBoundingClientRect();
        const main = root.querySelector('.welcome-pass__offer').getBoundingClientRect();
        const terms = root.querySelector('.welcome-pass__terms').getBoundingClientRect();
        const grid = document.querySelector('#tariff-plans').getBoundingClientRect();
        const columnLayout = window.innerWidth >= 700;
        return {
          withinSection: root.closest('#tariffs') != null,
          beforeCards: block.bottom <= grid.top + 1,
          compact: block.height <= (columnLayout ? 350 : 290),
          panelWithinBlock: panel.left >= block.left - 1 && panel.right <= block.right + 1,
          headingAbovePanel: heading.bottom < panel.top,
          copyWithinPanel:
            main.left >= panel.left &&
            main.right <= panel.right &&
            main.top >= panel.top &&
            main.bottom <= panel.bottom,
          termsWithinPanel:
            terms.left >= panel.left &&
            terms.right <= panel.right &&
            terms.top >= panel.top &&
            terms.bottom <= panel.bottom,
          alignedRows: columnLayout
            ? Math.abs(main.top + main.height / 2 - (terms.top + terms.height / 2)) < 26
            : terms.top >= main.bottom,
          noHorizontalScroll: document.documentElement.scrollWidth <= innerWidth + 2,
        };
      });
      expect(geometry).toEqual({
        withinSection: true,
        beforeCards: true,
        compact: true,
        panelWithinBlock: true,
        headingAbovePanel: true,
        copyWithinPanel: true,
        termsWithinPanel: true,
        alignedRows: true,
        noHorizontalScroll: true,
      });
      const cards = page.locator('#tariff-plans > .tariff');
      await expect(cards).toHaveCount(5);
      await expect(cards.last().locator('.tariff-bottom strong')).toHaveText('25 000 ₽');
      expect(errors).toEqual([]);
    },
  );
}

test('first-time company promotion remains informational and does not alter ticket registration prices', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#welcome-pass', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#site-preloader')).toHaveCount(0, { timeout: 20000 });
  await page.locator('#tariff-plans').scrollIntoViewIfNeeded();
  await page.locator('.tariff--business').getByRole('button', { name: 'Принять участие' }).click();
  const form = page.getByRole('dialog', { name: 'Регистрация' });
  await expect(form).toHaveAttribute('data-tariff-id', 'business');
  await expect(form.locator('.selected-tariff')).toContainText('Деловой');
  await expect(form.locator('.selected-tariff')).not.toContainText('50%');
  await expect(page.locator('#tariff-plans > .tariff')).toHaveCount(5);
});

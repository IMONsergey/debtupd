import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    sessionStorage.setItem('debt2026-early-booking-dismissed', '1');
  });
  await page.route('https://kinescope.io/**', (route) =>
    route.fulfill({ contentType: 'text/html', body: '<html></html>' }),
  );
});

for (const width of [320, 390, 768, 899]) {
  test(
    'Mobile topics carousel supports arrows, swiping and keyboard at ' + width + 'px',
    async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      const pageErrors = [];
      page.on('pageerror', (error) => pageErrors.push(error.message));
      await page.goto('/#topics', { waitUntil: 'domcontentloaded' });
      const track = page.locator('.topics-grid');
      const cards = track.locator('.topic-card');
      const counter = page.locator('.topics-controls > span');
      await expect(cards).toHaveCount(6);
      await expect(page.locator('.topics-controls')).toBeVisible();
      await expect(counter).toContainText('01 / 06');
      const dimensions = await track.evaluate((el) => ({
        scroll: el.scrollWidth,
        client: el.clientWidth,
        display: getComputedStyle(el).display,
      }));
      expect(dimensions.display).toBe('flex');
      expect(dimensions.scroll).toBeGreaterThan(dimensions.client);

      const next = page.getByRole('button', { name: 'Следующая тема' });
      const previous = page.getByRole('button', { name: 'Предыдущая тема' });
      await expect(previous).toBeDisabled();
      await next.click();
      await expect(counter).toContainText('02 / 06');
      await expect
        .poll(() => track.evaluate((el) => el.scrollLeft), { timeout: 6000 })
        .toBeGreaterThan(20);
      await previous.click();
      await expect(counter).toContainText('01 / 06');
      await track.focus();
      await page.keyboard.press('End');
      await expect(counter).toContainText('06 / 06');
      await expect(next).toBeDisabled();
      await page.keyboard.press('Home');
      await expect(counter).toContainText('01 / 06');
      await expect.poll(() => track.evaluate((el) => el.scrollLeft)).toBeLessThan(2);

      // A user can drag/swipe the overflow area without a button.
      await track.evaluate((el) => el.scrollTo({ left: el.scrollWidth, behavior: 'instant' }));
      await expect(counter).toContainText('06 / 06');
      await track.evaluate((el) => el.scrollTo({ left: 0, behavior: 'instant' }));
      await expect(counter).toContainText('01 / 06');
      expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 2)).toBe(
        false,
      );
      expect(pageErrors).toEqual([]);
    },
  );
}

test('Desktop topics remain a static six-card grid', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/#topics', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.topics-grid .topic-card')).toHaveCount(6);
  await expect(page.locator('.topics-controls')).toBeHidden();
  expect(await page.locator('.topics-grid').evaluate((el) => getComputedStyle(el).display)).toBe(
    'grid',
  );
});

test('The seventh conference partner starts at the left on desktop', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/#partners', { waitUntil: 'domcontentloaded' });
  const xs = await page
    .locator('.sponsor-panel--partner')
    .evaluateAll((nodes) => nodes.map((node) => node.getBoundingClientRect().left));
  expect(xs).toHaveLength(7);
  expect(Math.abs(xs[6] - xs[0])).toBeLessThan(2);
});

import { test, expect } from '@playwright/test';
const OPEN_DAY = new Date('2026-09-29T09:00:00+03:00');
test.beforeEach(async ({ page }) => {
  await page.route('**/api/lead', (route) => route.abort('blockedbyclient'));
  await page.route('https://kinescope.io/**', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: '<html><body>Muted video fixture</body></html>',
    }),
  );
});
async function ready(page) {
  await page.goto('/');
  await expect(page.locator('#site-preloader')).toHaveCount(0, { timeout: 12000 });
  await page.evaluate(() => document.fonts.ready);
}
test('Imported preloader blocks interaction until ready and releases it after the real fade', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.locator('#site-preloader')).toBeVisible();
  expect(await page.locator('#root').evaluate((node) => node.inert)).toBe(true);
  await expect(page.locator('#site-preloader')).toHaveCount(0, { timeout: 12000 });
  expect(await page.locator('#root').evaluate((node) => node.inert)).toBe(false);
  expect(
    await page.locator('html').evaluate((node) => node.classList.contains('is-site-loading')),
  ).toBe(false);
  await expect(page.locator('.hero-layer-scene')).toHaveAttribute('data-entered', 'true');
});
test('Hero fallback remains usable when WebGL is unavailable and an image request fails', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      if (type === 'webgl') return null;
      return original.call(this, type, ...args);
    };
  });
  await page.route('**/assets/hero/brand-haze.webp', (route) => route.abort());
  await ready(page);
  await expect(page.locator('.hero-horizon')).toHaveAttribute('data-gl', 'fallback');
  await expect(page.locator('.hero-universe')).toBeVisible();
  expect(await page.locator('#root').evaluate((node) => node.inert)).toBe(false);
});
test('Shader, rotating disk and static crown use the same circle on every viewport', async ({
  page,
}) => {
  await page.addInitScript(() => sessionStorage.setItem('debt2026-early-booking-dismissed', '1'));
  await ready(page);
  for (const [width, height] of [
    [320, 568],
    [390, 844],
    [600, 900],
    [768, 1024],
    [1024, 768],
    [1181, 768],
    [1440, 900],
    [1920, 1080],
    [2560, 1440],
  ]) {
    await page.setViewportSize({ width, height });
    await expect
      .poll(() =>
        page.evaluate(() => {
          const host = document.querySelector('.hero-horizon').getBoundingClientRect();
          const disk = document.querySelector('.hero-planet-orbit').getBoundingClientRect();
          const crown = document.querySelector('.hero-crown-orbit').getBoundingClientRect();
          const canvas = document.querySelector('.hero-horizon canvas');
          if (!canvas.dataset.radius) return 0;
          return Math.max(
            Math.abs(
              Number(canvas.dataset.centerX) * host.width + host.x - (disk.x + disk.width / 2),
            ),
            Math.abs(Number(canvas.dataset.horizonY) * host.height + host.y - disk.y),
            Math.abs(Number(canvas.dataset.radius) * host.width - disk.width / 2),
            Math.abs(crown.x - disk.x),
            Math.abs(crown.y - disk.y),
            Math.abs(crown.width - disk.width),
          );
        }),
      )
      .toBeLessThan(1);
    const hero = await page.locator('.hero').boundingBox();
    expect(hero.height).toBeGreaterThanOrEqual(height - 1);
  }
});
test('Planet rotates continuously while the crown breathes and scroll entrances never lower opacity', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.addInitScript(() => sessionStorage.setItem('debt2026-early-booking-dismissed', '1'));
  await ready(page);
  const first = await page
    .locator('.hero-planet-rotation')
    .evaluate((node) => getComputedStyle(node).transform);
  await page.waitForTimeout(500);
  expect(
    await page
      .locator('.hero-planet-rotation')
      .evaluate((node) => getComputedStyle(node).transform),
  ).not.toBe(first);
  expect(
    await page
      .locator('.hero-planet-crown')
      .evaluate((node) => getComputedStyle(node).animationName),
  ).toBe('hero-crown-breathe');
  await page.locator('.service-grid').scrollIntoViewIfNeeded();
  const samples = await page.locator('.service-grid').evaluate(async (node) => {
    const values = [];
    for (let i = 0; i < 18; i++) {
      await new Promise(requestAnimationFrame);
      values.push(Number(getComputedStyle(node).opacity));
    }
    return values;
  });
  expect(samples.every((value) => value === 1)).toBe(true);
  await expect(page.locator('.motion-toggle')).toHaveCount(0);
});
test('The booking offer appears after its delay, traps focus and leads to tariffs', async ({
  page,
}) => {
  await page.clock.install({ time: OPEN_DAY });
  await ready(page);
  await expect(page.locator('.ticket-offer-modal')).toHaveCount(0);
  await page.clock.fastForward(15000);
  const dialog = page.getByRole('dialog', { name: '«Вселенная технологий»' });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('до 01 октября');
  await page.keyboard.press('Shift+Tab');
  expect(await dialog.evaluate((node) => node.contains(document.activeElement))).toBe(true);
  await dialog.getByRole('button', { name: 'Купить билет' }).click();
  await expect(dialog).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => location.hash)).toBe('#tariff-plans');
  expect(await page.locator('#page-content').evaluate((node) => node.inert)).toBe(false);
  await page.clock.fastForward(20000);
  await expect(dialog).toHaveCount(0);
});
test('The timed offer waits for an active application dialog and closes on Escape', async ({
  page,
}) => {
  await page.clock.install({ time: OPEN_DAY });
  await ready(page);
  await page.locator('.tariff--business').getByRole('button', { name: 'Принять участие' }).click();
  await page.clock.fastForward(15000);
  await expect(page.locator('.ticket-offer-modal')).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(page.locator('.ticket-offer-modal')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('.ticket-offer-modal')).toHaveCount(0);
  expect(
    await page.evaluate(() => sessionStorage.getItem('debt2026-early-booking-dismissed')),
  ).toBe('1');
});
test('Expired early-booking offer is not shown', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-02T09:00:00+03:00') });
  await ready(page);
  await page.clock.fastForward(18000);
  await expect(page.locator('.ticket-offer-modal')).toHaveCount(0);
});
test('Organizer phone and email remain on one row without escaped accessible labels', async ({
  page,
}) => {
  await page.addInitScript(() => sessionStorage.setItem('debt2026-early-booking-dismissed', '1'));
  await ready(page);
  for (const width of [320, 390, 600, 768, 900, 1181, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    const row = await page
      .locator('.organizer-contact__primary a')
      .evaluateAll((nodes) => nodes.map((node) => node.getBoundingClientRect().top));
    expect(Math.abs(row[0] - row[1]), `Contacts at ${width}px`).toBeLessThan(1);
  }
  expect(await page.locator('.about-photo img').getAttribute('alt')).not.toContain('\\u');
});
test('Booking banner fits a 320px screen and preserves spaces around emphasized copy', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.clock.install({ time: OPEN_DAY });
  await ready(page);
  await page.clock.fastForward(15000);
  const dialog = page.locator('.ticket-offer-modal__dialog');
  await expect(dialog).toBeVisible();
  const geometry = await dialog.evaluate((node) => ({
    width: node.clientWidth,
    scrollWidth: node.scrollWidth,
    height: node.clientHeight,
  }));
  expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.width + 1);
  expect(geometry.height).toBeLessThanOrEqual(544);
  expect(await page.locator('#ticket-offer-description').textContent()).toMatch(/скидкой\s+до/);
});

test('Narrow headings fit with a classic reserved scrollbar, not only overlay scrollbars', async ({
  page,
}) => {
  await page.addInitScript(() => sessionStorage.setItem('debt2026-early-booking-dismissed', '1'));
  await ready(page);
  await page.addStyleTag({
    content: 'html{overflow-y:scroll;scrollbar-gutter:stable}::-webkit-scrollbar{width:15px}',
  });
  for (const width of [320, 360, 390, 600, 768]) {
    await page.setViewportSize({ width, height: 900 });
    const clipped = await page.locator('main h2').evaluateAll((nodes) =>
      nodes
        .filter((node) => node.clientWidth && node.scrollWidth > node.clientWidth + 2)
        .map((node) => ({
          text: node.textContent,
          available: node.clientWidth,
          actual: node.scrollWidth,
        })),
    );
    expect(clipped, `Reserved-scrollbar headings at ${width}px`).toEqual([]);
  }
});

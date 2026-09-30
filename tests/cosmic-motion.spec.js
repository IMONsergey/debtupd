import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem('debt2026-early-booking-dismissed', '1'));
  await page.route('https://kinescope.io/**', (route) =>
    route.fulfill({ contentType: 'text/html', body: '<html style="background:#03091b"></html>' }),
  );
  await page.route('**/api/lead', (route) => route.abort());
});
async function ready(page) {
  await page.goto('/');
  await expect(page.locator('#site-preloader')).toHaveCount(0, { timeout: 12000 });
  await page.evaluate(() => document.fonts.ready);
}
async function position(page, selector) {
  await page
    .locator(selector)
    .evaluate((node) =>
      scrollTo({ top: node.getBoundingClientRect().top + scrollY - 80, behavior: 'instant' }),
    );
  await page.waitForTimeout(250);
}

test('All thirteen client tags wrap in place; the single facts ticker is inside About', async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await ready(page);
  await expect(page.locator('.ticker')).toHaveCount(1);
  await expect(page.locator('#about-forum .forum-ticker')).toContainText('800+ делегатов');
  await expect(page.locator('.technology-tags li')).toHaveCount(13);
  for (const [width, height] of [
    [320, 568],
    [390, 844],
    [768, 1024],
    [1440, 900],
    [2560, 1440],
  ]) {
    await page.setViewportSize({ width, height });
    await position(page, '.technology-tags');
    const layout = await page.locator('.technology-tags').evaluate((node) => {
      const box = node.getBoundingClientRect();
      return {
        static: [node, ...node.children].every((n) => getComputedStyle(n).animationName === 'none'),
        contained: [...node.children].every((n) => {
          const r = n.getBoundingClientRect();
          return r.left >= box.left - 1 && r.right <= box.right + 1 && r.bottom <= box.bottom + 1;
        }),
        overflow: document.documentElement.scrollWidth > innerWidth,
      };
    });
    expect(layout).toEqual({ static: true, contained: true, overflow: false });
    if (width === 390 || width === 1440)
      await page.screenshot({ path: testInfo.outputPath(`tags-${width}.png`) });
  }
  expect(errors).toEqual([]);
});

test('Artwork floats only while visible and stops for page suspension', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await ready(page);
  const art = page.locator('.about-satellite');
  await position(page, '.about-satellite');
  await expect(art).toHaveAttribute('data-ambient', 'active');
  await expect
    .poll(() => art.evaluate((node) => getComputedStyle(node).animationPlayState))
    .toBe('running');
  const before = await art.evaluate((node) => getComputedStyle(node).translate);
  // Software GPU startup varies on CI. Verify observed movement, not a 450 ms deadline.
  await expect
    .poll(() => art.evaluate((node) => getComputedStyle(node).translate), { timeout: 8000 })
    .not.toBe(before);
  await page.evaluate(() =>
    dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true })),
  );
  await expect(art).toHaveAttribute('data-ambient', 'paused');
  await expect
    .poll(() => art.evaluate((node) => getComputedStyle(node).animationPlayState))
    .toBe('paused');
  const paused = await art.evaluate((node) => getComputedStyle(node).translate);
  await page.waitForTimeout(150);
  expect(await art.evaluate((node) => getComputedStyle(node).translate)).toBe(paused);
  await page.evaluate(() =>
    dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })),
  );
  await expect(art).toHaveAttribute('data-ambient', 'active');
  await position(page, '#contacts');
  await expect(art).toHaveAttribute('data-ambient', 'paused');
});

test('Dialogs suspend ambient motion and reduced motion reveals every ticker item without clipping', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.setViewportSize({ width: 390, height: 844 });
  await ready(page);
  await page.locator('.hero-stand').click();
  await expect(page.getByRole('dialog')).toBeVisible();
  expect(await page.locator('[data-ambient="active"]').count()).toBe(0);
  await page.keyboard.press('Escape');
  await position(page, '.about-satellite');
  await expect(page.locator('.about-satellite')).toHaveAttribute('data-ambient', 'active');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('.about-satellite')).toHaveAttribute('data-ambient', 'paused');
  expect(
    await page.locator('.about-satellite').evaluate((node) => getComputedStyle(node).animationName),
  ).toBe('none');
  await position(page, '.forum-ticker');
  const facts = await page.locator('.forum-ticker').evaluate((node) => {
    const box = node.getBoundingClientRect();
    const copy = node.querySelector('.ticker-copy');
    return {
      wrapped: [...copy.children].every((n) => n.getBoundingClientRect().right <= box.right + 1),
      duplicateHidden:
        getComputedStyle(node.querySelector('[aria-hidden="true"]')).display === 'none',
      moving: getComputedStyle(node.querySelector('.ticker-track')).animationName !== 'none',
    };
  });
  expect(facts).toEqual({ wrapped: true, duplicateHidden: true, moving: false });
});

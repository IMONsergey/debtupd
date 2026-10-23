import { test, expect } from '@playwright/test';

test.use({
  hasTouch: true,
  isMobile: true,
  viewport: { width: 390, height: 844 },
});

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.route('https://kinescope.io/**', (route) =>
    route.fulfill({ status: 200, contentType: 'text/html', body: '<html></html>' }));
  await page.route('**/api/lead', (route) => route.abort());
  await page.goto('/#speakers', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#site-preloader')).toHaveCount(0, { timeout: 35000 });
  const track = page.locator('.speakers-grid');
  await track.scrollIntoViewIfNeeded();
  await page.waitForTimeout(350);
});

for (const width of [320, 390, 768]) {
  test('slow uninterrupted mobile marquee at ' + width + 'px, with no full-card jumps', async ({ page }) => {
    await page.setViewportSize({ width, height: 850 });
    const samples = await page.locator('.speakers-grid').evaluate((node) => new Promise((resolve) => {
      const samples = [];
      const begin = performance.now();
      const sample = (now) => {
        samples.push({ ms: now - begin, x: node.scrollLeft });
        if (now - begin < 4700) requestAnimationFrame(sample);
        else resolve(samples);
      };
      requestAnimationFrame(sample);
    }));
    const starts = samples[0].x;
    const deltas = samples.slice(1).map((value, i) => value.x - samples[i].x);
    const traveled = samples.at(-1).x - starts;
    const movingFrames = deltas.filter((delta) => delta > 0.05).length;
    expect(traveled).toBeGreaterThan(54);
    expect(traveled).toBeLessThan(145);
    expect(movingFrames).toBeGreaterThan(25);
    expect(Math.max(...deltas)).toBeLessThan(8);
    expect(Math.min(...deltas)).toBeGreaterThan(-3);
    expect(await page.locator('.speakers-grid').evaluate((node) => getComputedStyle(node).scrollSnapType))
      .toBe('none');
  });
}

test('tapping does not permanently freeze the marquee on iPhone', async ({ page }) => {
  const track = page.locator('.speakers-grid');
  await track.tap();
  const before = await track.evaluate((node) => node.scrollLeft);
  await page.waitForTimeout(1500);
  expect(Math.abs((await track.evaluate((node) => node.scrollLeft)) - before)).toBeLessThan(3);
  await expect.poll(async () => await track.evaluate((node) => node.scrollLeft),
    { timeout: 7500, intervals: [300] }).toBeGreaterThan(before + 15);
  const state = await track.evaluate((node) => ({
    focused: document.activeElement === node,
    keyboardFocus: node.matches(':focus-visible'),
  }));
  // Touch focus can persist, but only keyboard focus-visible pauses autoplay.
  if (state.focused) expect(state.keyboardFocus).toBe(false);
});

test('swipe gives the user full control, then resumes from their exact position', async ({ page }) => {
  const track = page.locator('.speakers-grid');
  await track.dispatchEvent('pointerdown', { pointerType: 'touch', pointerId: 5 });
  await track.evaluate((node) => { node.scrollLeft = 230; });
  await page.waitForTimeout(550);
  const held = await track.evaluate((node) => node.scrollLeft);
  expect(Math.abs(held - 230)).toBeLessThan(4);
  await track.dispatchEvent('pointerup', { pointerType: 'touch', pointerId: 5 });
  await page.waitForTimeout(2100);
  const paused = await track.evaluate((node) => node.scrollLeft);
  expect(Math.abs(paused - held)).toBeLessThan(4);
  await expect.poll(async () => await track.evaluate((node) => node.scrollLeft),
    { timeout: 7300, intervals: [300] }).toBeGreaterThan(held + 22);
});

test('continuous marquee reverses gently at the end instead of jumping to the first card', async ({ page }) => {
  const track = page.locator('.speakers-grid');
  await track.evaluate((node) => {
    node.scrollLeft = node.scrollWidth - node.clientWidth - 12;
  });
  const positions = await track.evaluate((node) => new Promise((resolve) => {
    const pos = [];
    const start = performance.now();
    const sample = (t) => {
      pos.push(node.scrollLeft);
      if (t - start < 3200) requestAnimationFrame(sample);
      else resolve(pos);
    };
    requestAnimationFrame(sample);
  }));
  const deltas = positions.slice(1).map((x, i) => x - positions[i]);
  expect(Math.max(...deltas)).toBeLessThan(8);
  expect(Math.min(...deltas)).toBeGreaterThan(-8);
  expect(positions.at(-1)).toBeLessThan(positions[0] - 15);
});

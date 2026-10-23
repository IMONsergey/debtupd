import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.route('https://kinescope.io/**', (route) =>
    route.fulfill({ status: 200, contentType: 'text/html', body: '<html></html>' }));
  await page.route('**/api/lead', (route) => route.abort());
  await page.emulateMedia({ reducedMotion: 'no-preference' });
});

for (const width of [320, 390, 768]) {
  test('mobile speaker transition is smooth with no jumps at ' + width + 'px', async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/#speakers', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#site-preloader')).toHaveCount(0, { timeout: 30000 });
    const track = page.locator('.speakers-grid');
    await track.scrollIntoViewIfNeeded();
    await page.mouse.move(0, 0);
    const movement = await track.evaluate(async (node) => {
      const samples = [];
      const start = performance.now();
      return await new Promise((resolve) => {
        const sample = (now) => {
          samples.push({ at: now - start, x: node.scrollLeft });
          if (now - start < 5400) requestAnimationFrame(sample);
          else resolve({
            samples,
            cardWidth: node.firstElementChild.getBoundingClientRect().width,
            snap: getComputedStyle(node).scrollSnapType,
          });
        };
        requestAnimationFrame(sample);
      });
    });
    expect(movement.snap).toBe('none');
    const records = movement.samples;
    const difference = records.at(-1).x - records[0].x;
    expect(difference).toBeGreaterThan(48);
    const deltas = records.slice(1).map((entry, i) => entry.x - records[i].x);
    expect(Math.max(...deltas)).toBeLessThan(movement.cardWidth * .33);
    expect(Math.min(...deltas)).toBeGreaterThan(-3);
    expect(deltas.filter((delta) => delta > .1).length).toBeGreaterThan(8);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth))
      .toBeLessThanOrEqual(2);
  });
}

test('touch gesture pauses autoplay and height-only resize never snaps backward', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto('/#speakers', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#site-preloader')).toHaveCount(0, { timeout: 30000 });
  const track = page.locator('.speakers-grid');
  await track.scrollIntoViewIfNeeded();
  await page.mouse.move(0, 0);
  await track.dispatchEvent('pointerdown', { pointerType: 'touch', pointerId: 8 });
  await track.evaluate((node) => { node.scrollLeft = 151; });
  await track.locator('.speaker').first().evaluate((card) => { card.style.minHeight = '560px'; });
  await page.waitForTimeout(350);
  const stable = await track.evaluate((node) => node.scrollLeft);
  expect(Math.abs(stable - 151)).toBeLessThan(5);
  await track.dispatchEvent('pointerup', { pointerType: 'touch', pointerId: 8 });
  const released = await track.evaluate((node) => node.scrollLeft);
  await page.waitForTimeout(1800);
  expect(Math.abs((await track.evaluate((node) => node.scrollLeft)) - released)).toBeLessThan(5);
  await expect.poll(async () => await track.evaluate((node) => node.scrollLeft),
    { timeout: 8500, intervals: [500] }).toBeGreaterThan(released + 30);
});

test('reduced motion disables autoplay, but manual arrow navigation stays functional', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto('/#speakers', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#site-preloader')).toHaveCount(0, { timeout: 30000 });
  const track = page.locator('.speakers-grid');
  await track.scrollIntoViewIfNeeded();
  const before = await track.evaluate((node) => node.scrollLeft);
  await page.waitForTimeout(3600);
  expect(Math.abs((await track.evaluate((node) => node.scrollLeft)) - before)).toBeLessThan(2);
  await page.getByRole('button', { name: 'Следующий слайд' }).click();
  await expect(page.locator('.speakers-controls > span')).toContainText('02');
  await expect.poll(() => track.evaluate((node) => node.scrollLeft),
    { timeout: 4000 }).toBeGreaterThan(before + 30);
});

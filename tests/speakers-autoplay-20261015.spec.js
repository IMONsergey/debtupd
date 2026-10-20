import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem('debt2026-early-booking-dismissed', '1'));
  await page.route('**/api/lead', route => route.abort());
});

const position = (track) => track.evaluate(node => node.scrollLeft);

for (const width of [390, 768, 1440]) {
  test(`speaker carousel moves on its own without a pause button at ${width}px`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/#speakers');
    await expect(page.locator('#site-preloader')).toHaveCount(0, { timeout: 15000 });
    const track = page.locator('.speakers-grid');
    await track.scrollIntoViewIfNeeded();
    await page.mouse.move(0, 0);

    const start = await position(track);
    await expect.poll(async () => (await position(track)) - start, { timeout: 5000, intervals: [500] }).toBeGreaterThan(48);

    await expect(page.locator('.speakers-controls .ui-icon-button')).toHaveCount(2);
    await expect(page.locator('.speakers-controls .speaker-autoplay-toggle')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Остановить автопрокрутку спикеров' })).toHaveCount(0);
    const previousAt = await position(track);
    await expect.poll(async () => (await position(track)) - previousAt, { timeout: 5000, intervals: [500] }).toBeGreaterThan(40);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width + 2);
  });
}

test('mouse hover pauses, mouse leave resumes; manual navigation remains precise', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/#speakers');
  const track = page.locator('.speakers-grid');
  await track.scrollIntoViewIfNeeded();
  await page.mouse.move(0, 0);
  await expect.poll(() => position(track)).toBeGreaterThan(40);

  const box = await track.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + Math.min(box.height / 2, 190));
  const atHover = await position(track);
  await page.waitForTimeout(700);
  expect(Math.abs((await position(track)) - atHover)).toBeLessThan(2);

  await page.mouse.move(0, 0);
  const afterLeave = await position(track);
  await expect.poll(async () => (await position(track)) - afterLeave, { timeout: 5000 }).toBeGreaterThan(35);

  await page.getByRole('button', { name: 'Следующий слайд' }).click();
  await expect(page.locator('.speakers-controls > span')).toContainText('02');
  // The manual move uses a smooth animation; measure after it has settled.
  await expect.poll(() => track.evaluate((node) => {
    const target = node.children[3].offsetLeft - node.firstElementChild.offsetLeft;
    return Math.abs(node.scrollLeft - target);
  }), { timeout: 3000 }).toBeLessThan(3);
  const snapped = await position(track);
  await page.waitForTimeout(600);
  expect(Math.abs((await position(track)) - snapped)).toBeLessThan(5);
  await page.getByRole('button', { name: 'Показать всех спикеров' }).click();
  await expect(page.locator('.speaker-collection')).toHaveClass(/is-expanded/);
  await expect(track.locator('.speaker')).toHaveCount(35);
  const expandedScroll = await position(track);
  await page.waitForTimeout(800);
  expect(Math.abs((await position(track)) - expandedScroll)).toBeLessThan(2);
});

test('reduced motion preference suppresses automatic movement', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto('/#speakers');
  const track = page.locator('.speakers-grid');
  await track.scrollIntoViewIfNeeded();
  await page.mouse.move(0, 0);
  const start = await position(track);
  await page.waitForTimeout(1100);
  expect(Math.abs((await position(track)) - start)).toBeLessThan(2);
  await page.getByRole('button', { name: 'Следующий слайд' }).click();
  await expect(page.locator('.speakers-controls > span')).toContainText('02');
});

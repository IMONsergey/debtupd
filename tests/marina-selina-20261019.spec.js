import { test, expect } from '@playwright/test';

const name = 'Марина Селина';
const role = 'Начальник управления анализа коммерческой задолженности и стандартизации казначейских функций, Казначейство, Горьковский автомобильный завод';
const filename = 'speaker-marina-selina.webp';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem('debt2026-early-booking-dismissed', '1'));
  await page.route('**/api/lead', route => route.abort());
  await page.route('https://kinescope.io/**', route =>
    route.fulfill({ contentType: 'text/html', body: '<html></html>' }),
  );
});

for (const [width, pages] of [[320, 35], [390, 35], [768, 18], [1024, 12], [1440, 12]]) {
  test('Marina Selina photo, title and final slide work at ' + width + 'px', async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('/#speakers', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#site-preloader')).toHaveCount(0, { timeout: 20000 });
    const track = page.locator('.speakers-grid');
    const cards = track.locator('.speaker');
    await expect(cards).toHaveCount(35);
    await expect(cards.first().locator('.speaker-portrait img')).toHaveAttribute('alt', 'Владимир Вербицкий');
    await expect(cards.nth(31).locator('.speaker-portrait img')).toHaveAttribute('alt', 'Евгений Коротков');
    const card = cards.nth(32);
    await expect(card).toHaveAttribute('aria-label', '33 из 35: ' + name);
    await expect(card.locator('h3')).toContainText('Марина');
    await expect(card.locator('h3')).toContainText('Селина');
    await expect(card.locator('.speaker-info p')).toHaveText(role);
    const portrait = card.locator('.speaker-portrait img');
    await expect(portrait).toHaveAttribute('alt', name);
    expect((await portrait.getAttribute('src')).endsWith('/assets/figma/' + filename)).toBe(true);
    await portrait.scrollIntoViewIfNeeded();
    await expect.poll(() => portrait.evaluate(img =>
      img.complete && img.naturalWidth === 714 && img.naturalHeight === 584
    ), { timeout: 15000 }).toBe(true);
    const overflow = await card.evaluate(node => {
      const name = node.querySelector('h3');
      const p = node.querySelector('.speaker-info p');
      const info = node.querySelector('.speaker-info');
      return {
        name: name.scrollWidth > name.clientWidth + 2 || name.scrollHeight > name.clientHeight + 2,
        role: p.scrollWidth > p.clientWidth + 2 || p.scrollHeight > p.clientHeight + 2,
        info: info.scrollHeight > info.clientHeight + 2,
      };
    });
    expect(overflow).toEqual({ name: false, role: false, info: false });
    await track.focus();
    await page.keyboard.press('End');
    await expect(page.locator('.speakers-controls > span')).toHaveText(
      new RegExp(String(pages).padStart(2, '0') + '\\s*/\\s*' + String(pages).padStart(2, '0')),
    );
    await expect(cards.last()).toBeInViewport({ ratio: 0.5 });
    await expect(page.getByRole('button', { name: 'Следующий слайд' })).toBeDisabled();
    await expect(page.locator('.speaker-autoplay-toggle')).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width + 2);
    expect(errors).toEqual([]);
  });
}

test('Marina Selina and all 34 others appear in full roster without clipping', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto('/#speakers', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#site-preloader')).toHaveCount(0, { timeout: 20000 });
  await page.getByRole('button', { name: 'Показать всех спикеров' }).click();
  const cards = page.locator('.speakers-grid .speaker');
  await expect(cards).toHaveCount(35);
  await expect(page.locator('.speaker-collection')).toHaveClass(/is-expanded/);
  await cards.nth(32).scrollIntoViewIfNeeded();
  await expect(cards.nth(32).locator('.speaker-info p')).toHaveText(role);
  const issues = await cards.nth(32).evaluate(node => {
    const h3 = node.querySelector('h3'), p = node.querySelector('.speaker-info p');
    return { name: h3.scrollHeight > h3.clientHeight + 2, role: p.scrollHeight > p.clientHeight + 2 };
  });
  expect(issues).toEqual({ name: false, role: false });
});

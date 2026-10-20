import { test, expect } from '@playwright/test';

const additions = [
  ['Дмитрий Ломакин', 'Директор по развитию бизнеса «Инфолоджистикс»', 'speaker-dmitriy-lomakin.webp'],
  ['Павел Соболев', 'Коммерческий директор «iDSystems»', 'speaker-pavel-sobolev.webp'],
];

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem('debt2026-early-booking-dismissed', '1'));
  await page.route('**/api/lead', route => route.abort());
  await page.route('https://kinescope.io/**', route =>
    route.fulfill({ contentType: 'text/html', body: '<html></html>' }),
  );
});

for (const [width, pages] of [[320, 35], [390, 35], [768, 18], [1024, 12], [1440, 12]]) {
  test('two new speakers retain original portraits, titles and final navigation at ' + width + 'px', async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('/#speakers', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#site-preloader')).toHaveCount(0, { timeout: 20000 });

    const track = page.locator('.speakers-grid');
    const cards = track.locator('.speaker');
    await expect(cards).toHaveCount(35);
    await expect(cards.first().locator('.speaker-portrait img')).toHaveAttribute('alt', 'Владимир Вербицкий');
    await expect(cards.nth(32).locator('.speaker-portrait img')).toHaveAttribute('alt', 'Марина Селина');
    await expect(page.locator('.speakers-controls > span')).toHaveText(
      new RegExp('01\\s*/\\s*' + String(pages).padStart(2, '0')),
    );

    for (const [index, [name, role, file]] of additions.entries()) {
      const card = cards.nth(33 + index);
      await expect(card).toHaveAttribute('aria-label', (34 + index) + ' из 35: ' + name);
      const portrait = card.locator('.speaker-portrait img');
      await expect(portrait).toHaveAttribute('alt', name);
      expect((await portrait.getAttribute('src')).endsWith('/assets/figma/' + file)).toBe(true);
      await expect(card.locator('h3')).toContainText(name.split(' ')[0]);
      await expect(card.locator('h3')).toContainText(name.split(' ')[1]);
      await expect(card.locator('.speaker-info p')).toHaveText(role);
      await portrait.scrollIntoViewIfNeeded();
      await expect.poll(
        () => portrait.evaluate(img => img.complete && img.naturalWidth === 357 && img.naturalHeight === 292),
        { timeout: 15000 },
      ).toBe(true);
      const layout = await card.evaluate(node => {
        const title = node.querySelector('h3'), description = node.querySelector('.speaker-info p');
        const info = node.querySelector('.speaker-info');
        return {
          titleClipped: title.scrollHeight > title.clientHeight + 2 || title.scrollWidth > title.clientWidth + 2,
          descriptionClipped: description.scrollHeight > description.clientHeight + 2 || description.scrollWidth > description.clientWidth + 2,
          cardClipped: info.scrollHeight > info.clientHeight + 2,
        };
      });
      expect(layout).toEqual({
        titleClipped: false,
        descriptionClipped: false,
        cardClipped: false,
      });
    }

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

test('expanded view shows all 35 speakers without clipping the two newest cards', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto('/#speakers', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#site-preloader')).toHaveCount(0, { timeout: 20000 });
  await page.getByRole('button', { name: 'Показать всех спикеров' }).click();
  await expect(page.locator('.speaker-collection')).toHaveClass(/is-expanded/);
  const cards = page.locator('.speakers-grid .speaker');
  await expect(cards).toHaveCount(35);
  const latest = cards.nth(33);
  await latest.scrollIntoViewIfNeeded();
  const last = cards.last();
  await last.scrollIntoViewIfNeeded();
  await expect(last.locator('.speaker-info p')).toHaveText('Коммерческий директор «iDSystems»');
  const layouts = await cards.evaluateAll(nodes => nodes.slice(33).map(card => {
    const title = card.querySelector('h3'), description = card.querySelector('.speaker-info p');
    const info = card.querySelector('.speaker-info');
    return {
      titleClipped: title.scrollHeight > title.clientHeight + 2,
      descriptionClipped: description.scrollHeight > description.clientHeight + 2,
      infoClipped: info.scrollHeight > info.clientHeight + 2,
    };
  }));
  expect(layouts).toHaveLength(2);
  expect(layouts.every(layout => Object.values(layout).every(value => !value))).toBe(true);
});

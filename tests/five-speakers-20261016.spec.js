import { test, expect } from '@playwright/test';

const additions = [
  ['Евгений Дородников', 'Генеральный директор ООО «Автослед ЕМ групп»', 'speaker-evgeniy-dorodnikov.webp'],
  ['Виктор Кислицын', 'Руководитель коммерческого департамента i-Digital', 'speaker-viktor-kislitsyn.webp'],
  ['Константин Юрьев', 'Генеральный директор АО «Агредатор»', 'speaker-konstantin-yuriev.webp'],
  ['Василий Епифанов', 'Руководитель Дирекции дистанционного урегулирования «Альфа-банка»', 'speaker-vasiliy-epifanov.webp'],
  ['Александр Митрохин', 'Руководитель развития процессов урегулирования «Альфа-банка»', 'speaker-aleksandr-mitrokhin.webp'],
];
const counts = new Map([[320, 32], [390, 32], [768, 16], [1024, 11], [1440, 11]]);

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem('debt2026-early-booking-dismissed', '1'));
  await page.route('**/api/lead', route => route.abort());
  await page.route('https://kinescope.io/**', route => route.fulfill({ contentType: 'text/html', body: '<html></html>' }));
});

for (const [width, pageCount] of counts) {
  test('five new speakers, original portraits and pagination at ' + width + 'px', async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));
    await page.goto('/#speakers', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#site-preloader')).toHaveCount(0, { timeout: 20000 });
    const track = page.locator('.speakers-grid');
    const cards = track.locator('.speaker');
    await expect(cards).toHaveCount(32);
    await expect(page.locator('.speakers-controls > span')).toHaveText(
      new RegExp('01\\s*/\\s*' + String(pageCount).padStart(2, '0')),
    );
    expect(await cards.evaluateAll(nodes => nodes.map(node => node.querySelector('img')?.alt))).toEqual(
      expect.arrayContaining(additions.map(([name]) => name)),
    );

    for (const [i, [name, role, filename]] of additions.entries()) {
      const card = cards.nth(24 + i);
      await expect(card.locator('.speaker-portrait img')).toHaveAttribute('alt', name);
      await expect(card.locator('h3')).toContainText(name.split(' ')[0]);
      await expect(card.locator('h3')).toContainText(name.split(' ')[1]);
      await expect(card.locator('.speaker-info p')).toHaveText(role);
      await expect(card).toHaveAttribute('aria-label', (25 + i) + ' из 32: ' + name);
      const image = card.locator('.speaker-portrait img');
      await expect(image).toHaveAttribute('src', new RegExp(filename.replaceAll('.', '\\.')));
      const url = new URL(await image.getAttribute('src'), page.url()).href;
      const response = await page.request.get(url);
      expect(response.ok(), filename).toBe(true);
      expect(response.headers()['content-type']).toContain('image/webp');
    }

    await expect(page.locator('.speaker-autoplay-toggle')).toHaveCount(0);
    await expect(page.locator('.speakers-controls .ui-icon-button')).toHaveCount(2);
    await track.focus();
    await page.keyboard.press('End');
    await expect(page.locator('.speakers-controls > span')).toHaveText(
      new RegExp(String(pageCount).padStart(2, '0') + '\\s*/\\s*' + String(pageCount).padStart(2, '0')),
    );
    await expect(cards.last()).toBeInViewport({ ratio: 0.5 });
    await expect(page.getByRole('button', { name: 'Следующий слайд' })).toBeDisabled();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width + 2);
    expect(errors).toEqual([]);
  });
}

test('expanded list shows 32 speakers, all five new portraits without layout clipping', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto('/#speakers');
  await expect(page.locator('#site-preloader')).toHaveCount(0, { timeout: 20000 });
  await page.getByRole('button', { name: 'Показать всех спикеров' }).click();
  await expect(page.locator('.speaker-collection')).toHaveClass(/is-expanded/);
  await expect(page.locator('.speakers-grid .speaker')).toHaveCount(32);
  const newCards = page.locator('.speakers-grid .speaker').nth(24);
  await newCards.scrollIntoViewIfNeeded();
  const overflow = await page.locator('.speakers-grid .speaker').evaluateAll(nodes =>
    nodes.slice(24).map(node => {
      const info = node.querySelector('.speaker-info');
      return { name: node.querySelector('h3')?.textContent, overflow: info.scrollHeight > info.clientHeight + 2 };
    }),
  );
  expect(overflow.every(({ overflow }) => !overflow)).toBe(true);
});

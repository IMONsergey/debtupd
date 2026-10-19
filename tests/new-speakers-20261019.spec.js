import { test, expect } from '@playwright/test';

const additions = [
  ['Екатерина Данкина', 'Директор по развитию портала «Торги России»', 'speaker-ekaterina-dankina.webp'],
  ['Глеб Лябушев', 'Заместитель генерального директора ПКО «А.Сторм»', 'speaker-gleb-lyabushev.webp'],
  ['Евгений Коротков', 'Финансовый директор ООО «ЭВЕРЕСТ ПЛЮС»', 'speaker-evgeniy-korotkov.webp'],
];

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem('debt2026-early-booking-dismissed', '1'));
  // UI smoke only; never deliver test leads to production.
  await page.route('**/api/lead', route => route.abort());
  await page.route('https://kinescope.io/**', route =>
    route.fulfill({ contentType: 'text/html', body: '<html></html>' }),
  );
});

for (const [width, pages] of [[320, 32], [390, 32], [768, 16], [1024, 11], [1440, 11]]) {
  test('the three speakers have correctly paired portraits and roles at ' + width + 'px', async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('/#speakers', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#site-preloader')).toHaveCount(0, { timeout: 20000 });

    const track = page.locator('.speakers-grid');
    const cards = track.locator('.speaker');
    await expect(cards).toHaveCount(32);
    await expect(page.locator('.speakers-controls > span')).toHaveText(
      new RegExp('01\\s*/\\s*' + String(pages).padStart(2, '0')),
    );
    // Previously approved roster is unchanged.
    await expect(cards.first().locator('.speaker-portrait img')).toHaveAttribute('alt', 'Владимир Вербицкий');
    await expect(cards.nth(28).locator('.speaker-portrait img')).toHaveAttribute('alt', 'Александр Митрохин');

    for (const [i, [name, role, file]] of additions.entries()) {
      const card = cards.nth(29 + i);
      await expect(card).toHaveAttribute('aria-label', (30 + i) + ' из 32: ' + name);
      const portrait = card.locator('.speaker-portrait img');
      await expect(portrait).toHaveAttribute('alt', name);
      expect((await portrait.getAttribute('src')).endsWith('/assets/figma/' + file)).toBe(true);
      await expect(card.locator('h3')).toContainText(name.split(' ')[0]);
      await expect(card.locator('h3')).toContainText(name.split(' ')[1]);
      await expect(card.locator('.speaker-info p')).toHaveText(role);
      await portrait.scrollIntoViewIfNeeded();
      await expect.poll(
        () => portrait.evaluate(img => img.complete && img.naturalWidth === 714 && img.naturalHeight === 584),
        { timeout: 15000 },
      ).toBe(true);
    }

    await expect(page.locator('.speaker-autoplay-toggle')).toHaveCount(0);
    await expect(page.locator('.speakers-controls .ui-icon-button')).toHaveCount(2);
    await track.focus();
    await page.keyboard.press('End');
    await expect(page.locator('.speakers-controls > span')).toHaveText(
      new RegExp(String(pages).padStart(2, '0') + '\\s*/\\s*' + String(pages).padStart(2, '0')),
    );
    await expect(cards.last()).toBeInViewport({ ratio: 0.5 });
    await expect(page.getByRole('button', { name: 'Следующий слайд' })).toBeDisabled();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width + 2);
    expect(errors).toEqual([]);
  });
}

test('expanded roster displays all 32 names with unclipped new titles and roles', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto('/#speakers', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#site-preloader')).toHaveCount(0, { timeout: 20000 });
  await page.getByRole('button', { name: 'Показать всех спикеров' }).click();
  const track = page.locator('.speakers-grid');
  await expect(page.locator('.speaker-collection')).toHaveClass(/is-expanded/);
  await expect(track.locator('.speaker')).toHaveCount(32);

  const geometry = await track.locator('.speaker').evaluateAll(cards => cards.slice(29).map(card => {
    const name = card.querySelector('h3');
    const role = card.querySelector('.speaker-info p');
    const info = card.querySelector('.speaker-info');
    return {
      name: name.innerText.trim(),
      clippedName: name.scrollWidth > name.clientWidth + 2 || name.scrollHeight > name.clientHeight + 2,
      clippedRole: role.scrollWidth > role.clientWidth + 2 || role.scrollHeight > role.clientHeight + 2,
      clippedCard: info.scrollHeight > info.clientHeight + 2,
    };
  }));
  expect(geometry).toHaveLength(3);
  expect(geometry.every(({ clippedName, clippedRole, clippedCard }) =>
    !clippedName && !clippedRole && !clippedCard)).toBe(true);
  await track.locator('.speaker').last().scrollIntoViewIfNeeded();
  await expect(track.locator('.speaker').last()).toBeVisible();
});

import { test, expect } from '@playwright/test';

const role = 'Заместитель генерального директора в финтех-группе «Свой»';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem('debt2026-early-booking-dismissed', '1'));
  await page.route('**/api/lead', route => route.abort());
  await page.route('https://kinescope.io/**', route =>
    route.fulfill({ contentType: 'text/html', body: '<html></html>' }),
  );
});

for (const width of [320, 390, 768, 1024, 1440]) {
  test('Zanevskiy displays the corrected role without clipping at ' + width + 'px', async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('/#speakers', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#site-preloader')).toHaveCount(0, { timeout: 20000 });

    const cards = page.locator('.speakers-grid .speaker');
    await expect(cards).toHaveCount(33);
    const speaker = cards.nth(10);
    await expect(speaker.locator('.speaker-portrait img')).toHaveAttribute('alt', 'Андрей Заневский');
    await expect(speaker.locator('.speaker-info h3')).toContainText('Заневский');
    await expect(speaker.locator('.speaker-info p')).toHaveText(role);
    await speaker.scrollIntoViewIfNeeded();

    const geometry = await speaker.evaluate(node => {
      const text = node.querySelector('.speaker-info p');
      const info = node.querySelector('.speaker-info');
      const title = node.querySelector('h3');
      return {
        roleClipped: text.scrollWidth > text.clientWidth + 2 || text.scrollHeight > text.clientHeight + 2,
        cardClipped: info.scrollHeight > info.clientHeight + 2,
        titleClipped: title.scrollWidth > title.clientWidth + 2 || title.scrollHeight > title.clientHeight + 2,
      };
    });
    expect(geometry).toEqual({ roleClipped: false, cardClipped: false, titleClipped: false });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width + 2);
    expect(errors).toEqual([]);
  });
}

test('correct role remains visible in expanded list and others stay unchanged', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto('/#speakers', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#site-preloader')).toHaveCount(0, { timeout: 20000 });
  await page.getByRole('button', { name: 'Показать всех спикеров' }).click();
  const cards = page.locator('.speakers-grid .speaker');
  await expect(cards).toHaveCount(33);
  await expect(cards.nth(10).locator('.speaker-info p')).toHaveText(role);
  await expect(cards.nth(32).locator('.speaker-portrait img')).toHaveAttribute('alt', 'Марина Селина');
});

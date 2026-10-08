import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    sessionStorage.setItem('debt2026-early-booking-dismissed', '1');
  });
  await page.route('https://kinescope.io/**', (route) =>
    route.fulfill({ contentType: 'text/html', body: '<html></html>' }),
  );
});

const additions = [
  [
    'Максим Лифенцев',
    'Руководитель отдела досудебного взыскания ПАО МКК «Займер»',
    'speaker-maxim-lifentsev.webp',
  ],
  ['Максим Миронов', 'Генеральный директор ООО «Смарт Бизнес Лаб»', 'speaker-maxim-mironov.webp'],
  [
    'Илья Скворцов',
    'Руководитель отдела развития сервисов монетизации данных АО «НБКИ»',
    'speaker-ilya-skvortsov.webp',
  ],
];

for (const width of [320, 390, 768, 1024, 1440]) {
  test(
    'roster includes all new speakers with valid portraits at ' + width + 'px',
    async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      const errors = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await page.goto('/#speakers', { waitUntil: 'domcontentloaded' });
      const speakers = page.locator('.speakers-grid .speaker');
      await expect(speakers).toHaveCount(20);

      for (const [name, role, asset] of additions) {
        const card = speakers.filter({
          has: page.locator('.speaker-portrait img[alt="' + name + '"]'),
        });
        await expect(card).toHaveCount(1);
        await expect(card.locator('h3')).toContainText(name.split(' ')[0]);
        await expect(card.locator('h3')).toContainText(name.split(' ')[1]);
        await expect(card.locator('p')).toHaveText(role);
        const portrait = card.locator('.speaker-portrait img');
        await expect(portrait).toHaveAttribute('src', new RegExp(asset.replaceAll('.', '\\.')));
        const url = await portrait.getAttribute('src');
        const response = await page.request.get(new URL(url, page.url()).toString());
        expect(response.ok()).toBe(true);
        expect(response.headers()['content-type']).toContain('image/webp');
      }
      const badges = await page.locator('.speakers-controls > span').innerText();
      expect(badges).toMatch(/\/\s*\d+/);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2),
      ).toBe(true);
      expect(errors).toEqual([]);
    },
  );
}

test('mobile speaker carousel can navigate to the final new speaker', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#speakers', { waitUntil: 'domcontentloaded' });
  const track = page.locator('.speakers-grid');
  await track.focus();
  await page.keyboard.press('End');
  await expect(page.locator('.speakers-controls span')).toContainText('20');
  await expect(page.locator('.speakers-grid .speaker').last()).toContainText('Илья');
});

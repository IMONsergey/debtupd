import { expect, test } from '@playwright/test';

const additions = [
  ['Роман Спатарь', 'Руководитель службы сопровождения и развития дистанционного урегулирования', 'speaker-roman-spotar.webp'],
  ['Анна Белоцерковская', 'Президент Ассоциации ПАУ «Гарант»', 'speaker-anna-belotserkovskaya.webp'],
];

for (const width of [320, 390, 768, 1024, 1440]) {
  test('new DEBT TECH speakers and portraits are present at ' + width + 'px', async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.addInitScript(() => sessionStorage.setItem('debt2026-early-booking-dismissed', '1'));
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('/#speakers', { waitUntil: 'domcontentloaded' });
    const speakers = page.locator('.speakers-grid .speaker');
    await expect(speakers).toHaveCount(33);
    for (const [name, role, filename] of additions) {
      const card = speakers.filter({ has: page.locator('.speaker-portrait img[alt="' + name + '"]') });
      await expect(card).toHaveCount(1);
      await expect(card.locator('.speaker-info p')).toHaveText(role);
      const image = card.locator('.speaker-portrait img');
      await expect(image).toHaveAttribute('src', new RegExp(filename.replaceAll('.', '\\.')));
      const response = await page.request.get(new URL(await image.getAttribute('src'), page.url()).href);
      expect(response.ok()).toBe(true);
      expect(response.headers()['content-type']).toContain('image/webp');
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2)).toBe(true);
    expect(errors).toEqual([]);
  });
}

test('expanded roster final speaker is reachable with the mobile carousel', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => sessionStorage.setItem('debt2026-early-booking-dismissed', '1'));
  await page.goto('/#speakers', { waitUntil: 'domcontentloaded' });
  await page.locator('#site-preloader').waitFor({ state: 'detached', timeout: 20000 });
  const track = page.locator('.speakers-grid');
  await track.focus();
  await page.keyboard.press('End');
  await expect(page.locator('.speakers-controls > span')).toHaveText(/33\s*\/\s*33/);
  await expect(track.locator('.speaker').last()).toContainText('Марина');
  await page.getByRole('button', { name: 'Показать всех спикеров' }).click();
  await expect(page.locator('.speaker-collection')).toHaveClass(/is-expanded/);
  await expect(track.locator('.speaker')).toHaveCount(33);
});

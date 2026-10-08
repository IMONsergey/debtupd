import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem('debt2026-early-booking-dismissed', '1'));
  await page.route('https://kinescope.io/**', (route) =>
    route.fulfill({ contentType: 'text/html', body: '<html></html>' }),
  );
});

for (const width of [320, 390, 768, 1440]) {
  test('client-approved copy stays correct at ' + width + 'px', async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/#about-forum', { waitUntil: 'domcontentloaded' });

    await expect(page.locator('.hero-supporters .supporter')).toHaveCount(3);
    const labels = await page.locator('.hero-supporters .supporter-full').allTextContents();
    const normalize = (text) => text.replace(/\s+/g, ' ').trim();
    expect(labels.map(normalize)).toEqual([
      'При поддержке СРО «МиР»',
      'При поддержке Национальной Ассоциации Профессиональных Коллекторских Агентств',
      'При поддержке Национального совета финансового рынка',
    ]);
    const about = normalize(await page.locator('.about-lead h3').textContent());
    expect(about).toBe(
      'DEBT TECH 2026 — ежегодный форум-выставка о технологиях на рынке долговых активов',
    );

    const stage = page.locator('.participant-panel.active .participant-card', {
      hasText: 'Вендорская',
    });
    await expect(stage).toContainText('Демонстрация решений в экспозоне.');
    const bodyText = await page.locator('body').innerText();
    expect(bodyText).not.toMatch(/[ёЁ]/);
    const description = await page.locator('meta[name="description"]').getAttribute('content');
    expect(description).not.toMatch(/[ёЁ]/);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 2)).toBe(
      false,
    );
    expect(errors).toEqual([]);
  });
}

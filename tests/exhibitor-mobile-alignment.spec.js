import { test, expect } from '@playwright/test';

for (const width of [320, 390, 768, 899]) {
  test('exhibitor cards share aligned logo, description and stand zones at ' + width, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.addInitScript(() => sessionStorage.setItem('debt2026-early-booking-dismissed', '1'));
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/#exhibition', { waitUntil: 'domcontentloaded' });
    const carousel = page.locator('.exhibition-exhibitor-carousel');
    await expect(carousel).toBeVisible();
    const cards = carousel.locator('.exhibition-company-track > .exhibition-company');
    const geometry = await cards.evaluateAll((nodes) => nodes.slice(0, 11).map((card) => {
      const cardBox = card.getBoundingClientRect();
      const logo = card.querySelector('.exhibition-company__logo').getBoundingClientRect();
      const desc = card.querySelector('p').getBoundingClientRect();
      const buttons = card.querySelector('div:last-child').getBoundingClientRect();
      return {
        width: cardBox.width,
        height: cardBox.height,
        logoTop: logo.top - cardBox.top,
        descriptionTop: desc.top - cardBox.top,
        buttonsBottom: cardBox.bottom - buttons.bottom,
        contentOverflow: card.scrollWidth > card.clientWidth + 2,
      };
    }));
    expect(geometry.length).toBeGreaterThan(4);
    expect(Math.max(...geometry.map((c) => c.width)) - Math.min(...geometry.map((c) => c.width))).toBeLessThan(2);
    expect(Math.max(...geometry.map((c) => c.height)) - Math.min(...geometry.map((c) => c.height))).toBeLessThan(2);
    expect(Math.max(...geometry.map((c) => c.logoTop)) - Math.min(...geometry.map((c) => c.logoTop))).toBeLessThan(2);
    expect(Math.max(...geometry.map((c) => c.descriptionTop)) - Math.min(...geometry.map((c) => c.descriptionTop))).toBeLessThan(2);
    expect(Math.max(...geometry.map((c) => c.buttonsBottom)) - Math.min(...geometry.map((c) => c.buttonsBottom))).toBeLessThan(2);
    expect(geometry.every((c) => !c.contentOverflow)).toBe(true);
    await expect(carousel.getByRole('button', { name: 'Предыдущий экспонент' })).toBeVisible();
    await expect(carousel.getByRole('button', { name: 'Следующий экспонент' })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 2)).toBe(false);
    expect(errors).toEqual([]);
  });
}

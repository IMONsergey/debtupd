import { test, expect } from '@playwright/test';

for (const width of [1440, 768, 390, 320]) {
  test(`conference partners render and stay within viewport at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const pageErrors = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));
    await page.goto('/#partners', { waitUntil: 'domcontentloaded' });

    const cards = page.locator('.sponsor-panel--partner');
    await expect(cards).toHaveCount(7);
    await expect(page.locator('.sponsor-panel:not(.sponsor-panel--partner)')).toHaveCount(1);
    await expect(cards.locator('.conference-partner-planet')).toHaveCount(7);
    await expect(cards.locator('.conference-partner-link')).toHaveCount(0);
    await expect(cards.locator('a')).toHaveCount(7);
    for (const link of await cards.locator('a').all()) {
      await expect(link).toHaveAttribute('href', /^https:\/\//);
      await expect(link.locator('img')).toHaveCount(1);
    }
    const tierTypography = await cards.first().locator('.conference-partner-tier').evaluate((el) => ({
      family: getComputedStyle(el).fontFamily,
      transform: getComputedStyle(el).textTransform,
    }));
    expect(tierTypography.family).toMatch(/Bounded/i);
    expect(tierTypography.transform).toBe('uppercase');

    const logos = cards.locator('.conference-partner-logo img');
    for (let index = 0; index < 7; index++) {
      const logo = logos.nth(index);
      await logo.scrollIntoViewIfNeeded();
      await expect.poll(
        () => logo.evaluate((img) => img.complete && img.naturalWidth > 0),
        { timeout: 12000 },
      ).toBe(true);
    }

    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 2),
    ).toBe(true);
    await expect.poll(
      () => cards.first().locator('.conference-partner-planet').evaluate((img) => img.complete && img.naturalWidth > 0),
      { timeout: 12000 },
    ).toBe(true);
    // Typography is intentionally shared with the original DEBTPRICE panel.
    const originalCopy = page.locator('.sponsor-panel:not(.sponsor-panel--partner) .sponsor-copy');
    const partnerCopy = cards.first().locator('.conference-partner-copy');
    const typography = async (locator) => locator.evaluate((el) => {
      const style = getComputedStyle(el);
      return {
        family: style.fontFamily,
        size: style.fontSize,
        lineHeight: style.lineHeight,
        color: style.color,
        gap: style.gap,
      };
    });
    expect(await typography(partnerCopy)).toEqual(await typography(originalCopy));
    if (width > 760) {
      const offset = await page.evaluate(() => {
        const original = document.querySelector('.sponsor-panel:not(.sponsor-panel--partner) .sponsor-copy').getBoundingClientRect();
        const partner = document.querySelector('.sponsor-panel--partner .conference-partner-copy').getBoundingClientRect();
        return Math.abs(original.left - partner.left);
      });
      expect(offset).toBeLessThan(3);
    }

    // A planet must be vertically centered against its card's full height.
    const planetOffset = await cards.first().evaluate((card) => {
      const container = card.getBoundingClientRect();
      const planet = card.querySelector('.conference-partner-planet').getBoundingClientRect();
      return Math.abs((planet.top + planet.bottom) / 2 - (container.top + container.bottom) / 2);
    });
    expect(planetOffset).toBeLessThan(2);
    expect(pageErrors).toEqual([]);
  });
}

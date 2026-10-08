import { test, expect } from '@playwright/test';

for (const width of [1440, 1180, 1024, 768, 760, 390, 320]) {
  test(`conference partners render and stay within viewport at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const pageErrors = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));
    await page.goto('/#partners', { waitUntil: 'domcontentloaded' });

    const cards = page.locator('.sponsor-panel--partner');
    await expect(cards).toHaveCount(7);
    // Client-approved order: Smart Business Lab immediately precedes Intel Collect.
    await expect(cards.locator('.conference-partner-name')).toHaveText([
      'АО «НИРУМ»',
      'АО «Агредатор»',
      'Best2pay',
      'ООО «Смарт Бизнес Лаб»',
      'ПКО «Интел коллект»',
      'ООО «ЭВЕРЕСТ ПЛЮС»',
      'iD Systems',
    ]);
    await expect(page.locator('.sponsor-panel:not(.sponsor-panel--partner)')).toHaveCount(1);
    await expect(cards.locator('.conference-partner-planet')).toHaveCount(7);
    const planetNames = [
      'planet-gold.webp',
      'planet-strategic.webp',
      'planet-diamond.webp',
      'planet-silver.webp',
      'planet-special.webp',
      'planet-standard.webp',
      'planet-standard.webp',
    ];
    for (const [index, planetName] of planetNames.entries()) {
      const planet = cards.nth(index).locator('.conference-partner-planet');
      expect(
        (await planet.getAttribute('src')).endsWith('/assets/partners/planets/' + planetName),
      ).toBe(true);
      await planet.scrollIntoViewIfNeeded();
      await expect
        .poll(
          () =>
            planet.evaluate(
              (img) => img.complete && img.naturalWidth === 516 && img.naturalHeight === 525,
            ),
          { timeout: 12000 },
        )
        .toBe(true);
    }
    await expect(cards.locator('.conference-partner-link')).toHaveCount(0);
    await expect(cards.locator('a')).toHaveCount(7);
    for (const link of await cards.locator('a').all()) {
      await expect(link).toHaveAttribute('href', /^https:\/\//);
      await expect(link.locator('img')).toHaveCount(1);
    }
    const tierTypography = await cards
      .first()
      .locator('.conference-partner-tier')
      .evaluate((el) => ({
        family: getComputedStyle(el).fontFamily,
        transform: getComputedStyle(el).textTransform,
      }));
    expect(tierTypography.family).toMatch(/Bounded/i);
    expect(tierTypography.transform).toBe('uppercase');

    const logos = cards.locator('.conference-partner-logo img');
    for (let index = 0; index < 7; index++) {
      const logo = logos.nth(index);
      await logo.scrollIntoViewIfNeeded();
      await expect
        .poll(() => logo.evaluate((img) => img.complete && img.naturalWidth > 0), {
          timeout: 12000,
        })
        .toBe(true);
    }

    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 2),
    ).toBe(true);
    await expect
      .poll(
        () =>
          cards
            .first()
            .locator('.conference-partner-planet')
            .evaluate((img) => img.complete && img.naturalWidth > 0),
        { timeout: 12000 },
      )
      .toBe(true);
    const layout = await page.locator('.conference-partners-list').evaluate((el) => ({
      display: getComputedStyle(el).display,
      columns: getComputedStyle(el).gridTemplateColumns.split(' ').filter(Boolean).length,
      maxScroll: el.scrollWidth - el.clientWidth,
    }));
    if (width <= 899) {
      expect(layout.display).toBe('flex');
      expect(layout.maxScroll).toBeGreaterThan(0);
      await expect(page.locator('.conference-partners-controls')).toBeVisible();
    } else {
      expect(layout.columns).toBe(width > 1180 ? 3 : 2);
      await expect(page.locator('.conference-partners-controls')).toBeHidden();
    }

    const geometry = await cards.first().evaluate((card) => {
      const visual = card.querySelector('.conference-partner-visual').getBoundingClientRect();
      const copy = card.querySelector('.conference-partner-copy').getBoundingClientRect();
      const planet = card.querySelector('.conference-partner-planet').getBoundingClientRect();
      const logo = card.querySelector('.conference-partner-logo').getBoundingClientRect();
      return {
        vertical: copy.top >= visual.bottom - 2,
        planetCenterOffset: Math.abs((planet.top + planet.bottom - visual.top - visual.bottom) / 2),
        logoWithinCard: logo.left >= visual.left - 2 && logo.right <= visual.right + 2,
        copyWidth: copy.width,
      };
    });
    expect(geometry.vertical).toBe(true);
    expect(geometry.planetCenterOffset).toBeLessThan(2);
    expect(geometry.logoWithinCard).toBe(true);
    expect(geometry.copyWidth).toBeGreaterThan(190);

    const topPositions = await cards.evaluateAll((nodes) =>
      nodes.slice(0, 3).map((el) => Math.round(el.getBoundingClientRect().top)),
    );
    if (width > 1180) {
      expect(topPositions[0]).toBe(topPositions[1]);
      expect(topPositions[1]).toBe(topPositions[2]);
    } else if (width > 899) {
      expect(topPositions[0]).toBe(topPositions[1]);
      expect(topPositions[2]).toBeGreaterThan(topPositions[1]);
    } else {
      expect(topPositions[0]).toBe(topPositions[1]);
      expect(topPositions[1]).toBe(topPositions[2]);
    }
    await expect(page.locator('.conference-partners-carousel')).toHaveCount(1);
    const cardText = await cards.allTextContents();
    expect(cardText.join(' ')).not.toMatch(/[ёЁ]/);
    if (width <= 899) {
      const nav = page.locator('.conference-partners-controls');
      const counter = nav.locator('span').first();
      await expect(counter).toContainText('01 / 07');
      await nav.getByRole('button', { name: 'Следующий партнер' }).click();
      await expect(counter).toContainText('02 / 07');
      await nav.getByRole('button', { name: 'Предыдущий партнер' }).click();
      await expect(counter).toContainText('01 / 07');
    }
    expect(pageErrors).toEqual([]);
  });
}

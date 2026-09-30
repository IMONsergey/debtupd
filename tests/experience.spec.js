import { test, expect } from '@playwright/test';
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem('debt2026-early-booking-dismissed', '1'));
  await page.route('https://kinescope.io/**', (route) =>
    route.fulfill({ contentType: 'text/html', body: '<html><body>Video fixture</body></html>' }),
  );
  await page.route('**/api/lead', (route) => route.abort('blockedbyclient'));
});

test('Hero contains the initial viewport at portrait, landscape and desktop heights', async ({
  page,
}) => {
  for (const [width, height] of [
    [320, 568],
    [390, 844],
    [430, 932],
    [600, 900],
    [768, 1024],
    [1024, 768],
    [1181, 768],
    [1440, 720],
    [1440, 900],
    [1920, 1080],
    [2560, 1440],
  ]) {
    await page.setViewportSize({ width, height });
    await page.goto('/');
    await page.evaluate(() => document.fonts.ready);
    const hero = await page.locator('.hero').boundingBox(),
      tags = await page.locator('main>.technology-tags').boundingBox();
    expect(hero.height, `${width}x${height}`).toBeGreaterThanOrEqual(height - 1);
    expect(
      tags.y,
      `${width}x${height}: technology tags leaked into the hero`,
    ).toBeGreaterThanOrEqual(height);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(
      false,
    );
  }
});
test('Corporate form and offer columns share their top and bottom baselines', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
  for (const width of [1024, 1181, 1440, 1920, 2560]) {
    await page.setViewportSize({ width, height: 1000 });
    const offer = await page.locator('.corporate-offer').boundingBox(),
      form = await page.locator('.corporate-form').boundingBox();
    const discounts = await page.locator('.discounts').boundingBox(),
      button = await page.locator('.corporate-form button[type=submit]').boundingBox();
    expect(Math.abs(offer.y - form.y)).toBeLessThan(1);
    expect(Math.abs(offer.y + offer.height - form.y - form.height)).toBeLessThan(1);
    expect(Math.abs(discounts.y + discounts.height - button.y - button.height)).toBeLessThan(2);
  }
});
test('Russian prepositions are typeset without changing links or numeric values', async ({
  page,
}) => {
  await page.goto('/');
  const text = await page.locator('.hero-lead p').textContent();
  expect(text).toContain('с\u00a0долговыми');
  expect(await page.locator('.service-copy').first().textContent()).toContain('на\u00a0площадке');
  await expect(page.locator('.organizer-contact__primary a').last()).toHaveAttribute(
    'href',
    'mailto:redchief@rvzrus.ru',
  );
  await expect(page.locator('.tariff--business .tariff-bottom strong')).toHaveText(/44\s*000\s*₽/);
});
test('Three progressive blur layers fade right, with a less opaque sidebar tint', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await expect(page.locator('.menu-atmosphere>span')).toHaveCount(3);
  const layers = await page.locator('.menu-atmosphere>span').evaluateAll((nodes) =>
    nodes.map((node) => {
      const style = getComputedStyle(node);
      return {
        blur: style.backdropFilter || style.webkitBackdropFilter,
        mask: style.maskImage || style.webkitMaskImage,
      };
    }),
  );
  expect(layers[0].blur).toContain('2px');
  expect(layers[2].blur).toContain('10px');
  expect(layers.every((layer) => layer.mask.includes('gradient'))).toBe(true);
  const brand = await page.locator('.fixed-menu__brand').boundingBox(),
    nav = await page.locator('.fixed-menu .space-navigation').boundingBox();
  expect(nav.y - brand.y - brand.height).toBeGreaterThanOrEqual(24);
});
test('Numerals and speaker copy have unclipped line boxes', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
  for (const width of [320, 390, 600, 768, 1181, 1440, 2560]) {
    await page.setViewportSize({ width, height: 900 });
    const issues = await page.evaluate(() =>
      [...document.querySelectorAll('.participant-tab strong,.stat strong,.speaker h3,.speaker p')]
        .filter(
          (node) =>
            node.offsetWidth &&
            (node.scrollHeight > node.clientHeight + 2 || node.scrollWidth > node.clientWidth + 2),
        )
        .map((node) => node.textContent),
    );
    expect(issues, `${width}px`).toEqual([]);
  }
});
test('Speaker status banner restores rounded clipping, gradient type and helmet artwork', async ({
  page,
}) => {
  await page.goto('/');
  const style = await page.locator('.speakers-note').evaluate((node) => {
    const s = getComputedStyle(node);
    return { radius: parseFloat(s.borderRadius), overflow: s.overflow };
  });
  expect(style.radius).toBeGreaterThanOrEqual(10);
  expect(style.overflow).toBe('hidden');
  await expect(page.locator('.speakers-note-art img')).toHaveCount(1);
  expect(
    await page
      .locator('.speakers-note>span')
      .evaluate((node) => getComputedStyle(node).backgroundImage),
  ).toContain('linear-gradient');
});
test('Archive has feathered edges and its controls remain outside the mask', async ({ page }) => {
  await page.goto('/');
  expect(
    await page
      .locator('.other-conferences-carousel__viewport')
      .evaluate((node) => getComputedStyle(node).maskImage),
  ).toContain('linear-gradient');
  const button = page.getByRole('button', { name: 'Следующая конференция' });
  expect(
    await button.evaluate((node) => node.closest('.other-conferences-carousel__viewport')),
  ).toBe(null);
  const before = await page.locator('.conference-link-card.is-active').getAttribute('href');
  await button.click();
  await expect(page.locator('.conference-link-card.is-active')).not.toHaveAttribute('href', before);
});
test('CSS stars respond continuously with no floating playback control', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await expect(page.locator('#site-preloader')).toHaveCount(0, { timeout: 12000 });
  await expect(page.locator('.motion-toggle')).toHaveCount(0);
  await expect(page.locator('.cosmos img,.cosmos canvas')).toHaveCount(0);
  await page.mouse.move(1320, 220);
  await expect
    .poll(() =>
      page
        .locator('.cosmos .star-field')
        .evaluate((node) => document.querySelector('.cosmos')._starState.x || 0),
    )
    .toBeGreaterThan(3);
  await page.evaluate(() => scrollTo({ top: 4000, behavior: 'instant' }));
  await expect
    .poll(() =>
      page
        .locator('.cosmos .star-field')
        .evaluate((node) => document.querySelector('.cosmos')._starState.scroll || 0),
    )
    .toBeGreaterThan(5);
  expect(
    await page
      .locator('.cosmos__stars')
      .first()
      .evaluate((node) => getComputedStyle(node).animationName),
  ).toBe('stellar-drift');
});

test('Reduced motion disables both CSS and scripted entrance animation', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => scrollTo({ top: 4000, behavior: 'instant' }));
  await expect(page.getByRole('button', { name: 'Приостановить анимацию' })).toHaveCount(0);
  expect(
    await page
      .locator('.cosmos__stars')
      .first()
      .evaluate((node) => getComputedStyle(node).animationName),
  ).toBe('none');
  expect(
    await page.locator('.hero-wordmark').evaluate((node) => getComputedStyle(node).animationName),
  ).toBe('none');
  expect(
    await page
      .locator('.tariff-astronaut')
      .evaluate((node) => getComputedStyle(node).animationName),
  ).toBe('none');
});

test('Navigation, tabs and dialog focus remain stable with motion enabled', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const trigger = page.getByRole('button', { name: 'Открыть меню' });
  await trigger.click();
  await page
    .getByRole('navigation', { name: 'Разделы сайта' })
    .getByRole('link', { name: 'Тарифы', exact: true })
    .click();
  await expect(page.getByRole('navigation', { name: 'Разделы сайта' })).toBeHidden();
  const apply = page.locator('.tariff--business').getByRole('button', { name: 'Принять участие' });
  await apply.click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(apply).toBeFocused();
  const tabs = page.getByRole('tab', { name: /Пространств/ });
  await tabs.click();
  await expect(page.locator('#panel-1')).toHaveClass(/active/);
  await page.getByRole('tab', { name: /Сцены с деловой/ }).click();
  await expect(page.locator('#panel-0')).toHaveClass(/active/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
});

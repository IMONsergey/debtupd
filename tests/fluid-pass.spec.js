import { test, expect } from '@playwright/test';
import { destinations } from '../src/navigation.js';
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem('debt2026-early-booking-dismissed', '1'));
  await page.route('**/api/lead', (route) => route.abort());
  await page.route('https://kinescope.io/**', (route) =>
    route.fulfill({
      body: '<body style="margin:0;background:#001329"></body>',
      contentType: 'text/html',
    }),
  );
});
async function ready(page) {
  await page.goto('/');
  await expect(page.locator('#site-preloader')).toHaveCount(0, { timeout: 12000 });
  await page.evaluate(() => document.fonts.ready);
}
test('Menu anchors match current sections in document order, including program and speakers', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await ready(page);
  const links = page.locator('.fixed-menu nav a[data-route-id]');
  await expect(links).toHaveCount(destinations.length);
  const ids = await links.evaluateAll((nodes) =>
    nodes.map((node) => node.getAttribute('href').slice(1)),
  );
  expect(ids).toEqual(destinations.map((item) => item.id));
  const tops = await page.evaluate(
    (ids) => ids.map((id) => document.getElementById(id)?.getBoundingClientRect().top),
    ids,
  );
  expect(tops.every((top) => Number.isFinite(top))).toBe(true);
  expect(tops).toEqual([...tops].sort((a, b) => a - b));
  await expect(
    page.locator('.fixed-menu').getByRole('link', { name: 'Кадры с DEBT TECH 2025' }),
  ).toHaveAttribute('href', '#gallery');
});
test('Desktop organizer label, phone, email, website and social links occupy one row', async ({
  page,
}) => {
  await ready(page);
  for (const width of [1181, 1280, 1440, 1920, 2560]) {
    await page.setViewportSize({ width, height: 900 });
    const centers = await page
      .locator('.organizer-contact>.eyebrow,.organizer-contact a')
      .evaluateAll((nodes) =>
        nodes.map((node) => {
          const box = node.getBoundingClientRect();
          return box.top + box.height / 2;
        }),
      );
    expect(Math.max(...centers) - Math.min(...centers), `${width}px contact baseline`).toBeLessThan(
      2,
    );
    expect(
      await page
        .locator('.organizer-contact')
        .evaluate((node) => node.scrollWidth > node.clientWidth + 1),
    ).toBe(false);
  }
});
test('Video frame has no border or hover ring and preserves muted autoplay', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await ready(page);
  const frame = page.locator('.desktop-sidebar-video__frame');
  await frame.hover();
  const styles = await frame.evaluate((node) => {
    const s = getComputedStyle(node);
    return { border: s.borderTopWidth, shadow: s.boxShadow };
  });
  expect(styles).toEqual({ border: '0px', shadow: 'none' });
  await expect(frame.locator('iframe')).toHaveAttribute('src', /autoplay=true.*muted=true/);
});
test('Quantity fields retain numeric validation without browser spinner controls', async ({
  page,
}) => {
  await ready(page);
  const verify = async (node) => {
    expect(await node.getAttribute('type')).toBe('number');
    expect(await node.evaluate((element) => getComputedStyle(element).appearance)).toBe(
      'textfield',
    );
  };
  await verify(page.locator('.corporate-form input[name="participants_count"]'));
  await page.locator('.tariff--business').getByRole('button', { name: 'Принять участие' }).click();
  await verify(page.locator('.form-dialog input[name="participants_count"]'));
});
test('Native menu scrolling is issued once and finishes at the requested section', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.setViewportSize({ width: 1440, height: 900 });
  await ready(page);
  await page.evaluate(() => {
    window.__scrollCalls = 0;
    const original = window.scrollTo.bind(window);
    window.scrollTo = (...args) => {
      window.__scrollCalls++;
      return original(...args);
    };
  });
  await page.locator('.fixed-menu nav').getByRole('link', { name: 'Спикеры', exact: true }).click();
  await expect
    .poll(
      () =>
        page.evaluate(() =>
          Math.abs(document.getElementById('speakers').getBoundingClientRect().top - 36),
        ),
      { timeout: 6000 },
    )
    .toBeLessThan(3);
  expect(await page.evaluate(() => window.__scrollCalls)).toBe(1);
});
test('Soft appearances start before entry and only increase opacity, never hide again', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await ready(page);
  const card = page.locator('.topic-card').first();
  await expect(card).toHaveAttribute('data-reveal', 'waiting');
  const samples = await card.evaluate(async (node) => {
    scrollTo({
      top: node.getBoundingClientRect().top + scrollY - innerHeight * 0.7,
      behavior: 'instant',
    });
    const values = [];
    for (let index = 0; index < 65; index++) {
      await new Promise(requestAnimationFrame);
      values.push(Number(getComputedStyle(node).opacity));
    }
    return values;
  });
  expect(samples.some((value) => value > 0 && value < 1)).toBe(true);
  expect(samples.every((value, index) => !index || value + 0.005 >= samples[index - 1])).toBe(true);
  await expect(card).toHaveAttribute('data-reveal', 'shown');
  await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
  await page.waitForTimeout(300);
  expect(await card.evaluate((node) => getComputedStyle(node).opacity)).toBe('1');
});
test('Pointer light follows both sides of the planet and stops rendering offscreen', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.setViewportSize({ width: 1440, height: 900 });
  await ready(page);
  const canvas = page.locator('.hero-horizon canvas');
  const available = await canvas.evaluate((node) => !!node._orbitState);
  if (!available) {
    await expect(page.locator('.hero-horizon')).toHaveAttribute('data-gl', 'fallback');
    return;
  }
  await page.mouse.move(240, 330);
  await expect.poll(() => canvas.evaluate((node) => node._orbitState.hover)).toBeGreaterThan(0.85);
  await expect.poll(() => canvas.evaluate((node) => node._orbitState.x)).toBeLessThan(0.25);
  await page.mouse.move(1250, 330);
  await expect.poll(() => canvas.evaluate((node) => node._orbitState.x)).toBeGreaterThan(0.8);
  const pixels = await canvas.evaluate((node) => node.width * node.height);
  expect(pixels).toBeLessThan(151000);
  await page.evaluate(() => scrollTo({ top: 3000, behavior: 'instant' }));
  await expect.poll(() => canvas.evaluate((node) => node._orbitState.running)).toBe(false);
  const count = await canvas.evaluate((node) => node._orbitState.draws);
  await page.waitForTimeout(300);
  expect(await canvas.evaluate((node) => node._orbitState.draws)).toBe(count);
});
test('Hero fades out into the global sky instead of ending on an opaque rectangle', async ({
  page,
}) => {
  await ready(page);
  const mask = await page
    .locator('.hero-layer-scene')
    .evaluate((node) => getComputedStyle(node).maskImage);
  expect(mask).toContain('linear-gradient');
  expect(mask).toContain('rgba(0, 0, 0, 0)');
  expect(
    await page
      .locator('.audience-card')
      .first()
      .evaluate((node) => getComputedStyle(node).backdropFilter),
  ).toBe('none');
});

test('Decorative animation pauses underneath a modal and resumes without a jump', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.setViewportSize({ width: 1440, height: 900 });
  await ready(page);
  const canvas = page.locator('.hero-horizon canvas');
  await page.locator('.fixed-menu').getByRole('button', { name: 'Открыть видео' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  expect(
    await page
      .locator('.hero-planet-rotation')
      .evaluate((node) => getComputedStyle(node).animationPlayState),
  ).toBe('paused');
  if (await canvas.evaluate((node) => !!node._orbitState)) {
    await expect.poll(() => canvas.evaluate((node) => node._orbitState.running)).toBe(false);
    const count = await canvas.evaluate((node) => node._orbitState.draws);
    await page.waitForTimeout(200);
    expect(await canvas.evaluate((node) => node._orbitState.draws)).toBe(count);
  }
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(
    await page
      .locator('.hero-planet-rotation')
      .evaluate((node) => getComputedStyle(node).animationPlayState),
  ).toBe('running');
});

test('Organizer and other conferences stay on the page but are omitted from both menus', async ({
  page,
}) => {
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await ready(page);
    if (width < 1181) await page.getByRole('button', { name: 'Открыть меню' }).click();
    const menu = page.getByRole('navigation', { name: 'Разделы сайта' });
    await expect(menu.getByRole('link')).toHaveCount(8);
    await expect(menu.getByRole('link', { name: 'Организатор', exact: true })).toHaveCount(0);
    await expect(menu.getByRole('link', { name: 'Другие конференции', exact: true })).toHaveCount(
      0,
    );
    await expect(page.locator('section#organizer')).toHaveCount(1);
    await expect(page.locator('section#other-conferences')).toHaveCount(1);
  }
});

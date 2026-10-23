import { test, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

test.beforeEach(async ({ page }) => {
  await page.route('**/api/lead', (route) => route.abort());
  await page.route('https://kinescope.io/**', (route) =>
    route.fulfill({ contentType: 'text/html', body: '<html></html>' }));
  await page.addInitScript(() => sessionStorage.setItem('debt2026-early-booking-dismissed', '1'));
});

test('countdown targets 13 November 2026 at 10:00 Moscow time', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-11-13T09:00:00+03:00') });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#site-preloader')).toHaveCount(0, { timeout: 25000 });
  const digits = await page.locator('.hero .countdown-cell > span').allTextContents();
  const [days, hours, minutes, seconds] = digits.map(Number);
  const totalSeconds = days * 86400 + hours * 3600 + minutes * 60 + seconds;
  // The preloader advances the real test clock by a few seconds.
  expect(totalSeconds).toBeGreaterThanOrEqual(3540);
  expect(totalSeconds).toBeLessThanOrEqual(3600);
});

for (const width of [320, 390, 600]) {
  test('mobile stage navigator exposes all three CMS stages at ' + width + 'px', async ({ page }) => {
    await page.setViewportSize({ width, height: 850 });
    await page.goto('/#prog', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#site-preloader')).toHaveCount(0, { timeout: 25000 });
    const selector = page.locator('.forum-programme__stage-selector');
    await selector.scrollIntoViewIfNeeded();
    const nav = selector.locator('.forum-programme__stage-navigation');
    await expect(nav).toBeVisible();
    await expect(selector.locator('.forum-programme__stage')).toHaveCount(3);
    await expect(selector.locator('.forum-programme__stage:visible')).toHaveCount(1);
    await expect(selector.locator('.forum-programme__stage-progress')).toContainText('01');
    await expect(selector.locator('.forum-programme__stage-progress')).toContainText('03');

    const selectedName = async () =>
      selector.locator('.forum-programme__stage--selected .forum-programme__stage-copy strong').textContent();
    expect((await selectedName()).toLocaleUpperCase('ru-RU')).toContain('БОЛЬШАЯ СЦЕНА');
    await nav.getByRole('button', { name: 'Следующая сцена' }).click();
    await expect(selector.locator('.forum-programme__stage-progress')).toContainText('02');
    expect((await selectedName()).toLocaleUpperCase('ru-RU')).toContain('МАЛАЯ СЦЕНА');
    await expect(selector.locator('.forum-programme__stage:visible')).toHaveCount(1);
    await nav.getByRole('button', { name: 'Следующая сцена' }).click();
    await expect(selector.locator('.forum-programme__stage-progress')).toContainText('03');
    expect((await selectedName()).toLocaleUpperCase('ru-RU')).toContain('ПРОДУКТОВАЯ СЦЕНА');
    await nav.getByRole('button', { name: 'Следующая сцена' }).click();
    await expect(selector.locator('.forum-programme__stage-progress')).toContainText('01');
    expect((await selectedName()).toLocaleUpperCase('ru-RU')).toContain('БОЛЬШАЯ СЦЕНА');
    await nav.getByRole('button', { name: 'Предыдущая сцена' }).click();
    await expect(selector.locator('.forum-programme__stage-progress')).toContainText('03');
    expect((await selectedName()).toLocaleUpperCase('ru-RU')).toContain('ПРОДУКТОВАЯ СЦЕНА');
    const geometry = await nav.evaluate((node) => {
      const r = node.getBoundingClientRect();
      return { fits: r.left >= -1 && r.right <= innerWidth + 1,
        arrowCount: node.querySelectorAll('button').length,
        overflow: document.documentElement.scrollWidth - innerWidth };
    });
    expect(geometry.fits).toBe(true);
    expect(geometry.arrowCount).toBe(2);
    expect(geometry.overflow).toBeLessThanOrEqual(2);
    await mkdir('test-results/mobile-polish', { recursive: true });
    await selector.screenshot({ path: 'test-results/mobile-polish/stages-' + width + '.png',
      animations: 'disabled' });
  });
}

for (const width of [320, 390, 540]) {
  test('venue photo and organizer hierarchy are readable at ' + width + 'px', async ({ page }) => {
    await page.setViewportSize({ width, height: 850 });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#site-preloader')).toHaveCount(0, { timeout: 25000 });
    const venue = page.locator('.hero > .venue-hero-card');
    await venue.scrollIntoViewIfNeeded();
    await expect(venue.locator('h2')).toContainText('TAU');
    await expect(venue.locator('.venue-hero-card__details p'))
      .toContainText('Москва, Рязанский проспект');
    const visual = await venue.evaluate((node) => {
      const image = node.querySelector('.venue-hero-card__photo img');
      const style = getComputedStyle(image);
      const overlay = getComputedStyle(image.parentElement, '::after');
      const bounds = (el) => el.getBoundingClientRect();
      const text = node.querySelector('.venue-hero-card__details');
      const photo = node.querySelector('.venue-hero-card__photo');
      return {
        scale: style.transform,
        overlay: overlay.backgroundImage,
        photoContainsCopy: bounds(photo).top <= bounds(text).top,
        overflow: document.documentElement.scrollWidth - innerWidth,
      };
    });
    expect(visual.scale).toContain('1.34');
    expect(visual.overlay).toContain('0.97');
    expect(visual.photoContainsCopy).toBe(true);
    expect(visual.overflow).toBeLessThanOrEqual(2);

    const block = page.locator('.mobile-info .info-meta');
    await block.scrollIntoViewIfNeeded();
    const hierarchy = await block.evaluate((el) => {
      const label = el.querySelector('.info-organizers .meta-label').getBoundingClientRect();
      const logo = el.querySelector('.info-organizers img').getBoundingClientRect();
      const mail = el.querySelector('.info-contact a').getBoundingClientRect();
      return {
        imageWidth: logo.width,
        labelBeforeLogos: logo.top - label.bottom,
        mailSingleLine: mail.height < 32,
        overflow: document.documentElement.scrollWidth - innerWidth,
      };
    });
    expect(hierarchy.imageWidth).toBeGreaterThanOrEqual(Math.min(width - 45, 350));
    expect(hierarchy.labelBeforeLogos).toBeGreaterThanOrEqual(7);
    expect(hierarchy.mailSingleLine).toBe(true);
    expect(hierarchy.overflow).toBeLessThanOrEqual(2);
    await mkdir('test-results/mobile-polish', { recursive: true });
    await venue.screenshot({ path: 'test-results/mobile-polish/venue-' + width + '.png',
      animations: 'disabled' });
    await block.screenshot({ path: 'test-results/mobile-polish/contacts-' + width + '.png',
      animations: 'disabled' });
  });
}

test('programme keeps its three desktop stage tabs and original navigation', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/#prog', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#site-preloader')).toHaveCount(0, { timeout: 25000 });
  await expect(page.locator('.forum-programme__stage-navigation')).toBeHidden();
  await expect(page.locator('.forum-programme__stage:visible')).toHaveCount(3);
  await page.getByRole('tab', { name: /Малая сцена/ }).click();
  await expect(page.getByRole('tab', { name: /Малая сцена/ })).toHaveAttribute('aria-selected', 'true');
  await page.getByRole('tab', { name: /Продуктовая сцена/ }).click();
  await expect(page.getByRole('tab', { name: /Продуктовая сцена/ }))
    .toHaveAttribute('aria-selected', 'true');
});

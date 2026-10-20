import { test, expect } from '@playwright/test';

const venueName = 'TAU';
const routeText =
  'Пространство музыкальных культур TAU находится на территории кинозавода «МОСКИНО» в 750 метров от м. Стахановская';
const address = 'Москва, Рязанский проспект, 8Ас10';

test.beforeEach(async ({ page }) => {
  // Never post real lead requests during presentation and route regression tests.
  await page.route('**/api/lead', (route) => route.abort());
  await page.route('https://kinescope.io/**', (route) =>
    route.fulfill({ contentType: 'text/html', body: '<html></html>' }),
  );
});

for (const [width, height] of [
  [320, 720],
  [390, 844],
  [600, 800],
  [680, 800],
  [700, 800],
  [768, 800],
  [800, 800],
  [900, 800],
  [1024, 768],
  [1181, 620],
  [1181, 800],
  [1280, 700],
  [1280, 800],
  [1440, 650],
  [1440, 850],
  [1440, 900],
  [1920, 1080],
]) {
  test('venue card and accessible directions work at ' + width + 'x' + height, async ({ page }) => {
    await page.setViewportSize({ width, height });
    const pageErrors = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#site-preloader')).toHaveCount(0, { timeout: 20000 });

    const card = page.locator('.venue-hero-card');
    await expect(card).toBeVisible();
    await expect(card).not.toHaveClass(/\bcorners\b/);
    const cornerDecoration = await card.evaluate(
      (element) => getComputedStyle(element, '::after').content,
    );
    expect(cornerDecoration).toBe('none');
    await expect(card).not.toContainText('Место проведения');
    await expect(card.locator('.venue-hero-card__eyebrow')).toHaveCount(0);
    const photoTreatment = await card.locator('.venue-hero-card__photo img').evaluate((image) => {
      const visual = image.parentElement;
      return {
        brightness: getComputedStyle(image).filter,
        overlay: getComputedStyle(visual, '::after').backgroundImage,
      };
    });
    expect(photoTreatment.brightness).toContain('brightness(0.88)');
    expect(photoTreatment.overlay).toContain('0.35');
    await expect(card.locator('h2')).toContainText(venueName);
    await expect(card.locator('h2')).toContainText('пространство музыкальных культур');
    await expect(card.locator('p')).toHaveText(address);
    const photo = card.locator('.venue-hero-card__photo img');
    await expect(photo).toHaveAttribute('src', /\/assets\/images\/venue\/tau-event-hero\.webp$/);
    await card.scrollIntoViewIfNeeded();
    await expect
      .poll(() => photo.evaluate((image) => image.complete && image.naturalWidth > 0), {
        timeout: 20000,
      })
      .toBe(true);

    const layout = await page.evaluate(() => {
      const bounds = (selector) => document.querySelector(selector).getBoundingClientRect();
      const card = bounds('.venue-hero-card');
      const hero = bounds('.hero');
      const date = bounds('.hero-date');
      const brand = bounds('.hero-wordmark');
      const supporters = bounds('.hero-supporters');
      const photo = bounds('.venue-hero-card__photo');
      const title = bounds('.venue-hero-card__details h2');
      const address = bounds('.venue-hero-card__details p');
      const button = bounds('.venue-hero-card__button');
      const overlaps = (a, b) =>
        a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
      return {
        insideHero: card.top >= hero.top - 2 && card.bottom <= hero.bottom + 2,
        clearDate: !overlaps(card, date),
        clearBrand: !overlaps(card, brand),
        beforeSupporters: card.bottom <= supporters.top - 12,
        matchesSupportWidth: Math.abs(card.width - supporters.width) <= 1,
        matchesSupportRight: Math.abs(card.right - supporters.right) <= 1,
        supportersGap: supporters.top - card.bottom,
        photoUnderlaysCopy:
          photo.top <= title.top && photo.bottom >= address.bottom && photo.width >= card.width - 2,
        buttonIsFooter:
          Math.abs(button.bottom - card.bottom) <= 2 &&
          Math.abs(button.width - (card.width - 2)) <= 2 &&
          button.top >= photo.bottom - 2,
        cardIsPortrait: card.height >= card.width * 0.95,
        roundedCorners:
          parseFloat(
            getComputedStyle(document.querySelector('.venue-hero-card')).borderTopLeftRadius,
          ) >= 8,
        overflow: document.documentElement.scrollWidth > innerWidth + 2,
      };
    });
    expect(layout.insideHero).toBe(true);
    expect(layout.clearDate).toBe(true);
    expect(layout.beforeSupporters).toBe(true);
    expect(layout.photoUnderlaysCopy).toBe(true);
    expect(layout.buttonIsFooter).toBe(true);
    expect(layout.cardIsPortrait).toBe(true);
    if (width >= 768) {
      expect(layout.clearBrand).toBe(true);
      expect(layout.matchesSupportWidth).toBe(true);
      expect(layout.matchesSupportRight).toBe(true);
      const expectedGap = width <= 1180 || height <= 760 ? 16 : 18;
      expect(Math.abs(layout.supportersGap - expectedGap)).toBeLessThanOrEqual(2);
    }
    expect(layout.overflow).toBe(false);
    expect(layout.roundedCorners).toBe(true);

    await card.getByRole('button', { name: 'Как добраться' }).click();
    const dialog = page.getByRole('dialog', { name: 'Как добраться до TAU' });
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAttribute('aria-modal', 'true');
    await expect(dialog.locator('.venue-directions-dialog__eyebrow')).toHaveText(
      'Место проведения',
    );
    const closeGeometry = await dialog
      .getByRole('button', { name: 'Закрыть маршрут' })
      .evaluate((button) => {
        const buttonBounds = button.getBoundingClientRect();
        const iconBounds = button.querySelector('svg').getBoundingClientRect();
        return {
          square:
            Math.abs(buttonBounds.width - buttonBounds.height) <= 1 && buttonBounds.width >= 44,
          centeredX:
            Math.abs(
              buttonBounds.left + buttonBounds.width / 2 - (iconBounds.left + iconBounds.width / 2),
            ) <= 1,
          centeredY:
            Math.abs(
              buttonBounds.top + buttonBounds.height / 2 - (iconBounds.top + iconBounds.height / 2),
            ) <= 1,
        };
      });
    expect(closeGeometry).toEqual({ square: true, centeredX: true, centeredY: true });
    await expect(dialog.locator('.venue-directions-dialog__description')).toHaveText(routeText);
    const image = dialog.locator('.venue-directions-dialog__map');
    await expect(image).toHaveAttribute('src', /\/assets\/images\/venue\/tau-route-map\.webp$/);
    await expect
      .poll(() => image.evaluate((source) => source.complete && source.naturalWidth > 0), {
        timeout: 20000,
      })
      .toBe(true);
    const mapLink = dialog.getByRole('link', { name: 'См. на карте' });
    await expect(mapLink).toHaveAttribute('href', /https:\/\/yandex\.ru\/maps\//);
    await expect(mapLink).toHaveAttribute('target', '_blank');
    expect(await page.evaluate(() => document.body.style.overflow)).toBe('hidden');
    await expect(dialog.getByRole('button', { name: 'Закрыть маршрут' })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    expect(await page.evaluate(() => document.body.style.overflow)).not.toBe('hidden');
    expect(pageErrors).toEqual([]);
  });
}

for (const width of [390, 768, 1024]) {
  test('mobile route menu exposes a separate directions control at ' + width, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#site-preloader')).toHaveCount(0, { timeout: 20000 });
    const toggle = page.getByRole('button', { name: 'Открыть меню' });
    await toggle.click();
    const directions = page.locator('.space-route__directions');
    await directions.scrollIntoViewIfNeeded();
    await expect(directions).toBeVisible();
    await expect(directions).toHaveText('Как добраться');
    await directions.click();
    // The open dialog intentionally marks #page-content inert: query the existing
    // menu toggle by stable class instead of the now-hidden accessibility tree.
    await expect(page.locator('.space-navigation__toggle')).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    const dialog = page.getByRole('dialog', { name: 'Как добраться до TAU' });
    await expect(dialog).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Открыть меню' })).toBeFocused();
  });
}

test('directions close on outside click and keep the tariff registration working', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#site-preloader')).toHaveCount(0, { timeout: 20000 });
  await page.getByRole('button', { name: 'Как добраться' }).click();
  const dialog = page.getByRole('dialog', { name: 'Как добраться до TAU' });
  await expect(dialog).toBeVisible();
  await page.mouse.click(4, 4);
  await expect(dialog).toHaveCount(0);
  await page.locator('.tariff--online').getByRole('button', { name: 'Принять участие' }).click();
  await expect(page.getByRole('dialog', { name: 'Регистрация' })).toHaveAttribute(
    'data-tariff-id',
    'online',
  );
});

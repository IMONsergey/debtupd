import { test, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

const frozenTime = new Date('2026-10-22T15:00:00+03:00');
const promo = '.welcome-discount';
const closedBadge = '.welcome-discount-reopen';

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: frozenTime });
  await page.route('https://kinescope.io/**', (route) =>
    route.fulfill({ status: 200, contentType: 'text/html', body: '<html></html>' }));
  await page.route('**/api/lead', (route) => route.abort());
});
async function ready(page, url = '/') {
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#site-preloader')).toHaveCount(0, { timeout: 30000 });
}
async function show(page) {
  await page.clock.fastForward(60_100);
  await expect(page.getByRole('dialog', { name: 'Скидка' })).toBeVisible();
}

test('the new offer opens once after a fresh 60 seconds, never immediately, and is not the retired popup', async ({ page }) => {
  // Emulate the stale session timestamp that caused the previous immediate popup.
  await page.addInitScript(() => sessionStorage.setItem('debt2026-welcome50-entry-at', '1'));
  await ready(page);
  await expect(page.locator(promo)).toHaveCount(0);
  await page.clock.fastForward(50_000);
  await expect(page.locator(promo)).toHaveCount(0);
  await page.clock.fastForward(10_200);
  await expect(page.locator(promo)).toHaveCount(1);
  await expect(page.locator('.ticket-offer-modal')).toHaveCount(0);
  await expect(page.locator('.welcome-discount__percent')).toHaveText('50%');
  await expect(page.locator('.welcome-discount__promo-heading')).toHaveText('По промокоду');
  await expect(page.locator('.welcome-discount__code')).toHaveText('WELCOME');
  await expect(page.locator('.welcome-discount__description')).toContainText('на один билет любого тарифа');
  await expect(page.locator('.welcome-discount__description')).toContainText('впервые');
  await expect(page.locator('.welcome-discount__terms')).toContainText('по согласованию с организаторами');
  await expect(page.locator(promo).getByRole('button', { name: 'Выбрать тариф' })).toBeVisible();
  await expect(page.locator('.welcome-discount__copy')).toHaveCount(1);
  await page.locator(promo).getByRole('button', { name: 'Закрыть предложение' }).click();
  await expect(page.locator(promo)).toHaveCount(0);
  await expect(page.locator(closedBadge)).toBeVisible();
  await page.clock.fastForward(120_000);
  await expect(page.locator(promo)).toHaveCount(0);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.locator('#site-preloader')).toHaveCount(0, { timeout: 30000 });
  await expect(page.locator(promo)).toHaveCount(0);
  await expect(page.locator(closedBadge)).toHaveCount(0);
  await page.clock.fastForward(60_200);
  await expect(page.locator(promo)).toHaveCount(0);
  await expect(page.locator(closedBadge)).toBeVisible();
  await page.getByRole('button', { name: 'Открыть предложение со скидкой 50%' }).click();
  await expect(page.locator(promo)).toBeVisible();
});

test('reloading the page starts a new full minute even when the popup was previously visible', async ({ page }) => {
  await ready(page);
  await show(page);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.locator('#site-preloader')).toHaveCount(0, { timeout: 30000 });
  await expect(page.locator(promo)).toHaveCount(0);
  await page.clock.fastForward(50_000);
  await expect(page.locator(promo)).toHaveCount(0);
  await page.clock.fastForward(10_200);
  await expect(page.locator(promo)).toBeVisible();
});

test('copy icon writes WELCOME to the actual clipboard and reports success', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await ready(page);
  await show(page);
  await page.getByRole('button', { name: 'Скопировать промокод WELCOME' }).click();
  await expect(page.getByRole('button', { name: 'Промокод скопирован' })).toBeVisible();
  await expect(page.locator('.welcome-discount__copy-status')).toContainText('WELCOME скопирован');
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('WELCOME');
});

test('tariff button closes modal and scrolls to real tariff plans without changing current path', async ({ page }) => {
  await ready(page, '/2/');
  await show(page);
  await page.getByRole('button', { name: 'Выбрать тариф' }).click();
  await expect(page.locator(promo)).toHaveCount(0);
  await expect(page).toHaveURL(/\/2\/#tariff-plans$/);
  const top = await page.locator('#tariff-plans').evaluate((node) => node.getBoundingClientRect().top);
  expect(top).toBeLessThan(130);
  await expect(page.locator(closedBadge)).toBeVisible();
});

test('offer waits until the registration form is closed, without interrupting it', async ({ page }) => {
  await ready(page);
  await page.locator('.tariff--business').getByRole('button', { name: 'Принять участие' }).click();
  await expect(page.locator('[role="dialog"].form-dialog--business')).toBeVisible();
  await page.clock.fastForward(60_100);
  await expect(page.locator(promo)).toHaveCount(0);
  await page.locator('[role="dialog"].form-dialog--business')
    .getByRole('button', { name: 'Закрыть форму' }).click();
  await expect(page.locator(promo)).toHaveCount(1);
});

for (const width of [320, 390, 768, 1024, 1440]) {
  test('visual proportions, original astronaut, readable code and touch targets at ' + width + 'px', async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await ready(page);
    await show(page);
    const image = page.locator('.welcome-discount__astronaut');
    await expect(image).toHaveAttribute('src', /\/assets\/promotions\/welcome-astronaut\.png$/);
    await expect.poll(async () => image.evaluate((element) =>
      element.complete && element.naturalWidth === 897 && element.naturalHeight === 861
    ), { timeout: 18000 }).toBe(true);
    await image.evaluate((element) => element.decode());
    const geometry = await page.locator(promo).evaluate((root) => {
      const dialog = root.getBoundingClientRect();
      const code = root.querySelector('.welcome-discount__code').getBoundingClientRect();
      const promoPanel = root.querySelector('.welcome-discount__promo').getBoundingClientRect();
      const copy = root.querySelector('.welcome-discount__copy').getBoundingClientRect();
      const cta = root.querySelector('.welcome-discount__cta').getBoundingClientRect();
      const intro = root.querySelector('.welcome-discount__intro').getBoundingClientRect();
      const percentElement = root.querySelector('.welcome-discount__percent');
      const percent = percentElement.getBoundingClientRect();
      const description = root.querySelector('.welcome-discount__description');
      const descriptionLines = [...description.querySelectorAll('.welcome-discount__description-line')];
      const descriptionRects = descriptionLines.map((line) => line.getBoundingClientRect());
      return {
        viewport: innerWidth,
        documentOverflow: document.documentElement.scrollWidth - innerWidth,
        left: dialog.left, right: dialog.right,
        width: dialog.width,
        height: dialog.height,
        bounded50: getComputedStyle(percentElement).fontFamily.includes('Bounded'),
        percentWeight: getComputedStyle(percentElement).fontWeight,
        percentHasBreathingRoom: percent.left >= intro.left - 1 &&
          percent.right <= intro.right + 2 &&
          percent.bottom <= description.getBoundingClientRect().top + 1,
        percentHasSafeLineBox: percent.height >=
          parseFloat(getComputedStyle(percentElement).fontSize) * 0.98,
        codeHorizontalCenterError: Math.abs(
          (code.left + code.width / 2) - (promoPanel.left + promoPanel.width / 2)
        ),
        codeVerticalCenterError: Math.abs(
          (code.top + code.height / 2) - (promoPanel.top + promoPanel.height / 2)
        ),
        descriptionLinesAligned: descriptionLines.length === 2 &&
          descriptionRects.every((rect) => Math.abs(rect.left - descriptionRects[0].left) <= 1) &&
          Math.abs(descriptionRects[1].top - descriptionRects[0].bottom) <= 1,
        promoCodeFits: code.left >= promoPanel.left - 2 && code.right <= copy.left + 1,
        copyInPromo: copy.left >= promoPanel.left - 2 && copy.right <= promoPanel.right + 2,
        ctaWidth: cta.width,
        ctaVisibleWithoutScrolling: cta.bottom <= dialog.bottom + 1 && cta.top >= dialog.top,
        codeFont: parseFloat(getComputedStyle(root.querySelector('.welcome-discount__code')).fontSize),
      };
    });
    expect(geometry.documentOverflow).toBeLessThanOrEqual(2);
    expect(geometry.left).toBeGreaterThanOrEqual(0);
    expect(geometry.right).toBeLessThanOrEqual(width + 1);
    expect(geometry.width).toBeLessThanOrEqual(width > 900 ? 590 : width - 12);
    expect(geometry.height).toBeLessThanOrEqual(width > 600 ? 575 : 590);
    expect(geometry.bounded50).toBe(true);
    expect(geometry.percentWeight).toBe('300');
    expect(geometry.percentHasBreathingRoom).toBe(true);
    expect(geometry.percentHasSafeLineBox).toBe(true);
    expect(geometry.codeHorizontalCenterError).toBeLessThanOrEqual(1);
    expect(geometry.codeVerticalCenterError).toBeLessThanOrEqual(1);
    expect(geometry.descriptionLinesAligned).toBe(true);
    expect(geometry.promoCodeFits).toBe(true);
    expect(geometry.copyInPromo).toBe(true);
    expect(geometry.ctaWidth).toBeGreaterThanOrEqual(200);
    expect(geometry.ctaVisibleWithoutScrolling).toBe(true);
    expect(geometry.codeFont).toBeGreaterThanOrEqual(40);
    await mkdir('test-results/welcome-discount', { recursive: true });
    await page.screenshot({
      path: 'test-results/welcome-discount/offer-' + width + '.png',
      animations: 'disabled',
    });
    await page.keyboard.press('Escape');
    await expect(page.locator(promo)).toHaveCount(0);
    await expect(page.locator(closedBadge)).toBeVisible();
  });
}


test('reference composition at 658×700 is 580×550 with the centered full-size WELCOME', async ({ page }) => {
  await page.setViewportSize({ width: 658, height: 700 });
  await ready(page);
  await show(page);
  await page.evaluate(() => document.fonts.ready);
  const geometry = await page.locator(promo).evaluate((root) => {
    const r = (name) => root.querySelector('.welcome-discount__' + name).getBoundingClientRect();
    const frame = root.getBoundingClientRect();
    const line = root.querySelector('.welcome-discount__code');
    const range = document.createRange();
    range.selectNodeContents(line);
    const textRect = range.getBoundingClientRect();
    const code = r('code');
    const band = r('promo');
    const intro = r('intro');
    const person = r('astronaut');
    const button = r('cta');
    return {
      width: frame.width,
      height: frame.height,
      leftInset: intro.left - frame.left,
      labelTop: r('promo-heading').top - frame.top,
      promoTop: band.top - frame.top,
      promoHeight: band.height,
      promoTextFits: textRect.left >= code.left - 1 && textRect.right <= code.right + 1,
      promoTextSize: parseFloat(getComputedStyle(line).fontSize),
      textCenterOffset: (textRect.left + textRect.width / 2) - (band.left + band.width / 2),
      astronautFits: person.top >= frame.top + 35 && person.right <= frame.right + 14,
      buttonWidth: button.width,
      buttonVisible: button.bottom <= frame.bottom - 20,
      descriptionLineHeight: parseFloat(getComputedStyle(root.querySelector('.welcome-discount__description')).lineHeight),
      scroll: root.scrollHeight - root.clientHeight,
    };
  });
  expect(geometry.width).toBeCloseTo(580, 0);
  expect(geometry.height).toBeCloseTo(550, 0);
  expect(geometry.leftInset).toBeGreaterThanOrEqual(32);
  expect(geometry.leftInset).toBeLessThanOrEqual(38);
  expect(geometry.labelTop).toBeGreaterThanOrEqual(275);
  expect(geometry.labelTop).toBeLessThanOrEqual(300);
  expect(geometry.promoTop).toBeGreaterThanOrEqual(305);
  expect(geometry.promoTop).toBeLessThanOrEqual(330);
  expect(geometry.promoHeight).toBeGreaterThanOrEqual(84);
  expect(geometry.promoHeight).toBeLessThanOrEqual(96);
  expect(geometry.promoTextFits).toBe(true);
  expect(geometry.promoTextSize).toBeGreaterThanOrEqual(82);
  expect(Math.abs(geometry.textCenterOffset)).toBeLessThanOrEqual(2);
  expect(geometry.astronautFits).toBe(true);
  expect(geometry.buttonWidth).toBeGreaterThanOrEqual(220);
  expect(geometry.buttonWidth).toBeLessThanOrEqual(230);
  expect(geometry.buttonVisible).toBe(true);
  expect(geometry.descriptionLineHeight).toBeGreaterThanOrEqual(20);
  expect(geometry.scroll).toBeLessThanOrEqual(2);
  await mkdir('test-results/welcome-discount', { recursive: true });
  await page.locator(promo).screenshot({
    path: 'test-results/welcome-discount/reference-658.png',
    animations: 'disabled',
  });
});

for (const width of [320, 390, 500, 600]) {
  test('mobile WELCOME remains centered without internal scrolling at ' + width + 'px', async ({ page }) => {
    await page.setViewportSize({ width, height: 780 });
    await ready(page);
    await show(page);
    const geometry = await page.locator(promo).evaluate((root) => {
      const code = root.querySelector('.welcome-discount__code');
      const band = root.querySelector('.welcome-discount__promo');
      const range = document.createRange();
      range.selectNodeContents(code);
      const text = range.getBoundingClientRect();
      const field = code.getBoundingClientRect();
      const bg = band.getBoundingClientRect();
      return {
        visible: field.left >= bg.left && field.right <= bg.right,
        textFits: text.left >= field.left - 2 && text.right <= field.right + 2,
        centered: Math.abs(text.left + text.width / 2 - (bg.left + bg.width / 2)) <= 2,
        scroll: root.scrollHeight - root.clientHeight,
        overflow: document.documentElement.scrollWidth - innerWidth,
      };
    });
    expect(geometry.visible).toBe(true);
    expect(geometry.textFits).toBe(true);
    expect(geometry.centered).toBe(true);
    expect(geometry.scroll).toBeLessThanOrEqual(2);
    expect(geometry.overflow).toBeLessThanOrEqual(2);
  });
}

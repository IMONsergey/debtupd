import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem('debt2026-early-booking-dismissed', '1'));
  await page.route('https://kinescope.io/**', (route) =>
    route.fulfill({ contentType: 'text/html', body: '<html></html>' }),
  );
});

for (const width of [320, 390, 768, 1024, 1440, 1920]) {
  test('Compact FinCifra integrates with existing site at ' + width + 'px', async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/#fincifra-seminar', { waitUntil: 'domcontentloaded' });
    await page.locator('#site-preloader').waitFor({ state: 'detached', timeout: 25000 });

    const seminar = page.locator('#fincifra-seminar');
    const topics = seminar.locator('.fincifra-seminar__topic');
    await expect(seminar.getByRole('heading', { level: 2 })).toContainText('ФинЦифра');
    await expect(seminar.getByText('IX Практический семинар')).toBeVisible();
    await expect(topics).toHaveCount(2);
    await expect(topics.locator('li')).toHaveCount(6);
    // Programme points must be visible immediately even on narrow screens.
    await expect(seminar.locator('details, .fincifra-seminar__toggle')).toHaveCount(0);
    for (const topic of await topics.all()) {
      await expect(topic.locator('li')).toHaveCount(3);
      await expect(topic.locator('li').first()).toBeVisible();
    }
    await expect(seminar.locator('.fincifra-seminar__host')).toHaveCount(2);
    for (const [name, filename] of [
      ['Андрей Емелин', 'assets/speakers/fincifra-andrey-emelin-photoroom.webp'],
      ['Иван Зимин', 'assets/speakers/fincifra-ivan-zimin-photoroom.webp'],
    ]) {
      const portrait = seminar.locator('.fincifra-seminar__portrait img[alt="' + name + '"]');
      const src = await portrait.getAttribute('src');
      expect(src).toContain('/' + filename);
      await expect
        .poll(() => portrait.evaluate((img) => img.complete && img.naturalWidth >= 250), {
          timeout: 10000,
        })
        .toBe(true);
      // The user's original portrait includes its intended blue background.
      // Never cut it out or add an independent CSS background underneath it.
      const imagePresentation = await portrait.evaluate((img) => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const context = canvas.getContext('2d');
        context.drawImage(img, 0, 0);
        const [red, green, blue, alpha] = context.getImageData(1, 1, 1, 1).data;
        const wrapperStyle = getComputedStyle(img.closest('.fincifra-seminar__portrait'));
        return {
          red,
          green,
          blue,
          alpha,
          background: wrapperStyle.backgroundColor,
          backgroundImage: wrapperStyle.backgroundImage,
        };
      });
      expect(imagePresentation.alpha).toBe(255);
      expect(imagePresentation.red).toBeLessThan(12);
      expect(imagePresentation.green).toBeGreaterThan(85);
      expect(imagePresentation.blue).toBeGreaterThan(235);
      expect(imagePresentation.background).toBe('rgba(0, 0, 0, 0)');
      expect(imagePresentation.backgroundImage).toBe('none');
    }
    await expect(seminar).toContainText('Андрей Емелин');
    await expect(seminar).toContainText('Иван Зимин');
    await expect(seminar).toContainText('12:30');
    await expect(seminar).toContainText('16:30');
    await expect(seminar).toContainText('(в рамках Форума DEBT TECH 2026)');
    await expect(seminar).toContainText('Малая сцена, Сессии 2 и 3');
    await expect(seminar).toContainText('13 ноября 2026');
    await expect(seminar).toContainText('Москва');

    // Every text shade is neutral white / cool grey, never turquoise or green.
    // Decorative separators, the teal programme surface and CTA are excluded.
    const textColorSamples = await seminar.evaluate((el) => {
      const selectors = [
        '.fincifra-seminar__eyebrow',
        '.fincifra-seminar__title',
        '.fincifra-seminar__context',
        '.fincifra-seminar__session',
        '.fincifra-seminar__schedule-location span',
        '.fincifra-seminar__schedule-location strong',
        '.fincifra-seminar__hours',
        '.fincifra-seminar__programme h3',
        '.fincifra-seminar__topic-heading h4',
        '.fincifra-seminar__number',
        '.fincifra-seminar__topic li',
        '.fincifra-seminar__hosts h3',
        '.fincifra-seminar__host-copy h4',
        '.fincifra-seminar__host-copy p',
        '.fincifra-seminar__label',
        '.fincifra-seminar__organizer-info span',
        '.fincifra-seminar__register .button-label',
        '.fincifra-seminar__offer-text',
        '.fincifra-seminar__offer-text a',
        '.fincifra-seminar__limit',
      ];
      return selectors.map((selector) => ({
        selector,
        color: getComputedStyle(el.querySelector(selector)).color,
      }));
    });
    for (const { selector, color } of textColorSamples) {
      const rgb = color.match(/\d+/g).map(Number);
      expect(
        rgb.slice(0, 3).every((channel) => channel >= 175),
        selector,
      ).toBe(true);
      // A white or cool-neutral shade may be slightly blue, but never greener than red.
      expect(rgb[1] - rgb[0], selector).toBeLessThanOrEqual(18);
      expect(rgb[2], selector).toBeGreaterThanOrEqual(rgb[1]);
    }

    // The approved tariff text must remain verbatim, with a real in-page link.
    const specialTariff = seminar.locator('.fincifra-seminar__offer-text');
    const tariffText = (await specialTariff.innerText()).replace(/\s+/g, ' ').trim();
    expect(tariffText).toBe(
      'Доступен спецтариф для членов НСФР: включает посещение деловой части форума и семинара «ФинЦифра»',
    );
    await expect(specialTariff.getByRole('link', { name: 'спецтариф' })).toHaveAttribute(
      'href',
      '#tariff-plans',
    );
    await expect(page.locator('#tariff-plans')).toHaveCount(1);

    const order = await page
      .locator('main > .section')
      .evaluateAll((nodes) => nodes.map((node) => node.id).filter(Boolean));
    expect(order.indexOf('fincifra-seminar')).toBe(order.indexOf('topics') + 1);
    expect(order.indexOf('speakers')).toBe(order.indexOf('fincifra-seminar') + 1);

    for (const path of [
      'assets/figma/review/support-nsfr.svg',
      'assets/images/organizer/rvz-logo.svg',
      'assets/figma/debtprice-logo.svg',
    ]) {
      const logo = seminar.locator('img[src$="' + path + '"]');
      await expect(logo).toHaveCount(1);
      const response = await page.request.get(await logo.getAttribute('src'));
      expect(response.ok()).toBe(true);
    }

    const geometry = await seminar.evaluate((node) => ({
      height: node.getBoundingClientRect().height,
      width: node.getBoundingClientRect().width,
      contentOverflows: [
        ...node.querySelectorAll(
          '.fincifra-seminar__panel, .fincifra-seminar__topic, .fincifra-seminar__host, .fincifra-seminar__offer',
        ),
      ].some((element) => element.scrollWidth > element.clientWidth + 2),
    }));
    expect(geometry.contentOverflows).toBe(false);
    // The new editorial section belongs on the existing star field, not
    // inside a solid oversized cobalt panel.
    const surfaceBackground = await seminar
      .locator('.fincifra-seminar__surface')
      .evaluate((element) => {
        const style = getComputedStyle(element);
        return { color: style.backgroundColor, image: style.backgroundImage };
      });
    expect(surfaceBackground.color).toBe('rgba(0, 0, 0, 0)');
    expect(surfaceBackground.image).toBe('none');

    // Match the existing FinCifra tariff visual language, not the topics palette.
    const theme = await seminar.locator('.fincifra-seminar__programme').evaluate((node) => {
      const s = getComputedStyle(node);
      const benefit = getComputedStyle(node.querySelector('.fincifra-seminar__topic li'));
      return {
        gradient: s.backgroundImage,
        feature: benefit.backgroundColor,
      };
    });
    // Requested white programme typography and white diamond bullets.
    const programmeWhite = await seminar
      .locator('.fincifra-seminar__programme')
      .evaluate((node) => {
        const firstRow = node.querySelector('.fincifra-seminar__topic li');
        return {
          heading: getComputedStyle(node.querySelector('h3')).color,
          topic: getComputedStyle(node.querySelector('h4')).color,
          row: getComputedStyle(firstRow).color,
          number: getComputedStyle(node.querySelector('.fincifra-seminar__number')).color,
          diamond: getComputedStyle(firstRow, '::before').backgroundColor,
        };
      });
    expect(Object.values(programmeWhite)).toEqual(Array(5).fill('rgb(255, 255, 255)'));

    const tariffTheme = await page.locator('.tariff--fincifra').evaluate((node) => {
      const s = getComputedStyle(node);
      return {
        gradient: s.backgroundImage,
        feature: getComputedStyle(node.querySelector('li')).backgroundColor,
      };
    });
    expect(theme.gradient).toBe(tariffTheme.gradient);
    expect(theme.feature).toBe(tariffTheme.feature);
    // Accommodate the approved full copy, larger partner logos and portrait photos.
    // Guard against runaway section growth without shrinking readable text.
    // The full six programme points are permanently expanded (including at 320px).
    expect(geometry.height).toBeLessThan(width < 600 ? 1270 : width < 1080 ? 950 : 815);

    if (width === 390 || width === 1440) {
      await page.evaluate(() => document.fonts.ready);
      await seminar.screenshot({
        path: 'test-results/fincifra-preview-' + width + '.png',
        animations: 'disabled',
        style: '.space-navigation--mobile, .skip-link { visibility: hidden !important; }',
      });
    }

    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 2)).toBe(
      false,
    );
    expect(errors).toEqual([]);

    // No duplicated price inside the event section. Price remains in the actual tariff.
    await expect(seminar.locator('.fincifra-seminar__price')).toHaveCount(0);
    await expect(seminar).not.toContainText('24 500 ₽');
    await expect(
      seminar.locator(
        '.fincifra-seminar__offer > .fincifra-seminar__register + .fincifra-seminar__offer-text',
      ),
    ).toHaveCount(1);

    const registerButton = seminar.getByRole('button', { name: 'Зарегистрироваться' });
    await expect(registerButton).toHaveClass(/\bbutton\b/);
    // Scope the turquoise tariff accent to this CTA: keep the global buttons blue.
    const registrationTheme = await registerButton.evaluate((button) => {
      const css = getComputedStyle(button);
      const arrow = button.querySelector('.action-arrow');
      return {
        background: css.backgroundImage,
        color: css.color,
        arrowWidth: Math.round(arrow.getBoundingClientRect().width),
      };
    });
    expect(registrationTheme.background).toContain('rgb(8, 127, 137)');
    expect(registrationTheme.background).toContain('rgb(12, 154, 162)');
    expect(registrationTheme.color).toBe('rgb(255, 255, 255)');
    expect(registrationTheme.arrowWidth).toBe(16);
    const labelHeight = await registerButton
      .locator('.button-label')
      .evaluate((node) => Math.round(node.getBoundingClientRect().height));
    expect(labelHeight).toBeLessThanOrEqual(25);
    await registerButton.click();
    const modal = page.locator('.form-dialog[data-tariff-id="fincifra"]');
    await expect(modal).toBeVisible();
    await expect(modal.locator('[name="participants_count"]')).toHaveAttribute('max', '2');
    await page.keyboard.press('Escape');
    await expect(modal).toHaveCount(0);
  });
}

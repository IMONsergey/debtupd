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
    await expect(seminar.locator('.fincifra-seminar__host')).toHaveCount(2);
    for (const [name, filename] of [
      ['Андрей Емелин', 'assets/speakers/fincifra-andrey-emelin.webp'],
      ['Иван Зимин', 'assets/speakers/fincifra-ivan-zimin.webp'],
    ]) {
      const portrait = seminar.locator('.fincifra-seminar__portrait img[alt="' + name + '"]');
      const src = await portrait.getAttribute('src');
      expect(src).toContain('/' + filename);
      await expect
        .poll(() => portrait.evaluate((img) => img.complete && img.naturalWidth >= 350), {
          timeout: 10000,
        })
        .toBe(true);
    }
    await expect(seminar).toContainText('Андрей Емелин');
    await expect(seminar).toContainText('Иван Зимин');
    await expect(seminar).toContainText('12:30');
    await expect(seminar).toContainText('16:30');
    await expect(seminar).toContainText('(в рамках Форума DEBT TECH 2026)');
    await expect(seminar).toContainText('13 ноября 2026');
    await expect(seminar).toContainText('Москва');

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

    if (width < 900) {
      await expect(topics.first()).not.toHaveAttribute('open');
      await topics.first().locator('summary').click();
      await expect(topics.first()).toHaveAttribute('open', '');
      await expect(topics.first().locator('li')).toHaveCount(3);
      await topics.first().locator('summary').click();
      await expect(topics.first()).not.toHaveAttribute('open');
    } else {
      await expect(topics.first()).toHaveAttribute('open', '');
      await expect(topics.last()).toHaveAttribute('open', '');
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
    // Accommodate the approved full copy, larger partner logos and portrait photos.
    // Guard against runaway section growth without shrinking readable text.
    expect(geometry.height).toBeLessThan(width < 600 ? 970 : width < 1080 ? 850 : 815);

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

    const registerButton = seminar.getByRole('button', { name: 'Зарегистрироваться' });
    await expect(registerButton).toHaveClass(/\bbutton\b/);
    if (width >= 1080) {
      const labelHeight = await registerButton
        .locator('.button-label')
        .evaluate((node) => Math.round(node.getBoundingClientRect().height));
      expect(labelHeight).toBeLessThanOrEqual(25);
    }
    await registerButton.click();
    const modal = page.locator('.form-dialog[data-tariff-id="fincifra"]');
    await expect(modal).toBeVisible();
    await expect(modal.locator('[name="participants_count"]')).toHaveAttribute('max', '2');
    await page.keyboard.press('Escape');
    await expect(modal).toHaveCount(0);
  });
}

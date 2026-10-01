import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.route('https://kinescope.io/**', (route) =>
    route.fulfill({ contentType: 'text/html', body: '<html><body>Video fixture</body></html>' }),
  );
  await page.addInitScript(() => sessionStorage.setItem('debt2026-early-booking-dismissed', '1'));
  // Never send test leads to production integrations.
  await page.route('**/api/lead', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true }),
    }),
  );
});

for (const width of [390, 1440]) {
  test(`Exhibition selection and application at ${width}px`, async ({ page }, testInfo) => {
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    await page.locator('#site-preloader').waitFor({ state: 'detached' });
    await page.evaluate(() => document.fonts.ready);
    const section = page.locator('#exhibition');
    await section.scrollIntoViewIfNeeded();
    await expect(section.locator('.exhibition-map-stand')).toHaveCount(24);
    await section.locator('.exhibition-photo img').scrollIntoViewIfNeeded();
    await expect(section.locator('.exhibition-photo img')).toHaveJSProperty('naturalWidth', 2048);
    const geometry = await section
      .locator('.exhibition-map-canvas')
      .evaluate((canvas) => ({ width: canvas.clientWidth, height: canvas.clientHeight }));
    expect(Math.abs(geometry.width / geometry.height - 2780 / 1591)).toBeLessThan(0.02);
    await section.getByRole('button', { name: 'Выбрать стенд 11', exact: true }).click();
    await expect(section.locator('[data-stand="11"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(section.getByRole('heading', { name: 'Стенд №11' })).toBeVisible();
    await expect(section.locator('output')).toHaveText('100%');
    await expect(section.locator('.exhibition-stand-detail')).toContainText(
      'Уточните возможность размещения и условия участия в выставке.',
    );

    // Stand selection never changes the camera automatically.
    await section
      .locator('.exhibition-map-card')
      .screenshot({ path: testInfo.outputPath(`exhibition-selection-${width}.png`) });
    await section.getByRole('button', { name: 'Выбрать стенд 11', exact: true }).click();
    await expect(section.getByRole('heading', { name: 'Найдите свою орбиту' })).toBeVisible();
    await section.getByRole('button', { name: 'Выбрать стенд 11', exact: true }).click();
    await page.keyboard.press('Escape');
    await expect(section.getByRole('heading', { name: 'Найдите свою орбиту' })).toBeVisible();

    await section.getByRole('tab', { name: '2-й этаж' }).click();
    await expect(section.locator('.exhibition-map-stand')).toHaveCount(3);
    await expect(section.locator('output')).toHaveText('100%');
    await section.getByRole('button', { name: 'Выбрать стенд 26', exact: true }).click();
    await expect(section.getByRole('heading', { name: 'Стенд №26' })).toBeVisible();
    await section
      .locator('.exhibition-stand-detail')
      .getByRole('button', { name: 'Стать партнером' })
      .click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('heading', { name: 'Партнерское участие' })).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Стать партнером' })).toBeVisible();
    await expect(dialog.locator('textarea[name=comment]')).toHaveValue(
      'Интересует стенд №26, 2-й этаж, выставка решений DEBT TECH 2026.',
    );
    await dialog
      .locator('textarea[name=comment]')
      .fill('Стенд №26, 2-й этаж. Требуется демонстрация продукта.');
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    // Direct map selection works as well as the mobile-friendly numbered list.
    await section.locator('[data-stand="25"]').click();
    await expect(section.getByRole('heading', { name: 'Стенд №25' })).toBeVisible();
    await section.getByRole('tab', { name: '2-й этаж' }).focus();
    await page.keyboard.press('ArrowLeft');
    await expect(section.getByRole('tab', { name: '1-й этаж' })).toBeFocused();
    await expect(section.locator('.exhibition-map-stand')).toHaveCount(24);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    expect(errors).toEqual([]);
    await section.screenshot({ path: testInfo.outputPath(`exhibition-${width}.png`) });
    await page.evaluate(() => {
      document.activeElement?.blur();
      const el = document.querySelector('#exhibition');
      window.scrollTo(0, el.getBoundingClientRect().top + scrollY - 24);
    });
    await page.screenshot({ path: testInfo.outputPath(`exhibition-intro-${width}.png`) });
    await section.locator('.exhibition-map-card').scrollIntoViewIfNeeded();
    await page.screenshot({ path: testInfo.outputPath(`exhibition-map-${width}.png`) });
  });
}

test('Small-screen cards and controls fit; all occupied stands have cards', async ({ page }) => {
  for (const width of [320, 768, 1024]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/#exhibition');
    await page.locator('#site-preloader').waitFor({ state: 'detached' });
    const section = page.locator('#exhibition');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    const clipped = await section
      .locator('h2,h3,h4,.button,.exhibition-tabs')
      .evaluateAll((els) =>
        els.filter((el) => el.scrollWidth > el.clientWidth + 2).map((el) => el.className),
      );
    expect(clipped).toEqual([]);
    const metricsFit = await section.locator('.exhibition-stats').evaluate((stats) => {
      const bounds = stats.getBoundingClientRect();
      const values = [...stats.querySelectorAll('strong')].map((el) => el.getBoundingClientRect());
      return (
        stats.scrollWidth <= stats.clientWidth + 1 &&
        values.every((rect) => rect.left >= bounds.left - 1 && rect.right <= bounds.right + 1) &&
        Math.abs(values[0].top - values[1].top) < 1
      );
    });
    expect(metricsFit).toBe(true);
    await expect(section.locator('.exhibition-company')).toHaveCount(11);
    await expect(
      section.locator('.exhibition-company__demo, .exhibition-company__stand svg'),
    ).toHaveCount(0);
    await expect(section.locator('.exhibition-map-point, .exhibition-stand-list i')).toHaveCount(0);
    await expect(section.locator('[data-occupied-stand]')).toHaveCount(11);
    await expect(section.locator('[data-occupied-stand="8"] .exhibition-occupied-shape')).toHaveCSS(
      'fill',
      'rgb(41, 53, 71)',
    );
    await expect(section.locator('.exhibition-legend')).toContainText('Регистрация');
    await expect(section.locator('.exhibition-legend')).toContainText('№ выставочного стенда');
    await expect(section.locator('.exhibition-legend')).toContainText('DOLG TALK CAFE');
  }
});

test('Map zoom uses only buttons; scrolling, panning and occupied statuses', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/#exhibition');
  await page.locator('#site-preloader').waitFor({ state: 'detached' });
  const section = page.locator('#exhibition');
  const view = section.locator('.exhibition-map-viewport');
  const canvas = section.locator('.exhibition-map-canvas');
  await view.scrollIntoViewIfNeeded();
  expect(await view.evaluate((el) => el.clientHeight)).toBeLessThanOrEqual(520);
  expect(
    await canvas.evaluate((el) => {
      const a = el.getBoundingClientRect(),
        b = el.parentElement.getBoundingClientRect();
      return (
        a.left >= b.left - 1 &&
        a.right <= b.right + 1 &&
        a.top >= b.top - 1 &&
        a.bottom <= b.bottom + 1
      );
    }),
  ).toBe(true);
  await expect(section.locator('.exhibition-map-stand[data-status="occupied"]')).toHaveCount(11);
  await expect(section.locator('[data-stand="8"]')).toBeEnabled();
  await expect(section.getByRole('button', { name: 'Стенд 8 забронирован' })).toHaveAttribute(
    'title',
    'Стенд забронирован',
  );
  const detail = section.locator('.exhibition-stand-detail');
  await section.getByRole('button', { name: 'Стенд 8 забронирован' }).click();
  await expect(detail.getByRole('heading', { name: 'Стенд №8' })).toBeVisible();
  await expect(detail.locator('.exhibition-stand-company')).toHaveText('ОРБИТА AI');
  await expect(detail.locator('.exhibition-stand-description')).toHaveText('Интеллектуальные решения для бизнеса');
  await expect(detail.getByRole('button')).toHaveCount(0);
  await section.locator('[data-stand="9"]').click();
  await expect(detail.getByRole('heading', { name: 'Стенд №9' })).toBeVisible();
  await expect(detail.locator('.exhibition-stand-company')).toHaveText('ВЕКТОР DATA');
  await expect(detail.locator('.exhibition-stand-description')).toHaveText('Аналитика и автоматизация процессов');
  await expect(detail.getByRole('button')).toHaveCount(0);
  await section.getByRole('button', { name: 'Выбрать стенд 11', exact: true }).click();
  await expect(section.locator('.exhibition-status')).toHaveText('Стенд свободен');
  await view.hover();
  const scrollBefore = await page.evaluate(() => scrollY);
  await page.mouse.wheel(0, 160);
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(scrollBefore);
  await expect(section.locator('output')).toHaveText('100%');
  await view.dispatchEvent('dblclick');
  await view.focus();
  await page.keyboard.press('+');
  await expect(section.locator('output')).toHaveText('100%');
  await section.getByRole('button', { name: 'Увеличить схему', exact: true }).click();
  await expect(section.locator('output')).toHaveText('150%');
  const box = await view.boundingBox();
  const before = await canvas.getAttribute('style');
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 - 90, box.y + box.height / 2 + 45, { steps: 12 });
  await page.mouse.up();
  await expect(canvas).not.toHaveAttribute('style', before);
  // Dragging must not change the chosen stand.
  await expect(section.getByRole('heading', { name: 'Стенд №11' })).toBeVisible();
  await section.getByRole('button', { name: 'Уменьшить схему', exact: true }).click();
  await expect(section.locator('output')).toHaveText('100%');
  await section.getByRole('button', { name: 'Увеличить схему', exact: true }).click();
  await section.getByRole('button', { name: 'Показать схему целиком', exact: true }).click();
  await expect(section.locator('output')).toHaveText('100%');
  await section.getByRole('tab', { name: '2-й этаж' }).click();
  await expect(section.locator('output')).toHaveText('100%');
  await expect(section.locator('.exhibition-map-stand[data-status="occupied"]')).toHaveCount(0);
  await expect(section.locator('.exhibition-legend')).toContainText('Лестница на 1-й и 3-й этажи');
  await expect(section.locator('.exhibition-legend')).not.toContainText('Регистрация');
  await expect(section.locator('[data-occupied-stand]')).toHaveCount(0);
});

test('Touch gestures pan without changing button-selected zoom', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#exhibition');
  await page.locator('#site-preloader').waitFor({ state: 'detached' });
  const view = page.locator('.exhibition-map-viewport');
  await view.scrollIntoViewIfNeeded();
  const box = await view.boundingBox();
  const send = (type, id, x, y) =>
    view.dispatchEvent(type, {
      pointerId: id,
      pointerType: 'touch',
      button: 0,
      clientX: box.x + x,
      clientY: box.y + y,
    });
  await page.getByRole('button', { name: 'Увеличить схему', exact: true }).click();
  // Synthetic pointers cannot obtain native capture; the map itself still receives each event.
  await send('pointerdown', 11, 100, 130);
  await send('pointerdown', 12, 200, 130);
  await send('pointermove', 11, 50, 130);
  await send('pointermove', 12, 250, 130);
  await expect(page.locator('.exhibition-zoom output')).toHaveText('150%');
  await send('pointerup', 12, 250, 130);
  const before = await page.locator('.exhibition-map-canvas').getAttribute('style');
  await send('pointermove', 11, 15, 180);
  await send('pointerup', 11, 15, 180);
  await expect(page.locator('.exhibition-map-canvas')).not.toHaveAttribute('style', before);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('Camera animates smoothly and respects reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/#exhibition');
  await page.locator('#site-preloader').waitFor({ state: 'detached' });
  const canvas = page.locator('.exhibition-map-canvas');
  const baseWidth = await canvas.evaluate((el) => el.getBoundingClientRect().width);
  const scale = () =>
    canvas.evaluate((el, base) => el.getBoundingClientRect().width / base, baseWidth);
  await page.getByRole('button', { name: 'Увеличить схему', exact: true }).click();
  await expect.poll(scale).toBeGreaterThan(1);
  await expect.poll(scale).toBeCloseTo(1.5, 2);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  // A fresh mount reads the accessibility preference.
  await page.reload();
  await page.locator('#site-preloader').waitFor({ state: 'detached' });
  await page.getByRole('button', { name: 'Увеличить схему', exact: true }).click();
  expect(await scale()).toBeCloseTo(1.5, 2);
});

test('Occupied stands are explicit, muted and non-actionable', async ({ page }) => {
  await page.goto('/#exhibition');
  await page.locator('#site-preloader').waitFor({ state: 'detached' });
  const section = page.locator('#exhibition');
  await expect(section.locator('.exhibition-toolbar')).toContainText('Стенд свободен');
  await expect(section.locator('.exhibition-toolbar')).toContainText('Стенд забронирован');
  await expect(section.locator('[data-occupied-stand]')).toHaveCount(11);
  const occupied = await section
    .locator('.exhibition-stand-list button[data-status="occupied"]')
    .allTextContents();
  expect(occupied).toEqual(['03', '04', '05', '06', '07', '08', '09', '10', '15', '16', '20']);
  await section.getByRole('button', { name: 'Стенд 8 забронирован' }).hover();
  await expect(section.getByRole('button', { name: 'Стенд 8 забронирован' })).toHaveAttribute(
    'data-tooltip',
    'Стенд забронирован',
  );
  await expect(section.locator('.exhibition-company')).toHaveCount(11);
  await expect(
    section.locator('.exhibition-company__demo, .exhibition-company__stand svg'),
  ).toHaveCount(0);
});

test('Restored company cards open reserved stand details without a booking CTA', async ({
  page,
}) => {
  await page.goto('/#exhibition');
  await page.locator('#site-preloader').waitFor({ state: 'detached' });
  const section = page.locator('#exhibition');
  const detail = section.locator('.exhibition-stand-detail');
  await section.getByRole('button', { name: 'Стенд №8', exact: true }).click();
  await expect(detail.getByRole('heading', { name: 'Стенд №8' })).toBeVisible();
  await expect(detail.locator('.exhibition-status')).toHaveText('Стенд забронирован');
  await expect(detail.locator('.exhibition-stand-company')).toContainText('ОРБИТА AI');
  await expect(detail).toContainText('Интеллектуальные решения для бизнеса');
  await expect(detail.getByRole('button')).toHaveCount(0);
  await expect(section.locator('[data-stand="8"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(section.locator('output')).toHaveText('100%');
  // The general partnership CTA never requests a previously selected reserved stand.
  await section
    .locator('.exhibition-intro')
    .getByRole('button', { name: 'Стать партнером' })
    .click();
  await expect(page.getByRole('dialog').locator('textarea[name=comment]')).toHaveValue(
    /Интересует участие в\sвыставке решений DEBT TECH 2026\./,
  );
  await page.keyboard.press('Escape');
  await section.getByRole('tab', { name: '2-й этаж' }).click();
  await expect(section.locator('.exhibition-company')).toHaveCount(11);
  await section.getByRole('button', { name: 'Стенд №9', exact: true }).click();
  await expect(section.getByRole('tab', { name: '1-й этаж' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await expect(detail.locator('.exhibition-stand-company')).toContainText('ВЕКТОР DATA');
  await section.getByRole('button', { name: 'Стенд №20', exact: true }).click();
  await expect(detail.getByRole('heading', { name: 'Стенд №20' })).toBeVisible();
  await expect(detail.locator('.exhibition-status')).toHaveText('Стенд забронирован');
  await expect(section.locator('.exhibition-exhibitors')).not.toContainText('Участие компаний не подтверждено');
  await expect(detail.getByRole('button')).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(detail.getByRole('heading', { name: 'Найдите свою орбиту' })).toBeVisible();
});

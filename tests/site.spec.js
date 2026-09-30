import { test, expect } from '@playwright/test';
const widths = [320, 360, 390, 430, 600, 768, 1024, 1180, 1181, 1280, 1440, 1920, 2048, 2560];
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem('debt2026-early-booking-dismissed', '1'));
  await page.route('https://kinescope.io/**', (route) =>
    route.fulfill({ contentType: 'text/html', body: '<html><body>Video fixture</body></html>' }),
  );
  await page.route('**/api/lead', (r) =>
    r.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ success: false, message: 'Тестовая отправка перехвачена.' }),
    }),
  );
});
for (const width of widths)
  test(`Responsive layout ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('/');
    await page.evaluate(() => document.fonts.ready);
    await expect(page.locator('.speaker')).toHaveCount(15);
    await expect(page.locator('.tariff')).toHaveCount(3);
    await expect(page.getByRole('heading', { name: /Тарифы\s*участия/ })).toBeVisible();
    const issues = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth > innerWidth,
      clipped: [
        ...document.querySelectorAll('h2,h3,.button,.speaker,.organizer-card,.participant-card'),
      ]
        .filter((e) => e.scrollWidth > e.clientWidth + 2)
        .map((e) => e.textContent),
      broken: [...document.images].filter((i) => i.complete && !i.naturalWidth).map((i) => i.src),
    }));
    expect(issues).toEqual({ overflow: false, clipped: [], broken: [] });
    expect(errors).toEqual([]);
    const section = page.locator('#participants');
    const h1 = (await section.boundingBox()).height;
    await page.getByRole('tab', { name: /Пространств/ }).click();
    await expect(page.locator('#panel-1')).toBeVisible();
    await expect(page.locator('#panel-0')).toHaveAttribute('inert', '');
    if (width >= 900) expect(Math.abs((await section.boundingBox()).height - h1)).toBeLessThan(2);
    else
      expect(
        await page.locator('#panel-0').evaluate((node) => getComputedStyle(node).display),
      ).toBe('none');
    const escapedDiscounts = await page.locator('.discount').evaluateAll(
      (nodes) =>
        nodes.filter((node) => {
          const card = node.getBoundingClientRect();
          const grid = node.parentElement.getBoundingClientRect();
          return card.left < grid.left - 1 || card.right > grid.right + 1;
        }).length,
    );
    expect(escapedDiscounts).toBe(0);
    if (width >= 900) {
      const photoTops = await page
        .locator('#panel-1 .participant-photo')
        .evaluateAll((nodes) => nodes.map((n) => n.getBoundingClientRect().top));
      expect(Math.max(...photoTops) - Math.min(...photoTops)).toBeLessThan(1);
    }
  });
test('Production mobile menu closes on Escape, outside click and navigation', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const trigger = page.getByRole('button', { name: 'Открыть меню' });
  const menu = page.getByRole('navigation', { name: 'Разделы сайта' });
  await trigger.click();
  await expect(menu).toBeVisible();
  await expect(menu.getByRole('link')).toHaveCount(9);
  await expect(menu.getByRole('link', { name: 'Ранняя регистрация' })).toHaveAttribute(
    'href',
    '#tariffs',
  );
  await page.keyboard.press('Escape');
  await expect(menu).toBeHidden();
  await expect(trigger).toBeFocused();
  await trigger.click();
  await page.locator('.hero-lead p').click();
  await expect(menu).toBeHidden();
  await trigger.click();
  await menu.getByRole('link', { name: 'Тарифы', exact: true }).click();
  await expect(menu).toBeHidden();
  await expect
    .poll(() =>
      page.evaluate(() =>
        Math.abs(document.querySelector('#tariffs').getBoundingClientRect().top - 80),
      ),
    )
    .toBeLessThan(3);
});
async function openRegistration(page) {
  await page.goto('/?utm_source=qa&utm_campaign=local');
  await page.locator('.tariff--business').getByRole('button', { name: 'Принять участие' }).click();
  const form = page.locator('#early-registration-form');
  await form.locator('[name="full_name"]').fill('Проверка интерфейса');
  await form.locator('[name="company"]').fill('Тест без отправки');
  await form.locator('[name="phone"]').fill('+7 999 111 22 33');
  await form.locator('[name="email"]').fill('qa@example.test');
  return form;
}
test('Consent is required, valid registration preserves tariff and attribution', async ({
  page,
}) => {
  let calls = [];
  await page.unroute('**/api/lead');
  await page.route('**/api/lead', (r) => {
    calls.push(r.request().postDataJSON());
    return r.fulfill({ json: { success: true, deal_id: 123 } });
  });
  const form = await openRegistration(page);
  await form.getByRole('button', { name: 'Отправить заявку' }).click();
  expect(calls).toHaveLength(0);
  await form.locator('[name="consent"]').check();
  await form.getByRole('button', { name: 'Отправить заявку' }).click();
  await expect(page.getByText('Спасибо! Заявка отправлена')).toBeVisible();
  expect(calls).toHaveLength(1);
  expect(calls[0]).toMatchObject({
    form_id: 'early-registration-form',
    event_id: 'debt-tech-2026',
    tariff_id: 'business',
    consent: true,
    utm_source: 'qa',
    utm_campaign: 'local',
  });
});
for (const response of [
  { name: '500', status: 500, body: '{"success":false}' },
  { name: 'false success', status: 200, body: '{"success":false}' },
  { name: 'HTML fallback', status: 200, body: '<!doctype html><p>Not an API</p>' },
])
  test(`No false success on ${response.name}`, async ({ page }) => {
    await page.unroute('**/api/lead');
    await page.route('**/api/lead', (r) =>
      r.fulfill({ status: response.status, body: response.body, contentType: 'application/json' }),
    );
    const form = await openRegistration(page);
    await form.locator('[name="consent"]').check();
    await form.getByRole('button', { name: 'Отправить заявку' }).click();
    await expect(form.locator('.form-feedback')).not.toBeEmpty();
    await expect(page.getByText('Спасибо! Заявка отправлена')).toHaveCount(0);
    await expect(form.locator('[name="full_name"]')).toHaveValue('Проверка интерфейса');
    await expect(form.getByRole('button', { name: 'Отправить заявку' })).toBeEnabled();
  });
test('Corporate calculation uses ticket-specific discounts after confirmed delivery', async ({
  page,
}) => {
  let sent;
  await page.unroute('**/api/lead');
  await page.route('**/api/lead', (r) => {
    sent = r.request().postDataJSON();
    return r.fulfill({ json: { success: true } });
  });
  await page.goto('/');
  await expect(page.locator('#site-preloader')).toHaveCount(0, { timeout: 12000 });
  const form = page.locator('#corporate-package-form');
  await form.locator('[name="participants_count"]').fill('5');
  await form.locator('select').selectOption('business');
  await form.locator('[name="full_name"]').fill('Тест без отправки');
  await form.locator('[name="phone"]').fill('+79991112233');
  await form.locator('[name="consent"]').check();
  await form.getByRole('button', { name: 'Рассчитать стоимость' }).click();
  await expect(form.getByText('Заявка отправлена', { exact: true })).toBeVisible();
  await expect(form.getByText(/202\s*400/)).toBeVisible();
  expect(sent).toMatchObject({
    form_id: 'corporate-package-form',
    participants_count: '5',
    tariff_id: 'business',
    consent: true,
  });
});
test('Stand form retains the production payload contract', async ({ page }) => {
  let sent;
  await page.unroute('**/api/lead');
  await page.route('**/api/lead', (r) => {
    sent = r.request().postDataJSON();
    return r.fulfill({ json: { success: true } });
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/');
  await page.locator('.fixed-menu').getByRole('button', { name: 'Забронировать стенд' }).click();
  const form = page.locator('#stand-booking-form');
  for (const [key, val] of Object.entries({
    full_name: 'Тест интерфейса',
    company: 'Тест без отправки',
    phone: '+79991112233',
    email: 'qa@example.test',
    job_title: 'Тест',
    comment: 'Локальный тест',
  }))
    await form.locator(`[name="${key}"]`).fill(val);
  await form.locator('[name="consent"]').check();
  await form.getByRole('button', { name: 'Отправить заявку' }).click();
  await expect(page.getByText('Спасибо! Заявка отправлена')).toBeVisible();
  expect(sent).toMatchObject({
    form_id: 'stand-booking-form',
    job_title: 'Тест',
    comment: 'Локальный тест',
  });
});
test('Video loads on demand; gallery and conference controls work', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.route('https://kinescope.io/**', (r) =>
    r.fulfill({ body: '<p>Video embed intercepted</p>', contentType: 'text/html' }),
  );
  await page.goto('/');
  await expect(page.locator('.media-dialog iframe')).toHaveCount(0);
  await page.locator('.fixed-menu').getByRole('button', { name: 'Открыть видео' }).click();
  await expect(page.locator('.media-dialog iframe')).toHaveAttribute(
    'src',
    /dd7dQ3BMbTCeSfteZFXCiS/,
  );
  await page.keyboard.press('Escape');
  await expect(page.locator('.media-dialog iframe')).toHaveCount(0);
  await page.locator('.fixed-menu').getByRole('link', { name: 'Кадры с DEBT TECH 2025' }).click();
  await expect(page.locator('.gallery-controls')).toContainText('1 / 20');
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('.gallery-controls')).toContainText('2 / 20');
  await page.keyboard.press('Escape');
  const activeConference = page.locator('.conference-link-card.is-active');
  const before = await activeConference.getAttribute('href');
  await page.getByRole('button', { name: 'Следующая конференция' }).click();
  await expect(activeConference).not.toHaveAttribute('href', before);
  await page.getByRole('button', { name: 'Предыдущая конференция' }).click();
  await expect(activeConference).toHaveAttribute('href', before);
});

test('Artwork keeps its natural proportions and CTA styles stay unified', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(async () => {
    document.querySelectorAll('img').forEach((img) => {
      img.loading = 'eager';
    });
    await Promise.all([...document.images].map((img) => img.decode().catch(() => {})));
  });
  for (const width of [320, 390, 768, 1181, 1440, 2048, 2560]) {
    await page.setViewportSize({ width, height: 1000 });
    const distorted = await page.evaluate(() =>
      [...document.images]
        .filter(
          (img) =>
            img.offsetWidth &&
            img.offsetHeight &&
            img.naturalWidth &&
            getComputedStyle(img).objectFit === 'fill' &&
            Math.abs(
              img.offsetWidth / img.offsetHeight / (img.naturalWidth / img.naturalHeight) - 1,
            ) > 0.025,
        )
        .map((img) => img.getAttribute('src')),
    );
    expect(distorted, `Stretched artwork at ${width}px`).toEqual([]);
    const variants = await page.locator('.button, .fixed-menu__cta').evaluateAll((nodes) => [
      ...new Set(
        nodes
          .filter((n) => n.offsetWidth)
          .map((n) => {
            const c = getComputedStyle(n);
            return JSON.stringify([
              c.backgroundImage,
              c.backgroundColor,
              c.borderRadius,
              c.fontSize,
              c.fontWeight,
              c.minHeight,
            ]);
          }),
      ),
    ]);
    expect(variants.length).toBeLessThanOrEqual(2);
  }
});

test('Archive cards stay centered after resize and wrap in both directions', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/');
  const active = page.locator('.conference-link-card.is-active');
  await page.getByRole('button', { name: 'Предыдущая конференция' }).click();
  await expect(active).toContainText('2021');
  await page.setViewportSize({ width: 390, height: 844 });
  await expect
    .poll(async () => {
      const card = await active.boundingBox();
      const viewport = await page.locator('.other-conferences-carousel__viewport').boundingBox();
      return Math.abs(card.x + card.width / 2 - viewport.x - viewport.width / 2);
    })
    .toBeLessThan(2);
  await page.getByRole('button', { name: 'Следующая конференция' }).click();
  await expect(active).toContainText('DOLG TALK Казань');
  await expect(active).toContainText('2026');
});
test('Reduced motion and preview analytics isolation', async ({ page }) => {
  await page.goto('/');
  expect(
    await page
      .locator('.cosmos i')
      .first()
      .evaluate((n) => getComputedStyle(n).animationName),
  ).toBe('none');
  expect(await page.evaluate(() => typeof window.ym)).toBe('undefined');
});

test('Card copy never overflows vertically across breakpoint boundaries', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
  for (const width of [
    320, 359, 390, 599, 600, 699, 768, 849, 850, 899, 900, 1024, 1180, 1181, 1440, 1920, 2560,
  ]) {
    await page.setViewportSize({ width, height: 900 });
    const clipped = await page
      .locator('.organizer-card,.service-copy,.speaker-info,.tariff,.topic-card,.about-copy')
      .evaluateAll((nodes) =>
        nodes
          .filter((node) => node.offsetWidth && node.scrollHeight > node.clientHeight + 3)
          .map((node) => ({ class: node.className, text: node.textContent.slice(0, 80) })),
      );
    expect(clipped, `Vertical clipping at ${width}px`).toEqual([]);
  }
});

test('The complete astronaut enters with the tariff section, not above its anchor', async ({
  page,
}) => {
  await page.goto('/');
  for (const width of [320, 390, 600, 768, 1180, 1181, 1440, 1920, 2560]) {
    await page.setViewportSize({ width, height: 900 });
    const geometry = await page.evaluate(() => {
      const art = document.querySelector('.tariff-astronaut').getBoundingClientRect();
      const heading = document.querySelector('.tariffs-heading').getBoundingClientRect();
      return { top: art.top - heading.top, width: art.width, height: art.height };
    });
    expect(
      geometry.top,
      `Astronaut cropped above tariff anchor at ${width}px`,
    ).toBeGreaterThanOrEqual(-2);
    expect(geometry.width / geometry.height).toBeCloseTo(1046 / 1082, 2);
  }
});

test('Large-screen about photography retains the original crop ratio', async ({ page }) => {
  await page.goto('/');
  for (const width of [1181, 1440, 1920, 2560]) {
    await page.setViewportSize({ width, height: 960 });
    const box = await page.locator('.about-photo').boundingBox();
    expect(box.width / box.height).toBeCloseTo(539 / 479, 2);
  }
});

test('Sidebar video requests muted background autoplay and preserves its poster fallback', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  const frame = page.locator('.desktop-sidebar-video iframe');
  await expect(frame).toHaveCount(1);
  const url = new URL(await frame.getAttribute('src'));
  for (const key of ['autoplay', 'muted', 'loop', 'background'])
    expect(url.searchParams.get(key)).toBe('true');
  expect(await frame.getAttribute('allow')).toContain('autoplay');
  await expect(page.locator('.desktop-sidebar-video__poster')).toHaveCount(1);
});

test('Network failures preserve the application and provide a Russian recovery message', async ({
  page,
}) => {
  await page.unroute('**/api/lead');
  await page.route('**/api/lead', (route) => route.abort('failed'));
  const form = await openRegistration(page);
  await form.locator('[name="consent"]').check();
  await form.getByRole('button', { name: 'Отправить заявку' }).click();
  await expect(form.locator('.form-feedback')).toContainText('Данные не отправлены');
  await expect(form.locator('[name="full_name"]')).toHaveValue('Проверка интерфейса');
  await expect(form.getByRole('link', { name: /Связаться с организатором/ })).toBeVisible();
  await expect(page.getByText('Спасибо! Заявка отправлена')).toHaveCount(0);
});

test('Phone inputs and contact buttons remain usable on narrow screens', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto('/');
  expect(
    await page
      .locator('.corporate-form input[name="phone"]')
      .evaluate((node) => parseFloat(getComputedStyle(node).fontSize)),
  ).toBeGreaterThanOrEqual(16);
  const contacts = await page.locator('.contact-grid .channels a').evaluateAll((nodes) =>
    nodes.map((node) => {
      const rect = node.getBoundingClientRect();
      return [rect.width, rect.height];
    }),
  );
  expect(contacts.length).toBeGreaterThan(0);
  for (const [width, height] of contacts) {
    expect(width).toBeGreaterThanOrEqual(44);
    expect(height).toBeGreaterThanOrEqual(44);
  }
  const title = await page.locator('.partners .section-title').boundingBox();
  const decoration = await page.locator('.partners-satellite').boundingBox();
  expect(decoration.y).toBeGreaterThan(title.y + title.height);
});

test('Responsive grid cards do not collide when their intrinsic height changes', async ({
  page,
}) => {
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
  for (const width of [320, 390, 430, 599, 600, 768, 1024, 1181, 1440, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    const overlapping = await page.evaluate(() => {
      const issues = [];
      for (const grid of document.querySelectorAll(
        '.partners-grid,.audience-grid,.speakers-grid,.organizer-grid,.topics-grid',
      )) {
        const cards = [...grid.children].filter(
          (card) => card.offsetWidth && !card.classList.contains('empty-cell'),
        );
        for (let i = 0; i < cards.length; i++)
          for (let j = i + 1; j < cards.length; j++) {
            const a = cards[i].getBoundingClientRect(),
              b = cards[j].getBoundingClientRect();
            if (
              Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 &&
              Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1
            )
              issues.push({ grid: grid.className, first: i, second: j });
          }
      }
      return issues;
    });
    expect(overlapping, `Overlapping cards at ${width}px`).toEqual([]);
  }
});

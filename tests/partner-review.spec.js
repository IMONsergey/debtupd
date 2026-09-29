import { test, expect } from '@playwright/test';
const dismiss = () => sessionStorage.setItem('debt2026-early-booking-dismissed', '1');
test.beforeEach(async ({ page }) => {
  await page.addInitScript(dismiss);
  await page.route('**/api/lead', (route) => route.abort());
  await page.route('https://kinescope.io/**', (route) =>
    route.fulfill({ body: '<body></body>', contentType: 'text/html' }),
  );
});
async function ready(page, width = 390) {
  await page.setViewportSize({ width, height: 844 });
  await page.goto('/');
  await expect(page.locator('#site-preloader')).toHaveCount(0, { timeout: 12000 });
  await page.evaluate(() => document.fonts.ready);
}
test('The mobile first screen includes a compact support row and consecutive registration actions', async ({
  page,
}) => {
  await ready(page);
  const row = await page.locator('.hero-supporters').boundingBox();
  expect(row.y + row.height).toBeLessThan(844);
  expect(row.height).toBeLessThan(110);
  const first = await page.locator('.hero-register').boundingBox(),
    second = await page.locator('.hero-stand').boundingBox();
  expect(second.y - first.y - first.height).toBeGreaterThanOrEqual(10);
  expect(second.width).toBe(first.width);
  await page.locator('.hero-stand').click();
  await expect(page.getByRole('dialog')).toContainText('Забронировать стенд');
  await expect(
    page.locator('.mobile-info').getByRole('button', { name: 'Забронировать стенд' }),
  ).toHaveCount(0);
});
test('Phone program cards hug text instead of reserving large blank bodies', async ({ page }) => {
  await ready(page);
  for (const width of [320, 390, 430]) {
    await page.setViewportSize({ width, height: 844 });
    for (const mode of [0, 1]) {
      await page.locator('#tab-' + mode).click();
      const blanks = await page
        .locator('#panel-' + mode + ' .participant-copy')
        .evaluateAll((nodes) =>
          nodes.map((node) => {
            const child = node.lastElementChild;
            return node.getBoundingClientRect().bottom - child.getBoundingClientRect().bottom;
          }),
        );
      expect(blanks.every((gap) => gap <= 32)).toBe(true);
    }
  }
  await page.locator('#tab-0').click();
  await expect(page.locator('#panel-0 .participant-card').first()).toContainText('800');
  await expect(page.locator('#panel-0 .participant-card').nth(1)).toContainText('150');
});
test('Space card labels are whole words and activity strips are uppercase', async ({ page }) => {
  await ready(page, 1440);
  await page.locator('#tab-1').click();
  const heading = await page.locator('#panel-1').textContent();
  expect(heading).not.toContain('\u00ad');
  expect(
    await page
      .locator('#panel-1 li')
      .first()
      .evaluate((node) => getComputedStyle(node).textTransform),
  ).toBe('uppercase');
  expect(
    await page
      .locator('#panel-1 li .brand-slash')
      .first()
      .evaluate((node) => getComputedStyle(node).backgroundImage),
  ).toContain('gradient');
});
test('All 15 approved speakers are present in the requested order with 3x assets', async ({
  page,
}) => {
  await ready(page, 1440);
  await expect(page.locator('.speaker')).toHaveCount(15);
  const names = await page.locator('.speaker h3').allTextContents();
  expect(names[2]).toContain('Емелин');
  expect(names[3]).toContain('Пустовит');
  expect(names[13]).toContain('Уткина');
  expect(names[14]).toContain('Каюмов');
  const portraits = await page
    .locator('.speaker-portrait img')
    .evaluateAll((nodes) =>
      nodes.map((node) => ({ width: node.width, source: node.getAttribute('src') })),
    );
  expect(portraits.every((item) => item.source.includes('speaker-hd-'))).toBe(true);
  const speaker = page.locator('.speaker').first();
  await speaker.hover();
  expect(await speaker.evaluate((node) => getComputedStyle(node).borderTopWidth)).toBe('0px');
  expect(await speaker.evaluate((node) => getComputedStyle(node).boxShadow)).toBe('none');
});
test('Speaker carousel moves by controls and keyboard, reaches the final profile and can expand', async ({
  page,
}) => {
  await ready(page);
  await page.locator('#speakers').scrollIntoViewIfNeeded();
  const next = page.getByRole('button', { name: 'Следующий спикер' });
  await next.click();
  await expect(page.locator('.speakers-controls>span')).toContainText('02');
  await page.locator('.speakers-grid').focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('.speakers-controls>span')).toContainText('03');
  await page
    .locator('.speakers-grid')
    .evaluate((node) => node.scrollTo({ left: node.scrollWidth, behavior: 'instant' }));
  await expect(page.locator('.speakers-controls>span')).toContainText('15');
  await page.getByRole('button', { name: 'Показать всех спикеров' }).click();
  await expect(page.locator('.speaker-collection')).toHaveClass(/is-expanded/);
  await expect(page.getByRole('button', { name: 'Вернуть слайдер' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
});
test('Both running strips move when motion is allowed', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await ready(page, 1440);
  const first = await page
    .locator('main>.ticker .ticker-track')
    .evaluate((node) => getComputedStyle(node).transform);
  await page.waitForTimeout(400);
  const next = await page
    .locator('main>.ticker .ticker-track')
    .evaluate((node) => getComputedStyle(node).transform);
  expect(first).not.toBe(next);
  await page.locator('.about .ticker').scrollIntoViewIfNeeded();
  expect(
    await page
      .locator('.about .ticker-track')
      .evaluate((node) => getComputedStyle(node).animationPlayState),
  ).toBe('running');
});
test('Each tariff opens its own named dialog and retains its approved price', async ({ page }) => {
  await ready(page, 1440);
  for (const [id, title, price] of [
    ['business', 'Деловой', '44 000'],
    ['full', 'Полный', '49 000'],
    ['full-plus', 'Полный Plus', '66 000'],
  ]) {
    await page
      .locator('.tariff--' + id)
      .getByRole('button', { name: 'Принять участие' })
      .click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toHaveAttribute('data-tariff-id', id);
    await expect(dialog.locator('#application-title')).toContainText(title);
    await expect(dialog.locator('.selected-tariff')).toContainText(price);
    await page.keyboard.press('Escape');
  }
  expect(await page.locator('.tariff-bottom>span').first().textContent()).toBe('Стоимость*');
});
test('Organizer channels include approved WhatsApp and the required contact label', async ({
  page,
}) => {
  await ready(page, 1440);
  await expect(page.locator('.organizer-contact>.eyebrow')).toHaveText('Контакты для связи');
  await expect(page.locator('.organizer-contact a[href="https://wa.me/79657868846"]')).toHaveCount(
    1,
  );
});
test('Mobile accreditation, contact panels, privacy and footer share a compact grid', async ({
  page,
}) => {
  await ready(page);
  const a = await page.locator('.press-contact').boundingBox(),
    section = await page.locator('#contacts').boundingBox();
  expect(Math.abs(a.width - section.width)).toBeLessThan(2);
  expect(Math.abs(a.x - section.x)).toBeLessThan(2);
  await expect(page.locator('.legal>a br')).toHaveCount(0);
  const legal = await page.locator('.legal').boundingBox(),
    footer = await page.locator('.footer-scene').boundingBox();
  expect(footer.height).toBeLessThanOrEqual(430);
  expect(footer.y - legal.y - legal.height).toBeLessThan(48);
  await expect(page.locator('.legal img')).toHaveAttribute('src', /legal-logo.svg$/);
});

test('Tablet speaker carousel reaches the last profile and long program words fit their text half', async ({
  page,
}) => {
  await ready(page, 600);
  for (const width of [600, 768, 899]) {
    await page.setViewportSize({ width, height: 900 });
    await page.locator('#tab-1').click();
    const clipping = await page
      .locator('#panel-1 h3')
      .evaluateAll((nodes) =>
        nodes
          .filter((node) => node.scrollWidth > node.clientWidth + 2)
          .map((node) => node.textContent),
      );
    expect(clipping, `Long words at ${width}px`).toEqual([]);
    const track = page.locator('.speakers-grid');
    await track.focus();
    await page.keyboard.press('End');
    await expect(page.locator('.speakers-controls>span')).toContainText('15');
    await expect(page.getByRole('button', { name: 'Следующий спикер' })).toBeDisabled();
    await expect
      .poll(() =>
        track.evaluate((node) =>
          Math.abs(
            node.scrollLeft -
              (node.lastElementChild.offsetLeft - node.firstElementChild.offsetLeft),
          ),
        ),
      )
      .toBeLessThan(2);
    await page.keyboard.press('Home');
    await expect(page.locator('.speakers-controls>span')).toContainText('01');
  }
});

test('Rapid speaker controls with motion enabled preserve the intended target', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await ready(page, 390);
  const next = page.getByRole('button', { name: 'Следующий спикер' });
  await next.scrollIntoViewIfNeeded();
  for (let n = 0; n < 4; n++) await next.click();
  await expect(page.locator('.speakers-controls>span')).toContainText('05');
  await page.waitForTimeout(800);
  await expect(page.locator('.speakers-controls>span')).toContainText('05');
  expect(
    await page
      .locator('.speakers-grid')
      .evaluate((node) =>
        Math.abs(
          node.scrollLeft - (node.children[4].offsetLeft - node.firstElementChild.offsetLeft),
        ),
      ),
  ).toBeLessThan(2);
});

test('Narrow-screen cards stay inside their grid and the status illustration leaves the text clear', async ({
  page,
}) => {
  await ready(page, 320);
  for (const width of [320, 360, 390, 430, 600, 768, 899]) {
    await page.setViewportSize({ width, height: 900 });
    const escaped = await page.evaluate(() => {
      const issues = [];
      for (const grid of document.querySelectorAll(
        '.topics-grid,.audience-grid,.partners-grid,.organizer-grid,.contact-grid',
      )) {
        const box = grid.getBoundingClientRect();
        for (const node of grid.children) {
          const child = node.getBoundingClientRect();
          if (child.width && (child.left < box.left - 1 || child.right > box.right + 1))
            issues.push(node.className);
        }
      }
      return issues;
    });
    expect(escaped, `${width}px grid containment`).toEqual([]);
    const text = await page.locator('.speakers-note>span').boundingBox(),
      art = await page.locator('.speakers-note-art').boundingBox();
    expect(text.x + text.width, `${width}px banner text`).toBeLessThanOrEqual(art.x);
    expect(
      await page
        .locator('.speakers-note>span')
        .evaluate((node) => node.scrollWidth > node.clientWidth + 1),
    ).toBe(false);
  }
});

test('Program titles fit the real content column with reserved scrollbars across tablet boundaries', async ({
  page,
}) => {
  await ready(page, 1024);
  await page.addStyleTag({
    content: 'html{overflow-y:scroll;scrollbar-gutter:stable}::-webkit-scrollbar{width:15px}',
  });
  for (const width of [320, 360, 390, 430, 600, 768, 899, 900, 1024, 1180, 1181, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.locator('#tab-1').click();
    const clipping = await page
      .locator('#panel-1 h3')
      .evaluateAll((nodes) =>
        nodes
          .filter((node) => node.scrollWidth > node.clientWidth + 2)
          .map((node) => node.textContent),
      );
    expect(clipping, `${width}px reserved scrollbar`).toEqual([]);
  }
});

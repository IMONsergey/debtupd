import { test, expect } from '@playwright/test';

const events = [
  ['09:00–10:00', 'Регистрация участников и приветственный фуршет'],
  ['10:00–10:15', 'Торжественное открытие форума'],
  ['12:00–12:30', 'Кофе-брейк'],
  ['14:00–15:00', 'Обед'],
  ['16:30–17:00', 'Кофе-брейк'],
];

test.beforeEach(async ({ page }) => {
  await page.route('**/api/lead', (route) => route.abort());
  await page.route('https://kinescope.io/**', (route) =>
    route.fulfill({ contentType: 'text/html', body: '<html></html>' }),
  );
});

for (const width of [320, 390, 600, 768, 1024, 1440, 1920]) {
  test('full forum programme is readable and interactive at ' + width + 'px', async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/#prog', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#site-preloader')).toHaveCount(0, { timeout: 20000 });
    const section = page.locator('#prog');
    await section.scrollIntoViewIfNeeded();

    await expect(section.getByRole('heading', {
      name: /Деловая программа форума-выставки DEBT TECH 2026 ВСЕЛЕННАЯ ТЕХНОЛОГИЙ/,
    })).toBeVisible();
    // The CMS has no public navigation entry: it is opened only by direct URL.
    await expect(page.locator('a[href*="programme-admin"]')).toHaveCount(0);
    await expect(section.getByRole('tab')).toHaveCount(3);
    await expect(section.getByRole('tab', { name: /Большая сцена/ })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await expect(section.getByRole('tab', { name: /Малая сцена/ })).toContainText(
      'Программа уточняется',
    );
    await expect(section.getByRole('tab', { name: /Продуктовая сцена/ })).toContainText(
      'Программа уточняется',
    );

    await expect(section.locator('.forum-programme__event')).toHaveCount(5);
    for (const [index, [time, label]] of events.entries()) {
      const event = section.locator('.forum-programme__event').nth(index);
      await expect(event).toContainText(time);
      await expect(event).toContainText(label);
    }
    await expect(section.locator('.forum-programme__session')).toHaveCount(4);
    await expect(section.locator('.forum-programme__session--open')).toHaveCount(0);
    await expect(section.locator('.forum-programme__session-toggle[aria-expanded="false"]')).toHaveCount(4);

    const session1 = section.locator('[data-session-id="session-1"]');
    await session1.locator('.forum-programme__session-toggle').click();
    await expect(session1.locator('.forum-programme__session-toggle')).toHaveAttribute('aria-expanded', 'true');
    await expect(session1.locator('.forum-programme__talk')).toHaveCount(3);
    await expect(session1.locator('.forum-programme__talk-kicker')).toHaveText([
      'Тема выступления:',
      'Тема выступления:',
      'Тема выступления:',
    ]);
    const readingOrder = await session1
      .locator('.forum-programme__talk')
      .first()
      .evaluate((row) => {
        const label = row.querySelector('.forum-programme__talk-kicker').getBoundingClientRect();
        const title = row
          .querySelector('.forum-programme__talk-content h4')
          .getBoundingClientRect();
        const speakers = row.querySelector('.forum-programme__talk-people').getBoundingClientRect();
        return {
          kickerBeforeTitle: label.top < title.top,
          topicBeforeSpeakers: innerWidth < 700 || title.right <= speakers.left,
        };
      });
    expect(readingOrder).toEqual({ kickerBeforeTitle: true, topicBeforeSpeakers: true });
    await expect(session1).toContainText('Андрей Емелин');
    await expect(session1).toContainText('Владимир Вербицкий');
    await expect(session1).toContainText('Константин Виноградов');
    await expect(session1).toContainText('Валерий Зоткин');
    await expect(session1).toContainText('Спикеры от госорганов приглашены');
    await expect(session1.locator('.forum-programme__session-moderator .forum-programme__person-label')).toHaveText('Модератор');
    await expect(session1.locator('.forum-programme__talk-people .forum-programme__person-label')).toHaveText([
      'Спикер', 'Спикеры', 'Спикер',
    ]);
    await expect(session1).not.toContainText('Формулировка на согласовании');
    const emphasis = await session1.locator('.forum-programme__session-kind').evaluate((node) => {
      const css = getComputedStyle(node);
      return { font: parseFloat(css.fontSize), border: parseFloat(css.borderLeftWidth) };
    });
    expect(emphasis.font).toBeGreaterThanOrEqual(11);
    expect(emphasis.border).toBeGreaterThanOrEqual(2);
    const invitation = await session1.locator('.forum-programme__invited').evaluate((node) => {
      const css = getComputedStyle(node);
      return { font: parseFloat(css.fontSize), border: parseFloat(css.borderTopWidth) };
    });
    expect(invitation.font).toBeGreaterThanOrEqual(13);
    expect(invitation.border).toBeGreaterThanOrEqual(1);
    const photoColumns = await session1.evaluate((session) => {
      const moderator = session.querySelector(
        '.forum-programme__session-moderator .forum-programme__portrait',
      );
      const speaker = session.querySelector('.forum-programme__talk .forum-programme__portrait');
      return {
        moderatorX: moderator.getBoundingClientRect().x,
        speakerX: speaker.getBoundingClientRect().x,
        moderatorWidth: moderator.getBoundingClientRect().width,
        speakerWidth: speaker.getBoundingClientRect().width,
      };
    });
    expect(Math.abs(photoColumns.moderatorX - photoColumns.speakerX)).toBeLessThanOrEqual(1);
    expect(photoColumns.moderatorWidth).toBe(photoColumns.speakerWidth);

    const session2 = section.locator('[data-session-id="session-2"]');
    await session2.locator('.forum-programme__session-toggle').click();
    await expect(session1.locator('.forum-programme__session-toggle')).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    await expect(session2.locator('.forum-programme__session-toggle')).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    await expect(session2.locator('.forum-programme__talk')).toHaveCount(4);
    const shared = session2.locator('[data-talk-id="ai-epifanov"]');
    await expect(shared).toContainText('Василий Епифанов');
    await expect(shared).toContainText('Александр Митрохин');
    await expect(shared).toContainText('Урегулирование как цифровой сервис: от контакта до решения вопроса');
    await expect(shared.locator('.forum-programme__person')).toHaveCount(2);
    await expect(shared.locator('.forum-programme__person-label')).toHaveText('Спикеры');
    await expect(session2.locator('[data-talk-id="ai-mitrokhin"]')).toHaveCount(0);
    await expect(session2).toContainText('Заместитель генерального директора в финтех-группе «Свой»');
    for (const name of [
      'Илья Курцев',
      'Василий Епифанов',
      'Александр Митрохин',
      'Максим Лифенцев',
      'Андрей Заневский',
    ]) {
      await expect(session2).toContainText(name);
    }
    await expect(session2).not.toContainText('Тема в документе не указана');

    const session3 = section.locator('[data-session-id="session-3"]');
    await session3.locator('.forum-programme__session-toggle').click();
    await expect(session3.locator('.forum-programme__talk')).toHaveCount(6);
    // The CMS may contain a newly assigned moderator; render the published person
    // exactly as saved rather than relying on the original seed placeholder.
    const currentModerator = await page.evaluate(async () => {
      // Local Vite fixtures use bundled data rather than a CMS endpoint.
      const response = await fetch('/api/programme', { cache: 'no-store' });
      if (!response.ok) return null;
      const payload = await response.json().catch(() => null);
      return payload?.programme?.stages
        ?.flatMap((stage) => stage.entries)
        ?.find((entry) => entry.id === 'session-3')?.moderator || null;
    });
    await expect(session3).toContainText(currentModerator?.name || 'Информация уточняется');
    await expect(session3).not.toContainText('В документе не указан');
    for (const name of [
      'Елена Авакян',
      'Максим Богомолов',
      'Марина Кузнецова',
      'Наталья Кошеляева',
      'Константин Юрьев',
      'Игорь Алексеев',
    ]) {
      await expect(session3).toContainText(name);
    }
    await expect(session3).toContainText('Тема уточняется');

    const session4 = section.locator('[data-session-id="session-4"]');
    await session4.locator('.forum-programme__session-toggle').click();
    await expect(session4.locator('.forum-programme__talk')).toHaveCount(5);
    await expect(session4).toContainText('Антон Юдаев');
    for (const name of [
      'Рената Золотарева',
      'Роман Спатарь',
      'Максим Миронов',
      'Денис Каюмов',
      'Илья Скворцов',
    ]) {
      await expect(session4).toContainText(name);
    }
    await session4.locator('.forum-programme__session-toggle').click();
    await expect(section.locator('.forum-programme__session--open')).toHaveCount(0);

    await section.getByRole('tab', { name: /Малая сцена/ }).click();
    await expect(section.getByRole('tabpanel')).toContainText('Программа уточняется');
    await expect(section.locator('.forum-programme__session')).toHaveCount(0);
    await expect(section.locator('.forum-programme__event')).toHaveCount(2);

    await section.getByRole('tab', { name: /Продуктовая сцена/ }).click();
    await expect(section.getByRole('tabpanel')).toContainText('Программа уточняется');
    await section.getByRole('button', { name: 'Посмотреть большую сцену' }).click();
    await expect(section.locator('.forum-programme__session')).toHaveCount(4);
    await expect(section.locator('.forum-programme__session--open')).toHaveCount(0);

    const layout = await section.evaluate((root) => {
      const bounds = root.getBoundingClientRect();
      const current = document.querySelector('.forum-programme__stage');
      const tabBounds = current.getBoundingClientRect();
      return {
        contained: bounds.left >= -2 && bounds.right <= innerWidth + 2,
        noPageScroll: document.documentElement.scrollWidth <= innerWidth + 2,
        stageNotClipped: tabBounds.width >= 180,
      };
    });
    expect(layout).toEqual({ contained: true, noPageScroll: true, stageNotClipped: true });
    expect(errors).toEqual([]);
  });
}

test('programme keyboard navigation and Figma portraits', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/#prog', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#site-preloader')).toHaveCount(0, { timeout: 20000 });
  const programme = page.locator('#prog');
  const first = programme.getByRole('tab', { name: /Большая сцена/ });
  await first.focus();
  await page.keyboard.press('ArrowRight');
  await expect(programme.getByRole('tab', { name: /Малая сцена/ })).toBeFocused();
  await expect(programme.getByRole('tab', { name: /Малая сцена/ })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await page.keyboard.press('End');
  await expect(programme.getByRole('tab', { name: /Продуктовая сцена/ })).toBeFocused();
  await page.keyboard.press('Home');
  await expect(first).toBeFocused();
  await expect(first).toHaveAttribute('aria-selected', 'true');

  await programme.locator('[data-session-id="session-1"] .forum-programme__session-toggle').click();
  const imgs = programme.locator('[data-session-id="session-1"] .forum-programme__portrait img');
  await expect(imgs).toHaveCount(5);
  for (let i = 0; i < 5; i++) {
    const src = await imgs.nth(i).getAttribute('src');
    expect(src).toMatch(/\/assets\/images\/programme\/.+\.webp$/);
    await imgs.nth(i).scrollIntoViewIfNeeded();
    await expect
      .poll(() => imgs.nth(i).evaluate((img) => img.complete && img.naturalWidth > 0))
      .toBe(true);
  }
  // Moderator portraits must match the Figma design, not legacy generic speaker art.
  await programme
    .locator('[data-session-id="session-2"] .forum-programme__portrait img')
    .first()
    .evaluate(async (img) => img.decode());
  await programme
    .locator('[data-session-id="session-4"] .forum-programme__portrait img')
    .first()
    .evaluate(async (img) => img.decode());
  await expect(
    programme.locator('[data-session-id="session-2"] .forum-programme__session-moderator img'),
  ).toHaveAttribute('src', /\/assets\/images\/programme\/ipatyev\.webp$/);
  await expect(
    programme.locator('[data-session-id="session-4"] .forum-programme__session-moderator img'),
  ).toHaveAttribute('src', /\/assets\/images\/programme\/yudaev\.webp$/);
  const links = page.locator('a[href="#prog"]');
  expect(await links.count()).toBeGreaterThan(0);
});

for (const width of [390, 1440]) {
  test('programme deep-link and menu use #prog at ' + width + 'px', async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/#prog', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#site-preloader')).toHaveCount(0, { timeout: 20000 });
    await expect(page.locator('section#prog')).toBeVisible();
    await expect(page.locator('a[href="#programme"]')).toHaveCount(0);
    expect(await page.locator('a[href="#prog"]').count()).toBeGreaterThan(0);
    await expect.poll(async () => page.locator('section#prog')
      .evaluate((section) => section.getBoundingClientRect().top), { timeout: 15000 })
      .toBeLessThan(130);
    await expect(page.locator('section#prog')).toContainText('ВСЕЛЕННАЯ ТЕХНОЛОГИЙ');
  });
}

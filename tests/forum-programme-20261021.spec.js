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
    await page.goto('/#programme', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#site-preloader')).toHaveCount(0, { timeout: 20000 });
    const section = page.locator('#programme');
    await section.scrollIntoViewIfNeeded();

    await expect(section.getByRole('heading', { name: 'Программа форума' })).toBeVisible();
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
    await expect(section.locator('.forum-programme__session--open')).toHaveCount(1);

    const session1 = section.locator('[data-session-id="session-1"]');
    await expect(session1.locator('.forum-programme__talk')).toHaveCount(3);
    await expect(session1).toContainText('Андрей Емелин');
    await expect(session1).toContainText('Владимир Вербицкий');
    await expect(session1).toContainText('Константин Виноградов');
    await expect(session1).toContainText('Валерий Зоткин');
    await expect(session1).toContainText('Спикеры от госорганов приглашены');
    await expect(session1.locator('.forum-programme__person-label')).toHaveText('Модератор');

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
    await expect(session2.locator('.forum-programme__talk')).toHaveCount(5);
    for (const name of [
      'Илья Курцев',
      'Василий Епифанов',
      'Александр Митрохин',
      'Максим Лифенцев',
      'Андрей Заневский',
    ]) {
      await expect(session2).toContainText(name);
    }
    await expect(session2).toContainText('Тема в документе не указана');
    await expect(session2).toContainText('Урегулирование как цифровой сервис');

    const session3 = section.locator('[data-session-id="session-3"]');
    await session3.locator('.forum-programme__session-toggle').click();
    await expect(session3.locator('.forum-programme__talk')).toHaveCount(6);
    await expect(session3).toContainText('В документе не указан');
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
  await page.goto('/#programme', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#site-preloader')).toHaveCount(0, { timeout: 20000 });
  const programme = page.locator('#programme');
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
  const links = page.locator('a[href="#programme"]');
  expect(await links.count()).toBeGreaterThan(0);
});

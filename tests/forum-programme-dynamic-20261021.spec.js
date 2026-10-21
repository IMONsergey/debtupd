import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

const programme = JSON.parse(
  readFileSync(new URL('../public/data/programme-seed.json', import.meta.url), 'utf8'),
);

test('public programme honours published visibility and supports more scenes', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const published = structuredClone(programme);
  published.note = 'Предварительное расписание. Данные редактора опубликованы.';
  published.stages[0].entries.find((entry) => entry.id === 'session-2').visible = false;
  published.stages[1].status = 'published';
  published.stages[1].description = '1 сессия';
  published.stages[1].entries = [
    {
      kind: 'session',
      id: 'test-dynamic-session',
      number: 1,
      title: 'Тестовая тема опубликованной сцены',
      time: '15:00–16:00',
      category: 'Практическая сессия',
      visible: true,
      additionalNote: '',
      moderator: { name: 'Тестовый Модератор', role: 'Модератор тестового расписания', photo: '' },
      talks: [
        {
          id: 'test-dynamic-talk',
          title: 'Тестовый доклад',
          note: '',
          visible: true,
          speakers: [
            {
              name: 'Тестовый Спикер',
              role: 'Спикер программы',
              photo: '',
            },
          ],
        },
      ],
    },
  ];
  await page.route(
    (url) => url.pathname === '/api/programme',
    (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ revision: 42, programme: published }),
      }),
  );
  await page.goto('/#programme', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#site-preloader')).toHaveCount(0, { timeout: 20000 });
  await expect(page.locator('#programme .forum-programme__header')).toContainText(
    'Данные редактора опубликованы',
  );
  await expect(page.locator('#programme .forum-programme__session')).toHaveCount(3);
  await expect(page.locator('[data-session-id="session-2"]')).toHaveCount(0);
  await page
    .locator('#programme')
    .getByRole('tab', { name: /Малая сцена/ })
    .click();
  await expect(page.locator('#programme')).toContainText('Тестовая тема опубликованной сцены');
  await expect(page.locator('#programme')).toContainText('Тестовый Модератор');
  await page
    .locator('#programme')
    .getByRole('button', { name: /Подробнее о сессии 1/ })
    .click();
  await expect(page.locator('#programme')).toContainText('Тестовый доклад');
  await expect(page.locator('#programme')).toContainText('Тестовый Спикер');
});

import { test, expect } from '@playwright/test';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { randomBytes } from 'node:crypto';
import { createProgrammeServer, hashPassword } from '../server/programme-service.mjs';

test.describe.configure({ mode: 'serial' });
let server;
let dataDir;
let password;
let base;

test.beforeAll(async () => {
  const port = 54058;
  base = 'http://127.0.0.1:' + port;
  password = randomBytes(24).toString('base64url');
  dataDir = await mkdtemp(join(tmpdir(), 'debt-programme-admin-browser-'));
  await mkdir(dataDir, { recursive: true });
  await writeFile(join(dataDir, 'auth.json'), JSON.stringify(hashPassword(password)));
  server = await createProgrammeServer({
    distDir: resolve('dist'),
    adminDir: resolve('admin/programme'),
    dataDir,
    origin: base,
  });
  await new Promise((res, rej) => {
    server.once('error', rej);
    server.listen(port, '127.0.0.1', res);
  });
});

test.afterAll(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
  if (dataDir) await rm(dataDir, { recursive: true, force: true });
});

async function login(page) {
  await page.goto(base + '/programme-admin/', { waitUntil: 'domcontentloaded' });
  await expect(page.getByText('Вход в редактор')).toBeVisible();
  await page.locator('input[type=password]').fill(password);
  await page.getByRole('button', { name: 'Войти' }).click();
  await expect(page.locator('.top-brand h1')).toHaveText('Программа форума');
}

async function publicData(page) {
  return page.evaluate(async () => {
    const res = await fetch('/api/programme', { cache: 'no-store' });
    return res.json();
  });
}

test('unauthenticated editor mutations are denied', async ({ request }) => {
  const response = await request.get(base + '/api/programme/admin');
  expect(response.status()).toBe(401);
  const preview = await request.get(base + '/programme-admin/preview');
  expect(preview.status()).toBe(401);
  const badDraft = await request.put(base + '/api/programme/draft', {
    data: { expectedRevision: 1, programme: {} },
    headers: { Origin: base },
  });
  expect(badDraft.status()).toBe(401);
  const published = await request.get(base + '/api/programme');
  expect(published.ok()).toBe(true);
});

test('admin edits drafts, uploads portrait, previews, publishes and restores', async ({
  page,
  context,
}) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await context.route('**/assets/**', async (route) => {
    const relative = new URL(route.request().url()).pathname.slice(1);
    if (!/^[a-zA-Z0-9_./-]+$/.test(relative) || relative.includes('..')) {
      await route.abort();
      return;
    }
    const file = await readFile(resolve('dist', relative)).catch(() => null);
    if (!file) {
      await route.abort();
      return;
    }
    const mime = relative.endsWith('.css')
      ? 'text/css'
      : relative.endsWith('.js')
        ? 'text/javascript'
        : relative.endsWith('.woff2')
          ? 'font/woff2'
          : relative.endsWith('.webp')
            ? 'image/webp'
            : relative.endsWith('.png')
              ? 'image/png'
              : 'application/octet-stream';
    await route.fulfill({ status: 200, body: file, contentType: mime });
  });

  await login(page);
  await page.screenshot({
    path: 'test-results/programme-final-review/editor-desktop.png',
    animations: 'disabled',
  });
  const before = await publicData(page);
  const initialCount = before.programme.stages[0].entries.length;

  await page.getByRole('button', { name: '+ Сессия' }).click();
  await page.locator('.inspector [data-field="title"]').fill('Тестовая сессия редактора');
  await page.getByRole('button', { name: '+ Указать' }).click();
  await page.locator('[data-scope="moderator"][data-field="name"]').fill('Тестовый Модератор');
  await page.getByRole('button', { name: '+ Выступление' }).click();
  await page.locator('.inspector [data-field="title"]').fill('Доклад через CMS');
  await page.getByRole('button', { name: '+ Спикер' }).click();
  await page.locator('[data-scope="speaker:0"][data-field="name"]').fill('Тестовый Спикер');
  await page
    .locator('[data-scope="speaker:0"][data-field="role"]')
    .fill('Участник автоматизированной проверки');
  await page.locator('.photo-upload').setInputFiles('public/assets/images/programme/ipatyev.webp');
  await expect(page.locator('.inspector .photo-preview').first()).toHaveAttribute(
    'src',
    /\/api\/programme\/image\/.*\.webp/,
  );

  await page.getByRole('button', { name: 'Сохранить черновик' }).click();
  await expect(page.locator('#save-state')).toHaveText('Черновик сохранён');
  const unmodified = await publicData(page);
  expect(unmodified.programme.stages[0].entries).toHaveLength(initialCount);

  const previewPromise = page.waitForEvent('popup');
  await page.getByRole('button', { name: 'Предпросмотр' }).click();
  const preview = await previewPromise;
  await expect(preview).toHaveURL(/\/programme-admin\/preview/);
  await expect(preview.locator('#programme')).toContainText('Тестовая сессия редактора', {
    timeout: 20000,
  });
  await preview.close();

  page.on('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Опубликовать' }).click();
  await expect
    .poll(async () => (await publicData(page)).programme.stages[0].entries.length)
    .toBe(initialCount + 1);
  let current = await publicData(page);
  const last = current.programme.stages[0].entries.at(-1);
  expect(last.title).toBe('Тестовая сессия редактора');
  expect(last.moderator.name).toBe('Тестовый Модератор');
  expect(last.talks[0].speakers[0].photo).toMatch(/\/api\/programme\/image\//);

  await page.getByRole('button', { name: 'Вернуть' }).first().click();
  await expect(page.locator('.stage-entry').first()).toBeVisible();
  expect((await publicData(page)).programme.stages[0].entries).toHaveLength(initialCount + 1);
  await page.getByRole('button', { name: 'Опубликовать' }).click();
  await expect
    .poll(async () => (await publicData(page)).programme.stages[0].entries.length)
    .toBe(initialCount);

  expect(errors).toEqual([]);
});

test('mobile admin retains edit controls and has no horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page);
  await page.screenshot({
    path: 'test-results/programme-final-review/editor-mobile.png',
    fullPage: true,
    animations: 'disabled',
  });
  await expect(page.getByRole('button', { name: 'Сохранить черновик' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Опубликовать' })).toBeVisible();
  await page.locator('.stage-pick').first().click();
  await page.getByRole('button', { name: 'Расписание', exact: true }).click();
  await expect(page.locator('.listpane')).toBeVisible();
  await expect(page.getByRole('button', { name: '+ Сессия' })).toBeVisible();
  await page.getByRole('button', { name: 'Редактор', exact: true }).click();
  await expect(page.locator('.inspector')).toBeVisible();
  await expect
    .poll(async () => page.evaluate(() => document.documentElement.scrollWidth - innerWidth))
    .toBeLessThanOrEqual(2);
});

test('moving a session to another stage is draft-only until publish and supports rollback', async ({
  page,
}) => {
  await login(page);
  const before = await publicData(page);
  const mainCount = before.programme.stages[0].entries.length;
  const smallCount = before.programme.stages[1].entries.length;

  await page
    .locator('.listrow')
    .filter({ hasText: 'СЕССИЯ 2' })
    .first()
    .locator('.listrow-main')
    .click();
  await expect(page.locator('#transfer-stage')).toBeVisible();
  await page.locator('#transfer-stage').selectOption('small');
  page.on('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Перенести в выбранную сцену' }).click();
  await expect(page.locator('.listpane h2')).toHaveText('Малая сцена');
  await page.getByRole('button', { name: 'Сохранить черновик' }).click();
  await expect
    .poll(async () => (await publicData(page)).programme.stages[0].entries.length)
    .toBe(mainCount);
  await page.locator('.stage-pick').filter({ hasText: 'Малая сцена' }).click();
  await page.locator('.inspector [data-field="status"]').selectOption('published');
  await page.getByRole('button', { name: 'Сохранить черновик' }).click();
  await page.getByRole('button', { name: 'Опубликовать' }).click();

  await expect
    .poll(async () => (await publicData(page)).programme.stages[1].entries.length)
    .toBe(smallCount + 1);
  const live = await publicData(page);
  expect(live.programme.stages[0].entries).toHaveLength(mainCount - 1);
  expect(live.programme.stages[1].status).toBe('published');
  expect(live.programme.stages[1].entries[0].id).toBe('session-2');

  await page.getByRole('button', { name: 'Вернуть' }).first().click();
  await page.getByRole('button', { name: 'Опубликовать' }).click();
  await expect
    .poll(async () => (await publicData(page)).programme.stages[0].entries.length)
    .toBe(mainCount);
  const restored = await publicData(page);
  expect(restored.programme.stages[1].entries).toHaveLength(smallCount);
  expect(restored.programme.stages[1].status).toBe(before.programme.stages[1].status);
});

test('draft validation catches time errors and rejects invalid JSON before import', async ({ page }) => {
  await login(page);
  await page.getByRole('button', { name: 'Проверить данные' }).click();
  await expect(page.locator('.toast')).toContainText('Проверка пройдена');
  const before = await page.locator('.inspector [data-field="title"]').inputValue();
  await page.locator('#import-file').setInputFiles({
    name: 'programme-invalid.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify({ stages: [], commonEvents: [] })),
  });
  await expect(page.locator('.toast.bad')).toBeVisible();
  await expect(page.locator('.inspector [data-field="title"]')).toHaveValue(before);
  await expect(page.locator('.stage-pick')).toHaveCount(5);
});

test('edits made while saving are not overwritten by an older server response', async ({ page }) => {
  await login(page);
  const field = page.locator('.inspector [data-field="description"]');
  await field.fill('Первая редакция подписи');
  let unlock;
  let observed;
  const held = new Promise((resolve) => (unlock = resolve));
  const intercepted = new Promise((resolve) => (observed = resolve));
  await page.route('**/api/programme/draft', async (route) => {
    observed();
    await held;
    await route.continue();
  });
  await page.getByRole('button', { name: 'Сохранить черновик' }).click();
  await intercepted;
  await field.fill('Вторая редакция, введена во время сохранения');
  unlock();
  await expect(page.locator('#save-state')).toHaveText('Есть несохранённые изменения');
  await expect(field).toHaveValue('Вторая редакция, введена во время сохранения');
  await page.unroute('**/api/programme/draft');
  await page.getByRole('button', { name: 'Сохранить черновик' }).click();
  await expect(page.locator('#save-state')).toHaveText('Черновик сохранён');
  const preview = await page.evaluate(async () => (await fetch('/api/programme/preview')).json());
  expect(preview.programme.stages[0].description).toBe('Вторая редакция, введена во время сохранения');
});

test('photo upload remains attached to the original speaker after switching talks', async ({ page }) => {
  await login(page);
  await page.locator('.listpane [data-action="entry:session-1"]').click();
  const talkButtons = page.locator('.inspector [data-action^="talk:"]');
  const firstId = await talkButtons.first().getAttribute('data-action');
  const secondId = await talkButtons.nth(1).getAttribute('data-action');
  await talkButtons.first().click();
  let unlock;
  let observed;
  const held = new Promise((resolve) => (unlock = resolve));
  const intercepted = new Promise((resolve) => (observed = resolve));
  await page.route('**/api/programme/upload', async (route) => {
    observed();
    await held;
    await route.continue();
  });
  await page.locator('.photo-upload').first().setInputFiles('public/assets/images/programme/ipatyev.webp');
  await intercepted;
  await page.locator('.listpane [data-action="entry:session-1"]').click();
  await page.locator('[data-action="' + secondId + '"]').click();
  const secondOriginal = await page.locator('[data-scope="speaker:0"][data-field="photo"]').inputValue();
  unlock();
  await expect(page.locator('.toast')).toContainText('Фотография привязана');
  await expect(page.locator('[data-scope="speaker:0"][data-field="photo"]')).toHaveValue(secondOriginal);
  await page.locator('.listpane [data-action="entry:session-1"]').click();
  await page.locator('[data-action="' + firstId + '"]').click();
  await expect(page.locator('[data-scope="speaker:0"][data-field="photo"]'))
    .toHaveValue(/\/api\/programme\/image\/.*\.webp/);
  await page.unroute('**/api/programme/upload');
});

import { test, expect } from '@playwright/test';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { randomBytes } from 'node:crypto';
import { createProgrammeServer, hashPassword } from '../server/programme-service.mjs';

test.describe.configure({ mode: 'serial' });
let server;
let dataDir;
let password;
let base;

test.beforeEach(async () => {
  dataDir = await mkdtemp(join(tmpdir(), 'debt-programme-ux-'));
  password = randomBytes(24).toString('base64url');
  await mkdir(dataDir, { recursive: true });
  await writeFile(join(dataDir, 'auth.json'), JSON.stringify(hashPassword(password)));
  server = await createProgrammeServer({
    distDir: resolve('dist'), adminDir: resolve('admin/programme'), dataDir, origin: 'http://127.0.0.1:54058',
  });
  await new Promise((done, reject) => {
    server.once('error', reject);
    server.listen(54058, '127.0.0.1', done);
  });
  base = 'http://127.0.0.1:54058';
});
test.beforeEach(async ({ page }) => {
  await assets(page);
});
test.afterEach(async () => {
  if (server) await new Promise((done) => server.close(done));
  if (dataDir) await rm(dataDir, { recursive: true, force: true });
});

async function login(page) {
  await page.goto(base + '/programme-admin/');
  await expect(page.getByRole('heading', { name: 'Войти в редактор' })).toBeVisible();
  await page.locator('input[type=password]').fill(password);
  await page.getByRole('button', { name: 'Войти в админку' }).click();
  await expect(page.locator('.top-title h1')).toHaveText('Программа форума');
  await expect(page.locator('.listpane')).toBeVisible();
}
async function publicData(page) {
  return page.evaluate(async () => (await fetch('/api/programme', { cache: 'no-store' })).json());
}
async function assets(page) {
  await page.context().route('**/assets/**', async (route) => {
    const name = new URL(route.request().url()).pathname.slice(1);
    if (!/^[a-zA-Z0-9_./-]+$/.test(name) || name.includes('..')) return route.abort();
    const bytes = await readFile(resolve('dist', name)).catch(() => null);
    if (!bytes) return route.abort();
    const mime = name.endsWith('.js') ? 'text/javascript' : name.endsWith('.css') ? 'text/css' :
      name.endsWith('.woff2') ? 'font/woff2' : name.endsWith('.png') ? 'image/png' :
      name.endsWith('.webp') ? 'image/webp' : 'application/octet-stream';
    await route.fulfill({ status: 200, body: bytes, contentType: mime });
  });
}
async function agree(page) {
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('dialog').getByRole('button', { name: 'Опубликовать' }).click();
}

test('editor and API remain private without login', async ({ request }) => {
  expect((await request.get(base + '/api/programme/admin')).status()).toBe(401);
  expect((await request.get(base + '/api/programme/preview')).status()).toBe(401);
  expect((await request.get(base + '/api/programme/people')).status()).toBe(401);
  expect((await request.get(base + '/programme-admin/preview')).status()).toBe(401);
  expect((await request.post(base + '/api/programme/validate', { data: {} })).status()).toBe(401);
  expect((await request.get(base + '/api/programme')).status()).toBe(200);
});

test('new two-panel editor exposes stage tabs, inline talks, search and version controls', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await login(page);
  await page.screenshot({ path: 'test-results/programme-ux/editor-session-desktop.png', animations: 'disabled' });
  await expect(page.locator('.workspace > .panel')).toHaveCount(2);
  await expect(page.locator('.stage-tab')).toHaveCount(4);
  await expect(page.locator('.inspector .talk-card')).toHaveCount(3);
  await expect(page.locator('.inspector .talk-card--open')).toHaveCount(0);
  await expect(page.locator('.inspector .moderator-summary')).toContainText('Евгений Новиков');
  await page.locator('.inspector [data-action^="expand-talk:"]').first().click();
  await expect(page.locator('.inspector .talk-card--open')).toHaveCount(1);
  await expect(page.locator('.inspector .speaker-editor')).toHaveCount(1);
  await page.locator('.inspector [data-action="edit-moderator"]').click();
  await expect(page.locator('.inspector [data-scope="moderator"][data-field="name"]')).toHaveValue('Евгений Новиков');
  await page.locator('#agenda-search').fill('Емелин');
  await expect(page.locator('.listpane .listrow:visible')).toHaveCount(1);
  await page.locator('#agenda-search').fill('');
  await expect(page.locator('.listpane .listrow:visible')).toHaveCount(7);
  await page.locator('.tools-menu>summary').click();
  await page.getByRole('button', { name: 'История публикаций' }).click();
  await expect(page.locator('.inspector h2')).toContainText('История публикаций');
  await expect(page.locator('.listpane')).toBeVisible();
  await page.screenshot({ path: 'test-results/programme-ux/editor-desktop.png', animations: 'disabled', fullPage: false });
  expect(errors).toEqual([]);
});

test('create session, edit talks and speakers inline, upload image, preview and publish with rollback', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await login(page);
  const before = await publicData(page);
  await page.getByRole('button', { name: '+ Сессия' }).click();
  await page.locator('.inspector [data-scope=""][data-field="title"]').fill('UX тестовая сессия');
  await page.locator('.inspector [data-time-part="start"]').fill('18:30');
  await page.locator('.inspector [data-time-part="end"]').fill('19:00');
  await page.getByRole('button', { name: '+ Добавить' }).click();
  await page.locator('.inspector [data-scope="moderator"][data-field="name"]').fill('Ведущий Теста');
  await page.getByRole('button', { name: '+ Выступление' }).click();
  await page.locator('.talk-card--open [data-field="title"]').fill('Тема тестового выступления');
  await page.getByRole('button', { name: '+ Спикер' }).click();
  await page.locator('.talk-card--open [data-field="name"]').fill('Тестовый Спикер');
  await page.locator('.talk-card--open [data-field="role"]').fill('Компания');
  await page.locator('.talk-card--open input.photo-upload').setInputFiles('public/assets/images/programme/ipatyev.webp');
  await expect(page.locator('.talk-card--open .photo-preview')).toHaveAttribute('src', /\/api\/programme\/image\//);
  if (await page.getByRole('button', { name: 'Сохранить черновик' }).isEnabled())
    await page.getByRole('button', { name: 'Сохранить черновик' }).click();
  await expect(page.locator('#save-state')).toContainText('Черновик сохранён');
  expect((await publicData(page)).programme.stages[0].entries).toHaveLength(before.programme.stages[0].entries.length);
  const pending = page.waitForEvent('popup');
  await page.getByRole('button', { name: 'Предпросмотр' }).click();
  const preview = await pending;
  await expect(preview).toHaveURL(/\/programme-admin\/preview/);
  await expect(preview.locator('#prog')).toContainText('UX тестовая сессия', { timeout: 20000 });
  await preview.close();
  await page.getByRole('button', { name: 'Опубликовать' }).click();
  await agree(page);
  await expect.poll(async () => (await publicData(page)).programme.stages[0].entries.length).toBe(before.programme.stages[0].entries.length + 1);
  const published = (await publicData(page)).programme.stages[0].entries.at(-1);
  expect(published.title).toBe('UX тестовая сессия');
  expect(published.time).toBe('18:30–19:00');
  expect(published.moderator.name).toBe('Ведущий Теста');
  expect(published.talks[0].speakers[0].photo).toMatch(/\/api\/programme\/image\//);

  await page.locator('.tools-menu > summary').click();
  await page.getByRole('button', { name: 'История публикаций' }).click();
  await page.getByRole('button', { name: 'Восстановить' }).first().click();
  await page.getByRole('dialog').getByRole('button', { name: 'Восстановить' }).click();
  expect((await publicData(page)).programme.stages[0].entries).toHaveLength(before.programme.stages[0].entries.length + 1);
  await page.getByRole('button', { name: 'Опубликовать' }).click();
  await agree(page);
  await expect.poll(async () => (await publicData(page)).programme.stages[0].entries.length).toBe(before.programme.stages[0].entries.length);
  expect(errors).toEqual([]);
});

test('stage and shared events are discoverable, editable and movable without publishing draft', async ({ page }) => {
  await login(page);
  const original = await publicData(page);
  await page.getByRole('button', { name: 'Общие события Для всех сцен' }).click();
  await expect(page.locator('.agenda-head h2')).toContainText('Общие события');
  await expect(page.locator('.listpane .listrow')).toHaveCount(2);
  await page.getByRole('button', { name: '+ Добавить событие' }).click();
  await page.locator('.inspector [data-scope=""][data-field="title"]').fill('Тест общего события');
  if (await page.getByRole('button', { name: 'Сохранить черновик' }).isEnabled())
    await page.getByRole('button', { name: 'Сохранить черновик' }).click();
  expect((await publicData(page)).programme.commonEvents).toHaveLength(2);
  await page.getByRole('button', { name: 'Большая сцена' }).click();
  await page.getByRole('button', { name: 'Настроить сцену' }).click();
  await page.locator('.inspector [data-field="status"]').selectOption('upcoming');
  await expect(page.locator('.agenda-head')).toContainText('Программа уточняется');
  if (await page.getByRole('button', { name: 'Сохранить черновик' }).isEnabled())
    await page.getByRole('button', { name: 'Сохранить черновик' }).click();
  expect((await publicData(page)).programme.stages[0].status).toBe(original.programme.stages[0].status);
  await page.getByRole('button', { name: '+ Сцена' }).click();
  await page.locator('.inspector [data-field="title"]').fill('Новая тестовая сцена');
  await expect(page.locator('.stage-tab')).toHaveCount(5);
  if (await page.getByRole('button', { name: 'Сохранить черновик' }).isEnabled())
    await page.getByRole('button', { name: 'Сохранить черновик' }).click();
  expect((await publicData(page)).programme.stages).toHaveLength(3);
});

test('mobile navigation is usable and has no horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await login(page);
  for (const width of [320, 390, 768]) {
    await page.setViewportSize({ width, height: 844 });
    await expect(page.locator('.stage-strip')).toBeVisible();
    await expect(page.locator('.mobile-workspace-tabs')).toBeVisible();
    await expect(page.locator('.listpane')).toBeVisible();
    await page.locator('.listpane .listrow-main').first().click();
    await expect(page.locator('.inspector')).toBeVisible();
    await expect(page.locator('.inspector [data-field="title"]').first()).toBeVisible();
    await page.screenshot({ path: 'test-results/programme-ux/inspector-' + width + '.png', animations: 'disabled' });
    await page.getByRole('button', { name: 'Расписание', exact: true }).click();
    await expect(page.locator('.listpane')).toBeVisible();
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(2);
    const headerFits = await page.locator('.topbar .toolbar').evaluate((toolbar) => {
      const actions = [...toolbar.querySelectorAll(':scope > .btn, :scope > .tools-menu')];
      return actions.every((element) => {
        const rect = element.getBoundingClientRect();
        return rect.left >= -1 && rect.right <= innerWidth + 1;
      });
    });
    expect(headerFits).toBe(true);
    await page.screenshot({ path: 'test-results/programme-ux/editor-' + width + '.png', animations: 'disabled' });
    await page.reload();
  }
});

test('validation stops invalid import and keeps current unsaved edits', async ({ page }) => {
  await login(page);
  await page.locator('.tools-menu>summary').click();
  await page.getByRole('button', { name: 'Проверить данные' }).click();
  await expect(page.locator('.toast')).toContainText('Данные корректны');
  const original = await page.locator('.inspector [data-field="title"]').first().inputValue();
  await page.locator('.tools-menu>summary').click();
  await page.locator('#import-file').setInputFiles({
    name: 'invalid.json', mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify({ stages: [], commonEvents: [] })),
  });
  await expect(page.locator('.toast.bad')).toBeVisible();
  await expect(page.locator('.inspector [data-field="title"]').first()).toHaveValue(original);
});

test('edits while saving stay in the editor, and can be saved in another revision', async ({ page }) => {
  await login(page);
  const title = page.locator('.inspector [data-scope=""][data-field="title"]');
  await title.fill('Первая версия тестовой сессии');
  let release;
  let received;
  const wait = new Promise((done) => release = done);
  const signal = new Promise((done) => received = done);
  await page.route('**/api/programme/draft', async (route) => {
    received();
    await wait;
    await route.continue();
  });
  if (await page.getByRole('button', { name: 'Сохранить черновик' }).isEnabled())
    await page.getByRole('button', { name: 'Сохранить черновик' }).click();
  await signal;
  await title.fill('Вторая версия, введённая во время сохранения');
  release();
  await expect(page.locator('#save-state')).toContainText(/Правки сохраняются автоматически|Сохраняем|Черновик сохранён/);
  await expect(title).toHaveValue('Вторая версия, введённая во время сохранения');
  await page.unroute('**/api/programme/draft');
  if (await page.getByRole('button', { name: 'Сохранить черновик' }).isEnabled())
    await page.getByRole('button', { name: 'Сохранить черновик' }).click();
  await expect(page.locator('#save-state')).toContainText('Черновик сохранён');
  const preview = await page.evaluate(async () => (await fetch('/api/programme/preview')).json());
  expect(preview.programme.stages[0].entries[0].title).toBe('Вторая версия, введённая во время сохранения');
});

test('in-flight image upload remains attached to original speaker when switching sessions', async ({ page }) => {
  await login(page);
  await page.locator('.talk-pick').first().click();
  const first = page.locator('.talk-card--open .photo-upload').first();
  let release;
  let received;
  const wait = new Promise((done) => release = done);
  const signal = new Promise((done) => received = done);
  await page.route('**/api/programme/upload', async (route) => {
    received(); await wait; await route.continue();
  });
  await first.setInputFiles('public/assets/images/programme/ipatyev.webp');
  await signal;
  await page.locator('.listpane [data-action="entry:session-2"]').click();
  const nameBefore = await page.locator('.inspector [data-scope=""][data-field="title"]').inputValue();
  release();
  await expect(page.locator('.toast')).toContainText('Фото обновлено');
  await expect(page.locator('.inspector [data-scope=""][data-field="title"]')).toHaveValue(nameBefore);
  await page.locator('.listpane [data-action="entry:session-1"]').click();
  await page.locator('.talk-pick').first().click();
  await expect(page.locator('.talk-card--open img.photo-preview')).toHaveAttribute('src', /\/api\/programme\/image\//);
  await page.unroute('**/api/programme/upload');
});

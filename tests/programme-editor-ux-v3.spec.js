import { test, expect } from '@playwright/test';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { randomBytes } from 'node:crypto';
import { createProgrammeServer, hashPassword } from '../server/programme-service.mjs';

test.describe.configure({ mode: 'serial' });
let server;
let root;
let password;
const base = 'http://127.0.0.1:54059';

test.beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'debt-programme-ux-v3-'));
  await mkdir(root, { recursive: true });
  password = randomBytes(24).toString('base64url');
  await writeFile(join(root, 'auth.json'), JSON.stringify(hashPassword(password)));
  server = await createProgrammeServer({
    distDir: resolve('dist'),
    adminDir: resolve('admin/programme'),
    dataDir: root,
    origin: base,
  });
  await new Promise((done, fail) => {
    server.once('error', fail);
    server.listen(54059, '127.0.0.1', done);
  });
});
test.afterEach(async () => {
  if (server) await new Promise((done) => server.close(done));
  if (root) await rm(root, { recursive: true, force: true });
});
test.beforeEach(async ({ page }) => {
  await page.route('**/assets/**', async (route) => {
    const name = new URL(route.request().url()).pathname.slice(1);
    if (!/^[a-zA-Z0-9_./-]+$/.test(name) || name.includes('..')) return route.abort();
    const bytes = await readFile(resolve('dist', name)).catch(() => null);
    if (!bytes) return route.abort();
    const mime = name.endsWith('.webp') ? 'image/webp' : name.endsWith('.png') ? 'image/png' :
      name.endsWith('.woff2') ? 'font/woff2' : 'application/octet-stream';
    await route.fulfill({ status: 200, body: bytes, contentType: mime });
  });
});
async function login(page, width = 1440) {
  await page.setViewportSize({ width, height: 900 });
  await page.goto(base + '/programme-admin/');
  await page.locator('input[type=password]').fill(password);
  await page.getByRole('button', { name: 'Войти в админку' }).click();
  await expect(page.locator('#save-state')).toContainText('Все изменения опубликованы');
}
async function readPublished(page) {
  return page.evaluate(async () => (await fetch('/api/programme')).json());
}
async function readDraft(page) {
  return page.evaluate(async () => (await fetch('/api/programme/admin')).json());
}

test('auto-save persists only to draft and explicitly signals unpublished changes', async ({ page }) => {
  await login(page);
  const before = await readPublished(page);
  const title = page.locator('.inspector [data-field="title"][data-scope=""]');
  await title.fill('Автоматический черновик — контрольная версия');
  await expect(page.locator('#save-state')).toContainText('сохраняются автоматически');
  await expect.poll(async () => (await readDraft(page)).draft.programme.stages[0].entries[0].title, {
    timeout: 15000,
  }).toBe('Автоматический черновик — контрольная версия');
  await expect(page.locator('#save-state')).toContainText('не на сайте');
  const live = await readPublished(page);
  expect(live.revision).toBe(before.revision);
  expect(live.programme.stages[0].entries[0].title).toBe(before.programme.stages[0].entries[0].title);
  await page.reload();
  await expect(page.locator('.inspector [data-field="title"][data-scope=""]'))
    .toHaveValue('Автоматический черновик — контрольная версия');
  await expect(page.locator('#save-state')).toContainText('не на сайте');
});

test('image picker finds named photos with thumbnails and updates the right speaker', async ({ page }) => {
  await login(page);
  await page.locator('[data-action="expand-talk:plenary-emelin"]').click();
  await page.locator('.talk-card--open [data-action^="library-photo:"]').first().click();
  const dialog = page.getByRole('dialog', { name: 'Библиотека фотографий' });
  await expect(dialog).toBeVisible();
  await mkdir('test-results/programme-ux-v3', { recursive: true });
  await page.screenshot({ path: 'test-results/programme-ux-v3/gallery-desktop.png', animations: 'disabled' });
  expect(await dialog.locator('.library-item').count()).toBeGreaterThanOrEqual(15);
  await dialog.locator('#library-search').fill('Новиков');
  await expect(dialog.locator('.library-item')).toHaveCount(1);
  await dialog.locator('.library-item').first().click();
  await expect(dialog).toHaveCount(0);
  await expect(page.locator('.talk-card--open .photo-preview')).toHaveAttribute('src', /evgeniy-novikov\.webp$/);
  await expect.poll(async () =>
    (await readDraft(page)).draft.programme.stages[0].entries[0].talks[0].speakers[0].photo,
    { timeout: 15000 },
  ).toMatch(/evgeniy-novikov\.webp$/);
});

test('existing participant is reusable with role and image', async ({ page }) => {
  await login(page);
  await page.locator('[data-action="expand-talk:plenary-emelin"]').click();
  await page.locator('[data-action="library-person:plenary-emelin"]').click();
  const dialog = page.getByRole('dialog', { name: 'Участники программы' });
  await dialog.locator('#library-search').fill('Митрохин');
  await expect(dialog.locator('.library-item')).toHaveCount(1);
  await dialog.locator('.library-item').first().click();
  await expect(dialog).toHaveCount(0);
  await expect(page.locator('.talk-card--open .speaker-editor')).toHaveCount(2);
  await expect(page.locator('[data-scope="speaker:plenary-emelin:1"][data-field="name"]'))
    .toHaveValue('Александр Митрохин');
  await expect(page.locator('[data-scope="speaker:plenary-emelin:1"][data-field="role"]'))
    .toContainText('Альфа-банка');
  await expect.poll(async () =>
    (await readDraft(page)).draft.programme.stages[0].entries[0].talks[0].speakers.length,
    { timeout: 15000 },
  ).toBe(2);
});

test('entire site speaker directory is available, even if a speaker is not yet in a session', async ({ page }) => {
  await login(page);
  const response = await page.evaluate(async () => (await fetch('/api/programme/people')).json());
  expect(response.people.length).toBeGreaterThanOrEqual(30);
  expect(response.people.some((person) => person.name === 'Марина Селина')).toBe(true);
  await page.locator('[data-action="expand-talk:plenary-emelin"]').click();
  await page.locator('[data-action="library-person:plenary-emelin"]').click();
  const dialog = page.getByRole('dialog', { name: 'Участники программы' });
  await dialog.locator('#library-search').fill('Марина Селина');
  await expect(dialog.locator('.library-item')).toHaveCount(1);
  await dialog.locator('.library-item').click();
  await expect(page.locator('[data-scope="speaker:plenary-emelin:1"][data-field="name"]'))
    .toHaveValue('Марина Селина');
  await expect(page.locator('[data-scope="speaker:plenary-emelin:1"][data-field="role"]'))
    .not.toHaveValue('');
});

test('mobile editor supports section jumps, quick search and photo library', async ({ page }) => {
  await login(page, 390);
  await page.locator('.listpane [data-action="entry:session-1"]').click();
  await expect(page.locator('.inspector')).toBeVisible();
  await page.getByRole('button', { name: 'Выступления (3)' }).click();
  await expect(page.locator('#session-talks')).toBeVisible();
  await page.keyboard.press('Control+k');
  await expect(page.locator('.listpane')).toBeVisible();
  await expect(page.locator('#agenda-search')).toBeFocused();
  await page.locator('#agenda-search').fill('Заневский');
  await expect(page.locator('.listrow:visible')).toHaveCount(1);
  await mkdir('test-results/programme-ux-v3', { recursive: true });
  await page.screenshot({ path: 'test-results/programme-ux-v3/mobile-agenda.png', animations: 'disabled' });
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth))
    .toBeLessThanOrEqual(2);
});

test('publishing is optional and asks for separate confirmation', async ({ page }) => {
  await login(page);
  const before = await readPublished(page);
  await page.locator('.inspector [data-field="title"][data-scope=""]').fill('Не опубликованный черновик');
  await expect.poll(async () =>
    (await readDraft(page)).draft.programme.stages[0].entries[0].title,
    { timeout: 15000 },
  ).toBe('Не опубликованный черновик');
  await expect(page.locator('#save-state')).toContainText('не на сайте');
  await page.getByRole('button', { name: 'Опубликовать' }).click();
  const modal = page.getByRole('dialog', { name: 'Опубликовать программу?' });
  await expect(modal).toBeVisible();
  await modal.getByRole('button', { name: 'Отмена' }).click();
  expect((await readPublished(page)).revision).toBe(before.revision);
});


test('cancelled publish keeps automatic draft saving active', async ({ page }) => {
  await login(page);
  const original = await readPublished(page);
  await page.locator('.inspector [data-field="title"][data-scope=""]')
    .fill('Сохранять даже после отмены публикации');
  await page.getByRole('button', { name: 'Опубликовать' }).click();
  await page.getByRole('dialog', { name: 'Опубликовать программу?' })
    .getByRole('button', { name: 'Отмена' }).click();
  await expect.poll(async () =>
    (await readDraft(page)).draft.programme.stages[0].entries[0].title,
    { timeout: 15000 },
  ).toBe('Сохранять даже после отмены публикации');
  expect((await readPublished(page)).revision).toBe(original.revision);
});

test('mobile photo gallery remains usable without horizontal overflow', async ({ page }) => {
  await login(page, 390);
  await page.locator('.listpane [data-action="entry:session-1"]').click();
  await page.locator('[data-action="expand-talk:plenary-emelin"]').click();
  await page.locator('.talk-card--open [data-action^="library-photo:"]').first().click();
  const gallery = page.getByRole('dialog', { name: 'Библиотека фотографий' });
  await expect(gallery).toBeVisible();
  await expect(gallery.locator('#library-group')).toHaveValue('people');
  await gallery.locator('#library-search').fill('Емелин');
  await expect(gallery.locator('.library-item')).toHaveCount(1);
  const size = await gallery.evaluate((el) => {
    const rect = el.getBoundingClientRect();
    return { left: rect.left, right: rect.right, pageOverflow: document.documentElement.scrollWidth - innerWidth };
  });
  expect(size.left).toBeGreaterThanOrEqual(0);
  expect(size.right).toBeLessThanOrEqual(390);
  expect(size.pageOverflow).toBeLessThanOrEqual(2);
  await mkdir('test-results/programme-ux-v3', { recursive: true });
  await page.screenshot({ path: 'test-results/programme-ux-v3/gallery-mobile.png', animations: 'disabled' });
  await page.keyboard.press('Escape');
  await expect(gallery).toHaveCount(0);
});

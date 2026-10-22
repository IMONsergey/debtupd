import { test, expect } from '@playwright/test';
import { mkdtemp, mkdir, rm, writeFile, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { randomBytes } from 'node:crypto';
import { createProgrammeServer, hashPassword } from '../server/programme-service.mjs';

test.describe.configure({ mode: 'serial' });
const base = 'http://127.0.0.1:54067';
let folder, server, password;

test.beforeEach(async () => {
  folder = await mkdtemp(join(tmpdir(), 'debt-moderators-'));
  await mkdir(folder, { recursive: true });
  password = randomBytes(24).toString('base64url');
  await writeFile(join(folder, 'auth.json'), JSON.stringify(hashPassword(password)));
  server = await createProgrammeServer({
    distDir: resolve('dist'),
    adminDir: resolve('admin/programme'),
    dataDir: folder,
    origin: base,
  });
  await new Promise((resolveReady, reject) => {
    server.once('error', reject);
    server.listen(54067, '127.0.0.1', resolveReady);
  });
});
test.afterEach(async () => {
  if (server) await new Promise((resolveDone) => server.close(resolveDone));
  if (folder) await rm(folder, { recursive: true, force: true });
});
test.beforeEach(async ({ page }) => {
  await page.context().route('**/assets/**', async (route) => {
    const relative = new URL(route.request().url()).pathname.slice(1);
    if (!/^[A-Za-z0-9_.\/-]+$/.test(relative) || relative.includes('..'))
      return route.abort();
    const content = await readFile(resolve('dist', relative)).catch(() => null);
    if (!content) return route.abort();
    const mime = relative.endsWith('.js') ? 'text/javascript' :
      relative.endsWith('.css') ? 'text/css' :
      relative.endsWith('.woff2') ? 'font/woff2' :
      relative.endsWith('.png') ? 'image/png' :
      relative.endsWith('.webp') ? 'image/webp' : 'application/octet-stream';
    await route.fulfill({ body: content, contentType: mime });
  });
});
async function login(page, width=1440) {
  await page.setViewportSize({ width, height: 900 });
  await page.goto(base + '/programme-admin/');
  await page.locator('[type="password"]').fill(password);
  await page.getByRole('button', { name: 'Войти в админку' }).click();
  if (width <= 900) await page.locator('.listpane [data-action="entry:session-1"]').click();
  await expect(page.locator('.inspector #session-moderator')).toBeVisible();
}
async function live(page) {
  return page.evaluate(async () => (await fetch('/api/programme')).json());
}
async function draft(page) {
  return page.evaluate(async () => (await fetch('/api/programme/admin')).json());
}
function session(data) {
  return data.programme.stages.flatMap((stage) => stage.entries)
    .find((entry) => entry.id === 'session-1');
}

test('add 2–3 moderators, select from catalog, save draft, preview and publish stacked layout', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await login(page);
  const original = await live(page);
  const block = page.locator('#session-moderator');
  await expect(block.locator('.moderator-entry')).toHaveCount(1);
  await expect(block).toContainText('1 / 3');

  await block.getByRole('button', { name: '+ Добавить' }).click();
  await expect(block.locator('.moderator-entry')).toHaveCount(2);
  await block.locator('[data-scope="additional-moderator:0"][data-field="name"]')
    .fill('Тестовый второй модератор');
  await block.locator('[data-scope="additional-moderator:0"][data-field="role"]')
    .fill('Должность второго модератора');

  await block.getByRole('button', { name: 'Из программы' }).click();
  const library = page.getByRole('dialog', { name: 'Участники программы' });
  await expect(library).toBeVisible();
  await library.locator('#library-search').fill('Анна Белоцерковская');
  await expect(library.locator('.library-item')).toHaveCount(1);
  await library.locator('.library-item').click();
  await expect(library).toHaveCount(0);
  await expect(block.locator('.moderator-entry')).toHaveCount(3);
  await expect(block).toContainText('3 / 3');
  await expect(block.getByRole('button', { name: '+ Добавить' })).toHaveCount(0);
  await expect(block).toContainText('Анна Белоцерковская');
  await expect(block).toContainText('Тестовый второй модератор');

  await expect.poll(async () => session((await draft(page)).draft).additionalModerators?.length,
    { timeout: 15000 }).toBe(2);
  expect(session(original).additionalModerators).toBeUndefined();
  expect(session((await live(page))).additionalModerators).toBeUndefined();

  const previewPromise = page.waitForEvent('popup');
  await page.getByRole('button', { name: 'Предпросмотр' }).click();
  const preview = await previewPromise;
  await expect(preview).toHaveURL(/\/programme-admin\/preview#prog/);
  await expect(preview.locator('#site-preloader')).toHaveCount(0, { timeout: 20000 });
  const previewModerators = preview.locator(
    '[data-session-id="session-1"] .forum-programme__session-moderator .forum-programme__person',
  );
  await expect(previewModerators).toHaveCount(3);
  await expect(previewModerators.nth(1)).toContainText('Тестовый второй модератор');
  await expect(previewModerators.nth(2)).toContainText('Анна Белоцерковская');
  await preview.close();

  await page.getByRole('button', { name: 'Опубликовать' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Опубликовать' }).click();
  await expect.poll(async () => session(await live(page)).additionalModerators?.length,
    { timeout: 15000 }).toBe(2);

  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({ width, height: 950 });
    await page.goto(base + '/programme-admin/preview#prog');
    await expect(page.locator('#site-preloader')).toHaveCount(0, { timeout: 20000 });
    const visible = page.locator('[data-session-id="session-1"] .forum-programme__session-moderator .forum-programme__person');
    await expect(visible).toHaveCount(3);
    const positions = await visible.evaluateAll((rows) => rows.map((node) => {
      const bounds = node.getBoundingClientRect();
      return { top: bounds.top, bottom: bounds.bottom, left: bounds.left };
    }));
    expect(positions[1].top).toBeGreaterThanOrEqual(positions[0].bottom);
    expect(positions[2].top).toBeGreaterThanOrEqual(positions[1].bottom);
    expect(Math.abs(positions[0].left - positions[1].left)).toBeLessThanOrEqual(1);
    expect(Math.abs(positions[1].left - positions[2].left)).toBeLessThanOrEqual(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth))
      .toBeLessThanOrEqual(2);
  }
  expect(errors).toEqual([]);
});

test('reorder and remove moderators preserves remaining people without changing published list', async ({ page }) => {
  await login(page);
  const block = page.locator('#session-moderator');
  for (const name of ['Второй модератор', 'Третий модератор']) {
    await block.getByRole('button', { name: '+ Добавить' }).click();
    const target = block.locator('.moderator-entry').last();
    await target.locator('[data-field="name"]').fill(name);
    await target.locator('[data-field="role"]').fill('Руководитель направления');
  }
  await expect(block.locator('.moderator-entry')).toHaveCount(3);
  await block.locator('[data-action="move-moderator:2:-1"]').click();
  await expect(block.locator('.moderator-entry').nth(1)).toContainText('Третий модератор');
  await block.locator('[data-action="remove-moderator"]').click();
  await page.getByRole('dialog').getByRole('button', { name: 'Убрать' }).click();
  await expect(block.locator('.moderator-entry')).toHaveCount(2);
  await expect(block.locator('.moderator-entry').first()).toContainText('Третий модератор');
  await expect.poll(async () => session((await draft(page)).draft).moderator?.name,
    { timeout: 15000 }).toBe('Третий модератор');
  expect(session((await live(page))).moderator.name).toBe('Евгений Новиков');

  await block.locator('[data-action="remove-extra-moderator:0"]').click();
  await page.getByRole('dialog').getByRole('button', { name: 'Убрать' }).click();
  await expect(block.locator('.moderator-entry')).toHaveCount(1);
  await expect(block).toContainText('1 / 3');
});

test('moderators can be edited individually on narrow editor screens', async ({ page }) => {
  await login(page, 390);
  const block = page.locator('#session-moderator');
  await expect(block).toBeVisible();
  await block.getByRole('button', { name: '+ Добавить' }).click();
  await expect(block.locator('.moderator-entry')).toHaveCount(2);
  await block.locator('[data-scope="additional-moderator:0"][data-field="name"]')
    .fill('Мобильный модератор');
  await expect(block.locator('[data-scope="additional-moderator:0"][data-field="role"]'))
    .toBeVisible();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth))
    .toBeLessThanOrEqual(2);
});

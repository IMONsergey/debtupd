import { test, expect } from '@playwright/test';
import { mkdtemp, mkdir, rm, writeFile, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { randomBytes } from 'node:crypto';
import { createProgrammeServer, hashPassword } from '../server/programme-service.mjs';

test.describe.configure({ mode: 'serial' });
const base = 'http://127.0.0.1:54063';
let folder, server, password;

test.beforeEach(async () => {
  folder = await mkdtemp(join(tmpdir(), 'debt-speakers-admin-'));
  await mkdir(folder,{recursive:true});
  password = randomBytes(24).toString('base64url');
  await writeFile(join(folder,'auth.json'),JSON.stringify(hashPassword(password)));
  server = await createProgrammeServer({
    distDir:resolve('dist'),
    adminDir:resolve('admin/programme'),
    dataDir:folder,
    origin:base,
  });
  await new Promise((done,fail) => {
    server.once('error',fail);
    server.listen(54063,'127.0.0.1',done);
  });
});
test.afterEach(async () => {
  if (server) await new Promise(done => server.close(done));
  if (folder) await rm(folder,{force:true,recursive:true});
});
test.beforeEach(async ({ page }) => {
  await page.context().route('**/assets/**', async (route) => {
    const pathname = new URL(route.request().url()).pathname.slice(1);
    if (!/^[a-zA-Z0-9_./-]+$/.test(pathname) || pathname.includes('..'))
      return route.abort();
    const bytes = await readFile(resolve('dist', pathname)).catch(() => null);
    if (!bytes) return route.abort();
    const mime = pathname.endsWith('.webp') ? 'image/webp' :
      pathname.endsWith('.png') ? 'image/png' :
      pathname.endsWith('.woff2') ? 'font/woff2' :
      pathname.endsWith('.js') ? 'text/javascript' :
      pathname.endsWith('.css') ? 'text/css' :
      pathname.endsWith('.svg') ? 'image/svg+xml' : 'application/octet-stream';
    await route.fulfill({ status: 200, body: bytes, contentType: mime });
  });
});

async function login(page, width=1440) {
  await page.setViewportSize({width,height:900});
  await page.goto(base+'/programme-admin/');
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole('button',{name:'Войти в админку'}).click();
  await expect(page.getByRole('link',{name:'Спикеры'})).toBeVisible();
  await page.getByRole('link',{name:'Спикеры'}).click();
  await expect(page.locator('.speaker-list-row')).toHaveCount(35);
  await expect(page.locator('#speakers-save-state')).toHaveText('Все изменения опубликованы');
}
async function publicSpeakers(page) {
  return page.evaluate(async () => (await fetch('/api/speakers')).json());
}
async function draftSpeakers(page) {
  return page.evaluate(async () => (await fetch('/api/speakers/admin')).json());
}

test('speaker directory remains private, existing 35 speakers are preserved', async ({request,page}) => {
  expect((await request.get(base+'/api/speakers')).status()).toBe(200);
  expect((await request.get(base+'/api/speakers/admin')).status()).toBe(401);
  expect((await request.get(base+'/api/speakers/preview')).status()).toBe(401);
  expect((await request.get(base+'/programme-admin/speakers/',{maxRedirects:0})).status()).toBe(302);
  expect((await request.get(base+'/programme-admin/speakers/preview')).status()).toBe(401);
  await login(page);
  const live=await publicSpeakers(page);
  expect(live.speakers).toHaveLength(35);
  expect(live.speakers[0].name).toBe('Владимир Вербицкий');
  expect(live.speakers.at(-1).name).toBe('Павел Соболев');
  await expect(page.locator('.speaker-list-row').first()).toContainText('Владимир Вербицкий');
  await expect(page.locator('.speaker-list-row').last()).toContainText('Павел Соболев');
  await expect(page.locator('.speaker-edit-image')).toHaveAttribute('src',/speaker-hd-01\.webp$/);
  await expect(page.locator('.speaker-edit-card')).toBeVisible();
});

test('add speaker, upload portrait, preview, publish, and restore without touching programme', async ({page}) => {
  await login(page);
  const original=await publicSpeakers(page);
  const existingProgram=await page.evaluate(async () => (await fetch('/api/programme')).json());
  await page.getByRole('button',{name:'+ Добавить спикера'}).click();
  await expect(page.locator('.speaker-list-row')).toHaveCount(36);
  await expect(page.locator('.speaker-record-status')).toContainText('Скрыт');
  await page.locator('[data-speaker-field="name"]').fill('Тестовый Спикер CMS');
  await page.locator('[data-speaker-field="role"]').fill('Директор по цифровым продуктам ООО «Тест»');
  await page.locator('#speaker-photo-file').setInputFiles('public/assets/images/programme/ipatyev.webp');
  await expect(page.locator('.speaker-edit-image')).toHaveAttribute('src',/\/api\/programme\/image\//);
  await page.locator('.speaker-visible-toggle').click();
  await expect.poll(async () => (await draftSpeakers(page)).draft.speakers.length,
    {timeout:16000}).toBe(36);
  expect((await publicSpeakers(page)).speakers.length).toBe(35);
  const pending=page.waitForEvent('popup');
  await page.getByRole('button',{name:'Предпросмотр'}).click();
  const preview=await pending;
  await expect(preview).toHaveURL(/\/programme-admin\/speakers\/preview#speakers$/);
  await expect(preview.locator('#speakers .speaker').last())
    .toHaveAttribute('aria-label', /Тестовый Спикер CMS/, {timeout:16000});
  await preview.close();
  await page.getByRole('button',{name:'Опубликовать'}).click();
  const confirm=page.getByRole('dialog',{name:'Опубликовать список спикеров?'});
  await confirm.getByRole('button',{name:'Опубликовать'}).click();
  await expect.poll(async () => (await publicSpeakers(page)).speakers.length,{timeout:15000}).toBe(36);
  const visible=(await publicSpeakers(page)).speakers;
  expect(visible.at(-1).name).toBe('Тестовый Спикер CMS');
  expect(visible.at(-1).photo).toMatch(/\/api\/programme\/image\//);
  expect((await page.evaluate(async () => (await fetch('/api/programme')).json())).revision)
    .toBe(existingProgram.revision);
  await page.locator('.tools-menu > summary').click();
  await page.getByRole('button',{name:'История публикаций'}).click();
  const history=page.getByRole('dialog',{name:'История публикаций'});
  await expect(history).toBeVisible();
  await history.getByRole('button',{name:'Восстановить'}).first().click();
  await page.getByRole('dialog',{name:/Восстановить версию/})
    .getByRole('button',{name:'Восстановить'}).click();
  await expect(page.locator('.speaker-list-row')).toHaveCount(35);
  expect((await publicSpeakers(page)).speakers.length).toBe(36);
  await page.getByRole('button',{name:'Опубликовать'}).click();
  await page.getByRole('dialog',{name:'Опубликовать список спикеров?'})
    .getByRole('button',{name:'Опубликовать'}).click();
  await expect.poll(async () => (await publicSpeakers(page)).speakers.length,{timeout:16000}).toBe(35);
  expect((await publicSpeakers(page)).speakers.map(s=>s.name))
    .toEqual(original.speakers.map(s=>s.name));
});

test('change order, hide card and reject duplicate entries', async ({page}) => {
  await login(page);
  await page.locator('.speaker-list-row').first().getByRole('button',{name:'Ниже'}).click();
  await page.locator('.speaker-list-row').first().locator('.speaker-list-pick').click();
  await page.locator('.speaker-visible-toggle').click();
  await expect.poll(async () =>
    (await draftSpeakers(page)).draft.speakers[0].visible,{timeout:15000}).toBe(false);
  await page.getByRole('button',{name:'Опубликовать'}).click();
  await page.getByRole('dialog',{name:'Опубликовать список спикеров?'})
    .getByRole('button',{name:'Опубликовать'}).click();
  const live=await publicSpeakers(page);
  expect(live.speakers.length).toBe(34);
  expect(live.speakers.some(s=>s.name==='Константин Виноградов')).toBe(false);
  await page.getByRole('button',{name:'Создать копию'}).click();
  await expect(page.locator('.speaker-list-row')).toHaveCount(36);
  await page.locator('[data-speaker-field="name"]').fill('Андрей Емелин');
  await page.getByRole('button',{name:'Сохранить'}).click();
  await expect(page.locator('.toast.bad')).toContainText('уже есть');
  expect((await publicSpeakers(page)).speakers.length).toBe(34);
});

test('mobile speaker list, new speaker form and image gallery have no overflow', async ({page}) => {
  await login(page,390);
  await expect(page.locator('.speakers-mobile-tabs')).toBeVisible();
  await page.getByRole('button',{name:'+ Добавить спикера'}).click();
  await expect(page.locator('.speakers-inspector')).toBeVisible();
  await expect(page.locator('[data-speaker-field="name"]')).toBeVisible();
  await page.getByRole('button',{name:'Выбрать из библиотеки'}).click();
  const gallery=page.getByRole('dialog',{name:'Выберите фотографию'});
  await expect(gallery.locator('.library-item').first()).toBeVisible();
  await gallery.locator('#gallery-search').fill('Емелин');
  await expect(gallery.locator('.library-item')).toHaveCount(1);
  const geometry=await page.evaluate(() => document.documentElement.scrollWidth-innerWidth);
  expect(geometry).toBeLessThanOrEqual(2);
  await page.keyboard.press('Escape');
  await page.getByRole('button',{name:'Все спикеры'}).click();
  await expect(page.locator('.speakers-list-pane')).toBeVisible();
  await page.locator('#speaker-search').fill('Емелин');
  await expect(page.locator('.speaker-list-row:visible')).toHaveCount(1);
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth-innerWidth))
    .toBeLessThanOrEqual(2);
});


test('visual layout is readable on desktop and phone without clipping', async ({page}) => {
  await mkdir('test-results/speakers-ux', {recursive:true});
  for (const width of [390, 1440]) {
    await page.context().clearCookies();
    await login(page, width);
    if (width === 390) {
      await page.locator('.speaker-list-row').first().locator('.speaker-list-pick').click();
    }
    await expect(page.locator('.speakers-inspector')).toBeVisible();
    await expect(page.locator('.speaker-edit-card')).toBeVisible();
    const noOverflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    expect(noOverflow).toBeLessThanOrEqual(2);
    await page.screenshot({
      path: 'test-results/speakers-ux/speakers-' + width + '.png',
      animations:'disabled',
    });
    await page.locator('.speaker-edit-photo-actions [data-action="gallery"]').click();
    await expect(page.getByRole('dialog',{name:'Выберите фотографию'})).toBeVisible();
    await page.screenshot({
      path: 'test-results/speakers-ux/gallery-' + width + '.png',
      animations:'disabled',
    });
    await page.keyboard.press('Escape');
  }
});

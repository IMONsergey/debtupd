import http from 'node:http';
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { readFile, readdir, writeFile, rename, mkdir } from 'node:fs/promises';
import { join, extname, basename } from 'node:path';
import { validateProgramme, ProgrammeError } from './programme-schema.mjs';

const maxJson = 1_000_000;
const maxImage = 4_000_000;
const sessionLife = 8 * 60 * 60 * 1000;
const cookies = new Map();
const attempts = new Map();

export function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  return { salt, hash: scryptSync(password, salt, 64).toString('hex') };
}

function verifyPassword(password, record) {
  if (!record?.salt || !record?.hash || !/^[a-f0-9]{128}$/.test(record.hash)) return false;
  const value = scryptSync(password, record.salt, 64);
  return timingSafeEqual(value, Buffer.from(record.hash, 'hex'));
}

async function atomicWrite(file, obj) {
  const temp = file + '.tmp-' + randomBytes(8).toString('hex');
  await writeFile(temp, JSON.stringify(obj, null, 2) + '\n', { mode: 0o600 });
  await rename(temp, file);
}

async function readJson(file) {
  return JSON.parse(await readFile(file, 'utf8'));
}

async function bodyBytes(request, max) {
  const chunks = [];
  let n = 0;
  for await (const chunk of request) {
    n += chunk.length;
    if (n > max) throw new ProgrammeError('too_large', 'Размер данных превышает допустимый.');
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

async function jsonBody(request) {
  if (!String(request.headers['content-type'] || '').startsWith('application/json'))
    throw new ProgrammeError('invalid_type', 'Нужен JSON.');
  try {
    return JSON.parse((await bodyBytes(request, maxJson)).toString('utf8'));
  } catch (error) {
    if (error instanceof ProgrammeError) throw error;
    throw new ProgrammeError('invalid_json', 'Не удалось прочитать JSON.');
  }
}

function send(response, status, payload, headers = {}) {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store, no-cache, must-revalidate',
    'X-Content-Type-Options': 'nosniff',
    ...headers,
  });
  response.end(JSON.stringify(payload));
}

function clientIp(request) {
  if (['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(request.socket.remoteAddress))
    return (
      String(request.headers['x-forwarded-for'] || '')
        .split(',')[0]
        .trim() || 'local'
    );
  return request.socket.remoteAddress || 'unknown';
}

function sessionFrom(request) {
  const cookie = (request.headers.cookie || '')
    .split(';')
    .map((x) => x.trim())
    .find((x) => x.startsWith('dt_programme_sid='));
  if (!cookie) return null;
  const session = cookies.get(cookie.slice('dt_programme_sid='.length));
  if (!session || session.expires < Date.now()) return null;
  return session;
}

function authenticated(request, response) {
  const s = sessionFrom(request);
  if (!s) {
    send(response, 401, { error: 'Для редактирования войдите в систему.' });
    return null;
  }
  return s;
}

function requireMutation(request, response, session, origin) {
  if (request.headers.origin !== origin) {
    send(response, 403, { error: 'Неправильный источник запроса.' });
    return false;
  }
  if (request.headers['x-programme-csrf'] !== session.csrf) {
    send(response, 403, { error: 'Недействительная сессия. Обновите страницу.' });
    return false;
  }
  return true;
}

const mimeByExt = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
};

async function fileResponse(response, file, type, { admin = false, preview = false } = {}) {
  try {
    const bytes = await readFile(file);
    response.writeHead(200, {
      'Content-Type': type || mimeByExt[extname(file)] || 'application/octet-stream',
      'Cache-Control': admin ? 'no-store' : 'public, max-age=600',
      'X-Content-Type-Options': 'nosniff',
      ...(admin
        ? {
            ...(preview
              ? {}
              : {
                  'Content-Security-Policy':
                    "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; font-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'",
                }),
            'X-Frame-Options': 'DENY',
          }
        : {}),
    });
    response.end(bytes);
  } catch {
    send(response, 404, { error: 'Файл не найден.' });
  }
}

function typeForUpload(contentType, bytes) {
  const t = (contentType || '').split(';')[0].trim();
  if (
    t === 'image/png' &&
    bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  )
    return '.png';
  if (t === 'image/jpeg' && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff)
    return '.jpg';
  if (
    t === 'image/webp' &&
    bytes.toString('ascii', 0, 4) === 'RIFF' &&
    bytes.toString('ascii', 8, 12) === 'WEBP'
  )
    return '.webp';
  throw new ProgrammeError('invalid_image', 'Загрузите JPG, PNG или WebP.');
}

export async function createProgrammeServer({ distDir, adminDir, dataDir, origin }) {
  await mkdir(dataDir, { recursive: true, mode: 0o700 });
  await mkdir(join(dataDir, 'history'), { recursive: true, mode: 0o700 });
  await mkdir(join(dataDir, 'images'), { recursive: true, mode: 0o700 });
  const publishedPath = join(dataDir, 'published.json');
  const draftPath = join(dataDir, 'draft.json');
  const authPath = join(dataDir, 'auth.json');

  const seed = validateProgramme(await readJson(join(distDir, 'data/programme-seed.json')));
  let published;
  try {
    published = await readJson(publishedPath);
  } catch (e) {
    if (e.code !== 'ENOENT') throw e;
    published = { revision: 1, updatedAt: new Date().toISOString(), programme: seed };
    await atomicWrite(publishedPath, published);
  }
  try {
    await readJson(draftPath);
  } catch (e) {
    if (e.code !== 'ENOENT') throw e;
    await atomicWrite(draftPath, { ...published });
  }

  let mutations = Promise.resolve();
  function serial(task) {
    const run = mutations.then(task, task);
    mutations = run.catch(() => {});
    return run;
  }

  async function imagesList() {
    const result = [];
    const assets = [
      [
        'Фотографии программы',
        join(distDir, 'assets/images/programme'),
        '/assets/images/programme/',
      ],
      ['Фотографии спикеров', join(distDir, 'assets/figma'), '/assets/figma/'],
      ['Загруженные фотографии', join(dataDir, 'images'), '/api/programme/image/'],
    ];
    for (const [group, folder, prefix] of assets) {
      const names = await readdir(folder).catch(() => []);
      for (const name of names) {
        if (!/^[\w.-]+\.(png|jpe?g|webp)$/i.test(name)) continue;
        if (result.length < 700) result.push({ group, name, url: prefix + name });
      }
    }
    return result;
  }

  async function historyList() {
    const files = (await readdir(join(dataDir, 'history')))
      .filter((name) => /^revision-\d+\.json$/.test(name))
      .sort((a, b) => Number(b.match(/\d+/)[0]) - Number(a.match(/\d+/)[0]))
      .slice(0, 25);
    const result = [];
    for (const file of files) {
      const record = await readJson(join(dataDir, 'history', file));
      result.push({ revision: record.revision, updatedAt: record.updatedAt });
    }
    return result;
  }

  const server = http.createServer(async (request, response) => {
    const uri = new URL(request.url || '/', 'http://localhost');
    const pathname = uri.pathname;
    const method = request.method || 'GET';

    try {
      if (method === 'GET' && pathname === '/health') {
        send(response, 200, {
          ok: true,
          authConfigured: !!(await readJson(authPath).catch(() => null)),
        });
        return;
      }
      if (method === 'GET' && pathname === '/api/programme') {
        const state = await readJson(publishedPath);
        send(response, 200, { revision: state.revision, programme: state.programme });
        return;
      }
      const picture = /^\/api\/programme\/image\/([a-f0-9]{28}\.(?:jpg|png|webp))$/.exec(pathname);
      if (method === 'GET' && picture) {
        await fileResponse(response, join(dataDir, 'images', picture[1]));
        return;
      }
      if (
        method === 'GET' &&
        (pathname === '/programme-admin' || pathname === '/programme-admin/')
      ) {
        await fileResponse(response, join(adminDir, 'index.html'), null, { admin: true });
        return;
      }
      if (
        method === 'GET' &&
        ['/programme-admin/app.js', '/programme-admin/style.css'].includes(pathname)
      ) {
        await fileResponse(response, join(adminDir, basename(pathname)), null, { admin: true });
        return;
      }
      if (method === 'GET' && pathname === '/programme-admin/preview') {
        if (!authenticated(request, response)) return;
        // The actual site React app reads the authenticated draft only on this exact path.
        await fileResponse(response, join(distDir, 'index.html'), 'text/html; charset=utf-8', {
          admin: true,
          preview: true,
        });
        return;
      }
      if (method === 'GET' && pathname === '/api/programme/session') {
        const session = sessionFrom(request);
        send(
          response,
          200,
          session ? { authenticated: true, csrf: session.csrf } : { authenticated: false },
        );
        return;
      }
      if (method === 'POST' && pathname === '/api/programme/login') {
        if (request.headers.origin !== origin) {
          send(response, 403, { error: 'Неправильный источник запроса.' });
          return;
        }
        const ip = clientIp(request);
        const now = Date.now();
        const attemptTimes = (attempts.get(ip) || []).filter((t) => now - t < 15 * 60_000);
        if (attemptTimes.length >= 8) {
          send(response, 429, { error: 'Слишком много попыток. Попробуйте через 15 минут.' });
          return;
        }
        const input = await jsonBody(request);
        const password = typeof input.password === 'string' ? input.password : '';
        const auth = await readJson(authPath).catch(() => null);
        if (!auth || !verifyPassword(password, auth)) {
          attemptTimes.push(now);
          attempts.set(ip, attemptTimes);
          send(response, 401, { error: 'Неверный пароль.' });
          return;
        }
        attempts.delete(ip);
        const key = randomBytes(32).toString('hex');
        const session = { csrf: randomBytes(24).toString('hex'), expires: now + sessionLife };
        cookies.set(key, session);
        send(
          response,
          200,
          { authenticated: true, csrf: session.csrf },
          {
            'Set-Cookie':
              'dt_programme_sid=' +
              key +
              '; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=28800',
          },
        );
        return;
      }
      if (!pathname.startsWith('/api/programme/')) {
        send(response, 404, { error: 'Не найдено.' });
        return;
      }
      const session = authenticated(request, response);
      if (!session) return;

      if (method === 'GET' && pathname === '/api/programme/preview') {
        const draft = await readJson(draftPath);
        send(response, 200, { revision: draft.revision, programme: draft.programme });
        return;
      }
      if (method === 'GET' && pathname === '/api/programme/admin') {
        const [draft, current, history, portraits] = await Promise.all([
          readJson(draftPath),
          readJson(publishedPath),
          historyList(),
          imagesList(),
        ]);
        send(response, 200, {
          draft,
          published: { revision: current.revision, updatedAt: current.updatedAt },
          history,
          portraits,
        });
        return;
      }
      if (!requireMutation(request, response, session, origin)) return;
      if (method === 'POST' && pathname === '/api/programme/logout') {
        const raw = (request.headers.cookie || '').match(/(?:^|;\s*)dt_programme_sid=([a-f0-9]+)/);
        if (raw) cookies.delete(raw[1]);
        send(
          response,
          200,
          { ok: true },
          {
            'Set-Cookie': 'dt_programme_sid=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0',
          },
        );
        return;
      }
      if (method === 'POST' && pathname === '/api/programme/change-password') {
        const input = await jsonBody(request);
        if (
          typeof input.newPassword !== 'string' ||
          input.newPassword.length < 14 ||
          input.newPassword.length > 128
        )
          throw new ProgrammeError(
            'invalid_password',
            'Новый пароль должен содержать от 14 до 128 символов.',
          );
        const current = await readJson(authPath);
        if (!verifyPassword(input.oldPassword || '', current))
          throw new ProgrammeError('invalid_password', 'Текущий пароль указан неверно.');
        await atomicWrite(authPath, hashPassword(input.newPassword));
        cookies.clear();
        send(
          response,
          200,
          { ok: true, relogin: true },
          {
            'Set-Cookie': 'dt_programme_sid=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0',
          },
        );
        return;
      }
      if (method === 'PUT' && pathname === '/api/programme/draft') {
        const input = await jsonBody(request);
        const clean = validateProgramme(input.programme);
        const result = await serial(async () => {
          const current = await readJson(draftPath);
          if (input.expectedRevision !== current.revision)
            throw new ProgrammeError(
              'conflict',
              'Черновик изменился в другом окне. Обновите редактор.',
            );
          const next = {
            revision: current.revision + 1,
            updatedAt: new Date().toISOString(),
            programme: clean,
          };
          await atomicWrite(draftPath, next);
          return next;
        });
        send(response, 200, { draft: result });
        return;
      }
      if (method === 'POST' && pathname === '/api/programme/publish') {
        const input = await jsonBody(request);
        const result = await serial(async () => {
          const [draft, current] = await Promise.all([
            readJson(draftPath),
            readJson(publishedPath),
          ]);
          if (
            input.expectedRevision !== draft.revision ||
            input.expectedPublishedRevision !== current.revision
          )
            throw new ProgrammeError(
              'conflict',
              'Программа изменилась в другом окне. Обновите редактор.',
            );
          const updated = {
            revision: current.revision + 1,
            updatedAt: new Date().toISOString(),
            programme: validateProgramme(draft.programme),
          };
          await atomicWrite(
            join(dataDir, 'history', 'revision-' + current.revision + '.json'),
            current,
          );
          await atomicWrite(publishedPath, updated);
          return updated;
        });
        send(response, 200, {
          published: { revision: result.revision, updatedAt: result.updatedAt },
        });
        return;
      }
      if (method === 'POST' && pathname === '/api/programme/restore') {
        const input = await jsonBody(request);
        const revision = Number(input.revision);
        if (!Number.isSafeInteger(revision) || revision < 1)
          throw new ProgrammeError('invalid_revision', 'Некорректная версия.');
        const result = await serial(async () => {
          const old = await readJson(join(dataDir, 'history', 'revision-' + revision + '.json'));
          const current = await readJson(draftPath);
          if (input.expectedRevision !== current.revision)
            throw new ProgrammeError(
              'conflict',
              'Черновик изменён в другом окне. Обновите редактор.',
            );
          const next = {
            revision: current.revision + 1,
            updatedAt: new Date().toISOString(),
            programme: validateProgramme(old.programme),
          };
          await atomicWrite(draftPath, next);
          return next;
        });
        send(response, 200, { draft: result });
        return;
      }
      if (method === 'POST' && pathname === '/api/programme/upload') {
        const bytes = await bodyBytes(request, maxImage);
        const ext = typeForUpload(request.headers['content-type'], bytes);
        const name = randomBytes(14).toString('hex') + ext;
        await writeFile(join(dataDir, 'images', name), bytes, { flag: 'wx', mode: 0o600 });
        send(response, 201, { url: '/api/programme/image/' + name, name });
        return;
      }
      send(response, 404, { error: 'Маршрут не найден.' });
    } catch (error) {
      const err = error instanceof ProgrammeError ? error : null;
      const status =
        err?.code === 'too_large'
          ? 413
          : err?.code === 'conflict'
            ? 409
            : err?.code === 'invalid_revision'
              ? 404
              : err
                ? 400
                : 500;
      if (!err) console.error('programme_error', error?.code || error?.message);
      send(response, status, { error: err?.message || 'Ошибка сервера. Попробуйте позднее.' });
    }
  });
  return server;
}

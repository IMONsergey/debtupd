import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { randomBytes } from 'node:crypto';
import { createProgrammeServer, hashPassword } from './programme-service.mjs';

test('programme CMS isolates drafts, validates auth, publishes and restores history', async () => {
  const root = await mkdtemp(join(tmpdir(), 'debt-programme-cms-'));
  const distDir = join(root, 'dist');
  const dataDir = join(root, 'state');
  await mkdir(join(distDir, 'data'), { recursive: true });
  const seed = JSON.parse(await readFile(resolve('public/data/programme-seed.json'), 'utf8'));
  await writeFile(join(distDir, 'data/programme-seed.json'), JSON.stringify(seed));
  const password = randomBytes(24).toString('base64url');
  await mkdir(dataDir, { recursive: true });
  await writeFile(join(dataDir, 'auth.json'), JSON.stringify(hashPassword(password)));
  const origin = 'https://sandbox.local';
  const server = await createProgrammeServer({
    distDir,
    dataDir,
    adminDir: resolve('admin/programme'),
    origin,
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const base = 'http://127.0.0.1:' + server.address().port;
  const api = async (route, method = 'GET', payload, headers = {}) => {
    const response = await fetch(base + route, {
      method,
      headers,
      body: payload === undefined ? undefined : JSON.stringify(payload),
    });
    return { response, data: await response.json() };
  };

  try {
    const publicBefore = await api('/api/programme');
    assert.equal(publicBefore.response.status, 200);
    assert.equal(publicBefore.data.programme.stages.length, 3);
    assert.equal((await api('/api/programme/admin')).response.status, 401);
    assert.equal((await api('/api/programme/preview')).response.status, 401);
    const bad = await api(
      '/api/programme/login',
      'POST',
      { password: 'wrong' },
      {
        Origin: origin,
        'Content-Type': 'application/json',
      },
    );
    assert.equal(bad.response.status, 401);
    const good = await api(
      '/api/programme/login',
      'POST',
      { password },
      {
        Origin: origin,
        'Content-Type': 'application/json',
      },
    );
    assert.equal(good.response.status, 200);
    const cookie = good.response.headers.get('set-cookie');
    assert.match(cookie, /HttpOnly/);
    assert.match(cookie, /Secure/);
    assert.match(cookie, /SameSite=Strict/);
    const session = good.data.csrf;
    const authHeaders = {
      Cookie: cookie.split(';')[0],
      Origin: origin,
      'X-Programme-Csrf': session,
      'Content-Type': 'application/json',
    };
    const forbidden = await api(
      '/api/programme/draft',
      'PUT',
      { expectedRevision: 1, programme: seed },
      {
        Cookie: cookie.split(';')[0],
        Origin: origin,
        'Content-Type': 'application/json',
      },
    );
    assert.equal(forbidden.response.status, 403);
    const stale = await api(
      '/api/programme/draft',
      'PUT',
      { expectedRevision: 77, programme: seed },
      authHeaders,
    );
    assert.equal(stale.response.status, 409);
    const invalid = structuredClone(seed);
    invalid.stages[1].id = invalid.stages[0].id;
    const broken = await api(
      '/api/programme/draft',
      'PUT',
      { expectedRevision: 1, programme: invalid },
      authHeaders,
    );
    assert.equal(broken.response.status, 400);
    const draft = structuredClone(seed);
    draft.stages[0].entries.push({
      id: 'test-session',
      kind: 'session',
      number: 5,
      time: '18:30–19:00',
      title: 'Тестовая сессия',
      category: '',
      visible: true,
      moderator: null,
      talks: [],
      additionalNote: '',
    });
    const saved = await api(
      '/api/programme/draft',
      'PUT',
      { expectedRevision: 1, programme: draft },
      authHeaders,
    );
    assert.equal(saved.response.status, 200);
    assert.equal(saved.data.draft.revision, 2);
    assert.equal(
      (await api('/api/programme')).data.programme.stages[0].entries.length,
      seed.stages[0].entries.length,
      'draft must not change published programme',
    );
    const preview = await api('/api/programme/preview', 'GET', undefined, {
      Cookie: cookie.split(';')[0],
    });
    assert.equal(
      preview.data.programme.stages[0].entries.length,
      seed.stages[0].entries.length + 1,
    );
    const publish = await api(
      '/api/programme/publish',
      'POST',
      { expectedRevision: 2, expectedPublishedRevision: 1 },
      authHeaders,
    );
    assert.equal(publish.response.status, 200);
    const live = (await api('/api/programme')).data;
    assert.equal(live.revision, 2);
    assert.equal(live.programme.stages[0].entries.length, seed.stages[0].entries.length + 1);
    const restored = await api(
      '/api/programme/restore',
      'POST',
      { revision: 1, expectedRevision: 2 },
      authHeaders,
    );
    assert.equal(restored.response.status, 200);
    const stillLive = (await api('/api/programme')).data;
    assert.equal(stillLive.programme.stages[0].entries.length, seed.stages[0].entries.length + 1);
    const revert = await api(
      '/api/programme/publish',
      'POST',
      { expectedRevision: 3, expectedPublishedRevision: 2 },
      authHeaders,
    );
    assert.equal(revert.response.status, 200);
    assert.equal(
      (await api('/api/programme')).data.programme.stages[0].entries.length,
      seed.stages[0].entries.length,
    );
    const history = await api('/api/programme/admin', 'GET', undefined, {
      Cookie: cookie.split(';')[0],
    });
    assert.equal(history.data.history.length, 2);
    const image = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 0]);
    const imageResponse = await fetch(base + '/api/programme/upload', {
      method: 'POST',
      body: image,
      headers: {
        Cookie: cookie.split(';')[0],
        Origin: origin,
        'X-Programme-Csrf': session,
        'Content-Type': 'image/png',
      },
    });
    assert.equal(imageResponse.status, 201);
    const imageInfo = await imageResponse.json();
    assert.match(imageInfo.url, /^\/api\/programme\/image\/[a-f0-9]{28}\.png$/);
    const downloaded = await fetch(base + imageInfo.url);
    assert.equal(downloaded.status, 200);
    assert.equal(downloaded.headers.get('content-type'), 'image/png');
    assert.deepEqual(Buffer.from(await downloaded.arrayBuffer()), image);
    const badUpload = await fetch(base + '/api/programme/upload', {
      method: 'POST',
      body: Buffer.from('invalid image'),
      headers: {
        Cookie: cookie.split(';')[0],
        Origin: origin,
        'X-Programme-Csrf': session,
        'Content-Type': 'image/png',
      },
    });
    assert.equal(badUpload.status, 400);
    const logout = await api('/api/programme/logout', 'POST', {}, authHeaders);
    assert.equal(logout.response.status, 200);
    assert.equal(
      (
        await api('/api/programme/admin', 'GET', undefined, {
          Cookie: cookie.split(';')[0],
        })
      ).response.status,
      401,
    );
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await rm(root, { recursive: true, force: true });
  }
});

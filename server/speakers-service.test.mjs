import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { randomBytes } from 'node:crypto';
import { createProgrammeServer, hashPassword } from './programme-service.mjs';
import { validateSpeakers } from './speakers-schema.mjs';

const source = JSON.parse(await readFile(resolve('public/data/speakers-seed.json'), 'utf8'));

test('speaker schema preserves all 35 approved entries and rejects duplicates or unsafe photos', () => {
  assert.equal(source.length, 35);
  const clean = validateSpeakers(source, { publishing: true });
  assert.equal(clean[0].name, 'Владимир Вербицкий');
  assert.equal(clean.at(-1).name, 'Павел Соболев');
  assert.deepEqual(clean.map(s => s.name), source.map(s => s.name));
  const repeated = structuredClone(clean);
  repeated.push({ ...repeated[0], id: 'another-id' });
  assert.throws(() => validateSpeakers(repeated), /уже есть/);
  const badPhoto = structuredClone(clean);
  badPhoto[0].photo = 'https://example.invalid/photo.png';
  assert.throws(() => validateSpeakers(badPhoto), /адрес фотографии/);
  const empty = structuredClone(clean);
  empty.push({ id:'speaker-new', name:'Новый спикер', role:'',image:'',photo:'',visible:false });
  assert.equal(validateSpeakers(empty).length, 36);
  empty.at(-1).visible = true;
  assert.throws(() => validateSpeakers(empty, { publishing: true }), /заполните должность и фото/);
});

test('isolated speaker CMS saves draft, publishes explicitly, restores, and protects origin and programme', async () => {
  const folder = await mkdtemp(join(tmpdir(), 'debt-speakers-cms-'));
  const distDir = join(folder, 'dist');
  const dataDir = join(folder, 'cms');
  await mkdir(join(distDir, 'data'), { recursive: true });
  await mkdir(dataDir, { recursive: true });
  const program = JSON.parse(await readFile(resolve('public/data/programme-seed.json'), 'utf8'));
  await writeFile(join(distDir, 'data/programme-seed.json'), JSON.stringify(program));
  await writeFile(join(distDir, 'data/speakers-seed.json'), JSON.stringify(source));
  const password = randomBytes(24).toString('base64url');
  await writeFile(join(dataDir, 'auth.json'), JSON.stringify(hashPassword(password)));
  const origin = 'https://debt-tech.ru';
  const server = await createProgrammeServer({
    distDir, dataDir,
    adminDir: resolve('admin/programme'),
    origin,
    allowedOrigins: [origin, 'https://www.debt-tech.ru'],
  });
  await new Promise((done, fail) => {
    server.once('error', fail);
    server.listen(0, '127.0.0.1', done);
  });
  const base = 'http://127.0.0.1:' + server.address().port;
  async function api(path, method='GET', body, headers={}) {
    const response = await fetch(base+path, {
      method, headers, body: body === undefined ? undefined : JSON.stringify(body),
      redirect: 'manual',
    });
    const content = response.headers.get('content-type') || '';
    return {
      response,
      data: content.includes('json') ? await response.json() : await response.text(),
    };
  }
  try {
    const initial = await api('/api/speakers');
    assert.equal(initial.response.status, 200);
    assert.equal(initial.data.revision, 1);
    assert.equal(initial.data.speakers.length, 35);
    assert.equal(initial.data.speakers.at(-1).name, 'Павел Соболев');
    assert.equal((await api('/api/speakers/admin')).response.status, 401);
    assert.equal((await api('/api/speakers/preview')).response.status, 401);
    assert.equal((await api('/programme-admin/speakers/')).response.status, 302);
    const initialProgram = (await api('/api/programme')).data;
    const signed = await api('/api/programme/login', 'POST', { password }, {
      Origin: origin,'Content-Type':'application/json',
    });
    assert.equal(signed.response.status, 200);
    const cookie=signed.response.headers.get('set-cookie').split(';')[0];
    const csrf=signed.data.csrf;
    const auth={
      Origin:origin, Cookie:cookie,
      'X-Programme-Csrf':csrf,
      'Content-Type':'application/json',
    };
    assert.equal((await api('/programme-admin/speakers/', 'GET', undefined, {Cookie: cookie})).response.status, 200);
    assert.equal((await api('/programme-admin/speakers-editor.js', 'GET', undefined, {Cookie: cookie})).response.status, 200);
    assert.equal((await api('/api/speakers/admin','GET',undefined,{Cookie:cookie})).data.draft.speakers.length, 35);
    const original = initial.data.speakers;
    const next = structuredClone(original);
    next.unshift({ id:'new-guest-2026',name:'Тестовый Участник',role:'Директор по развитию тестового проекта',
      image:'',photo:'/assets/figma/speaker-hd-01.webp',visible:false });
    const unauthorized = await api('/api/speakers/draft','PUT',
      {expectedRevision:1,speakers:next},{...auth,Origin:'https://evil.invalid'});
    assert.equal(unauthorized.response.status,403);
    const withoutCsrf = await api('/api/speakers/draft','PUT',{expectedRevision:1,speakers:next},
      { Origin:origin,Cookie:cookie,'Content-Type':'application/json' });
    assert.equal(withoutCsrf.response.status,403);
    const duplicate = structuredClone(next);
    duplicate[0].name=duplicate[1].name;
    assert.equal((await api('/api/speakers/draft','PUT',{expectedRevision:1,speakers:duplicate},auth)).response.status,400);
    assert.equal((await api('/api/speakers/draft','PUT',{expectedRevision:42,speakers:next},auth)).response.status,409);
    const saved=await api('/api/speakers/draft','PUT',{expectedRevision:1,speakers:next},auth);
    assert.equal(saved.response.status,200);
    assert.equal(saved.data.draft.revision,2);
    assert.equal((await api('/api/speakers')).data.speakers.length,35);
    assert.equal((await api('/api/speakers/preview','GET',undefined,{Cookie:cookie})).data.speakers.length,35);
    const active=structuredClone(next);
    active[0].visible=true;
    const saved2=await api('/api/speakers/draft','PUT',{expectedRevision:2,speakers:active},auth);
    assert.equal(saved2.data.draft.revision,3);
    const stale=await api('/api/speakers/publish','POST',
      {expectedRevision:2,expectedPublishedRevision:1},auth);
    assert.equal(stale.response.status,409);
    const published=await api('/api/speakers/publish','POST',
      {expectedRevision:3,expectedPublishedRevision:1},auth);
    assert.equal(published.response.status,200);
    assert.equal(published.data.published.revision,2);
    const publicList=(await api('/api/speakers')).data;
    assert.equal(publicList.revision,2);
    assert.equal(publicList.speakers.length,36);
    assert.equal(publicList.speakers[0].name,'Тестовый Участник');
    const people=(await api('/api/programme/people','GET',undefined,{Cookie:cookie})).data;
    assert.equal(people.people.length,36);
    assert.equal(people.people[0].photo,'/assets/figma/speaker-hd-01.webp');
    assert.deepEqual((await api('/api/programme')).data,initialProgram,
      'Publishing speakers must not alter programme content or revision');
    const restored=await api('/api/speakers/restore','POST',
      {revision:1,expectedRevision:3},auth);
    assert.equal(restored.response.status,200);
    assert.equal(restored.data.draft.revision,4);
    assert.equal((await api('/api/speakers')).data.speakers.length,36,
      'Restoring goes into a draft, not straight to the public site');
    const finalPublish=await api('/api/speakers/publish','POST',
      {expectedRevision:4,expectedPublishedRevision:2},auth);
    assert.equal(finalPublish.response.status,200);
    assert.equal((await api('/api/speakers')).data.speakers.length,35);
    const badVersion=await api('/api/speakers/restore','POST',
      {revision:99,expectedRevision:4},auth);
    assert.equal(badVersion.response.status,404);
  } finally {
    await new Promise((done) => server.close(done));
    await rm(folder,{recursive:true,force:true});
  }
});

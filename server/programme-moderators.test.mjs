import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateProgramme, ProgrammeError } from './programme-schema.mjs';

const seed = JSON.parse(readFileSync(new URL('../public/data/programme-seed.json', import.meta.url), 'utf8'));

function programmeWith(extra, primary) {
  const copy = structuredClone(seed);
  const session = copy.stages.flatMap((stage) => stage.entries)
    .find((entry) => entry.kind === 'session' && entry.id === 'session-1');
  if (primary !== undefined) session.moderator = primary;
  if (extra !== undefined) session.additionalModerators = extra;
  return copy;
}

const person2 = { name: 'Второй модератор', role: 'Руководитель департамента', photo: '' };
const person3 = { name: 'Третий модератор', role: 'Управляющий директор', photo: '' };
const person4 = { name: 'Четвёртый модератор', role: 'Менеджер', photo: '' };

test('legacy programme remains byte-for-byte equivalent after validation and no schema migration', () => {
  const before = JSON.stringify(seed);
  const clean = validateProgramme(seed);
  assert.equal(JSON.stringify(seed), before, 'Source should not be mutated');
  const existing = clean.stages[0].entries.find((item) => item.id === 'session-1');
  assert.equal(existing.moderator.name, 'Евгений Новиков');
  assert.equal(Object.hasOwn(existing, 'additionalModerators'), false);
  assert.equal(clean.schemaVersion, 1);
});

test('one, two and three moderators are supported and their order is maintained', () => {
  for (const extra of [[], [person2], [person2, person3]]) {
    const clean = validateProgramme(programmeWith(extra));
    const session = clean.stages[0].entries.find((item) => item.id === 'session-1');
    assert.equal(session.moderator.name, 'Евгений Новиков');
    assert.deepEqual(session.additionalModerators?.map((person) => person.name) || [],
      extra.map((person) => person.name));
    assert.equal(session.additionalModerators?.length || 0, extra.length);
  }
});

test('fourth moderator and additional moderator without primary are rejected', () => {
  assert.throws(() => validateProgramme(programmeWith([person2, person3, person4])),
    /не более трёх модераторов/);
  assert.throws(() => validateProgramme(programmeWith([person2], null)),
    /основного модератора/);
  assert.throws(() => validateProgramme(programmeWith('person2')),
    /не более трёх модераторов/);
});

test('duplicate people are rejected case-insensitively and malformed photos are rejected', () => {
  assert.throws(() => validateProgramme(programmeWith([{ ...person2, name: 'еВГЕНий ноВИКОВ' }])),
    /добавлен в сессию несколько раз/);
  assert.throws(() => validateProgramme(programmeWith([person2, { ...person3, name: 'ВТОРОЙ МОДЕРАТОР' }])),
    /добавлен в сессию несколько раз/);
  assert.throws(() => validateProgramme(programmeWith([{ ...person2, photo: 'https://example.com/x.png' }])),
    /адрес изображения/);
});

test('additional moderators survive JSON roundtrip, independent of session speakers', () => {
  const valid = validateProgramme(programmeWith([person2, person3]));
  const clean = validateProgramme(JSON.parse(JSON.stringify(valid)));
  assert.deepEqual(clean.stages[0].entries[0].additionalModerators, [person2, person3]);
  assert.deepEqual(clean.stages[0].entries[0].talks, valid.stages[0].entries[0].talks);
});

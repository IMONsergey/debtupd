import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { speakerPageStarts } from './speaker-pages.js';

test('Speaker pagination counts visible groups, including a partially filled last group', () => {
  assert.deepEqual(speakerPageStarts(15, 3), [0, 3, 6, 9, 12]);
  assert.deepEqual(speakerPageStarts(15, 2), [0, 2, 4, 6, 8, 10, 12, 13]);
  assert.deepEqual(
    speakerPageStarts(15, 1),
    Array.from({ length: 15 }, (_, i) => i),
  );
  assert.deepEqual(speakerPageStarts(2, 3), [0]);
  assert.deepEqual(speakerPageStarts(0, 3), []);
});

test('all 22 speakers remain reachable on desktop, tablet and phone', () => {
  assert.deepEqual(speakerPageStarts(22, 3), [0, 3, 6, 9, 12, 15, 18, 19]);
  assert.deepEqual(
    speakerPageStarts(22, 2),
    Array.from({ length: 11 }, (_, i) => i * 2),
  );
  assert.deepEqual(
    speakerPageStarts(22, 1),
    Array.from({ length: 22 }, (_, i) => i),
  );
});

test('new speakers preserve approved names, roles and loadable portraits', () => {
  const speakers = JSON.parse(readFileSync(new URL('../speakers.json', import.meta.url), 'utf8'));
  const expected = [
    [
      'Кирилл Ноготков',
      'Председатель Совета СРО ААУ «Сириус», директор АО «ССПБ»',
      'speaker-kirill-nogotkov.webp',
    ],
    [
      'Игорь Алексеев',
      'Управляющий партнер экосистемы для арбитражных управляющих и банкротных продуктов ПАО «Совкомбанк»',
      'speaker-igor-alekseev.webp',
    ],
    [
      'Алексей Велижанин',
      'Генеральный директор ПКО «Интел Коллект»',
      'speaker-alexey-velizhanin.webp',
    ],
  ];
  assert.equal(speakers.length, 22);
  assert.equal(new Set(speakers.map((speaker) => speaker.name)).size, speakers.length);
  assert.deepEqual(
    speakers.slice(-3).map(({ name, role, image }) => [name, role, image]),
    expected,
  );
  for (const [, , image] of expected) {
    const bytes = readFileSync(new URL(`../../public/assets/figma/${image}`, import.meta.url));
    assert.equal(bytes.subarray(0, 4).toString(), 'RIFF');
    assert.equal(bytes.subarray(8, 12).toString(), 'WEBP');
  }
});

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

test('all 29 speakers remain reachable on desktop, tablet and phone', () => {
  assert.deepEqual(speakerPageStarts(29, 3), [0, 3, 6, 9, 12, 15, 18, 21, 24, 26]);
  assert.deepEqual(
    speakerPageStarts(29, 2),
    [...Array.from({ length: 14 }, (_, i) => i * 2), 27],
  );
  assert.deepEqual(
    speakerPageStarts(29, 1),
    Array.from({ length: 29 }, (_, i) => i),
  );
});

test('latest ten speakers preserve approved names, roles and loadable portraits', () => {
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
    [
      'Роман Спотарь',
      'Руководитель службы сопровождения и развития дистанционного урегулирования',
      'speaker-roman-spotar.webp',
    ],
    [
      'Анна Белоцерковская',
      'Президент Ассоциации ПАУ «Гарант»',
      'speaker-anna-belotserkovskaya.webp',
    ],
    [
      'Евгений Дородников',
      'Генеральный директор ООО «Автослед ЕМ групп»',
      'speaker-evgeniy-dorodnikov.webp',
    ],
    [
      'Виктор Кислицын',
      'Руководитель коммерческого департамента i-Digital',
      'speaker-viktor-kislitsyn.webp',
    ],
    [
      'Константин Юрьев',
      'Генеральный директор АО «Агредатор»',
      'speaker-konstantin-yuriev.webp',
    ],
    [
      'Василий Епифанов',
      'Руководитель Дирекции дистанционного урегулирования «Альфа-банка»',
      'speaker-vasiliy-epifanov.webp',
    ],
    [
      'Александр Митрохин',
      'Руководитель развития процессов урегулирования «Альфа-банка»',
      'speaker-aleksandr-mitrokhin.webp',
    ],
  ];
  assert.equal(speakers.length, 29);
  assert.equal(new Set(speakers.map((speaker) => speaker.name)).size, speakers.length);
  assert.deepEqual(
    speakers.slice(-expected.length).map(({ name, role, image }) => [name, role, image]),
    expected,
  );
  for (const [, , image] of expected) {
    const bytes = readFileSync(new URL(`../../public/assets/figma/${image}`, import.meta.url));
    assert.equal(bytes.subarray(0, 4).toString(), 'RIFF');
    assert.equal(bytes.subarray(8, 12).toString(), 'WEBP');
  }
});

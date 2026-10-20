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

test('the previous ten speakers keep approved names, roles and original portraits', () => {
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
      'Роман Спатарь',
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
  assert.equal(speakers.length, 35);
  assert.equal(new Set(speakers.map((speaker) => speaker.name)).size, speakers.length);
  assert.deepEqual(
    speakers.slice(19, 29).map(({ name, role, image }) => [name, role, image]),
    expected,
  );
  for (const [, , image] of expected) {
    const bytes = readFileSync(new URL(`../../public/assets/figma/${image}`, import.meta.url));
    assert.equal(bytes.subarray(0, 4).toString(), 'RIFF');
    assert.equal(bytes.subarray(8, 12).toString(), 'WEBP');
  }
});

test('all 35 speakers paginate correctly across desktop, tablet and mobile', () => {
  assert.deepEqual(speakerPageStarts(35, 3), [0, 3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 32]);
  assert.deepEqual(speakerPageStarts(35, 2), [...Array.from({ length: 17 }, (_, i) => i * 2), 33]);
  assert.deepEqual(speakerPageStarts(35, 1), Array.from({ length: 35 }, (_, i) => i));
});

test('three October additions retain supplied roles and valid WebP portraits', () => {
  const speakers = JSON.parse(readFileSync(new URL('../speakers.json', import.meta.url), 'utf8'));
  const expected = [
    ['Екатерина Данкина', 'Директор по развитию портала «Торги России»', 'speaker-ekaterina-dankina.webp'],
    ['Глеб Лябушев', 'Заместитель генерального директора ПКО «А.Сторм»', 'speaker-gleb-lyabushev.webp'],
    ['Евгений Коротков', 'Финансовый директор ООО «ЭВЕРЕСТ ПЛЮС»', 'speaker-evgeniy-korotkov.webp'],
  ];
  assert.equal(speakers.length, 35);
  assert.equal(new Set(speakers.map(({ name }) => name)).size, 35);
  assert.deepEqual(speakers.slice(29, 32).map(({ name, role, image }) => [name, role, image]), expected);
  for (const [, , name] of expected) {
    const bytes = readFileSync(new URL('../../public/assets/figma/' + name, import.meta.url));
    assert.equal(bytes.toString('ascii', 0, 4), 'RIFF');
    assert.equal(bytes.toString('ascii', 8, 12), 'WEBP');
  }
});

test('Marina Selina is the 33rd speaker with exact approved role and valid WebP image', () => {
  const speakers = JSON.parse(readFileSync(new URL('../speakers.json', import.meta.url), 'utf8'));
  assert.equal(speakers.length, 35);
  assert.deepEqual(speakers[32], {
    image: 'speaker-marina-selina.webp',
    name: 'Марина Селина',
    role: 'Начальник управления анализа коммерческой задолженности и стандартизации казначейских функций, Казначейство, Горьковский автомобильный завод',
  });
  const bytes = readFileSync(new URL('../../public/assets/figma/speaker-marina-selina.webp', import.meta.url));
  assert.equal(bytes.toString('ascii', 0, 4), 'RIFF');
  assert.equal(bytes.toString('ascii', 8, 12), 'WEBP');
});

test('two latest speakers preserve approved identities, exact roles and WebP sources', () => {
  const speakers = JSON.parse(readFileSync(new URL('../speakers.json', import.meta.url), 'utf8'));
  const expected = [
    ['Дмитрий Ломакин', 'Директор по развитию бизнеса «Инфолоджистикс»', 'speaker-dmitriy-lomakin-hq-20261020.webp'],
    ['Павел Соболев', 'Коммерческий директор «iDSystems»', 'speaker-pavel-sobolev-hq-20261020.webp'],
  ];
  assert.equal(speakers.length, 35);
  assert.equal(new Set(speakers.map(({ name }) => name)).size, 35);
  assert.deepEqual(speakers.slice(33).map(({ name, role, image }) => [name, role, image]), expected);
  for (const [, , filename] of expected) {
    const data = readFileSync(new URL('../../public/assets/figma/' + filename, import.meta.url));
    assert.equal(data.subarray(0, 4).toString(), 'RIFF');
    assert.equal(data.subarray(8, 12).toString(), 'WEBP');
  }
});

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  availableStandCount,
  exhibitors,
  floors,
  getStandStatus,
  occupiedStandArtwork,
  occupiedStandNumbers,
} from './exhibition.js';

const additions = [
  [2, 'Торги России', 'Маркетплейс по торгам в РФ'],
  [11, 'Id Systems', 'IT-вендор «АйДиСистемс»'],
  [12, 'Info: Logistics', 'Автоматизация обработки судебной документации'],
  [13, 'Интелл коллект', 'ПКО «Интелл коллект»'],
  [14, 'Автослед', 'Вендор «АВТОСЛЕД ЕМ ГРУПП»'],
];

test('new exhibitors keep approved wording, logos and stand assignments', () => {
  for (const [number, name, description] of additions) {
    const matches = exhibitors.filter((item) => item.standNumbers.includes(number));
    assert.equal(matches.length, 1);
    const [company] = matches;
    assert.equal(company.name, name);
    assert.equal(company.description, description);
    assert.equal(getStandStatus(number), 'occupied');
    const logo = readFileSync(new URL(`../../public/${company.logo}`, import.meta.url));
    assert.equal(logo.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  }
});

test('occupied stands use the original floor silhouettes and remain unique', () => {
  const standNumbers = floors.flatMap((floor) => floor.stands.map((stand) => stand.number));
  assert.equal(new Set(occupiedStandNumbers).size, occupiedStandNumbers.length);
  for (const number of occupiedStandNumbers) {
    assert.ok(standNumbers.includes(number));
    const floor = floors.find((floor) => floor.stands.some((stand) => stand.number === number));
    const original = readFileSync(new URL(`../../public/${floor.image}`, import.meta.url), 'utf8');
    assert.ok(occupiedStandArtwork[number]?.shape);
    assert.ok(original.includes(`d="${occupiedStandArtwork[number].shape}"`));
  }
});

test('availability reflects both floors and all confirmed exhibitors', () => {
  const free = floors
    .flatMap((floor) => floor.stands)
    .filter((stand) => getStandStatus(stand.number) === 'free');
  assert.equal(availableStandCount, free.length);
  assert.equal(availableStandCount, 11);
  for (const number of [1, 17, 25, 26, 27]) assert.equal(getStandStatus(number), 'free');
});

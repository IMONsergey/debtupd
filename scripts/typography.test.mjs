import test from 'node:test';
import assert from 'node:assert/strict';
import { typeset } from './typography.mjs';
test('Russian conjunctions and prepositions stay with the following word', () => {
  assert.equal(typeset('Услуги для участников'), 'Услуги для\u00a0участников');
  assert.equal(typeset('на площадке форума'), 'на\u00a0площадке форума');
  assert.equal(typeset('и новые партнёры'), 'и\u00a0новые партнёры');
});
test('Typography does not rewrite approved wording or tariff prices', () => {
  const original = 'Рейтинг ПКО-300 — уникальный инструмент оценки';
  assert.equal(typeset(original).replaceAll('\u00a0', ' '), original);
  assert.equal(typeset('44 000 ₽'), '44 000 ₽');
});
test('URLs and machine identifiers remain byte-identical', () => {
  for (const value of [
    'https://example.com/страница',
    'mailto:redchief@rvzrus.ru',
    'tel:+79657868846',
    'early-registration-form',
    'full-plus',
  ])
    assert.equal(typeset(value), value);
});
test('Typography is idempotent and leaves non-string data untouched', () => {
  const phrase = 'На третьего и четвёртого участника';
  assert.equal(typeset(typeset(phrase)), typeset(phrase));
  assert.equal(typeset(2026), 2026);
  assert.equal(typeset(null), null);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateCorporatePrice } from './corporate-pricing.js';

test('discount boundaries charge the first two tickets in full', () => {
  for (const [count, total, discount] of [
    [1, 66000, 0],
    [2, 132000, 0],
    [3, 191400, 6600],
    [4, 250800, 13200],
    [5, 303600, 26400],
    [6, 356400, 39600],
  ]) {
    assert.deepEqual(calculateCorporatePrice('66 000 ₽', count), { total, discount });
  }
});

test('all current tariffs use the same discount tiers and accept currency spacing', () => {
  assert.deepEqual(calculateCorporatePrice('44\u00a0000 ₽', 5), { total: 202400, discount: 17600 });
  assert.deepEqual(calculateCorporatePrice('49\u202f000 ₽', 5), { total: 225400, discount: 19600 });
  assert.deepEqual(calculateCorporatePrice(66000, '5'), { total: 303600, discount: 26400 });
});

test('invalid quantities and missing prices cannot produce a plausible quote', () => {
  for (const count of ['', 0, -1, 2.5, 1000, Infinity, NaN, 'abc']) {
    assert.throws(() => calculateCorporatePrice(66000, count), RangeError);
  }
  for (const price of ['', undefined, null, 0, -1, Infinity, 'по запросу', '44,000']) {
    assert.throws(() => calculateCorporatePrice(price, 3), RangeError);
  }
});

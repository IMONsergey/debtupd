import test from 'node:test';
import assert from 'node:assert/strict';
import { getScheduledTariffs } from './ticket-pricing.js';

test('new online ticket keeps 25,000 rubles across both pricing phases', () => {
  const list = {
    items: [
      { id: 'business', price: '44 000 ₽' },
      { id: 'online', title: 'Онлайн-участие', fixedPrice: true, price: '25 000 ₽' },
    ],
  };
  for (const date of [
    '2026-09-30T12:00:00+03:00',
    '2026-10-19T12:00:00+03:00',
    '2026-11-13T12:00:00+03:00',
  ]) {
    const scheduled = getScheduledTariffs(list, Date.parse(date));
    const online = scheduled.items.find((item) => item.id === 'online');
    assert.equal(online.price, '25 000 ₽');
    assert.equal(online.fixedPrice, true);
  }
  assert.equal(
    getScheduledTariffs(list, Date.parse('2026-10-19T12:00:00+03:00')).items[0].price,
    '49 000 ₽',
  );
});

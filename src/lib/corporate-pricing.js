export const MAX_CORPORATE_PARTICIPANTS = 999;

export function calculateCorporatePrice(price, participants) {
  const count = Number(participants);
  const unitPrice =
    typeof price === 'number' ? price : Number(String(price).replace(/[\s\u00a0\u202f₽]/g, ''));

  if (!Number.isInteger(count) || count < 1 || count > MAX_CORPORATE_PARTICIPANTS) {
    throw new RangeError('Укажите целое количество участников от 1 до 999.');
  }
  if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
    throw new RangeError('Стоимость тарифа недоступна.');
  }

  // Discounts apply to individual tickets, never to the entire group.
  const tenPercentTickets = Math.min(Math.max(count - 2, 0), 2);
  const twentyPercentTickets = Math.max(count - 4, 0);
  const priceInKopecks = Math.round(unitPrice * 100);
  const baseTotal = priceInKopecks * count;
  const discount =
    Math.round(priceInKopecks * 0.1) * tenPercentTickets +
    Math.round(priceInKopecks * 0.2) * twentyPercentTickets;

  return { total: (baseTotal - discount) / 100, discount: discount / 100 };
}

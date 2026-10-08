export const PRICING_SWITCH_AT = Date.parse('2026-10-02T00:00:00+03:00');
export const PRICING_END_AT = Date.parse('2026-10-31T00:00:00+03:00');

const NEXT_PRICES = {
  business: '49 000 ₽',
  full: '54 000 ₽',
  'full-plus': '66 000 ₽',
};

export function getPricingPhase(now = Date.now()) {
  if (now >= PRICING_SWITCH_AT) {
    return {
      deadline: PRICING_END_AT,
      deadlineLabel: 'до 30 октября',
      prices: NEXT_PRICES,
    };
  }

  return {
    deadline: PRICING_SWITCH_AT,
    deadlineLabel: 'до 1 октября включительно',
    prices: null,
  };
}

export function getScheduledTariffs(tariffs, now = Date.now()) {
  const { prices } = getPricingPhase(now);
  if (!prices) return tariffs;

  return {
    ...tariffs,
    note: 'Стоимость актуальна до 30 октября',
    items: tariffs.items.map((tariff) => ({
      ...tariff,
      price: prices[tariff.id] ?? tariff.price,
    })),
  };
}

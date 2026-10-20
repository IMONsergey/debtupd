export const METRIKA_ID = 104151247;
export function goal(name, params = {}) {
  window.ym?.(METRIKA_ID, 'reachGoal', name, params);
}
export function initAnalytics() {
  const hosts = ['debt-tech.ru', 'www.debt-tech.ru'];
  hosts.push(...(import.meta.env.VITE_METRIKA_HOSTS || '').split(',').map((host) => host.trim()));
  if (!hosts.includes(location.hostname) || window.ym) return;
  const ym = (window.ym = function () {
    (ym.a = ym.a || []).push(arguments);
  });
  ym.l = Date.now();
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://mc.yandex.ru/metrika/tag.js?id=${METRIKA_ID}`;
  document.head.append(script);
  ym(METRIKA_ID, 'init', {
    ssr: true,
    webvisor: true,
    clickmap: true,
    ecommerce: 'dataLayer',
    referrer: document.referrer,
    url: location.href,
    accurateTrackBounce: true,
    trackLinks: true,
  });
}
// Keep international +8xx numbers intact. Only unprefixed 89xx and 9xx
// phone entries are interpreted as Russian domestic mobile numbers.
export function formatPhone(value) {
  const raw = String(value || '').trim();
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';

  let russian = null;
  if (raw.startsWith('+')) {
    if (digits.startsWith('7')) russian = digits;
  } else if (digits.startsWith('89')) {
    russian = '7' + digits.slice(1);
  } else if (digits.startsWith('9')) {
    russian = '7' + digits;
  } else if (digits.startsWith('7')) {
    russian = digits;
  }

  // Do not silently swallow extra digits: the validator must flag invalid
  // country-code lengths, instead of accepting a truncated telephone number.
  if (russian === null) return '+' + digits;
  if (russian.length > 11) return '+' + russian;
  const ruDigits = russian.slice(1);
  return (
    '+7' +
    (ruDigits ? ' ' + ruDigits.slice(0, 3) : '') +
    (ruDigits.length > 3 ? ' ' + ruDigits.slice(3, 6) : '') +
    (ruDigits.length > 6 ? '-' + ruDigits.slice(6, 8) : '') +
    (ruDigits.length > 8 ? '-' + ruDigits.slice(8, 10) : '')
  );
}

export async function submitLead(fields, { endpoint, signal, timeout = 20000 } = {}) {
  const target =
    endpoint ||
    import.meta.env.VITE_FORMS_ENDPOINT ||
    document.querySelector('meta[name="debt-tech-forms-endpoint"]')?.content?.trim();
  if (!target) throw new Error('Сервис заявок недоступен. Свяжитесь с организаторами.');
  const payload = {
    ...fields,
    event_id: 'debt-tech-2026',
    source_page: location.href,
    submitted_at: new Date().toISOString(),
  };
  const params = new URLSearchParams(location.search);
  for (const key of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'])
    if (params.has(key)) payload[key] = params.get(key);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  const abort = () => controller.abort();
  signal?.addEventListener('abort', abort, { once: true });
  try {
    const response = await fetch(target, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    const result = await response.json().catch(() => null);
    if (!response.ok || result?.success !== true)
      throw new Error(
        result?.message ||
          'Не удалось отправить заявку. Попробуйте еще раз или свяжитесь с организаторами.',
      );
    goal('form_success', { form: payload.form_id, tariff: payload.tariff_id || '' });
    return result;
  } catch (error) {
    if (error.name === 'AbortError')
      throw new Error('Сервер не ответил вовремя. Попробуйте еще раз.');
    if (error instanceof TypeError)
      throw new Error(
        'Не удалось связаться с сервером заявок. Данные не отправлены. Повторите попытку или свяжитесь с организатором.',
      );
    throw error;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', abort);
  }
}

export const METRIKA_ID = 104151247;
export function goal(name, params = {}) {
  window.ym?.(METRIKA_ID, 'reachGoal', name, params);
}
export function initAnalytics() {
  if (!['debt-tech.ru', 'www.debt-tech.ru'].includes(location.hostname) || window.ym) return;
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
export function formatPhone(value) {
  let d = value.replace(/\D/g, '');
  if (d.startsWith('9')) d = '7' + d.slice(0, 10);
  else if (d.startsWith('8')) d = '7' + d.slice(1, 11);
  if (!d) return '';
  if (!d.startsWith('7')) return '+' + d.slice(0, 15);
  const n = d.slice(1, 11);
  return (
    '+7' +
    (n ? ' ' + n.slice(0, 3) : '') +
    (n.length > 3 ? ' ' + n.slice(3, 6) : '') +
    (n.length > 6 ? '-' + n.slice(6, 8) : '') +
    (n.length > 8 ? '-' + n.slice(8, 10) : '')
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
          'Не удалось отправить заявку. Попробуйте ещё раз или свяжитесь с организаторами.',
      );
    goal('form_success', { form: payload.form_id, tariff: payload.tariff_id || '' });
    return result;
  } catch (error) {
    if (error.name === 'AbortError')
      throw new Error('Сервер не ответил вовремя. Попробуйте ещё раз.');
    throw error;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', abort);
  }
}

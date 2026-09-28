import http from 'node:http';

const PORT = Number(process.env.PORT || 32026);
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const THREAD_ID = process.env.TELEGRAM_THREAD_ID;
const BITRIX_WEBHOOK_URL = (process.env.BITRIX_WEBHOOK_URL || '').trim().replace(/\/+$/, '');
const BITRIX_DEAL_CATEGORY_ID = Number(process.env.BITRIX_DEAL_CATEGORY_ID || 15);
const BITRIX_EARLY_REGISTRATION_STAGE_ID =
  process.env.BITRIX_EARLY_REGISTRATION_STAGE_ID || 'C15:NEW';
const BITRIX_STAND_BOOKING_STAGE_ID =
  process.env.BITRIX_STAND_BOOKING_STAGE_ID || 'C15:PREPARATION';
const BITRIX_ASSIGNED_BY_ID = process.env.BITRIX_ASSIGNED_BY_ID
  ? Number(process.env.BITRIX_ASSIGNED_BY_ID)
  : null;
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGIN || process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
const MAX_BODY_BYTES = Number(process.env.MAX_BODY_BYTES || 32_768);
const RATE_WINDOW_MS = Number(process.env.RATE_WINDOW_MS || 10 * 60 * 1000);
const RATE_LIMIT = Number(process.env.RATE_LIMIT || 8);
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TELEGRAM_RETRY_DELAYS_MS = [600, 1_600];
const BITRIX_TIMEOUT_MS = Number(process.env.BITRIX_TIMEOUT_MS || 8_000);
const BITRIX_DEBT_FIELDS = {
  formType: 'UF_CRM_DEBT2026_FORM_TYPE',
  participants: 'UF_CRM_DEBT2026_PARTICIPANTS',
  promoCode: 'UF_CRM_DEBT2026_PROMO_CODE',
  jobTitle: 'UF_CRM_DEBT2026_JOB_TITLE',
  userComment: 'UF_CRM_DEBT2026_USER_COMMENT',
  sourcePage: 'UF_CRM_DEBT2026_SOURCE_PAGE',
  utmSource: 'UF_CRM_DEBT2026_UTM_SOURCE',
  utmMedium: 'UF_CRM_DEBT2026_UTM_MEDIUM',
  utmCampaign: 'UF_CRM_DEBT2026_UTM_CAMPAIGN',
  utmContent: 'UF_CRM_DEBT2026_UTM_CONTENT',
  utmTerm: 'UF_CRM_DEBT2026_UTM_TERM',
};
const TARIFFS = {
  business: { name: 'Деловой', price: 44_000 },
  full: { name: 'Полный', price: 49_000 },
  'full-plus': { name: 'Полный Plus', price: 66_000 },
};

const rateBuckets = new Map();

function jsonResponse(response, status, payload, extraHeaders = {}) {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    ...extraHeaders,
  });
  response.end(JSON.stringify(payload));
}

function getOriginHeaders(request) {
  const origin = request.headers.origin;
  if (!origin) return {};
  if (ALLOWED_ORIGINS.length > 0 && !ALLOWED_ORIGINS.includes(origin)) return {};
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'Content-Type, Accept',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  };
}

function clientIp(request) {
  const forwarded = request.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) return forwarded.split(',')[0].trim();
  return request.socket.remoteAddress || 'unknown';
}

function isRateLimited(ip) {
  const now = Date.now();
  const bucket = (rateBuckets.get(ip) || []).filter((time) => now - time < RATE_WINDOW_MS);
  bucket.push(now);
  rateBuckets.set(ip, bucket);

  if (rateBuckets.size > 2000) {
    for (const [key, values] of rateBuckets.entries()) {
      if (values.every((time) => now - time >= RATE_WINDOW_MS)) rateBuckets.delete(key);
    }
  }

  return bucket.length > RATE_LIMIT;
}

function readJson(request) {
  return new Promise((resolve, reject) => {
    let size = 0;
    let body = '';

    request.setEncoding('utf8');
    request.on('data', (chunk) => {
      size += Buffer.byteLength(chunk);
      if (size > MAX_BODY_BYTES) {
        reject(new Error('payload_too_large'));
        request.destroy();
        return;
      }
      body += chunk;
    });
    request.on('end', () => {
      try {
        resolve(JSON.parse(body || '{}'));
      } catch {
        reject(new Error('invalid_json'));
      }
    });
    request.on('error', reject);
  });
}

function clean(value, maxLength = 800) {
  if (value === null || value === undefined) return '';
  return String(value).replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

function escapeHtml(value) {
  return clean(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

function formTitle(formId) {
  if (formId === 'stand-booking-form') return 'Бронирование стенда';
  if (formId === 'corporate-package-form') return 'Корпоративный пакет';
  if (formId === 'early-registration-form') return 'Ранняя регистрация';
  return clean(formId || 'Заявка');
}

function stageIdForForm(formId) {
  if (formId === 'stand-booking-form') return BITRIX_STAND_BOOKING_STAGE_ID;
  return BITRIX_EARLY_REGISTRATION_STAGE_ID;
}

function splitFullName(value) {
  const parts = clean(value, 160).split(' ').filter(Boolean);
  return {
    lastName: parts.length > 1 ? parts[0] : '',
    name: parts.length > 1 ? parts[1] : parts[0] || '',
    secondName: parts.length > 2 ? parts.slice(2).join(' ') : '',
  };
}

function buildDealTitle(payload) {
  const company = clean(payload.company, 255);
  const titleParts = [`DEBT TECH 2026: ${formTitle(payload.form_id)}`];
  const tariff = normalizeTariff(payload);
  if (tariff) titleParts.push(`Тариф ${tariff.name}`);
  if (clean(payload.full_name)) titleParts.push(clean(payload.full_name, 160));
  if (company) titleParts.push(company);
  return titleParts.join(' — ');
}

function normalizeTariff(payload) {
  const id = clean(payload.tariff_id, 40);
  const tariff = TARIFFS[id];
  if (!tariff) return null;
  return { id, ...tariff };
}

function buildBitrixDealFields(payload, contactId, companyId) {
  const fields = {
    TITLE: buildDealTitle(payload),
    CATEGORY_ID: BITRIX_DEAL_CATEGORY_ID,
    STAGE_ID: stageIdForForm(clean(payload.form_id)),
    COMMENTS: clean(payload.comment)
      ? `Комментарий из формы: ${clean(payload.comment, 2000)}`
      : 'Заявка с сайта DEBT TECH 2026. Данные разнесены по полям сделки, контакту и компании.',
    [BITRIX_DEBT_FIELDS.formType]: formTitle(payload.form_id),
    [BITRIX_DEBT_FIELDS.sourcePage]: clean(payload.source_page, 255),
    [BITRIX_DEBT_FIELDS.utmSource]: clean(payload.utm_source, 255),
    [BITRIX_DEBT_FIELDS.utmMedium]: clean(payload.utm_medium, 255),
    [BITRIX_DEBT_FIELDS.utmCampaign]: clean(payload.utm_campaign, 255),
    [BITRIX_DEBT_FIELDS.utmContent]: clean(payload.utm_content, 255),
    [BITRIX_DEBT_FIELDS.utmTerm]: clean(payload.utm_term, 255),
  };

  const participantsCount = Number.parseInt(clean(payload.participants_count, 10), 10);
  if (Number.isInteger(participantsCount) && participantsCount > 0) {
    fields[BITRIX_DEBT_FIELDS.participants] = participantsCount;
  }
  if (clean(payload.promo_code, 120))
    fields[BITRIX_DEBT_FIELDS.promoCode] = clean(payload.promo_code, 120);
  if (clean(payload.job_title, 160))
    fields[BITRIX_DEBT_FIELDS.jobTitle] = clean(payload.job_title, 160);
  if (clean(payload.comment, 2000))
    fields[BITRIX_DEBT_FIELDS.userComment] = clean(payload.comment, 2000);
  if (contactId) fields.CONTACT_ID = contactId;
  if (companyId) fields.COMPANY_ID = companyId;
  if (Number.isInteger(BITRIX_ASSIGNED_BY_ID) && BITRIX_ASSIGNED_BY_ID > 0) {
    fields.ASSIGNED_BY_ID = BITRIX_ASSIGNED_BY_ID;
  }

  return Object.fromEntries(Object.entries(fields).filter(([, value]) => value !== ''));
}

async function callBitrix(method, params) {
  if (!BITRIX_WEBHOOK_URL) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), BITRIX_TIMEOUT_MS);

  try {
    const response = await fetch(`${BITRIX_WEBHOOK_URL}/${method}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(params),
      signal: controller.signal,
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok || result.error) {
      throw new Error(
        `bitrix_error_${response.status}:${clean(result.error_description || result.error || 'unknown', 240)}`,
      );
    }

    return result;
  } finally {
    clearTimeout(timeout);
  }
}

async function createBitrixDeal(payload) {
  if (!BITRIX_WEBHOOK_URL) return null;

  const companyId = await findOrCreateBitrixCompany(payload);
  const contactId = await findOrCreateBitrixContact(payload, companyId);
  const result = await callBitrix('crm.deal.add', {
    fields: buildBitrixDealFields(payload, contactId, companyId),
  });
  const dealId = result?.result;
  if (!dealId) throw new Error('bitrix_error_no_deal_id');
  await setBitrixDealProductRows(dealId, payload);
  return dealId;
}

async function setBitrixDealProductRows(dealId, payload) {
  const tariff = normalizeTariff(payload);
  if (!tariff) return;

  const participantsCount = Number.parseInt(clean(payload.participants_count, 10), 10);
  const quantity =
    Number.isInteger(participantsCount) && participantsCount > 0 ? participantsCount : 1;

  try {
    await callBitrix('crm.deal.productrows.set', {
      id: dealId,
      rows: [
        {
          PRODUCT_NAME: `DEBT TECH 2026 — тариф ${tariff.name}`,
          PRICE: tariff.price,
          QUANTITY: quantity,
        },
      ],
    });
  } catch (error) {
    console.error(new Date().toISOString(), `bitrix_productrows_error:${error.message}`);
  }
}

async function findBitrixDuplicateId(entityType, type, value) {
  const prepared = clean(value, type === 'PHONE' ? 60 : 160);
  if (!prepared) return null;

  const result = await callBitrix('crm.duplicate.findbycomm', {
    entity_type: entityType,
    type,
    values: [prepared],
  });
  const ids = result?.result?.[entityType];
  const id = Array.isArray(ids) ? Number(ids[0]) : null;
  return Number.isInteger(id) && id > 0 ? id : null;
}

async function findOrCreateBitrixCompany(payload) {
  const title = clean(payload.company, 255);
  if (!title) return null;

  const existing = await callBitrix('crm.company.list', {
    filter: { '=TITLE': title },
    select: ['ID', 'TITLE'],
    order: { ID: 'ASC' },
  });
  const existingId = Number(existing?.result?.[0]?.ID);
  if (Number.isInteger(existingId) && existingId > 0) return existingId;

  const result = await callBitrix('crm.company.add', {
    fields: { TITLE: title },
  });
  const companyId = Number(result?.result);
  if (!Number.isInteger(companyId) || companyId <= 0) throw new Error('bitrix_error_no_company_id');
  return companyId;
}

async function findOrCreateBitrixContact(payload, companyId) {
  const email = clean(payload.email, 160);
  const phone = clean(payload.phone, 60);
  const existingId =
    (await findBitrixDuplicateId('CONTACT', 'EMAIL', email)) ||
    (await findBitrixDuplicateId('CONTACT', 'PHONE', phone));
  if (existingId) return existingId;

  const { name, lastName, secondName } = splitFullName(payload.full_name);
  const fields = {
    NAME: name || clean(payload.full_name, 160),
    LAST_NAME: lastName,
    SECOND_NAME: secondName,
    PHONE: phone ? [{ VALUE: phone, VALUE_TYPE: 'WORK' }] : [],
    EMAIL: email ? [{ VALUE: email, VALUE_TYPE: 'WORK' }] : [],
  };
  if (companyId) fields.COMPANY_ID = companyId;

  const result = await callBitrix('crm.contact.add', { fields });
  const contactId = Number(result?.result);
  if (!Number.isInteger(contactId) || contactId <= 0) throw new Error('bitrix_error_no_contact_id');
  return contactId;
}

function formatMessage(payload) {
  const tariff = normalizeTariff(payload);
  const rows = [
    ['Форма', formTitle(payload.form_id)],
    ['Тариф', tariff ? `${tariff.name} — ${tariff.price.toLocaleString('ru-RU')} ₽` : ''],
    ['ФИО', payload.full_name],
    ['Компания', payload.company],
    ['Должность', payload.job_title],
    ['Участников', payload.participants_count],
    ['Промокод', payload.promo_code],
    ['Телефон', payload.phone],
    ['E-mail', payload.email],
    ['Комментарий', payload.comment],
    ['Страница', payload.source_page],
    ['UTM source', payload.utm_source],
    ['UTM medium', payload.utm_medium],
    ['UTM campaign', payload.utm_campaign],
    ['UTM content', payload.utm_content],
    ['UTM term', payload.utm_term],
  ].filter(([, value]) => clean(value));

  const lines = rows.map(([label, value]) => `<b>${escapeHtml(label)}:</b> ${escapeHtml(value)}`);
  return [`<b>DEBT TECH 2026</b>`, ...lines].join('\n');
}

async function sendTelegram(payload) {
  if (!BOT_TOKEN || !CHAT_ID) {
    throw new Error('telegram_not_configured');
  }

  const body = {
    chat_id: CHAT_ID,
    text: formatMessage(payload),
    parse_mode: 'HTML',
    disable_web_page_preview: true,
  };

  if (THREAD_ID) body.message_thread_id = THREAD_ID;

  for (let attempt = 0; attempt <= TELEGRAM_RETRY_DELAYS_MS.length; attempt += 1) {
    try {
      const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (response.ok) return;

      const errorBody = await response.text().catch(() => '');
      const shouldRetry = response.status === 429 || response.status >= 500;
      if (!shouldRetry || attempt === TELEGRAM_RETRY_DELAYS_MS.length) {
        throw new Error(`telegram_error_${response.status}:${errorBody.slice(0, 200)}`);
      }
    } catch (error) {
      if (attempt === TELEGRAM_RETRY_DELAYS_MS.length) throw error;
    }

    await new Promise((resolve) => setTimeout(resolve, TELEGRAM_RETRY_DELAYS_MS[attempt]));
  }
}

function validatePayload(payload) {
  if (clean(payload.website)) return 'spam';
  if (payload.consent !== true) return 'consent_required';

  const formId = clean(payload.form_id);
  if (!['early-registration-form', 'stand-booking-form', 'corporate-package-form'].includes(formId))
    return 'invalid_form';

  const required =
    formId === 'corporate-package-form'
      ? ['full_name', 'phone', 'participants_count', 'tariff_id']
      : ['full_name', 'company', 'phone', 'email'];
  if (formId === 'early-registration-form') required.push('participants_count');
  for (const field of required) {
    if (!clean(payload[field])) return 'required_fields';
  }

  const phoneDigits = clean(payload.phone, 40).replace(/\D/g, '');
  if (phoneDigits.length < 10 || phoneDigits.length > 15) return 'invalid_phone';

  if (payload.email && !EMAIL_PATTERN.test(clean(payload.email, 160))) return 'invalid_email';

  if (['early-registration-form', 'corporate-package-form'].includes(formId)) {
    const count = Number(payload.participants_count);
    if (!Number.isInteger(count) || count < 1 || count > 999) return 'invalid_participants';
  }
  if (formId === 'corporate-package-form' && !TARIFFS[payload.tariff_id]) return 'invalid_tariff';
  if (payload.tariff_id && !TARIFFS[payload.tariff_id]) return 'invalid_tariff';
  return null;
}

const server = http.createServer(async (request, response) => {
  const corsHeaders = getOriginHeaders(request);
  const requestUrl = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`);

  if (request.method === 'OPTIONS') {
    jsonResponse(response, 204, {}, corsHeaders);
    return;
  }

  if (request.method === 'GET' && requestUrl.pathname === '/health') {
    jsonResponse(response, 200, { ok: true });
    return;
  }

  if (request.method !== 'POST' || requestUrl.pathname !== '/api/lead') {
    jsonResponse(response, 404, { success: false, message: 'Not found' }, corsHeaders);
    return;
  }

  const ip = clientIp(request);
  if (isRateLimited(ip)) {
    jsonResponse(
      response,
      429,
      { success: false, message: 'Слишком много отправок. Попробуйте позже.' },
      corsHeaders,
    );
    return;
  }

  try {
    const payload = await readJson(request);
    const validationError = validatePayload(payload);
    if (validationError === 'spam') {
      jsonResponse(response, 200, { success: true }, corsHeaders);
      return;
    }
    if (validationError) {
      jsonResponse(
        response,
        400,
        { success: false, message: 'Проверьте обязательные поля формы.' },
        corsHeaders,
      );
      return;
    }

    if (!BITRIX_WEBHOOK_URL && (!BOT_TOKEN || !CHAT_ID)) {
      jsonResponse(
        response,
        503,
        {
          success: false,
          message: 'Сервис заявок временно недоступен. Свяжитесь с организаторами.',
        },
        corsHeaders,
      );
      return;
    }
    const bitrixDealId = BITRIX_WEBHOOK_URL ? await createBitrixDeal(payload) : null;
    // A real, durable destination must confirm receipt before the UI reports success.
    if (!BITRIX_WEBHOOK_URL) await sendTelegram(payload);
    jsonResponse(response, 200, { success: true, deal_id: bitrixDealId || undefined }, corsHeaders);
    if (BITRIX_WEBHOOK_URL && BOT_TOKEN && CHAT_ID)
      setImmediate(() => {
        sendTelegram(payload).catch(() =>
          console.error(new Date().toISOString(), 'telegram_async_delivery_failed'),
        );
      });
  } catch (error) {
    const status = error.message === 'payload_too_large' ? 413 : 502;
    console.error(new Date().toISOString(), 'lead_delivery_failed', error.name);
    jsonResponse(
      response,
      status,
      { success: false, message: 'Не удалось отправить заявку. Попробуйте ещё раз.' },
      corsHeaders,
    );
  }
});

const HOST = process.env.HOST || '127.0.0.1';
server.listen(PORT, HOST, () => {
  console.log(`forms handler listening on ${HOST}:${PORT}`);
});

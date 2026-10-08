import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';

test('Unconfigured lead service validates data and never reports delivered leads', async () => {
  const port = 32627;
  const server = spawn(process.execPath, ['server/forms-telegram.mjs'], {
    env: {
      ...process.env,
      PORT: String(port),
      TELEGRAM_BOT_TOKEN: '',
      TELEGRAM_CHAT_ID: '',
      BITRIX_WEBHOOK_URL: '',
      ALLOWED_ORIGINS: 'https://www.debt-tech.ru',
      RATE_LIMIT: '30',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  try {
    await once(server.stdout, 'data');
    const base = {
      form_id: 'corporate-package-form',
      full_name: 'Local validation only',
      phone: '+79991112233',
      participants_count: '3',
      tariff_id: 'business',
      consent: true,
    };
    for (const changes of [
      { consent: false },
      { participants_count: '0' },
      { participants_count: '1000' },
      { participants_count: '2.5' },
      { tariff_id: 'invalid' },
      { tariff_id: 'fincifra' }, // member-only offer is not a corporate package
    ]) {
      const r = await fetch(`http://127.0.0.1:${port}/api/lead`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...base, ...changes }),
      });
      assert.equal(r.status, 400);
      assert.equal((await r.json()).success, false);
    }
    const r = await fetch(`http://127.0.0.1:${port}/api/lead`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(base),
    });
    assert.equal(r.status, 503);
    assert.equal((await r.json()).success, false);
  } finally {
    server.kill();
    await once(server, 'exit');
  }
});

test(
  'All forms preserve production CRM fields, products and Telegram messages',
  { timeout: 15000 },
  async () => {
    const port = 32628;
    const lines = [];
    let output = '';
    const server = spawn(
      process.execPath,
      ['--import', './server/fixtures/mock-integrations.mjs', 'server/forms-telegram.mjs'],
      {
        env: {
          ...process.env,
          PORT: String(port),
          HOST: '127.0.0.1',
          TELEGRAM_BOT_TOKEN: 'fixture',
          TELEGRAM_CHAT_ID: '-123',
          TELEGRAM_THREAD_ID: '7',
          BITRIX_WEBHOOK_URL: 'https://bitrix.invalid/rest/fixture',
          BITRIX_DEAL_CATEGORY_ID: '15',
          BITRIX_EARLY_REGISTRATION_STAGE_ID: 'C15:NEW',
          BITRIX_STAND_BOOKING_STAGE_ID: 'C15:PREPARATION',
          BITRIX_ASSIGNED_BY_ID: '',
          RATE_LIMIT: '30',
        },
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    );
    server.stdout.on('data', (chunk) => {
      output += chunk;
      const complete = output.split('\n');
      output = complete.pop();
      for (const line of complete) {
        try {
          lines.push(JSON.parse(line));
        } catch {
          /* Startup line is not JSON. */
        }
      }
    });
    const request = (payload) =>
      fetch(`http://127.0.0.1:${port}/api/lead`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    try {
      await once(server.stdout, 'data');
      const base = {
        full_name: 'Иванов Иван',
        company: 'Fixture',
        email: 'fixture@example.invalid',
        phone: '+70000000000',
        consent: true,
        participants_count: '2',
        source_page: 'https://sandbox.example/',
        promo_code: 'PROMO',
        job_title: 'Manager',
        comment: 'Details',
        utm_source: 'source',
        utm_medium: 'medium',
        utm_campaign: 'campaign',
        utm_content: 'content',
        utm_term: 'term',
      };
      const cases = [
        ['early-registration-form', 'business', 49000, 'C15:NEW'],
        ['early-registration-form', 'full', 54000, 'C15:NEW'],
        ['corporate-package-form', 'full-plus', 66000, 'C15:NEW'],
        ['early-registration-form', 'fincifra', 24500, 'C15:NEW'],
        ['stand-booking-form', '', null, 'C15:PREPARATION'],
      ];
      for (const [form_id, tariff_id, price, stage] of cases) {
        const response = await request({ ...base, form_id, tariff_id, tariff_price: '1 ₽' });
        assert.equal(response.status, 200);
        assert.equal((await response.json()).success, true);
        const deal = lines.filter((line) => line.method === 'crm.deal.add').at(-1).body.fields;
        assert.equal(deal.CATEGORY_ID, 15);
        assert.equal(deal.STAGE_ID, stage);
        assert.equal(deal.CONTACT_ID, 12);
        assert.equal(deal.COMPANY_ID, 11);
        assert.equal(deal.UF_CRM_DEBT2026_PARTICIPANTS, 2);
        assert.equal(deal.UF_CRM_DEBT2026_SOURCE_PAGE, base.source_page);
        assert.equal(deal.UF_CRM_DEBT2026_PROMO_CODE, 'PROMO');
        assert.equal(deal.UF_CRM_DEBT2026_JOB_TITLE, 'Manager');
        assert.equal(deal.UF_CRM_DEBT2026_USER_COMMENT, 'Details');
        for (const key of ['SOURCE', 'MEDIUM', 'CAMPAIGN', 'CONTENT', 'TERM'])
          assert.equal(deal[`UF_CRM_DEBT2026_UTM_${key}`], key.toLowerCase());
        assert.ok(deal.TITLE.startsWith('DEBT TECH 2026: '));
        assert.ok(!deal.TITLE.includes('ТЕСТ ПЕСОЧНИЦЫ'));
        if (price) {
          const rows = lines.filter((line) => line.method === 'crm.deal.productrows.set').at(-1)
            .body.rows;
          assert.equal(rows[0].PRICE, price);
          assert.equal(rows[0].QUANTITY, 2);
        }
      }
      // Browser-side max=2 is not an authorization boundary: enforce on the API as well.
      const rejectedRequests = [
        {
          ...base,
          form_id: 'early-registration-form',
          tariff_id: 'fincifra',
          participants_count: '3',
        },
        {
          ...base,
          form_id: 'early-registration-form',
          tariff_id: 'fincifra',
          participants_count: '0',
        },
        {
          ...base,
          form_id: 'corporate-package-form',
          tariff_id: 'fincifra',
          participants_count: '2',
        },
      ];
      const createdBefore = lines.filter((line) => line.method === 'crm.deal.add').length;
      for (const payload of rejectedRequests) {
        const response = await request(payload);
        assert.equal(response.status, 400);
        assert.equal((await response.json()).success, false);
      }
      assert.equal(lines.filter((line) => line.method === 'crm.deal.add').length, createdBefore);

      for (
        let i = 0;
        i < 100 && lines.filter((line) => line.event === 'telegram_delivered').length < 5;
        i++
      )
        await delay(20);
      const messages = lines.filter((line) => line.method === 'sendMessage');
      assert.equal(messages.length, 5);
      assert.equal(lines.filter((line) => line.event === 'telegram_delivered').length, 5);
      for (const { body } of messages) {
        assert.equal(body.chat_id, '-123');
        assert.equal(body.message_thread_id, '7');
        assert.equal(body.parse_mode, 'HTML');
        assert.ok(body.text.startsWith('<b>DEBT TECH 2026</b>'));
        assert.ok(body.text.includes('UTM source'));
        assert.ok(!body.text.includes('ТЕСТ ПЕСОЧНИЦЫ'));
      }
      const failed = await request({
        ...base,
        form_id: 'stand-booking-form',
        full_name: 'Failure',
      });
      assert.equal(failed.status, 502);
      assert.equal((await failed.json()).success, false);
      await delay(100);
      assert.equal(lines.filter((line) => line.method === 'sendMessage').length, 5);
    } finally {
      server.kill();
      await once(server, 'exit');
    }
  },
);

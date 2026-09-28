import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';

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

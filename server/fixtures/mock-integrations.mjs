// Loaded only by the child process in forms-telegram.test.mjs. No external I/O.
if (process.env.BITRIX_WEBHOOK_URL !== 'https://bitrix.invalid/rest/fixture') {
  throw new Error('Mock transport must never run with real credentials');
}
let dealId = 100;
globalThis.fetch = async (url, options) => {
  const body = JSON.parse(options.body);
  const method = String(url).split('/').at(-1);
  if (
    !String(url).startsWith('https://bitrix.invalid/rest/fixture/') &&
    url !== 'https://api.telegram.org/botfixture/sendMessage'
  ) {
    throw new Error('Unexpected external request in test');
  }
  console.log(JSON.stringify({ mock_transport: true, method, body }));
  if (method === 'sendMessage') {
    return Response.json({ ok: true, result: { message_id: dealId + 1000 } });
  }
  if (method === 'crm.deal.add' && body.fields.TITLE.includes('Failure')) {
    return Response.json({ error: 'fixture_failure' });
  }
  const results = {
    'crm.company.list': [],
    'crm.company.add': 11,
    'crm.duplicate.findbycomm': {},
    'crm.contact.add': 12,
    'crm.deal.add': ++dealId,
    'crm.deal.productrows.set': true,
  };
  if (!(method in results)) throw new Error('Unknown Bitrix method');
  return Response.json({ result: results[method] });
};

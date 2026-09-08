const test = require('node:test');
const assert = require('node:assert/strict');
const { loadFmpQuotes, normalizeQuote, request, resetCaches } = require('../fmp-data');
const app = require('../server');

function setup(t) {
  const original = process.env.FMP_API_KEY; process.env.FMP_API_KEY = 'fixture-secret'; resetCaches();
  t.after(() => { resetCaches(); if (original === undefined) delete process.env.FMP_API_KEY; else process.env.FMP_API_KEY = original; });
}
function quote(symbol = 'ADBE') { return { symbol, price: 123, timestamp: Math.floor(Date.now() / 1000), marketCap: 10000 }; }

test('FMP quotes use profile currency, preserve market time and omit upstream secrets', async t => {
  setup(t); const calls = []; const raw = quote();
  const fetchImpl = async url => {
    const parsed = new URL(url); calls.push(parsed.pathname);
    assert.equal(parsed.searchParams.has('period'), false); assert.equal(parsed.searchParams.has('limit'), false);
    return { ok: true, json: async () => parsed.pathname.endsWith('/quote') ? [{ ...raw, apikey: 'fixture-secret', url }] : [{ symbol: 'ADBE', currency: 'EUR', price: 999, apikey: 'fixture-secret' }] };
  };
  const result = await loadFmpQuotes(['ADBE'], { fetchImpl });
  assert.equal(result.source.provider, 'Financial Modeling Prep');
  assert.equal(result.quotes.ADBE.price, 123); assert.equal(result.quotes.ADBE.currency, 'EUR');
  assert.equal(result.quotes.ADBE.asOf, raw.timestamp); assert.equal(result.quotes.ADBE.marketCap, 10000);
  assert.equal(result.quotes.ADBE.provider, 'Financial Modeling Prep');
  assert.doesNotMatch(JSON.stringify(result), /fixture-secret|apikey|999/);
  assert.deepEqual(calls, ['/stable/quote', '/stable/profile']);
});

test('quote normalization rejects missing, mismatched, stale and future evidence', () => {
  const now = Date.now(), raw = quote();
  for (const changed of [{ price: 0 }, { price: '123' }, { timestamp: null }, { timestamp: now }, { timestamp: now / 1000 + 60 }, { timestamp: now / 1000 - 8 * 86400 }, { symbol: 'WRONG' }]) {
    assert.throws(() => normalizeQuote('ADBE', { ...raw, ...changed }, { symbol: 'ADBE', currency: 'USD' }, now));
  }
  assert.throws(() => normalizeQuote('ADBE', raw, null, now), /currency unavailable/);
  assert.throws(() => normalizeQuote('ADBE', raw, { symbol: 'WRONG', currency: 'USD' }, now), /currency unavailable/);
  assert.throws(() => normalizeQuote('ADBE', { ...raw, currency: 'EUR' }, { symbol: 'ADBE', currency: 'USD' }, now), /currencies differ/);
});

test('concurrent requests share quote cache and do not refetch profiles or invent fallbacks', async t => {
  setup(t); let calls = 0;
  const fetchImpl = async () => { calls++; return { ok: true, json: async () => [{ ...quote(), currency: 'USD' }] }; };
  const [a, b] = await Promise.all([loadFmpQuotes(['ADBE', 'ADBE'], { fetchImpl }), loadFmpQuotes(['ADBE'], { fetchImpl })]);
  assert.equal(calls, 1); assert.deepEqual(a.quotes, b.quotes);
  await loadFmpQuotes(['ADBE'], { fetchImpl }); assert.equal(calls, 1);
});

test('partial quote failures retain available FMP prices and cache failures briefly', async t => {
  setup(t); let calls = 0;
  const fetchImpl = async url => { calls++; const symbol = new URL(url).searchParams.get('symbol'); return { ok: true, json: async () => symbol === 'ADBE' ? [{ ...quote(), currency: 'USD' }] : [] }; };
  const result = await loadFmpQuotes(['ADBE', 'INTU'], { fetchImpl });
  assert.ok(result.quotes.ADBE); assert.equal(result.quotes.INTU, undefined); assert.match(result.unavailable.INTU, /unavailable/);
  await loadFmpQuotes(['INTU'], { fetchImpl }); assert.equal(calls, 2);
});

test('quote entitlement errors do not disable available financial statement endpoints', async t => {
  setup(t);
  await assert.rejects(request('quote', 'ADBE', async () => ({ ok: false, status: 403 })), /FMP HTTP 403/);
  await assert.rejects(request('quote', 'ADBE', async () => { throw new Error('must not retry'); }), /cooldown/);
  assert.deepEqual(await request('income-statement', 'ADBE', async () => ({ ok: true, json: async () => [] })), []);
});

test('FMP quote network failures do not leak credential-bearing URLs', async t => {
  setup(t);
  const result = await loadFmpQuotes(['ADBE'], { fetchImpl: async url => { throw new Error(url); } });
  assert.deepEqual(result.quotes, {}); assert.match(result.unavailable.ADBE, /FMP network request failed/);
  assert.doesNotMatch(JSON.stringify(result), /fixture-secret|apikey/);
});

test('quote API rejects inactive symbols and returns clear missing-key error without an upstream call', async t => {
  setup(t); delete process.env.FMP_API_KEY;
  const server = app.listen(0); t.after(() => server.close()); await new Promise(r => server.once('listening', r));
  const base = 'http://127.0.0.1:' + server.address().port;
  assert.equal((await fetch(base + '/api/fmp-quotes?symbols=CYBR')).status, 410);
  assert.equal((await fetch(base + '/api/fmp-quotes?symbols=NO_SUCH_TICKER')).status, 400);
  const response = await fetch(base + '/api/fmp-quotes');
  assert.equal(response.status, 503); assert.equal(response.headers.get('x-data-provider'), 'Financial Modeling Prep');
  assert.equal((await response.json()).error, 'FMP API key is not configured');
  const provenance = await (await fetch(base + '/api/provenance')).json();
  assert.equal(provenance.homepagePrices.provider, 'Financial Modeling Prep');
});

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const read = name => fs.readFileSync(path.join(__dirname, '..', 'public', name), 'utf8');
const review = JSON.parse(read('stock-picks.json'));
const universe = JSON.parse(read('universe.json'));
const NOW = Date.parse('2026-09-08T15:00:00Z');
const clone = value => JSON.parse(JSON.stringify(value));

function harness(t, overrides = {}, now = NOW) {
  const dom = new JSDOM(read('index.html'), { url: 'https://dashboard.test/', runScripts: 'outside-only' });
  t.after(() => dom.window.close());
  const w = dom.window; w.Date.now = () => now;
  const requests = [];
  const routes = { '/stock-picks.json': clone(review), '/universe.json': universe, '/api/fmp-quotes': { quotes: { ADBE: { price: 257.6, currency: 'USD', asOf: NOW / 1000 } } }, ...overrides };
  w.fetch = async (url, options) => {
    requests.push({ url, options });
    if (!Object.hasOwn(routes, url)) throw new Error('Unexpected request: ' + url);
    const value = routes[url];
    if (value instanceof Error) throw value;
    if (typeof value === 'function') return value();
    return { ok: true, json: async () => url === '/api/fmp-quotes' && value ? { source: { provider: 'Financial Modeling Prep' }, ...value } : value };
  };
  w.eval(read('stock-picks.js'));
  return { w, d: w.document, requests, routes };
}

test('simple home shows 11 dated opinions in three groups, with 45 genuinely unreviewed', async t => {
  const { w, d, requests } = harness(t); await w.picksReady;
  assert.equal(d.querySelectorAll('#buyPicks article').length, 4);
  assert.equal(d.querySelectorAll('#waitPicks article').length, 4);
  assert.equal(d.querySelectorAll('#sellPicks article').length, 3);
  assert.equal(d.querySelectorAll('#unreviewedStocks a').length, 45);
  assert.equal(d.querySelectorAll('.pick-card details[open]').length, 0);
  assert.equal(d.getElementById('expiredSection').hidden, true);
  assert.match(d.querySelector('[data-symbol="ADBE"]').textContent, /257.60 USD/);
  assert.match(d.querySelector('[data-symbol="ADBE"]').textContent, /Reviewed 8 Sept? 2026/);
  assert.match(d.querySelector('[data-symbol="PLTR"]').textContent, /Lower confidence/);
  assert.equal(d.querySelectorAll('.tabs a').length, 2);
  assert.deepEqual(requests.map(r => r.url).sort(), ['/api/fmp-quotes', '/stock-picks.json', '/universe.json']);
  assert.equal(w.localStorage.length, 0);
});

test('opinion coverage is unique, sourced, dated, and contains no stored quotes or personal notes', () => {
  assert.equal(review.picks.length, 11);
  assert.equal(new Set(review.picks.map(p => p.symbol)).size, 11);
  for (const pick of review.picks) {
    assert.ok(universe.tickers[pick.symbol]);
    assert.ok(pick.valueChain && pick.risk && pick.reviewTrigger && pick.sources.length);
    for (const source of pick.sources) assert.equal(new URL(source.url).protocol, 'https:');
    assert.equal(Object.hasOwn(pick, 'price'), false);
  }
  assert.doesNotMatch(read('stock-picks.json'), /holdings|taxLot|portfolioWeight|journal|apiKey|api_key/i);
});

test('opinions render while quotes are pending; quote outage never invents prices or removes reviews', async t => {
  let finish; const pending = new Promise(resolve => finish = resolve);
  const { w, d } = harness(t, { '/api/fmp-quotes': () => pending });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(d.querySelectorAll('.pick-card').length, 11);
  assert.match(d.querySelector('[data-symbol="ADBE"]').textContent, /Price unavailable/);
  finish({ ok: false }); await w.picksReady;
  assert.equal(d.querySelectorAll('#buyPicks article').length, 4);
  assert.match(d.getElementById('quoteStatus').textContent, /FMP prices unavailable/);
  assert.equal(d.getElementById('refreshQuotes').disabled, false);
});

test('stale, future, nonnumeric and currency-free quotes fail closed', async t => {
  const cases = [
    { price: 100, asOf: NOW / 1000 - 8 * 86400, currency: 'USD' },
    { price: 100, asOf: NOW / 1000 + 3600, currency: 'USD' },
    { price: '100', asOf: NOW / 1000, currency: 'USD' },
    { price: 0, asOf: NOW / 1000, currency: 'USD' },
    { price: 100, asOf: NOW / 1000 },
    { price: 100, asOf: null, currency: 'USD' }
  ];
  for (const quote of cases) {
    const { w, d } = harness(t, { '/api/fmp-quotes': { quotes: { ADBE: quote } } }); await w.picksReady;
    assert.match(d.querySelector('[data-symbol="ADBE"]').textContent, /Price unavailable/);
  }
});

test('homepage refuses a non-FMP quote payload instead of relabeling its prices', async t => {
  const { w, d, requests } = harness(t, { '/api/fmp-quotes': { source: { provider: 'Yahoo Finance' }, quotes: { ADBE: { price: 100, currency: 'USD', asOf: NOW / 1000 } } } });
  await w.picksReady;
  assert.match(d.querySelector('[data-symbol="ADBE"]').textContent, /Price unavailable/);
  assert.match(d.getElementById('quoteStatus').textContent, /No Yahoo fallback/);
  assert.equal(requests.some(r => r.url === '/api/quotes'), false);
});

test('review deadlines remove calls from active groups, including an already open tab', async t => {
  const { w, d } = harness(t); await w.picksReady;
  w.Date.now = () => Date.parse('2026-09-10T00:00:00Z'); d.getElementById('stockSearch').dispatchEvent(new w.Event('input'));
  assert.equal(d.querySelectorAll('#buyPicks article').length, 3);
  assert.match(d.getElementById('expiredPicks').textContent, /ADBE.*Review overdue/s);
  w.Date.now = () => Date.parse('2026-09-15T00:00:00Z'); d.getElementById('stockSearch').dispatchEvent(new w.Event('input'));
  assert.equal(d.querySelectorAll('#buyPicks article, #waitPicks article, #sellPicks article').length, 0);
  assert.equal(d.querySelectorAll('#expiredPicks article').length, 11);
  assert.match(d.getElementById('homeStatus').textContent, /11 now need a fresh review/);
});

test('seven-day cap applies even to a mistakenly distant editorial deadline', async t => {
  const long = clone(review); long.reviewAfter = '2027-01-01T00:00:00Z';
  const { w, d } = harness(t, { '/stock-picks.json': long }, Date.parse(review.reviewedAt) + 7 * 86400000); await w.picksReady;
  assert.equal(d.querySelectorAll('#expiredPicks article').length, 11);
});

test('invalid, missing, future-dated and unsafe reviews yield no recommendations', async t => {
  const invalid = clone(review); invalid.picks[0].sources[0].url = 'javascript:alert(1)';
  const future = clone(review); future.reviewedAt = '2026-09-09T00:00:00Z';
  const badDate = clone(review); badDate.reviewAfter = '2026-02-30T00:00:00Z';
  const duplicate = clone(review); duplicate.picks.push(clone(duplicate.picks[0]));
  for (const value of [new Error('Missing review'), null, invalid, future, badDate, duplicate]) {
    const { w, d } = harness(t, { '/stock-picks.json': value }); await w.picksReady;
    assert.equal(d.querySelectorAll('.pick-card').length, 0);
    assert.match(d.getElementById('homeStatus').textContent, /Recommendations unavailable/);
    assert.equal(d.querySelectorAll('#unreviewedStocks a').length, 0);
  }
});

test('missing universe does not hide dated opinions or miscount unreviewed companies', async t => {
  const { w, d } = harness(t, { '/universe.json': new Error('Missing universe') }); await w.picksReady;
  assert.equal(d.querySelectorAll('.pick-card').length, 11);
  assert.match(d.getElementById('unreviewedSummary').textContent, /coverage unavailable/);
});

test('search distinguishes unreviewed stocks, escapes text, and keeps drill-down links accessible', async t => {
  const altered = clone(review); altered.picks[0].reason = '<img src=x onerror=alert(1)> literal test';
  const { w, d } = harness(t, { '/stock-picks.json': altered }); await w.picksReady;
  assert.equal(d.querySelectorAll('.pick-card img').length, 0);
  assert.match(d.querySelector('[data-symbol="ADBE"]').textContent, /<img src=x/);
  const search = d.getElementById('stockSearch');
  search.value = 'AMZN'; search.dispatchEvent(new w.Event('input'));
  assert.equal(d.querySelectorAll('.pick-card').length, 0);
  assert.equal(d.querySelectorAll('#unreviewedStocks a').length, 1);
  assert.equal(d.getElementById('buyPicks').closest('section').hidden, true);
  assert.equal(d.getElementById('unreviewed').open, true);
  search.value = 'adobe'; search.dispatchEvent(new w.Event('input'));
  assert.equal(d.querySelectorAll('.pick-card').length, 1);
  assert.equal(d.getElementById('buyPicks').closest('section').hidden, false);
  assert.equal(d.querySelector('.pick-card summary').getAttribute('aria-label'), 'View analysis for ADBE');
  assert.equal(d.querySelector('a[href="decision.html?symbol=ADBE"]').textContent, 'Financial screen for ADBE');
  assert.ok(d.querySelector('.pick-card a[href="analysis.html#valueChainCard"]'));
  d.getElementById('themeToggle').click(); assert.equal(d.documentElement.dataset.theme, 'light');
});

test('quote refresh preserves open analysis, research dates, opinions and existing private journals', async t => {
  const { w, d, routes } = harness(t); await w.picksReady;
  const key = 'software-decision-journal:ADBE'; w.localStorage.setItem(key, 'existing-private-note');
  d.getElementById('analysis-ADBE').open = true;
  routes['/api/fmp-quotes'] = { quotes: { ADBE: { price: 270, asOf: NOW / 1000, currency: 'USD' } } };
  d.getElementById('refreshQuotes').click(); await new Promise(resolve => setImmediate(resolve));
  assert.equal(d.getElementById('analysis-ADBE').open, true);
  assert.match(d.querySelector('[data-symbol="ADBE"]').textContent, /270.00 USD/);
  assert.match(d.querySelector('[data-symbol="ADBE"]').textContent, /Buy gradually — start small/);
  assert.match(d.querySelector('[data-symbol="ADBE"]').textContent, /Reviewed 8 Sept? 2026/);
  assert.equal(w.localStorage.getItem(key), 'existing-private-note');
});

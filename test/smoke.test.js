const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const app = require('../server');
const publicDir = path.join(__dirname, '..', 'public');

test('all inline page scripts parse', () => {
  const pages = fs.readdirSync(publicDir).filter((name) => name.endsWith('.html'));
  for (const page of pages) {
    const html = fs.readFileSync(path.join(publicDir, page), 'utf8');
    let index = 0;
    for (const match of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)) {
      index += 1;
      if (match[1].trim()) new vm.Script(match[1], { filename: `${page}:script-${index}` });
    }
  }
});

test('public universe contains taxonomy only and excludes retired symbols', () => {
  const universe = JSON.parse(fs.readFileSync(path.join(publicDir, 'universe.json'), 'utf8'));
  const symbols = Object.keys(universe.tickers).sort();
  assert.equal(symbols.length, 56);
  assert.equal(symbols.includes('SQ'), false);
  assert.equal(symbols.includes('CYBR'), false);
  assert.equal(symbols.includes('CFLT'), false);
  assert.equal(symbols.includes('XYZ'), true);

  for (const ticker of Object.values(universe.tickers)) {
    assert.deepEqual(Object.keys(ticker).sort(), ['layer', 'name']);
  }
  const layerSymbols = Object.values(universe.layers).flatMap((layer) => layer.tickers).sort();
  assert.deepEqual(layerSymbols, symbols);
  assert.equal(fs.existsSync(path.join(publicDir, 'sw_data.json')), false);
  assert.equal(fs.existsSync(path.join(publicDir, 'build_pages.py')), false);
});

test('main dashboard renders a taxonomy-only software value chain map', () => {
  const html = fs.readFileSync(path.join(publicDir, 'index.html'), 'utf8');
  assert.match(html, /id="valueChainMap"/);
  assert.match(html, /renderValueChain\(universe\)/);
  assert.match(html, /Taxonomy only/);
  assert.match(html, /company classifications only/);
  assert.doesNotMatch(html, /data-score|price target|bottleneck score/i);
});

test('stock decision page exposes a disclosed editable baseline and no buy score', () => {
  const html = fs.readFileSync(path.join(publicDir, 'decision.html'), 'utf8');
  assert.match(html, /Research screen—not a buy recommendation/);
  assert.match(html, /Your mandatory gates/);
  assert.match(html, /Ryan's medium-risk, 3–5 year quality-growth baseline/);
  assert.match(html, /id="minRevenueGrowth"[^>]+value="15"/);
  assert.match(html, /id="minFcfMargin"[^>]+value="15"/);
  assert.match(html, /id="maxPriceSales"[^>]+value="8"/);
  assert.match(html, /id="minFcfYield"[^>]+value="2"/);
  assert.match(html, /id="proposedWeight"[^>]+value="1\.5"/);
  assert.match(html, /id="maxWeight"[^>]+value="5"/);
  assert.match(html, /id="maxPortfolioLoss"[^>]+value="1"/);
  assert.match(html, /id="applyBaseline"/);
  assert.match(html, /Issuer guidance is not standardized and is never invented/);
  assert.match(html, /No composite score/);
  assert.match(html, /id="gateResults"/);
  assert.match(html, /decision-trust\.js/);
  assert.doesNotMatch(html, /BUY|HIGHEST CONVICTION|data-score|targetMeanPrice/);
  for (const page of ['index.html', 'correlation.html', 'technicals.html', 'insider.html', 'options.html', 'sentiment.html', 'leaderboard.html', 'stress-test.html', 'news.html']) {
    assert.match(fs.readFileSync(path.join(publicDir, page), 'utf8'), /href="decision\.html">Stock Decision/);
  }
});

test('retired symbols fail closed without calling the upstream', async (t) => {
  const originalFetch = global.fetch;
  let upstreamCalls = 0;
  global.fetch = async () => { upstreamCalls += 1; throw new Error('unexpected upstream request'); };
  t.after(() => { global.fetch = originalFetch; });
  const server = app.listen(0);
  t.after(() => server.close());
  await new Promise((resolve) => server.once('listening', resolve));
  const response = await originalFetch(`http://127.0.0.1:${server.address().port}/api/quotes?symbols=CYBR`);
  assert.equal(response.status, 410);
  assert.equal(upstreamCalls, 0);
});

test('server exposes issuer-primary provenance, source headers, and current universe count', async (t) => {
  const server = app.listen(0);
  t.after(() => server.close());
  await new Promise((resolve) => server.once('listening', resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  const [pageResponse, healthResponse, provenanceResponse] = await Promise.all([
    fetch(`${baseUrl}/index.html`), fetch(`${baseUrl}/api/health`), fetch(`${baseUrl}/api/provenance`),
  ]);
  assert.equal(pageResponse.status, 200);
  assert.match(await pageResponse.text(), /Software Stack/);
  assert.equal(healthResponse.headers.get('x-data-policy'), 'live-only-no-static-market-fallback');
  const health = await healthResponse.json();
  assert.equal(health.status, 'ok');
  assert.equal(health.dashboard, 'Software Supply Chain');
  assert.equal(health.tickerCount, 56);
  const provenance = await provenanceResponse.json();
  assert.equal(provenance.reportedFundamentals.provider, 'SEC EDGAR');
  assert.equal(provenance.marketReconciliation.provider, 'Yahoo Finance');
  assert.equal(provenance.decisionResearch.kind, 'User-controlled evidence gates');
  assert.match(provenance.decisionResearch.caveat, /not a buy recommendation/i);
  assert.match(provenance.fallbackPolicy, /No static or Yahoo-derived value replaces/);
});

test('issuer endpoint rejects symbols outside the curated universe before upstream access', async (t) => {
  const originalFetch = global.fetch;
  let upstreamCalls = 0;
  global.fetch = async () => { upstreamCalls += 1; throw new Error('unexpected upstream request'); };
  t.after(() => { global.fetch = originalFetch; });
  const server = app.listen(0);
  t.after(() => server.close());
  await new Promise((resolve) => server.once('listening', resolve));
  const response = await originalFetch(`http://127.0.0.1:${server.address().port}/api/issuer-data?symbols=NOTREAL`);
  assert.equal(response.status, 400);
  assert.equal(response.headers.get('x-data-provider'), 'SEC EDGAR (issuer-filed XBRL facts)');
  assert.equal(upstreamCalls, 0);
});

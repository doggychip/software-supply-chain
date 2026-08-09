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

test('server exposes provenance, source headers, and current universe count', async (t) => {
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
  assert.equal(provenance.marketData.provider, 'Yahoo Finance');
  assert.match(provenance.fallbackPolicy, /No static market/);
});

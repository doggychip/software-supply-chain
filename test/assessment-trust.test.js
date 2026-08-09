const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const publicDir = path.join(__dirname, '..', 'public');
const read = (name) => fs.readFileSync(path.join(publicDir, name), 'utf8');

function loadRuntime() {
  const window = {};
  vm.runInNewContext(read('assessment-trust.js'), { window, console }, { filename: 'assessment-trust.js' });
  return window;
}

test('fundamental summary reports raw fields and produces no score', () => {
  const runtime = loadRuntime();
  const ticker = { price: 100, fundamentals: {
    epsHistory: [
      { quarter: 'Q0', epsActual: 9, epsEstimate: 1, surprisePct: 800 },
      { quarter: 'Q1', epsActual: 2, epsEstimate: 1, surprisePct: 100 },
      { quarter: 'Q2', epsActual: 1, epsEstimate: 1, surprisePct: 0 },
      { quarter: 'Q3', epsActual: 0, epsEstimate: 1, surprisePct: -100 },
      { quarter: 'Q4', epsActual: 3, epsEstimate: 2, surprisePct: 50 },
    ],
    forward: { epsGrowthNextY: 12.5 },
    analyst: { recommendationMean: 2, numberOfAnalystOpinions: 10, targetMeanPrice: 110 },
  }};
  const summary = runtime.summarizeEvidence(ticker);
  assert.equal(summary.latestQuarter, 'Q4');
  assert.equal(summary.quarterCount, 4);
  assert.equal(summary.beats, 2);
  assert.equal(summary.meets, 1);
  assert.equal(summary.misses, 1);
  assert.ok(Math.abs(summary.targetGapPct - 10) < 1e-10);
  const legacy = runtime.computeEvidenceScore(ticker);
  assert.equal(legacy.score, null);
  assert.equal(legacy.label, 'Descriptive data only');
});

test('past and malformed earnings dates fail closed', () => {
  const runtime = loadRuntime();
  const now = new Date('2026-08-09T00:00:00Z');
  assert.equal(runtime.isFutureDate('2026-08-08', now), false);
  assert.equal(runtime.isFutureDate('2026-08-09', now), true);
  assert.equal(runtime.isFutureDate('not-a-date', now), false);
});

test('Yahoo reconciliation compares only equal reporting periods', () => {
  const runtime = loadRuntime();
  const issuer = { facts: {
    revenue: { value: 1000, end: '2026-06-30', periodType: 'quarterly' },
    netIncome: { value: 100, end: '2026-06-30', periodType: 'quarterly' },
    dilutedEps: { value: 1, end: '2026-06-30', periodType: 'quarterly' },
  }};
  const result = runtime.reconcileIssuerWithYahoo(issuer, {
    revenueHistory: [{ date: '2Q2026', revenue: 1004, earnings: 110 }],
    epsHistory: [{ quarter: '2026-03-31', epsActual: 1 }],
  });
  assert.equal(result.revenue.status, 'aligned');
  assert.equal(result.netIncome.status, 'differs');
  assert.equal(result.dilutedEps.status, 'period_mismatch');
  assert.equal(runtime.quarterEnd('2Q2026'), '2026-06-30');
  assert.equal(runtime.quarterEnd('unknown'), null);
});

test('annual SEC facts are never compared with quarterly Yahoo fields', () => {
  const runtime = loadRuntime();
  const result = runtime.compareReported(
    { value: 400, end: '2026-06-30', periodType: 'annual' },
    100,
    '2026-06-30',
  );
  assert.equal(result.status, 'period_type_mismatch');
});

test('pages contain no fabricated, generated, or stored financial datasets', () => {
  const combined = fs.readdirSync(publicDir)
    .filter((name) => /\.(html|js|json)$/.test(name))
    .map(read).join('\n');
  assert.doesNotMatch(combined, /INSIDER_DATA|SAMPLE_NEWS|seededRandom|PRICE_HISTORY\s*=|PRICE_DATA\s*=\s*\{"|QUOTES\s*=\s*\{"|priceHistory|HIGHEST CONVICTION|Top Picks by Signal Strength/);
  assert.doesNotMatch(read('options.html'), /Notional activity|totalPrem|Gamma exposure|Max pain/);
  assert.match(read('index.html'), /issuer-filed fundamentals are primary/i);
  assert.match(read('index.html'), /Yahoo values never replace a missing issuer-filed value/i);
  assert.match(read('correlation.html'), /No embedded or generated price series/i);
  assert.match(read('technicals.html'), /no technical buy\/sell signal/i);
});

test('unavailable sources remain visibly fail closed', () => {
  assert.match(read('insider.html'), /Verified SEC Form 4 data is unavailable/);
  assert.match(read('news.html'), /No verified live news source is connected/);
  assert.match(read('options.html'), /No synthetic or stored fallback/);
  assert.match(read('sentiment.html'), /descriptive, not predictive/i);
  assert.match(read('leaderboard.html'), /no predictive ranking/i);
  assert.match(read('stress-test.html'), /Assumption, not forecast/);
});

test('server does not expose an unsupported news route', () => {
  const server = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
  assert.doesNotMatch(server, /newsDataPath/);
});

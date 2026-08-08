const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const publicDir = path.join(__dirname, '..', 'public');

function read(name) {
  return fs.readFileSync(path.join(publicDir, name), 'utf8');
}

function loadAssessmentRuntime() {
  const window = { addEventListener() {}, dashboardRenderers: [] };
  window.window = window;
  const document = {
    readyState: 'loading', addEventListener() {},
    createElement: () => ({ style: {} }), body: { appendChild() {} }, querySelectorAll: () => [],
  };
  const context = {
    window, document, console, CustomEvent: function CustomEvent() {},
    fetch: async () => ({ ok: true, json: async () => ({ fundamentals: {} }) }),
    setTimeout: () => {}, setInterval: () => {},
  };
  // Core scorer first (assessment-trust delegates to window.computeSignal).
  const corePath = path.join(__dirname, '..', 'node_modules', 'dashboard-core', 'client', 'signals.js');
  vm.runInNewContext(fs.readFileSync(corePath, 'utf8'), context, { filename: 'signals.js' });
  vm.runInNewContext(read('assessment-trust.js'), context, { filename: 'assessment-trust.js' });
  return window;
}

test('evidence score refuses to rate thin coverage', () => {
  const runtime = loadAssessmentRuntime();
  const result = runtime.computeEvidenceScore({
    price: 100,
    fundamentals: { analyst: { recommendationMean: 1.2 } },
  });

  assert.equal(result.status, 'insufficient');
  assert.equal(result.score, null);
  assert.equal(result.dataCoverage, 1);
});

test('evidence score grades miss severity and limits streak to four quarters', () => {
  const runtime = loadAssessmentRuntime();
  const smallMiss = runtime.computeEvidenceScore({
    price: 100,
    fundamentals: { epsHistory: [{ beat: false, surprisePct: -0.1 }] },
  });
  const largeMiss = runtime.computeEvidenceScore({
    price: 100,
    fundamentals: { epsHistory: [{ beat: false, surprisePct: -50 }] },
  });
  assert.ok(smallMiss.breakdown[0].points > largeMiss.breakdown[0].points);

  const fiveQuarters = runtime.computeEvidenceScore({
    price: 100,
    fundamentals: {
      epsHistory: [
        { beat: true, surprisePct: 3 },
        { beat: false, surprisePct: -3 },
        { beat: true, surprisePct: 3 },
        { beat: true, surprisePct: 3 },
        { beat: true, surprisePct: 3 },
      ],
    },
  });
  assert.match(fiveQuarters.breakdown[1].detail, /^3\/4/);
});

test('past earnings dates are rejected as stale', () => {
  const runtime = loadAssessmentRuntime();
  const now = new Date('2026-08-09T00:00:00Z');
  assert.equal(runtime.isFutureDate('2026-08-08', now), false);
  assert.equal(runtime.isFutureDate('2026-08-09', now), true);
  assert.equal(runtime.isFutureDate('not-a-date', now), false);
});

test('assessment pages contain no fabricated activity', () => {
  const insider = read('insider.html');
  assert.doesNotMatch(insider, /INSIDER_DATA|SIMULATED INSIDER TRANSACTION DATA/);
  assert.match(insider, /Verified SEC Form 4 data is unavailable/);

  const options = read('options.html');
  assert.doesNotMatch(options, /seededRandom|Gamma exposure simulation|Max pain simulation/);
  assert.match(options, /Live, nearest-expiration activity only/);

  const sentiment = read('sentiment.html');
  assert.doesNotMatch(sentiment, /seededRand|\b2h ago\b|newsItems\s*=/);
  assert.match(sentiment, /descriptive, not predictive/i);

  const leaderboard = read('leaderboard.html');
  assert.doesNotMatch(leaderboard, /Simulated RSI|PRICE_HISTORY\s*=/);
  assert.match(leaderboard, /no predictive ranking/i);

  const news = read('news.html');
  assert.doesNotMatch(news, /SAMPLE_NEWS|\b2h ago\b/);
  assert.match(news, /No verified live news source is connected/);
});

test('history and scenario pages expose trustworthy semantics', () => {
  const bootstrap = read('bootstrap-quotes.js');
  assert.match(bootstrap, /range=1y&interval=1d/);
  assert.match(bootstrap, /__historyData/);
  assert.match(bootstrap, /quotes-bootstrap-status/);

  const stress = read('stress-test.html');
  assert.match(stress, /Assumption, not forecast/);
  assert.doesNotMatch(stress, /Cross-Scenario Risk Ranking|impacts:'pe_based'/);

  const index = read('index.html');
  assert.match(index, /assessment-trust\.js/);
  assert.doesNotMatch(index, /Top Picks by Signal Strength|HIGHEST CONVICTION/);

  const server = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
  assert.doesNotMatch(server, /newsDataPath/);
});

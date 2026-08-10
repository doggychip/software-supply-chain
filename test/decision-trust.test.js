const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

function runtime() {
  const window = {};
  const source = fs.readFileSync(path.join(__dirname, '..', 'public', 'decision-trust.js'), 'utf8');
  vm.runInNewContext(source, { window }, { filename: 'decision-trust.js' });
  return window.DecisionTrust;
}

const record = {
  decisionEvidence: { derived: {
    revenueGrowthPct: 20,
    revenueGrowthBasis: 'quarterly',
    annualRevenue: 1_000,
    annualUnit: 'USD',
    annualPeriodEnd: '2025-12-31',
    operatingMarginPct: 15,
    freeCashFlow: 150,
    freeCashFlowMarginPct: 15,
    stockCompensationPct: 8,
    shareDilutionPct: 2,
  } },
};
const quote = {
  currency: 'USD',
  asOf: Date.parse('2026-08-07T20:00:00Z') / 1000,
  extras: { marketCap: 2_000 },
};
const bars = [
  { d: '2026-08-05', c: 100 },
  { d: '2026-08-06', c: 120 },
  { d: '2026-08-07', c: 90 },
];
const criteria = {
  minRevenueGrowthPct: 10,
  minFreeCashFlowMarginPct: 10,
  maxPriceSales: 3,
  minFreeCashFlowYieldPct: 5,
  proposedWeightPct: 4,
  maxWeightPct: 5,
  maxPortfolioLossPct: 1.5,
};

test('decision metrics combine filed annual values with fresh same-currency market context', () => {
  const decision = runtime();
  const metrics = decision.computeMetrics(record, quote, bars, Date.parse('2026-08-10T00:00:00Z'));
  assert.equal(metrics.priceSales, 2);
  assert.equal(metrics.freeCashFlowYieldPct, 7.5);
  assert.equal(metrics.oneYearMaxDrawdownPct, 25);
  assert.equal(metrics.comparableCurrency, true);
});

test('valuation fails closed when issuer and quote currencies differ', () => {
  const decision = runtime();
  const metrics = decision.computeMetrics(record, { ...quote, currency: 'EUR' }, bars, Date.parse('2026-08-10T00:00:00Z'));
  assert.equal(metrics.comparableCurrency, false);
  assert.equal(metrics.priceSales, null);
  assert.equal(metrics.freeCashFlowYieldPct, null);
  assert.equal(decision.evaluateCandidate(metrics, criteria).key, 'insufficient_evidence');
});

test('future market timestamps fail closed', () => {
  const decision = runtime();
  const metrics = decision.computeMetrics(
    record,
    { ...quote, asOf: Date.parse('2099-01-01T00:00:00Z') / 1000 },
    bars,
    Date.parse('2026-08-10T00:00:00Z'),
  );
  assert.equal(metrics.quoteFresh, false);
  assert.equal(metrics.priceSales, null);
  assert.equal(decision.evaluateCandidate(metrics, criteria).key, 'insufficient_evidence');
});

test('candidate labels are deterministic gates rather than a composite score', () => {
  const decision = runtime();
  const metrics = decision.computeMetrics(record, quote, bars, Date.parse('2026-08-10T00:00:00Z'));
  assert.equal(decision.evaluateCandidate(metrics, criteria).key, 'research_now');
  assert.equal(decision.evaluateCandidate(metrics, { ...criteria, maxPriceSales: 1 }).key, 'watch');
  assert.equal(decision.evaluateCandidate(metrics, { ...criteria, proposedWeightPct: 8 }).key, 'risk_gate_failed');
  assert.equal(decision.evaluateCandidate(metrics, { ...criteria, maxPriceSales: null }).key, 'set_criteria');
});

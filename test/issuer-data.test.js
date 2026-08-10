const assert = require('node:assert/strict');
const test = require('node:test');

const {
  extractIssuerRecord,
  deriveDecisionEvidence,
  filingUrl,
  loadIssuerData,
  periodType,
  resetCaches,
  selectFact,
  CONCEPTS,
} = require('../issuer-data');

function decisionCompanyFacts() {
  const payload = companyFacts();
  const gaap = payload.facts['us-gaap'];
  gaap.Revenues.units.USD.push(
    { start: '2025-04-01', end: '2025-06-30', val: 100, accn: '0000000001-25-000002', form: '10-Q', filed: '2025-07-20', fy: 2025, fp: 'Q2' },
    { start: '2025-01-01', end: '2025-12-31', val: 400, accn: '0000000001-26-000001', form: '10-K', filed: '2026-02-01', fy: 2025, fp: 'FY' },
  );
  gaap.OperatingIncomeLoss = { label: 'Operating income', units: { USD: [
    { start: '2025-01-01', end: '2025-12-31', val: 40, accn: '0000000001-26-000001', form: '10-K', filed: '2026-02-01', fy: 2025, fp: 'FY' },
  ] } };
  gaap.NetCashProvidedByUsedInOperatingActivities = { label: 'Operating cash flow', units: { USD: [
    { start: '2025-01-01', end: '2025-12-31', val: 80, accn: '0000000001-26-000001', form: '10-K', filed: '2026-02-01', fy: 2025, fp: 'FY' },
  ] } };
  gaap.PaymentsToAcquirePropertyPlantAndEquipment = { label: 'Capital expenditure', units: { USD: [
    { start: '2025-01-01', end: '2025-12-31', val: 20, accn: '0000000001-26-000001', form: '10-K', filed: '2026-02-01', fy: 2025, fp: 'FY' },
  ] } };
  gaap.ShareBasedCompensation = { label: 'Stock compensation', units: { USD: [
    { start: '2025-01-01', end: '2025-12-31', val: 30, accn: '0000000001-26-000001', form: '10-K', filed: '2026-02-01', fy: 2025, fp: 'FY' },
  ] } };
  payload.facts.dei = { EntityCommonStockSharesOutstanding: { label: 'Shares outstanding', units: { shares: [
    { end: '2025-06-30', val: 100, accn: '0000000001-25-000002', form: '10-Q', filed: '2025-07-20', fy: 2025, fp: 'Q2' },
    { end: '2026-06-30', val: 110, accn: '0000000001-26-000002', form: '10-Q', filed: '2026-07-20', fy: 2026, fp: 'Q2' },
  ] } } };
  return payload;
}

function companyFacts() {
  return {
    entityName: 'Example Software, Inc.',
    facts: {
      'us-gaap': {
        Revenues: {
          label: 'Total revenue',
          units: { USD: [
            { start: '2026-04-01', end: '2026-06-30', val: 150, accn: '0000000001-26-000002', form: '10-Q', filed: '2026-07-20', fy: 2026, fp: 'Q2' },
          ] },
        },
        RevenueFromContractWithCustomerExcludingAssessedTax: {
          label: 'Revenue',
          units: { USD: [
            { start: '2025-01-01', end: '2025-12-31', val: 400, accn: '0000000001-26-000001', form: '10-K', filed: '2026-02-01', fy: 2025, fp: 'FY' },
            { start: '2026-01-01', end: '2026-06-30', val: 230, accn: '0000000001-26-000002', form: '10-Q', filed: '2026-07-20', fy: 2026, fp: 'Q2' },
            { start: '2026-04-01', end: '2026-06-30', val: 120, accn: '0000000001-26-000002', form: '10-Q', filed: '2026-07-20', fy: 2026, fp: 'Q2', frame: 'CY2026Q2' },
            { start: '2099-04-01', end: '2099-06-30', val: 999, accn: '0000000001-99-000001', form: '10-Q', filed: '2099-07-20', fy: 2099, fp: 'Q2' },
          ] },
        },
        NetIncomeLoss: {
          label: 'Net income',
          units: { USD: [
            { start: '2026-04-01', end: '2026-06-30', val: 25, accn: '0000000001-26-000002', form: '10-Q', filed: '2026-07-20', fy: 2026, fp: 'Q2' },
          ] },
        },
        EarningsPerShareDiluted: {
          label: 'Diluted EPS',
          units: { 'USD/shares': [
            { start: '2026-04-01', end: '2026-06-30', val: 0.5, accn: '0000000001-26-000002', form: '10-Q', filed: '2026-07-20', fy: 2026, fp: 'Q2' },
          ] },
        },
      },
    },
  };
}

test('selectFact chooses total revenue for the latest discrete period and rejects YTD duration', () => {
  const fact = selectFact(companyFacts(), CONCEPTS.revenue, '0000000001');
  assert.equal(fact.value, 150);
  assert.equal(fact.periodType, 'quarterly');
  assert.equal(fact.end, '2026-06-30');
  assert.equal(fact.taxonomy, 'us-gaap');
  assert.equal(fact.concept, 'Revenues');
});

test('issuer record preserves filed units, concepts, periods, and direct filing evidence', () => {
  const record = extractIssuerRecord('EXM', '0000000001', companyFacts());
  assert.equal(record.name, 'Example Software, Inc.');
  assert.equal(record.facts.netIncome.value, 25);
  assert.equal(record.facts.dilutedEps.unit, 'USD/shares');
  assert.equal(record.latestFiling.form, '10-Q');
  assert.equal(record.latestFiling.filed, '2026-07-20');
  assert.equal(record.latestFiling.sourceUrl, 'https://www.sec.gov/Archives/edgar/data/1/000000000126000002/0000000001-26-000002-index.html');
});

test('decision evidence derives only aligned issuer-filed operating metrics', () => {
  const evidence = deriveDecisionEvidence(decisionCompanyFacts(), '0000000001');
  assert.equal(evidence.reported.revenueQuarterly.length, 2);
  assert.equal(evidence.derived.revenueGrowthPct, 50);
  assert.equal(evidence.derived.revenueGrowthBasis, 'quarterly');
  assert.equal(evidence.derived.annualRevenue, 400);
  assert.equal(evidence.derived.operatingMarginPct, 10);
  assert.equal(evidence.derived.freeCashFlow, 60);
  assert.equal(evidence.derived.freeCashFlowMarginPct, 15);
  assert.equal(evidence.derived.stockCompensationPct, 7.5);
  assert.ok(Math.abs(evidence.derived.shareDilutionPct - 10) < 1e-10);
  assert.match(evidence.derived.sources.revenue, /^https:\/\/www\.sec\.gov\/Archives\//);
});

test('decision evidence leaves unaligned or absent metrics unavailable', () => {
  const evidence = deriveDecisionEvidence(companyFacts(), '0000000001');
  assert.equal(evidence.derived.revenueGrowthPct, null);
  assert.equal(evidence.derived.freeCashFlow, null);
  assert.equal(evidence.derived.freeCashFlowMarginPct, null);
  assert.equal(evidence.derived.shareDilutionPct, null);
});

test('period classification and filing links fail closed for invalid input', () => {
  assert.equal(periodType({ start: '2026-04-01', end: '2026-06-30' }), 'quarterly');
  assert.equal(periodType({ start: '2026-01-01', end: '2026-12-31' }), 'annual');
  assert.equal(periodType({ start: '2026-01-01', end: '2026-06-30' }), null);
  assert.equal(filingUrl('bad', '0000000001-26-000002'), null);
  assert.equal(filingUrl('0000000001', 'bad'), null);
});

test('live loader declares its SEC identity and leaves unmapped symbols unavailable', async () => {
  resetCaches();
  const requests = [];
  const fakeFetch = async (url, options) => {
    requests.push({ url, headers: options.headers });
    return {
      ok: true,
      json: async () => url.includes('company_tickers')
        ? { 0: { ticker: 'EXM', cik_str: 1, title: 'Example Software, Inc.' } }
        : companyFacts(),
    };
  };
  const payload = await loadIssuerData(['EXM', 'NONE'], fakeFetch);
  assert.equal(payload.source.official, true);
  assert.equal(payload.issuers.EXM.facts.revenue.value, 150);
  assert.ok(payload.issuers.EXM.decisionEvidence.reported.revenueQuarterly.length > 0);
  assert.equal(payload.unavailable.NONE, 'No SEC ticker-to-CIK mapping');
  assert.equal(requests.length, 2);
  assert.match(requests[0].headers['User-Agent'], /@users\.noreply\.github\.com/);
  resetCaches();
});

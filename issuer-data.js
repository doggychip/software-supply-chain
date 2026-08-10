'use strict';

const SEC_TICKERS_URL = 'https://www.sec.gov/files/company_tickers.json';
const SEC_COMPANY_FACTS_URL = 'https://data.sec.gov/api/xbrl/companyfacts/';
const SEC_REQUEST_INTERVAL_MS = 130;
const TICKER_CACHE_MS = 24 * 60 * 60 * 1000;
const FACT_CACHE_MS = 6 * 60 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 12_000;

const CONCEPTS = {
  revenue: [
    ['us-gaap', 'Revenues'],
    ['us-gaap', 'RevenueFromContractWithCustomerExcludingAssessedTax'],
    ['us-gaap', 'RevenueFromContractWithCustomerIncludingAssessedTax'],
    ['us-gaap', 'SalesRevenueNet'],
    ['us-gaap', 'SalesRevenueGoodsNet'],
    ['us-gaap', 'SalesRevenueServicesNet'],
    ['us-gaap', 'LicenseAndServicesRevenue'],
    ['ifrs-full', 'Revenue'],
  ],
  netIncome: [
    ['us-gaap', 'NetIncomeLoss'],
    ['ifrs-full', 'ProfitLoss'],
    ['ifrs-full', 'ProfitLossAttributableToOwnersOfParent'],
  ],
  dilutedEps: [
    ['us-gaap', 'EarningsPerShareDiluted'],
    ['ifrs-full', 'DilutedEarningsLossPerShare'],
  ],
  operatingIncome: [
    ['us-gaap', 'OperatingIncomeLoss'],
    ['ifrs-full', 'ProfitLossFromOperatingActivities'],
  ],
  operatingCashFlow: [
    ['us-gaap', 'NetCashProvidedByUsedInOperatingActivities'],
    ['ifrs-full', 'CashFlowsFromUsedInOperatingActivities'],
  ],
  capitalExpenditure: [
    ['us-gaap', 'PaymentsToAcquirePropertyPlantAndEquipment'],
    ['us-gaap', 'PaymentsForAdditionsToPropertyPlantAndEquipment'],
    ['ifrs-full', 'PurchaseOfPropertyPlantAndEquipment'],
  ],
  stockCompensation: [
    ['us-gaap', 'ShareBasedCompensation'],
    ['ifrs-full', 'ShareBasedPayment'],
  ],
  sharesOutstanding: [
    ['dei', 'EntityCommonStockSharesOutstanding'],
  ],
};

const ACCEPTED_FORMS = new Set([
  '10-Q', '10-Q/A', '10-K', '10-K/A', '20-F', '20-F/A',
  '40-F', '40-F/A', '6-K', '6-K/A',
]);

let tickerCache = null;
const factCache = new Map();
const pendingFacts = new Map();
let requestQueue = Promise.resolve();
let nextRequestAt = 0;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function reserveSecRequestSlot() {
  const slot = requestQueue.then(async () => {
    const delay = Math.max(0, nextRequestAt - Date.now());
    if (delay) await sleep(delay);
    nextRequestAt = Date.now() + SEC_REQUEST_INTERVAL_MS;
  });
  requestQueue = slot.catch(() => {});
  await slot;
}

async function fetchSecJson(url, fetchImpl = global.fetch) {
  await reserveSecRequestSlot();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetchImpl(url, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'User-Agent': process.env.SEC_USER_AGENT || 'doggychip software-supply-chain 142707835+doggychip@users.noreply.github.com',
      },
    });
    if (!response.ok) throw new Error(`SEC HTTP ${response.status} for ${new URL(url).pathname}`);
    return response.json();
  } finally {
    clearTimeout(timer);
  }
}

async function loadTickerMap(fetchImpl = global.fetch) {
  if (tickerCache && tickerCache.expiresAt > Date.now()) return tickerCache.value;
  const payload = await fetchSecJson(SEC_TICKERS_URL, fetchImpl);
  const value = new Map(Object.values(payload).map((row) => [
    String(row.ticker || '').toUpperCase(),
    String(row.cik_str).padStart(10, '0'),
  ]));
  tickerCache = { value, expiresAt: Date.now() + TICKER_CACHE_MS };
  return value;
}

function durationDays(row) {
  const start = Date.parse(`${row.start}T00:00:00Z`);
  const end = Date.parse(`${row.end}T00:00:00Z`);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return null;
  return Math.round((end - start) / 86_400_000) + 1;
}

function periodType(row) {
  const days = durationDays(row);
  if (days == null) return null;
  if (days >= 50 && days <= 130) return 'quarterly';
  if (days >= 300 && days <= 430) return 'annual';
  return null;
}

function filingUrl(cik, accession) {
  if (!/^\d{10}$/.test(cik) || !/^\d{10}-\d{2}-\d{6}$/.test(accession || '')) return null;
  return `https://www.sec.gov/Archives/edgar/data/${Number(cik)}/${accession.replace(/-/g, '')}/${accession}-index.html`;
}

function compareCandidates(a, b) {
  const rankA = Number.isFinite(a.conceptRank) ? a.conceptRank : Number.MAX_SAFE_INTEGER;
  const rankB = Number.isFinite(b.conceptRank) ? b.conceptRank : Number.MAX_SAFE_INTEGER;
  return String(b.end).localeCompare(String(a.end)) ||
    String(b.filed).localeCompare(String(a.filed)) ||
    rankA - rankB ||
    (a.periodType === 'quarterly' ? a.durationDays - b.durationDays :
      Math.abs(a.durationDays - 365) - Math.abs(b.durationDays - 365));
}

function durationCandidates(companyFacts, conceptList, cik) {
  const candidates = [];
  const today = new Date().toISOString().slice(0, 10);
  conceptList.forEach(([taxonomy, concept], conceptRank) => {
    const definition = companyFacts.facts?.[taxonomy]?.[concept];
    if (!definition) return;
    Object.entries(definition.units || {}).forEach(([unit, rows]) => {
      rows.forEach((row) => {
        const type = periodType(row);
        if (!type || !Number.isFinite(row.val)) return;
        if (row.end > today || row.filed > today) return;
        if (!ACCEPTED_FORMS.has(row.form)) return;
        candidates.push({
          value: row.val,
          unit,
          start: row.start,
          end: row.end,
          filed: row.filed,
          form: row.form,
          accession: row.accn,
          fiscalYear: row.fy ?? null,
          fiscalPeriod: row.fp || null,
          frame: row.frame || null,
          periodType: type,
          durationDays: durationDays(row),
          taxonomy,
          concept,
          conceptLabel: definition.label || concept,
          sourceUrl: filingUrl(cik, row.accn),
          conceptRank,
        });
      });
    });
  });
  return candidates;
}

function selectFact(companyFacts, conceptList, cik) {
  const candidates = durationCandidates(companyFacts, conceptList, cik);
  if (!candidates.length) return null;
  const selected = candidates.sort(compareCandidates)[0];
  delete selected.conceptRank;
  return selected;
}

function selectFactHistory(companyFacts, conceptList, cik, type, limit = 12) {
  const byPeriod = new Map();
  durationCandidates(companyFacts, conceptList, cik)
    .filter((candidate) => candidate.periodType === type)
    .forEach((candidate) => {
      const key = `${candidate.end}|${candidate.unit}`;
      const current = byPeriod.get(key);
      if (!current || compareCandidates(candidate, current) < 0) byPeriod.set(key, candidate);
    });
  return [...byPeriod.values()]
    .sort((a, b) => String(a.end).localeCompare(String(b.end)))
    .slice(-limit)
    .map((candidate) => {
      const clean = { ...candidate };
      delete clean.conceptRank;
      return clean;
    });
}

function selectInstantHistory(companyFacts, conceptList, cik, limit = 8) {
  const candidates = [];
  const today = new Date().toISOString().slice(0, 10);
  conceptList.forEach(([taxonomy, concept], conceptRank) => {
    const definition = companyFacts.facts?.[taxonomy]?.[concept];
    if (!definition) return;
    Object.entries(definition.units || {}).forEach(([unit, rows]) => {
      rows.forEach((row) => {
        if (!Number.isFinite(row.val) || !row.end || row.end > today || row.filed > today) return;
        if (!ACCEPTED_FORMS.has(row.form)) return;
        candidates.push({
          value: row.val,
          unit,
          start: null,
          end: row.end,
          filed: row.filed,
          form: row.form,
          accession: row.accn,
          fiscalYear: row.fy ?? null,
          fiscalPeriod: row.fp || null,
          frame: row.frame || null,
          periodType: 'instant',
          durationDays: null,
          taxonomy,
          concept,
          conceptLabel: definition.label || concept,
          sourceUrl: filingUrl(cik, row.accn),
          conceptRank,
        });
      });
    });
  });
  const byPeriod = new Map();
  candidates.forEach((candidate) => {
    const key = `${candidate.end}|${candidate.unit}`;
    const current = byPeriod.get(key);
    if (!current || compareCandidates(candidate, current) < 0) byPeriod.set(key, candidate);
  });
  return [...byPeriod.values()]
    .sort((a, b) => String(a.end).localeCompare(String(b.end)))
    .slice(-limit)
    .map((candidate) => {
      const clean = { ...candidate };
      delete clean.conceptRank;
      return clean;
    });
}

function priorYearFact(history, latest) {
  if (!latest) return null;
  const latestEnd = Date.parse(`${latest.end}T00:00:00Z`);
  return history
    .filter((fact) => fact !== latest && fact.unit === latest.unit)
    .map((fact) => ({ fact, days: Math.round((latestEnd - Date.parse(`${fact.end}T00:00:00Z`)) / 86_400_000) }))
    .filter((candidate) => candidate.days >= 330 && candidate.days <= 400)
    .sort((a, b) => Math.abs(a.days - 365) - Math.abs(b.days - 365))[0]?.fact || null;
}

function factOnPeriod(history, end, unit) {
  return history.find((fact) => fact.end === end && fact.unit === unit) || null;
}

function pct(numerator, denominator) {
  return Number.isFinite(numerator) && Number.isFinite(denominator) && denominator !== 0
    ? (numerator / denominator) * 100
    : null;
}

function deriveDecisionEvidence(companyFacts, cik) {
  const revenueQuarterly = selectFactHistory(companyFacts, CONCEPTS.revenue, cik, 'quarterly', 12);
  const revenueAnnual = selectFactHistory(companyFacts, CONCEPTS.revenue, cik, 'annual', 5);
  const operatingIncomeAnnual = selectFactHistory(companyFacts, CONCEPTS.operatingIncome, cik, 'annual', 5);
  const operatingCashFlowAnnual = selectFactHistory(companyFacts, CONCEPTS.operatingCashFlow, cik, 'annual', 5);
  const capitalExpenditureAnnual = selectFactHistory(companyFacts, CONCEPTS.capitalExpenditure, cik, 'annual', 5);
  const stockCompensationAnnual = selectFactHistory(companyFacts, CONCEPTS.stockCompensation, cik, 'annual', 5);
  const sharesOutstanding = selectInstantHistory(companyFacts, CONCEPTS.sharesOutstanding, cik, 8);

  const latestQuarter = revenueQuarterly.at(-1) || null;
  const priorQuarter = priorYearFact(revenueQuarterly, latestQuarter);
  const latestAnnual = revenueAnnual.at(-1) || null;
  const priorAnnual = priorYearFact(revenueAnnual, latestAnnual);
  const revenueGrowthBasis = latestQuarter && priorQuarter ? 'quarterly' : (latestAnnual && priorAnnual ? 'annual' : null);
  const growthLatest = revenueGrowthBasis === 'quarterly' ? latestQuarter : latestAnnual;
  const growthPrior = revenueGrowthBasis === 'quarterly' ? priorQuarter : priorAnnual;

  const operatingIncome = latestAnnual ? factOnPeriod(operatingIncomeAnnual, latestAnnual.end, latestAnnual.unit) : null;
  const operatingCashFlow = latestAnnual ? factOnPeriod(operatingCashFlowAnnual, latestAnnual.end, latestAnnual.unit) : null;
  const capitalExpenditure = latestAnnual ? factOnPeriod(capitalExpenditureAnnual, latestAnnual.end, latestAnnual.unit) : null;
  const stockCompensation = latestAnnual ? factOnPeriod(stockCompensationAnnual, latestAnnual.end, latestAnnual.unit) : null;
  const freeCashFlow = operatingCashFlow && capitalExpenditure
    ? operatingCashFlow.value - Math.abs(capitalExpenditure.value)
    : null;

  const latestShares = sharesOutstanding.at(-1) || null;
  const priorShares = priorYearFact(sharesOutstanding, latestShares);

  return {
    reported: {
      revenueQuarterly,
      revenueAnnual,
    },
    derived: {
      revenueGrowthPct: growthLatest && growthPrior ? pct(growthLatest.value - growthPrior.value, growthPrior.value) : null,
      revenueGrowthBasis,
      revenueGrowthCurrentEnd: growthLatest?.end || null,
      revenueGrowthPriorEnd: growthPrior?.end || null,
      annualPeriodEnd: latestAnnual?.end || null,
      annualRevenue: latestAnnual?.value ?? null,
      annualUnit: latestAnnual?.unit || null,
      operatingIncome: operatingIncome?.value ?? null,
      operatingMarginPct: operatingIncome && latestAnnual ? pct(operatingIncome.value, latestAnnual.value) : null,
      operatingCashFlow: operatingCashFlow?.value ?? null,
      capitalExpenditure: capitalExpenditure?.value ?? null,
      freeCashFlow,
      freeCashFlowMarginPct: freeCashFlow != null && latestAnnual ? pct(freeCashFlow, latestAnnual.value) : null,
      stockCompensation: stockCompensation?.value ?? null,
      stockCompensationPct: stockCompensation && latestAnnual ? pct(stockCompensation.value, latestAnnual.value) : null,
      shareDilutionPct: latestShares && priorShares ? pct(latestShares.value - priorShares.value, priorShares.value) : null,
      sharesCurrentEnd: latestShares?.end || null,
      sharesPriorEnd: priorShares?.end || null,
      sources: {
        revenue: latestAnnual?.sourceUrl || null,
        operatingIncome: operatingIncome?.sourceUrl || null,
        operatingCashFlow: operatingCashFlow?.sourceUrl || null,
        capitalExpenditure: capitalExpenditure?.sourceUrl || null,
        stockCompensation: stockCompensation?.sourceUrl || null,
        sharesOutstanding: latestShares?.sourceUrl || null,
      },
    },
  };
}

function extractIssuerRecord(symbol, cik, companyFacts) {
  const facts = {
    revenue: selectFact(companyFacts, CONCEPTS.revenue, cik),
    netIncome: selectFact(companyFacts, CONCEPTS.netIncome, cik),
    dilutedEps: selectFact(companyFacts, CONCEPTS.dilutedEps, cik),
  };
  const latest = Object.values(facts).filter(Boolean).sort(compareCandidates)[0] || null;
  return {
    symbol,
    cik,
    name: companyFacts.entityName || null,
    facts,
    decisionEvidence: deriveDecisionEvidence(companyFacts, cik),
    latestFiling: latest ? {
      form: latest.form,
      filed: latest.filed,
      periodEnd: latest.end,
      accession: latest.accession,
      sourceUrl: latest.sourceUrl,
    } : null,
  };
}

async function loadCompanyFacts(symbol, cik, fetchImpl = global.fetch) {
  const cached = factCache.get(symbol);
  if (cached && cached.expiresAt > Date.now()) return cached.value;
  if (pendingFacts.has(symbol)) return pendingFacts.get(symbol);
  const pending = fetchSecJson(`${SEC_COMPANY_FACTS_URL}CIK${cik}.json`, fetchImpl)
    .then((payload) => extractIssuerRecord(symbol, cik, payload))
    .then((value) => {
      factCache.set(symbol, { value, expiresAt: Date.now() + FACT_CACHE_MS });
      return value;
    })
    .finally(() => pendingFacts.delete(symbol));
  pendingFacts.set(symbol, pending);
  return pending;
}

async function loadIssuerData(symbols, fetchImpl = global.fetch) {
  const tickerMap = await loadTickerMap(fetchImpl);
  const issuers = {};
  const unavailable = {};
  await Promise.all(symbols.map(async (symbol) => {
    const cik = tickerMap.get(symbol);
    if (!cik) {
      unavailable[symbol] = 'No SEC ticker-to-CIK mapping';
      return;
    }
    try {
      const record = await loadCompanyFacts(symbol, cik, fetchImpl);
      if (Object.values(record.facts).some(Boolean)) issuers[symbol] = record;
      else unavailable[symbol] = 'No comparable standardized SEC XBRL facts';
    } catch (error) {
      unavailable[symbol] = error.name === 'AbortError' ? 'SEC request timed out' : error.message;
    }
  }));
  return {
    updatedAt: Date.now(),
    source: {
      provider: 'SEC EDGAR',
      kind: 'Issuer-filed standardized XBRL facts',
      official: true,
      url: 'https://www.sec.gov/search-filings/edgar-application-programming-interfaces',
    },
    issuers,
    unavailable,
  };
}

function resetCaches() {
  tickerCache = null;
  factCache.clear();
  pendingFacts.clear();
  requestQueue = Promise.resolve();
  nextRequestAt = 0;
}

module.exports = {
  CONCEPTS,
  durationDays,
  extractIssuerRecord,
  filingUrl,
  loadIssuerData,
  periodType,
  deriveDecisionEvidence,
  resetCaches,
  selectFact,
  selectFactHistory,
  selectInstantHistory,
};

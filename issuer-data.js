'use strict';

const SEC_TICKERS_URL = 'https://www.sec.gov/files/company_tickers.json';
const SEC_COMPANY_FACTS_URL = 'https://data.sec.gov/api/xbrl/companyfacts/';
const SEC_REQUEST_INTERVAL_MS = 130;
const TICKER_CACHE_MS = 24 * 60 * 60 * 1000;
const FACT_CACHE_MS = 6 * 60 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 12_000;

const CONCEPTS = {
  revenue: [
    ['us-gaap', 'RevenueFromContractWithCustomerExcludingAssessedTax'],
    ['us-gaap', 'Revenues'],
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
};

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

function selectFact(companyFacts, conceptList, cik) {
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
        if (!['10-Q', '10-Q/A', '10-K', '10-K/A', '20-F', '20-F/A', '40-F', '40-F/A', '6-K', '6-K/A'].includes(row.form)) return;
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
  if (!candidates.length) return null;
  const selected = candidates.sort(compareCandidates)[0];
  delete selected.conceptRank;
  return selected;
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
  resetCaches,
  selectFact,
};

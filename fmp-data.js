'use strict';

const { loadIssuerData } = require('./issuer-data');
const TTL = 24 * 60 * 60 * 1000;
const cache = new Map(), pending = new Map();
const quoteCache = new Map(), quotePending = new Map(), profileCache = new Map(), blockedEndpoints = new Map();
let queue = Promise.resolve(), blockedUntil = 0;
const finite = (v) => typeof v === 'number' && Number.isFinite(v);
const currencyCode = v => typeof v === 'string' && /^[A-Z]{3}$/.test(v);
const days = (a, b) => (Date.parse(a) - Date.parse(b)) / 86400000;
const ratio = (a, b) => finite(a) && finite(b) && b > 0 ? a / b : null;
const percent = (a, b) => { const value = ratio(a, b); return value == null ? null : 100 * value; };
const sum = (rows, field) => rows.length === 4 && rows.every((r) => finite(r[field])) ? rows.reduce((v, r) => v + r[field], 0) : null;
const source = { provider: 'Financial Modeling Prep', kind: 'Provider-normalized financial statements with SEC reconciliation', official: false, url: 'https://site.financialmodelingprep.com/developer/docs/stable' };

async function request(endpoint, symbol, fetchImpl = global.fetch) {
  const key = process.env.FMP_API_KEY?.trim();
  if (!key) throw new Error('FMP API key is not configured');
  if (Date.now() < Math.max(blockedUntil, blockedEndpoints.get(endpoint) || 0)) throw new Error('FMP access or quota unavailable; retry after cooldown');
  const slot = queue.then(() => new Promise((resolve) => setTimeout(resolve, 220)));
  queue = slot.catch(() => {}); await slot;
  if (Date.now() < Math.max(blockedUntil, blockedEndpoints.get(endpoint) || 0)) throw new Error('FMP access or quota unavailable; retry after cooldown');
  const url = new URL(`https://financialmodelingprep.com/stable/${endpoint}`);
  const marketEndpoint = ['quote', 'profile'].includes(endpoint);
  Object.entries({ symbol, ...(marketEndpoint ? {} : { period: 'quarter', limit: '8' }), apikey: key }).forEach(([k, v]) => url.searchParams.set(k, v));
  const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetchImpl(url.toString(), { signal: controller.signal, redirect: 'error', headers: { Accept: 'application/json' } });
    if (!response.ok) {
      if ([401, 429].includes(response.status)) blockedUntil = Date.now() + 30 * 60 * 1000;
      // A quote/profile entitlement failure must not disable available financial statements.
      if ([402, 403].includes(response.status)) blockedEndpoints.set(endpoint, Date.now() + 30 * 60 * 1000);
      throw new Error(`FMP HTTP ${response.status}`);
    }
    const payload = await response.json();
    if (!Array.isArray(payload)) throw new Error('FMP returned an invalid statement response');
    // Explicit allowlist prevents upstream metadata, URLs or credentials reaching clients.
    const fields = marketEndpoint ? (endpoint === 'quote' ? ['symbol', 'price', 'timestamp', 'currency', 'marketCap'] : ['symbol', 'currency']) : ['date', 'symbol', 'reportedCurrency', 'cik', 'filingDate', 'acceptedDate', 'fiscalYear', 'period', 'revenue', 'netIncome', 'epsDiluted', 'operatingIncome', 'operatingCashFlow', 'capitalExpenditure', 'freeCashFlow', 'stockBasedCompensation'];
    return payload.map((row) => Object.fromEntries(fields.filter((k) => Object.hasOwn(row, k)).map((k) => [k, row[k]])));
  } catch (error) {
    // Never return fetch error messages: they may contain a URL with the key.
    if (/^FMP (HTTP \d{3}|returned an invalid statement response)$/.test(error.message)) throw error;
    throw new Error(error.name === 'AbortError' ? 'FMP request timed out' : 'FMP network request failed');
  } finally { clearTimeout(timer); }
}

function validRows(rows, symbol, now = Date.now()) {
  const today = new Date(now).toISOString().slice(0, 10), byPeriod = new Map();
  for (const row of rows) {
    if (row.symbol !== symbol || !/^\d{4}-\d{2}-\d{2}$/.test(row.date || '') || !Number.isFinite(Date.parse(row.date)) || new Date(row.date).toISOString().slice(0, 10) !== row.date || row.date > today || !/^Q[1-4]$/.test(row.period || '') || !/^[A-Z]{3}$/.test(row.reportedCurrency || '')) continue;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(row.filingDate || '') || !Number.isFinite(Date.parse(row.filingDate)) || new Date(row.filingDate).toISOString().slice(0, 10) !== row.filingDate || row.filingDate > today || row.filingDate < row.date || !/^\d{4}$/.test(String(row.fiscalYear || ''))) continue;
    const old = byPeriod.get(row.date);
    if (!old || row.filingDate > old.filingDate) byPeriod.set(row.date, row);
  }
  return [...byPeriod.values()].sort((a, b) => b.date.localeCompare(a.date));
}

// Reconstruct TTM from an issuer annual filing and matching current/prior YTD facts.
// No company-specific numbers or timeless overrides are stored in the application.
function issuerTtm(rows = [], end, unit) {
  rows = rows.filter((r) => r.unit === unit && r.end <= end && finite(r.value)).sort((a, b) => b.end.localeCompare(a.end) || b.filed.localeCompare(a.filed));
  const annual = rows.find((r) => r.days >= 300 && r.days <= 430);
  if (!annual || days(end, annual.end) > 370) return null;
  if (annual.end === end) return { value: annual.value, sources: [annual.sourceUrl] };
  const current = rows.find((r) => r.end === end && days(r.start, annual.end) >= 1 && days(r.start, annual.end) <= 10);
  if (!current) return null;
  const prior = rows.find((r) => Math.abs(days(current.end, r.end) - 365) <= 10 && Math.abs(r.days - current.days) <= 10 && Math.abs(days(r.start, annual.start)) <= 10);
  if (!prior) return null;
  return { value: annual.value + current.value - prior.value, sources: [...new Set([annual.sourceUrl, current.sourceUrl, prior.sourceUrl])].filter(Boolean) };
}

function normalize(symbol, incomeRows, cashRows, issuer, now = Date.now()) {
  const income = validRows(incomeRows, symbol, now), cash = validRows(cashRows, symbol, now), latest = income[0];
  if (!latest) throw new Error('No valid FMP quarterly income statements');
  const blockingIssues = [], warnings = [], fieldSources = {};
  const quarters = income.slice(0, 4), unit = latest.reportedCurrency;
  const quarterIndex = (r) => Number(r.fiscalYear) * 4 + Number(r.period.slice(1));
  const consecutive = quarters.length === 4 && quarters.every((r, i) => r.reportedCurrency === unit && (!i || (quarterIndex(quarters[i - 1]) - quarterIndex(r) === 1 && days(quarters[i - 1].date, r.date) >= 70 && days(quarters[i - 1].date, r.date) <= 110)));
  const cashQuarters = quarters.map((r) => cash.find((c) => c.date === r.date && c.reportedCurrency === unit && quarterIndex(c) === quarterIndex(r))).filter(Boolean);
  if (!consecutive || cashQuarters.length !== 4) blockingIssues.push('Four matching consecutive financial quarters are unavailable');
  if (days(new Date(now).toISOString().slice(0, 10), latest.date) > 135) blockingIssues.push('Latest financial period is older than 135 days');
  const prior = income.find((r) => r.period === latest.period && Number(r.fiscalYear) === Number(latest.fiscalYear) - 1 && r.reportedCurrency === unit && Math.abs(days(latest.date, r.date) - 365) <= 10);
  const history = income.slice().reverse().map((r) => ({ value: r.revenue, end: r.date, filed: r.filingDate, unit: r.reportedCurrency, periodType: 'quarterly', form: 'FMP statement', taxonomy: 'FMP', concept: 'revenue', sourceUrl: null }));
  const derived = { financialBasis: 'TTM', annualPeriodEnd: latest.date, annualUnit: unit, annualRevenue: consecutive ? sum(quarters, 'revenue') : null, revenueGrowthPct: prior && prior.revenue > 0 ? percent(latest.revenue - prior.revenue, prior.revenue) : null, revenueGrowthBasis: 'quarterly', revenueGrowthCurrentEnd: latest.date, revenueGrowthPriorEnd: prior?.date || null, shareDilutionPct: null };
  const raw = { revenue: derived.annualRevenue, operatingIncome: sum(quarters, 'operatingIncome'), operatingCashFlow: sum(cashQuarters, 'operatingCashFlow'), capitalExpenditure: cashQuarters.length === 4 && cashQuarters.every((r) => finite(r.capitalExpenditure)) ? cashQuarters.reduce((v, r) => v + Math.abs(r.capitalExpenditure), 0) : null, stockCompensation: sum(cashQuarters, 'stockBasedCompensation') };
  const reconciled = issuer?.reconciliationFacts || {};
  for (const [metric, value] of Object.entries(raw)) {
    const primary = issuerTtm(reconciled[metric], latest.date, unit);
    derived[metric === 'revenue' ? 'annualRevenue' : metric] = primary ? (metric === 'capitalExpenditure' ? Math.abs(primary.value) : primary.value) : value;
    fieldSources[metric] = primary ? { provider: 'SEC EDGAR', urls: primary.sources } : { provider: 'Financial Modeling Prep', urls: [] };
    if (primary && finite(value) && Math.abs(primary.value - value) > Math.max(1000, Math.abs(primary.value) * 0.001)) warnings.push(`${metric}: FMP differs; aligned issuer TTM used`);
  }
  const software = issuerTtm(reconciled.capitalizedSoftware, latest.date, unit);
  if (software && fieldSources.capitalExpenditure.provider === 'SEC EDGAR') {
    derived.capitalExpenditure += Math.abs(software.value);
    fieldSources.capitalExpenditure.urls = [...new Set([...fieldSources.capitalExpenditure.urls, ...software.sources])];
  }
  // If capex is unreconciled, inconsistent signs/FCF or incomplete periods cannot pass.
  if (fieldSources.capitalExpenditure.provider !== 'SEC EDGAR' && cashQuarters.some((r) => r.capitalExpenditure > 0 || !finite(r.freeCashFlow) || Math.abs(r.freeCashFlow - (r.operatingCashFlow - Math.abs(r.capitalExpenditure))) > Math.max(1000, Math.abs(r.freeCashFlow) * 0.001))) blockingIssues.push('FMP capital expenditure / FCF requires issuer reconciliation');
  const secQuarter = issuer?.decisionEvidence?.reported?.revenueQuarterly?.find((r) => r.end === latest.date && r.unit === unit);
  if (secQuarter && Math.abs(secQuarter.value - latest.revenue) > Math.max(1000, Math.abs(secQuarter.value) * .001)) blockingIssues.push('Latest revenue differs from the same-period SEC fact');
  if (!secQuarter) warnings.push('Latest revenue has no matching SEC snapshot yet');
  if (!issuer) warnings.push('SEC reconciliation unavailable; FMP-normalized values only');
  derived.freeCashFlow = finite(derived.operatingCashFlow) && finite(derived.capitalExpenditure) ? derived.operatingCashFlow - Math.abs(derived.capitalExpenditure) : null;
  derived.operatingMarginPct = percent(derived.operatingIncome, derived.annualRevenue);
  derived.freeCashFlowMarginPct = percent(derived.freeCashFlow, derived.annualRevenue);
  derived.stockCompensationPct = percent(derived.stockCompensation, derived.annualRevenue);
  derived.sources = Object.fromEntries(Object.entries(fieldSources).map(([k, v]) => [k, v.urls[0] || null]));
  derived.blockingIssues = blockingIssues;
  const fact = (key, value, suffix = '') => finite(value) ? { value, unit: unit + suffix, end: latest.date, filed: latest.filingDate, periodType: 'quarterly', form: 'FMP statement', taxonomy: 'FMP', concept: key, sourceUrl: secQuarter?.sourceUrl || null } : null;
  return { symbol, cik: String(latest.cik || '').padStart(10, '0'), name: issuer?.name || symbol, provider: source.provider, retrievedAt: now, facts: { revenue: fact('revenue', latest.revenue), netIncome: fact('netIncome', latest.netIncome), dilutedEps: fact('epsDiluted', latest.epsDiluted, '/shares') }, latestFiling: { form: 'FMP statement', filed: latest.filingDate, periodEnd: latest.date, sourceUrl: secQuarter?.sourceUrl || null }, decisionEvidence: { reported: { revenueQuarterly: history, revenueAnnual: [] }, derived }, reconciliation: { warnings, blockingIssues, fieldSources, rawFmpTtm: raw, secLatestFiling: issuer?.latestFiling || null }, dataPolicy: 'No static fallback; no inferred dilution; TTM periods must align' };
}

async function statements(symbol, fetchImpl) {
  const entry = cache.get(symbol);
  if (entry && entry.expires > Date.now()) return entry.value;
  if (pending.has(symbol)) return pending.get(symbol);
  const work = (async () => {
    const income = await request('income-statement', symbol, fetchImpl);
    const cash = await request('cash-flow-statement', symbol, fetchImpl);
    const value = { income, cash, fetchedAt: Date.now() };
    cache.set(symbol, { value, expires: Date.now() + TTL }); return value;
  })().finally(() => pending.delete(symbol));
  pending.set(symbol, work); return work;
}

async function loadFinancialData(symbols, { fetchImpl = global.fetch, issuerLoader = loadIssuerData } = {}) {
  if (!process.env.FMP_API_KEY?.trim()) throw new Error('FMP API key is not configured');
  const secPromise = issuerLoader(symbols).catch(() => ({ issuers: {} }));
  const results = {}, unavailable = {};
  // One shared request queue and per-symbol in-flight deduplication bound quota use.
  await Promise.all(symbols.map(async (s) => { try { results[s] = await statements(s, fetchImpl); } catch (e) { unavailable[s] = e.message; } }));
  const sec = await secPromise, issuers = {};
  for (const [symbol, data] of Object.entries(results)) {
    try { issuers[symbol] = normalize(symbol, data.income, data.cash, sec.issuers[symbol]); issuers[symbol].retrievedAt = data.fetchedAt; }
    catch (e) { unavailable[symbol] = e.message; }
  }
  return { updatedAt: Date.now(), source, cacheTtlHours: 24, issuers, unavailable };
}

function normalizeQuote(symbol, quote, profile, now = Date.now()) {
  if (quote?.symbol !== symbol || !finite(quote.price) || quote.price <= 0 || !finite(quote.timestamp) || quote.timestamp <= 0 || quote.timestamp * 1000 > now || now - quote.timestamp * 1000 > 7 * 86400000) throw new Error('FMP quote price or market timestamp is unavailable or stale');
  const quoteCurrency = currencyCode(quote.currency) ? quote.currency : null;
  const profileCurrency = profile?.symbol === symbol && currencyCode(profile.currency) ? profile.currency : null;
  if (quoteCurrency && profileCurrency && quoteCurrency !== profileCurrency) throw new Error('FMP quote and profile currencies differ');
  const currency = quoteCurrency || profileCurrency;
  if (!currency) throw new Error('FMP quote currency unavailable');
  const marketCap = finite(quote.marketCap) && quote.marketCap > 0 ? quote.marketCap : null;
  // Keep the shared dashboard-core shape used by both valuation consumers.
  return { symbol, price: quote.price, asOf: quote.timestamp, currency, marketCap, extras: { marketCap }, provider: 'Financial Modeling Prep', retrievedAt: now };
}

async function loadFmpQuotes(symbols, { fetchImpl = global.fetch } = {}) {
  if (!process.env.FMP_API_KEY?.trim()) throw new Error('FMP API key is not configured');
  const quotes = {}, unavailable = {};
  await Promise.all([...new Set(symbols)].map(async symbol => {
    if (!/^[A-Z][A-Z0-9.-]{0,9}$/.test(symbol)) { unavailable[symbol] = 'Invalid symbol'; return; }
    let entry = quoteCache.get(symbol);
    if (!entry || entry.expires <= Date.now()) {
      if (!quotePending.has(symbol)) {
        const work = (async () => {
          try {
            const rows = await request('quote', symbol, fetchImpl);
            const quote = rows.find(row => row.symbol === symbol);
            if (!quote) throw new Error('FMP quote unavailable for requested symbol');
            let profile = profileCache.get(symbol);
            if (!currencyCode(quote.currency) && (!profile || profile.expires <= Date.now())) {
              const profiles = await request('profile', symbol, fetchImpl);
              const value = profiles.find(row => row.symbol === symbol && currencyCode(row.currency));
              if (!value) throw new Error('FMP quote currency unavailable');
              profile = { value, expires: Date.now() + TTL }; profileCache.set(symbol, profile);
            }
            const value = normalizeQuote(symbol, quote, profile?.expires > Date.now() ? profile.value : null);
            const result = { value, expires: Date.now() + 5 * 60 * 1000 }; quoteCache.set(symbol, result); return result;
          } catch (error) {
            const result = { error: error.message, expires: Date.now() + 60000 }; quoteCache.set(symbol, result); return result;
          }
        })().finally(() => quotePending.delete(symbol));
        quotePending.set(symbol, work);
      }
      entry = await quotePending.get(symbol);
    }
    if (entry.error) unavailable[symbol] = entry.error;
    else {
      // Recheck market age when serving a cached response; retrieval time is not market time.
      try { normalizeQuote(symbol, { ...entry.value, timestamp: entry.value.asOf }); quotes[symbol] = entry.value; }
      catch (error) { unavailable[symbol] = error.message; }
    }
  }));
  return { updatedAt: Date.now(), source: { provider: 'Financial Modeling Prep', kind: 'Market quotes; currency from FMP quote or company profile', url: 'https://site.financialmodelingprep.com/developer/docs/stable' }, cacheTtlMinutes: 5, quotes, unavailable };
}

function resetCaches() { cache.clear(); pending.clear(); quoteCache.clear(); quotePending.clear(); profileCache.clear(); blockedEndpoints.clear(); blockedUntil = 0; queue = Promise.resolve(); }
module.exports = { loadFinancialData, loadFmpQuotes, normalizeQuote, normalize, issuerTtm, validRows, request, resetCaches };

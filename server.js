// Configure dashboard-core's Yahoo proxy and add the issuer-filed SEC source.

const express = require('express');
const path = require('path');
const { createDashboardServer } = require('dashboard-core');
const { loadIssuerData } = require('./issuer-data');
const universe = require('./public/universe.json');

const coreApp = createDashboardServer({
  publicDir: path.join(__dirname, 'public'),
  tickerData: path.join(__dirname, 'public', 'universe.json'),
  dashboardName: 'Software Supply Chain',
});

const app = express();
const RETIRED_SYMBOLS = new Set(['SQ', 'CYBR', 'CFLT']);
const ACTIVE_SYMBOLS = new Set(Object.keys(universe.tickers));

// Make source and fallback policy machine-readable on every API response.
app.use('/api', (req, res, next) => {
  res.set('x-data-policy', 'live-only-no-static-market-fallback');
  if (req.path === '/issuer-data') {
    res.set('x-data-provider', 'SEC EDGAR (issuer-filed XBRL facts)');
  } else if (req.path === '/provenance') {
    res.set('x-data-provider', 'SEC EDGAR primary; Yahoo Finance reconciliation');
  } else {
    res.set('x-data-provider', 'Yahoo Finance (unofficial public endpoints)');
  }
  const requested = String(req.query.symbols || '').split(',').map((s) => s.trim().toUpperCase()).filter(Boolean);
  const pathSymbol = String(req.path.split('/').pop() || '').toUpperCase();
  const retired = requested.find((symbol) => RETIRED_SYMBOLS.has(symbol)) ||
    (RETIRED_SYMBOLS.has(pathSymbol) ? pathSymbol : null);
  if (retired) {
    return res.status(410).json({ error: `${retired} is not an active symbol in this dashboard universe` });
  }
  next();
});

app.get('/api/issuer-data', async (req, res) => {
  const requested = String(req.query.symbols || '').split(',').map((s) => s.trim().toUpperCase()).filter(Boolean);
  const symbols = requested.length ? [...new Set(requested)] : [...ACTIVE_SYMBOLS];
  const invalid = symbols.filter((symbol) => !ACTIVE_SYMBOLS.has(symbol));
  if (invalid.length) return res.status(400).json({ error: `Symbols outside the active universe: ${invalid.join(', ')}` });
  try {
    const payload = await loadIssuerData(symbols);
    res.set('Cache-Control', 'public, max-age=300');
    return res.status(Object.keys(payload.issuers).length ? 200 : 503).json(payload);
  } catch (error) {
    return res.status(503).json({ error: `Issuer-filed data unavailable: ${error.message}` });
  }
});

app.get('/api/provenance', (req, res) => {
  res.json({
    reportedFundamentals: {
      provider: 'SEC EDGAR',
      access: 'Issuer-filed standardized XBRL company facts',
      caveat: 'Only standardized US-GAAP or IFRS facts are displayed. SEC does not guarantee the accuracy or scope of its ticker-to-CIK association file, so the mapped CIK and SEC entity name are exposed. Missing issuer facts remain unavailable and are never filled from Yahoo.',
    },
    marketReconciliation: {
      provider: 'Yahoo Finance',
      access: 'Unofficial public endpoints via dashboard-core',
      caveat: 'Used as a secondary reconciliation source for market data and estimates, not as the source of record for reported results.',
    },
    decisionResearch: {
      kind: 'User-controlled evidence gates',
      reportedInputs: 'SEC EDGAR revenue, operating income, operating cash flow, capital expenditure, stock compensation, and shares outstanding when standardized facts are available.',
      marketInputs: 'Yahoo Finance market capitalization and one-year daily closes, used only when fresh and currency-compatible with the filed annual values.',
      caveat: 'Research now means the available evidence passes user-entered thresholds. It is not a buy recommendation, prediction, or price target. Missing evidence cannot pass.',
    },
    universe: {
      file: 'universe.json',
      kind: 'Curated coverage taxonomy only',
      asOf: '2026-08-09',
    },
    fallbackPolicy: 'No static or Yahoo-derived value replaces a missing issuer-filed fundamental. No static market, options, insider, or news values are displayed.',
  });
});

app.use(coreApp);

// Export the app so smoke tests / other callers can mount it without binding.
module.exports = app;

// Only bind when run directly via `node server.js` (not when require()'d).
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`Software Supply Chain Dashboard running on port ${PORT}`));
}

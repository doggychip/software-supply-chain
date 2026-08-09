// Thin wrapper around dashboard-core. All Yahoo proxy / static / cache
// logic lives in dashboard-core; this file just configures the dashboard.

const express = require('express');
const path = require('path');
const { createDashboardServer } = require('dashboard-core');

const coreApp = createDashboardServer({
  publicDir: path.join(__dirname, 'public'),
  tickerData: path.join(__dirname, 'public', 'universe.json'),
  dashboardName: 'Software Supply Chain',
});

const app = express();
const RETIRED_SYMBOLS = new Set(['SQ', 'CYBR', 'CFLT']);

// Market and fundamental endpoints are third-party Yahoo Finance data. Make
// that provenance machine-readable on every API response instead of implying
// the dashboard itself is the source.
app.use('/api', (req, res, next) => {
  res.set('x-data-provider', 'Yahoo Finance (unofficial public endpoints)');
  res.set('x-data-policy', 'live-only-no-static-market-fallback');
  const requested = String(req.query.symbols || '').split(',').map((s) => s.trim().toUpperCase()).filter(Boolean);
  const pathSymbol = String(req.path.split('/').pop() || '').toUpperCase();
  const retired = requested.find((symbol) => RETIRED_SYMBOLS.has(symbol)) ||
    (RETIRED_SYMBOLS.has(pathSymbol) ? pathSymbol : null);
  if (retired) {
    return res.status(410).json({ error: `${retired} is not an active symbol in this dashboard universe` });
  }
  next();
});

app.get('/api/provenance', (req, res) => {
  res.json({
    marketData: {
      provider: 'Yahoo Finance',
      access: 'Unofficial public endpoints via dashboard-core',
      caveat: 'Third-party data with no service-level guarantee; verify with the exchange or issuer before relying on it.',
    },
    universe: {
      file: 'universe.json',
      kind: 'Curated coverage taxonomy only',
      asOf: '2026-08-09',
    },
    fallbackPolicy: 'No static market, fundamental, options, insider, or news values are displayed when live data is unavailable.',
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

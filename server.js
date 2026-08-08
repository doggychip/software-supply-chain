// Thin wrapper around dashboard-core. All Yahoo proxy / static / cache
// logic lives in dashboard-core; this file just configures the dashboard.

const path = require('path');
const { createDashboardServer } = require('dashboard-core');

const app = createDashboardServer({
  publicDir: path.join(__dirname, 'public'),
  tickerData: path.join(__dirname, 'public', 'sw_data.json'),
  // SQ was renamed to XYZ (Block). Fetch from Yahoo under XYZ, expose as SQ.
  symbolAliases: { SQ: 'XYZ' },
  // Acquired/delisted companies: skip live fetch and retain the baked snapshot.
  // CYBR was acquired by PANW; CFLT was acquired by IBM.
  skipLive: ['CYBR', 'CFLT'],
  newsDataPath: path.join(__dirname, 'news_data.json'),
  dashboardName: 'Software Supply Chain',
});

// Export the app so smoke tests / other callers can mount it without binding.
module.exports = app;

// Only bind when run directly via `node server.js` (not when require()'d).
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`Software Supply Chain Dashboard running on port ${PORT}`));
}

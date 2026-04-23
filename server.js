const express = require('express');
const path = require('path');
const fs = require('fs');
const fetch = (...args) => import('node-fetch').then(m => m.default(...args));

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));

// Yahoo's v8 chart endpoint doesn't require auth; v7 quote now needs a crumb.
// SQ was renamed to XYZ (Block). Fetch from Yahoo under XYZ, expose as SQ.
const SYMBOL_ALIASES = { SQ: 'XYZ' };
// CYBR was acquired by PANW and delisted — skip live fetch, fall through to hardcoded.
const SKIP_LIVE = new Set(['CYBR']);

// Canonical ticker list derived from sw_data.json (falls back silently if missing).
let CANONICAL_TICKERS = [];
try {
  const sw = JSON.parse(fs.readFileSync(path.join(__dirname, 'public', 'sw_data.json'), 'utf8'));
  CANONICAL_TICKERS = Object.keys(sw.tickers || {}).sort();
} catch (_) {}

// In-memory cache with TTL (ms).
const CACHE_TTL_MS = 60 * 1000;
const _cache = new Map();
function cacheGet(key) {
  const hit = _cache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.t > CACHE_TTL_MS) { _cache.delete(key); return null; }
  return hit.v;
}
function cacheSet(key, v) { _cache.set(key, { t: Date.now(), v }); }

async function fetchYahooChart(symbol, range = '1d', interval = '1d') {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=${interval}`;
  const response = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
  });
  if (!response.ok) throw new Error(`Yahoo ${response.status}`);
  return response.json();
}

app.get('/api/quote/:symbol', async (req, res) => {
  try {
    const sym = req.params.symbol.toUpperCase();
    const yahooSym = SYMBOL_ALIASES[sym] || sym;
    const data = await fetchYahooChart(yahooSym, '6mo', '1d');
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Multi-quote endpoint. If `symbols` is omitted, returns all canonical tickers.
app.get('/api/quotes', async (req, res) => {
  try {
    const requested = (req.query.symbols || '').split(',').map(s => s.trim()).filter(Boolean);
    const symbols = (requested.length ? requested : CANONICAL_TICKERS).map(s => s.toUpperCase());
    if (!symbols.length) return res.json({ updatedAt: Date.now(), quotes: {} });

    const cacheKey = 'quotes:' + symbols.join(',');
    const hit = cacheGet(cacheKey);
    if (hit) {
      res.set('cache-control', `public, max-age=${Math.floor(CACHE_TTL_MS / 1000)}`);
      return res.json(hit);
    }

    const quotes = {};
    await Promise.all(symbols.map(async (sym) => {
      if (SKIP_LIVE.has(sym)) return;
      const yahooSym = SYMBOL_ALIASES[sym] || sym;
      try {
        const data = await fetchYahooChart(yahooSym, '1d', '1d');
        const meta = data?.chart?.result?.[0]?.meta;
        if (!meta || typeof meta.regularMarketPrice !== 'number') return;
        const prev = meta.chartPreviousClose ?? meta.previousClose;
        quotes[sym] = {
          price: meta.regularMarketPrice,
          previousClose: prev,
          change: prev != null ? +(meta.regularMarketPrice - prev).toFixed(4) : 0,
          changePct: prev ? +(((meta.regularMarketPrice - prev) / prev) * 100).toFixed(5) : 0,
          currency: meta.currency,
          exchange: meta.exchangeName,
          asOf: meta.regularMarketTime
        };
      } catch (_) {}
    }));

    const payload = { updatedAt: Date.now(), quotes };
    cacheSet(cacheKey, payload);
    res.set('cache-control', `public, max-age=${Math.floor(CACHE_TTL_MS / 1000)}`);
    res.json(payload);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Historical bars: GET /api/history/:sym?range=6mo
app.get('/api/history/:sym', async (req, res) => {
  try {
    const sym = req.params.sym.toUpperCase();
    const range = (req.query.range || '6mo').toString();
    const cacheKey = `history:${sym}:${range}`;
    const hit = cacheGet(cacheKey);
    if (hit) {
      res.set('cache-control', 'public, max-age=300');
      return res.json(hit);
    }
    const yahooSym = SYMBOL_ALIASES[sym] || sym;
    const data = await fetchYahooChart(yahooSym, range, '1d');
    const result = data?.chart?.result?.[0];
    if (!result) return res.status(404).json({ symbol: sym, bars: [] });
    const ts = result.timestamp || [];
    const q = result.indicators?.quote?.[0] || {};
    const bars = ts.map((t, i) => ({
      d: new Date(t * 1000).toISOString().slice(0, 10),
      c: q.close?.[i],
      v: q.volume?.[i]
    })).filter(b => b.c != null);
    const payload = { symbol: sym, bars };
    cacheSet(cacheKey, payload);
    res.set('cache-control', 'public, max-age=300');
    res.json(payload);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// News API endpoint
const NEWS_DATA = require('./news_data.json');
app.get('/api/news', (req, res) => {
  res.json(NEWS_DATA);
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Software Supply Chain Dashboard running on port ${PORT}`);
});

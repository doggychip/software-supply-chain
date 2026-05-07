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

// ── Input validation & fetch hardening ─────────────────────────────
// Tickers: 1–10 chars, leading letter, allow letters/digits/dot/dash (BRK.B, RDS-A).
// Caps protect against unbounded fan-out → Yahoo rate limit / OOM via cache key.
const TICKER_RE = /^[A-Z][A-Z0-9.-]{0,9}$/;
const MAX_SYMBOLS = 200;
const FETCH_TIMEOUT_MS = 10000;
const FETCH_CONCURRENCY = 5;

function validateTicker(s) {
  if (s == null) throw new Error('ticker required');
  const u = String(s).toUpperCase().trim();
  if (!TICKER_RE.test(u)) throw new Error(`invalid ticker: ${s}`);
  return u;
}

function validateSymbols(raw) {
  const list = String(raw || '').split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
  if (list.length > MAX_SYMBOLS) throw new Error(`too many symbols (max ${MAX_SYMBOLS})`);
  for (const s of list) if (!TICKER_RE.test(s)) throw new Error(`invalid ticker: ${s}`);
  return list;
}

async function fetchWithTimeout(url, opts = {}, ms = FETCH_TIMEOUT_MS) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms);
  try {
    return await fetch(url, { ...opts, signal: ctl.signal });
  } finally {
    clearTimeout(t);
  }
}

// Concurrency-limited fan-out — Yahoo rate-limits aggressively at high parallelism.
async function mapLimit(items, limit, worker) {
  const results = new Array(items.length);
  let i = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) {
      const idx = i++;
      results[idx] = await worker(items[idx], idx);
    }
  });
  await Promise.all(runners);
  return results;
}

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
  const response = await fetchWithTimeout(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
  });
  if (!response.ok) throw new Error(`Yahoo ${response.status}`);
  return response.json();
}

app.get('/api/quote/:symbol', async (req, res) => {
  let sym;
  try {
    sym = validateTicker(req.params.symbol);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
  try {
    const yahooSym = SYMBOL_ALIASES[sym] || sym;
    const data = await fetchYahooChart(yahooSym, '6mo', '1d');
    res.json(data);
  } catch (err) {
    console.error(`/api/quote/${sym} failed:`, err.message);
    res.status(502).json({ error: 'upstream fetch failed' });
  }
});

// Multi-quote endpoint. If `symbols` is omitted, returns all canonical tickers.
app.get('/api/quotes', async (req, res) => {
  let requested;
  try {
    requested = validateSymbols(req.query.symbols);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
  try {
    const symbols = (requested.length ? requested : CANONICAL_TICKERS);
    if (!symbols.length) return res.json({ updatedAt: Date.now(), quotes: {} });

    const cacheKey = 'quotes:' + symbols.join(',');
    const hit = cacheGet(cacheKey);
    if (hit) {
      res.set('cache-control', `public, max-age=${Math.floor(CACHE_TTL_MS / 1000)}`);
      return res.json(hit);
    }

    const quotes = {};
    await mapLimit(symbols, FETCH_CONCURRENCY, async (sym) => {
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
      } catch (err) {
        // Per-symbol failures are logged but don't fail the whole batch.
        console.warn(`/api/quotes ${sym}:`, err.message);
      }
    });

    const payload = { updatedAt: Date.now(), quotes };
    cacheSet(cacheKey, payload);
    res.set('cache-control', `public, max-age=${Math.floor(CACHE_TTL_MS / 1000)}`);
    res.json(payload);
  } catch (err) {
    console.error('/api/quotes failed:', err.message);
    res.status(502).json({ error: 'upstream fetch failed' });
  }
});

// Historical bars: GET /api/history/:sym?range=6mo
app.get('/api/history/:sym', async (req, res) => {
  let sym;
  try {
    sym = validateTicker(req.params.sym);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
  try {
    const range = (req.query.range || '6mo').toString();
    const interval = (req.query.interval || '1d').toString();
    const cacheKey = `history:${sym}:${range}:${interval}`;
    const hit = cacheGet(cacheKey);
    if (hit) {
      res.set('cache-control', 'public, max-age=300');
      return res.json(hit);
    }
    const yahooSym = SYMBOL_ALIASES[sym] || sym;
    const data = await fetchYahooChart(yahooSym, range, interval);
    const result = data?.chart?.result?.[0];
    if (!result) return res.status(404).json({ symbol: sym, bars: [] });
    const ts = result.timestamp || [];
    const q = result.indicators?.quote?.[0] || {};
    const bars = ts.map((t, i) => ({
      d: new Date(t * 1000).toISOString().slice(0, 10),
      c: q.close?.[i] == null ? null : +q.close[i].toFixed(2),
      v: q.volume?.[i] ?? 0
    })).filter(b => b.c != null);
    const payload = { symbol: sym, bars };
    cacheSet(cacheKey, payload);
    res.set('cache-control', 'public, max-age=300');
    res.json(payload);
  } catch (err) {
    console.error(`/api/history/${sym} failed:`, err.message);
    res.status(502).json({ error: 'upstream fetch failed' });
  }
});

// Batch history: GET /api/history?symbols=AMZN,MSFT&range=6mo&interval=1d
// Returns { SYM: [{d,c,v}, ...] } for each requested symbol.
// If `symbols` is omitted, returns bars for all canonical tickers.
app.get('/api/history', async (req, res) => {
  let requested;
  try {
    requested = validateSymbols(req.query.symbols);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
  try {
    const symbols = (requested.length ? requested : CANONICAL_TICKERS);
    const range = (req.query.range || '6mo').toString();
    const interval = (req.query.interval || '1d').toString();
    if (!symbols.length) return res.json({});

    const out = {};
    await mapLimit(symbols, FETCH_CONCURRENCY, async (sym) => {
      if (SKIP_LIVE.has(sym)) return;
      const cacheKey = `history:${sym}:${range}:${interval}`;
      const hit = cacheGet(cacheKey);
      if (hit) { out[sym] = hit.bars; return; }
      const yahooSym = SYMBOL_ALIASES[sym] || sym;
      try {
        const data = await fetchYahooChart(yahooSym, range, interval);
        const result = data?.chart?.result?.[0];
        if (!result) return;
        const ts = result.timestamp || [];
        const q = result.indicators?.quote?.[0] || {};
        const bars = ts.map((t, i) => ({
          d: new Date(t * 1000).toISOString().slice(0, 10),
          c: q.close?.[i] == null ? null : +q.close[i].toFixed(2),
          v: q.volume?.[i] ?? 0
        })).filter(b => b.c != null);
        if (bars.length) {
          cacheSet(cacheKey, { symbol: sym, bars });
          out[sym] = bars;
        }
      } catch (err) {
        console.warn(`/api/history ${sym}:`, err.message);
      }
    });
    res.set('cache-control', 'public, max-age=300');
    res.json(out);
  } catch (err) {
    console.error('/api/history failed:', err.message);
    res.status(502).json({ error: 'upstream fetch failed' });
  }
});

// News API endpoint
const NEWS_DATA = require('./news_data.json');
app.get('/api/news', (req, res) => {
  res.json(NEWS_DATA);
});

// ---- Options chain (single ticker, raw pass-through from Yahoo v7) ----
// Caveat: Yahoo's v7 options endpoint has been tightening; if you start
// seeing 401/403 here, they've added crumb auth on this path too.
app.get('/api/options/:ticker', async (req, res) => {
  let sym;
  try {
    sym = validateTicker(req.params.ticker);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
  const yahooSym = SYMBOL_ALIASES[sym] || sym;
  const url = `https://query2.finance.yahoo.com/v7/finance/options/${encodeURIComponent(yahooSym)}`;
  try {
    const r = await fetchWithTimeout(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    if (!r.ok) return res.status(r.status).json({ error: `Yahoo returned ${r.status}` });
    const j = await r.json();
    res.set('cache-control', 'public, max-age=60');
    res.json(j);
  } catch (e) {
    console.error(`/api/options/${sym} failed:`, e.message);
    res.status(502).json({ error: 'upstream fetch failed' });
  }
});

// ---- Aggregated options flow across many tickers ----
// GET /api/options-flow?symbols=AMZN,MSFT&unusualMinVol=500&unusualVolToOI=3
// Returns nearest-expiration call/put aggregates plus a naive "unusual" list
// (volume > openInterest * unusualVolToOI && volume > unusualMinVol).
app.get('/api/options-flow', async (req, res) => {
  let requested;
  try {
    requested = validateSymbols(req.query.symbols);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
  const symbols = (requested.length ? requested : CANONICAL_TICKERS);
  if (!symbols.length) return res.status(400).json({ error: 'symbols required' });

  const unusualMinVol  = +req.query.unusualMinVol  || 500;
  const unusualVolToOI = +req.query.unusualVolToOI || 3;

  const cacheKey = `options-flow:${symbols.join(',')}:${unusualMinVol}:${unusualVolToOI}`;
  const hit = cacheGet(cacheKey);
  if (hit) {
    res.set('cache-control', 'public, max-age=120');
    return res.json(hit);
  }

  const perTicker = {};
  await mapLimit(symbols, FETCH_CONCURRENCY, async (sym) => {
    if (SKIP_LIVE.has(sym)) return;
    const yahooSym = SYMBOL_ALIASES[sym] || sym;
    try {
      const r = await fetchWithTimeout(
        `https://query2.finance.yahoo.com/v7/finance/options/${encodeURIComponent(yahooSym)}`,
        { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' } }
      );
      if (!r.ok) return;
      const j = await r.json();
      const result = j?.optionChain?.result?.[0];
      if (!result) return;

      const quote = result.quote || {};
      const chain = result.options?.[0]; // nearest expiration
      if (!chain) return;

      let callVol = 0, putVol = 0, callPrem = 0, putPrem = 0;
      let callOI = 0, putOI = 0;
      const unusual = [];

      const scan = (legs, side) => {
        for (const c of legs || []) {
          const v  = c.volume || 0;
          const oi = c.openInterest || 0;
          const last = c.lastPrice || 0;
          const prem = v * last * 100;
          if (side === 'CALL') { callVol += v; callOI += oi; callPrem += prem; }
          else                 { putVol  += v; putOI  += oi; putPrem  += prem; }
          if (oi > 0 && v > oi * unusualVolToOI && v > unusualMinVol) {
            unusual.push({
              side,
              strike: c.strike,
              volume: v,
              openInterest: oi,
              last,
              premium: prem,
              iv: c.impliedVolatility,
              exp: chain.expirationDate,
            });
          }
        }
      };
      scan(chain.calls, 'CALL');
      scan(chain.puts,  'PUT');

      perTicker[sym] = {
        price: quote.regularMarketPrice,
        expiration: chain.expirationDate,
        callVol, putVol, callPrem, putPrem, callOI, putOI,
        pcRatio: callVol ? +(putVol / callVol).toFixed(3) : null,
        totalPrem: callPrem + putPrem,
        totalVol: callVol + putVol,
        unusual: unusual.sort((a, b) => b.premium - a.premium).slice(0, 3),
      };
    } catch (err) {
      console.warn(`/api/options-flow ${sym}:`, err.message);
    }
  });

  const payload = { asOf: Date.now(), tickers: perTicker };
  cacheSet(cacheKey, payload);
  res.set('cache-control', 'public, max-age=120');
  res.json(payload);
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Software Supply Chain Dashboard running on port ${PORT}`);
});

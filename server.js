const express = require('express');
const path = require('path');
const fetch = (...args) => import('node-fetch').then(m => m.default(...args));

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Yahoo Finance proxy — avoids CORS issues on client
app.get('/api/quote/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=6mo&interval=1d`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Multi-quote endpoint
app.get('/api/quotes', async (req, res) => {
  try {
    const symbols = (req.query.symbols || '').split(',').filter(Boolean);
    if (!symbols.length) return res.json({ error: 'No symbols' });

    const results = {};
    await Promise.all(symbols.map(async (sym) => {
      try {
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?range=1d&interval=1d`;
        const response = await fetch(url, {
          headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        const data = await response.json();
        const meta = data?.chart?.result?.[0]?.meta;
        if (meta) {
          results[sym] = {
            price: meta.regularMarketPrice,
            previousClose: meta.previousClose,
            change: meta.regularMarketPrice - meta.previousClose,
            changePct: ((meta.regularMarketPrice - meta.previousClose) / meta.previousClose * 100),
            currency: meta.currency,
            exchange: meta.exchangeName
          };
        }
      } catch (e) {
        results[sym] = { error: e.message };
      }
    }));
    res.json(results);
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

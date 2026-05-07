# Software Stack — Full Value Chain Research Dashboard

A self-hosted equity research dashboard covering the **software value chain** end-to-end: hyperscalers, infrastructure, platforms, application software, devtools, and security. Live prices, technicals, sentiment, options, news, insider activity, correlations, and stress-tests across the full universe.

> **Stack:** Node.js + Express server, vanilla HTML/JS, Chart.js, Yahoo Finance v8 chart API.

---

## Quick start

```bash
git clone https://github.com/doggychip/software-supply-chain.git
cd software-supply-chain
npm install
npm start
```

Open `http://localhost:3000`. The server fetches live quotes from Yahoo on demand and serves the static dashboard pages from `public/`.

To run on a different port:

```bash
PORT=4000 npm start
```

---

## What's in here

The dashboard is a **multi-page static site** with a shared layout. Each page is a single self-contained HTML file in `public/`.

| Page | File | What it shows |
|---|---|---|
| **Main** | `index.html` | Layer-by-layer value-chain view, ticker cards with live price, change, range, thesis text |
| **Technicals** | `technicals.html` | RSI, MACD, moving averages, support/resistance per ticker |
| **Sentiment** | `sentiment.html` | Sentiment scoring across the universe |
| **Options** | `options.html` | Options activity, IV, put/call ratios |
| **Stress Test** | `stress-test.html` | Scenario stress on the portfolio (rate shocks, sector drawdowns) |
| **Correlation** | `correlation.html` | Pairwise correlation matrix across tickers |
| **Insider** | `insider.html` | Insider buy/sell activity |
| **News** | `news.html` | Aggregated news feed by ticker |
| **Leaderboard** | `leaderboard.html` | Daily winners/losers, momentum ranking |

The sidebar layout, theme tokens (dark/light), and i18n strings are defined in `dashboard_enhancements.css`, `dashboard_enhancements.js`, and `i18n.js` respectively.

---

## Data flow

```
Browser ─┐
         │  GET /api/quote/:symbol
         │  GET /api/quotes?symbols=...
         ▼
   server.js  ──►  Yahoo Finance v8 chart API
         │
         └──►  in-memory cache (60s TTL)
```

- **Canonical ticker list** is derived from `public/sw_data.json` at server start (the `tickers` map).
- **Editorial fields** (`thesis`, `tags`, `layer`, `marketCap`, `pe`, `eps`, `priceHistory`) are authored manually and never overwritten.
- **Live fields** (`price`, `previousClose`, `change`, `changePct`, `dayHigh`, `dayLow`, `yearHigh`, `yearLow`, `volume`) are refreshed from Yahoo.
- **Symbol aliases** are handled in `server.js` — e.g. `SQ` was renamed to `XYZ` (Block) so we fetch under `XYZ` and expose as `SQ`.
- **Skipped tickers** (e.g. `CYBR`, acquired by PANW) fall through to hardcoded values.

### Refreshing prices manually

```bash
npm run update-prices
```

This runs `scripts/update_prices.js`, which rewrites the live fields in `public/index.html` and `public/sw_data.json` in place. Editorial content stays untouched. Use `--dry-run` to preview:

```bash
node scripts/update_prices.js --dry-run
```

---

## Adding a new ticker

1. Edit `public/sw_data.json` — add the ticker to the appropriate layer with editorial fields filled in (`thesis`, `tags`, `marketCap`, etc.).
2. Run `npm run update-prices` to populate the live fields.
3. Restart the server — the canonical ticker list is rebuilt from `sw_data.json` on boot.

---

## Project structure

```
software-supply-chain/
├── server.js                     # Express server + Yahoo proxy + cache
├── package.json
├── news_data.json                # cached news feed
├── public/
│   ├── index.html                # main value-chain view
│   ├── sentiment.html
│   ├── technicals.html
│   ├── options.html
│   ├── stress-test.html
│   ├── correlation.html
│   ├── insider.html
│   ├── news.html
│   ├── leaderboard.html
│   ├── sw_data.json              # canonical ticker + editorial data
│   ├── dashboard_enhancements.css
│   ├── dashboard_enhancements.js
│   ├── bootstrap-quotes.js       # client-side quote bootstrapping
│   ├── i18n.js                   # localization strings
│   ├── shared_template.md
│   └── build_pages.py            # page-generation helper
└── scripts/
    └── update_prices.js          # Yahoo → sw_data.json + index.html
```

---

## Configuration

| Env var | Default | Purpose |
|---|---|---|
| `PORT` | `3000` | HTTP port |

There are no required secrets — Yahoo's `v8/finance/chart` endpoint is unauthenticated. The `User-Agent` header in `server.js` is required to avoid 403s.

---

## Known limitations

- **Yahoo dependency** — the v8 chart endpoint is unofficial and can rate-limit or change without notice. A migration path to LSEG/Refinitiv or Polygon is on the roadmap.
- **Cache is in-memory** — restarting the server flushes all quotes; cold starts incur ~1s of fetch latency.
- **No tests, no CI** — both are tracked items.
- **Heavy code duplication** with the sibling repos (`ai-supply-chain`, `semi-equipment`) — extracting `dashboard_enhancements.js`/`.css` into a shared package is on the roadmap.

---

## Sibling dashboards

- [`ai-supply-chain`](https://github.com/doggychip/ai-supply-chain) — AI infrastructure value chain
- [`semi-equipment`](https://github.com/doggychip/semi-equipment) — Semiconductor equipment value chain

---

## License

MIT — see `package.json`.

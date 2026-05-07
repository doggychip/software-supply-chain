#!/usr/bin/env node
/*
 * Refresh ticker prices in public/index.html from Yahoo Finance.
 *
 * Auto-detects schema:
 *
 *   "ai" schema  — const TICKER_DATA = { 'NVDA': { price, chg, chgPct, mcap, pe, hi52, lo52, ... } }
 *     Updates per ticker: price, chg, chgPct, hi52, lo52
 *     Scaled by price ratio: mcap (preserving "$X.XT" / "$XXX.XB" format), pe
 *     Untouched: name, layers, thesis, tags
 *
 *   "software" schema — var SW_DATA = {"layers":..., "tickers":{...}, "conviction":[...], "macro":{...}};
 *     Updates per ticker: price, previousClose, change, changePct, dayHigh, dayLow,
 *                         yearHigh, yearLow, volume, avgVolume, volRatio, priceHistory
 *     Scaled by price ratio: marketCap
 *     Recomputed: pe = price / eps  (when eps is a number)
 *     Regenerated: SW_DATA.conviction (top 15 by score)
 *     Untouched: eps, divYield, name, layer, layerColor, thesis, layers, macro
 *
 * Yahoo's chart endpoint is hit once per ticker at range=6mo, interval=1d.
 *
 * Usage: node scripts/update_prices.js [--dry-run]
 */

const fs = require('fs');
const path = require('path');

const INDEX_PATH = path.join(__dirname, '..', 'public', 'index.html');
const DRY_RUN = process.argv.includes('--dry-run');
const DELAY_MS = 150;
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function round(n, dp) {
  const m = Math.pow(10, dp);
  return Math.round(n * m) / m;
}

async function fetchQuote(ticker) {
  const url =
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}` +
    `?range=6mo&interval=1d`;
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  const result = data?.chart?.result?.[0];
  if (!result) throw new Error('no chart result');
  const meta = result.meta;
  if (!meta || typeof meta.regularMarketPrice !== 'number') {
    throw new Error('no meta.regularMarketPrice');
  }
  const prev =
    typeof meta.previousClose === 'number'
      ? meta.previousClose
      : meta.chartPreviousClose;
  if (typeof prev !== 'number' || prev === 0) {
    throw new Error('no previousClose');
  }

  const quote = result.indicators?.quote?.[0] || {};
  const closes = (quote.close || []).map((v) => (typeof v === 'number' ? v : null));
  const volumes = (quote.volume || []).map((v) => (typeof v === 'number' ? v : null));

  return {
    price: meta.regularMarketPrice,
    prev,
    hi52: meta.fiftyTwoWeekHigh,
    lo52: meta.fiftyTwoWeekLow,
    dayHigh: meta.regularMarketDayHigh,
    dayLow: meta.regularMarketDayLow,
    volume: meta.regularMarketVolume,
    closes,
    volumes,
  };
}

/* ── AI schema (TICKER_DATA) ─────────────────────────────────── */

const TICKER_BLOCK_START = /^const TICKER_DATA = \{\s*$/m;
const TICKER_LINE = /^(\s*)'([^']+)':\s*\{\s*(.*)\}\s*,?\s*$/;

function parseMcapStr(s) {
  if (typeof s !== 'string') return null;
  const m = s.match(/([\d.]+)\s*([TBM])/i);
  if (!m) return null;
  const val = parseFloat(m[1]);
  if (isNaN(val)) return null;
  const unit = m[2].toUpperCase();
  return val * (unit === 'T' ? 1e12 : unit === 'B' ? 1e9 : 1e6);
}

function formatMcap(value, oldStr) {
  const prefix = oldStr.startsWith('~') ? '~$' : '$';
  const digitsMatch = oldStr.match(/(\d+(?:\.\d+)?)\s*[TBM]/i);
  const origDp = digitsMatch ? digitsMatch[1].split('.')[1]?.length ?? 0 : 1;
  if (value >= 1e12) {
    return `${prefix}${(value / 1e12).toFixed(Math.max(2, origDp))}T`;
  }
  if (value >= 1e9) {
    return `${prefix}${(value / 1e9).toFixed(Math.max(1, origDp))}B`;
  }
  return `${prefix}${(value / 1e6).toFixed(0)}M`;
}

function rewriteAiLine(line, q) {
  const oldPriceM = line.match(/price:\s*(-?\d+(?:\.\d+)?)/);
  const oldPrice = oldPriceM ? parseFloat(oldPriceM[1]) : null;
  const fmt = (n) => n.toFixed(2);
  let out = line;

  // Scale mcap and pe BEFORE updating price (uses oldPrice)
  if (oldPrice && oldPrice > 0 && q.price > 0) {
    const ratio = q.price / oldPrice;

    const mcapM = out.match(/mcap:'([^']*)'/);
    if (mcapM) {
      const oldMcap = parseMcapStr(mcapM[1]);
      if (oldMcap != null && oldMcap > 0) {
        const newStr = formatMcap(oldMcap * ratio, mcapM[1]);
        out = out.replace(/mcap:'[^']*'/, `mcap:'${newStr}'`);
      }
    }

    const peM = out.match(/pe:'([^']*)'/);
    if (peM && /^-?\d+(?:\.\d+)?$/.test(peM[1])) {
      const oldPe = parseFloat(peM[1]);
      if (!isNaN(oldPe) && Math.abs(oldPe) > 0) {
        const dp = peM[1].includes('.') ? peM[1].split('.')[1].length : 1;
        const newStr = (oldPe * ratio).toFixed(Math.max(1, Math.min(2, dp)));
        out = out.replace(/pe:'[^']*'/, `pe:'${newStr}'`);
      }
    }
  }

  const chg = q.price - q.prev;
  const chgPct = (chg / q.prev) * 100;
  out = out.replace(/(price:\s*)-?\d+(?:\.\d+)?/, `$1${fmt(q.price)}`);
  out = out.replace(/(chg:\s*)-?\d+(?:\.\d+)?/, `$1${fmt(chg)}`);
  out = out.replace(/(chgPct:\s*)-?\d+(?:\.\d+)?/, `$1${fmt(chgPct)}`);
  if (typeof q.hi52 === 'number') {
    out = out.replace(/(hi52:\s*)'[^']*'/, `$1'$${fmt(q.hi52)}'`);
  }
  if (typeof q.lo52 === 'number') {
    out = out.replace(/(lo52:\s*)'[^']*'/, `$1'$${fmt(q.lo52)}'`);
  }
  return out;
}

function aiCurrentPrice(line) {
  const m = line.match(/price:\s*(-?\d+(?:\.\d+)?)/);
  return m ? parseFloat(m[1]) : null;
}

async function runAiSchema(src) {
  const lines = src.split('\n');
  let blockStart = -1;
  for (let i = 0; i < lines.length; i++) {
    if (TICKER_BLOCK_START.test(lines[i])) {
      blockStart = i + 1;
      break;
    }
  }
  if (blockStart === -1) return null;

  const updates = [];
  for (let i = blockStart; i < lines.length; i++) {
    if (/^\};/.test(lines[i])) break;
    const m = lines[i].match(TICKER_LINE);
    if (!m) continue;
    const price = aiCurrentPrice(lines[i]);
    if (price === 0 || price === null) continue;
    updates.push({ i, ticker: m[2] });
  }

  console.log(`[ai schema] Updating ${updates.length} tickers from Yahoo Finance...`);
  let ok = 0;
  let fail = 0;
  for (const { i, ticker } of updates) {
    try {
      const q = await fetchQuote(ticker);
      lines[i] = rewriteAiLine(lines[i], q);
      console.log(
        `  ✓ ${ticker.padEnd(12)} $${q.price.toFixed(2)} ` +
          `(prev $${q.prev.toFixed(2)}, 52w $${q.lo52?.toFixed(2) ?? '?'}–$${q.hi52?.toFixed(2) ?? '?'})`
      );
      ok++;
    } catch (err) {
      console.warn(`  ✗ ${ticker.padEnd(12)} ${err.message}`);
      fail++;
    }
    await sleep(DELAY_MS);
  }
  console.log(`\n${ok} updated, ${fail} failed.`);
  if (ok === 0) return null;
  return lines.join('\n');
}

/* ── Software schema (SW_DATA JSON blob) ────────────────────── */

const SW_DATA_LINE = /^var SW_DATA = (\{.*\});\s*$/;

const CONVICTION_RULES = {
  reasonablePeMax: 50,
  largeCapMin: 50e9,
  highVolRatio: 1.2,
  strongMomentumPct: 3.0,
  topN: 15,
};

function rebuildConviction(data) {
  const r = CONVICTION_RULES;
  const candidates = [];
  for (const [ticker, t] of Object.entries(data.tickers)) {
    if (typeof t.pe !== 'number' || t.pe <= 0 || t.pe >= r.reasonablePeMax) continue;
    const reasons = ['Reasonable P/E'];
    if (typeof t.marketCap === 'number' && t.marketCap >= r.largeCapMin) reasons.push('Large cap');
    if (typeof t.eps === 'number' && t.eps > 0) reasons.push('Profitable');
    if (typeof t.volRatio === 'number' && t.volRatio >= r.highVolRatio) reasons.push('High relative volume');
    if (typeof t.changePct === 'number' && t.changePct >= r.strongMomentumPct) reasons.push('Strong momentum');

    candidates.push({
      ticker,
      name: t.name,
      layer: t.layer,
      score: reasons.length + 1,
      reasons,
      price: t.price,
      pe: t.pe,
      marketCap: t.marketCap,
      changePct: t.changePct,
    });
  }
  candidates.sort((a, b) => b.score - a.score); // stable; preserves insertion order on ties
  return candidates.slice(0, r.topN);
}

async function runSoftwareSchema(src) {
  const lines = src.split('\n');
  let lineIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('var SW_DATA = {')) {
      lineIdx = i;
      break;
    }
  }
  if (lineIdx === -1) return null;

  const m = lines[lineIdx].match(SW_DATA_LINE);
  if (!m) {
    console.error('Found SW_DATA line but could not extract JSON literal');
    return null;
  }

  let data;
  try {
    data = JSON.parse(m[1]);
  } catch (err) {
    console.error('Failed to parse SW_DATA JSON:', err.message);
    return null;
  }
  if (!data.tickers) {
    console.error('SW_DATA has no .tickers field');
    return null;
  }

  const tickers = Object.keys(data.tickers);
  console.log(`[software schema] Updating ${tickers.length} tickers from Yahoo Finance...`);

  let ok = 0;
  let fail = 0;
  for (const tk of tickers) {
    try {
      const q = await fetchQuote(tk);
      const t = data.tickers[tk];
      const oldPrice = t.price;

      // Snapshot fields
      t.price = round(q.price, 4);
      t.previousClose = round(q.prev, 4);
      t.change = round(q.price - q.prev, 2);
      t.changePct = round(((q.price - q.prev) / q.prev) * 100, 5);
      if (typeof q.hi52 === 'number') t.yearHigh = round(q.hi52, 4);
      if (typeof q.lo52 === 'number') t.yearLow = round(q.lo52, 4);
      if (typeof q.dayHigh === 'number') t.dayHigh = round(q.dayHigh, 4);
      if (typeof q.dayLow === 'number') t.dayLow = round(q.dayLow, 4);
      if (typeof q.volume === 'number') t.volume = q.volume;

      // Volume metrics from 6mo daily data
      const validVols = q.volumes.filter((v) => v != null && v > 0);
      if (validVols.length >= 10) {
        const avgVol = Math.round(validVols.reduce((a, b) => a + b, 0) / validVols.length);
        t.avgVolume = avgVol;
        if (avgVol > 0 && typeof q.volume === 'number') {
          t.volRatio = round(q.volume / avgVol, 2);
        }
      }

      // Refresh priceHistory with last ~6mo of daily closes (filter nulls)
      const validCloses = q.closes.filter((c) => c != null);
      if (validCloses.length >= 30) {
        t.priceHistory = validCloses.map((c) => round(c, 2));
      }

      // Scale marketCap by price ratio (assumes shares outstanding constant)
      if (typeof t.marketCap === 'number' && oldPrice > 0) {
        t.marketCap = Math.round(t.marketCap * (q.price / oldPrice));
      }

      // Recompute pe from new price and existing eps
      if (typeof t.eps === 'number' && t.eps !== 0) {
        t.pe = round(q.price / t.eps, 2);
      }

      console.log(
        `  ✓ ${tk.padEnd(8)} $${q.price.toFixed(2)} ` +
          `(${t.changePct >= 0 ? '+' : ''}${t.changePct.toFixed(2)}%, ` +
          `volR ${t.volRatio?.toFixed(2) ?? '—'}, hist ${t.priceHistory?.length ?? '—'})`
      );
      ok++;
    } catch (err) {
      console.warn(`  ✗ ${tk.padEnd(8)} ${err.message}`);
      fail++;
    }
    await sleep(DELAY_MS);
  }

  console.log(`\n${ok} updated, ${fail} failed.`);
  if (ok === 0) return null;

  if (Array.isArray(data.conviction)) {
    data.conviction = rebuildConviction(data);
    console.log(`Regenerated conviction list (${data.conviction.length} entries).`);
  }
  // data.macro is hand-curated industry research (cloud spend, SaaS market size,
  // rule-of-40 benchmarks) — not derivable from quote data. Left untouched.

  lines[lineIdx] = `var SW_DATA = ${JSON.stringify(data)};`;
  return lines.join('\n');
}

/* ── Entry ──────────────────────────────────────────────────── */

async function main() {
  const src = fs.readFileSync(INDEX_PATH, 'utf8');

  let updated = null;
  if (/^const TICKER_DATA = \{/m.test(src)) {
    updated = await runAiSchema(src);
  } else if (/^var SW_DATA = \{/m.test(src)) {
    updated = await runSoftwareSchema(src);
  } else {
    console.error('Unknown schema — expected `const TICKER_DATA = {` or `var SW_DATA = {`');
    process.exit(1);
  }

  if (DRY_RUN) {
    console.log('Dry run — not writing file.');
    return;
  }
  if (!updated) {
    console.error('No updates — leaving file unchanged.');
    process.exit(1);
  }
  fs.writeFileSync(INDEX_PATH, updated);
  console.log(`Wrote ${INDEX_PATH}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

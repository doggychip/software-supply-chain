#!/usr/bin/env node
/*
 * Refresh TICKER_DATA price fields in public/index.html from Yahoo Finance.
 *
 * Updates per ticker: price, chg, chgPct, hi52, lo52.
 * Leaves mcap, pe, name, layers, thesis, tags untouched — those are editorial.
 * Skips tickers with price:0 in the source (e.g. Korean .KS listings).
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

const TICKER_BLOCK_START = /^const TICKER_DATA = \{\s*$/m;
const TICKER_LINE = /^(\s*)'([^']+)':\s*\{\s*(.*)\}\s*,?\s*$/;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchQuote(ticker) {
  const url =
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}` +
    `?range=1d&interval=5m`;
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  const meta = data?.chart?.result?.[0]?.meta;
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
  return {
    price: meta.regularMarketPrice,
    prev,
    hi52: meta.fiftyTwoWeekHigh,
    lo52: meta.fiftyTwoWeekLow,
  };
}

function rewriteLine(line, q) {
  const chg = q.price - q.prev;
  const chgPct = (chg / q.prev) * 100;
  const fmt = (n) => n.toFixed(2);

  let out = line;
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

function currentPrice(line) {
  const m = line.match(/price:\s*(-?\d+(?:\.\d+)?)/);
  return m ? parseFloat(m[1]) : null;
}

async function main() {
  const src = fs.readFileSync(INDEX_PATH, 'utf8');
  const lines = src.split('\n');

  let blockStart = -1;
  for (let i = 0; i < lines.length; i++) {
    if (TICKER_BLOCK_START.test(lines[i])) {
      blockStart = i + 1;
      break;
    }
  }
  if (blockStart === -1) {
    console.error('Could not locate TICKER_DATA block in index.html');
    process.exit(1);
  }

  const updates = [];
  for (let i = blockStart; i < lines.length; i++) {
    const line = lines[i];
    if (/^\};/.test(line)) break;
    const m = line.match(TICKER_LINE);
    if (!m) continue;
    const ticker = m[2];
    const price = currentPrice(line);
    if (price === 0 || price === null) continue; // skip placeholders (e.g. .KS)
    updates.push({ i, ticker });
  }

  console.log(`Updating ${updates.length} tickers from Yahoo Finance...`);

  let ok = 0;
  let fail = 0;
  for (const { i, ticker } of updates) {
    try {
      const q = await fetchQuote(ticker);
      lines[i] = rewriteLine(lines[i], q);
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

  if (DRY_RUN) {
    console.log('Dry run — not writing file.');
    return;
  }
  if (ok === 0) {
    console.error('No updates — leaving file unchanged.');
    process.exit(1);
  }
  fs.writeFileSync(INDEX_PATH, lines.join('\n'));
  console.log(`Wrote ${INDEX_PATH}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

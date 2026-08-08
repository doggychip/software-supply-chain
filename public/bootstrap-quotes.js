/* bootstrap-quotes.js
   On page load:
     1. fetches /api/quotes (current price/change per ticker)
     2. fetches /api/history?range=1y&interval=1d (enough for SMA-200)
        so indicator math (RSI/SMA/MACD/Bollinger/etc.) runs on current
        data instead of the snapshot baked in at deploy time.
   Exposes window.__quotesReady as a Promise that resolves after both
   fetches settle and any known globals have been patched in-place.

   Patches (when present):
     - window.SW_DATA.tickers   — .price/.change/.changePct/.previousClose
     - window.SW_DATA.conviction — array with .ticker entries
     - window.QUOTES            — flat map keyed by ticker
     - window.PRICE_DATA        — replaced entirely with live bars per symbol
     - index.html `.sc` supply-chain card DOM (Price metric)

   Per-page globals must be declared `var` (not `const`) for these patches
   to reach them, since non-module `const` does not attach to window.

   Exposes source status so pages can show an unavailable state instead of
   silently presenting baked snapshots as current data. */
(function () {
  function fmtPrice(p) { return '$' + p.toFixed(2); }

  function patchTickerMap(map, quotes) {
    if (!map || typeof map !== 'object') return;
    Object.keys(map).forEach(function (sym) { map[sym].liveUnavailable = !quotes[sym]; });
    Object.keys(quotes).forEach(function (sym) {
      var t = map[sym];
      if (!t) return;
      var q = quotes[sym];
      if (typeof q.price !== 'number') return;
      t.price = q.price;
      if (typeof q.previousClose === 'number') t.previousClose = q.previousClose;
      if (typeof q.change === 'number') t.change = q.change;
      if (typeof q.changePct === 'number') t.changePct = q.changePct;
    });
  }

  function replacePriceData(priceData, historyMap) {
    if (!priceData || !historyMap) return;
    Object.keys(priceData).forEach(function (sym) {
      var bars = historyMap[sym];
      if (!Array.isArray(bars) || !bars.length) delete priceData[sym];
    });
    Object.keys(historyMap).forEach(function (sym) {
      var bars = historyMap[sym];
      if (Array.isArray(bars) && bars.length && priceData[sym]) {
        priceData[sym] = bars;
      }
    });
  }

  function patchIndexCards(quotes) {
    var cards = document.querySelectorAll('.sc');
    if (!cards.length) return;
    for (var i = 0; i < cards.length; i++) {
      var card = cards[i];
      var tEl = card.querySelector('.sc-ticker');
      if (!tEl) continue;
      var sym = tEl.textContent.trim();
      var q = quotes[sym];
      if (!q || typeof q.price !== 'number') {
        var missingMetrics = card.querySelectorAll('.sc-metric');
        for (var m = 0; m < missingMetrics.length; m++) {
          var missingLabel = missingMetrics[m].querySelector('.sc-metric-label');
          if (missingLabel && missingLabel.textContent.trim() === 'Price') {
            var missingValue = missingMetrics[m].querySelector('.sc-metric-val');
            if (missingValue) missingValue.textContent = '—';
          }
        }
        card.setAttribute('title', 'Live market data unavailable');
        continue;
      }
      var metrics = card.querySelectorAll('.sc-metric');
      for (var j = 0; j < metrics.length; j++) {
        var lbl = metrics[j].querySelector('.sc-metric-label');
        if (lbl && lbl.textContent.trim() === 'Price') {
          var val = metrics[j].querySelector('.sc-metric-val');
          if (val) val.textContent = fmtPrice(q.price);
          break;
        }
      }
    }
  }

  var quotesPromise = fetch('/api/quotes')
    .then(function (r) {
      if (!r.ok) throw new Error('quotes HTTP ' + r.status);
      return r.json().then(function (payload) { return { ok: true, payload: payload }; });
    })
    .catch(function (error) { return { ok: false, payload: { quotes: {} }, error: error.message }; });

  var historyPromise = fetch('/api/history?range=1y&interval=1d')
    .then(function (r) {
      if (!r.ok) throw new Error('history HTTP ' + r.status);
      return r.json().then(function (payload) { return { ok: true, payload: payload }; });
    })
    .catch(function (error) { return { ok: false, payload: {}, error: error.message }; });

  window.__quotesReady = Promise.all([quotesPromise, historyPromise]).then(function (parts) {
    var quotesResult = parts[0] || { ok: false, payload: { quotes: {} } };
    var historyResult = parts[1] || { ok: false, payload: {} };
    var quotes = (quotesResult.payload && quotesResult.payload.quotes) || {};
    var history = historyResult.payload || {};
    window.__historyData = history;
    window.__marketDataStatus = {
      quotesOk: quotesResult.ok && Object.keys(quotes).length > 0,
      historyOk: historyResult.ok && Object.keys(history).length > 0,
      quoteCount: Object.keys(quotes).length,
      historyCount: Object.keys(history).length,
      asOf: quotesResult.payload && quotesResult.payload.updatedAt || Date.now(),
      quotesError: quotesResult.error || null,
      historyError: historyResult.error || null
    };

    if (window.SW_DATA && window.SW_DATA.tickers) patchTickerMap(window.SW_DATA.tickers, quotes);
    if (window.SW_DATA && Array.isArray(window.SW_DATA.conviction)) {
      window.SW_DATA.conviction.forEach(function (c) {
        var q = quotes[c.ticker];
        if (!q || typeof q.price !== 'number') return;
        c.price = q.price;
        if (typeof q.changePct === 'number') c.changePct = q.changePct;
      });
    }
    if (window.QUOTES) patchTickerMap(window.QUOTES, quotes);
    if (window.PRICE_DATA) replacePriceData(window.PRICE_DATA, history);

    if (document.readyState !== 'loading') patchIndexCards(quotes);
    else document.addEventListener('DOMContentLoaded', function () { patchIndexCards(quotes); });

    if (Array.isArray(window.dashboardRenderers)) {
      window.dashboardRenderers.forEach(function (render) {
        try { render(); } catch (error) { console.warn('[bootstrap-quotes] renderer failed:', error.message); }
      });
    }

    window.dispatchEvent(new CustomEvent('quotes-bootstrap-status', { detail: window.__marketDataStatus }));

    return quotes;
  });
})();

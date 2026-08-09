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
    Object.keys(map).forEach(function (sym) {
      var t = map[sym];
      t.liveUnavailable = !quotes[sym];
      // Clear every market-derived value before applying the live payload.
      // This prevents a previous deploy's snapshot from surviving a partial
      // upstream response.
      ['price','previousClose','change','changePct','changesPct','marketCap','eps','pe','divYield',
       'yearHigh','yearLow','dayHigh','dayLow','volume','avgVolume','volRatio',
       'targetMeanPrice','targetMedianPrice','targetHighPrice','targetLowPrice',
       'recommendationKey','recommendationMean','numberOfAnalystOpinions'].forEach(function (key) {
        delete t[key];
      });
    });
    Object.keys(quotes).forEach(function (sym) {
      var t = map[sym];
      if (!t) return;
      var q = quotes[sym];
      if (typeof q.price !== 'number') return;
      t.price = q.price;
      if (typeof q.previousClose === 'number') t.previousClose = q.previousClose;
      if (typeof q.change === 'number') t.change = q.change;
      if (typeof q.changePct === 'number') {
        t.changePct = q.changePct;
        t.changesPct = q.changePct;
      }
      var x = q.extras || {};
      if (typeof x.marketCap === 'number') t.marketCap = x.marketCap;
      if (typeof x.trailingEps === 'number') t.eps = x.trailingEps;
      if (typeof x.trailingPE === 'number') t.pe = x.trailingPE;
      if (typeof x.divYield === 'number') t.divYield = x.divYield;
      if (typeof x.fiftyTwoWeekHigh === 'number') t.yearHigh = x.fiftyTwoWeekHigh;
      if (typeof x.fiftyTwoWeekLow === 'number') t.yearLow = x.fiftyTwoWeekLow;
      if (typeof x.dayHigh === 'number') t.dayHigh = x.dayHigh;
      if (typeof x.dayLow === 'number') t.dayLow = x.dayLow;
      if (typeof x.regularMarketVolume === 'number') t.volume = x.regularMarketVolume;
      if (typeof x.averageVolume === 'number') t.avgVolume = x.averageVolume;
      if (typeof t.volume === 'number' && typeof t.avgVolume === 'number' && t.avgVolume > 0) {
        t.volRatio = t.volume / t.avgVolume;
      }
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
      if (Array.isArray(bars) && bars.length) {
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
    var marketTimes = Object.keys(quotes).map(function (symbol) {
      return quotes[symbol] && typeof quotes[symbol].asOf === 'number' ? quotes[symbol].asOf * 1000 : null;
    }).filter(Number.isFinite);
    window.__marketDataStatus = {
      quotesOk: quotesResult.ok && Object.keys(quotes).length > 0,
      historyOk: historyResult.ok && Object.keys(history).length > 0,
      quoteCount: Object.keys(quotes).length,
      historyCount: Object.keys(history).length,
      asOf: marketTimes.length ? Math.max.apply(null, marketTimes) : null,
      retrievedAt: quotesResult.payload && quotesResult.payload.updatedAt || Date.now(),
      quotesError: quotesResult.error || null,
      historyError: historyResult.error || null
    };

    if (window.SW_DATA && window.SW_DATA.tickers) patchTickerMap(window.SW_DATA.tickers, quotes);
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

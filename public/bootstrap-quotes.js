/* bootstrap-quotes.js
   Fetches live quotes from /api/quotes once per page load and exposes:

     window.__quotesReady  – Promise<Record<symbol, quote>>

   Pages should gate their render on it, e.g.:

     window.__quotesReady.then(function(quotes){ renderAll(); });

   Patches any globals it finds so downstream code reads the live values:
     - window.SW_DATA.tickers / .conviction
     - window.QUOTES (flat map keyed by ticker — used by options/leaderboard/
       sentiment/stress-test/correlation/technicals)
     - window.PRICE_DATA (overwrites the last bar's close)

   Note: the per-page data objects must be declared with `var` (not `const`)
   for the global patches to apply, since non-module `const` does not attach
   to window.

   Also updates any supply-chain card DOM nodes on index.html
   (`.sc` cards with a `.sc-ticker` and a Price metric).

   Silently falls back to the hardcoded values if the fetch fails. */
(function () {
  function fmtPrice(p) { return '$' + p.toFixed(2); }

  function patchTickerMap(map, quotes) {
    if (!map || typeof map !== 'object') return;
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

  function patchPriceData(priceData, quotes) {
    if (!priceData || typeof priceData !== 'object') return;
    Object.keys(quotes).forEach(function (sym) {
      var bars = priceData[sym];
      if (!Array.isArray(bars) || bars.length < 2) return;
      var q = quotes[sym];
      if (typeof q.price === 'number') bars[bars.length - 1].c = q.price;
      if (typeof q.previousClose === 'number') bars[bars.length - 2].c = q.previousClose;
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
      if (!q || typeof q.price !== 'number') continue;
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
    .then(function (r) { return r.ok ? r.json() : { quotes: {} }; })
    .catch(function () { return { quotes: {} }; });

  window.__quotesReady = quotesPromise.then(function (payload) {
    var quotes = (payload && payload.quotes) || {};
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
    if (window.PRICE_DATA) patchPriceData(window.PRICE_DATA, quotes);
    // DOM patch is index.html-specific but harmless elsewhere.
    if (document.readyState !== 'loading') patchIndexCards(quotes);
    else document.addEventListener('DOMContentLoaded', function () { patchIndexCards(quotes); });
    return quotes;
  });
})();

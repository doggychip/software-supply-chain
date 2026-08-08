/* Trust layer for the main dashboard.
   Scores summarize available evidence; they are not return forecasts. */
(function () {
  'use strict';

  var MIN_COVERAGE = 4;

  function isFutureDate(value, now) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    var parsed = new Date(value + 'T00:00:00Z');
    if (isNaN(parsed.getTime())) return false;
    var today = now ? new Date(now) : new Date();
    today.setUTCHours(0, 0, 0, 0);
    return parsed.getTime() >= today.getTime();
  }

  function computeEvidenceScore(t) {
    if (!t || !t.fundamentals) return null;
    var f = t.fundamentals;
    var parts = [];
    var hist = Array.isArray(f.epsHistory) ? f.epsHistory.slice(-4) : [];

    if (hist.length) {
      var last = hist[hist.length - 1];
      if (last.beat === true || last.beat === false) {
        var surprise = typeof last.surprisePct === 'number' ? last.surprisePct : 0;
        var lastPoints;
        if (last.beat) lastPoints = surprise >= 10 ? 25 : surprise >= 2 ? 20 : 15;
        else lastPoints = surprise >= -2 ? 10 : surprise >= -10 ? 5 : 0;
        parts.push({ label: 'Last-Q EPS', points: lastPoints, max: 25,
          detail: (last.beat ? 'Beat ' : 'Miss ') + Math.abs(surprise).toFixed(1) + '%' });
      }

      var graded = hist.filter(function (h) { return h.beat === true || h.beat === false; });
      if (graded.length) {
        var beats = graded.filter(function (h) { return h.beat === true; }).length;
        parts.push({ label: 'Four-quarter consistency', points: Math.round((beats / graded.length) * 20), max: 20,
          detail: beats + '/' + graded.length + ' recent quarters beat' });
      }
    }

    var growth = f.forward && typeof f.forward.epsGrowthNextY === 'number'
      ? f.forward.epsGrowthNextY
      : f.analyst && typeof f.analyst.earningsGrowth === 'number' ? f.analyst.earningsGrowth : null;
    if (growth != null) {
      var growthPoints = growth >= 25 ? 25 : growth >= 15 ? 19 : growth >= 5 ? 12 : growth > 0 ? 6 : 0;
      parts.push({ label: 'Forward EPS growth', points: growthPoints, max: 25, detail: growth.toFixed(1) + '% YoY' });
    }

    var recommendation = f.analyst && typeof f.analyst.recommendationMean === 'number'
      ? f.analyst.recommendationMean : null;
    if (recommendation != null) {
      var analystPoints = recommendation <= 1.5 ? 15 : recommendation <= 2 ? 12
        : recommendation <= 2.5 ? 9 : recommendation <= 3 ? 6 : recommendation <= 3.5 ? 3 : 0;
      parts.push({ label: 'Analyst consensus', points: analystPoints, max: 15,
        detail: 'Mean ' + recommendation.toFixed(2) });
    }

    var target = f.analyst && typeof f.analyst.targetMeanPrice === 'number' ? f.analyst.targetMeanPrice : null;
    if (target != null && typeof t.price === 'number' && t.price > 0) {
      var upside = ((target - t.price) / t.price) * 100;
      var targetPoints = upside >= 25 ? 15 : upside >= 10 ? 11 : upside >= 0 ? 7 : upside >= -10 ? 3 : 0;
      parts.push({ label: 'Price-target gap', points: targetPoints, max: 15,
        detail: (upside >= 0 ? '+' : '') + upside.toFixed(1) + '%' });
    }

    if (!parts.length) return null;
    if (parts.length < MIN_COVERAGE) {
      return { score: null, label: 'Insufficient data', status: 'insufficient', breakdown: parts, dataCoverage: parts.length };
    }

    var earned = parts.reduce(function (sum, part) { return sum + part.points; }, 0);
    var possible = parts.reduce(function (sum, part) { return sum + part.max; }, 0);
    var score = Math.round((earned / possible) * 100);
    var label = score >= 70 ? 'Higher evidence' : score >= 45 ? 'Mixed evidence' : 'Lower evidence';
    return { score: score, label: label, status: 'rated', breakdown: parts, dataCoverage: parts.length };
  }

  function esc(value) {
    return String(value == null ? '' : value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function tickerMap() {
    return window.SW_DATA && window.SW_DATA.tickers ? window.SW_DATA.tickers : null;
  }

  function renderEvidenceTable() {
    var map = tickerMap();
    var wrap = document.getElementById('signalsTableWrap');
    if (!map || !wrap) return;
    var rows = Object.keys(map).filter(function (symbol) { return map[symbol] && map[symbol].fundamentals; }).map(function (symbol) {
      return { symbol: symbol, ticker: map[symbol], evidence: computeEvidenceScore(map[symbol]) };
    });
    rows.sort(function (a, b) {
      var left = a.evidence && a.evidence.score != null ? a.evidence.score : -1;
      var right = b.evidence && b.evidence.score != null ? b.evidence.score : -1;
      return right - left || a.symbol.localeCompare(b.symbol);
    });

    if (!rows.length) {
      wrap.innerHTML = '<div style="padding:24px;color:var(--muted)">No current fundamentals are available. No assessment was produced.</div>';
      return;
    }

    var html = '<div style="padding:10px 12px;margin-bottom:10px;border:1px solid var(--border);border-radius:8px;color:var(--muted);font-size:11px">' +
      '<strong style="color:var(--text)">Descriptive evidence summary — not a return forecast.</strong> ' +
      'At least 4 of 5 components are required. Coverage and stale earnings dates are shown explicitly. Weights: recent EPS 25%, four-quarter consistency 20%, forward EPS growth 25%, analyst consensus 15%, price-target gap 15%.</div>' +
      '<table class="val-table" style="width:100%;font-size:12px"><thead><tr>' +
      '<th style="text-align:left">Ticker</th><th style="text-align:left">Next earnings</th>' +
      '<th style="text-align:right">Coverage</th><th style="text-align:right">Evidence score</th>' +
      '<th style="text-align:left">Interpretation</th></tr></thead><tbody>';

    rows.forEach(function (row) {
      var f = row.ticker.fundamentals;
      var evidence = row.evidence;
      var next = isFutureDate(f.nextEarningsDate) ? f.nextEarningsDate : 'Awaiting source refresh';
      var score = evidence && evidence.score != null ? evidence.score : '—';
      var label = evidence ? evidence.label : 'Insufficient data';
      var coverage = evidence ? evidence.dataCoverage + '/5' : '0/5';
      var detail = evidence ? evidence.breakdown.map(function (part) {
        return part.label + ': ' + part.points + '/' + part.max + ' (' + part.detail + ')';
      }).join('\n') : '';
      html += '<tr><td style="text-align:left;font-weight:700">' + esc(row.symbol) + '</td>' +
        '<td style="text-align:left">' + esc(next) + '</td><td style="text-align:right">' + coverage + '</td>' +
        '<td title="' + esc(detail) + '" style="text-align:right;font-weight:700">' + score + '</td>' +
        '<td style="text-align:left">' + esc(label) + '</td></tr>';
    });
    wrap.innerHTML = html + '</tbody></table>';

    var title = document.querySelector('#s-signals .section-title');
    var desc = document.querySelector('#s-signals .section-desc');
    if (title) title.textContent = 'Earnings Evidence Summary';
    if (desc) desc.textContent = 'Current fundamentals summarized with explicit coverage and freshness checks. Descriptive only; not financial advice and not historically validated.';
  }

  function removeConvictionRanking() {
    var section = document.getElementById('s-conviction');
    if (!section) return;
    section.innerHTML = '<div class="section-header"><div><div class="section-title">Rule-based Screen Removed</div>' +
      '<div class="section-desc">The former conviction ranking mixed P/E, company size, volume and one-day price movement without predictive validation.</div></div></div>' +
      '<div style="padding:18px;border:1px solid var(--border);border-radius:10px;background:var(--surface)">' +
      '<strong>No investment ranking is produced.</strong><div style="margin-top:6px;color:var(--muted);font-size:12px">Use the valuation table and earnings evidence summary as separate descriptive views. They are intentionally not collapsed into a recommendation.</div></div>';
  }

  function install() {
    removeConvictionRanking();
    window.addEventListener('fundamentals-loaded', function () {
      var map = tickerMap();
      if (map) {
        var out = {};
        Object.keys(map).forEach(function (symbol) {
          var result = computeEvidenceScore(map[symbol]);
          if (result) out[symbol] = result;
        });
        window.tickerSignals = out;
      }
      renderEvidenceTable();
    });
    window.addEventListener('live-prices-updated', renderEvidenceTable);
  }

  window.computeEvidenceScore = computeEvidenceScore;
  window.isFutureDate = isFutureDate;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install);
  else install();
})();

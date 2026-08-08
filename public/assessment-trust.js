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

  // Delegates to dashboard-core's unified evidence scorer (client/signals.js,
  // which the page loads first). One scorer, one spec, one test suite — the
  // divergent local copy that previously lived here was removed in v1.0.12.
  function computeEvidenceScore(t, historyFresh) {
    if (typeof window.computeSignal !== 'function') return null;
    return window.computeSignal(t, historyFresh);
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
  }

  window.computeEvidenceScore = computeEvidenceScore;
  window.isFutureDate = isFutureDate;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install);
  else install();
})();

/* Normalize live fundamentals into a descriptive record.
   Deliberately produces no score, rank, recommendation, or return forecast. */
(function () {
  'use strict';

  function isFutureDate(value, now) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    var parsed = new Date(value + 'T00:00:00Z');
    if (isNaN(parsed.getTime())) return false;
    var today = now ? new Date(now) : new Date();
    today.setUTCHours(0, 0, 0, 0);
    return parsed.getTime() >= today.getTime();
  }

  function finite(value) { return typeof value === 'number' && Number.isFinite(value); }

  function summarizeEvidence(ticker) {
    var f = ticker && ticker.fundamentals;
    if (!f) return null;
    var history = Array.isArray(f.epsHistory) ? f.epsHistory.slice(-4) : [];
    var latest = history.length ? history[history.length - 1] : null;
    var graded = history.filter(function (row) {
      return finite(row.epsActual) && finite(row.epsEstimate);
    });
    var beats = graded.filter(function (row) { return row.epsActual > row.epsEstimate; }).length;
    var meets = graded.filter(function (row) { return row.epsActual === row.epsEstimate; }).length;
    var misses = graded.filter(function (row) { return row.epsActual < row.epsEstimate; }).length;
    var analyst = f.analyst || {};
    var targetGap = finite(analyst.targetMeanPrice) && finite(ticker.price) && ticker.price > 0
      ? ((analyst.targetMeanPrice / ticker.price) - 1) * 100 : null;

    return {
      latestQuarter: latest && latest.quarter || null,
      epsActual: latest && finite(latest.epsActual) ? latest.epsActual : null,
      epsEstimate: latest && finite(latest.epsEstimate) ? latest.epsEstimate : null,
      surprisePct: latest && finite(latest.surprisePct) ? latest.surprisePct : null,
      quarterCount: graded.length,
      beats: beats,
      meets: meets,
      misses: misses,
      forwardEpsGrowth: f.forward && finite(f.forward.epsGrowthNextY) ? f.forward.epsGrowthNextY : null,
      recommendationMean: finite(analyst.recommendationMean) ? analyst.recommendationMean : null,
      analystCount: finite(analyst.numberOfAnalystOpinions) ? analyst.numberOfAnalystOpinions : null,
      targetMeanPrice: finite(analyst.targetMeanPrice) ? analyst.targetMeanPrice : null,
      targetGapPct: targetGap,
      nextEarningsDate: isFutureDate(f.nextEarningsDate) ? f.nextEarningsDate : null,
      earningsDateEstimated: f.isEarningsDateEstimate === true,
    };
  }

  // Legacy name retained for callers, but no score is produced.
  window.computeEvidenceScore = function (ticker) {
    var summary = summarizeEvidence(ticker);
    return summary ? Object.assign({ score: null, label: 'Descriptive data only' }, summary) : null;
  };
  window.summarizeEvidence = summarizeEvidence;
  window.isFutureDate = isFutureDate;
})();

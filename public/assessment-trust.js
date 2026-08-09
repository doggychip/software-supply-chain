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

  function quarterEnd(value) {
    if (typeof value !== 'string') return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    var match = value.match(/^([1-4])Q(\d{4})$/);
    if (!match) return null;
    return match[2] + ['-03-31', '-06-30', '-09-30', '-12-31'][Number(match[1]) - 1];
  }

  function compareReported(primary, secondary, secondaryEnd) {
    if (!primary || !finite(primary.value)) return { status: 'issuer_unavailable' };
    if (!finite(secondary)) return { status: 'yahoo_unavailable' };
    if (primary.periodType !== 'quarterly') {
      return { status: 'period_type_mismatch', primaryPeriodType: primary.periodType || null };
    }
    if (!secondaryEnd || primary.end !== secondaryEnd) {
      return { status: 'period_mismatch', primaryEnd: primary.end, secondaryEnd: secondaryEnd || null };
    }
    var difference = secondary - primary.value;
    var differencePct = Math.abs(primary.value) > 0 ? difference / Math.abs(primary.value) * 100 : null;
    return {
      status: differencePct != null && Math.abs(differencePct) <= 0.5 ? 'aligned' : 'differs',
      primaryValue: primary.value,
      secondaryValue: secondary,
      periodEnd: primary.end,
      difference: difference,
      differencePct: differencePct,
    };
  }

  function reconcileIssuerWithYahoo(issuer, fundamentals) {
    var facts = issuer && issuer.facts || {};
    var epsHistory = fundamentals && Array.isArray(fundamentals.epsHistory) ? fundamentals.epsHistory : [];
    var revenueHistory = fundamentals && Array.isArray(fundamentals.revenueHistory) ? fundamentals.revenueHistory : [];
    var eps = epsHistory.length ? epsHistory[epsHistory.length - 1] : null;
    var reported = revenueHistory.length ? revenueHistory[revenueHistory.length - 1] : null;
    return {
      revenue: compareReported(facts.revenue, reported && reported.revenue, quarterEnd(reported && reported.date)),
      netIncome: compareReported(facts.netIncome, reported && reported.earnings, quarterEnd(reported && reported.date)),
      dilutedEps: compareReported(facts.dilutedEps, eps && eps.epsActual, quarterEnd(eps && eps.quarter)),
    };
  }

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
  window.quarterEnd = quarterEnd;
  window.compareReported = compareReported;
  window.reconcileIssuerWithYahoo = reconcileIssuerWithYahoo;
})();

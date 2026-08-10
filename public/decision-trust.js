(function (global) {
  'use strict';

  function finite(value) {
    return typeof value === 'number' && Number.isFinite(value);
  }

  function freshEpoch(seconds, now) {
    var timestamp = seconds * 1000;
    return finite(seconds) && seconds > 0 && timestamp <= now + 300_000 && now - timestamp <= 7 * 86_400_000;
  }

  function maxDrawdown(bars) {
    if (!Array.isArray(bars) || bars.length < 2) return null;
    var peak = null, worst = 0;
    bars.forEach(function (bar) {
      var close = bar && bar.c;
      if (!finite(close) || close <= 0) return;
      if (peak == null || close > peak) peak = close;
      var drawdown = peak > 0 ? ((peak - close) / peak) * 100 : 0;
      if (drawdown > worst) worst = drawdown;
    });
    return peak == null ? null : worst;
  }

  function latestBarFresh(bars, now) {
    if (!Array.isArray(bars) || !bars.length) return false;
    var date = Date.parse(String(bars[bars.length - 1].d || '') + 'T00:00:00Z');
    return Number.isFinite(date) && date <= now + 86_400_000 && now - date <= 7 * 86_400_000;
  }

  function computeMetrics(record, quote, bars, now) {
    now = finite(now) ? now : Date.now();
    var derived = record && record.decisionEvidence && record.decisionEvidence.derived || {};
    var marketCap = quote && quote.extras && quote.extras.marketCap;
    var quoteFresh = quote && freshEpoch(quote.asOf, now);
    var historyFresh = latestBarFresh(bars, now);
    var comparableCurrency = Boolean(quoteFresh && derived.annualUnit && quote.currency && derived.annualUnit === quote.currency);
    var priceSales = comparableCurrency && finite(marketCap) && marketCap > 0 && finite(derived.annualRevenue) && derived.annualRevenue > 0
      ? marketCap / derived.annualRevenue
      : null;
    var freeCashFlowYieldPct = comparableCurrency && finite(marketCap) && marketCap > 0 && finite(derived.freeCashFlow)
      ? (derived.freeCashFlow / marketCap) * 100
      : null;
    return {
      revenueGrowthPct: finite(derived.revenueGrowthPct) ? derived.revenueGrowthPct : null,
      revenueGrowthBasis: derived.revenueGrowthBasis || null,
      operatingMarginPct: finite(derived.operatingMarginPct) ? derived.operatingMarginPct : null,
      freeCashFlowMarginPct: finite(derived.freeCashFlowMarginPct) ? derived.freeCashFlowMarginPct : null,
      stockCompensationPct: finite(derived.stockCompensationPct) ? derived.stockCompensationPct : null,
      shareDilutionPct: finite(derived.shareDilutionPct) ? derived.shareDilutionPct : null,
      priceSales: finite(priceSales) ? priceSales : null,
      freeCashFlowYieldPct: finite(freeCashFlowYieldPct) ? freeCashFlowYieldPct : null,
      oneYearMaxDrawdownPct: historyFresh ? maxDrawdown(bars) : null,
      quoteFresh: Boolean(quoteFresh),
      historyFresh: Boolean(historyFresh),
      comparableCurrency: comparableCurrency,
      annualUnit: derived.annualUnit || null,
      quoteCurrency: quote && quote.currency || null,
      annualPeriodEnd: derived.annualPeriodEnd || null,
      quoteAsOf: quoteFresh ? quote.asOf : null,
    };
  }

  function criteriaComplete(criteria) {
    return criteria && [
      criteria.minRevenueGrowthPct,
      criteria.minFreeCashFlowMarginPct,
      criteria.maxPriceSales,
      criteria.minFreeCashFlowYieldPct,
      criteria.proposedWeightPct,
      criteria.maxWeightPct,
      criteria.maxPortfolioLossPct,
    ].every(finite);
  }

  function evaluateCandidate(metrics, criteria) {
    if (!criteriaComplete(criteria)) return { key: 'set_criteria', label: 'Set criteria', gates: [] };
    var required = [
      metrics && metrics.revenueGrowthPct,
      metrics && metrics.freeCashFlowMarginPct,
      metrics && metrics.priceSales,
      metrics && metrics.freeCashFlowYieldPct,
      metrics && metrics.oneYearMaxDrawdownPct,
    ];
    if (!metrics || !metrics.quoteFresh || !metrics.historyFresh || !metrics.comparableCurrency || !required.every(finite)) {
      return { key: 'insufficient_evidence', label: 'Insufficient evidence', gates: [] };
    }

    var observedLossPct = criteria.proposedWeightPct * metrics.oneYearMaxDrawdownPct / 100;
    var gates = [
      { name: 'Revenue growth', pass: metrics.revenueGrowthPct >= criteria.minRevenueGrowthPct },
      { name: 'FCF margin', pass: metrics.freeCashFlowMarginPct >= criteria.minFreeCashFlowMarginPct },
      { name: 'Price / sales', pass: metrics.priceSales <= criteria.maxPriceSales },
      { name: 'FCF yield', pass: metrics.freeCashFlowYieldPct >= criteria.minFreeCashFlowYieldPct },
      { name: 'Position size', pass: criteria.proposedWeightPct <= criteria.maxWeightPct },
      { name: 'Observed-drawdown loss', pass: observedLossPct <= criteria.maxPortfolioLossPct },
    ];
    var riskFailed = gates.slice(-2).some(function (gate) { return !gate.pass; });
    if (riskFailed) return { key: 'risk_gate_failed', label: 'Fails risk gate', gates: gates, observedLossPct: observedLossPct };
    if (gates.slice(0, 4).some(function (gate) { return !gate.pass; })) {
      return { key: 'watch', label: 'Watch', gates: gates, observedLossPct: observedLossPct };
    }
    return { key: 'research_now', label: 'Research now', gates: gates, observedLossPct: observedLossPct };
  }

  global.DecisionTrust = {
    computeMetrics: computeMetrics,
    criteriaComplete: criteriaComplete,
    evaluateCandidate: evaluateCandidate,
    maxDrawdown: maxDrawdown,
  };
})(window);

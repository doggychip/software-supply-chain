(function(root){
  'use strict';
  const finite=v=>typeof v==='number'&&Number.isFinite(v);
  const defaults={bearSales:6,baseSales:8,bullSales:10,bearYield:4,baseYield:3,bullYield:2,marginOfSafety:20};
  function validate(a){
    return a&&['bearSales','baseSales','bullSales'].every(k=>finite(a[k])&&a[k]>0&&a[k]<=50)&&
      ['bearYield','baseYield','bullYield'].every(k=>finite(a[k])&&a[k]>=.1&&a[k]<=100)&&
      finite(a.marginOfSafety)&&a.marginOfSafety>=0&&a.marginOfSafety<=60&&
      a.bearSales<=a.baseSales&&a.baseSales<=a.bullSales&&a.bearYield>=a.baseYield&&a.baseYield>=a.bullYield;
  }
  function thesisComplete(j,period){
    if(!j||j.thesisReviewed!==true||j.reviewedPeriod!==period)return false;
    try{if(new URL(j.guidanceSource).protocol!=='https:')return false}catch{return false}
    return ['thesisNote','valueChainNote','balanceSheetNote','catalystNote','invalidationNote','riskNote'].every(k=>typeof j[k]==='string'&&j[k].trim().length>0);
  }
  function evaluate(row,quote,criteria,a,journal,now=Date.now()){
    const result={key:'insufficient',label:'Insufficient evidence',reasons:[],scenarios:[],buyCeiling:null,adjustedCashFlow:null,sourceGaps:[]};
    const end=(key,label,reasons)=>Object.assign(result,{key,label,reasons});
    if(!validate(a))return end('insufficient','Set valuation assumptions',['Enter positive, ordered bear/base/bull multiples and yields; margin of safety must be 0–60%.']);
    if(!criteria||!Array.isArray(criteria.targetLayers)||!criteria.targetLayers.length||
      !['minRevenueGrowthPct','minFreeCashFlowMarginPct','maxPriceSales','minFreeCashFlowYieldPct','proposedWeightPct','maxWeightPct','maxPortfolioLossPct'].every(k=>finite(criteria[k])&&criteria[k]>=0)||
      criteria.maxPriceSales<=0||criteria.minFreeCashFlowYieldPct<=0||criteria.proposedWeightPct<=0||criteria.proposedWeightPct>100||criteria.maxWeightPct>100||criteria.maxPortfolioLossPct>100)
      return end('insufficient','Set decision criteria',['Complete the mandatory financial, layer and risk criteria with valid positive sizing/valuation limits.']);
    const record=row&&row.record,d=record?.decisionEvidence?.derived,m=row?.metrics;
    const marketCap=quote?.extras?.marketCap,price=quote?.price,time=quote?.asOf*1000;
    if(!record||!d||!m||d.financialBasis!=='TTM'||!m.financialFresh||!m.quoteFresh||!m.historyFresh||!m.comparableCurrency||
      !finite(price)||price<=0||!finite(marketCap)||marketCap<=0||!finite(time)||time>now||now-time>7*86400000||
      ![d.annualRevenue,d.freeCashFlow,d.stockCompensation,m.revenueGrowthPct,m.freeCashFlowMarginPct,m.operatingMarginPct,m.oneYearMaxDrawdownPct].every(finite)||d.annualRevenue<=0||d.stockCompensation<0||
      (d.blockingIssues||[]).length||(record.reconciliation?.blockingIssues||[]).length)
      return end('insufficient','Insufficient evidence',['Missing, stale, currency-incompatible or unresolved financial/market evidence. No recommendation is inferred.'].concat(d?.blockingIssues||[]));
    result.adjustedCashFlow=d.freeCashFlow-d.stockCompensation;
    result.period=d.annualPeriodEnd;result.currency=d.annualUnit;result.price=price;result.quoteAsOf=quote.asOf;
    const fields=record.reconciliation?.fieldSources||{};
    result.sourceGaps=['revenue','operatingIncome','operatingCashFlow','capitalExpenditure','stockCompensation'].filter(k=>fields[k]?.provider!=='SEC EDGAR'||!Array.isArray(fields[k]?.urls)||!fields[k].urls.some(u=>typeof u==='string'&&u.startsWith('https://www.sec.gov/')));
    result.sources=[...new Set(Object.values(fields).flatMap(f=>f.urls||[]))].filter(u=>typeof u==='string'&&u.startsWith('https://www.sec.gov/'));
    if(result.adjustedCashFlow>0){
      result.scenarios=['bear','base','bull'].map(key=>{
        const salesValue=d.annualRevenue*a[key+'Sales'],cashValue=result.adjustedCashFlow/(a[key+'Yield']/100),equityValue=Math.min(salesValue,cashValue);
        return {key,salesMultiple:a[key+'Sales'],cashYield:a[key+'Yield'],equityValue,price:price*equityValue/marketCap,binding:salesValue<=cashValue?'Sales multiple':'SBC-adjusted cash yield'};
      });
      const base=result.scenarios[1].price;
      // Existing screen valuation limits remain hard caps, not overridden by scenarios.
      const screenCeiling=price*Math.min(d.annualRevenue*criteria.maxPriceSales,d.freeCashFlow/(criteria.minFreeCashFlowYieldPct/100))/marketCap;
      result.buyCeiling=Math.min(base*(1-a.marginOfSafety/100),screenCeiling);
      if(!result.scenarios.every(s=>finite(s.price)&&s.price>0)||!finite(result.buyCeiling)||result.buyCeiling<=0){result.scenarios=[];result.buyCeiling=null;return end('insufficient','Insufficient evidence',['Valuation arithmetic is outside the supported range.'])}
    }
    if(result.sourceGaps.length)return end('insufficient','Insufficient evidence',['Issuer TTM reconciliation missing for: '+result.sourceGaps.join(', ')+'. Any displayed scenario is provisional, not a buying price.']);
    const avoid=[];
    if(!criteria.targetLayers.includes(row.meta.layer))avoid.push('Outside your selected value-chain layers: '+row.meta.layer+'.');
    if(m.revenueGrowthPct<criteria.minRevenueGrowthPct)avoid.push('Revenue growth fails your minimum.');
    if(m.freeCashFlowMarginPct<criteria.minFreeCashFlowMarginPct)avoid.push('FCF margin fails your minimum.');
    if(m.operatingMarginPct<=0)avoid.push('TTM operating income is not positive; this quality-growth model excludes operating-loss companies.');
    if(result.adjustedCashFlow<=0)avoid.push('FCF less stock-based compensation is not positive.');
    if(criteria.proposedWeightPct>criteria.maxWeightPct||criteria.proposedWeightPct*m.oneYearMaxDrawdownPct/100>criteria.maxPortfolioLossPct)avoid.push('Proposed position fails your historical-drawdown or size limit.');
    if(avoid.length)return end('avoid','Avoid for now',avoid);
    const reviewed=thesisComplete(journal,d.annualPeriodEnd);
    result.thesisReviewed=reviewed;
    if(price>result.buyCeiling)return end('wait','Wait for a better price',['Quoted price exceeds the model entry ceiling after your margin of safety.',...(reviewed?[]:['A current issuer-linked thesis, value-chain advantage and balance-sheet review are also required before a Buy candidate label.'])]);
    if(!reviewed)return end('review','Review thesis first',['Price passes the model ceiling, but the latest-period issuer-linked thesis, value-chain advantage, debt/liquidity, catalyst, risks and invalidation review is incomplete.']);
    return end('buy','Buy candidate',['Fits your selected '+row.meta.layer+' layer and passes the financial and risk gates.','Price is at or below the scenario ceiling after the margin of safety.','Latest-period thesis review is user-attested, not independently verified. Confirm current news and portfolio concentration before acting.']);
  }
  const api={defaults,validate,thesisComplete,evaluate};
  if(typeof module==='object'&&module.exports)module.exports=api;else root.RecommendationModel=api;
})(typeof window==='undefined'?globalThis:window);

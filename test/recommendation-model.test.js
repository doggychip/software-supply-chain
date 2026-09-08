const test=require('node:test');
const assert=require('node:assert/strict');
const model=require('../public/recommendation-model');
const now=Date.parse('2026-09-08T12:00:00Z');
function fixture(){
  const source={provider:'SEC EDGAR',urls:['https://www.sec.gov/Archives/test-fixture']};
  return {row:{symbol:'TEST',meta:{layer:'Testing'},metrics:{financialFresh:true,quoteFresh:true,historyFresh:true,comparableCurrency:true,revenueGrowthPct:20,freeCashFlowMarginPct:30,operatingMarginPct:10,oneYearMaxDrawdownPct:30},record:{decisionEvidence:{derived:{financialBasis:'TTM',annualPeriodEnd:'2026-06-30',annualUnit:'USD',annualRevenue:1000,freeCashFlow:300,stockCompensation:50,blockingIssues:[]}},reconciliation:{blockingIssues:[],fieldSources:Object.fromEntries(['revenue','operatingIncome','operatingCashFlow','capitalExpenditure','stockCompensation'].map(k=>[k,{...source}]))}}},quote:{price:50,currency:'USD',asOf:now/1000,extras:{marketCap:5000}},criteria:{targetLayers:['Testing'],minRevenueGrowthPct:15,minFreeCashFlowMarginPct:15,maxPriceSales:8,minFreeCashFlowYieldPct:2,proposedWeightPct:1.5,maxWeightPct:5,maxPortfolioLossPct:1},a:{...model.defaults},journal:{guidanceSource:'https://www.sec.gov/Archives/test-fixture',thesisReviewed:true,reviewedPeriod:'2026-06-30',...Object.fromEntries(['thesisNote','valueChainNote','balanceSheetNote','catalystNote','invalidationNote','riskNote'].map(k=>[k,'Synthetic test note']))}};
}
function run(f){return model.evaluate(f.row,f.quote,f.criteria,f.a,f.journal,now)}
test('FMP-normalized quotes preserve scenarios and entry ceilings for valuation consumers',()=>{
  const {normalizeQuote}=require('../fmp-data');
  const f=fixture();
  f.quote=normalizeQuote('TEST',{symbol:'TEST',price:50,timestamp:now/1000,currency:'USD',marketCap:5000},null,now);
  const r=run(f);
  assert.equal(r.key,'buy');assert.deepEqual(r.scenarios.map(s=>s.price),[60,80,100]);assert.equal(r.buyCeiling,64);
});
test('FMP missing market cap stays unavailable to both public quote shapes and valuation',()=>{
  const {normalizeQuote}=require('../fmp-data');
  const f=fixture();
  for(const marketCap of [undefined,0,-1,'5000',NaN]){
    f.quote=normalizeQuote('TEST',{symbol:'TEST',price:50,timestamp:now/1000,currency:'USD',marketCap},null,now);
    assert.equal(f.quote.marketCap,null);assert.equal(f.quote.extras?.marketCap,null);
    assert.equal(run(f).key,'insufficient');assert.deepEqual(run(f).scenarios,[]);
  }
});
test('scenario prices and entry ceiling independently match equity multiple arithmetic',()=>{
  const f=fixture(),r=run(f);assert.equal(r.key,'buy');assert.equal(r.adjustedCashFlow,250);
  assert.deepEqual(r.scenarios.map(s=>s.price),[60,80,100]);assert.equal(r.buyCeiling,64);
  assert.equal(r.scenarios[1].binding,'Sales multiple');
  f.a.marginOfSafety=30;assert.equal(run(f).buyCeiling,56);
  f.criteria.maxPriceSales=4;assert.equal(run(f).buyCeiling,40);
});
test('dearer quote and proportionally higher cap do not inflate valuation; label becomes wait',()=>{
  const f=fixture();f.quote.price=100;f.quote.extras.marketCap=10000;
  const r=run(f);assert.equal(r.key,'wait');assert.equal(r.buyCeiling,64);assert.deepEqual(r.scenarios.map(s=>s.price),[60,80,100]);
});
test('all financial, strategy and risk gates are mandatory; price alone cannot produce a buy',()=>{
  for(const change of [f=>f.row.metrics.operatingMarginPct=0,f=>f.row.metrics.revenueGrowthPct=2,f=>f.criteria.targetLayers=['Other'],f=>f.row.record.decisionEvidence.derived.stockCompensation=400,f=>f.criteria.proposedWeightPct=6]){
    const f=fixture();change(f);assert.equal(run(f).key,'avoid');
  }
});
test('user-reviewed issuer-linked thesis is required and expires on a new financial period',()=>{
  const f=fixture();f.journal.thesisReviewed=false;assert.equal(run(f).key,'review');
  f.journal.thesisReviewed=true;f.journal.valueChainNote='';assert.equal(run(f).key,'review');
  f.journal.valueChainNote='Synthetic note';f.journal.reviewedPeriod='2026-03-31';assert.equal(run(f).key,'review');
  f.journal.reviewedPeriod='2026-06-30';f.journal.guidanceSource='javascript:alert(1)';assert.equal(run(f).key,'review');
});
test('unreconciled, missing, stale, future and currency-incompatible evidence cannot recommend buying',()=>{
  for(const change of [f=>delete f.row.record.reconciliation.fieldSources.stockCompensation,f=>f.row.metrics.financialFresh=false,f=>f.row.metrics.comparableCurrency=false,f=>f.quote.asOf+=60,f=>f.row.record.decisionEvidence.derived.stockCompensation=null,f=>f.row.record.decisionEvidence.derived.blockingIssues.push('Synthetic mismatch'),f=>f.quote.extras.marketCap=0]){
    const f=fixture();change(f);assert.equal(run(f).key,'insufficient');
  }
  const f=fixture();delete f.row.record.reconciliation.fieldSources.stockCompensation;const r=run(f);assert.ok(r.scenarios.length);assert.match(r.reasons[0],/provisional/);
});
test('invalid and reversed scenarios fail closed without stale price outputs',()=>{
  for(const change of [f=>f.a.baseYield=0,f=>f.a.bearSales=20,f=>f.a.marginOfSafety=100,f=>f.a.bullYield=10,f=>f.a.baseSales=NaN,f=>f.criteria.maxWeightPct=101,f=>f.criteria.proposedWeightPct=0]){
    const f=fixture();change(f);const r=run(f);assert.equal(r.key,'insufficient');assert.equal(r.buyCeiling,null);assert.deepEqual(r.scenarios,[]);
  }
});

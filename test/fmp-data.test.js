const test = require('node:test');
const assert = require('node:assert/strict');
const { normalize, issuerTtm, loadFinancialData, request, resetCaches } = require('../fmp-data');
const now = Date.parse('2026-09-08T12:00:00Z');
const dates = ['2026-07-31','2026-04-30','2026-01-31','2025-10-31','2025-07-31'];
const periods = ['Q2','Q1','Q4','Q3','Q2'];
const income = dates.map((date,i)=>({symbol:'TEST',date,period:periods[i],fiscalYear:i<2?'2027':'2026',filingDate:date,reportedCurrency:'USD',revenue:i===4?80:100,netIncome:5,epsDiluted:.5,operatingIncome:20}));
const cash = income.map(r=>({...r,operatingCashFlow:30,capitalExpenditure:-5,freeCashFlow:25,stockBasedCompensation:2}));
const secRow = (start,end,value)=>({start,end,value,unit:'USD',filed:end,days:Math.round((Date.parse(end)-Date.parse(start))/86400000)+1,sourceUrl:'https://www.sec.gov/example'});

test('TTM uses four distinct matching quarters and latest comparable growth',()=>{
  const r=normalize('TEST',income,cash,null,now),d=r.decisionEvidence.derived;
  assert.equal(d.annualRevenue,400);assert.equal(d.freeCashFlow,100);assert.equal(d.revenueGrowthPct,25);
  assert.equal(d.financialBasis,'TTM');assert.equal(d.shareDilutionPct,null);assert.equal(d.blockingIssues.length,0);
});
test('missing periods, stale data and inconsistent capex fail closed',()=>{
  assert.ok(normalize('TEST',income,cash.slice(1),null,now).decisionEvidence.derived.blockingIssues.length);
  assert.ok(normalize('TEST',income,cash,null,now+200*86400000).decisionEvidence.derived.blockingIssues.length);
  const broken=cash.map((r,i)=>i===0?{...r,capitalExpenditure:5}:r);
  assert.match(normalize('TEST',income,broken,null,now).decisionEvidence.derived.blockingIssues.join(' '),/capital expenditure/);
  assert.throws(()=>normalize('TEST',income.map(r=>({...r,symbol:'WRONG'})),cash,null,now),/No valid/);
});
test('issuer bridge corrects normalized values without hardcoded company amounts',()=>{
  const rows=[secRow('2025-02-01','2026-01-31',100),secRow('2026-02-01','2026-07-31',70),secRow('2025-02-01','2025-07-31',50)];
  assert.equal(issuerTtm(rows,'2026-07-31','USD').value,120);
  assert.equal(issuerTtm(rows,'2026-07-31','EUR'),null);
  assert.equal(issuerTtm(rows.slice(0,2),'2026-07-31','USD'),null);
  const issuer={reconciliationFacts:{operatingCashFlow:rows,capitalExpenditure:rows.map(r=>({...r,value:r.value/10})),capitalizedSoftware:rows.map(r=>({...r,value:r.value/100}))}};
  const r=normalize('TEST',income,cash,issuer,now);
  assert.equal(r.decisionEvidence.derived.freeCashFlow,106.8);
  assert.equal(r.reconciliation.fieldSources.operatingCashFlow.provider,'SEC EDGAR');
});
test('currency-mismatched and future statements are not combined',()=>{
  const r=normalize('TEST',income.map((r,i)=>i===2?{...r,reportedCurrency:'EUR'}:r),cash,null,now);
  assert.equal(r.decisionEvidence.derived.annualRevenue,null);assert.ok(r.decisionEvidence.derived.blockingIssues.length);
  assert.throws(()=>normalize('TEST',income.map(r=>({...r,filingDate:'2099-01-01'})),cash,null,now),/No valid/);
});
test('issuer TTM revenue replaces earlier normalized quarters even when latest quarter agrees',()=>{
  const rows=[secRow('2025-02-01','2026-01-31',10000),secRow('2026-02-01','2026-07-31',7000),secRow('2025-02-01','2025-07-31',5000)];
  const issuer={reconciliationFacts:{revenue:rows},decisionEvidence:{reported:{revenueQuarterly:[{end:income[0].date,unit:'USD',value:income[0].revenue}]}}};
  const r=normalize('TEST',income,cash,issuer,now),d=r.decisionEvidence.derived;
  assert.equal(d.annualRevenue,12000);
  assert.ok(Math.abs(d.operatingMarginPct-100*80/12000)<1e-12);
  assert.ok(Math.abs(d.freeCashFlowMarginPct-100*100/12000)<1e-12);
  assert.equal(r.reconciliation.fieldSources.revenue.provider,'SEC EDGAR');
  assert.equal(r.reconciliation.rawFmpTtm.revenue,400);
  assert.ok(r.reconciliation.warnings.some(w=>w.startsWith('revenue:')));
  assert.deepEqual(d.blockingIssues,[]);
});
test('fiscal periods and filing dates must align, not just statement end dates',()=>{
  assert.ok(normalize('TEST',income.map((r,i)=>i===2?{...r,period:'Q3'}:r),cash,null,now).decisionEvidence.derived.blockingIssues.length);
  assert.ok(normalize('TEST',income,cash.map((r,i)=>i===2?{...r,fiscalYear:'2025'}:r),null,now).decisionEvidence.derived.blockingIssues.length);
  assert.throws(()=>normalize('TEST',income.map(r=>({...r,filingDate:'2026-02-30'})),cash,null,now),/No valid/);
});
test('missing key makes no upstream call',async()=>{
  const old=process.env.FMP_API_KEY;delete process.env.FMP_API_KEY;
  try{await assert.rejects(loadFinancialData(['TEST'],{fetchImpl:()=>{throw Error('must not call')}}),/not configured/);}finally{if(old!==undefined)process.env.FMP_API_KEY=old;}
});
test('requests hide credentials in errors and stop after authentication failure',async()=>{
  const old=process.env.FMP_API_KEY;process.env.FMP_API_KEY='fixture-secret';resetCaches();
  try{
    await assert.rejects(request('income-statement','TEST',async url=>{throw Error(url)}),e=>!e.message.includes('fixture-secret')&&e.message==='FMP network request failed');
    await assert.rejects(request('income-statement','TEST',async()=>({ok:false,status:401})),/FMP HTTP 401/);
    await assert.rejects(request('income-statement','TEST',async()=>{throw Error('unexpected')}),/cooldown/);
  }finally{resetCaches();if(old===undefined)delete process.env.FMP_API_KEY;else process.env.FMP_API_KEY=old;}
});
test('concurrent financial requests share cache and omit upstream secret fields',async()=>{
  const old=process.env.FMP_API_KEY;process.env.FMP_API_KEY='fixture-secret';resetCaches();let calls=0;
  const options={issuerLoader:async()=>({issuers:{}}),fetchImpl:async url=>{calls++;return{ok:true,json:async()=>new URL(url).pathname.endsWith('income-statement')?income.map(r=>({...r,apikey:'fixture-secret'})):cash};}};
  try{
    const results=await Promise.all([loadFinancialData(['TEST'],options),loadFinancialData(['TEST'],options)]);
    assert.equal(calls,2);assert.equal(Object.keys(results[0].issuers).length,1);assert.ok(!JSON.stringify(results).includes('fixture-secret'));
    await loadFinancialData(['TEST'],options);assert.equal(calls,2);
  }finally{resetCaches();if(old===undefined)delete process.env.FMP_API_KEY;else process.env.FMP_API_KEY=old;}
});

const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');
const read=name=>fs.readFileSync(path.join(__dirname,'..','public',name),'utf8');
const universe={asOf:'2026-09-08',tickers:{TEST:{name:'Test Company',layer:'Testing'},OTHER:{name:'Other Company',layer:'Other'}},layers:{Testing:{tickers:['TEST'],color:'#123456'},Other:{tickers:['OTHER'],color:'#654321'}}};
const record={symbol:'TEST',name:'Test Company',cik:'0000000001',retrievedAt:Date.now(),latestFiling:{periodEnd:'2026-06-30',filed:'2026-08-01'},facts:{revenue:{value:1000,unit:'USD',end:'2026-06-30',periodType:'quarterly'}},reconciliation:{blockingIssues:['Synthetic unresolved issue'],warnings:[]},decisionEvidence:{reported:{revenueQuarterly:[]},derived:{financialBasis:'TTM',annualPeriodEnd:'2026-06-30',annualUnit:'USD',annualRevenue:4000,freeCashFlow:1000,freeCashFlowMarginPct:25,revenueGrowthPct:20,blockingIssues:['Synthetic unresolved issue']}}};
function harness(t,page='index.html',overrides={},query=''){
  const dom=new JSDOM(read(page),{url:'https://dashboard.test/'+page+query,runScripts:'outside-only'});t.after(()=>dom.window.close());
  const w=dom.window;w.HTMLElement.prototype.scrollIntoView=function(){};
  const routes={'/universe.json':universe,'/api/financial-data':{issuers:{TEST:record},unavailable:{OTHER:'No test financials'}},'/api/quotes':{quotes:{TEST:{price:10,currency:'USD',asOf:Date.now()/1000,marketCap:50000}}},'/api/fundamentals':{fundamentals:{}},'/api/history?range=1y&interval=1d':{}};
  w.fetch=async url=>{if(Object.hasOwn(overrides,url)){const v=overrides[url];if(v instanceof Error)throw v;if(typeof v==='function')return v();return {ok:true,json:async()=>v}}return {ok:true,json:async()=>routes[url]}};
  w.eval(read('assessment-trust.js'));
  if(page==='index.html')w.eval(read('dashboard.js'));else{w.eval(read('decision-trust.js'));w.eval(read('recommendation-model.js'));w.eval(read('recommendation-ui.js'));for(const m of read(page).matchAll(/<script>([\s\S]*?)<\/script>/g))w.eval(m[1])}
  return w;
}
test('financials render without waiting for secondary sources and failed sources do not blank the page',async t=>{
  let finish;const pending=new Promise(r=>finish=r);
  const w=harness(t,'index.html',{'/api/fundamentals':()=>pending,'/api/quotes':new Error('Synthetic Yahoo outage')});
  await new Promise(r=>setImmediate(r));
  assert.equal(w.document.getElementById('issuerCard').hidden,false);
  assert.match(w.document.getElementById('issuerRows').textContent,/1,000/);
  assert.match(w.document.getElementById('status').textContent,/Available sources remain visible/);
  assert.equal(w.document.getElementById('refreshData').disabled,true);
  finish({ok:true,json:async()=>({fundamentals:{}})});await w.dashboardReady;
  assert.equal(w.document.getElementById('refreshData').disabled,false);
});
test('FMP outage leaves taxonomy and Yahoo quote context available',async t=>{
  const w=harness(t,'index.html',{'/api/financial-data':new Error('Synthetic FMP outage')});await w.dashboardReady;
  assert.equal(w.document.getElementById('valueChainCard').hidden,false);
  assert.match(w.document.getElementById('status').textContent,/FMP financial data unavailable/);
  assert.equal(w.document.getElementById('quoteCoverage').textContent,'1/2');
  assert.match(w.document.getElementById('issuerRows').textContent,/Unavailable/);
});
test('search, layer and quality filters update both tables and preserve safe map links',async t=>{
  const w=harness(t);await w.dashboardReady;const d=w.document;
  const search=d.getElementById('companySearch');search.value='test';search.dispatchEvent(new w.Event('input'));
  assert.equal(d.querySelectorAll('#issuerRows tr').length,1);assert.equal(d.querySelectorAll('#reconciliationRows tr').length,1);
  assert.match(d.getElementById('issuerRows').textContent,/Synthetic unresolved issue/);
  assert.equal(d.querySelector('.ticker-chip').getAttribute('href'),'decision.html?symbol=TEST');
  search.value='';const filter=d.getElementById('qualityFilter');filter.value='unavailable';filter.dispatchEvent(new w.Event('change'));
  assert.match(d.getElementById('issuerRows').textContent,/OTHER/);assert.doesNotMatch(d.getElementById('issuerRows').textContent,/TEST/);
  filter.value='';d.querySelector('.layer-filter-button').click();assert.equal(d.getElementById('layerFilter').value,'Testing');
  search.value='<script>';search.dispatchEvent(new w.Event('input'));assert.match(d.getElementById('filterStatus').textContent,/0 of 2/);
  assert.match(d.getElementById('issuerRows').textContent,/No companies match/);
});
test('future quote timestamps are not displayed as fresh market data',async t=>{
  const w=harness(t,'index.html',{'/api/quotes':{quotes:{TEST:{price:10,asOf:Date.now()/1000+3600}}}});await w.dashboardReady;
  assert.equal(w.document.getElementById('quoteCoverage').textContent,'0/2');
  const stale=harness(t,'index.html',{'/api/quotes':{quotes:{TEST:{price:10,asOf:Date.now()/1000-8*86400}}}});await stale.dashboardReady;
  assert.equal(stale.document.getElementById('quoteCoverage').textContent,'0/2');
});
test('decision deep link selects requested company and preserves unsaved drafts across rerenders',async t=>{
  const w=harness(t,'decision.html',{},'?symbol=OTHER');await w.decisionReady;const d=w.document;
  assert.equal(w.decisionState.selected,'OTHER');d.getElementById('thesisNote').value='Unsaved synthetic thesis';
  w.renderDecision();assert.equal(d.getElementById('thesisNote').value,'Unsaved synthetic thesis');
  w.selectCompany('TEST',false);w.selectCompany('OTHER',false);assert.equal(d.getElementById('thesisNote').value,'Unsaved synthetic thesis');
  assert.equal(w.localStorage.getItem('software-decision-journal:OTHER'),null);
});
test('decision page retains financial evidence when price history fails, with no passing candidates',async t=>{
  const w=harness(t,'decision.html',{'/api/history?range=1y&interval=1d':new Error('Synthetic history outage')});await w.decisionReady;
  assert.equal(w.decisionState.issuers.TEST.symbol,'TEST');
  assert.equal(w.decisionState.rows.some(r=>r.result.key==='research_now'),false);
  assert.match(w.document.getElementById('sourceStatus').textContent,/Some decision sources are unavailable/);
});
test('recommendation review expires on note edits and financial-period changes without losing notes',async t=>{
  const w=harness(t,'decision.html',{},'?symbol=TEST');await w.decisionReady;const d=w.document;
  d.getElementById('thesisNote').value='Synthetic review';d.getElementById('thesisReviewed').checked=true;
  assert.equal(w.captureJournal().reviewedPeriod,'2026-06-30');
  d.getElementById('valueChainNote').value='Synthetic value-chain advantage';
  d.getElementById('valueChainNote').dispatchEvent(new w.Event('input'));
  assert.equal(d.getElementById('thesisReviewed').checked,false);
  d.getElementById('thesisReviewed').checked=true;
  w.decisionState.rows.find(r=>r.symbol==='TEST').record=JSON.parse(JSON.stringify(record));
  w.decisionState.rows.find(r=>r.symbol==='TEST').record.decisionEvidence.derived.annualPeriodEnd='2026-09-30';
  w.selectCompany('TEST',false);
  assert.equal(d.getElementById('thesisReviewed').checked,false);
  assert.equal(d.getElementById('thesisNote').value,'Synthetic review');
  assert.match(d.getElementById('thesisReviewPeriod').textContent,/2026-09-30/);
});
test('recommendation filters include missing evidence and invalid assumptions remove valuation outputs',async t=>{
  const w=harness(t,'decision.html',{},'?symbol=TEST');await w.decisionReady;const d=w.document;
  assert.equal(d.getElementById('recommendationCard').hidden,false);
  d.getElementById('recommendationFilter').value='all';d.getElementById('recommendationFilter').dispatchEvent(new w.Event('change'));
  assert.equal(d.querySelectorAll('#recommendationRows .company-link').length,2);
  d.getElementById('baseSales').value='';d.getElementById('baseSales').dispatchEvent(new w.Event('input'));
  assert.match(d.getElementById('recommendationDetail').textContent,/Set valuation assumptions/);
  assert.equal(d.querySelector('#recommendationDetail table'),null);
  assert.doesNotMatch(d.getElementById('recommendationDetail').textContent,/Conditional entry ceiling/);
});

'use strict';
function toggleTheme(){var e=document.documentElement;e.dataset.theme=e.dataset.theme==='dark'?'light':'dark'}
function esc(v){return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}
function finite(v){return typeof v==='number'&&Number.isFinite(v)}
function isFreshQuote(q){var t=q&&q.asOf*1000;return finite(t)&&t<=Date.now()&&Date.now()-t<=7*86400000&&finite(q.price)&&q.price>0}
function compact(v){if(!finite(v))return '—';var a=Math.abs(v);if(a>=1e12)return (v/1e12).toFixed(2)+'T';if(a>=1e9)return (v/1e9).toFixed(2)+'B';if(a>=1e6)return (v/1e6).toFixed(1)+'M';return v.toLocaleString(undefined,{maximumFractionDigits:2})}
function factValue(f){if(!f||!finite(f.value))return '—';var unit=f.unit||'',shares=unit.endsWith('/shares');return esc(unit.replace('/shares','')+' '+compact(f.value)+(shares?' / share':''))}
function factCell(f){return f?factValue(f)+'<div class="cell-meta">'+esc(f.periodType+' through '+f.end)+'</div>':'—'}
function safeSecUrl(v){return typeof v==='string'&&v.startsWith('https://www.sec.gov/')?v:null}
var dashboardState={universe:null,financial:null,quotes:null,fundamentals:null,pending:{},errors:{},generation:0};
function json(url){
  var controller=new AbortController(),timer=setTimeout(function(){controller.abort()},90000);
  return fetch(url,{signal:controller.signal}).then(function(r){if(!r.ok)throw new Error('HTTP '+r.status);return r.json()}).finally(function(){clearTimeout(timer)});
}
function companyUrl(symbol){return 'decision.html?symbol='+encodeURIComponent(symbol)}
function renderValueChain(universe){
  var map=document.getElementById('valueChainMap');map.replaceChildren();
  var track=document.createElement('div');track.className='value-chain-track software';
  Object.entries(universe.layers||{}).forEach(function(entry){
    var name=entry[0],meta=entry[1],symbols=meta.tickers||[],layer=document.createElement('article');layer.className='value-layer';
    layer.style.setProperty('--layer-color',/^#[0-9a-f]{6}$/i.test(meta.color||'')?meta.color:'#5b9cf6');
    var label=document.createElement('button');label.type='button';label.className='value-layer-label layer-filter-button';label.textContent=name;label.title='Filter financials to '+name;
    label.addEventListener('click',function(){document.getElementById('layerFilter').value=name;document.getElementById('companySearch').value='';renderDashboard();document.getElementById('issuerCard').scrollIntoView({behavior:'smooth'})});
    var desc=document.createElement('div');desc.className='value-layer-desc';desc.textContent=meta.desc||'Curated software taxonomy';
    var count=document.createElement('div');count.className='value-layer-count';count.textContent=symbols.length+' '+(symbols.length===1?'company':'companies');
    var chips=document.createElement('div');chips.className='ticker-chips';
    symbols.forEach(function(s){var a=document.createElement('a');a.className='ticker-chip';a.textContent=s;a.href=companyUrl(s);a.setAttribute('aria-label','Research '+s);chips.appendChild(a)});
    layer.append(label,desc,count,chips);track.appendChild(layer);
  });
  map.appendChild(track);document.getElementById('valueChainCard').hidden=false;
  document.getElementById('universeDate').textContent=universe.asOf||'undated';
  var select=document.getElementById('layerFilter'),selected=select.value;select.replaceChildren(new Option('All layers',''));
  Object.keys(universe.layers||{}).forEach(function(layer){select.add(new Option(layer,layer))});select.value=selected;
}
function quality(record){
  if(!record)return 'unavailable';
  var r=record.reconciliation||{};
  return (r.blockingIssues||[]).length?'blocked':(r.warnings||[]).length?'review':'clear';
}
function qualityCell(record){
  var r=record.reconciliation||{},blocked=r.blockingIssues||[],warnings=r.warnings||[],kind=quality(record);
  var label=kind==='blocked'?'Unresolved issues':kind==='review'?'Review notes':'No blocking financial checks';
  var notes=blocked.concat(warnings),html='<span class="status '+(kind==='blocked'?'negative':kind==='review'?'mixed':'')+'">'+label+'</span>';
  if(notes.length)html+='<details class="quality-notes"><summary>'+notes.length+' source notes</summary><ul>'+notes.map(function(n){return '<li>'+esc(n)+'</li>'}).join('')+'</ul></details>';
  return html;
}
function checkCell(check,primary){
  var labels={issuer_unavailable:'FMP fact unavailable',yahoo_unavailable:'Yahoo field unavailable',period_type_mismatch:'Annual vs quarterly',period_mismatch:'Periods differ',basis_unverified:'Accounting basis unverified'};
  if(labels[check.status])return '<span class="status mixed">'+labels[check.status]+'</span>'+(check.status==='basis_unverified'?'<div class="cell-meta">Yahoo earnings EPS may be adjusted; not compared</div>':check.status==='period_mismatch'?'<div class="cell-meta">FMP '+esc(check.primaryEnd||'—')+' · Yahoo '+esc(check.secondaryEnd||'—')+'</div>':'');
  return '<span class="status '+(check.status==='aligned'?'positive':'negative')+'">'+(check.status==='aligned'?'Aligned':'Different')+' '+(finite(check.differencePct)?Math.abs(check.differencePct).toFixed(2)+'%':'—')+'</span><div class="cell-meta">FMP '+factValue(primary)+' · Yahoo '+esc(compact(check.secondaryValue))+'</div>';
}
function renderDashboard(){
  var s=dashboardState,u=s.universe,notice=document.getElementById('status');
  document.getElementById('refreshData').disabled=Object.values(s.pending).some(Boolean);
  if(!u){if(s.errors.universe){notice.className='notice error';notice.textContent='Company coverage unavailable. Please retry.'}return;}
  var symbols=Object.keys(u.tickers||{}).sort(),issuers=s.financial&&s.financial.issuers||{},quotes=s.quotes&&s.quotes.quotes||{},fundamentals=s.fundamentals&&s.fundamentals.fundamentals||{};
  var query=document.getElementById('companySearch').value.trim().toLowerCase(),layer=document.getElementById('layerFilter').value,filter=document.getElementById('qualityFilter').value;
  var visible=symbols.filter(function(symbol){var meta=u.tickers[symbol];return (!query||(symbol+' '+meta.name+' '+(issuers[symbol]&&issuers[symbol].name||'')).toLowerCase().includes(query))&&(!layer||meta.layer===layer)&&(!filter||quality(issuers[symbol])===filter)});
  var body=document.getElementById('issuerRows'),checksBody=document.getElementById('reconciliationRows');body.replaceChildren();checksBody.replaceChildren();
  var aligned=0,comparable=0,checked={};
  symbols.forEach(function(symbol){checked[symbol]=window.reconcileIssuerWithYahoo(issuers[symbol],fundamentals[symbol]);Object.values(checked[symbol]).forEach(function(c){if(c.status==='aligned'||c.status==='differs'){comparable++;if(c.status==='aligned')aligned++}})});
  visible.forEach(function(symbol){
    var record=issuers[symbol],meta=u.tickers[symbol],tr=document.createElement('tr'),symbolLink='<a href="'+companyUrl(symbol)+'">'+esc(symbol)+'</a>';
    if(!record)tr.innerHTML='<td>'+symbolLink+'</td><td>'+esc(meta.name)+'</td><td>'+esc(meta.layer)+'</td><td><span class="status mixed">'+(s.pending.financial?'Loading financials':'Unavailable')+'</span><div class="cell-meta">'+esc(s.financial&&s.financial.unavailable&&s.financial.unavailable[symbol]||s.errors.financial||'')+'</div></td><td>—</td><td>—</td><td>—</td>';
    else{
      var filing=record.latestFiling||{},url=safeSecUrl(filing.sourceUrl),facts=record.facts||{};
      tr.innerHTML='<td>'+symbolLink+'</td><td>'+esc(record.name===symbol?meta.name:record.name||meta.name)+'<div class="cell-meta">CIK '+esc(record.cik||'unavailable')+'</div></td><td>'+esc(meta.layer)+'</td><td>'+qualityCell(record)+'<div class="cell-meta">FMP period '+esc(filing.periodEnd||'—')+' · filed '+esc(filing.filed||'—')+'</div><div class="cell-meta">Fetched '+esc(record.retrievedAt?new Date(record.retrievedAt).toLocaleString():'unavailable')+(url?' · <a href="'+esc(url)+'" target="_blank" rel="noopener">SEC filing</a>':'')+'</div></td><td>'+factCell(facts.revenue)+'</td><td>'+factCell(facts.netIncome)+'</td><td>'+factCell(facts.dilutedEps)+'</td>';
    }
    body.appendChild(tr);
    var q=quotes[symbol],fresh=isFreshQuote(q),check=checked[symbol],f=record&&record.facts||{},row=document.createElement('tr');
    row.innerHTML='<td>'+symbolLink+'</td><td>'+(fresh?esc((q.currency||'')+' '+q.price.toLocaleString(undefined,{maximumFractionDigits:2})):'—')+'</td><td>'+(fresh?esc(new Date(q.asOf*1000).toLocaleString()):'<span class="muted">'+(s.pending.quotes?'Loading':'Unavailable / stale')+'</span>')+'</td><td>'+checkCell(check.revenue,f.revenue)+'</td><td>'+checkCell(check.netIncome,f.netIncome)+'</td><td>'+checkCell(check.dilutedEps,f.dilutedEps)+'</td>';checksBody.appendChild(row);
  });
  if(!visible.length){body.innerHTML='<tr><td colspan="7" class="empty">No companies match these filters.</td></tr>';checksBody.innerHTML='<tr><td colspan="6" class="empty">No companies match these filters.</td></tr>'}
  document.getElementById('filterStatus').textContent=visible.length+' of '+symbols.length+' companies shown. Filters apply to both tables.';
  document.getElementById('issuerCoverage').textContent=s.pending.financial?'Loading':Object.keys(issuers).length+'/'+symbols.length;
  document.getElementById('quoteCoverage').textContent=s.pending.quotes?'Loading':Object.values(quotes).filter(isFreshQuote).length+'/'+symbols.length;
  document.getElementById('checkCoverage').textContent=s.pending.fundamentals||s.pending.financial?'Loading':aligned+'/'+comparable;
  ['summary','issuerCard','reconciliationCard'].forEach(function(id){document.getElementById(id).hidden=false});
  var failures=Object.entries(s.errors).map(function(e){return e[0]+': '+e[1]}),count=Object.keys(issuers).length,blocked=Object.values(issuers).filter(function(r){return quality(r)==='blocked'}).length,loading=Object.keys(s.pending).filter(function(k){return s.pending[k]});
  notice.className=failures.length?'notice error':blocked||count<symbols.length||loading.length?'notice':'notice ok';
  notice.innerHTML='<strong>'+(count?'FMP financial data loaded':s.pending.financial?'Loading FMP financial results…':'FMP financial data unavailable')+'</strong>'+count+'/'+symbols.length+' financial records; '+blocked+' with unresolved financial checks. Coverage does not certify accuracy. '+(loading.length?'Still loading: '+esc(loading.join(', '))+'. ':'')+(failures.length?esc(failures.join('; '))+'. Available sources remain visible. ':'')+'Financial downloads are cached for up to 24 hours; Refresh data rechecks available sources without forcing a paid refetch.';
}
function loadDashboard(){
  var s=dashboardState,generation=++s.generation;s.errors={};
  ['summary','issuerCard','reconciliationCard'].forEach(function(id){document.getElementById(id).hidden=true});
  document.getElementById('status').className='notice';document.getElementById('status').textContent='Loading available sources…';
  var endpoints={universe:'/universe.json',financial:'/api/financial-data',quotes:'/api/quotes',fundamentals:'/api/fundamentals'};
  Object.keys(endpoints).forEach(function(k){s[k]=null;s.pending[k]=true});renderDashboard();
  return Promise.all(Object.entries(endpoints).map(function(entry){var key=entry[0];return json(entry[1]).then(function(value){if(s.generation!==generation)return;s[key]=value;if(key==='universe')renderValueChain(value)}).catch(function(e){if(s.generation===generation)s.errors[key]=e.name==='AbortError'?'Request timed out':e.message}).finally(function(){if(s.generation===generation){s.pending[key]=false;renderDashboard()}})}));
}
['companySearch','layerFilter','qualityFilter'].forEach(function(id){document.getElementById(id).addEventListener(id==='companySearch'?'input':'change',renderDashboard)});
document.getElementById('refreshData').addEventListener('click',loadDashboard);
window.dashboardReady=loadDashboard();

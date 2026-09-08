function recommendationAssumptions(){var a={};Object.keys(RecommendationModel.defaults).forEach(function(k){var v=document.getElementById(k).value;a[k]=v.trim()===''?null:Number(v)});return a}
function recommendationJournal(symbol){return decisionState.selected===symbol?captureJournal():journalDrafts[symbol]||readJournal(symbol)}
function recommendationFor(row){return RecommendationModel.evaluate(row,decisionState.quotes[row.symbol],criteria(),recommendationAssumptions(),recommendationJournal(row.symbol))}
function recommendationPrice(value,currency){return typeof value==='number'&&Number.isFinite(value)?esc(currency||'')+' '+value.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2}):'—'}
function recommendationClass(key){return key==='buy'?'positive':key==='avoid'?'negative':'mixed'}
function renderRecommendations(){
  if(!decisionState.universe)return;
  var evaluated=decisionState.rows.map(function(row){return {row:row,result:recommendationFor(row)}}),counts={buy:0,wait:0,review:0,avoid:0,insufficient:0};
  evaluated.forEach(function(item){counts[item.result.key]++});
  document.getElementById('recommendationSummary').textContent=counts.buy+' Buy candidates · '+counts.review+' need thesis review · '+counts.wait+' price watch · '+counts.avoid+' Avoid for now · '+counts.insufficient+' insufficient. '+(counts.buy?'Labels are conditional on this model and your review.':'No stock is forced into a Buy label.');
  var query=document.getElementById('recommendationSearch').value.trim().toLowerCase(),view=document.getElementById('recommendationFilter').value;
  var order={buy:0,review:1,wait:2,avoid:3,insufficient:4};
  evaluated.sort(function(a,b){return order[a.result.key]-order[b.result.key]||a.row.symbol.localeCompare(b.row.symbol)});
  var body=document.getElementById('recommendationRows');body.replaceChildren();
  evaluated.filter(function(item){return (!query||(item.row.symbol+' '+item.row.meta.name).toLowerCase().includes(query))&&(view==='all'||view==='actionable'&&['buy','review','wait'].includes(item.result.key)||view===item.result.key)}).forEach(function(item){
    var row=item.row,r=item.result,tr=document.createElement('tr');
    tr.innerHTML='<td><span class="status '+recommendationClass(r.key)+'">'+esc(r.label)+'</span></td><td><button type="button" class="company-link">'+esc(row.symbol)+'</button><div class="cell-meta">'+esc(row.meta.name)+'</div></td><td>'+esc(row.meta.layer)+'</td><td>'+recommendationPrice(r.price,r.currency)+'</td><td>'+(r.key==='insufficient'||r.key==='avoid'?'—':recommendationPrice(r.buyCeiling,r.currency))+'</td><td>'+esc(r.reasons[0])+'</td>';
    tr.querySelector('button').addEventListener('click',function(){selectCompany(row.symbol)});body.appendChild(tr);
  });
  if(!body.children.length)body.innerHTML='<tr><td colspan="6" class="empty">No companies in this view. Check All companies for exclusions and missing evidence.</td></tr>';
  document.getElementById('recommendationCard').hidden=false;
}
function renderRecommendationDetail(row){
  var r=recommendationFor(row),panel=document.getElementById('recommendationDetail'),a=recommendationAssumptions();
  var html='<h3><span class="status '+recommendationClass(r.key)+'">'+esc(r.label)+'</span></h3><ul>'+r.reasons.map(function(reason){return '<li>'+esc(reason)+'</li>'}).join('')+'</ul>';
  if(r.scenarios.length){
    html+='<p>Reported TTM FCF '+recommendationPrice(row.record.decisionEvidence.derived.freeCashFlow,r.currency)+' − SBC '+recommendationPrice(row.record.decisionEvidence.derived.stockCompensation,r.currency)+' = adjusted-cash proxy '+recommendationPrice(r.adjustedCashFlow,r.currency)+'.</p>';
    html+='<p>Valuation sensitivity using current TTM figures—not future-price forecasts. '+(r.sourceGaps.length?'Provisional: issuer reconciliation is incomplete.':'')+'</p><div class="table-wrap" tabindex="0" role="region" aria-label="Valuation scenarios"><table><thead><tr><th>Scenario</th><th>P/S assumption</th><th>Cash yield assumption</th><th>Implied price</th><th>Binding constraint</th></tr></thead><tbody>';
    r.scenarios.forEach(function(s){html+='<tr><td>'+esc(s.key)+'</td><td>'+s.salesMultiple.toFixed(1)+'×</td><td>'+s.cashYield.toFixed(1)+'%</td><td>'+recommendationPrice(s.price,r.currency)+'</td><td>'+esc(s.binding)+'</td></tr>'});
    html+='</tbody></table></div>';
    html+='<p>'+(r.key==='avoid'||r.key==='insufficient'?'No actionable entry ceiling: evidence or non-price gates fail. A cheaper quote does not remove these issues.':'Conditional entry ceiling: <b>'+recommendationPrice(r.buyCeiling,r.currency)+'</b> (at or below; '+a.marginOfSafety+'% discount to the base scenario, further capped by your existing valuation gates).')+'</p>';
    html+='<p class="muted">Latest quote '+recommendationPrice(r.price,r.currency)+' as of '+esc(new Date(r.quoteAsOf*1000).toLocaleString())+'. TTM period '+esc(r.period)+'. This model does not set a portfolio allocation or estimate an expected return.</p>';
  }
  if(r.sources&&r.sources.length)html+='<details><summary>Issuer filings used in the TTM inputs</summary><ul>'+r.sources.map(function(url,i){return '<li><a href="'+esc(url)+'" target="_blank" rel="noopener">SEC filing '+(i+1)+'</a></li>'}).join('')+'</ul></details>';
  panel.innerHTML=html;panel.className='notice recommendation-detail '+(r.key==='buy'?'ok':r.key==='avoid'?'error':'');
}
function updateRecommendations(){if(!decisionState.universe)return;renderRecommendations();var row=decisionState.rows.find(function(r){return r.symbol===decisionState.selected});if(row)renderRecommendationDetail(row)}
Object.keys(RecommendationModel.defaults).forEach(function(id){document.getElementById(id).addEventListener('input',updateRecommendations)});
document.getElementById('recommendationSearch').addEventListener('input',renderRecommendations);
document.getElementById('recommendationFilter').addEventListener('change',renderRecommendations);
document.getElementById('thesisReviewed').addEventListener('change',updateRecommendations);
['guidanceSource','guidanceNote','thesisNote','valueChainNote','balanceSheetNote','catalystNote','invalidationNote','riskNote'].forEach(function(id){document.getElementById(id).addEventListener('input',function(){document.getElementById('thesisReviewed').checked=false;updateRecommendations()})});

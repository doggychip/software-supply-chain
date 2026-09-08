'use strict';

// Editorial opinions are separate from both live prices and the user's screen/journal.
const pickState = { review: null, universe: null, quotes: {}, reviewError: false, universeError: false, loadingQuotes: false };
const DAY = 86400000;
const $ = id => document.getElementById(id);
const dateLabel = value => new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

function element(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}
function link(label, href) {
  const node = element('a', label); node.href = href;
  if (href.startsWith('https://')) { node.target = '_blank'; node.rel = 'noopener noreferrer'; }
  return node;
}
function safeSource(value) {
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password; } catch { return false; }
}
function validDate(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value.replace(/Z$/, value.includes('.') ? 'Z' : '.000Z');
}
function validateReview(data) {
  if (!data || data.schemaVersion !== 1 || !validDate(data.reviewedAt) || Date.parse(data.reviewedAt) > Date.now() || !validDate(data.reviewAfter) || Date.parse(data.reviewAfter) <= Date.parse(data.reviewedAt) || !Array.isArray(data.picks) || !data.picks.length) throw new Error('Invalid review');
  const seen = new Set();
  for (const pick of data.picks) {
    if (!pick || typeof pick.symbol !== 'string' || !/^[A-Z][A-Z0-9.-]{0,9}$/.test(pick.symbol) || seen.has(pick.symbol) || !['buy', 'wait', 'sell'].includes(pick.group)) throw new Error('Invalid recommendation');
    seen.add(pick.symbol);
    for (const field of ['name', 'action', 'reason', 'risk', 'valueChain', 'reviewTrigger', 'confidence', 'evidenceNote']) {
      if (typeof pick[field] !== 'string' || !pick[field].trim()) throw new Error('Incomplete recommendation');
    }
    if (pick.reviewAfter !== undefined && (!validDate(pick.reviewAfter) || Date.parse(pick.reviewAfter) <= Date.parse(data.reviewedAt))) throw new Error('Invalid review date');
    if (!Array.isArray(pick.sources) || !pick.sources.length || pick.sources.some(source => !source || typeof source.label !== 'string' || !source.label.trim() || !safeSource(source.url))) throw new Error('Missing or unsafe source');
  }
  return data;
}
function reviewDeadline(pick, review) {
  return Math.min(Date.parse(pick.reviewAfter || review.reviewAfter), Date.parse(review.reviewedAt) + 7 * DAY);
}
function activeGroup(pick, review, now = Date.now()) {
  return now >= Date.parse(review.reviewedAt) && now < reviewDeadline(pick, review) ? pick.group : 'expired';
}
function quoteAvailable(quote, now = Date.now()) {
  return !!quote && typeof quote.price === 'number' && Number.isFinite(quote.price) && quote.price > 0 && typeof quote.asOf === 'number' && Number.isFinite(quote.asOf) && quote.asOf * 1000 <= now && now - quote.asOf * 1000 <= 7 * DAY && typeof quote.currency === 'string' && /^[A-Z]{3}$/.test(quote.currency);
}
async function requestJSON(url, timeoutMs = 15000) {
  const controller = new AbortController(); let timer;
  try {
    return await Promise.race([
      fetch(url, { signal: controller.signal, cache: 'no-store' }).then(response => { if (!response.ok) throw new Error('Source unavailable'); return response.json(); }),
      new Promise((_, reject) => { timer = setTimeout(() => { controller.abort(); reject(new Error('Source timeout')); }, timeoutMs); })
    ]);
  } finally { clearTimeout(timer); }
}
function paragraph(label, text) {
  const p = element('p'); p.append(element('strong', label + ' '), document.createTextNode(text)); return p;
}
function card(pick, group) {
  const review = pickState.review;
  const node = element('article', undefined, 'card pick-card ' + group); node.dataset.symbol = pick.symbol;
  const heading = element('div', undefined, 'pick-heading');
  const company = element('div'); const title = element('h3', pick.symbol); title.id = 'stock-' + pick.symbol;
  node.setAttribute('aria-labelledby', title.id); company.append(title, element('div', pick.name, 'company-name'));
  const quote = pickState.quotes[pick.symbol]; const price = element('div', undefined, 'pick-price');
  if (quoteAvailable(quote)) {
    price.append(document.createTextNode(quote.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ' + quote.currency));
    price.append(element('span', 'FMP · ' + new Date(quote.asOf * 1000).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }) + ' UTC', 'price-time'));
  } else {
    price.append(document.createTextNode('—'), element('span', 'Price unavailable', 'price-time'));
  }
  heading.append(company, price);
  const risk = paragraph('Main risk:', pick.risk); risk.className = 'risk';
  node.append(heading, element('span', group === 'expired' ? 'Review overdue · previous: ' + pick.action : pick.action, 'status ' + ({ buy: 'positive', wait: 'mixed', sell: 'negative', expired: 'mixed' }[group])), element('p', pick.reason), risk);
  node.append(element('p', 'Reviewed ' + dateLabel(review.reviewedAt) + (group === 'expired' ? ' · Needs a fresh review' : '') + (pick.confidence.startsWith('Lower') ? ' · Lower confidence' : ''), 'review-date'));
  const details = element('details'); details.id = 'analysis-' + pick.symbol;
  const summary = element('summary', 'View analysis'); summary.setAttribute('aria-label', 'View analysis for ' + pick.symbol);
  const body = element('div', undefined, 'analysis-body');
  body.append(paragraph('Value-chain thesis:', pick.valueChain), paragraph('What would change the call:', pick.reviewTrigger), paragraph('Evidence and limits:', pick.evidenceNote), paragraph('Confidence:', pick.confidence), paragraph('Next review due:', dateLabel(reviewDeadline(pick, review)) + ' (00:00 UTC for scheduled date cutoffs). This date does not schedule an automatic review.'));
  const sources = element('ul');
  pick.sources.forEach(source => { const item = element('li'); item.append(link(source.label, source.url)); sources.append(item); });
  body.append(sources);
  const more = element('p'); more.append(link('Financial screen for ' + pick.symbol, 'decision.html?symbol=' + encodeURIComponent(pick.symbol)), document.createTextNode(' · '), link('Value-chain map', 'analysis.html#valueChainCard'));
  body.append(more); details.append(summary, body); node.append(details); return node;
}
function renderPicks() {
  const opened = new Set([...document.querySelectorAll('.pick-card details[open]')].map(node => node.id));
  const focusDetails = document.activeElement?.closest('.pick-card details')?.id;
  const query = $('stockSearch').value.trim().toLowerCase();
  const matches = pick => (pick.symbol + ' ' + pick.name).toLowerCase().includes(query);
  const picks = pickState.review?.picks || [];
  for (const group of ['buy', 'wait', 'sell', 'expired']) {
    const target = $(group + 'Picks'); target.replaceChildren();
    const rows = picks.filter(pick => activeGroup(pick, pickState.review) === group && matches(pick));
    rows.forEach(pick => target.append(card(pick, group)));
    if (group === 'expired') $('expiredSection').hidden = rows.length === 0;
    else {
      target.closest('section').hidden = !!query && !!pickState.review && rows.length === 0;
      $(group + 'Count').textContent = '(' + rows.length + ')';
      if (!rows.length) target.append(element('p', pickState.review ? (query ? 'No matching reviewed stocks.' : 'No active recommendations in this group.') : 'Recommendations unavailable until the dated review loads.', 'empty-group'));
    }
  }
  opened.forEach(id => { if ($(id)) $(id).open = true; });
  if (focusDetails && $(focusDetails)) $(focusDetails).querySelector('summary').focus();
  const expired = picks.filter(pick => activeGroup(pick, pickState.review) === 'expired').length;
  $('homeStatus').textContent = pickState.review ? picks.length + ' stocks reviewed ' + dateLabel(pickState.review.reviewedAt) + '. ' + (expired ? expired + ' now need a fresh review.' : 'Dated opinions, separate from the automated screen.') : pickState.reviewError ? 'Recommendations unavailable. Reload the page to retry; no calls have been invented.' : 'Loading recommendations…';
  if (query && pickState.review) $('homeStatus').textContent += ' ' + picks.filter(matches).length + ' reviewed stocks match your search.';
  const uncovered = $('unreviewedStocks'); uncovered.replaceChildren();
  if (pickState.universe && pickState.review) {
    const reviewed = new Set(picks.map(pick => pick.symbol));
    const all = Object.entries(pickState.universe.tickers).filter(([symbol]) => !reviewed.has(symbol));
    const filtered = all.filter(([symbol, info]) => matches({ symbol, name: info.name }));
    $('unreviewedSummary').textContent = 'Not reviewed (' + all.length + ')' + (query ? ' — ' + filtered.length + ' match' : '');
    filtered.forEach(([symbol, info]) => uncovered.append(link(symbol + ' · ' + info.name, 'decision.html?symbol=' + encodeURIComponent(symbol))));
    if (!filtered.length) uncovered.append(element('p', query ? 'No unreviewed stocks match your search.' : 'All companies in this coverage list have a dated review.'));
    if (query && filtered.length) $('unreviewed').open = true;
  } else {
    $('unreviewedSummary').textContent = pickState.universeError || pickState.reviewError ? 'Unreviewed coverage unavailable' : 'Other stocks — loading coverage…';
    uncovered.append(element('p', 'Both the coverage list and review must load before unreviewed stocks can be identified.'));
  }
}
async function loadQuotes() {
  if (pickState.loadingQuotes) return;
  pickState.loadingQuotes = true; $('refreshQuotes').disabled = true;
  $('quoteStatus').textContent = 'Refreshing latest available FMP quotes…';
  try {
    const response = await requestJSON('/api/fmp-quotes', 60000);
    if (!response || response.source?.provider !== 'Financial Modeling Prep' || !response.quotes || typeof response.quotes !== 'object' || Array.isArray(response.quotes)) throw new Error('Invalid quotes');
    pickState.quotes = response.quotes;
    const available = Object.values(response.quotes).filter(quote => quoteAvailable(quote)).length;
    $('quoteStatus').textContent = available ? 'Latest available FMP quotes · may be delayed · each price shows its market time. Opinions are unchanged.' : 'No usable prices available. Dated opinions remain visible; no fallback prices are used.';
  } catch {
    pickState.quotes = {};
    $('quoteStatus').textContent = 'FMP prices unavailable. No Yahoo fallback is used. Dated opinions remain visible. Try Refresh prices again.';
  } finally {
    pickState.loadingQuotes = false; $('refreshQuotes').disabled = false; renderPicks();
  }
}
function redirectLegacySection() {
  if (['#valueChainCard', '#issuerCard', '#reconciliationCard'].includes(location.hash)) location.replace('analysis.html' + location.hash);
}
redirectLegacySection(); window.addEventListener('hashchange', redirectLegacySection);
$('stockSearch').addEventListener('input', renderPicks);
$('refreshQuotes').addEventListener('click', loadQuotes);
$('themeToggle').addEventListener('click', () => {
  const dark = document.documentElement.dataset.theme === 'dark';
  document.documentElement.dataset.theme = dark ? 'light' : 'dark';
  $('themeToggle').textContent = dark ? 'Use dark theme' : 'Use light theme';
});
window.picksReady = Promise.all([
  requestJSON('/stock-picks.json').then(data => { pickState.review = validateReview(data); }).catch(() => { pickState.reviewError = true; }).finally(renderPicks),
  requestJSON('/universe.json').then(data => {
    if (!data || !data.tickers || typeof data.tickers !== 'object' || Array.isArray(data.tickers) || !Object.keys(data.tickers).length || Object.entries(data.tickers).some(([symbol, info]) => !/^[A-Z][A-Z0-9.-]{0,9}$/.test(symbol) || !info || typeof info.name !== 'string')) throw new Error('Invalid universe');
    pickState.universe = data;
  }).catch(() => { pickState.universeError = true; }).finally(renderPicks),
  loadQuotes()
]);
// Re-evaluate expiry even if a tab stays open across the review deadline.
setInterval(renderPicks, 60000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) renderPicks(); });

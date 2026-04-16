# Software Supply Chain Dashboard — Shared Template Reference

## Tab Bar HTML (used on ALL pages)
```html
<nav class="tab-bar">
  <a href="index.html" class="tab-link">Main Dashboard</a>
  <a href="correlation.html" class="tab-link">Correlation</a>
  <a href="technicals.html" class="tab-link">Technicals</a>
  <a href="insider.html" class="tab-link">Insider Activity</a>
  <a href="options.html" class="tab-link">Options Flow</a>
  <a href="sentiment.html" class="tab-link">Sentiment</a>
  <a href="leaderboard.html" class="tab-link">Leaderboard</a>
  <a href="stress-test.html" class="tab-link">Stress Test</a>
</nav>
```
Set the appropriate tab-link as "active" per page.

## SafeStorage Shim (MUST be in every page head before any scripts)
```html
<script>
var _memStore={};
var safeStorage={getItem:function(k){return _memStore[k]||null},setItem:function(k,v){_memStore[k]=v},removeItem:function(k){delete _memStore[k]}};
</script>
```

## Chart.js CDN with fallback (in head)
```html
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
<script>if(typeof Chart==="undefined"){var s=document.createElement("script");s.src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.0/chart.umd.min.js";document.head.appendChild(s);}</script>
```

## i18n script tag (at bottom of body, before page-specific scripts)
```html
<script src="i18n.js"></script>
```

## Theme: dark (default) and light toggle
data-theme="dark" on html element

## Layer config (12 layers, 42 tickers total)
Cloud Infrastructure (#5b9cf6): AMZN, MSFT, GOOGL, ORCL
Cybersecurity (#f07070): CRWD, PANW, ZS, FTNT, S
Data & Analytics (#56d4e8): SNOW, MDB, CFLT, ESTC
Observability & DevOps (#a87ef0): DDOG, DT, GTLB, NET
Enterprise SaaS (#56cc84): CRM, NOW, WDAY, TEAM
AI / ML Software (#f5a454): PLTR, AI, PATH, DUOL
Vertical SaaS (#e8c44a): VEEV, PCOR, BILL, TOST
Fintech / Payments (#4fc4cf): SQ, PYPL, AFRM
AdTech / MarTech (#f0ad4e): TTD, ZETA, HUBS
Communication Platforms (#7a7e96): TWLO, ZM, RNG
Identity & Access (#c06ef0): OKTA, CYBR
Internet / Social (#f07070): RDDT, PINS

## Color palette (CSS vars)
Dark: --bg:#0d0f14 --surface:#13151d --s2:#181a24 --s3:#1c1f2a --s4:#22253a
--text:#dde0f0 --muted:#7a7e96 --primary:#5b9cf6
--success:#56cc84 --warn:#f0ad4e --error:#f07070
--cyan:#56d4e8 --purple:#a87ef0 --orange:#f5a454 --gold:#e8c44a
--green:#56cc84 --red:#f07070 --blue:#5b9cf6 --teal:#4fc4cf

## Font stack
--font-body: 'Inter', sans-serif
--font-mono: 'JetBrains Mono', monospace
Google fonts link: https://fonts.googleapis.com/css2?family=Inter:wght@300..700&family=JetBrains+Mono:wght@400;600&display=swap

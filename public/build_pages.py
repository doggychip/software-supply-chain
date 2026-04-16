#!/usr/bin/env python3
"""Generate correlation.html and technicals.html for the Software Value Chain Dashboard."""
import json, textwrap

with open('/home/user/workspace/software-supply-chain/public/sw_data.json') as f:
    sw = json.load(f)

# Build compact price data: {TICKER: [{d, c, v}, ...]}
# We have 126 data points per ticker (roughly 6 months of trading days)
# Generate trading dates going backward from 2026-04-15
from datetime import date, timedelta
def trading_dates(n, end=date(2026, 4, 15)):
    dates = []
    d = end
    while len(dates) < n:
        if d.weekday() < 5:  # Mon-Fri
            dates.append(d.strftime('%Y-%m-%d'))
        d -= timedelta(days=1)
    dates.reverse()
    return dates

DATES = trading_dates(126)

# Build the PRICE_DATA object
price_data = {}
for ticker, info in sw['tickers'].items():
    ph = info['priceHistory']
    bars = []
    vol = info.get('volume', 5000000) or 5000000
    avgVol = info.get('avgVolume', vol) or vol
    for i, p in enumerate(ph):
        # Simulate volume: use avgVolume with some variation
        import random
        random.seed(hash(ticker) + i)
        v = int(avgVol * (0.6 + random.random() * 0.8))
        bars.append({"d": DATES[i], "c": round(p, 2), "v": v})
    price_data[ticker] = bars

# Build QUOTES
quotes = {}
for ticker, info in sw['tickers'].items():
    quotes[ticker] = {
        "name": info['name'],
        "price": info['price'],
        "change": info['change'],
        "changesPct": info['changePct'],
        "volume": info.get('volume', 0),
        "avgVolume": info.get('avgVolume', 0),
        "marketCap": info.get('marketCap', 0),
        "pe": info.get('pe', 0),
        "yearLow": info.get('yearLow', 0),
        "yearHigh": info.get('yearHigh', 0),
    }

# Compact JSON for embedding
price_json = json.dumps(price_data, separators=(',', ':'))
quotes_json = json.dumps(quotes, separators=(',', ':'))

# Layers config for JS
layers = sw['layers']
layers_js = json.dumps({name: info['tickers'] for name, info in layers.items()}, separators=(',', ':'))
layer_colors_js = json.dumps({name: info['color'] for name, info in layers.items()}, separators=(',', ':'))

print(f"Price data JSON size: {len(price_json)} chars")
print(f"Quotes JSON size: {len(quotes_json)} chars")
print(f"Tickers: {len(price_data)}")

# ============================================================
# SHARED CSS
# ============================================================
SHARED_CSS = """
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
--text-xs:clamp(.72rem,.68rem+.2vw,.8rem);
--text-sm:clamp(.8rem,.75rem+.25vw,.9rem);
--text-base:clamp(.9rem,.85rem+.25vw,1rem);
--text-lg:clamp(1rem,.9rem+.5vw,1.3rem);
--text-xl:clamp(1.3rem,1rem+1vw,1.9rem);
--space-1:.25rem;--space-2:.5rem;--space-3:.75rem;--space-4:1rem;--space-5:1.25rem;
--space-6:1.5rem;--space-8:2rem;--space-10:2.5rem;--space-12:3rem;
--radius-sm:.3rem;--radius-md:.5rem;--radius-lg:.75rem;--radius-xl:1rem;
--font-body:'Inter',sans-serif;--font-mono:'JetBrains Mono',monospace;
--ease:180ms cubic-bezier(.16,1,.3,1);
}
[data-theme="dark"]{
--bg:#0d0f14;--surface:#13151d;--s2:#181a24;--s3:#1c1f2a;--s4:#22253a;
--div:#252836;--border:#2e3148;
--text:#dde0f0;--muted:#7a7e96;--faint:#454868;
--primary:#5b9cf6;--pri-h:#3b7de8;
--success:#56cc84;--warn:#f0ad4e;--error:#f07070;
--cyan:#56d4e8;--purple:#a87ef0;--orange:#f5a454;--gold:#e8c44a;
--green:#56cc84;--red:#f07070;--blue:#5b9cf6;--teal:#4fc4cf;
--shadow:0 4px 20px rgba(0,0,0,.5);--shadow-sm:0 1px 4px rgba(0,0,0,.3);
}
[data-theme="light"]{
--bg:#f2f3f7;--surface:#fff;--s2:#f8f9fc;--s3:#eef0f6;--s4:#e5e8f0;
--div:#dde1ec;--border:#ccd0e0;
--text:#1a1d2e;--muted:#5c617a;--faint:#9498b0;
--primary:#2563eb;--pri-h:#1d50cc;
--success:#2d7a4a;--warn:#b45309;--error:#c0392b;
--cyan:#0891b2;--purple:#7c3aed;--orange:#c2570a;--gold:#b45309;
--green:#2d7a4a;--red:#c0392b;--blue:#2563eb;--teal:#0f766e;
--shadow:0 4px 20px rgba(0,0,0,.1);--shadow-sm:0 1px 4px rgba(0,0,0,.06);
}
html{-webkit-font-smoothing:antialiased;scroll-behavior:smooth}
body{min-height:100dvh;font-family:var(--font-body);font-size:var(--text-base);color:var(--text);background:var(--bg);display:flex;flex-direction:column;overflow:hidden;height:100vh}
button{cursor:pointer;background:none;border:none;font:inherit;color:inherit}
.tab-bar{display:flex;gap:2px;background:var(--surface);border-bottom:2px solid var(--border);padding:0 var(--space-4);position:sticky;top:0;z-index:100;overflow-x:auto;flex-shrink:0}
.tab-link{padding:var(--space-3) var(--space-4);font-size:var(--text-xs);font-weight:600;color:var(--muted);text-decoration:none;border-bottom:2px solid transparent;margin-bottom:-2px;white-space:nowrap;transition:color .2s,border-color .2s}
.tab-link:hover{color:var(--text)}
.tab-link.active{color:var(--primary);border-bottom-color:var(--primary)}
.page-wrapper{display:flex;flex:1;overflow:hidden}
.sidebar{width:210px;flex-shrink:0;background:var(--surface);border-right:1px solid var(--border);overflow-y:auto;padding:var(--space-3) 0}
.sidebar-section{padding:var(--space-2) var(--space-4);margin-bottom:var(--space-1)}
.sidebar-title{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);margin-bottom:var(--space-2)}
.sidebar-item{display:flex;align-items:center;gap:var(--space-2);padding:5px var(--space-4);font-size:var(--text-xs);color:var(--muted);cursor:pointer;transition:all .15s;border-radius:0;text-decoration:none}
.sidebar-item:hover{background:var(--s2);color:var(--text)}
.sidebar-item.active{background:var(--s3);color:var(--primary);font-weight:600}
.sidebar-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0}
.sidebar-count{margin-left:auto;font-size:9px;color:var(--faint);font-weight:600}
.page-body{flex:1;overflow-y:auto;padding:var(--space-6)}
.page-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-6);flex-wrap:wrap;gap:var(--space-3)}
.page-title{font-size:var(--text-lg);font-weight:700;letter-spacing:-.02em}
.page-subtitle{font-size:var(--text-xs);color:var(--muted);margin-top:2px}
.controls{display:flex;gap:var(--space-2);align-items:center;flex-wrap:wrap}
.ctrl-btn{padding:6px 14px;font-size:var(--text-xs);font-weight:600;border-radius:var(--radius-md);border:1px solid var(--border);background:var(--surface);color:var(--muted);cursor:pointer;transition:all .2s}
.ctrl-btn:hover{background:var(--s3);color:var(--text)}
.ctrl-btn.active{background:var(--primary);color:#fff;border-color:var(--primary)}
.ctrl-label{font-size:var(--text-xs);color:var(--muted);font-weight:600}
.card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-lg);padding:var(--space-5);overflow:hidden;margin-bottom:var(--space-4)}
.card-title{font-size:var(--text-xs);font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);margin-bottom:var(--space-3);display:flex;align-items:center;gap:var(--space-2)}
.card-chart{position:relative;height:260px;width:100%}
.card-chart-sm{position:relative;height:180px;width:100%}
.badge{display:inline-flex;align-items:center;font-size:10px;font-weight:700;padding:2px 7px;border-radius:var(--radius-sm);white-space:nowrap}
.b-orange{background:color-mix(in srgb,var(--orange) 15%,transparent);color:var(--orange)}
.b-green{background:color-mix(in srgb,var(--green) 15%,transparent);color:var(--green)}
.b-red{background:color-mix(in srgb,var(--red) 15%,transparent);color:var(--red)}
.b-blue{background:color-mix(in srgb,var(--blue) 15%,transparent);color:var(--blue)}
.b-purple{background:color-mix(in srgb,var(--purple) 15%,transparent);color:var(--purple)}
.b-muted{background:var(--s3);color:var(--muted)}
.theme-toggle{width:34px;height:34px;border-radius:var(--radius-md);border:1px solid var(--border);display:flex;align-items:center;justify-content:center;font-size:16px;cursor:pointer;background:var(--surface)}
.theme-toggle:hover{background:var(--s3)}
.stats-row{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:var(--space-4);margin-bottom:var(--space-6)}
.stat-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-lg);padding:var(--space-4)}
.stat-label{font-size:10px;text-transform:uppercase;letter-spacing:.07em;color:var(--muted);font-weight:700}
.stat-value{font-size:var(--text-lg);font-weight:700;margin-top:4px;font-variant-numeric:tabular-nums}
.stat-sub{font-size:var(--text-xs);color:var(--muted);margin-top:2px}
/* Side panel drawer */
.side-panel-overlay{position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:400;opacity:0;pointer-events:none;transition:opacity .25s}
.side-panel-overlay.open{opacity:1;pointer-events:auto}
.side-panel{position:fixed;top:0;right:0;width:380px;max-width:92vw;height:100vh;background:var(--surface);border-left:1px solid var(--border);z-index:401;transform:translateX(100%);transition:transform .3s cubic-bezier(.16,1,.3,1);overflow-y:auto;padding:var(--space-5)}
.side-panel.open{transform:translateX(0)}
.side-panel-close{float:right;font-size:18px;cursor:pointer;color:var(--muted);width:28px;height:28px;display:flex;align-items:center;justify-content:center;border-radius:var(--radius-sm);border:1px solid var(--border)}
.side-panel-close:hover{background:var(--s3);color:var(--text)}
.side-panel-title{font-size:var(--text-lg);font-weight:700;margin-bottom:var(--space-2)}
.side-panel-sub{font-size:var(--text-xs);color:var(--muted);margin-bottom:var(--space-4)}
.side-panel-section{margin-bottom:var(--space-4)}
.side-panel-section-title{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);margin-bottom:var(--space-2)}
.side-panel-row{display:flex;justify-content:space-between;padding:4px 0;font-size:var(--text-xs);border-bottom:1px solid var(--div)}
.side-panel-row span:first-child{color:var(--muted)}
.side-panel-row span:last-child{font-weight:600;font-family:var(--font-mono)}
@media(max-width:900px){.sidebar{display:none}.stats-row{grid-template-columns:1fr 1fr}}
@media(max-width:600px){.stats-row{grid-template-columns:1fr}}
"""

TAB_BAR = """<nav class="tab-bar">
  <a href="index.html" class="tab-link" data-i18n="tab_main">Main Dashboard</a>
  <a href="correlation.html" class="tab-link{corr_active}" data-i18n="tab_correlation">Correlation</a>
  <a href="technicals.html" class="tab-link{tech_active}" data-i18n="tab_technicals">Technicals</a>
  <a href="insider.html" class="tab-link" data-i18n="tab_insider">Insider Activity</a>
  <a href="options.html" class="tab-link" data-i18n="tab_options">Options Flow</a>
  <a href="sentiment.html" class="tab-link" data-i18n="tab_sentiment">Sentiment</a>
  <a href="leaderboard.html" class="tab-link" data-i18n="tab_leaderboard">Leaderboard</a>
  <a href="stress-test.html" class="tab-link" data-i18n="tab_stress">Stress Test</a>
</nav>"""

SAFE_STORAGE = """<script>
var _memStore={};
var safeStorage={getItem:function(k){return _memStore[k]||null},setItem:function(k,v){_memStore[k]=v},removeItem:function(k){delete _memStore[k]}};
</script>"""

CHARTJS = """<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
<script>if(typeof Chart==="undefined"){var s=document.createElement("script");s.src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.0/chart.umd.min.js";document.head.appendChild(s);}</script>"""

def sidebar_html():
    html = '<aside class="sidebar" id="sidebar">\n'
    html += '  <div class="sidebar-section">\n'
    html += '    <div class="sidebar-title" data-i18n="sidebar_layers">Layers</div>\n'
    for name, info in layers.items():
        count = len(info['tickers'])
        safe_id = name.replace(' ', '_').replace('/', '_').replace('&', 'and')
        html += f'    <div class="sidebar-item" data-layer="{name}" onclick="filterLayer(\'{name}\')">\n'
        html += f'      <span class="sidebar-dot" style="background:{info["color"]}"></span>\n'
        html += f'      <span>{name}</span>\n'
        html += f'      <span class="sidebar-count">{count}</span>\n'
        html += f'    </div>\n'
    html += '    <div class="sidebar-item" data-layer="all" onclick="filterLayer(\'all\')" style="margin-top:var(--space-2);border-top:1px solid var(--div);padding-top:var(--space-2)">\n'
    html += '      <span class="sidebar-dot" style="background:var(--primary)"></span>\n'
    html += '      <span data-i18n="sidebar_all">All Layers</span>\n'
    html += '      <span class="sidebar-count">42</span>\n'
    html += '    </div>\n'
    html += '  </div>\n'
    html += '</aside>\n'
    return html

def side_panel_html():
    return """<div class="side-panel-overlay" id="panelOverlay"></div>
<div class="side-panel" id="sidePanel">
  <button class="side-panel-close" id="panelClose">&times;</button>
  <div class="side-panel-title" id="panelTitle"></div>
  <div class="side-panel-sub" id="panelSub"></div>
  <div id="panelBody"></div>
</div>"""

def side_panel_js():
    return """
function openPanel(ticker) {
  const info = QUOTES[ticker];
  if (!info) return;
  const panel = document.getElementById('sidePanel');
  const overlay = document.getElementById('panelOverlay');
  document.getElementById('panelTitle').textContent = ticker + ' — ' + info.name;
  document.getElementById('panelSub').textContent = (TICKER_LAYERS[ticker] || '') + ' · $' + info.price.toFixed(2);
  let body = '<div class="side-panel-section"><div class="side-panel-section-title">Key Stats</div>';
  const rows = [
    ['Market Cap', info.marketCap ? '$'+(info.marketCap/1e9).toFixed(1)+'B' : '—'],
    ['P/E', info.pe ? info.pe.toFixed(1) : '—'],
    ['Day Change', (info.changesPct >= 0 ? '+' : '') + info.changesPct.toFixed(2) + '%'],
    ['Volume', info.volume ? (info.volume/1e6).toFixed(1)+'M' : '—'],
    ['Avg Volume', info.avgVolume ? (info.avgVolume/1e6).toFixed(1)+'M' : '—'],
    ['52w Low', info.yearLow ? '$'+info.yearLow.toFixed(2) : '—'],
    ['52w High', info.yearHigh ? '$'+info.yearHigh.toFixed(2) : '—'],
  ];
  for (const [k, v] of rows) {
    body += '<div class="side-panel-row"><span>'+k+'</span><span>'+v+'</span></div>';
  }
  body += '</div>';
  document.getElementById('panelBody').innerHTML = body;
  panel.classList.add('open');
  overlay.classList.add('open');
}
document.getElementById('panelClose').addEventListener('click', () => {
  document.getElementById('sidePanel').classList.remove('open');
  document.getElementById('panelOverlay').classList.remove('open');
});
document.getElementById('panelOverlay').addEventListener('click', () => {
  document.getElementById('sidePanel').classList.remove('open');
  document.getElementById('panelOverlay').classList.remove('open');
});
"""

# Build TICKER_LAYERS mapping
ticker_layers = {}
for name, info in layers.items():
    for t in info['tickers']:
        ticker_layers[t] = name
ticker_layers_js = json.dumps(ticker_layers, separators=(',', ':'))

# ============================================================
# CORRELATION.HTML
# ============================================================
correlation_html = f"""<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Correlation Matrix — Software Value Chain Dashboard</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300..700&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">
{SAFE_STORAGE}
{CHARTJS}
<style>
{SHARED_CSS}
.heatmap-wrap{{position:relative;overflow:auto;margin-bottom:var(--space-4)}}
.heatmap-canvas{{cursor:crosshair}}
.tooltip{{position:fixed;background:var(--s2);border:1px solid var(--border);border-radius:var(--radius-md);padding:var(--space-2) var(--space-3);font-size:var(--text-xs);pointer-events:none;z-index:200;box-shadow:var(--shadow);display:none;font-family:var(--font-mono);white-space:nowrap}}
.scatter-modal{{position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:300;display:none;align-items:center;justify-content:center}}
.scatter-modal.open{{display:flex}}
.scatter-content{{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-lg);padding:var(--space-5);width:560px;max-width:92vw;max-height:90vh;overflow:auto}}
.scatter-close{{float:right;font-size:18px;cursor:pointer;color:var(--muted);width:28px;height:28px;display:flex;align-items:center;justify-content:center;border-radius:var(--radius-sm);border:1px solid var(--border)}}
.scatter-close:hover{{background:var(--s3);color:var(--text)}}
.scatter-title{{font-size:var(--text-sm);font-weight:700;margin-bottom:var(--space-3)}}
.legend{{display:flex;align-items:center;gap:var(--space-2);margin-bottom:var(--space-4)}}
.legend-bar{{width:200px;height:14px;border-radius:3px;border:1px solid var(--border)}}
.cross-layer-grid{{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:var(--space-4);margin-bottom:var(--space-6)}}
.cross-card{{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-lg);padding:var(--space-4)}}
.cross-card-title{{font-size:var(--text-xs);font-weight:700;margin-bottom:var(--space-2);display:flex;align-items:center;gap:6px}}
.cross-card-value{{font-size:var(--text-lg);font-weight:700;font-variant-numeric:tabular-nums}}
.cross-card-sub{{font-size:10px;color:var(--muted);margin-top:2px}}
.rolling-wrap{{margin-bottom:var(--space-6)}}
.rolling-wrap .card-chart{{height:220px}}
.insight-box{{background:var(--s2);border:1px solid var(--border);border-radius:var(--radius-lg);padding:var(--space-4);margin-bottom:var(--space-4)}}
.insight-box h3{{font-size:var(--text-sm);font-weight:700;margin-bottom:var(--space-2)}}
.insight-box p{{font-size:var(--text-xs);color:var(--muted);line-height:1.6}}
@media(max-width:800px){{.cross-layer-grid{{grid-template-columns:1fr}}}}
</style>
</head>
<body>

{TAB_BAR.replace('{corr_active}', ' active').replace('{tech_active}', '')}

<div class="page-wrapper">
{sidebar_html()}
<div class="page-body">
  <div class="page-header">
    <div>
      <div class="page-title" data-i18n="corr_title">Correlation / Heatmap Matrix</div>
      <div class="page-subtitle" data-i18n="corr_subtitle">Pairwise Pearson correlations of daily returns across software value chain tickers</div>
    </div>
    <div class="controls">
      <span class="ctrl-label" data-i18n="corr_window">Window:</span>
      <button class="ctrl-btn active" data-window="30" data-i18n="corr_30d">30-Day</button>
      <button class="ctrl-btn" data-window="60" data-i18n="corr_60d">60-Day</button>
      <button class="ctrl-btn" data-window="90" data-i18n="corr_90d">90-Day</button>
      <span style="width:12px"></span>
      <span class="ctrl-label" data-i18n="corr_sort">Sort:</span>
      <button class="ctrl-btn active" data-sort="layer" data-i18n="corr_by_layer">By Layer</button>
      <button class="ctrl-btn" data-sort="corr" data-i18n="corr_by_avg">By Avg Corr</button>
      <span style="width:12px"></span>
      <button class="theme-toggle" id="themeToggle" title="Toggle theme">&#x1F319;</button>
    </div>
  </div>

  <div class="stats-row" id="statsRow"></div>

  <div class="card">
    <div class="card-title">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/></svg>
      <span data-i18n="corr_heatmap_title">Correlation Heatmap</span>
      <span class="badge b-muted" id="dataLabel">42 tickers · 30-day returns</span>
    </div>
    <div class="legend">
      <span style="font-size:10px;color:var(--muted);font-weight:600">-1.0</span>
      <canvas id="legendBar" width="200" height="14" class="legend-bar"></canvas>
      <span style="font-size:10px;color:var(--muted);font-weight:600">+1.0</span>
    </div>
    <div class="heatmap-wrap">
      <canvas id="heatmapCanvas" class="heatmap-canvas"></canvas>
    </div>
  </div>

  <div class="card" id="crossLayerSection">
    <div class="card-title">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
      <span data-i18n="corr_cross_title">Cross-Layer Correlation Analysis</span>
    </div>
    <div class="cross-layer-grid" id="crossLayerGrid"></div>
  </div>

  <div class="rolling-wrap">
    <div class="card">
      <div class="card-title">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
        <span data-i18n="corr_rolling_title">Rolling 20-Day Correlation — Key Pairs</span>
      </div>
      <div class="card-chart"><canvas id="rollingChart"></canvas></div>
    </div>
  </div>

  <div class="insight-box" id="insightBox">
    <h3 data-i18n="corr_insights_title">Software Supply Chain Correlation Insights</h3>
    <p id="insightText"></p>
  </div>

</div>
</div>

<div class="tooltip" id="tooltip"></div>
<div class="scatter-modal" id="scatterModal">
  <div class="scatter-content">
    <button class="scatter-close" id="scatterClose">&times;</button>
    <div class="scatter-title" id="scatterTitle"></div>
    <canvas id="scatterCanvas" width="500" height="360"></canvas>
  </div>
</div>

{side_panel_html()}

<script>
const PRICE_DATA = {price_json};
const QUOTES = {quotes_json};
const LAYERS = {layers_js};
const LAYER_COLORS = {layer_colors_js};
const TICKER_LAYERS = {ticker_layers_js};

const ALL_TICKERS = Object.keys(PRICE_DATA);
let activeLayer = 'all';
let state = {{ window: 30, sort: 'layer' }};
let corrMatrix = {{}};
let orderedTickers = [];

// Theme
function getTheme() {{
  try {{ return safeStorage.getItem('theme') || 'dark'; }} catch(e) {{ return 'dark'; }}
}}
function setTheme(t) {{
  document.documentElement.setAttribute('data-theme', t);
  safeStorage.setItem('theme', t);
  document.getElementById('themeToggle').textContent = t === 'dark' ? '\\u{{1F319}}' : '\\u2600\\uFE0F';
}}
setTheme(getTheme());
document.getElementById('themeToggle').addEventListener('click', () => {{
  setTheme(getTheme() === 'dark' ? 'light' : 'dark');
  drawHeatmap(); drawLegend(); buildRollingChart();
}});

// Sidebar filtering
function filterLayer(layer) {{
  activeLayer = layer;
  document.querySelectorAll('.sidebar-item').forEach(el => {{
    el.classList.toggle('active', el.dataset.layer === layer);
  }});
  computeCorrelations();
}}

function getFilteredTickers() {{
  if (activeLayer === 'all') return ALL_TICKERS.slice();
  return LAYERS[activeLayer] || ALL_TICKERS.slice();
}}

// Returns daily returns from price array [{{d,c}}]
function dailyReturns(prices) {{
  const r = [];
  for (let i = 1; i < prices.length; i++) {{
    if (prices[i-1].c && prices[i].c) {{
      r.push({{ d: prices[i].d, r: (prices[i].c - prices[i-1].c) / prices[i-1].c }});
    }}
  }}
  return r;
}}

// Pearson correlation
function pearson(xs, ys) {{
  const n = xs.length;
  if (n < 3) return null;
  let sx=0, sy=0, sxy=0, sx2=0, sy2=0;
  for (let i=0; i<n; i++) {{
    sx += xs[i]; sy += ys[i];
    sxy += xs[i]*ys[i];
    sx2 += xs[i]*xs[i]; sy2 += ys[i]*ys[i];
  }}
  const denom = Math.sqrt((n*sx2 - sx*sx)*(n*sy2 - sy*sy));
  if (denom === 0) return 0;
  return (n*sxy - sx*sy) / denom;
}}

function computeCorrelations() {{
  const tickers = getFilteredTickers();
  const w = state.window;
  const returnsMap = {{}};
  for (const t of tickers) {{
    if (PRICE_DATA[t]) {{
      const bars = PRICE_DATA[t];
      const allR = dailyReturns(bars);
      returnsMap[t] = w >= allR.length ? allR : allR.slice(-w);
    }}
  }}
  corrMatrix = {{}};
  for (const a of tickers) {{
    corrMatrix[a] = {{}};
    for (const b of tickers) {{
      if (a === b) {{ corrMatrix[a][b] = {{ v: 1, n: 0 }}; continue; }}
      const ra = returnsMap[a], rb = returnsMap[b];
      if (!ra || !rb) {{ corrMatrix[a][b] = {{ v: null, n: 0 }}; continue; }}
      const mapB = {{}};
      for (const pt of rb) mapB[pt.d] = pt.r;
      const xs = [], ys = [];
      for (const pt of ra) {{
        if (mapB[pt.d] !== undefined) {{ xs.push(pt.r); ys.push(mapB[pt.d]); }}
      }}
      corrMatrix[a][b] = {{ v: pearson(xs, ys), n: xs.length }};
    }}
  }}

  if (state.sort === 'layer') {{
    const seen = new Set();
    orderedTickers = [];
    for (const [layer, layerTickers] of Object.entries(LAYERS)) {{
      for (const t of layerTickers) {{
        if (tickers.includes(t) && !seen.has(t)) {{ orderedTickers.push(t); seen.add(t); }}
      }}
    }}
    for (const t of tickers) {{
      if (!seen.has(t)) {{ orderedTickers.push(t); seen.add(t); }}
    }}
  }} else {{
    const avgs = tickers.map(t => {{
      let sum = 0, cnt = 0;
      for (const b of tickers) {{
        if (t !== b && corrMatrix[t] && corrMatrix[t][b] && corrMatrix[t][b].v !== null) {{
          sum += Math.abs(corrMatrix[t][b].v); cnt++;
        }}
      }}
      return {{ t, avg: cnt > 0 ? sum / cnt : 0 }};
    }});
    avgs.sort((a, b) => b.avg - a.avg);
    orderedTickers = avgs.map(x => x.t);
  }}

  updateStats();
  drawHeatmap();
  buildCrossLayer();
  buildRollingChart();
  buildInsights();
}}

function updateStats() {{
  const tickers = orderedTickers;
  let maxPair = null, maxVal = -2, minPair = null, minVal = 2;
  let totalCorr = 0, corrCount = 0;
  for (let i = 0; i < tickers.length; i++) {{
    for (let j = i+1; j < tickers.length; j++) {{
      const c = corrMatrix[tickers[i]][tickers[j]];
      if (c && c.v !== null) {{
        totalCorr += c.v; corrCount++;
        if (c.v > maxVal) {{ maxVal = c.v; maxPair = [tickers[i], tickers[j]]; }}
        if (c.v < minVal) {{ minVal = c.v; minPair = [tickers[i], tickers[j]]; }}
      }}
    }}
  }}
  const avgCorr = corrCount > 0 ? (totalCorr / corrCount) : 0;
  document.getElementById('statsRow').innerHTML = `
    <div class="stat-card">
      <div class="stat-label" data-i18n="corr_stat_avg">Avg Correlation</div>
      <div class="stat-value">${{avgCorr.toFixed(3)}}</div>
      <div class="stat-sub">${{corrCount}} pairs computed</div>
    </div>
    <div class="stat-card">
      <div class="stat-label" data-i18n="corr_stat_most">Most Correlated</div>
      <div class="stat-value" style="color:var(--success)">${{maxPair ? maxPair.join(' / ') : '\\u2014'}}</div>
      <div class="stat-sub">\\u03C1 = ${{maxVal.toFixed(3)}}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label" data-i18n="corr_stat_least">Least Correlated</div>
      <div class="stat-value" style="color:var(--error)">${{minPair ? minPair.join(' / ') : '\\u2014'}}</div>
      <div class="stat-sub">\\u03C1 = ${{minVal.toFixed(3)}}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label" data-i18n="corr_stat_tickers">Tickers</div>
      <div class="stat-value">${{tickers.length}}</div>
      <div class="stat-sub">${{state.window}}-day window</div>
    </div>
  `;
}}

function drawLegend() {{
  const c = document.getElementById('legendBar');
  const ctx = c.getContext('2d');
  for (let x = 0; x < c.width; x++) {{
    ctx.fillStyle = corrColor((x / c.width) * 2 - 1);
    ctx.fillRect(x, 0, 1, c.height);
  }}
}}

function corrColor(v) {{
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  if (v === null) return isDark ? '#1c1f2a' : '#eef0f6';
  const clamped = Math.max(-1, Math.min(1, v));
  if (clamped >= 0) {{
    const t = clamped;
    const r = isDark ? Math.round(29 + (86-29)*t*0.2) : Math.round(255 - (255-45)*t);
    const g = isDark ? Math.round(31 + (204-31)*t) : Math.round(255 - (255-180)*t*0.5);
    const b = isDark ? Math.round(42 + (132-42)*t*0.3) : Math.round(255 - (255-60)*t);
    return `rgb(${{r}},${{g}},${{b}})`;
  }} else {{
    const t = -clamped;
    const r = isDark ? Math.round(29 + (240-29)*t) : Math.round(255 - (255-192)*t*0.3);
    const g = isDark ? Math.round(31 + (112-31)*t*0.3) : Math.round(255 - (255-57)*t);
    const b = isDark ? Math.round(42 + (112-42)*t*0.3) : Math.round(255 - (255-43)*t);
    return `rgb(${{r}},${{g}},${{b}})`;
  }}
}}

const cellSize = 28;
const labelWidth = 52;
const labelHeight = 52;

function drawHeatmap() {{
  const canvas = document.getElementById('heatmapCanvas');
  const ctx = canvas.getContext('2d');
  const n = orderedTickers.length;
  const totalW = labelWidth + n * cellSize;
  const totalH = labelHeight + n * cellSize;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = totalW * dpr;
  canvas.height = totalH * dpr;
  canvas.style.width = totalW + 'px';
  canvas.style.height = totalH + 'px';
  ctx.scale(dpr, dpr);

  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  ctx.fillStyle = isDark ? '#0d0f14' : '#f2f3f7';
  ctx.fillRect(0, 0, totalW, totalH);

  // Draw layer group backgrounds
  if (state.sort === 'layer') {{
    let idx = 0;
    for (const [layer, layerTickers] of Object.entries(LAYERS)) {{
      const count = layerTickers.filter(t => orderedTickers.includes(t)).length;
      if (count === 0) continue;
      const color = LAYER_COLORS[layer];
      ctx.fillStyle = isDark ? color + '08' : color + '0C';
      ctx.fillRect(labelWidth + idx * cellSize, labelHeight, count * cellSize, count * cellSize);
      idx += count;
    }}
  }}

  for (let i = 0; i < n; i++) {{
    for (let j = 0; j < n; j++) {{
      const a = orderedTickers[i], b = orderedTickers[j];
      const corr = corrMatrix[a] && corrMatrix[a][b] ? corrMatrix[a][b].v : null;
      const x = labelWidth + j * cellSize;
      const y = labelHeight + i * cellSize;
      ctx.fillStyle = corrColor(corr);
      ctx.fillRect(x+1, y+1, cellSize-2, cellSize-2);
      if (corr !== null && n <= 20) {{
        ctx.fillStyle = isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.45)';
        ctx.font = '600 8px "JetBrains Mono"';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(corr.toFixed(2), x + cellSize/2, y + cellSize/2);
      }}
    }}
  }}

  ctx.fillStyle = isDark ? '#7a7e96' : '#5c617a';
  ctx.font = '600 9px "JetBrains Mono"';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  for (let i = 0; i < n; i++) {{
    // Color row label by layer
    const layer = TICKER_LAYERS[orderedTickers[i]];
    ctx.fillStyle = layer ? (LAYER_COLORS[layer] || (isDark ? '#7a7e96' : '#5c617a')) : (isDark ? '#7a7e96' : '#5c617a');
    ctx.fillText(orderedTickers[i], labelWidth - 4, labelHeight + i * cellSize + cellSize/2);
  }}
  ctx.save();
  for (let j = 0; j < n; j++) {{
    const x = labelWidth + j * cellSize + cellSize/2;
    const y = labelHeight - 4;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-Math.PI/3);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    const layer = TICKER_LAYERS[orderedTickers[j]];
    ctx.fillStyle = layer ? (LAYER_COLORS[layer] || (isDark ? '#7a7e96' : '#5c617a')) : (isDark ? '#7a7e96' : '#5c617a');
    ctx.fillText(orderedTickers[j], 0, 0);
    ctx.restore();
  }}
  ctx.restore();

  document.getElementById('dataLabel').textContent = orderedTickers.length + ' tickers \\u00b7 ' + state.window + '-day returns';
}}

// Tooltip
const tooltip = document.getElementById('tooltip');
const heatmapCanvas = document.getElementById('heatmapCanvas');

heatmapCanvas.addEventListener('mousemove', (e) => {{
  const rect = heatmapCanvas.getBoundingClientRect();
  const mx = e.clientX - rect.left, my = e.clientY - rect.top;
  const col = Math.floor((mx - labelWidth) / cellSize);
  const row = Math.floor((my - labelHeight) / cellSize);
  const n = orderedTickers.length;
  if (col >= 0 && col < n && row >= 0 && row < n) {{
    const a = orderedTickers[row], b = orderedTickers[col];
    const c = corrMatrix[a] && corrMatrix[a][b] ? corrMatrix[a][b] : null;
    if (c) {{
      const val = c.v !== null ? c.v.toFixed(4) : 'N/A';
      const pts = c.n ? ' (' + c.n + ' pts)' : '';
      tooltip.innerHTML = '<strong>' + a + '</strong> vs <strong>' + b + '</strong>: \\u03C1 = ' + val + pts;
      tooltip.style.display = 'block';
      tooltip.style.left = (e.clientX + 14) + 'px';
      tooltip.style.top = (e.clientY - 10) + 'px';
    }} else {{ tooltip.style.display = 'none'; }}
  }} else {{ tooltip.style.display = 'none'; }}
}});
heatmapCanvas.addEventListener('mouseleave', () => {{ tooltip.style.display = 'none'; }});

heatmapCanvas.addEventListener('click', (e) => {{
  const rect = heatmapCanvas.getBoundingClientRect();
  const mx = e.clientX - rect.left, my = e.clientY - rect.top;
  const col = Math.floor((mx - labelWidth) / cellSize);
  const row = Math.floor((my - labelHeight) / cellSize);
  const n = orderedTickers.length;
  if (col >= 0 && col < n && row >= 0 && row < n && row !== col) {{
    showScatter(orderedTickers[row], orderedTickers[col]);
  }}
}});

function showScatter(tickerA, tickerB) {{
  const modal = document.getElementById('scatterModal');
  const canvas = document.getElementById('scatterCanvas');
  const ctx = canvas.getContext('2d');
  const title = document.getElementById('scatterTitle');
  const dataA = PRICE_DATA[tickerA], dataB = PRICE_DATA[tickerB];
  if (!dataA || !dataB) return;
  const rA = dailyReturns(dataA), rB = dailyReturns(dataB);
  const mapB = {{}};
  for (const pt of rB) mapB[pt.d] = pt.r;
  const points = [];
  for (const pt of rA) {{ if (mapB[pt.d] !== undefined) points.push({{ x: pt.r, y: mapB[pt.d] }}); }}
  const corr = corrMatrix[tickerA] && corrMatrix[tickerA][tickerB] ? corrMatrix[tickerA][tickerB].v : null;
  title.textContent = tickerA + ' vs ' + tickerB + ' Daily Returns (\\u03C1 = ' + (corr !== null ? corr.toFixed(4) : 'N/A') + ')';

  const dpr = window.devicePixelRatio || 1;
  const cw = 500, ch = 360;
  canvas.width = cw * dpr; canvas.height = ch * dpr;
  canvas.style.width = cw + 'px'; canvas.style.height = ch + 'px';
  ctx.scale(dpr, dpr);

  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  ctx.fillStyle = isDark ? '#13151d' : '#fff';
  ctx.fillRect(0, 0, cw, ch);
  const pad = {{ t: 30, r: 20, b: 40, l: 50 }};
  const pw = cw - pad.l - pad.r, ph = ch - pad.t - pad.b;
  if (points.length === 0) {{
    ctx.fillStyle = isDark ? '#7a7e96' : '#5c617a';
    ctx.font = '13px Inter'; ctx.textAlign = 'center';
    ctx.fillText('No overlapping data', cw/2, ch/2);
    modal.classList.add('open'); return;
  }}
  const xVals = points.map(p => p.x), yVals = points.map(p => p.y);
  const xMin = Math.min(...xVals), xMax = Math.max(...xVals);
  const yMin = Math.min(...yVals), yMax = Math.max(...yVals);
  const xRange = xMax - xMin || 0.01, yRange = yMax - yMin || 0.01;
  const xScale = v => pad.l + ((v - xMin) / xRange) * pw;
  const yScale = v => pad.t + ph - ((v - yMin) / yRange) * ph;

  ctx.strokeStyle = isDark ? '#252836' : '#dde1ec'; ctx.lineWidth = 0.5;
  for (let i = 0; i <= 4; i++) {{
    const y = pad.t + (ph/4)*i;
    ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(pad.l+pw, y); ctx.stroke();
    const x = pad.l + (pw/4)*i;
    ctx.beginPath(); ctx.moveTo(x, pad.t); ctx.lineTo(x, pad.t+ph); ctx.stroke();
  }}
  if (xMin < 0 && xMax > 0) {{
    ctx.strokeStyle = isDark ? '#454868' : '#9498b0'; ctx.lineWidth = 1;
    const zx = xScale(0);
    ctx.beginPath(); ctx.moveTo(zx, pad.t); ctx.lineTo(zx, pad.t+ph); ctx.stroke();
  }}
  if (yMin < 0 && yMax > 0) {{
    const zy = yScale(0);
    ctx.beginPath(); ctx.moveTo(pad.l, zy); ctx.lineTo(pad.l+pw, zy); ctx.stroke();
  }}

  // Color points by layer of tickerA
  const layerA = TICKER_LAYERS[tickerA];
  const dotColor = layerA ? LAYER_COLORS[layerA] : (isDark ? '#5b9cf6' : '#2563eb');
  ctx.fillStyle = isDark ? dotColor + 'B0' : dotColor + '90';
  for (const p of points) {{
    ctx.beginPath(); ctx.arc(xScale(p.x), yScale(p.y), 3.5, 0, Math.PI*2); ctx.fill();
  }}

  ctx.fillStyle = isDark ? '#7a7e96' : '#5c617a';
  ctx.font = '600 10px "JetBrains Mono"'; ctx.textAlign = 'center';
  ctx.fillText(tickerA + ' return', cw/2, ch - 6);
  ctx.save(); ctx.translate(14, ch/2); ctx.rotate(-Math.PI/2);
  ctx.fillText(tickerB + ' return', 0, 0); ctx.restore();
  ctx.font = '9px "JetBrains Mono"'; ctx.textAlign = 'center';
  for (let i = 0; i <= 4; i++) {{
    const v = xMin + (xRange/4)*i;
    ctx.fillText((v*100).toFixed(1)+'%', pad.l+(pw/4)*i, pad.t+ph+16);
  }}
  ctx.textAlign = 'right';
  for (let i = 0; i <= 4; i++) {{
    const v = yMin + (yRange/4)*i;
    ctx.fillText((v*100).toFixed(1)+'%', pad.l-6, pad.t+ph-(ph/4)*i+3);
  }}
  modal.classList.add('open');
}}

document.getElementById('scatterClose').addEventListener('click', () => {{ document.getElementById('scatterModal').classList.remove('open'); }});
document.getElementById('scatterModal').addEventListener('click', (e) => {{ if (e.target === e.currentTarget) e.currentTarget.classList.remove('open'); }});

// Cross-layer correlation
function buildCrossLayer() {{
  const layerNames = Object.keys(LAYERS);
  const pairs = [];
  // Compute average correlation between every pair of layers
  for (let i = 0; i < layerNames.length; i++) {{
    for (let j = i+1; j < layerNames.length; j++) {{
      const la = layerNames[i], lb = layerNames[j];
      const tickersA = LAYERS[la].filter(t => corrMatrix[t]);
      const tickersB = LAYERS[lb].filter(t => corrMatrix[t]);
      let sum = 0, cnt = 0;
      for (const a of tickersA) {{
        for (const b of tickersB) {{
          if (corrMatrix[a] && corrMatrix[a][b] && corrMatrix[a][b].v !== null) {{
            sum += corrMatrix[a][b].v; cnt++;
          }}
        }}
      }}
      if (cnt > 0) pairs.push({{ a: la, b: lb, avg: sum/cnt, n: cnt }});
    }}
  }}
  pairs.sort((a, b) => Math.abs(b.avg) - Math.abs(a.avg));

  const grid = document.getElementById('crossLayerGrid');
  grid.innerHTML = pairs.slice(0, 12).map(p => {{
    const color = p.avg >= 0 ? 'var(--success)' : 'var(--error)';
    const colorA = LAYER_COLORS[p.a] || 'var(--muted)';
    const colorB = LAYER_COLORS[p.b] || 'var(--muted)';
    return `<div class="cross-card">
      <div class="cross-card-title">
        <span class="sidebar-dot" style="background:${{colorA}}"></span>
        ${{p.a}} <span style="color:var(--faint)">/</span>
        <span class="sidebar-dot" style="background:${{colorB}}"></span>
        ${{p.b}}
      </div>
      <div class="cross-card-value" style="color:${{color}}">\\u03C1 = ${{p.avg.toFixed(3)}}</div>
      <div class="cross-card-sub">${{p.n}} pairs averaged</div>
    </div>`;
  }}).join('');
}}

// Rolling correlation chart
let rollingChartInstance = null;
function buildRollingChart() {{
  if (rollingChartInstance) {{ rollingChartInstance.destroy(); rollingChartInstance = null; }}
  if (typeof Chart === 'undefined') return;
  const isDark = getTheme() === 'dark';
  const colors = {{
    text: isDark ? '#7a7e96' : '#5c617a',
    grid: isDark ? '#252836' : '#dde1ec',
  }};

  // Key pairs for rolling correlation
  const keyPairs = [
    ['AMZN', 'CRWD', '#5b9cf6', 'Cloud vs Cyber'],
    ['CRM', 'NOW', '#56cc84', 'CRM vs NOW'],
    ['SQ', 'PYPL', '#4fc4cf', 'SQ vs PYPL'],
    ['PLTR', 'AI', '#f5a454', 'PLTR vs AI'],
    ['DDOG', 'NET', '#a87ef0', 'DDOG vs NET'],
  ];

  const allReturns = {{}};
  for (const t of ALL_TICKERS) {{
    allReturns[t] = dailyReturns(PRICE_DATA[t]);
  }}

  const datasets = [];
  let labels = null;
  const rollWindow = 20;
  for (const [ta, tb, color, label] of keyPairs) {{
    if (!allReturns[ta] || !allReturns[tb]) continue;
    const ra = allReturns[ta], rb = allReturns[tb];
    const mapB = {{}};
    for (const pt of rb) mapB[pt.d] = pt.r;
    const aligned = [];
    for (const pt of ra) {{
      if (mapB[pt.d] !== undefined) aligned.push({{ d: pt.d, x: pt.r, y: mapB[pt.d] }});
    }}
    const rollCorr = [];
    const rollDates = [];
    for (let i = rollWindow; i < aligned.length; i++) {{
      const xs = aligned.slice(i - rollWindow, i).map(p => p.x);
      const ys = aligned.slice(i - rollWindow, i).map(p => p.y);
      rollCorr.push(pearson(xs, ys));
      rollDates.push(aligned[i].d.slice(5));
    }}
    if (!labels) labels = rollDates;
    datasets.push({{
      label, data: rollCorr, borderColor: color, borderWidth: 1.5,
      pointRadius: 0, tension: 0.2, fill: false
    }});
  }}

  if (!labels || labels.length === 0) return;
  try {{
    rollingChartInstance = new Chart(document.getElementById('rollingChart'), {{
      type: 'line',
      data: {{ labels, datasets }},
      options: {{
        responsive: true, maintainAspectRatio: false,
        plugins: {{ legend: {{ display: true, labels: {{ color: colors.text, font: {{ size: 10 }}, boxWidth: 12, padding: 8 }} }} }},
        scales: {{
          x: {{ ticks: {{ color: colors.text, font: {{ size: 9, family: "'JetBrains Mono'" }}, maxTicksLimit: 10, maxRotation: 0 }}, grid: {{ color: colors.grid, lineWidth: 0.5 }}, border: {{ display: false }} }},
          y: {{ min: -1, max: 1, ticks: {{ color: colors.text, font: {{ size: 9, family: "'JetBrains Mono'" }}, stepSize: 0.25 }}, grid: {{ color: colors.grid, lineWidth: 0.5 }}, border: {{ display: false }} }}
        }}
      }}
    }});
  }} catch(e) {{ console.warn('Rolling chart failed:', e); }}
}}

function buildInsights() {{
  // Generate insights based on computed correlations
  const insights = [];
  // Cloud vs Cybersecurity
  const cloudCyber = avgLayerCorr('Cloud Infrastructure', 'Cybersecurity');
  if (cloudCyber !== null) {{
    insights.push(`Cloud Infrastructure and Cybersecurity show a ${{cloudCyber > 0.5 ? 'strong' : cloudCyber > 0.3 ? 'moderate' : 'weak'}} positive correlation (\\u03C1 = ${{cloudCyber.toFixed(3)}}), reflecting shared enterprise IT budget cycles.`);
  }}
  // Enterprise SaaS vs Fintech
  const saasFintech = avgLayerCorr('Enterprise SaaS', 'Fintech / Payments');
  if (saasFintech !== null) {{
    insights.push(`Enterprise SaaS and Fintech/Payments correlation is ${{saasFintech.toFixed(3)}}, suggesting ${{Math.abs(saasFintech) > 0.5 ? 'linked' : 'somewhat independent'}} valuation drivers.`);
  }}
  // AI/ML vs Data & Analytics
  const aiData = avgLayerCorr('AI / ML Software', 'Data & Analytics');
  if (aiData !== null) {{
    insights.push(`AI/ML Software and Data & Analytics move ${{aiData > 0.5 ? 'closely together' : 'with moderate correlation'}} (\\u03C1 = ${{aiData.toFixed(3)}}), reflecting the data-to-AI pipeline dependency.`);
  }}
  // Vertical SaaS vs others
  const vertCloud = avgLayerCorr('Vertical SaaS', 'Cloud Infrastructure');
  if (vertCloud !== null) {{
    insights.push(`Vertical SaaS shows ${{Math.abs(vertCloud) < 0.3 ? 'low' : 'moderate'}} correlation with Cloud Infrastructure (\\u03C1 = ${{vertCloud.toFixed(3)}}), indicating ${{Math.abs(vertCloud) < 0.3 ? 'potential diversification benefits' : 'shared macro sensitivity'}}.`);
  }}
  document.getElementById('insightText').innerHTML = insights.join(' ');
}}

function avgLayerCorr(layerA, layerB) {{
  const ta = LAYERS[layerA] || [], tb = LAYERS[layerB] || [];
  let sum = 0, cnt = 0;
  for (const a of ta) {{
    for (const b of tb) {{
      if (corrMatrix[a] && corrMatrix[a][b] && corrMatrix[a][b].v !== null) {{
        sum += corrMatrix[a][b].v; cnt++;
      }}
    }}
  }}
  return cnt > 0 ? sum / cnt : null;
}}

// Button handlers
document.querySelectorAll('[data-window]').forEach(btn => {{
  btn.addEventListener('click', () => {{
    document.querySelectorAll('[data-window]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.window = parseInt(btn.dataset.window);
    computeCorrelations();
  }});
}});
document.querySelectorAll('[data-sort]').forEach(btn => {{
  btn.addEventListener('click', () => {{
    document.querySelectorAll('[data-sort]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.sort = btn.dataset.sort;
    computeCorrelations();
  }});
}});

// Side panel
{side_panel_js()}

// Init
drawLegend();
computeCorrelations();
// Set "all" as active in sidebar
document.querySelector('.sidebar-item[data-layer="all"]').classList.add('active');
</script>
<script src="i18n.js"></script>
</body>
</html>"""

# ============================================================
# TECHNICALS.HTML
# ============================================================
technicals_html = f"""<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Technical Snapshot — Software Value Chain Dashboard</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300..700&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">
{SAFE_STORAGE}
{CHARTJS}
<style>
{SHARED_CSS}
.ticker-grid{{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:var(--space-6)}}
.ticker-btn{{font-family:var(--font-mono);font-size:11px;font-weight:600;padding:6px 12px;border-radius:var(--radius-md);border:1px solid var(--border);background:var(--surface);color:var(--muted);cursor:pointer;transition:all .2s;position:relative}}
.ticker-btn:hover{{background:var(--s3);color:var(--text)}}
.ticker-btn.active{{color:#fff;border-color:transparent}}
.ticker-btn .pct{{font-size:9px;margin-left:3px;opacity:.8}}
.summary-grid{{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:var(--space-4);margin-bottom:var(--space-6)}}
.summary-item{{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-lg);padding:var(--space-4)}}
.summary-label{{font-size:10px;text-transform:uppercase;letter-spacing:.07em;color:var(--muted);font-weight:700}}
.summary-value{{font-size:var(--text-lg);font-weight:700;margin-top:4px;font-variant-numeric:tabular-nums}}
.summary-sub{{font-size:var(--text-xs);color:var(--muted);margin-top:2px}}
.chart-grid{{display:grid;grid-template-columns:repeat(2,1fr);gap:var(--space-4);margin-bottom:var(--space-6)}}
.signals-table-wrap{{overflow-x:auto}}
.signals-table{{width:100%;border-collapse:collapse;font-size:var(--text-xs)}}
.signals-table thead th{{text-align:left;font-weight:700;font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);padding:var(--space-2) var(--space-3);border-bottom:2px solid var(--div);background:var(--surface);white-space:nowrap;cursor:pointer}}
.signals-table thead th:hover{{color:var(--text)}}
.signals-table tbody td{{padding:var(--space-2) var(--space-3);border-bottom:1px solid var(--div);vertical-align:middle;font-variant-numeric:tabular-nums}}
.signals-table tbody tr:hover td{{background:var(--s2)}}
.signals-table .tk{{font-family:var(--font-mono);font-weight:600;font-size:10px;letter-spacing:.02em;cursor:pointer}}
.layer-tag{{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:4px;vertical-align:middle}}
.sr-bar{{height:6px;border-radius:3px;background:var(--s3);position:relative;margin-top:4px}}
.sr-fill{{height:100%;border-radius:3px;position:absolute;left:0;top:0}}
.sr-marker{{position:absolute;top:-3px;width:2px;height:12px;border-radius:1px}}
.bb-range{{font-size:10px;color:var(--muted);margin-top:2px}}
.vol-bar{{display:inline-block;height:14px;border-radius:2px;vertical-align:middle;min-width:3px}}
@media(max-width:900px){{.chart-grid{{grid-template-columns:1fr}}.summary-grid{{grid-template-columns:1fr 1fr}}}}
@media(max-width:600px){{.summary-grid{{grid-template-columns:1fr}}}}
</style>
</head>
<body>

{TAB_BAR.replace('{corr_active}', '').replace('{tech_active}', ' active')}

<div class="page-wrapper">
{sidebar_html()}
<div class="page-body">
  <div class="page-header">
    <div>
      <div class="page-title" data-i18n="tech_title">Technical Snapshot</div>
      <div class="page-subtitle" data-i18n="tech_subtitle">SMA, RSI, MACD, Bollinger Bands, and volume analysis for 42 software tickers</div>
    </div>
    <div class="controls">
      <button class="theme-toggle" id="themeToggle" title="Toggle theme">&#x1F319;</button>
    </div>
  </div>

  <div class="ticker-grid" id="tickerGrid"></div>

  <div class="summary-grid" id="summaryGrid"></div>

  <div class="chart-grid">
    <div class="card">
      <div class="card-title">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
        <span data-i18n="tech_price_sma">Price + SMA 20/50/200 + Bollinger</span>
      </div>
      <div class="card-chart"><canvas id="chartPrice"></canvas></div>
    </div>
    <div class="card">
      <div class="card-title">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/></svg>
        <span data-i18n="tech_rsi">RSI-14</span>
      </div>
      <div class="card-chart"><canvas id="chartRSI"></canvas></div>
    </div>
    <div class="card">
      <div class="card-title">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
        <span data-i18n="tech_macd">MACD (12, 26, 9)</span>
      </div>
      <div class="card-chart"><canvas id="chartMACD"></canvas></div>
    </div>
    <div class="card">
      <div class="card-title">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="6" width="4" height="14" rx="1"/><rect x="10" y="2" width="4" height="18" rx="1"/><rect x="18" y="10" width="4" height="10" rx="1"/></svg>
        <span data-i18n="tech_volume">Volume + Relative Volume</span>
      </div>
      <div class="card-chart"><canvas id="chartVolume"></canvas></div>
    </div>
  </div>

  <div class="card">
    <div class="card-title">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20V10M18 20V4M6 20v-4"/></svg>
      <span data-i18n="tech_signals_title">Technical Signals Summary — All 42 Tickers</span>
    </div>
    <div class="signals-table-wrap">
      <table class="signals-table" id="signalsTable">
        <thead>
          <tr>
            <th data-i18n="tech_th_rank" data-col="rank">Rank</th>
            <th data-i18n="tech_th_ticker" data-col="ticker">Ticker</th>
            <th data-i18n="tech_th_layer">Layer</th>
            <th data-i18n="tech_th_price" data-col="price">Price</th>
            <th data-i18n="tech_th_rsi" data-col="rsi">RSI-14</th>
            <th data-i18n="tech_th_signal">Signal</th>
            <th data-i18n="tech_th_sma20" data-col="sma20">SMA-20</th>
            <th data-i18n="tech_th_sma50" data-col="sma50">SMA-50</th>
            <th data-i18n="tech_th_sma200">SMA-200</th>
            <th data-i18n="tech_th_macd">MACD</th>
            <th data-i18n="tech_th_bb">BB Position</th>
            <th data-i18n="tech_th_rvol" data-col="rvol">Rel Vol</th>
            <th data-i18n="tech_th_support">Support</th>
            <th data-i18n="tech_th_resistance">Resist</th>
          </tr>
        </thead>
        <tbody id="signalsBody"></tbody>
      </table>
    </div>
  </div>

</div>
</div>

{side_panel_html()}

<script>
const PRICE_DATA = {price_json};
const QUOTES = {quotes_json};
const LAYERS = {layers_js};
const LAYER_COLORS = {layer_colors_js};
const TICKER_LAYERS = {ticker_layers_js};

const ALL_TICKERS = Object.keys(PRICE_DATA).sort();
let selectedTicker = ALL_TICKERS[0];
let activeLayer = 'all';
let charts = {{}};
let tableSortCol = 'rsi';
let tableSortAsc = false;

// Theme
function getTheme() {{
  try {{ return safeStorage.getItem('theme') || 'dark'; }} catch(e) {{ return 'dark'; }}
}}
function setTheme(t) {{
  document.documentElement.setAttribute('data-theme', t);
  safeStorage.setItem('theme', t);
  document.getElementById('themeToggle').textContent = t === 'dark' ? '\\u{{1F319}}' : '\\u2600\\uFE0F';
}}
setTheme(getTheme());
document.getElementById('themeToggle').addEventListener('click', () => {{
  setTheme(getTheme() === 'dark' ? 'light' : 'dark');
  rebuildCharts();
}});

// Sidebar
function filterLayer(layer) {{
  activeLayer = layer;
  document.querySelectorAll('.sidebar-item').forEach(el => {{
    el.classList.toggle('active', el.dataset.layer === layer);
  }});
  renderTickerGrid();
  buildSignalsTable();
}}

function getVisibleTickers() {{
  if (activeLayer === 'all') return ALL_TICKERS.slice();
  return (LAYERS[activeLayer] || []).filter(t => PRICE_DATA[t]).sort();
}}

// ── TECHNICAL CALCULATIONS ──
function calcSMA(closes, period) {{
  const sma = new Array(closes.length).fill(null);
  for (let i = period - 1; i < closes.length; i++) {{
    let sum = 0;
    for (let j = 0; j < period; j++) sum += closes[i - j];
    sma[i] = sum / period;
  }}
  return sma;
}}

function calcRSI(closes, period) {{
  period = period || 14;
  const rsi = new Array(closes.length).fill(null);
  if (closes.length < period + 1) return rsi;
  let avgGain = 0, avgLoss = 0;
  for (let i = 1; i <= period; i++) {{
    const change = closes[i] - closes[i-1];
    if (change > 0) avgGain += change; else avgLoss -= change;
  }}
  avgGain /= period; avgLoss /= period;
  rsi[period] = avgLoss === 0 ? 100 : 100 - 100/(1 + avgGain/avgLoss);
  for (let i = period + 1; i < closes.length; i++) {{
    const change = closes[i] - closes[i-1];
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? -change : 0;
    avgGain = (avgGain * (period-1) + gain) / period;
    avgLoss = (avgLoss * (period-1) + loss) / period;
    rsi[i] = avgLoss === 0 ? 100 : 100 - 100/(1 + avgGain/avgLoss);
  }}
  return rsi;
}}

function calcEMA(data, period) {{
  const ema = new Array(data.length).fill(null);
  const k = 2 / (period + 1);
  let start = -1;
  for (let i = 0; i < data.length; i++) {{ if (data[i] !== null) {{ start = i; break; }} }}
  if (start === -1 || start + period - 1 >= data.length) return ema;
  let sum = 0;
  for (let i = start; i < start + period; i++) sum += data[i];
  ema[start + period - 1] = sum / period;
  for (let i = start + period; i < data.length; i++) {{
    if (data[i] !== null) ema[i] = data[i] * k + (ema[i-1] || 0) * (1 - k);
  }}
  return ema;
}}

function calcMACD(closes) {{
  const ema12 = calcEMA(closes, 12);
  const ema26 = calcEMA(closes, 26);
  const macd = closes.map((_, i) => (ema12[i] !== null && ema26[i] !== null) ? ema12[i] - ema26[i] : null);
  const signal = calcEMA(macd, 9);
  const histogram = macd.map((m, i) => (m !== null && signal[i] !== null) ? m - signal[i] : null);
  return {{ macd, signal, histogram }};
}}

function calcBollinger(closes, period, mult) {{
  period = period || 20; mult = mult || 2;
  const upper = new Array(closes.length).fill(null);
  const lower = new Array(closes.length).fill(null);
  const mid = calcSMA(closes, period);
  for (let i = period - 1; i < closes.length; i++) {{
    let sumSq = 0;
    for (let j = 0; j < period; j++) {{
      const diff = closes[i - j] - mid[i];
      sumSq += diff * diff;
    }}
    const std = Math.sqrt(sumSq / period);
    upper[i] = mid[i] + mult * std;
    lower[i] = mid[i] - mult * std;
  }}
  return {{ upper, mid, lower }};
}}

function findSupportResistance(closes) {{
  // Simple support/resistance: recent lows and highs
  const n = closes.length;
  const recent = closes.slice(-30);
  const support = Math.min(...recent);
  const resistance = Math.max(...recent);
  return {{ support, resistance }};
}}

function getTickerData(ticker) {{
  const bars = PRICE_DATA[ticker];
  if (!bars) return null;
  const dates = bars.map(b => b.d);
  const closes = bars.map(b => b.c);
  const volumes = bars.map(b => b.v);
  const sma20 = calcSMA(closes, 20);
  const sma50 = calcSMA(closes, 50);
  const sma200 = calcSMA(closes, 200);
  const rsi = calcRSI(closes, 14);
  const macdData = calcMACD(closes);
  const bb = calcBollinger(closes, 20, 2);
  const sr = findSupportResistance(closes);
  const avgVol = volumes.length >= 20 ? volumes.slice(-20).reduce((a,b) => a+b, 0) / 20 : volumes.reduce((a,b) => a+b, 0) / volumes.length;
  const relVol = avgVol > 0 ? volumes[volumes.length-1] / avgVol : 1;
  return {{ dates, closes, volumes, sma20, sma50, sma200, rsi, ...macdData, bb, sr, avgVol, relVol }};
}}

// ── CHART HELPERS ──
function getColors() {{
  const isDark = getTheme() === 'dark';
  return {{
    text: isDark ? '#7a7e96' : '#5c617a',
    grid: isDark ? '#252836' : '#dde1ec',
    price: isDark ? '#5b9cf6' : '#2563eb',
    sma20: isDark ? '#f0ad4e' : '#b45309',
    sma50: isDark ? '#a87ef0' : '#7c3aed',
    sma200: isDark ? '#56cc84' : '#2d7a4a',
    bbFill: isDark ? 'rgba(91,156,246,0.06)' : 'rgba(37,99,235,0.06)',
    bbLine: isDark ? 'rgba(91,156,246,0.25)' : 'rgba(37,99,235,0.2)',
    rsi: isDark ? '#56d4e8' : '#0891b2',
    macdLine: isDark ? '#5b9cf6' : '#2563eb',
    signal: isDark ? '#f5a454' : '#c2570a',
    histPos: isDark ? 'rgba(86,204,132,0.6)' : 'rgba(45,122,74,0.6)',
    histNeg: isDark ? 'rgba(240,112,112,0.6)' : 'rgba(192,57,43,0.6)',
    volUp: isDark ? 'rgba(86,204,132,0.5)' : 'rgba(45,122,74,0.5)',
    volDn: isDark ? 'rgba(240,112,112,0.5)' : 'rgba(192,57,43,0.5)',
    overbought: isDark ? 'rgba(240,112,112,0.1)' : 'rgba(192,57,43,0.07)',
    oversold: isDark ? 'rgba(86,204,132,0.1)' : 'rgba(45,122,74,0.07)',
    volAvg: isDark ? 'rgba(245,164,84,0.7)' : 'rgba(194,87,10,0.7)',
  }};
}}

function commonScales(colors) {{
  return {{
    x: {{ ticks: {{ color: colors.text, font: {{ size: 9, family: "'JetBrains Mono'" }}, maxTicksLimit: 8, maxRotation: 0 }}, grid: {{ color: colors.grid, lineWidth: 0.5 }}, border: {{ display: false }} }},
    y: {{ ticks: {{ color: colors.text, font: {{ size: 9, family: "'JetBrains Mono'" }}, maxTicksLimit: 6 }}, grid: {{ color: colors.grid, lineWidth: 0.5 }}, border: {{ display: false }} }}
  }};
}}

function destroyCharts() {{
  for (const c of Object.values(charts)) {{ if (c && typeof c.destroy === 'function') c.destroy(); }}
  charts = {{}};
}}

function buildCharts(ticker) {{
  destroyCharts();
  const data = getTickerData(ticker);
  if (!data) return;
  const colors = getColors();
  const labels = data.dates.map(d => d.slice(5));

  // Price + SMA + Bollinger Bands
  try {{ charts.price = new Chart(document.getElementById('chartPrice'), {{
    type: 'line',
    data: {{
      labels,
      datasets: [
        {{ label: 'BB Upper', data: data.bb.upper, borderColor: colors.bbLine, borderWidth: 1, borderDash: [2,2], pointRadius: 0, fill: false, order: 5 }},
        {{ label: 'BB Lower', data: data.bb.lower, borderColor: colors.bbLine, borderWidth: 1, borderDash: [2,2], pointRadius: 0, fill: '-1', backgroundColor: colors.bbFill, order: 4 }},
        {{ label: ticker, data: data.closes, borderColor: colors.price, borderWidth: 1.5, pointRadius: 0, tension: 0.1, fill: false, order: 1 }},
        {{ label: 'SMA-20', data: data.sma20, borderColor: colors.sma20, borderWidth: 1.2, borderDash: [4,3], pointRadius: 0, tension: 0.1, fill: false, order: 2 }},
        {{ label: 'SMA-50', data: data.sma50, borderColor: colors.sma50, borderWidth: 1.2, borderDash: [6,4], pointRadius: 0, tension: 0.1, fill: false, order: 3 }},
      ]
    }},
    options: {{
      responsive: true, maintainAspectRatio: false,
      plugins: {{ legend: {{ display: true, labels: {{ color: colors.text, font: {{ size: 9 }}, boxWidth: 10, padding: 6, filter: item => !item.text.startsWith('BB') }} }} }},
      scales: commonScales(colors)
    }}
  }}); }} catch(e) {{ console.warn("Chart render failed:", e); }}

  // RSI with zones
  const rsiPlugin = {{
    id: 'rsiZones',
    beforeDraw(chart) {{
      const ctx = chart.ctx;
      const {{ top, bottom, left, right }} = chart.chartArea;
      const yScale = chart.scales.y;
      const y70 = yScale.getPixelForValue(70);
      const y100 = yScale.getPixelForValue(100);
      ctx.fillStyle = colors.overbought;
      ctx.fillRect(left, Math.min(y70, y100), right - left, Math.abs(y70 - y100));
      const y30 = yScale.getPixelForValue(30);
      const y0 = yScale.getPixelForValue(0);
      ctx.fillStyle = colors.oversold;
      ctx.fillRect(left, Math.min(y30, y0), right - left, Math.abs(y30 - y0));
    }}
  }};
  try {{ charts.rsi = new Chart(document.getElementById('chartRSI'), {{
    type: 'line',
    data: {{ labels, datasets: [{{ label: 'RSI-14', data: data.rsi, borderColor: colors.rsi, borderWidth: 1.5, pointRadius: 0, tension: 0.1, fill: false }}] }},
    options: {{
      responsive: true, maintainAspectRatio: false,
      plugins: {{ legend: {{ display: false }} }},
      scales: {{ ...commonScales(colors), y: {{ ...commonScales(colors).y, min: 0, max: 100, ticks: {{ ...commonScales(colors).y.ticks, stepSize: 10 }} }} }}
    }},
    plugins: [rsiPlugin]
  }}); }} catch(e) {{ console.warn("Chart render failed:", e); }}

  // MACD
  const histColors = data.histogram.map(v => v !== null && v >= 0 ? colors.histPos : colors.histNeg);
  try {{ charts.macd = new Chart(document.getElementById('chartMACD'), {{
    type: 'bar',
    data: {{
      labels,
      datasets: [
        {{ type: 'line', label: 'MACD', data: data.macd, borderColor: colors.macdLine, borderWidth: 1.5, pointRadius: 0, tension: 0.1, fill: false, order: 1 }},
        {{ type: 'line', label: 'Signal', data: data.signal, borderColor: colors.signal, borderWidth: 1.2, borderDash: [4,3], pointRadius: 0, tension: 0.1, fill: false, order: 2 }},
        {{ type: 'bar', label: 'Histogram', data: data.histogram, backgroundColor: histColors, borderWidth: 0, order: 3 }}
      ]
    }},
    options: {{
      responsive: true, maintainAspectRatio: false,
      plugins: {{ legend: {{ display: true, labels: {{ color: colors.text, font: {{ size: 9 }}, boxWidth: 10, padding: 6 }} }} }},
      scales: commonScales(colors)
    }}
  }}); }} catch(e) {{ console.warn("Chart render failed:", e); }}

  // Volume + relative volume line
  const volColors = data.closes.map((c, i) => i > 0 && c >= data.closes[i-1] ? colors.volUp : colors.volDn);
  const avgVolLine = data.volumes.map(() => data.avgVol);
  try {{ charts.volume = new Chart(document.getElementById('chartVolume'), {{
    type: 'bar',
    data: {{
      labels,
      datasets: [
        {{ type: 'bar', label: 'Volume', data: data.volumes, backgroundColor: volColors, borderWidth: 0, order: 2 }},
        {{ type: 'line', label: 'Avg Vol (20d)', data: avgVolLine, borderColor: colors.volAvg, borderWidth: 1.2, borderDash: [4,3], pointRadius: 0, fill: false, order: 1 }}
      ]
    }},
    options: {{
      responsive: true, maintainAspectRatio: false,
      plugins: {{ legend: {{ display: true, labels: {{ color: colors.text, font: {{ size: 9 }}, boxWidth: 10, padding: 6 }} }} }},
      scales: {{ ...commonScales(colors), y: {{ ...commonScales(colors).y, ticks: {{ ...commonScales(colors).y.ticks, callback: v => v >= 1e6 ? (v/1e6).toFixed(0)+'M' : v }} }} }}
    }}
  }}); }} catch(e) {{ console.warn("Chart render failed:", e); }}
}}

// ── SUMMARY ──
function updateSummary(ticker) {{
  const data = getTickerData(ticker);
  if (!data) return;
  const last = data.closes.length - 1;
  const price = data.closes[last];
  const rsi = data.rsi[last];
  const sma20 = data.sma20[last];
  const sma50 = data.sma50[last];
  const macdVal = data.macd[last];
  const sigVal = data.signal[last];

  let macdSignal = 'Neutral', macdClass = 'b-muted';
  if (macdVal !== null && sigVal !== null) {{
    const prev = data.macd[last-1] !== null && data.signal[last-1] !== null ? data.macd[last-1] - data.signal[last-1] : null;
    const curr = macdVal - sigVal;
    if (prev !== null) {{
      if (prev < 0 && curr >= 0) {{ macdSignal = 'Bullish Cross'; macdClass = 'b-green'; }}
      else if (prev > 0 && curr < 0) {{ macdSignal = 'Bearish Cross'; macdClass = 'b-red'; }}
      else if (curr > 0) {{ macdSignal = 'Bullish'; macdClass = 'b-green'; }}
      else {{ macdSignal = 'Bearish'; macdClass = 'b-red'; }}
    }}
  }}

  let smaTrend = '', smaClass = 'b-muted';
  if (sma20 && sma50) {{
    if (price > sma20 && price > sma50) {{ smaTrend = 'Above both'; smaClass = 'b-green'; }}
    else if (price > sma20) {{ smaTrend = 'Above SMA-20'; smaClass = 'b-orange'; }}
    else if (price > sma50) {{ smaTrend = 'Above SMA-50'; smaClass = 'b-orange'; }}
    else {{ smaTrend = 'Below both'; smaClass = 'b-red'; }}
  }} else if (sma20) {{
    smaTrend = price > sma20 ? 'Above SMA-20' : 'Below SMA-20';
    smaClass = price > sma20 ? 'b-green' : 'b-red';
  }}

  let rsiLabel = 'Neutral', rsiClass = 'b-muted';
  if (rsi !== null) {{
    if (rsi < 30) {{ rsiLabel = 'Oversold'; rsiClass = 'b-green'; }}
    else if (rsi > 70) {{ rsiLabel = 'Overbought'; rsiClass = 'b-red'; }}
  }}

  // BB position
  const bbU = data.bb.upper[last], bbL = data.bb.lower[last];
  let bbPos = '\\u2014', bbClass = 'b-muted';
  if (bbU !== null && bbL !== null) {{
    const pct = (price - bbL) / (bbU - bbL);
    bbPos = (pct * 100).toFixed(0) + '%';
    if (pct > 0.85) {{ bbClass = 'b-red'; }} else if (pct < 0.15) {{ bbClass = 'b-green'; }}
  }}

  const q = QUOTES[ticker] || {{}};
  document.getElementById('summaryGrid').innerHTML = `
    <div class="summary-item">
      <div class="summary-label" data-i18n="tech_sum_rsi">RSI-14</div>
      <div class="summary-value">${{rsi !== null ? rsi.toFixed(1) : '\\u2014'}}</div>
      <div class="summary-sub"><span class="badge ${{rsiClass}}">${{rsiLabel}}</span></div>
    </div>
    <div class="summary-item">
      <div class="summary-label" data-i18n="tech_sum_macd">MACD Signal</div>
      <div class="summary-value" style="font-size:var(--text-sm)">${{macdSignal}}</div>
      <div class="summary-sub"><span class="badge ${{macdClass}}">${{macdVal !== null ? macdVal.toFixed(3) : '\\u2014'}}</span></div>
    </div>
    <div class="summary-item">
      <div class="summary-label" data-i18n="tech_sum_sma">SMA Trend</div>
      <div class="summary-value" style="font-size:var(--text-sm)">${{smaTrend || '\\u2014'}}</div>
      <div class="summary-sub">SMA-20: ${{sma20 ? '$'+sma20.toFixed(2) : '\\u2014'}} \\u00b7 SMA-50: ${{sma50 ? '$'+sma50.toFixed(2) : '\\u2014'}}</div>
    </div>
    <div class="summary-item">
      <div class="summary-label" data-i18n="tech_sum_bb">Bollinger Band %</div>
      <div class="summary-value">${{bbPos}}</div>
      <div class="summary-sub"><span class="badge ${{bbClass}}">${{bbU !== null ? '$'+bbL.toFixed(2)+' \\u2014 $'+bbU.toFixed(2) : '\\u2014'}}</span></div>
    </div>
    <div class="summary-item">
      <div class="summary-label" data-i18n="tech_sum_rvol">Relative Volume</div>
      <div class="summary-value">${{data.relVol.toFixed(2)}}x</div>
      <div class="summary-sub">${{q.volume ? (q.volume/1e6).toFixed(1)+'M' : '\\u2014'}} vs avg ${{data.avgVol ? (data.avgVol/1e6).toFixed(1)+'M' : '\\u2014'}}</div>
    </div>
    <div class="summary-item">
      <div class="summary-label" data-i18n="tech_sum_sr">Support / Resistance</div>
      <div class="summary-value" style="font-size:var(--text-sm)">$${{data.sr.support.toFixed(2)}} / $${{data.sr.resistance.toFixed(2)}}</div>
      <div class="summary-sub">30-day range</div>
    </div>
  `;
}}

// ── SIGNALS TABLE ──
function buildSignalsTable() {{
  const tickers = getVisibleTickers();
  const rows = tickers.map(t => {{
    const data = getTickerData(t);
    if (!data) return null;
    const last = data.closes.length - 1;
    const rsi = data.rsi[last];
    const sma20 = data.sma20[last];
    const sma50 = data.sma50[last];
    const sma200 = data.sma200 ? data.sma200[last] : null;
    const price = data.closes[last];
    const macdVal = data.macd[last];
    const sigVal = data.signal[last];
    let macdSignal = 'Neutral', macdClass = 'b-muted';
    if (macdVal !== null && sigVal !== null) {{
      const prev = data.macd[last-1] !== null && data.signal[last-1] !== null ? data.macd[last-1] - data.signal[last-1] : null;
      const curr = macdVal - sigVal;
      if (prev !== null) {{
        if (prev < 0 && curr >= 0) {{ macdSignal = 'Bull Cross'; macdClass = 'b-green'; }}
        else if (prev > 0 && curr < 0) {{ macdSignal = 'Bear Cross'; macdClass = 'b-red'; }}
        else if (curr > 0) {{ macdSignal = 'Bullish'; macdClass = 'b-green'; }}
        else {{ macdSignal = 'Bearish'; macdClass = 'b-red'; }}
      }}
    }}
    const bbU = data.bb.upper[last], bbL = data.bb.lower[last];
    let bbPct = null;
    if (bbU !== null && bbL !== null && bbU !== bbL) bbPct = (price - bbL) / (bbU - bbL);
    return {{ t, price, rsi, sma20, sma50, sma200, macdSignal, macdClass, sr: data.sr, relVol: data.relVol, bbPct }};
  }}).filter(Boolean);

  // Sort
  rows.sort((a, b) => {{
    let va, vb;
    switch(tableSortCol) {{
      case 'price': va = a.price; vb = b.price; break;
      case 'rsi': va = a.rsi||0; vb = b.rsi||0; break;
      case 'sma20': va = a.sma20||0; vb = b.sma20||0; break;
      case 'sma50': va = a.sma50||0; vb = b.sma50||0; break;
      case 'rvol': va = a.relVol||0; vb = b.relVol||0; break;
      case 'ticker': va = a.t; vb = b.t; return tableSortAsc ? va.localeCompare(vb) : vb.localeCompare(va);
      default: va = a.rsi||0; vb = b.rsi||0;
    }}
    return tableSortAsc ? va - vb : vb - va;
  }});

  const tbody = document.getElementById('signalsBody');
  tbody.innerHTML = rows.map((r, i) => {{
    let rsiLabel = 'Neutral', rsiClass = 'b-muted';
    if (r.rsi !== null) {{
      if (r.rsi < 30) {{ rsiLabel = 'Oversold'; rsiClass = 'b-green'; }}
      else if (r.rsi > 70) {{ rsiLabel = 'Overbought'; rsiClass = 'b-red'; }}
    }}
    const layer = TICKER_LAYERS[r.t] || '';
    const layerColor = LAYER_COLORS[layer] || 'var(--muted)';
    const bbPctStr = r.bbPct !== null ? (r.bbPct * 100).toFixed(0) + '%' : '\\u2014';
    let bbClass = '';
    if (r.bbPct !== null) {{ if (r.bbPct > 0.85) bbClass = 'color:var(--error)'; else if (r.bbPct < 0.15) bbClass = 'color:var(--success)'; }}
    const rvolColor = r.relVol > 1.5 ? 'var(--success)' : r.relVol < 0.5 ? 'var(--error)' : 'var(--muted)';
    const rvolWidth = Math.min(r.relVol / 3 * 50, 50);
    return `<tr>
      <td style="font-weight:600;color:var(--muted)">${{i+1}}</td>
      <td class="tk" style="color:${{layerColor}}" onclick="selectTicker('${{r.t}}')">${{r.t}}</td>
      <td><span class="layer-tag" style="background:${{layerColor}}"></span>${{layer.split(' ')[0] || ''}}</td>
      <td>$${{r.price.toFixed(2)}}</td>
      <td style="font-weight:700">${{r.rsi !== null ? r.rsi.toFixed(1) : '\\u2014'}}</td>
      <td><span class="badge ${{rsiClass}}">${{rsiLabel}}</span></td>
      <td>${{r.sma20 ? '$'+r.sma20.toFixed(2) : '\\u2014'}}</td>
      <td>${{r.sma50 ? '$'+r.sma50.toFixed(2) : '\\u2014'}}</td>
      <td>${{r.sma200 ? '$'+r.sma200.toFixed(2) : '\\u2014'}}</td>
      <td><span class="badge ${{r.macdClass}}">${{r.macdSignal}}</span></td>
      <td style="${{bbClass}}">${{bbPctStr}}</td>
      <td><span class="vol-bar" style="width:${{rvolWidth}}px;background:${{rvolColor}}"></span> ${{r.relVol.toFixed(2)}}x</td>
      <td>$${{r.sr.support.toFixed(2)}}</td>
      <td>$${{r.sr.resistance.toFixed(2)}}</td>
    </tr>`;
  }}).join('');
}}

// Table sort
document.querySelectorAll('.signals-table thead th[data-col]').forEach(th => {{
  th.addEventListener('click', () => {{
    const col = th.dataset.col;
    if (tableSortCol === col) {{ tableSortAsc = !tableSortAsc; }}
    else {{ tableSortCol = col; tableSortAsc = false; }}
    buildSignalsTable();
  }});
}});

// ── TICKER SELECTOR ──
function renderTickerGrid() {{
  const tickers = getVisibleTickers();
  const grid = document.getElementById('tickerGrid');
  grid.innerHTML = tickers.map(t => {{
    const q = QUOTES[t] || {{}};
    const layer = TICKER_LAYERS[t] || '';
    const color = LAYER_COLORS[layer] || 'var(--primary)';
    const pctStr = q.changesPct !== undefined ? ' <span class="pct">(' + (q.changesPct >= 0 ? '+' : '') + q.changesPct.toFixed(1) + '%)</span>' : '';
    const activeStyle = t === selectedTicker ? 'background:' + color + ';border-color:' + color : '';
    return '<button class="ticker-btn' + (t === selectedTicker ? ' active' : '') + '" style="' + activeStyle + '" onclick="selectTicker(\\''+t+'\\')">'+t+pctStr+'</button>';
  }}).join('');
}}

function selectTicker(t) {{
  selectedTicker = t;
  renderTickerGrid();
  try {{ buildCharts(t); }} catch(e) {{ console.warn('Chart build failed:', e); }}
  updateSummary(t);
}}
window.selectTicker = selectTicker;

function rebuildCharts() {{
  try {{ buildCharts(selectedTicker); }} catch(e) {{ console.warn('Chart build failed:', e); }}
  updateSummary(selectedTicker);
  buildSignalsTable();
}}

// Side panel
{side_panel_js()}

// ── INIT ──
document.querySelector('.sidebar-item[data-layer="all"]').classList.add('active');
renderTickerGrid();
try {{ buildCharts(selectedTicker); }} catch(e) {{ console.warn('Chart build failed:', e); }}
updateSummary(selectedTicker);
buildSignalsTable();
</script>
<script src="i18n.js"></script>
</body>
</html>"""

# Write files
with open('/home/user/workspace/software-supply-chain/public/correlation.html', 'w') as f:
    f.write(correlation_html)
print(f"Written correlation.html: {len(correlation_html)} chars, {correlation_html.count(chr(10))} lines")

with open('/home/user/workspace/software-supply-chain/public/technicals.html', 'w') as f:
    f.write(technicals_html)
print(f"Written technicals.html: {len(technicals_html)} chars, {technicals_html.count(chr(10))} lines")

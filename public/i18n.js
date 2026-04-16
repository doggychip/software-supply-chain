/* ========================================
   Software Supply Chain Dashboard — i18n System
   ======================================== */
var i18nStorage = (typeof safeStorage !== 'undefined') ? safeStorage : {
  _s: {},
  getItem: function(k) { return this._s[k] || null; },
  setItem: function(k, v) { this._s[k] = v; },

  // ── Cross-Dashboard Nav ──
  "AI Hardware":            { zh: "AI硬件" },
  "Software Stack":         { zh: "软件生态" },
};

var I18N_LANG = i18nStorage.getItem('lang') || 'en';

var I18N = {
  // ── Tab Bar ──
  "Main Dashboard":       { zh: "主控面板" },
  "Correlation":          { zh: "相关性分析" },
  "Technicals":           { zh: "技术分析" },
  "Insider Activity":     { zh: "内部交易" },
  "Options Flow":         { zh: "期权动向" },
  "Sentiment":            { zh: "市场情绪" },
  "Leaderboard":          { zh: "排行榜" },
  "Stress Test":          { zh: "压力测试" },

  // ── Page Titles ──
  "Software Stack — Complete Value Chain Research": { zh: "软件生态 — 完整价值链研究" },
  "Performance Leaderboard":        { zh: "绩效排行榜" },
  "Scenario / Stress Test":         { zh: "情景 / 压力测试" },
  "Market Sentiment Dashboard":     { zh: "市场情绪面板" },
  "Options Flow & Unusual Activity": { zh: "期权动向 & 异常活动" },
  "Options Flow &amp; Unusual Activity": { zh: "期权动向 & 异常活动" },
  "Insider & Institutional Activity": { zh: "内部 & 机构交易活动" },
  "Insider &amp; Institutional Activity": { zh: "内部 & 机构交易活动" },
  "Correlation Matrix & Cross-Layer Analysis": { zh: "相关性矩阵 & 跨层分析" },
  "Technical Analysis Dashboard": { zh: "技术分析面板" },

  // ── Layer Names ──
  "Cloud Infrastructure":     { zh: "云基础设施" },
  "Cloud Infra":               { zh: "云基础设施" },
  "Cybersecurity":             { zh: "网络安全" },
  "Data & Analytics":          { zh: "数据 & 分析" },
  "Data &amp; Analytics":      { zh: "数据 & 分析" },
  "Observability & DevOps":    { zh: "可观测性 & DevOps" },
  "Observability &amp; DevOps": { zh: "可观测性 & DevOps" },
  "Enterprise SaaS":           { zh: "企业级SaaS" },
  "AI / ML Software":          { zh: "AI / ML 软件" },
  "AI/ML Software":            { zh: "AI / ML 软件" },
  "Vertical SaaS":             { zh: "垂直SaaS" },
  "Fintech / Payments":        { zh: "金融科技 / 支付" },
  "Fintech/Payments":          { zh: "金融科技 / 支付" },
  "AdTech / MarTech":          { zh: "广告技术 / 营销技术" },
  "AdTech/MarTech":            { zh: "广告技术 / 营销技术" },
  "Communication Platforms":   { zh: "通信平台" },
  "Identity & Access":         { zh: "身份 & 访问管理" },
  "Identity &amp; Access":     { zh: "身份 & 访问管理" },
  "Internet / Social":         { zh: "互联网 / 社交" },
  "Internet/Social":           { zh: "互联网 / 社交" },

  // ── Section Titles ──
  "Overview":                  { zh: "概览" },
  "Macro Dashboard":           { zh: "宏观面板" },
  "Value Chain Map":           { zh: "价值链地图" },
  "Software Bottleneck Radar": { zh: "软件瓶颈雷达" },
  "Bottleneck Radar":          { zh: "瓶颈雷达" },
  "Conviction List":           { zh: "信仰清单" },
  "Earnings Calendar":         { zh: "财报日历" },
  "Valuation Table":           { zh: "估值表" },
  "Risk Tracker":              { zh: "风险追踪" },
  "Portfolio Simulator":       { zh: "投资组合模拟器" },
  "Allocation":                { zh: "配置" },
  "Results":                   { zh: "结果" },

  // ── Sidebar Labels ──
  "Software Layers":           { zh: "软件层" },
  "Application Layer":         { zh: "应用层" },
  "Platform Layer":            { zh: "平台层" },
  "Infrastructure Layer":      { zh: "基础设施层" },
  "Features":                  { zh: "功能" },
  "Analysis":                  { zh: "分析" },

  // ── KPI Labels ──
  "Cloud Spend 2031":          { zh: "2031年云支出" },
  "Cybersec Spend 2026":       { zh: "2026年网安支出" },
  "SaaS Market 2026":          { zh: "2026年SaaS市场" },
  "AI Software 2026":          { zh: "2026年AI软件" },
  "Median NRR":                { zh: "中位数NRR" },
  "Rule of 40":                { zh: "40法则" },
  "Market Cap":                { zh: "市值" },
  "P/E Ratio":                 { zh: "市盈率" },
  "EPS":                       { zh: "每股收益" },
  "Volume":                    { zh: "成交量" },
  "Avg Volume":                { zh: "平均成交量" },
  "Day Range":                 { zh: "日内区间" },
  "52W Range":                 { zh: "52周区间" },
  "52-Week Range":             { zh: "52周区间" },
  "Div Yield":                 { zh: "股息率" },
  "Dividend Yield":            { zh: "股息率" },
  "Previous Close":            { zh: "前收盘价" },
  "Price":                     { zh: "价格" },
  "Change":                    { zh: "涨跌" },
  "Change %":                  { zh: "涨跌幅" },
  "Year Low":                  { zh: "52周最低" },
  "Year High":                 { zh: "52周最高" },

  // ── Conviction Tiers ──
  "Tier 1 — High Conviction":       { zh: "第一梯队 — 高确信度" },
  "Tier 2 — Growth + Value":        { zh: "第二梯队 — 成长 + 价值" },
  "Tier 3 — Speculative Upside":    { zh: "第三梯队 — 投机上行" },
  "Avoid / Caution":                { zh: "回避 / 谨慎" },
  "High Conviction":                { zh: "高确信度" },
  "Growth + Value":                 { zh: "成长 + 价值" },
  "Speculative Upside":             { zh: "投机上行" },
  "Score":                          { zh: "评分" },
  "Thesis":                         { zh: "投资逻辑" },
  "Signals":                        { zh: "信号" },

  // ── Bottleneck Labels ──
  "AI Talent Shortage":             { zh: "AI人才短缺" },
  "Cloud Margin Pressure":          { zh: "云利润率压力" },
  "Cybersecurity Skills Gap":       { zh: "网安技能缺口" },
  "Data Gravity Lock-in":           { zh: "数据引力锁定" },
  "SaaS Consolidation Pressure":    { zh: "SaaS整合压力" },
  "Critical":                       { zh: "严重" },
  "High":                           { zh: "高" },
  "Medium":                         { zh: "中等" },
  "Low":                            { zh: "低" },
  "Healthy":                        { zh: "健康" },
  "Moderate":                       { zh: "适中" },
  "Elevated":                       { zh: "偏高" },
  "Severe":                         { zh: "严重" },

  // ── Risk Labels ──
  "AI Disruption":                  { zh: "AI颠覆风险" },
  "Rate Shock":                     { zh: "利率冲击" },
  "Churn Spike":                    { zh: "流失率飙升" },
  "Cloud Commoditization":          { zh: "云商品化" },
  "Regulatory Crackdown":           { zh: "监管收紧" },
  "Impact":                         { zh: "影响" },
  "Probability":                    { zh: "概率" },
  "Affected Layers":                { zh: "受影响层" },
  "Affected Tickers":               { zh: "受影响标的" },

  // ── Table Headers ──
  "Ticker":                         { zh: "代码" },
  "Company":                        { zh: "公司" },
  "Layer":                          { zh: "层" },
  "Return":                         { zh: "回报" },
  "Rank":                           { zh: "排名" },
  "1D":                             { zh: "1日" },
  "1W":                             { zh: "1周" },
  "1M":                             { zh: "1月" },
  "3M":                             { zh: "3月" },
  "6M":                             { zh: "6月" },
  "YTD":                            { zh: "年初至今" },
  "Signal":                         { zh: "信号" },
  "Direction":                      { zh: "方向" },
  "Buy":                            { zh: "买入" },
  "Sell":                           { zh: "卖出" },
  "Hold":                           { zh: "持有" },
  "Strong Buy":                     { zh: "强烈买入" },
  "Strong Sell":                    { zh: "强烈卖出" },
  "Bullish":                        { zh: "看多" },
  "Bearish":                        { zh: "看空" },
  "Neutral":                        { zh: "中性" },

  // ── Technicals ──
  "SMA 20":                         { zh: "20日均线" },
  "SMA 50":                         { zh: "50日均线" },
  "SMA 200":                        { zh: "200日均线" },
  "RSI":                            { zh: "相对强弱指标" },
  "MACD":                           { zh: "MACD" },
  "Bollinger Bands":                { zh: "布林带" },
  "Support":                        { zh: "支撑位" },
  "Resistance":                     { zh: "阻力位" },
  "Overbought":                     { zh: "超买" },
  "Oversold":                       { zh: "超卖" },
  "Moving Averages":                { zh: "移动平均" },
  "Volume Analysis":                { zh: "成交量分析" },
  "Technical Signals":              { zh: "技术信号" },

  // ── Correlation ──
  "Correlation Matrix":             { zh: "相关性矩阵" },
  "Cross-Layer Correlation":        { zh: "跨层相关性" },
  "Rolling Correlation":            { zh: "滚动相关性" },
  "Highly Correlated":              { zh: "高度相关" },
  "Low Correlation":                { zh: "低相关性" },
  "Negative Correlation":           { zh: "负相关" },

  // ── Insider ──
  "Recent Transactions":            { zh: "近期交易" },
  "Buy/Sell Ratio":                 { zh: "买卖比" },
  "Notable Moves":                  { zh: "重要动态" },
  "Cluster Detection":              { zh: "聚集检测" },
  "Total Buys":                     { zh: "总买入" },
  "Total Sells":                    { zh: "总卖出" },
  "Net Activity":                   { zh: "净活动" },
  "Insider":                        { zh: "内部人" },
  "Title":                          { zh: "职位" },
  "Type":                           { zh: "类型" },
  "Shares":                         { zh: "股数" },
  "Value":                          { zh: "价值" },
  "Date":                           { zh: "日期" },

  // ── Options ──
  "Total Premium":                  { zh: "总权利金" },
  "Put/Call Ratio":                 { zh: "看跌/看涨比" },
  "Unusual Activity":               { zh: "异常活动" },
  "Most Active":                    { zh: "最活跃" },
  "Block Trades":                   { zh: "大宗交易" },
  "Gamma Exposure":                 { zh: "Gamma暴露" },
  "Max Pain":                       { zh: "最大痛苦值" },
  "Call":                           { zh: "看涨" },
  "Put":                            { zh: "看跌" },
  "Strike":                         { zh: "行权价" },
  "Expiry":                         { zh: "到期日" },
  "Premium":                        { zh: "权利金" },
  "OI":                             { zh: "未平仓量" },

  // ── Sentiment ──
  "Overall Sentiment":              { zh: "整体情绪" },
  "Sentiment by Layer":             { zh: "各层情绪" },
  "Social Media":                   { zh: "社交媒体" },
  "Analyst Ratings":                { zh: "分析师评级" },
  "Sentiment Momentum":             { zh: "情绪动量" },
  "News Sentiment":                 { zh: "新闻情绪" },
  "Improving":                      { zh: "改善中" },
  "Deteriorating":                  { zh: "恶化中" },
  "Stable":                         { zh: "稳定" },
  "Reddit":                         { zh: "Reddit" },
  "Twitter / X":                    { zh: "Twitter / X" },
  "StockTwits":                     { zh: "StockTwits" },

  // ── Leaderboard ──
  "Top Gainers":                    { zh: "涨幅榜" },
  "Top Losers":                     { zh: "跌幅榜" },
  "Volume Leaders":                 { zh: "成交量领先" },
  "Momentum Rankings":              { zh: "动量排名" },
  "Layer Performance":              { zh: "各层表现" },
  "Market Cap Leaders":             { zh: "市值排行" },
  "Relative Strength":              { zh: "相对强弱" },

  // ── Stress Test ──
  "AI Disruption Scenario":         { zh: "AI颠覆情景" },
  "Rate Shock Scenario":            { zh: "利率冲击情景" },
  "Churn Spike Scenario":           { zh: "流失率飙升情景" },
  "Cloud Commoditization Scenario": { zh: "云商品化情景" },
  "Regulatory Crackdown Scenario":  { zh: "监管收紧情景" },
  "Impact Matrix":                  { zh: "影响矩阵" },
  "Projected Impact":               { zh: "预计影响" },
  "Before":                         { zh: "之前" },
  "After":                          { zh: "之后" },
  "Portfolio Impact":               { zh: "投资组合影响" },
  "Select Scenario":                { zh: "选择情景" },
  "Run Stress Test":                { zh: "运行压力测试" },
  "Winners":                        { zh: "赢家" },
  "Losers":                         { zh: "输家" },

  // ── Common UI ──
  "Loading...":                     { zh: "加载中..." },
  "No data":                        { zh: "无数据" },
  "Search":                         { zh: "搜索" },
  "Filter":                         { zh: "筛选" },
  "Sort":                           { zh: "排序" },
  "All Layers":                     { zh: "所有层" },
  "All":                            { zh: "全部" },
  "Apply":                          { zh: "应用" },
  "Reset":                          { zh: "重置" },
  "Close":                          { zh: "关闭" },
  "Details":                        { zh: "详情" },
  "View on Yahoo Finance":          { zh: "在Yahoo Finance查看" },
  "View on Perplexity Finance":     { zh: "在Perplexity Finance查看" },
  "Open in Perplexity":             { zh: "在Perplexity中打开" },
  "LIVE":                           { zh: "实时" },
  "Apr 2026":                       { zh: "2026年4月" },
  "Full Ecosystem Research":        { zh: "完整生态系统研究" },
  "Software Value Chain":           { zh: "软件价值链" },
  "Full Ecosystem Research · Apr 2026": { zh: "完整生态系统研究 · 2026年4月" },

  // ── Portfolio Simulator ──
  "Initial Capital":                { zh: "初始资金" },
  "Total Allocation":               { zh: "总配置" },
  "Calculate":                      { zh: "计算" },
  "Projected Returns":              { zh: "预计回报" },
  "Equal Weight":                   { zh: "等权重" },

  // ── Company Names ──
  "Amazon.com, Inc.":               { zh: "亚马逊" },
  "Microsoft Corporation":          { zh: "微软" },
  "Alphabet Inc.":                  { zh: "谷歌母公司" },
  "Oracle Corporation":             { zh: "甲骨文" },
  "CrowdStrike Holdings, Inc.":     { zh: "CrowdStrike" },
  "Palo Alto Networks, Inc.":       { zh: "帕洛阿尔托网络" },
  "Zscaler, Inc.":                  { zh: "Zscaler" },
  "Fortinet, Inc.":                 { zh: "飞塔" },
  "SentinelOne, Inc.":              { zh: "SentinelOne" },
  "Snowflake Inc.":                 { zh: "Snowflake" },
  "MongoDB, Inc.":                  { zh: "MongoDB" },
  "Confluent, Inc.":                { zh: "Confluent" },
  "Elastic N.V.":                   { zh: "Elastic" },
  "Datadog, Inc.":                  { zh: "Datadog" },
  "Dynatrace, Inc.":                { zh: "Dynatrace" },
  "GitLab Inc.":                    { zh: "GitLab" },
  "Cloudflare, Inc.":               { zh: "Cloudflare" },
  "Salesforce, Inc.":               { zh: "Salesforce" },
  "ServiceNow, Inc.":               { zh: "ServiceNow" },
  "Workday, Inc.":                  { zh: "Workday" },
  "Atlassian Corporation":          { zh: "Atlassian" },
  "Palantir Technologies Inc.":     { zh: "Palantir" },
  "C3.ai, Inc.":                    { zh: "C3.ai" },
  "UiPath Inc.":                    { zh: "UiPath" },
  "Duolingo, Inc.":                 { zh: "多邻国" },
  "Veeva Systems Inc.":             { zh: "Veeva Systems" },
  "Procore Technologies, Inc.":     { zh: "Procore" },
  "BILL Holdings, Inc.":            { zh: "BILL" },
  "Toast, Inc.":                    { zh: "Toast" },
  "Block, Inc.":                    { zh: "Block (Square)" },
  "PayPal Holdings, Inc.":          { zh: "PayPal" },
  "Affirm Holdings, Inc.":          { zh: "Affirm" },
  "The Trade Desk, Inc.":           { zh: "The Trade Desk" },
  "Zeta Global Holdings Corp.":     { zh: "Zeta Global" },
  "HubSpot, Inc.":                  { zh: "HubSpot" },
  "Twilio Inc.":                    { zh: "Twilio" },
  "Zoom Communications, Inc.":      { zh: "Zoom" },
  "RingCentral, Inc.":              { zh: "RingCentral" },
  "Okta, Inc.":                     { zh: "Okta" },
  "CyberArk Software Ltd.":        { zh: "CyberArk" },
  "Reddit, Inc.":                   { zh: "Reddit" },
  "Pinterest, Inc.":                { zh: "Pinterest" },

  // ── Theme ──
  "Light Mode":                     { zh: "亮色模式" },
  "Dark Mode":                      { zh: "暗色模式" },
  "EN":                             { zh: "EN" },
  "中":                             { zh: "中" },
};

/**
 * Translate a key. Returns Chinese if available and lang=zh, else returns key.
 * Normalizes dashes for cross-encoding compatibility.
 */
function t(key) {
  if (I18N_LANG !== 'zh') return key;
  // Try exact match first
  if (I18N[key] && I18N[key].zh) return I18N[key].zh;
  // Try with normalized dashes (en-dash, em-dash → hyphen)
  var nk = key.replace(/[\u2013\u2014]/g, '-').replace(/&amp;/g, '&');
  if (I18N[nk] && I18N[nk].zh) return I18N[nk].zh;
  return key;
}

/**
 * Apply translations to all elements with data-i18n attribute
 */
function applyI18n() {
  var els = document.querySelectorAll('[data-i18n]');
  els.forEach(function(el) {
    var key = el.getAttribute('data-i18n');
    if (I18N_LANG === 'zh') {
      el.textContent = t(key);
    } else {
      el.textContent = key;
    }
  });

  // Also translate tab links
  var tabs = document.querySelectorAll('.tab-link');
  tabs.forEach(function(tab) {
    var key = tab.getAttribute('data-i18n') || tab.textContent.trim();
    if (I18N_LANG === 'zh' && I18N[key]) {
      tab.textContent = I18N[key].zh;
    }
  });

  // Translate sidebar items
  var sbItems = document.querySelectorAll('.sb-item');
  sbItems.forEach(function(btn) {
    var span = btn.querySelector('.dot');
    var text = btn.textContent.trim();
    if (I18N_LANG === 'zh') {
      var translated = t(text);
      if (span) {
        btn.textContent = '';
        btn.appendChild(span);
        btn.appendChild(document.createTextNode(translated));
      } else {
        btn.textContent = translated;
      }
    }
  });

  // Translate section titles
  var titles = document.querySelectorAll('.sb-section-title, .section-title, .card-title, .kpi-label, .section-desc');
  titles.forEach(function(el) {
    var key = el.getAttribute('data-i18n') || el.textContent.trim();
    if (I18N_LANG === 'zh') {
      el.textContent = t(key);
    }
  });

  // Update h1 title
  var h1 = document.querySelector('.topbar h1');
  if (h1) {
    var key = h1.getAttribute('data-i18n') || h1.textContent.trim();
    if (I18N_LANG === 'zh') {
      h1.textContent = t(key);
    }
  }
}

/**
 * Toggle between English and Chinese
 */
function toggleLang() {
  I18N_LANG = (I18N_LANG === 'en') ? 'zh' : 'en';
  i18nStorage.setItem('lang', I18N_LANG);
  
  // Update the language button text
  var langBtn = document.getElementById('lang-btn');
  if (langBtn) {
    langBtn.textContent = (I18N_LANG === 'en') ? '中' : 'EN';
  }
  
  applyI18n();
  
  // If page has refreshI18n callback, call it for dynamic content
  if (typeof refreshI18n === 'function') refreshI18n();
}

// Apply on load
document.addEventListener('DOMContentLoaded', function() {
  // Set initial button text
  var langBtn = document.getElementById('lang-btn');
  if (langBtn) {
    langBtn.textContent = (I18N_LANG === 'en') ? '中' : 'EN';
  }
  applyI18n();
});

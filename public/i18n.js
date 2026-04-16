/* ========================================
   Software Supply Chain Dashboard — i18n System
   ======================================== */
// Use safeStorage if available (from page's own shim), otherwise use own store
var i18nStorage = (typeof safeStorage !== 'undefined') ? safeStorage : {
  _s: {},
  getItem: function(k) { return this._s[k] || null; },
  setItem: function(k, v) { this._s[k] = v; },

  // ── Cross-Dashboard Nav ──
  "AI Hardware":            { zh: "AI硬件" },
  "Software Stack":         { zh: "软件生态" },
  "Semi Equipment":         { zh: "半导体设备" },
  "News Feed":              { zh: "新闻动态" },
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

  // ── Cross-Dashboard Nav ──
  "AI Hardware":            { zh: "AI硬件" },
  "Software Stack":         { zh: "软件生态" },
  "Semi Equipment":         { zh: "半导体设备" },
  "News Feed":              { zh: "新闻动态" },

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
  "Tools":                     { zh: "工具" },

  // ── KPI Labels ──
  "Cloud Spend 2031":          { zh: "2031年云支出" },
  "Cybersec Spend 2026":       { zh: "2026年网安支出" },
  "SaaS Market 2026":          { zh: "2026年SaaS市场" },
  "AI Software 2026":          { zh: "2026年AI软件" },
  "Median NRR":                { zh: "中位数NRR" },
  "Rule of 40":                { zh: "40法则" },
  "Market Cap":                { zh: "市值" },
  "Mkt Cap":                   { zh: "市值" },
  "P/E Ratio":                 { zh: "市盈率" },
  "P/E":                       { zh: "市盈率" },
  "P/S":                       { zh: "市销率" },
  "EV/EBITDA":                 { zh: "EV/EBITDA" },
  "D/E":                       { zh: "负债/股东权益" },
  "ROE %":                     { zh: "ROE %" },
  "Gross Margin %":            { zh: "毛利率 %" },
  "Op Margin %":               { zh: "营业利润率 %" },
  "Net Margin %":              { zh: "净利率 %" },
  "FCF Margin %":              { zh: "自由现金流利润率 %" },
  "EPS":                       { zh: "每股收益" },
  "Volume":                    { zh: "成交量" },
  "Avg Volume":                { zh: "平均成交量" },
  "Day Range":                 { zh: "日内区间" },
  "52W Range":                 { zh: "52周区间" },
  "52-Week Range":             { zh: "52周区间" },
  "52W Position":              { zh: "52周位置" },
  "Div Yield":                 { zh: "股息率" },
  "Dividend Yield":            { zh: "股息率" },
  "Previous Close":            { zh: "前收盘价" },
  "Price":                     { zh: "价格" },
  "Change":                    { zh: "涨跌" },
  "Change %":                  { zh: "涨跌幅" },
  "Chg %":                     { zh: "涨跌%" },
  "Year Low":                  { zh: "52周最低" },
  "Year High":                 { zh: "52周最高" },
  "Key Metric":                { zh: "关键指标" },
  "Weight %":                  { zh: "权重 %" },
  "$ Amount":                  { zh: "金额 ($)" },
  "Status":                    { zh: "状态" },
  "Severity":                  { zh: "严重程度" },
  "Risk Level":                { zh: "风险级别" },

  // ── Sortable header suffixes ──
  "Ticker ▲▼":                 { zh: "代码 ▲▼" },
  "Layer ▲▼":                  { zh: "层 ▲▼" },
  "P/E ▲▼":                    { zh: "市盈率 ▲▼" },
  "P/S ▲▼":                    { zh: "市销率 ▲▼" },
  "EV/EBITDA ▲▼":              { zh: "EV/EBITDA ▲▼" },
  "D/E ▲▼":                    { zh: "负债率 ▲▼" },
  "ROE % ▲▼":                  { zh: "ROE % ▲▼" },
  "Gross Margin % ▲▼":        { zh: "毛利率 % ▲▼" },
  "Op Margin % ▲▼":           { zh: "营业利润率 % ▲▼" },
  "Net Margin % ▲▼":          { zh: "净利率 % ▲▼" },
  "FCF Margin % ▲▼":          { zh: "自由现金流利润率 % ▲▼" },

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
  "Name":                           { zh: "名称" },
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
  "SMA-20":                         { zh: "20日均线" },
  "SMA-50":                         { zh: "50日均线" },
  "RSI":                            { zh: "相对强弱指标" },
  "RSI-14":                         { zh: "RSI-14" },
  "MACD":                           { zh: "MACD" },
  "MACD Signal":                    { zh: "MACD 信号" },
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
  "30-Day":                         { zh: "30天" },
  "90-Day":                         { zh: "90天" },
  "By Layer":                       { zh: "按板块" },
  "By Avg Corr":                    { zh: "按平均相关性" },

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
  "Net Value":                      { zh: "净值" },
  "# Transactions":                 { zh: "交易次数" },
  "Activity Feed":                  { zh: "交易动态" },
  "Net Insider Activity by Ticker":         { zh: "各股内部交易净额" },
  "Buy vs Sell Distribution (by Value)":    { zh: "买入 vs 卖出分布（按金额）" },
  "Market Context — Insider-Active Tickers":{ zh: "市场概况 — 内部交易活跃个股" },

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
  "Market Tilt":                    { zh: "市场倾向" },
  "Options Activity Scanner":      { zh: "期权活动扫描" },
  "Options Sentiment Heat Map":    { zh: "期权情绪热力图" },
  "Volume vs Average Ratio":       { zh: "成交量 / 均量比" },
  "Simulated Large Block Trades":  { zh: "模拟大宗交易" },
  "Vol / Avg":                      { zh: "量/均量" },
  "Activity":                       { zh: "活跃度" },
  "Implied Sentiment":              { zh: "隐含情绪" },
  "Sim P/C Ratio":                  { zh: "模拟P/C比" },

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
  "Composite Score":                { zh: "综合评分" },
  "Vol Ratio":                      { zh: "量比" },
  "Sector Sentiment Breakdown":     { zh: "板块情绪分析" },
  "Sector Sentiment Comparison":    { zh: "板块情绪对比" },
  "Top 5 Most Bullish":             { zh: "最看涨前5" },
  "Top 5 Most Bearish":             { zh: "最看跌前5" },

  // ── Leaderboard ──
  "Top Gainers":                    { zh: "涨幅榜" },
  "Top Losers":                     { zh: "跌幅榜" },
  "Top 5 Performers":              { zh: "涨幅前5" },
  "Bottom 5 Performers":           { zh: "跌幅前5" },
  "Volume Leaders":                 { zh: "成交量领先" },
  "Momentum Rankings":              { zh: "动量排名" },
  "Layer Performance":              { zh: "各层表现" },
  "Market Cap Leaders":             { zh: "市值排行" },
  "Relative Strength":              { zh: "相对强弱" },
  "All Tickers — Ranked by Return":     { zh: "全部股票 — 按收益排名" },
  "Returns by Ticker":                  { zh: "各股收益率" },
  "Sector Performance (Avg Return)":    { zh: "板块表现（平均收益）" },
  "Market Cap Treemap":                 { zh: "市值树图" },

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
  "Impact Waterfall by Layer":      { zh: "板块影响瀑布图" },
  "Impact Distribution":            { zh: "影响分布" },
  "Supply Chain Cascade":           { zh: "供应链级联效应" },
  "Portfolio Impact Calculator":    { zh: "投资组合影响计算器" },
  "Impact Table — All Tickers":     { zh: "影响表 — 全部股票" },
  "Cross-Scenario Risk Ranking":    { zh: "跨情景风险排名" },
  "Custom Shock by Sector Layer (%)": { zh: "自定义板块冲击 (%)" },
  "Current":                        { zh: "当前价" },
  "$ Change":                       { zh: "$ 变动" },
  "% Change":                       { zh: "% 变动" },
  "Avg Impact":                     { zh: "平均影响" },
  "Scenario":                       { zh: "情景" },

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
  "Toggle Theme":                   { zh: "切换主题" },
  "◑ Theme":                        { zh: "◑ 主题" },
  "Upcoming":                       { zh: "即将公布" },
  "Reported":                       { zh: "已公布" },

  // ── Portfolio Simulator ──
  "Initial Capital":                { zh: "初始资金" },
  "Total Allocation":               { zh: "总配置" },
  "Calculate":                      { zh: "计算" },
  "Projected Returns":              { zh: "预计回报" },
  "Equal Weight":                   { zh: "等权重" },
  "Enter share quantities to see simulated portfolio impact": { zh: "输入持仓股数查看模拟投资组合影响" },

  // ── Theme ──
  "Light Mode":                     { zh: "亮色模式" },
  "Dark Mode":                      { zh: "暗色模式" },

  // ── Misc Labels ──
  "Supply":                         { zh: "\u4f9b\u7ed9" },
  "Demand":                         { zh: "需求" },
  "Revenue":                        { zh: "营收" },
  "Growth":                         { zh: "增长" },
  "Margin":                         { zh: "利润率" },
  "Capex":                          { zh: "资本支出" },
  "YoY":                            { zh: "同比" },
  "QoQ":                            { zh: "环比" },
  "Market Share":                   { zh: "市场份额" },
  "Sized by market cap, colored by return for selected period": { zh: "面积按市值，颜色按所选期间收益率" },

  // ── Language toggle ──
  "EN":                             { zh: "EN" },
  "中文":                           { zh: "中文" },
  "中":                             { zh: "中" },
  // ── Dashboard Enhancements: Search, Watchlist, Dark Mode, Compare ──
    "Search tickers...":                     { zh: "搜索股票代码…" },
  "No results found": { zh: "未找到结果" },
  "Navigate": { zh: "导航" },
  "Select": { zh: "选择" },
  "Close": { zh: "关闭" },
  "Watchlist": { zh: "关注列表" },
  "Compare": { zh: "对比" }  ,
  "Dark Mode": { zh: "深色模式" },
  "Light Mode": { zh: "浅色模式" },
  "Quick Compare": { zh: "快速对比" },
  "Select 2-3 tickers to compare normalized performance": { zh: "选择2-3只股票以对比标准化表现" },
  "Click tickers below to select (max 3)": { zh: "点击下方股票代码以选择（最多3只）" },
  "No price data available for comparison": { zh: "没有可用于对比的价格数据" },
  "Normalized Performance (% Change)": { zh: "标准化表现（%变化）" },
  "Select at least 2 tickers": { zh: "至少选择2只股票" },
  "Search": { zh: "搜索" },
  "Toggle theme": { zh: "切换主题" },
  "Show watchlist only": { zh: "仅显示关注列表" },
  "Remove from compare": { zh: "从对比中移除" },
};

/* ── Company Name Translations ── */
var I18N_COMPANIES = {
  "Amazon.com, Inc.": "亚马逊",
  "Microsoft Corporation": "微软",
  "Alphabet Inc.": "谷歌母公司",
  "Oracle Corporation": "甲骨文",
  "CrowdStrike Holdings, Inc.": "CrowdStrike",
  "Palo Alto Networks, Inc.": "帕洛阿尔托网络",
  "Zscaler, Inc.": "Zscaler",
  "Fortinet, Inc.": "飞塔",
  "SentinelOne, Inc.": "SentinelOne",
  "Snowflake Inc.": "Snowflake",
  "MongoDB, Inc.": "MongoDB",
  "Confluent, Inc.": "Confluent",
  "Elastic N.V.": "Elastic",
  "Datadog, Inc.": "Datadog",
  "Dynatrace, Inc.": "Dynatrace",
  "GitLab Inc.": "GitLab",
  "Cloudflare, Inc.": "Cloudflare",
  "Salesforce, Inc.": "Salesforce",
  "ServiceNow, Inc.": "ServiceNow",
  "Workday, Inc.": "Workday",
  "Atlassian Corporation": "Atlassian",
  "Palantir Technologies Inc.": "Palantir",
  "C3.ai, Inc.": "C3.ai",
  "UiPath Inc.": "UiPath",
  "Duolingo, Inc.": "多邻国",
  "Veeva Systems Inc.": "Veeva Systems",
  "Procore Technologies, Inc.": "Procore",
  "BILL Holdings, Inc.": "BILL",
  "Toast, Inc.": "Toast",
  "Block, Inc.": "Block (Square)",
  "PayPal Holdings, Inc.": "PayPal",
  "Affirm Holdings, Inc.": "Affirm",
  "The Trade Desk, Inc.": "The Trade Desk",
  "Zeta Global Holdings Corp.": "Zeta Global",
  "HubSpot, Inc.": "HubSpot",
  "Twilio Inc.": "Twilio",
  "Zoom Communications, Inc.": "Zoom",
  "RingCentral, Inc.": "RingCentral",
  "Okta, Inc.": "Okta",
  "CyberArk Software Ltd.": "CyberArk",
  "Reddit, Inc.": "Reddit",
  "Pinterest, Inc.": "Pinterest",
};

/* ── Translation Function ── */
function t(key) {
  if (I18N_LANG === 'en') return key;
  var entry = I18N[key];
  if (entry && entry.zh) return entry.zh;
  // Try normalized lookup (replace various dash types with standard em-dash)
  var normalized = key.replace(/[\u2012\u2013\u2014\u2015\u2212—–-]+/g, '\u2014');
  if (normalized !== key) {
    entry = I18N[normalized];
    if (entry && entry.zh) return entry.zh;
  }
  return key;
}

function tCompany(name) {
  if (I18N_LANG === 'en') return name;
  return I18N_COMPANIES[name] || name;
}

/* ── Apply translations to static DOM elements ── */
function applyI18n() {
  // Translate tab links
  document.querySelectorAll('.tab-link').forEach(function(el) {
    var orig = el.getAttribute('data-i18n') || el.textContent.trim();
    if (!el.getAttribute('data-i18n')) el.setAttribute('data-i18n', orig);
    el.textContent = t(orig);
  });

  // Translate h1, h2, h3
  document.querySelectorAll('h1, h2, h3').forEach(function(el) {
    // Skip if it contains child elements that aren't just text
    if (el.querySelector('button, input, select')) return;
    var orig = el.getAttribute('data-i18n') || el.innerHTML.trim();
    if (!el.getAttribute('data-i18n')) el.setAttribute('data-i18n', orig);
    el.innerHTML = t(orig);
  });

  // Translate buttons (but not period buttons like 1D, 1W etc., and not sb-item which are handled separately)
  document.querySelectorAll('button').forEach(function(el) {
    if (el.classList.contains('sb-item')) return;
    var txt = el.textContent.trim();
    if (/^[0-9]/.test(txt) || txt === '×' || txt === '&times;' || txt.length > 60) return;
    var orig = el.getAttribute('data-i18n') || txt;
    if (!el.getAttribute('data-i18n')) el.setAttribute('data-i18n', orig);
    var translated = t(orig);
    if (translated !== orig) el.textContent = translated;
  });

  // Translate th elements
  document.querySelectorAll('th').forEach(function(el) {
    var orig = el.getAttribute('data-i18n') || el.textContent.trim();
    if (!el.getAttribute('data-i18n')) el.setAttribute('data-i18n', orig);
    var translated = t(orig);
    if (translated !== orig) el.textContent = translated;
  });

  // Translate p subtitles
  document.querySelectorAll('p').forEach(function(el) {
    var orig = el.getAttribute('data-i18n') || el.textContent.trim();
    if (I18N[orig]) {
      if (!el.getAttribute('data-i18n')) el.setAttribute('data-i18n', orig);
      el.textContent = t(orig);
    }
  });

  // Translate nav section buttons on index.html
  document.querySelectorAll('.nav-btn, .section-btn, [data-section]').forEach(function(el) {
    var orig = el.getAttribute('data-i18n') || el.textContent.trim();
    if (!el.getAttribute('data-i18n')) el.setAttribute('data-i18n', orig);
    el.textContent = t(orig);
  });

  // Translate sidebar items (sb-item buttons) — preserve inner <span> dot
  document.querySelectorAll('.sb-item').forEach(function(el) {
    // The button has <span class="dot">...</span> + text node
    var textNodes = [];
    el.childNodes.forEach(function(n) {
      if (n.nodeType === 3 && n.textContent.trim()) textNodes.push(n);
    });
    if (textNodes.length > 0) {
      var orig = el.getAttribute('data-i18n') || textNodes[0].textContent.trim();
      if (!el.getAttribute('data-i18n')) el.setAttribute('data-i18n', orig);
      textNodes[0].textContent = t(orig);
    }
  });

  // Translate sidebar section titles
  document.querySelectorAll('.sb-section-title').forEach(function(el) {
    var orig = el.getAttribute('data-i18n') || el.textContent.trim();
    if (!el.getAttribute('data-i18n')) el.setAttribute('data-i18n', orig);
    el.textContent = t(orig);
  });

  // Translate card-title, sbar-label, kpi-label, section-header, stat-label elements
  document.querySelectorAll('.card-title, .sbar-label, .sec-title, .section-title, .section-header, .stat-title, .stat-label, .mr-label, .sc-metric-label, .rsk-title, .sidebar-group-title, .sidebar-category, .kpi-label, .section-desc').forEach(function(el) {
    var orig = el.getAttribute('data-i18n') || el.textContent.trim();
    if (!el.getAttribute('data-i18n')) el.setAttribute('data-i18n', orig);
    el.textContent = t(orig);
  });

  // Translate descriptions and subtitles with broad matching
  document.querySelectorAll('.sec-sub, .section-sub, .card-sub, .subtitle').forEach(function(el) {
    var orig = el.getAttribute('data-i18n') || el.textContent.trim();
    if (I18N[orig]) {
      if (!el.getAttribute('data-i18n')) el.setAttribute('data-i18n', orig);
      el.textContent = t(orig);
    }
  });

  // Update lang toggle button text
  var langBtn = document.getElementById('langToggle');
  if (langBtn) {
    langBtn.textContent = I18N_LANG === 'en' ? '中文' : 'EN';
  }
}

/* ── Translate dynamic content (company names, layer names in table cells) ── */
function applyI18nDynamic() {
  // Translate company names in table cells
  document.querySelectorAll('td').forEach(function(el) {
    var txt = el.textContent.trim();
    if (I18N_COMPANIES[txt]) {
      el.textContent = I18N_LANG === 'en' ? txt : I18N_COMPANIES[txt];
    }
    // Check for layer names in cells
    if (I18N[txt] && I18N[txt].zh) {
      el.textContent = t(txt);
    }
  });

  // Translate layer names in any element with class containing 'layer', 'sector', 'category'
  document.querySelectorAll('[class*="layer"], [class*="sector"], [class*="category"], .hl-name, .sector-name').forEach(function(el) {
    var txt = el.textContent.trim();
    if (I18N_COMPANIES[txt]) {
      el.textContent = I18N_LANG === 'en' ? txt : I18N_COMPANIES[txt];
    }
    if (I18N[txt] && I18N[txt].zh) {
      el.textContent = t(txt);
    }
  });

  // Translate labels in cards, divs with financial text
  document.querySelectorAll('.card-label, .metric-label, .stat-label, dt, label').forEach(function(el) {
    var txt = el.textContent.trim();
    if (I18N[txt] && I18N[txt].zh) {
      el.textContent = t(txt);
    }
  });

  // Translate option/select elements
  document.querySelectorAll('option').forEach(function(el) {
    var orig = el.getAttribute('data-i18n') || el.textContent.trim();
    if (I18N[orig] && I18N[orig].zh) {
      if (!el.getAttribute('data-i18n')) el.setAttribute('data-i18n', orig);
      el.textContent = t(orig);
    }
  });
}

/* ── Toggle Language ── */
function toggleLang() {
  I18N_LANG = I18N_LANG === 'en' ? 'zh' : 'en';
  i18nStorage.setItem('lang', I18N_LANG);
  applyI18n();
  // Re-render dynamic content if renderAll exists
  if (typeof renderAll === 'function') {
    try { renderAll(); } catch(e) {}
  }
  if (typeof renderTable === 'function' && typeof renderAll !== 'function') {
    try { renderTable(); } catch(e) {}
  }
  // Apply dynamic translations after re-render
  applyI18nDynamic();
}

/* ── Inject language toggle button into tab bar ── */
function injectLangToggle() {
  var nav = document.querySelector('.tab-bar');
  if (!nav) return;
  // Check if already exists
  if (document.getElementById('langToggle')) return;
  var btn = document.createElement('button');
  btn.id = 'langToggle';
  btn.className = 'lang-toggle-btn';
  btn.textContent = I18N_LANG === 'en' ? '中文' : 'EN';
  btn.onclick = toggleLang;
  btn.style.cssText = 'margin-left:auto;padding:4px 14px;border-radius:6px;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.06);color:inherit;font-size:13px;font-weight:600;cursor:pointer;letter-spacing:0.5px;transition:all 0.2s;white-space:nowrap;';
  btn.onmouseenter = function() { btn.style.background = 'rgba(99,102,241,0.25)'; };
  btn.onmouseleave = function() { btn.style.background = 'rgba(255,255,255,0.06)';  };
  nav.appendChild(btn);
}

/* ── Auto-init on DOM ready ── */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function() {
    injectLangToggle();
    applyI18n();
    applyI18nDynamic();
  });
} else {
  injectLangToggle();
  applyI18n();
  applyI18nDynamic();
}

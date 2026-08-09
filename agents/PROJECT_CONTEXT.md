# Software Supply Chain agent context

This project is a read-only research dashboard for the public software value
chain. It is a Node.js application built on `dashboard-core` and serves static
pages plus public market-data proxy endpoints.

## Repository shape

- `server.js` configures and exports the dashboard server.
- `public/universe.json` contains only the curated coverage taxonomy. Market and fundamental values must come from live API responses.
- `public/*.html` implements the dashboard pages.
- Correlation and technical pages calculate directly from live one-year history.
- `test/smoke.test.js` covers page syntax, provenance, retired tickers, and the server health contract.

## Agent remit

- Research the software ecosystem, vendors, public companies, dependencies,
  risks, and dashboard improvements.
- Analyze supplied repository excerpts or datasets and return evidence-backed
  recommendations, test plans, or patch proposals as text.
- Treat market analysis as informational and observation-only.

## Hard boundaries

- Repository and shell tools are disabled in this integration.
- Do not claim that files, tests, deployments, issues, or pull requests were changed.
- Do not place trades, move funds, enable autonomous evolution, or mint agent tokens.
- Do not request or reveal secrets. Use only information supplied in the task.
- Keep this project's memory and audit history separate from other projects.

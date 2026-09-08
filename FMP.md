# Financial Modeling Prep connection

Set `FMP_API_KEY` in the hosting service's private environment and restart the service. Local runs can use the same environment variable; the server does not load a checked-in credential file. No FMP key is sent to the browser.

`/api/financial-data` is the financial source for the main and stock-decision pages. `/api/issuer-data` retains the SEC source, and existing Yahoo endpoints continue to provide market context, history and secondary reconciliation. `/api/provenance` describes this split.

The financial endpoint requests up to eight quarterly income and cash-flow statements per symbol. It caches successful upstream downloads for 24 hours in memory and deduplicates simultaneous requests. A cold 56-company refresh needs 112 FMP calls. Cache resets on a process restart. Size the FMP subscription accordingly. Authentication, entitlement and rate-limit errors cause a 30-minute request cooldown; unavailable records are disclosed, never filled from static snapshots.

TTM means four matching, consecutive fiscal quarters in one currency. Growth requires the matching fiscal quarter one year earlier. SEC annual + current YTD − prior-year YTD replaces corresponding provider-normalized metrics when an aligned bridge exists; field-level sources and differences are returned. Capitalized software is deducted when separately identified in SEC facts alongside issuer capital spending. No dated manual financial amounts are embedded in the application.

Records over 135 days old, mismatched/missing periods, unresolved cash-flow arithmetic, and material same-period revenue differences cannot pass the decision screen. Currency-incompatible valuations remain unavailable. Share dilution remains unavailable until a split-adjusted calculation is implemented. FMP data without matching SEC evidence is explicitly identified as provider-normalized, not certified GAAP. Historical drawdown is an observation, not a loss forecast.

Source docs: [income statements](https://site.financialmodelingprep.com/developer/docs/stable/income-statement), [cash-flow statements](https://site.financialmodelingprep.com/developer/docs/stable/cashflow-statement).

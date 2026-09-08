# Deployment

Zeabur automatically uses the root Dockerfile. The runtime remains Node 24,
listening on port 8080 (or the PORT supplied by the host).

The September 8 recommendation release failed before dependency installation:
Docker Hub returned HTTP 429 while the host resolved `node:24`. Retrying the
unchanged release produced the same error. The Dockerfile uses Docker's official
Node image distributed through Amazon ECR Public instead. Its manifest digest
was verified against the public registry and is pinned in the Dockerfile.

- Official distribution: https://www.docker.com/blog/news-from-aws-reinvent-docker-official-images-on-amazon-ecr-public/
- Host support: https://zeabur.com/docs/en-US/deploy/methods/dockerfile

Only package.json, the three server modules, and public assets are copied.
Production dependencies are installed without development packages. This repo
does not currently commit a package lock, so transitive npm dependencies are not
fully reproducible; the base-image pin does not resolve that separate limitation.
Runtime secrets remain in the hosting service; no secret is required by the build.

Verification: run `npm test`, confirm the hosted build uses ECR, confirm the
deployment becomes RUNNING, then reopen the public recommendation panel and
check financial coverage, company selection and scenarios. A local container
build is unavailable on the current workstation (Docker is not installed).

Rollback: redeploy the last known-good deployment for commit
bd59dc74f8b8fb56e70becc8b86ee3ba72bbad93 if the new runtime or key dashboard flow
fails. Reverting only the Dockerfile returns to the host's automatic builder but
may encounter the original registry download limit again.

## Simplified stock recommendations

`index.html` is the short Buy / Hold-Wait / Sell-Avoid page. The previous full
dashboard is preserved at `analysis.html`; its map, source tables and filters
still use `dashboard.js`. Old home-page links to the map and financial tables
redirect to their corresponding analysis anchors. No financial source or
user-journal storage key is changed.

`public/stock-picks.json` contains explicitly dated editorial research opinions
and public source links, not live financial facts or fallback quotes. To update a
call, conduct a new source review first, then update its thesis, risks, sources
and review metadata together. The current batch shares one review timestamp;
do not advance it for unchanged, unreviewed opinions. No user thesis attestation
is created by publishing these opinions. The site is publicly accessible: do not
put private holdings, notes or credentials in this asset.

Before release, run `npm test`, preview the homepage at desktop and mobile sizes,
check source/price failure states and expiry tests, open a card's analysis, search
for an unreviewed ticker, and follow the value-chain link. After merging, confirm
Zeabur is RUNNING on the merged commit and repeat these flows on the live site.
The change has no database migration, new dependency or environment variable.

## FMP current market data

The homepage and valuation screen now read `/api/fmp-quotes`. The server uses
FMP's stable quote endpoint and, when necessary, its profile endpoint for the
quote currency. Market timestamps are preserved; retrieval time never stands in
for quote time. Missing/stale quotes, missing currencies and inaccessible plan
features remain unavailable, with no Yahoo or static-price fallback.

Quotes are cached for five minutes, profiles for 24 hours, and failed lookups for
one minute. In-flight requests are deduplicated and share the existing FMP pacing
queue. Authentication/rate-limit failures pause all FMP requests; endpoint-specific
entitlement failures pause only that endpoint, preserving access to financial
statements. The homepage requests only the reviewed shortlist by default. The
advanced valuation screen explicitly requests the full universe.

Yahoo remains secondary reconciliation data and historical-price context for
drawdown checks, not the source of current price or market capitalization in the
valuation screen. Dated editorial opinions are unchanged by switching providers.
The existing server-side `FMP_API_KEY` is reused; it is never sent to the browser.
The local preview cannot fetch live FMP data without a configured server key;
do not copy production credentials into the preview to hide this limitation.

Release checks: quote normalization, currency/date rejection, secret stripping,
cache sharing, partial failures, endpoint-specific access errors, missing-key
API responses, UI provider checks, and all existing financial/decision tests.
On the hosted service verify `/api/fmp-quotes` identifies FMP and that the cards
show FMP market timestamps. Roll back to e2e2c0c240ee131e06017909346f84dd792f6905
if this release breaks the homepage or existing financial-statement access.

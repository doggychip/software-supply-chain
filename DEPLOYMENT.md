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

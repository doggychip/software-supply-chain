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
e3f7fea465e8190c44734bfa2dba8a5c6324a15b if the new runtime or key dashboard flow
fails. Reverting only the Dockerfile returns to the host's automatic builder but
may encounter the original registry download limit again.

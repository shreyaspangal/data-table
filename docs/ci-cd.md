# CI/CD pipeline

One workflow, `.github/workflows/ci.yml`, with jobs wired by `needs` so cheap
checks gate expensive ones. Runs on every PR and every push to `main`.

## Job graph

```
preflight ─┐  (resolves which secrets exist)
           │
lint ──────┼─┐
typecheck ─┼─┤
test-unit ─┤ │
db-drift ──┤ │
           │ ├─> test-browser ─┐
           │ └─> build ────────┼─> e2e ─┐
           │                   │        │
           └───────────────────┴────────┴─> docker ─> migrate ─> deploy
                                              (main branch only)
```

Gate 1 is four independent jobs in parallel — nothing expensive starts until a
formatting slip or a type error has had its chance to fail. `test-browser`
downloads a real Chromium; `docker` builds a full image. Neither should ever
run for a branch that does not lint.

## What each gate protects

| Job | Catches |
|---|---|
| `lint` | formatting, lint rules, **and the package boundary** — a `@/**` import inside `packages/` fails here |
| `typecheck` | type errors across both workspace packages |
| `test-unit` | pure-function regressions (Vitest, node environment) |
| `db-drift` | `schema.ts` edited without a matching migration |
| `test-browser` | layout regressions — column widths, sticky offsets, computed styles |
| `build` | production build failures; publishes the artifact e2e consumes |
| `e2e` | the standalone artifact failing to boot or throwing on the client |
| `docker` | the image failing to build; publishes to Docker Hub |
| `migrate` | applies migrations before the new image serves traffic |
| `deploy` | triggers the Render deploy hook |

## Two findings worth recording

**`drizzle-kit check` does not detect schema drift.** It validates migration
*journal* consistency only. Verified locally: a column added to `schema.ts`
without generating a migration still reported `Everything's fine 🐶🔥`. The
gate that actually works is regenerate-and-diff:

```yaml
- run: pnpm db:generate          # offline; needs no DATABASE_URL
- run: git diff --exit-code --stat apps/web/drizzle
```

**Generated files must be excluded from the formatter.** Biome wanted to
reformat `apps/web/drizzle/meta/*.json`; `db:generate` rewrites them
unformatted. Left alone, the format gate and the drift gate deadlock against
each other permanently — each one reverting the other's work. `drizzle/` is
excluded in `biome.json` for exactly this reason.

## Design decisions

**Build once, not twice.** The `build` job uploads `.next/standalone` and
`.next/static`; `e2e` downloads them and sets `PW_SKIP_BUILD=1` so Playwright
serves the artifact instead of recompiling.

**E2E runs the deployable artifact.** Not `next start` (which warns it is
incompatible with `output: "standalone"` and only appears to work for static
pages), and not the dev server. `scripts/serve-standalone.sh` starts the same
traced server the Docker image runs, so a green e2e is evidence about the thing
that actually ships.

**Secrets are resolved once in `preflight`.** Secrets cannot be referenced from
a job-level `if`, so availability is published as job outputs. Consequence: on
a fork or a fresh clone with no secrets, `docker`/`migrate`/`deploy` skip
cleanly instead of failing, and the pipeline is green from the first commit.

**Migrations run before deploy.** `migrate` sits between `docker` and `deploy`,
so the container never meets a schema it was not built against. `deploy` uses
`always()` with an explicit `result != 'failure'` check so a *skipped* migrate
(no secret) does not block, but a *failed* one does.

## Render setup

Create **one** service: **New → Web Service → Existing Image**.

| Field | Value |
|---|---|
| Source | **Existing Image** (not the Git repo — CI builds and pushes the image) |
| Image URL | `docker.io/<dockerhub-user>/moderation-queue:latest` |
| Instance type | Free |
| Region | any |
| Auto-Deploy | **Off** — CI triggers the deploy hook instead |
| Env var | `DATABASE_URL` = the Neon connection string |

The Dockerfile `EXPOSE`s 3000 and the server binds `HOSTNAME=0.0.0.0`, so Render
detects the port without configuration.

Then copy **Settings → Deploy Hook** into the `RENDER_DEPLOY_HOOK` GitHub secret.

Three constraints that shape the pipeline:

- **Images must be `linux/amd64`.** Pinned explicitly in the `docker` job. A
  local `docker build` on Apple Silicon produces arm64, which Render rejects —
  so never push the image by hand from a Mac.
- **Image-backed services do not auto-redeploy** when a new tag appears. The
  deploy hook is not an optimisation here, it is the only trigger.
- **The hook is called with `imgURL` pinned to the commit SHA**, not `:latest`.
  Two pushes landing close together would otherwise race, and Render could pull
  an image from the wrong run.

If the Docker Hub repository is private, add the credential under
**Registry Credentials** (Docker Hub accepts a personal access token).

Free tier: spins down after 15 minutes idle, ~1 minute cold start, 750 instance
hours/month. The filesystem is ephemeral — all state lives in Neon.

## Required secrets

None are needed for the pipeline to pass. These enable publish and deploy:

| Secret | Used by | Purpose |
|---|---|---|
| `DOCKERHUB_USERNAME` | `docker` | registry login and image namespace |
| `DOCKERHUB_TOKEN` | `docker` | access token, not the account password |
| `DATABASE_URL` | `migrate` | production Neon connection string |
| `RENDER_DEPLOY_HOOK` | `deploy` | Render service deploy hook URL |

Set with `gh secret set DOCKERHUB_TOKEN`, or in repo Settings → Secrets.

## Not yet wired

- **Lighthouse CI** as the performance-budget gate — Step 10, once there is a
  deployed URL and a table worth measuring.
- **Neon branch-per-PR** (`neondatabase/create-branch-action`) — only earns its
  keep once e2e tests read real data, which is Step 8.

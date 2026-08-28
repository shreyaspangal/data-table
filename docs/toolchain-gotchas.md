# Toolchain gotchas

Findings from setting this project up, each one a case where a tool reported
success while doing nothing useful, or failed for a non-obvious reason. All
verified by reproducing them — none are theoretical.

## `biome migrate` silently disables every lint rule

Running `biome migrate --write` on a Biome 2.4 config rewrote

```json
"rules": { "recommended": true }
```

into

```json
"rules": { "preset": "none" }
```

`none` means *no rules at all*. `biome check` then passes on everything,
which reads exactly like success. The correct value is `"preset": "recommended"`.

**Rule:** after any `biome migrate`, diff the config and re-read the `rules`
block. A lint run that suddenly reports zero problems is a symptom, not a win.

## `drizzle-kit check` does not detect schema drift

It validates migration *journal* consistency only. Verified: a column added
to `schema.ts` with no migration generated still produced
`Everything's fine 🐶🔥`.

The gate that works:

```sh
pnpm --filter @moderation/web db:generate   # offline, no DATABASE_URL needed
git diff --exit-code --stat apps/web/drizzle
```

If `generate` produced a file, someone changed the schema without a migration.
This is what the `db-drift` CI job runs.

## Biome and Drizzle deadlock over generated files

Biome wants to reformat `apps/web/drizzle/meta/*.json`; `db:generate` rewrites
them unformatted. Left alone, the format gate and the drift gate revert each
other forever — each run "fixes" the file the other just wrote.

`drizzle/` is excluded in `biome.json`. **Any generated directory must be
excluded from the formatter** before it is also covered by a regeneration
check.

## Vitest claims Playwright's spec files

Vitest's default include is `**/*.{test,spec}.*`, which matches
`apps/web/e2e/*.spec.ts`. Vitest then executes them and fails with
`Playwright Test did not expect test() to be called here`.

`apps/web/vitest.config.ts` narrows the include and excludes `e2e/**`. The two
runners must own disjoint paths.

## `tsc` needs Next's generated types

`apps/web/tsconfig.json` includes `.next/types/**`, which Next *generates*
rather than ships. A stale local `.next` masks this; a clean checkout fails
with `Cannot find name 'LayoutProps'`.

The `typecheck` script is therefore `next typegen && tsc --noEmit` — fixed in
the script rather than the CI workflow, so a fresh clone typechecks locally
too. `next typegen` emits route and layout types without a full build.

## Vitest 4 moved browser providers into separate packages

`provider: "playwright"` no longer typechecks. Providers are now factories from
their own package:

```ts
import { playwright } from "@vitest/browser-playwright";
// browser: { provider: playwright(), instances: [{ browser: "chromium" }] }
```

## `next start` is incompatible with `output: "standalone"`

It warns and then *appears* to work, because a fully static page serves fine
regardless. It is not serving the standalone bundle. Use
`apps/web/scripts/serve-standalone.sh`, which starts the traced server the
Docker image runs — that is why e2e is evidence about the deployed artifact.

## Render only runs `linux/amd64`

A plain `docker build` on Apple Silicon produces arm64, which Render rejects.
`--platform linux/amd64` produces a valid image, but running it locally is
emulated — Docker Desktop flags it "may have poor performance, or fail". So a
local amd64 smoke test is weaker evidence than the CI build on a native amd64
runner.

Also: image-backed Render services **never redeploy on their own** when a tag
moves. The deploy hook is the only trigger, and it is called with `imgURL`
pinned to the commit SHA so concurrent pushes cannot race over `:latest`.

## TypeScript 7.0.2 is new

tsdown warns `TypeScript 7.0 does not yet have a stable API and is
experimental. Some options will be unavailable` while generating `.d.ts`.
It currently works. Worth remembering if declaration output ever looks wrong.

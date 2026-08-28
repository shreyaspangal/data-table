# ADR-008: `packages/data-table` is a separate package with an enforced boundary

- **Status:** Accepted
- **Date:** 2026-08-28
- **Step:** 0 (Foundation)
- **Related:** [ADR-001 (contract)](001-rows-columns-contract.md),
  [ADR-003 (RSC boundary)](003-rsc-boundary.md)

## Context

The design doc's first stated requirement (§1) is that the component

> "be generic enough to reuse across multiple product surfaces."

This project has exactly one consumer — the moderation queue in `apps/web` —
and no intention of publishing to npm. So the requirement is easy to *claim*
and impossible to *check*, unless something structural enforces it.

That is the problem this ADR solves. It is not primarily about code
organisation.

## Decision

`packages/data-table` is a separate workspace package with:

1. **Generic-only vocabulary.** Its API speaks `Row`, `ColumnDef`, `getRowId`.
   The words `report`, `severity`, `status`, `moderator` do not appear.
2. **An explicit public surface.** `src/index.ts` is the only entry; anything
   not re-exported there is not public API, enforced by the `exports` map.
3. **An enforced dependency direction.** A Biome `noRestrictedImports` rule
   fails the build on any `@/**` or `@moderation/web` import inside
   `packages/**`. App → package only, never the reverse.
4. **Its own build and type artifacts** via tsdown, with a `"use client"`
   output banner.

## Why: the boundary is a verification mechanism, not a teaching one

Without it, "this table is reusable" is an assertion. With it, a failing lint
run is evidence. Three consequences follow that a convention alone would not
produce:

**It makes the wrong thing impossible rather than discouraged.** If
`DataTable.tsx` lived at `apps/web/src/components/`, then `@/db/schema` is one
import away. At Step 6 (severity pills, status badges) the path of least
resistance is `import type { Report }` and a `switch` on severity — not through
bad intent, but because the import is *available*. Components that live beside
their only consumer reliably absorb its domain over time. The lint rule
converts a convention into a constraint.

**It makes the Phase 2 claim falsifiable.** Step 10 measures the base table's
ceiling; Phase 2 then adds virtualization and asserts the `rows`/`columns`
contract was untouched. If the table has quietly absorbed `Report`, that
assertion cannot be checked — changes made for virtualization become
indistinguishable from changes made for the queue. The boundary is what gives
the before/after comparison meaning.

**It forces the RSC boundary to be structural.** Because the package builds
separately and emits a `"use client"` banner, the client/server split is
visible in the build output rather than discovered at runtime. Inside
`apps/web` it would be implicit, and the "Functions cannot be passed directly
to Client Components" failure would surface by accident during Step 3.
See ADR-003.

## Options considered

### Rejected: plain folder inside `apps/web`

Zero ceremony, fastest iteration, and honestly adequate for one consumer.
Rejected because it makes the doc's §1 requirement unverifiable, and because
domain leakage becomes a matter of discipline rather than of tooling. The whole
point of the exercise is the thing that leakage would destroy.

### Rejected: internal workspace package, no `exports` map, no build

The middle option: dependency direction still lint-enforced, but the app
imports `../../packages/data-table/src` directly via `transpilePackages`.
This gives identical type safety with no build step and no rebuild-between-edits
tax.

This was genuinely close, and it is the option to revisit if the build step
becomes friction. It was rejected because without an `exports` map there is
never a moment where you must decide what is public — and that decision is the
component contract the
[architect article](https://www.greatfrontend.com/blog/how-to-become-a-frontend-architect)
names as a reviewable artifact.

### Chosen: full published shape (TanStack convention)

`src/` ships only, `tests/` is a sibling, `type: "module"`, `exports` map,
tsdown build. Matches how TanStack structures its own packages.

## Consequences

**Positive**
- The reuse claim is mechanically checked, not asserted. Verified during Step 0:
  a deliberate `import { something } from "@/lib/thing"` inside `packages/`
  fails lint with the custom message, and was then removed.
- Public API is a deliberate decision with a single obvious location.
- The client/server split is visible in build output.

**Negative — stated plainly**
- **The separate build artifacts are the weakest-paying part of this decision.**
  Nothing consumes the emitted `.d.ts`; the package is never published. This is
  overhead accepted for the discipline of the `exports` map, not because the
  artifacts have a consumer. If the rebuild cycle becomes friction, dropping to
  `transpilePackages` costs nothing architecturally — the lint rule and the
  generic vocabulary, which carry the actual value, are independent of it.
- A build step now sits between an edit and a test run.
- TypeScript 7.0.2 warns that its API is experimental during `.d.ts`
  generation. It currently works; this is a live edge on a new major.

## Rollback

Delete `tsdown.config.ts`, point the app at the package source through
`transpilePackages`, and keep both the lint rule and the generic vocabulary.
The verification property survives; only the packaging ceremony is lost.

# Working agreement

This repo is a **learning project**. The point is not to ship a data table as
fast as possible — it is for the human to understand every decision in it.
Optimising for speed here defeats the purpose.

Plan: `~/.claude/plans/you-are-my-mentor-radiant-chipmunk.md`
Source design doc: `docs/data-table-system-design/data-table-system-design.md`
(Phase 1 covers §1–11 only. §12+ is deferred until measured.)

## Protected files — DO NOT WRITE OR EDIT

The human writes these by hand. They are the core of the learning exercise.
If asked to implement one, **decline and explain why**. Reviewing them,
pointing out bugs, and writing tests against them is encouraged.

```
packages/data-table/src/types.ts
packages/data-table/src/resolve-widths.ts
packages/data-table/src/DataTable.tsx
packages/data-table/src/DataTable.module.css
packages/data-table/src/index.ts
docs/system-design/00-radio.md
docs/state-architecture.md
docs/testing-matrix.md
docs/performance-budget.md
```

`index.ts` is included because it *is* the public API surface (see
Conventions below) — agent-editable would mean the contract isn't actually
human-decided. The four docs are Steps 1, 2.5, 9, and 10's deliverables per
the plan — reasoning docs, not scaffolding, even though they're prose. An
agent may **discuss, question, and research for** these files, exactly as
with the code above, but not write their content.

Everything else — scaffolding, DB schema and seed, app UI, cell renderers,
test boilerplate, CI, Docker, ADR rejected-options research, setup docs
like this one — is fair game.

## Per-step protocol

Every step that makes an architectural decision goes through:

1. **Grill** — the design is stress-tested against how shipped libraries
   (TanStack Table, MUI X Data Grid, AG Grid, shadcn/ui) actually solve it.
   Research first; never invent a dilemma that real libraries have settled.
2. **Build** — human writes the core, agent writes the periphery.
3. **Teach-back** — the human explains it back in their own words.
4. **ADR** — `docs/adr/NNN-*.md`, including the **rejected** options and the
   evidence behind rejecting them.

Not every step produces all four gates — a step with no architectural
decision to defend doesn't get a fake ADR. Steps 0 and 0.5 are teach-back
only (scaffolding and CI have no rejected-options case to make). Step 1
(RADIO writeup) and Step 7 (loading/empty/error a11y) are grill + build +
teach-back, no dedicated ADR — their reasoning lives in the docs they
produce. Step 8's "why TanStack Query earns its slot on exactly one write
path" is a real decision and should get its own ADR when that step lands —
it doesn't have one yet.

## Architecture decisions already settled

- Native `<table>`, not `div` + `role="grid"`. MUI/AG Grid chose div because
  they are interactive grids; a read-heavy queue has not earned that cost.
- **Data crosses the RSC boundary, behavior does not.** `ColumnDef` carries
  functions, so columns are defined in a `"use client"` module and never
  passed from a Server Component. Three files: `page.tsx` (server) →
  `columns.tsx` (client) → `DataTable` (client).
- Column sizing is `width` + `flex` + `minWidth`/`maxWidth`. Content
  measurement is Phase 2 and opt-in.
- Table state is **controlled-only**. Sort/filter live in the URL via nuqs;
  internal state would race the URL as a second source of truth.
- No global store. Server data → TanStack Query. Shareable UI state → URL.
  Layout state → component-local.

## Known toolchain traps

`docs/toolchain-gotchas.md` records tools that report success while doing
nothing useful — `biome migrate` disabling all lint rules, `drizzle-kit check`
not detecting drift, `next start` silently ignoring standalone output. Read it
before debugging anything that "passes" suspiciously easily.

## Conventions

- `packages/data-table` never mentions the domain. No `report`, no
  `severity`, no `status`. Its vocabulary is `Row`, `ColumnDef`, `getRowId`.
  A lint rule enforces the dependency direction (app → package, never back).
- Public API is whatever `packages/data-table/src/index.ts` exports. If it
  is not exported there, it is not public.
- Tests go in three tiers by risk: Vitest node for pure functions, Vitest
  Browser Mode for anything needing real layout, Playwright for product
  flows. jsdom is not used — it has no layout engine.

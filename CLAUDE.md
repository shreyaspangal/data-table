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
```

Everything else — scaffolding, DB schema and seed, app UI, cell renderers,
test boilerplate, CI, Docker, docs prose — is fair game.

## Per-step protocol

No step is finished until:

1. **Grill** — the design is stress-tested against how shipped libraries
   (TanStack Table, MUI X Data Grid, AG Grid, shadcn/ui) actually solve it.
   Research first; never invent a dilemma that real libraries have settled.
2. **Build** — human writes the core, agent writes the periphery.
3. **Teach-back** — the human explains it back in their own words.
4. **ADR** — `docs/adr/NNN-*.md`, including the **rejected** options and the
   evidence behind rejecting them.

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

## Conventions

- `packages/data-table` never mentions the domain. No `report`, no
  `severity`, no `status`. Its vocabulary is `Row`, `ColumnDef`, `getRowId`.
  A lint rule enforces the dependency direction (app → package, never back).
- Public API is whatever `packages/data-table/src/index.ts` exports. If it
  is not exported there, it is not public.
- Tests go in three tiers by risk: Vitest node for pure functions, Vitest
  Browser Mode for anything needing real layout, Playwright for product
  flows. jsdom is not used — it has no layout engine.

# ADR-006: flex-based width contract, not content measurement

- **Status:** Accepted
- **Date:** 2026-08-31
- **Step:** 5 (width contract)
- **Related:** ADR-004 (native `<table>`) — this decision only makes sense
  on top of that one, since `<colgroup>` + `table-layout: fixed` is a native
  `<table>` mechanism with no equivalent in a `div`+`role="grid"` layout.

## Context

Design doc §13 lays out two different approaches to column sizing:

1. **Flex-based**: columns declare `width` or `flex`, and a container-only
   measurement (one `ResizeObserver`) resolves those into pixel widths —
   no inspection of what's actually rendered inside any cell.
2. **Content measurement**: estimate width from the column header text plus
   a sample of rendered row values (§13.2), or measure actual DOM nodes in
   a hidden sizing layer.

The doc itself leans toward (1) for Phase 1 and defers (2) as opt-in, but the
question worth checking before committing to that is whether real shipped
table libraries treat this as a genuine trade-off or have already converged
on one answer.

## Decision

Columns declare `width` (fixed) or `flex` (proportional) plus optional
`minWidth`/`maxWidth`. `resolveColumnWidths` measures the scroll container's
width via one `ResizeObserver` and resolves every column's pixel width from
that single number — fixed columns take their clamped `width`; flex columns
split whatever remains, iteratively re-splitting whenever a column hits its
floor or ceiling so the columns still being resolved never assume more space
than what clamped-out columns left behind. No column's actual rendered
content is ever measured. The result is published through one `<colgroup>` +
`table-layout: fixed`, consumed identically by `<thead>` and `<tbody>`.

## Why: none of the three major libraries measures content by default

- **MUI X Data Grid**: `flex` splits the remainder proportionally after
  explicit-`width` columns are subtracted, clamped by `minWidth`/`maxWidth`.
  If explicit widths already exceed the grid's width, flex columns fall back
  to a **hardcoded 100px base** rather than measuring anything, and a
  scrollbar appears.
- **AG Grid**: same proportional-remainder algorithm, same
  `minWidth`/`maxWidth` clamping — and, notably, the same *iterative*
  redistribution this project's `resolveColumnWidths` implements: a column
  constrained by its `minWidth`/`maxWidth` is excluded from the ratio and the
  remaining flex columns re-split what's left, rather than a single pass.
  Content-based auto-sizing (`autoSizeColumns`) exists, but is an explicit
  opt-in call, never the default.
- **TanStack Table**: doesn't attempt this at all. It's headless — `size`,
  `minSize`, `maxSize` are just numbers on the column object, with no
  remainder-split or flex concept built in. A consumer wanting flex-like
  behavior implements it themselves in CSS on top of TanStack's static sizes.

So the real convergence isn't "three libraries do identical math" — it's
**two libraries (MUI, AG Grid) independently arrive at the same
proportional/iterative algorithm, and the third opts out of solving it in
the library at all.** Nobody ships content-measurement as the default
behavior. That's strong evidence the design doc's own instinct — treat
content measurement as complex enough to defer, not as the obvious right
answer — matches what the ecosystem has already settled on, rather than
being a corner cut for Phase 1 convenience.

## Why content measurement is the harder, deferred path

Measuring what's actually rendered (§13.2/§13.3) means either sampling a
subset of rows (accurate for text, unreliable for avatars/badges/links —
§13.3 calls this out directly) or measuring real DOM nodes in a hidden
sizing layer, both of which cost real work per column and have to re-run
whenever data changes. The flex model sidesteps all of that: it needs
exactly one number (container width) and each column's own declared
sizing intent, measured once per resize rather than per data change. That's
also why it's the only approach MUI and AG Grid ship as the *default* —
content measurement is real, but it's opt-in complexity layered on top of a
flex-shaped foundation, not a replacement for one.

## The iterative redistribution step, and why it's not optional

A single clamp-then-stop pass looks like it should be enough, but it isn't:
if column A's floor forces it above its proportional share, the space it
"steals" has to come from somewhere, and the columns still splitting the
remainder need to know their pot shrank. A single-pass implementation was
caught during review producing resolved widths that summed to *more* than
the container actually had — exactly the failure mode `table-layout: fixed`
+ `<colgroup>` is supposed to prevent structurally. AG Grid's own docs
describe this same re-split behavior, which is what confirmed the fix was
matching real prior art rather than inventing extra complexity.

## Options considered

### Rejected: content-measurement sizing (header + sample rows, or hidden
DOM measurement) as the default

This is what design doc §13.2/§13.3 describes as the general problem, and
it's real — but no shipped library defaults to it, for the reasons above.
Rejected as Phase 1's default; kept as an explicitly opt-in Phase 2 path per
the doc, unchanged by this decision.

### Rejected: single-pass clamp (no iterative redistribution)

Simpler to implement and reason about. Rejected because it's not just a
simplification — it's incorrect. It was verified during review (§ this
step's own review process) to allow resolved column widths to sum to more
than the container width whenever more than one flex column hits its floor
in a way that should free space for the others.

### Rejected: `flex` falling back to `0` or an unbounded minimum

If a flex column declares no `minWidth`, some minimum floor is still needed
for the "fixed columns already exceed the container" case — without one,
flex columns would collapse to `0px` and become invisible/unusable rather
than degrading to something a user can still interact with. `100px` was
chosen to match MUI's own documented base value, rather than picking an
arbitrary number with no precedent.

## Consequences

- `resolveColumnWidths` is a pure function (Tier 1 node tests), independent
  of `DataTable.tsx`'s rendering — the algorithm can be verified without a
  browser at all, and its output is what `<colgroup>` publishes as the
  single shared source of truth for both `<thead>` and `<tbody>`.
- Header/body width parity is structural, not incidental: both read from the
  same `<colgroup>`, so they cannot drift the way two independently-sized
  elements could — verified in Step 5's browser-mode test (§ header width
  === body width for every column, both fixed and flex).
- Rich cell content (avatars, badges, icons) has no say in its own column's
  width under this model — a consumer who needs that has to reach for the
  Phase 2 content-measurement path (§13.3's own explicit guidance), which
  this ADR deliberately does not build yet.
- If Phase 2 measurement is ever added, it's additive on top of this
  contract (an alternative way to arrive at a `width`/`minWidth`), not a
  replacement for the flex/clamp resolution this ADR settles.

## References

- [Design doc §13](../data-table-system-design/data-table-system-design.md)
- [MUI X Data Grid — Column dimensions](https://mui.com/x/react-data-grid/column-dimensions/)
- [AG Grid — Column Sizing](https://www.ag-grid.com/react-data-grid/column-sizing/)
- [TanStack Table — Column Sizing guide](https://tanstack.com/table/v8/docs/framework/react/guide/column-sizing)

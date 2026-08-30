# ADR-004: native `<table>`, not `div` + `role="grid"`

- **Status:** Accepted
- **Date:** 2026-08-30
- **Step:** 3 (semantic skeleton)
- **Related:** ADR-003 (RSC boundary) — the other Step 3 markup decision.

## Context

Both MUI X Data Grid and AG Grid render their tables as nested `<div>`
elements with `role="grid"`/`role="gridcell"`/etc. rather than a native
`<table>`. This project's own scope (RADIO doc: one status-change action per
row, one URL-backed filter, no in-cell editing, no drag-reorder, no
column/row pinning, no grouping or pivoting) looks superficially similar to
what those libraries render — so the question is whether this project should
copy their DOM strategy, or whether their reasons for it even apply here.

## Decision

Native `<table>` — `<table><caption><thead><tr><th scope="col">` /
`<tbody><tr><td>` — not `div` + `role="grid"`.

## Why MUI/AG Grid chose `div` + `role="grid"`, and why that reasoning doesn't transfer

MUI's own documentation is explicit about the reason: their grids need
grouping, pivoting, in-cell editing, row/column drag-and-drop, and pinning —
"unlikely to use a `<table>` as the underlying DOM representation" to support
that feature set. AG Grid's accessibility docs describe the same trade: `div`
+ ARIA roles are what let them build the DOM structure their interaction
model needs, then bolt back the semantics a `<table>` would have given for
free, via `role="grid"`/`role="gridcell"`/`role="row"`.

None of the features driving that choice exist in this project's Phase 1
scope. The RADIO doc's own Out-of-scope section rules out bulk actions,
column visibility/density controls, and (implicitly, by never being
mentioned) column reordering, pinning, grouping, or in-cell editing. The one
interactive behavior — a status-change action per row — is an ordinary
button inside a `<td>`, reachable by normal tab order. There is no row-level
or cell-level custom keyboard navigation model to build, which means there's
no reason to leave the DOM structure that gives keyboard/screen-reader
semantics away for free.

**`role="grid"` is not a free accessibility upgrade — it's a different,
heavier interaction contract you then have to implement yourself.** The WAI-
ARIA grid pattern specifies arrow-key navigation between cells and roving
`tabindex`, none of which the browser provides automatically just by adding
the role. Adrian Roselli's critique, ["ARIA Grid As an
Anti-Pattern"](http://adrianroselli.com/2020/07/aria-grid-as-an-anti-pattern.html),
documents exactly this failure mode: developers apply `role="grid"` to
something that is really just a table, get the *label* "grid" without
implementing the *behavior* a grid role promises, and end up with a table
that is less accessible than if they'd left the native semantics alone. A
native `<table>` gives header/cell association (`<th scope="col">`),
caption-based naming, and correct row/cell reading order with zero custom
JavaScript. Reaching for `role="grid"` here would mean taking on that
implementation burden for a benefit this product doesn't use.

## Options considered

### Rejected: `div` + `role="grid"` (MUI/AG Grid's approach)

Matches what the two most popular table libraries do, so it's a defensible
default to reach for without thinking. Rejected because it imports a full
interaction contract (arrow-key cell navigation, roving tabindex per the
WAI-ARIA grid pattern) that has to be hand-built correctly to avoid the
Roselli anti-pattern, for zero benefit given this product's actual
feature set.

### Rejected: `div` + `role="table"` (semantics-only, no grid interaction)

A middle ground — reproduce table semantics without committing to the grid
interaction contract. Rejected because it has no upside over an actual
`<table>`: the browser already provides `<table>`'s semantics, header
association, and caption naming natively; re-implementing the same
semantics with more markup and higher bug surface (get one `role` or
`aria-*` attribute wrong and the accessibility tree silently breaks) buys
nothing a native element doesn't already give for free.

## Escalation trigger — the condition this project doesn't meet yet

Revisit this decision if the product ever needs: in-cell editing, drag-to-
reorder columns, column/row pinning, or grouping/pivoting — the specific
features that drove MUI and AG Grid to `div`+`role="grid"` in the first
place. None of these appear anywhere in Phase 1 or Phase 2's roadmap as
currently scoped. Until one of them is a real, scheduled requirement — not a
hypothetical one — a native `<table>` remains strictly better: less code,
fewer accessibility failure modes, and no interaction contract to maintain
that nothing in the product actually uses.

## Consequences

- Keyboard operability of the one write action (status change) is ordinary
  tab order to a button, not custom arrow-key grid navigation.
- Header/cell association and the table's accessible name come from native
  `<table>`/`<caption>`/`scope="col"` semantics, verified in Step 3's
  browser-mode tests rather than asserted.
- If a future phase adds one of the escalation-trigger features, this ADR is
  the place to revisit the DOM strategy — not something to silently work
  around inside a native-`<table>` shape that was never built for it.

## References

- [MUI X Data Grid — Overview (grouping/pivoting/editing driving the `div` DOM choice)](https://github.com/mui/mui-x/blob/master/docs/data/data-grid/overview/overview.md)
- [AG Grid — Accessibility (their `role="grid"`/ARIA strategy)](https://www.ag-grid.com/javascript-data-grid/accessibility/)
- [AG Grid blog — Data Grid vs. Data Table vs. Grid (the feature-set distinction this ADR turns on)](https://blog.ag-grid.com/react-data-grid-vs-react-data-table-vs-react-grid/)
- [Adrian Roselli — "ARIA Grid As an Anti-Pattern"](http://adrianroselli.com/2020/07/aria-grid-as-an-anti-pattern.html)

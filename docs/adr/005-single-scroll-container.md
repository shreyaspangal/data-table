# ADR-005: single scroll container, not split header/body scrollers

- **Status:** Accepted
- **Date:** 2026-08-31
- **Step:** 4 (sticky header)
- **Related:** ADR-004 (native `<table>`) — this decision only makes sense
  given that one; a `div`-based grid could split header/body without the
  same failure mode, because it isn't relying on native table row/column
  flow to keep the two in sync.

## Context

Design doc §6.2 states the rule directly: "Do not split the header and body
into separate scroll surfaces." The question is whether that's a real
constraint or just a stated preference — i.e., what actually breaks if you
do split them, and is `position: sticky` on a single container's `<thead>`
actually sufficient to keep the header visible during vertical scroll,
without needing two DOM tables at all.

## Decision

One scroll container (`<div>` with `overflow: auto`) wraps a single
`<table>`. The header stays visible via `position: sticky; top: 0` on each
`<th>` (not on `<thead>` — see below), not by rendering the header in a
second, separately-scrolled table synced to the body's scroll position.

## Why splitting the scrollers is a real, documented failure mode

This isn't a hypothetical performance/complexity tradeoff — it's a
well-documented bug class. **DataTables.net**, the single most widely-used
HTML table library in existence, splits header and body into separate
`<table>` elements when its `scrollX`/`scrollY` options are enabled, and
carries a permanent, dedicated warning in its own docs about the
consequence: ["Possible column
misalignment"](https://datatables.net/manual/core/tech-notes/6). Their own
explanation: once header and body are separate tables, keeping their column
widths and scroll offsets in sync depends on scrollbar width (which differs
across OS/browser, and is much larger on Windows than macOS/Linux) and on
whatever auto-sizing each table computes independently — any discrepancy
shows up as visibly drifting columns.

**[PrimeNG issue #5354](https://github.com/primefaces/primeng/issues/5354)**
is a live instance of exactly this bug in production, for the same
structural reason: a component library independently arriving at the same
failure DataTables.net had already documented.

The mechanism is fundamental, not implementation-specific: two separate
scroll surfaces require either (a) a scroll-event listener copying
`scrollLeft` from one to the other on every scroll event, which visibly lags
under fast or trackpad-momentum scrolling, or (b) forcing identical explicit
pixel widths onto both tables' columns from outside, which duplicates
exactly the width bookkeeping Step 5's `resolve-widths.ts` exists to compute
once. A single container with `position: sticky` sidesteps the problem
entirely: there is only ever one table, one set of column widths, and one
scroll position — nothing to keep in sync because there's only one of it.

## Sticky-positioning specifics that shaped the implementation

Two cross-browser gotchas, not just "add `position: sticky` and done":

- **`position: sticky` goes on `<th>`, not `<thead>`.** Chrome and Edge have
  a documented bug where sticky positioning doesn't reliably work when
  applied to `<thead>` itself — [CSS-Tricks](https://css-tricks.com/position-sticky-and-table-headers/)
  and [Adrian Roselli's "Fixed Table
  Headers"](http://adrianroselli.com/2020/01/fixed-table-headers.html) both
  document this; per-`<th>` is the reliable target.
- **No ancestor between the sticky `<th>` and the scroll container may set
  `overflow`**, or Safari specifically breaks sticky positioning. The scroll
  container itself is exempt (it's the intended scrolling ancestor) — the
  constraint is on anything *between* it and the `<th>`.

## Options considered

### Rejected: two scroll containers, header and body, synced via JS

The "obvious" approach if you think of the header as a fixed banner
independent of the body. Rejected because it's the exact, named failure mode
above — not a risk to manage, a bug to avoid entirely by not creating the
condition for it.

### Rejected: two scroll containers, widths forced via explicit pixel values

Removes the sync-lag problem (no scroll listener needed) by making both
tables' columns literally the same fixed widths. Rejected because it
reintroduces manual, duplicated width computation that Step 5's shared width
contract (`resolve-widths.ts`, consumed once by both `<thead>` and
`<tbody>` via one `<colgroup>`) is specifically designed to centralize —
this would fight that design rather than complement it.

## Consequences

- The header and body can never structurally drift apart — there's one
  table, one column model.
- Sticky behavior is verified in a real browser (Step 4's test: scroll
  programmatically, assert the header stays flush against the container's
  top edge) — impossible to check in jsdom, since jsdom has no layout engine
  and `position: sticky` is a no-op there.
- If a future requirement needs frozen/pinned *columns* (horizontal
  equivalent of this problem), the same single-container-plus-sticky
  reasoning applies to `position: sticky; left: 0` on those cells — not a
  second scroll surface.

## References

- [Design doc §6.2](../data-table-system-design/data-table-system-design.md)
- [DataTables.net — Possible column misalignment](https://datatables.net/manual/core/tech-notes/6)
- [primefaces/primeng#5354 — live instance of the same bug](https://github.com/primefaces/primeng/issues/5354)
- [Adrian Roselli — Fixed Table Headers](http://adrianroselli.com/2020/01/fixed-table-headers.html)
- [CSS-Tricks — Position Sticky and Table Headers](https://css-tricks.com/position-sticky-and-table-headers/)

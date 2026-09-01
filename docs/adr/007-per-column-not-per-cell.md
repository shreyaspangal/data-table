# ADR-007: per-column cell config, no per-cell escape hatch

- **Status:** Accepted
- **Date:** 2026-09-01
- **Step:** 6 (cell rendering)
- **Related:** ADR-006 (width contract) — same shape of question one layer
  up: does per-instance behavior need its own override mechanism, or is
  parameterizing the one declared-per-column function enough.

## Context

`ColumnDef`'s rendering pipeline is `accessor → renderCell → default
formatter`, declared once per column. The open question this step needed
to settle: is that enough, or does a real product eventually need to
override how one *specific* cell renders — independent of its column's own
`renderCell` — the way a spreadsheet lets you format one cell differently
from the rest of its column?

## Decision

Cell customization lives entirely in `ColumnDef.renderCell(value, row)`,
declared once per column. There is no second mechanism for overriding an
individual cell's rendering outside its column's own function, and none is
planned.

## Why: no shipped library offers a true per-cell override, and the four
renderers built this step didn't need one

MUI's `renderCell(params)` looks per-cell because it receives `params` for
that specific row, but it's still declared once, on the column — any
row-specific behavior happens by branching *inside* that one function,
never through a second override path. TanStack Table's `cell` render
function works the same way. Neither library treats "this one cell should
behave differently" as a case needing new API surface, because it's already
solvable by the function the column already owns.

Building this project's four actual renderers confirmed the same thing
from the inside, not just from reading other libraries' docs:

- **`SeverityPill`** branches on `value` (`low`/`medium`/`high`/`critical`)
  to pick a visually escalating style — a pure function of the cell's own
  value, no per-row exception needed.
- **`AssigneeAvatar`** branches on `row.assigneeName` being `null` (the
  RADIO doc's known seed artifact: a freshly-created "reviewing" row has no
  assignee yet) and renders "Unassigned" instead of a broken avatar. This
  is exactly the kind of "this one row is different" case a per-cell escape
  hatch sounds like it exists for — and `renderCell(value, row)` already
  had everything needed to handle it, since it receives the whole row, not
  just the accessed value.
- **`ContentPreview`** combines two fields from the row
  (`contentThumbnailUrl` + `contentExcerpt`) into one cell — a case a
  naive `renderCell(value)` signature (value-only, no row access) could not
  have handled at all, which is why `renderCell`'s second `row` parameter
  matters more than it looks like it would from the type signature alone.

In every case, "this cell needs to look different" turned out to be
"this column's render function needs to branch on data it already has,"
never "this specific cell instance needs a second, independent override."

## Options considered

### Rejected: a per-cell override map (e.g. `cellOverrides: Record<rowId,
Record<columnKey, ReactNode>>` on `DataTableProps`)

The literal spreadsheet-style escape hatch. Rejected because it introduces
a second source of truth for what a cell renders — a consumer could set
both a column's `renderCell` and a per-cell override and get a genuinely
ambiguous "which one wins" question, the same class of bug ADR-002 rejected
for state ownership (two things claiming to be the source of truth). Every
real case found this step was expressible as "branch inside `renderCell`
on `row`," which has exactly one source of truth per column.

### Rejected: a second render prop on `ColumnDef` for per-instance
exceptions (e.g. `renderCellOverride`)

A softer version of the above, scoped to the column rather than the whole
table. Rejected for the same reason — `renderCell(value, row)` already
receives everything an override would need to check, so a second prop
would just be two functions a consumer has to keep in sync with no
scenario found (in this step's real usage) where the first one couldn't
already do the job.

## Consequences

- Any future "this cell needs special handling" requirement gets solved
  by writing a more discriminating `renderCell`, not by growing
  `DataTableProps`/`ColumnDef`'s surface area.
- `renderCell(value, row)` keeping its two-argument shape (not narrowing to
  value-only) is now a load-bearing decision, not an incidental one —
  `ContentPreview` genuinely could not exist without `row` access.
- If a real case ever surfaces where a single column's render function
  cannot express the needed per-row variation (not hypothetical — an
  actual product requirement), that's the trigger to revisit this ADR,
  not to route around it with a second, undocumented rendering path.

## References

- [MUI X Data Grid — Cells (`renderCell(params)`, declared per column)](https://mui.com/x/react-data-grid/cells/)
- [TanStack Table — Cells guide (`cell` render function, per column)](https://tanstack.com/table/v8/docs/guide/cells)
- `docs/system-design/00-radio.md` — the seed-artifact case (`AssigneeAvatar`'s null-assignee handling) that grounded this decision in a real, not hypothetical, per-row exception.

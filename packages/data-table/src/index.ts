// Public API surface of @moderation/data-table.
//
// Everything the app is allowed to import must be re-exported from this file.
// If it is not exported here, it is not public API — that is the whole point
// of the exports map in package.json (see docs/adr/008-package-boundary.md).
//
// Filled in as the core lands:
//   Step 2 → export type { ColumnDef, DataTableProps } from "./types";
//   Step 3 → export { DataTable } from "./DataTable";
//   Step 5 → export { resolveWidths } from "./resolve-widths";

export {
  type ColumnDef,
  createColumnHelper,
  type DataTableProps,
} from "./types";

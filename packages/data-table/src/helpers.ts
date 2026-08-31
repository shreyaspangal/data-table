import type { ColumnDef } from "./types";

export function isFixedWidthColumn<Row, Value>(
  column: ColumnDef<Row, Value>,
): column is Extract<ColumnDef<Row, Value>, { width: number }> {
  return "width" in column;
}

export function isFlexColumn<Row, Value>(
  column: ColumnDef<Row, Value>,
): column is Extract<ColumnDef<Row, Value>, { flex: number }> {
  return "flex" in column;
}

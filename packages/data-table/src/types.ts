import type { ReactNode } from "react";

type ColumnSizing =
  | { width: number; minWidth?: number; maxWidth?: number }
  | { flex: number; minWidth?: number; maxWidth?: number };

type ColumnCommon<Row, Value> = {
  key: string;
  header: ReactNode | ((column: ColumnDef<Row, Value>) => ReactNode);
  accessor: (row: Row) => Value;
  renderCell?: (value: Value, row: Row) => ReactNode;
  align?: "start" | "center" | "end";
  overflow?: "truncate" | "clip" | "wrap";
};

type ColumnDef<Row, Value = unknown> = ColumnCommon<Row, Value> & ColumnSizing;

type DataTableProps<Row> = {
  rows: Row[];
  // biome-ignore lint/suspicious/noExplicitAny: columns is a heterogeneous array — each ColumnDef has its own Value, so there is no single type to substitute for `any` here.
  columns: ColumnDef<Row, any>[];
  getRowId: (row: Row) => string;
  height?: number | string;
  width?: number | string;
  caption?: ReactNode;
  ariaLabel?: string;
  ariaLabelledBy?: string;
  loading?: boolean;
  emptyState?: ReactNode;
  errorState?: ReactNode;
};

function createColumnHelper<Row>() {
  return {
    accessor<Value>(
      accessorFn: (row: Row) => Value,
      config: Omit<ColumnCommon<Row, Value>, "accessor"> & ColumnSizing,
    ): ColumnDef<Row, Value> {
      return { ...config, accessor: accessorFn };
    },
  };
}

export type { ColumnDef, DataTableProps };
export { createColumnHelper };

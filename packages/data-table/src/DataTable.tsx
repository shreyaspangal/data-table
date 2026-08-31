"use client";

import styles from "./DataTable.module.css";
import type { DataTableProps } from "./types";

export function DataTable<Row>(props: DataTableProps<Row>) {
  const {
    ariaLabel,
    ariaLabelledBy,
    caption,
    rows,
    columns,
    getRowId,
    emptyState,
    errorState,
    loading,
    height,
  } = props;
  const hasData = rows.length > 0;
  const state = {
    error: !!errorState && !loading,
    loading: loading,
    empty: !hasData && !loading && !errorState,
    data: hasData && !loading && !errorState,
  };

  return (
    <div
      className={styles.scrollContainer}
      style={{
        height: height ?? "auto",
      }}
    >
      <table
        aria-label={!caption ? ariaLabel : undefined}
        aria-labelledby={!caption ? ariaLabelledBy : undefined}
      >
        {caption && <caption>{caption}</caption>}
        <thead>
          <tr>
            {columns.map((column) => {
              const headerContent =
                typeof column.header === "function"
                  ? column.header(column)
                  : column.header;
              return (
                <th
                  scope="col"
                  key={column.key}
                  className={styles.stickyHeader}
                  style={{
                    ...("width" in column && { width: column.width }),
                    minWidth: column.minWidth,
                    maxWidth: column.maxWidth,
                  }}
                >
                  {headerContent}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {state.error && (
            <tr>
              <td colSpan={columns.length} className={styles.alignCenter}>
                {errorState}
              </td>
            </tr>
          )}
          {state.loading && (
            <tr>
              <td colSpan={columns.length} className={styles.alignCenter}>
                Loading...
              </td>
            </tr>
          )}
          {state.empty && (
            <tr>
              <td colSpan={columns.length} className={styles.alignCenter}>
                {emptyState || "No data available"}
              </td>
            </tr>
          )}
          {state.data &&
            rows.map((row) => {
              const rowId = getRowId(row);
              return (
                <tr key={rowId}>
                  {columns.map((column) => {
                    const cellValue = column.accessor(row);
                    const cellContent = column.renderCell
                      ? column.renderCell(cellValue, row)
                      : cellValue;

                    const alignClass = {
                      start: styles.alignStart,
                      center: styles.alignCenter,
                      end: styles.alignEnd,
                    };
                    const computedAlignClass =
                      alignClass[column.align ?? "start"];
                    const overflowClass = {
                      truncate: styles.overflowTruncate,
                      clip: styles.overflowClip,
                      wrap: styles.overflowWrap,
                    };
                    const computedOverflowClass =
                      overflowClass[column.overflow ?? "wrap"];

                    return (
                      <td
                        key={column.key}
                        className={`${computedAlignClass} ${computedOverflowClass}`}
                        style={{
                          ...("width" in column && { width: column.width }),
                          minWidth: column.minWidth,
                          maxWidth: column.maxWidth,
                        }}
                      >
                        {cellContent}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
        </tbody>
      </table>
    </div>
  );
}

"use client";

import { DataTable } from "@moderation/data-table";
import { columns, type QueueRow } from "./columns";

// Only plain data (rows) crosses the RSC boundary from page.tsx — this
// component owns everything behavior-shaped (columns, getRowId) client-side.
// See ADR-003.
export function QueueTable({ rows }: { rows: QueueRow[] }) {
  return (
    <DataTable
      rows={rows}
      columns={columns}
      getRowId={(row) => row.id}
      caption="Moderation queue"
      height={480}
    />
  );
}

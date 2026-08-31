"use client";

import { createColumnHelper } from "@moderation/data-table";

export type QueueRow = {
  id: string;
  title: string;
  status: "pending" | "approved" | "rejected";
  assignee: string;
  createdAt: string;
};

const columnHelper = createColumnHelper<QueueRow>();

// Deliberately mixes fixed and flex columns, and gives one flex column a
// minWidth that's larger than its fair share — this is the fixture Step 5's
// resolveColumnWidths needs to actually exercise both branches in a real
// browser: proportional split, and the iterative floor/redistribution path.
export const columns = [
  columnHelper.accessor((row) => row.id, {
    key: "id",
    header: "ID",
    width: 80,
  }),
  columnHelper.accessor((row) => row.title, {
    key: "title",
    header: "Title",
    flex: 2,
    minWidth: 240,
    overflow: "truncate",
  }),
  columnHelper.accessor((row) => row.status, {
    key: "status",
    header: "Status",
    width: 120,
    align: "center",
  }),
  columnHelper.accessor((row) => row.assignee, {
    key: "assignee",
    header: "Assignee",
    flex: 1,
  }),
  columnHelper.accessor((row) => row.createdAt, {
    key: "createdAt",
    header: "Created",
    width: 160,
    align: "end",
  }),
];

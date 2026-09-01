"use client";

import { createColumnHelper } from "@moderation/data-table";
import { AssigneeAvatar } from "./cells/AssigneeAvatar";
import { ContentPreview } from "./cells/ContentPreview";
import { formatRelativeTime } from "./cells/format-relative-time";
import { SeverityPill } from "./cells/SeverityPill";

// Deliberately flattened, per the RADIO doc's "flattened read-model" note:
// this mirrors reports joined with moderators, shaped for how the table
// renders it, not the raw normalized schema (assigneeId stays a real join
// at the query layer once Step 8 wires the DB — this fixture just names
// the shape that join produces).
export type QueueRow = {
  id: string;
  reference: string;
  reporterName: string;
  reporterAvatarUrl: string;
  contentThumbnailUrl: string;
  contentExcerpt: string;
  category:
    | "spam"
    | "harassment"
    | "nudity"
    | "violence"
    | "misinformation"
    | "copyright";
  severity: "low" | "medium" | "high" | "critical";
  status: "pending" | "reviewing" | "resolved" | "dismissed";
  assigneeName: string | null;
  assigneeAvatarUrl: string | null;
  reportCount: number;
  reportedAt: string;
};

const columnHelper = createColumnHelper<QueueRow>();

// Renderers land one at a time; columns without one fall through to
// defaultFormatter.
export const columns = [
  columnHelper.accessor((row) => row.reference, {
    key: "reference",
    header: "Reference",
    width: 110,
  }),
  columnHelper.accessor((row) => row.reporterName, {
    key: "reporter",
    header: "Reporter",
    flex: 1,
    minWidth: 140,
  }),
  columnHelper.accessor((row) => row.contentExcerpt, {
    key: "content",
    header: "Content",
    flex: 2,
    minWidth: 240,
    overflow: "truncate",
    renderCell: (excerpt, row) => (
      <ContentPreview
        thumbnailUrl={row.contentThumbnailUrl}
        excerpt={excerpt}
      />
    ),
  }),
  columnHelper.accessor((row) => row.category, {
    key: "category",
    header: "Category",
    width: 130,
  }),
  columnHelper.accessor((row) => row.severity, {
    key: "severity",
    header: "Severity",
    width: 100,
    align: "center",
    renderCell: (value) => <SeverityPill severity={value} />,
  }),
  columnHelper.accessor((row) => row.status, {
    key: "status",
    header: "Status",
    width: 110,
    align: "center",
  }),
  columnHelper.accessor((row) => row.assigneeName, {
    key: "assignee",
    header: "Assignee",
    flex: 1,
    minWidth: 140,
    renderCell: (name, row) => (
      <AssigneeAvatar name={name} avatarUrl={row.assigneeAvatarUrl} />
    ),
  }),
  columnHelper.accessor((row) => row.reportCount, {
    key: "reportCount",
    header: "Reports",
    width: 90,
    align: "end",
  }),
  columnHelper.accessor((row) => row.reportedAt, {
    key: "reportedAt",
    header: "Reported",
    width: 160,
    align: "end",
    renderCell: (value) => formatRelativeTime(value),
  }),
];

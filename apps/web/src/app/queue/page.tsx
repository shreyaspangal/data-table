import type { QueueRow } from "./columns";
import { QueueTable } from "./QueueTable";

// Static fixture rows — real data (Neon + TanStack Query) arrives in Step 8.
// This page exists purely to exercise DataTable in a real browser: Server
// Component fetches (here, hardcodes) rows, columns.tsx defines behavior
// client-side, DataTable renders. See ADR-003 for why that split exists.
const rows: QueueRow[] = [
  {
    id: "1",
    title: "Suspicious listing flagged by three users for misleading pricing",
    status: "pending",
    assignee: "Priya Shah",
    createdAt: "2026-08-29",
  },
  {
    id: "2",
    title: "Duplicate account report",
    status: "approved",
    assignee: "Marcus Lee",
    createdAt: "2026-08-28",
  },
  {
    id: "3",
    title: "Review contains contact information, violates policy §4.2",
    status: "rejected",
    assignee: "Priya Shah",
    createdAt: "2026-08-27",
  },
  {
    id: "4",
    title: "Image asset flagged for low quality",
    status: "pending",
    assignee: "Diego Ramirez",
    createdAt: "2026-08-26",
  },
];

export default function QueuePage() {
  return (
    <main>
      <QueueTable rows={rows} />
    </main>
  );
}

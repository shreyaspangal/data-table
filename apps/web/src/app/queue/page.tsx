import type { QueueRow } from "./columns";
import { QueueTable } from "./QueueTable";

// Static fixture rows — real data (Neon + TanStack Query) arrives in Step 8.
// Shape matches the real `reports` schema (see src/db/schema.ts), flattened
// as if already joined with moderators — this page exists purely to verify
// DataTable in a real browser, not to model actual persistence.
const rows: QueueRow[] = [
  {
    id: "1",
    reference: "RPT-04821",
    reporterName: "Priya Shah",
    reporterAvatarUrl: "https://i.pravatar.cc/40?u=priya",
    contentThumbnailUrl: "https://picsum.photos/seed/rpt1/80/80",
    contentExcerpt:
      "Suspicious listing flagged by three users for misleading pricing",
    category: "misinformation",
    severity: "high",
    status: "pending",
    assigneeName: null,
    assigneeAvatarUrl: null,
    reportCount: 3,
    reportedAt: "2026-08-29T14:32:00Z",
  },
  {
    id: "2",
    reference: "RPT-04815",
    reporterName: "Marcus Lee",
    reporterAvatarUrl: "https://i.pravatar.cc/40?u=marcus",
    contentThumbnailUrl: "https://picsum.photos/seed/rpt2/80/80",
    contentExcerpt: "Duplicate account report",
    category: "spam",
    severity: "low",
    status: "resolved",
    assigneeName: "Diego Ramirez",
    assigneeAvatarUrl: "https://i.pravatar.cc/40?u=diego",
    reportCount: 1,
    reportedAt: "2026-08-28T09:12:00Z",
  },
  {
    id: "3",
    reference: "RPT-04799",
    reporterName: "Priya Shah",
    reporterAvatarUrl: "https://i.pravatar.cc/40?u=priya",
    contentThumbnailUrl: "https://picsum.photos/seed/rpt3/80/80",
    contentExcerpt: "Review contains contact information, violates policy §4.2",
    category: "harassment",
    severity: "critical",
    status: "dismissed",
    assigneeName: "Priya Shah",
    assigneeAvatarUrl: "https://i.pravatar.cc/40?u=priya",
    reportCount: 5,
    reportedAt: "2026-08-27T18:45:00Z",
  },
  {
    id: "4",
    reference: "RPT-04780",
    reporterName: "Diego Ramirez",
    reporterAvatarUrl: "https://i.pravatar.cc/40?u=diego",
    contentThumbnailUrl: "https://picsum.photos/seed/rpt4/80/80",
    contentExcerpt: "Image asset flagged for low quality",
    category: "copyright",
    severity: "medium",
    status: "reviewing",
    assigneeName: "Marcus Lee",
    assigneeAvatarUrl: "https://i.pravatar.cc/40?u=marcus",
    reportCount: 2,
    reportedAt: "2026-08-26T11:05:00Z",
  },
];

export default function QueuePage() {
  return (
    <main>
      <QueueTable rows={rows} />
    </main>
  );
}

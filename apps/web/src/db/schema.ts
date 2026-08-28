import {
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const severityEnum = pgEnum("severity", [
  "low",
  "medium",
  "high",
  "critical",
]);

export const statusEnum = pgEnum("status", [
  "pending",
  "reviewing",
  "resolved",
  "dismissed",
]);

export const categoryEnum = pgEnum("category", [
  "spam",
  "harassment",
  "nudity",
  "violence",
  "misinformation",
  "copyright",
]);

export const moderators = pgTable("moderators", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  avatarUrl: text("avatar_url").notNull(),
});

export const reports = pgTable(
  "reports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // Human-facing short id, e.g. "RPT-04821". Kept separate from the uuid so
    // the table has a narrow, fixed-width first column.
    reference: text("reference").notNull().unique(),
    reporterName: text("reporter_name").notNull(),
    reporterAvatarUrl: text("reporter_avatar_url").notNull(),
    contentThumbnailUrl: text("content_thumbnail_url").notNull(),
    contentExcerpt: text("content_excerpt").notNull(),
    category: categoryEnum("category").notNull(),
    severity: severityEnum("severity").notNull(),
    status: statusEnum("status").notNull().default("pending"),
    assigneeId: uuid("assignee_id").references(() => moderators.id, {
      onDelete: "set null",
    }),
    reportCount: integer("report_count").notNull().default(1),
    reportedAt: timestamp("reported_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    // Keyset pagination in Phase 2 sorts on (reportedAt, id); the status index
    // backs the one filter Phase 1 wires through nuqs.
    index("reports_reported_at_id_idx").on(table.reportedAt, table.id),
    index("reports_status_idx").on(table.status),
  ],
);

export type Report = typeof reports.$inferSelect;
export type Moderator = typeof moderators.$inferSelect;

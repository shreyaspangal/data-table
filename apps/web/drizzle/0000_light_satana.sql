CREATE TYPE "public"."category" AS ENUM('spam', 'harassment', 'nudity', 'violence', 'misinformation', 'copyright');--> statement-breakpoint
CREATE TYPE "public"."severity" AS ENUM('low', 'medium', 'high', 'critical');--> statement-breakpoint
CREATE TYPE "public"."status" AS ENUM('pending', 'reviewing', 'resolved', 'dismissed');--> statement-breakpoint
CREATE TABLE "moderators" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"avatar_url" text NOT NULL,
	CONSTRAINT "moderators_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reference" text NOT NULL,
	"reporter_name" text NOT NULL,
	"reporter_avatar_url" text NOT NULL,
	"content_thumbnail_url" text NOT NULL,
	"content_excerpt" text NOT NULL,
	"category" "category" NOT NULL,
	"severity" "severity" NOT NULL,
	"status" "status" DEFAULT 'pending' NOT NULL,
	"assignee_id" uuid,
	"report_count" integer DEFAULT 1 NOT NULL,
	"reported_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reports_reference_unique" UNIQUE("reference")
);
--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_assignee_id_moderators_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "public"."moderators"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "reports_reported_at_id_idx" ON "reports" USING btree ("reported_at","id");--> statement-breakpoint
CREATE INDEX "reports_status_idx" ON "reports" USING btree ("status");
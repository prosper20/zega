CREATE TABLE "system_jobs" (
	"name" text PRIMARY KEY NOT NULL,
	"last_run_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_result" text
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "email_notifications" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "service_requests" ADD COLUMN "sla_escalated_at" timestamp with time zone;
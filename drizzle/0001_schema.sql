CREATE TYPE "public"."attachment_kind" AS ENUM('evidence', 'before', 'after');--> statement-breakpoint
CREATE TYPE "public"."audit_action" AS ENUM('INSERT', 'UPDATE', 'DELETE');--> statement-breakpoint
CREATE TYPE "public"."location_kind" AS ENUM('campus', 'building', 'hostel', 'floor', 'room', 'outdoor');--> statement-breakpoint
CREATE TYPE "public"."request_priority" AS ENUM('low', 'medium', 'high', 'urgent');--> statement-breakpoint
CREATE TYPE "public"."request_status" AS ENUM('submitted', 'triaged', 'assigned', 'in_progress', 'on_hold', 'resolved', 'closed', 'reopened', 'rejected', 'cancelled');--> statement-breakpoint
CREATE SEQUENCE "public"."service_request_ref_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1;--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"table_name" text NOT NULL,
	"row_id" text NOT NULL,
	"action" "audit_action" NOT NULL,
	"actor_id" text,
	"diff" jsonb NOT NULL,
	"prev_hash" text,
	"hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "jwks" (
	"id" text PRIMARY KEY NOT NULL,
	"public_key" text NOT NULL,
	"private_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone,
	"alg" text,
	"crv" text
);
--> statement-breakpoint
CREATE TABLE "rate_limits" (
	"id" text PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"count" integer NOT NULL,
	"last_request" bigint NOT NULL,
	CONSTRAINT "rate_limits_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	"impersonated_by" text,
	CONSTRAINT "sessions_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"role" text DEFAULT 'student' NOT NULL,
	"banned" boolean DEFAULT false,
	"ban_reason" text,
	"ban_expires" timestamp with time zone,
	"department" text,
	"phone" text,
	"matric_or_staff_no" text,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_matricOrStaffNo_unique" UNIQUE("matric_or_staff_no")
);
--> statement-breakpoint
CREATE TABLE "verifications" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "officer_specialties" (
	"officer_id" text NOT NULL,
	"category_id" uuid NOT NULL,
	CONSTRAINT "officer_specialties_officer_id_category_id_pk" PRIMARY KEY("officer_id","category_id")
);
--> statement-breakpoint
CREATE TABLE "request_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"icon" text DEFAULT 'wrench' NOT NULL,
	"default_priority" "request_priority" DEFAULT 'medium' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone,
	CONSTRAINT "request_categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "sla_policies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category_id" uuid NOT NULL,
	"priority" "request_priority" NOT NULL,
	"response_minutes" integer NOT NULL,
	"resolution_minutes" integer NOT NULL,
	CONSTRAINT "sla_policies_category_priority_uq" UNIQUE("category_id","priority")
);
--> statement-breakpoint
CREATE TABLE "locations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"parent_id" uuid,
	"name" text NOT NULL,
	"code" text NOT NULL,
	"kind" "location_kind" NOT NULL,
	"path" "ltree" DEFAULT ''::ltree NOT NULL,
	"qr_token" text DEFAULT substr(replace(gen_random_uuid()::text, '-', ''), 1, 12) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "locations_code_unique" UNIQUE("code"),
	CONSTRAINT "locations_qrToken_unique" UNIQUE("qr_token")
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"request_id" uuid,
	"data" jsonb,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "permissions" (
	"key" text PRIMARY KEY NOT NULL,
	"description" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "role_permissions" (
	"role_slug" text NOT NULL,
	"permission_key" text NOT NULL,
	CONSTRAINT "role_permissions_role_slug_permission_key_pk" PRIMARY KEY("role_slug","permission_key")
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"slug" text PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"description" text NOT NULL,
	"is_system" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid NOT NULL,
	"officer_id" text NOT NULL,
	"assigned_by_id" text,
	"note" text,
	"assigned_at" timestamp with time zone DEFAULT now() NOT NULL,
	"unassigned_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "attachments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid NOT NULL,
	"status_log_id" uuid,
	"uploaded_by_id" text NOT NULL,
	"kind" "attachment_kind" DEFAULT 'evidence' NOT NULL,
	"url" text NOT NULL,
	"pathname" text NOT NULL,
	"content_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid NOT NULL,
	"author_id" text NOT NULL,
	"body" text NOT NULL,
	"internal" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ratings" (
	"request_id" uuid PRIMARY KEY NOT NULL,
	"rated_by_id" text NOT NULL,
	"score" smallint NOT NULL,
	"comment" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ratings_score_range" CHECK ("ratings"."score" between 1 and 5)
);
--> statement-breakpoint
CREATE TABLE "request_votes" (
	"request_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "request_votes_request_id_user_id_pk" PRIMARY KEY("request_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "service_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ref_code" text DEFAULT 'ZG-' || to_char(now(), 'YY') || '-' || lpad(nextval('service_request_ref_seq')::text, 6, '0') NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"category_id" uuid NOT NULL,
	"location_id" uuid NOT NULL,
	"location_detail" text,
	"priority" "request_priority" DEFAULT 'medium' NOT NULL,
	"status" "request_status" DEFAULT 'submitted' NOT NULL,
	"requester_id" text NOT NULL,
	"current_assignee_id" text,
	"response_due_at" timestamp with time zone,
	"resolution_due_at" timestamp with time zone,
	"first_response_at" timestamp with time zone,
	"resolved_at" timestamp with time zone,
	"closed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"search" "tsvector" GENERATED ALWAYS AS (setweight(to_tsvector('english', coalesce(ref_code, '')), 'A') || setweight(to_tsvector('english', coalesce(title, '')), 'A') || setweight(to_tsvector('english', coalesce(description, '')), 'B')) STORED,
	CONSTRAINT "service_requests_refCode_unique" UNIQUE("ref_code")
);
--> statement-breakpoint
CREATE TABLE "status_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid NOT NULL,
	"from_status" "request_status",
	"to_status" "request_status" NOT NULL,
	"actor_id" text,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_role_roles_slug_fk" FOREIGN KEY ("role") REFERENCES "public"."roles"("slug") ON DELETE no action ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "officer_specialties" ADD CONSTRAINT "officer_specialties_officer_id_users_id_fk" FOREIGN KEY ("officer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "officer_specialties" ADD CONSTRAINT "officer_specialties_category_id_request_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."request_categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sla_policies" ADD CONSTRAINT "sla_policies_category_id_request_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."request_categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "locations" ADD CONSTRAINT "locations_parent_id_locations_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."locations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_request_id_service_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."service_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_slug_roles_slug_fk" FOREIGN KEY ("role_slug") REFERENCES "public"."roles"("slug") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_key_permissions_key_fk" FOREIGN KEY ("permission_key") REFERENCES "public"."permissions"("key") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_request_id_service_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."service_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_officer_id_users_id_fk" FOREIGN KEY ("officer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_assigned_by_id_users_id_fk" FOREIGN KEY ("assigned_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_request_id_service_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."service_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_status_log_id_status_logs_id_fk" FOREIGN KEY ("status_log_id") REFERENCES "public"."status_logs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_uploaded_by_id_users_id_fk" FOREIGN KEY ("uploaded_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_request_id_service_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."service_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_request_id_service_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."service_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_rated_by_id_users_id_fk" FOREIGN KEY ("rated_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "request_votes" ADD CONSTRAINT "request_votes_request_id_service_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."service_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "request_votes" ADD CONSTRAINT "request_votes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_requests" ADD CONSTRAINT "service_requests_category_id_request_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."request_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_requests" ADD CONSTRAINT "service_requests_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_requests" ADD CONSTRAINT "service_requests_requester_id_users_id_fk" FOREIGN KEY ("requester_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_requests" ADD CONSTRAINT "service_requests_current_assignee_id_users_id_fk" FOREIGN KEY ("current_assignee_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "status_logs" ADD CONSTRAINT "status_logs_request_id_service_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."service_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "status_logs" ADD CONSTRAINT "status_logs_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_logs_row_idx" ON "audit_logs" USING btree ("table_name","row_id");--> statement-breakpoint
CREATE INDEX "audit_logs_actor_idx" ON "audit_logs" USING btree ("actor_id");--> statement-breakpoint
CREATE INDEX "accounts_user_idx" ON "accounts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "users_role_idx" ON "users" USING btree ("role");--> statement-breakpoint
CREATE INDEX "verifications_identifier_idx" ON "verifications" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX "locations_path_gist" ON "locations" USING gist ("path");--> statement-breakpoint
CREATE INDEX "locations_parent_idx" ON "locations" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "notifications_user_idx" ON "notifications" USING btree ("user_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "assignments_request_idx" ON "assignments" USING btree ("request_id");--> statement-breakpoint
CREATE INDEX "assignments_officer_active_idx" ON "assignments" USING btree ("officer_id") WHERE "assignments"."unassigned_at" is null;--> statement-breakpoint
CREATE INDEX "attachments_request_idx" ON "attachments" USING btree ("request_id");--> statement-breakpoint
CREATE INDEX "comments_request_idx" ON "comments" USING btree ("request_id","created_at");--> statement-breakpoint
CREATE INDEX "service_requests_status_idx" ON "service_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "service_requests_requester_idx" ON "service_requests" USING btree ("requester_id");--> statement-breakpoint
CREATE INDEX "service_requests_assignee_idx" ON "service_requests" USING btree ("current_assignee_id");--> statement-breakpoint
CREATE INDEX "service_requests_category_idx" ON "service_requests" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "service_requests_location_idx" ON "service_requests" USING btree ("location_id");--> statement-breakpoint
CREATE INDEX "service_requests_created_idx" ON "service_requests" USING btree ("created_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "service_requests_search_gin" ON "service_requests" USING gin ("search");--> statement-breakpoint
CREATE INDEX "service_requests_title_trgm" ON "service_requests" USING gin ("title" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "status_logs_request_idx" ON "status_logs" USING btree ("request_id","created_at");
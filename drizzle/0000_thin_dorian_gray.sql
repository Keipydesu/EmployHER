CREATE EXTENSION IF NOT EXISTS vector;
--> statement-breakpoint
CREATE TABLE "profile_operations" (
	"owner_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"key" text NOT NULL,
	"digest" text NOT NULL,
	"pending" boolean DEFAULT true NOT NULL,
	"lease_expires_at" timestamp with time zone NOT NULL,
	"value" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "profile_operations_owner_id_kind_key_pk" PRIMARY KEY("owner_id","kind","key")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"auth0_sub" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "users_auth0_sub_unique" UNIQUE("auth0_sub")
);
--> statement-breakpoint
CREATE TABLE "profile_invalidation_events" (
	"id" uuid PRIMARY KEY NOT NULL,
	"owner_id" uuid NOT NULL,
	"profile_id" uuid NOT NULL,
	"previous_version" integer NOT NULL,
	"version" integer NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "resume_profile_heads" (
	"id" uuid PRIMARY KEY NOT NULL,
	"owner_id" uuid NOT NULL,
	"current_version" integer NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	CONSTRAINT "profile_head_positive_version" CHECK ("resume_profile_heads"."current_version" > 0)
);
--> statement-breakpoint
CREATE TABLE "profile_owner_lifecycle" (
	"owner_id" uuid PRIMARY KEY NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "resume_profile_versions" (
	"profile_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"status" text NOT NULL,
	"facts" jsonb NOT NULL,
	"embedding" vector(768),
	"embedding_model" text,
	"extraction_model" text NOT NULL,
	"prompt_version" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "resume_profile_versions_profile_id_version_pk" PRIMARY KEY("profile_id","version"),
	CONSTRAINT "profile_positive_version" CHECK ("resume_profile_versions"."version" > 0),
	CONSTRAINT "profile_valid_status" CHECK ("resume_profile_versions"."status" IN ('draft', 'confirmed')),
	CONSTRAINT "profile_facts_array" CHECK (jsonb_typeof("resume_profile_versions"."facts") = 'array'),
	CONSTRAINT "profile_confirmation_embedding" CHECK ((
      "resume_profile_versions"."status" = 'draft' AND "resume_profile_versions"."embedding" IS NULL AND "resume_profile_versions"."embedding_model" IS NULL
    ) OR (
      "resume_profile_versions"."status" = 'confirmed' AND "resume_profile_versions"."embedding" IS NOT NULL AND "resume_profile_versions"."embedding_model" IS NOT NULL
    ))
);
--> statement-breakpoint
ALTER TABLE "profile_invalidation_events" ADD CONSTRAINT "profile_invalidation_events_profile_id_resume_profile_heads_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."resume_profile_heads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resume_profile_versions" ADD CONSTRAINT "resume_profile_versions_profile_id_resume_profile_heads_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."resume_profile_heads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "profile_owner_idx" ON "resume_profile_heads" USING btree ("owner_id");
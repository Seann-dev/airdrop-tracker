CREATE TABLE IF NOT EXISTS "airdrops" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" text NOT NULL,
	"legacy_id" text,
	"project_name" text NOT NULL,
	"network" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'Watching' NOT NULL,
	"deadline" timestamp with time zone,
	"official_link" text DEFAULT '' NOT NULL,
	"category" text DEFAULT '' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"tasks" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

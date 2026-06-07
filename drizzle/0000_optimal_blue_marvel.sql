CREATE TABLE "bracket_scores" (
	"bracket_id" uuid NOT NULL,
	"round_key" text NOT NULL,
	"points" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "bracket_scores_bracket_id_round_key_pk" PRIMARY KEY("bracket_id","round_key")
);
--> statement-breakpoint
CREATE TABLE "brackets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_clerk_id" text NOT NULL,
	"pool_id" uuid NOT NULL,
	"name" text NOT NULL,
	"predictions" jsonb NOT NULL,
	"total_points" integer DEFAULT 0 NOT NULL,
	"locked_at" timestamp with time zone,
	"submitted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "group_standings" (
	"group_letter" text NOT NULL,
	"team_code" text NOT NULL,
	"played" integer DEFAULT 0 NOT NULL,
	"points" integer DEFAULT 0 NOT NULL,
	"gd" integer DEFAULT 0 NOT NULL,
	"gf" integer DEFAULT 0 NOT NULL,
	"rank" integer,
	"advanced" boolean DEFAULT false NOT NULL,
	"is_best_third" boolean DEFAULT false NOT NULL,
	CONSTRAINT "group_standings_group_letter_team_code_pk" PRIMARY KEY("group_letter","team_code")
);
--> statement-breakpoint
CREATE TABLE "matches" (
	"id" integer PRIMARY KEY NOT NULL,
	"stage" text NOT NULL,
	"group_letter" text,
	"home_code" text,
	"away_code" text,
	"home_placeholder" text,
	"away_placeholder" text,
	"home_score" integer,
	"away_score" integer,
	"status" text DEFAULT 'scheduled' NOT NULL,
	"winner_code" text,
	"kickoff_utc" timestamp with time zone NOT NULL,
	"round_label" text NOT NULL,
	"provider_fixture_id" integer
);
--> statement-breakpoint
CREATE TABLE "pool_members" (
	"pool_id" uuid NOT NULL,
	"clerk_id" text NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pool_members_pool_id_clerk_id_pk" PRIMARY KEY("pool_id","clerk_id")
);
--> statement-breakpoint
CREATE TABLE "pools" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"owner_clerk_id" text NOT NULL,
	"join_code" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pools_join_code_unique" UNIQUE("join_code")
);
--> statement-breakpoint
CREATE TABLE "sync_meta" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "teams" (
	"code" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"group_letter" text NOT NULL,
	"flag" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"clerk_id" text PRIMARY KEY NOT NULL,
	"display_name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "brackets_owner_pool_unique" ON "brackets" USING btree ("owner_clerk_id","pool_id");
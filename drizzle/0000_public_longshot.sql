CREATE TABLE "use_next_ship_account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "use_next_ship_invitation" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"email" text NOT NULL,
	"role" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"expires_at" timestamp NOT NULL,
	"inviter_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "use_next_ship_member" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "use_next_ship_organization" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"logo" text,
	"created_at" timestamp NOT NULL,
	"metadata" text,
	CONSTRAINT "use_next_ship_organization_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "use_next_ship_session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	"active_organization_id" text,
	CONSTRAINT "use_next_ship_session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "use_next_ship_user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "use_next_ship_user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "use_next_ship_verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "use_next_ship_account" ADD CONSTRAINT "use_next_ship_account_user_id_use_next_ship_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."use_next_ship_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "use_next_ship_invitation" ADD CONSTRAINT "use_next_ship_invitation_organization_id_use_next_ship_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."use_next_ship_organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "use_next_ship_invitation" ADD CONSTRAINT "use_next_ship_invitation_inviter_id_use_next_ship_user_id_fk" FOREIGN KEY ("inviter_id") REFERENCES "public"."use_next_ship_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "use_next_ship_member" ADD CONSTRAINT "use_next_ship_member_organization_id_use_next_ship_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."use_next_ship_organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "use_next_ship_member" ADD CONSTRAINT "use_next_ship_member_user_id_use_next_ship_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."use_next_ship_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "use_next_ship_session" ADD CONSTRAINT "use_next_ship_session_user_id_use_next_ship_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."use_next_ship_user"("id") ON DELETE cascade ON UPDATE no action;
CREATE TABLE "tenant_keys" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid DEFAULT app_current_tenant_id() NOT NULL,
	"purpose" text NOT NULL,
	"key_version" integer NOT NULL,
	"master_key_id" text NOT NULL,
	"wrapped_key" "bytea" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tenant_keys_tenant_purpose_version" UNIQUE("tenant_id","purpose","key_version")
);
--> statement-breakpoint
-- Hand-added (pnpm --filter @hims/db db:rls tenant_keys) + a purpose check.
ALTER TABLE "tenant_keys" ADD CONSTRAINT "tenant_keys_purpose_check" CHECK ("purpose" IN ('data', 'index'));
--> statement-breakpoint
ALTER TABLE "tenant_keys" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "tenant_keys" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY tenant_isolation ON "tenant_keys" AS PERMISSIVE FOR ALL USING (tenant_id = (select app_current_tenant_id())) WITH CHECK (tenant_id = (select app_current_tenant_id()));

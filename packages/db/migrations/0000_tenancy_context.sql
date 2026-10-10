-- Request context readers used by base-column defaults and RLS policies (@hims/db).
-- withTenant() sets these with set_config(..., true): transaction-local, so they never leak
-- between PgBouncer transaction-pooled clients. Unset -> NULL. nullif() matters: after a
-- transaction-local set ends, the custom GUC reads '' (not NULL) for the rest of the session.
CREATE OR REPLACE FUNCTION app_current_tenant_id() RETURNS uuid
  LANGUAGE sql STABLE PARALLEL SAFE
  AS $$ SELECT nullif(current_setting('app.tenant_id', true), '')::uuid $$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION app_current_branch_id() RETURNS uuid
  LANGUAGE sql STABLE PARALLEL SAFE
  AS $$ SELECT nullif(current_setting('app.branch_id', true), '')::uuid $$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION app_current_user_id() RETURNS uuid
  LANGUAGE sql STABLE PARALLEL SAFE
  AS $$ SELECT nullif(current_setting('app.user_id', true), '')::uuid $$;

-- Runs once, on first start of an empty data volume (docker-entrypoint-initdb.d).
-- hims       = bootstrap superuser (POSTGRES_USER). Creates roles; never used by the app or migrations.
-- hims_owner = owns every schema object and runs migrations (direct :5432). NOT a superuser and no
--              BYPASSRLS, so SECURITY DEFINER functions cannot escalate and FORCE ROW LEVEL
--              SECURITY binds it too.
-- hims_app   = what the API uses through PgBouncer. Not a superuser and no BYPASSRLS,
--              so row-level security policies actually apply in development.
CREATE ROLE hims_owner LOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE PASSWORD 'hims_owner';
CREATE ROLE hims_app LOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE PASSWORD 'hims_app';

-- The owner may create schemas (drizzle's migration bookkeeping) and owns public.
GRANT CONNECT, CREATE, TEMPORARY ON DATABASE hims TO hims_owner;
ALTER SCHEMA public OWNER TO hims_owner;

GRANT CONNECT ON DATABASE hims TO hims_app;
GRANT USAGE ON SCHEMA public TO hims_app;

-- Tables and sequences the owner creates later are usable by the app role.
ALTER DEFAULT PRIVILEGES FOR ROLE hims_owner IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO hims_app;
ALTER DEFAULT PRIVILEGES FOR ROLE hims_owner IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO hims_app;

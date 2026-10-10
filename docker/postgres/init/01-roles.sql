-- Runs once, on first start of an empty data volume (docker-entrypoint-initdb.d).
-- hims      = owner/migrator (superuser, direct :5432). Migrations and admin only.
-- hims_app  = what the API uses through PgBouncer. Not a superuser and no BYPASSRLS,
--             so row-level security policies actually apply in development.
CREATE ROLE hims_app LOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE PASSWORD 'hims_app';

GRANT CONNECT ON DATABASE hims TO hims_app;
GRANT USAGE ON SCHEMA public TO hims_app;

-- Tables and sequences the migrator creates later are usable by the app role.
ALTER DEFAULT PRIVILEGES FOR ROLE hims IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO hims_app;
ALTER DEFAULT PRIVILEGES FOR ROLE hims IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO hims_app;

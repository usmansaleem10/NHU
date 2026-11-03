-- Tenant keys are append-only for the app: overwriting or deleting a wrapped key would make that
-- tenant's PII undecryptable. Rotation inserts a new version; re-wrapping (master key rotation)
-- and retiring keys run as hims_owner.
REVOKE UPDATE, DELETE, TRUNCATE ON public.tenant_keys FROM hims_app;

-- Three-layer multi-tenant isolation (docs/architecture/08 risk #7: "One cross-client leak ends
-- client trust permanently"). Layers 1 (NestJS tenant guard) and 2 (Prisma tenant-scoping
-- extension) live in application code; this migration builds layer 3, enforced by Postgres itself
-- so a bug in application code cannot leak another client's rows.
--
-- Design:
--   1. A restricted, non-superuser role (field_command_app) is what the running API connects as.
--      The migration/owner role stays a superuser so migrations are unaffected — Postgres
--      superusers and table owners without FORCE RLS always bypass RLS, which would make RLS
--      silently inert if the app connected as that same role.
--   2. RLS is FAIL-CLOSED: with no `app.tenant_id` session setting, `client_id = NULL` compares to
--      NULL, which is never TRUE, so zero rows are visible. A request that forgets to set tenant
--      context sees nothing rather than everything.
--   3. Platform/cross-tenant access (Super Admin, Impact staff) is a deliberate, separately-set
--      `app.bypass_rls = 'true'` session flag — never a silent default. The application layer
--      gates who is allowed to set that flag via the same permission model as everything else.
--   4. Applied by walking information_schema for every table with a client_id column, not by
--      hand-listing tables, so a new tenant-scoped table added in a later migration can't be
--      forgotten — any future migration that adds a client_id column should re-run this same
--      DO block.
--   5. audit_logs additionally has UPDATE/DELETE revoked from the app role, enforcing "immutable
--      to ordinary administrators" (spec §37) at the database level, not just in application code.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'field_command_app') THEN
    -- Local-dev placeholder password, matching the same posture as POSTGRES_PASSWORD in
    -- .env.example: never a real secret, always rotated per environment. See APP_DATABASE_URL.
    CREATE ROLE field_command_app LOGIN PASSWORD 'impact_app_dev_password_change_me';
  END IF;
END
$$;

DO $$
BEGIN
  EXECUTE format('GRANT CONNECT ON DATABASE %I TO field_command_app', current_database());
END
$$;
GRANT USAGE ON SCHEMA public TO field_command_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO field_command_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO field_command_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO field_command_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO field_command_app;

-- Append-only audit log: the app role may INSERT and SELECT, never UPDATE or DELETE.
REVOKE UPDATE, DELETE ON audit_logs FROM field_command_app;

-- Enable RLS on every table that carries a client_id column (tenant-scoped tables).
DO $$
DECLARE
  t RECORD;
BEGIN
  FOR t IN
    SELECT table_name
    FROM information_schema.columns
    WHERE table_schema = 'public' AND column_name = 'clientId'
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t.table_name);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t.table_name);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', t.table_name);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I
         USING (
           "clientId" = current_setting(''app.tenant_id'', true)::uuid
           OR current_setting(''app.bypass_rls'', true) = ''true''
         )
         WITH CHECK (
           "clientId" = current_setting(''app.tenant_id'', true)::uuid
           OR current_setting(''app.bypass_rls'', true) = ''true''
         )',
      t.table_name
    );
  END LOOP;
END
$$;

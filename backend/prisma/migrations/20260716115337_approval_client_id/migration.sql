-- Adds clientId to `approvals` so the Postgres RLS tenant-isolation backstop (docs/architecture/06)
-- actually covers it. Found while starting Session C (supervisor review, built directly on this
-- table): RLS only walks tables that have a clientId column, and `approvals` — along with 15 other
-- tables — never had one, so the database-level isolation layer silently skipped it entirely,
-- relying only on application code to scope every query correctly. Table has zero rows in any
-- environment today (no service creates Approval rows yet), so this adds the column NOT NULL
-- directly rather than needing a backfill step. The other 15 affected tables are a known,
-- logged gap (docs/ASSUMPTIONS.md) for a dedicated later pass, not silently fixed here — this
-- migration is scoped to the one table Session C's new feature actually depends on.

-- AlterTable
ALTER TABLE "approvals" ADD COLUMN     "clientId" UUID NOT NULL;

-- CreateIndex
CREATE INDEX "approvals_clientId_idx" ON "approvals"("clientId");

-- Re-run the RLS-enabling walk, copied from the *current, correct* source
-- (20260715145432_fix_rls_regression_from_media_sessions) per that migration's own hard-learned
-- lesson (A-041): never copy this block from memory or from the original rls_and_app_role
-- migration, only from whichever migration most recently defined it correctly.
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
           "clientId" = NULLIF(current_setting(''app.tenant_id'', true), '''')::uuid
           OR current_setting(''app.bypass_rls'', true) = ''true''
         )
         WITH CHECK (
           "clientId" = NULLIF(current_setting(''app.tenant_id'', true), '''')::uuid
           OR current_setting(''app.bypass_rls'', true) = ''true''
         )',
      t.table_name
    );
  END LOOP;
END
$$;

-- Grant the restricted app role access to the new column's table (already granted at table level
-- by the original rls_and_app_role migration's ALL TABLES grant; explicit here for clarity, no-op
-- if already covered).
GRANT SELECT, INSERT, UPDATE, DELETE ON approvals TO field_command_app;

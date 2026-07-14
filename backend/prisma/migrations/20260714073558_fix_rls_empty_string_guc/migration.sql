-- Fixes a real bug found by end-to-end testing (not a hypothetical): PostgreSQL placeholder GUCs
-- (custom, extension-style settings like app.tenant_id that are never declared in postgresql.conf)
-- do NOT revert to NULL when a SET LOCAL that touched them goes out of scope — they revert to an
-- empty string ''. Since Prisma's connection pool reuses physical connections across unrelated
-- requests, any connection that had previously run runInTenantContext(...) would, on its very
-- next query — even a plain runWithBypass(...) call that never touches app.tenant_id — see
-- current_setting('app.tenant_id', true) return '' instead of NULL, and `''::uuid` throws
-- "invalid input syntax for type uuid", turning into a 500 on a totally unrelated request.
--
-- Fix: NULLIF(..., '') before the cast, so an empty string is treated exactly like "unset" (NULL),
-- preserving the fail-closed behavior (NULL clientId comparison is never true) without depending
-- on a Postgres GUC-reset quirk that isn't actually documented behavior to rely on.
--
-- Note: this migration was created via `prisma migrate dev --create-only`, which proposed dropping
-- the two manually-added PostGIS GIST indexes (gps_points_geo_point_gix, locations_geo_point_gix)
-- as "drift" — Prisma's shadow-database diffing doesn't know about indexes added by hand-authored
-- SQL outside schema.prisma's `Unsupported` fields. That proposal is intentionally not included
-- here; those indexes stay.

DO $$
DECLARE
  t RECORD;
BEGIN
  FOR t IN
    SELECT table_name
    FROM information_schema.columns
    WHERE table_schema = 'public' AND column_name = 'clientId'
  LOOP
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

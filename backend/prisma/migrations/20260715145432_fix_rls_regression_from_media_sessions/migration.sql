-- Corrects a real regression introduced by 20260715133316_media_upload_sessions: that migration
-- re-ran the RLS-enabling DO block copied from the *original* rls_and_app_role migration, which
-- does not have the NULLIF(...) fix that 20260714073558_fix_rls_empty_string_guc added — so it
-- silently reverted every table's tenant_isolation policy back to the buggy, pre-fix version,
-- reintroducing "invalid input syntax for type uuid: ''" on any pooled-connection reuse between a
-- runInTenantContext(...) call and a runWithBypass(...) call (see that migration's own comment for
-- the full mechanism). Reproduced live on the founder's phone: login succeeded through OTP verify,
-- then fetching campaigns crashed with exactly this error, looping the app back to the login
-- screen.
--
-- Never edit an already-applied migration file (its checksum is recorded once it's run) — this is
-- a new migration that re-applies the correct, NULLIF-wrapped policy on top, safe to run
-- regardless of which of the two versions is currently in place.

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

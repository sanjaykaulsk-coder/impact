-- Stage 4.1 (GPS/route/deviation engine). Three changes:
--
-- 1. route_traces gets clientId + campaignId and joins the RLS tenant-isolation backstop — it was
--    missed by the earlier full-hardening pass (20260719070000) because that migration only walks
--    tables that already had campaignId; route_traces had neither. Caught now, before this table
--    gets its first real writer (see docs/ASSUMPTIONS.md A-059), rather than after — the same
--    "fix it before code depends on it" reasoning as A-051.
-- 2. gps_points gets a nullable routeTraceId FK, linking individual points to the trace they
--    belong to, plus a distanceFromPlannedMeters column (same field CheckIn already has).
-- 3. deviation_requests gets an escalationLevel counter for manual escalation (no delayed-job
--    queue exists yet for the spec's timed 0/15/30/60-minute ladder — see A-059).
--
-- route_traces is currently empty in every environment (it has had no writer since the table was
-- created) but the nullable-then-backfill pattern is used anyway, consistent with every other
-- clientId-adding migration in this project, rather than a direct NOT NULL add.

-- AlterTable: deviation_requests
ALTER TABLE "deviation_requests" ADD COLUMN "escalationLevel" INTEGER NOT NULL DEFAULT 0;

-- AlterTable: gps_points
ALTER TABLE "gps_points" ADD COLUMN "distanceFromPlannedMeters" INTEGER,
ADD COLUMN "routeTraceId" UUID;

-- AlterTable: route_traces
ALTER TABLE "route_traces" ADD COLUMN "clientId" UUID;
ALTER TABLE "route_traces" ADD COLUMN "campaignId" UUID;
UPDATE "route_traces" t SET "clientId" = ai."clientId", "campaignId" = ai."campaignId"
  FROM "activity_instances" ai WHERE ai.id = t."activityInstanceId";
ALTER TABLE "route_traces" ALTER COLUMN "clientId" SET NOT NULL;
ALTER TABLE "route_traces" ALTER COLUMN "campaignId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "gps_points_routeTraceId_idx" ON "gps_points"("routeTraceId");
CREATE INDEX "route_traces_clientId_idx" ON "route_traces"("clientId");
CREATE INDEX "route_traces_campaignId_idx" ON "route_traces"("campaignId");

-- AddForeignKey
ALTER TABLE "gps_points" ADD CONSTRAINT "gps_points_routeTraceId_fkey" FOREIGN KEY ("routeTraceId") REFERENCES "route_traces"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Re-run the RLS-enabling walk so route_traces (now clientId-bearing) gets the tenant-isolation
-- policy too. Copied from the *current, correct* source (20260719070000_full_tenant_isolation_
-- hardening) per A-041's standing lesson: never copy this block from memory, only from whichever
-- migration most recently defined it correctly.
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

GRANT SELECT, INSERT, UPDATE, DELETE ON route_traces TO field_command_app;

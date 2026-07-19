-- Closes the remaining RLS tenant-isolation gap first flagged in A-043: the founder chose to fix
-- it in full now (before Stage 3.3), rather than patch it table-by-table as each future stage
-- happens to build on one of these. Adds `clientId` to the 15 tables that had `campaignId` but no
-- `clientId` — `Approval` (Session C) and `Workflow` (Stage 3.2) were already fixed on the same
-- pattern; this migration finishes the list: CampaignActivity, PJP, PJPRow, Route, Attendance,
-- GPSPoint, StockReport, SalesReport, Lead, Retailer, Consumer, DeviationRequest, Exception,
-- Comment, Report.
--
-- Several of these tables already have real seeded rows (campaign_activities, pjps, pjp_rows), so
-- every column is added nullable first, backfilled from the owning campaign, then made NOT NULL —
-- never a direct NOT NULL add, which would fail against existing data.
--
-- NOTE: `prisma migrate diff` also produced DROP INDEX statements for the two PostGIS GiST indexes
-- (gps_points_geo_point_gix, locations_geo_point_gix) — removed by hand, same as every prior
-- migration that touched these tables (they're raw-SQL indexes the Prisma schema doesn't know
-- about, not something this migration should ever drop).

-- AlterTable: attendances
ALTER TABLE "attendances" ADD COLUMN "clientId" UUID;
UPDATE "attendances" t SET "clientId" = c."clientId" FROM "campaigns" c WHERE c.id = t."campaignId";
ALTER TABLE "attendances" ALTER COLUMN "clientId" SET NOT NULL;
CREATE INDEX "attendances_clientId_idx" ON "attendances"("clientId");

-- AlterTable: campaign_activities
ALTER TABLE "campaign_activities" ADD COLUMN "clientId" UUID;
UPDATE "campaign_activities" t SET "clientId" = c."clientId" FROM "campaigns" c WHERE c.id = t."campaignId";
ALTER TABLE "campaign_activities" ALTER COLUMN "clientId" SET NOT NULL;
CREATE INDEX "campaign_activities_clientId_idx" ON "campaign_activities"("clientId");

-- AlterTable: comments
ALTER TABLE "comments" ADD COLUMN "clientId" UUID;
UPDATE "comments" t SET "clientId" = c."clientId" FROM "campaigns" c WHERE c.id = t."campaignId";
ALTER TABLE "comments" ALTER COLUMN "clientId" SET NOT NULL;
CREATE INDEX "comments_clientId_idx" ON "comments"("clientId");

-- AlterTable: consumers
ALTER TABLE "consumers" ADD COLUMN "clientId" UUID;
UPDATE "consumers" t SET "clientId" = c."clientId" FROM "campaigns" c WHERE c.id = t."campaignId";
ALTER TABLE "consumers" ALTER COLUMN "clientId" SET NOT NULL;
CREATE INDEX "consumers_clientId_idx" ON "consumers"("clientId");

-- AlterTable: deviation_requests
ALTER TABLE "deviation_requests" ADD COLUMN "clientId" UUID;
UPDATE "deviation_requests" t SET "clientId" = c."clientId" FROM "campaigns" c WHERE c.id = t."campaignId";
ALTER TABLE "deviation_requests" ALTER COLUMN "clientId" SET NOT NULL;
CREATE INDEX "deviation_requests_clientId_idx" ON "deviation_requests"("clientId");

-- AlterTable: exceptions
ALTER TABLE "exceptions" ADD COLUMN "clientId" UUID;
UPDATE "exceptions" t SET "clientId" = c."clientId" FROM "campaigns" c WHERE c.id = t."campaignId";
ALTER TABLE "exceptions" ALTER COLUMN "clientId" SET NOT NULL;
CREATE INDEX "exceptions_clientId_idx" ON "exceptions"("clientId");

-- AlterTable: gps_points
ALTER TABLE "gps_points" ADD COLUMN "clientId" UUID;
UPDATE "gps_points" t SET "clientId" = c."clientId" FROM "campaigns" c WHERE c.id = t."campaignId";
ALTER TABLE "gps_points" ALTER COLUMN "clientId" SET NOT NULL;
CREATE INDEX "gps_points_clientId_idx" ON "gps_points"("clientId");

-- AlterTable: leads
ALTER TABLE "leads" ADD COLUMN "clientId" UUID;
UPDATE "leads" t SET "clientId" = c."clientId" FROM "campaigns" c WHERE c.id = t."campaignId";
ALTER TABLE "leads" ALTER COLUMN "clientId" SET NOT NULL;
CREATE INDEX "leads_clientId_idx" ON "leads"("clientId");

-- AlterTable: pjp_rows
ALTER TABLE "pjp_rows" ADD COLUMN "clientId" UUID;
UPDATE "pjp_rows" t SET "clientId" = c."clientId" FROM "campaigns" c WHERE c.id = t."campaignId";
ALTER TABLE "pjp_rows" ALTER COLUMN "clientId" SET NOT NULL;
CREATE INDEX "pjp_rows_clientId_idx" ON "pjp_rows"("clientId");

-- AlterTable: pjps
ALTER TABLE "pjps" ADD COLUMN "clientId" UUID;
UPDATE "pjps" t SET "clientId" = c."clientId" FROM "campaigns" c WHERE c.id = t."campaignId";
ALTER TABLE "pjps" ALTER COLUMN "clientId" SET NOT NULL;
CREATE INDEX "pjps_clientId_idx" ON "pjps"("clientId");

-- AlterTable: reports
ALTER TABLE "reports" ADD COLUMN "clientId" UUID;
UPDATE "reports" t SET "clientId" = c."clientId" FROM "campaigns" c WHERE c.id = t."campaignId";
ALTER TABLE "reports" ALTER COLUMN "clientId" SET NOT NULL;
CREATE INDEX "reports_clientId_idx" ON "reports"("clientId");

-- AlterTable: retailers
ALTER TABLE "retailers" ADD COLUMN "clientId" UUID;
UPDATE "retailers" t SET "clientId" = c."clientId" FROM "campaigns" c WHERE c.id = t."campaignId";
ALTER TABLE "retailers" ALTER COLUMN "clientId" SET NOT NULL;
CREATE INDEX "retailers_clientId_idx" ON "retailers"("clientId");

-- AlterTable: routes
ALTER TABLE "routes" ADD COLUMN "clientId" UUID;
UPDATE "routes" t SET "clientId" = c."clientId" FROM "campaigns" c WHERE c.id = t."campaignId";
ALTER TABLE "routes" ALTER COLUMN "clientId" SET NOT NULL;
CREATE INDEX "routes_clientId_idx" ON "routes"("clientId");

-- AlterTable: sales_reports
ALTER TABLE "sales_reports" ADD COLUMN "clientId" UUID;
UPDATE "sales_reports" t SET "clientId" = c."clientId" FROM "campaigns" c WHERE c.id = t."campaignId";
ALTER TABLE "sales_reports" ALTER COLUMN "clientId" SET NOT NULL;
CREATE INDEX "sales_reports_clientId_idx" ON "sales_reports"("clientId");

-- AlterTable: stock_reports
ALTER TABLE "stock_reports" ADD COLUMN "clientId" UUID;
UPDATE "stock_reports" t SET "clientId" = c."clientId" FROM "campaigns" c WHERE c.id = t."campaignId";
ALTER TABLE "stock_reports" ALTER COLUMN "clientId" SET NOT NULL;
CREATE INDEX "stock_reports_clientId_idx" ON "stock_reports"("clientId");

-- Re-run the RLS-enabling walk so all 15 newly clientId-bearing tables get the tenant-isolation
-- policy. Copied from the *current, correct* source (20260718090000_workflow_client_id_sop_checklist)
-- per A-041's lesson: never copy this block from memory or from the original rls_and_app_role
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

-- The original rls_and_app_role migration granted on ALL TABLES existing at that time; these
-- tables already existed then and already had table-level grants — this is belt-and-suspenders,
-- explicit and harmless if already covered, matching the same pattern used for every prior
-- clientId-adding migration.
GRANT SELECT, INSERT, UPDATE, DELETE ON attendances TO field_command_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON campaign_activities TO field_command_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON comments TO field_command_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON consumers TO field_command_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON deviation_requests TO field_command_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON exceptions TO field_command_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON gps_points TO field_command_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON leads TO field_command_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON pjp_rows TO field_command_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON pjps TO field_command_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON reports TO field_command_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON retailers TO field_command_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON routes TO field_command_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON sales_reports TO field_command_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON stock_reports TO field_command_app;

-- Stage 3.2 (workflow builder + milestone engine + SOP checklists, docs/architecture/09) builds
-- directly on `workflows` — one of A-043's known RLS-gap tables (campaignId but no clientId) — so
-- per that entry's own stated plan, fixed here rather than deferred further. Unlike `approvals`
-- (Session C, empty table), `workflows` already has seeded rows, so this needs a real backfill
-- before the column can be NOT NULL.

-- CreateEnum
CREATE TYPE "SopItemStatus" AS ENUM ('PENDING', 'COMPLETED', 'NOT_APPLICABLE');

-- AlterTable: add nullable first, backfill from the owning campaign, then enforce NOT NULL.
ALTER TABLE "workflows" ADD COLUMN "clientId" UUID;
UPDATE "workflows" w SET "clientId" = c."clientId" FROM "campaigns" c WHERE c.id = w."campaignId";
ALTER TABLE "workflows" ALTER COLUMN "clientId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "workflows_clientId_idx" ON "workflows"("clientId");

-- CreateTable
CREATE TABLE "sop_checklist_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "clientId" UUID NOT NULL,
    "campaignId" UUID NOT NULL,
    "workflowStageId" UUID NOT NULL,
    "label" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "isMandatory" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sop_checklist_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sop_checklist_responses" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "clientId" UUID NOT NULL,
    "campaignId" UUID NOT NULL,
    "activityInstanceId" UUID NOT NULL,
    "sopChecklistItemId" UUID NOT NULL,
    "status" "SopItemStatus" NOT NULL DEFAULT 'PENDING',
    "markedByUserId" UUID,
    "markedAt" TIMESTAMP(3),
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sop_checklist_responses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "sop_checklist_items_clientId_idx" ON "sop_checklist_items"("clientId");

-- CreateIndex
CREATE INDEX "sop_checklist_items_campaignId_idx" ON "sop_checklist_items"("campaignId");

-- CreateIndex
CREATE UNIQUE INDEX "sop_checklist_items_workflowStageId_order_key" ON "sop_checklist_items"("workflowStageId", "order");

-- CreateIndex
CREATE INDEX "sop_checklist_responses_clientId_idx" ON "sop_checklist_responses"("clientId");

-- CreateIndex
CREATE INDEX "sop_checklist_responses_campaignId_idx" ON "sop_checklist_responses"("campaignId");

-- CreateIndex
CREATE UNIQUE INDEX "sop_checklist_responses_activityInstanceId_sopChecklistItem_key" ON "sop_checklist_responses"("activityInstanceId", "sopChecklistItemId");

-- AddForeignKey
ALTER TABLE "sop_checklist_items" ADD CONSTRAINT "sop_checklist_items_workflowStageId_fkey" FOREIGN KEY ("workflowStageId") REFERENCES "workflow_stages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sop_checklist_responses" ADD CONSTRAINT "sop_checklist_responses_activityInstanceId_fkey" FOREIGN KEY ("activityInstanceId") REFERENCES "activity_instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sop_checklist_responses" ADD CONSTRAINT "sop_checklist_responses_sopChecklistItemId_fkey" FOREIGN KEY ("sopChecklistItemId") REFERENCES "sop_checklist_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Re-run the RLS-enabling walk so `workflows` (now clientId-bearing) and the two new tables get
-- the tenant-isolation policy. Copied from the *current, correct* source
-- (20260716115337_approval_client_id) per A-041's lesson: never copy this block from memory or
-- from the original rls_and_app_role migration, only from whichever migration most recently
-- defined it correctly.
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

-- The original rls_and_app_role migration granted on ALL TABLES existing at that time; tables
-- created later need their own grant.
GRANT SELECT, INSERT, UPDATE, DELETE ON workflows TO field_command_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON sop_checklist_items TO field_command_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON sop_checklist_responses TO field_command_app;

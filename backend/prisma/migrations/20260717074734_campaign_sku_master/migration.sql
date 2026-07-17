-- Campaign SKU Master + SKU movements (report-format-library §3, build-sequence S3.1).
-- Both tables carry clientId so the RLS tenant-isolation walk below covers them from day one —
-- no repeat of the approvals gap (A-043).
--
-- NOTE: `prisma migrate dev` also generated DROP INDEX statements for the two PostGIS GiST
-- indexes (gps_points_geo_point_gix, locations_geo_point_gix) because they were created by raw
-- SQL in 20260714070831_geo_sync_triggers and don't exist in the Prisma schema. Those DROPs were
-- removed by hand — dropping real spatial indexes as a side effect of an unrelated migration
-- would be a regression, exactly the class of copy-blindly mistake A-041 documented.

-- CreateEnum
CREATE TYPE "SkuMovementType" AS ENUM ('OPENING_STOCK', 'RECEIVED', 'SOLD', 'FREE_SCHEME', 'SAMPLED', 'DAMAGED', 'CLOSING_STOCK_ACTUAL');

-- CreateTable
CREATE TABLE "campaign_skus" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "clientId" UUID NOT NULL,
    "campaignId" UUID NOT NULL,
    "skuCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "variantLabel" TEXT,
    "category" TEXT,
    "mrp" DECIMAL(12,2),
    "sellingPrice" DECIMAL(12,2),
    "packSize" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campaign_skus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sku_movements" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "clientId" UUID NOT NULL,
    "campaignId" UUID NOT NULL,
    "campaignSkuId" UUID NOT NULL,
    "formResponseId" UUID,
    "fieldResponseId" UUID,
    "locationId" UUID,
    "movementType" "SkuMovementType" NOT NULL,
    "movementDate" DATE NOT NULL,
    "quantity" DECIMAL(14,3) NOT NULL DEFAULT 0,
    "amount" DECIMAL(14,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sku_movements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "campaign_skus_clientId_idx" ON "campaign_skus"("clientId");

-- CreateIndex
CREATE INDEX "campaign_skus_campaignId_idx" ON "campaign_skus"("campaignId");

-- CreateIndex
CREATE UNIQUE INDEX "campaign_skus_campaignId_skuCode_key" ON "campaign_skus"("campaignId", "skuCode");

-- CreateIndex
CREATE INDEX "sku_movements_clientId_idx" ON "sku_movements"("clientId");

-- CreateIndex
CREATE INDEX "sku_movements_campaignId_movementDate_idx" ON "sku_movements"("campaignId", "movementDate");

-- CreateIndex
CREATE INDEX "sku_movements_campaignSkuId_movementType_idx" ON "sku_movements"("campaignSkuId", "movementType");

-- CreateIndex
CREATE INDEX "sku_movements_formResponseId_idx" ON "sku_movements"("formResponseId");

-- AddForeignKey
ALTER TABLE "campaign_skus" ADD CONSTRAINT "campaign_skus_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sku_movements" ADD CONSTRAINT "sku_movements_campaignSkuId_fkey" FOREIGN KEY ("campaignSkuId") REFERENCES "campaign_skus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sku_movements" ADD CONSTRAINT "sku_movements_formResponseId_fkey" FOREIGN KEY ("formResponseId") REFERENCES "form_responses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sku_movements" ADD CONSTRAINT "sku_movements_fieldResponseId_fkey" FOREIGN KEY ("fieldResponseId") REFERENCES "field_responses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Re-run the RLS-enabling walk so the two new clientId-bearing tables get the tenant-isolation
-- policy. Copied from the *current, correct* source (20260716115337_approval_client_id) per
-- A-041's hard-learned lesson: never copy this block from memory or from the original
-- rls_and_app_role migration, only from whichever migration most recently defined it correctly.
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
GRANT SELECT, INSERT, UPDATE, DELETE ON campaign_skus TO field_command_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON sku_movements TO field_command_app;

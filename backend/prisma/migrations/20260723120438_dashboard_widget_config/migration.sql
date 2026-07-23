-- CreateTable
CREATE TABLE "dashboard_widget_configs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "clientId" UUID NOT NULL,
    "campaignId" UUID NOT NULL,
    "widgetKey" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dashboard_widget_configs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "dashboard_widget_configs_clientId_idx" ON "dashboard_widget_configs"("clientId");

-- CreateIndex
CREATE INDEX "dashboard_widget_configs_campaignId_idx" ON "dashboard_widget_configs"("campaignId");

-- CreateIndex
CREATE UNIQUE INDEX "dashboard_widget_configs_campaignId_widgetKey_key" ON "dashboard_widget_configs"("campaignId", "widgetKey");

-- AddForeignKey
ALTER TABLE "dashboard_widget_configs" ADD CONSTRAINT "dashboard_widget_configs_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

GRANT SELECT, INSERT, UPDATE, DELETE ON dashboard_widget_configs TO field_command_app;

-- Re-run the RLS-enabling walk so this new clientId-bearing table gets the tenant-isolation
-- policy. Copied verbatim from 20260721075124_whatsapp_verification — the most recently correct
-- source for this block — per A-041's lesson: never copy from memory.
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

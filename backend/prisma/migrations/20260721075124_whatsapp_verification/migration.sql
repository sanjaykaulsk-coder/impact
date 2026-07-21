-- CreateTable
CREATE TABLE "whatsapp_verifications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "clientId" UUID NOT NULL,
    "campaignId" UUID NOT NULL,
    "activityInstanceId" UUID NOT NULL,
    "initiatedByUserId" UUID NOT NULL,
    "verificationType" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "outcome" TEXT,
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "whatsapp_verifications_clientId_idx" ON "whatsapp_verifications"("clientId");

-- CreateIndex
CREATE INDEX "whatsapp_verifications_campaignId_idx" ON "whatsapp_verifications"("campaignId");

-- AddForeignKey
ALTER TABLE "whatsapp_verifications" ADD CONSTRAINT "whatsapp_verifications_activityInstanceId_fkey" FOREIGN KEY ("activityInstanceId") REFERENCES "activity_instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

GRANT SELECT, INSERT, UPDATE, DELETE ON whatsapp_verifications TO field_command_app;

-- Re-run the RLS-enabling walk so this new clientId-bearing table gets the tenant-isolation
-- policy. Copied verbatim from 20260719070000_full_tenant_isolation_hardening — the most recently
-- correct source for this block — per A-041's lesson: never copy from memory.
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

-- Chunked, resumable photo upload (docs/architecture/05 "Upload strategy" #2: POST /media/init ->
-- chunks -> /complete, interrupted uploads resume at the last confirmed chunk). This session table
-- is deliberately separate from `media`, which represents a finished, validated artifact.

-- CreateEnum
CREATE TYPE "MediaUploadSessionStatus" AS ENUM ('UPLOADING', 'COMPLETED', 'ABANDONED');

-- CreateTable
CREATE TABLE "media_upload_sessions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "clientId" UUID NOT NULL,
    "campaignId" UUID NOT NULL,
    "activityInstanceId" UUID NOT NULL,
    "uploadedByUserId" UUID NOT NULL,
    "deviceId" UUID,
    "sha256Hash" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "chunkSize" INTEGER NOT NULL DEFAULT 524288,
    "totalChunks" INTEGER NOT NULL,
    "receivedChunks" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "latitude" DECIMAL(9,6) NOT NULL,
    "longitude" DECIMAL(9,6) NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL,
    "status" "MediaUploadSessionStatus" NOT NULL DEFAULT 'UPLOADING',
    "resultMediaId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "media_upload_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "media_upload_sessions_clientId_idx" ON "media_upload_sessions"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "media_upload_sessions_activityInstanceId_uploadedByUserId_s_key" ON "media_upload_sessions"("activityInstanceId", "uploadedByUserId", "sha256Hash");

-- AddForeignKey
ALTER TABLE "media_upload_sessions" ADD CONSTRAINT "media_upload_sessions_activityInstanceId_fkey" FOREIGN KEY ("activityInstanceId") REFERENCES "activity_instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Grant the restricted app role access to the new table explicitly (belt-and-suspenders alongside
-- the ALTER DEFAULT PRIVILEGES set in the original rls_and_app_role migration).
GRANT SELECT, INSERT, UPDATE, DELETE ON media_upload_sessions TO field_command_app;

-- Re-run the same RLS-enabling walk from rls_and_app_role, per that migration's own comment: "any
-- future migration that adds a client_id column should re-run this same DO block." Harmless no-op
-- on every table it already covered; picks up media_upload_sessions.
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

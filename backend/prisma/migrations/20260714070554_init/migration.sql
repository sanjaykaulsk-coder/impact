-- Extensions required by locked technical decisions (CLAUDE.md): PostGIS for geography columns
-- and distance queries, pgcrypto for gen_random_uuid() used as the default for every id column.
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- CreateEnum
CREATE TYPE "Language" AS ENUM ('EN', 'HI');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'BLOCKED');

-- CreateEnum
CREATE TYPE "DeviceStatus" AS ENUM ('ACTIVE', 'PENDING_APPROVAL', 'BLOCKED');

-- CreateEnum
CREATE TYPE "RiskLevel" AS ENUM ('L1_WARNING', 'L2_FLAGGED', 'L3_RESTRICTED', 'L4_BLOCKED');

-- CreateEnum
CREATE TYPE "CampaignAccessStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'REVOKED');

-- CreateEnum
CREATE TYPE "ClientStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('DRAFT', 'CONFIGURATION_IN_PROGRESS', 'READY_FOR_REVIEW', 'APPROVED', 'PUBLISHED', 'LIVE', 'PAUSED', 'COMPLETED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "GeographyLevel" AS ENUM ('STATE', 'REGION', 'DISTRICT', 'TEHSIL');

-- CreateEnum
CREATE TYPE "LocationStatus" AS ENUM ('ACTIVE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PjpStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "PjpRowStatus" AS ENUM ('ACTIVE', 'CANCELLED', 'POSTPONED', 'RESCHEDULED');

-- CreateEnum
CREATE TYPE "AssignmentStatus" AS ENUM ('ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TargetScopeType" AS ENUM ('CAMPAIGN', 'GEOGRAPHY', 'TEAM', 'USER');

-- CreateEnum
CREATE TYPE "FormVersionStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "FieldType" AS ENUM ('SHORT_TEXT', 'LONG_TEXT', 'INTEGER', 'DECIMAL', 'CURRENCY', 'PERCENTAGE', 'DATE', 'TIME', 'DATETIME', 'DROPDOWN', 'RADIO', 'MULTI_SELECT', 'CHECKBOX', 'YES_NO', 'RATING', 'PHOTO', 'MULTIPLE_PHOTOS', 'SHORT_VIDEO', 'SIGNATURE', 'DOCUMENT', 'GPS', 'AUTO_TIMESTAMP', 'AUTO_USER', 'AUTO_ACTIVITY_ID', 'AUTO_CAMPAIGN_ID', 'AUTO_LOCATION', 'SKU_SELECTOR', 'QUANTITY', 'MEASUREMENT', 'SALES_VALUE', 'STOCK_VALUE', 'RETAILER_DETAILS', 'CONSUMER_DETAILS', 'REMARKS', 'APPROVAL_STATUS');

-- CreateEnum
CREATE TYPE "ConditionalAction" AS ENUM ('SHOW', 'HIDE', 'REQUIRE', 'OPTIONAL');

-- CreateEnum
CREATE TYPE "SyncStatus" AS ENUM ('DRAFT', 'SAVED_OFFLINE', 'PENDING_UPLOAD', 'UPLOADING', 'PARTIALLY_UPLOADED', 'SYNCED', 'UPLOAD_FAILED', 'VALIDATION_FAILED', 'USER_ACTION_REQUIRED');

-- CreateEnum
CREATE TYPE "ActivityInstanceStatus" AS ENUM ('PLANNED', 'DISPATCHED', 'IN_PROGRESS', 'COMPLETED', 'CLOSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AttendanceType" AS ENUM ('DAY_START', 'DAY_END');

-- CreateEnum
CREATE TYPE "MediaVariant" AS ENUM ('ORIGINAL', 'WATERMARKED');

-- CreateEnum
CREATE TYPE "MediaValidationStatus" AS ENUM ('PENDING', 'VALID', 'DUPLICATE_SUSPECTED', 'SCREENSHOT_RISK', 'REJECTED');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "DownloadPermissionLevel" AS ENUM ('WATERMARKED_ONLY', 'ORIGINAL_ALLOWED');

-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'CONTACTED', 'CONVERTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ApprovalEntityType" AS ENUM ('ACTIVITY_INSTANCE', 'FORM_RESPONSE', 'RECCE');

-- CreateEnum
CREATE TYPE "DeviationType" AS ENUM ('OUTSIDE_PERMITTED_RADIUS', 'UNPLANNED_LOCATION', 'SKIPPED_LOCATION', 'WRONG_SEQUENCE', 'LATE_ARRIVAL', 'EARLY_DEPARTURE', 'UNPLANNED_STOPPAGE', 'GPS_DISABLED', 'ABNORMAL_SPEED', 'SUSPECTED_LOCATION_MANIPULATION');

-- CreateEnum
CREATE TYPE "ExceptionSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "ExceptionStatus" AS ENUM ('DETECTED', 'ASSIGNED', 'ACKNOWLEDGED', 'UNDER_REVIEW', 'ACTION_TAKEN', 'RESOLVED', 'CLOSURE_APPROVED', 'REOPENED');

-- CreateEnum
CREATE TYPE "AlertStatus" AS ENUM ('OPEN', 'ACKNOWLEDGED', 'ESCALATED', 'RESOLVED');

-- CreateEnum
CREATE TYPE "ReportType" AS ENUM ('DAILY', 'WEEKLY', 'CAMPAIGN_CLOSURE');

-- CreateEnum
CREATE TYPE "ReportFormat" AS ENUM ('EXCEL', 'DASHBOARD', 'WHATSAPP_SUMMARY');

-- CreateEnum
CREATE TYPE "DownloadResourceType" AS ENUM ('ORIGINAL_MEDIA', 'RAW_DATA', 'REPORT_EXCEL');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('IN_APP', 'PUSH', 'WHATSAPP');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'READ');

-- CreateTable
CREATE TABLE "organisations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organisations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clients" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organisationId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "logoUrl" TEXT,
    "brandColorPrimary" TEXT,
    "brandColorSecondary" TEXT,
    "status" "ClientStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organisationId" UUID NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT,
    "preferredLanguage" "Language" NOT NULL DEFAULT 'EN',
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mobile_credentials" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "countryCode" TEXT NOT NULL DEFAULT '+91',
    "mobileNumber" TEXT NOT NULL,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mobile_credentials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "otp_challenges" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "countryCode" TEXT NOT NULL DEFAULT '+91',
    "mobileNumber" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "otp_challenges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organisationId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "roleId" UUID NOT NULL,
    "permissionId" UUID NOT NULL,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("roleId","permissionId")
);

-- CreateTable
CREATE TABLE "user_campaign_roles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "campaignId" UUID NOT NULL,
    "clientId" UUID NOT NULL,
    "roleId" UUID NOT NULL,
    "reportingManagerId" UUID,
    "teamId" UUID,
    "geographyScopeJson" JSONB,
    "status" "CampaignAccessStatus" NOT NULL DEFAULT 'ACTIVE',
    "accessExpiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_campaign_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "devices" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "deviceFingerprint" TEXT NOT NULL,
    "deviceModel" TEXT,
    "osVersion" TEXT,
    "appVersion" TEXT,
    "status" "DeviceStatus" NOT NULL DEFAULT 'PENDING_APPROVAL',
    "riskLevel" "RiskLevel" NOT NULL DEFAULT 'L1_WARNING',
    "isRooted" BOOLEAN NOT NULL DEFAULT false,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "login_sessions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "deviceId" UUID NOT NULL,
    "refreshTokenHash" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "ipAddress" TEXT,
    "userAgent" TEXT,

    CONSTRAINT "login_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaigns" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "clientId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "activityTypeId" UUID,
    "status" "CampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "reportingLanguage" "Language" NOT NULL DEFAULT 'EN',
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "deviationToleranceMeters" INTEGER NOT NULL DEFAULT 250,
    "mediaRequirementsJson" JSONB,
    "offlineMapRequired" BOOLEAN NOT NULL DEFAULT false,
    "clientVisibilityJson" JSONB,
    "downloadRightsJson" JSONB,
    "dataRetentionDays" INTEGER,
    "publishedSnapshotVersion" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaign_branding" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "campaignId" UUID NOT NULL,
    "clientId" UUID NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "themeJson" JSONB NOT NULL,
    "logoUrl" TEXT,
    "campaignLogoUrl" TEXT,
    "homeBannerUrl" TEXT,
    "instructionsText" TEXT,
    "escalationContactName" TEXT,
    "escalationContactPhone" TEXT,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campaign_branding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_types" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "isCustom" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_templates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "activityTypeId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "defaultConfigJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "activity_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaign_activities" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "campaignId" UUID NOT NULL,
    "activityTemplateId" UUID,
    "activityTypeId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "configJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campaign_activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "geographies" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "level" "GeographyLevel" NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "parentId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "geographies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "locations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "clientId" UUID,
    "campaignId" UUID,
    "geographyId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "latitude" DECIMAL(9,6) NOT NULL,
    "longitude" DECIMAL(9,6) NOT NULL,
    "geoPoint" geography(Point,4326),
    "contactPersonName" TEXT,
    "contactPersonPhone" TEXT,
    "status" "LocationStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pjps" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "campaignId" UUID NOT NULL,
    "fileName" TEXT NOT NULL,
    "uploadedById" UUID NOT NULL,
    "status" "PjpStatus" NOT NULL DEFAULT 'DRAFT',
    "totalRows" INTEGER NOT NULL DEFAULT 0,
    "invalidRows" INTEGER NOT NULL DEFAULT 0,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pjps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pjp_rows" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "pjpId" UUID NOT NULL,
    "campaignId" UUID NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "stateName" TEXT NOT NULL,
    "districtName" TEXT NOT NULL,
    "tehsilName" TEXT NOT NULL,
    "locationName" TEXT NOT NULL,
    "locationId" UUID,
    "latitude" DECIMAL(9,6),
    "longitude" DECIMAL(9,6),
    "teamId" UUID,
    "supervisorUserId" UUID,
    "vehicleInfo" TEXT,
    "plannedSequence" INTEGER,
    "plannedStartTime" TIMESTAMP(3),
    "plannedEndTime" TIMESTAMP(3),
    "targetJson" JSONB,
    "contactPerson" TEXT,
    "remarks" TEXT,
    "status" "PjpRowStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pjp_rows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "routes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "campaignId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "routes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "route_locations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "routeId" UUID NOT NULL,
    "locationId" UUID NOT NULL,
    "sequence" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "route_locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teams" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "campaignId" UUID NOT NULL,
    "clientId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "supervisorUserId" UUID,
    "vehicleInfo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_assignments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "campaignId" UUID NOT NULL,
    "clientId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "teamId" UUID,
    "pjpRowId" UUID,
    "assignedById" UUID NOT NULL,
    "assignmentDate" TIMESTAMP(3) NOT NULL,
    "status" "AssignmentStatus" NOT NULL DEFAULT 'ASSIGNED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "targets" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "campaignId" UUID NOT NULL,
    "clientId" UUID NOT NULL,
    "scopeType" "TargetScopeType" NOT NULL,
    "scopeId" UUID,
    "kpiKey" TEXT NOT NULL,
    "targetValue" DECIMAL(14,2) NOT NULL,
    "periodStart" TIMESTAMP(3),
    "periodEnd" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "targets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "form_templates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "clientId" UUID,
    "campaignId" UUID,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "form_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "form_versions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "formTemplateId" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "status" "FormVersionStatus" NOT NULL DEFAULT 'DRAFT',
    "createdById" UUID NOT NULL,
    "changeLog" TEXT,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "form_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "form_sections" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "formVersionId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "visibilityRuleJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "form_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "form_questions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "formSectionId" UUID NOT NULL,
    "fieldType" "FieldType" NOT NULL,
    "label" TEXT NOT NULL,
    "helpText" TEXT,
    "order" INTEGER NOT NULL,
    "isMandatory" BOOLEAN NOT NULL DEFAULT false,
    "defaultValueJson" JSONB,
    "formulaExpression" TEXT,
    "dependsOnQuestionId" UUID,
    "controlsJson" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "form_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question_options" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "formQuestionId" UUID NOT NULL,
    "label" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "question_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "validation_rules" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "formQuestionId" UUID NOT NULL,
    "ruleType" TEXT NOT NULL,
    "configJson" JSONB NOT NULL,

    CONSTRAINT "validation_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conditional_rules" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "formVersionId" UUID NOT NULL,
    "triggerQuestionId" UUID NOT NULL,
    "triggerValueJson" JSONB NOT NULL,
    "action" "ConditionalAction" NOT NULL,
    "targetQuestionId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conditional_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "form_responses" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "formVersionId" UUID NOT NULL,
    "activityInstanceId" UUID,
    "campaignId" UUID NOT NULL,
    "clientId" UUID NOT NULL,
    "submittedByUserId" UUID NOT NULL,
    "deviceId" UUID,
    "clientRef" TEXT NOT NULL,
    "status" "SyncStatus" NOT NULL DEFAULT 'DRAFT',
    "submittedAt" TIMESTAMP(3),
    "syncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "form_responses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "field_responses" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "formResponseId" UUID NOT NULL,
    "formQuestionId" UUID NOT NULL,
    "valueJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "field_responses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflows" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "campaignId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workflows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_stages" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workflowId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "allowIncompletePreparation" BOOLEAN NOT NULL DEFAULT true,
    "completionRuleJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workflow_stages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "milestones" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workflowStageId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "formVersionId" UUID,
    "mandatoryPhotoCount" INTEGER NOT NULL DEFAULT 0,
    "mandatoryGps" BOOLEAN NOT NULL DEFAULT false,
    "mandatorySignature" BOOLEAN NOT NULL DEFAULT false,
    "timeWindowStart" TIMESTAMP(3),
    "timeWindowEnd" TIMESTAMP(3),
    "kpiKey" TEXT,
    "alertRuleJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "milestones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stage_assignments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workflowStageId" UUID NOT NULL,
    "roleId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stage_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stage_approval_rules" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workflowStageId" UUID NOT NULL,
    "requiresApproval" BOOLEAN NOT NULL DEFAULT false,
    "approverRoleId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stage_approval_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_instances" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "campaignActivityId" UUID NOT NULL,
    "campaignId" UUID NOT NULL,
    "clientId" UUID NOT NULL,
    "locationId" UUID,
    "pjpRowId" UUID,
    "teamId" UUID,
    "assignedUserId" UUID,
    "workflowId" UUID,
    "currentStageId" UUID,
    "status" "ActivityInstanceStatus" NOT NULL DEFAULT 'PLANNED',
    "riskLevel" "RiskLevel" NOT NULL DEFAULT 'L1_WARNING',
    "plannedDate" TIMESTAMP(3) NOT NULL,
    "actualStartAt" TIMESTAMP(3),
    "actualEndAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "activity_instances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendances" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "activityInstanceId" UUID,
    "userId" UUID NOT NULL,
    "campaignId" UUID NOT NULL,
    "type" "AttendanceType" NOT NULL,
    "checkTime" TIMESTAMP(3) NOT NULL,
    "latitude" DECIMAL(9,6),
    "longitude" DECIMAL(9,6),
    "selfieMediaId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attendances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "check_ins" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "activityInstanceId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "latitude" DECIMAL(9,6) NOT NULL,
    "longitude" DECIMAL(9,6) NOT NULL,
    "accuracyMeters" DECIMAL(8,2),
    "deviceTimestamp" TIMESTAMP(3) NOT NULL,
    "serverTimestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "distanceFromPlannedMeters" DECIMAL(10,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "check_ins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "check_outs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "activityInstanceId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "latitude" DECIMAL(9,6) NOT NULL,
    "longitude" DECIMAL(9,6) NOT NULL,
    "accuracyMeters" DECIMAL(8,2),
    "deviceTimestamp" TIMESTAMP(3) NOT NULL,
    "serverTimestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "check_outs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gps_points" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "activityInstanceId" UUID,
    "userId" UUID NOT NULL,
    "deviceId" UUID,
    "campaignId" UUID NOT NULL,
    "latitude" DECIMAL(9,6) NOT NULL,
    "longitude" DECIMAL(9,6) NOT NULL,
    "geoPoint" geography(Point,4326),
    "accuracyMeters" DECIMAL(8,2),
    "speedKmh" DECIMAL(6,2),
    "isMockLocationSuspected" BOOLEAN NOT NULL DEFAULT false,
    "recordedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gps_points_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "route_traces" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "activityInstanceId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "pointsCount" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "route_traces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "clientId" UUID NOT NULL,
    "campaignId" UUID NOT NULL,
    "activityInstanceId" UUID,
    "formResponseId" UUID,
    "fieldResponseId" UUID,
    "uploadedByUserId" UUID NOT NULL,
    "deviceId" UUID,
    "objectKeyOriginal" TEXT NOT NULL,
    "objectKeyWatermarked" TEXT,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "sha256Hash" TEXT NOT NULL,
    "latitude" DECIMAL(9,6),
    "longitude" DECIMAL(9,6),
    "capturedAt" TIMESTAMP(3),
    "variant" "MediaVariant" NOT NULL DEFAULT 'ORIGINAL',
    "validationStatus" "MediaValidationStatus" NOT NULL DEFAULT 'PENDING',
    "approvalStatus" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "downloadPermissionLevel" "DownloadPermissionLevel" NOT NULL DEFAULT 'WATERMARKED_ONLY',
    "uploadStatus" "SyncStatus" NOT NULL DEFAULT 'PENDING_UPLOAD',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "signatures" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "formResponseId" UUID,
    "activityInstanceId" UUID,
    "signedByName" TEXT,
    "objectKey" TEXT NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "signatures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_reports" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "activityInstanceId" UUID NOT NULL,
    "campaignId" UUID NOT NULL,
    "submittedByUserId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stock_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "stockReportId" UUID NOT NULL,
    "skuName" TEXT NOT NULL,
    "openingStock" DECIMAL(12,2) NOT NULL,
    "stockReceived" DECIMAL(12,2) NOT NULL,
    "unitsSold" DECIMAL(12,2) NOT NULL,
    "unitsSampled" DECIMAL(12,2) NOT NULL,
    "unitsDamaged" DECIMAL(12,2) NOT NULL,
    "expectedClosingStock" DECIMAL(12,2) NOT NULL,
    "actualClosingStock" DECIMAL(12,2),
    "mismatchFlag" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_reports" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "activityInstanceId" UUID NOT NULL,
    "campaignId" UUID NOT NULL,
    "submittedByUserId" UUID NOT NULL,
    "totalValue" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sales_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "salesReportId" UUID NOT NULL,
    "skuName" TEXT NOT NULL,
    "quantity" DECIMAL(12,2) NOT NULL,
    "unitPrice" DECIMAL(12,2) NOT NULL,
    "totalValue" DECIMAL(14,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sales_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leads" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "activityInstanceId" UUID,
    "campaignId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "notes" TEXT,
    "status" "LeadStatus" NOT NULL DEFAULT 'NEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "retailers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "campaignId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "shopName" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "geographyId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "retailers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consumers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "activityInstanceId" UUID,
    "campaignId" UUID NOT NULL,
    "name" TEXT,
    "phone" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consumers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approvals" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "entityType" "ApprovalEntityType" NOT NULL,
    "entityId" UUID NOT NULL,
    "campaignId" UUID NOT NULL,
    "requestedByUserId" UUID NOT NULL,
    "approverUserId" UUID,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "remarks" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "approvals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deviation_requests" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "activityInstanceId" UUID NOT NULL,
    "campaignId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "deviationType" "DeviationType" NOT NULL,
    "distanceMeters" DECIMAL(10,2),
    "reason" TEXT NOT NULL,
    "remarks" TEXT,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "decidedByUserId" UUID,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "deviation_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exceptions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "campaignId" UUID NOT NULL,
    "category" TEXT NOT NULL,
    "severity" "ExceptionSeverity" NOT NULL DEFAULT 'MEDIUM',
    "triggerType" TEXT NOT NULL,
    "activityInstanceId" UUID,
    "userId" UUID,
    "locationId" UUID,
    "ownerUserId" UUID,
    "escalationLevel" INTEGER NOT NULL DEFAULT 0,
    "status" "ExceptionStatus" NOT NULL DEFAULT 'DETECTED',
    "evidenceJson" JSONB,
    "remarks" TEXT,
    "resolution" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "closureApprovedByUserId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exceptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alerts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "campaignId" UUID NOT NULL,
    "clientId" UUID NOT NULL,
    "activityInstanceId" UUID,
    "userId" UUID,
    "locationId" UUID,
    "issueType" TEXT NOT NULL,
    "severity" "ExceptionSeverity" NOT NULL DEFAULT 'MEDIUM',
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ownerUserId" UUID,
    "status" "AlertStatus" NOT NULL DEFAULT 'OPEN',
    "remarks" TEXT,
    "evidenceJson" JSONB,
    "resolutionDeadline" TIMESTAMP(3),
    "escalationLevel" INTEGER NOT NULL DEFAULT 0,
    "closureApproverUserId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "escalations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "alertId" UUID,
    "exceptionId" UUID,
    "fromRoleId" UUID,
    "toRoleId" UUID NOT NULL,
    "level" INTEGER NOT NULL,
    "triggeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acknowledgedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "escalations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "entityType" TEXT NOT NULL,
    "entityId" UUID NOT NULL,
    "campaignId" UUID NOT NULL,
    "authorUserId" UUID NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organisationId" UUID,
    "clientId" UUID,
    "campaignId" UUID,
    "actorUserId" UUID,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" UUID,
    "beforeJson" JSONB,
    "afterJson" JSONB,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reports" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "campaignId" UUID NOT NULL,
    "type" "ReportType" NOT NULL,
    "format" "ReportFormat" NOT NULL,
    "generatedByUserId" UUID,
    "objectKey" TEXT,
    "periodStart" TIMESTAMP(3),
    "periodEnd" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "download_permissions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "roleId" UUID,
    "userId" UUID,
    "resourceType" "DownloadResourceType" NOT NULL,
    "campaignId" UUID,
    "clientId" UUID,
    "granted" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "download_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
    "relatedEntityType" TEXT,
    "relatedEntityId" UUID,
    "sentAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organisations_code_key" ON "organisations"("code");

-- CreateIndex
CREATE UNIQUE INDEX "clients_code_key" ON "clients"("code");

-- CreateIndex
CREATE UNIQUE INDEX "mobile_credentials_userId_key" ON "mobile_credentials"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "mobile_credentials_countryCode_mobileNumber_key" ON "mobile_credentials"("countryCode", "mobileNumber");

-- CreateIndex
CREATE INDEX "otp_challenges_countryCode_mobileNumber_idx" ON "otp_challenges"("countryCode", "mobileNumber");

-- CreateIndex
CREATE UNIQUE INDEX "roles_code_key" ON "roles"("code");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_code_key" ON "permissions"("code");

-- CreateIndex
CREATE INDEX "user_campaign_roles_campaignId_idx" ON "user_campaign_roles"("campaignId");

-- CreateIndex
CREATE INDEX "user_campaign_roles_clientId_idx" ON "user_campaign_roles"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "user_campaign_roles_userId_campaignId_roleId_key" ON "user_campaign_roles"("userId", "campaignId", "roleId");

-- CreateIndex
CREATE UNIQUE INDEX "devices_userId_deviceFingerprint_key" ON "devices"("userId", "deviceFingerprint");

-- CreateIndex
CREATE INDEX "login_sessions_userId_idx" ON "login_sessions"("userId");

-- CreateIndex
CREATE INDEX "login_sessions_deviceId_idx" ON "login_sessions"("deviceId");

-- CreateIndex
CREATE UNIQUE INDEX "campaigns_code_key" ON "campaigns"("code");

-- CreateIndex
CREATE INDEX "campaigns_clientId_idx" ON "campaigns"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "campaign_branding_campaignId_key" ON "campaign_branding"("campaignId");

-- CreateIndex
CREATE INDEX "campaign_branding_clientId_idx" ON "campaign_branding"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "activity_types_code_key" ON "activity_types"("code");

-- CreateIndex
CREATE UNIQUE INDEX "activity_templates_code_key" ON "activity_templates"("code");

-- CreateIndex
CREATE INDEX "campaign_activities_campaignId_idx" ON "campaign_activities"("campaignId");

-- CreateIndex
CREATE INDEX "geographies_parentId_idx" ON "geographies"("parentId");

-- CreateIndex
CREATE INDEX "locations_clientId_idx" ON "locations"("clientId");

-- CreateIndex
CREATE INDEX "locations_campaignId_idx" ON "locations"("campaignId");

-- CreateIndex
CREATE INDEX "pjps_campaignId_idx" ON "pjps"("campaignId");

-- CreateIndex
CREATE INDEX "pjp_rows_campaignId_idx" ON "pjp_rows"("campaignId");

-- CreateIndex
CREATE INDEX "routes_campaignId_idx" ON "routes"("campaignId");

-- CreateIndex
CREATE UNIQUE INDEX "route_locations_routeId_sequence_key" ON "route_locations"("routeId", "sequence");

-- CreateIndex
CREATE INDEX "teams_campaignId_idx" ON "teams"("campaignId");

-- CreateIndex
CREATE INDEX "user_assignments_campaignId_idx" ON "user_assignments"("campaignId");

-- CreateIndex
CREATE INDEX "user_assignments_userId_idx" ON "user_assignments"("userId");

-- CreateIndex
CREATE INDEX "targets_campaignId_idx" ON "targets"("campaignId");

-- CreateIndex
CREATE UNIQUE INDEX "form_templates_code_key" ON "form_templates"("code");

-- CreateIndex
CREATE INDEX "form_templates_campaignId_idx" ON "form_templates"("campaignId");

-- CreateIndex
CREATE UNIQUE INDEX "form_versions_formTemplateId_version_key" ON "form_versions"("formTemplateId", "version");

-- CreateIndex
CREATE INDEX "form_sections_formVersionId_idx" ON "form_sections"("formVersionId");

-- CreateIndex
CREATE INDEX "form_questions_formSectionId_idx" ON "form_questions"("formSectionId");

-- CreateIndex
CREATE INDEX "question_options_formQuestionId_idx" ON "question_options"("formQuestionId");

-- CreateIndex
CREATE INDEX "validation_rules_formQuestionId_idx" ON "validation_rules"("formQuestionId");

-- CreateIndex
CREATE INDEX "conditional_rules_formVersionId_idx" ON "conditional_rules"("formVersionId");

-- CreateIndex
CREATE INDEX "form_responses_campaignId_idx" ON "form_responses"("campaignId");

-- CreateIndex
CREATE INDEX "form_responses_clientId_idx" ON "form_responses"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "form_responses_deviceId_clientRef_key" ON "form_responses"("deviceId", "clientRef");

-- CreateIndex
CREATE INDEX "field_responses_formResponseId_idx" ON "field_responses"("formResponseId");

-- CreateIndex
CREATE INDEX "workflows_campaignId_idx" ON "workflows"("campaignId");

-- CreateIndex
CREATE UNIQUE INDEX "workflow_stages_workflowId_order_key" ON "workflow_stages"("workflowId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "milestones_workflowStageId_order_key" ON "milestones"("workflowStageId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "stage_assignments_workflowStageId_roleId_key" ON "stage_assignments"("workflowStageId", "roleId");

-- CreateIndex
CREATE INDEX "activity_instances_campaignId_idx" ON "activity_instances"("campaignId");

-- CreateIndex
CREATE INDEX "activity_instances_clientId_idx" ON "activity_instances"("clientId");

-- CreateIndex
CREATE INDEX "attendances_campaignId_idx" ON "attendances"("campaignId");

-- CreateIndex
CREATE INDEX "check_ins_activityInstanceId_idx" ON "check_ins"("activityInstanceId");

-- CreateIndex
CREATE INDEX "check_outs_activityInstanceId_idx" ON "check_outs"("activityInstanceId");

-- CreateIndex
CREATE INDEX "gps_points_activityInstanceId_idx" ON "gps_points"("activityInstanceId");

-- CreateIndex
CREATE INDEX "gps_points_campaignId_idx" ON "gps_points"("campaignId");

-- CreateIndex
CREATE INDEX "route_traces_activityInstanceId_idx" ON "route_traces"("activityInstanceId");

-- CreateIndex
CREATE INDEX "media_campaignId_idx" ON "media"("campaignId");

-- CreateIndex
CREATE INDEX "media_clientId_idx" ON "media"("clientId");

-- CreateIndex
CREATE INDEX "media_sha256Hash_idx" ON "media"("sha256Hash");

-- CreateIndex
CREATE INDEX "stock_reports_campaignId_idx" ON "stock_reports"("campaignId");

-- CreateIndex
CREATE INDEX "stock_items_stockReportId_idx" ON "stock_items"("stockReportId");

-- CreateIndex
CREATE INDEX "sales_reports_campaignId_idx" ON "sales_reports"("campaignId");

-- CreateIndex
CREATE INDEX "sales_items_salesReportId_idx" ON "sales_items"("salesReportId");

-- CreateIndex
CREATE INDEX "leads_campaignId_idx" ON "leads"("campaignId");

-- CreateIndex
CREATE INDEX "retailers_campaignId_idx" ON "retailers"("campaignId");

-- CreateIndex
CREATE INDEX "consumers_campaignId_idx" ON "consumers"("campaignId");

-- CreateIndex
CREATE INDEX "approvals_campaignId_idx" ON "approvals"("campaignId");

-- CreateIndex
CREATE INDEX "approvals_entityType_entityId_idx" ON "approvals"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "deviation_requests_campaignId_idx" ON "deviation_requests"("campaignId");

-- CreateIndex
CREATE INDEX "exceptions_campaignId_idx" ON "exceptions"("campaignId");

-- CreateIndex
CREATE INDEX "alerts_campaignId_idx" ON "alerts"("campaignId");

-- CreateIndex
CREATE INDEX "alerts_clientId_idx" ON "alerts"("clientId");

-- CreateIndex
CREATE INDEX "comments_campaignId_idx" ON "comments"("campaignId");

-- CreateIndex
CREATE INDEX "comments_entityType_entityId_idx" ON "comments"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "audit_logs_clientId_idx" ON "audit_logs"("clientId");

-- CreateIndex
CREATE INDEX "audit_logs_campaignId_idx" ON "audit_logs"("campaignId");

-- CreateIndex
CREATE INDEX "audit_logs_entityType_entityId_idx" ON "audit_logs"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "reports_campaignId_idx" ON "reports"("campaignId");

-- CreateIndex
CREATE INDEX "notifications_userId_idx" ON "notifications"("userId");

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "organisations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "organisations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mobile_credentials" ADD CONSTRAINT "mobile_credentials_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roles" ADD CONSTRAINT "roles_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "organisations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_campaign_roles" ADD CONSTRAINT "user_campaign_roles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_campaign_roles" ADD CONSTRAINT "user_campaign_roles_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_campaign_roles" ADD CONSTRAINT "user_campaign_roles_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_campaign_roles" ADD CONSTRAINT "user_campaign_roles_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_campaign_roles" ADD CONSTRAINT "user_campaign_roles_reportingManagerId_fkey" FOREIGN KEY ("reportingManagerId") REFERENCES "user_campaign_roles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_campaign_roles" ADD CONSTRAINT "user_campaign_roles_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "devices" ADD CONSTRAINT "devices_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "login_sessions" ADD CONSTRAINT "login_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "login_sessions" ADD CONSTRAINT "login_sessions_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_activityTypeId_fkey" FOREIGN KEY ("activityTypeId") REFERENCES "activity_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_branding" ADD CONSTRAINT "campaign_branding_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_templates" ADD CONSTRAINT "activity_templates_activityTypeId_fkey" FOREIGN KEY ("activityTypeId") REFERENCES "activity_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_activities" ADD CONSTRAINT "campaign_activities_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_activities" ADD CONSTRAINT "campaign_activities_activityTemplateId_fkey" FOREIGN KEY ("activityTemplateId") REFERENCES "activity_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_activities" ADD CONSTRAINT "campaign_activities_activityTypeId_fkey" FOREIGN KEY ("activityTypeId") REFERENCES "activity_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "geographies" ADD CONSTRAINT "geographies_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "geographies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "locations" ADD CONSTRAINT "locations_geographyId_fkey" FOREIGN KEY ("geographyId") REFERENCES "geographies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pjps" ADD CONSTRAINT "pjps_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pjp_rows" ADD CONSTRAINT "pjp_rows_pjpId_fkey" FOREIGN KEY ("pjpId") REFERENCES "pjps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pjp_rows" ADD CONSTRAINT "pjp_rows_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pjp_rows" ADD CONSTRAINT "pjp_rows_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "routes" ADD CONSTRAINT "routes_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "route_locations" ADD CONSTRAINT "route_locations_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "routes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "route_locations" ADD CONSTRAINT "route_locations_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teams" ADD CONSTRAINT "teams_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_assignments" ADD CONSTRAINT "user_assignments_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_assignments" ADD CONSTRAINT "user_assignments_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_assignments" ADD CONSTRAINT "user_assignments_pjpRowId_fkey" FOREIGN KEY ("pjpRowId") REFERENCES "pjp_rows"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "targets" ADD CONSTRAINT "targets_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_templates" ADD CONSTRAINT "form_templates_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_versions" ADD CONSTRAINT "form_versions_formTemplateId_fkey" FOREIGN KEY ("formTemplateId") REFERENCES "form_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_sections" ADD CONSTRAINT "form_sections_formVersionId_fkey" FOREIGN KEY ("formVersionId") REFERENCES "form_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_questions" ADD CONSTRAINT "form_questions_formSectionId_fkey" FOREIGN KEY ("formSectionId") REFERENCES "form_sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_questions" ADD CONSTRAINT "form_questions_dependsOnQuestionId_fkey" FOREIGN KEY ("dependsOnQuestionId") REFERENCES "form_questions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_options" ADD CONSTRAINT "question_options_formQuestionId_fkey" FOREIGN KEY ("formQuestionId") REFERENCES "form_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "validation_rules" ADD CONSTRAINT "validation_rules_formQuestionId_fkey" FOREIGN KEY ("formQuestionId") REFERENCES "form_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conditional_rules" ADD CONSTRAINT "conditional_rules_formVersionId_fkey" FOREIGN KEY ("formVersionId") REFERENCES "form_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conditional_rules" ADD CONSTRAINT "conditional_rules_triggerQuestionId_fkey" FOREIGN KEY ("triggerQuestionId") REFERENCES "form_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conditional_rules" ADD CONSTRAINT "conditional_rules_targetQuestionId_fkey" FOREIGN KEY ("targetQuestionId") REFERENCES "form_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_responses" ADD CONSTRAINT "form_responses_formVersionId_fkey" FOREIGN KEY ("formVersionId") REFERENCES "form_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_responses" ADD CONSTRAINT "form_responses_activityInstanceId_fkey" FOREIGN KEY ("activityInstanceId") REFERENCES "activity_instances"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "field_responses" ADD CONSTRAINT "field_responses_formResponseId_fkey" FOREIGN KEY ("formResponseId") REFERENCES "form_responses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "field_responses" ADD CONSTRAINT "field_responses_formQuestionId_fkey" FOREIGN KEY ("formQuestionId") REFERENCES "form_questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflows" ADD CONSTRAINT "workflows_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_stages" ADD CONSTRAINT "workflow_stages_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "workflows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "milestones" ADD CONSTRAINT "milestones_workflowStageId_fkey" FOREIGN KEY ("workflowStageId") REFERENCES "workflow_stages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "milestones" ADD CONSTRAINT "milestones_formVersionId_fkey" FOREIGN KEY ("formVersionId") REFERENCES "form_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stage_assignments" ADD CONSTRAINT "stage_assignments_workflowStageId_fkey" FOREIGN KEY ("workflowStageId") REFERENCES "workflow_stages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stage_assignments" ADD CONSTRAINT "stage_assignments_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stage_approval_rules" ADD CONSTRAINT "stage_approval_rules_workflowStageId_fkey" FOREIGN KEY ("workflowStageId") REFERENCES "workflow_stages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stage_approval_rules" ADD CONSTRAINT "stage_approval_rules_approverRoleId_fkey" FOREIGN KEY ("approverRoleId") REFERENCES "roles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_instances" ADD CONSTRAINT "activity_instances_campaignActivityId_fkey" FOREIGN KEY ("campaignActivityId") REFERENCES "campaign_activities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_instances" ADD CONSTRAINT "activity_instances_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_instances" ADD CONSTRAINT "activity_instances_pjpRowId_fkey" FOREIGN KEY ("pjpRowId") REFERENCES "pjp_rows"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_instances" ADD CONSTRAINT "activity_instances_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_instances" ADD CONSTRAINT "activity_instances_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "workflows"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_instances" ADD CONSTRAINT "activity_instances_currentStageId_fkey" FOREIGN KEY ("currentStageId") REFERENCES "workflow_stages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendances" ADD CONSTRAINT "attendances_activityInstanceId_fkey" FOREIGN KEY ("activityInstanceId") REFERENCES "activity_instances"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "check_ins" ADD CONSTRAINT "check_ins_activityInstanceId_fkey" FOREIGN KEY ("activityInstanceId") REFERENCES "activity_instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "check_outs" ADD CONSTRAINT "check_outs_activityInstanceId_fkey" FOREIGN KEY ("activityInstanceId") REFERENCES "activity_instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gps_points" ADD CONSTRAINT "gps_points_activityInstanceId_fkey" FOREIGN KEY ("activityInstanceId") REFERENCES "activity_instances"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gps_points" ADD CONSTRAINT "gps_points_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "devices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "route_traces" ADD CONSTRAINT "route_traces_activityInstanceId_fkey" FOREIGN KEY ("activityInstanceId") REFERENCES "activity_instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media" ADD CONSTRAINT "media_activityInstanceId_fkey" FOREIGN KEY ("activityInstanceId") REFERENCES "activity_instances"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media" ADD CONSTRAINT "media_formResponseId_fkey" FOREIGN KEY ("formResponseId") REFERENCES "form_responses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media" ADD CONSTRAINT "media_fieldResponseId_fkey" FOREIGN KEY ("fieldResponseId") REFERENCES "field_responses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "signatures" ADD CONSTRAINT "signatures_formResponseId_fkey" FOREIGN KEY ("formResponseId") REFERENCES "form_responses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "signatures" ADD CONSTRAINT "signatures_activityInstanceId_fkey" FOREIGN KEY ("activityInstanceId") REFERENCES "activity_instances"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_reports" ADD CONSTRAINT "stock_reports_activityInstanceId_fkey" FOREIGN KEY ("activityInstanceId") REFERENCES "activity_instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_items" ADD CONSTRAINT "stock_items_stockReportId_fkey" FOREIGN KEY ("stockReportId") REFERENCES "stock_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_reports" ADD CONSTRAINT "sales_reports_activityInstanceId_fkey" FOREIGN KEY ("activityInstanceId") REFERENCES "activity_instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_items" ADD CONSTRAINT "sales_items_salesReportId_fkey" FOREIGN KEY ("salesReportId") REFERENCES "sales_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_activityInstanceId_fkey" FOREIGN KEY ("activityInstanceId") REFERENCES "activity_instances"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retailers" ADD CONSTRAINT "retailers_geographyId_fkey" FOREIGN KEY ("geographyId") REFERENCES "geographies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consumers" ADD CONSTRAINT "consumers_activityInstanceId_fkey" FOREIGN KEY ("activityInstanceId") REFERENCES "activity_instances"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deviation_requests" ADD CONSTRAINT "deviation_requests_activityInstanceId_fkey" FOREIGN KEY ("activityInstanceId") REFERENCES "activity_instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exceptions" ADD CONSTRAINT "exceptions_activityInstanceId_fkey" FOREIGN KEY ("activityInstanceId") REFERENCES "activity_instances"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_activityInstanceId_fkey" FOREIGN KEY ("activityInstanceId") REFERENCES "activity_instances"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "escalations" ADD CONSTRAINT "escalations_alertId_fkey" FOREIGN KEY ("alertId") REFERENCES "alerts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "escalations" ADD CONSTRAINT "escalations_exceptionId_fkey" FOREIGN KEY ("exceptionId") REFERENCES "exceptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "organisations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "download_permissions" ADD CONSTRAINT "download_permissions_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

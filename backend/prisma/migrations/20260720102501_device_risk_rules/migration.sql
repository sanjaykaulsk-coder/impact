-- S4.2 (device-risk controls, spec §18): per-signal risk-level overrides, campaign-configurable —
-- same posture as every other *Json config field on Campaign. Nullable, no backfill needed.
ALTER TABLE "campaigns" ADD COLUMN "deviceRiskRulesJson" JSONB;

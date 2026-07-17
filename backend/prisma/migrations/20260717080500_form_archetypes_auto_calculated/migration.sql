-- Additions for the archetype presets (report-format-library §1-§2, build-sequence S3.1):
-- AUTO_CALCULATED is the field type behind the workbook's formula columns ("Total Qty",
-- "Total Sales Amt.") — evaluated from formulaExpression at render/report time, never typed by
-- anyone. FormTemplate.archetype records which preset a form started from, so a mid-campaign SKU
-- change can regenerate exactly the SKU-bound sections of the current draft and nothing else.

-- AlterEnum
ALTER TYPE "FieldType" ADD VALUE 'AUTO_CALCULATED';

-- CreateEnum
CREATE TYPE "FormArchetype" AS ENUM ('DFR', 'PROFILE', 'STOCK_RECONCILIATION', 'ENQUIRY_LEADS');

-- AlterTable
ALTER TABLE "form_templates" ADD COLUMN "archetype" "FormArchetype";

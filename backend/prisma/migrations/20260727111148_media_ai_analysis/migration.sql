-- AlterTable
ALTER TABLE "media" ADD COLUMN     "contentClassificationJson" JSONB,
ADD COLUMN     "qualityBlurVariance" DOUBLE PRECISION,
ADD COLUMN     "qualityBrightnessMean" DOUBLE PRECISION,
ADD COLUMN     "qualityFlags" TEXT[] DEFAULT ARRAY[]::TEXT[];

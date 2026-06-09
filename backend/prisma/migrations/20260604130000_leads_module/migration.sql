-- CreateEnum
CREATE TYPE "LeadCampaignPlatform" AS ENUM ('META', 'GOOGLE_ADS', 'LINKED_IN', 'INSTAGRAM_DM', 'OTHER');
CREATE TYPE "LeadCampaignStatus" AS ENUM ('ACTIVE', 'PAUSED');
CREATE TYPE "LeadRecordStatus" AS ENUM ('NEW', 'CONTACTED', 'CONVERTED', 'CONFIRMED', 'LOST');

-- CreateTable
CREATE TABLE "LeadCampaign" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "platform" "LeadCampaignPlatform" NOT NULL,
    "status" "LeadCampaignStatus" NOT NULL DEFAULT 'PAUSED',
    "description" TEXT,
    "spend" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "assignedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeadCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT,
    "name" TEXT,
    "platform" "LeadCampaignPlatform",
    "status" "LeadRecordStatus" NOT NULL DEFAULT 'NEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LeadCampaign_platform_idx" ON "LeadCampaign"("platform");
CREATE INDEX "LeadCampaign_status_idx" ON "LeadCampaign"("status");
CREATE INDEX "Lead_campaignId_idx" ON "Lead"("campaignId");
CREATE INDEX "Lead_platform_idx" ON "Lead"("platform");
CREATE INDEX "Lead_status_idx" ON "Lead"("status");
CREATE INDEX "Lead_createdAt_idx" ON "Lead"("createdAt");

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "LeadCampaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

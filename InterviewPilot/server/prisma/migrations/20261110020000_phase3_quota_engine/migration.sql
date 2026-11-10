-- CreateEnum
CREATE TYPE "UsageScopeType" AS ENUM ('GLOBAL', 'USER');

-- CreateEnum
CREATE TYPE "UsagePeriodType" AS ENUM ('DAY', 'MONTH');

-- CreateEnum
CREATE TYPE "AIOperationType" AS ENUM (
  'DOCUMENT_SUMMARY',
  'DOCUMENT_EMBEDDING',
  'QUERY_EMBEDDING',
  'INTERVIEW_PLAN',
  'ANSWER_EVALUATION',
  'CANDIDATE_INQUIRY',
  'REPORT_GENERATION',
  'SPEECH_TRANSCRIPTION',
  'SPEECH_SYNTHESIS'
);

-- CreateEnum
CREATE TYPE "AIUsageStatus" AS ENUM (
  'RESERVED',
  'SETTLED',
  'RELEASED',
  'FAILED',
  'EXPIRED'
);

-- CreateTable
CREATE TABLE "UserQuota" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "interviewsPerDay" INTEGER,
    "maxDurationMinutes" INTEGER,
    "maxQuestionsPerInterview" INTEGER,
    "maxInquiriesPerInterview" INTEGER,
    "documentAnalysesPerDay" INTEGER,
    "reportGenerationsPerDay" INTEGER,
    "concurrentActiveInterviews" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserQuota_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UsageCounter" (
    "id" TEXT NOT NULL,
    "scopeType" "UsageScopeType" NOT NULL,
    "scopeId" TEXT NOT NULL,
    "periodType" "UsagePeriodType" NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "requestsUsed" INTEGER NOT NULL DEFAULT 0,
    "requestsReserved" INTEGER NOT NULL DEFAULT 0,
    "tokensUsed" INTEGER NOT NULL DEFAULT 0,
    "tokensReserved" INTEGER NOT NULL DEFAULT 0,
    "costUsed" DECIMAL(18,6) NOT NULL DEFAULT 0,
    "costReserved" DECIMAL(18,6) NOT NULL DEFAULT 0,
    "interviewsCreated" INTEGER NOT NULL DEFAULT 0,
    "interviewsReserved" INTEGER NOT NULL DEFAULT 0,
    "documentAnalyses" INTEGER NOT NULL DEFAULT 0,
    "documentAnalysesReserved" INTEGER NOT NULL DEFAULT 0,
    "reportsGenerated" INTEGER NOT NULL DEFAULT 0,
    "reportsReserved" INTEGER NOT NULL DEFAULT 0,
    "demoInterviewsCreated" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UsageCounter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIUsageRecord" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "interviewId" TEXT,
    "operation" "AIOperationType" NOT NULL,
    "model" TEXT NOT NULL,
    "status" "AIUsageStatus" NOT NULL DEFAULT 'RESERVED',
    "reservedRequests" INTEGER NOT NULL DEFAULT 1,
    "reservedTokens" INTEGER NOT NULL DEFAULT 0,
    "reservedCost" DECIMAL(18,6) NOT NULL DEFAULT 0,
    "actualRequests" INTEGER NOT NULL DEFAULT 0,
    "actualInputTokens" INTEGER NOT NULL DEFAULT 0,
    "actualOutputTokens" INTEGER NOT NULL DEFAULT 0,
    "actualTokens" INTEGER NOT NULL DEFAULT 0,
    "ttsCharacters" INTEGER NOT NULL DEFAULT 0,
    "costEstimated" DECIMAL(18,6) NOT NULL DEFAULT 0,
    "periodDayStart" TIMESTAMP(3) NOT NULL,
    "periodMonthStart" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AIUsageRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserQuota_userId_key" ON "UserQuota"("userId");

-- CreateIndex
CREATE INDEX "UsageCounter_scopeType_scopeId_periodType_idx" ON "UsageCounter"("scopeType", "scopeId", "periodType");

-- CreateIndex
CREATE UNIQUE INDEX "UsageCounter_scopeType_scopeId_periodType_periodStart_key" ON "UsageCounter"("scopeType", "scopeId", "periodType", "periodStart");

-- CreateIndex
CREATE INDEX "AIUsageRecord_userId_createdAt_idx" ON "AIUsageRecord"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "AIUsageRecord_model_createdAt_idx" ON "AIUsageRecord"("model", "createdAt");

-- CreateIndex
CREATE INDEX "AIUsageRecord_status_createdAt_idx" ON "AIUsageRecord"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "UserQuota" ADD CONSTRAINT "UserQuota_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIUsageRecord" ADD CONSTRAINT "AIUsageRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

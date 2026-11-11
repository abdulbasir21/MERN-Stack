-- CreateEnum
CREATE TYPE "InterviewMode" AS ENUM ('GENERAL', 'CV_BASED', 'JD_BASED', 'CV_JD');

-- CreateEnum
CREATE TYPE "InterviewType" AS ENUM ('TECHNICAL', 'HR', 'BEHAVIORAL');

-- CreateEnum
CREATE TYPE "InterviewDifficulty" AS ENUM ('EASY', 'MEDIUM', 'HARD');

-- CreateEnum
CREATE TYPE "InterviewStatus" AS ENUM ('CREATED', 'IN_PROGRESS', 'COMPLETED', 'ENDED_EARLY', 'TIMED_OUT', 'FAILED');

-- CreateEnum
CREATE TYPE "InterviewRuntimeState" AS ENUM ('INITIALIZING', 'RECRUITER_SPEAKING', 'WAITING_FOR_CANDIDATE', 'CANDIDATE_LISTENING', 'PROCESSING_ANSWER', 'AI_THINKING', 'GENERATING_NEXT_QUESTION', 'GENERATING_FEEDBACK', 'INTERVIEW_COMPLETED', 'ERROR');

-- CreateEnum
CREATE TYPE "InterviewEndReason" AS ENUM ('USER_ENDED', 'TIME_LIMIT', 'QUESTIONS_COMPLETED', 'ABANDONED', 'ERROR');

-- CreateEnum
CREATE TYPE "QuestionKind" AS ENUM ('MAIN', 'FOLLOW_UP', 'CLARIFICATION');

-- CreateTable Interview
CREATE TABLE "Interview" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mode" "InterviewMode" NOT NULL,
    "status" "InterviewStatus" NOT NULL DEFAULT 'CREATED',
    "runtimeState" "InterviewRuntimeState" NOT NULL DEFAULT 'INITIALIZING',
    "state" JSONB NOT NULL,
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "endReason" "InterviewEndReason",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Interview_pkey" PRIMARY KEY ("id")
);

-- CreateTable InterviewConfiguration
CREATE TABLE "InterviewConfiguration" (
    "id" TEXT NOT NULL,
    "interviewId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "experienceLevel" "ExperienceLevel" NOT NULL,
    "type" "InterviewType" NOT NULL,
    "startDifficulty" "InterviewDifficulty" NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "maxQuestions" INTEGER NOT NULL,
    "cvDocumentId" TEXT,
    "jdDocumentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InterviewConfiguration_pkey" PRIMARY KEY ("id")
);

-- CreateTable InterviewQuestion
CREATE TABLE "InterviewQuestion" (
    "id" TEXT NOT NULL,
    "interviewId" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "kind" "QuestionKind" NOT NULL DEFAULT 'MAIN',
    "topic" TEXT NOT NULL,
    "difficulty" "InterviewDifficulty" NOT NULL,
    "text" TEXT NOT NULL,
    "textHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InterviewQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InterviewConfiguration_interviewId_key" ON "InterviewConfiguration"("interviewId");

-- CreateIndex
CREATE INDEX "Interview_userId_createdAt_idx" ON "Interview"("userId", "createdAt");
CREATE INDEX "Interview_status_createdAt_idx" ON "Interview"("status", "createdAt");

-- Partial unique index for QTA-11: at most 1 interview IN_PROGRESS per user
CREATE UNIQUE INDEX "Interview_active_user_idx" ON "Interview"("userId") WHERE "status" = 'IN_PROGRESS';

-- CreateIndex for InterviewQuestion
CREATE UNIQUE INDEX "InterviewQuestion_interviewId_orderIndex_key" ON "InterviewQuestion"("interviewId", "orderIndex");
CREATE UNIQUE INDEX "InterviewQuestion_interviewId_textHash_key" ON "InterviewQuestion"("interviewId", "textHash");
CREATE INDEX "InterviewQuestion_interviewId_kind_idx" ON "InterviewQuestion"("interviewId", "kind");

-- AddForeignKey to AIUsageRecord
CREATE INDEX "AIUsageRecord_interviewId_createdAt_idx" ON "AIUsageRecord"("interviewId", "createdAt");
ALTER TABLE "AIUsageRecord" ADD CONSTRAINT "AIUsageRecord_interviewId_fkey" FOREIGN KEY ("interviewId") REFERENCES "Interview"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKeys to Interview
ALTER TABLE "Interview" ADD CONSTRAINT "Interview_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKeys to InterviewConfiguration
ALTER TABLE "InterviewConfiguration" ADD CONSTRAINT "InterviewConfiguration_interviewId_fkey" FOREIGN KEY ("interviewId") REFERENCES "Interview"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InterviewConfiguration" ADD CONSTRAINT "InterviewConfiguration_cvDocumentId_fkey" FOREIGN KEY ("cvDocumentId") REFERENCES "UploadedDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "InterviewConfiguration" ADD CONSTRAINT "InterviewConfiguration_jdDocumentId_fkey" FOREIGN KEY ("jdDocumentId") REFERENCES "UploadedDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey to InterviewQuestion
ALTER TABLE "InterviewQuestion" ADD CONSTRAINT "InterviewQuestion_interviewId_fkey" FOREIGN KEY ("interviewId") REFERENCES "Interview"("id") ON DELETE CASCADE ON UPDATE CASCADE;

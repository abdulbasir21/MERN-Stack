-- CreateTable
CREATE TABLE "CandidateAnswer" (
    "id" TEXT NOT NULL,
    "interviewId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "transcript" TEXT NOT NULL,
    "isEmpty" BOOLEAN NOT NULL DEFAULT false,
    "durationSeconds" INTEGER,
    "clientRequestId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CandidateAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnswerEvaluation" (
    "id" TEXT NOT NULL,
    "answerId" TEXT NOT NULL,
    "overallScore" INTEGER NOT NULL DEFAULT 0,
    "criteriaScores" JSONB NOT NULL,
    "correct" TEXT,
    "missing" TEXT,
    "strengths" JSONB,
    "weaknesses" JSONB,
    "improvements" JSONB,
    "idealAnswer" TEXT,
    "followUpRecommendation" TEXT,
    "reasoning" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnswerEvaluation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CandidateInquiry" (
    "id" TEXT NOT NULL,
    "interviewId" TEXT NOT NULL,
    "questionId" TEXT,
    "transcript" TEXT NOT NULL,
    "reply" TEXT NOT NULL,
    "clientRequestId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CandidateInquiry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CandidateAnswer_questionId_key" ON "CandidateAnswer"("questionId");
CREATE UNIQUE INDEX "CandidateAnswer_interviewId_clientRequestId_key" ON "CandidateAnswer"("interviewId", "clientRequestId");
CREATE INDEX "CandidateAnswer_interviewId_createdAt_idx" ON "CandidateAnswer"("interviewId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AnswerEvaluation_answerId_key" ON "AnswerEvaluation"("answerId");
CREATE INDEX "AnswerEvaluation_answerId_idx" ON "AnswerEvaluation"("answerId");

-- CreateIndex
CREATE UNIQUE INDEX "CandidateInquiry_interviewId_clientRequestId_key" ON "CandidateInquiry"("interviewId", "clientRequestId");
CREATE INDEX "CandidateInquiry_interviewId_createdAt_idx" ON "CandidateInquiry"("interviewId", "createdAt");

-- AddForeignKey
ALTER TABLE "CandidateAnswer" ADD CONSTRAINT "CandidateAnswer_interviewId_fkey" FOREIGN KEY ("interviewId") REFERENCES "Interview"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CandidateAnswer" ADD CONSTRAINT "CandidateAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "InterviewQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnswerEvaluation" ADD CONSTRAINT "AnswerEvaluation_answerId_fkey" FOREIGN KEY ("answerId") REFERENCES "CandidateAnswer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateInquiry" ADD CONSTRAINT "CandidateInquiry_interviewId_fkey" FOREIGN KEY ("interviewId") REFERENCES "Interview"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CandidateInquiry" ADD CONSTRAINT "CandidateInquiry_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "InterviewQuestion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('CV', 'JD');

-- CreateEnum
CREATE TYPE "DocumentSourceKind" AS ENUM ('FILE', 'PASTED');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('UPLOADED', 'PROCESSING', 'READY', 'FAILED');

-- CreateEnum
CREATE TYPE "DocumentFailureReason" AS ENUM ('INVALID_FILE', 'NO_TEXT', 'EXTRACTION_FAILED', 'PROCESSING_FAILED');

-- CreateTable
CREATE TABLE "UploadedDocument" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "DocumentType" NOT NULL,
    "sourceKind" "DocumentSourceKind" NOT NULL DEFAULT 'FILE',
    "originalName" TEXT,
    "mimeType" TEXT,
    "sizeBytes" INTEGER,
    "storageFileId" TEXT,
    "status" "DocumentStatus" NOT NULL DEFAULT 'UPLOADED',
    "failureReason" "DocumentFailureReason",
    "summaryJson" JSONB,
    "pastedText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UploadedDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UploadedDocument_userId_type_idx" ON "UploadedDocument"("userId", "type");

-- CreateIndex
CREATE INDEX "UploadedDocument_userId_status_idx" ON "UploadedDocument"("userId", "status");

-- AddForeignKey
ALTER TABLE "UploadedDocument" ADD CONSTRAINT "UploadedDocument_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

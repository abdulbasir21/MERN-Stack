-- Enable pgvector extension on Neon PostgreSQL
CREATE EXTENSION IF NOT EXISTS "vector";

-- CreateTable
CREATE TABLE IF NOT EXISTS "ApplicationSetting" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApplicationSetting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ApplicationSetting_key_key" ON "ApplicationSetting"("key");

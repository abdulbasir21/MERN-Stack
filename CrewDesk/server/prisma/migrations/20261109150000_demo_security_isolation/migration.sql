-- AlterTable: Add isDemo column to User, Client, Project, InventoryItem
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isDemo" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "isDemo" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "isDemo" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "InventoryItem" ADD COLUMN IF NOT EXISTS "isDemo" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable: Shared serverless rate limit store
CREATE TABLE IF NOT EXISTS "RateLimitBucket" (
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "resetAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RateLimitBucket_pkey" PRIMARY KEY ("key")
);

-- Backfill isDemo = true on existing seeded demo accounts
UPDATE "User"
SET "isDemo" = true
WHERE "email" IN (
    'owner@crewdesk.agency',
    'hr@crewdesk.agency',
    'pm@crewdesk.agency',
    'finance@crewdesk.agency',
    'inventory@crewdesk.agency',
    'employee@crewdesk.agency'
);

-- Backfill isDemo = true on existing seeded demo clients
UPDATE "Client"
SET "isDemo" = true
WHERE "email" IN (
    'enterprise@acmetech.io',
    'partners@novadynamics.com',
    'ops@vertexlogistics.io'
);

-- Backfill isDemo = true on existing seeded demo projects (linked to demo clients or demo managers)
UPDATE "Project"
SET "isDemo" = true
WHERE "name" = 'Omni-Channel Customer Experience Platform'
   OR "clientId" IN (SELECT "id" FROM "Client" WHERE "isDemo" = true)
   OR "managerId" IN (SELECT "id" FROM "User" WHERE "isDemo" = true);

-- Backfill isDemo = true on existing seeded demo inventory items
UPDATE "InventoryItem"
SET "isDemo" = true
WHERE "serialNumber" IN (
    'CD-APPLE-MBP-2026-01',
    'CD-DELL-U32-2026-08',
    'CD-LENOVO-X1-2026-19'
)
OR "name" IN (
    'Cat6 Shielded High-Speed Ethernet Cable 10ft',
    'Anker 10-in-1 Thunderbolt 4 Docking Station'
)
OR "assignedUserId" IN (SELECT "id" FROM "User" WHERE "isDemo" = true);

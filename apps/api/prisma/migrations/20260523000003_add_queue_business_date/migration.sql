-- B13.3-1: Add businessDate for daily ticket number scoping (Asia/Damascus, UTC+3)
--
-- The businessDate column stores the clinic calendar date (YYYY-MM-DD) as it
-- appears in Asia/Damascus time when the queue entry was created. This allows
-- ticket numbers to reset to 1 every business day within each organization.
--
-- Unique constraint changes from (organizationId, ticketNumber) — all-time
-- uniqueness — to (organizationId, businessDate, ticketNumber) — per-day uniqueness.

-- Step 1: Add column with empty default (backfilled next; NOT NULL after Step 3)
ALTER TABLE "queue_entries" ADD COLUMN "businessDate" TEXT NOT NULL DEFAULT '';

-- Step 2: Backfill existing rows — compute Damascus date from createdAt + UTC+3 offset
UPDATE "queue_entries"
SET "businessDate" = to_char("createdAt" + INTERVAL '3 hours', 'YYYY-MM-DD');

-- Step 3: Remove the placeholder default so app code always supplies the value
ALTER TABLE "queue_entries" ALTER COLUMN "businessDate" DROP DEFAULT;

-- Step 4: Drop old all-time unique index (was created via CREATE UNIQUE INDEX, not ADD CONSTRAINT)
DROP INDEX IF EXISTS "queue_entries_organizationId_ticketNumber_key";

-- Step 5: Add per-day unique index
CREATE UNIQUE INDEX "queue_entries_organizationId_businessDate_ticketNumber_key"
  ON "queue_entries" ("organizationId", "businessDate", "ticketNumber");

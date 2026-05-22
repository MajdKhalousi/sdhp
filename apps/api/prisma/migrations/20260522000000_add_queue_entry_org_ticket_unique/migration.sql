-- Add organizationId to QueueEntry with backfill from related appointment,
-- then enforce uniqueness of (organizationId, ticketNumber) per org.
-- Note: this schema uses camelCase column names (no @map() on fields).

-- Step 1: Add column as nullable to allow backfill of existing rows.
ALTER TABLE "queue_entries" ADD COLUMN "organizationId" TEXT;

-- Step 2: Backfill organizationId from the related appointment.
UPDATE "queue_entries" q
SET "organizationId" = a."organizationId"
FROM "appointments" a
WHERE q."appointmentId" = a.id;

-- Step 3: Make column NOT NULL now that all rows are populated.
ALTER TABLE "queue_entries" ALTER COLUMN "organizationId" SET NOT NULL;

-- Step 4: Add foreign key constraint.
ALTER TABLE "queue_entries" ADD CONSTRAINT "queue_entries_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- Step 5: Add composite unique constraint (the race-condition fix).
CREATE UNIQUE INDEX "queue_entries_organizationId_ticketNumber_key"
  ON "queue_entries"("organizationId", "ticketNumber");

-- Step 6: Add index for org-scoped queries.
CREATE INDEX "queue_entries_organizationId_idx"
  ON "queue_entries"("organizationId");

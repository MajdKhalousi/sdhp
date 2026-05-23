-- B14.1.2: Add soft-delete fields to queue_entries.
-- Previously QueueEntry used hard delete; this makes cancellations recoverable
-- and auditable, consistent with other operational records (patients, allergies, encounters).
-- Safe to run multiple times (ADD COLUMN is idempotent if column already exists on re-run).

ALTER TABLE "queue_entries" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
ALTER TABLE "queue_entries" ADD COLUMN IF NOT EXISTS "deletedBy" TEXT;

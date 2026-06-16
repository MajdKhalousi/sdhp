-- AlterTable
ALTER TABLE "queue_entries" ADD COLUMN     "chiefComplaintDraft" TEXT,
ADD COLUMN     "triageVitals" JSONB;

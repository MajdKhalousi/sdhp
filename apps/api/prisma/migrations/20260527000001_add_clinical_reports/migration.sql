-- CreateEnum
CREATE TYPE "ClinicalReportStatus" AS ENUM ('DRAFT', 'FINALIZED');

-- AlterEnum
BEGIN;
CREATE TYPE "MedicalTimelineEventType_new" AS ENUM ('PATIENT_CREATED', 'PATIENT_UPDATED', 'PATIENT_ARCHIVED', 'APPOINTMENT_BOOKED', 'CHECKED_IN', 'QUEUE_JOINED', 'ENCOUNTER_STARTED', 'ENCOUNTER_COMPLETED', 'PRESCRIPTION_ADDED', 'LAB_ORDERED', 'LAB_RESULT_ADDED', 'RADIOLOGY_ORDERED', 'RADIOLOGY_REPORT_ADDED', 'MEDICAL_FILE_UPLOADED', 'CLINICAL_REPORT_CREATED');
ALTER TABLE "medical_timeline_events" ALTER COLUMN "eventType" TYPE "MedicalTimelineEventType_new" USING ("eventType"::text::"MedicalTimelineEventType_new");
ALTER TYPE "MedicalTimelineEventType" RENAME TO "MedicalTimelineEventType_old";
ALTER TYPE "MedicalTimelineEventType_new" RENAME TO "MedicalTimelineEventType";
DROP TYPE "MedicalTimelineEventType_old";
COMMIT;

-- CreateTable
CREATE TABLE "clinical_reports" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "encounterId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "status" "ClinicalReportStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "clinical_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "clinical_reports_organizationId_idx" ON "clinical_reports"("organizationId");

-- CreateIndex
CREATE INDEX "clinical_reports_patientId_idx" ON "clinical_reports"("patientId");

-- CreateIndex
CREATE INDEX "clinical_reports_encounterId_idx" ON "clinical_reports"("encounterId");

-- CreateIndex
CREATE INDEX "clinical_reports_createdById_idx" ON "clinical_reports"("createdById");

-- CreateIndex
CREATE INDEX "clinical_reports_status_idx" ON "clinical_reports"("status");

-- CreateIndex
CREATE INDEX "clinical_reports_deletedAt_idx" ON "clinical_reports"("deletedAt");

-- AddForeignKey
ALTER TABLE "clinical_reports" ADD CONSTRAINT "clinical_reports_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_reports" ADD CONSTRAINT "clinical_reports_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_reports" ADD CONSTRAINT "clinical_reports_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "encounters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_reports" ADD CONSTRAINT "clinical_reports_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

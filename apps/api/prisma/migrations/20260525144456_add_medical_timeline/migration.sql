-- CreateEnum
CREATE TYPE "MedicalTimelineEventType" AS ENUM ('PATIENT_CREATED', 'PATIENT_UPDATED', 'PATIENT_ARCHIVED', 'APPOINTMENT_BOOKED', 'CHECKED_IN', 'QUEUE_JOINED', 'ENCOUNTER_STARTED', 'ENCOUNTER_COMPLETED', 'PRESCRIPTION_ADDED', 'LAB_ORDERED', 'LAB_RESULT_ADDED', 'RADIOLOGY_ORDERED', 'RADIOLOGY_RESULT_ADDED', 'FILE_UPLOADED', 'NOTE_ADDED');

-- CreateTable
CREATE TABLE "medical_timeline_events" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "createdById" TEXT,
    "eventType" "MedicalTimelineEventType" NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "medical_timeline_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "medical_timeline_events_organizationId_idx" ON "medical_timeline_events"("organizationId");

-- CreateIndex
CREATE INDEX "medical_timeline_events_patientId_idx" ON "medical_timeline_events"("patientId");

-- CreateIndex
CREATE INDEX "medical_timeline_events_organizationId_patientId_idx" ON "medical_timeline_events"("organizationId", "patientId");

-- CreateIndex
CREATE INDEX "patients_organizationId_idx" ON "patients"("organizationId");

-- CreateIndex
CREATE INDEX "patients_organizationId_firstName_idx" ON "patients"("organizationId", "firstName");

-- CreateIndex
CREATE INDEX "patients_organizationId_lastName_idx" ON "patients"("organizationId", "lastName");

-- CreateIndex
CREATE INDEX "patients_organizationId_phone_idx" ON "patients"("organizationId", "phone");

-- CreateIndex
CREATE INDEX "patients_organizationId_nationalId_idx" ON "patients"("organizationId", "nationalId");

-- CreateIndex
CREATE INDEX "patients_organizationId_deletedAt_idx" ON "patients"("organizationId", "deletedAt");

-- CreateIndex
CREATE INDEX "patients_organizationId_isActive_idx" ON "patients"("organizationId", "isActive");

-- AddForeignKey
ALTER TABLE "medical_timeline_events" ADD CONSTRAINT "medical_timeline_events_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medical_timeline_events" ADD CONSTRAINT "medical_timeline_events_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medical_timeline_events" ADD CONSTRAINT "medical_timeline_events_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

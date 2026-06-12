-- CreateEnum
CREATE TYPE "ClinicPatientStatus" AS ENUM ('ACTIVE', 'PENDING_VERIFICATION', 'SUSPENDED', 'REVOKED');

-- CreateEnum
CREATE TYPE "ClinicPatientLinkType" AS ENUM ('CLINIC_CREATED', 'PATIENT_VERIFIED', 'IMPORTED', 'INVITED');

-- AlterTable
ALTER TABLE "patients" ADD COLUMN     "hasPortalAccess" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "platformId" TEXT;

-- CreateTable
CREATE TABLE "clinic_patients" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "mrn" TEXT NOT NULL,
    "localNotes" TEXT,
    "linkType" "ClinicPatientLinkType" NOT NULL DEFAULT 'CLINIC_CREATED',
    "status" "ClinicPatientStatus" NOT NULL DEFAULT 'ACTIVE',
    "registrationSource" TEXT,
    "consentGiven" BOOLEAN NOT NULL DEFAULT false,
    "consentAt" TIMESTAMP(3),
    "verificationCodeHash" TEXT,
    "verificationExpiresAt" TIMESTAMP(3),
    "linkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "linkedById" TEXT,
    "lastVisitAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "clinic_patients_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "clinic_patients_organizationId_idx" ON "clinic_patients"("organizationId");

-- CreateIndex
CREATE INDEX "clinic_patients_patientId_idx" ON "clinic_patients"("patientId");

-- CreateIndex
CREATE INDEX "clinic_patients_organizationId_status_idx" ON "clinic_patients"("organizationId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "clinic_patients_organizationId_patientId_key" ON "clinic_patients"("organizationId", "patientId");

-- CreateIndex
CREATE UNIQUE INDEX "clinic_patients_organizationId_mrn_key" ON "clinic_patients"("organizationId", "mrn");

-- CreateIndex
CREATE UNIQUE INDEX "patients_platformId_key" ON "patients"("platformId");

-- AddForeignKey
ALTER TABLE "clinic_patients" ADD CONSTRAINT "clinic_patients_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinic_patients" ADD CONSTRAINT "clinic_patients_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinic_patients" ADD CONSTRAINT "clinic_patients_linkedById_fkey" FOREIGN KEY ("linkedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

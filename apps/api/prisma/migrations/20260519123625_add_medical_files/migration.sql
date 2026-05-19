-- CreateEnum
CREATE TYPE "MedicalFileCategory" AS ENUM ('LAB_RESULT', 'RADIOLOGY_IMAGE', 'PRESCRIPTION', 'REFERRAL', 'DISCHARGE_SUMMARY', 'CONSENT_FORM', 'INSURANCE', 'CLINICAL_NOTE', 'ID_DOCUMENT', 'OTHER');

-- CreateTable
CREATE TABLE "medical_files" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "encounterId" TEXT,
    "uploadedById" TEXT NOT NULL,
    "category" "MedicalFileCategory" NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "storageKey" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "medical_files_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "medical_files_storageKey_key" ON "medical_files"("storageKey");

-- CreateIndex
CREATE INDEX "medical_files_organizationId_idx" ON "medical_files"("organizationId");

-- CreateIndex
CREATE INDEX "medical_files_patientId_idx" ON "medical_files"("patientId");

-- CreateIndex
CREATE INDEX "medical_files_encounterId_idx" ON "medical_files"("encounterId");

-- CreateIndex
CREATE INDEX "medical_files_uploadedById_idx" ON "medical_files"("uploadedById");

-- CreateIndex
CREATE INDEX "medical_files_category_idx" ON "medical_files"("category");

-- AddForeignKey
ALTER TABLE "medical_files" ADD CONSTRAINT "medical_files_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medical_files" ADD CONSTRAINT "medical_files_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medical_files" ADD CONSTRAINT "medical_files_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "encounters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medical_files" ADD CONSTRAINT "medical_files_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

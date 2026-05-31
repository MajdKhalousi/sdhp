-- AlterEnum
ALTER TYPE "MedicalTimelineEventType" ADD VALUE 'FOLLOW_UP_BOOKED';

-- AlterTable
ALTER TABLE "appointments" ADD COLUMN     "sourceEncounterId" TEXT;

-- CreateIndex
CREATE INDEX "appointments_sourceEncounterId_idx" ON "appointments"("sourceEncounterId");

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_sourceEncounterId_fkey" FOREIGN KEY ("sourceEncounterId") REFERENCES "encounters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

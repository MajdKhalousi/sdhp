-- CreateEnum
CREATE TYPE "PatientResponseStatus" AS ENUM ('CONFIRMED', 'NO_RESPONSE', 'DECLINED', 'RESCHEDULE_REQUESTED');

-- AlterTable
ALTER TABLE "follow_up_reminders" ADD COLUMN     "contactNote" TEXT,
ADD COLUMN     "patientResponse" "PatientResponseStatus";

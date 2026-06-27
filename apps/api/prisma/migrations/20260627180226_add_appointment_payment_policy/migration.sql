-- CreateEnum
CREATE TYPE "AppointmentPaymentPolicy" AS ENUM ('NONE', 'OPTIONAL_PREPAYMENT', 'DEPOSIT_REQUIRED', 'FULL_PREPAYMENT_REQUIRED');

-- AlterTable
ALTER TABLE "billing_policies" ADD COLUMN     "appointmentDepositPercent" DECIMAL(5,2) NOT NULL DEFAULT 0,
ADD COLUMN     "appointmentPaymentPolicy" "AppointmentPaymentPolicy" NOT NULL DEFAULT 'NONE';


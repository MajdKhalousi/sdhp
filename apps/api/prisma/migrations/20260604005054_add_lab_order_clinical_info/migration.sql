-- AlterTable
ALTER TABLE "billing_policies" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "lab_orders" ADD COLUMN     "clinicalInfo" TEXT;

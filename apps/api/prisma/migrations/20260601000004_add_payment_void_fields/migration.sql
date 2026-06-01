-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "voidedAt" TIMESTAMP(3),
ADD COLUMN     "voidReason" TEXT,
ADD COLUMN     "voidedById" TEXT;

-- CreateIndex
CREATE INDEX "payments_voidedById_idx" ON "payments"("voidedById");

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_voidedById_fkey" FOREIGN KEY ("voidedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateEnum
CREATE TYPE "ServiceExecutionStatus" AS ENUM ('REQUESTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "medical_service_requests" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "branchId" TEXT,
    "patientId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "appointmentId" TEXT,
    "encounterId" TEXT,
    "invoiceItemId" TEXT,
    "requestedById" TEXT NOT NULL,
    "doctorId" TEXT,
    "requestedServiceName" TEXT NOT NULL,
    "requestedUnitPrice" DECIMAL(10,2) NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "notes" TEXT,
    "executionStatus" "ServiceExecutionStatus" NOT NULL DEFAULT 'REQUESTED',
    "executedAt" TIMESTAMP(3),
    "executedById" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "cancelReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "medical_service_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "medical_service_requests_invoiceItemId_key" ON "medical_service_requests"("invoiceItemId");

-- CreateIndex
CREATE INDEX "medical_service_requests_organizationId_idx" ON "medical_service_requests"("organizationId");

-- CreateIndex
CREATE INDEX "medical_service_requests_organizationId_patientId_deletedAt_idx" ON "medical_service_requests"("organizationId", "patientId", "deletedAt");

-- CreateIndex
CREATE INDEX "medical_service_requests_serviceId_idx" ON "medical_service_requests"("serviceId");

-- CreateIndex
CREATE INDEX "medical_service_requests_appointmentId_idx" ON "medical_service_requests"("appointmentId");

-- CreateIndex
CREATE INDEX "medical_service_requests_encounterId_idx" ON "medical_service_requests"("encounterId");

-- CreateIndex
CREATE INDEX "medical_service_requests_organizationId_executionStatus_idx" ON "medical_service_requests"("organizationId", "executionStatus");

-- AddForeignKey
ALTER TABLE "medical_service_requests" ADD CONSTRAINT "medical_service_requests_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medical_service_requests" ADD CONSTRAINT "medical_service_requests_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medical_service_requests" ADD CONSTRAINT "medical_service_requests_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medical_service_requests" ADD CONSTRAINT "medical_service_requests_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medical_service_requests" ADD CONSTRAINT "medical_service_requests_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medical_service_requests" ADD CONSTRAINT "medical_service_requests_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "encounters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medical_service_requests" ADD CONSTRAINT "medical_service_requests_invoiceItemId_fkey" FOREIGN KEY ("invoiceItemId") REFERENCES "invoice_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medical_service_requests" ADD CONSTRAINT "medical_service_requests_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "doctors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medical_service_requests" ADD CONSTRAINT "medical_service_requests_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medical_service_requests" ADD CONSTRAINT "medical_service_requests_executedById_fkey" FOREIGN KEY ("executedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

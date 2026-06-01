-- CreateTable: billing_policies
-- One record per organization. Stores all configurable billing rules.
-- nextInvoiceSequence is an atomic counter for concurrency-safe invoice number generation.

CREATE TABLE "billing_policies" (
    "id"                           TEXT NOT NULL,
    "organizationId"               TEXT NOT NULL,
    "autoCreateInvoiceOnCheckin"   BOOLEAN NOT NULL DEFAULT true,
    "freeFollowUpWindowDays"       INTEGER NOT NULL DEFAULT 0,
    "followUpDiscountPercent"      DECIMAL(5,2) NOT NULL DEFAULT 0,
    "requirePaymentBeforeEncounter" BOOLEAN NOT NULL DEFAULT false,
    "defaultDueDateDays"           INTEGER NOT NULL DEFAULT 0,
    "noShowFeeAmount"              DECIMAL(10,2) NOT NULL DEFAULT 0,
    "invoiceNumberPrefix"          TEXT NOT NULL DEFAULT 'INV',
    "nextInvoiceSequence"          INTEGER NOT NULL DEFAULT 1,
    "createdAt"                    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"                    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "billing_policies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: unique per organization
CREATE UNIQUE INDEX "billing_policies_organizationId_key" ON "billing_policies"("organizationId");

-- AddForeignKey
ALTER TABLE "billing_policies" ADD CONSTRAINT "billing_policies_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

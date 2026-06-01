-- Change nextInvoiceSequence default from 1 to 0 so the first atomic increment
-- yields sequence 1 (i.e. INV-YYYY-00001 for the very first invoice).
ALTER TABLE "billing_policies"
  ALTER COLUMN "nextInvoiceSequence" SET DEFAULT 0;

-- Reset any existing dev rows that still carry the old default of 1
-- and have never been used for invoice generation.
UPDATE "billing_policies"
SET "nextInvoiceSequence" = 0
WHERE "nextInvoiceSequence" = 1;

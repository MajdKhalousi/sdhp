-- B13.6.2: Add soft-delete support to allergies
-- Historical allergy records must remain auditable after removal.

ALTER TABLE "allergies" ADD COLUMN "deletedAt" TIMESTAMP(3);
ALTER TABLE "allergies" ADD COLUMN "deletedBy" TEXT;

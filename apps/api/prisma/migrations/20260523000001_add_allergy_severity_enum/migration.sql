-- B13.2-5: Add AllergySeverity enum and migrate Allergy.severity column
--
-- Backward compatibility:
--   Any existing severity values not in ('MILD','MODERATE','SEVERE') are
--   nullified before the type change to prevent cast failures. Seed data
--   uses 'MILD' and 'MODERATE' which are valid enum members.

-- Step 1: Safety — null out non-conforming severity values
UPDATE "allergies"
SET "severity" = NULL
WHERE "severity" IS NOT NULL
  AND "severity" NOT IN ('MILD', 'MODERATE', 'SEVERE');

-- Step 2: Create the enum type
CREATE TYPE "AllergySeverity" AS ENUM ('MILD', 'MODERATE', 'SEVERE');

-- Step 3: Convert column type with explicit USING cast
ALTER TABLE "allergies"
  ALTER COLUMN "severity" TYPE "AllergySeverity"
  USING "severity"::"AllergySeverity";

-- B13.6.3: Standardize MRN format to MRN-XXXXXX (6-digit zero-padded).
-- Backfills existing MRN-NNN values (any digit count != 6) produced by the old
-- date-random generator (P-YYYYMMDD-XXXX) are left as-is since they don't match
-- the MRN- prefix and cannot be safely renumbered without clinical review.
--
-- Safe to run multiple times (idempotent via the WHERE condition).

UPDATE "patients"
SET "mrn" = 'MRN-' || LPAD(SUBSTRING("mrn" FROM 5), 6, '0')
WHERE "mrn" ~ '^MRN-[0-9]+$'
  AND "mrn" !~ '^MRN-[0-9]{6}$';

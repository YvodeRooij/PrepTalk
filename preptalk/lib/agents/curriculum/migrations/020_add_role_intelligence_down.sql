-- Rollback: Remove role intelligence column and related indexes

BEGIN;

-- Drop indexes
DROP INDEX IF EXISTS idx_curricula_competitors;
DROP INDEX IF EXISTS idx_curricula_role_intelligence;

-- Drop constraint
ALTER TABLE curricula DROP CONSTRAINT IF EXISTS role_intelligence_valid_structure;

-- Drop column
ALTER TABLE curricula DROP COLUMN IF EXISTS role_intelligence;

COMMIT;
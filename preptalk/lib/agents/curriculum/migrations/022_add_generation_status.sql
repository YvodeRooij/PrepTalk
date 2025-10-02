-- Migration: Add generation_status column to curricula table
-- Purpose: Track CV-first progressive experience (cv_round_only -> generating_full -> complete)
-- Date: 2025-01-XX

-- Add generation_status column with constraint
ALTER TABLE curricula
ADD COLUMN IF NOT EXISTS generation_status TEXT DEFAULT 'complete'
CHECK (generation_status IN ('cv_round_only', 'generating_full', 'complete', 'failed'));

-- Add index for efficient filtering by status
CREATE INDEX IF NOT EXISTS idx_curricula_generation_status
ON curricula(generation_status);

-- Add index for finding incomplete curricula that need completion
CREATE INDEX IF NOT EXISTS idx_curricula_incomplete
ON curricula(generation_status, updated_at)
WHERE generation_status IN ('cv_round_only', 'generating_full');

-- Add comment for documentation
COMMENT ON COLUMN curricula.generation_status IS
'Tracks curriculum generation progress for CV-first flow:
- cv_round_only: Fast path complete (1 round only, user can start interview)
- generating_full: Background generation in progress (updating to 5 rounds)
- complete: Full curriculum ready (all 5 rounds generated)
- failed: Generation encountered an error';

-- Update existing records to 'complete' status (they were fully generated)
UPDATE curricula
SET generation_status = 'complete'
WHERE generation_status IS NULL;
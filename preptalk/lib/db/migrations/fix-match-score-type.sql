-- Fix match_score column type from INTEGER to DECIMAL
-- Confidence scores should be between 0 and 1 (decimal values)

ALTER TABLE public.cv_analyses
ALTER COLUMN match_score TYPE DECIMAL(3,2) USING match_score::DECIMAL(3,2);

-- Update any existing records that might have invalid values
UPDATE public.cv_analyses
SET match_score = 0.5
WHERE match_score IS NULL OR match_score < 0 OR match_score > 1;
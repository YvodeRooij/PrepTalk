-- Migration: Non-Technical Curriculum System
-- Extends existing schema for competitive intelligence-powered persona generation
-- Phase 1: Enable recruiter_screen + behavioral rounds with candidate prep guides

BEGIN;

-- Update round types with corrected naming (remove outdated "phone_screen")
ALTER TABLE curriculum_rounds DROP CONSTRAINT IF EXISTS curriculum_rounds_round_type_check;
ALTER TABLE curriculum_rounds ADD CONSTRAINT curriculum_rounds_round_type_check
CHECK (round_type = ANY (ARRAY[
  'recruiter_screen'::text,           -- Initial screening by recruiter (was phone_screen)
  'behavioral_deep_dive'::text,       -- Past experiences using STAR method
  'culture_values_alignment'::text,   -- Company culture fit assessment
  'strategic_role_discussion'::text,  -- Role understanding and strategic thinking
  'executive_final'::text             -- Leadership alignment and vision
]));

-- Enhance question bank scoring guide for recognition patterns
-- Extend existing JSONB structure with competitive intelligence fields
UPDATE question_bank
SET scoring_guide = scoring_guide || '{
  "competitive_intelligence_signals": [],
  "exceptional_answer_indicators": [],
  "follow_up_triggers": []
}'::jsonb
WHERE scoring_guide IS NOT NULL;

-- Set enhanced default for new question_bank entries
ALTER TABLE question_bank
ALTER COLUMN scoring_guide
SET DEFAULT '{
  "red_flags": [],
  "partial_credit": true,
  "excellent_indicators": [],
  "competitive_intelligence_signals": [],
  "exceptional_answer_indicators": [],
  "follow_up_triggers": []
}'::jsonb;

-- Add candidate prep guide to curriculum_rounds
-- This stores the prep guidance with CI talking points
ALTER TABLE curriculum_rounds
ADD COLUMN candidate_prep_guide JSONB DEFAULT '{
  "ci_talking_points": {
    "strategic_advantages": [],
    "recent_developments": []
  },
  "recognition_training": {
    "what_great_answers_sound_like": [],
    "how_to_demonstrate_company_knowledge": []
  },
  "standard_questions_prep": []
}'::jsonb;

-- Performance indexes for new JSONB columns
CREATE INDEX idx_curriculum_rounds_candidate_prep
ON curriculum_rounds USING gin (candidate_prep_guide);

-- Index for competitive intelligence queries in question scoring
CREATE INDEX idx_question_bank_ci_signals
ON question_bank USING gin ((scoring_guide->'competitive_intelligence_signals'));

-- Add constraint to ensure candidate_prep_guide has required structure
ALTER TABLE curriculum_rounds
ADD CONSTRAINT candidate_prep_guide_structure_check
CHECK (
  candidate_prep_guide ? 'ci_talking_points' AND
  candidate_prep_guide ? 'recognition_training' AND
  candidate_prep_guide ? 'standard_questions_prep'
);

-- Update existing curriculum_rounds to have the new structure
UPDATE curriculum_rounds
SET candidate_prep_guide = '{
  "ci_talking_points": {
    "strategic_advantages": [],
    "recent_developments": []
  },
  "recognition_training": {
    "what_great_answers_sound_like": [],
    "how_to_demonstrate_company_knowledge": []
  },
  "standard_questions_prep": []
}'::jsonb
WHERE candidate_prep_guide IS NULL;

-- Add helpful comment for future developers
COMMENT ON COLUMN curriculum_rounds.candidate_prep_guide IS
'JSONB storing candidate preparation guidance with competitive intelligence talking points and recognition training patterns';

COMMIT;
-- Migration: Add role intelligence to curricula table
-- Phase 1: Role-specific competitive intelligence storage

BEGIN;

-- Add role intelligence column with structured JSONB schema
ALTER TABLE curricula ADD COLUMN role_intelligence JSONB DEFAULT '{
  "role_vs_competitors": null,
  "recent_role_developments": [],
  "strategic_advantages": [],
  "market_context": {
    "salary_range": null,
    "difficulty_rating": null,
    "preparation_time": null,
    "key_insights": []
  },
  "competitive_positioning": null,
  "generated_at": null
}';

-- Add constraint to ensure valid JSONB structure
ALTER TABLE curricula ADD CONSTRAINT role_intelligence_valid_structure
CHECK (
  role_intelligence ? 'role_vs_competitors' AND
  role_intelligence ? 'recent_role_developments' AND
  role_intelligence ? 'strategic_advantages' AND
  role_intelligence ? 'market_context' AND
  role_intelligence ? 'competitive_positioning' AND
  role_intelligence ? 'generated_at'
);

-- Performance index for querying role intelligence
CREATE INDEX idx_curricula_role_intelligence ON curricula USING gin (role_intelligence);

-- Index for competitive queries
CREATE INDEX idx_curricula_competitors ON curricula USING gin ((role_intelligence->'strategic_advantages'));

COMMIT;
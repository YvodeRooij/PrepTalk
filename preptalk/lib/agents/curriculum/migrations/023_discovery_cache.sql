-- Migration: Add discovery_cache table for caching company+role research
-- Purpose: Avoid redundant LLM calls for same company+role combinations
-- Date: 2025-10-01
-- TTL Strategy: 7 days for competitors/interviews, 3 days for news

-- Create discovery_cache table
CREATE TABLE IF NOT EXISTS discovery_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Cache key components (normalized)
  company_name TEXT NOT NULL,
  role_family TEXT NOT NULL,

  -- Cached discovery data (JSONB for flexibility)
  competitors JSONB NOT NULL DEFAULT '[]',
  interview_experiences JSONB NOT NULL DEFAULT '[]',
  company_news JSONB NOT NULL DEFAULT '[]',

  -- Metadata
  search_queries JSONB DEFAULT '{}',
  grounding_metadata JSONB DEFAULT '{}',

  -- Timestamps and TTL
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,

  -- Cache hit tracking
  hit_count INTEGER NOT NULL DEFAULT 0,
  last_hit_at TIMESTAMPTZ,

  -- Ensure unique cache entries per company+role
  CONSTRAINT unique_company_role UNIQUE (company_name, role_family)
);

-- Index for finding valid (non-expired) cache entries
CREATE INDEX idx_discovery_cache_lookup ON discovery_cache(company_name, role_family, expires_at);

-- Index for cleanup of expired entries
CREATE INDEX idx_discovery_cache_cleanup ON discovery_cache(expires_at);

-- Index for analytics on popular cache entries
CREATE INDEX idx_discovery_cache_hit_count ON discovery_cache(hit_count DESC)
WHERE hit_count > 0;

-- RLS policies
ALTER TABLE discovery_cache ENABLE ROW LEVEL SECURITY;

-- Allow public read for valid cache entries (not expired)
CREATE POLICY "discovery_cache_read_public"
  ON discovery_cache
  FOR SELECT
  USING (expires_at > NOW());

-- Allow service role to write (insert/update)
CREATE POLICY "discovery_cache_write_service"
  ON discovery_cache
  FOR ALL
  USING (auth.role() = 'service_role');

-- Auto-update trigger for updated_at
CREATE OR REPLACE FUNCTION update_discovery_cache_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_discovery_cache_timestamp
  BEFORE UPDATE ON discovery_cache
  FOR EACH ROW
  EXECUTE FUNCTION update_discovery_cache_timestamp();

-- Cleanup function for expired entries (can be called via pg_cron or manually)
CREATE OR REPLACE FUNCTION cleanup_expired_discovery_cache()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM discovery_cache
  WHERE expires_at <= NOW();

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Add helpful comments for documentation
COMMENT ON TABLE discovery_cache IS
'Caches discovery data (competitors, interviews, news) for company+role combinations to avoid redundant LLM calls. TTL: 7 days for competitors/interviews, 3 days for news.';

COMMENT ON COLUMN discovery_cache.company_name IS
'Normalized company name (lowercase, no special chars)';

COMMENT ON COLUMN discovery_cache.role_family IS
'Normalized role family (e.g., "software_engineering", "data_science", "product_management")';

COMMENT ON COLUMN discovery_cache.competitors IS
'Array of competitor objects: {name, url, industry, relevance}';

COMMENT ON COLUMN discovery_cache.interview_experiences IS
'Array of interview experience objects: {source, difficulty, topics, feedback}';

COMMENT ON COLUMN discovery_cache.company_news IS
'Array of company news objects: {title, url, date, summary}';

COMMENT ON COLUMN discovery_cache.expires_at IS
'Cache expiration timestamp. After this, entry is considered stale and should be refreshed.';

COMMENT ON COLUMN discovery_cache.hit_count IS
'Number of times this cache entry has been used. Higher = more popular search.';

/**
 * Discovery Cache Service
 * Caches company+role research data to avoid redundant LLM calls
 *
 * Cache Strategy:
 * - Key: normalized company_name + role_family
 * - TTL: 7 days (configurable)
 * - Storage: Supabase JSONB columns
 * - Sharing: Multiple users benefit from same cache entry
 */

import { SupabaseClient } from '@supabase/supabase-js';
import type {
  Competitor,
  InterviewExperience,
  CompanyNews
} from '../schemas';

/**
 * Cached discovery data structure
 * Matches the JSONB columns in discovery_cache table
 */
export interface CachedDiscoveryData {
  competitors: Competitor[];
  interview_experiences: InterviewExperience[];
  company_news: CompanyNews[];
  search_queries?: Record<string, string>;
  grounding_metadata?: any;
}

/**
 * Cache service for discovery phase data
 * Implements get/set operations with automatic TTL management
 */
export class DiscoveryCacheService {
  private readonly DEFAULT_TTL_DAYS = 7;

  constructor(private supabase: SupabaseClient) {}

  /**
   * Retrieves cached discovery data for a company+role combination
   * Returns null if cache miss or expired
   *
   * @param company - Company name (will be normalized)
   * @param roleFamily - Role family (will be normalized)
   * @returns Cached data or null
   */
  async getCached(
    company: string,
    roleFamily: string
  ): Promise<CachedDiscoveryData | null> {
    const normalizedCompany = normalizeCompanyName(company);
    const normalizedRole = normalizeRoleFamily(roleFamily);

    // Query cache with expiry check
    const { data, error } = await this.supabase
      .from('discovery_cache')
      .select('*')
      .eq('company_name', normalizedCompany)
      .eq('role_family', normalizedRole)
      .gt('expires_at', new Date().toISOString()) // Only non-expired entries
      .single();

    if (error || !data) {
      return null;
    }

    // Increment hit count (await for consistency)
    await this.incrementHitCount(normalizedCompany, normalizedRole).catch(err => {
      console.warn('Failed to increment cache hit count:', err);
    });

    // Return cached data
    return {
      competitors: data.competitors || [],
      interview_experiences: data.interview_experiences || [],
      company_news: data.company_news || [],
      search_queries: data.search_queries || {},
      grounding_metadata: data.grounding_metadata || {}
    };
  }

  /**
   * Stores discovery data in cache with TTL
   * Uses upsert to handle both insert and update
   *
   * @param company - Company name (will be normalized)
   * @param roleFamily - Role family (will be normalized)
   * @param data - Discovery data to cache
   * @param ttlDays - TTL in days (default: 7)
   */
  async setCached(
    company: string,
    roleFamily: string,
    data: CachedDiscoveryData,
    ttlDays: number = this.DEFAULT_TTL_DAYS
  ): Promise<void> {
    const normalizedCompany = normalizeCompanyName(company);
    const normalizedRole = normalizeRoleFamily(roleFamily);
    const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);

    // Check if entry exists to preserve hit_count
    const { data: existing } = await this.supabase
      .from('discovery_cache')
      .select('hit_count')
      .eq('company_name', normalizedCompany)
      .eq('role_family', normalizedRole)
      .single();

    const preservedHitCount = existing?.hit_count || 0;

    // Upsert cache entry
    const { error } = await this.supabase
      .from('discovery_cache')
      .upsert(
        {
          company_name: normalizedCompany,
          role_family: normalizedRole,
          competitors: data.competitors || [],
          interview_experiences: data.interview_experiences || [],
          company_news: data.company_news || [],
          search_queries: data.search_queries || {},
          grounding_metadata: data.grounding_metadata || {},
          expires_at: expiresAt.toISOString(),
          hit_count: preservedHitCount, // Preserve hit count on update
          updated_at: new Date().toISOString()
        },
        {
          onConflict: 'company_name,role_family'
        }
      );

    if (error) {
      throw new Error(`Failed to cache discovery data: ${error.message}`);
    }
  }

  /**
   * Increments hit count for cache entry
   * Called asynchronously when cache is accessed
   */
  private async incrementHitCount(
    normalizedCompany: string,
    normalizedRole: string
  ): Promise<void> {
    // Direct update with increment (no RPC needed)
    const { data } = await this.supabase
      .from('discovery_cache')
      .select('hit_count')
      .eq('company_name', normalizedCompany)
      .eq('role_family', normalizedRole)
      .single();

    if (data) {
      await this.supabase
        .from('discovery_cache')
        .update({
          hit_count: (data.hit_count || 0) + 1,
          last_hit_at: new Date().toISOString()
        })
        .eq('company_name', normalizedCompany)
        .eq('role_family', normalizedRole);
    }
  }

  /**
   * Manually cleanup expired cache entries
   * Can be called periodically or via cron job
   *
   * @returns Number of deleted entries
   */
  async cleanupExpired(): Promise<number> {
    const { error } = await this.supabase.rpc('cleanup_expired_discovery_cache');

    if (error) {
      // Fallback to direct delete if function doesn't exist
      const { count } = await this.supabase
        .from('discovery_cache')
        .delete({ count: 'exact' })
        .lte('expires_at', new Date().toISOString());

      return count || 0;
    }

    return 0; // RPC doesn't return count in this implementation
  }
}

/**
 * Normalizes company name for consistent cache keys
 *
 * Rules:
 * - Lowercase
 * - Remove common suffixes (Inc., LLC, Corp., etc.)
 * - Remove special characters except spaces
 * - Normalize whitespace
 *
 * Examples:
 * - "Google Inc." -> "google"
 * - "Apple, Inc" -> "apple"
 * - "Microsoft Corporation" -> "microsoft"
 * - "AT&T" -> "att"
 */
export function normalizeCompanyName(company: string): string {
  let normalized = company.toLowerCase().trim();

  // Remove common suffixes
  const suffixes = [
    'inc.',
    'inc',
    'corporation',
    'corp.',
    'corp',
    'llc',
    'l.l.c.',
    'ltd',
    'limited',
    'co.',
    'company',
    'plc',
    'sa',
    's.a.'
  ];

  for (const suffix of suffixes) {
    const regex = new RegExp(`[,\\s]+${suffix}$`, 'i');
    normalized = normalized.replace(regex, '');
  }

  // Remove special characters (but keep alphanumeric, spaces, and dots)
  normalized = normalized.replace(/[^a-z0-9\s.]/g, '');

  // Normalize all whitespace (tabs, newlines, multiple spaces) to single space
  normalized = normalized.replace(/\s+/g, ' ').trim();

  return normalized;
}

/**
 * Normalizes role title into role family for cache key
 *
 * Maps various role titles to standard families:
 * - software_engineering: SWE, SDE, Backend, Frontend, Full Stack, etc.
 * - data_science: Data Scientist, ML Engineer, etc.
 * - product_management: Product Manager, PM, TPM, etc.
 * - design: UX, UI, Product Designer, etc.
 * - general: Fallback for unknown roles
 *
 * Examples:
 * - "Senior Software Engineer II" -> "software_engineering"
 * - "Data Scientist" -> "data_science"
 * - "Product Manager" -> "product_management"
 * - "Random Job Title" -> "general"
 */
export function normalizeRoleFamily(role: string): string {
  const lowerRole = role.toLowerCase();

  // Data Science family (check BEFORE general engineering keywords)
  const dsKeywords = [
    'data scientist',
    'data science',
    'machine learning',
    'ml engineer',
    'ai engineer',
    'research scientist'
  ];

  for (const keyword of dsKeywords) {
    if (lowerRole.includes(keyword)) {
      return 'data_science';
    }
  }

  // Software Engineering family
  const swKeywords = [
    'software engineer',
    'software developer',
    'sde',
    'swe',
    'backend',
    'frontend',
    'full stack',
    'fullstack',
    'full-stack',
    'engineer',
    'developer',
    'programmer'
  ];

  for (const keyword of swKeywords) {
    if (lowerRole.includes(keyword)) {
      return 'software_engineering';
    }
  }

  // Product Management family
  const pmKeywords = [
    'product manager',
    'product management',
    'pm ',
    ' pm',
    'tpm',
    'technical program'
  ];

  for (const keyword of pmKeywords) {
    if (lowerRole.includes(keyword)) {
      return 'product_management';
    }
  }

  // Design family
  const designKeywords = [
    'designer',
    'ux',
    'ui',
    'user experience',
    'user interface',
    'product design'
  ];

  for (const keyword of designKeywords) {
    if (lowerRole.includes(keyword)) {
      return 'design';
    }
  }

  // QA/Test family
  const qaKeywords = [
    'qa',
    'quality assurance',
    'test engineer',
    'sdet',
    'automation'
  ];

  for (const keyword of qaKeywords) {
    if (lowerRole.includes(keyword)) {
      return 'qa_engineering';
    }
  }

  // DevOps/SRE family
  const devopsKeywords = [
    'devops',
    'sre',
    'site reliability',
    'infrastructure',
    'platform engineer'
  ];

  for (const keyword of devopsKeywords) {
    if (lowerRole.includes(keyword)) {
      return 'devops_sre';
    }
  }

  // Sales/Business family
  const salesKeywords = [
    'sales',
    'account executive',
    'account manager',
    'business development'
  ];

  for (const keyword of salesKeywords) {
    if (lowerRole.includes(keyword)) {
      return 'sales_business';
    }
  }

  // Marketing family
  const marketingKeywords = [
    'marketing',
    'growth',
    'content',
    'brand'
  ];

  for (const keyword of marketingKeywords) {
    if (lowerRole.includes(keyword)) {
      return 'marketing';
    }
  }

  // Fallback to general
  return 'general';
}

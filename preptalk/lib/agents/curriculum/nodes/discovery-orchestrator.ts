/**
 * Discovery Orchestrator
 * Coordinates cache-aware discovery across all topic types
 *
 * Flow:
 * 1. Check cache (normalized company + role family)
 * 2. If cache hit: return immediately
 * 3. If cache miss: run parallel discovery for all 3 topics
 * 4. Cache results for future use
 * 5. Return complete discovery data
 */

import { DiscoveryCacheService } from './discovery-cache';
import { discoverCompetitors, discoverInterviewExperiences, discoverCompanyNews } from './topic-discovery';
import type { LLMProviderService } from '../../../providers/llm-provider-service';
import type { Competitor, InterviewExperience, CompanyNews } from '../schemas';

/**
 * Complete discovery result with cache metadata
 */
export interface DiscoveryResult {
  competitors: Competitor[];
  experiences: InterviewExperience[];
  news: CompanyNews[];
  cacheHit: boolean;
  latencyMs: number;
  searchQueries?: Record<string, string>;
  groundingMetadata?: any;
}

/**
 * Discovery options
 */
export interface DiscoveryOptions {
  forceRefresh?: boolean;
}

/**
 * Main orchestration function for intelligent discovery with caching
 *
 * @param company - Company name (will be normalized for cache key)
 * @param role - Role title (will be normalized to role family)
 * @param llmProvider - LLM provider service instance
 * @param cacheService - Discovery cache service instance
 * @param options - Discovery options (forceRefresh, etc.)
 * @returns Complete discovery result with cache metadata
 */
export async function discoverWithCache(
  company: string,
  role: string,
  llmProvider: LLMProviderService,
  cacheService: DiscoveryCacheService,
  options: DiscoveryOptions = {}
): Promise<DiscoveryResult> {
  const startTime = Date.now();

  // Step 1: Try cache first (unless forceRefresh)
  if (!options.forceRefresh) {
    const cached = await cacheService.getCached(company, role);
    if (cached) {
      console.log(`✅ Cache HIT: ${company} + ${role}`);
      return {
        competitors: cached.competitors || [],
        experiences: cached.interview_experiences || [],
        news: cached.company_news || [],
        cacheHit: true,
        latencyMs: Date.now() - startTime,
        searchQueries: cached.search_queries,
        groundingMetadata: cached.grounding_metadata
      };
    }
  }

  console.log(`❌ Cache MISS: ${company} + ${role} - discovering...`);

  // Step 2: Cache miss - run parallel discovery for all 3 topics
  const [competitorsResult, experiencesResult, newsResult] = await Promise.all([
    discoverCompetitors(company, role, llmProvider),
    discoverInterviewExperiences(company, role, llmProvider),
    discoverCompanyNews(company, role, llmProvider)
  ]);

  // Step 3: Cache the results (non-critical, don't fail if cache write fails)
  try {
    await cacheService.setCached(company, role, {
      competitors: competitorsResult.competitors,
      interview_experiences: experiencesResult.experiences,
      company_news: newsResult.news,
      search_queries: {
        competitors: competitorsResult.searchQuery,
        experiences: experiencesResult.searchQuery,
        news: newsResult.searchQuery
      },
      grounding_metadata: {
        competitors: competitorsResult.groundingMetadata,
        experiences: experiencesResult.groundingMetadata,
        news: newsResult.groundingMetadata
      }
    });
    console.log(`💾 Cached discovery for ${company} + ${role}`);
  } catch (error) {
    console.warn('⚠️ Cache write failed (non-critical):', error);
    // Continue execution even if cache write fails
  }

  // Step 4: Return complete discovery result
  return {
    competitors: competitorsResult.competitors,
    experiences: experiencesResult.experiences,
    news: newsResult.news,
    cacheHit: false,
    latencyMs: Date.now() - startTime,
    searchQueries: {
      competitors: competitorsResult.searchQuery,
      experiences: experiencesResult.searchQuery,
      news: newsResult.searchQuery
    },
    groundingMetadata: {
      competitors: competitorsResult.groundingMetadata,
      experiences: experiencesResult.groundingMetadata,
      news: newsResult.groundingMetadata
    }
  };
}

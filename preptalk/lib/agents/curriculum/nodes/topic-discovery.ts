// Topic-Specific Discovery Functions
// Uses OOTB Gemini features: Google Search → URL Context → Structured Parsing

import { z } from 'zod';
import {
  CompetitorCollectionSchema,
  InterviewExperienceCollectionSchema,
  CompanyNewsCollectionSchema,
  type Competitor,
  type InterviewExperience,
  type CompanyNews,
} from '../schemas';
import {
  buildCompetitorQuery,
  buildInterviewExperienceQuery,
  buildCompanyNewsQuery,
} from './query-builder';
import type { LLMProviderService } from '../../../providers/llm-provider-service';

/**
 * Discovery result interface with grounding metadata
 */
interface DiscoveryResult<T> {
  data: T;
  searchQuery: string;
  groundingMetadata?: any;
  fallbackUsed: boolean;
}

/**
 * Discover top competitors for a company in a specific role context
 *
 * Two-step OOTB approach:
 * 1. generateWithGoogleSearch() - finds relevant competitor URLs
 * 2. generateStructured() - parses into structured format
 *
 * @param company - Target company name
 * @param role - Job role for context
 * @param llmProvider - LLM provider service instance
 * @returns Discovery result with 1-3 competitors
 */
export async function discoverCompetitors(
  company: string,
  role: string,
  llmProvider: LLMProviderService
): Promise<{
  competitors: Competitor[];
  searchQuery: string;
  groundingMetadata?: any;
  fallbackUsed: boolean;
}> {
  // Validation
  if (!company || company.trim().length === 0) {
    throw new Error('Company name is required for competitor discovery');
  }

  if (!llmProvider) {
    throw new Error('LLM provider is required for competitor discovery');
  }

  const searchQuery = buildCompetitorQuery(company, role);
  console.log(`🔍 [discoverCompetitors] Search query: ${searchQuery}`);

  let groundedResult;
  let fallbackUsed = false;

  try {
    // STEP 1: Use Google Search grounding to find competitor information
    groundedResult = await llmProvider.generateWithGoogleSearch(
      'company_research',
      `Search for direct competitors of ${company} that compete for ${role} talent.

CRITICAL: Include ALL types of competitors mentioned in search results:
- Regional/local competitors (same country/city as ${company})
- Industry leaders and established players
- Emerging startups and disruptors
- Cross-industry competitors

For EACH competitor found, include:
- Company name (exactly as written in sources)
- Official website URL (careers page preferred)
- Industry sector
- Company size with estimate (e.g., "Enterprise (10,000+ employees)", "Startup (50-200 employees)")
- Key competitive advantages or differentiators

DO NOT filter or prioritize based on global recognition.
DO NOT assume larger companies are more relevant than regional ones.
TALENT COMPETITION is what matters - include competitors where ${role} professionals actually move between companies.

Search query: ${searchQuery}`,
      { format: 'text' }
    );

    console.log(`✅ [discoverCompetitors] Google Search returned ${groundedResult.content.length} characters`);

  } catch (error) {
    console.error('❌ [discoverCompetitors] Google Search failed:', error.message);

    // Fallback: Use basic generation without grounding
    console.warn('⚠️ [discoverCompetitors] Falling back to non-grounded generation');
    fallbackUsed = true;

    const fallbackResult = await llmProvider.generateContent(
      'company_research',
      `List the top 3 direct competitors of ${company} in the ${role} market.

For each competitor, provide:
- Company name
- Official website URL
- Industry sector
- Company size
- Key differentiators

Format as a detailed text list.`,
      { format: 'text' }
    );

    groundedResult = {
      content: fallbackResult.content,
      provider: fallbackResult.provider,
      model: fallbackResult.model,
      tokensUsed: fallbackResult.tokensUsed,
      costCents: fallbackResult.costCents,
      latencyMs: fallbackResult.latencyMs,
      cached: fallbackResult.cached,
    };
  }

  // STEP 2: Parse TEXT into structured format using OpenAI
  // Note: OpenAI requires object schema, not array, so we wrap in an object
  let competitors: Competitor[];
  try {
    const WrapperSchema = z.object({
      competitors: CompetitorCollectionSchema
    });

    const parsed = await llmProvider.generateStructured(
      WrapperSchema,
      'job_parsing',
      `You are extracting competitor data from research text. Your ONLY job is to extract what the text explicitly states.

TASK: Extract ALL competitors of ${company} mentioned in the research text below.

MANDATORY EXTRACTION RULES:
1. If the text has a section titled "Regional/Local Competitors" → Extract those FIRST
2. Extract competitors in the ORDER they appear in the text (first mentioned = highest priority)
3. For EACH competitor, copy information EXACTLY as written:
   - name: Exact company name from text
   - url: Careers page URL from text
   - industry: Industry description from text
   - size: Employee count from text (if available)
   - differentiators: Copy 2-3 advantages directly from text

CRITICAL - WHAT YOU MUST NOT DO:
❌ DO NOT skip competitors mentioned in text because you think they're "less important"
❌ DO NOT replace competitors from text with companies from your world knowledge
❌ DO NOT reorder competitors by your judgment of "relevance"
❌ DO NOT prefer larger/global companies over smaller/regional ones
❌ DO NOT filter based on company size, geography, or market cap

VALIDATION:
- If text says "ABN AMRO is a competitor" → You MUST include ABN AMRO
- If text says "Regional competitors include: ABN AMRO, Rabobank" → You MUST include both
- If text has section "1. ABN AMRO" → ABN AMRO is #1 in your output

Research text:
${groundedResult.content}

Extract up to 5 competitors, in ORDER of mention in the text. First mentioned = first extracted.`,
      { forceProvider: 'openai' }
    );

    competitors = parsed.competitors.slice(0, 5); // Ensure max 5
    console.log(`✅ [discoverCompetitors] Parsed ${competitors.length} competitors`);

  } catch (error) {
    console.error('❌ [discoverCompetitors] Structured parsing failed:', error.message);
    throw new Error(`Failed to parse competitor data: ${error.message}`);
  }

  return {
    competitors,
    searchQuery,
    groundingMetadata: groundedResult.groundingMetadata,
    fallbackUsed,
  };
}

/**
 * Discover interview experiences from platforms like Glassdoor, Blind, etc.
 *
 * Two-step OOTB approach:
 * 1. generateWithGoogleSearch() - finds interview experience URLs
 * 2. generateStructured() - parses into structured format
 *
 * @param company - Target company name
 * @param role - Job role for context
 * @param llmProvider - LLM provider service instance
 * @returns Discovery result with 1-5 interview experiences
 */
export async function discoverInterviewExperiences(
  company: string,
  role: string,
  llmProvider: LLMProviderService
): Promise<{
  experiences: InterviewExperience[];
  searchQuery: string;
  groundingMetadata?: any;
  fallbackUsed: boolean;
}> {
  // Validation
  if (!company || company.trim().length === 0) {
    throw new Error('Company name is required for interview experience discovery');
  }

  if (!llmProvider) {
    throw new Error('LLM provider is required for interview experience discovery');
  }

  const searchQuery = buildInterviewExperienceQuery(company, role);
  console.log(`🔍 [discoverInterviewExperiences] Search query: ${searchQuery}`);

  let groundedResult;
  let fallbackUsed = false;

  try {
    // STEP 1: Use Google Search grounding to find interview experiences
    groundedResult = await llmProvider.generateWithGoogleSearch(
      'company_research',
      `Search for 5 recent interview experiences for ${role} positions at ${company}.

Focus on platforms like:
- Glassdoor
- Blind (TeamBlind)
- LeetCode Discuss
- Levels.fyi

For each experience, extract:
- Source URL (full link to the interview review)
- Date posted (if available)
- Role/position interviewed for
- Interview outcome (offer received, rejected, no response)
- Overall difficulty rating
- Interview round details (round name, duration, format, focus areas)
- Preparation tips from the candidate
- Key insights or observations

Prioritize experiences from the last 2 years (2024-2025).

Search query: ${searchQuery}`,
      { format: 'text' }
    );

    console.log(`✅ [discoverInterviewExperiences] Google Search returned ${groundedResult.content.length} characters`);

  } catch (error) {
    console.error('❌ [discoverInterviewExperiences] Google Search failed:', error.message);

    // Fallback: Use basic generation without grounding
    console.warn('⚠️ [discoverInterviewExperiences] Falling back to non-grounded generation');
    fallbackUsed = true;

    const fallbackResult = await llmProvider.generateContent(
      'company_research',
      `Describe 5 typical interview experiences for ${role} positions at ${company}.

Include:
- Common interview platforms/sources
- Typical difficulty levels
- Interview round structure
- Common preparation tips
- Key insights

Format as detailed text.`,
      { format: 'text' }
    );

    groundedResult = {
      content: fallbackResult.content,
      provider: fallbackResult.provider,
      model: fallbackResult.model,
      tokensUsed: fallbackResult.tokensUsed,
      costCents: fallbackResult.costCents,
      latencyMs: fallbackResult.latencyMs,
      cached: fallbackResult.cached,
    };
  }

  // STEP 2: Parse TEXT into structured format using OpenAI
  // Note: OpenAI requires object schema, not array, so we wrap in an object
  let experiences: InterviewExperience[];
  try {
    const WrapperSchema = z.object({
      experiences: InterviewExperienceCollectionSchema
    });

    const parsed = await llmProvider.generateStructured(
      WrapperSchema,
      'job_parsing',
      `Parse the following interview experience research into structured format. Extract up to 5 interview experiences.

Research content:
${groundedResult.content}

Important:
- source_url: Must be valid URL with https:// protocol (use source website or construct from platform)
- date_posted: Extract if mentioned, otherwise null
- role: Specific job title if mentioned
- outcome: "Offer received", "Rejected", "No response", or null
- overall_difficulty: "Easy", "Medium", "Hard", or null
- rounds: Array of interview round details with round_name, duration_minutes, format, focus_areas
- preparation_tips: Actionable tips from the candidate
- key_insights: Important observations or patterns`,
      { forceProvider: 'openai' }
    );

    experiences = parsed.experiences.slice(0, 5); // Ensure max 5
    console.log(`✅ [discoverInterviewExperiences] Parsed ${experiences.length} experiences`);

  } catch (error) {
    console.error('❌ [discoverInterviewExperiences] Structured parsing failed:', error.message);
    throw new Error(`Failed to parse interview experience data: ${error.message}`);
  }

  return {
    experiences,
    searchQuery,
    groundingMetadata: groundedResult.groundingMetadata,
    fallbackUsed,
  };
}

/**
 * Discover recent company news relevant to the role
 *
 * Two-step OOTB approach:
 * 1. generateWithGoogleSearch() - finds recent news URLs
 * 2. generateStructured() - parses into structured format
 *
 * @param company - Target company name
 * @param role - Job role for context
 * @param llmProvider - LLM provider service instance
 * @returns Discovery result with 1-4 news articles
 */
export async function discoverCompanyNews(
  company: string,
  role: string,
  llmProvider: LLMProviderService
): Promise<{
  news: CompanyNews[];
  searchQuery: string;
  groundingMetadata?: any;
  fallbackUsed: boolean;
}> {
  // Validation
  if (!company || company.trim().length === 0) {
    throw new Error('Company name is required for company news discovery');
  }

  if (!llmProvider) {
    throw new Error('LLM provider is required for company news discovery');
  }

  const searchQuery = buildCompanyNewsQuery(company, role);
  console.log(`🔍 [discoverCompanyNews] Search query: ${searchQuery}`);

  let groundedResult;
  let fallbackUsed = false;

  try {
    // STEP 1: Use Google Search grounding to find recent company news
    groundedResult = await llmProvider.generateWithGoogleSearch(
      'company_research',
      `Search for 4 recent news articles about ${company} from reputable sources.

Focus on:
- Product launches and announcements
- Funding rounds or acquisitions
- Major partnerships or deals
- Technology developments
- Hiring trends or organizational changes
- Industry recognition or awards

Prefer sources like:
- TechCrunch
- Bloomberg
- Reuters
- The Verge
- Industry-specific publications

For each article, extract:
- Title/headline
- Article URL
- Summary of key points
- Publication date
- Relevance to ${role} positions (how this news impacts the role)
- Sentiment (positive, neutral, negative)
- Source/publisher name

Prioritize news from the last year (2024-2025).

Search query: ${searchQuery}`,
      { format: 'text' }
    );

    console.log(`✅ [discoverCompanyNews] Google Search returned ${groundedResult.content.length} characters`);

  } catch (error) {
    console.error('❌ [discoverCompanyNews] Google Search failed:', error.message);

    // Fallback: Use basic generation without grounding
    console.warn('⚠️ [discoverCompanyNews] Falling back to non-grounded generation');
    fallbackUsed = true;

    const fallbackResult = await llmProvider.generateContent(
      'company_research',
      `Describe 4 recent major news events or developments at ${company} relevant to ${role} positions.

Include:
- News headlines
- Key details
- Publication sources
- Dates (approximate if needed)
- Relevance to the role
- Overall sentiment

Format as detailed text.`,
      { format: 'text' }
    );

    groundedResult = {
      content: fallbackResult.content,
      provider: fallbackResult.provider,
      model: fallbackResult.model,
      tokensUsed: fallbackResult.tokensUsed,
      costCents: fallbackResult.costCents,
      latencyMs: fallbackResult.latencyMs,
      cached: fallbackResult.cached,
    };
  }

  // STEP 2: Parse TEXT into structured format using OpenAI
  // Note: OpenAI requires object schema, not array, so we wrap in an object
  let news: CompanyNews[];
  try {
    const WrapperSchema = z.object({
      news: CompanyNewsCollectionSchema
    });

    const parsed = await llmProvider.generateStructured(
      WrapperSchema,
      'job_parsing',
      `Parse the following company news research into structured format. Extract up to 4 news articles.

Research content:
${groundedResult.content}

Important:
- title: Full article headline
- url: Must be valid URL with https:// protocol
- summary: 2-3 sentence summary of key points
- date_published: Extract if mentioned, format as YYYY-MM-DD or "Month YYYY"
- relevance_score: 0-1 score indicating importance to the role (0.8+ for highly relevant)
- sentiment: "positive", "neutral", or "negative"
- source: Publisher name (e.g., "TechCrunch", "Bloomberg")`,
      { forceProvider: 'openai' }
    );

    news = parsed.news.slice(0, 4); // Ensure max 4
    console.log(`✅ [discoverCompanyNews] Parsed ${news.length} news articles`);

  } catch (error) {
    console.error('❌ [discoverCompanyNews] Structured parsing failed:', error.message);
    throw new Error(`Failed to parse company news data: ${error.message}`);
  }

  return {
    news,
    searchQuery,
    groundingMetadata: groundedResult.groundingMetadata,
    fallbackUsed,
  };
}

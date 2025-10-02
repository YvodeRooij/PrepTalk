// Discovery and Validation Nodes for LangGraph
// Pure functions that operate on state, no classes

import { Command } from '@langchain/langgraph';
import { CurriculumState } from '../state';
import { z } from 'zod';
import { DiscoveryCacheService } from './discovery-cache';
import { discoverWithCache } from './discovery-orchestrator';

type DiscoveredSource = CurriculumState['discoveredSources'][number];
type SourceWithData = DiscoveredSource & { data: unknown };
type DynamicSourceLLMResponse = {
  url: string;
  sourceType: DiscoveredSource['sourceType'];
  trustScore: number;
};

// No longer using direct Gemini instantiation - using LLM provider service

// Configuration constants
const MAX_DYNAMIC_SOURCES = 5;
const CORE_SITES = ['linkedin', 'glassdoor', 'official'];
const MIN_CONFIDENCE = 0.6;

/**
 * Node: Classify user input and discover sources
 * Determines if input is URL or text, finds relevant sources
 * 🆕 CONDITIONAL: Skips research entirely in cv_round_only mode
 */
export async function discoverSources(
  state: CurriculumState,
  config?: { llmProvider?: any; supabase?: any }
): Promise<Partial<CurriculumState> | Command> {

  // 🆕 CV ROUND MODE: Skip research, jump to unified context engine
  if (state.mode === 'cv_round_only') {
    console.log('⚡ [CV Round Mode] Skipping source discovery - using minimal fallback data');

    return new Command({
      update: {
        warnings: [
          ...(state.warnings || []),
          'CV Round mode: Skipped company/job research for fast generation'
        ],
        inputType: 'description' as const,
        // Minimal fallback data for CV-focused round
        companyContext: {
          name: 'Target Company',
          values: [],
          recent_news: [],
          interview_process: {
            typical_rounds: 1,
            common_interviewers: [],
            red_flags: [],
            green_flags: [],
          },
          confidence_score: 0.3,
        },
        jobData: {
          title: 'Target Role',
          level: 'mid',
          department: 'General',
          location: 'Remote',
          description: 'CV walkthrough focused interview round',
          requirements: ['Review CV thoroughly', 'Strong communication skills'],
          responsibilities: ['Discuss experience and background', 'Walk through career history'],
          confidence_score: 0.3,
        },
        rolePatterns: {
          typical_rounds: 1,
          expected_depth: 'overview',
          focus_areas: ['CV Review', 'Background Discussion', 'Career Motivation'],
        },
        competitiveIntelligence: {
          primaryCompetitors: ['Industry leaders'],
          roleComparison: 'Standard industry position',
          strategicAdvantages: ['Company culture', 'Growth opportunities'],
          recentDevelopments: ['Continued market presence'],
          competitivePositioning: 'Established market player',
        },
      },
      goto: 'unified_context_engine'  // Skip research nodes
    });
  }

  // 🔄 FULL MODE: Normal research flow (unchanged)
  console.log('🔍 [Full Mode] Discovering sources for:', state.userInput);

  // Classify input type
  const inputType = state.userInput.startsWith('http') ? 'url' : 'description';

  if (inputType === 'url') {
    // Direct URL - use it as primary source
    return {
      inputType: 'url',
      discoveredSources: [{
        url: state.userInput,
        sourceType: 'official',
        trustScore: 0.95,
        priority: 'core',
      }],
    };
  }

  // Extract entities from text description
  const entities = await extractEntities(state.userInput, config?.llmProvider);

  if (!entities.company) {
    return {
      inputType: 'description',
      errors: ['Could not identify company from input'],
    };
  }

  // 🆕 INTELLIGENT DISCOVERY: Use cache-aware discovery with grounding
  if (config?.supabase && config?.llmProvider) {
    const cacheService = new DiscoveryCacheService(config.supabase);

    try {
      console.log(`🔍 [Intelligent Discovery] Starting for ${entities.company} + ${entities.role || 'general'}`);

      const discovery = await discoverWithCache(
        entities.company,
        entities.role || 'general',
        config.llmProvider,
        cacheService
      );

      console.log(`✅ [Intelligent Discovery] Complete:
        - Cache hit: ${discovery.cacheHit}
        - Competitors: ${discovery.competitors.length}
        - Experiences: ${discovery.experiences.length}
        - News: ${discovery.news.length}
        - Latency: ${discovery.latencyMs}ms`);

      // Return enriched state with intelligent discovery data
      return {
        inputType: 'description',
        companyContext: {
          name: entities.company,
          values: [],
          recent_news: discovery.news.map(n => ({
            title: n.title,
            url: n.url,
            date: n.date_published || new Date().toISOString(),
            summary: n.summary || n.title
          })),
          confidence_score: discovery.cacheHit ? 0.9 : 0.7,
          culture_notes: `Industry: ${discovery.competitors[0]?.industry || 'Technology'}`
        },
        competitiveIntelligence: {
          primaryCompetitors: discovery.competitors.map(c => c.name),
          differentiators: discovery.competitors.flatMap(c => c.differentiators || []),
          marketContext: `${entities.company} competes with ${discovery.competitors.map(c => c.name).join(', ')} in the ${discovery.competitors[0]?.industry || 'technology'} sector.`,
          roleComparison: `Role comparison for ${entities.role || 'this position'}`,
          strategicAdvantages: discovery.competitors.flatMap(c => c.differentiators || []).slice(0, 3),
          recentDevelopments: discovery.news.slice(0, 3).map(n => n.title),
          competitivePositioning: `${entities.company} is positioned as a key player in the ${discovery.competitors[0]?.industry || 'technology'} market`
        },
        interviewExperiences: discovery.experiences,
        companyNews: discovery.news,
        discoveryMetadata: {
          cacheHit: discovery.cacheHit,
          latencyMs: discovery.latencyMs,
          searchQueries: discovery.searchQueries,
          groundingMetadata: discovery.groundingMetadata,
          competitors: discovery.competitors // 🔗 Store full competitor objects with URLs
        }
      };
    } catch (error) {
      console.error('❌ [Intelligent Discovery] Failed:', error);
      console.warn('⚠️ Falling back to traditional source discovery');
      // Continue to existing fallback logic
    }
  }

  // FALLBACK: Traditional source discovery (when supabase not available or intelligent discovery fails)
  console.log('🔄 [Fallback Discovery] Using traditional source-based approach');

  // Build core sources
  const coreSources = buildCoreSourceURLs(entities.company, entities.role);

  // Discover dynamic sources
  const dynamicSources = await discoverDynamicSources(
    entities.company,
    entities.role || '',
    MAX_DYNAMIC_SOURCES,
    config?.llmProvider
  );

  return {
    inputType: inputType as 'description',
    discoveredSources: [...coreSources, ...dynamicSources],
  };
}

/**
 * Node: Fetch data from discovered sources
 * TWO-STEP APPROACH:
 *   1. Use url_context grounding to fetch URLs (TEXT with citations)
 *   2. Use structured output to parse text into clean JSON
 * 🆕 SAFETY: Should never reach here in cv_round_only mode
 */
export async function fetchSourceData(
  state: CurriculumState,
  config?: { llmProvider?: any }
): Promise<Partial<CurriculumState>> {

  // 🆕 SAFETY: Should never reach here in CV mode (but handle gracefully)
  if (state.mode === 'cv_round_only') {
    console.warn('⚠️ [CV Round Mode] fetchSourceData called unexpectedly - skipping');
    return {};
  }

  if (!config?.llmProvider) {
    throw new Error('LLM provider is required for fetchSourceData');
  }

  // Separate core and dynamic
  const coreSources = state.discoveredSources.filter(s => s.priority === 'core');
  const dynamicSources = state.discoveredSources.filter(s => s.priority === 'dynamic');

  // Respect limits: all core + up to 5 dynamic
  const sourcesToFetch = [...coreSources, ...dynamicSources.slice(0, 5)];

  console.log(`📥 Fetching ${sourcesToFetch.length} sources using TWO-STEP grounding...`);

  // STEP 1: Use url_context to fetch URLs and get TEXT with citations
  let groundedResult;
  try {
    groundedResult = await config.llmProvider.generateWithUrlContext(
      'company_research',
      `Analyze these job board and company pages comprehensively. For each source, extract:

       - Company name, industry, and size
       - Company culture, values, and work environment
       - Interview process, typical rounds, and difficulty level
       - Team structure and reporting relationships
       - Required skills, qualifications, and experience
       - Compensation ranges if mentioned
       - Employee reviews, ratings, and common feedback
       - Work-life balance and benefits

       Provide a detailed summary for each source with specific examples and quotes where possible.`,
      sourcesToFetch.map(s => s.url).slice(0, 20),  // Batch up to 20 URLs
      { format: 'text' }  // TEXT format for grounding
    );

    console.log(`✅ Step 1: Fetched ${groundedResult.content.length} chars from ${sourcesToFetch.length} URLs`);
    if (groundedResult.groundingMetadata?.groundingChunks) {
      console.log(`📊 Grounding chunks: ${groundedResult.groundingMetadata.groundingChunks.length} citations`);
    }

  } catch (error) {
    console.error('❌ URL grounding failed:', error.message);

    // Fallback already handled in LLMProviderService (Cheerio)
    // If we get here, return sources with failure status
    return {
      warnings: [
        ...(state.warnings || []),
        'URL fetching failed - using minimal fallback data'
      ],
      discoveredSources: sourcesToFetch.map(s => ({
        ...s,
        data: null
      }))
    };
  }

  // STEP 2: Parse TEXT into structured JSON using LangChain
  // Note: Using nullable() for OpenAI compatibility (requires optional fields to be nullable)
  const SourceDataSchema = z.object({
    sources: z.array(z.object({
      url: z.string(),
      company: z.string().nullable().optional(),
      title: z.string().nullable().optional(),
      location: z.string().nullable().optional(),
      requirements: z.array(z.string()).nullable().optional(),
      responsibilities: z.array(z.string()).nullable().optional(),
      culture: z.array(z.string()).nullable().optional(),
      interview_process: z.object({
        rounds: z.number().nullable().optional(),
        difficulty: z.string().nullable().optional(),
        typical_questions: z.array(z.string()).nullable().optional()
      }).nullable().optional(),
      salary_range: z.object({
        min: z.number().nullable().optional(),
        max: z.number().nullable().optional(),
        currency: z.string().nullable().optional()
      }).nullable().optional(),
      employee_reviews: z.object({
        rating: z.number().nullable().optional(),
        pros: z.array(z.string()).nullable().optional(),
        cons: z.array(z.string()).nullable().optional()
      }).nullable().optional()
    }))
  });

  let parsedData;
  try {
    // IMPORTANT: Force OpenAI for Step 2 structured parsing
    // Gemini can't handle complex schemas with .nullable().optional() fields
    parsedData = await config.llmProvider.generateStructured(
      SourceDataSchema,
      'job_parsing',
      `Parse this comprehensive job research into structured format. Maintain accuracy and extract all relevant details:\n\n${groundedResult.content}`,
      { forceProvider: 'openai' }
    );

    console.log(`✅ Step 2: Parsed ${parsedData.sources.length} structured sources from ${sourcesToFetch.length} URLs`);

  } catch (error) {
    console.error('❌ Structured parsing failed:', error.message);
    throw new Error(`Failed to parse grounded data into structured format: ${error.message}`);
  }

  // Merge parsed data back into sources
  const updatedSources = sourcesToFetch.map((source, i) => {
    const sourceData = parsedData.sources[i] || null;
    if (sourceData) {
      console.log(`📄 Parsed data for ${source.url}:`, JSON.stringify({
        company: sourceData.company,
        title: sourceData.title,
        reqCount: sourceData.requirements?.length || 0,
        respCount: sourceData.responsibilities?.length || 0,
        location: sourceData.location
      }));
    }
    return {
      ...source,
      data: sourceData
    };
  });

  return {
    discoveredSources: updatedSources
  };
}

/**
 * Node: Validate fetched data using programmatic rules
 * Determines if each source has useful data
 * 🆕 IMPROVED: Replaced subjective LLM validation with deterministic rules
 */
export async function validateSources(
  state: CurriculumState,
  config: { llmProvider?: any }
): Promise<Command> {
  console.log(`🔍 Validating ${state.discoveredSources.length} sources using programmatic rules...`);

  const usefulSources: DiscoveredSource[] = [];
  const rejectedSources: DiscoveredSource[] = [];

  // Validate each source with data using programmatic validation
  for (const source of state.discoveredSources) {
    if (source.data === null) {
      console.log(`⚠️  Source skipped: ${source.url} (no data fetched)`);
      rejectedSources.push(source);
      continue;
    }

    // Programmatic validation (no LLM needed!)
    const isUseful = validateSource(source.data);

    if (!isUseful) {
      console.log(`❌ Source rejected: ${source.url} (insufficient data)`);
      rejectedSources.push(source);
      continue;
    }

    console.log(`✅ Source accepted: ${source.url} (${source.sourceType})`);
    usefulSources.push(source);
  }

  console.log(`📊 Validation results: ${usefulSources.length} useful, ${rejectedSources.length} rejected`);

  if (usefulSources.length === 0) {
    // No useful data - need to try alternative approach
    return new Command({
      update: {
        discoveredSources: state.discoveredSources,
        warnings: [
          ...(state.warnings || []),
          'No useful sources found, using minimal context'
        ],
      },
      goto: 'fallback_research',  // Go to fallback
    });
  }

  // Have useful data - continue to merge
  return new Command({
    update: {
      discoveredSources: state.discoveredSources,
    },
    goto: 'merge_research',  // Continue normal flow
  });
}

/**
 * Node: Merge validated sources into company context
 * Cross-validates and builds consensus
 * 🆕 IMPROVED: Uses programmatic validation (no more validation.isUseful property)
 */
export async function mergeResearch(
  state: CurriculumState,
  config?: { llmProvider?: any }
): Promise<Partial<CurriculumState>> {
  if (!config?.llmProvider) {
    throw new Error('LLM provider is required for mergeResearch');
  }

  // Get only useful sources using programmatic validation
  const usefulSources = state.discoveredSources.filter(
    s => s.data && validateSource(s.data)
  );

  console.log(`🔄 Merging ${usefulSources.length} useful sources...`);

  const result = await config.llmProvider.generateContent(
    'company_research',
    `Merge and cross-validate this company research from multiple sources:

      ${usefulSources.map((s, i) => `
        Source ${i + 1} - ${s.sourceType} (trust: ${s.trustScore}):
        ${JSON.stringify(s.data)}
      `).join('\n\n')}

      Return consensus as CompanyContext JSON:
      - name: company name
      - values: array of values/culture
      - interview_process: { typical_rounds, difficulty, style }
      - confidence_score: overall confidence 0-1`,
    { format: 'json' }
  );

  let companyContext;
  try {
    companyContext = JSON.parse(result.content);
  } catch (error) {
    console.warn('Failed to parse company context JSON, using fallback:', error.message);
    console.warn('Raw content:', result.content);
    // Fallback to basic structure if JSON parsing fails
    companyContext = {
      name: 'Unknown Company',
      values: ['Innovation', 'Excellence', 'Trust'],
      industry: 'Technology',
      size: 'Large',
      headquarters: 'Unknown'
    };
  }

  return {
    companyContext: {
      ...companyContext,
      recent_news: [],  // Would need news API
    },
  };
}

// Helper functions (pure, no state)

/**
 * Validates if source data is useful for interview preparation.
 *
 * Data is considered useful if it contains ANY of:
 * - Company name
 * - Job title
 * - At least 3 requirements
 * - At least 1 responsibility
 * - Location information
 *
 * This replaces the previous vague LLM validation that incorrectly rejected
 * high-quality data due to missing optional fields like interview_process.
 *
 * @param data - Parsed source data
 * @returns true if data is useful, false if completely empty/useless
 */
export function validateSource(data: any): boolean {
  if (!data) return false;

  const hasCompany = !!data.company && data.company.trim().length > 0;
  const hasTitle = !!data.title && data.title.trim().length > 0;
  const hasRequirements = Array.isArray(data.requirements) && data.requirements.length >= 3;
  const hasResponsibilities = Array.isArray(data.responsibilities) && data.responsibilities.length >= 1;
  const hasLocation = !!data.location && data.location.trim().length > 0;

  // Accept if ANY of the key criteria are met
  return hasCompany || hasTitle || hasRequirements || hasResponsibilities || hasLocation;
}

async function extractEntities(text: string, llmProvider?: any) {
  if (!llmProvider) {
    throw new Error('LLM provider is required for extractEntities');
  }

  const result = await llmProvider.generateContent(
    'job_parsing',
    `Extract company and role from: "${text}"

      Return JSON:
      - company: company name or null
      - role: job title or null
      - confidence: 0-1`,
    { format: 'json' }
  );

  return JSON.parse(result.content);
}

function buildCoreSourceURLs(company: string, role?: string) {
  const normalized = company.toLowerCase().replace(/[^a-z0-9]+/g, '-');

  return [
    {
      url: `https://www.linkedin.com/company/${normalized}`,
      sourceType: 'linkedin' as const,
      trustScore: 0.85,
      priority: 'core' as const,
    },
    {
      url: `https://www.glassdoor.com/Reviews/${normalized}-Reviews`,
      sourceType: 'glassdoor' as const,
      trustScore: 0.8,
      priority: 'core' as const,
    },
    {
      url: `https://careers.${normalized}.com`,
      sourceType: 'official' as const,
      trustScore: 0.95,
      priority: 'core' as const,
    },
  ];
}

async function discoverDynamicSources(company: string, role: string, limit: number, llmProvider?: any) {
  if (!llmProvider) {
    console.warn('⚠️  No LLM provider available for dynamic source discovery - returning empty array');
    return [];
  }

  try {
    const result = await llmProvider.generateContent(
      'company_research',
      `Find ${limit} job board URLs for ${company} ${role}.

      Return JSON array:
      [{
        url: "actual URL",
        sourceType: "aggregator" or "other",
        trustScore: 0-1
      }]`,
      { format: 'json' }
    );

    const sources = JSON.parse(result.content) as DynamicSourceLLMResponse[];

    // Validate that sources is an array
    if (!Array.isArray(sources)) {
      console.warn('⚠️  Dynamic source discovery returned non-array result - returning empty array');
      return [];
    }

    return sources.map((source) => ({
      ...source,
      priority: 'dynamic' as const,
    }));
  } catch (error) {
    console.error('⚠️  Dynamic source discovery failed:', error.message);
    return [];
  }
}
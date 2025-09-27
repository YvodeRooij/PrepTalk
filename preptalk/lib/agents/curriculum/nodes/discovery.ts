// Discovery and Validation Nodes for LangGraph
// Pure functions that operate on state, no classes

import { Command } from '@langchain/langgraph';
import { CurriculumState } from '../state';

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
 */
export async function discoverSources(
  state: CurriculumState,
  config?: { llmProvider?: any }
): Promise<Partial<CurriculumState>> {
  console.log('🔍 Discovering sources for:', state.userInput);

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
 * Uses LLM provider to fetch all sources in parallel
 */
export async function fetchSourceData(
  state: CurriculumState,
  config?: { llmProvider?: any }
): Promise<Partial<CurriculumState>> {
  if (!config?.llmProvider) {
    throw new Error('LLM provider is required for fetchSourceData');
  }

  // Separate core and dynamic
  const coreSources = state.discoveredSources.filter(s => s.priority === 'core');
  const dynamicSources = state.discoveredSources.filter(s => s.priority === 'dynamic');

  // Respect limits: all core + up to 5 dynamic
  const sourcesToFetch = [...coreSources, ...dynamicSources.slice(0, 5)];

  console.log(`📥 Fetching ${sourcesToFetch.length} sources...`);

  // Parallel fetch using Promise.allSettled
  const fetchPromises: Promise<SourceWithData>[] = sourcesToFetch.map(async (source) => {
    try {
      const result = await config.llmProvider.generateContent(
        'company_research',
        `Extract job and company information from this ${source.sourceType} page: ${source.url}

          Focus on:
          - Company culture and values
          - Interview process and difficulty
          - Team structure
          - Required skills
          - Work environment

          Return as JSON.`,
        { format: 'json' }
      );

      const data = JSON.parse(result.content);
      return { ...source, data };

    } catch (error) {
      console.warn(`Failed to fetch ${source.url}`);
      return { ...source, data: null };
    }
  });

  const results = await Promise.allSettled(fetchPromises);

  // Update sources with fetched data
  const updatedSources = results
    .filter((result): result is PromiseFulfilledResult<SourceWithData> => result.status === 'fulfilled')
    .map(result => result.value);

  return {
    discoveredSources: updatedSources,
  };
}

/**
 * Node: Validate fetched data using LLM judge
 * Determines if each source has useful data
 */
export async function validateSources(
  state: CurriculumState,
  config: { llmProvider?: any }
): Promise<Command> {
  if (!config.llmProvider) {
    throw new Error('LLM provider is required for validateSources');
  }

  // Validate each source with data using the provider service
  const validationPromises = state.discoveredSources
    .filter(s => s.data !== null)
    .map(async (source) => {
      const result = await config.llmProvider.generateContent(
        'job_parsing', // Use job_parsing task for validation
        `Judge if this data is useful for interview preparation:

        Source: ${source.sourceType} (${source.url})
        Data: ${JSON.stringify(source.data)}

        Return JSON:
        - isUseful: boolean
        - confidence: 0-1
        - recommendation: "use" | "supplement" | "discard"`,
        { format: 'json' }
      );

      try {
        const validation = JSON.parse(result.content);
        return { ...source, validation };
      } catch (error) {
        console.warn('Failed to parse LLM validation response:', error);
        return { ...source, validation: { isUseful: false, confidence: 0 } };
      }
    });

  const validatedSources = await Promise.all(validationPromises);

  // Check if we have enough quality data
  const usefulSources = validatedSources.filter(s => s.validation?.isUseful);

  if (usefulSources.length === 0) {
    // No useful data - need to try alternative approach
    return new Command({
      update: {
        discoveredSources: validatedSources,
        warnings: ['No useful sources found, using minimal context'],
      },
      goto: 'fallback_research',  // Go to fallback
    });
  }

  // Have useful data - continue to merge
  return new Command({
    update: {
      discoveredSources: validatedSources,
    },
    goto: 'merge_research',  // Continue normal flow
  });
}

/**
 * Node: Merge validated sources into company context
 * Cross-validates and builds consensus
 */
export async function mergeResearch(
  state: CurriculumState,
  config?: { llmProvider?: any }
): Promise<Partial<CurriculumState>> {
  if (!config?.llmProvider) {
    throw new Error('LLM provider is required for mergeResearch');
  }

  // Get only useful sources
  const usefulSources = state.discoveredSources.filter(
    s => s.validation?.isUseful && s.data
  );

  const result = await config.llmProvider.generateContent(
    'company_research',
    `Merge and cross-validate this company research from multiple sources:

      ${usefulSources.map(s => `
        ${s.sourceType} (confidence: ${s.validation?.confidence}):
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
    throw new Error('LLM provider is required for discoverDynamicSources');
  }

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
  return sources.map((source) => ({
    ...source,
    priority: 'dynamic' as const,
  }));
}
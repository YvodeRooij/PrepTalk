// Centralized Configuration for Curriculum Agent
// All model configurations and feature flags in one place

export interface ModelConfig {
  parsing: {
    model: string;
    temperature: number;
    maxTokens?: number;
  };
  research: {
    model: string;
    temperature: number;
    maxTokens?: number;
  };
  generation: {
    model: string;
    temperature: number;
    maxTokens?: number;
  };
  evaluation: {
    model: string;
    temperature: number;
    maxTokens?: number;
  };
}

export interface AgentConfiguration {
  models: ModelConfig;
  retries: {
    maxAttempts: number;
    initialDelayMs: number;
    maxDelayMs: number;
    backoffMultiplier: number;
  };
  quality: {
    minAcceptableScore: number;
    maxRefinementLoops: number;
    targetConfidenceLevel: number;
  };
  timeouts: {
    parsingMs: number;
    researchMs: number;
    generationMs: number;
    evaluationMs: number;
    totalMs: number;
  };
  features: {
    enableCompanyResearch: boolean;
    enablePatternDetection: boolean;
    enableQualityRefinement: boolean;
    enablePreparationGuide: boolean;
    enableUrlContext: boolean;
    enableParallelGeneration: boolean;
  };
}

// Load configuration from environment variables with defaults
export function loadConfig(): AgentConfiguration {
  return {
    models: {
      parsing: {
        model: process.env.CURRICULUM_PARSING_MODEL || 'gemini-2.5',
        temperature: parseFloat(process.env.CURRICULUM_PARSING_TEMP || '0.1'),
        maxTokens: process.env.CURRICULUM_PARSING_MAX_TOKENS
          ? parseInt(process.env.CURRICULUM_PARSING_MAX_TOKENS)
          : undefined,
      },
      research: {
        model: process.env.CURRICULUM_RESEARCH_MODEL || 'gemini-2.5',
        temperature: parseFloat(process.env.CURRICULUM_RESEARCH_TEMP || '0.3'),
        maxTokens: process.env.CURRICULUM_RESEARCH_MAX_TOKENS
          ? parseInt(process.env.CURRICULUM_RESEARCH_MAX_TOKENS)
          : undefined,
      },
      generation: {
        model: process.env.CURRICULUM_GENERATION_MODEL || 'gemini-2.5',
        temperature: parseFloat(process.env.CURRICULUM_GENERATION_TEMP || '0.7'),
        maxTokens: process.env.CURRICULUM_GENERATION_MAX_TOKENS
          ? parseInt(process.env.CURRICULUM_GENERATION_MAX_TOKENS)
          : undefined,
      },
      evaluation: {
        model: process.env.CURRICULUM_EVALUATION_MODEL || 'gemini-2.5',
        temperature: parseFloat(process.env.CURRICULUM_EVALUATION_TEMP || '0.2'),
        maxTokens: process.env.CURRICULUM_EVALUATION_MAX_TOKENS
          ? parseInt(process.env.CURRICULUM_EVALUATION_MAX_TOKENS)
          : undefined,
      },
    },
    retries: {
      maxAttempts: parseInt(process.env.CURRICULUM_MAX_RETRIES || '3'),
      initialDelayMs: parseInt(process.env.CURRICULUM_RETRY_DELAY_MS || '1000'),
      maxDelayMs: parseInt(process.env.CURRICULUM_MAX_RETRY_DELAY_MS || '10000'),
      backoffMultiplier: parseFloat(process.env.CURRICULUM_BACKOFF_MULTIPLIER || '2'),
    },
    quality: {
      minAcceptableScore: parseFloat(process.env.CURRICULUM_MIN_QUALITY_SCORE || '0.7'),
      maxRefinementLoops: parseInt(process.env.CURRICULUM_MAX_REFINEMENT_LOOPS || '5'),
      targetConfidenceLevel: parseFloat(process.env.CURRICULUM_TARGET_CONFIDENCE || '0.85'),
    },
    timeouts: {
      parsingMs: parseInt(process.env.CURRICULUM_PARSING_TIMEOUT_MS || '30000'),
      researchMs: parseInt(process.env.CURRICULUM_RESEARCH_TIMEOUT_MS || '45000'),
      generationMs: parseInt(process.env.CURRICULUM_GENERATION_TIMEOUT_MS || '60000'),
      evaluationMs: parseInt(process.env.CURRICULUM_EVALUATION_TIMEOUT_MS || '30000'),
      totalMs: parseInt(process.env.CURRICULUM_TOTAL_TIMEOUT_MS || '180000'),
    },
    features: {
      enableCompanyResearch: process.env.CURRICULUM_ENABLE_COMPANY_RESEARCH === 'true',
      enablePatternDetection: process.env.CURRICULUM_ENABLE_PATTERN_DETECTION === 'true',
      enableQualityRefinement: process.env.CURRICULUM_ENABLE_QUALITY_REFINEMENT !== 'false', // Default true
      enablePreparationGuide: process.env.CURRICULUM_ENABLE_PREP_GUIDE === 'true',
      enableUrlContext: process.env.CURRICULUM_ENABLE_URL_CONTEXT !== 'false', // Default true
      enableParallelGeneration: process.env.CURRICULUM_ENABLE_PARALLEL_GEN === 'true',
    },
  };
}

// Model presets for different use cases
export const MODEL_PRESETS = {
  fast: {
    parsing: 'gemini-2.5',
    research: 'gemini-2.5',
    generation: 'gemini-2.5',
    evaluation: 'gemini-2.5',
  },
  balanced: {
    parsing: 'gemini-2.5',
    research: 'gemini-2.5',
    generation: 'gemini-2.5',
    evaluation: 'gemini-2.5',
  },
  quality: {
    parsing: 'gemini-2.5',
    research: 'gemini-2.5',
    generation: 'gemini-2.5',
    evaluation: 'gemini-2.5',
  },
};

// Singleton instance
let configInstance: AgentConfiguration | null = null;

export function getConfig(): AgentConfiguration {
  if (!configInstance) {
    configInstance = loadConfig();
  }
  return configInstance;
}

// Allow runtime config updates (useful for testing)
export function updateConfig(updates: Partial<AgentConfiguration>): void {
  configInstance = {
    ...getConfig(),
    ...updates,
  };
}

// Export specific configs for easier access
export const getModelConfig = () => getConfig().models;
export const getRetryConfig = () => getConfig().retries;
export const getQualityConfig = () => getConfig().quality;
export const getTimeoutConfig = () => getConfig().timeouts;
export const getFeatureFlags = () => getConfig().features;
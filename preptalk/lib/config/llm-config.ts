// Multi-Provider LLM Configuration System
// Supports Gemini, OpenAI, Anthropic, Grok with flexible task-specific model selection

export interface ModelConfig {
  provider: 'gemini' | 'gemini-pro' | 'openai' | 'anthropic' | 'grok' | 'mistral';
  model: string;
  temperature: number;
  maxTokens: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
}

export interface LLMConfig {
  // Provider Selection
  primaryProvider: 'gemini' | 'gemini-pro' | 'openai' | 'anthropic' | 'grok' | 'mistral';
  fallbackProviders: Array<'gemini' | 'gemini-pro' | 'openai' | 'anthropic' | 'grok' | 'mistral'>;

  // Task-Specific Models for curriculum generation
  models: {
    job_parsing: ModelConfig;
    company_research: ModelConfig;
    persona_generation: ModelConfig;
    question_generation: ModelConfig;
    candidate_prep: ModelConfig;
    quality_evaluation: ModelConfig;
    unified_context_engine: ModelConfig;
    reverse_interview_questions: ModelConfig;
    ci_categorization_ab_test: ModelConfig;
  };

  // Mistral OCR specific configuration
  mistralOCR?: {
    enabled: boolean;
    model: 'mistral-ocr-2505' | 'pixtral-large-2411' | 'pixtral-12b';
    maxPagesPerRequest: number;
    costPerPage: number;
  };

  rateLimits: Record<string, {
    requestsPerMinute: number;
    tokensPerMinute: number;
    maxConcurrent: number;
  }>;

  // Retry & Fallback Strategy
  maxRetries: number;
  retryDelayMs: number;
  enableFallback: boolean;
  fallbackOnError: boolean;
  fallbackOnTimeout: boolean;

  // Cost & Usage Tracking
  costTracking: boolean;
  usageAnalytics: boolean;
  budgetLimits?: {
    dailyBudgetCents: number;
    monthlyBudgetCents: number;
  };

  // Performance Optimization
  caching: {
    enabled: boolean;
    ttlMinutes: number;
    maxSize: number;
  };

  // Environment & Feature Flags
  environment: 'development' | 'staging' | 'production';
  features: {
    enableStreaming: boolean;
    enableFunctionCalling: boolean;
    enableVision: boolean;
  };
}

// Default configuration optimized for curriculum generation
export const DEFAULT_LLM_CONFIG: LLMConfig = {
  primaryProvider: 'gemini',
  fallbackProviders: ['gemini-pro', 'openai'], // Flash → Pro → OpenAI (cost-optimized with stability)

  models: {
    // Job parsing: Use OpenAI for reliability
    job_parsing: {
      provider: 'openai',
      model: 'gpt-4.1-mini',
      temperature: 0.1,
      maxTokens: 2000
    },

    // Company research: Use OpenAI for reliability
    company_research: {
      provider: 'openai',
      model: 'gpt-4.1-mini',
      temperature: 0.3,
      maxTokens: 4000
    },

    // Persona generation: High creativity for realistic characters
    persona_generation: {
      provider: 'openai',
      model: 'gpt-4.1-mini',
      temperature: 0.7,
      maxTokens: 3000
    },

    // Question generation: Moderate creativity for varied questions
    question_generation: {
      provider: 'openai',
      model: 'gpt-4.1-mini',
      temperature: 0.6,
      maxTokens: 2500
    },

    // Candidate prep: High creativity for engaging examples
    candidate_prep: {
      provider: 'openai',
      model: 'gpt-4.1-mini',
      temperature: 0.8,
      maxTokens: 3500
    },

    // Quality evaluation: Low creativity for consistent scoring
    quality_evaluation: {
      provider: 'openai',
      model: 'gpt-4.1-mini',
      temperature: 0.2,
      maxTokens: 1500
    },

    // Unified context engine: Critical synthesis of all inputs - needs best model
    unified_context_engine: {
      provider: 'anthropic',
      model: 'claude-sonnet-4-5-20250929', // Claude Sonnet 4.5 for superior reasoning and complex agent workflows
      temperature: 0.4,
      maxTokens: 8192, // Large context for synthesizing job + user + CV data
      timeout: 60000 // Quality > Speed - 60 second timeout
    },

    // Reverse interview questions: CI-powered questions candidate asks interviewer
    reverse_interview_questions: {
      provider: 'openai',
      model: 'gpt-4.1-mini',
      temperature: 0.6,
      maxTokens: 2500
    },

    // CI categorization A/B test: Evaluation task for differentiation testing
    ci_categorization_ab_test: {
      provider: 'anthropic',
      model: 'claude-sonnet-4-5-20250929',
      temperature: 0, // Zero temperature for consistent evaluation
      maxTokens: 4096
    }
  },

  // Mistral OCR configuration for CV analysis
  mistralOCR: {
    enabled: true,
    model: 'mistral-ocr-latest',
    maxPagesPerRequest: 10,
    costPerPage: 0.001
  },

  rateLimits: {
    'gemini': {
      requestsPerMinute: 60,
      tokensPerMinute: 50000,
      maxConcurrent: 10
    },
    'openai': {
      requestsPerMinute: 50,
      tokensPerMinute: 40000,
      maxConcurrent: 8
    },
    'anthropic': {
      requestsPerMinute: 40,
      tokensPerMinute: 35000,
      maxConcurrent: 6
    },
    'grok': {
      requestsPerMinute: 30,
      tokensPerMinute: 30000,
      maxConcurrent: 5
    }
  },

  maxRetries: 3,
  retryDelayMs: 1000,
  enableFallback: true,
  fallbackOnError: true,
  fallbackOnTimeout: true,

  costTracking: true,
  usageAnalytics: true,
  budgetLimits: {
    dailyBudgetCents: 500, // $5/day
    monthlyBudgetCents: 10000 // $100/month
  },

  caching: {
    enabled: true,
    ttlMinutes: 60, // Cache results for 1 hour
    maxSize: 1000 // Max 1000 cached responses
  },

  environment: 'development',

  features: {
    enableStreaming: false, // Not needed for curriculum generation
    enableFunctionCalling: true, // Useful for structured generation
    enableVision: false // Not needed for text-only curriculum
  }
};

// Environment-specific configurations
export const PRODUCTION_LLM_CONFIG: Partial<LLMConfig> = {
  environment: 'production',
  maxRetries: 5,
  retryDelayMs: 2000,
  budgetLimits: {
    dailyBudgetCents: 2000, // $20/day in production
    monthlyBudgetCents: 50000 // $500/month in production
  },
  caching: {
    enabled: true,
    ttlMinutes: 120, // Longer cache in production
    maxSize: 5000
  }
};

export const DEVELOPMENT_LLM_CONFIG: Partial<LLMConfig> = {
  environment: 'development',
  maxRetries: 2,
  retryDelayMs: 500,
  costTracking: true, // Always track costs in development
  fallbackProviders: ['gemini'], // Only working providers in dev
  budgetLimits: {
    dailyBudgetCents: 100, // $1/day in development
    monthlyBudgetCents: 2000 // $20/month in development
  }
};

// Provider capability matrix for intelligent fallback selection
export const PROVIDER_CAPABILITIES = {
  gemini: {
    strengths: ['fast', 'cost_effective', 'function_calling', 'large_context'],
    weaknesses: ['newer_model'],
    costPerToken: 0.00001, // Estimated cost per token
    averageLatency: 800 // ms
  },
  openai: {
    strengths: ['reliable', 'well_documented', 'function_calling', 'consistent'],
    weaknesses: ['expensive', 'rate_limited'],
    costPerToken: 0.00003,
    averageLatency: 1200
  },
  anthropic: {
    strengths: ['high_quality', 'safe', 'reasoning', 'long_context'],
    weaknesses: ['expensive', 'slower'],
    costPerToken: 0.00008,
    averageLatency: 2000
  },
  grok: {
    strengths: ['creative', 'uncensored', 'real_time_data'],
    weaknesses: ['less_reliable', 'newer', 'limited_availability'],
    costPerToken: 0.00002,
    averageLatency: 1500
  }
} as const;

// Task-specific provider recommendations - Gemini Flash → Pro → OpenAI (cost + stability)
export const TASK_PROVIDER_RECOMMENDATIONS = {
  job_parsing: ['gemini', 'gemini-pro', 'openai'], // Flash → Pro → OpenAI
  company_research: ['gemini', 'gemini-pro', 'openai'], // Flash → Pro → OpenAI (web scraping)
  persona_generation: ['gemini', 'gemini-pro', 'openai'], // Creative character creation
  question_generation: ['gemini', 'gemini-pro', 'openai'], // Balanced creativity and structure
  candidate_prep: ['gemini', 'gemini-pro', 'openai'], // Creative example generation
  quality_evaluation: ['gemini', 'gemini-pro', 'openai'], // Complex schema evaluation
  unified_context_engine: ['anthropic', 'gemini', 'gemini-pro', 'openai'] // Claude first, then Gemini Flash → Pro → OpenAI
} as const;

// Helper function to check if a provider has API key configured
function checkProviderAvailability(provider: LLMConfig['primaryProvider']): boolean {
  const envKeyMap: Record<LLMConfig['primaryProvider'], string> = {
    'gemini': 'GOOGLE_API_KEY',
    'gemini-pro': 'GOOGLE_API_KEY',
    'openai': 'OPENAI_API_KEY',
    'anthropic': 'ANTHROPIC_API_KEY',
    'grok': 'GROK_API_KEY',
    'mistral': 'MISTRAL_API_KEY'
  };

  const envKey = envKeyMap[provider];
  return envKey ? !!process.env[envKey] : false;
}

// Utility functions for config management
export function getOptimalProvider(
  task: keyof LLMConfig['models'],
  config: LLMConfig
): string {
  // STEP 1: Respect configured provider (OOTB principle)
  const taskModelConfig = config.models[task];
  const configuredProvider = taskModelConfig?.provider;

  // Build available providers list
  const availableProviders = [config.primaryProvider, ...config.fallbackProviders];

  // If task has a configured provider, check if it's available
  if (configuredProvider) {
    // Check if provider is in the standard availability list
    if (availableProviders.includes(configuredProvider)) {
      console.log(`✅ Using configured provider '${configuredProvider}' for task '${task}'`);
      return configuredProvider;
    }

    // OR check if provider has API key configured (even if not in fallback list)
    // This allows task-specific providers like Anthropic that aren't in primary/fallback
    const hasApiKey = checkProviderAvailability(configuredProvider);
    if (hasApiKey) {
      console.log(`✅ Using task-specific provider '${configuredProvider}' for task '${task}'`);
      return configuredProvider;
    }

    console.warn(`⚠️ Configured provider '${configuredProvider}' for task '${task}' is not available, falling back to recommendations`);
  }

  // STEP 2: Fallback to recommendations (existing logic)
  const recommendations = TASK_PROVIDER_RECOMMENDATIONS[task];

  // If we have recommendations for this task, use them
  if (recommendations) {
    // Find first recommended provider that's available
    for (const recommended of recommendations) {
      if (availableProviders.includes(recommended)) {
        console.log(`📋 Using recommended provider '${recommended}' for task '${task}'`);
        return recommended;
      }
    }
  }

  // STEP 3: Ultimate fallback
  console.warn(`⚠️ No recommended provider found for task '${task}', using primary: ${config.primaryProvider}`);
  return config.primaryProvider;
}

export function calculateEstimatedCost(
  provider: keyof typeof PROVIDER_CAPABILITIES,
  tokens: number
): number {
  return PROVIDER_CAPABILITIES[provider].costPerToken * tokens;
}

export function validateLLMConfig(config: LLMConfig): string[] {
  const errors: string[] = [];

  // Check that all providers in fallback list are different from primary
  if (config.fallbackProviders.includes(config.primaryProvider)) {
    errors.push('Primary provider should not be in fallback list');
  }

  // Check that required environment variables exist for configured providers
  const allProviders = [config.primaryProvider, ...config.fallbackProviders];
  const envKeyMap = {
    gemini: 'GOOGLE_AI_API_KEY',
    openai: 'OPENAI_API_KEY',
    anthropic: 'ANTHROPIC_API_KEY',
    grok: 'GROK_API_KEY'
  };

  for (const provider of allProviders) {
    const envKey = envKeyMap[provider];
    if (!process.env[envKey] && config.environment === 'production') {
      errors.push(`Missing environment variable: ${envKey} for provider: ${provider}`);
    }
  }

  // Validate temperature ranges
  for (const [task, modelConfig] of Object.entries(config.models)) {
    if (modelConfig.temperature < 0 || modelConfig.temperature > 2) {
      errors.push(`Invalid temperature for ${task}: ${modelConfig.temperature} (must be 0-2)`);
    }
  }

  return errors;
}
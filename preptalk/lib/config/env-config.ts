// Environment Configuration Loader
// Handles loading LLM configuration from environment variables and files

import { LLMConfig, DEFAULT_LLM_CONFIG, PRODUCTION_LLM_CONFIG, DEVELOPMENT_LLM_CONFIG } from './llm-config';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Load LLM configuration from environment or config file
 */
export function loadLLMConfig(): LLMConfig {
  // Determine environment
  const environment = process.env.NODE_ENV || 'development';

  // Start with base config
  let config = { ...DEFAULT_LLM_CONFIG };

  // Apply environment-specific overrides
  if (environment === 'production') {
    config = { ...config, ...PRODUCTION_LLM_CONFIG };
  } else {
    config = { ...config, ...DEVELOPMENT_LLM_CONFIG };
  }

  // Check for custom config file
  const configPath = process.env.LLM_CONFIG_PATH || path.join(process.cwd(), 'llm-config.json');

  if (fs.existsSync(configPath)) {
    try {
      const fileConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      config = { ...config, ...fileConfig };
      console.log(`📄 Loaded LLM config from: ${configPath}`);
    } catch (error) {
      console.warn(`⚠️  Failed to load config file ${configPath}:`, error);
    }
  }

  // Override with environment variables
  if (process.env.PRIMARY_LLM_PROVIDER) {
    config.primaryProvider = process.env.PRIMARY_LLM_PROVIDER as any;
  }

  if (process.env.FALLBACK_PROVIDERS) {
    config.fallbackProviders = process.env.FALLBACK_PROVIDERS.split(',') as any;
  }

  if (process.env.ENABLE_COST_TRACKING) {
    config.costTracking = process.env.ENABLE_COST_TRACKING === 'true';
  }

  if (process.env.LLM_BUDGET_DAILY_CENTS) {
    config.budgetLimits = {
      ...config.budgetLimits,
      dailyBudgetCents: parseInt(process.env.LLM_BUDGET_DAILY_CENTS)
    };
  }

  if (process.env.LLM_BUDGET_MONTHLY_CENTS) {
    config.budgetLimits = {
      ...config.budgetLimits,
      monthlyBudgetCents: parseInt(process.env.LLM_BUDGET_MONTHLY_CENTS)
    };
  }

  return config;
}

/**
 * Validate that all required API keys are present
 */
export function validateProviderCredentials(config: LLMConfig): void {
  const requiredKeys: Record<string, string> = {
    'gemini': 'GOOGLE_AI_API_KEY',
    'openai': 'OPENAI_API_KEY',
    'anthropic': 'ANTHROPIC_API_KEY',
    'grok': 'GROK_API_KEY'
  };

  const allProviders = [config.primaryProvider, ...config.fallbackProviders];
  const missingKeys: string[] = [];

  for (const provider of allProviders) {
    const envKey = requiredKeys[provider];
    if (!process.env[envKey]) {
      missingKeys.push(envKey);
    }
  }

  if (missingKeys.length > 0) {
    if (config.environment === 'production') {
      throw new Error(`Missing required environment variables: ${missingKeys.join(', ')}`);
    } else {
      console.warn(`⚠️  Missing environment variables for development: ${missingKeys.join(', ')}`);
      console.warn('⚠️  Some providers will not be available');
    }
  }
}

/**
 * Create a sample configuration file
 */
export function createSampleConfigFile(outputPath?: string): void {
  const sampleConfig = {
    primaryProvider: 'gemini',
    fallbackProviders: ['openai'],
    costTracking: true,
    budgetLimits: {
      dailyBudgetCents: 500,
      monthlyBudgetCents: 10000
    },
    models: {
      persona_generation: {
        provider: 'gemini',
        model: 'gemini-2.5-flash',
        temperature: 0.7,
        maxTokens: 3000
      }
    }
  };

  const configPath = outputPath || path.join(process.cwd(), 'llm-config.sample.json');
  fs.writeFileSync(configPath, JSON.stringify(sampleConfig, null, 2));

  console.log(`📄 Sample config created at: ${configPath}`);
  console.log('📝 Customize this file and rename to llm-config.json');
}
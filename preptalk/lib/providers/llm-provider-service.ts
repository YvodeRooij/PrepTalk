// LLM Provider Service - Multi-provider abstraction with intelligent fallback
// Supports Gemini, OpenAI, Anthropic with LangChain structured outputs
// Uses LangChain's withStructuredOutput internally for OOTB, battle-tested implementation

import { GoogleGenerativeAI } from '@google/generative-ai';
import { LLMConfig, ModelConfig, getOptimalProvider, calculateEstimatedCost } from '../config/llm-config';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

// LangChain imports for structured outputs
import { z } from 'zod';
import { ChatOpenAI } from '@langchain/openai';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { ChatAnthropic } from '@langchain/anthropic';

// Provider-specific model mappings
const PROVIDER_MODEL_MAP = {
  gemini: {
    // Map all tasks to appropriate Gemini models
    default: 'gemini-2.5-flash', // Fast for most tasks
    quality_evaluation: 'gemini-2.5-pro', // More thorough for evaluation
    company_research: 'gemini-2.5-pro', // Better for complex research
  },
  openai: {
    // Use the configured OpenAI model for all tasks
    default: 'gpt-4.1-mini',
  },
  anthropic: {
    // Single Claude model for all tasks - using Claude Sonnet 4 with correct model name
    default: 'claude-sonnet-4-20250514',
  },
  grok: {
    // Grok model when available
    default: 'grok-3',
  }
} as const;

// Helper function to get the correct model name for a provider
function getProviderModel(provider: string, task: string): string {
  const providerModels = PROVIDER_MODEL_MAP[provider as keyof typeof PROVIDER_MODEL_MAP];
  if (!providerModels) {
    throw new Error(`Unknown provider: ${provider}`);
  }

  return providerModels[task as keyof typeof providerModels] || providerModels.default;
}

export interface GenerationOptions {
  format?: 'json' | 'text';
  systemPrompt?: string;
  context?: any;
  retryCount?: number;
}

// Provider availability tracking
interface ProviderAvailability {
  available: boolean;
  reason?: string;
  client?: any;
  langchainModel?: any;
}

export interface StructuredGenerationOptions {
  systemPrompt?: string;
  temperature?: number;
  maxRetries?: number;
}

export interface GenerationResult {
  content: string;
  provider: string;
  model: string;
  tokensUsed?: number;
  costCents?: number;
  latencyMs: number;
  cached: boolean;
}

export interface ProviderStats {
  totalRequests: number;
  totalTokens: number;
  totalCostCents: number;
  averageLatencyMs: number;
  errorCount: number;
  successRate: number;
}

export class LLMProviderService {
  private config: LLMConfig;
  private providers: Map<string, any>;
  private langchainProviders: Map<string, ProviderAvailability>;
  private stats: Map<string, ProviderStats>;
  private cache: Map<string, { result: GenerationResult; expiresAt: number }>;
  private rateLimiter: Map<string, { count: number; windowStart: number }>;

  constructor(config: LLMConfig) {
    this.config = config;
    this.providers = new Map();
    this.langchainProviders = new Map();
    this.stats = new Map();
    this.cache = new Map();
    this.rateLimiter = new Map();

    this.initializeProviders();
    this.initializeLangChainProviders();
    this.initializeStats();
  }

  private initializeProviders(): void {
    // Initialize Gemini (primary) - Use GOOGLE_API_KEY as in .env.local
    if (process.env.GOOGLE_API_KEY) {
      try {
        this.providers.set('gemini', new GoogleGenerativeAI(process.env.GOOGLE_API_KEY));
        console.log('✅ Gemini provider initialized');
      } catch (error) {
        console.warn('❌ Gemini provider initialization failed:', error.message);
      }
    }

    // Initialize OpenAI (fallback)
    if (process.env.OPENAI_API_KEY) {
      try {
        this.providers.set('openai', new OpenAI({
          apiKey: process.env.OPENAI_API_KEY,
          maxRetries: 0 // We handle retries ourselves
        }));
        console.log('✅ OpenAI provider initialized');
      } catch (error) {
        console.warn('❌ OpenAI provider initialization failed:', error.message);
      }
    }

    // Initialize Anthropic (fallback)
    if (process.env.ANTHROPIC_API_KEY) {
      try {
        this.providers.set('anthropic', new Anthropic({
          apiKey: process.env.ANTHROPIC_API_KEY
        }));
        console.log('✅ Anthropic provider initialized');
      } catch (error) {
        console.warn('❌ Anthropic provider initialization failed:', error.message);
      }
    }

    // Initialize Grok (when available)
    if (process.env.GROK_API_KEY) {
      console.log('⏳ Grok provider configured (implementation pending)');
    }

    const availableProviders = Array.from(this.providers.keys());
    if (availableProviders.length === 0) {
      console.warn('⚠️ No LLM providers initialized! Check your API keys.');
    } else {
      console.log(`✅ Available providers: ${availableProviders.join(', ')}`);
    }
  }

  private initializeLangChainProviders(): void {
    // Initialize LangChain models for structured outputs
    const providerConfigs = [
      {
        name: 'gemini',
        apiKey: process.env.GOOGLE_API_KEY,
        createModel: (task: string) => new ChatGoogleGenerativeAI({
          model: getProviderModel('gemini', task),
          temperature: 0,
          apiKey: process.env.GOOGLE_API_KEY,
          maxRetries: 3
        })
      },
      {
        name: 'openai',
        apiKey: process.env.OPENAI_API_KEY,
        createModel: (task: string) => new ChatOpenAI({
          model: getProviderModel('openai', task),
          temperature: 0,
          apiKey: process.env.OPENAI_API_KEY,
          maxRetries: 3
        })
      },
      {
        name: 'anthropic',
        apiKey: process.env.ANTHROPIC_API_KEY,
        createModel: (task: string) => new ChatAnthropic({
          model: getProviderModel('anthropic', task),
          temperature: 0,
          anthropicApiKey: process.env.ANTHROPIC_API_KEY,
          maxRetries: 3
        })
      }
    ];

    for (const config of providerConfigs) {
      if (config.apiKey) {
        try {
          // Test model creation
          const testModel = config.createModel('default');
          this.langchainProviders.set(config.name, {
            available: true,
            langchainModel: config.createModel
          });
          console.log(`✅ LangChain ${config.name} provider ready for structured outputs`);
        } catch (error) {
          this.langchainProviders.set(config.name, {
            available: false,
            reason: `Initialization failed: ${error.message}`
          });
          console.warn(`❌ LangChain ${config.name} provider failed:`, error.message);
        }
      } else {
        this.langchainProviders.set(config.name, {
          available: false,
          reason: 'API key not configured'
        });
      }
    }

    const availableLangChain = Array.from(this.langchainProviders.entries())
      .filter(([_, provider]) => provider.available)
      .map(([name]) => name);

    console.log(`🔗 LangChain providers available: ${availableLangChain.join(', ') || 'none'}`);
  }

  private initializeStats(): void {
    const providers = ['gemini', 'openai', 'anthropic', 'grok'];
    for (const provider of providers) {
      this.stats.set(provider, {
        totalRequests: 0,
        totalTokens: 0,
        totalCostCents: 0,
        averageLatencyMs: 0,
        errorCount: 0,
        successRate: 0
      });
    }
  }

  /**
   * Generate content using optimal provider with fallback support
   */
  async generateContent(
    task: keyof LLMConfig['models'],
    prompt: string,
    options: GenerationOptions = {}
  ): Promise<GenerationResult> {
    const modelConfig = this.config.models[task];
    let providers = [modelConfig.provider, ...this.config.fallbackProviders];

    // Use optimal provider selection if enabled
    if (this.config.features.enableFunctionCalling) {
      const optimalProvider = getOptimalProvider(task, this.config);
      providers = [optimalProvider, ...providers.filter(p => p !== optimalProvider)];
    }

    // Remove duplicates while preserving order
    providers = [...new Set(providers)];

    // Filter to only available providers
    providers = providers.filter(p => this.providers.has(p));

    // If no providers are available, throw error
    if (providers.length === 0) {
      throw new Error(`No available providers for task ${task}. Available: ${Array.from(this.providers.keys()).join(', ')}`);
    }

    let lastError: Error | null = null;

    for (const providerName of providers) {
      try {
        // Check cache first
        if (this.config.caching.enabled) {
          const cached = this.getCachedResult(task, prompt, options);
          if (cached) {
            return cached;
          }
        }

        // Check rate limits
        if (!(await this.checkRateLimit(providerName))) {
          throw new Error(`Rate limit exceeded for provider: ${providerName}`);
        }

        // Attempt generation
        const result = await this.callProvider(providerName, modelConfig, prompt, options, task);

        // Update stats
        this.updateStats(providerName, result, true);

        // Cache result
        if (this.config.caching.enabled) {
          this.cacheResult(task, prompt, options, result);
        }

        return result;

      } catch (error) {
        lastError = error as Error;
        this.updateStats(providerName, null, false);

        console.warn(`Provider ${providerName} failed for task ${task}:`, error.message);

        // If this is the last provider, throw the error
        if (providerName === providers[providers.length - 1]) {
          break;
        }

        // Wait before trying next provider
        await this.sleep(this.config.retryDelayMs);
      }
    }

    throw new Error(`All providers failed. Last error: ${lastError?.message}`);
  }

  /**
   * Production-Grade Structured Output Generation
   * Research-backed approach: OpenAI first for complex schemas (100% accuracy), then Gemini fallback
   */
  async generateStructured<T>(
    schema: z.ZodSchema<T>,
    task: keyof LLMConfig['models'],
    prompt: string,
    options: StructuredGenerationOptions = {}
  ): Promise<T> {
    const providerOrder = this.getAvailableProviderOrder(task);

    if (providerOrder.length === 0) {
      throw new Error('No LangChain providers available for structured outputs. Check API keys.');
    }

    let lastError: Error | null = null;

    // Research finding: OpenAI excels with complex schemas (100% accuracy)
    // Try OpenAI first for complex structured outputs
    if (providerOrder.includes('openai')) {
      try {
        console.log(`🔄 Attempting OpenAI (optimal for complex schemas)...`);

        const result = await this.executeStructuredGeneration(
          'openai',
          schema,
          task,
          prompt,
          { ...options, temperature: 0.1 } // Lower temperature for accuracy
        );

        console.log(`✅ Structured output successful with OpenAI`);
        return result;

      } catch (error) {
        lastError = error as Error;
        console.warn(`❌ OpenAI failed for structured output:`, (error as Error).message);
      }
    }

    // Fallback to other providers
    const otherProviders = providerOrder.filter(p => p !== 'openai');
    for (const providerName of otherProviders) {
      try {
        console.log(`🔄 Fallback to ${providerName}...`);

        const result = await this.executeStructuredGeneration(
          providerName,
          schema,
          task,
          prompt,
          options
        );

        console.log(`✅ Structured output successful with ${providerName}`);
        return result;

      } catch (error) {
        lastError = error as Error;
        console.warn(`❌ ${providerName} failed for structured output:`, (error as Error).message);

        // Wait before trying next provider
        await this.sleep(this.config.retryDelayMs);
      }
    }

    // All providers failed
    const availableProviders = providerOrder.join(', ');
    throw new Error(
      `All available providers failed for structured output (tried: ${availableProviders}). ` +
      `Last error: ${lastError?.message}. Check API keys and provider configurations.`
    );
  }

  /**
   * Execute structured generation with a specific provider
   * Handles provider-specific schema requirements and configurations
   */
  private async executeStructuredGeneration<T>(
    providerName: string,
    schema: z.ZodSchema<T>,
    task: keyof LLMConfig['models'],
    prompt: string,
    options: StructuredGenerationOptions
  ): Promise<T> {
    const provider = this.langchainProviders.get(providerName);

    if (!provider || !provider.available || !provider.langchainModel) {
      throw new Error(`Provider ${providerName} not available: ${provider?.reason || 'unknown'}`);
    }

    // Create LangChain model instance
    const llmModel = provider.langchainModel(task);

    // Configure temperature if provided
    if (options.temperature !== undefined) {
      llmModel.temperature = options.temperature;
    }

    // Create structured model using LangChain's OOTB method
    // Following best practices: https://python.langchain.com/docs/how_to/structured_output/
    const structuredModel = llmModel.withStructuredOutput(schema, {
      name: `${task}_structured_output`,
      includeRaw: false // Only return parsed result for clean interface
    });

    // Build messages array following LangChain format
    const messages = [];
    if (options.systemPrompt) {
      messages.push(['system', options.systemPrompt]);
    }
    messages.push(['human', prompt]);

    // Generate structured output
    const result = await structuredModel.invoke(messages);

    // Additional validation to ensure type safety
    return schema.parse(result);
  }

  /**
   * Get ordered list of available providers for structured outputs
   * Prioritizes optimal provider for task, then available fallbacks
   */
  private getAvailableProviderOrder(task: keyof LLMConfig['models']): string[] {
    // Start with optimal provider for this task
    const optimalProvider = getOptimalProvider(task, this.config);
    const fallbackProviders = this.config.fallbackProviders;

    // Build ordered list: optimal first, then fallbacks
    let providerOrder = [optimalProvider, ...fallbackProviders];

    // Remove duplicates while preserving order
    providerOrder = [...new Set(providerOrder)];

    // Filter to only available LangChain providers
    const availableProviders = providerOrder.filter(provider => {
      const langchainProvider = this.langchainProviders.get(provider);
      return langchainProvider && langchainProvider.available;
    });

    return availableProviders;
  }

  private async callProvider(
    providerName: string,
    config: ModelConfig,
    prompt: string,
    options: GenerationOptions,
    task?: string
  ): Promise<GenerationResult> {
    const startTime = Date.now();
    const provider = this.providers.get(providerName);

    if (!provider) {
      throw new Error(`Provider ${providerName} not initialized`);
    }

    // Get the correct model for this provider
    const providerModel = getProviderModel(providerName, task || 'default');

    let result: any;
    let tokensUsed = 0;

    switch (providerName) {
      case 'gemini':
        result = await this.callGemini(provider, { ...config, model: providerModel }, prompt, options);
        tokensUsed = result.response?.usageMetadata?.totalTokenCount || 0;
        break;

      case 'openai':
        result = await this.callOpenAI(provider, { ...config, model: providerModel }, prompt, options);
        tokensUsed = result.usage?.total_tokens || 0;
        break;

      case 'anthropic':
        result = await this.callAnthropic(provider, { ...config, model: providerModel }, prompt, options);
        tokensUsed = result.usage?.output_tokens || 0;
        break;

      default:
        throw new Error(`Unsupported provider: ${providerName}`);
    }

    const latencyMs = Date.now() - startTime;
    const costCents = this.config.costTracking ?
      calculateEstimatedCost(providerName as any, tokensUsed) * 100 : 0;

    return {
      content: this.extractContent(result, providerName),
      provider: providerName,
      model: providerModel, // Use the actual model that was called
      tokensUsed,
      costCents,
      latencyMs,
      cached: false
    };
  }

  private async callGemini(provider: any, config: ModelConfig, prompt: string, options: GenerationOptions) {
    const model = provider.getGenerativeModel({
      model: config.model,
      generationConfig: {
        temperature: config.temperature,
        maxOutputTokens: config.maxTokens,
        topP: config.topP,
        responseMimeType: options.format === 'json' ? 'application/json' : 'text/plain'
      },
      systemInstruction: options.systemPrompt
    });

    return await model.generateContent(prompt);
  }

  private async callOpenAI(provider: any, config: ModelConfig, prompt: string, options: GenerationOptions) {
    const messages = [];

    if (options.systemPrompt) {
      messages.push({ role: 'system', content: options.systemPrompt });
    }

    messages.push({ role: 'user', content: prompt });

    const requestParams: any = {
      model: config.model,
      messages,
      temperature: config.temperature,
      max_tokens: config.maxTokens
    };

    if (config.topP) requestParams.top_p = config.topP;
    if (config.frequencyPenalty) requestParams.frequency_penalty = config.frequencyPenalty;
    if (config.presencePenalty) requestParams.presence_penalty = config.presencePenalty;

    if (options.format === 'json') {
      requestParams.response_format = { type: 'json_object' };
    }

    return await provider.chat.completions.create(requestParams);
  }

  private async callAnthropic(provider: any, config: ModelConfig, prompt: string, options: GenerationOptions) {
    const requestParams: any = {
      model: config.model,
      max_tokens: config.maxTokens,
      temperature: config.temperature,
      messages: [{ role: 'user', content: prompt }]
    };

    if (options.systemPrompt) {
      requestParams.system = options.systemPrompt;
    }

    if (config.topP) requestParams.top_p = config.topP;

    return await provider.messages.create(requestParams);
  }

  private extractContent(result: any, provider: string): string {
    switch (provider) {
      case 'gemini':
        return result.response?.text() || '';
      case 'openai':
        return result.choices?.[0]?.message?.content || '';
      case 'anthropic':
        return result.content?.[0]?.text || '';
      default:
        throw new Error(`Unknown provider: ${provider}`);
    }
  }


  private getCachedResult(task: string, prompt: string, options: GenerationOptions): GenerationResult | null {
    const cacheKey = this.generateCacheKey(task, prompt, options);
    const cached = this.cache.get(cacheKey);

    if (cached && cached.expiresAt > Date.now()) {
      return { ...cached.result, cached: true };
    }

    // Clean up expired cache entry
    if (cached) {
      this.cache.delete(cacheKey);
    }

    return null;
  }

  private cacheResult(task: string, prompt: string, options: GenerationOptions, result: GenerationResult): void {
    const cacheKey = this.generateCacheKey(task, prompt, options);
    const expiresAt = Date.now() + (this.config.caching.ttlMinutes * 60 * 1000);

    this.cache.set(cacheKey, { result, expiresAt });

    // Clean up old cache entries if we exceed max size
    if (this.cache.size > this.config.caching.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }
  }

  private generateCacheKey(task: string, prompt: string, options: GenerationOptions): string {
    const optionsStr = JSON.stringify(options);
    return `${task}:${prompt.slice(0, 100)}:${optionsStr}`.replace(/\s+/g, '_');
  }

  private async checkRateLimit(provider: string): Promise<boolean> {
    const limits = this.config.rateLimits[provider];
    if (!limits) return true;

    const now = Date.now();
    const windowStart = now - 60000; // 1 minute window

    let limiter = this.rateLimiter.get(provider);
    if (!limiter || limiter.windowStart < windowStart) {
      limiter = { count: 0, windowStart: now };
      this.rateLimiter.set(provider, limiter);
    }

    return limiter.count < limits.requestsPerMinute;
  }

  private updateStats(provider: string, result: GenerationResult | null, success: boolean): void {
    const stats = this.stats.get(provider);
    if (!stats) return;

    stats.totalRequests++;

    if (success && result) {
      stats.totalTokens += result.tokensUsed || 0;
      stats.totalCostCents += result.costCents || 0;
      stats.averageLatencyMs = (stats.averageLatencyMs + result.latencyMs) / 2;
    } else {
      stats.errorCount++;
    }

    stats.successRate = (stats.totalRequests - stats.errorCount) / stats.totalRequests;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get provider statistics for monitoring
   */
  getProviderStats(): Record<string, ProviderStats> {
    const result: Record<string, ProviderStats> = {};
    for (const [provider, stats] of this.stats.entries()) {
      result[provider] = { ...stats };
    }
    return result;
  }

  /**
   * Clear all cached results
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get current configuration
   */
  getConfig(): LLMConfig {
    return { ...this.config };
  }

  /**
   * Get provider availability status for debugging
   */
  getProviderAvailability(): Record<string, ProviderAvailability> {
    const result: Record<string, ProviderAvailability> = {};
    for (const [provider, availability] of this.langchainProviders.entries()) {
      result[provider] = {
        available: availability.available,
        reason: availability.reason
      };
    }
    return result;
  }

  /**
   * Test structured output generation in isolation
   * Useful for debugging and validation
   */
  async testStructuredOutput(): Promise<{
    success: boolean;
    results: Array<{ provider: string; success: boolean; error?: string; result?: any }>;
  }> {
    console.log('🧪 Testing structured output generation...');

    // Simple test schema
    const TestSchema = z.object({
      message: z.string().describe('A simple test message'),
      success: z.boolean().describe('Whether the test was successful'),
      timestamp: z.string().describe('ISO timestamp')
    });

    const testPrompt = 'Generate a test response confirming structured output works with current timestamp';
    const results = [];
    let overallSuccess = false;

    // Test each available provider
    for (const [providerName, provider] of this.langchainProviders.entries()) {
      if (!provider.available) {
        results.push({
          provider: providerName,
          success: false,
          error: provider.reason || 'Provider not available'
        });
        continue;
      }

      try {
        console.log(`Testing ${providerName}...`);
        const result = await this.executeStructuredGeneration(
          providerName,
          TestSchema,
          'quality_evaluation', // Use a simple task
          testPrompt,
          { systemPrompt: 'You are a helpful assistant testing structured outputs.' }
        );

        results.push({
          provider: providerName,
          success: true,
          result
        });
        overallSuccess = true;
        console.log(`✅ ${providerName} test passed:`, result);

      } catch (error) {
        results.push({
          provider: providerName,
          success: false,
          error: error.message
        });
        console.log(`❌ ${providerName} test failed:`, error.message);
      }
    }

    console.log(`🧪 Test complete. Overall success: ${overallSuccess}`);
    return { success: overallSuccess, results };
  }
}
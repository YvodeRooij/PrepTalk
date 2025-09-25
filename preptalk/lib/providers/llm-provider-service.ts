// LLM Provider Service - Multi-provider abstraction with intelligent fallback
// Supports Gemini, OpenAI, Anthropic, Grok with unified interface

import { GoogleGenerativeAI } from '@google/generative-ai';
import { LLMConfig, ModelConfig, getOptimalProvider, calculateEstimatedCost } from '../config/llm-config';

// Conditional imports to handle missing dependencies gracefully
let OpenAI: any;
try {
  OpenAI = require('openai');
} catch (e) {
  console.warn('OpenAI package not installed. OpenAI provider will not be available.');
}

let Anthropic: any;
try {
  Anthropic = require('@anthropic-ai/sdk');
} catch (e) {
  console.warn('Anthropic package not installed. Anthropic provider will not be available.');
}

export interface GenerationOptions {
  format?: 'json' | 'text';
  systemPrompt?: string;
  context?: any;
  retryCount?: number;
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
  private stats: Map<string, ProviderStats>;
  private cache: Map<string, { result: GenerationResult; expiresAt: number }>;
  private rateLimiter: Map<string, { count: number; windowStart: number }>;

  constructor(config: LLMConfig) {
    this.config = config;
    this.providers = new Map();
    this.stats = new Map();
    this.cache = new Map();
    this.rateLimiter = new Map();

    this.initializeProviders();
    this.initializeStats();
  }

  private initializeProviders(): void {
    // Initialize Gemini
    if (process.env.GOOGLE_AI_API_KEY) {
      this.providers.set('gemini', new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY));
    }

    // Initialize OpenAI
    if (OpenAI && process.env.OPENAI_API_KEY) {
      this.providers.set('openai', new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
        maxRetries: 0 // We handle retries ourselves
      }));
    }

    // Initialize Anthropic
    if (Anthropic && process.env.ANTHROPIC_API_KEY) {
      this.providers.set('anthropic', new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY
      }));
    }

    // Initialize Grok (when available)
    if (process.env.GROK_API_KEY) {
      // Grok implementation would go here
      console.log('Grok provider configured (implementation pending)');
    }

    console.log(`✅ Initialized providers: ${Array.from(this.providers.keys()).join(', ')}`);
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
        const result = await this.callProvider(providerName, modelConfig, prompt, options);

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

  private async callProvider(
    providerName: string,
    config: ModelConfig,
    prompt: string,
    options: GenerationOptions
  ): Promise<GenerationResult> {
    const startTime = Date.now();
    const provider = this.providers.get(providerName);

    if (!provider) {
      throw new Error(`Provider ${providerName} not initialized`);
    }

    let result: any;
    let tokensUsed = 0;

    switch (providerName) {
      case 'gemini':
        result = await this.callGemini(provider, config, prompt, options);
        tokensUsed = result.response?.usageMetadata?.totalTokenCount || 0;
        break;

      case 'openai':
        result = await this.callOpenAI(provider, config, prompt, options);
        tokensUsed = result.usage?.total_tokens || 0;
        break;

      case 'anthropic':
        result = await this.callAnthropic(provider, config, prompt, options);
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
      model: config.model,
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
}

`★ Insight ─────────────────────────────────────`
Smart architecture: The provider service handles failures gracefully, tracks costs automatically, and optimizes provider selection based on task requirements. This gives us true multi-provider flexibility without vendor lock-in.
`─────────────────────────────────────────────────`
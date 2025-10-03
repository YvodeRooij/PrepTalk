// LLM Provider Service - Multi-provider abstraction with intelligent fallback
// Supports Gemini, OpenAI, Anthropic with LangChain structured outputs
// Uses LangChain's withStructuredOutput internally for OOTB, battle-tested implementation
// OPTIMIZED: Uses lazy imports to reduce initial memory footprint and prevent build crashes

import { LLMConfig, ModelConfig, getOptimalProvider, calculateEstimatedCost } from '../config/llm-config';

// LangChain imports for structured outputs - only import z, rest are lazy-loaded
import { z } from 'zod';

// Provider-specific model mappings
const PROVIDER_MODEL_MAP = {
  gemini: {
    // Map all tasks to appropriate Gemini models
    // Note: Flash is more stable during outages (Sep 29 outage: Pro down, Flash worked)
    default: 'gemini-2.5-flash', // Fast and stable for most tasks
    quality_evaluation: 'gemini-2.5-flash', // Flash is stable, Pro fallback via provider chain
    company_research: 'gemini-2.5-flash', // Flash first for stability, Pro fallback
  },
  'gemini-pro': {
    // Gemini Pro models as fallback when Flash fails/overloaded
    default: 'gemini-2.5-pro',
    quality_evaluation: 'gemini-2.5-pro',
    company_research: 'gemini-2.5-pro',
  },
  openai: {
    // Use the configured OpenAI model for all tasks
    default: 'gpt-4.1-mini',
  },
  anthropic: {
    // Claude Sonnet 4.5 - Latest model (Sept 29, 2025) optimized for coding and complex agents
    default: 'claude-sonnet-4-5-20250929',
    unified_context_engine: 'claude-sonnet-4-5-20250929', // Excellent for complex synthesis
    quality_evaluation: 'claude-sonnet-4-5-20250929', // Superior reasoning
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
  forceProvider?: 'openai' | 'gemini' | 'gemini-pro' | 'anthropic';  // Force specific provider
}

export interface GenerationResult {
  content: string;
  provider: string;
  model: string;
  tokensUsed?: number;
  costCents?: number;
  latencyMs: number;
  cached: boolean;
  groundingMetadata?: any; // For Google Search/URL grounding citations
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
    // Initialize provider markers (lazy-load actual SDKs when needed)
    // This prevents memory exhaustion during build/initialization

    if (process.env.GOOGLE_API_KEY) {
      this.providers.set('gemini', { apiKey: process.env.GOOGLE_API_KEY, type: 'gemini' });
      this.providers.set('gemini-pro', { apiKey: process.env.GOOGLE_API_KEY, type: 'gemini' });
      console.log('✅ Gemini provider configured (lazy-load on first use)');
    }

    if (process.env.OPENAI_API_KEY) {
      this.providers.set('openai', { apiKey: process.env.OPENAI_API_KEY, type: 'openai' });
      console.log('✅ OpenAI provider configured (lazy-load on first use)');
    }

    if (process.env.ANTHROPIC_API_KEY) {
      this.providers.set('anthropic', { apiKey: process.env.ANTHROPIC_API_KEY, type: 'anthropic' });
      console.log('✅ Anthropic provider configured (lazy-load on first use)');
    }

    if (process.env.GROK_API_KEY) {
      console.log('⏳ Grok provider configured (implementation pending)');
    }

    const availableProviders = Array.from(this.providers.keys());
    if (availableProviders.length === 0) {
      console.warn('⚠️ No LLM providers configured! Check your API keys.');
    } else {
      console.log(`✅ Available providers: ${availableProviders.join(', ')}`);
    }
  }

  private async initializeLangChainProviders(): Promise<void> {
    // Lazy-load LangChain providers to prevent memory issues during build
    // Models are created on-demand when first needed

    const providerConfigs = [
      {
        name: 'gemini',
        apiKey: process.env.GOOGLE_API_KEY,
        createModel: async (task: string) => {
          const { ChatGoogleGenerativeAI } = await import('@langchain/google-genai');
          return new ChatGoogleGenerativeAI({
            model: getProviderModel('gemini', task),
            temperature: 0,
            apiKey: process.env.GOOGLE_API_KEY,
            maxRetries: 3,
            maxConcurrency: 5
          });
        }
      },
      {
        name: 'gemini-pro',
        apiKey: process.env.GOOGLE_API_KEY,
        createModel: async (task: string) => {
          const { ChatGoogleGenerativeAI } = await import('@langchain/google-genai');
          return new ChatGoogleGenerativeAI({
            model: getProviderModel('gemini-pro', task),
            temperature: 0,
            apiKey: process.env.GOOGLE_API_KEY,
            maxRetries: 3,
            maxConcurrency: 5
          });
        }
      },
      {
        name: 'openai',
        apiKey: process.env.OPENAI_API_KEY,
        createModel: async (task: string) => {
          const { ChatOpenAI } = await import('@langchain/openai');
          return new ChatOpenAI({
            model: getProviderModel('openai', task),
            temperature: 0,
            apiKey: process.env.OPENAI_API_KEY,
            maxRetries: 3,
            maxConcurrency: 5
          });
        }
      },
      {
        name: 'anthropic',
        apiKey: process.env.ANTHROPIC_API_KEY,
        createModel: async (task: string) => {
          const { ChatAnthropic } = await import('@langchain/anthropic');
          return new ChatAnthropic({
            model: getProviderModel('anthropic', task),
            temperature: 0,
            anthropicApiKey: process.env.ANTHROPIC_API_KEY,
            maxRetries: 3,
            maxConcurrency: 5
          });
        }
      }
    ];

    for (const config of providerConfigs) {
      if (config.apiKey) {
        this.langchainProviders.set(config.name, {
          available: true,
          langchainModel: config.createModel
        });
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

        // Check if this is a 503 Service Unavailable error - fail fast to next provider
        const is503Error = error.message.includes('503') ||
                          error.message.includes('Service Unavailable') ||
                          error.message.includes('overloaded');

        if (is503Error) {
          console.warn(`Provider ${providerName} returned 503 for task ${task} - failing fast to next provider`);
        } else {
          console.warn(`Provider ${providerName} failed for task ${task}:`, error.message);
        }

        // If this is the last provider, throw the error
        if (providerName === providers[providers.length - 1]) {
          break;
        }

        // Only wait if not a 503 error (fail-fast for 503)
        if (!is503Error) {
          await this.sleep(this.config.retryDelayMs);
        }
      }
    }

    throw new Error(`All providers failed. Last error: ${lastError?.message}`);
  }

  /**
   * Generate content from URL using Gemini URL grounding
   * Falls back to other providers if Gemini fails (though only Gemini supports URL grounding)
   */
  async generateContentFromUrl(
    task: keyof LLMConfig['models'],
    url: string,
    prompt: string,
    options: GenerationOptions = {}
  ): Promise<GenerationResult> {
    const modelConfig = this.config.models[task];
    let providers = [modelConfig.provider, ...this.config.fallbackProviders];

    // Use optimal provider selection
    const optimalProvider = getOptimalProvider(task, this.config);
    providers = [optimalProvider, ...providers.filter(p => p !== optimalProvider)];

    // Remove duplicates
    providers = [...new Set(providers)];

    // Filter to only available providers
    providers = providers.filter(p => this.providers.has(p));

    if (providers.length === 0) {
      throw new Error(`No available providers for task ${task}`);
    }

    let lastError: Error | null = null;

    for (const providerName of providers) {
      try {
        // Check rate limits
        if (!(await this.checkRateLimit(providerName))) {
          throw new Error(`Rate limit exceeded for provider: ${providerName}`);
        }

        let result: any;
        let tokensUsed = 0;

        // Only Gemini supports URL grounding via fileData
        if (providerName === 'gemini' || providerName === 'gemini-pro') {
          const providerConfig = this.providers.get(providerName);
          const providerModel = getProviderModel(providerName, task);

          result = await this.callGeminiWithUrl(
            providerConfig.apiKey,
            { ...modelConfig, model: providerModel },
            url,
            prompt,
            options
          );
          tokensUsed = result.response?.usageMetadata?.totalTokenCount || 0;

          const latencyMs = 0; // Not tracking for now
          const costCents = this.config.costTracking ?
            calculateEstimatedCost(providerName as any, tokensUsed) * 100 : 0;

          const generationResult: GenerationResult = {
            content: result.response?.text() || '',
            provider: providerName,
            model: providerModel,
            tokensUsed,
            costCents,
            latencyMs,
            cached: false
          };

          this.updateStats(providerName, generationResult, true);
          return generationResult;

        } else {
          // For non-Gemini providers, fall back to regular text-based extraction
          // This won't actually fetch the URL content but will use the prompt
          console.warn(`${providerName} does not support URL grounding, using text-based fallback`);
          result = await this.callProvider(providerName, modelConfig, `${prompt}\n\nURL: ${url}`, options, task);
          this.updateStats(providerName, result, true);
          return result;
        }

      } catch (error) {
        lastError = error as Error;
        this.updateStats(providerName, null, false);

        // Check if this is a 503 Service Unavailable error - fail fast
        const errorMsg = error.message;
        const is503Error = errorMsg.includes('503') ||
                          errorMsg.includes('Service Unavailable') ||
                          errorMsg.includes('overloaded');

        if (is503Error) {
          console.warn(`Provider ${providerName} returned 503 for URL task ${task} - failing fast to next provider`);
        } else {
          console.warn(`Provider ${providerName} failed for URL task ${task}:`, errorMsg);
        }

        // If this is the last provider, throw the error
        if (providerName === providers[providers.length - 1]) {
          break;
        }

        // Only wait if not a 503 error (fail-fast for 503)
        if (!is503Error) {
          await this.sleep(this.config.retryDelayMs);
        }
      }
    }

    throw new Error(`All providers failed for URL task. Last error: ${lastError?.message}`);
  }

  /**
   * Generate content using Gemini URL Context grounding
   * Gemini fetches URLs server-side (up to 20 URLs, 34MB each)
   * Returns TEXT with citations - use generateStructured() afterwards for JSON
   */
  async generateWithUrlContext(
    task: keyof LLMConfig['models'],
    prompt: string,
    urls: string[],
    options: GenerationOptions = {}
  ): Promise<GenerationResult> {
    if (!process.env.GOOGLE_API_KEY) {
      throw new Error('Gemini API key not configured');
    }

    if (urls.length > 20) {
      console.warn(`URL limit exceeded (${urls.length}), trimming to first 20`);
      urls = urls.slice(0, 20);
    }

    const textOptions = { ...options, format: 'text' as const };
    return this.callGroundingMethod(task, prompt, textOptions, { urlContext: {} }, urls);
  }

  async generateWithGoogleSearch(
    task: keyof LLMConfig['models'],
    prompt: string,
    options: GenerationOptions = {}
  ): Promise<GenerationResult> {
    if (!process.env.GOOGLE_API_KEY) {
      throw new Error('Gemini API key not configured');
    }

    return this.callGroundingMethod(task, prompt, options, { googleSearch: {} });
  }

  async generateWithCombinedGrounding(
    task: keyof LLMConfig['models'],
    prompt: string,
    urls: string[],
    options: GenerationOptions = {}
  ): Promise<GenerationResult> {
    if (!process.env.GOOGLE_API_KEY) {
      throw new Error('Gemini API key not configured');
    }

    if (urls.length > 20) {
      console.warn(`URL limit exceeded (${urls.length}), trimming to first 20`);
      urls = urls.slice(0, 20);
    }

    const textOptions = { ...options, format: 'text' as const };
    return this.callGroundingMethod(task, prompt, textOptions, { urlContext: {}, googleSearch: {} }, urls);
  }

  /**
   * Shared helper for all grounding methods (DRY)
   * Handles fail-fast, fallback chain, and metadata extraction
   */
  private async callGroundingMethod(
    task: keyof LLMConfig['models'],
    prompt: string,
    options: GenerationOptions,
    tools: { urlContext?: {}; googleSearch?: {} },
    urls?: string[]
  ): Promise<GenerationResult> {
    const modelConfig = this.config.models[task];
    let providers = ['gemini', 'gemini-pro']; // Only Gemini supports grounding

    // Filter to only available providers
    providers = providers.filter(p => this.providers.has(p));

    if (providers.length === 0) {
      throw new Error('No Gemini provider available for grounding');
    }

    let lastError: Error | null = null;
    const startTime = Date.now();

    for (const providerName of providers) {
      try {
        // Check rate limits
        if (!(await this.checkRateLimit(providerName))) {
          throw new Error(`Rate limit exceeded for provider: ${providerName}`);
        }

        const providerModel = getProviderModel(providerName, task);

        // Build prompt with URLs if provided
        const fullPrompt = urls && urls.length > 0
          ? `${prompt}\n\nURLs to analyze:\n${urls.map((u, i) => `${i + 1}. ${u}`).join('\n')}`
          : prompt;

        // Build config - note: tool use doesn't support responseMimeType='application/json'
        const configParams: any = {
          tools: [tools],
          temperature: options.temperature || modelConfig.temperature,
          maxOutputTokens: modelConfig.maxTokens,
          topP: modelConfig.topP
        };

        // Add system instruction if provided
        if (options.systemPrompt) {
          configParams.systemInstruction = { parts: [{ text: options.systemPrompt }] };
        }

        // Lazy-load Gemini grounding client
        const { GoogleGenAI } = await import('@google/genai');
        const geminiGroundingClient = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY! });

        // Call new Gemini SDK with grounding tools
        const response = await geminiGroundingClient.models.generateContent({
          model: providerModel,
          contents: [{
            role: 'user',
            parts: [{ text: fullPrompt }]
          }],
          config: configParams
        });

        const candidate = response.candidates?.[0];
        if (!candidate) {
          throw new Error('No candidate returned from Gemini grounding');
        }

        // Extract text from all parts (some might be function calls, some text)
        const textParts = candidate.content?.parts?.filter((p: any) => p.text) || [];
        const content = textParts.map((p: any) => p.text).join('\n') || '';
        const tokensUsed = response.usageMetadata?.totalTokenCount || 0;
        const latencyMs = Date.now() - startTime;
        const costCents = this.config.costTracking ?
          calculateEstimatedCost(providerName as any, tokensUsed) * 100 : 0;

        const result: GenerationResult = {
          content,
          provider: providerName,
          model: providerModel,
          tokensUsed,
          costCents,
          latencyMs,
          cached: false,
          groundingMetadata: candidate.groundingMetadata || response.groundingMetadata
        };

        this.updateStats(providerName, result, true);
        return result;

      } catch (error) {
        lastError = error as Error;
        this.updateStats(providerName, null, false);

        // Check if this is a 503 Service Unavailable error - fail fast
        const errorMsg = error.message;
        const is503Error = errorMsg.includes('503') ||
                          errorMsg.includes('Service Unavailable') ||
                          errorMsg.includes('overloaded');

        if (is503Error) {
          console.warn(`Provider ${providerName} returned 503 for grounding task ${task} - failing fast to next provider`);
        } else {
          console.warn(`Provider ${providerName} failed for grounding task ${task}:`, errorMsg);
        }

        // If this is the last provider, throw the error
        if (providerName === providers[providers.length - 1]) {
          break;
        }

        // Only wait if not a 503 error (fail-fast for 503)
        if (!is503Error) {
          await this.sleep(this.config.retryDelayMs);
        }
      }
    }

    // Final fallback: If all Gemini providers failed and url_context was requested, try Cheerio scraping
    if (tools.urlContext && urls && urls.length > 0) {
      console.warn('All Gemini providers failed for url_context, falling back to Cheerio scraping');
      try {
        // Import cheerio and axios dynamically
        const axios = (await import('axios')).default;
        const cheerio = await import('cheerio');

        // Fetch and parse first URL (limit to 1 for fallback)
        const response = await axios.get(urls[0], {
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PrepTalk/1.0)' },
          timeout: 10000
        });

        const $ = cheerio.load(response.data);
        $('script, style, noscript').remove();
        const text = $('body').text().replace(/\s+/g, ' ').trim().substring(0, 50000);

        const fallbackPrompt = `${prompt}\n\nExtracted content from ${urls[0]}:\n\n${text}`;

        // Use regular generateContent with OpenAI fallback
        const fallbackResult = await this.generateContent(task, fallbackPrompt, { format: 'text' });

        return {
          ...fallbackResult,
          groundingMetadata: { note: 'Cheerio scraping fallback - Gemini unavailable' }
        };
      } catch (cheerioError) {
        console.error('Cheerio fallback also failed:', cheerioError.message);
      }
    }

    throw new Error(`All providers failed for grounding task. Last error: ${lastError?.message}`);
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
    const callStartTime = Date.now();
    const callId = Math.random().toString(36).substring(7);

    // If forceProvider is specified, use only that provider
    if (options.forceProvider) {
      const forcedProvider = options.forceProvider;
      console.log(`🎯 [CALL-${callId}] Forcing provider: ${forcedProvider} for structured generation`);

      const providerInfo = this.langchainProviders.get(forcedProvider);
      if (!providerInfo?.available) {
        throw new Error(`Forced provider ${forcedProvider} is not available. Reason: ${providerInfo?.reason || 'unknown'}`);
      }

      try {
        const providerStartTime = Date.now();
        const result = await this.executeStructuredGeneration(
          forcedProvider,
          schema,
          task,
          prompt,
          options
        );
        const providerDuration = Date.now() - providerStartTime;
        const callDuration = Date.now() - callStartTime;
        console.log(`✅ [CALL-${callId}] Forced ${forcedProvider} completed in ${providerDuration}ms (total: ${callDuration}ms)`);
        return result;
      } catch (error) {
        const callDuration = Date.now() - callStartTime;
        console.error(`❌ [CALL-${callId}] Forced provider failed after ${callDuration}ms`);
        throw new Error(`Forced provider ${forcedProvider} failed: ${error.message}`);
      }
    }

    const providerOrder = this.getAvailableProviderOrder(task);

    if (providerOrder.length === 0) {
      throw new Error('No LangChain providers available for structured outputs. Check API keys.');
    }

    let lastError: Error | null = null;

    // Respect task-specific provider order from getOptimalProvider()
    // This ensures unified_context_engine uses Anthropic, etc.
    for (const providerName of providerOrder) {
      try {
        const providerStartTime = Date.now();
        console.log(`🔄 [CALL-${callId}] Attempting ${providerName} for structured output (task: ${task})...`);

        const result = await this.executeStructuredGeneration(
          providerName,
          schema,
          task,
          prompt,
          options
        );

        const providerDuration = Date.now() - providerStartTime;
        const callDuration = Date.now() - callStartTime;
        console.log(`✅ [CALL-${callId}] Structured output successful with ${providerName} in ${providerDuration}ms (total: ${callDuration}ms)`);
        return result;

      } catch (error) {
        lastError = error as Error;
        const providerDuration = Date.now() - callStartTime;
        const errorMsg = (error as Error).message;
        const is503Error = errorMsg.includes('503') || errorMsg.includes('Service Unavailable') || errorMsg.includes('overloaded');

        if (is503Error) {
          console.warn(`❌ [CALL-${callId}] ${providerName} returned 503 after ${providerDuration}ms - failing fast to next provider`);
        } else {
          console.warn(`❌ [CALL-${callId}] ${providerName} failed after ${providerDuration}ms:`, errorMsg.substring(0, 100));
        }

        // Only wait if not a 503 error (fail-fast for 503)
        if (!is503Error && providerOrder.indexOf(providerName) < providerOrder.length - 1) {
          await this.sleep(this.config.retryDelayMs);
        }
      }
    }

    // All providers failed
    const callDuration = Date.now() - callStartTime;
    console.error(`❌ [CALL-${callId}] All providers failed after ${callDuration}ms (${(callDuration/1000).toFixed(1)}s)`);
    const availableProviders = providerOrder.join(', ');
    throw new Error(
      `All available providers failed for structured output (tried: ${availableProviders}). ` +
      `Last error: ${lastError?.message}. Check API keys and provider configurations.`
    );
  }

  /**
   * Batch Structured Output Generation - OOTB LangChain Feature
   * Uses LangChain's .batch() with maxConcurrency for parallel processing
   * Ideal for independent operations like generating multiple personas/questions
   */
  async batchStructured<T>(
    schema: z.ZodSchema<T>,
    task: keyof LLMConfig['models'],
    prompts: Array<{ prompt: string; systemPrompt?: string }>,
    options: StructuredGenerationOptions = {}
  ): Promise<T[]> {
    const batchStartTime = Date.now();
    const batchId = Math.random().toString(36).substring(7);

    console.log(`\n🎯 [BATCH-${batchId}] Starting batch generation`);
    console.log(`   Task: ${task}`);
    console.log(`   Batch size: ${prompts.length}`);

    const providerOrder = this.getAvailableProviderOrder(task);
    console.log(`   Provider order: ${providerOrder.join(' → ')}`);

    if (providerOrder.length === 0) {
      throw new Error('No LangChain providers available for batch structured outputs. Check API keys.');
    }

    let lastError: Error | null = null;
    let attempts = 0;

    // Try OpenAI first (optimal for complex schemas)
    if (providerOrder.includes('openai')) {
      try {
        attempts++;
        const providerStartTime = Date.now();

        console.log(`🔄 [BATCH-${batchId}] Attempting openai (attempt ${attempts})...`);

        const results = await this.executeBatchStructuredGeneration(
          'openai',
          schema,
          task,
          prompts,
          { ...options, temperature: 0.1 },
          batchId
        );

        const providerDuration = Date.now() - providerStartTime;
        console.log(`✅ [BATCH-${batchId}] openai succeeded in ${providerDuration}ms (${(providerDuration/1000).toFixed(1)}s)`);

        const batchDuration = Date.now() - batchStartTime;
        console.log(`\n✅ [BATCH-${batchId}] Completed in ${batchDuration}ms (${(batchDuration/1000).toFixed(1)}s)`);
        console.log(`   Average per item: ${(batchDuration/prompts.length).toFixed(0)}ms`);

        return results;

      } catch (error) {
        lastError = error as Error;
        const providerDuration = Date.now() - batchStartTime;
        console.warn(`❌ [BATCH-${batchId}] openai failed after ${providerDuration}ms (${(providerDuration/1000).toFixed(1)}s)`);
        console.warn(`   Error: ${(error as Error).message?.substring(0, 100)}`);
      }
    }

    // Fallback to other providers
    const otherProviders = providerOrder.filter(p => p !== 'openai');
    for (const providerName of otherProviders) {
      try {
        attempts++;
        const providerStartTime = Date.now();

        if (lastError) {
          console.log(`🔄 [BATCH-${batchId}] Trying next provider (${attempts} attempts so far)`);
          console.log(`   Last error: ${lastError.message?.substring(0, 100)}`);
        }
        console.log(`🔄 [BATCH-${batchId}] Attempting ${providerName}...`);

        const results = await this.executeBatchStructuredGeneration(
          providerName,
          schema,
          task,
          prompts,
          options,
          batchId
        );

        const providerDuration = Date.now() - providerStartTime;
        console.log(`✅ [BATCH-${batchId}] ${providerName} succeeded in ${providerDuration}ms (${(providerDuration/1000).toFixed(1)}s)`);

        const batchDuration = Date.now() - batchStartTime;
        console.log(`\n✅ [BATCH-${batchId}] Completed in ${batchDuration}ms (${(batchDuration/1000).toFixed(1)}s)`);
        console.log(`   Average per item: ${(batchDuration/prompts.length).toFixed(0)}ms`);

        return results;

      } catch (error) {
        lastError = error as Error;
        const providerDuration = Date.now() - batchStartTime;
        console.warn(`❌ [BATCH-${batchId}] ${providerName} failed after ${providerDuration}ms (${(providerDuration/1000).toFixed(1)}s)`);
        console.warn(`   Error: ${(error as Error).message?.substring(0, 100)}`);

        // Wait before trying next provider
        await this.sleep(this.config.retryDelayMs);
      }
    }

    // All providers failed
    const batchDuration = Date.now() - batchStartTime;
    console.error(`\n❌ [BATCH-${batchId}] All providers failed after ${batchDuration}ms (${(batchDuration/1000).toFixed(1)}s)`);
    console.error(`   Total attempts: ${attempts}`);

    const availableProviders = providerOrder.join(', ');
    throw new Error(
      `All available providers failed for batch structured output (tried: ${availableProviders}). ` +
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
    let llmModel = await provider.langchainModel(task);

    // Configure temperature if provided
    if (options.temperature !== undefined) {
      llmModel.temperature = options.temperature;
    }

    // KNOWN ISSUE: @langchain/anthropic v0.3.28 has a bug with withStructuredOutput()
    // It sends top_p: -1 which Anthropic API rejects with 400 error
    // The system will gracefully fallback to Gemini for structured outputs
    // TODO: Update to @langchain/anthropic v0.4.x when available to fix this
    // For now, Anthropic is correctly selected but falls back to Gemini

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
   * Execute batch structured generation with a specific provider
   * Uses LangChain's .batch() with maxConcurrency from model configuration
   */
  private async executeBatchStructuredGeneration<T>(
    providerName: string,
    schema: z.ZodSchema<T>,
    task: keyof LLMConfig['models'],
    prompts: Array<{ prompt: string; systemPrompt?: string }>,
    options: StructuredGenerationOptions,
    batchId?: string
  ): Promise<T[]> {
    const logPrefix = batchId ? `[BATCH-${batchId}]` : '[BATCH]';
    const provider = this.langchainProviders.get(providerName);

    if (!provider || !provider.available || !provider.langchainModel) {
      throw new Error(`Provider ${providerName} not available: ${provider?.reason || 'unknown'}`);
    }

    // Create LangChain model instance
    const llmModel = await provider.langchainModel(task);

    // Configure temperature if provided
    if (options.temperature !== undefined) {
      llmModel.temperature = options.temperature;
    }

    console.log(`📋 ${logPrefix} Configuring ${providerName} with maxConcurrency: ${llmModel.maxConcurrency || 'default'}`);

    // Create structured model using LangChain's OOTB method
    const structuredModelStartTime = Date.now();
    const structuredModel = llmModel.withStructuredOutput(schema, {
      name: `${task}_batch_structured_output`,
      includeRaw: false
    });
    const structuredModelDuration = Date.now() - structuredModelStartTime;
    console.log(`📊 ${logPrefix} Structured model created in ${structuredModelDuration}ms`);

    // Build messages arrays for each prompt
    const messagesBuildStartTime = Date.now();
    const messagesBatch = prompts.map(({ prompt, systemPrompt }) => {
      const messages = [];
      if (systemPrompt || options.systemPrompt) {
        messages.push(['system', systemPrompt || options.systemPrompt]);
      }
      messages.push(['human', prompt]);
      return messages;
    });
    const messagesBuildDuration = Date.now() - messagesBuildStartTime;
    console.log(`📊 ${logPrefix} Messages batch built in ${messagesBuildDuration}ms (${prompts.length} items)`);

    // Use LangChain's OOTB batch method with maxConcurrency
    // maxConcurrency is already configured in the model (set to 5)
    const maxConcurrency = llmModel.maxConcurrency || 5;
    console.log(`🚀 ${logPrefix} Starting LangChain .batch() call...`);
    const batchCallStartTime = Date.now();
    const results = await structuredModel.batch(messagesBatch, {
      maxConcurrency
    });
    const batchCallDuration = Date.now() - batchCallStartTime;

    console.log(`📊 ${logPrefix} LangChain .batch() completed in ${batchCallDuration}ms (${(batchCallDuration/1000).toFixed(1)}s)`);
    console.log(`   Items: ${messagesBatch.length}`);
    console.log(`   Concurrency: ${maxConcurrency}`);
    console.log(`   Avg per item: ${(batchCallDuration/messagesBatch.length).toFixed(0)}ms (${(batchCallDuration/messagesBatch.length/1000).toFixed(1)}s)`);

    // Validate and parse all results
    const parseStartTime = Date.now();
    const parsedResults = results.map(result => schema.parse(result));
    const parseDuration = Date.now() - parseStartTime;
    console.log(`📊 ${logPrefix} Schema validation completed in ${parseDuration}ms`);

    return parsedResults;
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
    const providerConfig = this.providers.get(providerName);

    if (!providerConfig) {
      throw new Error(`Provider ${providerName} not initialized`);
    }

    // Get the correct model for this provider
    const providerModel = getProviderModel(providerName, task || 'default');

    let result: any;
    let tokensUsed = 0;

    switch (providerName) {
      case 'gemini':
      case 'gemini-pro':
        result = await this.callGemini(providerConfig.apiKey, { ...config, model: providerModel }, prompt, options);
        tokensUsed = result.response?.usageMetadata?.totalTokenCount || 0;
        break;

      case 'openai':
        result = await this.callOpenAI(providerConfig.apiKey, { ...config, model: providerModel }, prompt, options);
        tokensUsed = result.usage?.total_tokens || 0;
        break;

      case 'anthropic':
        result = await this.callAnthropic(providerConfig.apiKey, { ...config, model: providerModel }, prompt, options);
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

  private async callGemini(apiKey: string, config: ModelConfig, prompt: string, options: GenerationOptions) {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const geminiInstance = new GoogleGenerativeAI(apiKey);

    const model = geminiInstance.getGenerativeModel({
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

  /**
   * Call Gemini with URL content
   * Fetches URL content first, then passes to Gemini for processing
   * (Gemini's fileUri only works with uploaded files, not direct URLs)
   */
  private async callGeminiWithUrl(apiKey: string, config: ModelConfig, url: string, prompt: string, options: GenerationOptions) {
    const axios = await import('axios');
    const cheerio = await import('cheerio');

    // Fetch URL content
    const response = await axios.default.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; PrepTalk/1.0; +https://preptalk.ai)'
      },
      timeout: 10000
    });

    // Parse HTML and extract text content
    const $ = cheerio.load(response.data);
    $('script, style, noscript').remove();
    const text = $('body').text().replace(/\s+/g, ' ').trim().substring(0, 50000);

    // Lazy-load Gemini SDK
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const geminiInstance = new GoogleGenerativeAI(apiKey);

    // Create model
    const model = geminiInstance.getGenerativeModel({
      model: config.model,
      generationConfig: {
        temperature: config.temperature,
        maxOutputTokens: config.maxTokens,
        topP: config.topP,
        responseMimeType: options.format === 'json' ? 'application/json' : 'text/plain'
      },
      systemInstruction: options.systemPrompt
    });

    // Pass extracted content to Gemini
    const fullPrompt = `${prompt}\n\nExtracted content from URL (${url}):\n\n${text}`;
    return await model.generateContent(fullPrompt);
  }

  private async callOpenAI(apiKey: string, config: ModelConfig, prompt: string, options: GenerationOptions) {
    const OpenAI = (await import('openai')).default;
    const openai = new OpenAI({ apiKey, maxRetries: 0 });

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
    if (options.format === 'json') requestParams.response_format = { type: 'json_object' };

    return await openai.chat.completions.create(requestParams);
  }

  private async callAnthropic(apiKey: string, config: ModelConfig, prompt: string, options: GenerationOptions) {
    const Anthropic = (await import('@anthropic-ai/sdk')).default;
    const anthropic = new Anthropic({ apiKey });

    const requestParams: any = {
      model: config.model,
      max_tokens: config.maxTokens,
      temperature: config.temperature,
      messages: [{ role: 'user', content: prompt }]
    };

    if (options.systemPrompt) requestParams.system = options.systemPrompt;
    if (config.topP) requestParams.top_p = config.topP;

    return await anthropic.messages.create(requestParams);
  }

  private extractContent(result: any, provider: string): string {
    switch (provider) {
      case 'gemini':
      case 'gemini-pro':
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
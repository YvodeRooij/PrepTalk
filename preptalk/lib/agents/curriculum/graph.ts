// LangGraph Curriculum Agent - v1.0 Implementation
// Using Command pattern for routing with pure function nodes

import { StateGraph } from '@langchain/langgraph';
import { createClient } from '@supabase/supabase-js';
import { CurriculumStateAnnotation, CurriculumState } from './state';
import { validateSchemaBeforeExecution } from './schema-validator';

// Import all pure function nodes
import {
  discoverSources,
  fetchSourceData,
  validateSources,
  mergeResearch
} from './nodes/discovery';
import {
  parseJob,
  analyzeRole
} from './nodes/research';
import {
  unifiedContextEngine
} from './nodes/unified-context-engine';
import {
  generateDynamicPersonas,
  generateStandardQuestions,
  generateCandidatePrep
} from './nodes/persona-generation';
import {
  designStructure,
  generateRounds,
  evaluateQualityWithRouting,
  refineRounds
} from './nodes/generation';
import {
  saveCurriculum
} from './nodes/persistence';

// Import LLM provider service
import { LLMProviderService } from '../../providers/llm-provider-service';
import { DEFAULT_LLM_CONFIG } from '../../config/llm-config';
import { loadLLMConfig } from '../../config/env-config';

// Cache validation results to avoid checking every time
let schemaValidationCache: { validated: boolean; timestamp: number } | null = null;
const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

export interface CurriculumAgentOptions {
  skipSchemaValidation?: boolean;
  forceSchemaValidation?: boolean; // Bypass cache
}

export class CurriculumAgent {
  private graph: ReturnType<typeof StateGraph.prototype.compile>;
  private initializationPromise: Promise<void> | null = null;
  private llmProvider: LLMProviderService;

  constructor(
    private supabase: ReturnType<typeof createClient>,
    apiKey: string,
    private options: CurriculumAgentOptions = {}
  ) {
    // Set API key for node functions to use
    process.env.GOOGLE_AI_API_KEY = apiKey;

    // Initialize LLM provider service with configuration
    const llmConfig = loadLLMConfig();
    this.llmProvider = new LLMProviderService(llmConfig);

    console.log(`🤖 LLM Provider initialized with: ${llmConfig.primaryProvider} (fallbacks: ${llmConfig.fallbackProviders.join(', ')})`);

    // Initialize asynchronously
    this.initializationPromise = this.initialize();
    this.graph = this.buildGraph();
  }

  private async initialize(): Promise<void> {
    // Skip validation if explicitly disabled
    if (this.options.skipSchemaValidation) {
      console.log('⚡ Schema validation skipped (skipSchemaValidation=true)');
      return;
    }

    // Check cache unless forced
    if (!this.options.forceSchemaValidation && schemaValidationCache) {
      const age = Date.now() - schemaValidationCache.timestamp;
      if (age < CACHE_DURATION_MS) {
        console.log('✅ Using cached schema validation (valid for', Math.round((CACHE_DURATION_MS - age) / 1000), 'more seconds)');
        return;
      }
    }

    try {
      // Run validation
      console.log('🔍 Validating database schema...');
      await validateSchemaBeforeExecution(this.supabase);

      // Cache successful validation
      schemaValidationCache = {
        validated: true,
        timestamp: Date.now()
      };
    } catch (error) {
      // In development, warn but continue
      if (process.env.NODE_ENV === 'development') {
        console.error('⚠️  Schema validation failed in development mode:');
        console.error(error);
        console.error('⚠️  Continuing anyway - fix schema issues before production!');
      } else {
        // In production, fail fast
        throw error;
      }
    }
  }

  private buildGraph() {
    const workflow = new StateGraph(CurriculumStateAnnotation)
      // Discovery Phase
      .addNode("discover_sources", (state) => this.wrapWithProvider(discoverSources)(state))
      .addNode("fetch_sources", (state) => this.wrapWithProvider(fetchSourceData)(state))
      .addNode("validate_sources", (state) => this.wrapWithProvider(validateSources)(state), { ends: ["merge_research", "fallback_research"] })
      .addNode("merge_research", (state) => this.wrapWithProvider(mergeResearch)(state))

      // Research Phase
      .addNode("parse_job", (state) => this.wrapWithProvider(parseJob)(state))
      .addNode("analyze_role", (state) => this.wrapWithProvider(analyzeRole)(state))

      // CRITICAL: Unified Context Engine - Synthesizes job + user + CV data
      .addNode("unified_context_engine", (state) => this.wrapWithProvider(unifiedContextEngine)(state))

      // NEW: Non-Technical Persona Generation Phase
      .addNode("generate_personas", (state) => this.wrapWithProvider(generateDynamicPersonas)(state))
      .addNode("generate_questions", (state) => this.wrapWithProvider(generateStandardQuestions)(state))
      .addNode("generate_prep_guides", (state) => this.wrapWithProvider(generateCandidatePrep)(state))

      // Generation Phase
      .addNode("design_structure", (state) => this.wrapWithProvider(designStructure)(state))
      .addNode("generate_rounds", (state) => this.wrapWithProvider(generateRounds)(state))
      .addNode("evaluate_quality", (state) => this.wrapWithProvider(evaluateQualityWithRouting)(state), { ends: ["save_curriculum", "refine_rounds"] })
      .addNode("refine_rounds", (state) => this.wrapWithProvider(refineRounds)(state))

      // Persistence Phase
      .addNode("save_curriculum", (state) => saveCurriculum(state, { supabase: this.supabase }))

      // Define the flow
      .addEdge("__start__", "discover_sources")
      .addEdge("discover_sources", "fetch_sources")
      .addEdge("fetch_sources", "validate_sources")
      // validate_sources uses Command to route to merge_research or fallback
      .addEdge("merge_research", "parse_job")
      .addEdge("parse_job", "analyze_role")
      // CRITICAL: Unified Context Engine synthesizes all inputs before persona generation
      .addEdge("analyze_role", "unified_context_engine")
      // NEW: Insert persona generation after unified context synthesis
      .addEdge("unified_context_engine", "generate_personas")
      .addEdge("generate_personas", "generate_questions")
      .addEdge("generate_questions", "generate_prep_guides")
      .addEdge("generate_prep_guides", "design_structure")
      .addEdge("design_structure", "generate_rounds")
      .addEdge("generate_rounds", "evaluate_quality")
      // evaluate_quality uses Command to route to save or refine
      .addEdge("refine_rounds", "evaluate_quality")
      .addEdge("save_curriculum", "__end__")

      // Add fallback node for when validation fails
      .addNode("fallback_research", this.fallbackResearch.bind(this))
      .addEdge("fallback_research", "parse_job");

    return workflow.compile();
  }

  /**
   * Wraps node functions with LLM provider service for multi-provider support
   */
  private wrapWithProvider<T extends (...args: any[]) => any>(nodeFunction: T): T {
    return (async (...args: Parameters<T>) => {
      const [state] = args;
      const enhancedConfig = {
        llmProvider: this.llmProvider
      };
      return await nodeFunction(state, enhancedConfig);
    }) as T;
  }

  // Fallback node for when source validation fails
  private async fallbackResearch(state: CurriculumState): Promise<Partial<CurriculumState>> {
    // Extract basic info from user input
    const isUrl = state.userInput.includes('http');
    const companyName = isUrl ? 'Unknown Company' : state.userInput.split(' ')[0];
    const roleTitle = isUrl ? 'Unknown Role' : state.userInput;

    // Create minimal required state for persona generation
    return {
      companyContext: {
        name: companyName,
        values: [],
        recent_news: [],
        interview_process: {
          typical_rounds: 3,
          common_interviewers: [],
          red_flags: [],
          green_flags: [],
        },
        confidence_score: 0.3,
      },
      jobData: {
        title: roleTitle,
        level: 'mid',
        department: 'General',
        location: 'Remote',
        description: `${roleTitle} position with standard responsibilities and requirements.`,
        requirements: ['Relevant experience', 'Strong communication skills', 'Team collaboration'],
        responsibilities: ['Execute on key projects', 'Collaborate with team members', 'Contribute to company goals'],
        confidence_score: 0.3,
      },
      competitiveIntelligence: {
        primaryCompetitors: ['Industry leaders'],
        roleComparison: 'Standard industry position with typical expectations',
        strategicAdvantages: ['Company culture', 'Growth opportunities'],
        recentDevelopments: ['Continued market presence'],
        competitivePositioning: 'Established market player with growth focus',
      },
      // Basic unified context for fallback scenarios
      unifiedContext: {
        strengthAmplifiers: ['Leverage analytical background for data-driven insights'],
        gapBridges: ['Connect previous experience to new role requirements'],
        confidenceBuilders: ['Frame career transition as strategic growth opportunity'],
        ciIntegrationStrategy: 'Weave company research naturally into responses about motivation and fit',
        personalizedApproach: 'Supportive coaching approach focusing on transferable skills and growth mindset'
      },
      warnings: [...(state.warnings || []), 'Using fallback research with limited data'],
    };
  }

  // Main execution method
  async generate(
    userInput: string,
    userProfile?: {
      // Rich text fields from form
      excitement?: string;
      concerns?: string;
      weakAreas?: string[];
      backgroundContext?: string;
      preparationGoals?: string;
      // Legacy support for old format
      focusArea?: string;
      concern?: string;
      background?: string;
    } | null,
    cvData?: {
      analysis?: any;
      insights?: any;
      matchScore?: number;
      uploadedAt?: string;
      processingModel?: string;
    } | null
  ): Promise<string> {
    // Ensure initialization is complete before running
    if (this.initializationPromise) {
      await this.initializationPromise;
      this.initializationPromise = null; // Clear after first run
    }

    const initialState: Partial<CurriculumState> = {
      userInput,
      userProfile: userProfile || null,
      cvData: cvData || null,
      startTime: Date.now(),
      discoveredSources: [],
      errors: [],
      warnings: [],
      refinementAttempts: 0,
    };

    const finalState = await this.graph.invoke(initialState);

    if (!finalState.curriculumId) {
      const errorMessage = finalState.errors?.join(', ') || 'Unknown error';
      const warnings = finalState.warnings?.join(', ');
      throw new Error(`Generation failed: ${errorMessage}${warnings ? ` (Warnings: ${warnings})` : ''}`);
    }

    return finalState.curriculumId;
  }
}
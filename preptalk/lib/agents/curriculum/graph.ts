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
      .addNode("discover_sources", discoverSources)
      .addNode("fetch_sources", fetchSourceData)
      .addNode("validate_sources", validateSources)
      .addNode("merge_research", mergeResearch)

      // Research Phase
      .addNode("parse_job", parseJob)
      .addNode("analyze_role", analyzeRole)

      // NEW: Non-Technical Persona Generation Phase
      .addNode("generate_personas", (state) => this.wrapWithProvider(generateDynamicPersonas)(state))
      .addNode("generate_questions", (state) => this.wrapWithProvider(generateStandardQuestions)(state))
      .addNode("generate_prep_guides", (state) => this.wrapWithProvider(generateCandidatePrep)(state))

      // Generation Phase
      .addNode("design_structure", designStructure)
      .addNode("generate_rounds", generateRounds)
      .addNode("evaluate_quality", evaluateQualityWithRouting)
      .addNode("refine_rounds", refineRounds)

      // Persistence Phase
      .addNode("save_curriculum", (state) => saveCurriculum(state, { supabase: this.supabase }))

      // Define the flow
      .addEdge("__start__", "discover_sources")
      .addEdge("discover_sources", "fetch_sources")
      .addEdge("fetch_sources", "validate_sources")
      // validate_sources uses Command to route to merge_research or fallback
      .addEdge("merge_research", "parse_job")
      .addEdge("parse_job", "analyze_role")
      // NEW: Insert persona generation after research, before curriculum design
      .addEdge("analyze_role", "generate_personas")
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
    // Create minimal company context from whatever data we have
    return {
      companyContext: {
        name: state.userInput.includes('http')
          ? 'Unknown Company'
          : state.userInput.split(' ')[0],
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
      warnings: [...(state.warnings || []), 'Using fallback research with limited data'],
    };
  }

  // Main execution method
  async generate(userInput: string): Promise<string> {
    // Ensure initialization is complete before running
    if (this.initializationPromise) {
      await this.initializationPromise;
      this.initializationPromise = null; // Clear after first run
    }

    const initialState: Partial<CurriculumState> = {
      userInput,
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
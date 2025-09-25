// LangGraph Curriculum Agent - v1.0 Implementation
// Using Command pattern for routing with pure function nodes

import { StateGraph } from '@langchain/langgraph';
import { createClient } from '@supabase/supabase-js';
import { CurriculumStateAnnotation, CurriculumState } from './state';

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
  designStructure,
  generateRounds,
  evaluateQualityWithRouting,
  refineRounds
} from './nodes/generation';
import {
  saveCurriculum
} from './nodes/persistence';

export class CurriculumAgent {
  private graph: ReturnType<typeof StateGraph.prototype.compile>;

  constructor(
    private supabase: ReturnType<typeof createClient>,
    apiKey: string
  ) {
    // Set API key for node functions to use
    process.env.GOOGLE_AI_API_KEY = apiKey;
    this.graph = this.buildGraph();
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
      .addEdge("analyze_role", "design_structure")
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
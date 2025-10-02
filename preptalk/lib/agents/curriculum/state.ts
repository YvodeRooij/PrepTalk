// Curriculum Agent State Schema
// Defines the data flow through the graph

import { Annotation } from '@langchain/langgraph';
import {
  ParsedJob,
  CompanyContext,
  RolePattern,
  CurriculumStructure,
  GeneratedRound,
} from './types';

// Import persona generation types
import type {
  InterviewerPersona,
  StandardQuestion,
  CandidatePrep,
  NonTechnicalRoundType
} from './nodes/persona-generation';

// Import CV analysis types
import type { CVAnalysis, CVInsights } from '../../schemas/cv-analysis';

// Import discovery types
import type {
  InterviewExperience,
  CompanyNews
} from './schemas';

// Define the state annotation for curriculum generation graph
export const CurriculumStateAnnotation = Annotation.Root({
  // Input
  userInput: Annotation<string>,  // Can be URL or text description
  inputType: Annotation<'url' | 'description' | 'company_role'>({
    default: () => 'url',
  }),
  userProfile: Annotation<{
    // NEW: Human-centered fields (preferred)
    excitement?: string;
    concerns?: string;
    weakAreas?: string[];
    backgroundContext?: string;
    preparationGoals?: string;

    // LEGACY: Keep existing for backwards compatibility
    focusArea?: 'career_transition' | 'leadership_stories' | 'technical_bridge' | 'industry_switch';
    concern?: 'industry_knowledge' | 'leadership_experience' | 'culture_fit' | 'role_complexity';
    background?: string;
  } | null>({
    default: () => null,
  }),

  // CV Analysis Data
  cvData: Annotation<{
    analysis: CVAnalysis | null;
    insights: CVInsights | null;
    matchScore?: number;
    uploadedAt?: string;
    processingModel?: string;
    cv_analysis_id?: string;  // Link to cv_analyses table
  } | null>({
    default: () => null,
  }),

  // 🆕 NEW: Mode control for CV-first progressive experience
  mode: Annotation<'cv_round_only' | 'full'>({
    default: () => 'full',
  }),
  existingCurriculumId: Annotation<string | null>({
    default: () => null,
  }),
  maxRounds: Annotation<number | undefined>({
    default: () => undefined,
  }),
  userId: Annotation<string | null>({
    default: () => null,
  }),

  // Unified Context Engine Output - Synthesis of all 3 inputs
  unifiedContext: Annotation<{
    strengthAmplifiers: string[];
    gapBridges: string[];
    confidenceBuilders: string[];
    ciIntegrationStrategy: string;
    personalizedApproach: string;
  } | null>({
    default: () => null,
  }),

  // Discovery Phase
  discoveredSources: Annotation<Array<{
    url: string;
    sourceType: 'official' | 'linkedin' | 'glassdoor' | 'aggregator' | 'other';
    trustScore: number;
    priority: 'core' | 'dynamic';
    data?: any;
    validation?: {
      isUseful: boolean;
      confidence: number;
    };
  }>>({
    // Merge sources by URL - replace existing sources when data is fetched
    reducer: (old, new_) => {
      const merged = [...old];
      new_.forEach(newSource => {
        const existingIndex = merged.findIndex(s => s.url === newSource.url);
        if (existingIndex >= 0) {
          // Replace existing source (e.g., when adding data from fetch)
          merged[existingIndex] = { ...merged[existingIndex], ...newSource };
        } else {
          // Add new source (e.g., during discovery)
          merged.push(newSource);
        }
      });
      return merged;
    },
    default: () => [],
  }),

  // Research Phase Outputs
  jobData: Annotation<ParsedJob>,
  companyContext: Annotation<CompanyContext>,
  rolePatterns: Annotation<RolePattern>,
  marketIntelligence: Annotation<{
    salaryRange: string;
    difficultyRating: string;
    preparationTime: string;
    keyInsights: string[];
    // NEW: Enhanced competitive intelligence
    competitiveContext?: string;
    marketTrends?: string[];
  }>,

  // NEW: Competitive Intelligence Phase Output
  competitiveIntelligence: Annotation<{
    primaryCompetitors: string[];
    roleComparison: string;
    strategicAdvantages: string[];
    recentDevelopments: string[];
    competitivePositioning: string;
    differentiators?: string[];
    marketContext?: string;
  }>,

  // NEW: Intelligent Discovery Data (from cache-aware discovery)
  interviewExperiences: Annotation<InterviewExperience[]>({
    default: () => [],
  }),
  companyNews: Annotation<CompanyNews[]>({
    default: () => [],
  }),
  discoveryMetadata: Annotation<{
    cacheHit?: boolean;
    latencyMs?: number;
    searchQueries?: Record<string, string>;
    groundingMetadata?: any;
  } | null>({
    default: () => null,
  }),

  // NEW: Non-Technical Persona Generation Phase Outputs
  generatedPersonas: Annotation<InterviewerPersona[]>({
    reducer: (old, new_) => new_ ?? old ?? [],
    default: () => [],
  }),
  standardQuestionSets: Annotation<Record<NonTechnicalRoundType, StandardQuestion[]>>({
    reducer: (old, new_) => ({ ...old, ...new_ }),
    default: () => ({} as Record<NonTechnicalRoundType, StandardQuestion[]>),
  }),
  candidatePrepGuides: Annotation<Record<NonTechnicalRoundType, CandidatePrep>>({
    reducer: (old, new_) => ({ ...old, ...new_ }),
    default: () => ({} as Record<NonTechnicalRoundType, CandidatePrep>),
  }),

  // Curriculum Phase Outputs
  structure: Annotation<CurriculumStructure>,
  rounds: Annotation<GeneratedRound[]>({
    reducer: (old, new_) => {
      // Smart merge for refinements
      if (!old || old.length === 0) return new_;
      const map = new Map(old.map(r => [r.round_number, r]));
      new_.forEach(r => map.set(r.round_number, r));
      return Array.from(map.values()).sort((a, b) => a.round_number - b.round_number);
    },
    default: () => [],
  }),

  // Quality & Control
  quality: Annotation<number>({
    reducer: (_, new_) => new_,
    default: () => 0,
  }),
  refinementAttempts: Annotation<number>({
    reducer: (old) => old + 1,
    default: () => 0,
  }),

  // Final Output
  curriculumId: Annotation<string>,

  // Metadata
  errors: Annotation<string[]>({
    reducer: (old, new_) => [...old, ...new_],
    default: () => [],
  }),
  warnings: Annotation<string[]>({
    reducer: (old, new_) => [...old, ...new_],
    default: () => [],
  }),
  startTime: Annotation<number>,
  endTime: Annotation<number>,

  // Tracking
  currentStep: Annotation<string>({
    reducer: (_, new_) => new_,
    default: () => 'initializing',
  }),
  progress: Annotation<number>({
    reducer: (_, new_) => new_,
    default: () => 0,
  }),
});

// Export the state type for use in nodes
export type CurriculumState = typeof CurriculumStateAnnotation.State;
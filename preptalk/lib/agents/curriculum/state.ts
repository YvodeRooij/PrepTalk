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
    reducer: (old, new_) => [...old, ...new_],
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
  }>,

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
// Zod Schemas for Curriculum System - OOTB Structured Outputs
// Replaces TypeScript interfaces with validated schemas

import { z } from 'zod';

// Enums
export const NonTechnicalRoundTypeEnum = z.enum([
  'recruiter_screen',
  'behavioral_deep_dive',
  'culture_values_alignment',
  'strategic_role_discussion',
  'executive_final'
]);

export const QuestionCategoryEnum = z.enum([
  'motivation',
  'behavioral',
  'cultural',
  'strategic'
]);

// Core curriculum schemas
export const InterviewerPersonaSchema = z.object({
  id: z.string().describe('Unique identifier for the persona'),
  round_number: z.number().int().min(1).max(5).describe('Interview round number'),
  round_type: NonTechnicalRoundTypeEnum.describe('Type of interview round'),
  identity: z.object({
    name: z.string().min(1).describe('Full name of the interviewer'),
    role: z.string().min(1).describe('Job title and company'),
    tenure_years: z.number().int().min(1).max(15).describe('Years at the company'),
    personality_traits: z.array(z.string()).min(2).max(5).describe('Key personality traits')
  }).describe('Interviewer identity information'),
  knowledge_base: z.object({
    strategic_advantages: z.array(z.string()).min(1).max(3).describe('Company strategic advantages'),
    recent_developments: z.array(z.string()).min(1).max(3).describe('Recent company developments'),
    competitive_context: z.string().min(1).describe('Understanding of competitive landscape')
  }).describe('Interviewer knowledge base')
});

export const StandardQuestionSchema = z.object({
  id: z.string().describe('Unique question identifier'),
  text: z.string().min(10).describe('The interview question text'),
  category: QuestionCategoryEnum.describe('Question category'),
  follow_ups: z.array(z.string()).max(3).describe('Follow-up questions'),
  time_allocation_minutes: z.number().int().min(2).max(10).describe('Recommended time allocation')
});

export const CandidatePrepSchema = z.object({
  ci_talking_points: z.object({
    strategic_advantages: z.array(z.object({
      advantage: z.string().describe('Strategic advantage'),
      how_to_weave_in: z.string().describe('How to naturally mention this'),
      example_response: z.string().describe('Example response incorporating this advantage')
    })).max(3).describe('Strategic advantages talking points'),
    recent_developments: z.array(z.object({
      development: z.string().describe('Recent development'),
      relevance_to_role: z.string().describe('Why this matters for the role'),
      conversation_starters: z.array(z.string()).max(3).describe('Natural conversation starters')
    })).max(3).describe('Recent developments talking points')
  }).describe('Competitive intelligence talking points'),
  recognition_training: z.object({
    what_great_answers_sound_like: z.array(z.string()).max(5).describe('Indicators of great answers'),
    how_to_demonstrate_company_knowledge: z.array(z.string()).max(5).describe('Ways to show company knowledge')
  }).describe('Recognition training guidance')
});

// Enhanced role analysis schema (for research node)
export const EnhancedRoleAnalysisSchema = z.object({
  typical_rounds: z.number().int().min(2).max(8).describe('Typical number of interview rounds'),
  focus_areas: z.array(z.string()).min(2).max(8).describe('Key focus areas for this role'),
  interview_formats: z.array(z.string()).describe('Interview formats'),
  similar_roles: z.array(z.string()).describe('Similar role titles'),
  company_insights: z.array(z.string()).describe('Company-specific insights'),
  salary_intelligence: z.string().describe('Salary information'),
  interview_difficulty: z.string().describe('Interview difficulty rating'),
  preparation_recommendations: z.array(z.string()).describe('Preparation recommendations'),
  competitive_intelligence: z.object({
    primary_competitors: z.array(z.string()).describe('Primary competitors'),
    role_comparison: z.string().describe('Role comparison analysis'),
    strategic_advantages: z.array(z.string()).describe('Strategic advantages'),
    recent_developments: z.array(z.string()).describe('Recent developments'),
    competitive_positioning: z.string().describe('Competitive positioning'),
    market_context: z.object({
      competitive_salary_context: z.string().describe('Salary context'),
      market_trends: z.array(z.string()).describe('Market trends')
    }).optional()
  }).optional()
});

// Job parsing schema
export const JobDataSchema = z.object({
  title: z.string().min(1).describe('Job title'),
  company_name: z.string().min(1).describe('Company name'),
  level: z.string().describe('Job level (e.g., Senior, Lead, Director)'),
  department: z.string().optional().describe('Department or team'),
  location: z.string().optional().describe('Job location'),
  requirements: z.array(z.string()).optional().describe('Key requirements'),
  responsibilities: z.array(z.string()).optional().describe('Key responsibilities'),
  url: z.string().optional().describe('Original job posting URL')
});

// Company context schema
export const CompanyContextSchema = z.object({
  name: z.string().min(1).describe('Company name'),
  industry: z.string().min(1).describe('Industry sector'),
  size: z.string().optional().describe('Company size'),
  values: z.array(z.string()).min(1).max(8).describe('Company values'),
  culture_highlights: z.array(z.string()).max(5).describe('Key cultural highlights'),
  recent_news: z.array(z.string()).max(3).describe('Recent company news or developments')
});

// Competitive intelligence schema
export const CompetitiveIntelligenceSchema = z.object({
  strategicAdvantages: z.array(z.string()).min(1).max(5).describe('Strategic competitive advantages'),
  recentDevelopments: z.array(z.string()).min(1).max(5).describe('Recent company developments'),
  competitivePositioning: z.string().min(1).describe('How company positions vs competitors'),
  roleComparison: z.string().min(1).describe('How this role compares to competitors'),
  marketContext: z.string().optional().describe('Broader market context')
});

// Additional schemas for research and generation nodes
export const ParsedJobSchema = z.object({
  title: z.string().min(1).describe('Job title'),
  company_name: z.string().min(1).describe('Company name'),
  level: z.enum(['intern', 'entry', 'junior', 'mid', 'senior', 'lead', 'principal', 'staff', 'executive']).describe('Job level'),
  responsibilities: z.array(z.string()).describe('Key responsibilities'),
  required_skills: z.array(z.string()).describe('Must-have skills'),
  preferred_skills: z.array(z.string()).describe('Nice-to-have skills'),
  experience_level: z.string().describe('Years of experience required'),
  location: z.string().describe('Job location'),
  work_arrangement: z.enum(['onsite', 'remote', 'hybrid']).describe('Work arrangement'),
  source_url: z.string().optional().describe('Source URL'),
  raw_description: z.string().optional().describe('Raw job description'),
  parsing_confidence: z.number().optional().describe('Parsing confidence score'),
  extraction_timestamp: z.string().optional().describe('When job was parsed'),
  id: z.string().optional().describe('Job ID')
});

export const RoundDefinitionSchema = z.object({
  round_number: z.number().int().describe('Round number'),
  type: z.string().describe('Round type'),
  title: z.string().describe('Round title'),
  focus_areas: z.array(z.string()).describe('Focus areas'),
  duration_minutes: z.number().int().describe('Duration in minutes')
});

export const StructureResponseSchema = z.object({
  total_rounds: z.number().int().describe('Total number of rounds'),
  difficulty_level: z.enum(['beginner', 'intermediate', 'advanced', 'expert']).describe('Difficulty level'),
  rounds: z.array(RoundDefinitionSchema).describe('Round definitions')
});

export const InterviewerPersonaGenerationSchema = z.object({
  name: z.string().describe('Interviewer name'),
  role: z.string().describe('Interviewer role'),
  personality: z.string().describe('Personality traits'),
  communication_style: z.string().describe('Communication style'),
  goal: z.string().describe('Interview goal')
});

export const TopicSchema = z.object({
  topic: z.string().describe('Topic name'),
  subtopics: z.array(z.string()).optional().nullable().describe('Subtopics'),
  depth: z.enum(['basic', 'intermediate', 'advanced']).optional().nullable().describe('Topic depth'),
  time_allocation: z.number().int().optional().nullable().describe('Time allocation'),
  must_cover: z.boolean().optional().nullable().describe('Must cover flag'),
  question_count: z.number().int().optional().nullable().describe('Question count'),
  difficulty_progression: z.string().optional().nullable().describe('Difficulty progression'),
  questions: z.array(z.object({
    text: z.string().describe('Question text'),
    difficulty: z.string().optional().nullable().describe('Question difficulty'),
    expected_duration: z.number().optional().nullable().describe('Expected duration')
  })).optional().nullable().describe('Questions for topic')
});

export const EvaluationCriteriaSchema = z.object({
  criterion: z.string().describe('Evaluation criterion'),
  weight: z.number().describe('Criterion weight'),
  rubric: z.string().describe('Evaluation rubric')
});

export const RoundContentResponseSchema = z.object({
  interviewer_persona: InterviewerPersonaGenerationSchema.describe('Interviewer persona'),
  topics: z.array(TopicSchema).optional().nullable().describe('Interview topics'),
  evaluation_criteria: z.array(EvaluationCriteriaSchema).optional().nullable().describe('Evaluation criteria'),
  sample_questions: z.array(z.object({
    text: z.string().describe('Question text'),
    difficulty: z.string().optional().nullable().describe('Question difficulty'),
    expected_duration: z.number().optional().nullable().describe('Expected duration')
  })).optional().nullable().describe('Sample questions'),
  opening_script: z.string().optional().nullable().describe('Opening script'),
  closing_script: z.string().optional().nullable().describe('Closing script')
});

export const QualityEvaluationSchema = z.object({
  overall_score: z.number().int().min(0).max(100).describe('Overall quality score 0-100'),
  weak_areas: z.array(z.string()).describe('Areas needing improvement'),
  strengths: z.array(z.string()).optional().describe('Strong areas'),
  recommendations: z.array(z.string()).optional().describe('Improvement recommendations')
});

// Collection schemas for multiple items
export const PersonaCollectionSchema = z.array(InterviewerPersonaSchema).min(3).max(5);

export const QuestionSetsSchema = z.record(
  NonTechnicalRoundTypeEnum,
  z.array(StandardQuestionSchema).min(4).max(8)
);

export const PrepGuidesSchema = z.record(
  NonTechnicalRoundTypeEnum,
  CandidatePrepSchema
);

// Type inference for TypeScript
export type InterviewerPersona = z.infer<typeof InterviewerPersonaSchema>;
export type StandardQuestion = z.infer<typeof StandardQuestionSchema>;
export type CandidatePrep = z.infer<typeof CandidatePrepSchema>;
export type EnhancedRoleAnalysis = z.infer<typeof EnhancedRoleAnalysisSchema>;
export type JobData = z.infer<typeof JobDataSchema>;
export type CompanyContext = z.infer<typeof CompanyContextSchema>;
export type CompetitiveIntelligence = z.infer<typeof CompetitiveIntelligenceSchema>;
export type NonTechnicalRoundType = z.infer<typeof NonTechnicalRoundTypeEnum>;
export type QuestionCategory = z.infer<typeof QuestionCategoryEnum>;

// Additional type exports
export type ParsedJob = z.infer<typeof ParsedJobSchema>;
export type StructureResponse = z.infer<typeof StructureResponseSchema>;
export type RoundDefinition = z.infer<typeof RoundDefinitionSchema>;
export type RoundContentResponse = z.infer<typeof RoundContentResponseSchema>;
export type QualityEvaluation = z.infer<typeof QualityEvaluationSchema>;
export type Topic = z.infer<typeof TopicSchema>;
export type EvaluationCriteria = z.infer<typeof EvaluationCriteriaSchema>;

// Collection types
export type PersonaCollection = z.infer<typeof PersonaCollectionSchema>;
export type QuestionSets = z.infer<typeof QuestionSetsSchema>;
export type PrepGuides = z.infer<typeof PrepGuidesSchema>;
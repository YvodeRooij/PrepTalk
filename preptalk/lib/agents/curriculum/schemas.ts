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
  }).describe('Recognition training guidance'),
  standard_questions_prep: z.array(z.object({
    question: z.string().describe('Standard interview question'),
    why_asked: z.string().describe('Why interviewers ask this question'),
    approach: z.string().describe('How to approach answering'),
    key_points: z.array(z.string()).max(4).describe('Key points to cover')
  })).max(5).describe('Standard questions preparation guide')
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
  strengths: z.array(z.string()).default([]).describe('Strong areas'),
  recommendations: z.array(z.string()).default([]).describe('Improvement recommendations')
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

// Discovery Topic Schemas (Phase 1)
// Used with LangChain's withStructuredOutput() for 100% parsing accuracy

/**
 * Schema for competitor company information
 * Used to capture competitive intelligence during discovery
 * Note: Using string() instead of url() for OpenAI compatibility
 */
export const CompetitorSchema = z.object({
  name: z.string().min(1).describe('Competitor company name'),
  url: z.string().min(1).describe('Competitor website or careers page URL (must start with https://)'),
  industry: z.string().min(1).describe('Industry sector or vertical'),
  size: z.string().nullable().optional().describe('Company size (e.g., "Enterprise (10,000+ employees)", "Startup (50-200 employees)")'),
  differentiators: z.array(z.string()).nullable().optional().describe('Key competitive advantages or differentiators')
});

/**
 * Schema for individual interview round details
 * Nested within InterviewExperienceSchema
 */
export const InterviewRoundDetailSchema = z.object({
  round_name: z.string().min(1).describe('Name or type of interview round (e.g., "Technical Screen", "Behavioral")'),
  duration_minutes: z.number().int().min(0).nullable().optional().describe('Duration of the round in minutes'),
  format: z.string().nullable().optional().describe('Interview format (e.g., "Phone", "Video", "Onsite", "Take-home")'),
  focus_areas: z.array(z.string()).nullable().optional().describe('Topics or areas of focus for this round')
});

/**
 * Schema for interview experience data from platforms like Glassdoor, Blind, etc.
 * Captures real candidate experiences to inform preparation
 * Note: Using string() instead of url() for OpenAI compatibility
 */
export const InterviewExperienceSchema = z.object({
  source_url: z.string().min(1).describe('Source URL from Glassdoor, Blind, LeetCode, or other platforms (must start with https://)'),
  date_posted: z.string().nullable().optional().describe('Date when the experience was posted'),
  role: z.string().nullable().optional().describe('Job role or title for the interview'),
  outcome: z.string().nullable().optional().describe('Interview outcome (e.g., "Offer received", "Rejected", "No response")'),
  overall_difficulty: z.string().nullable().optional().describe('Overall difficulty rating (e.g., "Easy", "Medium", "Hard")'),
  rounds: z.array(InterviewRoundDetailSchema).nullable().optional().describe('Details of individual interview rounds'),
  preparation_tips: z.array(z.string()).nullable().optional().describe('Preparation tips from the candidate'),
  key_insights: z.array(z.string()).nullable().optional().describe('Key insights or observations from the experience')
});

/**
 * Schema for company news articles
 * Used to track recent developments, funding, product launches, etc.
 * Note: Using string() instead of url() for OpenAI compatibility
 */
export const CompanyNewsSchema = z.object({
  title: z.string().min(1).describe('News article headline or title'),
  url: z.string().min(1).describe('URL to the full news article (must start with https://)'),
  summary: z.string().nullable().optional().describe('Brief summary of the news content'),
  date_published: z.string().nullable().optional().describe('Publication date of the article'),
  relevance_score: z.number().min(0).max(1).nullable().optional().describe('Relevance score from 0-1 indicating importance to role/company'),
  sentiment: z.enum(['positive', 'neutral', 'negative']).nullable().optional().describe('Sentiment of the news (positive, neutral, or negative)'),
  source: z.string().nullable().optional().describe('News source or publisher (e.g., "TechCrunch", "Bloomberg")')
});

// Collection schemas with appropriate min/max constraints
export const CompetitorCollectionSchema = z.array(CompetitorSchema).min(1).max(5);
export const InterviewExperienceCollectionSchema = z.array(InterviewExperienceSchema).min(1).max(10);
export const CompanyNewsCollectionSchema = z.array(CompanyNewsSchema).min(1).max(6);

// Collection types
export type PersonaCollection = z.infer<typeof PersonaCollectionSchema>;
export type QuestionSets = z.infer<typeof QuestionSetsSchema>;
export type PrepGuides = z.infer<typeof PrepGuidesSchema>;

// Discovery topic types
export type Competitor = z.infer<typeof CompetitorSchema>;
export type InterviewRoundDetail = z.infer<typeof InterviewRoundDetailSchema>;
export type InterviewExperience = z.infer<typeof InterviewExperienceSchema>;
export type CompanyNews = z.infer<typeof CompanyNewsSchema>;
export type CompetitorCollection = z.infer<typeof CompetitorCollectionSchema>;
export type InterviewExperienceCollection = z.infer<typeof InterviewExperienceCollectionSchema>;
export type CompanyNewsCollection = z.infer<typeof CompanyNewsCollectionSchema>;
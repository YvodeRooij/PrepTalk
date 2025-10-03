// Curriculum Agent Types with Enhanced Quality & Tracking

// NEW: Enhanced Competitive Intelligence Types
export interface CompetitiveIntelligence {
  primaryCompetitors: string[];
  roleComparison: string;
  strategicAdvantages: string[];
  recentDevelopments: string[];
  competitivePositioning: string;
}

export interface EnhancedMarketIntelligence {
  salaryRange: string;
  difficultyRating: string;
  preparationTime: string;
  keyInsights: string[];
  // NEW enhanced fields
  competitiveContext?: string;
  marketTrends?: string[];
}

// Database storage interface for role intelligence
export interface RoleIntelligence {
  role_vs_competitors: string | null;
  recent_role_developments: string[];
  strategic_advantages: string[];
  market_context: {
    salary_range: string | null;
    difficulty_rating: string | null;
    preparation_time: string | null;
    key_insights: string[];
  };
  competitive_positioning: string | null;
  generated_at: string | null;
}

export interface JobInput {
  url?: string;
  description?: string;
  userId: string;
  companyName?: string;
  jobTitle?: string;
}

export interface ParsedJob {
  id?: string;
  title: string;
  company_name: string;
  department?: string;
  team?: string;
  level: 'intern' | 'entry' | 'junior' | 'mid' | 'senior' | 'lead' | 'principal' | 'staff' | 'executive';
  responsibilities: string[];
  required_skills: string[];
  preferred_skills: string[];
  experience_level: string;
  location?: string;
  work_arrangement?: 'onsite' | 'remote' | 'hybrid';
  salary_min?: number;
  salary_max?: number;
  source_url?: string;
  raw_description: string;
  parsing_confidence: number; // 0-1
  extraction_timestamp: string;
}

export interface CompanyContext {
  id?: string;
  name: string;
  mission?: string;
  vision?: string;
  values: string[];
  culture_notes?: string;
  recent_news: Array<{
    title: string;
    url: string;
    date: string;
    summary: string;
  }>;
  interview_process?: {
    typical_rounds?: number;
    average_duration_days?: number;
    common_interviewers: string[];
    red_flags: string[];
    green_flags: string[];
  };
  known_patterns?: InterviewPattern[];
  confidence_score: number;
}

export interface InterviewPattern {
  type: 'common_question' | 'process_step' | 'evaluation_focus' | 'red_flag' | 'success_factor';
  description: string;
  frequency: number; // 0-1
  examples: string[];
  context?: string;
}

export interface RolePattern {
  similar_roles: string[];
  typical_rounds: number;
  focus_areas: string[];
  interview_formats: string[];
}

export interface CurriculumStructure {
  job_id: string;
  total_rounds: number;
  estimated_total_minutes: number;
  difficulty_level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  rounds: RoundDefinition[];
  generation_strategy: 'comprehensive' | 'focused' | 'adaptive';
  refinement_iterations: number; // Track how many times we refined
}

export interface RoundDefinition {
  round_number: number;
  type: RoundType;
  title: string;
  duration_minutes: number;
  focus_areas: string[];
  prerequisite_rounds?: number[];
  is_eliminatory: boolean; // Critical rounds that can end the process
}

export type RoundType =
  // Non-technical persona-based rounds (new system)
  | 'recruiter_screen'
  | 'behavioral_deep_dive'
  | 'culture_values_alignment'
  | 'strategic_role_discussion'
  | 'executive_final'
  // Legacy technical rounds (kept for backwards compatibility)
  | 'phone_screen'
  | 'technical_screen'
  | 'coding'
  | 'system_design'
  | 'behavioral'
  | 'culture_fit'
  | 'case_study'
  | 'presentation'
  | 'final';

export interface InterviewerPersona {
  name: string;
  role: string;
  personality: string;
  communication_style: 'direct' | 'conversational' | 'challenging' | 'supportive';
  pace: 'slow' | 'moderate' | 'fast';
  goal: string;
  typical_questions_style?: string;
  red_flags_they_watch_for?: string[];
}

export interface RoundTopic {
  topic: string;
  subtopics: string[];
  depth: 'basic' | 'intermediate' | 'advanced';
  time_allocation: number; // minutes
  must_cover: boolean;
  question_count: number;
  difficulty_progression?: 'constant' | 'ascending' | 'mixed';
}

export interface EvaluationCriterion {
  id: string;
  name: string;
  description: string;
  weight: number; // 0-1, should sum to 1 across all criteria
  scoring_rubric: {
    excellent: string;
    good: string;
    needs_improvement: string;
    unacceptable?: string;
  };
  behavioral_indicators?: string[];
  anti_patterns?: string[];
}

export interface GeneratedRound {
  curriculum_round_id?: string;
  round_number: number;
  round_type: RoundType;
  title: string;
  description: string;
  duration_minutes: number;
  interviewer_persona: InterviewerPersona;
  topics_to_cover: RoundTopic[];
  evaluation_criteria: EvaluationCriterion[];
  sample_questions: Question[];
  opening_script: string;
  closing_script: string;
  passing_score: number;
  quality_score?: RoundQualityMetrics;
}

export interface Question {
  id: string;
  text: string;
  type: 'technical' | 'behavioral' | 'situational' | 'case' | 'trivia';
  difficulty: 'easy' | 'medium' | 'hard';
  category: string;
  is_required: boolean;
  follow_ups: string[];
  expected_answer_points: string[];
  red_flag_answers?: string[];
  excellent_answer_example?: string;
}

// Enhanced Quality Metrics
export interface RoundQualityMetrics {
  relevance_score: number; // 0-1, how well it matches job requirements
  difficulty_appropriateness: number; // 0-1
  coverage_score: number; // 0-1, topic coverage
  coherence_score: number; // 0-1, logical flow
  discrimination_power: number; // 0-1, ability to differentiate candidates
}

export interface CurriculumQualityMetrics {
  overall_score: number; // 0-100
  completeness_score: number; // 0-1
  relevance_score: number; // 0-1
  difficulty_balance: number; // 0-1
  progression_logic: number; // 0-1
  estimated_effectiveness: number; // 0-1
  confidence_level: 'low' | 'medium' | 'high';
  improvement_suggestions?: string[];
}

export interface GeneratedCurriculum {
  id?: string;
  job_id: string;
  version: number;
  title: string;
  overview: string;
  learning_objectives: string[];
  structure: CurriculumStructure;
  rounds: GeneratedRound[];
  quality_metrics: CurriculumQualityMetrics;
  generation_metadata: GenerationMetadata;
  recommended_preparation?: PreparationGuide;
}

export interface PreparationGuide {
  estimated_prep_hours: number;
  key_topics_to_study: Array<{
    topic: string;
    priority: 'critical' | 'important' | 'nice_to_have';
    resources: string[];
  }>;
  mock_interview_suggestions: number;
  weak_area_focus?: string[];
}

export interface GenerationMetadata {
  model: string;
  model_version: string;
  generation_timestamp: string;
  generation_duration_ms: number;
  total_tokens_used?: number;
  generation_cost_cents?: number;
  retry_count: number;
  error_recovery_actions?: string[];
  confidence_factors: {
    job_parsing: number;
    company_research: number;
    curriculum_design: number;
  };
}

// Error Handling
export interface GenerationError {
  step: 'parsing' | 'research' | 'structure' | 'round_generation' | 'quality_check';
  error_type: string;
  message: string;
  recoverable: boolean;
  retry_attempt: number;
  timestamp: string;
  context?: any;
}

export interface GenerationResult {
  success: boolean;
  curriculum?: GeneratedCurriculum;
  errors?: GenerationError[];
  warnings?: string[];
  generation_id: string;
  total_duration_ms: number;
}

// Agent Configuration
export interface AgentConfig {
  max_retries: number;
  retry_delay_ms: number;
  max_refinement_loops: number;
  quality_threshold: number; // Minimum quality score to accept
  timeout_ms: number;
  model_config: {
    parsing_model: string;
    research_model: string;
    generation_model: string;
    temperature: number;
    max_tokens?: number;
  };
  feature_flags: {
    enable_company_research: boolean;
    enable_pattern_detection: boolean;
    enable_quality_refinement: boolean;
    enable_preparation_guide: boolean;
  };
}

// Progress Tracking for Real-time Updates
export interface GenerationProgress {
  generation_id: string;
  current_step: string;
  steps_completed: number;
  total_steps: number;
  progress_percentage: number;
  current_action?: string;
  estimated_time_remaining_seconds?: number;
  logs: Array<{
    timestamp: string;
    level: 'info' | 'warning' | 'error';
    message: string;
  }>;
}

// Comprehensive Error Handling Utilities for LangGraph Curriculum Agent
// Implements LangGraph best practices for production-ready error handling

import { CurriculumState } from '../state';
import type { ParsedJob, CompanyContext, RolePattern } from '../types';

// Environment validation following LangGraph patterns
export class EnvironmentError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'EnvironmentError';
  }
}

export function validateEnvironment(): void {
  const required = {
    GOOGLE_API_KEY: process.env.GOOGLE_AI_API_KEY,
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
  };

  const missing = Object.entries(required)
    .filter(([_, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    throw new EnvironmentError(
      `Missing required environment variables: ${missing.join(', ')}`,
      'ENV_MISSING'
    );
  }
}

// Enhanced JSON parsing with multiple fallback strategies
export function safeParseJson<T>(
  raw: string,
  context: string,
  fallbackValue?: T
): T | null {
  let text = raw.trim();

  // Remove markdown code blocks
  text = text.replace(/^```(?:json)?\\s*/i, '').replace(/```$/i, '').trim();

  // Try to find the first complete JSON object
  let startIndex = text.indexOf('{');
  if (startIndex !== -1) {
    let braceCount = 0;
    let endIndex = startIndex;

    for (let i = startIndex; i < text.length; i++) {
      if (text[i] === '{') braceCount++;
      if (text[i] === '}') braceCount--;
      if (braceCount === 0) {
        endIndex = i;
        break;
      }
    }

    if (braceCount === 0) {
      text = text.substring(startIndex, endIndex + 1);
    }
  }

  try {
    const parsed = JSON.parse(text) as T;
    return parsed;
  } catch (error) {
    console.warn(`JSON parsing failed for ${context}:`, {
      rawResponse: raw.substring(0, 300),
      cleanedText: text.substring(0, 200),
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    // Return fallback if provided, otherwise null
    return fallbackValue ?? null;
  }
}

// Safe property access with defaults (prevents TypeError on undefined.join())
export function safeArrayJoin(arr: string[] | null | undefined, separator = ', '): string {
  if (!Array.isArray(arr) || arr.length === 0) return 'None listed';
  return arr.join(separator);
}

export function safeStringAccess(value: string | null | undefined, fallback = 'Not specified'): string {
  if (typeof value === 'string' && value.trim()) return value;
  return fallback;
}

// Fallback data structure generators following LangGraph patterns
export function createFallbackJobData(partial: Partial<ParsedJob> = {}): ParsedJob {
  return {
    id: partial.id || `fallback-job-${Date.now()}`,
    title: partial.title || 'Unknown Role',
    company_name: partial.company_name || 'Unknown Company',
    level: partial.level || 'mid',
    responsibilities: partial.responsibilities || [],
    required_skills: partial.required_skills || [],
    preferred_skills: partial.preferred_skills || [],
    experience_level: partial.experience_level || 'Not specified',
    location: partial.location || 'Not specified',
    work_arrangement: partial.work_arrangement || 'remote',
    raw_description: partial.raw_description || 'Fallback job data due to parsing failure',
    parsing_confidence: partial.parsing_confidence || 0.1,
    extraction_timestamp: partial.extraction_timestamp || new Date().toISOString()
  };
}

export function createFallbackCompanyContext(partial: Partial<CompanyContext> = {}): CompanyContext {
  return {
    id: partial.id,
    name: partial.name || 'Unknown Company',
    mission: partial.mission,
    vision: partial.vision,
    values: partial.values || ['Innovation', 'Excellence'],
    culture_notes: partial.culture_notes,
    recent_news: partial.recent_news || [],
    interview_process: partial.interview_process || {
      typical_rounds: 4,
      average_duration_days: 14,
      common_interviewers: [],
      red_flags: [],
      green_flags: ['Standard interview process']
    },
    known_patterns: partial.known_patterns || [],
    confidence_score: partial.confidence_score || 0.1
  };
}

export function createFallbackRolePatterns(partial: Partial<RolePattern> = {}): RolePattern {
  return {
    similar_roles: partial.similar_roles || ['Similar Professional Role'],
    typical_rounds: partial.typical_rounds || 4,
    focus_areas: partial.focus_areas || ['General skills assessment'],
    interview_formats: partial.interview_formats || ['behavioral', 'technical']
  };
}

// Enhanced state validation and correction
export function validateAndCorrectState(state: Partial<CurriculumState>): CurriculumState {
  const corrected = { ...state } as CurriculumState;

  // Ensure all required arrays exist and are arrays
  if (!corrected.errors || !Array.isArray(corrected.errors)) {
    corrected.errors = [];
  }
  if (!corrected.warnings || !Array.isArray(corrected.warnings)) {
    corrected.warnings = [];
  }
  if (!corrected.discoveredSources || !Array.isArray(corrected.discoveredSources)) {
    corrected.discoveredSources = [];
  }

  // Ensure basic state properties
  if (!corrected.currentStep) corrected.currentStep = 'error_recovery';
  if (typeof corrected.progress !== 'number') corrected.progress = 0;
  if (typeof corrected.refinementAttempts !== 'number') corrected.refinementAttempts = 0;
  if (typeof corrected.quality !== 'number') corrected.quality = 0;
  if (!corrected.startTime) corrected.startTime = Date.now();

  return corrected;
}

// Error boundary wrapper for node functions
export function withErrorBoundary<TInput, TOutput>(
  nodeName: string,
  nodeFunction: (input: TInput) => Promise<TOutput> | TOutput,
  fallbackOutput: TOutput
) {
  return async (input: TInput): Promise<TOutput> => {
    try {
      const result = await nodeFunction(input);
      // Ensure result is valid (not undefined/null for LangGraph)
      if (result === null || result === undefined) {
        console.warn(`Node ${nodeName} returned null/undefined, using fallback`);
        return fallbackOutput;
      }
      return result;
    } catch (error) {
      console.error(`Error in node ${nodeName}:`, {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        input: typeof input === 'object' ? JSON.stringify(input, null, 2).substring(0, 500) : String(input)
      });

      // Return fallback following LangGraph patterns
      return fallbackOutput;
    }
  };
}

// Rate limiting and circuit breaker (for API calls)
export class CircuitBreaker {
  private failures = 0;
  private lastFailTime = 0;
  private readonly threshold: number;
  private readonly timeout: number;

  constructor(threshold = 3, timeout = 60000) { // 3 failures, 1 minute timeout
    this.threshold = threshold;
    this.timeout = timeout;
  }

  async execute<T>(operation: () => Promise<T>, fallback: () => Promise<T>): Promise<T> {
    // Check if circuit is open (too many recent failures)
    if (this.failures >= this.threshold) {
      if (Date.now() - this.lastFailTime < this.timeout) {
        console.warn('Circuit breaker open, using fallback');
        return fallback();
      } else {
        // Reset after timeout
        this.failures = 0;
      }
    }

    try {
      const result = await operation();
      // Success - reset failure count
      this.failures = 0;
      return result;
    } catch (error) {
      this.failures++;
      this.lastFailTime = Date.now();

      console.warn(`Circuit breaker recorded failure ${this.failures}/${this.threshold}:`, error);

      // Use fallback
      return fallback();
    }
  }
}

// Export singleton circuit breaker for API calls
export const apiCircuitBreaker = new CircuitBreaker(3, 60000);

// Error reporting utilities
export interface ErrorReport {
  nodeName: string;
  errorType: string;
  message: string;
  timestamp: string;
  context?: any;
  recoveryAction?: string;
}

export function createErrorReport(
  nodeName: string,
  error: Error | unknown,
  context?: any,
  recoveryAction?: string
): ErrorReport {
  return {
    nodeName,
    errorType: error instanceof Error ? error.constructor.name : 'UnknownError',
    message: error instanceof Error ? error.message : String(error),
    timestamp: new Date().toISOString(),
    context: context ? JSON.stringify(context, null, 2).substring(0, 1000) : undefined,
    recoveryAction
  };
}
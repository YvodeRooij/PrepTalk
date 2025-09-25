// Curriculum Agent Module
// Export main agent and types for use in API

export { CurriculumAgent } from './graph';
export { CurriculumStateAnnotation, type CurriculumState } from './state';
export * from './types';

// Re-export convenience function for creating agent
import { createClient } from '@supabase/supabase-js';
import { CurriculumAgent } from './graph';

export function createCurriculumAgent(
  supabaseUrl: string,
  supabaseKey: string,
  geminiApiKey: string
) {
  const supabase = createClient(supabaseUrl, supabaseKey);
  return new CurriculumAgent(supabase, geminiApiKey);
}

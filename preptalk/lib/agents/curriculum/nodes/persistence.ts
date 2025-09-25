// Persistence Node - Database operations
// Saves curriculum to Supabase

import { createClient } from '@supabase/supabase-js';
import { CurriculumState } from '../state';

/**
 * Node: Save curriculum to database
 * This is the final node that persists everything
 */
export async function saveCurriculum(
  state: CurriculumState,
  config?: { supabase?: ReturnType<typeof createClient> }
): Promise<Partial<CurriculumState>> {

  // Get Supabase client from config or create new one
  const supabase = config?.supabase || (() => {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_ANON_KEY;

    if (!url || !key) {
      throw new Error('Missing required environment variables: SUPABASE_URL and/or SUPABASE_ANON_KEY');
    }

    return createClient(url, key);
  })();

  if (!state.jobData || !state.rounds || !state.structure) {
    return {
      errors: ['Missing required data to save curriculum'],
    };
  }

  try {
    // Transform competitive intelligence for database storage
    const roleIntelligence = state.competitiveIntelligence || state.marketIntelligence ? {
      role_vs_competitors: state.competitiveIntelligence?.roleComparison || null,
      recent_role_developments: state.competitiveIntelligence?.recentDevelopments || [],
      strategic_advantages: state.competitiveIntelligence?.strategicAdvantages || [],
      market_context: {
        salary_range: state.marketIntelligence?.salaryRange || null,
        difficulty_rating: state.marketIntelligence?.difficultyRating || null,
        preparation_time: state.marketIntelligence?.preparationTime || null,
        key_insights: state.marketIntelligence?.keyInsights || []
      },
      competitive_positioning: state.competitiveIntelligence?.competitivePositioning || null,
      generated_at: new Date().toISOString()
    } : null;

    // Save curriculum metadata
    const { data: curriculum, error: curriculumError } = await supabase
      .from('curricula')
      .insert({
        job_id: state.jobData.id,
        title: `${state.jobData.title} at ${state.companyContext?.name || 'Unknown'}`,
        overview: `Comprehensive interview preparation curriculum`,
        total_rounds: state.rounds.length,
        structure: state.structure,
        quality_score: state.quality || 0,
        generation_model: 'gemini-2.5-flash',
        role_intelligence: roleIntelligence,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (curriculumError || !curriculum) {
      return {
        errors: [`Failed to save curriculum: ${curriculumError?.message}`],
      };
    }

    // Save individual rounds
    const roundsToSave = state.rounds.map(round => ({
      curriculum_id: curriculum.id,
      ...round,
    }));

    const { error: roundsError } = await supabase
      .from('curriculum_rounds')
      .insert(roundsToSave);

    if (roundsError) {
      return {
        errors: [`Failed to save rounds: ${roundsError.message}`],
      };
    }

    return {
      curriculumId: curriculum.id,
      endTime: Date.now(),
    };

  } catch (error) {
    return {
      errors: [`Database error: ${error instanceof Error ? error.message : 'Unknown'}`],
    };
  }
}
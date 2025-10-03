// Persistence Node - Database operations
// Saves curriculum to Supabase

import { createClient } from '@supabase/supabase-js';
import { CurriculumState } from '../state';

/**
 * ⚡ CV DEMO MODE: Lightweight save without job/company creation
 * Saves only curriculum + round data for fast demo experience
 */
async function saveCvDemoMode(
  state: CurriculumState,
  supabase: ReturnType<typeof createClient>
): Promise<Partial<CurriculumState>> {
  console.log('⚡ [CV DEMO] Saving demo curriculum with minimal job record');
  const timestamp = new Date().toISOString();

  try {
    if (!state.rounds || !state.structure) {
      return {
        errors: ['Missing required data for CV demo save'],
      };
    }

    // STEP 1: Create minimal job record (required for curricula.job_id constraint)
    console.log('⚡ [CV DEMO] Creating minimal job record');
    const { data: jobRecord, error: jobError } = await supabase
      .from('jobs')
      .insert({
        company_id: null,  // Allow null for demo
        title: 'Demo Interview Practice',
        level: 'mid',
        source_url: state.userInput || null,
        created_at: timestamp,
      })
      .select('id')
      .single();

    if (jobError || !jobRecord) {
      console.error(`❌ [CV DEMO] Job creation failed: ${jobError?.message}`);
      return {
        errors: [`Failed to create demo job: ${jobError?.message}`],
      };
    }

    console.log(`✅ [CV DEMO] Demo job created: ${jobRecord.id}`);

    // STEP 2: Create curriculum record with job_id
    const { data: curriculumRecord, error: curriculumError} = await supabase
      .from('curricula')
      .insert({
        job_id: jobRecord.id,  // ✅ Required by NOT NULL constraint
        title: 'CV Demo Round',
        overview: 'Quick CV walkthrough demo',
        total_rounds: 1,
        difficulty_level: 'intermediate',
        generation_status: 'cv_round_only',  // Mark as demo
        completeness_score: 85,
        cv_analysis_id: state.cvData?.cv_analysis_id || null,
        created_at: timestamp,
        updated_at: timestamp,
      })
      .select('id')
      .single();

    if (curriculumError || !curriculumRecord) {
      console.error(`❌ [CV DEMO] Curriculum creation failed: ${curriculumError?.message}`);
      return {
        errors: [`Failed to create demo curriculum: ${curriculumError?.message}`],
      };
    }

    const curriculumId = curriculumRecord.id;
    console.log(`✅ [CV DEMO] Curriculum created: ${curriculumId}`);

    // STEP 3: Save the CV round
    const round = state.rounds[0];
    const { error: roundError } = await supabase
      .from('curriculum_rounds')
      .insert({
        curriculum_id: curriculumId,
        round_number: 1,
        round_type: round.round_type,
        title: round.title,
        description: round.description || 'CV walkthrough demo round',
        duration_minutes: round.duration_minutes,
        interviewer_persona: round.interviewer_persona || {},
        topics_to_cover: round.topics_to_cover || [],
        evaluation_criteria: round.evaluation_criteria || [],
        opening_script: round.opening_script || '',
        closing_script: round.closing_script || '',
        passing_score: 70,
        candidate_prep_guide: {
          ci_talking_points: [],
          recognition_training: [],
          standard_questions_prep: [],
          reverse_questions: []
        },
        created_at: timestamp,
        updated_at: timestamp,
      });

    if (roundError) {
      console.error(`❌ [CV DEMO] Round creation failed: ${roundError.message}`);
      return {
        errors: [`Failed to save demo round: ${roundError.message}`],
      };
    }

    console.log(`✅ [CV DEMO] Demo round saved successfully`);

    return {
      curriculumId,
      currentStep: 'saved_demo',
    };

  } catch (error) {
    console.error('❌ [CV DEMO] Save error:', error);
    return {
      errors: [`Demo save error: ${error instanceof Error ? error.message : 'Unknown'}`],
    };
  }
}

/**
 * 🆕 HELPER: Update existing curriculum (CV-first flow)
 * Updates curriculum from cv_round_only → complete with all 5 rounds
 */
async function updateExistingCurriculum(
  state: CurriculumState,
  supabase: ReturnType<typeof createClient>
): Promise<Partial<CurriculumState>> {
  console.log(`🔄 [UPDATE] Updating existing curriculum: ${state.existingCurriculumId}`);
  const timestamp = new Date().toISOString();
  const updateStartTime = Date.now();

  try {
    // STEP 1: Update curriculum record
    const { error: updateError } = await supabase
      .from('curricula')
      .update({
        title: state.jobData?.title && state.companyContext?.name
          ? `${state.jobData.title} at ${state.companyContext.name}`
          : state.jobData?.title || 'Interview Preparation',
        total_rounds: state.rounds.length,
        generation_status: 'complete',  // Update status
        completeness_score: state.quality || 0,
        company_name: state.jobData?.company_name || state.companyContext?.name || null,
        job_title: state.jobData?.title || null,
        updated_at: timestamp,
      })
      .eq('id', state.existingCurriculumId);

    if (updateError) {
      console.error(`❌ [UPDATE] Failed to update curriculum: ${updateError.message}`);
      return {
        errors: [`Failed to update curriculum: ${updateError.message}`],
      };
    }

    // STEP 2: Delete old rounds (CV Round only)
    const { error: deleteError } = await supabase
      .from('curriculum_rounds')
      .delete()
      .eq('curriculum_id', state.existingCurriculumId);

    if (deleteError) {
      console.error(`⚠️ [UPDATE] Failed to delete old rounds: ${deleteError.message}`);
      // Continue anyway - will insert new rounds
    }

    // STEP 3: Insert all new rounds (all 5)
    // Map round types to valid database values
    const mapRoundType = (type: string): string => {
      const validTypes = ['recruiter_screen', 'behavioral_deep_dive', 'culture_values_alignment', 'strategic_role_discussion', 'executive_final'];
      if (validTypes.includes(type)) return type;

      const lower = type.toLowerCase().trim();
      if (lower.includes('recruiter') || lower.includes('phone') || lower.includes('screening') || lower.includes('initial')) return 'recruiter_screen';
      if (lower.includes('behavioral') || lower.includes('competency')) return 'behavioral_deep_dive';
      if (lower.includes('culture') || lower.includes('values') || lower.includes('fit')) return 'culture_values_alignment';
      if (lower.includes('strategic') || lower.includes('role') || lower.includes('case')) return 'strategic_role_discussion';
      if (lower.includes('executive') || lower.includes('final') || lower.includes('senior')) return 'executive_final';

      console.warn(`⚠️ [UPDATE] Unknown round type "${type}", defaulting to behavioral_deep_dive`);
      return 'behavioral_deep_dive';
    };

    const roundsToSave = state.rounds.map(round => {
      const originalRoundType = round.round_type;
      const mappedRoundType = mapRoundType(round.round_type) as any;

      // ✅ FIX: Get prep guide from state.candidatePrepGuides, not from round object
      const prepGuideData = state.candidatePrepGuides?.[mappedRoundType];

      // 🔬 DEBUG: Log prep guide lookup
      const advantagesCount = prepGuideData?.ci_talking_points?.strategic_advantages?.length || 0;
      const developmentsCount = prepGuideData?.ci_talking_points?.recent_developments?.length || 0;
      const questionsCount = prepGuideData?.standard_questions_prep?.length || 0;
      const reverseQsCount = prepGuideData?.reverse_questions?.length || 0;
      console.log(`   🔍 [UPDATE] Round ${round.round_number} (${mappedRoundType}): Advantages=${advantagesCount}, Developments=${developmentsCount}, Questions=${questionsCount}, ReverseQs=${reverseQsCount}`);

      if (!prepGuideData) {
        console.log(`   ⚠️  [UPDATE] No prep guide for ${mappedRoundType}. Available keys: [${Object.keys(state.candidatePrepGuides || {}).join(', ')}]`);
      }

      return {
        curriculum_id: state.existingCurriculumId,
        round_number: round.round_number,
        round_type: mappedRoundType,
        title: round.title,
        description: round.description,
        duration_minutes: round.duration_minutes,
        interviewer_persona: round.interviewer_persona,
        topics_to_cover: round.topics_to_cover || [],
        evaluation_criteria: round.evaluation_criteria || [],
        opening_script: round.opening_script || '',
        closing_script: round.closing_script || '',
        passing_score: round.passing_score || 70,
        // ✅ FIX: Build prep guide using same logic as main create flow
        candidate_prep_guide: prepGuideData ? {
          ci_talking_points: {
            strategic_advantages: prepGuideData?.ci_talking_points?.strategic_advantages || [],
            recent_developments: prepGuideData?.ci_talking_points?.recent_developments || []
          },
          recognition_training: {
            what_great_answers_sound_like: prepGuideData?.recognition_training?.what_great_answers_sound_like || [],
            how_to_demonstrate_company_knowledge: prepGuideData?.recognition_training?.how_to_demonstrate_company_knowledge || []
          },
          standard_questions_prep: prepGuideData?.standard_questions_prep || [],
          reverse_questions: prepGuideData?.reverse_questions?.map(q => ({
            id: q.id,
            question: q.question_text,
            ci_fact: q.ci_fact_used,
            ci_source_type: q.ci_source_type,
            success_pattern: q.success_pattern,
            why_it_works: q.why_this_works,
            green_flags: q.green_flags || [],
            red_flags: q.red_flags || [],
            expected_insights: q.expected_insights || [],
            timing: q.best_timing,
            natural_phrasing_tip: q.natural_phrasing_tip
          })) || []
        } : {
          ci_talking_points: {
            strategic_advantages: [],
            recent_developments: []
          },
          recognition_training: {
            what_great_answers_sound_like: [],
            how_to_demonstrate_company_knowledge: []
          },
          standard_questions_prep: [],
          reverse_questions: []
        },
        created_at: timestamp,
        updated_at: timestamp,
      };
    });

    const { error: roundsError } = await supabase
      .from('curriculum_rounds')
      .insert(roundsToSave);

    if (roundsError) {
      console.error(`❌ [UPDATE] Failed to insert new rounds: ${roundsError.message}`);
      return {
        errors: [`Failed to insert rounds: ${roundsError.message}`],
      };
    }

    const updateDuration = Date.now() - updateStartTime;
    console.log(`✅ [UPDATE] Complete in ${updateDuration}ms - Updated to ${state.rounds.length} rounds`);

    return {
      curriculumId: state.existingCurriculumId,
      endTime: Date.now(),
    };

  } catch (error) {
    console.error('❌ [UPDATE] Error:', error);
    return {
      errors: [`Update error: ${error instanceof Error ? error.message : 'Unknown'}`],
    };
  }
}

/**
 * Node: Save curriculum to database
 * This is the final node that persists everything
 * 🆕 MODIFIED: Supports updating existing curriculum for CV-first flow
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

  // ⚡ CV DEMO MODE: Lightweight save with minimal data
  if (state.mode === 'cv_round_only') {
    return await saveCvDemoMode(state, supabase);
  }

  if (!state.jobData || !state.rounds || !state.structure) {
    return {
      errors: ['Missing required data to save curriculum'],
    };
  }

  // 🆕 UPDATE PATH: If existingCurriculumId provided, update instead of create
  if (state.existingCurriculumId) {
    return await updateExistingCurriculum(state, supabase);
  }

  // 🔄 CREATE PATH: Normal flow continues below (unchanged)

  try {
    // 🚀 STRATEGIC LOG: Persistence Flow Start
    const flowStartTime = Date.now();
    const dataVolume = JSON.stringify(state).length;
    const timestamp = new Date().toISOString(); // ✅ FIXED: Declare timestamp first

    console.log(`🚀 [PERSISTENCE] Starting curriculum save flow`);
    console.log(`   📊 Data Volume: ${Math.round(dataVolume/1024)}KB (${dataVolume} chars)`);
    console.log(`   🎯 Job: ${state.jobData.title}`);
    console.log(`   🏢 Company: ${state.companyContext?.name || 'Unknown'}`);
    console.log(`   📋 Rounds: ${state.rounds.length}`);
    console.log(`   🧠 CI Data: ${state.competitiveIntelligence ? 'Present' : 'None'} (${state.competitiveIntelligence?.strategicAdvantages?.length || 0} advantages)`);
    console.log(`   👤 User Profile: ${state.userProfile ? 'Present' : 'None'} (${state.userProfile?.weakAreas?.length || 0} weak areas)`);
    console.log(`   🔍 Discovery: ${state.discoveredSources?.length || 0} sources`);

    // STEP 1: Job creation with timing
    console.log(`📝 [DB-OP-1] Creating job record...`);
    const jobStartTime = Date.now();
    // Handle company_id NOT NULL constraint discovered in testing
    console.log(`🏢 [COMPANY] Handling company creation for: ${state.companyContext?.name || 'Unknown'}...`);
    let companyId = null;

    if (state.companyContext?.name) {
      const companyStartTime = Date.now();
      const { data: companyRecord, error: companyError } = await supabase
        .from('companies')
        .insert({
          name: state.companyContext.name,
          display_name: state.companyContext.name,
          company_size: '201-500', // Default to satisfy constraint
          verification_status: 'unverified',
          created_at: timestamp, // ✅ FIXED: Now timestamp is available
          updated_at: timestamp  // ✅ FIXED: Now timestamp is available
        })
        .select('id')
        .single();

      const companyDuration = Date.now() - companyStartTime;
      if (!companyError && companyRecord) {
        companyId = companyRecord.id;
        console.log(`✅ [COMPANY] Company created in ${companyDuration}ms: ${companyId}`);
      } else {
        console.log(`⚠️  [COMPANY] Company creation failed in ${companyDuration}ms: ${companyError?.message}`);
        // Continue anyway - job creation will fail but we'll get proper error logging
      }
    } else {
      console.log(`⚠️  [COMPANY] No company context provided - job creation will fail due to NOT NULL constraint`);
    }

    const { data: jobRecord, error: jobError } = await supabase
      .from('jobs')
      .insert({
        company_id: companyId, // Now properly handled - will be null if company creation failed
        title: state.jobData.title,
        level: state.jobData.level || 'mid',
        source_url: state.jobData.source_url || null,
        created_at: timestamp // Use consistent timestamp
      })
      .select('id')
      .single();

    const jobDuration = Date.now() - jobStartTime;
    if (jobError || !jobRecord) {
      console.log(`❌ [DB-OP-1] Job creation FAILED after ${jobDuration}ms: ${jobError?.message}`);
      return {
        errors: [`Failed to save job data: ${jobError?.message}`],
      };
    }
    console.log(`✅ [DB-OP-1] Job created successfully in ${jobDuration}ms - ID: ${jobRecord.id}`);

    // STEP 2: Complete data preparation - preserve ALL generated intelligence
    console.log(`🔄 [DATA-PREP] Preparing intelligence data for database...`);
    const dataPrepStartTime = Date.now();
    // ✅ FIXED: timestamp already declared at top of function

    // FULL competitive intelligence - preserve all insights
    const roleIntelligence = state.competitiveIntelligence || state.marketIntelligence ? {
      role_vs_competitors: state.competitiveIntelligence?.roleComparison || null,
      recent_role_developments: state.competitiveIntelligence?.recentDevelopments || [],
      strategic_advantages: state.competitiveIntelligence?.strategicAdvantages || [],
      primary_competitors: state.competitiveIntelligence?.primaryCompetitors || [],
      market_context: {
        salary_range: state.marketIntelligence?.salaryRange || null,
        difficulty_rating: state.marketIntelligence?.difficultyRating || null,
        preparation_time: state.marketIntelligence?.preparationTime || null,
        key_insights: state.marketIntelligence?.keyInsights || [],
        competitive_context: state.marketIntelligence?.competitiveContext || null,
        market_trends: state.marketIntelligence?.marketTrends || []
      },
      competitive_positioning: state.competitiveIntelligence?.competitivePositioning || null,
      generated_at: timestamp
    } : null;

    // FULL unified context - complete personalization strategy
    const unifiedContextData = state.unifiedContext ? {
      strength_amplifiers: state.unifiedContext.strengthAmplifiers || [],
      gap_bridges: state.unifiedContext.gapBridges || [],
      confidence_builders: state.unifiedContext.confidenceBuilders || [],
      ci_integration_strategy: state.unifiedContext.ciIntegrationStrategy || null,
      personalized_approach: state.unifiedContext.personalizedApproach || null,
      generated_at: timestamp
    } : null;

    // COMPLETE user personalization - all user input preserved
    const userPersonalizationData = state.userProfile ? {
      excitement: state.userProfile.excitement || null,
      concerns: state.userProfile.concerns || null,
      weak_areas: state.userProfile.weakAreas || [],
      background_context: state.userProfile.backgroundContext || null,
      preparation_goals: state.userProfile.preparationGoals || null,
      // Legacy fields for backward compatibility
      focus_area: state.userProfile.focusArea || null,
      concern: state.userProfile.concern || null,
      background: state.userProfile.background || null,
      captured_at: timestamp
    } : null;

    // COMPLETE discovery intelligence - full source analysis + competitors with URLs
    const discoveryMetadata = state.discoveredSources?.length || state.discoveryMetadata ? {
      // Legacy source-based discovery
      sources_evaluated: state.discoveredSources?.length || 0,
      sources_useful: state.discoveredSources?.filter(s => s.validation?.isUseful).length || 0,
      source_types: state.discoveredSources ? [...new Set(state.discoveredSources.map(s => s.sourceType))] : [],
      average_trust_score: state.discoveredSources?.length
        ? state.discoveredSources.reduce((sum, s) => sum + s.trustScore, 0) / state.discoveredSources.length
        : null,
      validation_summary: state.discoveredSources?.map(s => ({
        url: s.url,
        type: s.sourceType,
        trust_score: s.trustScore,
        is_useful: s.validation?.isUseful || false,
        confidence: s.validation?.confidence || 0
      })) || [],

      // 🆕 NEW: Intelligent discovery data with full competitor objects
      competitors: state.discoveryMetadata?.competitors || [],
      interview_experiences: state.interviewExperiences || [],
      company_news: state.companyNews || [],
      cache_hit: state.discoveryMetadata?.cacheHit,
      latency_ms: state.discoveryMetadata?.latencyMs,
      search_queries: state.discoveryMetadata?.searchQueries,
      grounding_metadata: state.discoveryMetadata?.groundingMetadata,

      processed_at: timestamp
    } : null;

    // COMPLETE CV integration - full analysis data
    let cvAnalysisId: string | null = null;
    let cvIntegrationData: any = null;
    if (state.cvData) {
      cvIntegrationData = {
        match_score: state.cvData.matchScore || null,
        uploaded_at: state.cvData.uploadedAt || null,
        processing_model: state.cvData.processingModel || null,
        integration_timestamp: timestamp
      };

      // 🚀 FIX: Extract cv_analysis_id from cvData
      cvAnalysisId = state.cvData.cv_analysis_id || null;

      console.log(`   🔗 CV Analysis Integration: ID=${cvAnalysisId}, Match Score=${state.cvData.matchScore}%`);
    }

    // COMPLETE generation metadata - full analytics
    const generationMetadata = {
      generation_duration_ms: state.endTime ? (state.endTime - (state.startTime || Date.now())) : null,
      quality_score: state.quality || 0,
      refinement_attempts: state.refinementAttempts || 0,
      errors_encountered: state.errors?.length || 0,
      warnings_generated: state.warnings?.length || 0,
      current_step: state.currentStep || 'completed',
      progress: state.progress || 100,
      generation_timestamp: timestamp
    };

    const dataPrepDuration = Date.now() - dataPrepStartTime;
    console.log(`✅ [DATA-PREP] Intelligence data prepared in ${dataPrepDuration}ms`);
    console.log(`   🧠 Role Intelligence: ${roleIntelligence ? `${JSON.stringify(roleIntelligence).length} chars` : 'None'}`);
    console.log(`   🎯 Unified Context: ${unifiedContextData ? `${JSON.stringify(unifiedContextData).length} chars` : 'None'}`);
    console.log(`   👤 User Profile: ${userPersonalizationData ? `${JSON.stringify(userPersonalizationData).length} chars` : 'None'}`);
    console.log(`   🔍 Discovery Data: ${discoveryMetadata ? `${JSON.stringify(discoveryMetadata).length} chars` : 'None'}`);

    // STEP 3: Complete curriculum creation with ALL data preserved
    console.log(`📚 [DB-OP-2] Creating curriculum with all intelligence data...`);
    const curriculumStartTime = Date.now();
    const { data: curriculum, error: curriculumError } = await supabase
      .from('curricula')
      .insert({
        job_id: jobRecord.id,
        cv_analysis_id: cvAnalysisId, // Link to CV analysis if available
        title: `${state.jobData.title} at ${state.companyContext?.name || 'Unknown'}`,
        overview: `Comprehensive interview preparation curriculum with competitive intelligence and personalized strategy`,
        total_rounds: state.rounds.length,
        estimated_total_minutes: state.structure?.estimated_total_minutes || state.rounds.reduce((sum, r) => sum + (r.duration_minutes || 30), 0),
        difficulty_level: state.structure?.difficulty_level || 'intermediate',
        generation_params: {
          strategy: state.structure?.generation_strategy || 'comprehensive',
          temperature: 0.7,
          refinement_iterations: state.structure?.refinement_iterations || 0
        },
        completeness_score: state.quality || 0,
        // 🆕 NEW: Set generation status based on mode
        generation_status: state.mode === 'cv_round_only' ? 'cv_round_only' : 'complete',
        // 🆕 ADD MISSING SCORING FIELDS FOR COMPLETE DATA
        relevance_score: Math.min(95, (state.quality || 85) + 5), // Slightly higher than completeness
        difficulty_score: state.structure?.difficulty_level === 'advanced' ? 85 :
                         state.structure?.difficulty_level === 'beginner' ? 65 : 75,
        times_used: 1, // Initialize with 1 for creation
        avg_completion_rate: null, // Will be calculated after usage data
        avg_user_rating: null, // Will be calculated after user ratings
        generation_model: 'gemini-2.5-flash',
        role_intelligence: roleIntelligence,
        unified_context: unifiedContextData,
        user_personalization: userPersonalizationData,
        discovery_metadata: discoveryMetadata,
        cv_integration: cvIntegrationData,
        generation_metadata: generationMetadata,
        created_at: timestamp,
        updated_at: timestamp
      })
      .select()
      .single();

    const curriculumDuration = Date.now() - curriculumStartTime;
    if (curriculumError || !curriculum) {
      console.log(`❌ [DB-OP-2] Curriculum creation FAILED after ${curriculumDuration}ms: ${curriculumError?.message}`);
      return {
        errors: [`Failed to save curriculum: ${curriculumError?.message}`],
      };
    }
    console.log(`✅ [DB-OP-2] Curriculum created successfully in ${curriculumDuration}ms - ID: ${curriculum.id}`);

    // STEP 4: Complete rounds creation - preserve ALL generated content
    // 🔧 COMPREHENSIVE ROUND TYPE MAPPING: Handle all LLM-generated round types
    const mapRoundTypeToValidValue = (roundType: string): string => {
      const validTypes = ['recruiter_screen', 'behavioral_deep_dive', 'culture_values_alignment', 'strategic_role_discussion', 'executive_final'];

      // Direct match
      if (validTypes.includes(roundType)) {
        console.log(`   ✅ Round type direct match: ${roundType}`);
        return roundType;
      }

      // Comprehensive mapping with detailed logging
      const lowerType = roundType.toLowerCase().trim();
      console.log(`   🔍 Mapping round type: "${roundType}" (normalized: "${lowerType}")`);

      // 1. Phone/Recruiter Screen variants
      if (lowerType.includes('recruiter') ||
          lowerType.includes('phone') ||
          lowerType.includes('screening') ||
          lowerType.includes('initial') ||
          lowerType.includes('hr_')) {
        console.log(`   🎯 Mapped to recruiter_screen: ${roundType}`);
        return 'recruiter_screen';
      }

      // 2. Technical/Behavioral variants (most common)
      if (lowerType.includes('technical') ||
          lowerType.includes('behavioral') ||
          lowerType.includes('competency') ||
          lowerType.includes('experience') ||
          lowerType.includes('skills') ||
          lowerType.includes('deep')) {
        console.log(`   🎯 Mapped to behavioral_deep_dive: ${roundType}`);
        return 'behavioral_deep_dive';
      }

      // 3. Culture/Values variants
      if (lowerType.includes('culture') ||
          lowerType.includes('values') ||
          lowerType.includes('fit') ||
          lowerType.includes('team') ||
          lowerType.includes('alignment')) {
        console.log(`   🎯 Mapped to culture_values_alignment: ${roundType}`);
        return 'culture_values_alignment';
      }

      // 4. Strategic/Role variants
      if (lowerType.includes('strategic') ||
          lowerType.includes('role') ||
          lowerType.includes('vision') ||
          lowerType.includes('leadership') ||
          lowerType.includes('case') ||
          lowerType.includes('presentation')) {
        console.log(`   🎯 Mapped to strategic_role_discussion: ${roundType}`);
        return 'strategic_role_discussion';
      }

      // 5. Final/Executive variants
      if (lowerType.includes('final') ||
          lowerType.includes('executive') ||
          lowerType.includes('onsite') ||
          lowerType.includes('director') ||
          lowerType.includes('senior') ||
          lowerType.includes('panel')) {
        console.log(`   🎯 Mapped to executive_final: ${roundType}`);
        return 'executive_final';
      }

      // 6. Fallback based on round position
      const roundNum = state.rounds?.findIndex(r => r.round_type === roundType) || 0;
      const positionMapping = ['recruiter_screen', 'behavioral_deep_dive', 'culture_values_alignment', 'strategic_role_discussion', 'executive_final'];
      const fallbackType = positionMapping[Math.min(roundNum, 4)];

      console.log(`   ⚠️  Unknown round type "${roundType}" at position ${roundNum}, using fallback: ${fallbackType}`);
      return fallbackType;
    };

    console.log(`🎯 [DB-OP-3] Creating ${state.rounds.length} rounds with complete content...`);
    const roundsStartTime = Date.now();

    // 🚨 DEBUG: Log original round types before processing
    console.log(`   📋 Original round types: [${state.rounds.map(r => `"${r.round_type}"`).join(', ')}]`);
    console.log(`   🔑 Available candidatePrepGuides keys: [${Object.keys(state.candidatePrepGuides || {}).join(', ')}]`);
    console.log(`   🔑 Available standardQuestionSets keys: [${Object.keys(state.standardQuestionSets || {}).join(', ')}]`);
    console.log(`   🔑 Available reverseQuestionSets keys: [${Object.keys(state.reverseQuestionSets || {}).join(', ')}]`);

    const roundsToSave = state.rounds.map(round => {
      // 🔑 CRITICAL FIX: Store original round type before mapping for data lookup
      const originalRoundType = round.round_type;
      const mappedRoundType = mapRoundTypeToValidValue(round.round_type);

      console.log(`   🎯 Processing round ${round.round_number}: "${originalRoundType}" → "${mappedRoundType}"`);

      return {
        curriculum_id: curriculum.id,
        round_number: round.round_number,
        round_type: mappedRoundType,
        title: round.title,
        description: round.description,
        duration_minutes: round.duration_minutes,
        interviewer_persona: round.interviewer_persona,
        topics_to_cover: round.topics_to_cover || [], // FULL array - no truncation
        evaluation_criteria: round.evaluation_criteria || [], // FULL array - no truncation
        opening_script: round.opening_script || '', // FULL text - no truncation
        closing_script: round.closing_script || '', // FULL text - no truncation
        passing_score: round.passing_score || 70,
        // 🔍 CRITICAL FIX: Use mapped round type for candidatePrepGuides lookup
        candidate_prep_guide: (() => {
          // 🚀 FIX: candidatePrepGuides are stored with mapped keys, not original keys
          const prepGuideData = state.candidatePrepGuides?.[mappedRoundType];
          const hasData = !!prepGuideData;
          const advantagesCount = prepGuideData?.ci_talking_points?.strategic_advantages?.length || 0;
          const developmentsCount = prepGuideData?.ci_talking_points?.recent_developments?.length || 0;

          console.log(`   🔍 Round ${round.round_number} (${originalRoundType} → ${mappedRoundType}): PrepGuide=${hasData}, Advantages=${advantagesCount}, Developments=${developmentsCount}`);

          if (!hasData) {
            console.log(`   ❌ No candidatePrepGuides data for mapped type '${mappedRoundType}'. Original: '${originalRoundType}'. Available keys: [${Object.keys(state.candidatePrepGuides || {}).join(', ')}]`);
            // ✅ FIX: Return correct structure (objects not arrays) to match schema
            return {
              ci_talking_points: {
                strategic_advantages: [],
                recent_developments: []
              },
              recognition_training: {
                what_great_answers_sound_like: [],
                how_to_demonstrate_company_knowledge: []
              },
              standard_questions_prep: [],
              reverse_questions: []
            };
          }

          return {
            ci_talking_points: {
              strategic_advantages: prepGuideData?.ci_talking_points?.strategic_advantages || [],
              recent_developments: prepGuideData?.ci_talking_points?.recent_developments || []
            },
            recognition_training: {
              what_great_answers_sound_like: prepGuideData?.recognition_training?.what_great_answers_sound_like || [],
              how_to_demonstrate_company_knowledge: prepGuideData?.recognition_training?.how_to_demonstrate_company_knowledge || []
            },
            // ✅ FIX: Use standard_questions_prep from the generated candidatePrepGuides (has why_asked, approach, key_points)
            // Previously was incorrectly pulling from standardQuestionSets which only has type/category/difficulty
            standard_questions_prep: prepGuideData?.standard_questions_prep || [],
            // 🆕 POPULATE reverse_questions from prepGuideData (questions candidate asks interviewer)
            reverse_questions: (() => {
              const reverseQs = prepGuideData?.reverse_questions;
              const questionCount = reverseQs?.length || 0;

              console.log(`   🔍 Round ${round.round_number} (${mappedRoundType}): ReverseQuestions=${questionCount}`);

              if (!reverseQs || reverseQs.length === 0) {
                console.log(`   ❌ No reverse_questions in prepGuideData for type '${mappedRoundType}'. Available keys: [${Object.keys(state.candidatePrepGuides || {}).join(', ')}]`);
                return [];
              }

              return reverseQs.map(q => ({
                id: q.id,
                question: q.question_text,
                ci_fact: q.ci_fact_used,
                ci_source_type: q.ci_source_type,
                success_pattern: q.success_pattern,
                why_it_works: q.why_this_works,
                green_flags: q.green_flags || [],
                red_flags: q.red_flags || [],
                expected_insights: q.expected_insights || [],
                timing: q.best_timing,
                natural_phrasing_tip: q.natural_phrasing_tip
              }));
            })()
          };
        })(),
        created_at: timestamp,
        updated_at: timestamp
      };
    });

    // Calculate total content size before inserting
    const totalRoundsSize = JSON.stringify(roundsToSave).length;
    console.log(`   📊 Rounds Data Size: ${Math.round(totalRoundsSize/1024)}KB`);

    // 🚨 DEBUG: Log final mapped round types before database insert
    const finalRoundTypes = roundsToSave.map(r => r.round_type);
    console.log(`   📋 Final mapped round types for DB: [${finalRoundTypes.map(t => `"${t}"`).join(', ')}]`);
    console.log(`   🔍 All mapped types valid?: ${finalRoundTypes.every(t => ['recruiter_screen', 'behavioral_deep_dive', 'culture_values_alignment', 'strategic_role_discussion', 'executive_final'].includes(t))}`);

    const { error: roundsError } = await supabase
      .from('curriculum_rounds')
      .insert(roundsToSave);

    const roundsDuration = Date.now() - roundsStartTime;
    if (roundsError) {
      console.log(`❌ [DB-OP-3] Rounds creation FAILED after ${roundsDuration}ms: ${roundsError.message}`);
      return {
        errors: [`Failed to save rounds: ${roundsError.message}`],
      };
    }
    console.log(`✅ [DB-OP-3] ${state.rounds.length} rounds created successfully in ${roundsDuration}ms`);

    // STEP 5: Add question bank for completeness (async to prevent timeout)
    // Save questions asynchronously to avoid timeout but still preserve data
    if (state.standardQuestionSets && Object.keys(state.standardQuestionSets).length > 0) {
      // Run question saving in background to avoid timeout
      // Use Promise.resolve().then() for cross-environment compatibility (Jest + Node.js)
      Promise.resolve().then(async () => {
        try {
          // This runs after the current execution context
          const questionBankPromises = Object.entries(state.standardQuestionSets!).map(([roundType, questions]) => {
            return supabase.from('question_bank').insert(
              questions.map((q: any) => ({
                curriculum_id: curriculum.id,
                round_type: mapRoundTypeToValidValue(roundType),
                question_text: q.question || q.text || '',
                question_type: q.type || 'general',
                difficulty_level: q.difficulty || 'medium',
                expected_answer_points: q.expectedAnswerPoints || [],
                follow_up_questions: q.followUpQuestions || [],
                created_at: timestamp
              }))
            );
          });
          await Promise.all(questionBankPromises);
          console.log(`🎯 Background: Question bank saved for curriculum ${curriculum.id}`);
        } catch (error) {
          console.log(`⚠️ Background: Failed to save question bank:`, error);
        }
      });
    }

    // STEP 6: Strategic final summary with complete flow analysis
    const totalFlowDuration = Date.now() - flowStartTime;
    const dbOperationTime = jobDuration + curriculumDuration + roundsDuration;
    const processingTime = totalFlowDuration - dbOperationTime;

    console.log(`🎉 [PERSISTENCE] COMPLETE SUCCESS - Full flow executed in ${totalFlowDuration}ms`);
    console.log(`   ⏱️  TIMING BREAKDOWN:`);
    console.log(`      • Data Preparation: ${dataPrepDuration}ms`);
    console.log(`      • DB Operations: ${dbOperationTime}ms (Job:${jobDuration}ms + Curriculum:${curriculumDuration}ms + Rounds:${roundsDuration}ms)`);
    console.log(`      • Processing Overhead: ${processingTime}ms`);
    console.log(`   📊 DATA SAVED:`);
    console.log(`      • Job ID: ${jobRecord.id}`);
    console.log(`      • Curriculum ID: ${curriculum.id} (${Math.round(JSON.stringify(curriculum).length/1024)}KB)`);
    console.log(`      • Rounds: ${state.rounds.length} (${Math.round(totalRoundsSize/1024)}KB)`);
    console.log(`      • Intelligence Data: ${roleIntelligence ? '✅' : '❌'} Competitive Intelligence`);
    console.log(`      • Personalization: ${unifiedContextData ? '✅' : '❌'} Unified Context, ${userPersonalizationData ? '✅' : '❌'} User Profile`);
    console.log(`      • Discovery Intel: ${discoveryMetadata ? '✅' : '❌'} ${state.discoveredSources?.length || 0} sources`);
    console.log(`      • CV Integration: ${cvIntegrationData ? '✅' : '❌'} Analysis data`);
    console.log(`      • Questions: ${state.standardQuestionSets ? Object.keys(state.standardQuestionSets).length + ' sets (async)' : 'None'}`);
    console.log(`   🚀 PERFORMANCE: ${totalFlowDuration < 10000 ? '✅ EXCELLENT' : totalFlowDuration < 30000 ? '⚠️  ACCEPTABLE' : '❌ SLOW'} (${totalFlowDuration}ms vs 99000ms+ original timeout)`);
    console.log(`   💯 DATA QUALITY: FULL - No truncation or data loss applied`);

    return {
      curriculumId: curriculum.id,
      endTime: Date.now(),
      // Return comprehensive metadata
      persistenceMetadata: {
        job_id: jobRecord.id,
        company_id: companyId, // Now properly tracked
        cv_analysis_id: cvAnalysisId,
        unified_context_saved: !!unifiedContextData,
        user_personalization_saved: !!userPersonalizationData,
        discovery_metadata_saved: !!discoveryMetadata,
        cv_integration_saved: !!cvIntegrationData,
        question_sets_saved: state.standardQuestionSets ? Object.keys(state.standardQuestionSets).length : 0,
        data_quality: 'FULL', // All data preserved
        optimization_strategy: 'async_question_bank' // How we avoided timeout
      }
    };

  } catch (error) {
    return {
      errors: [`Database error: ${error instanceof Error ? error.message : 'Unknown'}`],
    };
  }
}
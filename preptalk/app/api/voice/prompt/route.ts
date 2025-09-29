import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { creditManager } from '@/lib/credits/manager';
import { generatePrompt } from '@/lib/voice/prompt-templates';
import { selectTemplateByRoundType } from '@/lib/voice/template-selector';

// 🧪 A/B TEST SETUP FOR PROMPT LATENCY INVESTIGATION
//
// CURRENT STATUS: Testing LONG prompt (line ~118) - Short test completed successfully
//
// TO SWITCH BACK TO LONG PROMPT:
// 1. Comment out lines 118-122 (short prompt + logging)
// 2. Uncomment lines 105-116 (long prompt)
// 3. Check console logs for prompt length comparison
//
// HYPOTHESIS: Long detailed prompts (~2000+ chars) may cause ElevenLabs latency
// TEST: Short prompt (~200 chars) vs Long prompt (~2000 chars)

export async function POST(request: NextRequest) {
  try {
    // Authentication (following your curriculum generation pattern)
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    let userId: string;

    // Development: Use your real user ID for testing
    if (process.env.NODE_ENV === 'development') {
      userId = '6a3ba98b-8b91-4ba0-b517-8afe6a5787ee';
      console.log('🧪 Using your real user ID for testing:', userId);
    } else if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    } else {
      userId = user.id;
    }

    const { curriculumId, roundNumber } = await request.json();

    // Skip credit checks in development
    let balance = null;
    if (process.env.NODE_ENV !== 'development') {
      const hasCredits = await creditManager.canUseCredits(userId, 1);
      balance = await creditManager.getBalance(userId);

      if (!hasCredits) {
        return NextResponse.json({ error: 'Insufficient credits' }, { status: 402 });
      }
    }

    // Fetch curriculum round data with all the rich context
    const { data: roundData, error: roundError } = await supabase
      .from('curriculum_rounds')
      .select(`
        *,
        curricula!inner(
          id,
          role_intelligence,
          unified_context,
          user_personalization,
          cv_integration,
          discovery_metadata,
          generation_metadata,
          cv_analysis_id
        )
      `)
      .eq('curriculum_id', curriculumId)
      .eq('round_number', roundNumber)
      .single();

    if (roundError || !roundData) {
      return NextResponse.json(
        { error: 'Curriculum round not found' },
        { status: 404 }
      );
    }

    // Fetch linked CV analysis data
    let cvAnalysisData = null;
    if (roundData.curricula.cv_analysis_id) {
      console.log('🔍 Fetching CV analysis for ID:', roundData.curricula.cv_analysis_id);

      // Use service role for CV data access to bypass RLS
      const serviceSupabase = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      const { data: cvData, error: cvError } = await serviceSupabase
        .from('cv_analyses')
        .select('analysis')
        .eq('id', roundData.curricula.cv_analysis_id)
        .single();

      console.log('🔍 CV fetch result:', {
        cvError,
        hasData: !!cvData,
        cvDataKeys: cvData ? Object.keys(cvData) : [],
        analysisKeys: cvData?.analysis ? Object.keys(cvData.analysis) : []
      });

      if (!cvError && cvData) {
        cvAnalysisData = cvData.analysis;
        console.log('🔍 CV analysis data set:', {
          hasPersonalInfo: !!cvAnalysisData?.personalInfo,
          hasFullName: !!cvAnalysisData?.personalInfo?.fullName,
          fullName: cvAnalysisData?.personalInfo?.fullName,
          hasSummary: !!cvAnalysisData?.summary,
          hasExperience: !!cvAnalysisData?.experience
        });
      }
    } else {
      console.log('🔍 No cv_analysis_id found in curriculum');
    }

    // 🎯 TIERED PROMPT SYSTEM: Round-specific prompts with intelligent data distribution
    // Replaces single massive prompt with round-appropriate templates with intelligent fallbacks

    const selectedTemplate = selectTemplateByRoundType(roundData.round_type, roundNumber);
    const systemPrompt = generatePrompt(roundData, cvAnalysisData, selectedTemplate);

    console.log('🎯 [TIERED PROMPTS] Using', selectedTemplate, 'template for', roundData.round_type, '(Round', roundNumber + ')');
    console.log('🎯 [TIERED PROMPTS] Prompt length:', systemPrompt.length, 'characters');

    // 🔍 CURRICULUM INTELLIGENCE ANALYSIS - What data do we actually have?
    console.log('🔍 [CURRICULUM DATA] Round-specific data available:');
    console.log('🔍 [ROUND] Round type:', roundData.round_type);
    console.log('🔍 [ROUND] Duration:', roundData.duration_minutes, 'minutes');
    console.log('🔍 [PERSONA] Interviewer persona:', JSON.stringify(roundData.interviewer_persona, null, 2));
    console.log('🔍 [TOPICS] Topics to cover:', JSON.stringify(roundData.topics_to_cover, null, 2));
    console.log('🔍 [PREP] Candidate prep guide:', JSON.stringify(roundData.candidate_prep_guide, null, 2));

    console.log('🔍 [CURRICULUM] Curriculum-level intelligence:');
    console.log('🔍 [UNIFIED] Unified context keys:', roundData.curricula.unified_context ? Object.keys(roundData.curricula.unified_context) : 'null');
    console.log('🔍 [UNIFIED] Unified context:', JSON.stringify(roundData.curricula.unified_context, null, 2));
    console.log('🔍 [PERSONALIZATION] User personalization keys:', roundData.curricula.user_personalization ? Object.keys(roundData.curricula.user_personalization) : 'null');
    console.log('🔍 [PERSONALIZATION] User personalization:', JSON.stringify(roundData.curricula.user_personalization, null, 2));
    console.log('🔍 [ROLE_INTEL] Role intelligence keys:', roundData.curricula.role_intelligence ? Object.keys(roundData.curricula.role_intelligence) : 'null');
    console.log('🔍 [ROLE_INTEL] Role intelligence:', JSON.stringify(roundData.curricula.role_intelligence, null, 2));

    const firstMessage = generateOpeningMessage(roundData.interviewer_persona);

    // Return the interview configuration
    return NextResponse.json({
      systemPrompt,
      firstMessage,
      roundMetadata: {
        persona: roundData.interviewer_persona,
        questions: roundData.topics_to_cover,
        prepGuide: roundData.candidate_prep_guide,
        roundType: roundData.round_type,
        duration: roundData.duration_minutes
      },
      remainingCredits: process.env.NODE_ENV === 'development' ? 999 : (balance?.total_available || 0)
    });

  } catch (error) {
    console.error('Voice prompt generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate interview prompt' },
      { status: 500 }
    );
  }
}


function generateOpeningMessage(persona: any): string {
  const role = persona?.role || 'interviewer';

  return `Hi there! I'm your ${role} for today's interview. Thank you so much for taking the time to speak with me. I'm really looking forward to learning more about your background and discussing this opportunity together. How are you feeling today?`;
}
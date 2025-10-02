import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';

export const maxDuration = 30;

/**
 * ULTRA-FAST CV DEMO CREATION
 * Creates curriculum + round records directly without agent graph
 * ~1-2 seconds vs ~30-40 seconds
 */
export async function POST(request: NextRequest) {
  try {
    // Auth check
    const supabaseAuth = await createClient();
    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { cvAnalysisId, jobUrl } = body;

    if (!cvAnalysisId) {
      return NextResponse.json({ error: 'CV analysis ID required' }, { status: 400 });
    }

    // Use service role to bypass RLS
    const supabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const timestamp = new Date().toISOString();

    // STEP 1: Create minimal company record (required for jobs.company_id)
    const { data: companyRecord, error: companyError } = await supabase
      .from('companies')
      .insert({
        name: 'Demo Company',
        display_name: 'Demo Company',
        company_size: '201-500',
        verification_status: 'unverified',
        created_at: timestamp,
        updated_at: timestamp,
      })
      .select('id')
      .single();

    if (companyError || !companyRecord) {
      console.error('[FAST DEMO] Company creation failed:', companyError?.message, companyError);
      return NextResponse.json({
        error: 'Failed to create company',
        details: companyError?.message
      }, { status: 500 });
    }

    // STEP 2: Create minimal job record
    const { data: jobRecord, error: jobError } = await supabase
      .from('jobs')
      .insert({
        company_id: companyRecord.id,
        title: 'CV Demo Interview',
        level: 'mid',
        source_url: jobUrl || null,
        created_at: timestamp,
      })
      .select('id')
      .single();

    if (jobError || !jobRecord) {
      console.error('[FAST DEMO] Job creation failed:', jobError?.message, jobError);
      return NextResponse.json({
        error: 'Failed to create job',
        details: jobError?.message
      }, { status: 500 });
    }

    // STEP 3: Create curriculum record
    const { data: curriculumRecord, error: curriculumError } = await supabase
      .from('curricula')
      .insert({
        job_id: jobRecord.id,
        title: 'CV Demo Round',
        overview: 'Quick CV walkthrough demo',
        total_rounds: 1,
        difficulty_level: 'intermediate',
        generation_status: 'cv_round_only',
        generation_model: 'fast-demo',  // ✅ Required by NOT NULL constraint
        completeness_score: 85,
        cv_analysis_id: cvAnalysisId,
        created_at: timestamp,
        updated_at: timestamp,
      })
      .select('id')
      .single();

    if (curriculumError || !curriculumRecord) {
      console.error('[FAST DEMO] Curriculum creation failed:', curriculumError?.message, curriculumError);
      return NextResponse.json({
        error: 'Failed to create curriculum',
        details: curriculumError?.message
      }, { status: 500 });
    }

    const curriculumId = curriculumRecord.id;

    // STEP 4: Create demo round
    const { error: roundError } = await supabase
      .from('curriculum_rounds')
      .insert({
        curriculum_id: curriculumId,
        round_number: 1,
        round_type: 'recruiter_screen',
        title: 'CV Walkthrough (Demo)',
        description: 'CV walkthrough with recruiter',
        duration_minutes: 3,
        interviewer_persona: {
          name: 'Sarah Chen',
          role: 'Technical Recruiter',
          personality: 'friendly and conversational',
          communication_style: 'warm, direct',
          goal: 'Understand your background'
        },
        topics_to_cover: [{
          topic: 'Career Background',
          subtopics: ['Current role', 'Experience'],
          depth: 'intermediate',
          time_allocation: 3,
          must_cover: true,
          question_count: 5,
          difficulty_progression: 'mixed'
        }],
        evaluation_criteria: [],
        opening_script: 'Hi! Thanks for taking the time to chat today.',
        closing_script: 'Great, thank you for sharing that.',
        passing_score: 70,
        candidate_prep_guide: {
          ci_talking_points: [],
          recognition_training: [],
          standard_questions_prep: []
        },
        created_at: timestamp,
        updated_at: timestamp,
      });

    if (roundError) {
      console.error('[FAST DEMO] Round creation failed:', roundError?.message, roundError);
      return NextResponse.json({
        error: 'Failed to create round',
        details: roundError?.message
      }, { status: 500 });
    }

    console.log(`✅ [FAST DEMO] Created curriculum ${curriculumId} in < 2s`);

    return NextResponse.json({
      success: true,
      curriculum_id: curriculumId,
    });

  } catch (error) {
    console.error('[FAST DEMO] Error:', error);
    return NextResponse.json({ error: 'Creation failed' }, { status: 500 });
  }
}
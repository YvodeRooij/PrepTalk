import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { createCurriculumAgent, CurriculumAgentOptions } from '@/lib/agents/curriculum';

type CurriculumRoundRecord = {
  round_number: number;
  [key: string]: unknown;
};

type CurriculumRecord = {
  id: string;
  title: string;
  overview: string | null;
  total_rounds: number;
  difficulty_level: string | null;
  completeness_score: number | null;
  created_at: string;
  curriculum_rounds: CurriculumRoundRecord[] | null;
  // NEW: Enhanced data fields
  cv_analysis_id: string | null;
  unified_context: any;
  user_personalization: any;
  discovery_metadata: any;
  cv_integration: any;
  generation_metadata: any;
  role_intelligence: any;
  [key: string]: unknown;
};

// Environment validation
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const GOOGLE_AI_API_KEY = process.env.GOOGLE_AI_API_KEY!;

export async function POST(request: NextRequest) {
  try {
    // Check authentication using Supabase
    const supabaseAuth = await createClient();
    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();

    let userId: string;

    // For testing purposes, allow a hardcoded test user in development
    if (process.env.NODE_ENV === 'development' && (!user || userError)) {
      userId = 'test-user-yvoderooij';
      console.log('🧪 Using test user for development:', userId);
    } else if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    } else {
      userId = user.id;
    }

    // Parse request body
    const body = await request.json() as {
      input?: string;
      options?: Partial<CurriculumAgentOptions> | null;
      userProfile?: {
        excitement?: string;
        concerns?: string;
        weakAreas?: string[];
        backgroundContext?: string;
        preparationGoals?: string;
      } | null;
      cvData?: {
        analysis?: any;
        insights?: any;
        matchScore?: number;
        uploadedAt?: string;
        processingModel?: string;
        cv_analysis_id?: string; // 🔗 CV analysis ID for linking
      } | null;
    };
    const { input, options = {}, userProfile, cvData } = body;

    // Validate input
    if (!input || typeof input !== 'string') {
      return NextResponse.json(
        {
          error: 'Invalid input',
          details: 'Please provide either a job URL or job description (e.g., "Software Engineer at Google" or "KLM stewardess")'
        },
        { status: 400 }
      );
    }

    // Check for required environment variables
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !GOOGLE_AI_API_KEY) {
      console.error('Missing required environment variables');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    // Create Supabase client with service role for server-side operations
    const supabase = createSupabaseClient(
      SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY
    );

    // Check user's credit balance (skip for test user in development)
    let availableCredits = 100;
    const CURRICULUM_COST = 10;

    if (userId !== 'test-user-yvoderooij') {
      const { data: userCredits, error: creditsError } = await supabase
        .from('user_credits')
        .select('monthly_credits, bonus_credits, credits_used_this_month')
        .eq('user_id', userId)
        .single();

      if (creditsError || !userCredits) {
        return NextResponse.json(
          { error: 'Failed to fetch user credits' },
          { status: 500 }
        );
      }

      availableCredits = (userCredits.monthly_credits || 0) + (userCredits.bonus_credits || 0) - (userCredits.credits_used_this_month || 0);

      if (availableCredits < CURRICULUM_COST) {
        return NextResponse.json(
          {
            error: 'Insufficient credits',
            required: CURRICULUM_COST,
            available: availableCredits
          },
          { status: 402 } // Payment Required
        );
      }
    } else {
      console.log('🧪 Bypassing credit check for test user');
    }

    // Create the curriculum agent
    const agent = createCurriculumAgent(
      SUPABASE_URL,
      SUPABASE_ANON_KEY,
      GOOGLE_AI_API_KEY,
      {
        skipSchemaValidation: process.env.NODE_ENV === 'development',
        ...options,
      }
    );

    // Start generation (this may take 30-60 seconds)
    console.log(`[Curriculum] Starting generation for user ${userId}: ${input.substring(0, 100)}...`);
    if (userProfile) {
      const areas = userProfile.weakAreas?.join(', ') || 'none specified';
      console.log(`[Curriculum] Personalization: Concerns: ${userProfile.concerns || 'none'}, Weak areas: ${areas}`);
    }
    if (cvData) {
      const fullName = cvData.analysis?.personalInfo?.fullName || 'Unknown';
      const experience = cvData.analysis?.summary?.yearsOfExperience || 0;
      const cvAnalysisId = cvData.cv_analysis_id || 'No ID';
      console.log(`[Curriculum] CV Data: ${fullName}, ${experience} years experience, Match Score: ${cvData.matchScore}%, CV Analysis ID: ${cvAnalysisId}`);
    }

    const startTime = Date.now();
    const curriculumId = await agent.generate(input, userProfile, cvData);
    const duration = (Date.now() - startTime) / 1000;

    console.log(`[Curriculum] Generated ${curriculumId} in ${duration}s for user ${userId}`);

    // Deduct credits (skip for test user)
    if (userId !== 'test-user-yvoderooij') {
      const { error: creditError } = await supabase
        .from('user_credits')
        .update({
          credits_used_this_month: supabase.rpc('increment', {
            table_name: 'user_credits',
            column_name: 'credits_used_this_month',
            increment_by: CURRICULUM_COST
          }),
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (creditError) {
        console.error('Failed to deduct credits:', creditError);
        // Continue anyway - we don't want to fail after successful generation
      }

      // Record the transaction
      await supabase
        .from('credit_transactions')
        .insert({
          user_id: userId,
          transaction_type: 'used',
          credit_type: 'monthly',
          amount: -CURRICULUM_COST,
          description: 'Curriculum generation',
          related_entity_type: 'curriculum',
          related_entity_id: curriculumId
        });
    } else {
      console.log('🧪 Skipping credit deduction for test user');
    }

    // Fetch the generated curriculum
    const { data: curriculum, error: fetchError } = await supabase
      .from('curricula')
      .select(`
        *,
        curriculum_rounds (*)
      `)
      .eq('id', curriculumId)
      .single<CurriculumRecord>();

    if (fetchError || !curriculum) {
      return NextResponse.json(
        { error: 'Failed to fetch generated curriculum' },
        { status: 500 }
      );
    }

    // Return the generated curriculum
    return NextResponse.json({
      success: true,
      curriculum_id: curriculumId,
      credits_used: CURRICULUM_COST,
      remaining_credits: availableCredits - CURRICULUM_COST,
      generation_time: duration,
      curriculum: {
        id: curriculum.id,
        title: curriculum.title,
        overview: curriculum.overview,
        total_rounds: curriculum.total_rounds,
        difficulty_level: curriculum.difficulty_level,
        completeness_score: curriculum.completeness_score,
        rounds: (curriculum.curriculum_rounds ?? [])
          .slice()
          .sort((a, b) => a.round_number - b.round_number),
        created_at: curriculum.created_at,
        // NEW: Include enhanced data in API response
        cv_analysis_id: curriculum.cv_analysis_id,
        unified_context: curriculum.unified_context,
        user_personalization: curriculum.user_personalization,
        discovery_metadata: curriculum.discovery_metadata,
        cv_integration: curriculum.cv_integration,
        generation_metadata: curriculum.generation_metadata,
        role_intelligence: curriculum.role_intelligence
      }
    });

  } catch (error) {
    console.error('[Curriculum] Generation error:', error);

    // Provide helpful error messages
    if (error instanceof Error) {
      if (error.message.includes('Schema validation failed')) {
        return NextResponse.json(
          {
            error: 'Database schema mismatch',
            details: 'The database schema needs to be updated. Please contact support.',
            technical: error.message
          },
          { status: 503 } // Service Unavailable
        );
      }

      if (error.message.includes('Generation failed')) {
        return NextResponse.json(
          {
            error: 'Failed to generate curriculum',
            details: error.message
          },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      {
        error: 'An unexpected error occurred',
        details: process.env.NODE_ENV === 'development' ? String(error) : undefined
      },
      { status: 500 }
    );
  }
}

// GET method to check endpoint status
export async function GET() {
  return NextResponse.json({
    status: 'ready',
    description: 'Curriculum generation endpoint',
    usage: {
      method: 'POST',
      body: {
        input: 'Job URL or description (e.g., "Software Engineer at Google" or "https://job-url.com")',
        options: {
          skipSchemaValidation: 'boolean (optional)',
          forceSchemaValidation: 'boolean (optional)'
        }
      },
      cost: '10 credits'
    }
  });
}
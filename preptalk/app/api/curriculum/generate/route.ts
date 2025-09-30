import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { createCurriculumAgent, CurriculumAgentOptions } from '@/lib/agents/curriculum';

// Eliminate timeout issues for long-running curriculum generation
export const maxDuration = 600; // 10 minutes - generous timeout for LLM processing

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

// Environment validation - safe loading to avoid top-level errors
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || '';

export async function POST(request: NextRequest) {
  console.log('🚀 [DEBUG] Curriculum generation started');

  try {
    // Check authentication using Supabase
    const supabaseAuth = await createClient();
    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();

    console.log('🔐 [DEBUG] Auth check:', {
      userExists: !!user,
      userId: user?.id,
      userError: userError?.message || 'none',
      nodeEnv: process.env.NODE_ENV
    });

    // Always require authentication
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = user.id;

    // Parse request body
    const body = await request.json() as {
      userInput?: string;  // Frontend sends userInput
      input?: string;      // Fallback for backwards compatibility
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
    const { userInput, input, options = {}, userProfile, cvData } = body;
    const finalInput = userInput || input;  // Use userInput if available, fallback to input

    console.log('📝 [DEBUG] Request body parsed:', {
      hasUserInput: !!userInput,
      hasInput: !!input,
      finalInput: finalInput?.substring(0, 50) + '...',
      hasUserProfile: !!userProfile,
      hasCvData: !!cvData,
      cvDataKeys: cvData ? Object.keys(cvData) : []
    });

    console.log('🔍 [DEBUG] About to validate input...');

    // Validate input
    if (!finalInput || typeof finalInput !== 'string') {
      console.log('❌ [DEBUG] Input validation failed:', { finalInput, type: typeof finalInput });
      return NextResponse.json(
        {
          error: 'Invalid input',
          details: 'Please provide either a job URL or job description (e.g., "Software Engineer at Google" or "KLM stewardess")'
        },
        { status: 400 }
      );
    }

    console.log('✅ [DEBUG] Input validation passed');

    console.log('🔧 [DEBUG] Checking environment variables:', {
      SUPABASE_URL: SUPABASE_URL ? 'present' : 'missing',
      SUPABASE_ANON_KEY: SUPABASE_ANON_KEY ? 'present' : 'missing',
      GOOGLE_API_KEY: GOOGLE_API_KEY ? 'present' : 'missing'
    });

    // Check for required environment variables
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !GOOGLE_API_KEY) {
      console.error('❌ [DEBUG] Missing required environment variables:', {
        SUPABASE_URL: !!SUPABASE_URL,
        SUPABASE_ANON_KEY: !!SUPABASE_ANON_KEY,
        GOOGLE_API_KEY: !!GOOGLE_API_KEY
      });
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    console.log('✅ [DEBUG] Environment variables check passed');

    console.log('🔌 [DEBUG] Creating Supabase client...');

    // Create Supabase client with service role for server-side operations
    let supabase;
    try {
      supabase = createSupabaseClient(
        SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY
      );
      console.log('✅ [DEBUG] Supabase client created successfully');
    } catch (supabaseError) {
      console.error('❌ [DEBUG] Supabase client creation failed:', supabaseError);
      throw supabaseError;
    }

    // TODO: Re-enable credit system once user_credits table is properly set up
    // console.log('💰 [DEBUG] Starting credit check...');

    // Skip all credit checks during development
    let availableCredits = 100;
    const CURRICULUM_COST = 10;
    console.log('🧪 [DEBUG] Credit checks disabled for development');

    // console.log('✅ [DEBUG] Credit check completed successfully');

    // Create the curriculum agent
    console.log('🔧 [DEBUG] Creating curriculum agent with:', {
      supabaseUrl: SUPABASE_URL ? 'present' : 'missing',
      supabaseKey: SUPABASE_ANON_KEY ? 'present' : 'missing',
      googleApiKey: GOOGLE_API_KEY ? 'present' : 'missing',
      nodeEnv: process.env.NODE_ENV
    });

    const agent = createCurriculumAgent(
      SUPABASE_URL,
      SUPABASE_ANON_KEY,
      GOOGLE_API_KEY,
      {
        skipSchemaValidation: process.env.NODE_ENV === 'development',
        ...options,
      }
    );

    // Start generation (this may take 30-60 seconds)
    console.log(`[Curriculum] Starting generation for user ${userId}: ${finalInput.substring(0, 100)}...`);
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
    console.log('⚡ [DEBUG] Starting agent.generate()...');

    let curriculumId: string;
    let duration: number;

    try {
      curriculumId = await agent.generate(finalInput, userProfile, cvData);
      duration = (Date.now() - startTime) / 1000;

      console.log(`✅ [DEBUG] Generated ${curriculumId} in ${duration}s for user ${userId}`);
      console.log(`[Curriculum] Generated ${curriculumId} in ${duration}s for user ${userId}`);
    } catch (generateError) {
      console.error('❌ [DEBUG] Agent.generate() failed:', {
        error: generateError instanceof Error ? generateError.message : String(generateError),
        stack: generateError instanceof Error ? generateError.stack : undefined
      });
      throw generateError;
    }

    // TODO: Re-enable credit deduction once user_credits table is properly set up
    // Skip all credit deductions during development
    console.log('🧪 [DEBUG] Credit deduction disabled for development');

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
    console.error('💥 [DEBUG] Curriculum generation error caught:', {
      errorType: error instanceof Error ? error.constructor.name : typeof error,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
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
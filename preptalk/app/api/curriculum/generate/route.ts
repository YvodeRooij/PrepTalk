import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createCurriculumAgent, CurriculumAgentOptions } from '@/lib/agents/curriculum';
import { auth } from '@clerk/nextjs/server';

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
  quality_score: number | null;
  created_at: string;
  curriculum_rounds: CurriculumRoundRecord[] | null;
  [key: string]: unknown;
};

// Environment validation
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const GOOGLE_AI_API_KEY = process.env.GOOGLE_AI_API_KEY!;

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json() as {
      input?: string;
      options?: Partial<CurriculumAgentOptions> | null;
    };
    const { input, options = {} } = body;

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
    const supabase = createClient(
      SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY
    );

    // Check user's credit balance
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('credits_balance')
      .eq('user_id', userId)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Failed to fetch user profile' },
        { status: 500 }
      );
    }

    // Cost for curriculum generation (adjust as needed)
    const CURRICULUM_COST = 10;

    if (!profile.credits_balance || profile.credits_balance < CURRICULUM_COST) {
      return NextResponse.json(
        {
          error: 'Insufficient credits',
          required: CURRICULUM_COST,
          available: profile.credits_balance || 0
        },
        { status: 402 } // Payment Required
      );
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

    const startTime = Date.now();
    const curriculumId = await agent.generate(input);
    const duration = (Date.now() - startTime) / 1000;

    console.log(`[Curriculum] Generated ${curriculumId} in ${duration}s for user ${userId}`);

    // Deduct credits
    const { error: creditError } = await supabase
      .from('user_profiles')
      .update({
        credits_balance: profile.credits_balance - CURRICULUM_COST,
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
        type: 'usage',
        amount: -CURRICULUM_COST,
        description: 'Curriculum generation',
        metadata: { curriculum_id: curriculumId, input: input.substring(0, 200) }
      });

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
      remaining_credits: profile.credits_balance - CURRICULUM_COST,
      generation_time: duration,
      curriculum: {
        id: curriculum.id,
        title: curriculum.title,
        overview: curriculum.overview,
        total_rounds: curriculum.total_rounds,
        difficulty_level: curriculum.difficulty_level,
        quality_score: curriculum.quality_score,
        rounds: (curriculum.curriculum_rounds ?? [])
          .slice()
          .sort((a, b) => a.round_number - b.round_number),
        created_at: curriculum.created_at
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
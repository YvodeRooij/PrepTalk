import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { creditManager } from '@/lib/credits/manager';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user has credits
    const canUse = await creditManager.canUseCredits(user.id, 1);
    if (!canUse) {
      return NextResponse.json(
        { error: 'Insufficient credits', code: 'INSUFFICIENT_CREDITS' },
        { status: 402 }
      );
    }

    // Use a credit for starting the interview
    const result = await creditManager.useCredit(
      user.id,
      'Interview practice session started',
      'interview',
      `interview_${Date.now()}`
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to use credit' },
        { status: 400 }
      );
    }

    // Return success with remaining credits
    return NextResponse.json({
      success: true,
      message: 'Interview session started',
      remaining_credits: result.remaining_credits,
      session_id: `interview_${Date.now()}`
    });

  } catch (error) {
    console.error('Start interview API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
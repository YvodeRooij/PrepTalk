import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { creditManager } from '@/lib/credits/manager';

export async function GET(request: NextRequest) {
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

    // Get credit balance
    const balance = await creditManager.getBalance(user.id);
    
    if (!balance) {
      return NextResponse.json(
        { error: 'Failed to get credit balance' },
        { status: 500 }
      );
    }

    return NextResponse.json(balance);
  } catch (error) {
    console.error('Credit balance API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

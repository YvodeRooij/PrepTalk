import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    let userId: string;

    // Development fallback
    if (process.env.NODE_ENV === 'development' && (!user || userError)) {
      userId = 'test-user-yvoderooij';
      console.log('🧪 Using test user for curriculum list:', userId);
    } else if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    } else {
      userId = user.id;
    }

    // Fetch user's curricula
    const { data: curricula, error: curriculaError } = await supabase
      .from('curricula')
      .select(`
        id,
        job_title,
        company_name,
        created_at,
        status
      `)
      .eq('user_id', userId)
      .eq('status', 'completed')
      .order('created_at', { ascending: false });

    if (curriculaError) {
      console.error('Error fetching curricula:', curriculaError);
      return NextResponse.json(
        { error: 'Failed to fetch curricula' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      curricula: curricula || []
    });

  } catch (error) {
    console.error('Curriculum list error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch curricula' },
      { status: 500 }
    );
  }
}
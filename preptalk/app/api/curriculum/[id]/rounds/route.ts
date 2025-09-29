import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    let userId: string;

    // Development fallback
    if (process.env.NODE_ENV === 'development' && (!user || userError)) {
      userId = 'test-user-yvoderooij';
      console.log('🧪 Using test user for curriculum rounds:', userId);
    } else if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    } else {
      userId = user.id;
    }

    const curriculumId = params.id;

    // Verify curriculum ownership
    const { data: curriculum, error: curriculumError } = await supabase
      .from('curricula')
      .select('id, user_id')
      .eq('id', curriculumId)
      .eq('user_id', userId)
      .single();

    if (curriculumError || !curriculum) {
      return NextResponse.json(
        { error: 'Curriculum not found' },
        { status: 404 }
      );
    }

    // Fetch curriculum rounds
    const { data: rounds, error: roundsError } = await supabase
      .from('curriculum_rounds')
      .select(`
        id,
        round_number,
        round_type,
        duration_minutes,
        interviewer_persona,
        topics_to_cover,
        candidate_prep_guide
      `)
      .eq('curriculum_id', curriculumId)
      .order('round_number', { ascending: true });

    if (roundsError) {
      console.error('Error fetching curriculum rounds:', roundsError);
      return NextResponse.json(
        { error: 'Failed to fetch rounds' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      rounds: rounds || []
    });

  } catch (error) {
    console.error('Curriculum rounds error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch curriculum rounds' },
      { status: 500 }
    );
  }
}
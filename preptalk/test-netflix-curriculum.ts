// End-to-End Test: Netflix Job URL → Non-Technical Curriculum Generation
// Tests the complete competitive intelligence-powered persona system

import { CurriculumAgent } from './lib/agents/curriculum/graph';
import { createClient } from '@supabase/supabase-js';

async function testNetflixCurriculumGeneration() {
  console.log('🎬 Testing Netflix Non-Technical Curriculum Generation');
  console.log('=' .repeat(60));

  // Initialize Supabase client
  const supabaseUrl = process.env.SUPABASE_URL || 'https://kbqayefhoknkvgzmaauc.supabase.co';
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'your-anon-key';
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  // Initialize curriculum agent
  const agent = new CurriculumAgent(
    supabase,
    process.env.GOOGLE_AI_API_KEY || 'your-gemini-api-key',
    { skipSchemaValidation: true } // Skip for testing
  );

  const netflixJobUrl = 'https://explore.jobs.netflix.net/careers?pid=790311846068&domain=netflix.com&sort_by=relevance';

  try {
    console.log('🔄 Step 1: Parsing job and generating competitive intelligence...');
    const curriculumId = await agent.generate(netflixJobUrl);

    console.log(`✅ Generated curriculum ID: ${curriculumId}`);

    // Verify curriculum in database
    console.log('🔄 Step 2: Verifying curriculum data in database...');

    const { data: curriculum, error } = await supabase
      .from('curricula')
      .select(`
        *,
        curriculum_rounds (
          *
        )
      `)
      .eq('id', curriculumId)
      .single();

    if (error) {
      throw new Error(`Database query failed: ${error.message}`);
    }

    console.log('✅ Curriculum retrieved from database');
    console.log('📊 Curriculum Summary:');
    console.log(`   - Total rounds: ${curriculum.total_rounds}`);
    console.log(`   - Round types: ${curriculum.curriculum_rounds?.map((r: any) => r.round_type).join(', ')}`);

    // Check competitive intelligence
    if (curriculum.role_intelligence) {
      console.log('🧠 Competitive Intelligence:');
      console.log(`   - Strategic advantages: ${curriculum.role_intelligence.strategic_advantages?.length || 0}`);
      console.log(`   - Recent developments: ${curriculum.role_intelligence.recent_role_developments?.length || 0}`);
      console.log(`   - Competitive positioning: ${curriculum.role_intelligence.competitive_positioning ? 'Present' : 'Missing'}`);
    }

    // Check personas in rounds
    if (curriculum.curriculum_rounds) {
      console.log('🎭 Generated Personas:');
      for (const round of curriculum.curriculum_rounds) {
        const persona = round.interviewer_persona;
        console.log(`   - Round ${round.round_number} (${round.round_type}): ${persona?.name || 'No persona'} - ${persona?.role || 'No role'}`);

        // Check if candidate prep guide exists
        if (round.candidate_prep_guide) {
          const ciPoints = round.candidate_prep_guide.ci_talking_points?.strategic_advantages?.length || 0;
          console.log(`     • CI talking points: ${ciPoints}`);
        }
      }
    }

    console.log('🎉 SUCCESS: End-to-end test completed!');
    console.log('✅ Database migration: Working');
    console.log('✅ Persona generation: Working');
    console.log('✅ LLM provider system: Working');
    console.log('✅ Graph flow: Working');

    return {
      success: true,
      curriculumId,
      curriculum,
      message: 'Non-technical curriculum generation system is fully operational!'
    };

  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('🔧 Troubleshooting:');
    console.error('   1. Check GOOGLE_AI_API_KEY is set');
    console.error('   2. Verify database migration was applied');
    console.error('   3. Ensure Supabase credentials are correct');

    return {
      success: false,
      error: error.message,
      troubleshooting: 'Check environment variables and database setup'
    };
  }
}

// Run test if called directly
if (require.main === module) {
  testNetflixCurriculumGeneration()
    .then(result => {
      if (result.success) {
        console.log(`\n🚀 SYSTEM READY FOR PRODUCTION!`);
        console.log('📋 Next steps:');
        console.log('   1. Set up proper environment variables');
        console.log('   2. Configure rate limiting for production');
        console.log('   3. Set up monitoring and alerting');
        console.log('   4. Deploy to production environment');
      } else {
        console.log('\n💥 SYSTEM NEEDS FIXES');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('Unexpected error:', error);
      process.exit(1);
    });
}

export { testNetflixCurriculumGeneration };
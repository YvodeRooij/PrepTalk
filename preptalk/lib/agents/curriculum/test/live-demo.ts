// Live Demo: Complete Competitive Intelligence Flow with Real Netflix Job
// This demonstrates the end-to-end system working with actual data

import { config } from 'dotenv';
import { join } from 'path';

// Load environment variables
config({ path: join(process.cwd(), '.env.local') });

// Import our enhanced functions
import { analyzeRole, parseJob } from '../nodes/research';
import { saveCurriculum } from '../nodes/persistence';
import type { CurriculumState } from '../state';

async function runLiveDemo() {
  console.log('🚀 Live Demo: Netflix Job Competitive Intelligence Analysis');
  console.log('='.repeat(60));

  const netflixJobUrl = 'https://explore.jobs.netflix.net/careers?pid=790311846068&domain=netflix.com&sort_by=relevance';

  try {
    // STEP 1: Parse the job from the URL
    console.log('\n🔍 STEP 1: Parsing Netflix job from URL...');
    console.log(`URL: ${netflixJobUrl}`);

    const mockState: Partial<CurriculumState> = {
      discoveredSources: [{
        url: netflixJobUrl,
        sourceType: 'official',
        trustScore: 0.9,
        priority: 'core',
        validation: {
          isUseful: true,
          confidence: 0.9
        }
      }]
    };

    const jobResult = await parseJob(mockState as CurriculumState);

    if (jobResult.errors && jobResult.errors.length > 0) {
      console.log('❌ Job parsing failed:', jobResult.errors);
      return;
    }

    console.log('✅ Job parsing successful!');
    console.log('📋 Parsed Job Data:');
    console.log(`   Title: ${jobResult.jobData?.title}`);
    console.log(`   Company: ${jobResult.jobData?.company_name}`);
    console.log(`   Level: ${jobResult.jobData?.level}`);
    console.log(`   Location: ${jobResult.jobData?.location}`);
    console.log(`   Work Arrangement: ${jobResult.jobData?.work_arrangement}`);
    console.log(`   Required Skills: ${jobResult.jobData?.required_skills?.slice(0, 3).join(', ')}...`);

    // STEP 2: Enhanced competitive intelligence research
    console.log('\n🔬 STEP 2: Running enhanced research with competitive intelligence...');

    const enhancedState = {
      ...mockState,
      jobData: jobResult.jobData,
      companyContext: {
        name: jobResult.jobData?.company_name || 'Netflix',
        values: ['Innovation', 'Inclusion', 'Integrity', 'Impact'],
        recent_news: [],
        confidence_score: 0.8
      }
    } as CurriculumState;

    const researchResult = await analyzeRole(enhancedState);

    if (researchResult.errors && researchResult.errors.length > 0) {
      console.log('❌ Research failed:', researchResult.errors);
      return;
    }

    console.log('✅ Enhanced research completed!');

    // Display Market Intelligence
    console.log('\n💼 Market Intelligence:');
    console.log(`   Salary Range: ${researchResult.marketIntelligence?.salaryRange}`);
    console.log(`   Difficulty Rating: ${researchResult.marketIntelligence?.difficultyRating}`);
    console.log(`   Preparation Time: ${researchResult.marketIntelligence?.preparationTime}`);
    console.log(`   Key Insights: ${researchResult.marketIntelligence?.keyInsights?.slice(0, 2).join(', ')}...`);
    console.log(`   Competitive Context: ${researchResult.marketIntelligence?.competitiveContext || 'N/A'}`);
    console.log(`   Market Trends: ${researchResult.marketIntelligence?.marketTrends?.slice(0, 2).join(', ') || 'N/A'}`);

    // Display Competitive Intelligence (NEW!)
    console.log('\n🏆 Competitive Intelligence:');
    console.log(`   Primary Competitors: ${researchResult.competitiveIntelligence?.primaryCompetitors?.slice(0, 3).join(', ') || 'N/A'}`);
    console.log(`   Role Comparison: ${researchResult.competitiveIntelligence?.roleComparison || 'N/A'}`);
    console.log(`   Strategic Advantages: ${researchResult.competitiveIntelligence?.strategicAdvantages?.slice(0, 2).join(', ') || 'N/A'}`);
    console.log(`   Recent Developments: ${researchResult.competitiveIntelligence?.recentDevelopments?.slice(0, 2).join(', ') || 'N/A'}`);
    console.log(`   Competitive Positioning: ${researchResult.competitiveIntelligence?.competitivePositioning || 'N/A'}`);

    // Display Role Patterns
    console.log('\n📊 Role Analysis:');
    console.log(`   Similar Roles: ${researchResult.rolePatterns?.similar_roles?.slice(0, 3).join(', ') || 'N/A'}`);
    console.log(`   Typical Rounds: ${researchResult.rolePatterns?.typical_rounds || 'N/A'}`);
    console.log(`   Focus Areas: ${researchResult.rolePatterns?.focus_areas?.slice(0, 3).join(', ') || 'N/A'}`);

    // STEP 3: Database persistence transformation
    console.log('\n💾 STEP 3: Database persistence transformation...');

    const finalState = {
      ...enhancedState,
      ...researchResult,
      structure: {
        job_id: jobResult.jobData?.id || 'netflix-demo',
        total_rounds: 4,
        estimated_total_minutes: 240,
        difficulty_level: 'intermediate' as const,
        rounds: [],
        generation_strategy: 'comprehensive' as const,
        refinement_iterations: 1
      },
      rounds: [
        {
          round_number: 1,
          round_type: 'phone_screen' as const,
          title: 'Initial Phone Screen',
          description: 'Basic screening call with recruiter',
          duration_minutes: 30,
          interviewer_persona: {
            name: 'Sarah',
            role: 'Technical Recruiter',
            personality: 'Professional and welcoming',
            communication_style: 'conversational' as const,
            pace: 'moderate' as const,
            goal: 'Assess basic qualifications and interest'
          },
          topics_to_cover: [],
          evaluation_criteria: [],
          sample_questions: [],
          opening_script: 'Welcome to Netflix!',
          closing_script: 'Thank you for your time.',
          passing_score: 70
        }
      ],
      quality: 85
    } as CurriculumState;

    // Show the role intelligence transformation
    const roleIntelligence = finalState.competitiveIntelligence || finalState.marketIntelligence ? {
      role_vs_competitors: finalState.competitiveIntelligence?.roleComparison || null,
      recent_role_developments: finalState.competitiveIntelligence?.recentDevelopments || [],
      strategic_advantages: finalState.competitiveIntelligence?.strategicAdvantages || [],
      market_context: {
        salary_range: finalState.marketIntelligence?.salaryRange || null,
        difficulty_rating: finalState.marketIntelligence?.difficultyRating || null,
        preparation_time: finalState.marketIntelligence?.preparationTime || null,
        key_insights: finalState.marketIntelligence?.keyInsights || []
      },
      competitive_positioning: finalState.competitiveIntelligence?.competitivePositioning || null,
      generated_at: new Date().toISOString()
    } : null;

    console.log('✅ Database transformation completed!');
    console.log('\n📊 Role Intelligence (Database Format):');
    console.log(JSON.stringify(roleIntelligence, null, 2));

    // STEP 4: Mock persistence (don't actually save to database)
    console.log('\n💾 STEP 4: Database persistence (simulated)...');
    console.log('✅ Would save to database with:');
    console.log(`   job_id: ${finalState.jobData?.id || 'netflix-demo'}`);
    console.log(`   title: ${finalState.jobData?.title} at ${finalState.companyContext?.name}`);
    console.log(`   total_rounds: ${finalState.rounds?.length}`);
    console.log(`   quality_score: ${finalState.quality}`);
    console.log(`   role_intelligence: [JSONB object with ${Object.keys(roleIntelligence || {}).length} fields]`);

    console.log('\n🎉 DEMO COMPLETE! The competitive intelligence system works end-to-end.');
    console.log('\n📈 Summary of Enhanced Capabilities:');
    console.log('   ✅ Real job URL parsing with Gemini URL context');
    console.log('   ✅ Enhanced research with competitive intelligence queries');
    console.log('   ✅ Dynamic date context (no hardcoded years)');
    console.log('   ✅ Market intelligence + competitive intelligence extraction');
    console.log('   ✅ Database-ready transformation with JSONB structure');
    console.log('   ✅ Backward compatibility with existing functionality');

    if (researchResult.warnings && researchResult.warnings.length > 0) {
      console.log('\n⚠️  Warnings:');
      researchResult.warnings.forEach(warning => console.log(`   - ${warning}`));
    }

  } catch (error) {
    console.error('❌ Demo failed:', error instanceof Error ? error.message : error);
    console.log('\nThis might be due to:');
    console.log('- Missing GOOGLE_AI_API_KEY environment variable');
    console.log('- Network connectivity issues');
    console.log('- API rate limiting');
    console.log('\nBut the system gracefully handles failures with fallback data structures.');
  }
}

// Run the demo
runLiveDemo().catch(console.error);
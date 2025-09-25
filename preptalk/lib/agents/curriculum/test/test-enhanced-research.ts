// Test Enhanced Research with Google Search + URL Context
// Tests comprehensive company intelligence gathering

import { config } from 'dotenv';
import { join } from 'path';
import { parseJob, analyzeRole } from '../nodes/research';
import { CurriculumState } from '../state';

// Load environment variables from .env.local
config({ path: join(process.cwd(), '.env.local') });

// Test with Netflix job URL
const testNetflixResearch = async () => {
  console.log('🧪 Testing Enhanced Research with Netflix Job...\n');

  // Simulate state after discovery phase
  const mockState: Partial<CurriculumState> = {
    userInput: 'https://explore.jobs.netflix.net/careers?pid=790311846068&domain=netflix.com&sort_by=relevance',
    inputType: 'url',
    discoveredSources: [{
      url: 'https://explore.jobs.netflix.net/careers?pid=790311846068&domain=netflix.com&sort_by=relevance',
      sourceType: 'official',
      trustScore: 0.95,
      priority: 'core',
      validation: {
        isUseful: true,
        confidence: 0.9
      }
    }],
    currentStep: 'research',
    progress: 30,
    startTime: Date.now(),
    errors: [],
    warnings: []
  };

  try {
    console.log('📋 Step 1: Parse Job Details from URL...');
    const parseResult = await parseJob(mockState as CurriculumState);

    if (parseResult.errors?.length) {
      console.error('❌ Job parsing failed:', parseResult.errors);
      return;
    }

    console.log('✅ Job parsed successfully:');
    console.log(`   Title: ${parseResult.jobData?.title || 'Not extracted'}`);
    console.log(`   Company: ${parseResult.jobData?.company_name || 'Not extracted'}`);
    console.log(`   Level: ${parseResult.jobData?.level || 'Not extracted'}`);
    console.log(`   Location: ${parseResult.jobData?.location || 'Not extracted'}`);
    console.log(`   Skills: ${parseResult.jobData?.required_skills?.slice(0, 3).join(', ') || 'Not extracted'}...`);

    // Update state with parsed job
    const updatedState = {
      ...mockState,
      ...parseResult,
      currentStep: 'analyze_role',
      progress: 50
    } as CurriculumState;

    console.log('\n🔍 Step 2: Enhanced Role Analysis with Google Search...');
    console.log('   Researching: Company culture, interview experiences, salary data');

    const analysisResult = await analyzeRole(updatedState);

    if (analysisResult.errors?.length) {
      console.error('❌ Role analysis failed:', analysisResult.errors);
      return;
    }

    console.log('\n✅ Enhanced Research Results:');

    // Role Patterns
    console.log('\n📊 Role Intelligence:');
    console.log(`   Similar Roles: ${analysisResult.rolePatterns?.similar_roles?.join(', ')}`);
    console.log(`   Typical Rounds: ${analysisResult.rolePatterns?.typical_rounds}`);
    console.log(`   Focus Areas: ${analysisResult.rolePatterns?.focus_areas?.slice(0, 3).join(', ')}...`);
    console.log(`   Interview Formats: ${analysisResult.rolePatterns?.interview_formats?.join(', ')}`);

    // Company Context (enhanced with research)
    console.log('\n🏢 Company Intelligence:');
    console.log(`   Company: ${analysisResult.companyContext?.name}`);
    console.log(`   Values: ${analysisResult.companyContext?.values?.slice(0, 3).join(', ')}...`);
    console.log(`   Interview Difficulty: ${analysisResult.companyContext?.interview_process?.difficulty_rating}`);
    console.log(`   Typical Rounds: ${analysisResult.companyContext?.interview_process?.typical_rounds}`);
    console.log(`   Confidence: ${analysisResult.companyContext?.confidence_score}`);

    // Market Intelligence (new!)
    console.log('\n💰 Market Intelligence:');
    console.log(`   Salary Range: ${analysisResult.marketIntelligence?.salaryRange}`);
    console.log(`   Difficulty Rating: ${analysisResult.marketIntelligence?.difficultyRating}`);
    console.log(`   Prep Time: ${analysisResult.marketIntelligence?.preparationTime}`);
    console.log(`   Key Insights: ${analysisResult.marketIntelligence?.keyInsights?.length} insights found`);

    if (analysisResult.marketIntelligence?.keyInsights?.length) {
      analysisResult.marketIntelligence.keyInsights.slice(0, 2).forEach((insight, i) => {
        console.log(`     ${i + 1}. ${insight}`);
      });
    }

    console.log('\n🎯 Research Quality Assessment:');

    // Check if we got comprehensive data beyond just the job posting
    const hasCompanyInsights = analysisResult.companyContext?.values?.length > 2;
    const hasMarketData = analysisResult.marketIntelligence?.salaryRange !== 'Market competitive';
    const hasInterviewIntel = analysisResult.marketIntelligence?.keyInsights?.length > 0;

    console.log(`   Company Insights: ${hasCompanyInsights ? '✅' : '⚠️'} ${hasCompanyInsights ? 'Rich data' : 'Basic data'}`);
    console.log(`   Market Data: ${hasMarketData ? '✅' : '⚠️'} ${hasMarketData ? 'Specific insights' : 'Generic data'}`);
    console.log(`   Interview Intel: ${hasInterviewIntel ? '✅' : '⚠️'} ${hasInterviewIntel ? 'Found experiences' : 'No experiences'}`);

    const overallQuality = [hasCompanyInsights, hasMarketData, hasInterviewIntel].filter(Boolean).length;
    console.log(`   Overall Quality: ${overallQuality}/3 ${overallQuality >= 2 ? '🌟' : overallQuality === 1 ? '⭐' : '❌'}`);

    if (overallQuality >= 2) {
      console.log('\n🎉 Enhanced research successful! Google Search provided comprehensive intelligence.');
    } else {
      console.log('\n⚠️  Research may need optimization - limited additional intelligence gathered.');
    }

  } catch (error) {
    console.error('❌ Test failed:', error);

    if (error instanceof Error) {
      if (error.message.includes('GOOGLE_AI_API_KEY')) {
        console.log('💡 Make sure GOOGLE_AI_API_KEY is set in your environment');
      } else if (error.message.includes('Failed to parse JSON')) {
        console.log('💡 LLM response parsing issue - may need prompt refinement');
      }
    }
  }
};

// Run the test
if (require.main === module) {
  testNetflixResearch().catch(console.error);
}

export { testNetflixResearch };
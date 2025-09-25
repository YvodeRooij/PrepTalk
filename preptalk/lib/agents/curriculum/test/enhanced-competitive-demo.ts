// Enhanced Competitive Intelligence Demo
// Shows the improved specificity and detail level

import { config } from 'dotenv';
import { join } from 'path';

// Load environment variables
config({ path: join(process.cwd(), '.env.local') });

// Import our enhanced functions
import { analyzeRole } from '../nodes/research';
import type { CurriculumState, ParsedJob, CompanyContext } from '../types';

async function runEnhancedDemo() {
  console.log('🚀 Enhanced Competitive Intelligence Demo');
  console.log('=' .repeat(50));

  // Use the successfully parsed Netflix data from our previous demo
  const netflixJobData: ParsedJob = {
    id: 'netflix-tax-analyst-emea',
    title: 'Analyst, Indirect Tax - EMEA',
    company_name: 'Netflix',
    level: 'mid',
    responsibilities: [
      'Prepare various indirect tax returns in EMEA jurisdictions',
      'Support month-end close process',
      'Support withholding tax compliance and reporting'
    ],
    required_skills: [
      'Minimum of 4 years experience in indirect tax compliance',
      'Solid understanding of international VAT principles',
      'Degree in Tax, Finance, Accounting, or related field',
      'Strong Excel or Google Sheets skills',
      'Experience with large data sets'
    ],
    preferred_skills: [
      'CPA, EA, or similar professional qualification',
      'Experience with tax technology and automation',
      'EMEA indirect tax experience'
    ],
    experience_level: '4+ years',
    location: 'Amsterdam, Netherlands',
    work_arrangement: 'hybrid',
    raw_description: 'Netflix Tax Analyst role in EMEA',
    parsing_confidence: 0.9,
    extraction_timestamp: new Date().toISOString()
  };

  const companyContext: CompanyContext = {
    name: 'Netflix',
    values: ['Innovation', 'Inclusion', 'Integrity', 'Impact'],
    recent_news: [],
    confidence_score: 0.8
  };

  console.log('\n📋 Input Job Data:');
  console.log(`   Title: ${netflixJobData.title}`);
  console.log(`   Company: ${netflixJobData.company_name}`);
  console.log(`   Level: ${netflixJobData.level}`);
  console.log(`   Location: ${netflixJobData.location}`);

  console.log('\n🔬 Running ENHANCED competitive intelligence research...');
  console.log('   → Using 8 specific competitive queries');
  console.log('   → Demanding detailed context and numbers');
  console.log('   → Requiring specific examples vs generic statements');

  try {
    const mockState: CurriculumState = {
      jobData: netflixJobData,
      companyContext: companyContext,
      // Add other required fields with defaults
      userInput: netflixJobData.raw_description,
      inputType: 'description',
      discoveredSources: [],
      currentStep: 'research',
      progress: 50,
      errors: [],
      warnings: [],
      refinementAttempts: 0,
      quality: 0,
      startTime: Date.now(),
      endTime: Date.now()
    };

    const result = await analyzeRole(mockState);

    if (result.errors && result.errors.length > 0) {
      console.log('❌ Enhanced research encountered errors:', result.errors);
      return;
    }

    console.log('\n✅ Enhanced competitive intelligence generated!');
    console.log('\n🏆 ENHANCED Competitive Intelligence:');
    console.log('─'.repeat(50));

    const competitive = result.competitiveIntelligence;
    if (competitive) {
      console.log('\n💼 Primary Competitors:');
      competitive.primaryCompetitors?.forEach((competitor, i) => {
        console.log(`   ${i + 1}. ${competitor}`);
      });

      console.log('\n🔍 Role Comparison (Enhanced):');
      console.log(`   ${competitive.roleComparison}`);

      console.log('\n🎯 Strategic Advantages (Enhanced):');
      competitive.strategicAdvantages?.forEach((advantage, i) => {
        console.log(`   ${i + 1}. ${advantage}`);
      });

      console.log('\n📈 Recent Developments (Enhanced):');
      competitive.recentDevelopments?.forEach((development, i) => {
        console.log(`   ${i + 1}. ${development}`);
      });

      console.log('\n🏢 Competitive Positioning (Enhanced):');
      console.log(`   ${competitive.competitivePositioning}`);
    }

    const market = result.marketIntelligence;
    if (market) {
      console.log('\n💰 Market Context (Enhanced):');
      console.log('─'.repeat(50));
      console.log(`   Competitive Salary Context: ${market.competitiveContext || 'N/A'}`);
      console.log('\n   Market Trends:');
      market.marketTrends?.forEach((trend, i) => {
        console.log(`   ${i + 1}. ${trend}`);
      });
    }

    console.log('\n📊 Comparison: Before vs After Enhancement');
    console.log('─'.repeat(50));
    console.log('BEFORE (Generic):');
    console.log('   - Role Comparison: "More innovative than traditional tax roles"');
    console.log('   - Strategic Advantages: "Global streaming leadership"');
    console.log('   - Market Position: "Dominant but facing competition"');

    console.log('\nAFTER (Enhanced - see above for actual results)');
    console.log('   ✅ Specific company names with context');
    console.log('   ✅ Detailed 2-3 sentence analyses');
    console.log('   ✅ Specific examples and numbers where available');
    console.log('   ✅ Recent developments with dates/context');
    console.log('   ✅ Actionable competitive insights');

  } catch (error) {
    console.error('❌ Demo failed:', error instanceof Error ? error.message : error);
  }
}

// Run the enhanced demo
runEnhancedDemo().catch(console.error);
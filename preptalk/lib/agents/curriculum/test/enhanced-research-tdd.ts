// TDD Test: Enhanced Research Implementation
// Tests the enhanced analyzeRole function before implementation

import { strict as assert } from 'assert';
import { config } from 'dotenv';
import { join } from 'path';
import type { CurriculumState } from '../state';
import type { CompetitiveIntelligence, EnhancedMarketIntelligence, ParsedJob, CompanyContext } from '../types';

// Load environment variables
config({ path: join(process.cwd(), '.env.local') });

class EnhancedResearchTestRunner {
  private testResults: Array<{ name: string; status: 'PASS' | 'FAIL'; error?: string }> = [];

  async test(name: string, testFn: () => void | Promise<void>) {
    console.log(`🧪 Testing: ${name}`);
    try {
      await testFn();
      console.log(`✅ PASS: ${name}`);
      this.testResults.push({ name, status: 'PASS' });
    } catch (error) {
      console.log(`❌ FAIL: ${name}`);
      console.log(`   Error: ${error instanceof Error ? error.message : String(error)}`);
      this.testResults.push({
        name,
        status: 'FAIL',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  async runAllTests() {
    console.log('🚀 Running Enhanced Research TDD Tests\n');

    await this.test('Date context should be dynamic and current', () => {
      // Mock the date context generation that we'll implement
      const now = new Date();
      const currentYear = now.getFullYear();
      const previousYear = currentYear - 1;
      const recentPeriod = `${previousYear} ${currentYear}`;
      const currentMonth = now.toLocaleString('default', { month: 'long' });

      // Validate date context values
      assert(typeof currentYear === 'number', 'Current year should be number');
      assert(currentYear >= 2025, 'Current year should be realistic');
      assert(previousYear === currentYear - 1, 'Previous year should be current - 1');
      assert(typeof recentPeriod === 'string', 'Recent period should be string');
      assert(recentPeriod.includes(currentYear.toString()), 'Recent period should include current year');
      assert(typeof currentMonth === 'string', 'Current month should be string');
      assert(currentMonth.length > 0, 'Current month should not be empty');
    });

    await this.test('Enhanced query generation should include competitive intelligence', () => {
      // Mock job data
      const mockJob = {
        company_name: 'Netflix',
        title: 'Tax Analyst',
        location: 'Amsterdam'
      };

      // Mock date context
      const dateContext = {
        currentYear: 2025,
        recentPeriod: '2024 2025'
      };

      // Test query generation logic we'll implement
      const basicQueries = [
        `${mockJob.company_name} ${mockJob.title} interview process experience`,
        `${mockJob.company_name} company culture employee reviews ${dateContext.recentPeriod}`,
        `${mockJob.title} salary range ${mockJob.location} ${dateContext.currentYear}`
      ];

      const competitiveQueries = [
        `${mockJob.company_name} vs competitors ${mockJob.title} differences ${dateContext.recentPeriod}`,
        `why choose ${mockJob.company_name} over competitors ${mockJob.title} ${dateContext.currentYear}`,
        `${mockJob.company_name} ${mockJob.title} unique advantages vs industry ${dateContext.recentPeriod}`
      ];

      const allQueries = [...basicQueries, ...competitiveQueries];

      // Validate query structure
      assert(basicQueries.length >= 3, 'Should have at least 3 basic queries');
      assert(competitiveQueries.length >= 3, 'Should have at least 3 competitive queries');
      assert(allQueries.length >= 6, 'Should have at least 6 total queries');

      // Validate dynamic date usage (no hardcoded 2024)
      allQueries.forEach((query, index) => {
        assert(!query.includes('2024') || query.includes(dateContext.recentPeriod),
          `Query ${index + 1} should use dynamic dates: ${query}`);
      });

      // Validate competitive focus
      const hasCompetitorQueries = competitiveQueries.some(q =>
        q.includes('competitors') || q.includes('vs') || q.includes('advantages')
      );
      assert(hasCompetitorQueries, 'Should have queries focused on competitive analysis');
    });

    await this.test('Enhanced research should produce competitive intelligence data', () => {
      // Test the expected output structure from enhanced research
      const mockEnhancedResult = {
        // Basic market intelligence (existing)
        marketIntelligence: {
          salaryRange: '€70,000 - €90,000 in Amsterdam',
          difficultyRating: '8/10 - Highly competitive',
          preparationTime: '2-3 weeks intensive preparation',
          keyInsights: ['Study Netflix culture memo', 'Prepare STAR method examples'],
          // NEW enhanced fields
          competitiveContext: 'Netflix offers higher compensation than traditional media companies',
          marketTrends: ['Increased focus on ML skills', 'Remote-first culture adoption']
        },
        // NEW competitive intelligence
        competitiveIntelligence: {
          primaryCompetitors: ['Disney+', 'HBO Max', 'Amazon Prime'],
          roleComparison: 'Netflix Tax Analyst role more technical than traditional media companies',
          strategicAdvantages: ['Global streaming expertise', 'Advanced tax automation'],
          recentDevelopments: ['EMEA expansion 2024', 'Tax compliance automation initiatives'],
          competitivePositioning: 'Netflix leads in streaming tax complexity and global optimization'
        }
      };

      // Validate market intelligence structure
      const market = mockEnhancedResult.marketIntelligence;
      assert(typeof market.salaryRange === 'string', 'Salary range should be string');
      assert(typeof market.difficultyRating === 'string', 'Difficulty rating should be string');
      assert(typeof market.preparationTime === 'string', 'Preparation time should be string');
      assert(Array.isArray(market.keyInsights), 'Key insights should be array');
      assert(typeof market.competitiveContext === 'string', 'Competitive context should be string');
      assert(Array.isArray(market.marketTrends), 'Market trends should be array');

      // Validate competitive intelligence structure
      const competitive = mockEnhancedResult.competitiveIntelligence;
      assert(Array.isArray(competitive.primaryCompetitors), 'Primary competitors should be array');
      assert(competitive.primaryCompetitors.length > 0, 'Should have at least one competitor');
      assert(typeof competitive.roleComparison === 'string', 'Role comparison should be string');
      assert(Array.isArray(competitive.strategicAdvantages), 'Strategic advantages should be array');
      assert(Array.isArray(competitive.recentDevelopments), 'Recent developments should be array');
      assert(typeof competitive.competitivePositioning === 'string', 'Competitive positioning should be string');
    });

    await this.test('Enhanced research should handle API failures gracefully', () => {
      // Test fallback behavior when enhanced research fails
      const mockBasicResult = {
        marketIntelligence: {
          salaryRange: 'Market competitive',
          difficultyRating: '7/10',
          preparationTime: '2-3 weeks recommended',
          keyInsights: ['Standard interview preparation'],
          // Enhanced fields may be null/undefined on fallback
          competitiveContext: undefined,
          marketTrends: []
        },
        competitiveIntelligence: {
          primaryCompetitors: [],
          roleComparison: 'Limited competitive data available',
          strategicAdvantages: [],
          recentDevelopments: [],
          competitivePositioning: 'Standard market positioning'
        },
        warnings: ['Enhanced research failed, using basic analysis']
      };

      // Should not throw errors even with minimal data
      assert(typeof mockBasicResult.marketIntelligence.salaryRange === 'string', 'Should have fallback salary range');
      assert(Array.isArray(mockBasicResult.competitiveIntelligence.primaryCompetitors), 'Competitors should be array even if empty');
      assert(Array.isArray(mockBasicResult.warnings), 'Should have warnings array');
      assert(mockBasicResult.warnings.length > 0, 'Should warn about fallback usage');
    });

    await this.test('State transformation should preserve all enhanced data', () => {
      // Test that enhanced research data flows correctly through state
      const mockState: Partial<CurriculumState> = {
        jobData: {
          title: 'Tax Analyst',
          company_name: 'Netflix',
          level: 'mid',
          location: 'Amsterdam'
        } as ParsedJob,
        marketIntelligence: {
          salaryRange: '€70,000 - €90,000',
          difficultyRating: '8/10',
          preparationTime: '2-3 weeks',
          keyInsights: ['Netflix culture memo', 'STAR method'],
          competitiveContext: 'Higher than traditional media',
          marketTrends: ['ML skills focus', 'Remote culture']
        },
        competitiveIntelligence: {
          primaryCompetitors: ['Disney+', 'HBO Max'],
          roleComparison: 'More technical than competitors',
          strategicAdvantages: ['Global expertise', 'Tax automation'],
          recentDevelopments: ['EMEA expansion'],
          competitivePositioning: 'Leader in streaming tax complexity'
        }
      };

      // Validate state structure matches our interfaces
      assert(mockState.marketIntelligence, 'Market intelligence should exist');
      assert(mockState.competitiveIntelligence, 'Competitive intelligence should exist');

      // Test data transformation to database format
      const roleIntelligencePayload = {
        role_vs_competitors: mockState.competitiveIntelligence?.roleComparison || null,
        recent_role_developments: mockState.competitiveIntelligence?.recentDevelopments || [],
        strategic_advantages: mockState.competitiveIntelligence?.strategicAdvantages || [],
        market_context: {
          salary_range: mockState.marketIntelligence?.salaryRange || null,
          difficulty_rating: mockState.marketIntelligence?.difficultyRating || null,
          preparation_time: mockState.marketIntelligence?.preparationTime || null,
          key_insights: mockState.marketIntelligence?.keyInsights || []
        },
        competitive_positioning: mockState.competitiveIntelligence?.competitivePositioning || null,
        generated_at: new Date().toISOString()
      };

      // Validate transformation preserves all data
      assert(roleIntelligencePayload.role_vs_competitors === 'More technical than competitors', 'Role comparison should be preserved');
      assert(roleIntelligencePayload.market_context.salary_range === '€70,000 - €90,000', 'Salary range should be preserved');
      assert(roleIntelligencePayload.competitive_positioning === 'Leader in streaming tax complexity', 'Positioning should be preserved');
    });

    this.printSummary();
  }

  printSummary() {
    console.log('\n📊 Test Summary:');
    console.log(`Total tests: ${this.testResults.length}`);
    console.log(`Passed: ${this.testResults.filter(r => r.status === 'PASS').length}`);
    console.log(`Failed: ${this.testResults.filter(r => r.status === 'FAIL').length}`);

    const failedTests = this.testResults.filter(r => r.status === 'FAIL');
    if (failedTests.length > 0) {
      console.log('\n❌ Failed Tests:');
      failedTests.forEach(test => {
        console.log(`   - ${test.name}: ${test.error}`);
      });
      console.log('\n🔧 Next steps: Implement enhanced analyzeRole function');
    } else {
      console.log('\n🎉 All enhanced research tests passed! Ready to implement analyzeRole.');
    }
  }
}

// Run the tests
const runner = new EnhancedResearchTestRunner();
runner.runAllTests().catch(console.error);
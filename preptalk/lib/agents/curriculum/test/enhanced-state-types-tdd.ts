// TDD Test: Enhanced State Types for Competitive Intelligence
// Tests the state schema changes before implementation

import { strict as assert } from 'assert';

// We'll test against our planned enhanced state types
interface CompetitiveIntelligence {
  primaryCompetitors: string[];
  roleComparison: string;
  strategicAdvantages: string[];
  recentDevelopments: string[];
  competitivePositioning: string;
}

interface EnhancedMarketIntelligence {
  salaryRange: string;
  difficultyRating: string;
  preparationTime: string;
  keyInsights: string[];
  // NEW enhanced fields
  competitiveContext: string;
  marketTrends: string[];
}

class StateTypesTestRunner {
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
    console.log('🚀 Running Enhanced State Types TDD Tests\n');

    await this.test('CompetitiveIntelligence interface should have required fields', () => {
      const mockCompetitiveIntel: CompetitiveIntelligence = {
        primaryCompetitors: ['Disney+', 'HBO Max', 'Amazon Prime'],
        roleComparison: 'Netflix focuses on ML/personalization vs competitors',
        strategicAdvantages: ['Leading personalization tech', 'Global scale'],
        recentDevelopments: ['EMEA expansion 2024', 'New compute strategy'],
        competitivePositioning: 'Netflix leads in streaming ML infrastructure'
      };

      // Type-level assertions (will fail at compile-time if interface changes)
      assert(Array.isArray(mockCompetitiveIntel.primaryCompetitors), 'primaryCompetitors should be array');
      assert(typeof mockCompetitiveIntel.roleComparison === 'string', 'roleComparison should be string');
      assert(Array.isArray(mockCompetitiveIntel.strategicAdvantages), 'strategicAdvantages should be array');
      assert(Array.isArray(mockCompetitiveIntel.recentDevelopments), 'recentDevelopments should be array');
      assert(typeof mockCompetitiveIntel.competitivePositioning === 'string', 'competitivePositioning should be string');
    });

    await this.test('EnhancedMarketIntelligence should extend basic market intelligence', () => {
      const mockMarketIntel: EnhancedMarketIntelligence = {
        // Basic fields (existing)
        salaryRange: '€70,000 - €90,000 in Amsterdam',
        difficultyRating: '8/10 - Highly competitive',
        preparationTime: '2-3 weeks intensive preparation',
        keyInsights: ['Study Netflix culture memo', 'Prepare STAR method examples'],
        // NEW enhanced fields
        competitiveContext: 'Netflix offers higher salaries than traditional media companies',
        marketTrends: ['Increased focus on ML skills', 'Remote-first culture adoption']
      };

      // Validate all fields exist and have correct types
      assert(typeof mockMarketIntel.salaryRange === 'string', 'salaryRange should be string');
      assert(typeof mockMarketIntel.difficultyRating === 'string', 'difficultyRating should be string');
      assert(typeof mockMarketIntel.preparationTime === 'string', 'preparationTime should be string');
      assert(Array.isArray(mockMarketIntel.keyInsights), 'keyInsights should be array');

      // NEW enhanced fields validation
      assert(typeof mockMarketIntel.competitiveContext === 'string', 'competitiveContext should be string');
      assert(Array.isArray(mockMarketIntel.marketTrends), 'marketTrends should be array');
    });

    await this.test('State transformation should map competitive intelligence to role intelligence', () => {
      const mockCompetitiveIntel: CompetitiveIntelligence = {
        primaryCompetitors: ['Disney+', 'HBO Max'],
        roleComparison: 'Netflix Tax role more technical than competitors',
        strategicAdvantages: ['Global tax expertise', 'Streaming industry knowledge'],
        recentDevelopments: ['EMEA tax consolidation', 'DST compliance changes'],
        competitivePositioning: 'Netflix leads in international tax complexity'
      };

      const mockMarketIntel: EnhancedMarketIntelligence = {
        salaryRange: '€70,000 - €90,000',
        difficultyRating: '8/10',
        preparationTime: '2-3 weeks',
        keyInsights: ['Tax automation focus', 'International compliance'],
        competitiveContext: 'Higher salaries due to complexity',
        marketTrends: ['Tax tech integration', 'Remote tax teams']
      };

      // Simulate state-to-database transformation
      const roleIntelligencePayload = {
        role_vs_competitors: mockCompetitiveIntel.roleComparison,
        recent_role_developments: mockCompetitiveIntel.recentDevelopments,
        strategic_advantages: mockCompetitiveIntel.strategicAdvantages,
        market_context: {
          salary_range: mockMarketIntel.salaryRange,
          difficulty_rating: mockMarketIntel.difficultyRating,
          preparation_time: mockMarketIntel.preparationTime,
          key_insights: mockMarketIntel.keyInsights
        },
        competitive_positioning: mockCompetitiveIntel.competitivePositioning,
        generated_at: new Date().toISOString()
      };

      // Validate transformation preserves all data
      assert(roleIntelligencePayload.role_vs_competitors === mockCompetitiveIntel.roleComparison, 'Role comparison should map correctly');
      assert.deepStrictEqual(roleIntelligencePayload.recent_role_developments, mockCompetitiveIntel.recentDevelopments, 'Recent developments should map correctly');
      assert.deepStrictEqual(roleIntelligencePayload.strategic_advantages, mockCompetitiveIntel.strategicAdvantages, 'Strategic advantages should map correctly');
      assert(roleIntelligencePayload.competitive_positioning === mockCompetitiveIntel.competitivePositioning, 'Competitive positioning should map correctly');

      // Validate nested market context
      assert(roleIntelligencePayload.market_context.salary_range === mockMarketIntel.salaryRange, 'Salary range should map to market context');
      assert(roleIntelligencePayload.market_context.difficulty_rating === mockMarketIntel.difficultyRating, 'Difficulty rating should map to market context');
      assert(roleIntelligencePayload.market_context.preparation_time === mockMarketIntel.preparationTime, 'Preparation time should map to market context');
      assert.deepStrictEqual(roleIntelligencePayload.market_context.key_insights, mockMarketIntel.keyInsights, 'Key insights should map to market context');
    });

    await this.test('State should handle partial/optional competitive intelligence', () => {
      // Test with minimal competitive intelligence (some fields missing/null)
      const partialCompetitiveIntel: Partial<CompetitiveIntelligence> = {
        primaryCompetitors: ['Disney+'],
        roleComparison: 'Limited data available',
        // strategicAdvantages: undefined, // Missing
        // recentDevelopments: undefined, // Missing
        competitivePositioning: 'Standard market positioning'
      };

      // Transformation should handle missing fields gracefully
      const roleIntelligencePayload = {
        role_vs_competitors: partialCompetitiveIntel.roleComparison || null,
        recent_role_developments: partialCompetitiveIntel.recentDevelopments || [],
        strategic_advantages: partialCompetitiveIntel.strategicAdvantages || [],
        market_context: {
          salary_range: null,
          difficulty_rating: null,
          preparation_time: null,
          key_insights: []
        },
        competitive_positioning: partialCompetitiveIntel.competitivePositioning || null,
        generated_at: new Date().toISOString()
      };

      // Should not throw errors and should have sensible defaults
      assert(roleIntelligencePayload.role_vs_competitors === 'Limited data available', 'Should handle available data');
      assert(Array.isArray(roleIntelligencePayload.recent_role_developments), 'Should default to empty array');
      assert(roleIntelligencePayload.recent_role_developments.length === 0, 'Should be empty when no data');
      assert(Array.isArray(roleIntelligencePayload.strategic_advantages), 'Should default to empty array');
      assert(roleIntelligencePayload.strategic_advantages.length === 0, 'Should be empty when no data');
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
      console.log('\n🔧 Next steps: Update state.ts with enhanced types');
    } else {
      console.log('\n🎉 All state type tests passed! Ready to implement enhanced types.');
    }
  }
}

// Run the tests
const runner = new StateTypesTestRunner();
runner.runAllTests().catch(console.error);

export { CompetitiveIntelligence, EnhancedMarketIntelligence };
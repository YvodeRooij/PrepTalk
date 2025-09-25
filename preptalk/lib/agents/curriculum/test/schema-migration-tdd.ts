// TDD Test Runner: Database Schema Migration for Role Intelligence
// Simple test runner using native Node.js assertions

import { config } from 'dotenv';
import { join } from 'path';
import { createClient } from '@supabase/supabase-js';
import { strict as assert } from 'assert';

// Load environment variables
config({ path: join(process.cwd(), '.env.local') });

class SchemaTestRunner {
  private supabase: ReturnType<typeof createClient>;
  private testResults: Array<{ name: string; status: 'PASS' | 'FAIL'; error?: string }> = [];

  constructor() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase credentials in environment');
    }

    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  async test(name: string, testFn: () => Promise<void>) {
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
    console.log('🚀 Running Schema Migration TDD Tests\n');

    await this.test('Database has curricula table', async () => {
      const { data, error } = await this.supabase
        .from('curricula')
        .select('id')
        .limit(1);

      assert(error === null, `Curricula table should be accessible: ${error?.message}`);
    });

    await this.test('Curricula table should have role_intelligence column', async () => {
      const { data, error } = await this.supabase.rpc('get_table_columns', {
        table_name: 'curricula'
      });

      assert(error === null, `Should be able to query table columns: ${error?.message}`);

      const roleIntelColumn = data?.find(
        (col: any) => col.column_name === 'role_intelligence'
      );

      assert(roleIntelColumn !== undefined, 'role_intelligence column should exist');
      assert(roleIntelColumn.data_type === 'jsonb', `Expected jsonb type, got ${roleIntelColumn.data_type}`);
    });

    await this.test('Default JSONB structure should be valid', async () => {
      // Insert minimal curriculum to test defaults
      const { data, error } = await this.supabase
        .from('curricula')
        .insert({
          title: 'TDD Test Curriculum - Default Structure',
          total_rounds: 3,
          generation_model: 'tdd-test-model'
        })
        .select('id, role_intelligence')
        .single();

      assert(error === null, `Should insert curriculum successfully: ${error?.message}`);

      const roleIntel = data?.role_intelligence;
      assert(roleIntel !== null && typeof roleIntel === 'object', 'role_intelligence should be object');

      // Validate structure
      assert('role_vs_competitors' in roleIntel, 'Should have role_vs_competitors field');
      assert('recent_role_developments' in roleIntel, 'Should have recent_role_developments field');
      assert('strategic_advantages' in roleIntel, 'Should have strategic_advantages field');
      assert('market_context' in roleIntel, 'Should have market_context field');
      assert('competitive_positioning' in roleIntel, 'Should have competitive_positioning field');
      assert('generated_at' in roleIntel, 'Should have generated_at field');

      // Validate nested market_context structure
      const marketContext = roleIntel.market_context;
      assert(typeof marketContext === 'object', 'market_context should be object');
      assert('salary_range' in marketContext, 'market_context should have salary_range');
      assert('difficulty_rating' in marketContext, 'market_context should have difficulty_rating');
      assert('preparation_time' in marketContext, 'market_context should have preparation_time');
      assert('key_insights' in marketContext, 'market_context should have key_insights');

      // Clean up test data
      await this.supabase.from('curricula').delete().eq('id', data.id);
    });

    await this.test('Valid role intelligence data should be accepted', async () => {
      const validRoleIntelligence = {
        role_vs_competitors: 'Netflix focuses on ML/personalization vs competitors',
        recent_role_developments: ['EMEA expansion 2024', 'New compute strategy'],
        strategic_advantages: ['Leading personalization tech', 'Global scale'],
        market_context: {
          salary_range: '€70,000 - €90,000 in Amsterdam',
          difficulty_rating: '8/10 - Highly competitive',
          preparation_time: '2-3 weeks intensive preparation',
          key_insights: ['Study Netflix culture memo', 'Prepare STAR method examples']
        },
        competitive_positioning: 'Netflix leads in streaming ML infrastructure',
        generated_at: new Date().toISOString()
      };

      const { data, error } = await this.supabase
        .from('curricula')
        .insert({
          title: 'TDD Test - Valid Role Intelligence',
          total_rounds: 4,
          generation_model: 'tdd-test-model',
          role_intelligence: validRoleIntelligence
        })
        .select('id, role_intelligence')
        .single();

      assert(error === null, `Should accept valid role intelligence: ${error?.message}`);

      // Verify the data was saved correctly
      assert.deepStrictEqual(
        data?.role_intelligence,
        validRoleIntelligence,
        'Saved role intelligence should match input exactly'
      );

      // Clean up
      await this.supabase.from('curricula').delete().eq('id', data.id);
    });

    await this.test('GIN indexes should exist for performance', async () => {
      const { data, error } = await this.supabase
        .from('pg_indexes')
        .select('indexname, indexdef')
        .eq('tablename', 'curricula');

      assert(error === null, `Should query indexes successfully: ${error?.message}`);

      const roleIntelIndex = data?.find(idx =>
        idx.indexname === 'idx_curricula_role_intelligence' &&
        idx.indexdef.includes('gin')
      );

      assert(roleIntelIndex !== undefined, 'Should have GIN index on role_intelligence column');
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
      console.log('\n🔧 Next steps: Run database migration to make tests pass');
    } else {
      console.log('\n🎉 All tests passed! Schema migration is working correctly.');
    }
  }
}

// Run the tests
const runner = new SchemaTestRunner();
runner.runAllTests().catch(console.error);
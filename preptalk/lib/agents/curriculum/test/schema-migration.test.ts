// TDD Test: Database Schema Migration for Role Intelligence
// Tests the database schema changes before implementation

import { config } from 'dotenv';
import { join } from 'path';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
config({ path: join(process.cwd(), '.env.local') });

describe('Database Schema Migration - Role Intelligence', () => {
  let supabase: ReturnType<typeof createClient>;

  beforeAll(() => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase credentials in environment');
    }

    supabase = createClient(supabaseUrl, supabaseKey);
  });

  describe('curricula table schema', () => {
    test('should have role_intelligence column', async () => {
      const { data, error } = await supabase.rpc('get_table_columns', {
        table_name: 'curricula'
      });

      expect(error).toBeNull();

      const roleIntelligenceColumn = data?.find(
        (col: any) => col.column_name === 'role_intelligence'
      );

      expect(roleIntelligenceColumn).toBeDefined();
      expect(roleIntelligenceColumn.data_type).toBe('jsonb');
      expect(roleIntelligenceColumn.is_nullable).toBe('YES');
    });

    test('should have default JSONB structure for role_intelligence', async () => {
      // Insert a minimal curriculum to test default values
      const { data, error } = await supabase
        .from('curricula')
        .insert({
          title: 'Test Curriculum for Schema Validation',
          total_rounds: 3,
          generation_model: 'test-model'
        })
        .select('role_intelligence')
        .single();

      expect(error).toBeNull();
      expect(data?.role_intelligence).toBeDefined();

      // Validate default structure
      const roleIntel = data?.role_intelligence;
      expect(roleIntel).toHaveProperty('role_vs_competitors', null);
      expect(roleIntel).toHaveProperty('recent_role_developments', expect.arrayContaining([]));
      expect(roleIntel).toHaveProperty('strategic_advantages', expect.arrayContaining([]));
      expect(roleIntel).toHaveProperty('market_context');
      expect(roleIntel.market_context).toHaveProperty('salary_range', null);
      expect(roleIntel.market_context).toHaveProperty('difficulty_rating', null);
      expect(roleIntel.market_context).toHaveProperty('preparation_time', null);
      expect(roleIntel.market_context).toHaveProperty('key_insights', expect.arrayContaining([]));
      expect(roleIntel).toHaveProperty('competitive_positioning', null);
      expect(roleIntel).toHaveProperty('generated_at', null);

      // Clean up test data
      await supabase.from('curricula').delete().eq('id', data.id);
    });

    test('should validate JSONB structure constraint', async () => {
      // Test that invalid structure is rejected
      const { error } = await supabase
        .from('curricula')
        .insert({
          title: 'Test Invalid Structure',
          total_rounds: 3,
          generation_model: 'test-model',
          role_intelligence: { invalid_structure: true } // Missing required fields
        });

      expect(error).toBeDefined();
      expect(error?.message).toContain('role_intelligence_valid_structure');
    });

    test('should accept valid role intelligence data', async () => {
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

      const { data, error } = await supabase
        .from('curricula')
        .insert({
          title: 'Test Valid Role Intelligence',
          total_rounds: 4,
          generation_model: 'test-model',
          role_intelligence: validRoleIntelligence
        })
        .select('id, role_intelligence')
        .single();

      expect(error).toBeNull();
      expect(data?.role_intelligence).toEqual(validRoleIntelligence);

      // Clean up
      await supabase.from('curricula').delete().eq('id', data.id);
    });
  });

  describe('indexes and performance', () => {
    test('should have GIN index on role_intelligence', async () => {
      const { data, error } = await supabase
        .from('pg_indexes')
        .select('indexname, indexdef')
        .eq('tablename', 'curricula')
        .like('indexname', '%role_intelligence%');

      expect(error).toBeNull();
      expect(data?.length).toBeGreaterThan(0);

      const ginIndex = data?.find(idx =>
        idx.indexname === 'idx_curricula_role_intelligence' &&
        idx.indexdef.includes('gin')
      );

      expect(ginIndex).toBeDefined();
    });
  });
});

export {};
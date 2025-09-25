// Migration Runner: Apply database schema changes
// Executes SQL migration files to make TDD tests pass

import { config } from 'dotenv';
import { join } from 'path';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Load environment variables
config({ path: join(process.cwd(), '.env.local') });

class MigrationRunner {
  private supabase: ReturnType<typeof createClient>;

  constructor() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase credentials in environment');
    }

    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  async runMigration(migrationFile: string) {
    console.log(`🔧 Running migration: ${migrationFile}`);

    try {
      // Read the SQL migration file
      const migrationPath = join(process.cwd(), 'lib/agents/curriculum/migrations', migrationFile);
      const migrationSQL = readFileSync(migrationPath, 'utf8');

      console.log(`📜 Migration SQL Preview:`);
      console.log(migrationSQL.split('\n').slice(0, 10).join('\n') + '...\n');

      // Execute the migration
      const { data, error } = await this.supabase.rpc('exec', {
        sql: migrationSQL
      });

      if (error) {
        console.log(`❌ Migration failed: ${error.message}`);
        throw error;
      }

      console.log(`✅ Migration completed successfully`);
      return data;

    } catch (error) {
      if (error instanceof Error && error.message.includes('exec')) {
        // Try executing with raw SQL instead
        console.log(`⚠️  RPC 'exec' not available, trying alternative approach...`);
        return await this.executeSQLDirectly(migrationFile);
      }
      throw error;
    }
  }

  private async executeSQLDirectly(migrationFile: string) {
    console.log(`🔄 Executing SQL statements individually...`);

    const migrationPath = join(process.cwd(), 'lib/agents/curriculum/migrations', migrationFile);
    const migrationSQL = readFileSync(migrationPath, 'utf8');

    // Split SQL into individual statements (simplified approach)
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt && !stmt.startsWith('--') && stmt !== 'BEGIN' && stmt !== 'COMMIT');

    for (const [index, statement] of statements.entries()) {
      if (!statement) continue;

      console.log(`   Executing statement ${index + 1}/${statements.length}...`);

      try {
        const { error } = await this.supabase.rpc('sql', {
          query: statement + ';'
        });

        if (error) {
          console.log(`   ❌ Statement failed: ${error.message}`);
          console.log(`   Statement: ${statement.substring(0, 100)}...`);
          throw error;
        }

        console.log(`   ✅ Statement completed`);
      } catch (err) {
        // If RPC doesn't work, we'll need manual SQL execution
        console.log(`   ⚠️  Cannot execute SQL programmatically`);
        console.log(`   📋 Please run this SQL manually in Supabase SQL editor:`);
        console.log('\n--- MANUAL MIGRATION SQL ---');
        console.log(migrationSQL);
        console.log('--- END MIGRATION SQL ---\n');

        console.log(`   Then run: npx tsx lib/agents/curriculum/test/schema-migration-tdd.ts`);
        return;
      }
    }

    console.log(`✅ All SQL statements executed successfully`);
  }

  async rollbackMigration(rollbackFile: string) {
    console.log(`🔄 Rolling back migration: ${rollbackFile}`);

    const rollbackPath = join(process.cwd(), 'lib/agents/curriculum/migrations', rollbackFile);
    const rollbackSQL = readFileSync(rollbackPath, 'utf8');

    console.log(`📋 Please run this rollback SQL manually in Supabase SQL editor:`);
    console.log('\n--- ROLLBACK SQL ---');
    console.log(rollbackSQL);
    console.log('--- END ROLLBACK SQL ---\n');
  }
}

// Run the migration
const runner = new MigrationRunner();

async function main() {
  try {
    console.log('🚀 Starting Database Migration for Role Intelligence\n');

    await runner.runMigration('020_add_role_intelligence.sql');

    console.log('\n🧪 Now running tests to verify migration...\n');

    // Import and run the tests
    const { execSync } = require('child_process');
    execSync('npx tsx lib/agents/curriculum/test/schema-migration-tdd.ts', { stdio: 'inherit' });

  } catch (error) {
    console.error('❌ Migration failed:', error);
    console.log('\n🔄 To rollback, run:');
    console.log('npx tsx lib/agents/curriculum/test/run-migration.ts rollback');
  }
}

// Check command line args
if (process.argv.includes('rollback')) {
  runner.rollbackMigration('020_add_role_intelligence_down.sql').catch(console.error);
} else {
  main().catch(console.error);
}

export { MigrationRunner };
// Script to delete the latest 2 Mistral curricula from database
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_URL not found in environment');
  process.exit(1);
}

if (!supabaseKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY not found in environment');
  process.exit(1);
}

async function deleteLatestMistralCurricula() {
  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log('🔍 Finding latest Mistral curricula...\n');

  // Find curricula related to Mistral
  const { data: curricula, error: fetchError } = await supabase
    .from('curricula')
    .select('id, created_at, job_title, company_name')
    .ilike('company_name', '%mistral%')
    .order('created_at', { ascending: false })
    .limit(5);

  if (fetchError) {
    console.error('❌ Error fetching curricula:', fetchError);
    process.exit(1);
  }

  if (!curricula || curricula.length === 0) {
    console.log('ℹ️  No Mistral curricula found');
    process.exit(0);
  }

  console.log(`📋 Found ${curricula.length} Mistral-related curricula:\n`);
  curricula.forEach((c, idx) => {
    console.log(`${idx + 1}. ID: ${c.id}`);
    console.log(`   Company: ${c.company_name}`);
    console.log(`   Job: ${c.job_title}`);
    console.log(`   Created: ${new Date(c.created_at).toLocaleString()}`);
    console.log('');
  });

  // Select the latest 2
  const toDelete = curricula.slice(0, 2);

  console.log(`\n🗑️  Will DELETE the following ${toDelete.length} curricula:\n`);
  toDelete.forEach((c, idx) => {
    console.log(`${idx + 1}. ${c.id} - ${c.company_name} - ${c.job_title}`);
  });

  console.log('\n⏳ Deleting...');

  // Delete each curriculum (rounds will cascade delete)
  for (const curriculum of toDelete) {
    const { error: deleteError } = await supabase
      .from('curricula')
      .delete()
      .eq('id', curriculum.id);

    if (deleteError) {
      console.error(`❌ Error deleting ${curriculum.id}:`, deleteError);
    } else {
      console.log(`✅ Deleted curriculum ${curriculum.id}`);
    }
  }

  console.log('\n✅ Deletion complete!');
  console.log(`📊 Remaining Mistral curricula: ${curricula.length - toDelete.length}`);
}

deleteLatestMistralCurricula()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });

// Direct test of parseJob with Netflix URL
// Run with: npx tsx lib/agents/curriculum/test/test-netflix-direct.ts

import { config } from 'dotenv';
import { resolve } from 'path';
import { parseJob } from '../nodes/research';
import { CurriculumState } from '../state';

// Load from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

async function testNetflixDirect() {
  const netflixUrl = 'https://explore.jobs.netflix.net/careers?pid=790311846068&domain=netflix.com&sort_by=relevance';

  console.log('🎬 Direct Netflix parseJob Test');
  console.log('=' .repeat(50));

  // Create the exact state our parseJob function expects
  const state: Partial<CurriculumState> = {
    discoveredSources: [{
      url: netflixUrl,
      sourceType: 'official' as const,
      trustScore: 0.95,
      priority: 'core' as const,
      data: {
        title: 'Analyst, Indirect Tax - EMEA',
        company: 'Netflix',
        description: 'Tax analyst role at Netflix for EMEA region'
      },
      validation: {
        isUseful: true,
        confidence: 0.9
      }
    }]
  };

  console.log('🔍 State setup:');
  console.log(`   URL: ${netflixUrl.substring(0, 60)}...`);
  console.log(`   Validation: ${state.discoveredSources[0].validation?.isUseful}`);
  console.log(`   Data available: ${!!state.discoveredSources[0].data}`);

  try {
    console.log('\n📋 Calling parseJob...');
    const result = await parseJob(state as CurriculumState);

    if (result.errors) {
      console.log('❌ Errors:', result.errors);
    }

    if (result.jobData) {
      console.log('✅ SUCCESS! Job data extracted:');
      console.log(`   Title: ${result.jobData.title}`);
      console.log(`   Company: ${result.jobData.company_name}`);
      console.log(`   Level: ${result.jobData.level}`);
      console.log(`   Location: ${result.jobData.location}`);
      console.log(`   Skills: ${result.jobData.required_skills.join(', ')}`);
      console.log(`   Source: ${result.jobData.source_url}`);
    } else {
      console.log('❌ No jobData returned');
    }

  } catch (error) {
    console.log('❌ Exception:', (error as Error).message);
    console.log('Stack:', (error as Error).stack?.split('\n').slice(0, 5).join('\n'));
  }
}

async function testWithUrlOnly() {
  const netflixUrl = 'https://explore.jobs.netflix.net/careers?pid=790311846068&domain=netflix.com&sort_by=relevance';

  console.log('\n\n🎯 Test with URL Only (No Pre-data)');
  console.log('=' .repeat(50));

  // Test with just URL, no pre-fetched data
  const state: Partial<CurriculumState> = {
    discoveredSources: [{
      url: netflixUrl,
      sourceType: 'official' as const,
      trustScore: 0.95,
      priority: 'core' as const,
      data: null, // Force URL context usage
      validation: {
        isUseful: true,
        confidence: 0.9
      }
    }]
  };

  console.log('🔍 State setup (URL only):');
  console.log(`   URL: ${netflixUrl.substring(0, 60)}...`);
  console.log(`   Pre-data: ${state.discoveredSources[0].data}`);
  console.log(`   Should use URL context: Yes`);

  try {
    console.log('\n📋 Calling parseJob with URL context...');
    const result = await parseJob(state as CurriculumState);

    if (result.errors) {
      console.log('❌ Errors:', result.errors);
    }

    if (result.jobData) {
      console.log('✅ SUCCESS with URL context!');
      console.log(`   Title: ${result.jobData.title}`);
      console.log(`   Company: ${result.jobData.company_name}`);
      console.log(`   Level: ${result.jobData.level}`);
      console.log(`   Location: ${result.jobData.location}`);
      console.log(`   Skills: ${result.jobData.required_skills.slice(0, 3).join(', ')}...`);
    } else {
      console.log('❌ No jobData returned from URL context');
    }

  } catch (error) {
    console.log('❌ Exception:', (error as Error).message);
  }
}

async function main() {
  console.log('🚀 Direct Netflix parseJob Test\n');

  if (!process.env.GOOGLE_AI_API_KEY) {
    console.error('❌ Missing GOOGLE_AI_API_KEY');
    process.exit(1);
  }

  await testNetflixDirect();
  await testWithUrlOnly();

  console.log('\n✅ Direct tests completed!');
}

main().catch(console.error);
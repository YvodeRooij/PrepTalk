// Test curriculum generation with real Netflix job URL
// Run with: npx tsx lib/agents/curriculum/test/test-netflix-job.ts

import { config } from 'dotenv';
import { resolve } from 'path';
import { discoverSources, fetchSourceData, mergeResearch } from '../nodes/discovery';
import { parseJob, analyzeRole } from '../nodes/research';
import { CurriculumState } from '../state';

// Load from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

async function testNetflixJob() {
  const netflixUrl = 'https://explore.jobs.netflix.net/careers?pid=790311846068&domain=netflix.com&sort_by=relevance';

  console.log('🎬 Testing Netflix Job URL');
  console.log('=' .repeat(60));
  console.log(`URL: ${netflixUrl}\n`);

  try {
    // Step 1: Discovery Phase
    console.log('🔍 Step 1: Discovery Phase');
    console.log('-' .repeat(30));

    const initialState: Partial<CurriculumState> = {
      userInput: netflixUrl,
      discoveredSources: [],
      errors: [],
      warnings: [],
      refinementAttempts: 0,
    };

    const discoveryResult = await discoverSources(initialState as CurriculumState);

    if (discoveryResult.errors) {
      console.log(`❌ Discovery failed: ${discoveryResult.errors.join(', ')}`);
      return;
    }

    console.log(`✅ Input classified as: ${discoveryResult.inputType}`);
    console.log(`✅ Found ${discoveryResult.discoveredSources?.length || 0} sources`);

    if (discoveryResult.discoveredSources) {
      discoveryResult.discoveredSources.forEach((source, i) => {
        console.log(`   ${i + 1}. ${source.sourceType} - ${source.url.substring(0, 50)}...`);
      });
    }

    // Step 2: Create state with Netflix URL as primary source
    const stateWithSources: Partial<CurriculumState> = {
      ...initialState,
      ...discoveryResult,
      // Ensure we have the Netflix URL as a validated source
      discoveredSources: [{
        url: netflixUrl,
        sourceType: 'official' as const,
        trustScore: 0.95,
        priority: 'core' as const,
        data: null, // No pre-fetched data
        validation: { isUseful: true, confidence: 0.9 }
      }]
    };

    // Step 3: Parse Job (will attempt URL context)
    console.log('\n📋 Step 2: Job Parsing with URL Context');
    console.log('-' .repeat(40));

    const parseResult = await parseJob(stateWithSources as CurriculumState);

    if (parseResult.errors) {
      console.log(`❌ Job parsing failed: ${parseResult.errors.join(', ')}`);

      // Try fallback with manual description
      console.log('\n🔄 Trying fallback with manual description...');
      const fallbackState: Partial<CurriculumState> = {
        ...stateWithSources,
        discoveredSources: [{
          url: '',
          sourceType: 'manual' as const,
          trustScore: 0.8,
          priority: 'core' as const,
          data: {
            description: 'Software Engineer position at Netflix, streaming technology company',
            title: 'Software Engineer',
            company: 'Netflix',
            location: 'Los Gatos, CA',
            type: 'full-time'
          },
          validation: { isUseful: true, confidence: 0.8 }
        }]
      };

      const fallbackParseResult = await parseJob(fallbackState as CurriculumState);

      if (fallbackParseResult.jobData) {
        console.log('✅ Fallback parsing successful!');
        Object.assign(parseResult, fallbackParseResult);
      } else {
        console.log('❌ Fallback also failed');
        return;
      }
    } else {
      console.log('✅ URL context parsing successful!');
    }

    if (parseResult.jobData) {
      console.log('\n📊 Extracted Job Data:');
      console.log(`   Title: ${parseResult.jobData.title}`);
      console.log(`   Company: ${parseResult.jobData.company_name}`);
      console.log(`   Level: ${parseResult.jobData.level}`);
      console.log(`   Location: ${parseResult.jobData.location || 'Not specified'}`);
      console.log(`   Work arrangement: ${parseResult.jobData.work_arrangement || 'Not specified'}`);
      console.log(`   Key skills: ${parseResult.jobData.required_skills.slice(0, 5).join(', ')}...`);
      console.log(`   Confidence: ${parseResult.jobData.parsing_confidence}`);
    }

    // Step 4: Mock company context (since we can't reliably fetch Netflix data)
    const stateWithJob: Partial<CurriculumState> = {
      ...stateWithSources,
      ...parseResult,
      companyContext: {
        name: 'Netflix',
        values: ['innovation', 'customer-obsession', 'excellence', 'diversity', 'inclusion'],
        recent_news: [
          { title: 'Netflix expands streaming technology', url: 'https://about.netflix.com/news', date: '2025-01-01' }
        ],
        interview_process: {
          typical_rounds: 5,
          common_interviewers: ['Hiring Manager', 'Senior Engineer', 'Tech Lead'],
          red_flags: [],
          green_flags: ['Strong technical culture', 'Focus on streaming at scale'],
        },
        confidence_score: 0.8,
      }
    };

    // Step 5: Analyze Role
    console.log('\n🎯 Step 3: Role Pattern Analysis');
    console.log('-' .repeat(35));

    const roleResult = await analyzeRole(stateWithJob as CurriculumState);

    if (roleResult.errors) {
      console.log(`❌ Role analysis failed: ${roleResult.errors.join(', ')}`);
      return;
    }

    if (roleResult.rolePatterns) {
      console.log('✅ Role analysis successful!');
      console.log('\n📊 Interview Patterns:');
      console.log(`   Typical rounds: ${roleResult.rolePatterns.typical_rounds}`);
      console.log(`   Focus areas: ${roleResult.rolePatterns.focus_areas.join(', ')}`);
      console.log(`   Interview formats: ${roleResult.rolePatterns.interview_formats.join(', ')}`);
      console.log(`   Similar roles: ${roleResult.rolePatterns.similar_roles.join(', ')}`);
    }

    console.log('\n🎉 SUCCESS: End-to-end Netflix job processing completed!');

    // Summary
    console.log('\n📈 Test Summary:');
    console.log(`✅ URL Classification: ${discoveryResult.inputType}`);
    console.log(`✅ Job Data Extracted: ${parseResult.jobData ? 'Yes' : 'No'}`);
    console.log(`✅ Role Patterns: ${roleResult.rolePatterns ? 'Yes' : 'No'}`);
    console.log(`✅ Ready for Curriculum Generation: ${parseResult.jobData && roleResult.rolePatterns ? 'Yes' : 'No'}`);

  } catch (error) {
    console.log(`❌ Test failed with exception: ${error instanceof Error ? error.message : 'Unknown error'}`);
    if (error instanceof Error && error.stack) {
      console.log(`Stack trace: ${error.stack.split('\n').slice(0, 5).join('\n')}`);
    }
  }
}

async function main() {
  console.log('🚀 Netflix Job URL Test');
  console.log('Testing real-world curriculum generation\n');

  // Check environment
  if (!process.env.GOOGLE_AI_API_KEY) {
    console.error('❌ Missing GOOGLE_AI_API_KEY environment variable');
    process.exit(1);
  }

  await testNetflixJob();
  console.log('\n✅ Test completed!');
}

main().catch(console.error);
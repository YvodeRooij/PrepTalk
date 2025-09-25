// Test the corrected URL context implementation
// Run with: npx tsx lib/agents/curriculum/test/test-corrected-url-context.ts

import { config } from 'dotenv';
import { resolve } from 'path';
import { parseJob, analyzeRole } from '../nodes/research';
import { CurriculumState } from '../state';

// Load from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

async function testCorrectedUrlContext() {
  console.log('🧪 Testing Corrected URL Context Implementation\n');
  console.log('=' .repeat(50));

  // Test cases with different URL types
  const testCases = [
    {
      name: 'Public accessible URL (should work)',
      state: {
        discoveredSources: [{
          url: 'https://raw.githubusercontent.com/microsoft/vscode/main/README.md',
          sourceType: 'official' as const,
          trustScore: 0.95,
          priority: 'core' as const,
          data: { title: 'Software Engineer' },
          validation: { isUseful: true, confidence: 0.9 }
        }],
      } as Partial<CurriculumState>
    },
    {
      name: 'Restricted job URL (will likely fail)',
      state: {
        discoveredSources: [{
          url: 'https://careers.google.com/jobs/results/12345',
          sourceType: 'official' as const,
          trustScore: 0.95,
          priority: 'core' as const,
          data: { title: 'Software Engineer III' },
          validation: { isUseful: true, confidence: 0.9 }
        }],
      } as Partial<CurriculumState>
    },
    {
      name: 'No URL (structured data only)',
      state: {
        discoveredSources: [{
          url: '',
          sourceType: 'manual' as const,
          trustScore: 0.5,
          priority: 'core' as const,
          data: {
            title: 'Senior Data Scientist',
            company: 'TechCorp',
            level: 'senior',
            skills: ['Python', 'Machine Learning', 'SQL'],
            location: 'San Francisco',
            work_arrangement: 'hybrid'
          },
          validation: { isUseful: true, confidence: 0.8 }
        }],
      } as Partial<CurriculumState>
    }
  ];

  for (const testCase of testCases) {
    console.log(`\n📝 Test: ${testCase.name}`);
    const source = testCase.state.discoveredSources[0];
    console.log(`   URL: ${source.url || 'None (structured data only)'}`);
    console.log(`   Using: ${source.url ? 'URL Context Tool' : 'Structured Data'}`);

    try {
      const startTime = Date.now();
      const result = await parseJob(testCase.state as CurriculumState);
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);

      if (result.errors) {
        console.log(`   ❌ Failed: ${result.errors.join(', ')}`);
      } else if (result.jobData) {
        console.log(`   ✅ Success in ${duration}s`);
        console.log(`   📊 Extracted:`);
        console.log(`      - Title: ${result.jobData.title}`);
        console.log(`      - Company: ${result.jobData.company_name}`);
        console.log(`      - Level: ${result.jobData.level}`);
        console.log(`      - Location: ${result.jobData.location || 'Not specified'}`);
        console.log(`      - Skills: ${result.jobData.required_skills.slice(0, 3).join(', ')}${result.jobData.required_skills.length > 3 ? '...' : ''}`);
      } else {
        console.log(`   ⚠️  No data returned`);
      }
    } catch (error) {
      console.log(`   ❌ Exception: ${error instanceof Error ? error.message : 'Unknown error'}`);
      if (error instanceof Error && error.message.includes('url_context')) {
        console.log(`      This indicates URL context tool issues`);
      }
    }

    // Small delay between tests to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('\n\n📊 Summary:');
  console.log('✅ Corrected Implementation:');
  console.log('   - Using proper url_context tool format');
  console.log('   - URLs included in prompt text');
  console.log('   - Proper fallback to structured data');
  console.log('\n⚠️  Expected Behavior:');
  console.log('   - Public URLs: May work with url_context');
  console.log('   - Job sites: Will likely fail (auth/crawling restrictions)');
  console.log('   - Structured data: Always works as fallback');
  console.log('\n💡 Recommendation:');
  console.log('   - Primary: Text descriptions ("Senior Engineer at Netflix")');
  console.log('   - Secondary: Copy/paste job content');
  console.log('   - Experimental: URL context (limited success)');
}

async function main() {
  console.log('🚀 Testing Corrected URL Context Implementation');
  console.log('Based on official Gemini documentation\n');

  // Check environment
  if (!process.env.GOOGLE_AI_API_KEY) {
    console.error('❌ Missing GOOGLE_AI_API_KEY environment variable');
    process.exit(1);
  }

  try {
    await testCorrectedUrlContext();
    console.log('\n✅ All tests completed!');
  } catch (error) {
    console.error('\n❌ Test suite failed:', error);
    process.exit(1);
  }
}

main().catch(console.error);
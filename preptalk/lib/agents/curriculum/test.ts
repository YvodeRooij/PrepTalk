// Test file for Curriculum Agent v1.0
// Run with: npx tsx lib/agents/curriculum/test.ts

import 'dotenv/config';
import { createCurriculumAgent } from './index';

async function testCurriculumAgent() {
  console.log('🚀 Testing Curriculum Agent with LangGraph v1.0...\n');

  // Check required environment variables
  const requiredEnvVars = [
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'GOOGLE_AI_API_KEY'
  ];

  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      console.error(`❌ Missing required environment variable: ${envVar}`);
      process.exit(1);
    }
  }

  try {
    // Create the agent
    const agent = createCurriculumAgent(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!,
      process.env.GOOGLE_AI_API_KEY!
    );

    // Test with a real job URL
    const testJobUrl = 'https://www.google.com/about/careers/applications/jobs/results/114688599158596294-software-engineer-iii-full-stack-google-cloud';

    console.log('📋 Testing with job URL:', testJobUrl);
    console.log('⏳ Generating curriculum (this may take 30-60 seconds)...\n');

    const startTime = Date.now();
    const curriculumId = await agent.generate(testJobUrl);
    const duration = (Date.now() - startTime) / 1000;

    console.log('✅ Curriculum generated successfully!');
    console.log('📝 Curriculum ID:', curriculumId);
    console.log('⏱️  Generation time:', duration.toFixed(2), 'seconds');

  } catch (error) {
    console.error('❌ Error during test:', error);

    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Stack trace:', error.stack);
    }

    process.exit(1);
  }
}

// Run the test
testCurriculumAgent().catch(console.error);
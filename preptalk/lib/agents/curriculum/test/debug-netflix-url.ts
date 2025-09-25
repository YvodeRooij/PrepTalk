// Debug why Netflix URL context isn't working
// Run with: npx tsx lib/agents/curriculum/test/debug-netflix-url.ts

import { config } from 'dotenv';
import { resolve } from 'path';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Load from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

async function debugNetflixUrl() {
  const netflixUrl = 'https://explore.jobs.netflix.net/careers?pid=790311846068&domain=netflix.com&sort_by=relevance';

  console.log('🔍 Debugging Netflix URL Context');
  console.log('=' .repeat(50));
  console.log(`URL: ${netflixUrl}\n`);

  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!);
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: {
      temperature: 0.3,
    }
  });

  // Test 1: Simple URL context test
  console.log('📋 Test 1: Basic URL Context');
  console.log('-' .repeat(30));

  try {
    const result1 = await model.generateContent({
      contents: [{
        role: 'user',
        parts: [{ text: `What is the job title from this URL: ${netflixUrl}` }]
      }],
      tools: [{ url_context: {} }]
    });

    console.log('✅ Response received:');
    console.log(result1.response.text().substring(0, 500) + '...\n');
  } catch (error: any) {
    console.log('❌ Error:', error.message);
    console.log('   Status:', error.status);
    console.log('   Details:', JSON.stringify(error.errorDetails || {}, null, 2));
  }

  // Test 2: Without URL context tool (baseline)
  console.log('📋 Test 2: Without URL Context (Baseline)');
  console.log('-' .repeat(40));

  try {
    const result2 = await model.generateContent(
      `Tell me what you know about this URL: ${netflixUrl}`
    );

    console.log('✅ Response without URL context:');
    console.log(result2.response.text().substring(0, 300) + '...\n');
  } catch (error: any) {
    console.log('❌ Error:', error.message);
  }

  // Test 3: Try with different URL formats
  console.log('📋 Test 3: URL Variations');
  console.log('-' .repeat(25));

  const urlVariations = [
    netflixUrl,  // Original
    'https://jobs.netflix.com/', // Different subdomain
    'https://www.netflix.com',   // Main site
    'https://help.netflix.com'   // Help page
  ];

  for (const url of urlVariations) {
    console.log(`\nTesting: ${url.substring(0, 50)}...`);
    try {
      const result = await model.generateContent({
        contents: [{
          role: 'user',
          parts: [{ text: `What type of page is this: ${url}` }]
        }],
        tools: [{ url_context: {} }]
      });

      console.log(`✅ Success: ${result.response.text().substring(0, 100)}...`);
    } catch (error: any) {
      console.log(`❌ Failed: ${error.message.substring(0, 100)}...`);
    }
  }

  // Test 4: Check if it's a rate limiting or quota issue
  console.log('\n📋 Test 4: Check API Quotas');
  console.log('-' .repeat(25));

  try {
    const simpleResult = await model.generateContent('What is 2+2?');
    console.log('✅ Basic API call works:', simpleResult.response.text());
  } catch (error: any) {
    console.log('❌ Basic API call failed:', error.message);
  }

  // Test 5: Headers and accessibility check
  console.log('\n📋 Test 5: URL Accessibility Check');
  console.log('-' .repeat(35));

  try {
    const response = await fetch(netflixUrl, { method: 'HEAD' });
    console.log('✅ URL is accessible via fetch:');
    console.log(`   Status: ${response.status} ${response.statusText}`);
    console.log(`   Headers: ${JSON.stringify(Object.fromEntries(response.headers), null, 2)}`);
  } catch (error) {
    console.log('❌ URL not accessible via fetch:', (error as Error).message);
  }
}

async function main() {
  console.log('🚀 Netflix URL Context Debug Session\n');

  if (!process.env.GOOGLE_AI_API_KEY) {
    console.error('❌ Missing GOOGLE_AI_API_KEY');
    process.exit(1);
  }

  await debugNetflixUrl();
  console.log('\n✅ Debug session completed!');
}

main().catch(console.error);
// Simple test to verify Gemini URL context capabilities
// Run with: npx tsx lib/agents/curriculum/test/test-url-context.ts

import { config } from 'dotenv';
import { resolve } from 'path';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Load from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

async function testUrlContext() {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    console.error('❌ Missing GOOGLE_AI_API_KEY');
    process.exit(1);
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
  });

  console.log('🧪 Testing Gemini URL Context Feature\n');
  console.log('=' .repeat(50));

  // Test URLs - these should be publicly accessible
  const testCases = [
    {
      name: 'Public Wikipedia page',
      url: 'https://en.wikipedia.org/wiki/Software_engineering',
      prompt: 'What is the main topic of this page? Answer in one sentence.'
    },
    {
      name: 'Public news article',
      url: 'https://www.bbc.com/news',
      prompt: 'What type of website is this? Answer in one sentence.'
    },
    {
      name: 'Job posting (if accessible)',
      url: 'https://careers.google.com',
      prompt: 'What company is this careers page for? Answer in one sentence.'
    }
  ];

  for (const test of testCases) {
    console.log(`\n📝 Test: ${test.name}`);
    console.log(`   URL: ${test.url}`);

    try {
      // Method 1: Using fileData with fileUri (documented approach)
      console.log('   Method 1 (fileData.fileUri):');
      try {
        const result1 = await model.generateContent([
          { text: test.prompt },
          {
            fileData: {
              mimeType: 'text/html',
              fileUri: test.url
            }
          }
        ]);
        console.log(`   ✅ Success: ${result1.response.text().substring(0, 100)}...`);
      } catch (error: any) {
        console.log(`   ❌ Failed: ${error.message?.substring(0, 100)}...`);
      }

      // Method 2: Just asking about URL in prompt (no fileData)
      console.log('   Method 2 (URL in prompt):');
      try {
        const result2 = await model.generateContent(
          `Visit ${test.url} and ${test.prompt}`
        );
        console.log(`   ✅ Success: ${result2.response.text().substring(0, 100)}...`);
      } catch (error: any) {
        console.log(`   ❌ Failed: ${error.message?.substring(0, 100)}...`);
      }

    } catch (error) {
      console.log(`   ❌ Exception: ${error instanceof Error ? error.message : 'Unknown'}`);
    }
  }

  console.log('\n\n📊 Summary:');
  console.log('- fileData.fileUri method requires URLs to be on Gemini\'s allowlist');
  console.log('- Most job sites are not accessible via URL context');
  console.log('- Consider using web scraping or APIs instead for job data');
}

testUrlContext().catch(console.error);
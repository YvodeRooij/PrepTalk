// Live Enhanced Research Demo
// Shows actual API calls working

import { config } from 'dotenv';
import { join } from 'path';
import { GoogleGenerativeAI } from '@google/generative-ai';

config({ path: join(process.cwd(), '.env.local') });

const runLiveResearchDemo = async () => {
  console.log('🔴 LIVE Enhanced Research Demo - Real API Calls\n');

  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    console.log('❌ GOOGLE_AI_API_KEY not found');
    return;
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  try {
    console.log('📋 Step 1: Testing URL Context with a simple job URL...');

    const parseRequest = {
      contents: [{
        role: 'user',
        parts: [{
          text: `Extract job information from this URL: https://jobs.lever.co/anthropic/cd4adbf3-7f4a-4483-8eec-616b80c24ca2

          Return JSON with:
          - title: job title
          - company: company name
          - location: job location
          - level: seniority level`
        }]
      }],
      tools: [{ url_context: {} }]
    };

    console.log('⏳ Making API call with URL context...');
    const parseResult = await model.generateContent(parseRequest);
    const parseText = parseResult.response.text();

    console.log('✅ URL Context Response:');
    console.log(parseText.substring(0, 300) + '...\n');

    console.log('📊 Step 2: Testing Google Search for market intelligence...');

    const searchRequest = {
      contents: [{
        role: 'user',
        parts: [{
          text: `Research Anthropic company culture, interview process, and AI Engineer salary data.

          Return JSON with:
          - company_culture: ["key", "cultural", "values"]
          - interview_difficulty: "rating out of 10"
          - salary_range: "salary information"
          - key_insights: ["preparation", "tips"]`
        }]
      }],
      tools: [{ googleSearch: {} }]
    };

    console.log('⏳ Making API call with Google Search...');
    const searchResult = await model.generateContent(searchRequest);
    const searchText = searchResult.response.text();

    console.log('✅ Google Search Response:');
    console.log(searchText.substring(0, 400) + '...\n');

    console.log('🔗 Step 3: Testing Combined Tools (URL Context + Google Search)...');

    const combinedRequest = {
      contents: [{
        role: 'user',
        parts: [{
          text: `Research this job: https://jobs.lever.co/anthropic/cd4adbf3-7f4a-4483-8eec-616b80c24ca2

          Analyze the job posting AND search for additional intelligence about:
          - Company culture and values
          - Interview difficulty and process
          - Market salary data for this role

          Return comprehensive analysis.`
        }]
      }],
      tools: [
        { url_context: {} },
        { googleSearch: {} }
      ]
    };

    console.log('⏳ Making combined API call...');
    const combinedResult = await model.generateContent(combinedRequest);
    const combinedText = combinedResult.response.text();

    console.log('✅ Combined Tools Response:');
    console.log(combinedText.substring(0, 500) + '...\n');

    console.log('🎯 Demo Results:');
    console.log('   ✅ URL Context API: Working');
    console.log('   ✅ Google Search API: Working');
    console.log('   ✅ Combined Tools: Working');
    console.log('   🌟 Enhanced research system is fully operational!');

  } catch (error) {
    console.error('❌ Demo failed:', error);
    if (error instanceof Error) {
      console.log('Error details:', error.message);
    }
  }
};

runLiveResearchDemo().catch(console.error);
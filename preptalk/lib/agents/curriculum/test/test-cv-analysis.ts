// Test CV Analysis with Yvo's CV
// This script tests the CV analysis pipeline end-to-end

import fs from 'fs/promises';
import path from 'path';
import { MistralOCRService } from '../../../services/mistral-ocr';
import { matchCVToJob } from '../../../services/mistral-ocr';

const TEST_CV_PATH = path.join(process.cwd(), 'docs/cv/Yvo_De_Rooij_-_Technology_Consultant_ (1).pdf');

async function testCVAnalysis() {
  console.log('🚀 Testing CV Analysis Pipeline\n');
  console.log('═══════════════════════════════════════\n');

  try {
    // Step 1: Read CV file
    console.log('📄 Reading CV file...');
    const cvBuffer = await fs.readFile(TEST_CV_PATH);
    console.log(`✅ File loaded: ${(cvBuffer.length / 1024).toFixed(2)} KB\n`);

    // Step 2: Initialize OCR service
    console.log('🔧 Initializing Mistral OCR service...');
    const ocrService = new MistralOCRService(process.env.MISTRAL_API_KEY);

    if (!process.env.MISTRAL_API_KEY) {
      console.log('⚠️  No Mistral API key found - using mock data\n');
    } else {
      console.log('✅ Mistral OCR service initialized\n');
    }

    // Step 3: Process CV
    console.log('🤖 Processing CV with OCR...');
    const startTime = Date.now();
    const cvAnalysis = await ocrService.processCV(cvBuffer, 'application/pdf', {
      extractionDetail: 'comprehensive',
      targetRole: 'Senior Technology Consultant'
    });
    const processingTime = Date.now() - startTime;
    console.log(`✅ CV processed in ${(processingTime / 1000).toFixed(2)}s\n`);

    // Step 4: Display extracted information
    console.log('📊 Extracted Information:');
    console.log('═══════════════════════════════════════');
    console.log(`👤 Name: ${cvAnalysis.personalInfo.fullName}`);
    console.log(`📧 Email: ${cvAnalysis.personalInfo.email || 'Not found'}`);
    console.log(`📍 Location: ${cvAnalysis.personalInfo.location || 'Not found'}`);
    console.log(`💼 Current Role: ${cvAnalysis.summary?.currentRole || 'Not found'}`);
    console.log(`🎯 Target Role: ${cvAnalysis.summary?.targetRole || 'Senior Technology Consultant'}`);
    console.log(`⏳ Experience: ${cvAnalysis.summary?.yearsOfExperience || 0} years`);
    console.log(`🎓 Education: ${cvAnalysis.education.length} degree(s)`);
    console.log(`💻 Technical Skills: ${cvAnalysis.skills.technical.length} skills`);
    console.log(`🤝 Soft Skills: ${cvAnalysis.skills.soft.length} skills`);
    console.log(`🏢 Work Experience: ${cvAnalysis.experience.length} positions`);
    console.log(`🔍 Extraction Confidence: ${(cvAnalysis.metadata.confidence * 100).toFixed(1)}%`);
    console.log(`🤖 Processing Model: ${cvAnalysis.metadata.processingModel}\n`);

    // Step 5: Generate insights
    console.log('💡 Generating Career Insights...');
    const insights = await ocrService.generateInsights(cvAnalysis, 'Senior Technology Consultant');
    console.log('✅ Insights generated\n');

    console.log('📈 Career Insights:');
    console.log('═══════════════════════════════════════');
    console.log(`📊 Experience Level: ${insights.experienceLevel}`);
    console.log(`📈 Career Trajectory: ${insights.careerProgression.growthTrajectory}`);
    console.log(`🔄 Career Changes: ${insights.careerProgression.industryChanges} industry changes`);
    console.log(`⏱️ Avg Tenure: ${insights.careerProgression.averageTenure.toFixed(1)} years per role`);
    console.log(`🎯 Primary Domain: ${insights.skillsAnalysis.primaryDomain}`);
    console.log(`📚 Skill Depth: ${insights.skillsAnalysis.skillDepth}`);
    console.log(`✨ Emerging Skills: ${insights.skillsAnalysis.emergingSkills.join(', ')}`);
    console.log(`🎯 Readiness Score: ${insights.readiness.overallScore}%\n`);

    // Step 6: Test job matching
    console.log('🎯 Testing Job Matching...');
    const mockJobData = {
      requiredSkills: ['Python', 'Cloud Architecture', 'Consulting', 'Digital Transformation'],
      preferredSkills: ['AWS', 'Azure', 'Kubernetes', 'Docker'],
      experienceLevel: '5-7 years'
    };

    const matchResult = await matchCVToJob(cvAnalysis, mockJobData);
    console.log('✅ Job matching complete\n');

    console.log('🎯 Job Match Results:');
    console.log('═══════════════════════════════════════');
    console.log(`📊 Overall Match: ${matchResult.overallMatch}%`);
    console.log(`💻 Skills Match: ${matchResult.skillsMatch}%`);
    console.log(`⏳ Experience Match: ${matchResult.experienceMatch}%`);
    console.log(`✅ Matched Skills: ${matchResult.strengths.join(', ')}`);
    console.log(`⚠️  Skill Gaps: ${matchResult.gaps.join(', ') || 'None'}\n`);

    // Step 7: Display top experience highlights
    if (cvAnalysis.experience.length > 0) {
      console.log('💼 Recent Experience Highlights:');
      console.log('═══════════════════════════════════════');
      const recentExp = cvAnalysis.experience[0];
      console.log(`🏢 ${recentExp.position} at ${recentExp.company}`);
      console.log(`📅 ${recentExp.startDate || 'Unknown'} - ${recentExp.endDate || 'Present'}`);
      console.log(`📍 ${recentExp.location || 'Location not specified'}`);
      if (recentExp.responsibilities?.length > 0) {
        console.log('Key Responsibilities:');
        recentExp.responsibilities.slice(0, 3).forEach(resp => {
          console.log(`  • ${resp}`);
        });
      }
      console.log('');
    }

    // Step 8: Personalized interview topics
    console.log('🎤 Personalized Interview Topics:');
    console.log('═══════════════════════════════════════');
    insights.personalizedQuestionTopics.forEach(topic => {
      console.log(`  • ${topic}`);
    });
    console.log('');

    // Summary
    console.log('✅ CV Analysis Test Complete!');
    console.log('═══════════════════════════════════════\n');
    console.log('Summary:');
    console.log(`  • Successfully extracted data from ${cvAnalysis.personalInfo.fullName}'s CV`);
    console.log(`  • Identified ${cvAnalysis.skills.technical.length + cvAnalysis.skills.soft.length} total skills`);
    console.log(`  • Generated personalized insights for ${insights.experienceLevel}-level candidate`);
    console.log(`  • Calculated ${matchResult.overallMatch}% job match score`);
    console.log(`  • Ready for personalized interview preparation!\n`);

    // Return results for potential further use
    return {
      cvAnalysis,
      insights,
      matchResult,
      success: true
    };

  } catch (error) {
    console.error('\n❌ Test Failed:', error);
    console.error('\nError Details:');
    if (error instanceof Error) {
      console.error('  Message:', error.message);
      console.error('  Stack:', error.stack);
    }
    return {
      success: false,
      error
    };
  }
}

// Run the test
console.log('CV Analysis Test Script');
console.log('Testing with:', TEST_CV_PATH);
console.log('');

testCVAnalysis()
  .then(result => {
    if (result.success) {
      console.log('🎉 All tests passed successfully!');
      process.exit(0);
    } else {
      console.log('😔 Tests failed. Please check the errors above.');
      process.exit(1);
    }
  })
  .catch(err => {
    console.error('Unexpected error:', err);
    process.exit(1);
  });
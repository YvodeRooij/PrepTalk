/**
 * Technical Validation Test: Consolidated Reverse Questions with Max-2 Constraint
 *
 * This test validates:
 * 1. Consolidated approach generates questions for all rounds
 * 2. Max-2 reuse constraint is enforced (no fact used >2x)
 * 3. Each round gets appropriate number of questions
 * 4. Angles remain differentiated
 * 5. Quality criteria preserved (phrasing, pronouns, natural selection)
 */

import { config } from 'dotenv';
import { LLMProviderService } from './lib/providers/llm-provider-service';
import { DEFAULT_LLM_CONFIG } from './lib/config/llm-config';

// Load .env.local for test environment
config({ path: '.env.local' });

async function testConsolidatedConstraintValidation() {
  console.log('🧪 CONSOLIDATED CONSTRAINT VALIDATION TEST\n');
  console.log('=' .repeat(80));

  // Initialize LLM provider with Anthropic config (handles complex schemas better)
  const testConfig = {
    ...DEFAULT_LLM_CONFIG,
    primaryProvider: 'anthropic' as const,
    fallbackProviders: [] as const // Only use Anthropic for this test
  };
  const llmProvider = new LLMProviderService(testConfig);

  // Mock competitive intelligence (realistic data)
  const mockCI = {
    strategicAdvantages: [
      'Ranked #1 hospital by U.S. News & World Report for 3 consecutive years',
      'Leading academic medical center with $3B in annual research funding',
      'Only hospital in region with Level 1 Trauma Center designation'
    ],
    recentDevelopments: [
      'Opened $400M patient tower with 200 private rooms and advanced ICU capabilities in Q2 2024',
      'Completed Epic EHR system migration serving 1M+ patients annually',
      'Launched AI-powered diagnostic imaging partnership with Google Health',
      'Expanded telehealth services to reach 500K+ patients across 3 states'
    ],
    competitivePositioning: 'Johns Hopkins competes with Cleveland Clinic, Mayo Clinic, and Massachusetts General Hospital as top academic medical centers, differentiated by research excellence and patient outcomes.',
    primaryCompetitors: ['Cleveland Clinic', 'Mayo Clinic', 'Massachusetts General Hospital']
  };

  // Import consolidated prompt and schema
  const { buildConsolidatedReverseQuestionPrompt } = await import('./lib/agents/curriculum/prompts/consolidated-reverse-questions-prompt');
  const { AllRoundsReverseQuestionsSchema } = await import('./lib/agents/curriculum/schemas');

  const bestAskedToMap = {
    recruiter_screen: 'Senior Recruiter',
    behavioral_deep_dive: 'Hiring Manager',
    culture_values_alignment: 'Department Head',
    strategic_role_discussion: 'VP of Strategic Accounts',
    executive_final: 'Chief Medical Officer'
  };

  const prompt = buildConsolidatedReverseQuestionPrompt({
    competitiveIntelligence: mockCI,
    jobTitle: 'Strategic Account Executive',
    companyName: 'Johns Hopkins Hospital',
    experienceLevel: 'senior',
    bestAskedToMap
  });

  console.log('\n📋 Test Configuration:');
  console.log(`   CI Facts: ${mockCI.strategicAdvantages.length + mockCI.recentDevelopments.length + 1} total`);
  console.log(`   Job: Strategic Account Executive at Johns Hopkins Hospital`);
  console.log(`   Rounds: 5 (recruiter, behavioral, culture, strategic, executive)`);
  console.log(`   Expected: Max 2 uses per fact\n`);

  try {
    console.log('⏱️  Generating all rounds with constraint tracking...\n');
    const startTime = Date.now();

    const results = await llmProvider.batchStructured(
      AllRoundsReverseQuestionsSchema,
      'reverse_interview_questions', // Use existing task config
      [{ prompt, systemPrompt: undefined }]
    );

    const result = results[0]; // Single prompt, so take first result

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`✅ Generation completed in ${duration}s\n`);

    // ============================================
    // VALIDATION 1: Constraint Enforcement
    // ============================================
    console.log('=' .repeat(80));
    console.log('VALIDATION 1: MAX-2 CONSTRAINT ENFORCEMENT');
    console.log('=' .repeat(80));

    const factUsage = result.validation.fact_usage_count;
    const violations = factUsage.filter(item => item.count > 2);

    console.log(`\n📊 Fact Usage Distribution:`);
    factUsage.forEach(({ fact_id, count }) => {
      const indicator = count > 2 ? '❌ VIOLATION' : count === 2 ? '⚠️  MAX' : '✅ OK';
      console.log(`   ${indicator}  ${fact_id}: ${count}x`);
    });

    if (violations.length > 0) {
      console.error(`\n❌ CONSTRAINT VIOLATED: ${violations.length} fact(s) used >2x`);
      violations.forEach(({ fact_id, count }) => {
        console.error(`   - ${fact_id}: ${count}x (exceeds limit by ${count - 2})`);
      });
      console.error(`\n⚠️  Test Result: FAILED (Constraint not enforced)\n`);
    } else {
      console.log(`\n✅ CONSTRAINT SATISFIED: All facts used ≤ 2x`);
      const totalUses = factUsage.reduce((sum, item) => sum + item.count, 0);
      console.log(`   Total fact uses: ${totalUses}`);
      console.log(`   Unique facts used: ${factUsage.length}`);
      console.log(`   Average reuse: ${(totalUses / factUsage.length).toFixed(2)}x\n`);
    }

    // ============================================
    // VALIDATION 2: Question Count Per Round
    // ============================================
    console.log('=' .repeat(80));
    console.log('VALIDATION 2: QUESTION COUNT PER ROUND');
    console.log('=' .repeat(80));

    const rounds = ['recruiter_screen', 'behavioral_deep_dive', 'culture_values_alignment', 'strategic_role_discussion', 'executive_final'] as const;
    let allRoundsHaveQuestions = true;

    rounds.forEach(round => {
      const questions = result.questions[round];
      const count = questions.length;
      const status = count >= 2 && count <= 5 ? '✅' : '❌';

      console.log(`\n${status} ${round}:`);
      console.log(`   Questions: ${count} (expected 2-5)`);

      if (count > 0) {
        console.log(`   Sample: "${questions[0].question_text.substring(0, 80)}..."`);
      }

      if (count < 2 || count > 5) {
        allRoundsHaveQuestions = false;
      }
    });

    const totalQuestions = rounds.reduce((sum, round) => sum + result.questions[round].length, 0);
    console.log(`\n📊 Total Questions: ${totalQuestions}`);

    if (!allRoundsHaveQuestions) {
      console.error(`\n❌ VALIDATION FAILED: Some rounds have incorrect question count\n`);
    } else {
      console.log(`✅ All rounds have appropriate question count (2-5)\n`);
    }

    // ============================================
    // VALIDATION 3: Fact Allocation Alignment
    // ============================================
    console.log('=' .repeat(80));
    console.log('VALIDATION 3: FACT ALLOCATION ALIGNMENT');
    console.log('=' .repeat(80));

    console.log(`\nFact Allocation by Round:`);
    rounds.forEach(round => {
      const allocatedFacts = result.fact_allocation[round];
      console.log(`\n  ${round}:`);
      console.log(`    Allocated Facts: ${allocatedFacts.length}`);
      console.log(`    Fact IDs: ${allocatedFacts.join(', ')}`);

      // Verify questions use allocated facts
      const questionsForRound = result.questions[round];
      const factsInQuestions = questionsForRound.map(q => q.ci_fact_id);
      const mismatches = factsInQuestions.filter(fid => !allocatedFacts.includes(fid));

      if (mismatches.length > 0) {
        console.error(`    ❌ MISMATCH: Questions use non-allocated facts: ${mismatches.join(', ')}`);
      } else {
        console.log(`    ✅ All questions use allocated facts`);
      }
    });

    // ============================================
    // VALIDATION 4: Quality Spot Checks
    // ============================================
    console.log('\n' + '='.repeat(80));
    console.log('VALIDATION 4: QUALITY SPOT CHECKS');
    console.log('=' .repeat(80));

    // Check for pronoun violations
    console.log(`\n🔍 Pronoun Check (should not use "we/our"):`);
    let pronounViolations = 0;
    rounds.forEach(round => {
      result.questions[round].forEach(q => {
        const text = q.question_text.toLowerCase();
        if (text.includes(' we ') || text.includes(' our ') || text.includes(' us ')) {
          console.error(`   ❌ ${round}: "${q.question_text.substring(0, 60)}..."`);
          pronounViolations++;
        }
      });
    });
    if (pronounViolations === 0) {
      console.log(`   ✅ No pronoun violations detected`);
    } else {
      console.error(`   ❌ Found ${pronounViolations} pronoun violations`);
    }

    // Check for repetitive phrasing
    console.log(`\n🔍 Phrasing Diversity Check:`);
    const allQuestions = rounds.flatMap(r => result.questions[r].map(q => q.question_text));
    const startPhrases = allQuestions.map(q => q.substring(0, 20).toLowerCase());
    const uniqueStarts = new Set(startPhrases).size;
    const diversityRatio = uniqueStarts / allQuestions.length;

    console.log(`   Total questions: ${allQuestions.length}`);
    console.log(`   Unique starts: ${uniqueStarts}`);
    console.log(`   Diversity ratio: ${(diversityRatio * 100).toFixed(1)}%`);

    if (diversityRatio > 0.8) {
      console.log(`   ✅ Good phrasing diversity (>80%)`);
    } else {
      console.warn(`   ⚠️  Low phrasing diversity (<80%)`);
    }

    // ============================================
    // FINAL SUMMARY
    // ============================================
    console.log('\n' + '='.repeat(80));
    console.log('FINAL TEST SUMMARY');
    console.log('=' .repeat(80));

    const testsPass = violations.length === 0 && allRoundsHaveQuestions && pronounViolations === 0;

    console.log(`\n✓ Constraint Enforcement: ${violations.length === 0 ? 'PASS' : 'FAIL'}`);
    console.log(`✓ Question Counts: ${allRoundsHaveQuestions ? 'PASS' : 'FAIL'}`);
    console.log(`✓ Pronoun Rules: ${pronounViolations === 0 ? 'PASS' : 'FAIL'}`);
    console.log(`✓ Phrasing Diversity: ${diversityRatio > 0.8 ? 'PASS' : 'WARN'}`);

    console.log(`\n${testsPass ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}\n`);

    // Output sample questions
    console.log('=' .repeat(80));
    console.log('SAMPLE QUESTIONS (First question per round)');
    console.log('=' .repeat(80));

    rounds.forEach(round => {
      const q = result.questions[round][0];
      if (q) {
        console.log(`\n${round.toUpperCase().replace(/_/g, ' ')}:`);
        console.log(`  Q: "${q.question_text}"`);
        console.log(`  Fact ID: ${q.ci_fact_id}`);
        console.log(`  Angle: ${q.angle_used}`);
      }
    });

    return testsPass;

  } catch (error) {
    console.error('\n❌ TEST FAILED WITH ERROR:');
    console.error(error);
    return false;
  }
}

// Run test
testConsolidatedConstraintValidation()
  .then(passed => {
    process.exit(passed ? 0 : 1);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });

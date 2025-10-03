/**
 * Reverse Questions Differentiation Evaluator
 *
 * Tests whether reverse questions are sufficiently differentiated across rounds
 * using semantic similarity analysis and structural checks.
 *
 * PASS CRITERIA:
 * 1. Semantic similarity < 70% between questions across rounds using same CI fact
 * 2. Different success patterns or angles per round
 * 3. Appropriate depth level for round type
 */

import Anthropic from '@anthropic-ai/sdk';

export interface ReverseQuestion {
  id: string;
  round_type: string;
  question_text: string;
  ci_fact_used: string;
  ci_source_type: string;
  success_pattern: string;
}

export interface DifferentiationScore {
  overall_pass: boolean;
  semantic_similarity_score: number; // 0-100, lower is better
  pattern_diversity_score: number; // 0-100, higher is better
  depth_appropriateness_score: number; // 0-100, higher is better
  issues: string[];
  recommendations: string[];
}

/**
 * Calculate semantic similarity between two questions using LLM-as-judge
 */
export async function calculateSemanticSimilarity(
  question1: string,
  question2: string,
  anthropic: Anthropic
): Promise<number> {
  const prompt = `Compare these two reverse interview questions and rate their semantic similarity on a scale of 0-100.

QUESTION 1: "${question1}"
QUESTION 2: "${question2}"

SCORING GUIDE:
- 0-20: Completely different topics and angles
- 21-40: Same general topic but different angles
- 41-60: Similar topic and angle, different specifics
- 61-80: Very similar with minor wording differences
- 81-100: Essentially identical

Return ONLY a number between 0-100.`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 50,
      temperature: 0,
      messages: [{
        role: 'user',
        content: prompt
      }]
    });

    const content = response.content[0];
    if (content.type === 'text') {
      const score = parseInt(content.text.trim(), 10);
      return isNaN(score) ? 50 : Math.min(100, Math.max(0, score));
    }
    return 50; // Default if parsing fails
  } catch (error) {
    console.error('Semantic similarity calculation failed:', error);
    return 50; // Default fallback
  }
}

/**
 * Check if question depth is appropriate for round type
 */
export function assessDepthAppropriateness(
  roundType: string,
  questionText: string
): { appropriate: boolean; reason: string } {

  const depthIndicators = {
    recruiter_screen: {
      good: ['what does', 'how does this affect', 'what kind of', 'is this role', 'what would'],
      bad: ['strategic', 'competitive position', '3-5 years', 'market evolution', 'vision'],
      expectedComplexity: 'surface_level'
    },
    behavioral_deep_dive: {
      good: ['can you give an example', 'how has the team', 'what challenges', 'how do you handle', 'tell me about a time'],
      bad: ['vision', 'long-term', 'market positioning', '3-5 years', 'what kind of background'],
      expectedComplexity: 'tactical_team_level'
    },
    strategic_role_discussion: {
      good: ['how does this affect', 'competitive', 'strategy', 'business impact', 'go-to-market', 'win rates'],
      bad: ['what does this mean for me', 'what kind of background', 'vision for the next', 'future of'],
      expectedComplexity: 'strategic_business_level'
    },
    executive_final: {
      good: ['vision', 'long-term', '3-5 years', 'where do you see', 'future', 'evolving', 'strategic direction'],
      bad: ['day-to-day', 'team challenges', 'what does this mean for me', 'onboarding', 'what kind of background'],
      expectedComplexity: 'visionary_long_term'
    }
  };

  const indicators = depthIndicators[roundType as keyof typeof depthIndicators];
  if (!indicators) {
    return { appropriate: true, reason: 'Unknown round type' };
  }

  const lowerQuestion = questionText.toLowerCase();

  // Check for bad indicators (wrong depth level)
  for (const bad of indicators.bad) {
    if (lowerQuestion.includes(bad.toLowerCase())) {
      return {
        appropriate: false,
        reason: `Contains inappropriate phrase "${bad}" for ${roundType} (expected ${indicators.expectedComplexity})`
      };
    }
  }

  // Check for good indicators (right depth level)
  const hasGoodIndicator = indicators.good.some(good =>
    lowerQuestion.includes(good.toLowerCase())
  );

  if (!hasGoodIndicator) {
    return {
      appropriate: false,
      reason: `Missing depth indicators for ${indicators.expectedComplexity} level`
    };
  }

  return { appropriate: true, reason: 'Appropriate depth for round type' };
}

/**
 * Evaluate differentiation quality of reverse questions across rounds
 */
export async function evaluateReverseQuestionDifferentiation(
  questions: ReverseQuestion[],
  anthropic: Anthropic
): Promise<DifferentiationScore> {

  const issues: string[] = [];
  const recommendations: string[] = [];
  let totalSemanticSimilarity = 0;
  let comparisonCount = 0;
  let depthAppropriateCount = 0;

  // Group questions by CI fact
  const questionsByCIFact: Record<string, ReverseQuestion[]> = {};
  for (const q of questions) {
    const factKey = q.ci_fact_used.substring(0, 50); // Use first 50 chars as key
    if (!questionsByCIFact[factKey]) {
      questionsByCIFact[factKey] = [];
    }
    questionsByCIFact[factKey].push(q);
  }

  // Check 1: Semantic Similarity for same CI fact across rounds
  for (const [fact, factQuestions] of Object.entries(questionsByCIFact)) {
    if (factQuestions.length < 2) continue;

    // Compare all pairs
    for (let i = 0; i < factQuestions.length; i++) {
      for (let j = i + 1; j < factQuestions.length; j++) {
        const q1 = factQuestions[i];
        const q2 = factQuestions[j];

        const similarity = await calculateSemanticSimilarity(
          q1.question_text,
          q2.question_text,
          anthropic
        );

        totalSemanticSimilarity += similarity;
        comparisonCount++;

        if (similarity >= 70) {
          issues.push(
            `HIGH SIMILARITY (${similarity}%) between ${q1.round_type} and ${q2.round_type}: "${q1.question_text.substring(0, 60)}..." vs "${q2.question_text.substring(0, 60)}..."`
          );
          recommendations.push(
            `For ${q2.round_type}, change angle from "${q1.success_pattern}" to a different success pattern that matches the round depth`
          );
        }
      }
    }
  }

  // Check 2: Success Pattern Diversity
  const patternsByRound: Record<string, Set<string>> = {};
  const patternCounts: Record<string, number> = {};

  for (const q of questions) {
    if (!patternsByRound[q.round_type]) {
      patternsByRound[q.round_type] = new Set();
    }
    patternsByRound[q.round_type].add(q.success_pattern);

    patternCounts[q.success_pattern] = (patternCounts[q.success_pattern] || 0) + 1;
  }

  // Flag patterns used more than 3 times
  for (const [pattern, count] of Object.entries(patternCounts)) {
    if (count > 3) {
      issues.push(`Pattern "${pattern}" used ${count} times (too repetitive)`);
      recommendations.push(`Diversify patterns: Use alternative patterns like "future_vision", "strategic_rationale", "process_adaptation"`);
    }
  }

  // Check 3: Depth Appropriateness
  for (const q of questions) {
    const depthCheck = assessDepthAppropriateness(q.round_type, q.question_text);
    if (depthCheck.appropriate) {
      depthAppropriateCount++;
    } else {
      issues.push(`${q.round_type} depth issue: ${depthCheck.reason}`);
      recommendations.push(`Adjust ${q.id} to match ${q.round_type} depth expectations`);
    }
  }

  // Calculate scores
  const avgSemanticSimilarity = comparisonCount > 0
    ? totalSemanticSimilarity / comparisonCount
    : 0;

  const uniquePatterns = new Set(questions.map(q => q.success_pattern)).size;
  const patternDiversityScore = (uniquePatterns / questions.length) * 100;

  const depthAppropriatenessScore = (depthAppropriateCount / questions.length) * 100;

  // Overall pass criteria
  const passSemanticSimilarity = avgSemanticSimilarity < 70;
  const passPatternDiversity = patternDiversityScore >= 40; // At least 40% unique
  const passDepthAppropriateness = depthAppropriatenessScore >= 60; // At least 60% appropriate

  const overall_pass = passSemanticSimilarity && passPatternDiversity && passDepthAppropriateness;

  return {
    overall_pass,
    semantic_similarity_score: Math.round(avgSemanticSimilarity),
    pattern_diversity_score: Math.round(patternDiversityScore),
    depth_appropriateness_score: Math.round(depthAppropriatenessScore),
    issues: issues.slice(0, 10), // Top 10 issues
    recommendations: recommendations.slice(0, 5) // Top 5 recommendations
  };
}

/**
 * Simplified evaluator for testing without LLM calls (uses heuristics)
 */
export function evaluateReverseQuestionDifferentiationSimple(
  questions: ReverseQuestion[]
): DifferentiationScore {

  const issues: string[] = [];
  const recommendations: string[] = [];

  // Heuristic: Check for exact substring matches
  let highSimilarityCount = 0;
  const comparisonCount = (questions.length * (questions.length - 1)) / 2;

  for (let i = 0; i < questions.length; i++) {
    for (let j = i + 1; j < questions.length; j++) {
      const q1 = questions[i];
      const q2 = questions[j];

      // Simple similarity: check if 50% of words overlap
      const words1 = new Set(q1.question_text.toLowerCase().split(/\s+/));
      const words2 = new Set(q2.question_text.toLowerCase().split(/\s+/));

      const intersection = new Set([...words1].filter(w => words2.has(w)));
      const union = new Set([...words1, ...words2]);

      const jaccardSimilarity = intersection.size / union.size;

      if (jaccardSimilarity >= 0.5) {
        highSimilarityCount++;
        issues.push(
          `Similar questions (${Math.round(jaccardSimilarity * 100)}%): ${q1.round_type} vs ${q2.round_type}`
        );
      }
    }
  }

  const avgSemanticSimilarity = (highSimilarityCount / comparisonCount) * 100;

  // Pattern diversity
  const uniquePatterns = new Set(questions.map(q => q.success_pattern)).size;
  const patternDiversityScore = (uniquePatterns / questions.length) * 100;

  // Depth check
  let depthAppropriateCount = 0;
  for (const q of questions) {
    const depthCheck = assessDepthAppropriateness(q.round_type, q.question_text);
    if (depthCheck.appropriate) {
      depthAppropriateCount++;
    } else {
      issues.push(`Depth: ${depthCheck.reason}`);
    }
  }

  const depthAppropriatenessScore = (depthAppropriateCount / questions.length) * 100;

  const overall_pass = avgSemanticSimilarity < 30 && patternDiversityScore >= 40 && depthAppropriatenessScore >= 60;

  return {
    overall_pass,
    semantic_similarity_score: Math.round(avgSemanticSimilarity),
    pattern_diversity_score: Math.round(patternDiversityScore),
    depth_appropriateness_score: Math.round(depthAppropriatenessScore),
    issues,
    recommendations
  };
}

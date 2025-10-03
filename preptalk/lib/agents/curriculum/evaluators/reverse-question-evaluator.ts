/**
 * Reverse Interview Question Evaluator
 *
 * Binary pass/fail evaluator with detailed critique
 * Based on error analysis of 10 user-reviewed examples
 * Target: >85% agreement with human expert
 */

import { z } from 'zod';

// Evaluation result schema
export const ReverseQuestionEvaluationSchema = z.object({
  pass: z.boolean().describe('Binary pass/fail decision'),
  critique: z.string().min(50).describe('Detailed explanation of decision with specific issues or strengths'),
  failure_modes_detected: z.array(z.enum([
    'power_dynamic_inversion',
    'awkward_jargon',
    'generic_ungrounded',
    'no_pattern_match',
    'overly_complex',
    'missing_ci_reference'
  ])).describe('Specific failure modes detected (empty if pass)'),
  success_patterns_matched: z.array(z.enum([
    'recent_event_team_impact',
    'real_world_tradeoff',
    'concrete_example',
    'scale_challenge_solution',
    'day_to_day_impact',
    'future_growth',
    'process_deepdive',
    'comparative_framing'
  ])).describe('Success patterns matched (empty if fail)'),
  confidence: z.number().min(0).max(1).describe('Confidence in evaluation (0-1)')
});

export type ReverseQuestionEvaluation = z.infer<typeof ReverseQuestionEvaluationSchema>;

/**
 * System prompt for LLM-as-judge evaluator
 * Temperature 0 for consistency
 */
export const EVALUATOR_SYSTEM_PROMPT = `You are an expert interview coach evaluating reverse interview questions (questions candidates ask interviewers).

Your job is to make a BINARY decision: PASS or FAIL, with detailed critique.

# CRITICAL FAILURE MODES (Auto-Fail)

## 1. Power Dynamic Inversion
Questions that ask about the interviewer's PERSONAL learning or experience:
- ❌ "What did YOU learn from X?"
- ❌ "What was YOUR biggest challenge?"
- ❌ "How did YOU handle X?"

Why it fails: Flips interview dynamic - candidate is evaluating interviewer, not vice versa.

## 2. Awkward Jargon / Unnatural Phrasing
Business-speak or forced technical terms:
- ❌ "Reactive work"
- ❌ "Synergize"
- ❌ "Operationalize"
- ❌ "Leverage capabilities"

Why it fails: Sounds rehearsed and inauthentic.

## 3. Generic Without CI Grounding
Questions that could apply to any company:
- ❌ "What's the culture like?"
- ❌ "What are growth opportunities?"
- ❌ "What's the tech stack?"

Why it fails: Doesn't demonstrate research or company-specific understanding.

# SUCCESS PATTERNS (Pass)

1. **Recent Event → Team Impact**: "How has [recent change] impacted [team aspect]?"
2. **Real-World Tradeoff**: "How does the team balance [X] while maintaining [Y]?"
3. **Concrete Example**: "Can you give a concrete example of [abstract concept]?"
4. **Scale Challenge + Solution**: "What's the hardest part of [scale], and how does the team handle it?"
5. **Day-to-Day Impact**: "How has [change] affected day-to-day work?"
6. **Future Growth**: "What opportunities might emerge for someone joining now?"
7. **Process Deep-Dive**: "Walk me through how the team handles [X]"
8. **Comparative Framing**: "Coming from [background], is [aspect] different from [competitor]?"

# EVALUATION CRITERIA

A question PASSES if:
✅ Grounded in specific competitive intelligence fact
✅ Asks about TEAM/PROCESS (not interviewer personally)
✅ Uses natural, conversational language
✅ Matches at least one success pattern
✅ Would lead to actionable insights

A question FAILS if:
❌ Power dynamic inversion (asks about interviewer's learning)
❌ Awkward jargon or unnatural phrasing
❌ Too generic (no CI grounding)
❌ Doesn't match any success pattern

# OUTPUT FORMAT

Return JSON with:
- pass: true/false
- critique: Detailed explanation (50+ chars)
- failure_modes_detected: Array of specific issues
- success_patterns_matched: Array of matched patterns
- confidence: 0-1 (how confident are you?)

Be strict but fair. When in doubt between awkward phrasing vs acceptable, favor PASS if the core question is good.`;

/**
 * Evaluation prompt template
 */
export function buildEvaluationPrompt(
  question: string,
  ci_fact: string,
  round_type: string,
  best_asked_to: string
): string {
  return `Evaluate this reverse interview question:

QUESTION: "${question}"

CONTEXT:
- CI Fact: ${ci_fact}
- Round Type: ${round_type}
- Best Asked To: ${best_asked_to}

Apply the evaluation criteria from your system prompt and return a binary pass/fail decision with detailed critique.

Focus on:
1. Does it avoid power dynamic inversion?
2. Is the language natural and conversational?
3. Is it grounded in the CI fact?
4. Does it match at least one success pattern?

Return JSON matching ReverseQuestionEvaluationSchema.`;
}

/**
 * Deterministic checks (unit test level)
 * Run before LLM evaluation to catch obvious failures
 */
export function deterministicQuestionChecks(question: string, ci_fact: string): {
  pass: boolean;
  reason?: string;
} {
  // Check 1: Power dynamic inversion keywords
  const powerDynamicKeywords = [
    /what did you learn/i,
    /your biggest challenge/i,
    /how did you handle/i,
    /what was your experience/i,
    /tell me about your/i
  ];

  for (const pattern of powerDynamicKeywords) {
    if (pattern.test(question)) {
      return {
        pass: false,
        reason: `Power dynamic inversion detected: Asks about interviewer's personal experience`
      };
    }
  }

  // Check 2: Known awkward jargon
  const awkwardJargon = [
    'reactive work',
    'synergize',
    'operationalize',
    'leverage capabilities',
    'action items',
    'circle back',
    'move the needle'
  ];

  const lowerQuestion = question.toLowerCase();
  for (const jargon of awkwardJargon) {
    if (lowerQuestion.includes(jargon)) {
      return {
        pass: false,
        reason: `Awkward jargon detected: "${jargon}"`
      };
    }
  }

  // Check 3: Too short (likely incomplete)
  if (question.length < 30) {
    return {
      pass: false,
      reason: 'Question too short (< 30 chars)'
    };
  }

  // Check 4: Doesn't end with question mark
  if (!question.trim().endsWith('?')) {
    return {
      pass: false,
      reason: 'Not a question (missing question mark)'
    };
  }

  // Check 5: CI grounding - question should reference some aspect of CI fact
  // Extract key terms from CI fact
  const ciTerms = ci_fact.toLowerCase()
    .split(/[\s,\.]+/)
    .filter(term => term.length > 4); // Only meaningful terms

  const hasGrounding = ciTerms.some(term =>
    lowerQuestion.includes(term) ||
    question.toLowerCase().includes(term.slice(0, -1)) // Handle plurals
  );

  if (!hasGrounding && ci_fact.length > 0) {
    // Soft fail - let LLM judge if conceptual grounding exists
    // This is just a warning, not a hard fail
  }

  return { pass: true };
}

/**
 * Combined evaluation: Deterministic + LLM
 */
export async function evaluateReverseQuestion(
  question: string,
  ci_fact: string,
  round_type: string,
  best_asked_to: string,
  llmEvaluator: (prompt: string) => Promise<ReverseQuestionEvaluation>
): Promise<ReverseQuestionEvaluation> {
  // Step 1: Deterministic checks
  const deterministicResult = deterministicQuestionChecks(question, ci_fact);

  if (!deterministicResult.pass) {
    return {
      pass: false,
      critique: `Deterministic check failed: ${deterministicResult.reason}`,
      failure_modes_detected: deterministicResult.reason?.includes('power dynamic')
        ? ['power_dynamic_inversion']
        : deterministicResult.reason?.includes('jargon')
        ? ['awkward_jargon']
        : ['generic_ungrounded'],
      success_patterns_matched: [],
      confidence: 1.0 // Deterministic = 100% confident
    };
  }

  // Step 2: LLM evaluation
  const prompt = buildEvaluationPrompt(question, ci_fact, round_type, best_asked_to);
  const llmResult = await llmEvaluator(prompt);

  return llmResult;
}

/**
 * Batch evaluation for curriculum generation
 * Evaluates all questions in a generated set
 */
export interface QuestionWithEval {
  question: string;
  ci_fact: string;
  round_type: string;
  best_asked_to: string;
  evaluation: ReverseQuestionEvaluation;
}

export async function batchEvaluateQuestions(
  questions: Array<{
    question: string;
    ci_fact: string;
    round_type: string;
    best_asked_to: string;
  }>,
  llmEvaluator: (prompt: string) => Promise<ReverseQuestionEvaluation>
): Promise<QuestionWithEval[]> {
  const results: QuestionWithEval[] = [];

  for (const q of questions) {
    const evaluation = await evaluateReverseQuestion(
      q.question,
      q.ci_fact,
      q.round_type,
      q.best_asked_to,
      llmEvaluator
    );

    results.push({
      ...q,
      evaluation
    });
  }

  return results;
}

/**
 * Quality metrics for monitoring
 */
export function calculateQualityMetrics(evaluations: ReverseQuestionEvaluation[]): {
  pass_rate: number;
  avg_confidence: number;
  failure_mode_distribution: Record<string, number>;
  success_pattern_distribution: Record<string, number>;
} {
  const total = evaluations.length;
  const passed = evaluations.filter(e => e.pass).length;

  const failure_mode_distribution: Record<string, number> = {};
  const success_pattern_distribution: Record<string, number> = {};

  let total_confidence = 0;

  for (const eval of evaluations) {
    total_confidence += eval.confidence;

    for (const mode of eval.failure_modes_detected) {
      failure_mode_distribution[mode] = (failure_mode_distribution[mode] || 0) + 1;
    }

    for (const pattern of eval.success_patterns_matched) {
      success_pattern_distribution[pattern] = (success_pattern_distribution[pattern] || 0) + 1;
    }
  }

  return {
    pass_rate: passed / total,
    avg_confidence: total_confidence / total,
    failure_mode_distribution,
    success_pattern_distribution
  };
}

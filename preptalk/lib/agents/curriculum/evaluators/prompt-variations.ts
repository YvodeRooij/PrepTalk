/**
 * PHASE 4: PROMPT A/B TESTING VARIATIONS
 *
 * Three different approaches to fixing reverse question duplication:
 *
 * VARIATION A: Pre-Assigned CI Facts (Smart Filtering)
 * - Assign specific CI facts to specific rounds before generation
 * - Each round gets only relevant subset of CI
 * - Prevents reuse of same facts
 *
 * VARIATION B: Sequential Generation with Exclusion
 * - Generate rounds one at a time (not parallel)
 * - Pass previously generated questions as exclusion list
 * - Track which CI facts have been used
 *
 * VARIATION C: Enhanced Differentiation Constraints (Prompt Engineering)
 * - Keep parallel generation
 * - Add strong differentiation instructions
 * - Explicit examples of what NOT to do
 */

import { CompetitiveIntelligence, NonTechnicalRoundType } from '../types';

// ════════════════════════════════════════════════════════════════════════════
// VARIATION A: PRE-ASSIGNED CI FACTS
// ════════════════════════════════════════════════════════════════════════════

export interface CIAssignment {
  primary: string[];  // CI facts this round MUST use
  secondary: string[];  // CI facts this round CAN use if relevant
  avoid: string[];  // CI facts reserved for other rounds
}

/**
 * Pre-assign CI facts to specific rounds based on relevance
 */
export function assignCIFactsToRounds(ci: CompetitiveIntelligence): Record<NonTechnicalRoundType, CIAssignment> {
  const allStrategicAdvantages = ci.strategicAdvantages || [];
  const allRecentDevelopments = ci.recentDevelopments || [];

  // Helper: Categorize CI facts by relevance
  const categorize = (fact: string) => {
    const lower = fact.toLowerCase();

    if (lower.includes('hiring') || lower.includes('team growth') || lower.includes('office') || lower.includes('expansion') && !lower.includes('market')) {
      return 'recruiter_relevant';
    }
    if (lower.includes('process') || lower.includes('tool') || lower.includes('collaboration') || lower.includes('team') || lower.includes('remote')) {
      return 'behavioral_relevant';
    }
    if (lower.includes('culture') || lower.includes('values') || lower.includes('diversity') || lower.includes('mission') || lower.includes('purpose')) {
      return 'culture_relevant';
    }
    if (lower.includes('market') || lower.includes('competitive') || lower.includes('strategy') || lower.includes('revenue') || lower.includes('growth') || lower.includes('funding')) {
      return 'strategic_relevant';
    }
    return 'universal';
  };

  // Categorize all facts
  const categorizedAdvantages = allStrategicAdvantages.map(fact => ({ fact, category: categorize(fact) }));
  const categorizedDevelopments = allRecentDevelopments.map(fact => ({ fact, category: categorize(fact) }));

  // Assign to rounds
  const assignments: Record<NonTechnicalRoundType, CIAssignment> = {
    recruiter_screen: {
      primary: [
        ...categorizedDevelopments.filter(d => d.category === 'recruiter_relevant').map(d => d.fact),
        ...categorizedAdvantages.filter(a => a.category === 'recruiter_relevant' || a.category === 'universal').map(a => a.fact).slice(0, 1)
      ],
      secondary: [...allRecentDevelopments.slice(0, 2)],
      avoid: [
        ...categorizedAdvantages.filter(a => a.category === 'strategic_relevant').map(a => a.fact),
        ...categorizedDevelopments.filter(d => d.category === 'strategic_relevant').map(d => d.fact)
      ]
    },
    behavioral_deep_dive: {
      primary: [
        ...categorizedAdvantages.filter(a => a.category === 'behavioral_relevant').map(a => a.fact),
        ...categorizedDevelopments.filter(d => d.category === 'behavioral_relevant').map(d => d.fact)
      ],
      secondary: [...categorizedAdvantages.filter(a => a.category === 'universal').map(a => a.fact)],
      avoid: [
        ...categorizedAdvantages.filter(a => a.category === 'strategic_relevant').map(a => a.fact)
      ]
    },
    culture_values_alignment: {
      primary: [
        ...categorizedAdvantages.filter(a => a.category === 'culture_relevant').map(a => a.fact),
        ...categorizedDevelopments.filter(d => d.category === 'culture_relevant').map(d => d.fact)
      ],
      secondary: [...categorizedAdvantages.filter(a => a.category === 'universal').map(a => a.fact)],
      avoid: [
        ...categorizedAdvantages.filter(a => a.category === 'strategic_relevant' || a.category === 'recruiter_relevant').map(a => a.fact)
      ]
    },
    strategic_role_discussion: {
      primary: [
        ...categorizedAdvantages.filter(a => a.category === 'strategic_relevant' || a.category === 'universal').map(a => a.fact),
        ...categorizedDevelopments.filter(d => d.category === 'strategic_relevant').map(d => d.fact),
        ci.competitivePositioning
      ].filter(Boolean),
      secondary: [],
      avoid: [
        ...categorizedAdvantages.filter(a => a.category === 'recruiter_relevant').map(a => a.fact)
      ]
    },
    executive_final: {
      primary: [
        ci.competitivePositioning,
        ...categorizedAdvantages.filter(a => a.category === 'strategic_relevant').map(a => a.fact),
        ...allRecentDevelopments.filter(d => categorize(d) === 'strategic_relevant')
      ].filter(Boolean),
      secondary: [],
      avoid: [
        ...categorizedAdvantages.filter(a => a.category === 'recruiter_relevant' || a.category === 'behavioral_relevant').map(a => a.fact)
      ]
    }
  };

  // Fallback: If no primary CI facts assigned, give generic ones
  Object.keys(assignments).forEach(round => {
    const key = round as NonTechnicalRoundType;
    if (assignments[key].primary.length === 0) {
      assignments[key].primary = [allStrategicAdvantages[0] || 'Company values and mission'];
    }
  });

  return assignments;
}

/**
 * VARIATION A: Build prompt with pre-assigned CI facts
 */
export function buildPromptVariationA(
  roundType: NonTechnicalRoundType,
  ciAssignment: CIAssignment,
  jobData: any
): string {
  return `**CRITICAL: This round gets a CURATED subset of competitive intelligence to ensure differentiation.**

**PRIMARY CI FACTS (Focus on these - most relevant to ${roundType}):**
${ciAssignment.primary.map((fact, i) => `${i + 1}. ${fact}`).join('\n')}

**SECONDARY CI FACTS (Use only if highly relevant):**
${ciAssignment.secondary.length > 0 ? ciAssignment.secondary.map((fact, i) => `${i + 1}. ${fact}`).join('\n') : 'None - stick to primary facts'}

**CI FACTS TO AVOID (Reserved for other rounds):**
${ciAssignment.avoid.length > 0 ? ciAssignment.avoid.slice(0, 3).map((fact, i) => `${i + 1}. ${fact}`).join('\n') : 'None'}

**INSTRUCTIONS:**
- You MUST use ONLY the PRIMARY CI facts above
- Do NOT use any CI facts from the "AVOID" list
- These questions are ONLY for ${roundType} - they will NOT appear in other rounds
- Other rounds have their own curated CI subsets to ensure no duplication`;
}

// ════════════════════════════════════════════════════════════════════════════
// VARIATION B: SEQUENTIAL GENERATION WITH EXCLUSION
// ════════════════════════════════════════════════════════════════════════════

export interface ExclusionContext {
  previousQuestions: string[];  // Questions already generated
  usedCIFacts: string[];  // CI facts heavily used already
  usedPatterns: string[];  // Success patterns already used
}

/**
 * VARIATION B: Build prompt with exclusion list from previous rounds
 */
export function buildPromptVariationB(
  roundType: NonTechnicalRoundType,
  exclusionContext: ExclusionContext,
  jobData: any
): string {
  return `**CRITICAL: You are generating questions for ${roundType}. Other rounds have already been generated.**

**QUESTIONS ALREADY GENERATED IN OTHER ROUNDS (DO NOT REPEAT):**
${exclusionContext.previousQuestions.length > 0
    ? exclusionContext.previousQuestions.map((q, i) => `${i + 1}. "${q}"`).join('\n')
    : 'This is the first round - no exclusions yet'}

**CI FACTS ALREADY HEAVILY USED (Use sparingly or avoid):**
${exclusionContext.usedCIFacts.length > 0
    ? exclusionContext.usedCIFacts.map((fact, i) => `${i + 1}. ${fact}`).join('\n')
    : 'No CI facts used yet - free choice'}

**SUCCESS PATTERNS ALREADY USED (Diversify):**
${exclusionContext.usedPatterns.length > 0
    ? exclusionContext.usedPatterns.join(', ')
    : 'No patterns used yet'}

**YOUR TASK:**
- Your questions MUST be semantically distinct from the questions above
- Avoid using the CI facts listed as "heavily used"
- Use different success patterns than those already used
- If you must use a similar CI fact, approach it from a COMPLETELY different angle
- Semantic similarity with previous questions must be < 70%`;
}

// ════════════════════════════════════════════════════════════════════════════
// VARIATION C: ENHANCED DIFFERENTIATION CONSTRAINTS
// ════════════════════════════════════════════════════════════════════════════

/**
 * Helper: Get differentiation guidance for each round
 */
export function getDifferentiationGuidance(roundType: NonTechnicalRoundType): string {
  const guidance: Record<NonTechnicalRoundType, string> = {
    recruiter_screen: `
**DIFFERENTIATION REQUIREMENTS FOR RECRUITER SCREEN:**

✅ FOCUS ON:
- Role logistics and timeline ("What does onboarding look like?", "What's the interview process?")
- High-level company growth ("I saw you recently opened X office...")
- General team structure ("Who would I be working with?")
- Process questions ("How does remote work logistics work?")

❌ AVOID (Save for later rounds):
- Strategic business questions (better for strategic_role_discussion)
- Deep cultural validation (better for culture_values_alignment)
- Team execution details (better for behavioral_deep_dive)
- Executive vision questions (better for executive_final)

❌ DO NOT ASK QUESTIONS LIKE:
- "How does [Company] balance [strategic tradeoff]?" ← Too strategic for recruiter
- "Can you give me an example of how the team handles [conflict]?" ← Too behavioral for recruiter
- "How does [company value] show up in daily work?" ← Too cultural for recruiter

✅ INSTEAD ASK QUESTIONS LIKE:
- "I noticed the recent expansion to [location]. What does that mean for this role's team structure?"
- "What does a typical onboarding timeline look like for someone in this position?"
- "How does the team stay connected across [distributed locations]?"`,

    behavioral_deep_dive: `
**DIFFERENTIATION REQUIREMENTS FOR BEHAVIORAL DEEP DIVE:**

✅ FOCUS ON:
- Team collaboration reality ("How does the team handle disagreements?")
- Execution and processes ("Walk me through how [process] works")
- Day-to-day challenges ("What's the hardest part of [aspect]?")
- Concrete examples ("Can you share a recent example when...")

❌ AVOID (Save for later rounds):
- Surface logistics (already covered in recruiter_screen)
- High-level strategy (better for strategic_role_discussion)
- Cultural philosophy without examples (better for culture_values_alignment)

❌ DO NOT ASK QUESTIONS LIKE:
- "What's the interview timeline?" ← Too logistical for behavioral
- "What's the company's 3-year vision?" ← Too strategic for behavioral
- "What are the company values?" ← Too generic for behavioral

✅ INSTEAD ASK QUESTIONS LIKE:
- "Can you walk me through a recent example when the team disagreed on [approach]?"
- "How has [recent development] changed the day-to-day collaboration?"
- "What's the most common reason [process] breaks down, and how does the team adapt?"`,

    culture_values_alignment: `
**DIFFERENTIATION REQUIREMENTS FOR CULTURE/VALUES ALIGNMENT:**

✅ FOCUS ON:
- Culture validation ("How does [value] show up when things go wrong?")
- Values stress-testing ("The culture memo says X - give me an example")
- Team fit and dynamics ("What surprised you about working here?")
- Emotional/authentic questions ("What keeps you here?")

❌ AVOID (Save for later rounds):
- Process logistics (already covered in recruiter_screen)
- Execution details (already covered in behavioral_deep_dive)
- Business strategy (better for strategic_role_discussion)

❌ DO NOT ASK QUESTIONS LIKE:
- "What's the company's go-to-market strategy?" ← Too strategic for culture
- "How does the team manage [process]?" ← Too operational for culture
- "What's the career growth path?" ← Too logistical for culture

✅ INSTEAD ASK QUESTIONS LIKE:
- "The culture memo emphasizes [value]. Can you share a time when that was tested?"
- "What do you wish you'd known about the culture before joining?"
- "How has [recent growth] impacted the team culture or dynamics?"`,

    strategic_role_discussion: `
**DIFFERENTIATION REQUIREMENTS FOR STRATEGIC ROLE DISCUSSION:**

✅ FOCUS ON:
- Business strategy and priorities ("What are the top priorities for [function]?")
- Competitive positioning ("How does [company] differentiate from [competitor]?")
- Role's strategic contribution ("How does this role impact [business goal]?")
- Market/industry trends ("How is [trend] affecting strategy?")

❌ AVOID (Save for later rounds):
- Tactical logistics (already covered in earlier rounds)
- Process details (already covered in behavioral_deep_dive)
- Generic culture questions (already covered in culture round)

❌ DO NOT ASK QUESTIONS LIKE:
- "What's the day-to-day work like?" ← Too tactical for strategic round
- "How does the team collaborate remotely?" ← Too operational for strategic round
- "What keeps you motivated?" ← Too cultural for strategic round

✅ INSTEAD ASK QUESTIONS LIKE:
- "How does this Strategic Account Executive role contribute to [Company]'s competitive advantage against [Competitor]?"
- "With the recent [funding/expansion], what are the top 2-3 strategic priorities for sales?"
- "How is [Company] planning to turn [challenge] into a competitive moat?"`,

    executive_final: `
**DIFFERENTIATION REQUIREMENTS FOR EXECUTIVE FINAL:**

✅ FOCUS ON:
- Long-term vision (2-5 years)
- Market positioning and trends
- Biggest challenges/opportunities
- Leadership philosophy
- Industry evolution

❌ AVOID (Already covered in earlier rounds):
- Tactical/operational questions
- Day-to-day team dynamics
- Process logistics
- Questions they've answered in media/talks

❌ DO NOT ASK QUESTIONS LIKE:
- "What's the typical career path?" ← Too tactical for C-level
- "How does the team collaborate?" ← Too operational for C-level
- "What's the company culture like?" ← Too generic for C-level

✅ INSTEAD ASK QUESTIONS LIKE:
- "Where do you see [Industry] in 3-5 years, and how is [Company] positioning for that?"
- "What's the most important bet [Company] is making that competitors aren't?"
- "As [regulation/trend] evolves, how does [Company] turn that into an advantage?"`
  };

  return guidance[roundType] || '';
}

/**
 * VARIATION C: Enhanced differentiation constraints (for current prompt)
 */
export function buildPromptVariationC(
  roundType: NonTechnicalRoundType,
  jobData: any
): string {
  const differentiationGuidance = getDifferentiationGuidance(roundType);

  return `**CRITICAL DIFFERENTIATION CONSTRAINTS:**

These questions are EXCLUSIVELY for the ${roundType} round with [specific interviewer for this round].

${differentiationGuidance}

**ANTI-PATTERNS TO AVOID:**

1. ❌ **Same CI Fact, Cosmetic Variation:**
   BAD: "How has [CI fact] impacted the team?" (Round 1)
   BAD: "How has [same CI fact] changed your approach?" (Round 2)
   ↳ This is just synonym swapping - semantically identical!

2. ❌ **Wrong Round Depth:**
   BAD (Recruiter): "How does [Company] strategically position against [Competitor]?"
   ↳ Recruiter can't answer strategic questions - save for strategic/executive rounds

3. ❌ **Generic Question Not Grounded in CI:**
   BAD: "What's the culture like here?"
   GOOD: "The culture memo emphasizes [specific CI culture value]. How does that show up in [context]?"

**CHECKLIST BEFORE SUBMITTING EACH QUESTION:**
[ ] Uses a CI fact from competitive intelligence above
[ ] Matches ${roundType} depth level (not too shallow or deep)
[ ] Would naturally come up in conversation with [interviewer for this round]
[ ] Demonstrates candidate did research on ${jobData.company_name}
[ ] Semantically distinct from questions you'd ask in other rounds

**Remember:** Other rounds will use DIFFERENT CI facts and DIFFERENT angles. Your job is to make these questions UNIQUE to ${roundType}.`;
}

// ════════════════════════════════════════════════════════════════════════════
// COMPARISON SUMMARY
// ════════════════════════════════════════════════════════════════════════════

/**
 * Pros/Cons of each variation for documentation
 */
export const VARIATION_COMPARISON = {
  variation_a_preassigned: {
    name: 'Pre-Assigned CI Facts',
    approach: 'Filter CI facts before generation - each round gets curated subset',
    pros: [
      'Guarantees no CI fact reuse across rounds',
      'Maintains parallel generation (fast)',
      'Clear constraints for LLM',
      'Deterministic CI allocation'
    ],
    cons: [
      'Requires categorization logic',
      'May miss some universally relevant CI facts',
      'Need to ensure all CI facts get used'
    ],
    expected_improvement: '85-95% reduction in duplication',
    implementation_complexity: 'Medium',
    speed_impact: 'None - keeps parallel generation'
  },

  variation_b_sequential: {
    name: 'Sequential Generation with Exclusion',
    approach: 'Generate rounds one at a time, passing previous questions as exclusions',
    pros: [
      'Strongest differentiation guarantee',
      'Explicit coordination between rounds',
      'Can track CI fact usage dynamically',
      'LLM sees exactly what to avoid'
    ],
    cons: [
      'Slower (sequential vs parallel)',
      'Order dependency (R1 gets first pick)',
      'More complex state management',
      'Longer prompt with exclusions'
    ],
    expected_improvement: '95-100% reduction in duplication',
    implementation_complexity: 'High',
    speed_impact: 'Significant - 5x slower (parallel → sequential)'
  },

  variation_c_enhanced_prompts: {
    name: 'Enhanced Differentiation Constraints',
    approach: 'Stronger prompt instructions with explicit examples and anti-patterns',
    pros: [
      'Simplest implementation (just modify prompt)',
      'Maintains parallel generation (fast)',
      'Clear examples of what NOT to do',
      'No architecture changes'
    ],
    cons: [
      'Relies on LLM following instructions',
      'May still have some overlap (20-30%)',
      'Longer prompts = higher token cost',
      'No hard guarantees'
    ],
    expected_improvement: '60-75% reduction in duplication',
    implementation_complexity: 'Low',
    speed_impact: 'None - keeps parallel generation'
  }
};

/**
 * RECOMMENDATION: Implement Variation A (Pre-Assigned CI Facts)
 *
 * Reasoning:
 * - Best balance of speed (parallel) + effectiveness (85-95% improvement)
 * - Deterministic guarantees (no LLM prompt-following luck)
 * - Medium complexity (acceptable for production)
 * - Maintains current architecture (batch structured output)
 */

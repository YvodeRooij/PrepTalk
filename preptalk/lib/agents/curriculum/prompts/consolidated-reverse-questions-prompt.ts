/**
 * CONSOLIDATED Multi-Round Reverse Question Generation
 *
 * Uses Claude Sonnet 4.5 best practices:
 * - XML tags for structure
 * - <thinking> tags for constraint tracking
 * - Explicit instructions
 * - Single context for all rounds
 *
 * This approach generates ALL 5 rounds in one LLM call,
 * allowing explicit constraint tracking instead of "assuming"
 */

import type { CompetitiveIntelligence } from '../types';

interface ConsolidatedPromptContext {
  competitiveIntelligence: CompetitiveIntelligence;
  jobTitle: string;
  companyName: string;
  experienceLevel: string;
  bestAskedToMap: Record<string, string>;
}

/**
 * Angle definitions (preserved from angle-based approach)
 */
const ROUND_ANGLES = {
  recruiter_screen: {
    angle: 'Company Selling Points & Role Clarity',
    description: 'Why this company? What makes it attractive? What will I actually do? Role scope and team structure.',
    forbidden_angles: ['career growth opportunities', 'team collaboration processes', 'competitive tactics', 'long-term vision']
  },
  behavioral_deep_dive: {
    angle: 'Team Process & Collaboration',
    description: 'How teams work together, day-to-day workflows, cross-functional dynamics',
    forbidden_angles: ['personal career growth', 'industry vision', 'company values']
  },
  culture_values_alignment: {
    angle: 'Values Manifestation & Work Culture',
    description: 'How company values show up in real decisions, culture in action',
    forbidden_angles: ['competitive positioning', 'tactical processes', 'market trends']
  },
  strategic_role_discussion: {
    angle: 'Competitive Positioning & Tactical Execution',
    description: 'How the company competes, market differentiation, go-to-market strategy',
    forbidden_angles: ['personal growth', 'cultural values', 'long-term industry vision']
  },
  executive_final: {
    angle: 'Industry Vision & Long-term Strategy',
    description: '3-5 year outlook, market evolution, strategic bets',
    forbidden_angles: ['day-to-day processes', 'personal career path', 'tactical execution']
  }
} as const;

/**
 * Format CI facts as XML
 */
function formatCIFactsXML(ci: CompetitiveIntelligence): string {
  let xml = '';

  if (ci.strategicAdvantages && ci.strategicAdvantages.length > 0) {
    xml += '<strategic_advantages>\n';
    ci.strategicAdvantages.forEach((adv, i) => {
      xml += `  <fact id="strategic_${i + 1}">${adv}</fact>\n`;
    });
    xml += '</strategic_advantages>\n\n';
  }

  if (ci.recentDevelopments && ci.recentDevelopments.length > 0) {
    xml += '<recent_developments>\n';
    ci.recentDevelopments.forEach((dev, i) => {
      xml += `  <fact id="development_${i + 1}">${dev}</fact>\n`;
    });
    xml += '</recent_developments>\n\n';
  }

  if (ci.competitivePositioning) {
    xml += `<competitive_positioning>\n  <fact id="positioning_1">${ci.competitivePositioning}</fact>\n</competitive_positioning>\n\n`;
  }

  if (ci.primaryCompetitors && ci.primaryCompetitors.length > 0) {
    xml += `<competitors>${ci.primaryCompetitors.join(', ')}</competitors>\n`;
  }

  return xml;
}

/**
 * Build consolidated prompt
 */
export function buildConsolidatedReverseQuestionPrompt(
  context: ConsolidatedPromptContext
): string {
  const {
    competitiveIntelligence: ci,
    jobTitle,
    companyName,
    experienceLevel,
    bestAskedToMap
  } = context;

  return `<task>
Generate reverse interview questions for ALL 5 interview rounds simultaneously.

CRITICAL: You MUST explicitly track which CI facts you use across rounds to enforce the max-2 reuse constraint.
Use <thinking> tags to plan fact allocation BEFORE generating questions.
</task>

<context>
<job_details>
  <position>${jobTitle}</position>
  <company>${companyName}</company>
  <experience_level>${experienceLevel}</experience_level>
</job_details>

<competitive_intelligence>
${formatCIFactsXML(ci)}
</competitive_intelligence>

<interviewer_mapping>
${Object.entries(bestAskedToMap).map(([round, person]) =>
  `  <round type="${round}">${person}</round>`
).join('\n')}
</interviewer_mapping>
</context>

<round_definitions>
${Object.entries(ROUND_ANGLES).map(([type, angle]) => `
  <round id="${type}">
    <angle>${angle.angle}</angle>
    <description>${angle.description}</description>
    <forbidden_angles>${angle.forbidden_angles.join(', ')}</forbidden_angles>
  </round>`).join('\n')}
</round_definitions>

<instructions>

## Step 1: Plan Fact Allocation (REQUIRED - Use <thinking> tags)

You MUST use <thinking> tags to plan which facts to use for which rounds BEFORE generating questions.

<thinking_template>
FACT ALLOCATION PLANNING:

Step 1a: Score each fact for each round
- For each CI fact, rate fit (1-10) to each round's angle
- Consider semantic alignment, not just keywords

Step 1b: Allocate facts ensuring max-2 reuse
- Allocate each fact to its top 1-2 best-fitting rounds
- Track usage: ensure NO fact exceeds 2 rounds

Step 1c: Validate allocation
- Count uses per fact
- Ensure each round has 2-5 facts
- Verify constraint satisfied

Example:
Fact: "US News #1 ranking"
- Recruiter: 9/10 (excellent for company selling points)
- Behavioral: 3/10 (not about team process)
- Culture: 5/10 (shows values but indirect)
- Strategic: 8/10 (competitive positioning)
- Executive: 6/10 (industry position)
→ ALLOCATE TO: Recruiter, Strategic (top 2)

[Continue for all facts...]

FINAL ALLOCATION:
recruiter_screen: [fact_id_1, fact_id_2, fact_id_3]
behavioral_deep_dive: [fact_id_4, fact_id_5]
culture_values_alignment: [fact_id_6, fact_id_7, fact_id_8]
strategic_role_discussion: [fact_id_1, fact_id_9, fact_id_10]
executive_final: [fact_id_11, fact_id_12]

CONSTRAINT CHECK:
✓ fact_id_1: 2 uses (Recruiter, Strategic)
✓ fact_id_2: 1 use (Recruiter)
✓ fact_id_4: 1 use (Behavioral)
[All facts ≤ 2 uses]
</thinking_template>

## Step 2: Generate Questions

For each round, generate 2-5 questions using ONLY the facts you allocated in Step 1.

Apply the round's specific angle to each fact.

CRITICAL: As you generate each question, reference your fact allocation from Step 1.
Do NOT use any facts that weren't allocated to this round.

## Step 3: Validate Before Returning

MANDATORY VALIDATION - Do this BEFORE returning your response:

1. Count how many times each fact_id appears across ALL questions
2. Check: Does ANY fact appear more than 2 times?
3. If YES:
   - Identify the violating fact(s)
   - Go back to Step 1 and revise your allocation
   - Regenerate the questions for affected rounds
   - Validate again until constraint is satisfied
4. If NO: Proceed to return the response

Set constraint_satisfied to TRUE only if ALL facts are used ≤ 2 times.
Add warnings for any facts at the limit (used exactly 2 times).

</instructions>

<quality_requirements>

${generateQualityRequirementsSection()}

</quality_requirements>

<output_format>
Return JSON with this exact structure:

{
  "fact_allocation": {
    "recruiter_screen": ["fact_id_1", "fact_id_2", ...],
    "behavioral_deep_dive": ["fact_id_4", ...],
    "culture_values_alignment": ["fact_id_6", ...],
    "strategic_role_discussion": ["fact_id_1", ...],
    "executive_final": ["fact_id_11", ...]
  },
  "questions": {
    "recruiter_screen": [
      {
        "id": "recruiter_screen-rq1",
        "question_text": "Natural, conversational question (min 30 chars)",
        "ci_fact_used": "Exact CI fact text from section 1",
        "ci_source_type": "strategic_advantage or recent_development",
        "success_pattern": "recent_event_team_impact",
        "why_this_works": "Brief explanation (min 50 chars)",
        "green_flags": ["Positive signal 1", "Positive signal 2"],
        "red_flags": ["Warning signal 1"],
        "expected_insights": ["What you'll learn 1", "What you'll learn 2"],
        "best_timing": "opening",
        "natural_phrasing_tip": "How to phrase naturally (can be null)"
      }
    ],
    "behavioral_deep_dive": [...],
    "culture_values_alignment": [...],
    "strategic_role_discussion": [...],
    "executive_final": [...]
  },
  "validation": {
    "fact_usage_count": [
      { "fact_id": "fact_id_1", "count": 2 },
      { "fact_id": "fact_id_2", "count": 1 },
      ...
    ],
    "constraint_satisfied": true,
    "warnings": []
  }
}

IMPORTANT: Each question MUST include ALL required fields to match the schema:
- id: Unique identifier (e.g., "recruiter_screen-rq1")
- question_text: Min 30 characters
- ci_fact_used: EXACT fact text (not just ID)
- ci_source_type: "strategic_advantage" or "recent_development"
- success_pattern: One of the proven patterns
- why_this_works: Min 50 characters
- green_flags: 2-4 positive signals
- red_flags: 1-3 warning signals
- expected_insights: 2-4 insights
- best_timing: "opening", "mid_conversation", or "closing"
- natural_phrasing_tip: Optional tip (can be null)
</output_format>`;
}

/**
 * Generate quality requirements section (preserves all enhancements)
 */
function generateQualityRequirementsSection(): string {
  return `
## CRITICAL: Angle-Based Differentiation (PRESERVED)

**Your job is NOT to select DIFFERENT facts than other rounds.**
**Your job IS to approach the SAME facts from each round's UNIQUE ANGLE.**

## Phrasing Diversity (5 Structures - PRESERVED)

REQUIRED: Vary how you reference CI facts across questions:

1. **Direct Reference** (use sparingly): "With [fact], [question based on angle]..."
2. **Embedded Reference**: "How does [aspect related to fact]... given [brief fact reference]?"
3. **Implied Reference**: "[Opportunity/challenge created by fact]—how would you [angle-specific action]?"
4. **Question-First**: "What [angle-specific aspect] becomes possible now that [fact]?"
5. **Comparative**: "[Fact] seems like [observation]—can you [angle-specific request]?"

DO NOT start every question with the same phrase like "With the $400M..."

## Pronoun Rules (PRESERVED)

❌ WRONG: "How does our partnership..." (candidate doesn't work there yet)
❌ WRONG: "What makes us different..."
✅ CORRECT: "How does the partnership..." or "How does your partnership..."
✅ CORRECT: "What makes the company different..."

## Natural Fact Selection (PRESERVED)

ONLY use facts that NATURALLY fit your angle:

- **Recruiter (Company/Role)** → Rankings, awards, reputation, stability, role scope
- **Behavioral (Team Process)** → System changes, team expansions, workflow challenges
- **Culture (Values)** → DEI, awards for culture, employee programs, care philosophy
- **Strategic (Competitive)** → Market share, partnerships, differentiation, positioning
- **Executive (Vision)** → Strategic bets, market trends, long-term initiatives, evolution

If a fact doesn't naturally fit your angle, SKIP IT.

## Quality Criteria (PRESERVED)

✅ PASS:
1. Follows this round's angle
2. Avoids forbidden angles
3. Natural, conversational language
4. Specific CI reference
5. Team/process focus (not personal)
6. Actionable insights

❌ FAIL:
1. Uses forbidden angle
2. Generic (applies to any company)
3. Awkward phrasing
4. Personal questions ("What was the biggest challenge YOU faced?")
5. Wrong pronouns (we/our)
6. Repetitive phrasing structure
`;
}

/**
 * Export for use in persona generation
 */
export const consolidatedReverseQuestionPrompt = {
  build: buildConsolidatedReverseQuestionPrompt,
  angles: ROUND_ANGLES
};

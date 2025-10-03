/**
 * PHASE 1: LLM-BASED CI CATEGORIZATION SYSTEM
 *
 * Three prompt variations to replace hardcoded keyword matching with
 * scalable, industry-agnostic CI fact categorization using Claude Sonnet 4.5
 *
 * Goal: Dynamically assign CI facts to interview rounds based on semantic relevance
 * Success: Works across tech, healthcare, finance, manufacturing, consulting without modification
 */

import { z } from 'zod';
import { CompetitiveIntelligence, NonTechnicalRoundType } from '../types';

// ════════════════════════════════════════════════════════════════════════════
// SHARED TYPES & SCHEMAS
// ════════════════════════════════════════════════════════════════════════════

export interface CICategorizationInput {
  ciFacts: string[];
  jobTitle: string;
  companyName: string;
  industryContext: string;
}

export interface RoundCIAssignment {
  roundType: NonTechnicalRoundType;
  primary: string[];      // Must use these (2-3 facts)
  secondary: string[];    // Can use if relevant (1-2 facts)
  avoid: string[];        // Reserved for other rounds
}

// ════════════════════════════════════════════════════════════════════════════
// VARIATION A: SCORE-BASED ASSIGNMENT (0-10 scoring per round)
// ════════════════════════════════════════════════════════════════════════════

export const ScoreBasedSchema = z.object({
  ci_fact: z.string().describe('The CI fact being scored'),
  scores: z.object({
    recruiter_screen: z.number().min(0).max(10).describe('Relevance score 0-10 for recruiter screen round'),
    behavioral_deep_dive: z.number().min(0).max(10).describe('Relevance score 0-10 for behavioral deep dive round'),
    culture_values_alignment: z.number().min(0).max(10).describe('Relevance score 0-10 for culture/values round'),
    strategic_role_discussion: z.number().min(0).max(10).describe('Relevance score 0-10 for strategic role round'),
    executive_final: z.number().min(0).max(10).describe('Relevance score 0-10 for executive final round')
  }),
  reasoning: z.string().min(50).describe('Brief explanation of scoring logic')
});

export const ScoreBasedBatchSchema = z.object({
  categorizations: z.array(ScoreBasedSchema).describe('Score-based categorization for each CI fact')
});

export function buildScoreBasedPrompt(input: CICategorizationInput): string {
  return `You are an expert interview strategist categorizing competitive intelligence (CI) facts for a 5-round interview process.

**CONTEXT:**
- Company: ${input.companyName}
- Role: ${input.jobTitle}
- Industry: ${input.industryContext}

**CI FACTS TO CATEGORIZE:**
${input.ciFacts.map((fact, i) => `${i + 1}. ${fact}`).join('\n')}

**YOUR TASK:**
For EACH CI fact above, assign a relevance score (0-10) for each of the 5 interview rounds:

**ROUND DEFINITIONS:**

1. **Recruiter Screen** (0-10 score)
   - Appropriate: Process, timeline, high-level growth, team structure, logistics, office locations
   - NOT appropriate: Deep strategy, technical details, executive vision
   - Who asks: Recruiter, Talent Partner, HR Coordinator

2. **Behavioral Deep Dive** (0-10 score)
   - Appropriate: Team dynamics, day-to-day processes, collaboration tools, execution challenges
   - NOT appropriate: Surface logistics, high-level strategy, cultural philosophy without examples
   - Who asks: Hiring Manager, Team Lead

3. **Culture/Values Alignment** (0-10 score)
   - Appropriate: Company values manifestation, diversity/inclusion, mission/purpose, work culture
   - NOT appropriate: Pure business strategy, technical processes, logistics
   - Who asks: Peer, Team Member, Culture Champion

4. **Strategic Role Discussion** (0-10 score)
   - Appropriate: Market positioning, competitive strategy, revenue/growth, funding, industry trends
   - NOT appropriate: Micro-level details, pure culture questions, basic logistics
   - Who asks: Director, VP, Skip-Level Manager

5. **Executive Final** (0-10 score)
   - Appropriate: Long-term vision, industry evolution, biggest opportunities/challenges, leadership philosophy
   - NOT appropriate: Tactical details, day-to-day operations, questions they've answered in media
   - Who asks: C-Level, Founder, Executive Team

**SCORING GUIDELINES:**
- **9-10**: Perfect fit - this fact is HIGHLY relevant and would naturally come up in this round
- **6-8**: Good fit - relevant and could be used effectively
- **3-5**: Moderate fit - tangentially relevant, could be forced in but not ideal
- **0-2**: Poor fit - not appropriate for this round type or interviewer

**IMPORTANT:**
- Each fact should have 1-2 rounds with HIGH scores (8-10)
- Ensure differentiation: If fact scores 10 for strategic, it shouldn't score 10 for recruiter
- Consider who the interviewer is and what they can answer
- Think about natural conversation flow in each round type

**EXAMPLE (for reference only):**

CI Fact: "Series B funding ($50M) announced Q4 2024 to expand into APAC markets"

Scores:
- recruiter_screen: 6 (Can mention expansion/growth, but not strategic details)
- behavioral_deep_dive: 3 (Not about team processes/collaboration)
- culture_values_alignment: 2 (Not about culture/values)
- strategic_role_discussion: 10 (Perfect for discussing market expansion strategy)
- executive_final: 9 (Relevant for vision, but slightly tactical)

Reasoning: "This fact is fundamentally strategic (market expansion, funding). Strategic round is perfect (10) because it enables questions about APAC market entry strategy. Executive gets 9 because funding decisions reflect vision. Recruiter gets 6 because they can discuss 'we're growing and hiring' but not strategy. Behavioral/culture are low because this isn't about team dynamics or values."

Now categorize ALL ${input.ciFacts.length} CI facts above following this exact format.`;
}

// ════════════════════════════════════════════════════════════════════════════
// VARIATION B: BINARY RELEVANCE WITH REASONING (Primary/Secondary/Avoid)
// ════════════════════════════════════════════════════════════════════════════

export const BinaryRelevanceSchema = z.object({
  ci_fact: z.string().describe('The CI fact being categorized'),
  assignments: z.object({
    recruiter_screen: z.enum(['primary', 'secondary', 'avoid']).describe('Assignment for recruiter screen'),
    behavioral_deep_dive: z.enum(['primary', 'secondary', 'avoid']).describe('Assignment for behavioral deep dive'),
    culture_values_alignment: z.enum(['primary', 'secondary', 'avoid']).describe('Assignment for culture/values'),
    strategic_role_discussion: z.enum(['primary', 'secondary', 'avoid']).describe('Assignment for strategic role'),
    executive_final: z.enum(['primary', 'secondary', 'avoid']).describe('Assignment for executive final')
  }),
  reasoning: z.string().min(100).describe('Detailed explanation of assignments')
});

export const BinaryRelevanceBatchSchema = z.object({
  categorizations: z.array(BinaryRelevanceSchema).describe('Binary categorization for each CI fact')
});

export function buildBinaryRelevancePrompt(input: CICategorizationInput): string {
  return `You are an expert interview strategist categorizing competitive intelligence (CI) facts for a 5-round interview process.

**CONTEXT:**
- Company: ${input.companyName}
- Role: ${input.jobTitle}
- Industry: ${input.industryContext}

**CI FACTS TO CATEGORIZE:**
${input.ciFacts.map((fact, i) => `${i + 1}. ${fact}`).join('\n')}

**YOUR TASK:**
For EACH CI fact, assign it to each round as:
- **primary**: This round MUST use this fact (2-3 primary facts per round)
- **secondary**: This round CAN use this fact if relevant (1-2 secondary facts per round)
- **avoid**: This fact is reserved for other rounds (don't use here)

**ROUND CHARACTERISTICS:**

**1. Recruiter Screen**
- Focus: Process, logistics, high-level company overview, team structure, timeline
- Interviewer: Recruiter, Talent Partner (cannot answer deep strategic/technical questions)
- Primary facts: Office locations, hiring initiatives, general growth, team structure
- Avoid facts: Competitive strategy, technical architecture, executive vision

**2. Behavioral Deep Dive**
- Focus: Team dynamics, collaboration, day-to-day processes, execution challenges
- Interviewer: Hiring Manager, Team Lead (knows team operations intimately)
- Primary facts: Team tools, processes, collaboration methods, workflow changes
- Avoid facts: High-level strategy, pure cultural philosophy, basic logistics

**3. Culture/Values Alignment**
- Focus: Values in action, diversity/inclusion, mission, work environment, team health
- Interviewer: Peer, Team Member (can share authentic cultural experiences)
- Primary facts: DEI initiatives, cultural programs, values-driven decisions, mission alignment
- Avoid facts: Business strategy, technical processes, executive-level decisions

**4. Strategic Role Discussion**
- Focus: Market positioning, competitive dynamics, business strategy, revenue/growth
- Interviewer: Director, VP, Skip-Level Manager (strategic perspective)
- Primary facts: Funding, market expansion, competitive advantages, industry positioning
- Avoid facts: Day-to-day tactics, basic logistics, micro-level details

**5. Executive Final**
- Focus: Long-term vision, industry evolution, leadership philosophy, biggest bets
- Interviewer: C-Level, Founder (company-wide strategic view)
- Primary facts: Company vision, industry trends, transformational initiatives, market positioning
- Avoid facts: Tactical operations, questions answered in public talks/media

**ASSIGNMENT RULES:**
1. Each CI fact must be PRIMARY for exactly 1-2 rounds (ensures focused usage)
2. Each fact should be AVOID for at least 2-3 rounds (ensures differentiation)
3. Each round should get 2-3 PRIMARY facts total (ensures adequate CI per round)
4. Consider interviewer's ability to answer (e.g., recruiters can't discuss technical architecture)
5. Ensure natural conversation fit (e.g., funding announcements fit strategic rounds)

**EXAMPLE (for reference only):**

CI Fact: "Opened new 50,000 sq ft office in Austin Q3 2024 with focus on engineering talent"

Assignments:
- recruiter_screen: primary (Perfect for recruiter - office locations, hiring focus)
- behavioral_deep_dive: secondary (Could mention team distribution, but not core focus)
- culture_values_alignment: secondary (Could discuss Austin culture, but not primary)
- strategic_role_discussion: avoid (Too tactical for strategic round)
- executive_final: avoid (Too tactical for C-level)

Reasoning: "This fact is fundamentally about hiring/logistics. Recruiter screen is PRIMARY because it's about office location and talent acquisition - perfect for recruiter to discuss timeline, team structure, relocation support. Behavioral/culture are SECONDARY because hiring manager or peer could mention 'we just opened Austin office' in context, but it's not the focus. Strategic/executive are AVOID because this is too tactical - they discuss market expansion strategy, not specific office openings."

Now categorize ALL ${input.ciFacts.length} CI facts above following this exact format.`;
}

// ════════════════════════════════════════════════════════════════════════════
// VARIATION C: ROUND-FIRST ASSIGNMENT (Each round picks its 2-3 must-use facts)
// ════════════════════════════════════════════════════════════════════════════

export const RoundFirstSchema = z.object({
  round_type: z.enum([
    'recruiter_screen',
    'behavioral_deep_dive',
    'culture_values_alignment',
    'strategic_role_discussion',
    'executive_final'
  ]).describe('The interview round'),
  selected_ci_facts: z.array(z.object({
    fact: z.string().describe('The CI fact text'),
    why_selected: z.string().min(50).describe('Why this fact is perfect for this round'),
    example_question: z.string().min(30).describe('Example reverse question this fact enables')
  })).min(2).max(3).describe('Exactly 2-3 CI facts selected for this round'),
  avoided_facts: z.array(z.object({
    fact: z.string().describe('CI fact this round should avoid'),
    why_avoided: z.string().min(30).describe('Why this fact belongs in a different round')
  })).min(1).describe('Facts intentionally avoided and why')
});

export const RoundFirstBatchSchema = z.object({
  round_assignments: z.array(RoundFirstSchema).length(5).describe('Assignment for all 5 rounds')
});

export function buildRoundFirstPrompt(input: CICategorizationInput): string {
  return `You are an expert interview strategist assigning competitive intelligence (CI) facts to a 5-round interview process.

**CONTEXT:**
- Company: ${input.companyName}
- Role: ${input.jobTitle}
- Industry: ${input.industryContext}

**AVAILABLE CI FACTS (${input.ciFacts.length} total):**
${input.ciFacts.map((fact, i) => `${i + 1}. ${fact}`).join('\n')}

**YOUR TASK:**
For EACH of the 5 interview rounds below, select EXACTLY 2-3 CI facts that are PERFECT for that round.

**CRITICAL CONSTRAINTS:**
1. Each round gets ONLY 2-3 facts (ensures focus and prevents overlap)
2. Each fact should be used by ONLY 1-2 rounds max (ensures differentiation)
3. Consider who the interviewer is and what they can answer
4. Ensure even distribution: All facts should be used at least once

**ROUND 1: RECRUITER SCREEN**
- Interviewer: Recruiter, Talent Partner, HR Coordinator
- Can discuss: Hiring initiatives, office locations, team growth, general company updates, timeline/process
- Cannot discuss: Deep strategy, technical details, executive vision, competitive positioning
- Question style: "I noticed [CI fact]—what does that mean for this role's team structure?"

Select 2-3 facts from the list above that are PERFECT for recruiter screen. Explain why each is ideal and give an example question it enables.

---

**ROUND 2: BEHAVIORAL DEEP DIVE**
- Interviewer: Hiring Manager, Team Lead
- Can discuss: Team collaboration, tools/processes, execution challenges, day-to-day work
- Cannot discuss: Surface-level logistics, pure strategy, cultural philosophy without examples
- Question style: "How has [CI fact] changed the team's day-to-day collaboration?"

Select 2-3 facts from the list above that are PERFECT for behavioral deep dive. Explain why each is ideal and give an example question it enables.

---

**ROUND 3: CULTURE/VALUES ALIGNMENT**
- Interviewer: Peer, Team Member, Culture Champion
- Can discuss: Values in action, DEI initiatives, cultural programs, work environment, mission
- Cannot discuss: Business strategy, technical processes, tactical logistics
- Question style: "The company emphasizes [value from CI fact]—can you share a concrete example of that in action?"

Select 2-3 facts from the list above that are PERFECT for culture/values. Explain why each is ideal and give an example question it enables.

---

**ROUND 4: STRATEGIC ROLE DISCUSSION**
- Interviewer: Director, VP, Skip-Level Manager
- Can discuss: Market positioning, competitive strategy, funding, growth initiatives, industry trends
- Cannot discuss: Micro-level operations, basic logistics, questions better for other rounds
- Question style: "How does [strategic CI fact] position the team against [competitor/market trend]?"

Select 2-3 facts from the list above that are PERFECT for strategic discussion. Explain why each is ideal and give an example question it enables.

---

**ROUND 5: EXECUTIVE FINAL**
- Interviewer: C-Level, Founder, Executive Team
- Can discuss: Long-term vision, industry evolution, transformational initiatives, leadership philosophy
- Cannot discuss: Tactical details, day-to-day operations, questions they've answered in media/talks
- Question style: "With [CI fact], where do you see [industry/company] in 3-5 years?"

Select 2-3 facts from the list above that are PERFECT for executive final. Explain why each is ideal and give an example question it enables.

---

**IMPORTANT:**
- Avoid duplication: If a fact is perfect for strategic round, don't also make it primary for recruiter
- Ensure natural fit: Would this interviewer naturally be able to answer questions about this fact?
- Demonstrate why avoided facts belong elsewhere

**OUTPUT FORMAT:**
For each round, provide:
1. selected_ci_facts: Array of 2-3 facts with why_selected and example_question
2. avoided_facts: Array of facts this round should avoid (with why_avoided)

Now assign CI facts to all 5 rounds following this format.`;
}

// ════════════════════════════════════════════════════════════════════════════
// UTILITY: CONVERT LLM OUTPUT TO ROUND ASSIGNMENTS
// ════════════════════════════════════════════════════════════════════════════

/**
 * Variation A: Convert scores to round assignments (highest scores = primary)
 */
export function scorestoToRoundAssignments(
  categorizations: z.infer<typeof ScoreBasedBatchSchema>['categorizations']
): Record<NonTechnicalRoundType, RoundCIAssignment> {
  const rounds: NonTechnicalRoundType[] = [
    'recruiter_screen',
    'behavioral_deep_dive',
    'culture_values_alignment',
    'strategic_role_discussion',
    'executive_final'
  ];

  const assignments: Record<NonTechnicalRoundType, RoundCIAssignment> = {} as any;

  // Initialize assignments
  rounds.forEach(round => {
    assignments[round] = {
      roundType: round,
      primary: [],
      secondary: [],
      avoid: []
    };
  });

  // For each CI fact, assign based on scores
  categorizations.forEach(cat => {
    const scores = [
      { round: 'recruiter_screen' as const, score: cat.scores.recruiter_screen },
      { round: 'behavioral_deep_dive' as const, score: cat.scores.behavioral_deep_dive },
      { round: 'culture_values_alignment' as const, score: cat.scores.culture_values_alignment },
      { round: 'strategic_role_discussion' as const, score: cat.scores.strategic_role_discussion },
      { round: 'executive_final' as const, score: cat.scores.executive_final }
    ].sort((a, b) => b.score - a.score); // Sort by score descending

    // Top score (or top 2 if close) = primary
    const topScore = scores[0].score;
    scores.forEach(({ round, score }) => {
      if (score >= 8 && score >= topScore - 1) {
        // Primary: score 8+ and within 1 of top score
        if (assignments[round].primary.length < 3) {
          assignments[round].primary.push(cat.ci_fact);
        }
      } else if (score >= 5) {
        // Secondary: score 5-7
        if (assignments[round].secondary.length < 2) {
          assignments[round].secondary.push(cat.ci_fact);
        }
      } else {
        // Avoid: score 0-4
        if (assignments[round].avoid.length < 5) {
          assignments[round].avoid.push(cat.ci_fact);
        }
      }
    });
  });

  return assignments;
}

/**
 * Variation B: Convert binary assignments directly
 */
export function binaryToRoundAssignments(
  categorizations: z.infer<typeof BinaryRelevanceBatchSchema>['categorizations']
): Record<NonTechnicalRoundType, RoundCIAssignment> {
  const rounds: NonTechnicalRoundType[] = [
    'recruiter_screen',
    'behavioral_deep_dive',
    'culture_values_alignment',
    'strategic_role_discussion',
    'executive_final'
  ];

  const assignments: Record<NonTechnicalRoundType, RoundCIAssignment> = {} as any;

  // Initialize assignments
  rounds.forEach(round => {
    assignments[round] = {
      roundType: round,
      primary: [],
      secondary: [],
      avoid: []
    };
  });

  // For each CI fact, assign based on binary decision
  categorizations.forEach(cat => {
    rounds.forEach(round => {
      const assignment = cat.assignments[round];
      if (assignment === 'primary') {
        assignments[round].primary.push(cat.ci_fact);
      } else if (assignment === 'secondary') {
        assignments[round].secondary.push(cat.ci_fact);
      } else {
        assignments[round].avoid.push(cat.ci_fact);
      }
    });
  });

  return assignments;
}

/**
 * Variation C: Convert round-first selections directly
 */
export function roundFirstToRoundAssignments(
  roundAssignments: z.infer<typeof RoundFirstBatchSchema>['round_assignments']
): Record<NonTechnicalRoundType, RoundCIAssignment> {
  const assignments: Record<NonTechnicalRoundType, RoundCIAssignment> = {} as any;

  roundAssignments.forEach(round => {
    assignments[round.round_type] = {
      roundType: round.round_type,
      primary: round.selected_ci_facts.map(f => f.fact),
      secondary: [], // Round-first doesn't use secondary
      avoid: round.avoided_facts.map(f => f.fact)
    };
  });

  return assignments;
}

// ════════════════════════════════════════════════════════════════════════════
// VARIATION D: SCORE-BASED V2 - WITH CALIBRATION EXAMPLES (Addresses H1 + H2)
// ════════════════════════════════════════════════════════════════════════════

export function buildScoreBasedV2Prompt(input: CICategorizationInput): string {
  return `You are an expert interview strategist categorizing competitive intelligence (CI) facts for a 5-round interview process.

**CONTEXT:**
- Company: ${input.companyName}
- Role: ${input.jobTitle}
- Industry: ${input.industryContext}

**CI FACTS TO CATEGORIZE:**
${input.ciFacts.map((fact, i) => `${i + 1}. ${fact}`).join('\n')}

**YOUR TASK:**
For EACH CI fact above, assign a relevance score (0-10) for each of the 5 interview rounds.

**ROUND DEFINITIONS:**

1. **Recruiter Screen** (0-10 score)
   - Focus: Hiring initiatives, office locations, team growth, process/timeline, high-level company updates
   - Who asks: Recruiter, Talent Partner, HR Coordinator (LIMITED strategic knowledge)
   - Can discuss: "We're hiring 50 people", "New office in Austin", "Funded in Q4"
   - Cannot discuss: Strategic rationale, competitive positioning, technical architecture

2. **Behavioral Deep Dive** (0-10 score)
   - Focus: Team collaboration, day-to-day tools/processes, workflow changes, execution challenges
   - Who asks: Hiring Manager, Team Lead (knows team operations intimately)
   - Can discuss: "How Epic EHR changed daily workflows", "How we collaborate with Azure team"
   - Cannot discuss: High-level strategy, pure cultural values, logistics

3. **Culture/Values Alignment** (0-10 score)
   - Focus: Values-driven initiatives (DEI, sustainability), mission alignment, work culture policies
   - Who asks: Peer, Team Member, Culture Champion (authentic cultural perspective)
   - Can discuss: "50% of promotions went to URMs", "Unlimited PTO policy", "Magnet recognition"
   - Cannot discuss: Business strategy, technical processes, tactical decisions

4. **Strategic Role Discussion** (0-10 score)
   - Focus: Market positioning, competitive strategy, revenue/growth, partnerships, industry trends
   - Who asks: Director, VP, Skip-Level Manager (strategic business perspective)
   - Can discuss: "Azure partnership enables Fortune 500 access", "$3.2B in M&A fees - #1 globally"
   - Cannot discuss: Micro-level tactics, basic logistics, vision-only statements

5. **Executive Final** (0-10 score)
   - Focus: Long-term vision (3-5 years), industry evolution, transformational bets, leadership philosophy
   - Who asks: C-Level, Founder, Executive Team (company-wide strategic view)
   - Can discuss: "Where do you see AI regulation in 5 years?", "Vision for API-first future"
   - Cannot discuss: Tactical operations, recent initiatives already in media

**CRITICAL SCORING RULES:**

1. **DIFFERENTIATION IS MANDATORY**: Each fact should score 9-10 for ONLY 1-2 rounds max.
   - If you find yourself giving 8+ to 3+ rounds, you're being too generous. Lower the less-relevant scores.
   - Example: If strategic gets 10, executive might get 7-8 (secondary), but recruiter should get 2-3 (avoid).

2. **SCORING SCALE (be strict):**
   - **10**: PERFECT fit - this is the absolute best round for this fact
   - **9**: EXCELLENT fit - this fact would naturally come up in this round
   - **7-8**: GOOD fit - relevant and could be used, but not ideal (becomes secondary)
   - **5-6**: MODERATE fit - tangentially relevant, could be forced in but awkward
   - **2-4**: POOR fit - not appropriate for this round type
   - **0-1**: AVOID - this fact is reserved for other rounds

3. **WHO CAN ANSWER**: Consider interviewer expertise
   - Recruiters can't discuss technical architecture or competitive strategy
   - Peers can't discuss high-level business strategy or funding decisions
   - Executives won't discuss tactical operations or recent media-covered topics

**CALIBRATION EXAMPLES (study these carefully):**

**Example 1: Funding Fact**
CI Fact: "Series B funding ($415M) announced December 2023, now valued at $2B"

Scores:
- recruiter_screen: 5 (Can mention "we're well-funded and growing" but can't discuss strategy)
- behavioral_deep_dive: 2 (Not about team processes or collaboration)
- culture_values_alignment: 2 (Not about values or culture)
- strategic_role_discussion: 10 (Perfect for discussing market positioning and growth strategy enabled by capital)
- executive_final: 9 (Highly relevant for long-term vision enabled by funding)

Reasoning: "Funding is fundamentally strategic. Strategic round (10) enables questions about how $415M shapes go-to-market strategy. Executive (9) enables questions about 3-5 year vision. Recruiter (5) can only mention 'we're growing' without depth. Behavioral/culture (2) are irrelevant - not about team dynamics or values."

---

**Example 2: Culture/Values Fact**
CI Fact: "Diversity initiative: 50% of VP+ promotions in 2024 went to women and URMs"

Scores:
- recruiter_screen: 7 (Can discuss inclusive hiring process, but secondary to culture round)
- behavioral_deep_dive: 3 (Not about team workflows or collaboration)
- culture_values_alignment: 10 (Perfect for discussing DEI values in action)
- strategic_role_discussion: 2 (Tactical HR metric, not strategic positioning)
- executive_final: 2 (Tactical metric, not vision-level)

Reasoning: "DEI initiative reflects values. Culture round (10) is perfect for discussing how diversity values manifest. Recruiter (7) can discuss inclusive hiring practices. Behavioral (3) isn't about processes. Strategic/executive (2) - this is a tactical HR metric, not business strategy or vision."

---

**Example 3: Process/Tool Fact**
CI Fact: "SAP S/4HANA migration completed Q3 2024 - real-time inventory visibility across 200 plants"

Scores:
- recruiter_screen: 3 (Too technical for recruiter, not relevant to hiring)
- behavioral_deep_dive: 10 (Perfect for discussing how S/4HANA changed daily workflows)
- culture_values_alignment: 2 (Not about values or culture)
- strategic_role_discussion: 7 (Secondary: enables questions about operational efficiency gains)
- executive_final: 2 (Too tactical for C-level, system change not vision)

Reasoning: "System migration impacts daily work. Behavioral (10) enables questions about how SAP changed collaboration and processes. Strategic (7) could discuss efficiency competitive advantage. Recruiter (3) can't discuss technical systems. Culture/executive (2) - not relevant."

---

**Example 4: Hiring Initiative Fact**
CI Fact: "Hiring 50+ sales roles across EMEA to support enterprise expansion"

Scores:
- recruiter_screen: 10 (Perfect for discussing team structure, timeline, hiring process)
- behavioral_deep_dive: 6 (Could mention team growth structure, but not core focus)
- culture_values_alignment: 3 (Not about values unless tied to diversity, which it's not)
- strategic_role_discussion: 4 (Expansion mentioned, but hiring numbers are tactical for strategic round)
- executive_final: 2 (Too tactical for C-level)

Reasoning: "Hiring initiative is perfect for recruiter (10). Behavioral (6) could mention team growth. Strategic (4) - expansion strategy is relevant, but hiring numbers are too tactical. Culture/executive (2-3) - not relevant."

---

**Example 5: Strategic Partnership Fact**
CI Fact: "Partnership with Google Cloud on generative AI solutions for Fortune 500 clients"

Scores:
- recruiter_screen: 3 (Too strategic for recruiter)
- behavioral_deep_dive: 7 (Secondary: could discuss cross-firm collaboration processes)
- culture_values_alignment: 2 (Not about values or culture)
- strategic_role_discussion: 10 (Perfect for discussing competitive positioning and partnership strategy)
- executive_final: 5 (Relevant but tactical partnership, not transformational vision)

Reasoning: "Strategic partnership. Strategic round (10) enables questions about how Google partnership positions against competitors. Behavioral (7) could discuss cross-firm collaboration. Executive (5) - relevant but more tactical than visionary. Recruiter/culture (2-3) - not relevant."

---

**Example 6: Contrastive Pair - Strategic vs Executive**

CI Fact A: "Open-source models (Mistral 7B, Mixtral 8x7B) differentiate from closed competitors like OpenAI"
- strategic_role_discussion: 10 (Perfect competitive differentiation)
- executive_final: 6 (Relevant to strategy but not transformational vision)

CI Fact B: "Vision to become the leading European AI company by 2030, competing globally with US giants"
- strategic_role_discussion: 7 (Relevant but more visionary than tactical strategy)
- executive_final: 10 (Perfect for long-term vision discussion)

Key difference: Strategic round focuses on current competitive positioning and tactics. Executive round focuses on 3-5 year transformational vision.

**NOW APPLY THESE SCORING PRINCIPLES:**

Categorize ALL ${input.ciFacts.length} CI facts above. Be strict with scores. Ensure differentiation (only 1-2 rounds get 9-10 per fact).`;
}

// ════════════════════════════════════════════════════════════════════════════
// VARIATION E: SCORE-BASED V3 - STRICTER ALGORITHM (Addresses H4)
// ════════════════════════════════════════════════════════════════════════════

/**
 * V3: Stricter algorithm for converting scores to assignments
 * - Primary: score ≥9 (not 8)
 * - Secondary: score 6-8 (narrower band)
 * - Avoid: score ≤5
 */
export function scoresToRoundAssignmentsV3(
  categorizations: z.infer<typeof ScoreBasedBatchSchema>['categorizations']
): Record<NonTechnicalRoundType, RoundCIAssignment> {
  const rounds: NonTechnicalRoundType[] = [
    'recruiter_screen',
    'behavioral_deep_dive',
    'culture_values_alignment',
    'strategic_role_discussion',
    'executive_final'
  ];

  const assignments: Record<NonTechnicalRoundType, RoundCIAssignment> = {} as any;

  // Initialize assignments
  rounds.forEach(round => {
    assignments[round] = {
      roundType: round,
      primary: [],
      secondary: [],
      avoid: []
    };
  });

  // For each CI fact, assign based on scores with STRICTER thresholds
  categorizations.forEach(cat => {
    const scores = [
      { round: 'recruiter_screen' as const, score: cat.scores.recruiter_screen },
      { round: 'behavioral_deep_dive' as const, score: cat.scores.behavioral_deep_dive },
      { round: 'culture_values_alignment' as const, score: cat.scores.culture_values_alignment },
      { round: 'strategic_role_discussion' as const, score: cat.scores.strategic_role_discussion },
      { round: 'executive_final' as const, score: cat.scores.executive_final }
    ].sort((a, b) => b.score - a.score); // Sort by score descending

    // STRICTER: Only score 9+ becomes primary (was 8+)
    const topScore = scores[0].score;
    scores.forEach(({ round, score }) => {
      if (score >= 9) {
        // Primary: score 9-10 only
        assignments[round].primary.push(cat.ci_fact);
      } else if (score >= 6 && score <= 8) {
        // Secondary: score 6-8
        assignments[round].secondary.push(cat.ci_fact);
      } else {
        // Avoid: score 0-5
        assignments[round].avoid.push(cat.ci_fact);
      }
    });
  });

  return assignments;
}

/**
 * V4: Even stricter - only top 1-2 scores become primary (best differentiation)
 * - Primary: Top 1-2 scores (if ≥9), rest become secondary/avoid
 * - This enforces "each fact should be primary for 1-2 rounds ONLY"
 */
export function scoresToRoundAssignmentsV4(
  categorizations: z.infer<typeof ScoreBasedBatchSchema>['categorizations']
): Record<NonTechnicalRoundType, RoundCIAssignment> {
  const rounds: NonTechnicalRoundType[] = [
    'recruiter_screen',
    'behavioral_deep_dive',
    'culture_values_alignment',
    'strategic_role_discussion',
    'executive_final'
  ];

  const assignments: Record<NonTechnicalRoundType, RoundCIAssignment> = {} as any;

  // Initialize assignments
  rounds.forEach(round => {
    assignments[round] = {
      roundType: round,
      primary: [],
      secondary: [],
      avoid: []
    };
  });

  // For each CI fact, assign based on TOP scores only
  categorizations.forEach(cat => {
    const scores = [
      { round: 'recruiter_screen' as const, score: cat.scores.recruiter_screen },
      { round: 'behavioral_deep_dive' as const, score: cat.scores.behavioral_deep_dive },
      { round: 'culture_values_alignment' as const, score: cat.scores.culture_values_alignment },
      { round: 'strategic_role_discussion' as const, score: cat.scores.strategic_role_discussion },
      { round: 'executive_final' as const, score: cat.scores.executive_final }
    ].sort((a, b) => b.score - a.score); // Sort by score descending

    // V4 LOGIC: Only top 1-2 scores (if ≥9) become primary
    let primaryAssigned = 0;
    scores.forEach(({ round, score }, index) => {
      // Primary: Top 1-2 scores that are ≥9
      if (score >= 9 && primaryAssigned < 2) {
        assignments[round].primary.push(cat.ci_fact);
        primaryAssigned++;
      }
      // Secondary: Scores 6-8 OR scores ≥9 that didn't make top 2
      else if (score >= 6 && score <= 8) {
        assignments[round].secondary.push(cat.ci_fact);
      }
      // Avoid: Scores ≤5
      else if (score <= 5) {
        assignments[round].avoid.push(cat.ci_fact);
      }
      // Edge case: Score 9+ but already assigned 2 primaries → becomes secondary
      else if (score >= 9 && primaryAssigned >= 2) {
        assignments[round].secondary.push(cat.ci_fact);
      }
    });
  });

  return assignments;
}

// ════════════════════════════════════════════════════════════════════════════
// VARIATION F: SCORE-BASED V5 - FINAL OPTIMIZED (90%+ target)
// ════════════════════════════════════════════════════════════════════════════

export function buildScoreBasedV5Prompt(input: CICategorizationInput): string {
  return `You are an expert interview strategist categorizing competitive intelligence (CI) facts for a 5-round interview process.

**CONTEXT:**
- Company: ${input.companyName}
- Role: ${input.jobTitle}
- Industry: ${input.industryContext}

**CI FACTS TO CATEGORIZE:**
${input.ciFacts.map((fact, i) => `${i + 1}. ${fact}`).join('\n')}

**YOUR TASK:**
For EACH CI fact above, assign a relevance score (0-10) for each of the 5 interview rounds.

**ROUND DEFINITIONS:**

1. **Recruiter Screen** (0-10 score)
   - Focus: Hiring initiatives, office locations, team growth, process/timeline, high-level company updates
   - Who asks: Recruiter, Talent Partner, HR Coordinator (LIMITED strategic knowledge)
   - Can discuss: "We're hiring 50 people", "New office in Austin", "Funded in Q4"
   - Cannot discuss: Strategic rationale, competitive positioning, technical architecture

2. **Behavioral Deep Dive** (0-10 score)
   - Focus: Team collaboration, day-to-day tools/processes, workflow changes, execution challenges
   - Who asks: Hiring Manager, Team Lead (knows team operations intimately)
   - Can discuss: "How Epic EHR changed daily workflows", "How we collaborate with Azure team"
   - Cannot discuss: High-level strategy, pure cultural values, logistics

3. **Culture/Values Alignment** (0-10 score)
   - Focus: Values-driven initiatives (DEI, sustainability), mission alignment, work culture policies
   - Who asks: Peer, Team Member, Culture Champion (authentic cultural perspective)
   - Can discuss: "50% of promotions went to URMs", "Unlimited PTO policy", "Magnet recognition"
   - Cannot discuss: Business strategy, technical processes, tactical decisions

4. **Strategic Role Discussion** (0-10 score)
   - Focus: Market positioning, competitive strategy, revenue/growth, partnerships, industry trends
   - Who asks: Director, VP, Skip-Level Manager (strategic business perspective)
   - Can discuss: "Azure partnership enables Fortune 500 access", "$3.2B in M&A fees - #1 globally"
   - Cannot discuss: Micro-level tactics, basic logistics, vision-only statements

5. **Executive Final** (0-10 score)
   - Focus: Long-term vision (3-5 years), industry evolution, transformational bets, leadership philosophy
   - Who asks: C-Level, Founder, Executive Team (company-wide strategic view)
   - Can discuss: "Where do you see AI regulation in 5 years?", "Vision for API-first future"
   - Cannot discuss: Tactical operations, recent initiatives already in media

**CRITICAL SCORING RULES:**

1. **STRICT DIFFERENTIATION (MANDATORY)**: Each fact MUST score 9-10 for ONLY 1-2 rounds max, with all others scoring ≤7.
   - If you give a fact 9+ for strategic, it CANNOT also get 9+ for executive or recruiter.
   - Example: If strategic gets 10, executive gets max 7, recruiter gets max 5.

2. **PRECISE SCORING SCALE:**
   - **10**: Absolutely PERFECT fit - the #1 best round for this fact
   - **9**: EXCELLENT fit - clearly one of the top 2 rounds for this fact
   - **7-8**: GOOD fit - relevant and usable, but not primary (this becomes "secondary")
   - **5-6**: MODERATE fit - tangentially relevant, could mention in passing
   - **2-4**: POOR fit - not appropriate for this round, save for others
   - **0-1**: COMPLETELY IRRELEVANT - this round should avoid discussing this fact

3. **WHO CAN ANSWER (interviewer constraints):**
   - Recruiters: Can discuss hiring/logistics/growth BUT NOT strategy/tech/partnerships
   - Behavioral: Can discuss processes/tools BUT NOT high-level strategy or pure culture
   - Culture: Can discuss values/DEI/mission BUT NOT business strategy or technical tools
   - Strategic: Can discuss competitive positioning/partnerships BUT NOT vision-only or tactics
   - Executive: Can discuss 3-5 year vision/philosophy BUT NOT recent tactical initiatives

4. **SECONDARY vs AVOID distinction:**
   - **7-8 (Secondary)**: "This round COULD use this fact if relevant to conversation flow"
   - **0-6 (Avoid)**: "This round should NOT use this fact - it's better for other rounds"
   - Be conservative: If you're not sure if it's 7 or 6, lean toward 6 (avoid).

**CALIBRATION EXAMPLES (study these carefully):**

**Example 1: Funding Fact**
CI Fact: "Series B funding ($415M) announced December 2023, now valued at $2B"

Scores:
- recruiter_screen: 5 (Can mention "we're well-funded" but can't discuss strategy)
- behavioral_deep_dive: 2 (Not about team processes)
- culture_values_alignment: 1 (Not about values - purely financial)
- strategic_role_discussion: 10 (Perfect for market positioning and growth strategy)
- executive_final: 9 (Enables 3-5 year vision questions)

Reasoning: "Funding is fundamentally strategic. Strategic (10) enables questions about how $415M shapes go-to-market. Executive (9) enables vision questions. Recruiter (5) can only mention growth superficially. Behavioral/culture (1-2) are irrelevant."

---

**Example 2: Culture/Values Fact**
CI Fact: "Diversity initiative: 50% of VP+ promotions in 2024 went to women and URMs"

Scores:
- recruiter_screen: 7 (Can discuss inclusive hiring, but secondary to culture round)
- behavioral_deep_dive: 2 (Not about team workflows)
- culture_values_alignment: 10 (Perfect for discussing DEI values in action)
- strategic_role_discussion: 1 (Tactical HR metric, not market positioning)
- executive_final: 1 (Tactical, not transformational vision)

Reasoning: "DEI initiative reflects values. Culture (10) is perfect. Recruiter (7 - secondary) can discuss hiring practices. Behavioral (2) isn't about processes. Strategic/executive (1) - this is HR, not business strategy or vision."

---

**Example 3: Process/Tool Fact**
CI Fact: "SAP S/4HANA migration completed Q3 2024 - real-time inventory visibility across 200 plants"

Scores:
- recruiter_screen: 2 (Too technical for recruiter)
- behavioral_deep_dive: 10 (Perfect for how S/4HANA changed daily work)
- culture_values_alignment: 1 (Not about values)
- strategic_role_discussion: 7 (Secondary: operational efficiency competitive advantage)
- executive_final: 1 (Too tactical for C-level)

Reasoning: "System migration impacts daily work. Behavioral (10) perfect for workflow changes. Strategic (7 - secondary) could discuss efficiency gains. Recruiter/culture/executive (1-2) - not relevant."

---

**Example 4: Hiring Initiative Fact**
CI Fact: "Hiring 50+ sales roles across EMEA to support enterprise expansion"

Scores:
- recruiter_screen: 10 (Perfect for team structure, timeline, hiring process)
- behavioral_deep_dive: 6 (Could mention team growth, but not core focus)
- culture_values_alignment: 2 (Not about values)
- strategic_role_discussion: 3 (Hiring numbers too tactical for strategic discussion)
- executive_final: 1 (Too tactical for C-level)

Reasoning: "Hiring initiative perfect for recruiter (10). Behavioral (6) could mention growth structure but it's not about processes. Strategic (3) - expansion mentioned but hiring numbers are tactical. Culture/executive (1-2) - not relevant."

---

**Example 5: Strategic Partnership Fact**
CI Fact: "Partnership with Google Cloud on generative AI solutions for Fortune 500 clients"

Scores:
- recruiter_screen: 2 (Too strategic for recruiter)
- behavioral_deep_dive: 7 (Secondary: cross-firm collaboration processes)
- culture_values_alignment: 1 (Not about values)
- strategic_role_discussion: 10 (Perfect competitive positioning and partnership strategy)
- executive_final: 5 (Relevant but tactical partnership, not transformational vision)

Reasoning: "Strategic partnership. Strategic (10) perfect for competitive positioning. Behavioral (7 - secondary) could discuss collaboration. Executive (5) - relevant but more tactical than visionary. Recruiter/culture (1-2) - not relevant."

---

**Example 6: Work Culture Policy Fact**
CI Fact: "Work-from-home flexibility: 2 days/week remote for VP+ since 2024"

Scores:
- recruiter_screen: 7 (Can discuss logistics/benefits, secondary to culture)
- behavioral_deep_dive: 7 (Secondary: how remote work affects collaboration)
- culture_values_alignment: 10 (Perfect for work culture and flexibility values)
- strategic_role_discussion: 2 (Not strategic positioning)
- executive_final: 1 (Too tactical for C-level)

Reasoning: "Work culture policy. Culture (10) perfect. Recruiter (7) can discuss benefits. Behavioral (7) can discuss remote collaboration. Strategic/executive (1-2) - not strategic or visionary."

---

**Example 7: Contrastive Pair - Secondary (7-8) vs Avoid (0-6)**

CI Fact: "Partnership with Tesla for battery management systems in 2025+ vehicle lineup"

For **Behavioral Deep Dive**:
- Score 7 (Secondary): "COULD discuss cross-team collaboration with Tesla engineers" ✅
- NOT Score 3 (Avoid): This partnership DOES enable behavioral questions about collaboration ❌

For **Recruiter Screen**:
- Score 3 (Avoid): "Too strategic for recruiter - they can't discuss partnerships" ✅
- NOT Score 7 (Secondary): Recruiter has NO knowledge of partnership strategy ❌

**KEY INSIGHT**: Secondary (7-8) means "This round CAN use this fact in conversation." Avoid (0-6) means "This round should NOT use this fact - save for others."

---

**NOW APPLY THESE SCORING PRINCIPLES:**

Be VERY strict with differentiation: Only 1-2 rounds get 9-10 per fact. Be precise with secondary (7-8) vs avoid (0-6) - use interviewer constraints to guide you.

Categorize ALL ${input.ciFacts.length} CI facts above following this exact format.`;
}

// ════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ════════════════════════════════════════════════════════════════════════════

export const CI_CATEGORIZATION_VARIATIONS = {
  score_based: {
    name: 'Score-Based Assignment (0-10)',
    schema: ScoreBasedBatchSchema,
    buildPrompt: buildScoreBasedPrompt,
    convertToAssignments: scorestoToRoundAssignments
  },
  binary_relevance: {
    name: 'Binary Relevance (Primary/Secondary/Avoid)',
    schema: BinaryRelevanceBatchSchema,
    buildPrompt: buildBinaryRelevancePrompt,
    convertToAssignments: binaryToRoundAssignments
  },
  round_first: {
    name: 'Round-First Assignment (Pick 2-3 per round)',
    schema: RoundFirstBatchSchema,
    buildPrompt: buildRoundFirstPrompt,
    convertToAssignments: roundFirstToRoundAssignments
  },
  score_based_v2: {
    name: 'Score-Based V2 (Calibration Examples + Strict Differentiation)',
    schema: ScoreBasedBatchSchema,
    buildPrompt: buildScoreBasedV2Prompt,
    convertToAssignments: scorestoToRoundAssignments
  },
  score_based_v3: {
    name: 'Score-Based V3 (V2 Prompt + Stricter Algorithm)',
    schema: ScoreBasedBatchSchema,
    buildPrompt: buildScoreBasedV2Prompt,
    convertToAssignments: scoresToRoundAssignmentsV3
  },
  score_based_v4: {
    name: 'Score-Based V4 (V2 Prompt + Top-2-Only Algorithm)',
    schema: ScoreBasedBatchSchema,
    buildPrompt: buildScoreBasedV2Prompt,
    convertToAssignments: scoresToRoundAssignmentsV4
  },
  score_based_v5: {
    name: 'Score-Based V5 (Final Optimized - 90%+ Target)',
    schema: ScoreBasedBatchSchema,
    buildPrompt: buildScoreBasedV5Prompt,
    convertToAssignments: scoresToRoundAssignmentsV4
  }
};

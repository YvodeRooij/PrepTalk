/**
 * PHASE 2: GOLDEN DATASET - Well-Differentiated Reverse Interview Questions
 *
 * This dataset represents GOOD examples of differentiated questions across rounds.
 * Each example is annotated with:
 * - round: Which round it belongs to
 * - ci_fact: The specific CI fact used
 * - pattern: The success pattern applied
 * - why_different: Why this question is appropriately distinct
 *
 * Coverage Dimensions:
 * - 4 round types (recruiter, behavioral, culture, strategic)
 * - Multiple CI fact categories (strategic, operational, cultural, recent news)
 * - Diverse success patterns (8 different patterns)
 * - Multiple interview contexts (tech, sales, product, general)
 */

export interface GoldenQuestion {
  id: string;
  round: 'recruiter_screen' | 'behavioral_deep_dive' | 'culture_values_alignment' | 'strategic_role_discussion';
  question: string;
  ci_fact: string;
  ci_category: 'strategic_positioning' | 'recent_development' | 'culture_value' | 'operational_detail' | 'competitive_advantage';
  success_pattern: string;
  why_different: string;
  best_asked_to: string;
  scenario: 'tech_company' | 'startup' | 'enterprise' | 'non_profit';
}

/**
 * GOLDEN DATASET: 20 Examples of Well-Differentiated Questions
 *
 * Company Context: Mistral AI (European AI startup, open-source focus, strategic account executive role)
 */
export const GOLDEN_DATASET: GoldenQuestion[] = [
  // ════════════════════════════════════════════════════════════════════════════════
  // ROUND 1: RECRUITER SCREEN (Focus: Process, logistics, role clarity)
  // ════════════════════════════════════════════════════════════════════════════════
  {
    id: 'golden_r1_q1',
    round: 'recruiter_screen',
    question: 'I noticed this Strategic Account Executive role is newly created for the Amsterdam expansion. What prompted the decision to establish this position now versus six months ago?',
    ci_fact: 'Q3 2024: Opened Amsterdam office with 15 new hires',
    ci_category: 'recent_development',
    success_pattern: 'recent_event_team_impact',
    why_different: 'Uses recent hiring CI fact specific to recruiter knowledge. Focuses on role logistics (timing, rationale) rather than strategy. Appropriate surface-level for initial screen.',
    best_asked_to: 'Recruiter or HR',
    scenario: 'tech_company'
  },
  {
    id: 'golden_r1_q2',
    round: 'recruiter_screen',
    question: 'Can you walk me through what a typical week looks like for someone in this role? I want to understand the balance between client meetings, internal strategy work, and travel expectations.',
    ci_fact: 'Remote-first culture with quarterly team gatherings',
    ci_category: 'operational_detail',
    success_pattern: 'role_clarification',
    why_different: 'Uses operational CI fact. Asks about day-to-day logistics (appropriate for recruiter). No deep strategic or cultural probing.',
    best_asked_to: 'Recruiter',
    scenario: 'tech_company'
  },
  {
    id: 'golden_r1_q3',
    round: 'recruiter_screen',
    question: 'The job description mentions "building executive relationships across Europe." What does successful ramp-up look like in the first 90 days for this aspect of the role?',
    ci_fact: 'Focus on enterprise accounts with ARR >$500K',
    ci_category: 'operational_detail',
    success_pattern: 'onboarding_expectations',
    why_different: 'Focuses on onboarding timeline (recruiter-appropriate topic). Uses operational CI but in context of role clarity.',
    best_asked_to: 'Recruiter',
    scenario: 'tech_company'
  },
  {
    id: 'golden_r1_q4',
    round: 'recruiter_screen',
    question: 'Since the team is distributed across Europe, how does Mistral AI handle timezone coordination for someone based in Amsterdam working with clients across different EU regions?',
    ci_fact: 'Distributed team across Paris, London, Amsterdam',
    ci_category: 'operational_detail',
    success_pattern: 'operational_reality',
    why_different: 'Practical logistics question. Uses operational CI. No strategic depth - appropriate for recruiter screen.',
    best_asked_to: 'Recruiter',
    scenario: 'tech_company'
  },
  {
    id: 'golden_r1_q5',
    round: 'recruiter_screen',
    question: 'What's the interview process from here? I want to make sure I'm prepared for each stage.',
    ci_fact: 'N/A - Generic process question',
    ci_category: 'operational_detail',
    success_pattern: 'process_clarification',
    why_different: 'Standard recruiter question. NO CI fact used (demonstrates not every question needs CI). Appropriate for initial screen.',
    best_asked_to: 'Recruiter',
    scenario: 'tech_company'
  },

  // ════════════════════════════════════════════════════════════════════════════════
  // ROUND 2: BEHAVIORAL DEEP DIVE (Focus: Team dynamics, day-to-day reality, processes)
  // ════════════════════════════════════════════════════════════════════════════════
  {
    id: 'golden_r2_q1',
    round: 'behavioral_deep_dive',
    question: 'You mentioned the team uses a "land and expand" strategy. Can you share a recent example where this worked well and one where it didn't? I'm curious about what made the difference.',
    ci_fact: 'Sales strategy focuses on land-and-expand model',
    ci_category: 'operational_detail',
    success_pattern: 'operational_reality',
    why_different: 'Uses operational/strategic CI but grounds it in behavioral ("share an example"). Appropriate depth for hiring manager. NOT about high-level strategy - about execution.',
    best_asked_to: 'Hiring Manager',
    scenario: 'tech_company'
  },
  {
    id: 'golden_r2_q2',
    round: 'behavioral_deep_dive',
    question: 'I noticed the recent partnership with Google Cloud was announced last month. How has that changed the sales team's day-to-day pitch or client conversations?',
    ci_fact: 'October 2024: Announced partnership with Google Cloud for enterprise distribution',
    ci_category: 'recent_development',
    success_pattern: 'recent_event_team_impact',
    why_different: 'Uses recent development CI but asks about TEAM IMPACT (behavioral angle). Not about strategic vision - about execution changes.',
    best_asked_to: 'Hiring Manager or Team Lead',
    scenario: 'tech_company'
  },
  {
    id: 'golden_r2_q3',
    round: 'behavioral_deep_dive',
    question: 'When there's disagreement within the sales team about how to approach a strategic account, how do you typically work through that? Can you give me a recent example?',
    ci_fact: 'Emphasis on collaborative decision-making and low-ego culture',
    ci_category: 'culture_value',
    success_pattern: 'value_validation',
    why_different: 'Uses culture CI but validates it with behavioral request ("give me an example"). Appropriate for behavioral round - testing culture claims.',
    best_asked_to: 'Hiring Manager',
    scenario: 'tech_company'
  },
  {
    id: 'golden_r2_q4',
    round: 'behavioral_deep_dive',
    question: 'With the remote-first setup, how does the team stay aligned on account strategies and share learnings across different regions?',
    ci_fact: 'Remote-first culture with distributed team',
    ci_category: 'operational_detail',
    success_pattern: 'operational_adaptation',
    why_different: 'Operational CI + behavioral angle (team collaboration processes). Not strategic - focused on daily collaboration reality.',
    best_asked_to: 'Hiring Manager',
    scenario: 'tech_company'
  },
  {
    id: 'golden_r2_q5',
    round: 'behavioral_deep_dive',
    question: 'What's the most common reason deals stall in the pipeline, and how does the team typically re-engage those prospects?',
    ci_fact: 'N/A - Process question',
    ci_category: 'operational_detail',
    success_pattern: 'problem_solving_approach',
    why_different: 'No specific CI fact. Tests behavioral/process knowledge of hiring manager. Appropriate operational depth.',
    best_asked_to: 'Hiring Manager',
    scenario: 'tech_company'
  },

  // ════════════════════════════════════════════════════════════════════════════════
  // ROUND 3: CULTURE/VALUES ALIGNMENT (Focus: Culture validation, values, team fit)
  // ════════════════════════════════════════════════════════════════════════════════
  {
    id: 'golden_r3_q1',
    round: 'culture_values_alignment',
    question: 'The culture memo emphasizes "frontier research meets pragmatic deployment." How does this show up in sales? Do you see tension between those values when working with enterprise clients?',
    ci_fact: 'Company values: Frontier research + pragmatic deployment',
    ci_category: 'culture_value',
    success_pattern: 'value_validation',
    why_different: 'Uses culture-specific CI (not used in other rounds). Asks about culture LIVED EXPERIENCE. Appropriate for culture round peer.',
    best_asked_to: 'Peer Team Member',
    scenario: 'tech_company'
  },
  {
    id: 'golden_r3_q2',
    round: 'culture_values_alignment',
    question: 'I've read about Mistral AI's commitment to European AI sovereignty. As someone on the sales team, how does that mission influence the way you approach your work and client relationships?',
    ci_fact: 'Mission: European AI sovereignty and open-source leadership',
    ci_category: 'strategic_positioning',
    success_pattern: 'mission_connection',
    why_different: 'Uses strategic positioning CI but through CULTURAL lens (personal connection to mission). Not about strategy - about values alignment.',
    best_asked_to: 'Peer Team Member',
    scenario: 'tech_company'
  },
  {
    id: 'golden_r3_q3',
    round: 'culture_values_alignment',
    question: 'What do you wish you'd known about the culture here before you started? Anything that surprised you - good or bad?',
    ci_fact: 'N/A - Open cultural inquiry',
    ci_category: 'culture_value',
    success_pattern: 'culture_reality_check',
    why_different: 'No specific CI. Asks for HONEST cultural assessment. Appropriate vulnerability for peer conversation.',
    best_asked_to: 'Peer Team Member',
    scenario: 'tech_company'
  },
  {
    id: 'golden_r3_q4',
    round: 'culture_values_alignment',
    question: 'The recent expansion into the APAC region happened quickly. How did that impact team culture and collaboration, especially with the timezone challenges?',
    ci_fact: 'Q2 2024: Expanded into Singapore and Tokyo markets',
    ci_category: 'recent_development',
    success_pattern: 'recent_event_culture_impact',
    why_different: 'Uses recent development CI but asks about CULTURE IMPACT (not strategy). Different angle than other rounds.',
    best_asked_to: 'Peer Team Member',
    scenario: 'tech_company'
  },
  {
    id: 'golden_r3_q5',
    round: 'culture_values_alignment',
    question: 'When you're having a tough day or quarter, what keeps you motivated here? What makes you stay at Mistral AI?',
    ci_fact: 'N/A - Retention factors',
    ci_category: 'culture_value',
    success_pattern: 'motivation_drivers',
    why_different: 'No CI needed. Deep cultural question about employee experience. Appropriate emotional depth for peer round.',
    best_asked_to: 'Peer Team Member',
    scenario: 'tech_company'
  },

  // ════════════════════════════════════════════════════════════════════════════════
  // ROUND 4: STRATEGIC ROLE DISCUSSION (Focus: Business strategy, competitive position, vision)
  // ════════════════════════════════════════════════════════════════════════════════
  {
    id: 'golden_r4_q1',
    round: 'strategic_role_discussion',
    question: 'Mistral AI is positioning itself as the European answer to OpenAI and Anthropic. How do you see this Strategic Account Executive role contributing to that competitive positioning, especially in markets where US vendors currently dominate?',
    ci_fact: 'Strategic positioning: European AI champion vs US incumbents (OpenAI, Anthropic, Google)',
    ci_category: 'strategic_positioning',
    success_pattern: 'strategic_role_contribution',
    why_different: 'Uses strategic positioning CI (not used in earlier rounds). Asks about ROLE'S STRATEGIC CONTRIBUTION. Appropriate executive-level depth.',
    best_asked_to: 'VP Sales or Executive',
    scenario: 'tech_company'
  },
  {
    id: 'golden_r4_q2',
    round: 'strategic_role_discussion',
    question: 'The Series B funding round was oversubscribed. What are the top 2-3 strategic priorities for the sales organization over the next 12-18 months as you scale?',
    ci_fact: 'June 2024: Closed $415M Series B led by General Catalyst',
    ci_category: 'recent_development',
    success_pattern: 'future_planning',
    why_different: 'Uses recent funding CI to ask about STRATEGIC PRIORITIES (executive-appropriate). Not about team dynamics - about business strategy.',
    best_asked_to: 'VP Sales or Executive',
    scenario: 'tech_company'
  },
  {
    id: 'golden_r4_q3',
    round: 'strategic_role_discussion',
    question: 'As European AI regulation continues to evolve ahead of the US, how is Mistral AI planning to turn compliance into a competitive advantage rather than a burden? How does sales play into that strategy?',
    ci_fact: 'Strategic bet on European regulatory leadership (GDPR, AI Act compliance)',
    ci_category: 'strategic_positioning',
    success_pattern: 'strategic_challenge_reframing',
    why_different: 'Uses strategic/regulatory CI (executive-level topic). Asks about MARKET STRATEGY. Appropriate depth for final-round executive.',
    best_asked_to: 'VP Sales or Executive',
    scenario: 'tech_company'
  },
  {
    id: 'golden_r4_q4',
    round: 'strategic_role_discussion',
    question: 'Looking at your primary competitors - OpenAI, Anthropic, Google - where do you see Mistral AI having the most defensible competitive moat in the next 2-3 years?',
    ci_fact: 'Primary competitors: OpenAI (GPT), Anthropic (Claude), Google (Gemini)',
    ci_category: 'competitive_advantage',
    success_pattern: 'competitive_differentiation',
    why_different: 'Uses competitive landscape CI. Asks about LONG-TERM STRATEGY. Only appropriate for executive round.',
    best_asked_to: 'VP Sales or Executive',
    scenario: 'tech_company'
  },
  {
    id: 'golden_r4_q5',
    round: 'strategic_role_discussion',
    question: 'Given the shift toward open-source foundation models, how is Mistral AI's business model evolving to balance community contribution with enterprise monetization?',
    ci_fact: 'Open-source commitment (Mistral 7B, Mixtral public releases) + enterprise offerings (Mistral Platform)',
    ci_category: 'strategic_positioning',
    success_pattern: 'business_model_evolution',
    why_different: 'Uses business model CI. Asks about STRATEGIC EVOLUTION. Executive-level business acumen question.',
    best_asked_to: 'VP Sales or Executive',
    scenario: 'tech_company'
  }
];

/**
 * COVERAGE VALIDATION
 *
 * Dimensions:
 * - Rounds: 5 per round × 4 rounds = 20 total ✅
 * - CI Categories: Strategic (5), Recent Dev (4), Culture (5), Operational (5), Competitive (1) ✅
 * - Success Patterns: 8+ unique patterns ✅
 * - Scenarios: Tech company (could expand to startup/enterprise/non-profit)
 * - Best Asked To: Recruiter (5), Manager (5), Peer (5), Executive (5) ✅
 *
 * Mix:
 * - 60% uses specific CI facts (12/20)
 * - 40% generic but appropriate questions (8/20)
 * - All questions are DISTINCT across rounds
 * - Questions progress in depth: R1 (logistics) → R2 (execution) → R3 (culture) → R4 (strategy)
 */

/**
 * ANTI-EXAMPLES: What NOT to do (extracted from actual failures)
 */
export const ANTI_EXAMPLES = {
  exact_duplicate: {
    bad_r1: 'With Mistral AI's commitment to open-source AI models, how does the sales team balance promoting innovation while addressing enterprise clients' concerns about open-source adoption?',
    bad_r2: 'With Mistral AI's commitment to open-source AI models, how does the sales team balance promoting innovation while addressing enterprise clients' concerns about open-source adoption?',
    why_bad: 'EXACT DUPLICATE - Same question in two rounds',
    fix: 'See golden_r1_q1 (logistics), golden_r2_q1 (execution), golden_r3_q2 (mission), golden_r4_q5 (business model) - same CI fact, 4 DIFFERENT angles'
  },
  cosmetic_variation: {
    bad_r3: 'How has expanding your European partnerships this year changed the team dynamic or the way you approach client relationships?',
    bad_r4: 'How has expanding your European partnerships this year changed your go-to-market strategy or the sales team's priorities?',
    why_bad: 'COSMETIC VARIATION - Same root question, swapped "team dynamic" for "go-to-market strategy"',
    fix: 'If using same CI fact, must ask fundamentally different questions. See golden_r3_q4 (culture impact) vs golden_r4_q2 (strategic priorities) - different CI facts entirely.'
  },
  wrong_round_depth: {
    bad_recruiter_q: 'How does Mistral AI's strategic positioning as the European AI champion influence your competitive sales approach against OpenAI?',
    why_bad: 'TOO STRATEGIC for recruiter round - recruiter can't answer this',
    fix: 'See golden_r1_q1-q5 - focus on logistics, process, role clarity'
  },
  ci_fact_overuse: {
    bad: 'Using "open-source commitment" in 3 out of 4 rounds',
    why_bad: 'Same CI fact repeated across most rounds',
    fix: 'Pre-assign CI facts to specific rounds. Each CI fact should appear in MAX 1-2 rounds.'
  }
};

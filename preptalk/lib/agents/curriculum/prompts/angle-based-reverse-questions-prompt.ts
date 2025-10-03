/**
 * ANGLE-BASED Reverse Question Generation
 *
 * Solution to duplicate questions problem:
 * Instead of assigning WHICH round gets WHICH CI fact,
 * we allow ALL rounds to use ALL facts, but each round MUST approach them from a DIFFERENT ANGLE
 *
 * This prevents duplication while maintaining natural question quality
 */

import type { CompetitiveIntelligence } from '../types';

interface AngleBasedPromptContext {
  competitiveIntelligence: CompetitiveIntelligence;
  jobTitle: string;
  companyName: string;
  roundType: string;
  bestAskedTo: string;
  experienceLevel: string;
}

/**
 * Angle definitions for each round type
 */
const ROUND_ANGLES = {
  recruiter_screen: {
    angle: 'Company Selling Points & Role Clarity',
    description: 'Why this company? What makes it attractive? What will I actually do? Role scope and team structure.',
    forbidden_angles: ['career growth opportunities', 'team collaboration processes', 'competitive tactics', 'long-term vision'],
    examples: [
      'What makes Johns Hopkins stand out given [CI fact like US News ranking]?',
      'How does [CI fact] shape what this role entails day-to-day?',
      'Given [CI fact], what does the team structure look like for this role?'
    ]
  },
  behavioral_deep_dive: {
    angle: 'Team Process & Collaboration',
    description: 'How teams work together, day-to-day workflows, cross-functional dynamics',
    forbidden_angles: ['personal career growth', 'industry vision', 'company values'],
    examples: [
      'How has [CI fact] changed how the team collaborates?',
      'What\'s the hardest part of coordinating around [CI fact]?',
      'Walk me through how the team manages [challenge from CI fact]'
    ]
  },
  culture_values_alignment: {
    angle: 'Values Manifestation & Work Culture',
    description: 'How company values show up in real decisions, culture in action',
    forbidden_angles: ['competitive positioning', 'tactical processes', 'market trends'],
    examples: [
      'How does [CI fact] reflect the company\'s values around [value]?',
      'Can you give a concrete example of how [CI fact] shows the culture in action?',
      'Does [CI fact] change how the team thinks about [cultural aspect]?'
    ]
  },
  strategic_role_discussion: {
    angle: 'Competitive Positioning & Tactical Execution',
    description: 'How the company competes, market differentiation, go-to-market strategy',
    forbidden_angles: ['personal growth', 'cultural values', 'long-term industry vision'],
    examples: [
      'How does [CI fact] position us against [competitor]?',
      'How would you leverage [CI fact] in [specific tactical scenario]?',
      'What competitive advantage does [CI fact] create?'
    ]
  },
  executive_final: {
    angle: 'Industry Vision & Long-term Strategy',
    description: '3-5 year outlook, market evolution, strategic bets',
    forbidden_angles: ['day-to-day processes', 'personal career path', 'tactical execution'],
    examples: [
      'Given [CI fact], how do you see the industry evolving?',
      'What strategic bets is [company] making based on [CI fact]?',
      'In 3-5 years, how might [CI fact] reshape the market?'
    ]
  }
} as const;

/**
 * Generate angle-based reverse questions
 */
export function buildAngleBasedReverseQuestionPrompt(context: AngleBasedPromptContext): string {
  const {
    competitiveIntelligence: ci,
    jobTitle,
    companyName,
    roundType,
    bestAskedTo,
    experienceLevel
  } = context;

  const angle = ROUND_ANGLES[roundType as keyof typeof ROUND_ANGLES] || ROUND_ANGLES.recruiter_screen;

  return `Generate 3-5 smart reverse interview questions for a ${roundType} round.

You're generating questions for a ${experienceLevel} ${jobTitle} candidate interviewing at ${companyName}.
These questions will be asked to: ${bestAskedTo}

# COMPETITIVE INTELLIGENCE (All Rounds See The Same Facts)

## Strategic Advantages:
${ci.strategicAdvantages?.map((adv, i) => `${i + 1}. ${adv}`).join('\n') || 'None provided'}

## Recent Developments:
${ci.recentDevelopments?.map((dev, i) => `${i + 1}. ${dev}`).join('\n') || 'None provided'}

## Competitive Positioning:
${ci.competitivePositioning || 'Not specified'}

## Primary Competitors:
${ci.primaryCompetitors?.join(', ') || 'Not specified'}

---

# CRITICAL: ANGLE-BASED DIFFERENTIATION

**All rounds have access to ALL CI facts above.**

**Your job is NOT to select DIFFERENT facts than other rounds.**

**Your job IS to approach the SAME facts from THIS round's UNIQUE ANGLE.**

---

# THIS ROUND'S REQUIRED ANGLE

**Angle:** ${angle.angle}
**Description:** ${angle.description}

**FORBIDDEN Angles (other rounds use these):**
${angle.forbidden_angles.map(a => `- ❌ ${a}`).join('\n')}

**Example Questions Following This Angle:**
${angle.examples.map(ex => `- ✅ ${ex}`).join('\n')}

---

# HOW ANGLE-BASED PREVENTS DUPLICATION

## ❌ WRONG (Round-Based Assignment):

Recruiter gets: "Hiring 50+ sales roles"
→ "How does the hiring expansion create opportunities?"

Strategic gets: "Series B funding, Azure partnership, GDPR advantage, Platform launch, Developer community, Efficiency focus"
→ 6 different questions all with "How does [fact] help you sell?"

**Result:** Strategic generates similar questions across 6 facts = HIGH DUPLICATION

---

## ✅ RIGHT (Angle-Based):

ALL rounds get: "Series B funding ($415M)"

Recruiter (Career Impact angle):
→ "With the Series B funding, what new roles or growth paths are opening up for someone joining now?"

Strategic (Competitive Positioning angle):
→ "How would you leverage our $2B valuation when selling against OpenAI's $29B?"

Executive (Industry Vision angle):
→ "Given the current AI funding climate, how do you see the market consolidating over the next 3-5 years?"

**Result:** Same fact, 3 different angles, ZERO duplication

---

# QUALITY CRITERIA

## ✅ PASS Criteria:

1. **Follows THIS round's angle** (${angle.angle})
2. **Avoids forbidden angles** (${angle.forbidden_angles.join(', ')})
3. **Natural, conversational language** (read aloud test)
4. **Specific CI reference** (not generic)
5. **Team/process focus** (not interviewer's personal experience)
6. **Actionable insights** (answer would be useful)

## ❌ FAIL Criteria:

1. **Uses forbidden angle** - Question sounds like it belongs in a different round
2. **Generic** - Could apply to any company
3. **Awkward phrasing** - Sounds rehearsed or jargony
4. **Personal questions** - "What was the biggest challenge YOU faced?"
5. **Duplicate angle** - Sounds similar to example from another round
6. **Wrong pronouns** - Uses "we/our" (candidate doesn't work there yet!)
   - ❌ BAD: "How does our partnership with Azure..."
   - ✅ GOOD: "How does the partnership with Azure..." or "How does your partnership..."

---

# ANGLE-VALIDATION CHECKLIST

Before returning each question, verify:

✅ Does this question follow the **${angle.angle}** angle?
✅ Does it AVOID all forbidden angles (${angle.forbidden_angles.join(', ')})?
✅ Would this question sound DIFFERENT from the same CI fact asked in other rounds?
✅ Does it use a DIFFERENT phrasing structure (not "With [fact]..." for every question)?
✅ Is it specific to ${companyName}'s competitive intelligence?
✅ Does it sound natural when read aloud?

---

# FEW-SHOT EXAMPLES: SAME FACT, DIFFERENT ANGLES

## CI Fact: "Series B funding ($415M) announced December 2023, now valued at $2B"

### Recruiter Screen (Career Impact angle):
**Question:** "With the recent Series B funding, I'm curious what new growth opportunities are opening up for someone joining the sales team now—are there new markets or segments you're targeting?"

**Why it works:**
- Career-focused ("opportunities for someone joining NOW")
- Personal fit angle
- Future-oriented for candidate's path
- Natural, curious tone

---

### Behavioral Deep Dive (Team Process angle):
**Question:** "When you're scaling that fast post-Series B, how does the team stay ahead of incoming requests while maintaining quality? Is it more process-driven or still pretty dynamic?"

**Why it works:**
- Process-focused ("how does the team...")
- Growth challenges from team perspective
- Real tradeoff (speed vs quality)
- Day-to-day workflow angle

---

### Culture Values (Values Manifestation angle):
**Question:** "The Series B funding must have brought a lot of change—can you give me a concrete example of how the team maintained its core values during that rapid scaling?"

**Why it works:**
- Values-focused ("maintaining core values")
- Concrete example request
- Culture in action angle
- Tests if values claims are real

---

### Strategic Role (Competitive Positioning angle):
**Question:** "How would you leverage our $2B valuation when selling against OpenAI, who's valued at $29B? What's the positioning angle that resonates with enterprises?"

**Why it works:**
- Competitive positioning ("against OpenAI")
- Tactical execution ("leverage in selling")
- Market differentiation angle
- Shows strategic thinking

---

### Executive Final (Industry Vision angle):
**Question:** "Given the current AI funding climate and consolidation trends, how do you see the market evolving over the next 3-5 years? Does our Series B position us differently than earlier-stage or mega-funded competitors?"

**Why it works:**
- Industry-level ("market evolving")
- Long-term vision (3-5 years)
- Strategic bets angle
- Executive-level thinking

---

# CRITICAL: PHRASING DIVERSITY

## ❌ ANTI-PATTERN: Repetitive Structure

**DO NOT** start every question with the same phrase:

BAD EXAMPLE (All questions start with "With the $400M patient tower..."):

Recruiter:   "With the $400M patient tower, what opportunities..."
Behavioral:  "With the $400M patient tower, how are teams..."
Culture:     "With the $400M patient tower, how does this..."
Strategic:   "With the $400M patient tower, how will this..."
Executive:   "With the $400M patient tower, how do you..."

**Problem:** Even though angles are different, repetitive phrasing creates perception of duplication.

---

## ✅ REQUIRED: Vary How You Reference CI Facts

**Use multiple phrasing structures:**

### Structure 1: Direct Reference (use sparingly)
"With [fact], [question based on angle]..."

### Structure 2: Embedded Reference
"How does [aspect related to fact]... given [brief fact reference]?"

### Structure 3: Implied Reference
"[Opportunity/challenge created by fact]—how would you [angle-specific action]?"

### Structure 4: Question-First
"What [angle-specific aspect] becomes possible now that [fact]?"

### Structure 5: Comparative
"[Fact] seems like [observation]—can you [angle-specific request]?"

---

## ✅ GOOD EXAMPLE: Same Fact, Varied Phrasing

**$400M patient tower across 5 rounds:**

**Recruiter (Structure 4 - Question-First):**
> "What new skills or leadership opportunities open up for someone joining as this 200-bed expansion comes online in Q2?"

**Behavioral (Structure 2 - Embedded):**
> "How are clinical and facilities teams coordinating to ensure smooth workflows when the new tower launches?"

**Culture (Structure 5 - Comparative):**
> "Opening a $400M advanced ICU facility is a major investment in patient care—can you share how this reflects Johns Hopkins' commitment to clinical excellence?"

**Strategic (Structure 3 - Implied):**
> "Adding 200 private rooms with advanced ICU capabilities will increase capacity significantly—how does this position us against other regional hospitals?"

**Executive (Structure 2 - Embedded):**
> "How do you see patient care delivery evolving over the next 3-5 years as facilities like our new tower set new standards?"

**Notice:** Each question references the tower, but NONE start with "With the $400M patient tower..."

---

# GENERATION INSTRUCTIONS

## CRITICAL: Natural Fact Selection

**You have access to ALL CI facts, but ONLY use facts that NATURALLY fit your angle.**

❌ **DON'T force facts:**
- If a fact is about infrastructure ($400M tower), don't force it into a Culture question
- If a fact is about values (diversity hiring), don't force it into a Strategic question
- If a fact is about competitive positioning, don't force it into a Behavioral question

✅ **DO select naturally aligned facts:**
- **Recruiter (Company/Role Clarity)** → Look for: rankings, awards, reputation, company stability, role scope, team size
  - GOOD: US News rankings, Magnet Recognition, company size/growth
  - AVOID: Patient satisfaction metrics (too operational), diversity initiatives (too deep for initial screen)

- **Behavioral (Team Process)** → Look for: system migrations, team expansions, cross-functional projects, workflow changes
  - GOOD: Epic EHR migration, telehealth expansion, new facility openings
  - AVOID: Strategic partnerships (not about day-to-day processes), awards (not process-related)

- **Culture (Values)** → Look for: values, DEI, awards for culture, employee programs, patient care philosophy
  - GOOD: Diversity hiring, Magnet Recognition, patient satisfaction improvements
  - AVOID: Infrastructure projects (not values), technical systems (not culture)

- **Strategic (Competitive)** → Look for: market share, partnerships, competitive advantages, differentiation, market positioning
  - GOOD: US News rankings, AI partnerships, telehealth reach, patient satisfaction as differentiator
  - AVOID: DEI initiatives (not competitive advantage), employee programs (not market-facing)

- **Executive (Industry Vision)** → Look for: strategic bets, market trends, long-term initiatives, industry evolution
  - GOOD: AI integration, telehealth future, facility expansions for 3-5 year outlook
  - AVOID: Day-to-day operational metrics, tactical initiatives

**If you can only find 2-3 facts that naturally fit your angle, that's FINE. Generate 2-3 great questions rather than 5 forced ones.**

---

## CRITICAL: MAX FACT REUSE LIMIT

**RULE: Each CI fact can be used in AT MOST 2 rounds across the entire interview.**

Why? Using the same fact 3-4 times creates repetitive, generic questions even with different angles.

Example of PROBLEM (Patient Satisfaction used 3x):
- Behavioral: "how do teams communicate to maintain these improvements?"
- Culture: "how does this reflect core values?"
- Strategic: "what tactical advantages does this provide?"

**Result:** Repetitive structure, feels generic.

Example of SOLUTION (Patient Satisfaction used 2x max):
- Culture: "how does this reflect core values?" ✅
- Strategic: "what tactical advantages does this provide?" ✅
- Behavioral: SKIP (find different fact) ✅

**How to apply this rule:**

1. Assume other rounds may also want to use each fact
2. Prioritize facts that MOST naturally fit your angle
3. If a fact could fit multiple rounds equally well, use it ONLY if it's the TOP 1-2 best fits for your angle
4. Prefer facts that are MORE unique to your angle over facts that work for many angles

**Example prioritization for Strategic round:**
- US News ranking: MUST USE (perfect for competitive positioning)
- AI partnership: MUST USE (perfect for competitive edge)
- Patient satisfaction: MAYBE USE (could also fit Culture/Behavioral)
- $400M tower: SKIP (Recruiter/Executive fit better)

---

## Step-by-Step Generation Process

1. **Review ALL CI facts** - You have access to everything
2. **Select ONLY 2-5 facts** that NATURALLY align with **${angle.angle}** angle
3. **For each fact, choose a DIFFERENT phrasing structure** (1-5 above)
4. **Generate the question** using that structure + angle
5. **Run angle-validation checklist** - Ensure it wouldn't work in other rounds
6. **Check phrasing diversity** - No two questions should start the same way
7. **Check natural fit** - Would this fact/angle combo feel forced? If yes, skip it
8. **Polish for natural language** - Read aloud test

## Output Format

For each question, provide:
- question_text: The actual question (natural, conversational)
- ci_fact_used: Which CI fact this is based on (copy exact text)
- angle_used: Confirm this matches "${angle.angle}"
- why_this_works: Brief explanation (2-3 sentences)
- forbidden_angle_check: Confirm you avoided ${angle.forbidden_angles.join(', ')}
- best_timing: When to ask (opening/mid/closing)

---

Generate 3-5 questions now, following THIS round's angle: **${angle.angle}**
`;
}

/**
 * Export for use in persona generation
 */
export const angleBasedReverseQuestionPrompt = {
  build: buildAngleBasedReverseQuestionPrompt,
  angles: ROUND_ANGLES
};

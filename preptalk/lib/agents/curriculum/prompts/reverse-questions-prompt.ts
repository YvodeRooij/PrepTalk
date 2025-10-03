/**
 * Eval-Driven Generation Prompt for Reverse Interview Questions
 *
 * Based on error analysis of 10 human-reviewed examples
 * Optimized to generate PASSING questions on first try
 */

import type { CompetitiveIntelligence } from '../types';

interface PromptContext {
  competitiveIntelligence: CompetitiveIntelligence;
  jobTitle: string;
  companyName: string;
  roundType: string;
  bestAskedTo: string;
  experienceLevel: string;
}

/**
 * Core generation prompt with few-shot examples and explicit success patterns
 */
export function buildReverseQuestionPrompt(context: PromptContext): string {
  const {
    competitiveIntelligence: ci,
    jobTitle,
    companyName,
    roundType,
    bestAskedTo,
    experienceLevel
  } = context;

  return `Generate 3-5 smart reverse interview questions (questions the CANDIDATE asks the INTERVIEWER) for a ${roundType} round.

You're generating questions for a ${experienceLevel} ${jobTitle} candidate interviewing at ${companyName}.
These questions will be asked to: ${bestAskedTo}

# COMPETITIVE INTELLIGENCE TO LEVERAGE

## Strategic Advantages:
${ci.strategicAdvantages?.map((adv, i) => `${i + 1}. ${adv}`).join('\n')}

## Recent Developments:
${ci.recentDevelopments?.map((dev, i) => `${i + 1}. ${dev}`).join('\n')}

## Competitive Positioning:
${ci.competitivePositioning}

## Primary Competitors:
${ci.primaryCompetitors?.join(', ')}

---

# QUALITY CRITERIA (Eval-Driven)

## ❌ CRITICAL FAILURES - NEVER DO THIS:

### 1. Power Dynamic Inversion
DO NOT ask about the interviewer's PERSONAL learning or experience:
- ❌ BAD: "What was the biggest challenge YOU faced during the migration, and what did YOU learn?"
- ✅ GOOD: "What was the biggest challenge THE TEAM faced during the migration, and how did they adapt?"

Why: Flips interview dynamic - you're evaluating THEM, not vice versa.

### 2. Awkward Jargon
DO NOT use business-speak or unnatural phrasing:
- ❌ BAD: "What does your team do to avoid getting buried in reactive work?"
- ✅ GOOD: "When you're scaling that fast, how does the team stay ahead of incoming requests?"

Why: Sounds rehearsed and inauthentic.

### 3. Generic Questions
DO NOT ask questions that could apply to any company:
- ❌ BAD: "What's the culture like?"
- ✅ GOOD: "The culture memo talks about freedom and responsibility—can you give a concrete example of how that plays out when the team makes big decisions?"

Why: Doesn't demonstrate research depth.

---

## ✅ SUCCESS PATTERNS - USE THESE:

### Pattern 1: Recent Event → Team Impact
Structure: "How has [recent specific change] impacted/changed [team aspect]?"

Example from CI: "${ci.recentDevelopments?.[0] || 'Recent development'}"
→ Question: "How has [this change] changed technical priorities for your team, especially around [specific domain]?"

### Pattern 2: Real-World Tradeoff
Structure: "How does the team balance [X] while maintaining [Y]?"

Example from CI: "${ci.strategicAdvantages?.[0] || 'Strategic advantage'}"
→ Question: "With [advantage creating pressure for X], how does the team balance [X] while maintaining [Y]?"

### Pattern 3: Concrete Example Request
Structure: "Can you give me a concrete example of [abstract concept]?"

Example: "The culture memo talks about freedom and responsibility. Can you give me a concrete example of how that plays out when your team has to make a big decision?"

### Pattern 4: Scale Challenge + Solution
Structure: "What's the hardest part of [scale/complexity], and how does the team handle it?"

Example from CI: "${companyName} operates in [X] countries/markets"
→ Question: "Working across [X] countries seems like it would create unique coordination challenges. What's the hardest part of that scale, and how does the team handle it?"

### Pattern 5: Day-to-Day Impact
Structure: "How has [change] changed the day-to-day work?"

Example from CI: "${ci.recentDevelopments?.[0] || 'Recent tech change'}"
→ Question: "For someone in this role, how has [change] changed the day-to-day work—are there new tools or skills that became more important?"

### Pattern 6: Future/Growth Opportunity
Structure: "What [opportunities/areas] might emerge for someone joining now?"

Example: "With [recent development] being relatively new, I'm curious what growth opportunities might emerge for someone joining now. Are there areas the team is still figuring out?"

### Pattern 7: Process Deep-Dive
Structure: "Walk me through how the team [handles/manages X]... is it [option A, B, or C]?"

Example: "Managing compliance across [X] jurisdictions sounds complex. Walk me through how the team stays on top of changing regulations—is it automated, manual, or somewhere in between?"

### Pattern 8: Comparative Framing
Structure: "Coming from [background], is [aspect] different from [competitor/traditional approach]?"

Example: "I'm curious how engineers and tax teams collaborate here. Coming from a traditional finance background, is the dynamic different from, say, more established media companies?"

---

# FEW-SHOT EXAMPLES (Human-Verified PASS)

## Example Set 1: Recent Development → Team Impact

CI Fact: "Q3 2024: Launched ad-supported tier requiring new tax compliance for advertising revenue across EMEA"

Generated Question: "How has the ad tier launch changed technical priorities for your team, especially around EMEA compliance?"

Why it works:
- References specific recent event (Q3 2024 ad tier)
- Asks about TEAM priorities (not personal)
- Specific domain (EMEA compliance)
- Natural, conversational tone

## Example Set 2: Strategic Advantage → Real Tradeoff

CI Fact: "Netflix's $15B content budget vs Disney's $8B enables deeper localization"

Generated Question: "With such heavy investment in content production, how does the finance team balance supporting rapid creative decisions while maintaining cost controls?"

Why it works:
- Based on strategic advantage (budget)
- Identifies real tension (speed vs control)
- Team process question
- Shows strategic thinking

## Example Set 3: Culture → Concrete Example

CI Fact: "Netflix culture memo emphasizes 'Freedom and Responsibility'"

Generated Question: "The culture memo talks a lot about freedom and responsibility. Can you give me a concrete example of how that plays out when your team has to make a big decision?"

Why it works:
- References cultural artifact specifically
- Requests CONCRETE example (not abstract)
- Tests if culture claims are real
- Decision-focused (practical)

## Example Set 4: Scale → Challenge + Solution

CI Fact: "Netflix operates in 190+ countries vs Disney's 150"

Generated Question: "Working across 190 countries seems like it would create some unique coordination challenges. What's the hardest part of that scale, and how does the team handle it?"

Why it works:
- Acknowledges scale complexity
- Two-part: challenge + solution
- Team-focused
- Natural curiosity tone

---

# GENERATION INSTRUCTIONS

1. **Select 3-5 CI facts** from the competitive intelligence above
2. **For each fact, choose a success pattern** that fits naturally
3. **Generate the question** following that pattern's structure
4. **Ensure natural language** - read it aloud, does it sound conversational?
5. **Avoid all failure modes** - no personal questions, no jargon, no generic queries

## Output Format

For each question, provide:
- question_text: The actual question (natural, conversational)
- ci_fact_used: Which CI fact this is based on
- success_pattern: Which pattern you followed
- why_this_works: Brief explanation (2-3 sentences)
- best_timing: When to ask (opening/mid/closing)

## Quality Checklist (Self-Check Before Returning)

Before returning each question, verify:
✅ Does NOT ask about interviewer's personal experience/learning?
✅ Uses natural language (no "reactive work", "synergize", etc.)?
✅ References specific CI fact (not generic)?
✅ Follows at least one success pattern?
✅ Sounds conversational when read aloud?
✅ Asks about TEAM/PROCESS (not individual)?
✅ Would lead to actionable insights?

---

# ROUND-SPECIFIC GUIDANCE

${getRoundSpecificGuidance(roundType, bestAskedTo)}

---

Generate 3-5 questions now, ensuring each passes the quality checklist.`;
}

/**
 * Round-specific guidance to tune question style
 */
function getRoundSpecificGuidance(roundType: string, bestAskedTo: string): string {
  const guidance: Record<string, string> = {
    recruiter_screen: `
## Recruiter Screen Guidance

You're talking to: ${bestAskedTo} (usually recruiter or talent partner)

Appropriate questions:
- Process and logistics (timeline, next steps)
- High-level culture and team dynamics
- Role clarity and expectations
- Growth opportunities overview

Avoid:
- Deep technical details (save for engineer interviews)
- Executive strategy (not their domain)
- Compensation details (too early)

Tone: Enthusiastic, professional, curious about the role and company`,

    behavioral_deep_dive: `
## Behavioral Deep Dive Guidance

You're talking to: ${bestAskedTo} (usually hiring manager or team lead)

Appropriate questions:
- Team dynamics and collaboration
- Day-to-day work and processes
- Manager's leadership style
- Success metrics and expectations

Avoid:
- Generic questions (show you've done homework)
- Overly tactical details

Tone: Collaborative, focused on practical realities`,

    culture_values_alignment: `
## Culture/Values Alignment Guidance

You're talking to: ${bestAskedTo} (usually peer or team member)

Appropriate questions:
- How values manifest in daily work
- Concrete examples of culture in action
- Work-life integration
- Team health and psychological safety

Avoid:
- Softball questions (really probe if culture claims are real)
- Comparison to competitors (can seem like playing companies off each other)

Tone: Authentic, values-driven, seeking evidence`,

    strategic_role_discussion: `
## Strategic Role Discussion Guidance

You're talking to: ${bestAskedTo} (usually skip-level manager or director)

Appropriate questions:
- Department priorities and strategic focus
- How role contributes to company objectives
- Competitive positioning and market dynamics
- Future evolution of the role

Avoid:
- Micro-level details (they may not know day-to-day)
- Pure technical questions

Tone: Strategic, business-minded, thinking beyond immediate role`,

    executive_final: `
## Executive Final Round Guidance

You're talking to: ${bestAskedTo} (usually VP, C-level, or founder)

Appropriate questions:
- Company vision and long-term strategy (2-5 years)
- Leadership philosophy
- Biggest challenges and opportunities ahead
- Industry trends and competitive positioning

Avoid:
- Day-to-day tactical questions
- Questions they've likely answered 100 times ("What's your management style?")
- Anything too narrow in scope

Tone: Visionary, leadership-oriented, thinking at company/market level`
  };

  return guidance[roundType] || guidance.recruiter_screen;
}

/**
 * Alternative: Generate with explicit step-by-step reasoning
 */
export function buildReverseQuestionPromptWithChainOfThought(context: PromptContext): string {
  const basePrompt = buildReverseQuestionPrompt(context);

  return `${basePrompt}

---

# CHAIN-OF-THOUGHT GENERATION PROCESS

For each question, follow these steps explicitly:

Step 1: Select CI Fact
- Choose one specific fact from competitive intelligence
- Write: "CI Fact: [exact text]"

Step 2: Choose Success Pattern
- Pick the pattern that fits this CI fact best
- Write: "Pattern: [pattern name]"

Step 3: Draft Question
- Write the question following the pattern structure
- Write: "Draft: [question text]"

Step 4: Quality Check
- Run through checklist
- Write: "Checks: [list of checks passed]"

Step 5: Refine if Needed
- If any check fails, rewrite
- Write: "Final: [polished question]"

Example:

CI Fact: "Q3 2024: Launched ad-supported tier requiring new tax compliance for advertising revenue across EMEA"
Pattern: Recent Event → Team Impact
Draft: "How has the ad tier launch changed technical priorities for your team, especially around EMEA compliance?"
Checks: ✅ No personal questions ✅ Natural language ✅ CI-grounded ✅ Team-focused
Final: "How has the ad tier launch changed technical priorities for your team, especially around EMEA compliance?"

Now generate 3-5 questions using this chain-of-thought process.`;
}

/**
 * Export both versions for A/B testing
 */
export const reverseQuestionPrompts = {
  standard: buildReverseQuestionPrompt,
  chainOfThought: buildReverseQuestionPromptWithChainOfThought
};

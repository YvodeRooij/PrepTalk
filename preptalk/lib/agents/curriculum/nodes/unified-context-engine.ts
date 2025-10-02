// Unified Context Engine Node
// THE CRITICAL MISSING PIECE: Synthesizes job + user + CV into personalized coaching strategy
// Uses Gemini-2.5-pro for maximum context synthesis capability

import { CurriculumState } from '../state';
import { LLMProviderService } from '../../../providers/llm-provider-service';
import { z } from 'zod';

// Zod schema for structured output validation
const UnifiedContextSchema = z.object({
  strengthAmplifiers: z.array(z.string()).describe(
    "How to leverage user's background and CV strengths for this specific role"
  ),
  gapBridges: z.array(z.string()).describe(
    "How to address weaknesses and knowledge gaps positively during interviews"
  ),
  confidenceBuilders: z.array(z.string()).describe(
    "Ways to reframe user's insecurities and concerns as growth areas and learning opportunities"
  ),
  ciIntegrationStrategy: z.string().describe(
    "User-specific approach for naturally weaving competitive intelligence into interview responses"
  ),
  personalizedApproach: z.string().describe(
    "Overall coaching style and interview preparation approach tailored to this user's profile"
  )
});

export type UnifiedContext = z.infer<typeof UnifiedContextSchema>;

/**
 * Unified Context Engine Node
 *
 * THE MOST CRITICAL NODE in the curriculum generation process.
 * Takes 3 separate input streams and synthesizes them into a unified personalized coaching strategy:
 *
 * INPUT 1: Job Intelligence (company CI, role requirements, competitive advantages)
 * INPUT 2: User Profile (concerns, goals, focus areas, background context)
 * INPUT 3: CV Analysis (experience, skills, gaps, career narrative)
 *
 * OUTPUT: Unified coaching context that informs all subsequent persona and question generation
 */
export async function unifiedContextEngine(
  state: CurriculumState,
  config: { llmProvider: LLMProviderService }
): Promise<Partial<CurriculumState>> {

  // ⚡ CV DEMO MODE: Skip heavy synthesis, return null (downstream nodes handle it)
  if (state.mode === 'cv_round_only') {
    console.log('⚡ [CV DEMO] Skipping unified context synthesis for fast demo generation');
    return {
      unifiedContext: undefined,
      currentStep: 'unified_context_skipped_demo'
    };
  }

  console.log('🔧 Unified Context Engine: Synthesizing job + user + CV data...');

  try {
    // Construct comprehensive synthesis prompt
    const synthesisPrompt = buildSynthesisPrompt(state);

    // Generate unified context using Gemini Pro via LLM service
    const startTime = Date.now();
    const unifiedContext = await config.llmProvider.generateStructured(
      UnifiedContextSchema,
      'unified_context_engine',
      synthesisPrompt,
      {
        temperature: 0.4,
        maxTokens: 8192
      }
    );
    const processingTime = Date.now() - startTime;

    console.log(`✅ Unified Context Engine completed in ${processingTime}ms`);
    console.log(`📋 Generated ${unifiedContext.strengthAmplifiers.length} strength amplifiers`);
    console.log(`🌉 Generated ${unifiedContext.gapBridges.length} gap bridges`);
    console.log(`💪 Generated ${unifiedContext.confidenceBuilders.length} confidence builders`);

    return {
      unifiedContext,
      currentStep: 'unified_context_complete'
    };

  } catch (error) {
    console.error('❌ Unified Context Engine failed:', error);

    // Return graceful fallback with basic context
    return {
      unifiedContext: {
        strengthAmplifiers: ['Leverage analytical background for data-driven insights'],
        gapBridges: ['Connect previous experience to new role requirements'],
        confidenceBuilders: ['Frame career transition as strategic growth opportunity'],
        ciIntegrationStrategy: 'Weave company research naturally into responses about motivation and fit',
        personalizedApproach: 'Supportive coaching approach focusing on transferable skills and growth mindset'
      },
      currentStep: 'unified_context_fallback',
      warnings: [`Unified context engine failed: ${error instanceof Error ? error.message : 'Unknown error'}`]
    };
  }
}

/**
 * Builds comprehensive synthesis prompt combining all 3 input streams
 */
function buildSynthesisPrompt(state: CurriculumState): string {
  const jobContext = buildJobContext(state);
  const userContext = buildUserContext(state);
  const cvContext = buildCVContext(state);

  return `
SYNTHESIZE PERSONALIZED INTERVIEW COACHING STRATEGY

You are an expert interview coach creating a comprehensive, personalized preparation strategy.
Your task is to synthesize ALL three input sources into a unified coaching approach.

${jobContext}

${userContext}

${cvContext}

SYNTHESIS REQUIREMENTS:

1. STRENGTH AMPLIFIERS: Identify 3-5 specific ways to leverage the user's background for THIS role at THIS company
   - Connect CV experience to job requirements
   - Show how user's unique background creates value
   - Reference competitive advantages user can contribute to

2. GAP BRIDGES: Create 2-4 positive approaches to address knowledge gaps and concerns
   - Transform weaknesses into learning opportunities
   - Show transferable skills that bridge experience gaps
   - Connect user's growth mindset to role requirements

3. CONFIDENCE BUILDERS: Develop 3-5 ways to reframe insecurities as strengths
   - Turn "limited industry experience" into "fresh perspective"
   - Frame career transitions as strategic growth
   - Connect user excitement to company mission

4. CI INTEGRATION STRATEGY: Create user-specific approach for weaving competitive intelligence
   - Natural conversation bridges from user's background to company advantages
   - Specific examples of how user can reference research
   - Avoid forcing statistics - make it conversational

5. PERSONALIZED APPROACH: Define overall coaching style for this user
   - Address their specific concerns and goals
   - Adapt to their experience level and background
   - Consider their personality and interview preferences

Create a strategy that makes this user feel confident, prepared, and authentic while showcasing deep company understanding.
`;
}

/**
 * Builds job intelligence context from competitive research
 */
function buildJobContext(state: CurriculumState): string {
  const job = state.jobData;
  const ci = state.competitiveIntelligence;

  if (!job || !ci) {
    return 'JOB CONTEXT: Basic role information available\n';
  }

  return `
JOB INTELLIGENCE:
Company: ${job.company_name}
Role: ${job.title} (${job.level} level)
Key Requirements: ${job.requirements?.join(', ') || 'Standard role requirements'}

COMPETITIVE ADVANTAGES:
${ci.strategicAdvantages?.map(adv => `• ${adv}`).join('\n') || '• Standard competitive position'}

RECENT DEVELOPMENTS:
${ci.recentDevelopments?.map(dev => `• ${dev}`).join('\n') || '• Recent company updates'}

COMPETITIVE POSITIONING:
${ci.competitivePositioning || 'Strong market position'}

PRIMARY COMPETITORS: ${ci.primaryCompetitors?.join(', ') || 'Industry competitors'}
`;
}

/**
 * Builds user personalization context
 */
function buildUserContext(state: CurriculumState): string {
  const user = state.userProfile;

  if (!user) {
    return 'USER CONTEXT: Limited personalization data available\n';
  }

  return `
USER PROFILE:
${user.excitement ? `EXCITEMENT: ${user.excitement}` : ''}
${user.concerns ? `CONCERNS: ${user.concerns}` : ''}
${user.weakAreas?.length ? `WEAK AREAS: ${user.weakAreas.join(', ')}` : ''}
${user.backgroundContext ? `BACKGROUND: ${user.backgroundContext}` : ''}
${user.preparationGoals ? `GOALS: ${user.preparationGoals}` : ''}

LEGACY PROFILE DATA:
${user.focusArea ? `Focus Area: ${user.focusArea}` : ''}
${user.concern ? `Main Concern: ${user.concern}` : ''}
${user.background ? `Background: ${user.background}` : ''}
`;
}

/**
 * Builds CV analysis context
 */
function buildCVContext(state: CurriculumState): string {
  const cv = state.cvData;

  if (!cv?.analysis || !cv?.insights) {
    return 'CV CONTEXT: No CV analysis available\n';
  }

  const analysis = cv.analysis;
  const insights = cv.insights;

  return `
CV ANALYSIS:
Current Role: ${analysis.summary?.currentRole || 'Not specified'}
Experience: ${analysis.summary?.yearsOfExperience || 0} years
Experience Level: ${insights.experienceLevel || 'Not assessed'}

TECHNICAL SKILLS: ${analysis.skills?.technical?.join(', ') || 'Not specified'}
SOFT SKILLS: ${analysis.skills?.soft?.join(', ') || 'Not specified'}

RECENT EXPERIENCE:
${analysis.experience?.[0] ? `${analysis.experience[0].position} at ${analysis.experience[0].company}` : 'Not available'}

SKILL GAPS: ${insights.skillGaps?.join(', ') || 'None identified'}
READINESS SCORE: ${insights.readiness?.overallScore || 0}%
AREAS FOR IMPROVEMENT: ${insights.readiness?.areasForImprovement?.join(', ') || 'None specified'}

JOB MATCH SCORE: ${cv.matchScore || 0}%
`;
}
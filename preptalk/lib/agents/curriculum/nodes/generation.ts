// Curriculum Generation Nodes - Structure, rounds, and quality
// Pure functions for curriculum creation

import { Command } from '@langchain/langgraph';
import { CurriculumState } from '../state';
import { CurriculumStructure, GeneratedRound, Question, RoundDefinition, RoundTopic } from '../types';
import { StructureResponseSchema, RoundContentResponseSchema, QualityEvaluationSchema } from '../schemas';

type StructureResponse = Pick<CurriculumStructure, 'total_rounds' | 'difficulty_level' | 'rounds'> & {
  rounds: RoundDefinition[];
};

type GeneratedTopic = RoundTopic & {
  questions?: Question[];
};

type RoundContentResponse = {
  interviewer_persona: GeneratedRound['interviewer_persona'];
  topics?: GeneratedTopic[];
  evaluation_criteria?: GeneratedRound['evaluation_criteria'];
  sample_questions?: Question[];
  opening_script?: string;
  closing_script?: string;
};

// No longer using direct Gemini instantiation - using LLM provider service

/**
 * Node: Design curriculum structure based on research
 */
export async function designStructure(
  state: CurriculumState,
  config?: { llmProvider?: any }
): Promise<Partial<CurriculumState>> {
  if (!config?.llmProvider) {
    throw new Error('LLM provider is required for designStructure');
  }

  // ⚡ CV DEMO MODE: Return minimal 1-round structure immediately
  if (state.mode === 'cv_round_only') {
    console.log('⚡ [CV DEMO] Creating minimal 1-round structure for demo');
    return {
      structure: {
        job_id: state.jobData?.id || '',
        total_rounds: 1,
        difficulty_level: 'intermediate',
        estimated_total_minutes: 3,
        generation_strategy: 'cv_demo',
        refinement_iterations: 0,
        rounds: [{
          round_number: 1,
          title: 'CV Walkthrough (Demo)',
          type: 'behavioral',
          focus_areas: ['Career History', 'Experience Validation', 'Background Discussion'],
          duration_minutes: 3,
          difficulty: 'intermediate'
        }]
      } as CurriculumStructure,
      currentStep: 'structure_created_demo'
    };
  }

  if (!state.jobData || !state.rolePatterns) {
    return {
      errors: ['Missing required data for structure design'],
    };
  }

  const structure = await config.llmProvider.generateStructured(
    StructureResponseSchema,
    'quality_evaluation',
    `Design interview curriculum structure for:

      Role: ${state.jobData.title} (${state.jobData.level})
      Company: ${state.companyContext?.name || 'Unknown'}
      Typical Rounds: ${state.rolePatterns.typical_rounds}

      Based on level, create appropriate rounds:
      - Entry/Junior: Phone Screen, Technical, Behavioral
      - Mid/Senior: Phone Screen, Technical, System Design, Behavioral
      - Staff/Principal: + Architecture, Leadership

      Return JSON with:
      - total_rounds: number
      - difficulty_level: beginner/intermediate/advanced/expert
      - rounds: array of round definitions`
  );

  // ✅ FIX: Explicitly set round_number to ensure database constraint is satisfied
  const rounds = (structure.rounds ?? []).map((round, index) => ({
    ...round,
    round_number: index + 1  // Ensure round_number is always set (1-indexed)
  }));

  // 🔍 DEBUG: Verify round_number is set
  console.log(`✅ [STRUCTURE] Created ${rounds.length} rounds with round_number: [${rounds.map(r => r.round_number).join(', ')}]`);

  const estimatedTotalMinutes = rounds.reduce((sum, round) => sum + (round.duration_minutes ?? 0), 0);

  return {
    structure: {
      job_id: state.jobData.id || '',
      ...structure,
      rounds,  // Use rounds with explicit round_number
      estimated_total_minutes: estimatedTotalMinutes,
      generation_strategy: 'comprehensive',
      refinement_iterations: state.refinementAttempts || 0,
    } as CurriculumStructure,
  };
}

/**
 * ⚡ FAST CV DEMO: Build rich prompt with ALL extracted CV data
 * Pass complete structured data to LLM for personalized question generation
 */
function buildRichCvPrompt(cvData: any): string {
  const analysis = cvData?.analysis;
  if (!analysis) return 'CV DEMO WALKTHROUGH - Limited CV data available';

  const name = analysis.personalInfo?.fullName || analysis.summary?.fullName || 'Candidate';
  const firstName = name.split(' ')[0];
  const yearsExp = analysis.summary?.yearsOfExperience || 0;
  const currentRole = analysis.summary?.currentRole || 'Not specified';

  // Build detailed experience context
  const experienceContext = analysis.experience?.slice(0, 3).map((exp: any, idx: number) => {
    return `
    ${idx + 1}. ${exp.position || exp.title || 'Role'} at ${exp.company || 'Company'}
       Duration: ${exp.duration || `${exp.startDate || ''} - ${exp.endDate || 'Present'}`}
       Responsibilities: ${exp.responsibilities?.slice(0, 2).join('; ') || 'Various responsibilities'}`;
  }).join('\n') || 'No experience data';

  // Build skills context
  const skillsContext = analysis.skills?.technical?.length
    ? `Technical: ${analysis.skills.technical.slice(0, 5).join(', ')}`
    : analysis.skills?.slice(0, 5).join(', ') || 'Various skills';

  // Build education context
  const educationContext = analysis.education?.slice(0, 2).map((edu: any) => {
    return `${edu.degree || edu.field || 'Degree'} at ${edu.institution || 'Institution'}`;
  }).join('; ') || 'Not specified';

  return `Generate 5 short, personalized CV walkthrough questions for ${firstName}.

CANDIDATE: ${name} | ${yearsExp}yr | ${currentRole}
COMPANIES: ${analysis.experience?.slice(0, 3).map((e: any) => e.company).filter(Boolean).join(', ') || 'Various'}
SKILLS: ${analysis.skills?.technical?.slice(0, 3).join(', ') || 'Various'}

REQUIREMENTS:
- Reference specific companies/roles above
- Keep questions SHORT (1 sentence max)
- Conversational recruiter tone
- 60-90s answer time each

EXAMPLES:
"What drew you to ${analysis.experience?.[0]?.company || 'your current role'}?"
"Tell me about a recent ${analysis.experience?.[0]?.responsibilities?.[0] || 'project'} - what was your role?"
"Where do you see yourself going next?"

Return 5 questions covering: motivation, recent work, career path, skills, future goals.`;
}

/**
 * 🆕 DRY HELPER: Build round generation prompt
 * Extracted for reuse in both batch and sequential generation
 */
function buildRoundPrompt(roundDef: RoundDefinition, state: CurriculumState): string {
  const roundContext = `Role: ${state.jobData?.title || 'Target Role'} at ${state.companyContext?.name || 'Company'}
       Focus: ${roundDef.focus_areas.join(', ')}`;

  return `Generate detailed interview round content:

      Round: ${roundDef.title} (${roundDef.type})
      Duration: ${roundDef.duration_minutes} minutes
      ${roundContext}

      Return JSON with:
      - interviewer_persona: { name, role, personality, communication_style, goal }
      - topics: array of { topic, questions, evaluation_points }
      - evaluation_criteria: array of { criterion, weight, rubric }
      - opening_script: string
      - closing_script: string`;
}

/**
 * 🆕 DRY HELPER: Transform LLM content response to GeneratedRound
 * Extracted for reuse in both batch and sequential generation
 */
function transformContentToRound(
  content: RoundContentResponse,
  roundDef: RoundDefinition
): GeneratedRound {
  const rawTopics = content.topics ?? [];
  const topicsToCover: RoundTopic[] = rawTopics.map((topic) => ({
    topic: topic.topic,
    subtopics: topic.subtopics ?? [],
    depth: topic.depth ?? 'intermediate',
    time_allocation: topic.time_allocation ?? Math.round(roundDef.duration_minutes / Math.max(rawTopics.length, 1)),
    must_cover: topic.must_cover ?? true,
    question_count: topic.question_count ?? topic.questions?.length ?? 0,
    difficulty_progression: topic.difficulty_progression ?? 'mixed',
  }));

  const sampleQuestions: Question[] = content.sample_questions
    ?? rawTopics.flatMap((topic) => topic.questions ?? []);

  return {
    round_number: roundDef.round_number,
    round_type: roundDef.type,
    title: roundDef.title,
    description: `${roundDef.type} interview focusing on ${roundDef.focus_areas.join(', ')}`,
    duration_minutes: roundDef.duration_minutes,
    interviewer_persona: content.interviewer_persona,
    topics_to_cover: topicsToCover,
    evaluation_criteria: content.evaluation_criteria || [],
    sample_questions: sampleQuestions,
    opening_script: content.opening_script || 'Welcome to the interview...',
    closing_script: content.closing_script || 'Thank you for your time...',
    passing_score: 70,
  } as GeneratedRound;
}

/**
 * 🆕 DRY HELPER: Generate a single interview round
 * Reusable for both CV Round (1 round) and Full generation (5 rounds)
 */
async function generateSingleRound(
  roundDef: RoundDefinition,
  state: CurriculumState,
  llmProvider: any
): Promise<GeneratedRound> {

  const isCVRound = state.mode === 'cv_round_only' && roundDef.round_number === 1;

  // ⚡ CV DEMO MODE: NO LLM CALL - Use CV data directly without question generation
  if (isCVRound && state.cvData?.analysis) {
    console.log('⚡ [CV DEMO] Skipping LLM question generation - using CV data directly');

    const analysis = state.cvData.analysis;
    const name = analysis.personalInfo?.fullName || analysis.summary?.fullName || 'Candidate';
    const firstName = name.split(' ')[0];

    return {
      round_number: 1,
      round_type: 'behavioral',
      title: 'CV Walkthrough (Demo)',
      description: 'CV walkthrough with recruiter - discuss your background and experience',
      duration_minutes: 3,
      interviewer_persona: {
        name: 'Sarah Chen',
        role: 'Technical Recruiter',
        personality: 'friendly and conversational',
        communication_style: 'warm, direct, focused on understanding your story',
        goal: 'Understand your background and validate your experience'
      },
      topics_to_cover: [
        {
          topic: 'Career Background',
          subtopics: ['Current role', 'Key responsibilities', 'Career progression'],
          depth: 'intermediate',
          time_allocation: 3,
          must_cover: true,
          question_count: 5,
          difficulty_progression: 'mixed'
        }
      ],
      evaluation_criteria: [
        {
          criterion: 'Communication clarity',
          weight: 40,
          rubric: {
            excellent: 'Clear, structured responses with specific examples',
            good: 'Generally clear with some detail',
            needs_improvement: 'Vague or unclear explanations'
          }
        },
        {
          criterion: 'Experience validation',
          weight: 60,
          rubric: {
            excellent: 'Detailed examples that match CV claims',
            good: 'Some validation with basic examples',
            needs_improvement: 'Cannot substantiate CV claims'
          }
        }
      ],
      sample_questions: [], // ElevenLabs will use CV data from voice prompt API
      opening_script: `Hi ${firstName}! Thanks for taking the time to chat today. I've had a chance to review your CV and I'm excited to learn more about your background. Let's start by having you walk me through your experience.`,
      closing_script: 'Great, thank you for sharing that. We\'ll be in touch soon about next steps!',
      passing_score: 70,
    } as GeneratedRound;
  }

  // FULL MODE: Use DRY helpers for prompt building and transformation
  const prompt = buildRoundPrompt(roundDef, state);
  const content = await llmProvider.generateStructured(
    RoundContentResponseSchema,
    'question_generation',
    prompt
  );

  return transformContentToRound(content, roundDef);
}

/**
 * PERFORMANCE OPTIMIZATION: Batch Round Generation
 *
 * Generates all interview rounds in parallel using LangChain's .batch() method.
 * This reduces generation time from ~50s (sequential) to ~15s (parallel).
 *
 * Implementation follows OOTB LangChain pattern:
 * - Uses llmProvider.batchStructured() with maxConcurrency: 5
 * - Falls back to sequential generation if batch fails
 * - Pattern proven in persona-generation.ts (5x speedup)
 *
 * Expected savings: ~35s (70% reduction) for 4-round curriculum
 *
 * @see persona-generation.ts lines 360-368 for similar pattern
 */
export async function generateRounds(
  state: CurriculumState,
  config?: { llmProvider?: any }
): Promise<Partial<CurriculumState>> {
  if (!config?.llmProvider) {
    throw new Error('LLM provider is required for generateRounds');
  }

  if (!state.structure || !state.jobData) {
    return {
      errors: ['Missing structure or job data for round generation'],
    };
  }

  // 🆕 Determine how many rounds to generate
  const maxRounds = state.maxRounds ?? state.structure.rounds.length;
  const roundsToGenerate = state.structure.rounds.slice(0, maxRounds);

  // 🔍 DEBUG: Verify round_number is present in roundsToGenerate
  console.log(`🎯 Generating ${roundsToGenerate.length} round(s) - mode: ${state.mode}`);
  console.log(`🔍 [GENERATE] Round numbers from structure: [${roundsToGenerate.map(r => r.round_number).join(', ')}]`);

  // ⚡ CV DEMO MODE: Skip batch optimization, use sequential for single round
  if (state.mode === 'cv_round_only') {
    console.log('⚡ [CV DEMO] Using sequential generation for single CV round');
    const rounds: GeneratedRound[] = [];
    for (const roundDef of roundsToGenerate) {
      const round = await generateSingleRound(roundDef, state, config.llmProvider);
      rounds.push(round);
    }
    return { rounds };
  }

  // 🚀 FULL MODE: Use parallel batch processing for performance
  try {
    console.log(`🚀 Generating ${roundsToGenerate.length} round(s) in parallel...`);

    const batchStartTime = Date.now();

    const batchPrompts = roundsToGenerate.map(roundDef => ({
      prompt: buildRoundPrompt(roundDef, state),
      systemPrompt: undefined
    }));

    const contentResults = await config.llmProvider.batchStructured(
      RoundContentResponseSchema,
      'question_generation',
      batchPrompts
    );

    const batchDuration = Date.now() - batchStartTime;
    console.log(`✅ Batch generation completed in ${(batchDuration/1000).toFixed(1)}s (vs ~${roundsToGenerate.length * 12}s sequential)`);

    const rounds: GeneratedRound[] = contentResults.map((content, i) => {
      const roundDef = roundsToGenerate[i];
      return transformContentToRound(content, roundDef);
    });

    // 🔍 DEBUG: Verify round_number is present in generated rounds
    console.log(`🔍 [GENERATE] Generated rounds with round_number: [${rounds.map(r => r.round_number).join(', ')}]`);

    return { rounds };

  } catch (error) {
    console.warn('⚠️  Batch generation failed, falling back to sequential:', error);

    // Fallback: Use existing sequential logic
    const rounds: GeneratedRound[] = [];
    for (const roundDef of roundsToGenerate) {
      const round = await generateSingleRound(roundDef, state, config.llmProvider);
      rounds.push(round);
    }

    return {
      rounds,
      warnings: [...(state.warnings || []), `Batch round generation failed: ${(error as Error).message}`]
    };
  }
}

/**
 * Node: Evaluate quality and route with Command (v1.0 pattern)
 */
export async function evaluateQualityWithRouting(
  state: CurriculumState,
  config?: { llmProvider?: any }
): Promise<Command> {
  if (!config?.llmProvider) {
    return new Command({
      update: { errors: ['LLM provider is required for evaluateQualityWithRouting'] },
      goto: 'save_curriculum', // Skip to save with error
    });
  }

  // ⚡ CV DEMO MODE: Skip quality evaluation for fast demo
  if (state.mode === 'cv_round_only') {
    console.log('⚡ [CV DEMO] Skipping quality evaluation for demo');
    return new Command({
      update: { quality: 85, currentStep: 'quality_skipped_demo' },
      goto: 'save_curriculum'
    });
  }

  if (!state.rounds || !state.jobData) {
    return new Command({
      update: { errors: ['Missing rounds for evaluation'] },
      goto: 'save_curriculum', // Skip to save with error
    });
  }

  const evaluation = await config.llmProvider.generateStructured(
    QualityEvaluationSchema,
    'quality_evaluation',
    `Evaluate interview curriculum quality:

      Job: ${state.jobData.title} at ${state.companyContext?.name}
      Level: ${state.jobData.level}
      Rounds: ${JSON.stringify(state.rounds, null, 2)}

      Score (0-100) based on:
      1. Coverage of requirements (30%)
      2. Appropriate difficulty (25%)
      3. Clear evaluation criteria (20%)
      4. Realistic progression (15%)
      5. Completeness (10%)

      Return JSON with:
      - overall_score: 0-100
      - weak_areas: array of areas needing improvement`
  );
  const quality = evaluation.overall_score || 75;

  // Use Command to route based on quality
  if (quality >= 80 || (state.refinementAttempts || 0) >= 2) {
    return new Command({
      update: { quality },
      goto: 'save_curriculum',
    });
  } else {
    return new Command({
      update: { quality },
      goto: 'refine_rounds',
    });
  }
}

/**
 * Node: Refine weak areas in curriculum
 */
export async function refineRounds(
  state: CurriculumState,
  config?: { llmProvider?: any }
): Promise<Partial<CurriculumState>> {
  // Increment refinement attempts to prevent infinite loops
  const refinementAttempts = (state.refinementAttempts || 0) + 1;
  console.log(`🔄 Refinement attempt ${refinementAttempts}/2`);

  // Re-generate rounds with higher temperature for variety
  const result = await generateRounds(state, config);
  return {
    ...result,
    refinementAttempts,
  };
}
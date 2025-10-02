// Non-Technical Persona Generation Nodes
// Creates competitive intelligence-powered interviewer personas and questions

import { CurriculumState } from '../state';
import { LLMProviderService } from '../../providers/llm-provider-service';
import {
  InterviewerPersonaSchema,
  StandardQuestionSchema,
  CandidatePrepSchema
} from '../schemas';
import { z } from 'zod';

// Types for persona generation system
export interface InterviewerPersona {
  id: string;
  round_number: number;
  round_type: NonTechnicalRoundType;
  identity: {
    name: string;
    role: string;
    tenure_years: number;
    personality_traits: string[];
  };
  knowledge_base: {
    strategic_advantages: string[];
    recent_developments: string[];
    competitive_context: string;
  };
}

export interface StandardQuestion {
  id: string;
  text: string;
  category: 'motivation' | 'behavioral' | 'cultural' | 'strategic';
  follow_ups: string[];
  time_allocation_minutes: number;
}

export interface CandidatePrep {
  ci_talking_points: {
    strategic_advantages: Array<{
      advantage: string;
      how_to_weave_in: string;
      example_response: string;
    }>;
    recent_developments: Array<{
      development: string;
      relevance_to_role: string;
      conversation_starters: string[];
    }>;
  };
  recognition_training: {
    what_great_answers_sound_like: string[];
    how_to_demonstrate_company_knowledge: string[];
  };
  standard_questions_prep: Array<{
    question: string;
    why_asked: string;
    approach: string;
    key_points: string[];
  }>;
}

export type NonTechnicalRoundType =
  | 'recruiter_screen'
  | 'behavioral_deep_dive'
  | 'culture_values_alignment'
  | 'strategic_role_discussion'
  | 'executive_final';

// Personalization helper functions for adaptive question generation
function buildPersonalizationContext(userProfile: any, cvData: any, roundType: NonTechnicalRoundType): string {
  if (!userProfile && !cvData) return '';

  let context = '';

  // Add CV-based context if available
  if (cvData?.analysis) {
    context += 'CANDIDATE PROFILE (from CV):\n';

    if (cvData.analysis.personalInfo?.fullName) {
      context += `- NAME: ${cvData.analysis.personalInfo.fullName}\n`;
    }
    if (cvData.analysis.summary?.yearsOfExperience) {
      context += `- YEARS OF EXPERIENCE: ${cvData.analysis.summary.yearsOfExperience}\n`;
    }
    if (cvData.analysis.summary?.currentRole) {
      context += `- CURRENT ROLE: ${cvData.analysis.summary.currentRole}\n`;
    }
    if (cvData.analysis.skills?.technical?.length) {
      context += `- KEY TECHNICAL SKILLS: ${cvData.analysis.skills.technical.slice(0, 5).join(', ')}\n`;
    }
    if (cvData.analysis.skills?.soft?.length) {
      context += `- SOFT SKILLS: ${cvData.analysis.skills.soft.slice(0, 3).join(', ')}\n`;
    }
    if (cvData.insights?.experienceLevel) {
      context += `- EXPERIENCE LEVEL: ${cvData.insights.experienceLevel}\n`;
    }
    if (cvData.matchScore) {
      context += `- JOB MATCH SCORE: ${cvData.matchScore}%\n`;
    }
    context += '\n';
  }

  // Add user context for personalized questions
  if (userProfile) {
    if (userProfile.excitement || userProfile.concerns || userProfile.weakAreas || userProfile.backgroundContext) {
      context += 'PERSONALIZATION CONTEXT:\n';

      if (userProfile.excitement) {
        context += `- EXCITEMENT: ${userProfile.excitement}\n`;
      }
      if (userProfile.concerns) {
        context += `- CONCERNS: ${userProfile.concerns}\n`;
      }
      if (userProfile.weakAreas?.length) {
        context += `- WEAK AREAS TO PRACTICE: ${userProfile.weakAreas.join(', ')}\n`;
      }
      if (userProfile.backgroundContext) {
        context += `- BACKGROUND: ${userProfile.backgroundContext}\n`;
      }
      if (userProfile.preparationGoals) {
        context += `- PREPARATION GOALS: ${userProfile.preparationGoals}\n`;
      }
      context += '\n';
    }
  }

  return context;
}

function getAdaptationStrategy(userProfile: any, cvData: any, roundType: NonTechnicalRoundType): string {
  if (!userProfile && !cvData) return '';

  let strategy = 'ADAPTATION STRATEGY:\n';

  // CV-based adaptation if available
  if (cvData?.insights) {
    if (cvData.insights.experienceLevel) {
      strategy += `- Adapt questions for ${cvData.insights.experienceLevel}-level candidate\n`;
    }
    if (cvData.insights.skillGaps?.length) {
      strategy += `- Help bridge skill gaps: ${cvData.insights.skillGaps.slice(0, 2).join(', ')}\n`;
    }
    if (cvData.insights.readiness?.areasForImprovement?.length) {
      strategy += `- Focus on improvement areas: ${cvData.insights.readiness.areasForImprovement[0]}\n`;
    }
  }

  // Round-specific personalization strategies
  switch (roundType) {
    case 'recruiter_screen':
      strategy += '- Create confidence-building questions that let candidate practice their transition story\n';
      strategy += '- Include questions that allow showcasing excitement about the company\n';
      break;
    case 'behavioral_deep_dive':
      strategy += '- Focus questions on areas candidate wants to practice (from weak areas)\n';
      strategy += '- Create bridge questions connecting their background to new role requirements\n';
      break;
    case 'culture_values_alignment':
      strategy += '- Address concerns constructively through values-based scenarios\n';
      strategy += '- Generate questions that demonstrate cultural research knowledge\n';
      break;
    case 'strategic_role_discussion':
      strategy += '- Leverage candidate\'s background for strategic thinking questions\n';
      strategy += '- Create opportunities to weave in competitive intelligence naturally\n';
      break;
    case 'executive_final':
      strategy += '- Synthesize candidate\'s unique value proposition through questions\n';
      strategy += '- Focus on vision and contribution based on their background\n';
      break;
  }

  if (userProfile?.concerns) {
    strategy += '- Frame questions to address stated concerns positively\n';
  }
  if (userProfile?.weakAreas?.length) {
    strategy += `- Include more practice opportunities for: ${userProfile.weakAreas.join(', ')}\n`;
  }

  strategy += '\n';
  return strategy;
}

function getUserPersonalizationContext(userProfile: any, cvData?: any): string {
  if (!userProfile && !cvData) return '';

  let context = '';

  // Add CV-based context if available
  if (cvData?.analysis) {
    context += '\nCANDIDATE BACKGROUND (from CV):\n';
    if (cvData.analysis.summary?.currentRole) {
      context += `- Current Role: ${cvData.analysis.summary.currentRole}\n`;
    }
    if (cvData.analysis.summary?.yearsOfExperience) {
      context += `- Experience: ${cvData.analysis.summary.yearsOfExperience} years\n`;
    }
    if (cvData.analysis.experience?.[0]) {
      const recent = cvData.analysis.experience[0];
      context += `- Most Recent: ${recent.position} at ${recent.company}\n`;
    }
  }

  // Handle new rich text format
  if (userProfile.excitement || userProfile.concerns || userProfile.weakAreas || userProfile.backgroundContext) {
    context += '\nCANDIDATE CONTEXT (adapt your persona style accordingly):\n';
    if (userProfile.excitement) {
      context += `- EXCITEMENT: ${userProfile.excitement}\n`;
    }
    if (userProfile.concerns) {
      context += `- CONCERNS: ${userProfile.concerns}\n`;
    }
    if (userProfile.weakAreas?.length) {
      context += `- WEAK AREAS TO PRACTICE: ${userProfile.weakAreas.join(', ')}\n`;
    }
    if (userProfile.backgroundContext) {
      context += `- BACKGROUND: ${userProfile.backgroundContext}\n`;
    }
    return context;
  }

  // Handle legacy enum format for backwards compatibility
  if (userProfile.focusArea || userProfile.concern) {
    context += '\nCANDIDATE CONTEXT (adapt your persona style accordingly):\n';
    context += `- Focus Area: ${userProfile.focusArea?.replace('_', ' ') || 'general'} - candidate wants to practice this\n`;
    context += `- Main Concern: ${userProfile.concern?.replace('_', ' ') || 'general preparation'} - candidate is worried about this\n`;
    if (userProfile.background) {
      context += `- Background: ${userProfile.background}\n`;
    }
    return context;
  }

  return '';
}

function getFriendlyStyle(userProfile: any): string {
  if (!userProfile) return 'professional and supportive';

  // For new rich text format
  if (userProfile.concerns) {
    if (userProfile.concerns.includes('nervous') || userProfile.concerns.includes('anxious')) {
      return 'encouraging and confidence-building';
    }
    if (userProfile.concerns.includes('technology') || userProfile.concerns.includes('technical')) {
      return 'patient and bridging technical concepts';
    }
    return 'supportive and understanding';
  }

  // For legacy format
  if (userProfile.concern) {
    switch (userProfile.concern) {
      case 'industry_knowledge': return 'patient and informative';
      case 'leadership_experience': return 'encouraging and confidence-building';
      case 'culture_fit': return 'warm and inclusive';
      case 'role_complexity': return 'supportive and clarifying';
      default: return 'professional and supportive';
    }
  }

  return 'professional and supportive';
}

/**
 * Node: Generate dynamic interviewer personas using competitive intelligence
 * TDD GREEN: Make the failing tests pass
 */
export async function generateDynamicPersonas(
  state: CurriculumState,
  config: { llmProvider?: LLMProviderService }
): Promise<Partial<CurriculumState>> {

  // ⚡ CV DEMO MODE: Skip persona generation (will be created in generateSingleRound)
  if (state.mode === 'cv_round_only') {
    console.log('⚡ [CV DEMO] Skipping persona generation for fast demo');
    return {
      personas: [],
      currentStep: 'personas_skipped_demo'
    };
  }

  console.log('🎭 Generating dynamic personas from competitive intelligence...');

  if (!state.competitiveIntelligence || !state.jobData || !state.companyContext) {
    throw new Error('Missing required state: competitiveIntelligence, jobData, or companyContext');
  }

  const { competitiveIntelligence, jobData, companyContext } = state;

  // Define the 5 non-technical rounds
  const roundTypes: NonTechnicalRoundType[] = [
    'recruiter_screen',
    'behavioral_deep_dive',
    'culture_values_alignment',
    'strategic_role_discussion',
    'executive_final'
  ];

  // Build enhanced prompt with unified context (same for all personas)
  const unifiedContextPrompt = buildUnifiedContextPrompt(state.unifiedContext);
  const userPersonalizationContext = getUserPersonalizationContext(state.userProfile, state.cvData);
  const friendlyStyle = state.userProfile ? getFriendlyStyle(state.userProfile) : '';

  // OOTB Structured Output Schema - Define once, reuse for batch
  const PersonaDataSchema = z.object({
    name: z.string().min(1).describe('Full name of the interviewer'),
    role: z.string().min(1).describe('Job title and company'),
    tenure_years: z.number().int().min(1).max(15).describe('Years at company'),
    personality_traits: z.array(z.string()).min(2).max(5).describe('Key personality traits'),
    strategic_advantages_they_know: z.array(z.string()).max(3).describe('Strategic advantages'),
    recent_developments_they_lived_through: z.array(z.string()).max(3).describe('Recent developments'),
    competitive_context_understanding: z.string().min(1).describe('Competitive landscape understanding')
  });

  // Build all prompts for batch processing
  const batchPrompts = roundTypes.map((roundType) => ({
    prompt: `Generate a realistic interviewer persona for ${jobData.company_name}'s ${roundType.replace('_', ' ')} interview round.

COMPANY CONTEXT:
- Company: ${companyContext.name}
- Values: ${Array.isArray(companyContext.values) ? companyContext.values.join(', ') : (companyContext.values || 'Innovation, Excellence, Trust')}
- Recent developments: ${competitiveIntelligence.recentDevelopments.slice(0, 2).join(', ')}

COMPETITIVE INTELLIGENCE:
- Strategic advantages: ${competitiveIntelligence.strategicAdvantages.slice(0, 2).join(', ')}
- vs Competitors: ${competitiveIntelligence.roleComparison}
- Positioning: ${competitiveIntelligence.competitivePositioning}

JOB DETAILS:
- Role: ${jobData.title}
- Level: ${jobData.level}
- Company: ${jobData.company_name}

${userPersonalizationContext}

${unifiedContextPrompt}

Create a realistic persona who:
1. Works at ${jobData.company_name} and understands these competitive advantages
2. Has lived through recent company developments
3. Asks standard interview questions but recognizes competitive intelligence in answers
4. Has an appropriate seniority level for this interview round
${friendlyStyle ? `5. ADAPTS QUESTIONING STYLE: Is ${friendlyStyle} toward candidates with their concerns/background` : ''}

Return ONLY a JSON object with this structure:
{
  "name": "First Last",
  "role": "Job Title at Company",
  "tenure_years": number_between_1_and_8,
  "personality_traits": ["trait1", "trait2", "trait3"],
  "strategic_advantages_they_know": ["advantage1", "advantage2"],
  "recent_developments_they_lived_through": ["development1", "development2"],
  "competitive_context_understanding": "One sentence about how they understand company vs competitors"
}`,
    systemPrompt: undefined
  }));

  try {
    // 🚀 PARALLEL BATCH GENERATION - 5 personas in parallel with maxConcurrency: 5
    const batchStartTime = Date.now();
    const personaDataResults = await config.llmProvider?.batchStructured(
      PersonaDataSchema,
      'persona_generation',
      batchPrompts
    );
    const batchDuration = ((Date.now() - batchStartTime) / 1000).toFixed(1);
    console.log(`⏱️  [PERSONA BATCH] Generated ${personaDataResults?.length} personas in ${batchDuration}s (vs ~250s sequential)`);

    if (!personaDataResults || personaDataResults.length === 0) {
      throw new Error('No response from batch structured output generation');
    }

    // Transform batch results into personas
    const generatedPersonas: InterviewerPersona[] = personaDataResults.map((personaData, i) => ({
      id: `${roundTypes[i]}-${i + 1}`,
      round_number: i + 1,
      round_type: roundTypes[i],
      identity: {
        name: personaData.name,
        role: personaData.role,
        tenure_years: personaData.tenure_years,
        personality_traits: personaData.personality_traits
      },
      knowledge_base: {
        strategic_advantages: personaData.strategic_advantages_they_know || competitiveIntelligence.strategicAdvantages.slice(0, 2),
        recent_developments: personaData.recent_developments_they_lived_through || competitiveIntelligence.recentDevelopments.slice(0, 2),
        competitive_context: personaData.competitive_context_understanding || competitiveIntelligence.competitivePositioning
      }
    }));

    console.log(`✅ Generated ${generatedPersonas.length} personas`);

    return {
      generatedPersonas,
      currentStep: 'personas_generated',
      progress: 45
    };

  } catch (error) {
    console.error('Batch persona generation failed, falling back to sequential with fallbacks:', error);

    // Fallback: Generate personas sequentially with error handling
    const generatedPersonas: InterviewerPersona[] = [];
    for (let i = 0; i < roundTypes.length; i++) {
      const roundType = roundTypes[i];
      const fallbackPersona: InterviewerPersona = {
        id: `${roundType}-${i + 1}`,
        round_number: i + 1,
        round_type: roundType,
        identity: {
          name: getFallbackPersonaName(roundType),
          role: getFallbackPersonaRole(roundType, jobData.company_name),
          tenure_years: Math.floor(Math.random() * 5) + 2,
          personality_traits: getFallbackPersonalityTraits(roundType)
        },
        knowledge_base: {
          strategic_advantages: competitiveIntelligence.strategicAdvantages.slice(0, 2),
          recent_developments: competitiveIntelligence.recentDevelopments.slice(0, 2),
          competitive_context: competitiveIntelligence.competitivePositioning
        }
      };
      generatedPersonas.push(fallbackPersona);
    }

    console.log(`⚠️  Used ${generatedPersonas.length} fallback personas due to batch failure`);

    return {
      generatedPersonas,
      currentStep: 'personas_generated',
      progress: 45,
      warnings: [...(state.warnings || []), 'Batch persona generation failed, used fallback personas']
    };
  }
}

/**
 * Node: Generate standard questions for each persona
 * TDD GREEN: Make the failing tests pass
 */
export async function generateStandardQuestions(
  state: CurriculumState,
  config: { llmProvider?: LLMProviderService }
): Promise<Partial<CurriculumState>> {

  // ⚡ CV DEMO MODE: Skip standard questions (will be generated in generateSingleRound)
  if (state.mode === 'cv_round_only') {
    console.log('⚡ [CV DEMO] Skipping standard questions for fast demo');
    return {
      standardQuestions: {},
      currentStep: 'questions_skipped_demo'
    };
  }

  console.log('❓ Generating standard questions for each persona...');

  if (!state.generatedPersonas || state.generatedPersonas.length === 0) {
    throw new Error('No personas found in state');
  }

  // Build unified context (same for all personas)
  const unifiedContextPrompt = buildUnifiedContextPrompt(state.unifiedContext);

  // OOTB Structured Output Schema - Define once, reuse for batch
  const QuestionsArraySchema = z.object({
    questions: z.array(z.object({
      text: z.string().min(10).describe('The interview question text'),
      category: z.enum(['motivation', 'behavioral', 'cultural', 'strategic']).describe('Question category'),
      follow_ups: z.array(z.string()).min(3).max(4).describe('3-4 follow-up questions creating depth'),
      time_allocation_minutes: z.number().int().min(3).max(8).describe('Recommended time allocation')
    })).length(10).describe('Exactly 10 comprehensive interview questions')
  });

  // Build all prompts for batch processing
  const batchPrompts = state.generatedPersonas.map((persona) => {
    const personalizationContext = buildPersonalizationContext(state.userProfile, state.cvData, persona.round_type);
    const adaptationStrategy = getAdaptationStrategy(state.userProfile, state.cvData, persona.round_type);

    return {
      prompt: `Generate 10 comprehensive interview questions for a ${persona.round_type.replace('_', ' ')} interview round.

${personalizationContext}${adaptationStrategy}

${unifiedContextPrompt}

INTERVIEWER CONTEXT:
- Name: ${persona.identity.name}
- Role: ${persona.identity.role}
- Tenure: ${persona.identity.tenure_years} years
- Personality: ${persona.identity.personality_traits.join(', ')}

COMPANY KNOWLEDGE:
- Strategic advantages: ${persona.knowledge_base.strategic_advantages.join(', ')}
- Recent developments: ${persona.knowledge_base.recent_developments.join(', ')}
- Competitive context: ${persona.knowledge_base.competitive_context}

Generate questions that:
1. Are standard questions any interviewer at any company might ask
2. ${state.userProfile ? 'Address the candidate\'s specific practice areas and background constructively' : 'Are universally applicable'}
3. Can be answered well by candidates who understand the competitive context
4. Have detailed follow-up question trees (3-4 follow-ups each) that ${state.userProfile ? 'create opportunities to showcase transferable skills' : 'explore depth'}
5. Are appropriate for a ${persona.round_type.replace('_', ' ')} round
6. Create natural opportunities to use the unified context coaching strategy

Return ONLY a JSON array with this structure:
[
  {
    "text": "Question text here?",
    "category": "motivation|behavioral|cultural|strategic",
    "follow_ups": ["Follow up question 1?", "Follow up question 2?", "Follow up question 3?", "Deeper dive question?"],
    "time_allocation_minutes": 4
  }
]`,
      systemPrompt: undefined
    };
  });

  try {
    // 🚀 PARALLEL BATCH GENERATION - 5 question sets in parallel with maxConcurrency: 5
    const batchStartTime = Date.now();
    const questionsArrayResults = await config.llmProvider?.batchStructured(
      QuestionsArraySchema,
      'question_generation',
      batchPrompts
    );
    const batchDuration = ((Date.now() - batchStartTime) / 1000).toFixed(1);
    console.log(`⏱️  [QUESTIONS BATCH] Generated ${questionsArrayResults?.length} question sets in ${batchDuration}s (vs ~150s sequential)`);

    if (!questionsArrayResults || questionsArrayResults.length === 0) {
      throw new Error('No questions generated from batch structured output');
    }

    // Transform batch results into question sets
    const standardQuestionSets: Record<NonTechnicalRoundType, StandardQuestion[]> = {} as any;
    questionsArrayResults.forEach((questionsArray, index) => {
      const persona = state.generatedPersonas![index];
      const questions: StandardQuestion[] = questionsArray.questions.map((q: any, qIndex: number) => ({
        id: `${persona.round_type}-q${qIndex + 1}`,
        text: q.text,
        category: q.category as StandardQuestion['category'],
        follow_ups: q.follow_ups || [],
        time_allocation_minutes: q.time_allocation_minutes || 4
      }));
      standardQuestionSets[persona.round_type] = questions;
    });

    console.log(`✅ Generated questions for ${Object.keys(standardQuestionSets).length} rounds`);

    return {
      standardQuestionSets,
      currentStep: 'questions_generated',
      progress: 65
    };

  } catch (error) {
    console.error('Batch questions generation failed, falling back to fallback questions:', error);

    // Fallback: Use pre-defined questions for all rounds
    const standardQuestionSets: Record<NonTechnicalRoundType, StandardQuestion[]> = {} as any;
    for (const persona of state.generatedPersonas) {
      standardQuestionSets[persona.round_type] = getFallbackQuestions(persona.round_type);
    }

    console.log(`⚠️  Used fallback questions for ${Object.keys(standardQuestionSets).length} rounds due to batch failure`);

    return {
      standardQuestionSets,
      currentStep: 'questions_generated',
      progress: 65,
      warnings: [...(state.warnings || []), 'Batch questions generation failed, used fallback questions']
    };
  }
}

/**
 * Node: Generate candidate prep guides with competitive intelligence talking points
 * TDD GREEN: Make the failing tests pass
 */
export async function generateCandidatePrep(
  state: CurriculumState,
  config: { llmProvider?: LLMProviderService }
): Promise<Partial<CurriculumState>> {

  // ⚡ CV DEMO MODE: Skip prep guides (will be created in generateSingleRound)
  if (state.mode === 'cv_round_only') {
    console.log('⚡ [CV DEMO] Skipping prep guides for fast demo');
    return {
      candidatePrepGuides: {},
      currentStep: 'prep_guides_skipped_demo'
    };
  }

  console.log('📚 Generating candidate prep guides with competitive intelligence...');

  if (!state.competitiveIntelligence || !state.standardQuestionSets || !state.jobData) {
    throw new Error('Missing required state for candidate prep generation');
  }

  const { competitiveIntelligence, standardQuestionSets, jobData } = state;

  // OOTB Structured Output Schema for prep guides
  const PrepGuideSchema = z.object({
    strategic_advantages_talking_points: z.array(z.object({
      advantage: z.string().describe('Strategic advantage'),
      how_to_weave_in: z.string().describe('How to naturally mention this'),
      example_response: z.string().describe('Sample response showing natural integration')
    })).max(3).describe('Strategic advantages talking points'),
    recent_developments_talking_points: z.array(z.object({
      development: z.string().describe('Recent development'),
      relevance_to_role: z.string().describe('Why this matters for this role'),
      conversation_starters: z.array(z.string()).max(3).describe('Natural conversation starters')
    })).max(3).describe('Recent developments talking points'),
    great_answers_sound_like: z.array(z.string()).max(5).describe('What exceptional answers demonstrate'),
    company_knowledge_demonstration: z.array(z.string()).max(5).describe('Ways to show deep understanding'),
    standard_questions_prep: z.array(z.object({
      question: z.string().describe('Standard interview question'),
      why_asked: z.string().describe('Why interviewers ask this question'),
      approach: z.string().describe('How to approach answering'),
      key_points: z.array(z.string()).max(4).describe('Key points to cover')
    })).max(5).describe('Standard questions preparation guide')
  });

  // Build all prompts for batch processing
  const roundTypes = Object.keys(standardQuestionSets) as NonTechnicalRoundType[];
  const batchPrompts = roundTypes.map((roundType) => {
    const questions = standardQuestionSets[roundType];
    return {
      prompt: `Create candidate preparation guidance for ${roundType.replace('_', ' ')} interview questions.

JOB CONTEXT:
- Role: ${jobData.title} at ${jobData.company_name}
- Level: ${jobData.level}

COMPETITIVE INTELLIGENCE:
- Strategic advantages: ${competitiveIntelligence.strategicAdvantages.join(', ')}
- Recent developments: ${competitiveIntelligence.recentDevelopments.join(', ')}
- Competitive positioning: ${competitiveIntelligence.competitivePositioning}

SAMPLE QUESTIONS FOR THIS ROUND:
${questions.slice(0, 3).map(q => `- ${q.text}`).join('\n')}

Generate comprehensive preparation guidance that includes:
1. Talking points for using competitive intelligence in answers
2. Recognition training on what great answers look like
3. Standard questions preparation guide with specific questions, why they're asked, how to approach them, and key points to cover

Focus on helping candidates:
- Use competitive intelligence to give exceptional answers to standard questions
- Demonstrate deep company understanding without sounding coached
- Connect their experience to the company's unique competitive position`,
      systemPrompt: undefined
    };
  });

  try {
    // 🚀 PARALLEL BATCH GENERATION - 5 prep guides in parallel with maxConcurrency: 5
    const batchStartTime = Date.now();
    const prepGuideResults = await config.llmProvider?.batchStructured(
      PrepGuideSchema,
      'candidate_prep',
      batchPrompts
    );
    const batchDuration = ((Date.now() - batchStartTime) / 1000).toFixed(1);
    console.log(`⏱️  [PREP GUIDES BATCH] Generated ${prepGuideResults?.length} prep guides in ${batchDuration}s (vs ~125s sequential)`);

    if (!prepGuideResults || prepGuideResults.length === 0) {
      throw new Error('No prep guides generated from batch structured output');
    }

    // Transform batch results into prep guides
    const candidatePrepGuides: Record<NonTechnicalRoundType, CandidatePrep> = {} as any;
    prepGuideResults.forEach((prepData, index) => {
      const roundType = roundTypes[index];
      candidatePrepGuides[roundType] = {
        ci_talking_points: {
          strategic_advantages: prepData.strategic_advantages_talking_points || [],
          recent_developments: prepData.recent_developments_talking_points || []
        },
        recognition_training: {
          what_great_answers_sound_like: prepData.great_answers_sound_like || [],
          how_to_demonstrate_company_knowledge: prepData.company_knowledge_demonstration || []
        },
        standard_questions_prep: prepData.standard_questions_prep || []
      };
    });

    console.log(`✅ Generated prep guides for ${Object.keys(candidatePrepGuides).length} rounds`);

    return {
      candidatePrepGuides,
      currentStep: 'prep_guides_generated',
      progress: 80
    };

  } catch (error) {
    console.error('Batch prep guides generation failed, falling back to fallback guides:', error);

    // Fallback: Use pre-defined prep guides for all rounds
    const candidatePrepGuides: Record<NonTechnicalRoundType, CandidatePrep> = {} as any;
    for (const roundType of roundTypes) {
      candidatePrepGuides[roundType] = getFallbackPrepGuide(
        competitiveIntelligence,
        roundType
      );
    }

    console.log(`⚠️  Used fallback prep guides for ${Object.keys(candidatePrepGuides).length} rounds due to batch failure`);

    return {
      candidatePrepGuides,
      currentStep: 'prep_guides_generated',
      progress: 80,
      warnings: [...(state.warnings || []), 'Batch prep guides generation failed, used fallback guides']
    };
  }
}

// Helper function to extract user context (backwards compatible)
function getUserContext(state: CurriculumState): {
  hasProfile: boolean;
  contextText: string;
  adaptationStyle: string;
} {
  if (!state.userProfile) {
    return { hasProfile: false, contextText: '', adaptationStyle: 'professional and balanced' };
  }

  // NEW FORMAT: Prefer human-centered fields
  if (state.userProfile.excitement || state.userProfile.concerns) {
    let contextText = '';

    if (state.userProfile.excitement) {
      contextText += `- EXCITEMENT: ${state.userProfile.excitement}\n`;
    }
    if (state.userProfile.concerns) {
      contextText += `- CONCERNS: ${state.userProfile.concerns}\n`;
    }
    if (state.userProfile.weakAreas?.length) {
      contextText += `- WEAK AREAS: ${state.userProfile.weakAreas.join(', ')}\n`;
    }
    if (state.userProfile.backgroundContext) {
      contextText += `- BACKGROUND: ${state.userProfile.backgroundContext}\n`;
    }
    if (state.userProfile.preparationGoals) {
      contextText += `- GOALS: ${state.userProfile.preparationGoals}\n`;
    }

    // AI-powered adaptation style
    const adaptationStyle = getAdaptiveStyle(state.userProfile.concerns || '', state.userProfile.excitement || '');

    return { hasProfile: true, contextText, adaptationStyle };
  }

  // Legacy format support (simplified)
  if (state.userProfile.focusArea || state.userProfile.concern) {
    const contextText = `- Focus Area: ${state.userProfile.focusArea?.replace('_', ' ') || 'general'} - candidate wants to practice this
- Main Concern: ${state.userProfile.concern?.replace('_', ' ') || 'general preparation'} - candidate is worried about this
${state.userProfile.background ? `- Background: ${state.userProfile.background}` : ''}`;

    return { hasProfile: true, contextText, adaptationStyle: 'professional and supportive' };
  }

  return { hasProfile: false, contextText: '', adaptationStyle: 'professional and balanced' };
}

// AI-powered adaptation for human-centered input
function getAdaptiveStyle(concerns: string, excitement: string): string {
  // Simple keyword matching for now - could be enhanced with LLM
  const lowercaseConcerns = concerns.toLowerCase();
  const lowercaseExcitement = excitement.toLowerCase();

  let style = 'professional and ';

  // Adapt based on concerns
  if (lowercaseConcerns.includes('nervous') || lowercaseConcerns.includes('worried') || lowercaseConcerns.includes('anxious')) {
    style += 'reassuring, ';
  }
  if (lowercaseConcerns.includes('inexperience') || lowercaseConcerns.includes('new to') || lowercaseConcerns.includes('junior')) {
    style += 'educational, ';
  }
  if (lowercaseConcerns.includes('culture') || lowercaseConcerns.includes('fit')) {
    style += 'welcoming, ';
  }

  // Adapt based on excitement
  if (lowercaseExcitement.includes('technology') || lowercaseExcitement.includes('innovation')) {
    style += 'technically curious, ';
  }
  if (lowercaseExcitement.includes('growth') || lowercaseExcitement.includes('opportunity')) {
    style += 'development-focused, ';
  }

  return style + 'conversational';
}

// Legacy helper function removed - using enhanced version above

// Fallback helper functions
function getFallbackPersonaName(roundType: NonTechnicalRoundType): string {
  const names = {
    recruiter_screen: 'Sarah Chen',
    behavioral_deep_dive: 'Michael Rodriguez',
    culture_values_alignment: 'Emma Thompson',
    strategic_role_discussion: 'David Kim',
    executive_final: 'Lisa Johnson'
  };
  return names[roundType];
}

function getFallbackPersonaRole(roundType: NonTechnicalRoundType, companyName: string): string {
  const roles = {
    recruiter_screen: `Global Talent Recruiter at ${companyName}`,
    behavioral_deep_dive: `Senior Manager at ${companyName}`,
    culture_values_alignment: `Team Lead at ${companyName}`,
    strategic_role_discussion: `Director at ${companyName}`,
    executive_final: `VP at ${companyName}`
  };
  return roles[roundType];
}

function getFallbackPersonalityTraits(roundType: NonTechnicalRoundType): string[] {
  const traits = {
    recruiter_screen: ['friendly', 'thorough', 'efficient'],
    behavioral_deep_dive: ['analytical', 'detail-oriented', 'patient'],
    culture_values_alignment: ['collaborative', 'values-driven', 'perceptive'],
    strategic_role_discussion: ['strategic', 'business-focused', 'forward-thinking'],
    executive_final: ['decisive', 'visionary', 'leadership-focused']
  };
  return traits[roundType];
}

function getFallbackQuestions(roundType: NonTechnicalRoundType): StandardQuestion[] {
  const questionSets = {
    recruiter_screen: [
      { text: 'Why are you interested in this role?', category: 'motivation' as const },
      { text: 'What do you know about our company?', category: 'motivation' as const },
      { text: 'Tell me about your background.', category: 'behavioral' as const },
      { text: 'What attracted you to apply for this position?', category: 'motivation' as const },
      { text: 'How does this role align with your career goals?', category: 'strategic' as const },
      { text: 'What are your salary expectations?', category: 'strategic' as const },
      { text: 'What questions do you have about the company?', category: 'cultural' as const },
      { text: 'When would you be able to start?', category: 'strategic' as const },
      { text: 'Tell me about your current role and responsibilities.', category: 'behavioral' as const },
      { text: 'What motivates you in your work?', category: 'motivation' as const }
    ],
    behavioral_deep_dive: [
      { text: 'Tell me about a challenging project you worked on.', category: 'behavioral' as const },
      { text: 'Describe a time you had to work with a difficult team member.', category: 'behavioral' as const },
      { text: 'Give me an example of when you had to meet a tight deadline.', category: 'behavioral' as const },
      { text: 'Tell me about a time you failed at something.', category: 'behavioral' as const },
      { text: 'Describe a situation where you had to learn something new quickly.', category: 'behavioral' as const },
      { text: 'Tell me about a time you disagreed with your manager.', category: 'behavioral' as const },
      { text: 'Give me an example of when you went above and beyond.', category: 'behavioral' as const },
      { text: 'Describe a time you had to give difficult feedback.', category: 'behavioral' as const },
      { text: 'Tell me about a time you made a mistake. How did you handle it?', category: 'behavioral' as const },
      { text: 'Describe a situation where you had to influence someone without authority.', category: 'behavioral' as const }
    ],
    culture_values_alignment: [
      { text: 'What type of work environment brings out your best?', category: 'cultural' as const },
      { text: 'How do you handle conflict in the workplace?', category: 'cultural' as const },
      { text: 'What values are most important to you in a workplace?', category: 'cultural' as const },
      { text: 'Describe your ideal manager and management style.', category: 'cultural' as const },
      { text: 'How do you prefer to receive feedback?', category: 'cultural' as const },
      { text: 'What does work-life balance mean to you?', category: 'cultural' as const },
      { text: 'How do you stay motivated during challenging times?', category: 'cultural' as const },
      { text: 'What role do you typically play in team settings?', category: 'cultural' as const },
      { text: 'How do you approach diversity and inclusion in the workplace?', category: 'cultural' as const },
      { text: 'What attracts you to our company culture specifically?', category: 'cultural' as const }
    ],
    strategic_role_discussion: [
      { text: 'How do you see this role contributing to company success?', category: 'strategic' as const },
      { text: 'What would you focus on in your first 90 days?', category: 'strategic' as const },
      { text: 'How do you stay current with industry trends?', category: 'strategic' as const },
      { text: 'What do you think are the biggest challenges facing our industry?', category: 'strategic' as const },
      { text: 'How would you measure success in this role?', category: 'strategic' as const },
      { text: 'What ideas do you have for improving our current processes?', category: 'strategic' as const },
      { text: 'How do you prioritize competing demands?', category: 'strategic' as const },
      { text: 'What trends do you think will impact our business?', category: 'strategic' as const },
      { text: 'How would you approach building relationships with key stakeholders?', category: 'strategic' as const },
      { text: 'What questions would you ask to better understand our customers?', category: 'strategic' as const }
    ],
    executive_final: [
      { text: 'What is your long-term vision for your career?', category: 'strategic' as const },
      { text: 'How do you define leadership?', category: 'strategic' as const },
      { text: 'What would you want to accomplish in this role?', category: 'strategic' as const },
      { text: 'How do you approach decision-making under uncertainty?', category: 'strategic' as const },
      { text: 'What questions do you have about our company strategy?', category: 'strategic' as const },
      { text: 'How would you contribute to our company culture?', category: 'cultural' as const },
      { text: 'What concerns do you have about this role or company?', category: 'strategic' as const },
      { text: 'Why should we hire you over other candidates?', category: 'motivation' as const },
      { text: 'How do you handle high-pressure situations?', category: 'behavioral' as const },
      { text: 'What would make you successful in this position?', category: 'strategic' as const }
    ]
  };

  const questions = questionSets[roundType] || questionSets.recruiter_screen;

  return questions.map((q, index) => ({
    id: `${roundType}-fallback-q${index + 1}`,
    text: q.text,
    category: q.category,
    follow_ups: [
      'Can you tell me more about that?',
      'What was the outcome?',
      'How did that experience change your approach?',
      'What would you do differently next time?'
    ],
    time_allocation_minutes: 5
  }));
}

function getFallbackPrepGuide(
  competitiveIntel: any,
  roundType: NonTechnicalRoundType
): CandidatePrep {
  return {
    ci_talking_points: {
      strategic_advantages: competitiveIntel.strategicAdvantages.slice(0, 3).map((advantage: string) => ({
        advantage,
        how_to_weave_in: `Reference this advantage when discussing your interest in the company`,
        example_response: `I'm excited about this opportunity because of ${advantage.toLowerCase()}`
      })),
      recent_developments: competitiveIntel.recentDevelopments.slice(0, 2).map((development: string) => ({
        development,
        relevance_to_role: 'This development creates new challenges and opportunities',
        conversation_starters: [`I noticed ${development}`, `How has ${development} impacted the team?`]
      }))
    },
    recognition_training: {
      what_great_answers_sound_like: [
        'Demonstrates specific knowledge of company competitive position',
        'Shows understanding of recent company developments'
      ],
      how_to_demonstrate_company_knowledge: [
        'Reference specific competitive advantages naturally',
        'Show awareness of recent strategic developments'
      ]
    },
    standard_questions_prep: [
      {
        question: 'Tell me about yourself',
        why_asked: 'To understand your background and communication style',
        approach: 'Use a structured narrative connecting your experience to this role',
        key_points: ['Current role', 'Key achievements', 'Why this company', 'Career goals']
      },
      {
        question: 'Why are you interested in this role?',
        why_asked: 'To assess motivation and company knowledge',
        approach: 'Connect company advantages to your career goals',
        key_points: ['Company strengths', 'Role alignment', 'Growth opportunity', 'Cultural fit']
      },
      {
        question: 'What are your strengths?',
        why_asked: 'To evaluate self-awareness and role fit',
        approach: 'Highlight strengths relevant to this specific role',
        key_points: ['Technical skills', 'Soft skills', 'Relevant examples', 'Impact on team']
      }
    ]
  };
}

/**
 * Build personalized context prompt from unified context engine output
 */
function buildUnifiedContextPrompt(unifiedContext: any): string {
  if (!unifiedContext) return '';

  return `
PERSONALIZED COACHING STRATEGY (use this to adapt your persona):

STRENGTH AMPLIFIERS - Help candidate showcase these:
${unifiedContext.strengthAmplifiers?.map((amp: string) => `• ${amp}`).join('\n') || '• Standard professional strengths'}

GAP BRIDGES - Address these positively:
${unifiedContext.gapBridges?.map((bridge: string) => `• ${bridge}`).join('\n') || '• Standard skill development areas'}

CONFIDENCE BUILDERS - Frame these positively:
${unifiedContext.confidenceBuilders?.map((builder: string) => `• ${builder}`).join('\n') || '• Growth mindset opportunities'}

CI INTEGRATION STRATEGY:
${unifiedContext.ciIntegrationStrategy || 'Use competitive intelligence naturally in conversation'}

PERSONALIZED APPROACH:
${unifiedContext.personalizedApproach || 'Professional and supportive interview style'}

ADAPT YOUR PERSONA: Create a persona that naturally recognizes and encourages these elements during the interview.
`;
}
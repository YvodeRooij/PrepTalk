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

  const generatedPersonas: InterviewerPersona[] = [];

  for (let i = 0; i < roundTypes.length; i++) {
    const roundType = roundTypes[i];

    const personaPrompt = `Generate a realistic interviewer persona for ${jobData.company_name}'s ${roundType.replace('_', ' ')} interview round.

COMPANY CONTEXT:
- Company: ${companyContext.name}
- Values: ${companyContext.values.join(', ')}
- Recent developments: ${competitiveIntelligence.recentDevelopments.slice(0, 2).join(', ')}

COMPETITIVE INTELLIGENCE:
- Strategic advantages: ${competitiveIntelligence.strategicAdvantages.slice(0, 2).join(', ')}
- vs Competitors: ${competitiveIntelligence.roleComparison}
- Positioning: ${competitiveIntelligence.competitivePositioning}

JOB DETAILS:
- Role: ${jobData.title}
- Level: ${jobData.level}
- Company: ${jobData.company_name}

${getUserPersonalizationContext(state.userProfile, state.cvData)}

Create a realistic persona who:
1. Works at ${jobData.company_name} and understands these competitive advantages
2. Has lived through recent company developments
3. Asks standard interview questions but recognizes competitive intelligence in answers
4. Has an appropriate seniority level for this interview round
${state.userProfile ? `5. ADAPTS QUESTIONING STYLE: Is ${getFriendlyStyle(state.userProfile)} toward candidates with their concerns/background` : ''}

Return ONLY a JSON object with this structure:
{
  "name": "First Last",
  "role": "Job Title at Company",
  "tenure_years": number_between_1_and_8,
  "personality_traits": ["trait1", "trait2", "trait3"],
  "strategic_advantages_they_know": ["advantage1", "advantage2"],
  "recent_developments_they_lived_through": ["development1", "development2"],
  "competitive_context_understanding": "One sentence about how they understand company vs competitors"
}`;

    try {
      // OOTB Structured Output - No custom JSON parsing needed
      const PersonaDataSchema = z.object({
        name: z.string().min(1).describe('Full name of the interviewer'),
        role: z.string().min(1).describe('Job title and company'),
        tenure_years: z.number().int().min(1).max(15).describe('Years at company'),
        personality_traits: z.array(z.string()).min(2).max(5).describe('Key personality traits'),
        strategic_advantages_they_know: z.array(z.string()).max(3).describe('Strategic advantages'),
        recent_developments_they_lived_through: z.array(z.string()).max(3).describe('Recent developments'),
        competitive_context_understanding: z.string().min(1).describe('Competitive landscape understanding')
      });

      const personaData = await config.llmProvider?.generateStructured(
        PersonaDataSchema,
        'persona_generation',
        personaPrompt
      );

      if (!personaData) {
        throw new Error('No response from structured output generation');
      }

      const persona: InterviewerPersona = {
        id: `${roundType}-${i + 1}`,
        round_number: i + 1,
        round_type: roundType,
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
      };

      generatedPersonas.push(persona);

    } catch (error) {
      console.error(`Failed to generate persona for ${roundType}:`, error);

      // Fallback persona generation if LLM fails
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
  }

  console.log(`✅ Generated ${generatedPersonas.length} personas`);

  return {
    generatedPersonas,
    currentStep: 'personas_generated',
    progress: 45
  };
}

/**
 * Node: Generate standard questions for each persona
 * TDD GREEN: Make the failing tests pass
 */
export async function generateStandardQuestions(
  state: CurriculumState,
  config: { llmProvider?: LLMProviderService }
): Promise<Partial<CurriculumState>> {

  console.log('❓ Generating standard questions for each persona...');

  if (!state.generatedPersonas || state.generatedPersonas.length === 0) {
    throw new Error('No personas found in state');
  }

  const standardQuestionSets: Record<NonTechnicalRoundType, StandardQuestion[]> = {} as any;

  for (const persona of state.generatedPersonas) {
    // Build personalization context for adaptive question generation
    const personalizationContext = buildPersonalizationContext(state.userProfile, state.cvData, persona.round_type);
    const adaptationStrategy = getAdaptationStrategy(state.userProfile, state.cvData, persona.round_type);

    const questionsPrompt = `Generate 6 standard interview questions for a ${persona.round_type.replace('_', ' ')} interview round.

${personalizationContext}${adaptationStrategy}

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
4. Have natural follow-up questions that ${state.userProfile ? 'create opportunities to showcase transferable skills' : 'explore depth'}
5. Are appropriate for a ${persona.round_type.replace('_', ' ')} round

Return ONLY a JSON array with this structure:
[
  {
    "text": "Question text here?",
    "category": "motivation|behavioral|cultural|strategic",
    "follow_ups": ["Follow up question 1?", "Follow up question 2?"],
    "time_allocation_minutes": 4
  }
]`;

    try {
      // OOTB Structured Output for Questions
      const QuestionsArraySchema = z.array(z.object({
        text: z.string().min(10).describe('The interview question text'),
        category: z.enum(['motivation', 'behavioral', 'cultural', 'strategic']).describe('Question category'),
        follow_ups: z.array(z.string()).max(3).describe('Follow-up questions'),
        time_allocation_minutes: z.number().int().min(2).max(10).describe('Recommended time allocation')
      })).min(4).max(8).describe('Array of interview questions');

      const questionsArray = await config.llmProvider?.generateStructured(
        QuestionsArraySchema,
        'question_generation',
        questionsPrompt
      );

      if (!questionsArray || questionsArray.length === 0) {
        throw new Error('No questions generated from structured output');
      }

      const questions: StandardQuestion[] = questionsArray.map((q: any, index: number) => ({
        id: `${persona.round_type}-q${index + 1}`,
        text: q.text,
        category: q.category as StandardQuestion['category'],
        follow_ups: q.follow_ups || [],
        time_allocation_minutes: q.time_allocation_minutes || 4
      }));

      standardQuestionSets[persona.round_type] = questions;

    } catch (error) {
      console.error(`Failed to generate questions for ${persona.round_type}:`, error);

      // Fallback standard questions
      standardQuestionSets[persona.round_type] = getFallbackQuestions(persona.round_type);
    }
  }

  console.log(`✅ Generated questions for ${Object.keys(standardQuestionSets).length} rounds`);

  return {
    standardQuestionSets,
    currentStep: 'questions_generated',
    progress: 65
  };
}

/**
 * Node: Generate candidate prep guides with competitive intelligence talking points
 * TDD GREEN: Make the failing tests pass
 */
export async function generateCandidatePrep(
  state: CurriculumState,
  config: { llmProvider?: LLMProviderService }
): Promise<Partial<CurriculumState>> {

  console.log('📚 Generating candidate prep guides with competitive intelligence...');

  if (!state.competitiveIntelligence || !state.standardQuestionSets || !state.jobData) {
    throw new Error('Missing required state for candidate prep generation');
  }

  const { competitiveIntelligence, standardQuestionSets, jobData } = state;
  const candidatePrepGuides: Record<NonTechnicalRoundType, CandidatePrep> = {} as any;

  for (const [roundType, questions] of Object.entries(standardQuestionSets)) {
    const prepPrompt = `Create candidate preparation guidance for ${roundType.replace('_', ' ')} interview questions.

JOB CONTEXT:
- Role: ${jobData.title} at ${jobData.company_name}
- Level: ${jobData.level}

COMPETITIVE INTELLIGENCE:
- Strategic advantages: ${competitiveIntelligence.strategicAdvantages.join(', ')}
- Recent developments: ${competitiveIntelligence.recentDevelopments.join(', ')}
- Competitive positioning: ${competitiveIntelligence.competitivePositioning}

SAMPLE QUESTIONS:
${questions.slice(0, 3).map(q => `- ${q.text}`).join('\n')}

Generate preparation guidance that helps candidates:
1. Use competitive intelligence to give exceptional answers to standard questions
2. Demonstrate deep company understanding without sounding coached
3. Connect their experience to the company's unique competitive position

Return ONLY a JSON object:
{
  "strategic_advantages_talking_points": [
    {
      "advantage": "First strategic advantage",
      "how_to_weave_in": "How to naturally mention this in answers",
      "example_response": "Sample response showing natural integration"
    }
  ],
  "recent_developments_talking_points": [
    {
      "development": "Recent development",
      "relevance_to_role": "Why this matters for this role",
      "conversation_starters": ["How to bring this up naturally", "Another way to reference this"]
    }
  ],
  "great_answers_sound_like": ["What exceptional answers demonstrate", "Key indicators of company knowledge"],
  "company_knowledge_demonstration": ["How to show deep understanding", "Ways to differentiate from other candidates"]
}`;

    try {
      const llmProvider = config.llmProvider;
      const prepResponse = await llmProvider?.generateContent(
        'candidate_prep',
        prepPrompt,
        { format: 'json' }
      );

      if (!prepResponse) {
        throw new Error('No response from LLM provider for prep guide');
      }

      const prepData = JSON.parse(prepResponse.content);

      candidatePrepGuides[roundType as NonTechnicalRoundType] = {
        ci_talking_points: {
          strategic_advantages: prepData.strategic_advantages_talking_points || [],
          recent_developments: prepData.recent_developments_talking_points || []
        },
        recognition_training: {
          what_great_answers_sound_like: prepData.great_answers_sound_like || [],
          how_to_demonstrate_company_knowledge: prepData.company_knowledge_demonstration || []
        }
      };

    } catch (error) {
      console.error(`Failed to generate prep guide for ${roundType}:`, error);

      // Fallback prep guide
      candidatePrepGuides[roundType as NonTechnicalRoundType] = getFallbackPrepGuide(
        competitiveIntelligence,
        roundType as NonTechnicalRoundType
      );
    }
  }

  console.log(`✅ Generated prep guides for ${Object.keys(candidatePrepGuides).length} rounds`);

  return {
    candidatePrepGuides,
    currentStep: 'prep_guides_generated',
    progress: 80
  };
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
      { text: 'Tell me about your background.', category: 'behavioral' as const }
    ],
    behavioral_deep_dive: [
      { text: 'Tell me about a challenging project you worked on.', category: 'behavioral' as const },
      { text: 'Describe a time you had to work with a difficult team member.', category: 'behavioral' as const }
    ],
    // Add more fallback questions as needed...
  };

  const questions = questionSets[roundType] || questionSets.recruiter_screen;

  return questions.map((q, index) => ({
    id: `${roundType}-fallback-q${index + 1}`,
    text: q.text,
    category: q.category,
    follow_ups: ['Can you tell me more about that?', 'What was the outcome?'],
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
    }
  };
}
// Curriculum Generation Nodes - Structure, rounds, and quality
// Pure functions for curriculum creation

import { GoogleGenerativeAI } from '@google/generative-ai';
import { Command } from '@langchain/langgraph';
import { CurriculumState } from '../state';
import { CurriculumStructure, GeneratedRound, Question, RoundDefinition, RoundTopic } from '../types';

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

// Initialize lazily to ensure env vars are loaded
let genAI: GoogleGenerativeAI | null = null;

function getGenAI(): GoogleGenerativeAI {
  if (!genAI) {
    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) {
      throw new Error('GOOGLE_AI_API_KEY is not set in environment variables');
    }
    genAI = new GoogleGenerativeAI(apiKey);
  }
  return genAI;
}

/**
 * Node: Design curriculum structure based on research
 */
export async function designStructure(state: CurriculumState): Promise<Partial<CurriculumState>> {
  const model = getGenAI().getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.4,
    }
  });

  if (!state.jobData || !state.rolePatterns) {
    return {
      errors: ['Missing required data for structure design'],
    };
  }

  const result = await model.generateContent([
    {
      text: `Design interview curriculum structure for:

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
    }
  ]);

  const structure = JSON.parse(result.response.text()) as StructureResponse;
  const rounds = structure.rounds ?? [];
  const estimatedTotalMinutes = rounds.reduce((sum, round) => sum + (round.duration_minutes ?? 0), 0);

  return {
    structure: {
      job_id: state.jobData.id || '',
      ...structure,
      estimated_total_minutes: estimatedTotalMinutes,
      generation_strategy: 'comprehensive',
      refinement_iterations: state.refinementAttempts || 0,
    } as CurriculumStructure,
  };
}

/**
 * Node: Generate detailed content for each round
 */
export async function generateRounds(state: CurriculumState): Promise<Partial<CurriculumState>> {
  const model = getGenAI().getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.6,
    }
  });

  if (!state.structure || !state.jobData) {
    return {
      errors: ['Missing structure or job data for round generation'],
    };
  }

  const rounds: GeneratedRound[] = [];

  for (const roundDef of state.structure.rounds) {
    const result = await model.generateContent([
      {
        text: `Generate detailed interview round content:

        Round: ${roundDef.title} (${roundDef.type})
        Duration: ${roundDef.duration_minutes} minutes
        Focus: ${roundDef.focus_areas.join(', ')}
        Job: ${state.jobData.title} at ${state.companyContext?.name}

        Return JSON with:
        - interviewer_persona: { name, role, personality, communication_style, goal }
        - topics: array of { topic, questions, evaluation_points }
        - evaluation_criteria: array of { criterion, weight, rubric }
        - opening_script: string
        - closing_script: string`
      }
    ]);

    const content = JSON.parse(result.response.text()) as RoundContentResponse;
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

    rounds.push({
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
    } as GeneratedRound);
  }

  return { rounds };
}

/**
 * Node: Evaluate quality and route with Command (v1.0 pattern)
 */
export async function evaluateQualityWithRouting(state: CurriculumState): Promise<Command> {
  const model = getGenAI().getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.3,
    }
  });

  if (!state.rounds || !state.jobData) {
    return new Command({
      update: { errors: ['Missing rounds for evaluation'] },
      goto: 'save_curriculum', // Skip to save with error
    });
  }

  const result = await model.generateContent([
    {
      text: `Evaluate interview curriculum quality:

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
    }
  ]);

  const evaluation = JSON.parse(result.response.text());
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
export async function refineRounds(state: CurriculumState): Promise<Partial<CurriculumState>> {
  // Re-generate rounds with higher temperature for variety
  return generateRounds(state);
}
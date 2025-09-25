// Research Phase Nodes - Job parsing and role analysis
// Pure functions that transform state

import { GoogleGenerativeAI } from '@google/generative-ai';
import { CurriculumState } from '../state';
import { ParsedJob, RolePattern } from '../types';

// Initialize once at module level
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!);

/**
 * Node: Parse job from discovered sources or direct URL
 */
export async function parseJob(state: CurriculumState): Promise<Partial<CurriculumState>> {
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.3,
    }
  });

  // Use the best source data we have
  const bestSource = state.discoveredSources
    .filter(s => s.validation?.isUseful)
    .sort((a, b) => b.trustScore - a.trustScore)[0];

  if (!bestSource?.data) {
    return {
      errors: ['No valid job data to parse'],
    };
  }

  try {
    const result = await model.generateContent([
      {
        text: `Extract structured job information from this data:

        ${JSON.stringify(bestSource.data)}

        Return ParsedJob JSON with:
        - title: exact job title
        - company_name: company name
        - level: intern/entry/junior/mid/senior/lead/principal/staff/executive
        - responsibilities: array of key responsibilities
        - required_skills: array of required skills
        - preferred_skills: array of nice-to-haves
        - experience_level: years of experience
        - location: job location
        - work_arrangement: onsite/remote/hybrid`
      }
    ]);

    const jobData = JSON.parse(result.response.text());

    return {
      jobData: {
        ...jobData,
        source_url: bestSource.url,
        raw_description: '',
        parsing_confidence: bestSource.validation?.confidence || 0.7,
        extraction_timestamp: new Date().toISOString(),
      } as ParsedJob,
    };
  } catch (error) {
    return {
      errors: [`Failed to parse job: ${error instanceof Error ? error.message : 'Unknown'}`],
    };
  }
}

/**
 * Node: Analyze role patterns based on job and company data
 */
export async function analyzeRole(state: CurriculumState): Promise<Partial<CurriculumState>> {
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.5,
    }
  });

  if (!state.jobData || !state.companyContext) {
    return {
      errors: ['Missing job or company data for role analysis'],
    };
  }

  const result = await model.generateContent([
    {
      text: `Analyze this ${state.jobData.level} ${state.jobData.title} role:

      Company: ${state.companyContext.name}
      Size: ${state.companyContext.values.join(', ')}
      Requirements: ${state.jobData.required_skills.join(', ')}

      Determine:
      - typical_rounds: expected number of interview rounds
      - focus_areas: key topics to cover
      - interview_formats: expected formats (coding, system design, etc.)

      Return as RolePattern JSON.`
    }
  ]);

  const patterns = JSON.parse(result.response.text());

  return {
    rolePatterns: {
      similar_roles: [],
      typical_rounds: patterns.typical_rounds || 4,
      focus_areas: patterns.focus_areas || [],
      interview_formats: patterns.interview_formats || [],
    } as RolePattern,
  };
}
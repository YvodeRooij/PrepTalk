// Research Phase Nodes - Job parsing and role analysis
// Pure functions that transform state

import { GoogleGenerativeAI } from '@google/generative-ai';
import { CurriculumState } from '../state';
import { ParsedJob, RolePattern } from '../types';

// Build URL context tool configuration
function hasValidUrls(urls: string[] | undefined): boolean {
  if (!urls || urls.length === 0) return false;
  return urls.some(url => url && url.startsWith('http'));
}

// Format URLs for inclusion in prompt
function formatUrlsForPrompt(urls: string[]): string {
  const validUrls = urls.filter(url => url && url.startsWith('http'));
  if (validUrls.length === 0) return '';
  return `\n\nAnalyze content from these URLs:\n${validUrls.map(url => `- ${url}`).join('\n')}`;
}

function safeParseJson<T>(raw: string, context: string): T {
  const text = raw
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/```$/i, '')
    .trim();

  try {
    return JSON.parse(text) as T;
  } catch (error) {
    throw new Error(`Failed to parse JSON for ${context}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

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
 * Node: Parse job from discovered sources or direct URL
 */
export async function parseJob(state: CurriculumState): Promise<Partial<CurriculumState>> {
  const model = getGenAI().getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: {
      temperature: 0.3,
      // Note: Can't use responseMimeType with tools
    }
  });

  // Use the best source data we have
  const bestSource = state.discoveredSources
    .filter(s => s.validation?.isUseful)
    .sort((a, b) => b.trustScore - a.trustScore)[0];

  if (!bestSource) {
    return {
      errors: ['No valid job source found'],
    };
  }

  // Check if we have data OR a URL we can fetch
  const hasData = bestSource.data !== null && bestSource.data !== undefined;
  const hasUrl = bestSource.url && bestSource.url.startsWith('http');

  if (!hasData && !hasUrl) {
    return {
      errors: ['No valid job data or URL to parse'],
    };
  }

  try {
    const jobUrl = bestSource.url;
    const useUrlContext = hasUrl && !hasData; // Only use URL context if no data available
    const useStructuredData = hasData;

    let prompt = `You are a precise recruiting analyst. Extract the canonical job details from ${useUrlContext ? 'the job posting at the provided URL' : 'the provided structured data'}.

${useStructuredData ? `Structured data: ${JSON.stringify(bestSource.data)}` : ''}

Return ONLY a valid JSON object (no markdown, no explanation) with these exact fields:
{
  "title": "exact job title from posting",
  "company_name": "hiring company",
  "level": "one of: intern/entry/junior/mid/senior/lead/principal/staff/executive",
  "responsibilities": ["array", "of", "key", "responsibilities"],
  "required_skills": ["array", "of", "must-have", "skills"],
  "preferred_skills": ["array", "of", "nice-to-have", "skills"],
  "experience_level": "years of experience as string",
  "location": "primary job location",
  "work_arrangement": "one of: onsite/remote/hybrid"
}`;

    // Add URL to prompt if using URL context
    if (useUrlContext) {
      prompt += `\n\nJob posting URL to analyze: ${jobUrl}`;
    }

    // Build request with URL context tool if needed
    const request: any = {
      contents: [{
        role: 'user',
        parts: [{ text: prompt }]
      }]
    };

    // Add URL context tool if we have a valid URL
    if (useUrlContext) {
      request.tools = [{ url_context: {} }];
    }

    const result = await model.generateContent(request);

    const jobData = safeParseJson<ParsedJob>(result.response.text(), 'job parsing');

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
  const model = getGenAI().getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: {
      // Don't use JSON mode when using URL context
      temperature: 0.5,
    }
  });

  if (!state.jobData || !state.companyContext) {
    return {
      errors: ['Missing job or company data for role analysis'],
    };
  }

  try {
    const job = state.jobData;
    const company = state.companyContext;
    const candidateUrls = [
      job.source_url,
      ...((company.recent_news ?? []).map(item => item.url)),
    ].filter(Boolean) as string[];

    const hasUrls = hasValidUrls(candidateUrls);

    let prompt = `Analyze the interview expectations for a ${job.level} ${job.title} role.

Company context:
- Name: ${company.name}
- Values: ${company.values.join(', ') || 'N/A'}
- Known interview process: ${JSON.stringify(company.interview_process ?? {})}

Job highlights:
- Location: ${job.location ?? 'unspecified'}
- Work arrangement: ${job.work_arrangement ?? 'unspecified'}
- Key requirements: ${job.required_skills.join(', ') || 'None listed'}

Return ONLY a valid JSON object with these exact fields:
{
  "typical_rounds": 4,
  "focus_areas": ["array", "of", "focus", "topics"],
  "interview_formats": ["coding", "system design", "behavioral"],
  "similar_roles": ["related", "job", "titles"]
}`;

    // Add URLs to prompt if available
    if (hasUrls) {
      prompt += formatUrlsForPrompt(candidateUrls);
    }

    // Build request with URL context tool if needed
    const request: any = {
      contents: [{
        role: 'user',
        parts: [{ text: prompt }]
      }]
    };

    // Add URL context tool if we have valid URLs
    if (hasUrls) {
      request.tools = [{ url_context: {} }];
    }

    const result = await model.generateContent(request);

    const patterns = safeParseJson<RolePattern>(result.response.text(), 'role analysis');

    return {
      rolePatterns: {
        similar_roles: patterns.similar_roles ?? [],
        typical_rounds: patterns.typical_rounds ?? 4,
        focus_areas: patterns.focus_areas ?? [],
        interview_formats: patterns.interview_formats ?? [],
      } as RolePattern,
    };
  } catch (error) {
    return {
      errors: [`Failed to analyze role patterns: ${error instanceof Error ? error.message : 'Unknown'}`],
    };
  }
}
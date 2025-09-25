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
  let text = raw.trim();

  // Remove markdown code blocks
  text = text.replace(/^```(?:json)?\s*/i, '').replace(/```$/i, '').trim();

  // Try to find the first complete JSON object
  let startIndex = text.indexOf('{');
  if (startIndex !== -1) {
    let braceCount = 0;
    let endIndex = startIndex;

    for (let i = startIndex; i < text.length; i++) {
      if (text[i] === '{') braceCount++;
      if (text[i] === '}') braceCount--;
      if (braceCount === 0) {
        endIndex = i;
        break;
      }
    }

    if (braceCount === 0) {
      text = text.substring(startIndex, endIndex + 1);
    }
  }

  try {
    return JSON.parse(text) as T;
  } catch (error) {
    console.warn(`Raw response for ${context}:`, raw.substring(0, 300) + '...');
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
 * Node: Enhanced role analysis with Google Search + URL Context
 */
export async function analyzeRole(state: CurriculumState): Promise<Partial<CurriculumState>> {
  const model = getGenAI().getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: {
      temperature: 0.5,
    }
  });

  if (!state.jobData) {
    return {
      errors: ['Missing job data for role analysis'],
    };
  }

  try {
    const job = state.jobData;
    const company = state.companyContext;

    // Build comprehensive research queries
    const searchQueries = [
      `${job.company_name} ${job.title} interview process experience`,
      `${job.company_name} company culture employee reviews 2024`,
      `${job.company_name} interview questions ${job.level} level`,
      `${job.title} salary range ${job.location} 2024 2025`,
      `${job.company_name} recent news changes hiring 2024`,
      `${job.title} interview preparation ${job.company_name}`
    ];

    let prompt = `Research and analyze comprehensive interview intelligence for a ${job.level} ${job.title} role at ${job.company_name}.

Use these research queries to gather current information:
${searchQueries.map(q => `- ${q}`).join('\n')}

Current job context:
- Location: ${job.location ?? 'unspecified'}
- Work arrangement: ${job.work_arrangement ?? 'unspecified'}
- Key requirements: ${job.required_skills.join(', ') || 'None listed'}
${company ? `- Known company info: ${company.name}, values: ${company.values.join(', ')}` : ''}

Based on your research findings, return ONLY a valid JSON object:
{
  "typical_rounds": 4,
  "focus_areas": ["comprehensive array based on research"],
  "interview_formats": ["specific formats found in research"],
  "similar_roles": ["related titles from research"],
  "company_insights": ["recent company developments affecting role"],
  "salary_intelligence": "market range and negotiation insights",
  "interview_difficulty": "1-10 scale with current market insights",
  "preparation_recommendations": ["specific prep advice from research"]
}`;

    // Use both Google Search and URL Context for comprehensive research
    const request: any = {
      contents: [{
        role: 'user',
        parts: [{ text: prompt }]
      }],
      tools: [
        { googleSearch: {} },
        { url_context: {} }
      ]
    };

    const result = await model.generateContent(request);

    const enhancedPatterns = safeParseJson<any>(result.response.text(), 'enhanced role analysis');

    // Update company context with research findings
    const enhancedCompanyContext = {
      ...company,
      name: job.company_name,
      values: enhancedPatterns.company_insights?.slice(0, 5) || company?.values || ['innovation', 'excellence'],
      recent_news: enhancedPatterns.company_insights?.map((insight: string) => ({
        title: insight,
        url: '',
        date: new Date().toISOString().split('T')[0]
      })) || [],
      interview_process: {
        typical_rounds: enhancedPatterns.typical_rounds || 4,
        difficulty_rating: enhancedPatterns.interview_difficulty || '7/10',
        common_interviewers: [],
        red_flags: [],
        green_flags: enhancedPatterns.preparation_recommendations?.slice(0, 3) || [],
      },
      confidence_score: 0.9, // High confidence from comprehensive research
    };

    return {
      rolePatterns: {
        similar_roles: enhancedPatterns.similar_roles ?? [],
        typical_rounds: enhancedPatterns.typical_rounds ?? 4,
        focus_areas: enhancedPatterns.focus_areas ?? [],
        interview_formats: enhancedPatterns.interview_formats ?? [],
      } as RolePattern,
      companyContext: enhancedCompanyContext,
      marketIntelligence: {
        salaryRange: enhancedPatterns.salary_intelligence || 'Market competitive',
        difficultyRating: enhancedPatterns.interview_difficulty || '7/10',
        preparationTime: '2-3 weeks recommended',
        keyInsights: enhancedPatterns.preparation_recommendations?.slice(0, 5) || []
      }
    };
  } catch (error) {
    console.warn('Enhanced research failed, falling back to basic analysis:', error);

    // Fallback to basic analysis
    return basicRoleAnalysis(state);
  }
}

/**
 * Fallback basic role analysis when enhanced research fails
 */
async function basicRoleAnalysis(state: CurriculumState): Promise<Partial<CurriculumState>> {
  const job = state.jobData!;
  const company = state.companyContext;
  const title = job.title || 'Professional';
  const skills = job.required_skills || [];

  return {
    rolePatterns: {
      similar_roles: [`Senior ${title}`, `${title} Lead`, `${title} Manager`],
      typical_rounds: 4,
      focus_areas: skills.slice(0, 5),
      interview_formats: ['behavioral', 'technical', 'case study'],
    } as RolePattern,
    warnings: ['Using basic analysis due to research limitations']
  };
}
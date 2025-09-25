// Enhanced Research with Google Search + URL Context
// Comprehensive intelligence gathering for interview preparation

import { GoogleGenerativeAI } from '@google/generative-ai';
import { CurriculumState } from '../state';
import { ParsedJob } from '../types';

// Initialize lazily
let genAI: GoogleGenerativeAI | null = null;
function getGenAI(): GoogleGenerativeAI {
  if (!genAI) {
    genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!);
  }
  return genAI;
}

interface EnhancedIntelligence {
  companyIntelligence: {
    culture: string[];
    recentNews: Array<{ title: string; summary: string; relevance: string }>;
    financialHealth: string;
    leadership: string[];
    challenges: string[];
  };
  interviewIntelligence: {
    processInsights: string[];
    recentExperiences: string[];
    commonQuestions: string[];
    difficultyRating: number;
    passRate: string;
  };
  marketIntelligence: {
    salaryRange: string;
    demandLevel: string;
    competitorComparison: string[];
    skillsTrends: string[];
  };
  roleIntelligence: {
    dayToDay: string[];
    careerProgression: string[];
    teamStructure: string;
    challenges: string[];
  };
}

/**
 * Enhanced research node combining URL context + Google Search
 */
export async function enhancedResearch(state: CurriculumState): Promise<Partial<CurriculumState>> {
  if (!state.jobData) {
    return { errors: ['No job data available for enhanced research'] };
  }

  const job = state.jobData;
  console.log(`🔍 Starting enhanced research for ${job.title} at ${job.company_name}`);

  try {
    // Generate comprehensive search strategy
    const searchStrategy = buildSearchStrategy(job);

    // Execute intelligence gathering
    const intelligence = await gatherIntelligence(searchStrategy);

    // Synthesize findings
    const enhancedContext = await synthesizeContext(job, intelligence);

    return {
      companyContext: enhancedContext.companyContext,
      marketIntelligence: enhancedContext.marketIntelligence,
      interviewIntelligence: enhancedContext.interviewIntelligence,
    };

  } catch (error) {
    console.error('Enhanced research failed:', error);
    return {
      errors: [`Enhanced research failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
      warnings: ['Falling back to basic research']
    };
  }
}

/**
 * Build comprehensive search strategy
 */
function buildSearchStrategy(job: ParsedJob) {
  const company = job.company_name;
  const role = job.title;
  const level = job.level;
  const location = job.location;

  return {
    companyResearch: [
      `${company} company culture employee reviews 2024 2025`,
      `${company} recent news changes layoffs hiring 2024`,
      `${company} leadership team changes management`,
      `${company} financial performance challenges 2024`,
      `${company} employee experiences glassdoor blind reddit`
    ],
    interviewResearch: [
      `${company} ${role} interview process experience`,
      `${company} interview questions ${level} level`,
      `${company} ${role} interview difficulty preparation`,
      `${company} hiring process ${role} rounds timeline`,
      `${company} interview feedback recent candidates`
    ],
    marketResearch: [
      `${role} salary range ${location} 2024 2025`,
      `${role} market demand trends ${location}`,
      `${company} ${role} compensation benefits`,
      `${role} skills requirements trends 2024`,
      `${company} competitors ${role} comparison`
    ],
    roleResearch: [
      `${company} ${role} day to day responsibilities`,
      `${company} ${role} team structure reporting`,
      `${company} ${role} career growth promotion`,
      `${role} challenges ${company} industry`,
      `${company} ${role} success metrics expectations`
    ]
  };
}

/**
 * Execute intelligence gathering with Google Search + URL Context
 */
async function gatherIntelligence(strategy: ReturnType<typeof buildSearchStrategy>): Promise<string> {
  const model = getGenAI().getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: {
      temperature: 0.4,
    }
  });

  const allQueries = [
    ...strategy.companyResearch,
    ...strategy.interviewResearch,
    ...strategy.marketResearch,
    ...strategy.roleResearch
  ];

  const prompt = `Research comprehensive intelligence using these search queries:

COMPANY INTELLIGENCE:
${strategy.companyResearch.map(q => `- ${q}`).join('\n')}

INTERVIEW INTELLIGENCE:
${strategy.interviewResearch.map(q => `- ${q}`).join('\n')}

MARKET INTELLIGENCE:
${strategy.marketResearch.map(q => `- ${q}`).join('\n')}

ROLE INTELLIGENCE:
${strategy.roleResearch.map(q => `- ${q}`).join('\n')}

Provide comprehensive research findings organized by category.
Focus on recent, actionable insights for interview preparation.`;

  const result = await model.generateContent({
    contents: [{
      role: 'user',
      parts: [{ text: prompt }]
    }],
    tools: [
      { googleSearch: {} },
      { urlContext: {} }
    ]
  });

  return result.response.text();
}

/**
 * Synthesize raw intelligence into structured context
 */
async function synthesizeContext(job: ParsedJob, rawIntelligence: string) {
  const model = getGenAI().getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: {
      temperature: 0.3,
    }
  });

  const prompt = `Synthesize this research into structured interview preparation intelligence:

JOB: ${job.title} at ${job.company_name}
LEVEL: ${job.level}
LOCATION: ${job.location}

RESEARCH FINDINGS:
${rawIntelligence}

Return ONLY a JSON object with this structure:
{
  "companyContext": {
    "name": "${job.company_name}",
    "values": ["array of actual values from research"],
    "recentNews": [{"title": "", "impact": "", "relevance": ""}],
    "culture": ["key culture insights"],
    "challenges": ["current company challenges"],
    "strengths": ["competitive advantages"]
  },
  "marketIntelligence": {
    "salaryRange": "specific range with currency",
    "demandLevel": "high/medium/low with explanation",
    "competitorComparison": ["how this role compares"],
    "skillsTrends": ["trending skills for this role"]
  },
  "interviewIntelligence": {
    "processInsights": ["actual interview process details"],
    "recentQuestions": ["specific questions from candidates"],
    "difficultyLevel": "1-10 scale with reasoning",
    "preparationTime": "recommended prep time",
    "successFactors": ["what leads to success"]
  }
}`;

  const result = await model.generateContent(prompt);

  try {
    return JSON.parse(result.response.text());
  } catch (error) {
    console.warn('Failed to parse intelligence synthesis, using fallback');
    return {
      companyContext: {
        name: job.company_name,
        values: ['innovation', 'excellence', 'collaboration'],
        recentNews: [],
        culture: ['data-driven', 'fast-paced'],
        challenges: ['competitive market'],
        strengths: ['market leader']
      },
      marketIntelligence: {
        salaryRange: 'Competitive for market',
        demandLevel: 'high',
        competitorComparison: ['Standard industry role'],
        skillsTrends: job.required_skills
      },
      interviewIntelligence: {
        processInsights: ['Multi-round process'],
        recentQuestions: ['Standard behavioral and technical'],
        difficultyLevel: '7/10',
        preparationTime: '2-3 weeks',
        successFactors: ['Strong preparation', 'Cultural fit']
      }
    };
  }
}
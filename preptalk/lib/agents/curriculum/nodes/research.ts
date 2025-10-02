// Research Phase Nodes - Job parsing and role analysis
// Pure functions that transform state

import { CurriculumState } from '../state';
import { ParsedJob, RolePattern } from '../types';
import { ParsedJobSchema, EnhancedRoleAnalysisSchema } from '../schemas';

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

// safeParseJson function removed - now using OOTB structured outputs

// No longer using direct Gemini instantiation - using LLM provider service

/**
 * Node: Parse job from discovered sources or direct URL
 */
export async function parseJob(
  state: CurriculumState,
  config?: { llmProvider?: any }
): Promise<Partial<CurriculumState>> {
  if (!config?.llmProvider) {
    throw new Error('LLM provider is required for parseJob');
  }

  // Use the best source data we have
  // ✅ FIXED: Use programmatic validation instead of s.validation.isUseful
  const bestSource = state.discoveredSources
    ?.filter(s => s.data && (
      s.data.company ||
      s.data.title ||
      (s.data.requirements && s.data.requirements.length >= 3) ||
      (s.data.responsibilities && s.data.responsibilities.length >= 3)
    ))
    ?.sort((a, b) => b.trustScore - a.trustScore)[0];

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

    // Use LLM provider service for structured generation
    const jobData = await config.llmProvider.generateStructured(
      ParsedJobSchema,
      'job_parsing',
      prompt
    );

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
    console.warn(`⚠️  parseJob failed: ${error instanceof Error ? error.message : 'Unknown'}`);
    console.log(`⚠️  Using fallback job data from user input: ${state.userInput}`);

    // Fallback: Extract basic info from user input or source data
    const isUrl = state.userInput.includes('http');
    const companyName = bestSource.data?.company || (isUrl ? 'Unknown Company' : state.userInput.split(' ')[0]);
    const roleTitle = bestSource.data?.title || (isUrl ? 'Unknown Role' : state.userInput);

    return {
      jobData: {
        title: roleTitle,
        company_name: companyName,
        level: 'mid',
        responsibilities: ['Execute on key projects', 'Collaborate with team members', 'Contribute to company goals'],
        required_skills: ['Relevant experience', 'Strong communication skills', 'Team collaboration'],
        preferred_skills: [],
        experience_level: '3-5 years',
        location: 'Remote',
        work_arrangement: 'remote',
        source_url: bestSource.url,
        raw_description: '',
        parsing_confidence: 0.3,
        extraction_timestamp: new Date().toISOString(),
      } as ParsedJob,
      warnings: [...(state.warnings || []), 'Using fallback job parsing due to LLM failure'],
    };
  }
}

/**
 * Node: Enhanced role analysis with Google Search + URL Context
 */
export async function analyzeRole(
  state: CurriculumState,
  config?: { llmProvider?: any }
): Promise<Partial<CurriculumState>> {
  if (!config?.llmProvider) {
    throw new Error('LLM provider is required for analyzeRole');
  }

  if (!state.jobData) {
    return {
      errors: ['Missing job data for role analysis'],
    };
  }

  try {
    const job = state.jobData;
    const company = state.companyContext;

    // Enhanced queries with dynamic date context and competitive intelligence
    const now = new Date();
    const currentYear = now.getFullYear();
    const previousYear = currentYear - 1;
    const recentPeriod = `${previousYear} ${currentYear}`;
    const currentMonth = now.toLocaleString('default', { month: 'long' });

    // Build comprehensive research queries (basic + competitive)
    const searchQueries = [
      // Basic intelligence queries (keep existing functionality)
      `${job.company_name} ${job.title} interview process experience`,
      `${job.company_name} company culture employee reviews ${recentPeriod}`,
      `${job.company_name} interview questions ${job.level} level`,
      `${job.title} salary range ${job.location} ${currentYear}`,
      `${job.company_name} recent news changes hiring ${recentPeriod}`,
      `${job.title} interview preparation ${job.company_name}`,

      // NEW: Enhanced competitive intelligence queries for specific insights
      `${job.company_name} vs Disney+ Amazon Prime HBO ${job.title} responsibilities salary comparison ${recentPeriod}`,
      `why work ${job.title} at ${job.company_name} instead of Amazon Apple Google ${currentYear} specific advantages`,
      `${job.company_name} ${job.title} budget tools technology vs competitors unique challenges ${recentPeriod}`,
      `${job.company_name} ${currentYear} strategy changes acquisitions affecting ${job.title} role scope responsibilities`,
      `${job.company_name} market share streaming vs competitors impact on ${job.title} career growth ${currentYear}`,
      `${job.title} salary ranges ${job.company_name} vs Netflix Disney Amazon ${job.location} ${recentPeriod}`,
      `${job.title} industry trends DST tax automation affecting ${job.company_name} competitive advantage ${recentPeriod}`,
      `${job.company_name} ${job.title} interview process vs Google Amazon Netflix difficulty comparison ${currentYear}`
    ];

    let prompt = `Research and analyze comprehensive interview intelligence for a ${job.level} ${job.title} role at ${job.company_name}.

Use these research queries to gather current information:
${searchQueries.map(q => `- ${q}`).join('\n')}

Current job context:
- Location: ${job.location ?? 'unspecified'}
- Work arrangement: ${job.work_arrangement ?? 'unspecified'}
- Key requirements: ${job.required_skills?.join(', ') || 'None listed'}
${company ? `- Known company info: ${company.name}, values: ${Array.isArray(company.values) ? company.values.join(', ') : (company.values || 'None listed')}` : ''}

Based on your research findings, return ONLY a valid JSON object with both basic and competitive intelligence:
{
  "typical_rounds": 4,
  "focus_areas": ["comprehensive array based on research"],
  "interview_formats": ["specific formats found in research"],
  "similar_roles": ["related titles from research"],
  "company_insights": ["recent company developments affecting role"],
  "salary_intelligence": "market range and negotiation insights",
  "interview_difficulty": "1-10 scale with current market insights",
  "preparation_recommendations": ["specific prep advice from research"],

  "competitive_intelligence": {
    "primary_competitors": ["specific company names with brief context why they compete"],
    "role_comparison": "detailed 2-3 sentence analysis: How does this exact role at this company differ from the same role at competitors? Include specific examples of unique responsibilities, tools, scope, or challenges this company faces vs others",
    "strategic_advantages": ["specific competitive advantages with context - e.g. 'Netflix's $15B annual content budget vs Disney+'s $8B allows deeper localization' rather than just 'content investment'"],
    "recent_developments": ["specific recent changes (last 12 months) affecting this role with dates/context - e.g. 'Q3 2024: Netflix launched ad-supported tier requiring new tax compliance for advertising revenue across EMEA' rather than just 'ad revenue growth'"],
    "competitive_positioning": "detailed 2-3 sentence analysis: Where does this company stand vs competitors specifically for this role type? Include market share, strategic position, and what this means for the role. Be specific about why someone would choose this company over others for this exact role",
    "market_context": {
      "competitive_salary_context": "specific salary positioning with numbers - e.g. 'Netflix typically pays 15-25% above market (€65-75k vs €50-60k at traditional media companies)' rather than just 'competitive pay'",
      "market_trends": ["specific trends with context - e.g. 'DST (Digital Services Tax) implementation across EU requires specialized expertise, creating 30% salary premium for international tax analysts' rather than just 'growing demand'"]
    }
  }
}`;

    // Use LLM provider service for comprehensive research
    const enhancedPatterns = await config.llmProvider.generateStructured(
      EnhancedRoleAnalysisSchema,
      'company_research',
      prompt
    );

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

    // Extract competitive intelligence from the enhanced research
    const competitiveIntel = enhancedPatterns.competitive_intelligence || {};

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
        keyInsights: enhancedPatterns.preparation_recommendations?.slice(0, 5) || [],
        // Enhanced fields
        competitiveContext: competitiveIntel.market_context?.competitive_salary_context ||
                           `${job.company_name} positioning in current market`,
        marketTrends: competitiveIntel.market_context?.market_trends || []
      },
      // NEW: Competitive Intelligence extraction
      competitiveIntelligence: {
        primaryCompetitors: competitiveIntel.primary_competitors ?? [],
        roleComparison: competitiveIntel.role_comparison ??
                       `${job.title} at ${job.company_name} compared to market`,
        strategicAdvantages: competitiveIntel.strategic_advantages ?? [],
        recentDevelopments: competitiveIntel.recent_developments ?? [],
        competitivePositioning: competitiveIntel.competitive_positioning ??
                               `${job.company_name} market positioning for ${job.title} roles`
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
    marketIntelligence: {
      salaryRange: 'Market competitive',
      difficultyRating: '7/10',
      preparationTime: '2-3 weeks recommended',
      keyInsights: ['Standard interview preparation'],
      // Enhanced fields with fallback values
      competitiveContext: undefined,
      marketTrends: []
    },
    // Competitive intelligence with minimal data
    competitiveIntelligence: {
      primaryCompetitors: [],
      roleComparison: 'Limited competitive data available',
      strategicAdvantages: [],
      recentDevelopments: [],
      competitivePositioning: 'Standard market positioning'
    },
    warnings: ['Enhanced research failed, using basic analysis']
  };
}
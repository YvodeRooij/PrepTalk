/**
 * Query Builder for Google Search Integration
 *
 * Builds optimized Google Search queries for:
 * 1. Competitor discovery
 * 2. Interview experience research
 * 3. Company news monitoring
 */

/**
 * Role family mappings for query normalization
 */
const ROLE_FAMILIES: Record<string, string> = {
  // Software Engineering
  'software engineer': 'software engineering',
  'swe': 'software engineering',
  'backend': 'software engineering',
  'frontend': 'software engineering',
  'fullstack': 'software engineering',
  'full stack': 'software engineering',
  'developer': 'software engineering',
  'dev': 'software engineering',

  // Product Management
  'product manager': 'product management',
  'pm': 'product management',
  'product owner': 'product management',
  'technical pm': 'product management',

  // Data & ML
  'data scientist': 'data science',
  'ml engineer': 'machine learning engineering',
  'machine learning': 'machine learning engineering',
  'data analyst': 'data analytics',
  'data engineer': 'data engineering',
  'ai engineer': 'artificial intelligence engineering',

  // Finance
  'investment banking': 'investment banking',
  'ib': 'investment banking',
  'financial analyst': 'financial analysis',
  'quantitative': 'quantitative analysis',
  'quant': 'quantitative analysis',
  'trader': 'trading',

  // Consulting
  'consultant': 'consulting',
  'strategy': 'strategy consulting',
  'management consultant': 'management consulting',

  // Design
  'designer': 'design',
  'product designer': 'product design',
  'ux': 'user experience design',
  'ui': 'user interface design',

  // Engineering (Other)
  'mechanical engineer': 'mechanical engineering',
  'electrical engineer': 'electrical engineering',
  'hardware engineer': 'hardware engineering',
  'aerospace engineer': 'aerospace engineering',
  'civil engineer': 'civil engineering',
  'asic': 'asic engineering',

  // Healthcare
  'clinical research': 'pharmaceutical research',
  'pharmaceutical': 'pharmaceutical industry',
  'healthcare': 'healthcare industry',

  // Other
  'solutions architect': 'solutions architecture',
  'brand manager': 'brand management',
  'network engineer': 'network engineering',
};

/**
 * Extract role family from specific role title
 * Removes seniority levels, numbers, and normalizes to role family
 */
export function extractRoleFamily(role: string): string {
  if (!role || role.trim().length === 0) {
    return 'professional';
  }

  let normalized = role.toLowerCase().trim();

  // Remove seniority prefixes
  normalized = normalized
    .replace(/^(senior|staff|principal|lead|junior|associate|assistant|chief)\s+/gi, '')
    .replace(/\s+(senior|staff|principal|lead|junior|associate|assistant)\s+/gi, ' ');

  // Remove level prefixes and suffixes (L3, L5, IC4, Level 5, T4, II, III, IV)
  normalized = normalized
    .replace(/^(l\d+|ic\d+|t\d+)\s+/gi, '') // Remove from beginning
    .replace(/\s+(l\d+|ic\d+|level\s+\d+|t\d+)\s*$/gi, '') // Remove from end
    .replace(/\s+(i{1,3}|iv|v|vi)\s*$/gi, '')
    .replace(/\s+\d+\s*$/g, '');

  // Remove "level" with numbers anywhere in string (e.g., "level 5 manager")
  normalized = normalized.replace(/\blevel\s+\d+\b/gi, '').trim();

  // Remove trailing numbers
  normalized = normalized.replace(/\s*\d+\s*$/, '').trim();

  // Find matching role family
  for (const [key, family] of Object.entries(ROLE_FAMILIES)) {
    if (normalized.includes(key)) {
      return family;
    }
  }

  // If no match, return cleaned role
  return normalized || 'professional';
}

/**
 * Get current year for recency filters
 */
function getCurrentYear(): number {
  return new Date().getFullYear();
}

/**
 * Build Google Search query for finding competitors
 *
 * Optimized for:
 * - Industry context
 * - Top competitors
 * - Recent information (2024-2025)
 */
export function buildCompetitorQuery(company: string, role: string): string {
  const roleFamily = extractRoleFamily(role);
  const currentYear = getCurrentYear();
  const previousYear = currentYear - 1;

  // Add industry context for disambiguation
  let companyTerm = `"${company}"`;
  const companyLower = company.toLowerCase();

  // Disambiguate common short names by adding industry context
  if (companyLower === 'ing') {
    companyTerm = `"ING Bank" OR "ING Group" Netherlands banking`;
  } else if (companyLower === 'meta') {
    companyTerm = `"Meta" OR "Facebook" tech`;
  } else if (companyLower === 'alphabet') {
    companyTerm = `"Alphabet" OR "Google"`;
  }

  // Build query components
  const parts = [
    companyTerm,
    'top competitors',
    roleFamily,
    `${previousYear} OR ${currentYear}`,
  ];

  return parts.join(' ');
}

/**
 * Build Google Search query for finding interview experiences
 *
 * Optimized for:
 * - Glassdoor and Blind content
 * - Recent experiences (2024-2025)
 * - Specific role context
 */
export function buildInterviewExperienceQuery(company: string, role: string): string {
  const roleFamily = extractRoleFamily(role);
  const currentYear = getCurrentYear();
  const previousYear = currentYear - 1;

  // Build query with site restrictions
  const parts = [
    `"${company}"`,
    `"${roleFamily}"`,
    'interview experience',
    `(site:glassdoor.com OR site:blind.com)`,
    `${previousYear} OR ${currentYear}`,
  ];

  return parts.join(' ');
}

/**
 * Determine reputable news sources based on company/role context
 */
function getNewsSources(company: string, role: string): string {
  const companyLower = company.toLowerCase();
  const roleLower = role.toLowerCase();

  // Finance companies
  if (
    companyLower.includes('goldman') ||
    companyLower.includes('jpmorgan') ||
    companyLower.includes('morgan stanley') ||
    roleLower.includes('financial') ||
    roleLower.includes('banking')
  ) {
    return '(site:bloomberg.com OR site:reuters.com OR site:wsj.com)';
  }

  // Healthcare/Pharma
  if (
    companyLower.includes('pfizer') ||
    companyLower.includes('moderna') ||
    roleLower.includes('clinical') ||
    roleLower.includes('pharmaceutical')
  ) {
    return '(site:fiercepharma.com OR site:reuters.com OR site:statnews.com)';
  }

  // Default to tech sources
  return '(site:techcrunch.com OR site:theverge.com OR site:reuters.com)';
}

/**
 * Build Google Search query for finding company news
 *
 * Optimized for:
 * - Reputable news sources (TechCrunch, Bloomberg, Reuters)
 * - Recent news (2024-2025)
 * - Key business events (funding, launches, acquisitions)
 */
export function buildCompanyNewsQuery(company: string, role: string): string {
  const currentYear = getCurrentYear();
  const previousYear = currentYear - 1;
  const newsSources = getNewsSources(company, role);

  // Build query components
  const parts = [
    `"${company}"`,
    '(launch OR funding OR acquisition OR announcement OR news)',
    newsSources,
    `${previousYear} OR ${currentYear}`,
  ];

  return parts.join(' ');
}

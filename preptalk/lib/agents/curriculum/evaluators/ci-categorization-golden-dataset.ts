/**
 * PHASE 2: GOLDEN DATASET FOR CI CATEGORIZATION
 *
 * Human-annotated test cases spanning 5 industries to validate
 * that LLM categorization works across domains without modification
 *
 * Each test case includes:
 * - Industry context
 * - 6-8 CI facts (mix of strategic advantages + recent developments)
 * - Expected categorization (human expert annotations)
 */

import { NonTechnicalRoundType } from '../types';

export interface GoldenDatasetExample {
  id: string;
  industry: string;
  companyName: string;
  jobTitle: string;
  ciFacts: string[];
  expectedAssignments: {
    [ciFact: string]: {
      primary: NonTechnicalRoundType[];      // Rounds that MUST use this fact
      secondary: NonTechnicalRoundType[];    // Rounds that CAN use this fact
      avoid: NonTechnicalRoundType[];        // Rounds that should AVOID this fact
      reasoning: string;                      // Why this assignment makes sense
    };
  };
}

/**
 * Golden Dataset: 5 Industries × 6-8 CI Facts Each = ~35 Total Test Cases
 */
export const CI_CATEGORIZATION_GOLDEN_DATASET: GoldenDatasetExample[] = [
  // ══════════════════════════════════════════════════════════════════════════
  // TEST CASE 1: TECH/SALES (Current - Mistral AI)
  // ══════════════════════════════════════════════════════════════════════════
  {
    id: 'tech-sales-mistral',
    industry: 'Technology - AI/ML SaaS',
    companyName: 'Mistral AI',
    jobTitle: 'Strategic Account Executive',
    ciFacts: [
      'Series B funding ($415M) announced December 2023, now valued at $2B',
      'Open-source models (Mistral 7B, Mixtral 8x7B) differentiate from closed competitors like OpenAI',
      'Enterprise deployment via Azure partnership gives Fortune 500 access',
      'EU-based (Paris) provides GDPR-native advantage over US competitors',
      'Hiring 50+ sales roles across EMEA to support enterprise expansion',
      'Recent La Plateforme launch enables API-first monetization strategy',
      'Strong developer community (100K+ GitHub stars) drives bottom-up adoption',
      'Focus on efficiency (Mistral 7B beats Llama 13B) appeals to cost-conscious enterprises'
    ],
    expectedAssignments: {
      'Series B funding ($415M) announced December 2023, now valued at $2B': {
        primary: ['strategic_role_discussion', 'executive_final'],
        secondary: ['recruiter_screen'],
        avoid: ['behavioral_deep_dive', 'culture_values_alignment'],
        reasoning: 'Funding is fundamentally strategic (market positioning, growth). Strategic round (primary) can discuss how funding shapes go-to-market. Executive (primary) can discuss long-term vision enabled by capital. Recruiter (secondary) can mention "we\'re well-funded and growing" but not strategy. Behavioral/culture should avoid (not about team dynamics or values).'
      },
      'Open-source models (Mistral 7B, Mixtral 8x7B) differentiate from closed competitors like OpenAI': {
        primary: ['strategic_role_discussion'],
        secondary: ['behavioral_deep_dive', 'executive_final'],
        avoid: ['recruiter_screen', 'culture_values_alignment'],
        reasoning: 'Core competitive positioning - perfect for strategic round (primary). Behavioral (secondary) could discuss how open-source affects team collaboration with community. Executive (secondary) could discuss philosophy. Recruiter (avoid) can\'t discuss technical differentiation. Culture (avoid) unless values-driven (not the case here).'
      },
      'Enterprise deployment via Azure partnership gives Fortune 500 access': {
        primary: ['strategic_role_discussion'],
        secondary: ['behavioral_deep_dive'],
        avoid: ['recruiter_screen', 'culture_values_alignment', 'executive_final'],
        reasoning: 'Strategic partnership enabling market access - perfect for strategic round. Behavioral (secondary) could discuss cross-team collaboration with Azure. Recruiter (avoid) - too technical. Culture (avoid) - not about values. Executive (avoid) - tactical partnership, not vision-level.'
      },
      'EU-based (Paris) provides GDPR-native advantage over US competitors': {
        primary: ['strategic_role_discussion'],
        secondary: ['executive_final'],
        avoid: ['recruiter_screen', 'behavioral_deep_dive', 'culture_values_alignment'],
        reasoning: 'Regulatory competitive advantage - strategic round (primary) for discussing how GDPR compliance wins enterprise deals. Executive (secondary) for industry regulation trends. Recruiter (avoid) - too strategic. Behavioral (avoid) - not about processes. Culture (avoid) - not about values (unless tied to European work culture, which it\'s not).'
      },
      'Hiring 50+ sales roles across EMEA to support enterprise expansion': {
        primary: ['recruiter_screen'],
        secondary: ['behavioral_deep_dive'],
        avoid: ['culture_values_alignment', 'strategic_role_discussion', 'executive_final'],
        reasoning: 'Hiring initiative - perfect for recruiter screen (primary). Behavioral (secondary) could mention team growth/structure. Culture (avoid) - not about values. Strategic (avoid) - too tactical (expansion strategy yes, but hiring numbers no). Executive (avoid) - too tactical.'
      },
      'Recent La Plateforme launch enables API-first monetization strategy': {
        primary: ['strategic_role_discussion', 'executive_final'],
        secondary: ['behavioral_deep_dive'],
        avoid: ['recruiter_screen', 'culture_values_alignment'],
        reasoning: 'Monetization strategy - strategic round (primary) for discussing revenue model and competitive positioning. Executive (primary) for vision of API-first future. Behavioral (secondary) if discussing how launch changed team workflows. Recruiter (avoid) - too strategic. Culture (avoid) - not about values.'
      },
      'Strong developer community (100K+ GitHub stars) drives bottom-up adoption': {
        primary: ['strategic_role_discussion'],
        secondary: ['behavioral_deep_dive', 'culture_values_alignment'],
        avoid: ['recruiter_screen', 'executive_final'],
        reasoning: 'Community-driven growth strategy - strategic round (primary). Behavioral (secondary) could discuss community collaboration processes. Culture (secondary) if tied to open-source values. Recruiter (avoid) - too strategic. Executive (avoid) - tactical metric, not vision-level.'
      },
      'Focus on efficiency (Mistral 7B beats Llama 13B) appeals to cost-conscious enterprises': {
        primary: ['strategic_role_discussion'],
        secondary: ['executive_final'],
        avoid: ['recruiter_screen', 'behavioral_deep_dive', 'culture_values_alignment'],
        reasoning: 'Value proposition and competitive differentiation - strategic round (primary). Executive (secondary) for efficiency philosophy. Recruiter (avoid) - too technical. Behavioral (avoid) - not about team processes. Culture (avoid) - not about values.'
      }
    }
  },

  // ══════════════════════════════════════════════════════════════════════════
  // TEST CASE 2: HEALTHCARE (Hospital Administration)
  // ══════════════════════════════════════════════════════════════════════════
  {
    id: 'healthcare-hospital-director',
    industry: 'Healthcare - Hospital Administration',
    companyName: 'Johns Hopkins Hospital',
    jobTitle: 'Director of Patient Care Operations',
    ciFacts: [
      'Magnet Recognition (4th consecutive designation) for nursing excellence - top 2% of US hospitals',
      'New $400M patient tower opening Q2 2025 with 200 private rooms and advanced ICU',
      'Partnership with Johns Hopkins Medicine to integrate AI-powered diagnostic tools across departments',
      'Ranked #3 in US News Best Hospitals 2024, up from #5 in 2023',
      'Diversity hiring initiative: 60% of new clinical staff hires from underrepresented communities in 2024',
      'Epic EHR system migration completed Q4 2024, improving patient data interoperability',
      'Patient satisfaction scores increased from 82% to 91% following new care coordination model',
      'Telehealth program expansion: Now serving 15,000+ rural Maryland patients monthly'
    ],
    expectedAssignments: {
      'Magnet Recognition (4th consecutive designation) for nursing excellence - top 2% of US hospitals': {
        primary: ['culture_values_alignment'],
        secondary: ['recruiter_screen', 'strategic_role_discussion'],
        avoid: ['behavioral_deep_dive', 'executive_final'],
        reasoning: 'Excellence recognition tied to values/culture - culture round (primary). Recruiter (secondary) for "we\'re top-rated". Strategic (secondary) for competitive differentiation in talent market. Behavioral (avoid) - not about processes. Executive (avoid) - achievement, not vision.'
      },
      'New $400M patient tower opening Q2 2025 with 200 private rooms and advanced ICU': {
        primary: ['recruiter_screen'],
        secondary: ['behavioral_deep_dive', 'strategic_role_discussion'],
        avoid: ['culture_values_alignment', 'executive_final'],
        reasoning: 'Infrastructure expansion - recruiter (primary) for discussing team growth/timeline. Behavioral (secondary) for how expansion changes workflows. Strategic (secondary) for capacity growth strategy. Culture (avoid) - not about values. Executive (avoid) - tactical infrastructure, not vision.'
      },
      'Partnership with Johns Hopkins Medicine to integrate AI-powered diagnostic tools across departments': {
        primary: ['strategic_role_discussion'],
        secondary: ['behavioral_deep_dive', 'executive_final'],
        avoid: ['recruiter_screen', 'culture_values_alignment'],
        reasoning: 'Technology partnership driving clinical innovation - strategic round (primary). Behavioral (secondary) for cross-departmental collaboration on AI tools. Executive (secondary) for AI in healthcare vision. Recruiter (avoid) - too technical. Culture (avoid) - not about values (unless innovation-driven culture, which is secondary).'
      },
      'Ranked #3 in US News Best Hospitals 2024, up from #5 in 2023': {
        primary: ['strategic_role_discussion', 'executive_final'],
        secondary: ['recruiter_screen'],
        avoid: ['behavioral_deep_dive', 'culture_values_alignment'],
        reasoning: 'Competitive positioning and market recognition - strategic (primary) for discussing what drove ranking improvement. Executive (primary) for vision of becoming #1. Recruiter (secondary) for "we\'re top-ranked". Behavioral (avoid) - metric, not process. Culture (avoid) - outcome, not values.'
      },
      'Diversity hiring initiative: 60% of new clinical staff hires from underrepresented communities in 2024': {
        primary: ['culture_values_alignment'],
        secondary: ['recruiter_screen'],
        avoid: ['behavioral_deep_dive', 'strategic_role_discussion', 'executive_final'],
        reasoning: 'DEI initiative reflecting values - culture round (primary). Recruiter (secondary) for discussing hiring process. Behavioral (avoid) - not about team processes. Strategic (avoid) - tactical hiring, not strategy. Executive (avoid) - tactical metric.'
      },
      'Epic EHR system migration completed Q4 2024, improving patient data interoperability': {
        primary: ['behavioral_deep_dive'],
        secondary: ['strategic_role_discussion'],
        avoid: ['recruiter_screen', 'culture_values_alignment', 'executive_final'],
        reasoning: 'System/process change - behavioral round (primary) for discussing how Epic changed daily workflows. Strategic (secondary) for interoperability enabling better care coordination. Recruiter (avoid) - too technical for recruiter. Culture (avoid) - not about values. Executive (avoid) - tactical system change.'
      },
      'Patient satisfaction scores increased from 82% to 91% following new care coordination model': {
        primary: ['strategic_role_discussion'],
        secondary: ['behavioral_deep_dive', 'culture_values_alignment'],
        avoid: ['recruiter_screen', 'executive_final'],
        reasoning: 'Care model innovation with measurable impact - strategic round (primary). Behavioral (secondary) for how coordination model works. Culture (secondary) if tied to patient-first values. Recruiter (avoid) - too strategic. Executive (avoid) - tactical improvement, not vision.'
      },
      'Telehealth program expansion: Now serving 15,000+ rural Maryland patients monthly': {
        primary: ['strategic_role_discussion'],
        secondary: ['executive_final'],
        avoid: ['recruiter_screen', 'behavioral_deep_dive', 'culture_values_alignment'],
        reasoning: 'Market expansion and access strategy - strategic round (primary). Executive (secondary) for future of telehealth vision. Recruiter (avoid) - too strategic. Behavioral (avoid) - not about team processes (unless discussing telehealth workflows). Culture (avoid) - not about values (unless tied to access/equity mission).'
      }
    }
  },

  // ══════════════════════════════════════════════════════════════════════════
  // TEST CASE 3: FINANCE (Investment Banking)
  // ══════════════════════════════════════════════════════════════════════════
  {
    id: 'finance-investment-banking',
    industry: 'Finance - Investment Banking',
    companyName: 'Goldman Sachs',
    jobTitle: 'VP of M&A',
    ciFacts: [
      '$3.2B in M&A advisory fees in 2024 - #1 globally for tech sector deals',
      'New transaction hub in Singapore to serve Asia-Pacific deals (opened Q1 2025)',
      'Partnership with private equity firms drives 40% of deal flow',
      'Diversity initiative: 50% of VP+ promotions in 2024 went to women and URMs',
      'Work-from-home flexibility: 2 days/week remote for VP+ since 2024',
      'Marcus consumer banking sunset allows full focus on institutional clients',
      'ESG advisory practice grew 300% YoY, now advising on $50B+ green bonds',
      'AI-powered deal screening tool reduces initial diligence time by 60%'
    ],
    expectedAssignments: {
      '$3.2B in M&A advisory fees in 2024 - #1 globally for tech sector deals': {
        primary: ['strategic_role_discussion', 'executive_final'],
        secondary: [],
        avoid: ['recruiter_screen', 'behavioral_deep_dive', 'culture_values_alignment'],
        reasoning: 'Market leadership and competitive positioning - strategic (primary) and executive (primary). Recruiter (avoid) - too strategic. Behavioral (avoid) - metric, not process. Culture (avoid) - outcome, not values.'
      },
      'New transaction hub in Singapore to serve Asia-Pacific deals (opened Q1 2025)': {
        primary: ['recruiter_screen'],
        secondary: ['strategic_role_discussion'],
        avoid: ['behavioral_deep_dive', 'culture_values_alignment', 'executive_final'],
        reasoning: 'Geographic expansion and office opening - recruiter (primary) for discussing timeline, team, travel. Strategic (secondary) for APAC market strategy. Behavioral (avoid) - not about team processes. Culture (avoid) - logistics. Executive (avoid) - tactical.'
      },
      'Partnership with private equity firms drives 40% of deal flow': {
        primary: ['strategic_role_discussion'],
        secondary: ['behavioral_deep_dive'],
        avoid: ['recruiter_screen', 'culture_values_alignment', 'executive_final'],
        reasoning: 'Strategic partnership and revenue driver - strategic round (primary). Behavioral (secondary) for cross-firm collaboration processes. Recruiter (avoid) - too strategic. Culture (avoid) - not about values. Executive (avoid) - tactical partnership.'
      },
      'Diversity initiative: 50% of VP+ promotions in 2024 went to women and URMs': {
        primary: ['culture_values_alignment'],
        secondary: ['recruiter_screen'],
        avoid: ['behavioral_deep_dive', 'strategic_role_discussion', 'executive_final'],
        reasoning: 'DEI initiative reflecting values - culture round (primary). Recruiter (secondary) for discussing inclusive hiring. Behavioral (avoid) - not about team processes. Strategic (avoid) - tactical HR metric. Executive (avoid) - tactical metric.'
      },
      'Work-from-home flexibility: 2 days/week remote for VP+ since 2024': {
        primary: ['culture_values_alignment'],
        secondary: ['recruiter_screen', 'behavioral_deep_dive'],
        avoid: ['strategic_role_discussion', 'executive_final'],
        reasoning: 'Work culture and flexibility - culture round (primary). Recruiter (secondary) for logistics. Behavioral (secondary) for how remote work affects collaboration. Strategic (avoid) - not strategic. Executive (avoid) - tactical policy.'
      },
      'Marcus consumer banking sunset allows full focus on institutional clients': {
        primary: ['strategic_role_discussion', 'executive_final'],
        secondary: [],
        avoid: ['recruiter_screen', 'behavioral_deep_dive', 'culture_values_alignment'],
        reasoning: 'Strategic pivot and business model focus - strategic (primary) and executive (primary) for discussing focus strategy. Recruiter (avoid) - too strategic. Behavioral (avoid) - not about team processes. Culture (avoid) - business decision.'
      },
      'ESG advisory practice grew 300% YoY, now advising on $50B+ green bonds': {
        primary: ['strategic_role_discussion'],
        secondary: ['executive_final', 'culture_values_alignment'],
        avoid: ['recruiter_screen', 'behavioral_deep_dive'],
        reasoning: 'Growth area and market positioning - strategic round (primary). Executive (secondary) for ESG industry trends. Culture (secondary) if tied to sustainability values. Recruiter (avoid) - too strategic. Behavioral (avoid) - not about team processes.'
      },
      'AI-powered deal screening tool reduces initial diligence time by 60%': {
        primary: ['behavioral_deep_dive'],
        secondary: ['strategic_role_discussion'],
        avoid: ['recruiter_screen', 'culture_values_alignment', 'executive_final'],
        reasoning: 'Process improvement tool - behavioral round (primary) for discussing how AI changed workflows. Strategic (secondary) for efficiency competitive advantage. Recruiter (avoid) - too technical. Culture (avoid) - not about values. Executive (avoid) - tactical tool.'
      }
    }
  },

  // ══════════════════════════════════════════════════════════════════════════
  // TEST CASE 4: MANUFACTURING (Supply Chain)
  // ══════════════════════════════════════════════════════════════════════════
  {
    id: 'manufacturing-supply-chain',
    industry: 'Manufacturing - Automotive Supply Chain',
    companyName: 'Bosch',
    jobTitle: 'Supply Chain Operations Manager',
    ciFacts: [
      'New €500M smart factory in Dresden (Germany) - fully automated with Industry 4.0 standards',
      'Semiconductor supply chain diversification: Now sourcing from 12 suppliers vs 3 pre-2023',
      'Carbon-neutral manufacturing by 2030 commitment - 80% of plants already carbon-neutral',
      'Partnership with Tesla for battery management systems in 2025+ vehicle lineup',
      'Employee apprenticeship program: 15,000 new technical apprentices in Germany/EU in 2024',
      'SAP S/4HANA migration completed in Q3 2024 - real-time inventory visibility across 200 plants',
      'Near-shoring initiative: 3 new factories in Mexico to serve North American EV demand',
      'Bosch IoT Suite now monitoring 50M+ connected devices in automotive supply chain'
    ],
    expectedAssignments: {
      'New €500M smart factory in Dresden (Germany) - fully automated with Industry 4.0 standards': {
        primary: ['recruiter_screen', 'strategic_role_discussion'],
        secondary: ['behavioral_deep_dive'],
        avoid: ['culture_values_alignment', 'executive_final'],
        reasoning: 'Factory opening and automation - recruiter (primary) for timeline/team. Strategic (primary) for Industry 4.0 competitive advantage. Behavioral (secondary) for automation workflows. Culture (avoid). Executive (avoid) - tactical.'
      },
      'Semiconductor supply chain diversification: Now sourcing from 12 suppliers vs 3 pre-2023': {
        primary: ['strategic_role_discussion'],
        secondary: ['behavioral_deep_dive'],
        avoid: ['recruiter_screen', 'culture_values_alignment', 'executive_final'],
        reasoning: 'Risk mitigation strategy - strategic round (primary). Behavioral (secondary) for multi-supplier coordination processes. Recruiter (avoid) - too strategic. Culture (avoid). Executive (avoid) - tactical diversification.'
      },
      'Carbon-neutral manufacturing by 2030 commitment - 80% of plants already carbon-neutral': {
        primary: ['culture_values_alignment', 'strategic_role_discussion'],
        secondary: ['executive_final'],
        avoid: ['recruiter_screen', 'behavioral_deep_dive'],
        reasoning: 'Sustainability values + strategic positioning - culture (primary) for environmental values. Strategic (primary) for competitive advantage in ESG. Executive (secondary) for long-term vision. Recruiter (avoid). Behavioral (avoid) - not about processes.'
      },
      'Partnership with Tesla for battery management systems in 2025+ vehicle lineup': {
        primary: ['strategic_role_discussion'],
        secondary: ['executive_final'],
        avoid: ['recruiter_screen', 'behavioral_deep_dive', 'culture_values_alignment'],
        reasoning: 'Strategic partnership - strategic round (primary). Executive (secondary) for EV industry trends. Recruiter (avoid) - too strategic. Behavioral (avoid) - not about processes. Culture (avoid).'
      },
      'Employee apprenticeship program: 15,000 new technical apprentices in Germany/EU in 2024': {
        primary: ['culture_values_alignment'],
        secondary: ['recruiter_screen'],
        avoid: ['behavioral_deep_dive', 'strategic_role_discussion', 'executive_final'],
        reasoning: 'Workforce development values - culture round (primary). Recruiter (secondary) for hiring/training. Behavioral (avoid) - not about team processes. Strategic (avoid) - tactical HR. Executive (avoid) - tactical.'
      },
      'SAP S/4HANA migration completed in Q3 2024 - real-time inventory visibility across 200 plants': {
        primary: ['behavioral_deep_dive'],
        secondary: ['strategic_role_discussion'],
        avoid: ['recruiter_screen', 'culture_values_alignment', 'executive_final'],
        reasoning: 'System migration impacting daily work - behavioral round (primary). Strategic (secondary) for operational efficiency gains. Recruiter (avoid) - too technical. Culture (avoid). Executive (avoid) - tactical.'
      },
      'Near-shoring initiative: 3 new factories in Mexico to serve North American EV demand': {
        primary: ['strategic_role_discussion'],
        secondary: ['recruiter_screen', 'executive_final'],
        avoid: ['behavioral_deep_dive', 'culture_values_alignment'],
        reasoning: 'Market expansion strategy - strategic round (primary). Recruiter (secondary) for new locations. Executive (secondary) for North America strategy. Behavioral (avoid) - not about processes. Culture (avoid).'
      },
      'Bosch IoT Suite now monitoring 50M+ connected devices in automotive supply chain': {
        primary: ['strategic_role_discussion'],
        secondary: ['behavioral_deep_dive', 'executive_final'],
        avoid: ['recruiter_screen', 'culture_values_alignment'],
        reasoning: 'Technology differentiation - strategic round (primary). Behavioral (secondary) for IoT monitoring workflows. Executive (secondary) for connected industry vision. Recruiter (avoid) - too technical. Culture (avoid).'
      }
    }
  },

  // ══════════════════════════════════════════════════════════════════════════
  // TEST CASE 5: CONSULTING (Management Consulting)
  // ══════════════════════════════════════════════════════════════════════════
  {
    id: 'consulting-management',
    industry: 'Management Consulting',
    companyName: 'McKinsey & Company',
    jobTitle: 'Engagement Manager',
    ciFacts: [
      'New $1B AI and analytics practice launched Q4 2024 - fastest-growing practice area',
      'Partnership with Google Cloud on generative AI solutions for Fortune 500 clients',
      'Unlimited PTO policy introduced for consultants in 2024 (North America only)',
      'McKinsey Implementation (MI) growing 40% YoY - now 30% of total revenue',
      'Apprenticeship model: 50% of BAs now hired directly from undergrad vs MBA programs',
      'Client satisfaction scores increased from 8.2 to 8.9 following new staffing model',
      'Expanded climate & sustainability practice to 1,000+ consultants globally',
      'Knowledge management AI tool reduces research time by 50% per engagement'
    ],
    expectedAssignments: {
      'New $1B AI and analytics practice launched Q4 2024 - fastest-growing practice area': {
        primary: ['strategic_role_discussion', 'executive_final'],
        secondary: ['recruiter_screen'],
        avoid: ['behavioral_deep_dive', 'culture_values_alignment'],
        reasoning: 'New practice area and growth - strategic (primary) and executive (primary). Recruiter (secondary) for "we\'re growing in AI". Behavioral (avoid). Culture (avoid).'
      },
      'Partnership with Google Cloud on generative AI solutions for Fortune 500 clients': {
        primary: ['strategic_role_discussion'],
        secondary: ['behavioral_deep_dive'],
        avoid: ['recruiter_screen', 'culture_values_alignment', 'executive_final'],
        reasoning: 'Strategic partnership - strategic round (primary). Behavioral (secondary) for cross-firm collaboration. Recruiter (avoid) - too strategic. Culture (avoid). Executive (avoid) - tactical partnership.'
      },
      'Unlimited PTO policy introduced for consultants in 2024 (North America only)': {
        primary: ['culture_values_alignment'],
        secondary: ['recruiter_screen'],
        avoid: ['behavioral_deep_dive', 'strategic_role_discussion', 'executive_final'],
        reasoning: 'Work culture policy - culture round (primary). Recruiter (secondary) for benefits. Behavioral (avoid) - not about team processes. Strategic (avoid) - HR policy. Executive (avoid).'
      },
      'McKinsey Implementation (MI) growing 40% YoY - now 30% of total revenue': {
        primary: ['strategic_role_discussion', 'executive_final'],
        secondary: [],
        avoid: ['recruiter_screen', 'behavioral_deep_dive', 'culture_values_alignment'],
        reasoning: 'Business model evolution - strategic (primary) and executive (primary). Recruiter (avoid) - too strategic. Behavioral (avoid) - metric. Culture (avoid).'
      },
      'Apprenticeship model: 50% of BAs now hired directly from undergrad vs MBA programs': {
        primary: ['recruiter_screen'],
        secondary: ['culture_values_alignment'],
        avoid: ['behavioral_deep_dive', 'strategic_role_discussion', 'executive_final'],
        reasoning: 'Hiring model change - recruiter (primary). Culture (secondary) for accessibility/diversity values. Behavioral (avoid). Strategic (avoid) - HR tactic. Executive (avoid).'
      },
      'Client satisfaction scores increased from 8.2 to 8.9 following new staffing model': {
        primary: ['strategic_role_discussion'],
        secondary: ['behavioral_deep_dive'],
        avoid: ['recruiter_screen', 'culture_values_alignment', 'executive_final'],
        reasoning: 'Service delivery improvement - strategic round (primary). Behavioral (secondary) for staffing processes. Recruiter (avoid) - metric. Culture (avoid). Executive (avoid) - tactical improvement.'
      },
      'Expanded climate & sustainability practice to 1,000+ consultants globally': {
        primary: ['strategic_role_discussion'],
        secondary: ['culture_values_alignment', 'executive_final'],
        avoid: ['recruiter_screen', 'behavioral_deep_dive'],
        reasoning: 'Practice expansion and market positioning - strategic (primary). Culture (secondary) for sustainability values. Executive (secondary) for climate strategy. Recruiter (avoid) - too strategic. Behavioral (avoid).'
      },
      'Knowledge management AI tool reduces research time by 50% per engagement': {
        primary: ['behavioral_deep_dive'],
        secondary: ['strategic_role_discussion'],
        avoid: ['recruiter_screen', 'culture_values_alignment', 'executive_final'],
        reasoning: 'Process tool improving workflow - behavioral (primary). Strategic (secondary) for efficiency advantage. Recruiter (avoid) - too technical. Culture (avoid). Executive (avoid) - tactical tool.'
      }
    }
  }
];

/**
 * Utility: Extract all CI facts from golden dataset
 */
export function getAllCIFactsFromGoldenDataset(): Array<{
  fact: string;
  industry: string;
  expectedPrimary: NonTechnicalRoundType[];
  expectedSecondary: NonTechnicalRoundType[];
  expectedAvoid: NonTechnicalRoundType[];
}> {
  const allFacts: Array<any> = [];

  CI_CATEGORIZATION_GOLDEN_DATASET.forEach(example => {
    example.ciFacts.forEach(fact => {
      const assignment = example.expectedAssignments[fact];
      if (assignment) {
        allFacts.push({
          fact,
          industry: example.industry,
          expectedPrimary: assignment.primary,
          expectedSecondary: assignment.secondary,
          expectedAvoid: assignment.avoid
        });
      }
    });
  });

  return allFacts;
}

/**
 * Utility: Get test cases by industry
 */
export function getTestCasesByIndustry(industry: string): GoldenDatasetExample | undefined {
  return CI_CATEGORIZATION_GOLDEN_DATASET.find(
    example => example.industry.toLowerCase().includes(industry.toLowerCase())
  );
}

/**
 * Summary Statistics
 */
export const GOLDEN_DATASET_STATS = {
  totalIndustries: CI_CATEGORIZATION_GOLDEN_DATASET.length,
  totalCIFacts: CI_CATEGORIZATION_GOLDEN_DATASET.reduce((sum, ex) => sum + ex.ciFacts.length, 0),
  industries: CI_CATEGORIZATION_GOLDEN_DATASET.map(ex => ex.industry),
  avgCIFactsPerIndustry: Math.round(
    CI_CATEGORIZATION_GOLDEN_DATASET.reduce((sum, ex) => sum + ex.ciFacts.length, 0) /
    CI_CATEGORIZATION_GOLDEN_DATASET.length
  )
};

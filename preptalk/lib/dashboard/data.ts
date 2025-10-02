import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

export type JourneyStatus = 'complete' | 'current' | 'upcoming';

export type JourneyRound = {
  id: string;
  order: number;
  title: string;
  persona: string;
  focus: string;
  status: JourneyStatus;
  curriculumId?: string;
  roundNumber?: number;
};

export type QuestionGuide = {
  id: string;
  persona: string;
  context: string;
  prompts: string[];
};

export type DashboardUser = {
  fullName: string;
  tierLabel: string;
  companyName: string | null;
  jobTitle: string | null;
  targetRole?: string | null;
  experienceLevel?: string | null;
  avatarUrl?: string | null;
  email?: string | null;
  provider?: string | null;
};

export type CurriculumListItem = {
  id: string;
  title: string;
  company_name: string | null;
  job_title: string | null;
  total_rounds: number;
  updated_at: string;
  created_at: string;
};

export type DashboardData = {
  user: DashboardUser;
  journey: JourneyRound[];
  questionGuides: QuestionGuide[];
  hasOwnCurriculum: boolean;
  metadata: {
    source: 'fallback' | 'partial' | 'supabase';
    loadedAt: string;
    missing: string[];
  };
  allCurricula: CurriculumListItem[];
  selectedCurriculumId: string | null;
};

const fallbackUser: DashboardUser = {
  fullName: 'Alex Johnson',
  tierLabel: 'Pro tier',
  companyName: 'Vercel',
  jobTitle: 'Staff Frontend Engineer',
  targetRole: 'Staff Frontend Engineer',
  experienceLevel: 'senior',
};

const fallbackJourney: JourneyRound[] = [
  {
    id: 'round-1',
    order: 1,
    title: 'Opportunity Alignment',
    persona: 'Recruiter',
    focus: 'Discover goals, motivations, and high-level fit.',
    status: 'complete',
  },
  {
    id: 'round-2',
    order: 2,
    title: 'Foundational Technical',
    persona: 'Senior Engineer',
    focus: 'Assess core fundamentals and communication style.',
    status: 'current',
  },
  {
    id: 'round-3',
    order: 3,
    title: 'Systems Collaboration',
    persona: 'Principal Engineer',
    focus: 'Co-design a system, debating trade-offs in real time.',
    status: 'upcoming',
  },
  {
    id: 'round-4',
    order: 4,
    title: 'Leadership Narrative',
    persona: 'Hiring Manager',
    focus: 'Showcase leadership instincts and stakeholder fluency.',
    status: 'upcoming',
  },
  {
    id: 'round-5',
    order: 5,
    title: 'Offer Calibration',
    persona: 'Executive Sponsor',
    focus: 'Align on scope, expectations, and compensation contours.',
    status: 'upcoming',
  },
];

const fallbackQuestionGuides: QuestionGuide[] = [
  {
    id: 'recruiter-questions',
    persona: 'Recruiter / Talent Partner',
    context:
      'Pre-frame your story and confirm expectations during the opportunity alignment call.',
    prompts: [
      'What outcomes matter most in the first 90 days for this hire?',
      'How do you define a successful collaboration with the hiring manager?',
      'Is there anything about my background you’d like me to expand on before the next round?',
    ],
  },
  {
    id: 'technical-questions',
    persona: 'Senior Engineer',
    context: 'Demonstrate curiosity about the stack and how technical decisions get made.',
    prompts: [
      'What recent technical trade-off are you most proud of, and why?',
      'How do you approach iterating on architecture while still shipping quickly?',
      'Where do you see the biggest technical debt, and how is the team addressing it?',
    ],
  },
  {
    id: 'systems-questions',
    persona: 'Principal Engineer',
    context: 'Explore design philosophy and collaboration patterns during systems sessions.',
    prompts: [
      'How do product and platform teams share context when designing new systems?',
      'Which metrics or signals tell you a design is ready for investment?',
      'Where have past designs gone sideways, and what did the team learn?',
    ],
  },
  {
    id: 'leadership-questions',
    persona: 'Hiring Manager',
    context: 'Align on leadership approach, coaching style, and team dynamics.',
    prompts: [
      'What does great leadership look like on this team?',
      'How do you prefer to give and receive feedback?',
      'Where is the team growing fastest, and how can this role accelerate that?',
    ],
  },
  {
    id: 'executive-questions',
    persona: 'Executive Sponsor',
    context: 'Signal strategic thinking and ensure you understand the broader mandate.',
    prompts: [
      'Which strategic bets are top-of-mind for you this quarter?',
      'How will you measure success for this hire at the one-year mark?',
      'What should I know about the broader leadership team’s priorities?',
    ],
  },
];

const candidatePrepGuideSchema = z
  .object({
    standard_questions_prep: z
      .array(
        z
          .object({
            question: z.string().min(1),
          })
          .passthrough()
      )
      .optional(),
  })
  .passthrough();

const interviewerPersonaSchema = z
  .object({
    name: z.string().nullish(),
    role: z.string().nullish(),
    persona: z.string().nullish(),
  })
  .passthrough();

const curriculumRoundSchema = z.object({
  id: z.string(),
  round_number: z.number().int().positive(),
  title: z.string().nullish(),
  description: z.string().nullish(),
  round_type: z.string().nullish(),
  duration_minutes: z.number().int().nonnegative().nullish(),
  interviewer_persona: interviewerPersonaSchema.nullish(),
  candidate_prep_guide: candidatePrepGuideSchema.nullish(),
});

const curriculumSchema = z.object({
  id: z.string(),
  job_id: z.string().nullish(),
  title: z.string().nullish(),
  company_name: z.string().nullish(),
  job_title: z.string().nullish(),
  total_rounds: z.number().int().positive().nullish(),
  estimated_total_minutes: z.number().int().positive().nullish(),
});

const jobSchema = z.object({
  id: z.string(),
  title: z.string().nullish(),
  company_id: z.string().nullish(),
});

const companySchema = z.object({
  id: z.string(),
  display_name: z.string().nullish(),
  name: z.string().nullish(),
});

function derivePersona(round: z.infer<typeof curriculumRoundSchema>): string {
  return (
    round.interviewer_persona?.role ||
    round.interviewer_persona?.name ||
    `Round ${round.round_number}`
  );
}

function deriveContext(round: z.infer<typeof curriculumRoundSchema>): string {
  if (round.description) {
    return round.description;
  }

  const roundType = round.round_type?.replace(/_/g, ' ') ?? 'Interview focus';
  return `Focus: ${roundType}`;
}

function buildJourney(
  rounds: z.infer<typeof curriculumRoundSchema>[],
  currentRoundNumber: number,
  curriculumId?: string
): JourneyRound[] {
  if (rounds.length === 0) {
    return fallbackJourney;
  }

  const journey = rounds
    .sort((a, b) => a.round_number - b.round_number)
    .map((round) => {
      let status: JourneyStatus = 'upcoming';

      if (round.round_number < currentRoundNumber) {
        status = 'complete';
      } else if (round.round_number === currentRoundNumber) {
        status = 'current';
      }

      return {
        id: round.id,
        order: round.round_number,
        title: round.title ?? `Round ${round.round_number}`,
        persona: derivePersona(round),
        focus: deriveContext(round),
        status,
        curriculumId,
        roundNumber: round.round_number,
      } satisfies JourneyRound;
    });

  if (journey.length < fallbackJourney.length) {
    const existingOrders = new Set(journey.map((round) => round.order));

    fallbackJourney.forEach((fallbackRound) => {
      if (!existingOrders.has(fallbackRound.order)) {
        journey.push({
          ...fallbackRound,
          id: `fallback-${fallbackRound.id}`,
          status: 'upcoming',
        });
      }
    });

    journey.sort((a, b) => a.order - b.order);
  }

  return journey;
}

function buildQuestionGuides(
  rounds: z.infer<typeof curriculumRoundSchema>[],
  fallback: QuestionGuide[]
): QuestionGuide[] {
  const guides = rounds
    .map((round) => {
      const prompts = round.candidate_prep_guide?.standard_questions_prep
        ?.map((item) => item.question)
        .filter(Boolean) ?? [];

      if (prompts.length === 0) {
        return null;
      }

      return {
        id: `round-${round.round_number}-questions`,
        persona: derivePersona(round),
        context: deriveContext(round),
        prompts: prompts.slice(0, 4),
      } satisfies QuestionGuide;
    })
    .filter(Boolean) as QuestionGuide[];

  return guides.length > 0 ? guides : fallback;
}

export async function getDashboardData(selectedCurriculumId?: string | null): Promise<DashboardData> {
  const missing: string[] = [];
  const supabase = await createClient();

  let source: DashboardData['metadata']['source'] = 'fallback';

  // Start with fallback so we always return a complete payload
  const data: DashboardData = {
    user: { ...fallbackUser },
    journey: [...fallbackJourney],
    questionGuides: [...fallbackQuestionGuides],
    hasOwnCurriculum: false,
    allCurricula: [],
    selectedCurriculumId: null,
    metadata: {
      source,
      loadedAt: new Date().toISOString(),
      missing,
    },
  };

  try {
    // Get user first
    const { data: authData, error: authError } = await supabase.auth.getUser();

    const supabaseUser = authData?.user ?? null;

    if (authError) {
      missing.push('auth:user');
      console.error('Auth error in dashboard:', authError);
    }

    if (!supabaseUser) {
      missing.push('auth:user');
    } else {
      console.log('✅ Authenticated user for dashboard:', supabaseUser.id);
    }

    // STEP 1: Get ALL curricula for the dropdown
    const { data: allCurriculaData, error: allCurriculaError } = await supabase
      .from('curricula')
      .select(`
        id,
        title,
        company_name,
        job_title,
        total_rounds,
        updated_at,
        created_at,
        cv_analyses!inner(user_id)
      `)
      .eq('is_active', true)
      .eq('cv_analyses.user_id', supabaseUser?.id)
      .eq('generation_status', 'complete')
      .not('company_name', 'is', null)
      .order('updated_at', { ascending: false });

    const allCurricula: CurriculumListItem[] = allCurriculaData?.map(c => ({
      id: c.id,
      title: c.title,
      company_name: c.company_name,
      job_title: c.job_title,
      total_rounds: c.total_rounds,
      updated_at: c.updated_at,
      created_at: c.created_at,
    })) || [];

    data.allCurricula = allCurricula;

    // STEP 2: Determine which curriculum to show
    let curriculumIdToFetch = selectedCurriculumId;
    if (!curriculumIdToFetch && allCurricula.length > 0) {
      curriculumIdToFetch = allCurricula[0].id; // Default to most recent
    }

    data.selectedCurriculumId = curriculumIdToFetch;

    // STEP 3: Get specific curriculum details
    const { data: curriculumData, error: curriculumError } = await supabase
      .from('curricula')
      .select(`
        id,
        job_id,
        title,
        company_name,
        job_title,
        total_rounds,
        estimated_total_minutes,
        cv_analyses!inner(user_id)
      `)
      .eq('id', curriculumIdToFetch)
      .maybeSingle();

    if (curriculumError) {
      missing.push('curricula');
    }

    const parsedCurriculum = curriculumData ? curriculumSchema.safeParse(curriculumData) : null;


    if (parsedCurriculum?.success) {
      const curriculum = parsedCurriculum.data;
      const { data: roundsData, error: roundsError } = await supabase
        .from('curriculum_rounds')
        .select(
          'id, round_number, title, description, round_type, duration_minutes, interviewer_persona, candidate_prep_guide'
        )
        .eq('curriculum_id', curriculum.id)
        .order('round_number', { ascending: true });

      if (roundsError) {
        missing.push('curriculum_rounds');
      }

      const parsedRounds =
        roundsData
          ?.map((round) => curriculumRoundSchema.safeParse(round))
          .filter((result): result is z.SafeParseSuccess<z.infer<typeof curriculumRoundSchema>> =>
            result.success
          )
          .map((result) => result.data) ?? [];

      const currentRound = 1;

      if (parsedRounds.length > 0) {
        data.journey = buildJourney(parsedRounds, currentRound, curriculum.id);
        data.questionGuides = buildQuestionGuides(parsedRounds, fallbackQuestionGuides);
        data.hasOwnCurriculum = true;
        source = 'partial';
      }


      // Priority 1: Use company_name and job_title directly from curriculum (new CV-first flow)
      if (curriculum.company_name || curriculum.job_title) {
        if (curriculum.company_name) {
          data.user.companyName = curriculum.company_name;
        }
        if (curriculum.job_title) {
          data.user.jobTitle = curriculum.job_title;
        }
      }
      // Priority 2: Legacy flow - lookup via job_id
      else if (curriculum.job_id) {
        const { data: jobData, error: jobError } = await supabase
          .from('jobs')
          .select('id, title, company_id')
          .eq('id', curriculum.job_id)
          .maybeSingle();

        const parsedJob = jobData ? jobSchema.safeParse(jobData) : null;

        if (jobError) {
          missing.push('jobs');
        }

        if (parsedJob?.success) {
          data.user.jobTitle = parsedJob.data.title ?? data.user.jobTitle;

          if (parsedJob.data.company_id) {
            const { data: companyData, error: companyError } = await supabase
              .from('companies')
              .select('id, name, display_name')
              .eq('id', parsedJob.data.company_id)
              .maybeSingle();

            if (companyError) {
              missing.push('companies');
            }

            const parsedCompany = companyData ? companySchema.safeParse(companyData) : null;


            if (parsedCompany?.success) {
              data.user.companyName =
                parsedCompany.data.display_name || parsedCompany.data.name || data.user.companyName;
            }
          }
        }
      }
      // Priority 3: Last resort fallback
      else {
        // Fallback: Extract company name from curriculum title
        if (curriculum.title) {
          const titleLower = curriculum.title.toLowerCase();

          // Check for common patterns like "Software Engineer at Picnic" or "Frontend Developer - Apple"
          const companyMatches = [
            curriculum.title.match(/\s+at\s+(.+?)(?:\s*-|$)/i),
            curriculum.title.match(/\s+-\s+(.+?)(?:\s*\(|$)/i),
            curriculum.title.match(/\s+@\s+(.+?)(?:\s*-|$)/i)
          ];

          const extractedCompany = companyMatches.find(match => match)?.[1]?.trim();

          if (extractedCompany && extractedCompany.length > 1) {
            data.user.companyName = extractedCompany;

            // Extract job title by removing company part
            const jobTitlePattern = new RegExp(`\\s+(at|@|-)\\s+${extractedCompany.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}.*$`, 'i');
            data.user.jobTitle = curriculum.title.replace(jobTitlePattern, '').trim() || data.user.jobTitle;
          } else if (titleLower.includes('picnic')) {
            // Fallback for Picnic specifically
            data.user.companyName = 'Picnic';
            data.user.jobTitle = curriculum.title.replace(/\s*at\s+picnic/i, '').trim() || data.user.jobTitle;
          }
        }
      }

      // AGGRESSIVE FIX: Override company name from curriculum title if it contains known companies
      // This runs regardless of job_id to fix stale database references
      if (curriculum.title) {
        const titleLower = curriculum.title.toLowerCase();

        // Check for Picnic specifically (case-insensitive)
        if (titleLower.includes('picnic')) {
          data.user.companyName = 'Picnic';

          // Try to extract job title
          const jobTitleMatch = curriculum.title.match(/^([^@-]+?)(?:\s+(?:at|@|-)\s+picnic.*)?$/i);
          if (jobTitleMatch && jobTitleMatch[1]) {
            data.user.jobTitle = jobTitleMatch[1].trim();
          }
        }

        // Check for other common company patterns too
        const companyPatterns = [
          { pattern: /\bat\s+(\w+)/i, name: 'company' },
          { pattern: /@\s*(\w+)/i, name: 'company' },
          { pattern: /-\s*(\w+)/i, name: 'company' }
        ];

        for (const { pattern } of companyPatterns) {
          const match = curriculum.title.match(pattern);
          if (match && match[1] && match[1].toLowerCase() !== 'vercel' && data.user.companyName === 'Vercel') {
            data.user.companyName = match[1];
            break;
          }
        }
      }
    } else {
      missing.push('curricula:empty');
    }

    if (supabaseUser?.id) {
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('full_name, avatar_url, target_role, experience_level')
        .eq('user_id', supabaseUser.id)
        .maybeSingle();

      if (profileError) {
        missing.push('user_profiles');
      }

      // Use profile data if available, otherwise fallback to OAuth metadata from auth.users
      if (profileData?.full_name) {
        data.user.fullName = profileData.full_name;
      } else if (authData?.user) {
        // Fallback to OAuth metadata
        data.user.fullName =
          authData.user.user_metadata?.full_name ||
          authData.user.user_metadata?.name ||
          authData.user.email?.split('@')[0] ||
          'there';
      }

      // Avatar URL from profile or OAuth
      if (profileData?.avatar_url) {
        data.user.avatarUrl = profileData.avatar_url;
      } else if (authData?.user) {
        data.user.avatarUrl =
          authData.user.user_metadata?.avatar_url ||
          authData.user.user_metadata?.picture;
      }

      // Email and provider for display
      if (authData?.user) {
        data.user.email = authData.user.email;
        data.user.provider = authData.user.app_metadata?.provider;
      }

      if (profileData?.target_role) {
        data.user.targetRole = profileData.target_role;
        data.user.jobTitle = data.user.jobTitle ?? profileData.target_role;
      }

      if (profileData?.experience_level) {
        data.user.experienceLevel = profileData.experience_level;
      }

      source = source === 'partial' ? 'partial' : 'supabase';
    } else {
      missing.push('auth:unauthenticated');
    }
  } catch (error) {
    console.error('[dashboard] Failed to load dashboard data', error);
    missing.push('unexpected');
  }

  data.metadata = {
    source,
    loadedAt: new Date().toISOString(),
    missing,
  };

  return data;
}

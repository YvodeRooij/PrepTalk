'use client';

type JourneyStatus = 'complete' | 'current' | 'upcoming';

type JourneyRound = {
  id: string;
  order: number;
  title: string;
  persona: string;
  focus: string;
  status: JourneyStatus;
};

type QuestionGuide = {
  id: string;
  persona: string;
  context: string;
  prompts: string[];
};

const user = {
  fullName: 'Alex Johnson',
  tier: 'Pro',
  company: 'Vercel',
};

const journey: JourneyRound[] = [
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

const questionGuides: QuestionGuide[] = [
  {
    id: 'recruiter-questions',
    persona: 'Recruiter / Talent Partner',
    context: 'Pre-frame your story and confirm expectations during the opportunity alignment call.',
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

const statusLabel: Record<JourneyStatus, string> = {
  complete: 'Completed',
  current: 'Up next',
  upcoming: 'Queued',
};

const statusTone: Record<JourneyStatus, string> = {
  complete: 'bg-green-100 text-green-800 border-green-200',
  current: 'bg-blue-100 text-blue-800 border-blue-200',
  upcoming: 'bg-gray-100 text-gray-700 border-gray-200',
};

const markerTone: Record<JourneyStatus, string> = {
  complete: 'border-green-200 text-green-600 bg-green-50',
  current: 'border-blue-200 text-blue-600 bg-blue-50',
  upcoming: 'border-gray-200 text-gray-500 bg-gray-50',
};

export default function DashboardOverviewPage() {
  const firstName = user.fullName.split(' ')[0] ?? 'there';
  const completedRounds = journey.filter((round) => round.status === 'complete').length;
  const progress = Math.round((completedRounds / journey.length) * 100);

  return (
    <div className="px-4 py-8 md:px-8 md:py-12">
      <div className="space-y-8 md:space-y-10">
        <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm md:p-8">
          <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
            <div className="space-y-4">
              <span className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.28em] text-blue-700">
                Overview
              </span>
              <div className="space-y-3">
                <h1 className="text-3xl font-semibold text-gray-900 md:text-4xl">
                  Welcome, {firstName}.
                </h1>
                <p className="max-w-xl text-sm text-gray-600 md:text-base">
                  Your interview intelligence hub. Track every round, align with the personas you’ll meet, and stay momentum-rich from now until offer.
                </p>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700">
                {user.tier} tier
              </div>
            </div>

            <div className="w-full max-w-xs rounded-lg border border-blue-100 bg-blue-50 p-6 text-blue-900">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-600">
                Applying to
              </p>
              <p className="mt-4 text-2xl font-semibold text-blue-900">
                {user.company}
              </p>
              <p className="mt-3 text-sm leading-relaxed text-blue-800">
                Keep tailoring your narrative to the product vision and the personas on the other side of the table.
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm md:p-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold text-gray-900">Interview journey</h2>
              <p className="max-w-2xl text-sm text-gray-600 md:text-base">
                Every conversation mapped into five rounds. Clear personas, focus areas, and status so you always know what to prep for next.
              </p>
            </div>
            <div className="w-full max-w-xs rounded-lg border border-gray-200 bg-gray-50 px-5 py-4 text-sm text-gray-700">
              <div className="flex items-center justify-between text-sm font-medium text-gray-900">
                <span>Progress</span>
                <span>{progress}%</span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-gray-200">
                <div
                  className="h-2 rounded-full bg-blue-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-gray-500">
                {completedRounds} of {journey.length} rounds completed.
              </p>
            </div>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {journey.map((round) => (
              <JourneyCard key={round.id} round={round} />
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm md:p-8">
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold text-gray-900">Questions to ask</h2>
            <p className="max-w-3xl text-sm text-gray-600 md:text-base">
              Bring thoughtful prompts to every conversation. These questions help you uncover signal, build rapport, and demonstrate that you’re thinking beyond the scripted interview flow.
            </p>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {questionGuides.map((guide) => (
              <article
                key={guide.id}
                className="flex h-full flex-col gap-4 rounded-lg border border-gray-200 bg-gray-50 p-5"
              >
                <header className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-blue-600">
                    {guide.persona}
                  </p>
                  <p className="text-sm text-gray-600">{guide.context}</p>
                </header>
                <ul className="space-y-2 text-sm text-gray-700">
                  {guide.prompts.map((prompt, index) => (
                    <li key={index} className="flex gap-2">
                      <span className="mt-1 inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-blue-400" />
                      <span>{prompt}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function JourneyCard({ round }: { round: JourneyRound }) {
  return (
    <article className="flex h-full flex-col gap-4 rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
      <header className="flex items-center gap-4">
        <div className={`flex h-10 w-10 items-center justify-center rounded-full border text-sm font-semibold ${markerTone[round.status]}`}>
          {round.status === 'complete' ? '✓' : round.order}
        </div>
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-gray-500">
            Round {String(round.order).padStart(2, '0')}
          </span>
          <h3 className="mt-1 text-base font-semibold text-gray-900">{round.title}</h3>
        </div>
      </header>

      <div className="space-y-2">
        <p className="text-sm font-medium text-gray-700">{round.persona}</p>
        <p className="text-sm leading-relaxed text-gray-600">{round.focus}</p>
      </div>

      <footer className="mt-auto">
        <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] ${statusTone[round.status]}`}>
          {statusLabel[round.status]}
        </span>
      </footer>
    </article>
  );
}
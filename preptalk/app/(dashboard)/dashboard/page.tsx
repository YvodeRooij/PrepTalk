import { getDashboardData, type JourneyRound, type QuestionGuide } from '@/lib/dashboard/data';
import Link from 'next/link';
import { Mic } from 'lucide-react';

type JourneyStatus = JourneyRound['status'];

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

const dataSourceCopy: Record<'fallback' | 'partial' | 'supabase', { label: string; tone: string }> = {
  fallback: {
    label: 'Demo data',
    tone: 'border-gray-200 bg-gray-50 text-gray-600',
  },
  partial: {
    label: 'Supabase (partial)',
    tone: 'border-yellow-200 bg-yellow-50 text-yellow-700',
  },
  supabase: {
    label: 'Supabase live data',
    tone: 'border-green-200 bg-green-50 text-green-700',
  },
};

const missingCopy: Record<string, string> = {
  'auth:user': 'User session',
  'auth:unauthenticated': 'No active session',
  curricula: 'Curriculum data',
  'curricula:empty': 'Curriculum data',
  curriculum_rounds: 'Curriculum rounds',
  jobs: 'Job info',
  companies: 'Company info',
  user_profiles: 'Profile details',
};

function formatMissingHint(code: string): string | null {
  if (missingCopy[code]) {
    return missingCopy[code];
  }

  if (code.startsWith('auth')) {
    return null;
  }

  return code
    .split(':')
    .pop()
    ?.replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase()) ?? null;
}

export const dynamic = 'force-dynamic';

export default async function DashboardOverviewPage() {
  const { user, journey, questionGuides, metadata } = await getDashboardData();

  const firstName = user.fullName.split(' ')[0] || 'there';
  const totalRounds = journey.length;
  const completedRounds = journey.filter((round) => round.status === 'complete').length;
  const progress = totalRounds > 0 ? Math.round((completedRounds / totalRounds) * 100) : 0;
  const dataSource = dataSourceCopy[metadata.source];
  const fallbackHints = metadata.missing
    .map(formatMissingHint)
    .filter((value): value is string => Boolean(value))
    .slice(0, 3);

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
              <div className="flex flex-wrap gap-2">
                <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700">
                  {user.tierLabel}
                </div>
                <div className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-medium uppercase tracking-[0.18em] ${dataSource.tone}`}>
                  {dataSource.label}
                </div>
              </div>
            </div>

            <div className="w-full max-w-xs rounded-lg border border-blue-100 bg-blue-50 p-6 text-blue-900">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-600">
                Applying to
              </p>
              <p className="mt-4 text-2xl font-semibold text-blue-900">
                {user.companyName ?? 'Your target company'}
              </p>
              {user.jobTitle && (
                <p className="mt-1 text-sm font-medium text-blue-800">{user.jobTitle}</p>
              )}
              <p className="mt-3 text-sm leading-relaxed text-blue-800">
                Keep tailoring your narrative to the product vision and the personas on the other side of the table.
              </p>
              {metadata.source !== 'supabase' && fallbackHints.length > 0 && (
                <p className="mt-4 text-xs text-blue-700">
                  Using fallback for: {fallbackHints.join(', ')}
                </p>
              )}
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
                  style={{ width: `${Math.min(progress, 100)}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-gray-500">
                {completedRounds} of {journey.length} rounds completed.
              </p>
            </div>
          </div>

          {journey.length > 0 ? (
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
              {journey.map((round: JourneyRound) => (
                <JourneyCard key={round.id} round={round} />
              ))}
            </div>
          ) : (
            <div className="mt-8 rounded-lg border border-dashed border-gray-200 bg-gray-50 p-6 text-center">
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  Ready to start your interview preparation journey?
                </p>
                <Link
                  href="/curriculum"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  Create New Curriculum
                </Link>
              </div>
            </div>
          )}
        </section>

        <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm md:p-8">
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold text-gray-900">Questions to expect </h2>
            <p className="max-w-3xl text-sm text-gray-600 md:text-base">
              Expect questions like these—use them as a guide to surface signal, build rapport, and show you’re thinking beyond the script.
            </p>
            {metadata.source !== 'supabase' && (
              <p className="text-xs text-gray-500">
                Sign in with Supabase to unlock user-specific interview intel. For now we’re showing curated starter prompts.
              </p>
            )}
          </div>

          {questionGuides.length > 0 ? (
            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {questionGuides.map((guide: QuestionGuide) => (
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
                    {guide.prompts.map((prompt: string, index: number) => (
                      <li key={index} className="flex gap-2">
                        <span className="mt-1 inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-blue-400" />
                        <span>{prompt}</span>
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          ) : (
            <div className="mt-6 rounded-lg border border-dashed border-blue-100 bg-blue-50 p-6 text-sm text-blue-700">
              Questions will appear here once we have rounds configured for your target role.
            </div>
          )}
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

      <footer className="mt-auto space-y-3">
        <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] ${statusTone[round.status]}`}>
          {statusLabel[round.status]}
        </span>

        {round.curriculumId && round.roundNumber && (
          <Link
            href={`/interview/voice?curriculumId=${round.curriculumId}&roundNumber=${round.roundNumber}`}
            className="inline-flex items-center gap-2 w-full px-3 py-2 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-center justify-center"
          >
            <Mic className="h-3 w-3" />
            Practice voice
          </Link>
        )}
      </footer>
    </article>
  );
}
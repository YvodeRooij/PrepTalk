import { getDashboardData, type JourneyRound, type QuestionGuide } from '@/lib/dashboard/data';
import { CurriculumSelector } from '@/components/dashboard/curriculum-selector';
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

export default async function DashboardOverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ curriculumId?: string }>;
}) {
  const params = await searchParams;
  const { user, journey, questionGuides, hasOwnCurriculum, metadata, allCurricula, selectedCurriculumId } = await getDashboardData(params.curriculumId);

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
              <div className="flex items-center gap-4">
                {user.avatarUrl && (
                  <img
                    src={user.avatarUrl}
                    alt={user.fullName}
                    className="h-16 w-16 rounded-full border-2 border-gray-200"
                  />
                )}
                <div className="space-y-3">
                  <h1 className="text-3xl font-semibold text-gray-900 md:text-4xl">
                    Welcome, {firstName}.
                  </h1>
                  <p className="max-w-xl text-sm text-gray-600 md:text-base">
                    Your interview intelligence hub. Track every round, align with the personas you'll meet, and stay momentum-rich from now until offer.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700">
                  {user.tierLabel}
                </div>
                {user.provider && (
                  <div className="inline-flex items-center gap-2 rounded-full border border-green-100 bg-green-50 px-4 py-2 text-xs font-medium text-green-700">
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                    </svg>
                    Signed in with {user.provider === 'google' ? 'Google' : user.provider}
                  </div>
                )}
                <div className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-medium uppercase tracking-[0.18em] ${dataSource.tone}`}>
                  {dataSource.label}
                </div>
              </div>
            </div>

            {hasOwnCurriculum ? (
              <CurriculumSelector
                curricula={allCurricula}
                selectedId={selectedCurriculumId}
                currentCompany={user.companyName}
                currentJobTitle={user.jobTitle}
              />
            ) : (
              <div className="w-full max-w-xs rounded-lg border border-green-100 bg-gradient-to-br from-green-50 to-blue-50 p-6">
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                      <span className="text-2xl">🚀</span>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">Ready to prepare?</h3>
                    <p className="mt-2 text-sm text-gray-600">
                      Create your personalized curriculum to unlock AI-powered interview practice
                    </p>
                  </div>
                  <Link
                    href="/curriculum"
                    className="block w-full rounded-lg bg-blue-600 px-4 py-3 text-center text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors"
                  >
                    Create Your Curriculum →
                  </Link>
                  <p className="text-xs text-center text-gray-500">
                    Takes 5-10 minutes • Personalized to your role
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm md:p-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-semibold text-gray-900">Interview journey</h2>
                {!hasOwnCurriculum && (
                  <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">
                    Preview
                  </span>
                )}
              </div>
              <p className="max-w-2xl text-sm text-gray-600 md:text-base">
                {hasOwnCurriculum
                  ? 'Every conversation mapped into five rounds. Clear personas, focus areas, and status so you always know what to prep for next.'
                  : 'Preview what your personalized interview journey will look like. Create your curriculum to unlock.'
                }
              </p>
            </div>
            {hasOwnCurriculum && (
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
            )}
          </div>

          {journey.length > 0 ? (
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
              {journey.map((round: JourneyRound) => (
                <JourneyCard key={round.id} round={round} isLocked={!hasOwnCurriculum} />
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
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-semibold text-gray-900">Questions to expect</h2>
              {!hasOwnCurriculum && (
                <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">
                  Preview
                </span>
              )}
            </div>
            <p className="max-w-3xl text-sm text-gray-600 md:text-base">
              {hasOwnCurriculum
                ? 'Expect questions like these—use them as a guide to surface signal, build rapport, and show you\'re thinking beyond the script.'
                : 'Preview example interview questions. Your personalized questions will be tailored to your role and experience.'
              }
            </p>
          </div>

          {questionGuides.length > 0 ? (
            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {questionGuides.slice(0, hasOwnCurriculum ? undefined : 3).map((guide: QuestionGuide) => (
                <article
                  key={guide.id}
                  className={`relative flex h-full flex-col gap-4 rounded-lg border border-gray-200 bg-gray-50 p-5 ${!hasOwnCurriculum ? 'opacity-70' : ''}`}
                >
                  {!hasOwnCurriculum && (
                    <div className="absolute right-3 top-3">
                      <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                  )}
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

          {!hasOwnCurriculum && questionGuides.length > 0 && (
            <div className="mt-6 rounded-lg border border-blue-200 bg-blue-50 p-4 text-center">
              <p className="text-sm text-blue-800 mb-3">
                Want personalized questions tailored to your role and experience?
              </p>
              <Link
                href="/curriculum"
                className="inline-flex items-center gap-2 px-6 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                Create Your Curriculum →
              </Link>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function JourneyCard({ round, isLocked }: { round: JourneyRound; isLocked: boolean }) {
  const isCurrent = round.status === 'current';
  const isComplete = round.status === 'complete';

  // Enhanced styling based on status
  const cardBaseClasses = `
    relative flex h-full flex-col gap-4 rounded-xl border p-5
    transition-all duration-300 ease-out
    ${isLocked ? 'opacity-70' : 'opacity-100'}
  `;

  const cardStatusClasses =
    isCurrent
      ? 'border-blue-400 bg-gradient-to-br from-blue-50 via-white to-blue-50/30 shadow-lg shadow-blue-100/50 ring-2 ring-blue-200/50 scale-[1.02] hover:shadow-xl hover:shadow-blue-100/60 hover:scale-[1.03]'
      : isComplete
      ? 'border-green-200 bg-gradient-to-br from-green-50/50 to-white hover:shadow-md hover:border-green-300'
      : 'border-gray-200 bg-white hover:shadow-md hover:border-gray-300';

  const cardClasses = `${cardBaseClasses} ${cardStatusClasses}`;

  // Left accent border
  const accentBorder = isCurrent
    ? 'before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 before:bg-gradient-to-b before:from-blue-400 before:via-blue-500 before:to-blue-600 before:rounded-l-xl'
    : isComplete
    ? 'before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 before:bg-gradient-to-b before:from-green-400 before:via-green-500 before:to-green-600 before:rounded-l-xl'
    : '';

  const CardWrapper = !isLocked && round.curriculumId && round.roundNumber ? Link : 'article';
  const wrapperProps = CardWrapper === Link
    ? {
        href: `/interview/voice?curriculumId=${round.curriculumId}&roundNumber=${round.roundNumber}`,
        className: `${cardClasses} ${accentBorder} cursor-pointer focus:outline-none focus:ring-4 focus:ring-blue-400/30 group`,
        role: 'button',
        'aria-label': `Practice ${round.title} interview with ${round.persona}`,
      }
    : {
        className: `${cardClasses} ${accentBorder}`,
      };

  return (
    <CardWrapper {...wrapperProps as any}>
      {isLocked && (
        <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-gray-900/5 backdrop-blur-[1px] z-10">
          <div className="flex flex-col items-center gap-2 rounded-lg bg-white px-4 py-3 shadow-xl border border-gray-200">
            <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <span className="text-xs font-medium text-gray-600">Create curriculum</span>
          </div>
        </div>
      )}

      {/* Glow effect for current round */}
      {isCurrent && !isLocked && (
        <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-blue-400/10 via-transparent to-blue-500/5 pointer-events-none animate-pulse"
             style={{ animationDuration: '3s' }} />
      )}

      <header className="flex items-center gap-4 relative z-[1]">
        {/* Progress ring badge */}
        <div className="relative">
          {isCurrent && (
            <svg className="absolute -inset-1 w-12 h-12 -rotate-90">
              <circle
                cx="24"
                cy="24"
                r="22"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="text-blue-200"
                strokeDasharray="138"
                strokeDashoffset="0"
              />
              <circle
                cx="24"
                cy="24"
                r="22"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                className="text-blue-500 transition-all duration-500"
                strokeDasharray="138"
                strokeDashoffset="34"
                strokeLinecap="round"
              />
            </svg>
          )}
          <div className={`
            flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-bold
            transition-all duration-300
            ${isCurrent ? 'border-blue-500 bg-blue-500 text-white shadow-md shadow-blue-200' : ''}
            ${isComplete ? 'border-green-500 bg-green-500 text-white shadow-sm shadow-green-200' : ''}
            ${!isCurrent && !isComplete ? 'border-gray-300 bg-gray-50 text-gray-600' : ''}
            ${!isLocked && CardWrapper === Link ? 'group-hover:scale-110' : ''}
          `}>
            {isComplete ? (
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : (
              round.order
            )}
          </div>
        </div>

        <div className="flex-1">
          <span className={`
            text-[10px] font-bold uppercase tracking-[0.28em]
            ${isCurrent ? 'text-blue-600' : isComplete ? 'text-green-600' : 'text-gray-500'}
          `}>
            Round {String(round.order).padStart(2, '0')}
          </span>
          <h3 className={`
            mt-0.5 text-base font-semibold leading-tight
            ${isCurrent ? 'text-gray-900' : 'text-gray-800'}
            ${!isLocked && CardWrapper === Link ? 'group-hover:text-blue-600' : ''}
          `}>
            {round.title}
          </h3>
        </div>
      </header>

      <div className="space-y-2.5 relative z-[1]">
        <div className="flex items-center gap-2">
          <div className={`
            h-1.5 w-1.5 rounded-full
            ${isCurrent ? 'bg-blue-500' : isComplete ? 'bg-green-500' : 'bg-gray-400'}
          `} />
          <p className={`
            text-sm font-semibold
            ${isCurrent ? 'text-blue-900' : 'text-gray-700'}
          `}>
            {round.persona}
          </p>
        </div>
        <p className="text-sm leading-relaxed text-gray-600 pl-3.5">
          {round.focus}
        </p>
      </div>

      <footer className="mt-auto space-y-3 relative z-[1]">
        <div className="flex items-center justify-between">
          <span className={`
            inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.28em]
            transition-all duration-200
            ${statusTone[round.status]}
            ${isCurrent ? 'shadow-sm' : ''}
          `}>
            {isCurrent && (
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
              </span>
            )}
            {statusLabel[round.status]}
          </span>
        </div>

        {!isLocked && round.curriculumId && round.roundNumber && CardWrapper === Link && (
          <div className={`
            flex items-center justify-center gap-2 w-full px-3 py-2.5 text-xs font-semibold rounded-lg
            transition-all duration-200
            ${isCurrent
              ? 'bg-blue-600 text-white shadow-md shadow-blue-200 group-hover:bg-blue-700 group-hover:shadow-lg group-hover:shadow-blue-300'
              : 'bg-gray-600 text-white group-hover:bg-gray-700'
            }
          `}>
            <Mic className="h-3.5 w-3.5" />
            <span>Practice voice</span>
            <svg
              className="w-3 h-3 ml-auto transition-transform duration-200 group-hover:translate-x-1"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
            >
              <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        )}
      </footer>
    </CardWrapper>
  );
}
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { BookOpen, Target, Lightbulb, MessageSquare } from 'lucide-react';

interface PrepGuideQuestion {
  type: string;
  category: string;
  question: string;
  difficulty: string;
}

interface CITalkingPoint {
  recent_developments?: Array<{
    development: string;
    relevance_to_role: string;
    conversation_starters: string[];
  }>;
  strategic_advantages?: Array<{
    advantage: string;
    how_to_weave_in: string;
    example_response: string;
  }>;
}

interface RecognitionTraining {
  what_great_answers_sound_like?: string[];
  how_to_demonstrate_company_knowledge?: string[];
}

interface PrepGuide {
  standard_questions_prep?: PrepGuideQuestion[];
  ci_talking_points?: CITalkingPoint;
  recognition_training?: RecognitionTraining;
}

interface PrepGuideRound {
  id: string;
  round_number: number;
  title: string;
  candidate_prep_guide: PrepGuide;
  curriculum_id: string;
  curriculum_title: string;
}

export const dynamic = 'force-dynamic';

export default async function PrepGuidesPage() {
  const supabase = await createClient();

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="px-4 py-8 md:px-8 md:py-12">
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-6 text-yellow-800">
          Please sign in to view your prep guides.
        </div>
      </div>
    );
  }

  // Get most recent active curriculum for this user (same logic as dashboard)
  const { data: curriculumData } = await supabase
    .from('curricula')
    .select(`
      id,
      title,
      cv_analyses!inner(user_id)
    `)
    .eq('is_active', true)
    .eq('cv_analyses.user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const hasOwnCurriculum = !!curriculumData;

  // If no curriculum, show preview with fallback message
  if (!curriculumData) {
    return (
      <div className="px-4 py-8 md:px-8 md:py-12">
        <div className="space-y-8">
          <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm md:p-8">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.28em] text-amber-700">
                  Preview
                </span>
              </div>
              <h1 className="text-3xl font-semibold text-gray-900 md:text-4xl">
                Interview Preparation Guides
              </h1>
              <p className="max-w-3xl text-sm text-gray-600 md:text-base">
                Comprehensive prep materials for each interview round. Create your curriculum to unlock personalized guides.
              </p>
            </div>
          </section>

          <div className="rounded-lg border border-blue-200 bg-gradient-to-br from-blue-50 to-green-50 p-8 text-center">
            <div className="mx-auto max-w-lg space-y-4">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
                <span className="text-3xl">📚</span>
              </div>
              <h2 className="text-2xl font-semibold text-gray-900">Create Your Curriculum</h2>
              <p className="text-gray-600">
                Get personalized prep guides with company-specific insights, strategic talking points, and custom interview questions tailored to your role and experience.
              </p>
              <Link
                href="/curriculum"
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors"
              >
                Get Started →
              </Link>
              <p className="text-xs text-gray-500">
                Takes 5-10 minutes • Uses your CV and target role
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Get prep guides from curriculum_rounds for this curriculum
  const { data: prepGuides, error } = await supabase
    .from('curriculum_rounds')
    .select('id, round_number, title, candidate_prep_guide, curriculum_id')
    .eq('curriculum_id', curriculumData.id)
    .not('candidate_prep_guide', 'is', null)
    .order('round_number', { ascending: true });

  if (error) {
    console.error('Error fetching prep guides:', error);
  }

  const rounds: PrepGuideRound[] = prepGuides?.map(round => ({
    ...round,
    curriculum_title: curriculumData.title
  })) || [];

  return (
    <div className="px-4 py-8 md:px-8 md:py-12">
      <div className="space-y-8">
        <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm md:p-8">
          <div className="space-y-2">
            <span className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.28em] text-blue-700">
              Prep Guides
            </span>
            <h1 className="text-3xl font-semibold text-gray-900 md:text-4xl">
              Interview Preparation Guides
            </h1>
            <p className="max-w-3xl text-sm text-gray-600 md:text-base">
              Comprehensive prep materials for each interview round. Study these guides to understand what questions to expect, how to demonstrate company knowledge, and what makes a great answer.
            </p>
          </div>
        </section>

        {rounds.length > 0 ? (
          <div className="space-y-8">
            {rounds.map((round) => (
              <PrepGuideCard key={round.id} round={round} />
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 p-6 text-center">
            <p className="text-sm text-gray-600">
              No prep guides available yet. Create a curriculum to get started.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function PrepGuideCard({ round }: { round: PrepGuideRound }) {
  const guide = round.candidate_prep_guide;

  return (
    <article className="rounded-lg border border-gray-200 bg-white shadow-sm">
      {/* Header */}
      <header className="border-b border-gray-200 bg-gradient-to-r from-blue-50 to-white p-6">
        <div className="flex items-start justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-[0.24em] text-gray-500">
              Round {String(round.round_number).padStart(2, '0')}
            </span>
            <h2 className="mt-1 text-2xl font-semibold text-gray-900">{round.title}</h2>
            <p className="mt-1 text-sm text-gray-600">{round.curriculum_title}</p>
          </div>
          <BookOpen className="h-6 w-6 text-blue-600" />
        </div>
      </header>

      <div className="p-6 space-y-8">
        {/* Standard Questions */}
        {guide.standard_questions_prep && guide.standard_questions_prep.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <MessageSquare className="h-5 w-5 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-900">Expected Questions</h3>
            </div>
            <div className="space-y-3">
              {guide.standard_questions_prep.map((q, idx) => (
                <div
                  key={idx}
                  className="rounded-lg border border-gray-200 bg-gray-50 p-4"
                >
                  <div className="flex items-start gap-3">
                    <span className="mt-1 inline-block h-6 w-6 flex-shrink-0 rounded-full bg-blue-100 text-center text-xs font-semibold leading-6 text-blue-700">
                      {idx + 1}
                    </span>
                    <div className="flex-1 space-y-2">
                      <p className="text-sm font-medium text-gray-900">{q.question}</p>
                      <div className="flex flex-wrap gap-2">
                        <span className="inline-flex items-center rounded-full border border-blue-100 bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                          {q.category}
                        </span>
                        <span className="inline-flex items-center rounded-full border border-gray-200 bg-white px-2 py-0.5 text-xs font-medium text-gray-600">
                          {q.type}
                        </span>
                        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${
                          q.difficulty === 'hard'
                            ? 'border-red-200 bg-red-50 text-red-700'
                            : q.difficulty === 'medium'
                            ? 'border-yellow-200 bg-yellow-50 text-yellow-700'
                            : 'border-green-200 bg-green-50 text-green-700'
                        }`}>
                          {q.difficulty}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* CI Talking Points */}
        {guide.ci_talking_points && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Target className="h-5 w-5 text-green-600" />
              <h3 className="text-lg font-semibold text-gray-900">Company Intelligence</h3>
            </div>

            {/* Recent Developments */}
            {guide.ci_talking_points.recent_developments && guide.ci_talking_points.recent_developments.length > 0 && (
              <div className="mb-6">
                <h4 className="text-sm font-semibold uppercase tracking-[0.22em] text-gray-500 mb-3">
                  Recent Developments
                </h4>
                <div className="space-y-4">
                  {guide.ci_talking_points.recent_developments.map((dev, idx) => (
                    <div key={idx} className="rounded-lg border border-green-200 bg-green-50 p-4">
                      <p className="text-sm font-semibold text-green-900 mb-2">{dev.development}</p>
                      <p className="text-sm text-green-800 mb-3">{dev.relevance_to_role}</p>
                      <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-green-700">
                          Conversation Starters:
                        </p>
                        {dev.conversation_starters.map((starter, sIdx) => (
                          <div key={sIdx} className="flex gap-2">
                            <span className="mt-1 inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-green-600" />
                            <p className="text-sm italic text-green-800">&ldquo;{starter}&rdquo;</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Strategic Advantages */}
            {guide.ci_talking_points.strategic_advantages && guide.ci_talking_points.strategic_advantages.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold uppercase tracking-[0.22em] text-gray-500 mb-3">
                  Strategic Advantages
                </h4>
                <div className="space-y-4">
                  {guide.ci_talking_points.strategic_advantages.map((adv, idx) => (
                    <div key={idx} className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                      <p className="text-sm font-semibold text-blue-900 mb-2">{adv.advantage}</p>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700 mb-1">
                        How to weave in:
                      </p>
                      <p className="text-sm text-blue-800 mb-3">{adv.how_to_weave_in}</p>
                      <div className="rounded border border-blue-300 bg-blue-100 p-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700 mb-2">
                          Example Response:
                        </p>
                        <p className="text-sm italic text-blue-900">&ldquo;{adv.example_response}&rdquo;</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {/* Recognition Training */}
        {guide.recognition_training && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Lightbulb className="h-5 w-5 text-yellow-600" />
              <h3 className="text-lg font-semibold text-gray-900">Recognition Training</h3>
            </div>

            {guide.recognition_training.what_great_answers_sound_like && guide.recognition_training.what_great_answers_sound_like.length > 0 && (
              <div className="mb-6">
                <h4 className="text-sm font-semibold uppercase tracking-[0.22em] text-gray-500 mb-3">
                  What Great Answers Sound Like
                </h4>
                <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
                  <ul className="space-y-2">
                    {guide.recognition_training.what_great_answers_sound_like.map((point, idx) => (
                      <li key={idx} className="flex gap-2">
                        <span className="mt-1 inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-yellow-600" />
                        <span className="text-sm text-yellow-900">{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {guide.recognition_training.how_to_demonstrate_company_knowledge && guide.recognition_training.how_to_demonstrate_company_knowledge.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold uppercase tracking-[0.22em] text-gray-500 mb-3">
                  How to Demonstrate Company Knowledge
                </h4>
                <div className="rounded-lg border border-purple-200 bg-purple-50 p-4">
                  <ul className="space-y-2">
                    {guide.recognition_training.how_to_demonstrate_company_knowledge.map((point, idx) => (
                      <li key={idx} className="flex gap-2">
                        <span className="mt-1 inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-purple-600" />
                        <span className="text-sm text-purple-900">{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </section>
        )}
      </div>
    </article>
  );
}
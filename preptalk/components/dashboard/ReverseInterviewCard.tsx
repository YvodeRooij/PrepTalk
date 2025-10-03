'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Lightbulb, AlertCircle, CheckCircle2, Target } from 'lucide-react';
import type { QuestionGuide } from '@/lib/dashboard/data';

interface ReverseInterviewCardProps {
  guide: QuestionGuide;
  isLocked?: boolean;
}

// Category colors based on round persona/type
const categoryColors: Record<string, { bg: string; text: string; accent: string; border: string }> = {
  recruiter: { bg: 'bg-purple-50', text: 'text-purple-700', accent: 'bg-purple-500', border: 'border-purple-200' },
  behavioral: { bg: 'bg-blue-50', text: 'text-blue-700', accent: 'bg-blue-500', border: 'border-blue-200' },
  culture: { bg: 'bg-green-50', text: 'text-green-700', accent: 'bg-green-500', border: 'border-green-200' },
  strategic: { bg: 'bg-amber-50', text: 'text-amber-700', accent: 'bg-amber-500', border: 'border-amber-200' },
  executive: { bg: 'bg-rose-50', text: 'text-rose-700', accent: 'bg-rose-500', border: 'border-rose-200' },
  default: { bg: 'bg-gray-50', text: 'text-gray-700', accent: 'bg-gray-500', border: 'border-gray-200' },
};

function getCategoryFromPersona(persona: string): keyof typeof categoryColors {
  const lower = persona.toLowerCase();
  if (lower.includes('recruiter') || lower.includes('screen')) return 'recruiter';
  if (lower.includes('behavioral') || lower.includes('deep dive')) return 'behavioral';
  if (lower.includes('culture') || lower.includes('values')) return 'culture';
  if (lower.includes('strategic') || lower.includes('role discussion')) return 'strategic';
  if (lower.includes('executive') || lower.includes('final')) return 'executive';
  return 'default';
}

export function ReverseInterviewCard({ guide, isLocked = false }: ReverseInterviewCardProps) {
  const [expandedQuestion, setExpandedQuestion] = useState<number | null>(null);
  const category = getCategoryFromPersona(guide.persona);
  const colors = categoryColors[category];

  const hasEnhancedData = guide.ci_facts && guide.ci_facts.length > 0;

  return (
    <article
      className={`relative flex h-full flex-col gap-4 rounded-lg border ${colors.border} ${colors.bg} p-5 ${
        isLocked ? 'opacity-70' : ''
      }`}
    >
      {isLocked && (
        <div className="absolute right-3 top-3">
          <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
        </div>
      )}

      {/* Header */}
      <header className="space-y-1">
        <div className="flex items-center gap-2">
          <div className={`h-1 w-1 rounded-full ${colors.accent}`} />
          <p className={`text-xs font-semibold uppercase tracking-[0.22em] ${colors.text}`}>{guide.persona}</p>
        </div>
        <p className="text-sm text-gray-600">{guide.context}</p>
      </header>

      {/* Questions List */}
      <div className="space-y-3">
        {guide.prompts.map((question: string, index: number) => {
          const isExpanded = expandedQuestion === index;
          const questionMeta = hasEnhancedData
            ? {
                ciFact: guide.ci_facts?.[index],
                whyItWorks: guide.why_they_work?.[index],
                greenFlags: guide.green_flags?.slice(index * 2, index * 2 + 2) || [],
                redFlags: guide.red_flags?.slice(Math.floor(index / 2), Math.floor(index / 2) + 1) || [],
                expectedInsights: guide.expected_insights?.slice(index * 2, index * 2 + 2) || [],
              }
            : null;

          return (
            <div key={index} className="rounded-md border border-gray-200 bg-white">
              {/* Question Text */}
              <button
                onClick={() => setExpandedQuestion(isExpanded ? null : index)}
                className="w-full text-left p-3 flex items-start gap-2 hover:bg-gray-50 transition-colors rounded-md"
                disabled={!hasEnhancedData}
              >
                <span className={`mt-1.5 inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full ${colors.accent}`} />
                <span className="flex-1 text-sm text-gray-800 leading-relaxed">{question}</span>
                {hasEnhancedData && (
                  <span className="flex-shrink-0">
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-gray-400" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-gray-400" />
                    )}
                  </span>
                )}
              </button>

              {/* Expandable Metadata */}
              {hasEnhancedData && isExpanded && questionMeta && (
                <div className="border-t border-gray-200 bg-gray-50 p-4 space-y-3 text-xs">
                  {/* CI Fact */}
                  {questionMeta.ciFact && (
                    <div className="flex gap-2">
                      <Lightbulb className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-gray-700 mb-1">Research-backed</p>
                        <p className="text-gray-600">{questionMeta.ciFact}</p>
                      </div>
                    </div>
                  )}

                  {/* Why It Works */}
                  {questionMeta.whyItWorks && (
                    <div className="flex gap-2">
                      <Target className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-gray-700 mb-1">Why this works</p>
                        <p className="text-gray-600">{questionMeta.whyItWorks}</p>
                      </div>
                    </div>
                  )}

                  {/* Green Flags */}
                  {questionMeta.greenFlags.length > 0 && (
                    <div className="flex gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-gray-700 mb-1">Listen for</p>
                        <ul className="space-y-1">
                          {questionMeta.greenFlags.map((flag, i) => (
                            <li key={i} className="text-gray-600">
                              • {flag}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}

                  {/* Red Flags */}
                  {questionMeta.redFlags.length > 0 && (
                    <div className="flex gap-2">
                      <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-gray-700 mb-1">Watch out for</p>
                        <ul className="space-y-1">
                          {questionMeta.redFlags.map((flag, i) => (
                            <li key={i} className="text-gray-600">
                              • {flag}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}

                  {/* Expected Insights */}
                  {questionMeta.expectedInsights.length > 0 && (
                    <div className="flex gap-2">
                      <Target className="h-4 w-4 text-purple-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-gray-700 mb-1">What you'll learn</p>
                        <ul className="space-y-1">
                          {questionMeta.expectedInsights.map((insight, i) => (
                            <li key={i} className="text-gray-600">
                              • {insight}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer hint for enhanced questions */}
      {hasEnhancedData && (
        <footer className="mt-auto pt-2 border-t border-gray-200">
          <p className="text-[10px] text-gray-500 flex items-center gap-1.5">
            <Lightbulb className="h-3 w-3" />
            Click questions to see research-backed insights
          </p>
        </footer>
      )}
    </article>
  );
}

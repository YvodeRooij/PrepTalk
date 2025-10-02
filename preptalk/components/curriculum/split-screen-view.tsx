'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { GenerationProgress } from './generation-progress';
import { Play, CheckCircle2, Sparkles, BookOpen, Target } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface SplitScreenViewProps {
  curriculumId: string;
  cvRoundReady: boolean;
  fullCurriculumReady: boolean;
  generationStartTime: number;
  progressStage: 'cv_analysis' | 'demo_generation' | 'complete';
}

export function SplitScreenView({
  curriculumId,
  cvRoundReady,
  fullCurriculumReady,
  generationStartTime,
  progressStage,
}: SplitScreenViewProps) {
  const router = useRouter();
  const [startedInterview, setStartedInterview] = useState(false);

  const handleStartInterview = () => {
    if (!curriculumId) {
      // Curriculum still generating - wait a moment
      return;
    }
    setStartedInterview(true);
    // Navigate to voice interview page with curriculum ID and round 1
    router.push(`/interview/voice?curriculumId=${curriculumId}&roundNumber=1`);
  };

  const handleViewFullCurriculum = () => {
    router.push(`/curriculum/${curriculumId}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-8 px-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-3">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Your Interview Prep is Generating
          </h1>
          <p className="text-muted-foreground">
            {cvRoundReady && !fullCurriculumReady && "CV Round ready! Start practicing while we prepare the rest."}
            {fullCurriculumReady && "Everything is ready! You're all set for success."}
            {!cvRoundReady && "Preparing your personalized interview experience..."}
          </p>
          {!cvRoundReady && (
            <div className="max-w-2xl mx-auto bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-lg p-4 shadow-sm">
              <p className="text-sm text-blue-900 leading-relaxed">
                <span className="font-bold text-blue-700">⏱️ In ~30 seconds:</span> Your CV Round will be ready to practice!
                This is a personalized recruiter screen based on <span className="font-semibold underline decoration-blue-400">your actual CV</span>.
              </p>
              <p className="text-xs text-blue-700 mt-2.5 flex items-center gap-1.5">
                <span className="inline-block w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse"></span>
                Meanwhile, we'll continue building your full 5-round curriculum in the background (2-3 min total)
              </p>
            </div>
          )}
        </div>

        {/* Split Screen Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* LEFT: CV Round */}
          <Card className={`relative overflow-hidden transition-all duration-500 ${
            cvRoundReady
              ? 'border-green-500 border-2 shadow-lg shadow-green-100'
              : 'border-primary shadow-md'
          }`}>
            {cvRoundReady && (
              <div className="absolute top-0 right-0 bg-green-500 text-white px-4 py-1 text-xs font-semibold rounded-bl-lg">
                READY
              </div>
            )}

            <CardHeader>
              <div className="flex items-center gap-2">
                {cvRoundReady ? (
                  <CheckCircle2 className="w-6 h-6 text-green-500 animate-bounce" />
                ) : (
                  <Target className="w-6 h-6 text-primary animate-pulse" />
                )}
                <CardTitle className="text-xl">
                  {cvRoundReady ? 'CV Round Ready! 🎉' : 'Preparing Your CV Round...'}
                </CardTitle>
              </div>
              <CardDescription>
                {cvRoundReady
                  ? 'Your personalized CV walkthrough interview is ready to practice'
                  : 'Creating a recruiter screen based on your CV (~30 seconds)'}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {!cvRoundReady && (
                <GenerationProgress
                  mode="cv_round_only"
                  startTime={generationStartTime}
                  progressStage={progressStage}
                  onComplete={() => {}}
                />
              )}

              {cvRoundReady && (
                <div className="space-y-4">
                  {/* Success Banner */}
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <Sparkles className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <h4 className="font-semibold text-green-900 mb-1">Round 1: CV Walkthrough</h4>
                        <p className="text-sm text-green-800">
                          Practice answering questions about your background, experience, and career
                          transitions with an AI recruiter.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* What You'll Practice */}
                  <div className="space-y-2">
                    <p className="text-sm font-medium flex items-center gap-2">
                      <BookOpen className="w-4 h-4" />
                      What you'll practice:
                    </p>
                    <ul className="text-sm text-muted-foreground space-y-2 pl-6">
                      <li className="flex items-start gap-2">
                        <span className="text-green-500 mt-0.5">✓</span>
                        <span>Walking through your resume chronologically</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-green-500 mt-0.5">✓</span>
                        <span>Explaining career transitions and decisions</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-green-500 mt-0.5">✓</span>
                        <span>Discussing your strengths and experiences</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-green-500 mt-0.5">✓</span>
                        <span>Building confidence for recruiter screens</span>
                      </li>
                    </ul>
                  </div>

                  {/* CTA Button */}
                  <Button
                    size="lg"
                    className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg"
                    onClick={handleStartInterview}
                    disabled={!curriculumId || startedInterview}
                  >
                    <Play className="w-4 h-4 mr-2" />
                    {startedInterview ? 'Redirecting to Interview...' : !curriculumId ? 'Finalizing Setup...' : 'Start CV Round Interview'}
                  </Button>

                  {/* Tip */}
                  <p className="text-xs text-center text-muted-foreground bg-blue-50 p-3 rounded-lg border border-blue-100">
                    💡 This CV Round is based on your actual resume. While you practice, we're preparing your full 5-round curriculum (2-3 min)
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* RIGHT: Full Curriculum */}
          <Card className={`relative overflow-hidden transition-all duration-500 ${
            fullCurriculumReady
              ? 'border-purple-500 border-2 shadow-lg shadow-purple-100'
              : cvRoundReady
              ? 'border-muted-foreground/20'
              : 'border-muted-foreground/10 opacity-60'
          }`}>
            {fullCurriculumReady && (
              <div className="absolute top-0 right-0 bg-purple-500 text-white px-4 py-1 text-xs font-semibold rounded-bl-lg">
                COMPLETE
              </div>
            )}

            <CardHeader>
              <div className="flex items-center gap-2">
                {fullCurriculumReady ? (
                  <CheckCircle2 className="w-6 h-6 text-purple-500 animate-bounce" />
                ) : (
                  <Sparkles className="w-6 h-6 text-muted-foreground animate-pulse" />
                )}
                <CardTitle className="text-xl">
                  {fullCurriculumReady ? 'Full Curriculum Ready! 🎊' : 'Generating Full Curriculum...'}
                </CardTitle>
              </div>
              <CardDescription>
                {fullCurriculumReady
                  ? 'All 5 interview rounds with company research and prep guides'
                  : 'Creating your complete interview preparation (2-3 minutes)'}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {!fullCurriculumReady && (
                <div className="flex flex-col items-center justify-center py-12 space-y-6">
                  <Sparkles className="w-16 h-16 text-purple-400 animate-pulse" />
                  <div className="text-center space-y-2">
                    <h3 className="text-lg font-semibold">Building your curriculum...</h3>
                    <p className="text-sm text-muted-foreground max-w-sm">
                      Analyzing 5 interview rounds for your target role
                    </p>
                    <p className="text-xs text-muted-foreground pt-2">
                      This takes 2-3 minutes
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}

              {fullCurriculumReady && (
                <div className="space-y-4">
                  {/* Success Banner */}
                  <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <Sparkles className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <h4 className="font-semibold text-purple-900 mb-1">
                          Complete 5-Round Curriculum
                        </h4>
                        <p className="text-sm text-purple-800">
                          Your personalized interview preparation with company insights, role analysis,
                          and comprehensive prep guides.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* What's Included */}
                  <div className="space-y-2">
                    <p className="text-sm font-medium flex items-center gap-2">
                      <BookOpen className="w-4 h-4" />
                      Your curriculum includes:
                    </p>
                    <ul className="text-sm space-y-2 pl-6">
                      <li className="flex items-start gap-2 text-green-700">
                        <span className="mt-0.5">✓</span>
                        <span className="font-medium">Round 1: CV Walkthrough (Recruiter Screen)</span>
                      </li>
                      <li className="flex items-start gap-2 text-green-700">
                        <span className="mt-0.5">✓</span>
                        <span className="font-medium">Round 2: Technical Interview</span>
                      </li>
                      <li className="flex items-start gap-2 text-green-700">
                        <span className="mt-0.5">✓</span>
                        <span className="font-medium">Round 3: System Design / Architecture</span>
                      </li>
                      <li className="flex items-start gap-2 text-green-700">
                        <span className="mt-0.5">✓</span>
                        <span className="font-medium">Round 4: Behavioral / Cultural Fit</span>
                      </li>
                      <li className="flex items-start gap-2 text-green-700">
                        <span className="mt-0.5">✓</span>
                        <span className="font-medium">Round 5: Final Round / Leadership</span>
                      </li>
                    </ul>
                  </div>

                  {/* CTA Button */}
                  <Button
                    size="lg"
                    variant="default"
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg"
                    onClick={handleViewFullCurriculum}
                  >
                    <BookOpen className="w-4 h-4 mr-2" />
                    View Full Curriculum
                  </Button>

                  {/* Success Message */}
                  <div className="text-center space-y-2 bg-gradient-to-r from-yellow-50 to-orange-50 p-4 rounded-lg border border-yellow-200">
                    <p className="text-sm font-semibold text-yellow-900">
                      🎉 You're ready for interview success!
                    </p>
                    <p className="text-xs text-yellow-800">
                      Complete prep guides, company intel, and personalized strategies await you.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Bottom CTA when both ready */}
        {cvRoundReady && fullCurriculumReady && (
          <Card className="bg-gradient-to-r from-blue-500 to-purple-500 text-white border-0 shadow-xl">
            <CardContent className="p-6 text-center space-y-4">
              <h3 className="text-2xl font-bold">🎊 Your Complete Interview Prep is Ready!</h3>
              <p className="text-blue-50">
                You've got everything you need: CV Round practice + Full 5-round curriculum with
                company research and personalized strategies.
              </p>
              <div className="flex gap-4 justify-center flex-wrap">
                <Button
                  size="lg"
                  variant="secondary"
                  onClick={handleStartInterview}
                  disabled={startedInterview}
                >
                  <Play className="w-4 h-4 mr-2" />
                  Practice CV Round
                </Button>
                <Button
                  size="lg"
                  variant="secondary"
                  onClick={handleViewFullCurriculum}
                >
                  <BookOpen className="w-4 h-4 mr-2" />
                  Explore Full Curriculum
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
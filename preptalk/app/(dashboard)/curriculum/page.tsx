'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Upload, ExternalLink, Loader2, ChevronLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { SplitScreenView } from '@/components/curriculum/split-screen-view';
import { AuthGuidanceBox } from '@/components/curriculum/auth-guidance-box';
import { toast } from 'sonner';

type Step = 'job-url' | 'cv-upload' | 'profile' | 'generating' | 'complete';

export default function CurriculumCreatePage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<Step>('job-url');
  const [formData, setFormData] = useState({
    jobUrl: '',
    cvFile: null as File | null,
    excitement: '',
    concerns: '',
    weakAreas: '',
    backgroundContext: '',
    preparationGoals: ''
  });
  const [generating, setGenerating] = useState(false);
  const [curriculumId, setCurriculumId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // 🆕 NEW: Two-stage generation state
  const [showSplitScreen, setShowSplitScreen] = useState(false);
  const [cvRoundReady, setCvRoundReady] = useState(false);
  const [fullCurriculumReady, setFullCurriculumReady] = useState(false);
  const [generationStartTime, setGenerationStartTime] = useState(0);
  const [cvData, setCvData] = useState<any>(null);

  // 🆕 Real progress tracking
  const [progressStage, setProgressStage] = useState<'cv_analysis' | 'demo_generation' | 'complete'>('cv_analysis');

  // Get authenticated user on mount
  useEffect(() => {
    const supabase = createClient();

    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id || null);
      setIsCheckingAuth(false);

      // If user just logged in, restore saved job URL
      if (user?.id) {
        const savedJobUrl = sessionStorage.getItem('preptalk_job_url');
        if (savedJobUrl) {
          setFormData(prev => ({ ...prev, jobUrl: savedJobUrl }));
          sessionStorage.removeItem('preptalk_job_url');
        }
      }
    };

    // Initial check
    getUser();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
        getUser(); // Re-check user
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleJobUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.jobUrl.trim()) {
      // Check if user is authenticated before allowing progression
      if (!userId) {
        // Save job URL to sessionStorage so they don't lose it
        sessionStorage.setItem('preptalk_job_url', formData.jobUrl);

        // Redirect to login with return path
        router.push('/login?redirect=/curriculum');
        return;
      }

      setCurrentStep('cv-upload');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData(prev => ({ ...prev, cvFile: file }));
    }
  };

  const handleCvSubmit = () => {
    if (formData.cvFile) {
      // Extra safety check (user should already be authenticated at this point)
      if (!userId) {
        router.push('/login?redirect=/curriculum');
        return;
      }

      setCurrentStep('profile');
    }
  };

  // Back navigation functions
  const handleBackToJobUrl = () => {
    setCurrentStep('job-url');
  };

  const handleBackToCvUpload = () => {
    setCurrentStep('cv-upload');
  };

  // Allow clicking on progress steps to navigate
  const handleStepClick = (stepId: Step) => {
    // Only allow navigation to previous steps
    const steps: Step[] = ['job-url', 'cv-upload', 'profile', 'generating'];
    const currentIndex = steps.indexOf(currentStep);
    const clickedIndex = steps.indexOf(stepId);

    // Allow navigation to previous steps and current step (but not future steps)
    if (clickedIndex <= currentIndex && currentStep !== 'generating' && currentStep !== 'complete') {
      setCurrentStep(stepId);
    }
  };

  // 🆕 MODIFIED: Two-stage curriculum generation
  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      if (!userId) {
        throw new Error('User not authenticated');
      }

      // 🎬 SHOW SPLIT SCREEN IMMEDIATELY (before any processing)
      setShowSplitScreen(true);
      setCurrentStep('generating');
      setGenerating(true);
      setGenerationStartTime(Date.now());

      // STAGE 0: Upload and analyze CV (visible in progress)
      console.log('📄 Stage 0: Analyzing CV...');
      const cvFormData = new FormData();
      cvFormData.append('file', formData.cvFile!);
      cvFormData.append('userId', userId);

      const cvResponse = await fetch('/api/cv/analyze', {
        method: 'POST',
        body: cvFormData,
      });

      if (!cvResponse.ok) {
        throw new Error('CV analysis failed');
      }

      const cvAnalysisResult = await cvResponse.json();

      // Transform CV data
      const cvDataTransformed = {
        analysis: cvAnalysisResult,
        cv_analysis_id: cvAnalysisResult.cv_analysis_id,
        insights: cvAnalysisResult.insights
      };

      setCvData(cvDataTransformed);
      console.log('✅ CV analysis complete');
      setProgressStage('complete'); // ✅ CV analysis done

      // ═══════════════════════════════════════════════════════════
      // STAGE 1: INSTANT DEMO CREATION (< 2 seconds!)
      // ═══════════════════════════════════════════════════════════
      console.log('⚡ Stage 1: Creating demo curriculum (instant)...');

      const cvRoundResponse = await fetch('/api/curriculum/create-demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cvAnalysisId: cvAnalysisResult.cv_analysis_id,
          jobUrl: formData.jobUrl,
        }),
      });

      if (!cvRoundResponse.ok) {
        const errorData = await cvRoundResponse.json().catch(() => ({}));
        console.error('❌ CV demo creation failed:', errorData);
        throw new Error(`CV demo curriculum creation failed: ${errorData.error || cvRoundResponse.statusText}`);
      }

      const cvRoundData = await cvRoundResponse.json();
      console.log('🎯 CV Round Data:', cvRoundData);
      const generatedCurriculumId = cvRoundData.curriculum_id;

      if (!generatedCurriculumId) {
        console.error('❌ No curriculum ID returned:', cvRoundData);
        throw new Error('No curriculum ID returned from demo generation');
      }

      console.log('✅ Stage 1 complete in < 2s:', generatedCurriculumId);
      setCurriculumId(generatedCurriculumId);
      setCvRoundReady(true);
      setGenerating(false);

      toast.success('🎉 Interview ready! Start practicing.', {
        duration: 3000,
      });

      // ═══════════════════════════════════════════════════════════
      // STAGE 2: FULL CURRICULUM (2-3 minutes with batch parallelization, background non-blocking)
      // ═══════════════════════════════════════════════════════════
      console.log('🚀 Stage 2: Generating full curriculum in background with batch parallelization...');

      // Fire-and-forget: let backend do its job, we'll poll the database for truth
      fetch('/api/curriculum/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userInput: formData.jobUrl,
          mode: 'full',  // 🎯 Full generation with batch parallelization
          userProfile: {
            excitement: formData.excitement,
            concerns: formData.concerns,
            weakAreas: formData.weakAreas.split(',').map(s => s.trim()).filter(Boolean),
            backgroundContext: formData.backgroundContext,
            preparationGoals: formData.preparationGoals,
          },
          cvData: cvDataTransformed,
          existingCurriculumId: generatedCurriculumId,  // ✅ Update the demo we just created
        }),
      }).catch(err => {
        // Ignore fetch errors - we'll poll the database for truth
        console.log('⏳ Backend request sent, polling database for status...');
      });

      // Start polling database to check when it's actually complete
      const pollInterval = setInterval(async () => {
        const supabase = createClient();
        const { data: curriculum } = await supabase
          .from('curricula')
          .select('generation_status, total_rounds')
          .eq('id', generatedCurriculumId)
          .single();

        console.log('📊 Polling status:', curriculum?.generation_status, curriculum?.total_rounds);

        if (curriculum?.generation_status === 'complete') {
          clearInterval(pollInterval);
          setFullCurriculumReady(true);

          toast.success('Curriculum ready! 🎉', { duration: 2000 });

          // Auto-redirect to dashboard
          setTimeout(() => {
            router.push(`/dashboard?curriculumId=${generatedCurriculumId}`);
          }, 1500);
        }
      }, 5000); // Poll every 5 seconds

      // Safety: stop polling after 5 minutes
      setTimeout(() => clearInterval(pollInterval), 300000);

    } catch (error) {
      console.error('❌ Generation failed:', error);
      setGenerating(false);
      setShowSplitScreen(false);

      toast.error(
        error instanceof Error
          ? error.message
          : 'Failed to generate curriculum'
      );

      setError(error instanceof Error ? error.message : 'Failed to generate curriculum. Please try again.');
      setCurrentStep('profile');
    }
  };

  // 🆕 NEW: Show split screen during two-stage generation
  if (showSplitScreen) {
    return (
      <SplitScreenView
        curriculumId={curriculumId || ''}
        cvRoundReady={cvRoundReady}
        fullCurriculumReady={fullCurriculumReady}
        generationStartTime={generationStartTime}
        progressStage={progressStage}
      />
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="mb-8">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">Create Interview Curriculum</h1>
        <p className="text-gray-600 mt-2">
          Let's create a personalized interview preparation plan just for you.
        </p>
      </div>

      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {[
            { id: 'job-url', label: 'Job Role' },
            { id: 'cv-upload', label: 'CV Upload' },
            { id: 'profile', label: 'Profile' },
            { id: 'generating', label: 'Generate' }
          ].map((step, index) => {
            const steps: Step[] = ['job-url', 'cv-upload', 'profile'];
            const currentIndex = steps.indexOf(currentStep);
            const isCompleted = currentIndex > index;
            const isCurrent = currentStep === step.id;
            const isClickable = index <= currentIndex && currentStep !== 'generating' && currentStep !== 'complete';

            return (
            <div key={step.id} className="flex items-center">
              <button
                onClick={() => handleStepClick(step.id as Step)}
                disabled={!isClickable}
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors ${
                  isCurrent
                    ? 'bg-blue-600 text-white'
                    : isCompleted
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-gray-200 text-gray-600'
                } ${isClickable ? 'cursor-pointer' : 'cursor-default'}`}
              >
                {isCompleted ? '✓' : index + 1}
              </button>
              <span className="ml-2 text-sm text-gray-600">{step.label}</span>
              {index < 3 && (
                <div className={`ml-4 h-0.5 w-16 ${
                  ['job-url', 'cv-upload', 'profile'].indexOf(currentStep) > index ? 'bg-green-600' : 'bg-gray-200'
                }`} />
              )}
            </div>
            );
          })}
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        {currentStep === 'job-url' && (
          <form onSubmit={handleJobUrlSubmit} className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Job Role Information</h2>
              <p className="text-gray-600 mb-4">
                Paste the job posting URL
              </p>
            </div>

            <div>
              <label htmlFor="jobUrl" className="block text-sm font-medium text-gray-700 mb-2">
                Job Posting URL
              </label>
              <div className="relative">
                <input
                  type="url"
                  id="jobUrl"
                  value={formData.jobUrl}
                  onChange={(e) => setFormData(prev => ({ ...prev, jobUrl: e.target.value }))}
                  placeholder="https://example.com/jobs/marketing-specialist"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
                <ExternalLink className="absolute right-3 top-2.5 h-5 w-5 text-gray-400" />
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Continue to CV Upload
            </button>

            {/* Auth Guidance Box - Show if not signed in (after auth check completes) */}
            {!isCheckingAuth && !userId && (
              <div className="mt-6">
                <AuthGuidanceBox />
              </div>
            )}
          </form>
        )}

        {currentStep === 'cv-upload' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Upload Your CV</h2>
              <p className="text-gray-600 mb-4">
                Upload your CV so we can personalize the interview preparation to your background.
              </p>
            </div>

            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <div className="space-y-2">
                <label htmlFor="cv-file" className="cursor-pointer">
                  <span className="text-blue-600 hover:text-blue-700 font-medium">
                    Click to upload your CV
                  </span>
                  <input
                    id="cv-file"
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
                <p className="text-sm text-gray-500">PDF, DOC, or DOCX up to 10MB</p>

                {formData.cvFile && (
                  <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-800">
                      ✓ {formData.cvFile.name} uploaded
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleBackToJobUrl}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
                Back
              </button>
              <button
                onClick={handleCvSubmit}
                disabled={!formData.cvFile}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Continue to Profile
              </button>
            </div>
          </div>
        )}

        {currentStep === 'profile' && (
          <form onSubmit={handleProfileSubmit} className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Tell Us About Yourself</h2>
              <p className="text-gray-600 mb-4">
                Help us understand your goals and concerns so we can create the best preparation plan.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="excitement" className="block text-sm font-medium text-gray-700 mb-2">
                  What excites you most about this role?
                </label>
                <textarea
                  id="excitement"
                  value={formData.excitement}
                  onChange={(e) => setFormData(prev => ({ ...prev, excitement: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="The opportunity to work with cutting-edge technology and make a real impact..."
                />
              </div>

              <div>
                <label htmlFor="concerns" className="block text-sm font-medium text-gray-700 mb-2">
                  What are your main concerns about the interview?
                </label>
                <textarea
                  id="concerns"
                  value={formData.concerns}
                  onChange={(e) => setFormData(prev => ({ ...prev, concerns: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="I'm worried about technical questions or demonstrating leadership experience..."
                />
              </div>

              <div>
                <label htmlFor="weakAreas" className="block text-sm font-medium text-gray-700 mb-2">
                  Areas you'd like to improve (comma-separated)
                </label>
                <input
                  type="text"
                  id="weakAreas"
                  value={formData.weakAreas}
                  onChange={(e) => setFormData(prev => ({ ...prev, weakAreas: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="public speaking, system design, leadership stories"
                />
              </div>

              <div>
                <label htmlFor="preparationGoals" className="block text-sm font-medium text-gray-700 mb-2">
                  What do you want to achieve with this preparation?
                </label>
                <textarea
                  id="preparationGoals"
                  value={formData.preparationGoals}
                  onChange={(e) => setFormData(prev => ({ ...prev, preparationGoals: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="I want to feel confident answering behavioral questions and demonstrate my value..."
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleBackToCvUpload}
                disabled={generating}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:bg-gray-100 disabled:text-gray-400"
              >
                <ChevronLeft className="h-4 w-4" />
                Back
              </button>
              <button
                type="submit"
                disabled={generating}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400"
              >
                {generating ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generating Curriculum...
                  </span>
                ) : (
                  'Generate My Curriculum'
                )}
              </button>
            </div>
          </form>
        )}

        {currentStep === 'generating' && (
          <div className="text-center space-y-6">
            <div>
              <Loader2 className="mx-auto h-12 w-12 text-blue-600 animate-spin mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Generating Your Curriculum</h2>
              <p className="text-gray-600">
                We're analyzing the job requirements, your CV, and creating a personalized interview preparation plan. This process can take 2-10 minutes depending on complexity to ensure the highest quality results.
              </p>
              <div className="mt-4 text-sm text-blue-600">
                ✨ Researching company insights • 🎯 Matching your experience • 📚 Creating custom questions
              </div>
              <div className="mt-2 text-xs text-gray-500">
                Please keep this tab open - the process will complete automatically
              </div>
            </div>
          </div>
        )}

        {currentStep === 'complete' && (
          <div className="text-center space-y-6">
            <div className="text-green-600 mb-4">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <span className="text-2xl">✓</span>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                {curriculumId ? 'Curriculum Created Successfully!' : 'Curriculum Generation Complete!'}
              </h2>
              <p className="text-gray-600 mb-6">
                {curriculumId
                  ? 'Your personalized interview preparation curriculum is ready. Redirecting to dashboard...'
                  : 'Your curriculum has been generated and saved. Check your dashboard for the results!'
                }
              </p>
            </div>

            <div className="space-y-3">
              <Link
                href="/dashboard"
                className="block w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors text-center"
              >
                View in Dashboard
              </Link>
              <Link
                href={`/interview/voice?curriculumId=${curriculumId}&roundNumber=1`}
                className="block w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors text-center"
              >
                Start Voice Interview Practice
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { CVUpload } from '@/components/cv-upload';
import { CVAnalysis } from '@/lib/schemas/cv-analysis';

export default function ProfilePage() {
  // User and CV state
  const [user, setUser] = useState<any>(null);
  const [cvAnalysis, setCvAnalysis] = useState<CVAnalysis | null>(null);
  const [currentStep, setCurrentStep] = useState<'job' | 'cv' | 'personalization' | 'ready'>('job');

  // Form state with default development data
  const [formData, setFormData] = useState({
    jobInput: 'Senior Data Scientist at Netflix - developing recommendation algorithms and analyzing viewing patterns to drive content strategy',
    excitement: 'Their data culture fascinates me, especially how they use viewing data to guide content decisions. The scale of their ML infrastructure and the direct impact on user experience really appeals to me.',
    concerns: "I'm nervous they'll ask about streaming technology specifics since I come from fintech. Also worried about demonstrating my ability to work with entertainment industry metrics.",
    weakAreas: 'A/B testing at Netflix scale, content recommendation systems, entertainment industry knowledge',
    backgroundContext: 'Coming from traditional banking to entertainment - 5 years in financial ML models, now transitioning to consumer tech',
    preparationGoals: 'Knowing how to naturally bring up their recent international expansion and connect my financial modeling experience to their content investment decisions',
  });

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const supabase = createClient();

  // Load user and existing CV on mount
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);

        // Check for existing CV analysis
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('metadata')
          .eq('user_id', user.id)
          .single();

        if (profile?.metadata?.cvAnalysis) {
          setCvAnalysis(profile.metadata.cvAnalysis);
          setCurrentStep('personalization');
        }
      }
    };
    getUser();
  }, []);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Handle job input and progress to CV step
  const handleJobInputComplete = () => {
    if (formData.jobInput.trim()) {
      setCurrentStep('cv');
    }
  };

  // Handle CV upload completion
  const handleCVUploadComplete = (analysis: CVAnalysis) => {
    setCvAnalysis(analysis);
    setCurrentStep('personalization');
  };

  // Skip CV upload
  const handleSkipCV = () => {
    setCurrentStep('personalization');
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);

    try {
      // Prepare the request with CV data if available
      const requestBody = {
        input: formData.jobInput,
        userProfile: {
          excitement: formData.excitement,
          concerns: formData.concerns,
          weakAreas: formData.weakAreas.split(',').map(s => s.trim()).filter(Boolean),
          backgroundContext: formData.backgroundContext,
          preparationGoals: formData.preparationGoals,
        },
        // Include CV data for complete 3-stream synthesis
        cvData: cvAnalysis ? {
          analysis: cvAnalysis,
          insights: cvAnalysis.skillsAnalysis ? {
            experienceLevel: cvAnalysis.metadata?.extractionDate ? 'mid' : 'entry',
            skillGaps: cvAnalysis.skillsAnalysis?.skillGaps || [],
            readiness: {
              overallScore: 75,
              strengths: cvAnalysis.skills?.technical?.slice(0, 3) || [],
              areasForImprovement: cvAnalysis.skillsAnalysis?.skillGaps || [],
              recommendedPreparation: ['Review industry-specific knowledge', 'Practice behavioral examples']
            },
            personalizedQuestionTopics: [
              `Experience at ${cvAnalysis.experience?.[0]?.company || 'previous company'}`,
              `Skills in ${cvAnalysis.skills?.technical?.slice(0, 2)?.join(' and ') || 'technical areas'}`
            ]
          } : undefined,
          matchScore: cvAnalysis ? 85 : undefined,
          uploadedAt: new Date().toISOString(),
          processingModel: 'mistral-ocr-integrated'
        } : null
      };

      const response = await fetch('/api/curriculum/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('Curriculum generated:', result);

      const cvText = cvAnalysis
        ? ` Your CV analysis (${cvAnalysis.personalInfo?.fullName}) enhanced the personalization.`
        : ' Consider uploading your CV next time for even more personalization!';

      setMessage({
        type: 'success',
        text: `✅ Curriculum generated successfully! Your personalized interview preparation is ready with ${result.rounds?.length || 5} rounds.${cvText}`
      });

      // Clear form after successful generation
      setFormData({
        jobInput: '',
        excitement: '',
        concerns: '',
        weakAreas: '',
        backgroundContext: '',
        preparationGoals: '',
      });

    } catch (error) {
      console.error('Error generating curriculum:', error);
      setMessage({
        type: 'error',
        text: `❌ Failed to generate curriculum: ${error instanceof Error ? error.message : 'Unknown error occurred'}`
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <span className="text-orange-400">🧪</span>
            </div>
            <div className="ml-3">
              <p className="text-sm text-orange-800">
                <strong>Development Mode:</strong> Testing personalized curriculum generation system.
              </p>
            </div>
          </div>
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          🎯 Personalized Interview Curriculum
        </h1>
        <p className="text-gray-600">
          Generate customized interview preparation based on your background and goals.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2">
          {/* Message Display */}
          {message && (
            <div className={`rounded-lg p-4 mb-6 ${
              message.type === 'success'
                ? 'bg-green-50 border border-green-200 text-green-800'
                : 'bg-red-50 border border-red-200 text-red-800'
            }`}>
              <p className="text-sm font-medium">{message.text}</p>
            </div>
          )}

          {/* Progressive Disclosure Form */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            {/* Progress Indicator */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">
                Create Your Curriculum
              </h2>
              <div className="flex space-x-2">
                <div className={`w-3 h-3 rounded-full ${currentStep === 'job' || currentStep === 'cv' || currentStep === 'personalization' ? 'bg-blue-500' : 'bg-gray-300'}`} />
                <div className={`w-3 h-3 rounded-full ${currentStep === 'cv' || currentStep === 'personalization' ? 'bg-blue-500' : 'bg-gray-300'}`} />
                <div className={`w-3 h-3 rounded-full ${currentStep === 'personalization' ? 'bg-blue-500' : 'bg-gray-300'}`} />
              </div>
            </div>

            {/* Step 1: Job Input */}
            {currentStep === 'job' && (
              <div className="space-y-4">
                <div className="text-center mb-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    👔 What role are you interviewing for?
                  </h3>
                  <p className="text-gray-600">
                    Paste a job posting URL or describe the role you're targeting
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Job URL or Description
                  </label>
                  <input
                    type="text"
                    value={formData.jobInput}
                    onChange={(e) => handleInputChange('jobInput', e.target.value)}
                    placeholder="https://jobs.netflix.com/jobs/790298 or 'Senior Data Analyst at Netflix'"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && formData.jobInput.trim()) {
                        handleJobInputComplete();
                      }
                    }}
                  />
                </div>

                <button
                  type="button"
                  onClick={handleJobInputComplete}
                  disabled={!formData.jobInput.trim()}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white py-3 px-4 rounded-md font-medium transition-colors"
                >
                  Continue →
                </button>
              </div>
            )}

            {/* Step 2: CV Upload */}
            {currentStep === 'cv' && (
              <div className="space-y-4">
                <div className="text-center mb-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    📁 Upload your CV (Optional)
                  </h3>
                  <p className="text-gray-600">
                    We'll analyze your background to create highly personalized interview questions
                  </p>
                  <div className="mt-2 flex items-center justify-center space-x-2">
                    <span className="text-sm text-gray-500">🎯 Better personalization</span>
                    <span className="text-sm text-gray-500">•</span>
                    <span className="text-sm text-gray-500">📊 Factual extraction</span>
                  </div>
                </div>

                {user && (
                  <CVUpload
                    userId={user.id}
                    onUploadComplete={handleCVUploadComplete}
                    onUploadError={(error) => setMessage({ type: 'error', text: error })}
                    className="mb-4"
                  />
                )}

                <div className="text-center">
                  <button
                    type="button"
                    onClick={handleSkipCV}
                    className="text-sm text-gray-500 hover:text-gray-700 underline"
                  >
                    Skip for now (you can add this later)
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Personalization Questions */}
            {currentStep === 'personalization' && (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="text-center mb-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    🎯 Tell us about yourself
                  </h3>
                  <p className="text-gray-600">
                    Help us understand your unique situation and goals
                  </p>
                  {cvAnalysis && (
                    <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded">
                      <div className="text-sm text-blue-800 font-medium mb-2">
                        📄 CV Analysis Complete - {cvAnalysis.personalInfo?.fullName}
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-xs text-blue-700">
                        <div>
                          <span className="font-medium">Experience:</span> {cvAnalysis.summary?.yearsOfExperience || 0} years
                        </div>
                        <div>
                          <span className="font-medium">Current Role:</span> {cvAnalysis.summary?.currentRole || 'Not specified'}
                        </div>
                        <div>
                          <span className="font-medium">Skills:</span> {cvAnalysis.skills?.technical?.length || 0} technical skills
                        </div>
                        <div>
                          <span className="font-medium">Education:</span> {cvAnalysis.education?.length || 0} degree(s)
                        </div>
                      </div>
                      <div className="mt-2 text-xs text-blue-600">
                        Your responses below will be combined with this CV data for better personalization.
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      What specifically excites you about this role/company? ✨
                    </label>
                    <textarea
                      rows={3}
                      value={formData.excitement}
                      onChange={(e) => handleInputChange('excitement', e.target.value)}
                      placeholder="e.g., Their data culture fascinates me, especially how they use viewing data to guide content decisions..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      What&apos;s your biggest worry or concern? 😰
                    </label>
                    <textarea
                      rows={3}
                      value={formData.concerns}
                      onChange={(e) => handleInputChange('concerns', e.target.value)}
                      placeholder="e.g., I'm nervous they'll ask about streaming technology and I come from fintech..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      What topics feel challenging to discuss? 🤔
                    </label>
                    <textarea
                      rows={2}
                      value={formData.weakAreas}
                      onChange={(e) => handleInputChange('weakAreas', e.target.value)}
                      placeholder="e.g., Leadership examples, international expansion strategy..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      What makes your background unique? 🔄
                    </label>
                    <textarea
                      rows={2}
                      value={formData.backgroundContext}
                      onChange={(e) => handleInputChange('backgroundContext', e.target.value)}
                      placeholder="e.g., Coming from traditional banking to entertainment..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      What would make you feel most prepared? 🎯
                    </label>
                    <textarea
                      rows={2}
                      value={formData.preparationGoals}
                      onChange={(e) => handleInputChange('preparationGoals', e.target.value)}
                      placeholder="e.g., Knowing how to naturally bring up their recent expansion..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="flex space-x-4">
                  <button
                    type="button"
                    onClick={() => setCurrentStep('cv')}
                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 px-4 rounded-md font-medium transition-colors"
                  >
                    ← Back
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex-[2] bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white py-3 px-4 rounded-md font-medium transition-colors"
                  >
                    {isLoading ? 'Generating Curriculum...' : '🚀 Generate My Curriculum'}
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Features */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">What You'll Get</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <div className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span>5 tailored interview rounds</span>
                </div>
                <div className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span>Dynamic interviewer personas</span>
                </div>
                <div className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span>Company research integration</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span>Competitive intelligence</span>
                </div>
                <div className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span>Personalized prep guides</span>
                </div>
                <div className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span>Strategic talking points</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Credits</h3>
            <div className="text-2xl font-bold text-green-600">1,000</div>
            <p className="text-sm text-gray-600 mt-1">Available credits</p>
            <p className="text-sm text-gray-500 mt-2">Generation cost: 10 credits</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <a href="/dashboard" className="block w-full bg-gray-100 hover:bg-gray-200 text-gray-900 py-2 px-4 rounded-md text-center font-medium transition-colors">
                ← Back to Dashboard
              </a>
              <button className="w-full bg-gray-100 hover:bg-gray-200 text-gray-900 py-2 px-4 rounded-md font-medium transition-colors">
                View Past Curricula
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
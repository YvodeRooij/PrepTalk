'use client';

import { useState } from 'react';

export default function ProfilePage() {
  const [formData, setFormData] = useState({
    jobInput: 'https://explore.jobs.netflix.net/careers?pid=790312087457&domain=netflix.com&sort_by=relevance',
    excitement: 'Their data culture fascinates me, especially how they use viewing data to guide content decisions. I love how they\'re expanding globally and how they\'ve revolutionized entertainment consumption.',
    concerns: 'I\'m nervous they\'ll ask about streaming technology and I come from fintech. I also get anxious about behavioral questions and whether I can demonstrate their culture values.',
    weakAreas: 'Leadership examples since I\'ve been mostly an individual contributor, their international expansion strategy, content acquisition decisions',
    backgroundContext: 'Coming from traditional banking to entertainment. Used to 50-person startup, now interviewing at 15k company. Different pace and scale entirely.',
    preparationGoals: 'Knowing how to naturally bring up their recent expansion. Having good conflict resolution stories ready. Understanding their \'keeper culture\' and how to show I fit.',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/curriculum/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: formData.jobInput,
          userProfile: {
            excitement: formData.excitement,
            concerns: formData.concerns,
            weakAreas: formData.weakAreas.split(',').map(s => s.trim()).filter(Boolean),
            backgroundContext: formData.backgroundContext,
            preparationGoals: formData.preparationGoals,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('Curriculum generated:', result);

      setMessage({
        type: 'success',
        text: `✅ Curriculum generated successfully! Your personalized interview preparation is ready with ${result.rounds?.length || 5} rounds.`
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

          <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Generate Your Curriculum
            </h2>

            <div className="space-y-6">
              {/* Job Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Job URL or Description
                </label>
                <input
                  type="text"
                  value={formData.jobInput}
                  onChange={(e) => handleInputChange('jobInput', e.target.value)}
                  placeholder="https://jobs.netflix.com/jobs/790298 or 'Software Engineer at Google'"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              {/* Human-Centered Personalization */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    What specifically excites you most about this role/company? ✨
                  </label>
                  <textarea
                    rows={2}
                    value={formData.excitement}
                    onChange={(e) => handleInputChange('excitement', e.target.value)}
                    placeholder="e.g., Their data culture fascinates me, especially how they use viewing data to guide content decisions. I love how they're expanding globally..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    What's your biggest worry or concern about this interview? 😰
                  </label>
                  <textarea
                    rows={2}
                    value={formData.concerns}
                    onChange={(e) => handleInputChange('concerns', e.target.value)}
                    placeholder="e.g., I'm nervous they'll ask about streaming technology and I come from fintech. I also get anxious about behavioral questions..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    What topics do you feel least confident discussing? 🤔
                  </label>
                  <textarea
                    rows={2}
                    value={formData.weakAreas}
                    onChange={(e) => handleInputChange('weakAreas', e.target.value)}
                    placeholder="e.g., Leadership examples since I've been mostly an individual contributor. Also their international expansion strategy..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tell us about your background - how is it different? 🔄
                  </label>
                  <textarea
                    rows={2}
                    value={formData.backgroundContext}
                    onChange={(e) => handleInputChange('backgroundContext', e.target.value)}
                    placeholder="e.g., Coming from traditional banking to entertainment. Used to 50-person startup, now interviewing at 15k company..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    What would make you feel most prepared walking in? 🎯
                  </label>
                  <textarea
                    rows={2}
                    value={formData.preparationGoals}
                    onChange={(e) => handleInputChange('preparationGoals', e.target.value)}
                    placeholder="e.g., Knowing how to naturally bring up their recent expansion. Having good conflict resolution stories ready. Understanding their 'keeper culture'..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading || !formData.jobInput.trim()}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white py-3 px-4 rounded-md font-medium transition-colors"
              >
                {isLoading ? 'Generating Curriculum...' : 'Generate Personalized Curriculum'}
              </button>
            </div>
          </form>

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
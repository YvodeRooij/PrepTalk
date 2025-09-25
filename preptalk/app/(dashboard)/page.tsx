import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';

export default async function DashboardPage() {
  const supabase = await createClient();

  // Check if user is authenticated (FORCE DEVELOPMENT BYPASS FOR TESTING)
  const { data: { user }, error } = await supabase.auth.getUser();

  // TEMPORARY: Force development mode for testing
  const isDevelopment = true; // Always true for now

  console.log('🔍 Dashboard Debug:', {
    hasUser: !!user,
    hasError: !!error,
    message: 'FORCING DEVELOPMENT MODE FOR TESTING'
  });

  // In development, show a notice if not authenticated
  const isDevMode = isDevelopment && (!user || error);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        {isDevMode && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <span className="text-orange-400">🧪</span>
              </div>
              <div className="ml-3">
                <p className="text-sm text-orange-800">
                  <strong>Development Mode:</strong> Not authenticated, but showing dashboard for testing.
                  <a href="/login" className="underline hover:text-orange-900">
                    Click here to login properly
                  </a>
                </p>
              </div>
            </div>
          </div>
        )}

        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Welcome back{user?.email ? `, ${user.email.split('@')[0]}` : ''}!
        </h1>
        <p className="text-gray-600">
          Ready to practice your next interview?
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Enhanced Job Input Form - Most Prominent */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              🎯 Generate Personalized Interview Curriculum
            </h2>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-blue-800 font-semibold mb-2">Curriculum Generation Form</h3>
              <p className="text-blue-700 mb-4">
                This will be our personalized curriculum generation system with:
              </p>
              <ul className="text-blue-700 text-sm space-y-1">
                <li>• Job URL or description input</li>
                <li>• Focus area selection (career transition, leadership, etc.)</li>
                <li>• Primary concern selection (industry knowledge, culture fit, etc.)</li>
                <li>• Background context for personalization</li>
                <li>• Competitive intelligence integration</li>
              </ul>

              <div className="mt-4">
                <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium">
                  Generate Curriculum (Coming Next)
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Credit Balance</h3>
            <div className="text-2xl font-bold text-green-600">1,000 Credits</div>
            <p className="text-sm text-gray-600 mt-1">Available for curriculum generation</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Quick Start
            </h2>
            <div className="space-y-3">
              <button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-md font-medium transition-colors">
                Start Interview
              </button>
              <button className="w-full bg-gray-100 hover:bg-gray-200 text-gray-900 py-3 px-4 rounded-md font-medium transition-colors">
                View Past Sessions
              </button>
            </div>
          </div>

          {/* Usage Stats */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              This Month
            </h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Interviews:</span>
                <span className="font-medium">Coming soon</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Success Rate:</span>
                <span className="font-medium">Coming soon</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="mt-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Recent Sessions
          </h2>
          <div className="text-center py-8 text-gray-500">
            <p>No recent interview sessions</p>
            <p className="text-sm mt-1">Start your first practice session to see activity here</p>
          </div>
        </div>
      </div>
    </div>
  );
}
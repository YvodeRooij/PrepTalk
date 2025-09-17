import { Suspense } from 'react';
import CreditDisplay from '@/components/credits/CreditDisplay';
import { StartInterviewButton } from '@/components/interview';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function DashboardPage() {
  const supabase = await createClient();
  
  // Check if user is authenticated
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    redirect('/login');
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Welcome back!
        </h1>
        <p className="text-gray-600">
          Ready to practice your next interview?
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Credit Balance - Most Prominent */}
        <div className="lg:col-span-2">
          <Suspense fallback={<CreditDisplaySkeleton />}>
            <CreditDisplay showDetails={true} />
          </Suspense>
        </div>

        {/* Quick Actions */}
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Quick Start
            </h2>
            <div className="space-y-3">
              <StartInterviewButton />
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

function CreditDisplaySkeleton() {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="h-10 bg-gray-200 rounded w-1/4 mb-4"></div>
        <div className="space-y-2">
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    </div>
  );
}

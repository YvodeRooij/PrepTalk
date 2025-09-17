import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function HomePage() {
  const supabase = await createClient();
  
  // Check if user is authenticated
  const { data: { user } } = await supabase.auth.getUser();
  
  // If authenticated, redirect to dashboard
  if (user) {
    redirect('/dashboard');
  }

  // Otherwise show landing page
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            PrepTalk
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Practice interviews with AI coaching and get personalized feedback to ace your next job interview.
          </p>
          
          <div className="flex justify-center gap-4 mb-16">
            <Link
              href="/signup"
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-lg text-lg font-semibold transition-colors"
            >
              Start Free Trial
            </Link>
            <Link
              href="/login"
              className="bg-white hover:bg-gray-50 text-gray-900 px-8 py-4 rounded-lg text-lg font-semibold border border-gray-300 transition-colors"
            >
              Sign In
            </Link>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              AI-Powered Practice
            </h3>
            <p className="text-gray-600">
              Practice with our advanced AI interviewer that adapts to your responses and provides real-time feedback.
            </p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Performance Analytics
            </h3>
            <p className="text-gray-600">
              Track your progress with detailed analytics and see your improvement over time.
            </p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Personalized Learning
            </h3>
            <p className="text-gray-600">
              Get customized interview questions and coaching based on your target role and experience level.
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl p-8 text-center shadow-sm">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Simple, Credit-Based Pricing
          </h2>
          <p className="text-gray-600 mb-6">
            Start with 1 free credit. Each interview practice session costs 1 credit.
          </p>
          <div className="grid md:grid-cols-3 gap-6 max-w-3xl mx-auto">
            <div className="border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-2">Starter Pack</h3>
              <div className="text-3xl font-bold text-blue-600 mb-2">$19.99</div>
              <div className="text-gray-600 mb-4">5 Credits</div>
              <div className="text-sm text-gray-500">$4.00 per interview</div>
            </div>
            <div className="border-2 border-blue-500 rounded-lg p-6 relative">
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm">Popular</span>
              </div>
              <h3 className="text-lg font-semibold mb-2">Pro Pack</h3>
              <div className="text-3xl font-bold text-blue-600 mb-2">$34.99</div>
              <div className="text-gray-600 mb-4">10 Credits</div>
              <div className="text-sm text-gray-500">$3.50 per interview</div>
            </div>
            <div className="border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-2">Expert Pack</h3>
              <div className="text-3xl font-bold text-blue-600 mb-2">$79.99</div>
              <div className="text-gray-600 mb-4">25 Credits</div>
              <div className="text-sm text-gray-500">$3.20 per interview</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

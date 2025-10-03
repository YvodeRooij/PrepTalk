'use client';

import { useRouter } from 'next/navigation';
import { Info } from 'lucide-react';

interface AuthGuidanceBoxProps {
  onDismiss?: () => void;
  className?: string;
}

export function AuthGuidanceBox({ onDismiss, className = '' }: AuthGuidanceBoxProps) {
  const router = useRouter();

  const handleSignIn = () => {
    router.push('/login?redirect=/curriculum');
  };

  const handleCreateAccount = () => {
    router.push('/signup?redirect=/curriculum');
  };

  return (
    <aside
      role="complementary"
      aria-labelledby="guidance-title"
      className={`bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6 ${className}`}
    >
      <div className="flex items-start gap-3">
        <Info className="h-6 w-6 text-blue-600 flex-shrink-0 mt-0.5" aria-hidden="true" />

        <div className="flex-1">
          <h2 id="guidance-title" className="text-lg font-semibold text-gray-900 mb-3">
            Sign in to create your personalized curriculum
          </h2>

          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">
                What you'll get in 2-3 minutes:
              </p>
              <ul className="space-y-1.5 text-sm text-gray-700">
                <li className="flex items-start gap-2">
                  <span className="text-green-600 font-bold flex-shrink-0">✓</span>
                  <span>3-5 interview rounds tailored to the job</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 font-bold flex-shrink-0">✓</span>
                  <span>20-30 questions matched to YOUR CV</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 font-bold flex-shrink-0">✓</span>
                  <span>Prep guides for your specific weak areas</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 font-bold flex-shrink-0">✓</span>
                  <span>Progress tracking across all practice sessions</span>
                </li>
              </ul>
            </div>

            <div className="pt-2 border-t border-blue-200">
              <p className="text-sm text-gray-700">
                <span className="font-medium">Why sign in?</span> Your curriculum is built from YOUR CV,
                career goals, and practice history. We save it to your account so you can
                access it anytime, anywhere.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={handleSignIn}
                className="flex-1 bg-blue-600 text-white py-2.5 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Sign In
              </button>
              <button
                onClick={handleCreateAccount}
                className="flex-1 bg-white border-2 border-blue-600 text-blue-600 py-2.5 px-4 rounded-lg hover:bg-blue-50 transition-colors font-medium"
              >
                Create Account
              </button>
            </div>

            <p className="text-xs text-center text-gray-600">
              💡 Free forever • No credit card needed
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}

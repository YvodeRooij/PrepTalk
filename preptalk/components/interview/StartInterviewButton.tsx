'use client';

import { useState } from 'react';

export function StartInterviewButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStartInterview = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/interview/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.code === 'INSUFFICIENT_CREDITS') {
          setError('You need credits to start an interview. Buy more credits to continue.');
        } else {
          setError(data.error || 'Failed to start interview');
        }
        return;
      }

      // Success! Show confirmation or redirect to interview
      alert(`Interview started successfully! You have ${data.remaining_credits} credits remaining.`);
      
      // In a real app, you would redirect to the interview interface
      // router.push(`/interview/${data.session_id}`);
      
    } catch (error) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <button
        onClick={handleStartInterview}
        disabled={loading}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-3 px-4 rounded-md font-medium transition-colors"
      >
        {loading ? 'Starting Interview...' : 'Start Interview Practice'}
      </button>
      {error && (
        <p className="text-sm text-red-600 text-center">
          {error}
        </p>
      )}
      <p className="text-xs text-gray-500 text-center">
        Uses 1 credit per session
      </p>
    </div>
  );
}
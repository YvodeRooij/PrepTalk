'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ArrowRight, Mic, Timer, Users, Brain } from 'lucide-react';

interface InterviewPreparationModalProps {
  onProceed: () => void;
  onCancel: () => void;
}

export function InterviewPreparationModal({
  onProceed,
  onCancel
}: InterviewPreparationModalProps) {
  const router = useRouter();

  const features = [
    {
      icon: <Mic className="h-5 w-5" />,
      title: "Natural conversation",
      description: "Practice with AI interviewers using your voice, just like the real thing"
    },
    {
      icon: <Users className="h-5 w-5" />,
      title: "Realistic personas",
      description: "Meet different interviewer personalities based on your target company"
    },
    {
      icon: <Brain className="h-5 w-5" />,
      title: "Competitive intelligence",
      description: "Your interviewer knows company insights to test your preparation"
    },
    {
      icon: <Timer className="h-5 w-5" />,
      title: "Timed practice",
      description: "30-minute sessions that mirror real interview timings"
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <div className="text-center mb-8">
          <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
            <Mic className="h-8 w-8" />
          </div>
          <h1 className="text-3xl font-semibold text-gray-900 mb-3">
            Voice Interview Practice
          </h1>
          <p className="text-lg text-gray-600">
            Practice your interview skills with AI-powered voice conversations tailored to your target role
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {features.map((feature, index) => (
            <div key={index} className="p-4 rounded-lg border border-gray-200 bg-gray-50">
              <div className="flex items-start gap-3">
                <div className="text-blue-600 mt-0.5">
                  {feature.icon}
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 mb-1">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {feature.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-blue-50 rounded-lg p-4 mb-6">
          <h3 className="font-medium text-blue-900 mb-2">What to expect:</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• You'll select which interview round to practice</li>
            <li>• Each session uses 1 credit and lasts up to 30 minutes</li>
            <li>• Questions are tailored to your curriculum and company research</li>
            <li>• Practice as many rounds as you want</li>
          </ul>
        </div>

        <div className="flex gap-3 justify-end">
          <Button
            variant="outline"
            onClick={onCancel}
            className="px-6"
          >
            Maybe later
          </Button>
          <Button
            onClick={onProceed}
            className="px-6 bg-blue-600 hover:bg-blue-700"
          >
            Start practicing
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
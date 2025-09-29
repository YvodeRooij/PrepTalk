'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock, MessageSquare, ArrowRight, RotateCcw } from 'lucide-react';

interface SessionData {
  messages: Array<{ source: 'user' | 'ai'; message?: string; timestamp?: number }>;
  duration: number;
  roundType?: string;
}

interface InterviewCompletionModalProps {
  sessionData: SessionData;
  onComplete: () => void;
  onBackToInterview: () => void;
}

export function InterviewCompletionModal({
  sessionData,
  onComplete,
  onBackToInterview
}: InterviewCompletionModalProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const formatDuration = (milliseconds: number) => {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const userMessages = sessionData.messages.filter(m => m.source === 'user').length;
  const aiMessages = sessionData.messages.filter(m => m.source === 'ai').length;
  const totalExchanges = Math.min(userMessages, aiMessages);

  const handleAnalyzeSession = async () => {
    setIsAnalyzing(true);

    try {
      // Extract transcript for analysis
      const transcript = sessionData.messages
        .map(m => `${m.source === 'user' ? 'Candidate' : 'Interviewer'}: ${m.message || ''}`)
        .join('\n');

      const response = await fetch('/api/analysis/voice-interview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript,
          duration: Math.floor(sessionData.duration / 1000),
          roundType: sessionData.roundType,
          exchangeCount: totalExchanges
        })
      });

      if (response.ok) {
        // For now, just complete the session
        // In the future, this could navigate to an analysis page
        onComplete();
      } else {
        throw new Error('Analysis failed');
      }
    } catch (error) {
      console.error('Analysis error:', error);
      setIsAnalyzing(false);
    }
  };

  return (
    <Dialog open onOpenChange={() => {}}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-6 w-6 text-green-600" />
            Interview Session Complete
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="text-center">
            <p className="text-gray-600">
              Great job! You've completed your voice interview practice session.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <Clock className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                <p className="text-2xl font-semibold text-gray-900">
                  {formatDuration(sessionData.duration)}
                </p>
                <p className="text-sm text-gray-600">Duration</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 text-center">
                <MessageSquare className="h-8 w-8 text-green-600 mx-auto mb-2" />
                <p className="text-2xl font-semibold text-gray-900">
                  {totalExchanges}
                </p>
                <p className="text-sm text-gray-600">Exchanges</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 text-center">
                <Badge className="bg-purple-100 text-purple-800 mb-2">
                  {sessionData.roundType?.replace('_', ' ').toUpperCase() || 'PRACTICE'}
                </Badge>
                <p className="text-sm text-gray-600">Round Type</p>
              </CardContent>
            </Card>
          </div>

          {sessionData.messages.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Session Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Your responses:</span>
                    <span className="font-medium">{userMessages}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Interviewer questions:</span>
                    <span className="font-medium">{aiMessages}</span>
                  </div>
                  {totalExchanges >= 3 && (
                    <div className="mt-3 p-3 bg-green-50 rounded-lg">
                      <p className="text-sm text-green-800">
                        ✓ Good conversation flow with {totalExchanges} meaningful exchanges
                      </p>
                    </div>
                  )}
                  {totalExchanges < 3 && (
                    <div className="mt-3 p-3 bg-yellow-50 rounded-lg">
                      <p className="text-sm text-yellow-800">
                        Consider practicing longer conversations for better interview simulation
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="bg-blue-50 rounded-lg p-4">
            <h3 className="font-medium text-blue-900 mb-2">Next Steps:</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Practice additional rounds to build confidence</li>
              <li>• Review your performance patterns across sessions</li>
              <li>• Focus on areas where you want to improve</li>
              <li>• Try different round types for comprehensive prep</li>
            </ul>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onBackToInterview}
              className="flex-1"
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Continue practicing
            </Button>

            <Button
              onClick={totalExchanges >= 2 ? handleAnalyzeSession : onComplete}
              disabled={isAnalyzing}
              className="flex-1"
            >
              {isAnalyzing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Analyzing...
                </>
              ) : totalExchanges >= 2 ? (
                <>
                  Analyze session
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              ) : (
                <>
                  Finish
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
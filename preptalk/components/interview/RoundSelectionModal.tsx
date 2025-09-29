'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Users, Timer, Star, AlertCircle } from 'lucide-react';

interface CurriculumRound {
  id: string;
  round_number: number;
  round_type: string;
  duration_minutes: number;
  interviewer_persona: {
    name: string;
    role: string;
    personality: string;
  };
  topics_to_cover: Array<{ text: string; topic: string }>;
  candidate_prep_guide: {
    key_talking_points: string[];
    competitive_intelligence: string[];
  };
}

interface RoundSelectionModalProps {
  isConnecting: boolean;
  error: string | null;
  onSelectRound: (curriculumId: string, roundNumber: number) => void;
  onCancel: () => void;
}

export function RoundSelectionModal({
  isConnecting,
  error,
  onSelectRound,
  onCancel
}: RoundSelectionModalProps) {
  const [curricula, setCurricula] = useState<any[]>([]);
  const [selectedCurriculum, setSelectedCurriculum] = useState<string | null>(null);
  const [rounds, setRounds] = useState<CurriculumRound[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCurricula = async () => {
      try {
        const response = await fetch('/api/curriculum/list');
        if (response.ok) {
          const data = await response.json();
          setCurricula(data.curricula || []);
          if (data.curricula?.length > 0) {
            setSelectedCurriculum(data.curricula[0].id);
          }
        }
      } catch (error) {
        console.error('Failed to fetch curricula:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCurricula();
  }, []);

  useEffect(() => {
    if (!selectedCurriculum) return;

    const fetchRounds = async () => {
      try {
        const response = await fetch(`/api/curriculum/${selectedCurriculum}/rounds`);
        if (response.ok) {
          const data = await response.json();
          setRounds(data.rounds || []);
        }
      } catch (error) {
        console.error('Failed to fetch rounds:', error);
      }
    };

    fetchRounds();
  }, [selectedCurriculum]);

  const roundTypeLabels: Record<string, string> = {
    'behavioral': 'Behavioral',
    'case_study': 'Case Study',
    'technical': 'Technical',
    'culture_fit': 'Culture Fit',
    'final': 'Final Round'
  };

  const roundTypeColors: Record<string, string> = {
    'behavioral': 'bg-blue-100 text-blue-800',
    'case_study': 'bg-purple-100 text-purple-800',
    'technical': 'bg-green-100 text-green-800',
    'culture_fit': 'bg-orange-100 text-orange-800',
    'final': 'bg-red-100 text-red-800'
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your interview curricula...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-semibold text-gray-900 mb-3">
            Select Interview Round
          </h1>
          <p className="text-lg text-gray-600">
            Choose which round you'd like to practice with voice conversation
          </p>
        </div>

        {curricula.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
            <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No curricula found
            </h3>
            <p className="text-gray-600 mb-4">
              You need to generate a curriculum first before practicing voice interviews.
            </p>
            <Button onClick={onCancel}>
              Go to dashboard
            </Button>
          </div>
        ) : (
          <>
            {curricula.length > 1 && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select curriculum:
                </label>
                <select
                  value={selectedCurriculum || ''}
                  onChange={(e) => setSelectedCurriculum(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {curricula.map((curriculum) => (
                    <option key={curriculum.id} value={curriculum.id}>
                      {curriculum.job_title} at {curriculum.company_name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {error && (
              <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200">
                <div className="flex items-center gap-2 text-red-800">
                  <AlertCircle className="h-5 w-5" />
                  <span className="font-medium">Error</span>
                </div>
                <p className="mt-1 text-sm text-red-700">{error}</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
              {rounds.map((round) => (
                <Card key={round.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between mb-2">
                      <Badge className={roundTypeColors[round.round_type] || 'bg-gray-100 text-gray-800'}>
                        Round {round.round_number}
                      </Badge>
                      <span className="text-sm text-gray-500 flex items-center gap-1">
                        <Timer className="h-4 w-4" />
                        {round.duration_minutes}m
                      </span>
                    </div>
                    <CardTitle className="text-lg">
                      {roundTypeLabels[round.round_type] || round.round_type.replace('_', ' ')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-3">
                      <div className="flex items-start gap-2">
                        <Users className="h-4 w-4 text-gray-400 mt-0.5" />
                        <div>
                          <p className="font-medium text-sm text-gray-900">
                            {round.interviewer_persona?.name}
                          </p>
                          <p className="text-xs text-gray-600">
                            {round.interviewer_persona?.role}
                          </p>
                        </div>
                      </div>

                      <div>
                        <p className="text-xs text-gray-500 mb-1">Key topics:</p>
                        <div className="space-y-1">
                          {round.topics_to_cover?.slice(0, 2).map((topic, index) => (
                            <p key={index} className="text-xs text-gray-700 line-clamp-1">
                              • {topic.text || topic.topic}
                            </p>
                          ))}
                          {round.topics_to_cover?.length > 2 && (
                            <p className="text-xs text-gray-500">
                              +{round.topics_to_cover.length - 2} more
                            </p>
                          )}
                        </div>
                      </div>

                      <Button
                        onClick={() => onSelectRound(selectedCurriculum!, round.round_number)}
                        disabled={isConnecting}
                        className="w-full"
                      >
                        {isConnecting ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Connecting...
                          </>
                        ) : (
                          <>
                            Practice this round
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="text-center">
              <Button variant="outline" onClick={onCancel}>
                Back to dashboard
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
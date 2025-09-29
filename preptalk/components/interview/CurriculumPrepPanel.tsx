'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Brain, Target, Lightbulb, CheckCircle } from 'lucide-react';

interface PrepGuide {
  key_talking_points?: string[];
  competitive_intelligence?: string[];
  strategic_focus?: string[];
  preparation_tips?: string[];
}

interface CurriculumPrepPanelProps {
  prepGuide?: PrepGuide;
  roundType?: string;
}

export function CurriculumPrepPanel({
  prepGuide,
  roundType
}: CurriculumPrepPanelProps) {
  const roundTypeLabels: Record<string, string> = {
    'behavioral': 'Behavioral Interview',
    'case_study': 'Case Study',
    'technical': 'Technical Interview',
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

  if (!prepGuide) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Preparation Guide</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 text-sm">
            Preparation guide will appear here once the session starts.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Preparation Guide</CardTitle>
            {roundType && (
              <Badge className={roundTypeColors[roundType] || 'bg-gray-100 text-gray-800'}>
                {roundTypeLabels[roundType] || roundType.replace('_', ' ')}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {prepGuide.key_talking_points && prepGuide.key_talking_points.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Target className="h-4 w-4 text-blue-600" />
                <h3 className="font-medium text-gray-900">Key Talking Points</h3>
              </div>
              <ul className="space-y-2">
                {prepGuide.key_talking_points.map((point, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {prepGuide.competitive_intelligence && prepGuide.competitive_intelligence.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Brain className="h-4 w-4 text-purple-600" />
                <h3 className="font-medium text-gray-900">Competitive Intelligence</h3>
              </div>
              <div className="bg-purple-50 rounded-lg p-3">
                <ul className="space-y-2">
                  {prepGuide.competitive_intelligence.map((insight, index) => (
                    <li key={index} className="text-sm text-purple-800 flex items-start gap-2">
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-purple-400 mt-2 flex-shrink-0"></span>
                      <span>{insight}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {prepGuide.strategic_focus && prepGuide.strategic_focus.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Lightbulb className="h-4 w-4 text-yellow-600" />
                <h3 className="font-medium text-gray-900">Strategic Focus</h3>
              </div>
              <ul className="space-y-2">
                {prepGuide.strategic_focus.map((focus, index) => (
                  <li key={index} className="text-sm text-gray-700 flex items-start gap-2">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-yellow-400 mt-2 flex-shrink-0"></span>
                    <span>{focus}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {prepGuide.preparation_tips && prepGuide.preparation_tips.length > 0 && (
            <div>
              <h3 className="font-medium text-gray-900 mb-3">Preparation Tips</h3>
              <div className="bg-blue-50 rounded-lg p-3">
                <ul className="space-y-2">
                  {prepGuide.preparation_tips.map((tip, index) => (
                    <li key={index} className="text-sm text-blue-800 flex items-start gap-2">
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-400 mt-2 flex-shrink-0"></span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <h3 className="font-medium text-gray-900 mb-2">During the Interview</h3>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• Speak clearly and at a natural pace</li>
            <li>• Take brief pauses to think before answering</li>
            <li>• Use the STAR method for behavioral questions</li>
            <li>• Reference company insights naturally in your responses</li>
            <li>• Ask thoughtful follow-up questions when appropriate</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
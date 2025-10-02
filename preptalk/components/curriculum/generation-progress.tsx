'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, Circle, Loader2 } from 'lucide-react';

interface GenerationStep {
  id: string;
  label: string;
  estimatedSeconds: number;
}

interface GenerationProgressProps {
  mode: 'cv_round_only' | 'full';
  startTime: number;
  progressStage?: 'cv_analysis' | 'demo_generation' | 'complete';
  onComplete?: () => void;
}

export function GenerationProgress({ mode, startTime, progressStage, onComplete }: GenerationProgressProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);

  // Define steps based on mode
  const steps: GenerationStep[] = mode === 'cv_round_only'
    ? [
        { id: 'analyze_cv', label: 'Analyzing your CV', estimatedSeconds: 30 },
        // NO question generation step - ElevenLabs generates questions live!
      ]
    : [
        { id: 'research', label: 'Researching company & role', estimatedSeconds: 60 },
        { id: 'analyze', label: 'Analyzing interview patterns', estimatedSeconds: 50 },
        { id: 'synthesize', label: 'Synthesizing with your CV', estimatedSeconds: 40 },
        { id: 'design', label: 'Designing 5-round structure', estimatedSeconds: 50 },
        { id: 'generate_rounds', label: 'Generating all interview rounds', estimatedSeconds: 200 },
        { id: 'prep_guides', label: 'Creating preparation guides', estimatedSeconds: 60 },
        { id: 'quality_check', label: 'Quality evaluation', estimatedSeconds: 30 },
        { id: 'finalize', label: 'Finalizing curriculum', estimatedSeconds: 10 },
      ];

  const totalEstimated = steps.reduce((sum, s) => sum + s.estimatedSeconds, 0);

  // Update progress based on REAL stage (not fake timer)
  useEffect(() => {
    // Map real progress stages to step indices
    if (mode === 'cv_round_only') {
      if (progressStage === 'cv_analysis') {
        setCurrentStep(0); // Analyzing CV
      } else if (progressStage === 'demo_generation' || progressStage === 'complete') {
        // Demo generation is instant now (no LLM call), mark as complete
        setCurrentStep(steps.length); // All done
        if (onComplete) onComplete();
      }
    }
  }, [progressStage, mode, steps.length, onComplete]);

  // Keep timer running for display
  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000;
      setElapsedTime(elapsed);
    }, 500);

    return () => clearInterval(interval);
  }, [startTime]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = Math.min((elapsedTime / totalEstimated) * 100, 100);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">
            {mode === 'cv_round_only' ? 'Generating CV Round...' : 'Generating Full Curriculum...'}
          </h3>
          <p className="text-sm text-muted-foreground">
            Estimated time: ~{Math.ceil(totalEstimated / 60)} minutes
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold">{formatTime(elapsedTime)}</div>
          <div className="text-xs text-muted-foreground">elapsed</div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="relative">
        <div className="h-2 bg-secondary rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="text-xs text-right mt-1 text-muted-foreground">
          {Math.round(progress)}%
        </div>
      </div>

      {/* Steps */}
      <div className="space-y-3 max-h-[400px] overflow-y-auto">
        {steps.map((step, index) => {
          const isCompleted = index < currentStep;
          const isInProgress = index === currentStep;
          const isPending = index > currentStep;

          return (
            <div
              key={step.id}
              className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
                isInProgress
                  ? 'bg-primary/5 border border-primary/20 shadow-sm'
                  : isCompleted
                  ? 'bg-green-50 border border-green-100'
                  : 'bg-secondary/50'
              }`}
            >
              {isCompleted && <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />}
              {isInProgress && <Loader2 className="w-5 h-5 text-primary animate-spin flex-shrink-0" />}
              {isPending && <Circle className="w-5 h-5 text-muted-foreground/30 flex-shrink-0" />}

              <span
                className={`flex-1 ${
                  isInProgress ? 'font-medium text-primary' : ''
                } ${
                  isPending ? 'text-muted-foreground' : ''
                } ${
                  isCompleted ? 'text-green-700' : ''
                }`}
              >
                {step.label}
              </span>

              {isInProgress && (
                <span className="text-xs text-primary font-medium">In progress...</span>
              )}
              {isCompleted && (
                <span className="text-xs text-green-600 font-medium">✓ Done</span>
              )}
              {isPending && (
                <span className="text-xs text-muted-foreground/50">~{step.estimatedSeconds}s</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer tip */}
      {mode === 'full' && (
        <div className="text-xs text-center text-muted-foreground bg-blue-50 p-3 rounded-lg border border-blue-100">
          💡 <strong>Pro tip:</strong> This process includes deep company research, competitive analysis,
          and personalized interview strategies. Your full curriculum will be comprehensive!
        </div>
      )}
    </div>
  );
}
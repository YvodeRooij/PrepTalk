'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { useConversationWithTimeManagement } from '@/shared/lib/voice/useConversationWithTimeManagement';
import { Mic, PhoneOff, Timer } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { InterviewCompletionModal } from '@/components/interview/InterviewCompletionModal';

type InterviewSession = {
  systemPrompt: string;
  firstMessage: string;
  signedUrl: string;
  roundMetadata: {
    persona: any;
    questions: any[];
    prepGuide: any;
    roundType: string;
    duration: number;
  };
  remainingCredits: number;
};

type Message = {
  source: 'user' | 'ai';
  message?: string;
  timestamp?: number;
};

type ModalState =
  | { type: 'none' }
  | { type: 'interview-complete', sessionData: any };

export default function VoiceInterviewPage({
  searchParams,
}: {
  searchParams: Promise<{ curriculumId?: string; roundNumber?: string }>;
}) {
  // Get URL parameters using React.use()
  const params = use(searchParams);
  const curriculumId = params.curriculumId;
  const roundNumber = params.roundNumber ? parseInt(params.roundNumber) : null;

  const [interviewSession, setInterviewSession] = useState<InterviewSession | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [durationMinutes, setDurationMinutes] = useState(30); // Default 30, will be updated

  // Interview state
  const [messages, setMessages] = useState<Message[]>([]);
  const [modalState, setModalState] = useState<ModalState | null>(null);
  const [speakerState, setSpeakerState] = useState<'none' | 'user' | 'ai' | 'thinking'>('none');
  const [timeStatus, setTimeStatus] = useState({ elapsed: 0, remaining: 30, progress: 0 });
  const [startTime] = useState(Date.now());

  const router = useRouter();
  const isMountedRef = React.useRef(true);

  // Use the exact hook pattern from the example
  const conversation = useConversationWithTimeManagement({
    durationMinutes,
    onMessage: (message) => {
      console.log('🎙️ [VOICE] Message received:', { source: message.source, hasMessage: !!message.message, length: message.message?.length });
      setMessages((prev) => [...prev, message]);
      // Derive speaker state from messages - using correct ElevenLabs SDK properties
      if (message.source === 'user') {
        setSpeakerState('user');
      } else if (message.source === 'ai' && message.message) {
        setSpeakerState('thinking');
      }
    },
    onError: (e) => {
      console.error('🚨 [VOICE] Error occurred:', e);
      // Check if it's a truncation/timeout related error
      if (e.message?.includes('timeout') || e.message?.includes('disconnected')) {
        console.error('🚨 [VOICE] Potential truncation issue detected');
      }
    },
    onTimeUpdate: (context, checkpoint) => {
      console.log(`🕒 [INTERVIEW] Time checkpoint reached: ${checkpoint.minutes} minutes - ${checkpoint.phase}`);
      // Update time status for UI
      const status = conversation.getTimeStatus();
      setTimeStatus(status);
    },
    autoStartTimer: true // Start timer when AI begins speaking
  });

  const conversationRef = React.useRef(conversation);
  useEffect(() => {
    conversationRef.current = conversation;
  });

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Start session directly with URL parameters
  useEffect(() => {
    if (curriculumId && roundNumber) {
      handleRoundSelection(curriculumId, roundNumber);
    } else {
      setError('Missing curriculum or round information');
    }
  }, [curriculumId, roundNumber]);

  // Handle round selection - following exact example pattern
  const handleRoundSelection = async (curriculumId: string, roundNumber: number) => {
    setIsConnecting(true);
    setError(null);

    try {
      // Get interview prompt - using voice/prompt instead of interview-prompt
      const promptResponse = await fetch('/api/voice/prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ curriculumId, roundNumber }),
      });

      if (!promptResponse.ok) {
        throw new Error('Failed to get interview prompt');
      }

      const promptData = await promptResponse.json();

      // 🎯 Set duration from round metadata (demo rounds get 2 minutes max)
      const roundDuration = promptData.roundMetadata?.duration || 30;
      const isDemo = promptData.roundMetadata?.roundType === 'recruiter_screen' && roundNumber === 1;
      const effectiveDuration = isDemo ? Math.min(roundDuration, 2) : roundDuration;

      console.log(`⏱️ [DEMO] Round duration: ${roundDuration}min, isDemo: ${isDemo}, effective: ${effectiveDuration}min`);
      setDurationMinutes(effectiveDuration);

      // Get signed URL with voice randomization parameters
      const urlResponse = await fetch(`/api/speech-interview?curriculumId=${curriculumId}&roundNumber=${roundNumber}`);
      if (!urlResponse.ok) {
        throw new Error('Failed to get interview URL');
      }

      const { signedUrl } = await urlResponse.json();

      setInterviewSession({
        systemPrompt: promptData.systemPrompt,
        firstMessage: promptData.firstMessage,
        signedUrl,
        roundMetadata: promptData.roundMetadata,
        remainingCredits: promptData.remainingCredits
      });

    } catch (error) {
      console.error('Failed to prepare speech interview:', error);
      setError(error instanceof Error ? error.message : 'Unknown error occurred');
    } finally {
      setIsConnecting(false);
    }
  };

  // Start conversation when session is ready - exact pattern from example
  useEffect(() => {
    if (!interviewSession) return;

    const { signedUrl, systemPrompt, firstMessage } = interviewSession;

    const startConversation = async () => {
      // Configure WebSocket URL with inactivity timeout
      const wsUrl = new URL(signedUrl);
      wsUrl.searchParams.set('inactivity_timeout', '180'); // 3 minutes - back to original

      await conversationRef.current.startSession({
        signedUrl: wsUrl.toString(),
        overrides: {
          agent: {
            prompt: { prompt: systemPrompt },
            firstMessage,
          },
        },
        // Configure SDK timeout for session establishment
        timeoutInSeconds: 60
      });
    };

    startConversation();

    return () => {
      try {
        conversationRef.current?.stopSession?.();
      } catch (error) {
        console.error('Error stopping session:', error);
      }
    };
  }, [interviewSession]);

  // Update time status periodically for UI display
  useEffect(() => {
    const interval = setInterval(() => {
      const status = conversation.getTimeStatus();
      setTimeStatus(status);

      // 🎯 Auto-end session when time runs out
      if (status.remaining === 0 && conversation.status === 'connected') {
        console.log('⏱️ [DEMO] Time limit reached, ending session');
        handleSessionComplete();
      }
    }, 1000); // Update every second to catch time limit

    return () => clearInterval(interval);
  }, [conversation]);

  const { isSpeaking } = conversation;

  useEffect(() => {
    if (isSpeaking) {
      setSpeakerState('ai');
    }
  }, [isSpeaking]);

  const handleSessionComplete = () => {
    setModalState({
      type: 'interview-complete',
      sessionData: {
        messages,
        duration: Date.now() - startTime,
        roundType: interviewSession?.roundMetadata?.roundType
      }
    });
  };

  const handleBackToInterview = () => {
    setModalState({ type: 'none' });
  };

  const handleCompleteSession = () => {
    // Navigate back to dashboard
    router.push('/dashboard');
  };

  // Show loading or error state
  if (!interviewSession && (isConnecting || error)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          {isConnecting && (
            <>
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Connecting to voice interview...</p>
            </>
          )}
          {error && (
            <>
              <div className="text-red-600 mb-4">Error</div>
              <p className="text-gray-600 mb-4">{error}</p>
              <button
                onClick={() => router.push('/dashboard')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Back to dashboard
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  if (!interviewSession) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Preparing interview session...</p>
        </div>
      </div>
    );
  }

  // Show main interview interface
  return (
    <div className="relative min-h-screen bg-gradient-to-b from-white via-white to-slate-50 flex flex-col items-center justify-center px-6 py-12">
      <div className="absolute inset-0 pointer-events-none" aria-hidden>
        <div className="absolute left-1/2 top-1/3 h-72 w-72 -translate-x-1/2 rounded-full bg-teal-500/10 blur-3xl" />
        <div className="absolute left-1/2 top-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-cyan-500/10 blur-3xl" />
      </div>

      <div className="relative z-10 flex w-full max-w-3xl flex-col items-center gap-8 text-center">
        <div className="flex w-full flex-wrap items-center justify-center gap-6 text-sm text-slate-500">
          <div className="rounded-full border border-slate-200/80 px-4 py-2 backdrop-blur-sm">
            {interviewSession.roundMetadata.roundType?.replace('_', ' ')} • Round {roundNumber}
          </div>
          <div className="flex items-center gap-2 rounded-full border border-slate-200/80 px-4 py-2 backdrop-blur-sm">
            <Timer className="h-4 w-4 text-slate-400" />
            <span className="tabular-nums">
              {Math.floor(timeStatus.elapsed / 60000)}:
              {String(Math.floor((timeStatus.elapsed % 60000) / 1000)).padStart(2, '0')}
            </span>
          </div>
          <button
            onClick={handleSessionComplete}
            className="flex items-center gap-2 rounded-full border border-red-200/70 bg-red-50/60 px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-100"
          >
            <PhoneOff className="h-4 w-4" />
            End interview
          </button>
        </div>

        <div className="relative h-80 w-80 max-w-full">
          <motion.div
            className="absolute inset-0 rounded-full border border-white/60 shadow-[0_0_60px_rgba(13,148,136,0.35)]"
            animate={{
              opacity: speakerState !== 'none' ? [0.35, 0.6, 0.35] : 0.25,
              scale: speakerState !== 'none' ? [1, 1.1, 1] : [1, 1.02, 1],
            }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
          />

          <motion.div
            className={`absolute inset-6 rounded-full border-2 ${
              speakerState === 'user'
                ? 'border-sky-300'
                : speakerState === 'ai'
                ? 'border-teal-300'
                : speakerState === 'thinking'
                ? 'border-indigo-300'
                : 'border-slate-200'
            }`}
            animate={{
              scale: speakerState !== 'none' ? [1, 1.05, 1] : 1,
              opacity: speakerState === 'none' ? 0.4 : 1,
            }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
          />

          <div className="absolute inset-1/4 rounded-full bg-white/80 shadow-lg backdrop-blur-sm border border-white/60 flex items-center justify-center">
            {speakerState === 'user' ? (
              <div className="flex h-12 items-end gap-1">
                {[0, 1, 2, 3].map((index) => (
                  <motion.div
                    key={`user-bar-${index}`}
                    className="w-1.5 rounded-full bg-sky-400"
                    animate={{ height: [18, 40, 18] }}
                    transition={{
                      duration: 0.8,
                      repeat: Infinity,
                      ease: 'easeInOut',
                      delay: index * 0.12,
                    }}
                  />
                ))}
              </div>
            ) : speakerState === 'ai' ? (
              <div className="flex h-12 items-end gap-1">
                {[0, 1, 2, 3].map((index) => (
                  <motion.div
                    key={`ai-bar-${index}`}
                    className="w-1.5 rounded-full bg-teal-400"
                    animate={{ height: [18, 36, 18] }}
                    transition={{
                      duration: 0.9,
                      repeat: Infinity,
                      ease: 'easeInOut',
                      delay: index * 0.15,
                    }}
                  />
                ))}
              </div>
            ) : speakerState === 'thinking' ? (
              <div className="flex gap-1">
                {[0, 1, 2].map((index) => (
                  <motion.div
                    key={`think-dot-${index}`}
                    className="h-2 w-2 rounded-full bg-indigo-400"
                    animate={{ opacity: [0.3, 1, 0.3], scale: [0.9, 1.1, 0.9] }}
                    transition={{
                      duration: 1.4,
                      repeat: Infinity,
                      ease: 'easeInOut',
                      delay: index * 0.2,
                    }}
                  />
                ))}
              </div>
            ) : (
              <Mic className="h-10 w-10 text-slate-400" />
            )}
          </div>
        </div>


      </div>

      <AnimatePresence>
        {modalState?.type === 'interview-complete' && (
          <InterviewCompletionModal
            sessionData={modalState.sessionData}
            onComplete={handleCompleteSession}
            onBackToInterview={handleBackToInterview}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
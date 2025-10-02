'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useConversation } from '@elevenlabs/react';

type Message = {
  source: 'user' | 'ai';
  message?: string;
  timestamp?: number;
};

type TimeContext = {
  phase: string;
  minutes: number;
  totalElapsed: number;
};

type TimeCheckpoint = {
  phase: string;
  minutes: number;
};

type TimeStatus = {
  elapsed: number;
  remaining: number;
  progress: number;
};

interface ConversationConfig {
  onMessage: (message: Message) => void;
  onError: (error: Error) => void;
  onTimeUpdate: (context: TimeContext, checkpoint: TimeCheckpoint) => void;
  autoStartTimer?: boolean;
  durationMinutes?: number; // Total session duration in minutes (default: 30)
}

interface SessionConfig {
  signedUrl: string;
  overrides?: {
    agent?: {
      prompt?: { prompt: string };
      firstMessage?: string;
    };
  };
  timeoutInSeconds?: number;
}

export function useConversationWithTimeManagement(config: ConversationConfig) {
  const [timeElapsed, setTimeElapsed] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const isSessionActiveRef = useRef(false);
  const durationMs = (config.durationMinutes || 30) * 60 * 1000;

  // Start timer for session tracking
  const startTimer = useCallback(() => {
    if (timerRef.current) return;

    startTimeRef.current = Date.now();
    timerRef.current = setInterval(() => {
      if (startTimeRef.current) {
        const elapsed = Date.now() - startTimeRef.current;
        const elapsedMinutes = Math.floor(elapsed / 60000);

        setTimeElapsed(elapsed);

        // Time checkpoints
        if (elapsedMinutes > 0 && elapsedMinutes % 5 === 0) {
          const phase = elapsedMinutes >= 25 ? 'wrap-up' : elapsedMinutes >= 15 ? 'deep-dive' : 'opening';
          config.onTimeUpdate(
            { phase, minutes: elapsedMinutes, totalElapsed: elapsed },
            { phase, minutes: elapsedMinutes }
          );
        }
      }
    }, 1000);
  }, [config]);

  // Stop timer
  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Get current time status
  const getTimeStatus = useCallback((): TimeStatus => {
    if (!startTimeRef.current) {
      return { elapsed: 0, remaining: durationMs, progress: 0 };
    }

    const elapsed = Date.now() - startTimeRef.current;
    const remaining = Math.max(0, durationMs - elapsed);
    const progress = Math.min(1, elapsed / durationMs);

    return { elapsed, remaining, progress };
  }, [durationMs]);

  // Use the ElevenLabs React SDK
  const conversation = useConversation({
    onMessage: (message) => {
      config.onMessage?.(message);

      // Auto-start timer when first AI message is received
      if (config.autoStartTimer && !isSessionActiveRef.current && message.source === 'ai') {
        console.log('🕒 [TIME MANAGER] Auto-starting timer on first AI message');
        startTimer();
        isSessionActiveRef.current = true;
      }
    },
    onError: (error) => {
      console.error('🔴 [CONVERSATION] Error:', error);
      config.onError?.(error);
    },
  });

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      conversation.stopSession?.();
      stopTimer();
    };
  }, [conversation, stopTimer]);

  return {
    ...conversation,
    getTimeStatus,
    timeElapsed,
    stopTimer
  };
}
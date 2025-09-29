'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

type Message = {
  source: 'user' | 'ai';
  message?: string;
  timestamp?: number;
};

type TimeStatus = {
  elapsed: number;
  remaining: number;
  progress: number;
};

type VoiceInterviewConfig = {
  onMessage: (message: Message) => void;
  onError: (error: Error) => void;
  onTimeUpdate: (status: TimeStatus) => void;
  autoStartTimer?: boolean;
};

type SessionConfig = {
  signedUrl: string;
  overrides?: {
    agent?: {
      prompt?: { prompt: string };
      firstMessage?: string;
    };
  };
  timeoutInSeconds?: number;
};

export function useVoiceInterview(config: VoiceInterviewConfig) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [timeElapsed, setTimeElapsed] = useState(0);

  const wsRef = useRef<WebSocket | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number | null>(null);

  // Start timer for session tracking
  const startTimer = useCallback(() => {
    if (timerRef.current) return;

    startTimeRef.current = Date.now();
    timerRef.current = setInterval(() => {
      if (startTimeRef.current) {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setTimeElapsed(elapsed);

        config.onTimeUpdate({
          elapsed,
          remaining: Math.max(0, 1800 - elapsed), // 30 minutes max
          progress: Math.min(1, elapsed / 1800)
        });
      }
    }, 1000);
  }, [config]);

  // Stop timer
  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    startTimeRef.current = null;
  }, []);

  // Start voice session
  const startSession = useCallback(async (sessionConfig: SessionConfig) => {
    try {
      // Close existing connection
      if (wsRef.current) {
        wsRef.current.close();
      }

      // Create WebSocket connection
      const ws = new WebSocket(sessionConfig.signedUrl);
      wsRef.current = ws;

      // Set up connection timeout
      const timeout = setTimeout(() => {
        if (ws.readyState !== WebSocket.OPEN) {
          ws.close();
          config.onError(new Error('Connection timeout'));
        }
      }, (sessionConfig.timeoutInSeconds || 60) * 1000);

      ws.onopen = () => {
        clearTimeout(timeout);
        setIsConnected(true);

        if (config.autoStartTimer) {
          startTimer();
        }

        // Send configuration if provided
        if (sessionConfig.overrides) {
          ws.send(JSON.stringify({
            type: 'configure',
            ...sessionConfig.overrides
          }));
        }
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          // Handle different message types from ElevenLabs
          switch (data.type) {
            case 'message':
              config.onMessage({
                source: data.source || 'ai',
                message: data.message,
                timestamp: Date.now()
              });
              break;

            case 'speech_started':
              setIsSpeaking(true);
              break;

            case 'speech_ended':
              setIsSpeaking(false);
              break;

            case 'error':
              config.onError(new Error(data.message || 'Voice session error'));
              break;
          }
        } catch (error) {
          console.warn('Failed to parse WebSocket message:', error);
        }
      };

      ws.onerror = (error) => {
        clearTimeout(timeout);
        config.onError(new Error('WebSocket connection error'));
      };

      ws.onclose = () => {
        clearTimeout(timeout);
        setIsConnected(false);
        setIsSpeaking(false);
        stopTimer();
      };

    } catch (error) {
      config.onError(error instanceof Error ? error : new Error('Failed to start session'));
    }
  }, [config, startTimer, stopTimer]);

  // Stop voice session
  const stopSession = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
    setIsSpeaking(false);
    stopTimer();
  }, [stopTimer]);

  // Get current time status
  const getTimeStatus = useCallback((): TimeStatus => {
    return {
      elapsed: timeElapsed,
      remaining: Math.max(0, 1800 - timeElapsed),
      progress: Math.min(1, timeElapsed / 1800)
    };
  }, [timeElapsed]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopSession();
    };
  }, [stopSession]);

  return {
    isSpeaking,
    isConnected,
    startSession,
    stopSession,
    getTimeStatus
  };
}
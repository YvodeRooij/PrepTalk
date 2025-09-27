# Enormous Code Dump

This file contains the code from all the files referenced in the insight report.

---

## `app/assessment-realtime/page.tsx`

```typescript
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useConversationWithTimeManagement } from '@/shared/lib/voice/useConversationWithTimeManagement';
import { BarChart3 } from 'lucide-react';
import { motion } from 'framer-motion';
import CaseSelectionModal from '@/app/components/CaseSelectionModal';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/shared/components/ui/sheet';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent } from '@/shared/components/ui/card';
import { Skeleton } from '@/shared/components/ui/skeleton';
import CaseDataPanel from './components/CaseDataPanel';
import type { CaseData } from './components/CaseDataPanel';
import InterviewEndModal from './components/InterviewEndModal';
import type { ModalState } from './components/InterviewEndModal';
import AssessmentRealtimePreparationModal from './components/AssessmentRealtimePreparationModal';
import { validateInterview } from './lib/interviewValidation';
import { SecurePreviewTimer } from '@/app/assessment/components/SecurePreviewTimer';

// Transform SelectedCase to CaseData format for CaseDataPanel
const transformCaseDataForPanel = (selectedCase: SelectedCase): CaseData => {
  return {
    id: selectedCase.id,
    title: selectedCase.title,
    company: selectedCase.company,
    case_type: selectedCase.type,
    industry: selectedCase.industry,
    data_points: selectedCase.dataPoints || {},
    context_for_the_case: {
      clientBackground: `Case study focused on ${selectedCase.company} in the ${selectedCase.industry} industry.`,
      keyConsiderations: [
        `Difficulty level: ${selectedCase.difficulty}`,
        `Case type: ${selectedCase.type}`,
        'Focus on data-driven insights and strategic recommendations'
      ],
      industryBackground: `This case explores challenges and opportunities within the ${selectedCase.industry} sector.`
    }
  };
};

interface SelectedCase {
  id: string;
  title: string;
  company: string;
  type: string;
  industry: string;
  difficulty: string;
  dataPoints?: Record<string, any>;
}

interface InterviewData {
  systemPrompt: string;
  firstMessage: string;
  signedUrl: string;
  caseData: SelectedCase;
}

type LocalMessage = { source: 'user' | 'ai'; message?: string };

export default function AssessmentRealtimePage() {
  // Preparation modal state - check if user has seen it before
  // IMPORTANT: Keep initial render identical on server and client to avoid hydration mismatches
  const [showPreparationModal, setShowPreparationModal] = useState(true);

  const [showCaseSelection, setShowCaseSelection] = useState(false); // Start false, show after preparation
  const [interviewData, setInterviewData] = useState<InterviewData | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewBlocked, setPreviewBlocked] = useState<string | null>(null);
  const [previewInfo, setPreviewInfo] = useState<{ allowed: boolean; timeRemaining?: number; sessionId?: string } | null>(null);
  const [userSubscription, setUserSubscription] = useState<{ tier: string; isPro: boolean; isProMax: boolean } | null>(null);

  const handlePreviewExpired = () => {
    setPreviewBlocked('Preview session expired. Upgrade to PRO for unlimited access.');
    // Ensure selection/interview UI is closed so blocked screen is shown
    setShowCaseSelection(false);
    setInterviewData(null);
  };

  const fetchUserSubscription = async () => {
    try {
      const res = await fetch('/api/subscription/current');
      if (res.ok) {
        const data = await res.json();
        setUserSubscription({
          tier: data.tier || 'free',
          isPro: data.isPro || false,
          isProMax: data.isProMax || false
        });
        return data;
      } else {
        // Fallback to free tier for unauthenticated users
        setUserSubscription({ tier: 'free', isPro: false, isProMax: false });
        return { tier: 'free', isPro: false, isProMax: false };
      }
    } catch (e) {
      console.warn('[SUBSCRIPTION] Failed to fetch user subscription, defaulting to free', e);
      setUserSubscription({ tier: 'free', isPro: false, isProMax: false });
      return { tier: 'free', isPro: false, isProMax: false };
    }
  };

  const validateSessionAccess = async (subscription: { tier: string; isPro: boolean; isProMax: boolean }) => {
    // Pro and Pro Max users bypass preview logic entirely
    if (subscription.isPro || subscription.isProMax) {
      console.log('[SESSION][REALTIME] Pro user - bypassing preview validation');
      return { allowed: true, isPro: subscription.isPro, isProMax: subscription.isProMax };
    }

    // Free users use preview validation
    try {
      const res = await fetch(window.location.pathname, {
        method: 'HEAD',
        headers: { 'X-Preview-Session-Validation': 'true' }
      });
      const allowed = res.headers.get('X-Preview-Allowed') === 'true';
      const timeRemaining = parseInt(res.headers.get('X-Preview-Time-Remaining') || '0');
      const sessionId = res.headers.get('X-Preview-Session-ID') || undefined;
      const message = decodeURIComponent(res.headers.get('X-Preview-Message') || '') || 'Preview not allowed';

      console.log('[PREVIEW][REALTIME] HEAD validation for free user', {
        status: res.status,
        allowed,
        timeRemaining,
        sessionId: sessionId ? sessionId.slice(-6) : undefined
      });

      setPreviewInfo({ allowed, timeRemaining, sessionId });
      if (!allowed || res.status === 403) {
        setPreviewBlocked(message);
        return { allowed: false };
      }
      return { allowed: true };
    } catch (e) {
      console.warn('[PREVIEW][REALTIME] HEAD validation failed, allowing fallback once', e);
      setPreviewInfo({ allowed: true, timeRemaining: 90_000 });
      return { allowed: true };
    }
  };

  // After mount, reconcile preparation modal with sessionStorage and optionally skip to case selection
  useEffect(() => {
    const seen = typeof window !== 'undefined' && !!sessionStorage.getItem('assessment-realtime-preparation-seen');
    if (seen) {
      setShowPreparationModal(false);
      // Fetch subscription and validate access before auto-advancing
      (async () => {
        const subscription = await fetchUserSubscription();
        const accessResult = await validateSessionAccess(subscription);
        if (accessResult.allowed) {
          setShowCaseSelection(true);
        } else {
          setShowCaseSelection(false);
        }
      })();
    } else {
      // Show modal on first visit, but still fetch subscription info
      setShowPreparationModal(true);
      fetchUserSubscription();
    }
  }, []);

  const handleCaseSelection = async (caseId: string) => {
    setIsConnecting(true);
    setError(null);
    try {
      const promptResponse = await fetch('/api/interview-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caseId }),
      });
      if (!promptResponse.ok) throw new Error('Failed to get interview prompt.');
      const { systemPrompt, firstMessage, case: caseData } = await promptResponse.json();

      const urlResponse = await fetch('/api/speech-interview');
      if (!urlResponse.ok) throw new Error('Failed to get interview URL.');
      const { signedUrl } = await urlResponse.json();

      setInterviewData({ systemPrompt, firstMessage, signedUrl, caseData });
      setShowCaseSelection(false);
    } catch (err) {
      console.error('Failed to prepare speech interview:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleEndInterview = () => {
    setShowCaseSelection(true);
    setInterviewData(null);
  };

  // Handle proceeding from preparation modal - this counts as a prep session
  const handlePreparationProceed = async () => {
    setShowPreparationModal(false);
    try { sessionStorage.setItem('assessment-realtime-preparation-seen', '1'); } catch {}

    // Ensure we have subscription info
    const subscription = userSubscription || await fetchUserSubscription();

    // Validate session access based on user tier
    const accessResult = await validateSessionAccess(subscription);
    if (!accessResult.allowed) {
      console.log('[SESSION][REALTIME] Blocking case selection due to session limit');
      return;
    }
    setShowCaseSelection(true);
    console.log('📋 [AssessmentRealtime] Proceeded to case selection');
  };

  // Disable page scroll for this route only (locks both <html> and <body>)
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;

    // Preserve previous inline styles to restore on unmount
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;
    const prevHtmlHeight = html.style.height;
    const prevBodyHeight = body.style.height;
    const prevHtmlOverscroll = (html.style as any).overscrollBehavior;

    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    html.style.height = '100%';
    body.style.height = '100%';
    // Prevent scroll chaining/bounce without disabling inner scroll areas
    (html.style as any).overscrollBehavior = 'contain';

    return () => {
      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
      html.style.height = prevHtmlHeight;
      body.style.height = prevBodyHeight;
      (html.style as any).overscrollBehavior = prevHtmlOverscroll;
    };
  }, []);

  // Show preparation modal first
  if (showPreparationModal) {
    return (
      <div className="h-screen bg-gradient-to-b from-gray-50 to-white overflow-hidden">
        <AssessmentRealtimePreparationModal
          isOpen={showPreparationModal}
          onClose={() => setShowPreparationModal(false)}
          onProceed={handlePreparationProceed}
        />
      </div>
    );
  }

  // If preview was explicitly blocked (HEAD returned 403), show a clear UX instead of a generic loader
  if (!showPreparationModal && !showCaseSelection && !interviewData && previewBlocked) {
    return (
      <div className="h-screen bg-gradient-to-b from-gray-50 to-white overflow-hidden flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-center">
          <div className="mx-auto mb-3 w-10 h-10 rounded-full bg-red-50 text-red-600 flex items-center justify-center">
            !
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Preview limit reached</h2>
          <p className="text-sm text-gray-600 mb-4">
            {previewBlocked || "You've already used your daily free preview for the realtime interview."}
          </p>
          <div className="flex items-center justify-center gap-3">
            <a href="/pricing?upgrade=true&from=preview_realtime">
              <Button variant="default">Upgrade to PRO</Button>
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (showCaseSelection) {
    return (
      <div className="h-screen bg-gradient-to-b from-gray-50 to-white overflow-hidden">
        <div className="relative z-10 max-w-4xl mx-auto p-6 flex flex-col items-center justify-center h-full">
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="text-center mb-12">
                <h1 className="text-5xl font-light text-gray-900 mb-3">Speech Interview</h1>
                <p className="text-base text-gray-600 max-w-xl mx-auto">AI-powered case interview practice</p>
            </motion.div>
            {/* Show session info based on user tier */}
            {userSubscription?.isPro && (
              <p className="text-xs text-blue-600 mb-2">
                PRO: Full session access (1 per day)
              </p>
            )}
            {userSubscription?.isProMax && (
              <p className="text-xs text-purple-600 mb-2">
                PRO MAX: Full session access (3 per day)
              </p>
            )}
            {(!userSubscription?.isPro && !userSubscription?.isProMax && previewInfo && previewInfo.allowed) && (
              <p className="text-xs text-gray-500 mb-2">
                Preview session active{previewInfo.timeRemaining ? ` · ${Math.ceil((previewInfo.timeRemaining||0)/1000)}s remaining` : ''}
              </p>
            )}
            {error && <p className="text-red-600 text-sm mb-2">Error: {error}</p>}
            {previewBlocked && (
              <div className="text-red-600 text-sm mb-6">
                {previewBlocked}
                <div className="mt-2">
                  <a className="text-blue-600 underline" href="/pricing?upgrade=true&from=preview_realtime">Upgrade to PRO</a>
                </div>
              </div>
            )}
            <div data-testid="case-modal" className="w-full">
              <CaseSelectionModal isOpen={true} onSelectCase={handleCaseSelection} onClose={() => {}} />
            </div>
            {isConnecting && (
              <div className="mt-8 w-full max-w-md">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="h-4 w-4 rounded-full border-2 border-gray-300 border-t-gray-900 animate-spin" />
                      <p className="text-sm text-muted-foreground">Initializing realtime session…</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
        </div>
      </div>
    );
  }

  if (!interviewData) {
    return (
      <div className="h-screen bg-gradient-to-b from-gray-50 to-white overflow-hidden flex items-center justify-center p-6">
        <div className="w-full max-w-2xl">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-5 w-5 rounded-full border-2 border-gray-300 border-t-gray-900 animate-spin" />
                <p className="text-sm text-muted-foreground">Loading interview…</p>
              </div>
              <div className="space-y-3">
                <Skeleton className="h-6 w-3/5" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <div className="grid grid-cols-3 gap-3 pt-2">
                  <Skeleton className="h-28" />
                  <Skeleton className="h-28" />
                  <Skeleton className="h-28" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <InterviewView
      interviewData={interviewData}
      userSubscription={userSubscription}
      onEnd={handleEndInterview}
      onPreviewExpired={handlePreviewExpired}
    />
  );
}

function InterviewView({
  interviewData,
  userSubscription,
  onEnd,
  onPreviewExpired
}: {
  interviewData: InterviewData;
  userSubscription: { tier: string; isPro: boolean; isProMax: boolean } | null;
  onEnd: () => void;
  onPreviewExpired: () => void;
}) {
  const router = useRouter();
  const { signedUrl, systemPrompt, firstMessage, caseData } = interviewData;
  const [messages, setMessages] = useState<LocalMessage[]>([]);
  const [speakerState, setSpeakerState] = useState('none');
  const [startTime] = useState(Date.now());
  const [modalState, setModalState] = useState<ModalState | null>(null);
  const [timeStatus, setTimeStatus] = useState({ elapsed: 0, remaining: 30, progress: 0 });
  const isMountedRef = React.useRef(true);

  const conversation = useConversationWithTimeManagement({
    onMessage: (message) => {
      setMessages((prev) => [...prev, message]);
      // Derive speaker state from messages - using correct ElevenLabs SDK properties
      if (message.source === 'user') {
        setSpeakerState('user');
      } else if (message.source === 'ai' && message.message) {
        setSpeakerState('thinking');
      }
    },
    onError: (e) => console.error(e),
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

  // Update time status periodically for UI display
  useEffect(() => {
    const interval = setInterval(() => {
      const status = conversation.getTimeStatus();
      setTimeStatus(status);
    }, 10000); // Update every 10 seconds

    return () => clearInterval(interval);
  }, [conversation]);

  const { isSpeaking } = conversation;
  const [showTimer, setShowTimer] = useState(false);
  const hasAgentStartedRef = React.useRef(false);

  useEffect(() => {
    if (isSpeaking) {
      setSpeakerState('ai');
      if (!hasAgentStartedRef.current) {
        hasAgentStartedRef.current = true;
        // Only show timer for free users (preview mode)
        if (!userSubscription?.isPro && !userSubscription?.isProMax) {
          setShowTimer(true); // reveal preview timer when agent starts talking
        }
      }
    } else if (speakerState === 'ai') {
      // When AI finishes speaking, go back to idle/none
      setSpeakerState('none');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSpeaking, userSubscription]);


  const [isDataSheetOpen, setIsDataSheetOpen] = useState(false);

  useEffect(() => {
    const startConversation = async () => {
      // Configure WebSocket URL with inactivity timeout (max 180 seconds for extended thinking)
      const wsUrl = new URL(signedUrl);
      wsUrl.searchParams.set('inactivity_timeout', '180');

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
  }, [signedUrl, systemPrompt, firstMessage]);

  const extractTranscript = (messages: LocalMessage[]): string => {
    return messages
      .filter(msg => msg.message && msg.message.trim().length > 0)
      .map(msg => {
        const role = msg.source === 'user' ? 'candidate' : 'interviewer';
        return `${role}: ${msg.message}`;
      })
      .join('\n\n');
  };

  const handleEndClick = () => {
    const validation = validateInterview(messages, startTime);
    setModalState({
      type: 'confirm-end',
      validation
    });
  };

  const handleConfirmEnd = async () => {
    // Stop the conversation session and timer
    try {
      conversationRef.current?.stopSession?.();
    } catch (error) {
      console.error('Error stopping session:', error);
    }
    if (messages.length === 0) {
      setModalState({
        type: 'error',
        error: 'No conversation recorded during this session',
        canRetry: false
      });
      return;
    }

    const transcript = extractTranscript(messages);
    if (!transcript.trim()) {
      setModalState({
        type: 'error',
        error: 'No conversation content found to analyze',
        canRetry: false
      });
      return;
    }

    // Immediately show the analysis-in-progress UI
    setModalState({
      type: 'success',
      analysisId: 'pending',
      previewScores: undefined
    });

    try {
      console.log('🎯 Extracted transcript for Analysis-v2:', transcript.substring(0, 200) + '...');

      const response = await fetch('/api/analysis-trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript,
          assessment_id: `realtime-${Date.now()}`,
          assessment_type: 'consulting_case',
          case_title: caseData?.title || 'Realtime Case Interview',
          assessment_duration: Math.floor((Date.now() - startTime) / 1000) || 1800
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Analysis failed: ${errorText}`);
      }

      const analysisResult = await response.json();
      console.log('✅ Analysis-v2 processing completed:', analysisResult);

      if (!isMountedRef.current) {
        return;
      }

      if (analysisResult.success === false) {
        throw new Error(analysisResult.error || 'Analysis processing returned an unsuccessful status');
      }

      setModalState(prev => {
        if (prev?.type !== 'success') {
          return prev;
        }

        const summary = analysisResult.analysis || {};
        const strengths = Array.isArray(summary.strengths) ? summary.strengths : undefined;
        const weaknesses = Array.isArray(summary.weaknesses) ? summary.weaknesses : undefined;
        return {
          type: 'success',
          analysisId: analysisResult.analysisId ?? prev.analysisId,
          previewScores: {
            overall_score: summary.overall_score,
            quality_score: summary.quality_score,
            recommendation: summary.recommendation,
            strengths,
            weaknesses
          }
        };
      });
    } catch (error) {
      console.error('❌ Error triggering Analysis-v2:', error);
      if (!isMountedRef.current) {
        return;
      }
      setModalState({
        type: 'error',
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        canRetry: true
      });
    }
  };

  const handleContinueInterview = () => {
    // Close modal and return to live interview - DON'T start analysis
    setModalState(null);
    // Interview continues in background, user can keep talking
  };

  const handleProceedWithAnalysis = async () => {
    // User confirmed they want analysis despite insufficient quality
    await handleConfirmEnd();
  };

  const handleBackToCases = React.useCallback(() => {
    setModalState(null);
    onEnd(); // Return to case selection
  }, [onEnd]);

  const handleRedirectHome = React.useCallback(() => {
    setModalState(null);
    onEnd();
    router.push('/');
  }, [onEnd, router]);

  return (
    <div className="h-screen bg-gradient-to-b from-gray-50 via-white to-gray-50 overflow-hidden" data-testid="interview-view">
      <div className="fixed inset-0 z-10 flex items-center justify-center pointer-events-none">
        <motion.div className="relative" animate={{ scale: speakerState !== 'none' ? [1, 1.05, 1] : 1 }} transition={{ duration: speakerState === 'thinking' ? 1 : 2.5, repeat: speakerState !== 'none' ? Infinity : 0, ease: "easeInOut" }}>
          <motion.div className="absolute -inset-8 rounded-full" animate={{ opacity: speakerState !== 'none' ? [0.3, 0.6, 0.3] : 0 }} transition={{ duration: 2.5, repeat: speakerState !== 'none' ? Infinity : 0, ease: "easeInOut" }}>
            <div className={`w-full h-full rounded-full border-2 ${speakerState === 'user' ? 'border-blue-400' : speakerState === 'ai' ? 'border-teal-400' : speakerState === 'thinking' ? 'border-indigo-400' : 'border-gray-300'}`} />
          </motion.div>
          <div className="relative w-20 h-20 rounded-full bg-white/90 backdrop-blur-sm shadow-md border border-gray-200/50 flex items-center justify-center">
            {speakerState === 'user' ? (
              <div className="flex gap-0.5">
                <div className="w-1 h-3 bg-blue-500 rounded-full animate-pulse" />
                <div className="w-1 h-4 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '100ms' }} />
                <div className="w-1 h-3 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '200ms' }} />
              </div>
            ) : speakerState === 'ai' ? (
              <div className="flex gap-0.5">
                <div className="w-1 h-4 bg-teal-500 rounded-full animate-pulse" />
                <div className="w-1 h-5 bg-teal-500 rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
                <div className="w-1 h-4 bg-teal-500 rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
              </div>
            ) : speakerState === 'thinking' ? (
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            ) : (
              <div className="w-2 h-2 bg-gray-300 rounded-full" />
            )}
          </div>
        </motion.div>
      </div>
      
      <div className="fixed top-0 left-0 right-0 z-20 bg-white/80 backdrop-blur-sm border-b border-gray-200">
        <div className="px-6 py-4 flex justify-between items-center">
          <p className="text-gray-900 font-medium">{caseData?.title || 'Interview Session'}</p>
          {timeStatus.elapsed > 0 && (
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <span>{timeStatus.elapsed}min elapsed</span>
              <span>•</span>
              <span>{timeStatus.remaining}min remaining</span>
              <div className="w-20 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 transition-all duration-300 ease-out"
                  style={{ width: `${Math.min(100, timeStatus.progress * 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="fixed right-6 top-20 z-[100] flex items-center gap-3">
          <Button
            size="sm"
            variant="default"
            onClick={() => setIsDataSheetOpen(true)}
            className="flex items-center gap-2 shadow-sm"
          >
            <BarChart3 className="h-4 w-4" />
            Case Data
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleEndClick}
            disabled={messages.length === 0}
            className="flex items-center gap-2 shadow-sm"
          >
            End Case
          </Button>
        </div>

      <Sheet open={isDataSheetOpen} onOpenChange={setIsDataSheetOpen}>
        <SheetContent
          side="right"
          fullWidth
          className="p-0 z-[110]"
        >
          <SheetHeader className="px-6 py-4 border-b">
            <SheetTitle>{caseData?.title || 'Case Data & Analytics'}</SheetTitle>
          </SheetHeader>
          <CaseDataPanel
            caseData={caseData ? transformCaseDataForPanel(caseData) : null}
            isLoading={!caseData}
            maxHeight="calc(100vh - 120px)"
            onDataPointClick={(dataPointId, data) => {
              console.log('Data point clicked:', dataPointId, data);
              // Future: Could implement drill-down functionality or detailed view
            }}
            className="h-full"
          />
        </SheetContent>
      </Sheet>

      <InterviewEndModal
        state={modalState || { type: 'none' }}
        onContinue={handleContinueInterview}
        onProceed={handleProceedWithAnalysis}
        onRetry={handleProceedWithAnalysis}
        onViewAnalysis={() => {
          // Navigate to profile page - in a real app this would use Next.js router
          window.location.href = '/profile';
        }}
        onBackToCases={handleBackToCases}
        onGoHome={handleRedirectHome}
      />
      {/* Only show preview timer for free users */}
      {(!userSubscription?.isPro && !userSubscription?.isProMax) && (
        <SecurePreviewTimer onExpired={onPreviewExpired} forceVisible={showTimer} variant="minimal" />
      )}
    </div>
  );
}
```

--- 

## `app/assessment-realtime/components/InterviewEndModal.tsx`

```typescript
/**
 * Comprehensive Modal System for Interview End Flow
 * Handles validation warnings, processing feedback, and success confirmation
 */

'use client';

import React from 'react';
import { AlertTriangle, ArrowRight, MessageSquare, Timer, FileText } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { Progress } from '@/shared/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { InterviewValidation, formatDuration } from '../lib/interviewValidation';

type PreviewScores = {
  overall_score?: number;
  quality_score?: number;
  strengths?: string[];
  weaknesses?: string[];
  recommendation?: string;
};

export type ModalState =
  | { type: 'none' }
  | { type: 'confirm-end', validation: InterviewValidation }
  | { type: 'processing', progress?: number }
  | { type: 'success', analysisId: string, previewScores?: PreviewScores }
  | { type: 'error', error: string, canRetry: boolean };

interface InterviewEndModalProps {
  state: ModalState;
  onContinue: () => void;
  onProceed: () => void;
  onRetry?: () => void;
  onViewAnalysis: () => void;
  onBackToCases: () => void;
  onGoHome: () => void;
}

export default function InterviewEndModal({
  state,
  onContinue,
  onProceed,
  onRetry,
  onViewAnalysis,
  onBackToCases,
  onGoHome
}: InterviewEndModalProps) {
  const isOpen = state.type !== 'none';
  const contentWidthClass = state.type === 'confirm-end' ? 'max-w-xl' : 'max-w-3xl';

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className={`w-full ${contentWidthClass} max-h-[90vh] overflow-y-auto p-0`} 
      >
        <div className="px-6 py-6 sm:px-8 sm:py-7">
          {state.type === 'confirm-end' && (
            <ConfirmEndModal
              validation={state.validation}
              onContinue={onContinue}
              onProceed={onProceed}
            />
          )}

          {state.type === 'processing' && (
            <ProcessingModal progress={state.progress} />
          )}

          {state.type === 'success' && (
            <SuccessModal
              analysisId={state.analysisId}
              previewScores={state.previewScores}
              onViewAnalysis={onViewAnalysis}
              onGoHome={onGoHome}
            />
          )}

          {state.type === 'error' && (
            <ErrorModal
              error={state.error}
              canRetry={state.canRetry}
              onRetry={onRetry}
              onCancel={onBackToCases}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ConfirmEndModal({
  validation,
  onContinue,
  onProceed
}: { validation: InterviewValidation;
  onContinue: () => void;
  onProceed: () => void;
}) {
  const qualityLabel = validation.qualityScore.charAt(0).toUpperCase() + validation.qualityScore.slice(1);
  const badgeTone: Record<InterviewValidation['qualityScore'], string> = {
    excellent: 'bg-emerald-50 text-emerald-600 border border-emerald-100',
    good: 'bg-blue-50 text-blue-600 border border-blue-100',
    minimal: 'bg-amber-50 text-amber-600 border border-amber-100',
    insufficient: 'bg-rose-50 text-rose-600 border border-rose-100'
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-100 text-amber-500">
          <AlertTriangle className="h-5 w-5" />
        </span>
        <div className="space-y-1.5">
          <h2 className="text-base font-semibold text-slate-900">Wrap up or keep going?</h2>
          <p className="text-sm leading-relaxed text-slate-600">
            Longer sessions surface richer insight. Continue for stronger feedback, or end now to analyze what you have.
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white px-5 py-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-900">Quality snapshot</p>
            <p className="mt-0.5 text-xs text-slate-500">Stay a little longer to unlock richer signal.</p>
          </div>
          <Badge variant="secondary" className={`rounded-full px-3 py-1 text-[11px] font-medium tracking-wide ${badgeTone[validation.qualityScore]}`}>
            {qualityLabel} · {validation.qualityPercentage}%
          </Badge>
        </div>
        <Progress value={validation.qualityPercentage} className="mt-4 h-1 w-full" />
        <div className="mt-4 flex flex-wrap gap-2.5">
          <MetricChip
            icon={<MessageSquare className="h-3.5 w-3.5" />}
            label={`Dialogue depth`}
            value={validation.messageCount.toString()}
            target="8+ turns"
            isGood={validation.messageCount >= 8}
          />
          <MetricChip
            icon={<Timer className="h-3.5 w-3.5" />}
            label="Elapsed"
            value={formatDuration(validation.estimatedDuration)}
            target="10+ min"
            isGood={validation.estimatedDuration >= 600000}
          />
          <MetricChip
            icon={<FileText className="h-3.5 w-3.5" />}
            label="Transcript"
            value={`${Math.round(validation.transcriptLength / 100)}00+ chars`}
            target="2k+ rec"
            isGood={validation.transcriptLength >= 2000}
          />
        </div>
      </div>

      {validation.recommendations.length > 0 && (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-5 py-4">
          <p className="text-sm font-semibold text-slate-900">Quick wins before you leave</p>
          <ul className="mt-2 space-y-1.5 text-xs text-slate-600">
            {validation.recommendations.slice(0, 2).map((rec, index) => (
              <li key={index} className="flex items-start gap-1.5">
                <ArrowRight className="mt-0.5 h-3.5 w-3.5 text-slate-400" />
                {rec}
              </li>
            ))}
          </ul>
          {validation.recommendations.length > 2 && (
            <p className="mt-2 text-[11px] text-slate-400">More tips will surface once you continue.</p>
          )}
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button
          variant="outline"
          onClick={onContinue}
          className="h-11 flex-1 border-slate-200 text-slate-900 shadow-sm transition hover:-translate-y-[1px] hover:border-slate-300 hover:bg-white"
        >
          Keep practicing
        </Button>
        <Button
          onClick={onProceed}
          className="h-11 flex-1 bg-slate-900 text-white shadow-md transition hover:-translate-y-[1px] hover:bg-black"
        >
          End case & analyze
        </Button>
      </div>
    </div>
  );
}

function ProcessingModal({ progress = 0 }: { progress?: number }) {
  const steps = [
    { label: 'Extracting key insights', icon: '📝' },
    { label: 'Evaluating consulting skills', icon: '🧠' },
    { label: 'Generating detailed feedback', icon: '📊' },
    { label: 'Preparing recommendations', icon: '✨' }
  ];

  const currentStep = Math.floor((progress / 100) * steps.length);

  return (
    <>
      <DialogHeader className="space-y-2 px-0 pt-0">
        <DialogTitle className="flex items-center gap-3 text-xl">
          <div className="animate-spin">⚙️</div>
          Analyzing Your Performance
        </DialogTitle>
        <DialogDescription>
          Our AI is evaluating your case interview using McKinsey/BCG/Bain standards
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-6">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Analysis Progress</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="w-full" />
        </div>

        {/* Processing Steps */}
        <div className="space-y-3">
          {steps.map((step, index) => {
            const isCompleted = index < currentStep;
            const isActive = index === currentStep;

            return (
              <div
                key={index}
                className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${isActive ? 'bg-blue-50 dark:bg-blue-950' :
                  isCompleted ? 'bg-green-50 dark:bg-green-950' :
                  'bg-gray-50 dark:bg-gray-900'}`}
              >
                <span className="text-lg">
                  {isCompleted ? '✅' : isActive ? step.icon : '⏳'}
                </span>
                <span className={`text-sm ${isActive ? 'font-medium text-blue-700 dark:text-blue-300' :
                  isCompleted ? 'text-green-700 dark:text-green-300' :
                  'text-muted-foreground'}`}
                >
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Info Card */}
        <Card className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950">
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <span className="text-xl">🎯</span>
              <div>
                <p className="text-sm font-medium mb-1">Quality Analysis in Progress</p>
                <p className="text-xs text-muted-foreground">
                  We&apos;re analyzing your problem-solving approach, communication style,
                  and business acumen to provide detailed feedback that will help you excel
                  in consulting interviews.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function SuccessModal({
  analysisId,
  previewScores,
  onViewAnalysis,
  onGoHome
}: { analysisId: string;
  previewScores?: PreviewScores;
  onViewAnalysis: () => void;
  onGoHome: () => void;
}) {
  const analysisReady = analysisId !== 'pending';
  const [countdown, setCountdown] = React.useState(8);

  React.useEffect(() => {
    if (!analysisReady) {
      return;
    }

    setCountdown(8);
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          onGoHome();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [analysisReady, onGoHome]);

  return (
    <>
      <DialogHeader className="space-y-2 px-0 pt-0">
        <DialogTitle className="flex items-center gap-3 text-xl">
          <span className="text-2xl">🎉</span>
          Analysis in progress
        </DialogTitle>
        <DialogDescription>
          We&apos;re processing your performance now. {analysisReady ? "You'll find the full report and tailored practice questions in your Progress Tracker shortly." : "Hang tight while we package everything up for you."}
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-6">
        {/* Highlights */}
        {previewScores && (
          <div className="space-y-3">
            {previewScores.strengths?.[0] && (
              <Card className="bg-green-50 dark:bg-green-950">
                <CardContent className="pt-4">
                  <div className="flex items-start gap-3">
                    <span className="text-lg">💪</span>
                    <div>
                      <p className="text-sm font-medium text-green-800 dark:text-green-200">Top Strength</p>
                      <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                        {previewScores.strengths[0].substring(0, 150)}...
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {previewScores.weaknesses?.[0] && (
              <Card className="bg-blue-50 dark:bg-blue-950">
                <CardContent className="pt-4">
                  <div className="flex items-start gap-3">
                    <span className="text-lg">🎯</span>
                    <div>
                      <p className="text-sm font-medium text-blue-800 dark:text-blue-200">Key Focus Area</p>
                      <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                        {previewScores.weaknesses[0].substring(0, 150)}...
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* View Analysis Card */}
        <Card className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950 dark:to-purple-950">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              📊 Complete Analysis Available
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              We&apos;ll notify you as soon as your analysis is ready. Head to the Progress Tracker on your profile to review feedback and unlock new practice questions tailored to this case.
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-2">
                <span>✓</span> Skill-by-skill breakdown
              </div>
              <div className="flex items-center gap-2">
                <span>✓</span> Specific improvements
              </div>
              <div className="flex items-center gap-2">
                <span>✓</span> MBB benchmarking
              </div>
              <div className="flex items-center gap-2">
                <span>✓</span> Practice suggestions
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            onClick={onViewAnalysis}
            className="flex-1"
            disabled={!analysisReady}
          >
            Open Progress Tracker
          </Button>
          <Button
            variant="outline"
            onClick={onGoHome}
            className="flex-1"
          >
            Return home now
          </Button>
        </div>

        {/* Auto-redirect */}
        <Card className="bg-gray-50 dark:bg-gray-900">
          <CardContent className="pt-4">
            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                {analysisReady
                  ? `We'll take you back home in ${countdown} seconds`
                  : "We'll take you back home once everything is ready"}
              </p>
              <Progress
                value={analysisReady ? ((8 - countdown) / 8) * 100 : 15}
                className="w-full"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function ErrorModal({
  error,
  canRetry,
  onRetry,
  onCancel
}: { error: string;
  canRetry: boolean;
  onRetry?: () => void;
  onCancel: () => void;
}) {
  return (
    <>
      <DialogHeader className="space-y-2 px-0 pt-0">
        <DialogTitle className="flex items-center gap-3 text-xl text-red-600">
          <span className="text-2xl">❌</span>
          Analysis Error
        </DialogTitle>
        <DialogDescription>
          We encountered an issue while analyzing your interview
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4">
        <Card className="bg-red-50 dark:bg-red-950">
          <CardContent className="pt-4">
            <p className="text-sm text-red-800 dark:text-red-200">
              {error}
            </p>
          </CardContent>
        </Card>

        <div className="flex flex-col-reverse sm:flex-row gap-3">
          <Button variant="outline" onClick={onCancel} className="flex-1">
            Back to Cases
          </Button>
          {canRetry && onRetry && (
            <Button onClick={onRetry} className="flex-1">
              Try Again
            </Button>
          )}
        </div>
      </div>
    </>
  );
}

function MetricChip({
  icon,
  label,
  value,
  target,
  isGood
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  target: string;
  isGood: boolean;
}) {
  return (
    <div className="flex items-center gap-3 rounded-full border border-slate-200 bg-white/90 px-3.5 py-2 text-xs text-slate-600">
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-slate-600">
        {icon}
      </span>
      <div className="flex items-center gap-2">
        <span className="font-medium text-slate-900">{value}</span>
        <span className="text-[11px] uppercase tracking-wide text-slate-400">{label}</span>
        <span className={`text-[11px] font-medium ${isGood ? 'text-emerald-600' : 'text-amber-500'}`}>{target}</span>
      </div>
    </div>
  );
}
```

--- 

## `app/assessment-realtime/components/CaseDataPanel.tsx`

```typescript
/**
 * CaseDataPanel Component - Specialized for Business Case Data Visualization
 *
 * Optimized for displaying case study data from Supabase with:
 * - Intelligent data transformation from JSONB structure
 * - Performance optimizations with lazy loading
 * - Visual hierarchy and responsive design for 900px Sheet container
 * - Multiple visualization types (charts, tables) with insights
 */

import React, { useState, useEffect, useMemo, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  BarChart3,
  AlertTriangle,
  Loader2,
  Users,
  DollarSign,
  Target,
  Building,
  Activity,
  Lightbulb
} from "lucide-react";
import { cn } from "@/shared/lib/utils";
import EnhancedDataPanel from "@/shared/components/ui/EnhancedDataPanel";
import type {
  EnhancedChartDataType,
  EnhancedTableDataType,
  EnhancedDataPanelContentType
} from "@/shared/components/ui/EnhancedDataPanel";

// Types for Supabase case data structure
interface CaseDataPoint {
  type: 'chart' | 'table';
  title: string;
  data: {
    // Chart data structure
    data?: Array<Record<string, string | number>>;
    type?: 'line' | 'bar' | 'pie' | 'area';
    config?: {
      xKey?: string;
      yKey?: string | string[];
      colors?: string[];
      animate?: boolean;
      gradient?: boolean;
      showGrid?: boolean;
      showLegend?: boolean;
    };
    // Table data structure
    headers?: string[];
    rows?: (string | number)[][];
  };
}

interface CaseData {
  id: string;
  title: string;
  company: string;
  case_type: string;
  industry: string;
  data_points: Record<string, CaseDataPoint>;
  context_for_the_case?: {
    clientBackground?: string;
    keyConsiderations?: string[];
    industryBackground?: string;
  };
}

interface VisualizationPanel {
  id: string;
  title: string;
  type: 'chart' | 'table';
  category: 'financial' | 'market' | 'operational' | 'strategic' | 'customer';
  priority: 'high' | 'medium' | 'low';
  data: EnhancedChartDataType | EnhancedTableDataType;
  insights?: Array<{ type: 'positive' | 'negative' | 'neutral' | 'alert'; message: string; value?: string }>;
  icon?: React.ElementType;
}

interface CaseDataPanelProps {
  caseData?: CaseData | null;
  isLoading?: boolean;
  className?: string;
  maxHeight?: string;
  onDataPointClick?: (dataPointId: string, data: EnhancedChartDataType | EnhancedTableDataType) => void;
}

// Data transformation service for converting JSONB to visualization format
class CaseDataVisualizationService {
  static transformToVisualizationPanels(dataPoints: Record<string, CaseDataPoint>): VisualizationPanel[] {
    const panels: VisualizationPanel[] = [];

    Object.entries(dataPoints).forEach(([key, dataPoint]) => {
      try {
        const panel = this.transformSingleDataPoint(key, dataPoint);
        if (panel) panels.push(panel);
      } catch (error) {
        console.warn(`Failed to transform data point ${key}:`, error);
      }
    });

    // Sort by priority and category for optimal display
    return panels.sort((a, b) => {
      const priorityWeight = { high: 3, medium: 2, low: 1 };
      return priorityWeight[b.priority] - priorityWeight[a.priority];
    });
  }

  private static transformSingleDataPoint(key: string, dataPoint: CaseDataPoint): VisualizationPanel | null {
    const category = this.inferCategory(key, dataPoint.title);
    const priority = this.inferPriority(key, dataPoint.title);
    const icon = this.getIconForCategory(category);

    if (dataPoint.type === 'chart' && dataPoint.data.data) {
      // Normalize numeric fields: convert numeric-like strings to numbers, strip commas and %
      const normalizedData = dataPoint.data.data.map((row) => {
        const copy: Record<string, string | number> = { ...row } as Record<string, string | number>;
        Object.keys(copy).forEach((k) => {
          const v = copy[k];
          if (typeof v === 'string') {
            const cleaned = v.replace(/[, ]/g, '').replace(/%$/, ''); // Remove commas, non-breaking spaces, and trailing %
            const num = cleaned === '' || isNaN(Number(cleaned)) ? v : Number(cleaned);
            copy[k] = num;
          }
        });
        return copy;
      });
      const chartData: EnhancedChartDataType = {
        data: normalizedData,
        chartType: dataPoint.data.type === 'line' ? 'line' :
                  dataPoint.data.type === 'pie' ? 'pie' :
                  dataPoint.data.type === 'area' ? 'area' : 'bar',
        config: {
          xKey: dataPoint.data.config?.xKey,
          yKeys: Array.isArray(dataPoint.data.config?.yKey) ?
                 dataPoint.data.config.yKey :
                 dataPoint.data.config?.yKey ? [dataPoint.data.config.yKey] : undefined,
          colors: dataPoint.data.config?.colors || this.getColorsForCategory(category),
          showGrid: dataPoint.data.config?.showGrid !== false,
          showLegend: dataPoint.data.config?.showLegend !== false,
          animate: dataPoint.data.config?.animate !== false,
          gradient: dataPoint.data.config?.gradient === true
        },
        insights: this.generateInsights(dataPoint.data.data, dataPoint.type)
      };

      return {
        id: key,
        title: dataPoint.title,
        type: 'chart',
        category,
        priority,
        data: chartData,
        insights: chartData.insights,
        icon
      };
    }

    if (dataPoint.type === 'table' && dataPoint.data.headers && dataPoint.data.rows) {
      const tableData: EnhancedTableDataType = {
        headers: dataPoint.data.headers,
        rows: dataPoint.data.rows,
        insights: this.generateInsights(dataPoint.data.rows, dataPoint.type),
        highlightRules: this.generateHighlightRules(dataPoint.data.headers)
      };

      return {
        id: key,
        title: dataPoint.title,
        type: 'table',
        category,
        priority,
        data: tableData,
        insights: tableData.insights,
        icon
      };
    }

    return null;
  }

  private static inferCategory(key: string, title: string): VisualizationPanel['category'] {
    const text = `${key} ${title}`.toLowerCase();

    if (text.includes('revenue') || text.includes('financial') || text.includes('cost') || text.includes('profit')) {
      return 'financial';
    }
    if (text.includes('market') || text.includes('competitor') || text.includes('share')) {
      return 'market';
    }
    if (text.includes('customer') || text.includes('segment') || text.includes('churn')) {
      return 'customer';
    }
    if (text.includes('operation') || text.includes('utilization') || text.includes('efficiency')) {
      return 'operational';
    }
    return 'strategic';
  }

  private static inferPriority(key: string, title: string): VisualizationPanel['priority'] {
    const text = `${key} ${title}`.toLowerCase();

    if (text.includes('revenue') || text.includes('growth') || text.includes('market share')) {
      return 'high';
    }
    if (text.includes('customer') || text.includes('competitor') || text.includes('utilization')) {
      return 'medium';
    }
    return 'low';
  }

  private static getIconForCategory(category: VisualizationPanel['category']): React.ElementType {
    switch (category) {
      case 'financial': return DollarSign;
      case 'market': return Target;
      case 'customer': return Users;
      case 'operational': return Activity;
      case 'strategic': return Building;
      default: return BarChart3;
    }
  }

  private static getColorsForCategory(category: VisualizationPanel['category']): string[] {
    switch (category) {
      case 'financial': return ["#059669", "#10B981", "#34D399", "#6EE7B7"];
      case 'market': return ["#3B82F6", "#60A5FA", "#93C5FD", "#DBEAFE"];
      case 'customer': return ["#8B5CF6", "#A78BFA", "#C4B5FD", "#E9D5FF"];
      case 'operational': return ["#F59E0B", "#FBBF24", "#FCD34D", "#FEF3C7"];
      case 'strategic': return ["#EF4444", "#F87171", "#FCA5A5", "#FECACA"];
      default: return ["#6B7280", "#9CA3AF", "#D1D5DB", "#F3F4F6"];
    }
  }

  private static generateInsights(
    data: unknown,
    type: 'chart' | 'table'
  ): Array<{ type: 'positive' | 'negative' | 'neutral' | 'alert'; message: string; value?: string }> {
    const insights: Array<{ type: 'positive' | 'negative' | 'neutral' | 'alert'; message: string; value?: string }> = [];

    try {
      if (type === 'chart' && Array.isArray(data) && data.length > 0) {
        // Generate chart insights
        const lastDataPoint = data[data.length - 1];
        const firstDataPoint = data[0];

        // Look for numeric trends
        Object.keys(lastDataPoint as Record<string, unknown>).forEach(key => {
          const lastVal = (lastDataPoint as Record<string, unknown>)[key];
          const firstVal = (firstDataPoint as Record<string, unknown>)[key];
          if (typeof lastVal === 'number' && typeof firstVal === 'number') {
            const change = ((lastVal - firstVal) / (firstVal === 0 ? 1 : firstVal)) * 100;

            if (Math.abs(change) > 10) {
              insights.push({
                type: change > 0 ? 'positive' : 'negative',
                message: `${key.charAt(0).toUpperCase() + key.slice(1)} ${change > 0 ? 'increased' : 'decreased'} significantly`,
                value: `${Math.abs(change).toFixed(1)}%`
              });
            }
          }
        });
      }

      if (type === 'table' && Array.isArray(data) && data.length > 0) {
        insights.push({
          type: 'neutral',
          message: `Contains ${data.length} data points for analysis`,
          value: `${data.length} rows`
        });
      }
    } catch (error) {
      console.warn('Failed to generate insights:', error);
    }

    return insights;
  }

  private static generateHighlightRules(headers: string[]): Array<{ column: number; condition: (value: unknown) => boolean; className: string }> {
    const rules: Array<{ column: number; condition: (value: unknown) => boolean; className: string }> = [];

    headers.forEach((header, columnIndex) => {
      if (header.toLowerCase().includes('percentage') || header.toLowerCase().includes('%')) {
        rules.push({
          column: columnIndex,
          condition: (value: unknown) => {
            const numValue: number = typeof value === 'string' ? parseFloat(value.replace('%', '')) : (typeof value === 'number' ? value : NaN);
            return Number.isFinite(numValue) && numValue > 50;
          },
          className: 'bg-green-100 text-green-800 font-semibold'
        });
      }
    });

    return rules;
  }
}

// Lazy loading wrapper for performance
const LazyVisualizationPanel: React.FC<{ panel: VisualizationPanel; isVisible: boolean; onDataPointClick?: (dataPointId: string, data: EnhancedChartDataType | EnhancedTableDataType) => void; }> = ({ panel, isVisible, onDataPointClick }) => {
  if (!isVisible) {
    return (
      <div className="h-96 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border border-gray-200 animate-pulse">
        <div className="p-4">
          <div className="h-6 bg-gray-300 rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  const handleDataPointClick = () => {
    onDataPointClick?.(panel.id, panel.data);
  };

  return (
    <Suspense fallback={
      <div className="h-96 flex items-center justify-center bg-gray-50 rounded-xl border border-gray-200">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    }>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        onClick={handleDataPointClick}
        className="cursor-pointer"
      >
        <EnhancedDataPanel
          title={panel.title}
          icon={panel.icon}
          content={panel.data}
          contentType={panel.type as EnhancedDataPanelContentType}
          variant={panel.priority === 'high' ? 'primary' : 'default'}
          size="md"
          showActions={true}
          priority={panel.priority}
        />
      </motion.div>
    </Suspense>
  );
};

const CaseDataPanel: React.FC<CaseDataPanelProps> = ({ caseData, isLoading = false, className = "", maxHeight = "calc(100vh - 200px)", onDataPointClick }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [visiblePanels, setVisiblePanels] = useState<Set<string>>(new Set());

  // Transform case data to visualization panels
  const visualizationPanels = useMemo(() => {
    if (!caseData?.data_points) return [];
    return CaseDataVisualizationService.transformToVisualizationPanels(caseData.data_points);
  }, [caseData?.data_points]);

  // Filter panels based on search and category
  const filteredPanels = useMemo(() => {
    let filtered = visualizationPanels;

    if (searchTerm) {
      filtered = filtered.filter(panel =>
        panel.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        panel.category.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedCategory !== "all") {
      filtered = filtered.filter(panel => panel.category === selectedCategory);
    }

    return filtered;
  }, [visualizationPanels, searchTerm, selectedCategory]);

  // Categories for filtering (reserved for future UI use)

  // Intersection observer for lazy loading
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisiblePanels(prev => new Set([...prev, entry.target.id]));
          }
        });
      },
      { threshold: 0.1, rootMargin: '50px' }
    );

    const observeTargets = document.querySelectorAll('[data-panel-id]');
    observeTargets.forEach(target => observer.observe(target));

    return () => observer.disconnect();
  }, [filteredPanels]);

  const renderEmptyState = () => (
    <div className="flex flex-col items-center justify-center p-12 text-center">
      <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-full mb-4">
        <BarChart3 className="w-12 h-12 text-blue-600" />
      </div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">No Case Data Available</h3>
      <p className="text-gray-600 max-w-md">
        Select a case from the case selection modal to view detailed data visualizations and insights.
      </p>
    </div>
  );

  const renderLoadingState = () => (
    <div className="space-y-4 p-4">
      {[...Array(3)].map((_, index) => (
        <div
          key={index}
          className="h-80 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border border-gray-200 animate-pulse"
        >
          <div className="p-4">
            <div className="h-6 bg-gray-300 rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
            <div className="h-48 bg-gray-200 rounded"></div>
          </div>
        </div>
      ))}
    </div>
  );

  if (isLoading) {
    return (
      <div className={cn("h-full", className)} style={{ maxHeight }}>
        {renderLoadingState()}
      </div>
    );
  }

  if (!caseData || visualizationPanels.length === 0) {
    return (
      <div className={cn("h-full flex items-center justify-center", className)} style={{ maxHeight }}>
        {renderEmptyState()}
      </div>
    );
  }

  return (
    <div className={cn("h-full flex flex-col", className)} style={{ maxHeight }}>
      {/* Header with case info */}
      <div className="flex-shrink-0 p-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-lg">
            <Building className="w-6 h-6 text-blue-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-gray-900 truncate">{caseData.title}</h2>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary" className="text-xs">
                {caseData.company}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {caseData.case_type}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {caseData.industry}
              </Badge>
            </div>
          </div>
        </div>

        
      </div>

      {/* Content area with visualizations */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        <AnimatePresence mode="popLayout">
          {filteredPanels.map((panel) => (
            <div
              key={panel.id}
              data-panel-id={panel.id}
              id={panel.id}
            >
              <LazyVisualizationPanel
                panel={panel}
                isVisible={visiblePanels.has(panel.id)}
                onDataPointClick={onDataPointClick}
              />
            </div>
          ))}
        </AnimatePresence>

        {filteredPanels.length === 0 && (searchTerm || selectedCategory !== "all") && (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <AlertTriangle className="w-12 h-12 text-amber-500 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Results Found</h3>
            <p className="text-gray-600">
              Try adjusting your search terms or category filters.
            </p>
            <Button
              variant="outline"
              onClick={() => {
                setSearchTerm("");
                setSelectedCategory("all");
              }}
              className="mt-4"
            >
              Clear Filters
            </Button>
          </div>
        )}

        {/* Case context insights */}
        {caseData.context_for_the_case && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-8 p-6 bg-gradient-to-br from-amber-50 to-yellow-50 rounded-xl border border-amber-200"
          >
            <div className="flex items-center gap-2 mb-4">
              <Lightbulb className="w-5 h-5 text-amber-600" />
              <h3 className="text-lg font-semibold text-amber-900">Case Context & Considerations</h3>
            </div>

            {caseData.context_for_the_case.clientBackground && (
              <div className="mb-4">
                <h4 className="font-medium text-amber-800 mb-2">Client Background</h4>
                <p className="text-amber-700 text-sm leading-relaxed">
                  {caseData.context_for_the_case.clientBackground}
                </p>
              </div>
            )}

            {caseData.context_for_the_case.keyConsiderations && (
              <div className="mb-4">
                <h4 className="font-medium text-amber-800 mb-2">Key Considerations</h4>
                <ul className="list-disc list-inside space-y-1 text-amber-700 text-sm">
                  {caseData.context_for_the_case.keyConsiderations.map((consideration, index) => (
                    <li key={index}>{consideration}</li>
                  ))}
                </ul>
              </div>
            )}

            {caseData.context_for_the_case.industryBackground && (
              <div>
                <h4 className="font-medium text-amber-800 mb-2">Industry Background</h4>
                <p className="text-amber-700 text-sm leading-relaxed">
                  {caseData.context_for_the_case.industryBackground}
                </p>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default CaseDataPanel;
export type { CaseData, VisualizationPanel, CaseDataPanelProps };
```

--- 

## `app/assessment-realtime/components/AssessmentRealtimePreparationModal.tsx`

```typescript
"use client";

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogTitle } from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import { ArrowRight } from "lucide-react";

interface AssessmentRealtimePreparationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProceed: () => void;
}

interface SessionCredits {
  available: number;
  used: number;
  total: number;
  label: string;
  resetPeriod: string;
}

interface CreditsResponse {
  sessionCredits: SessionCredits;
  message: string;
  userTier: string;
  allowed: boolean;
  resetAt?: string | number;
}

export default function AssessmentRealtimePreparationModal({
  isOpen,
  onClose,
  onProceed
}: AssessmentRealtimePreparationModalProps) {
  const router = useRouter();

  // Session credits state
  const [credits, setCredits] = useState<CreditsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isAnonymous = credits?.userTier === 'anonymous';

  const handleProceed = () => {
    if (isAnonymous) {
      try { sessionStorage.removeItem('assessment-realtime-preparation-seen'); } catch {}
      router.push(`/auth/signin?redirect=${encodeURIComponent('/assessment-realtime')}`);
      return;
    }

    sessionStorage.setItem('assessment-realtime-preparation-seen', 'true');
    onProceed();
  };

  const handleGoHome = () => {
    router.push('/');
  };

  // Fetch session credits when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchSessionCredits();
    }
  }, [isOpen]);

  const fetchSessionCredits = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/assessment/credits', {
        cache: 'no-store',
        credentials: 'same-origin'
      });

      if (response.status === 401) {
        // Treat as anonymous: show sign-in guidance rather than a generic error
        setCredits({
          sessionCredits: {
            available: 0,
            used: 0,
            total: 0,
            label: "session credits",
            resetPeriod: "daily"
          },
          message: "Please sign in to access assessment sessions",
          userTier: "anonymous",
          allowed: false
        });
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to fetch session credits');
      }

      const data: CreditsResponse = await response.json();
      setCredits(data);
    } catch (err) {
      console.error('Error fetching session credits:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      // Fallback to anonymous user defaults
      setCredits({
        sessionCredits: {
          available: 0,
          used: 0,
          total: 0,
          label: "session credits",
          resetPeriod: "daily"
        },
        message: "Please sign in to access assessment sessions",
        userTier: "anonymous",
        allowed: false
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Development utility
  if (typeof window !== 'undefined') {
    (window as Window & { resetRealtimeAssessmentPreparation?: () => void }).resetRealtimeAssessmentPreparation = () => {
      sessionStorage.removeItem('assessment-realtime-preparation-seen');
      window.location.reload();
    };
  }

  const availableCredits = credits?.sessionCredits.available || 0;
  const isStartDisabled = isLoading || (!isAnonymous && (!credits?.allowed || availableCredits <= 0));
  const startButtonLabel = isLoading
    ? 'Loading...'
    : isAnonymous
      ? 'Sign in to begin'
      : (!credits?.allowed || availableCredits <= 0)
        ? 'No credits available'
        : 'Start case interview';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
  <DialogContent className="w-[90vw] max-w-lg p-0 bg-white border-0 shadow-2xl rounded-2xl overflow-hidden">
        <DialogTitle className="sr-only">Speech Interview Preparation</DialogTitle>

        <div className="p-8 space-y-6">
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight">Ready for your case interview?</h2>
            <p className="text-gray-600 leading-relaxed">
              This is a real-time voice consulting case interview. You&apos;ll have a natural conversation
              with your interviewer and get detailed performance analysis when you finish.
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className={`w-1.5 h-1.5 rounded-full mt-2.5 flex-shrink-0 ${credits?.allowed ? 'bg-green-500' : 'bg-red-500'}`} />
              <p className="text-sm text-gray-600">
                Clicking &quot;Start case interview&quot; immediately deducts 1 session credit (non-refundable once started). ~30 minutes of focused speaking time.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-gray-400 mt-2.5 flex-shrink-0" />
              <p className="text-sm text-gray-600">Requires microphone access and quiet environment</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-gray-400 mt-2.5 flex-shrink-0" />
              <p className="text-sm text-gray-600">You can interrupt and speak naturally - this is a real conversation!</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-gray-400 mt-2.5 flex-shrink-0" />
              <p className="text-sm text-gray-600">Click &quot;End Case&quot; when finished to get your performance analysis</p>
            </div>
          </div>

          {/* Status message */}
          <div className="border-t border-gray-100 pt-4">
            {error ? (
              <div className="text-center space-y-2">
                <p className="text-sm text-red-600 font-medium">
                  We couldn&apos;t load your session credits. Please refresh and try again.
                </p>
                <p className="text-xs text-gray-500">
                  If the issue persists and you&apos;re signed in, your credits will reset on the next cycle.
                </p>
              </div>
            ) : credits && credits.sessionCredits && !credits.allowed ? (
              <div className="text-center space-y-2">
                <p className="text-sm text-red-600 font-medium">
                  {credits.message}
                </p>
                <p className="text-xs text-gray-500">
                  {credits.userTier === 'anonymous' && 'Please sign in to access assessment sessions'}
                  {credits.userTier !== 'anonymous' && credits.userTier === 'free' && (
                    <>You&apos;ve used your free preview today. Upgrade to PRO for more sessions, or try again tomorrow.</>
                  )}
                  {credits.userTier !== 'anonymous' && credits.userTier !== 'free' && (
                    <>You&apos;ve reached today’s limit. {credits.resetAt ? `Resets at ${new Date(credits.resetAt).toLocaleString()}.` : 'Please try again tomorrow.'}</>
                  )}
                </p>
              </div>
            ) : credits && credits.sessionCredits && credits.sessionCredits.available > 0 ? (
              <p className="text-xs text-gray-500 text-center">
                Take your time, think out loud, and good luck with your interview!
              </p>
            ) : (
              <p className="text-xs text-gray-500 text-center">
                Loading session information...
              </p>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              variant="ghost"
              onClick={handleGoHome}
              className="flex-1 h-11 text-gray-600 hover:bg-gray-50"
            >
              Back to home
            </Button>

            <Button
              onClick={handleProceed}
              disabled={isStartDisabled}
              className="flex-1 h-11 bg-black text-white hover:bg-gray-800 flex items-center justify-center gap-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {startButtonLabel}
              {!isLoading && !isStartDisabled && (
                <ArrowRight className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

--- 

## `app/assessment-realtime/components/CaseDataDisplay.tsx`

```typescript
/**
 * CaseDataDisplay Component Template - Assessment Realtime Integration
 *
 * A comprehensive component for rendering case data from Supabase in the assessment-realtime page.
 * Handles mixed visualization types (charts and tables) with sophisticated presentation.
 *
 * Features:
 * - TypeScript interfaces for type safety
 * - Enhanced data panel integration
 * - Recharts visualization support
 * - Error handling and loading states
 * - Responsive design with accessibility
 * - Performance optimizations for multiple visualizations
 */

'use client';

import React, { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle,
  BarChart3,
  PieChart,
  TrendingUp,
  Table as TableIcon,
  Loader2,
  RefreshCw,
  Eye,
  Download,
  Maximize2,
  Search,
  DollarSign,
  Users,
  Target,
  Building,
  Activity,
  Lightbulb
} from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import EnhancedDataPanel,
  {
    EnhancedChartDataType,
    EnhancedTableDataType,
    EnhancedDataPanelContentType
  } from '@/shared/components/ui/EnhancedDataPanel';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Badge } from '@/shared/components/ui/badge';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';

// ===========================
// TypeScript Interfaces
// ===========================

/**
 * Base data point structure from Supabase cases.data_points JSONB field
 */
interface BaseDataPoint {
  type: 'chart' | 'table';
  title: string;
  description?: string;
  priority?: 'high' | 'medium' | 'low';
  category?: string;
  lastUpdated?: string;
}

/**
 * Chart-specific data point structure
 */
interface ChartDataPoint extends BaseDataPoint {
  type: 'chart';
  data: {
    type: 'line' | 'bar' | 'pie' | 'area' | 'combo';
    data: Record<string, any>[];
    config: {
      xKey?: string;
      yKey?: string | string[]; // Support both single and multiple Y axes
      colors?: string[];
      showGrid?: boolean;
      showLegend?: boolean;
      animate?: boolean;
      gradient?: boolean;
      formatter?: Record<string, 'currency' | 'percentage' | 'number'>;
    };
    insights?: Array<{ type: 'positive' | 'negative' | 'neutral' | 'alert'; message: string; value?: string; trend?: 'up' | 'down' | 'stable' }>;
  };
}

/**
 * Table-specific data point structure
 */
interface TableDataPoint extends BaseDataPoint {
  type: 'table';
  data: {
    headers: string[];
    rows: (string | number)[][];
    highlightRules?: Array<{ column: number; condition: (value: any) => boolean; className: string }>;
    insights?: Array<{ type: 'positive' | 'negative' | 'neutral' | 'alert'; message: string; value?: string }>;
  };
}

/**
 * Union type for all supported data point types
 */
type CaseDataPoint = ChartDataPoint | TableDataPoint;

/**
 * Complete case data structure from Supabase
 */
interface CaseData {
  id: string;
  title: string;
  company?: string;
  industry?: string;
  difficulty?: string;
  dataPoints?: Record<string, CaseDataPoint>;
}

/**
 * Component props interface
 */
interface CaseDataDisplayProps {
  caseData: CaseData;
  isLoading?: boolean;
  error?: string | null;
  onRefresh?: () => void;
  onDataPointClick?: (dataPointKey: string, dataPoint: CaseDataPoint) => void;
  className?: string;
  maxHeight?: string;
  showSearch?: boolean;
  showMetrics?: boolean;
}

// ===========================
// Data Transformation Utilities
// ===========================

/**
 * Transform chart data point to EnhancedDataPanel format
 */
const transformChartData = (dataPoint: ChartDataPoint): EnhancedChartDataType => {
  const { data } = dataPoint;

  // Normalize yKeys to array format
  const yKeys = Array.isArray(data.config.yKey) ?
                 data.config.yKey :
                 data.config.yKey ? [data.config.yKey] : ['value'];

  return {
    data: data.data,
    chartType: data.type,
    config: {
      xKey: data.config.xKey || 'name',
      yKeys,
      colors: data.config.colors,
      showGrid: data.config.showGrid ?? true,
      showLegend: data.config.showLegend ?? true,
      animate: data.config.animate ?? true,
      gradient: data.config.gradient ?? false,
    },
    insights: data.insights || [],
  };
};

/**
 * Transform table data point to EnhancedDataPanel format
 */
const transformTableData = (dataPoint: TableDataPoint): EnhancedTableDataType => {
  return {
    headers: dataPoint.data.headers,
    rows: dataPoint.data.rows,
    highlightRules: dataPoint.data.highlightRules || [],
    insights: dataPoint.data.insights || [],
  };
};

/**
 * Get appropriate icon for data point type
 */
const getDataPointIcon = (type: string, chartType?: string) => {
  if (type === 'table') return TableIcon;
  if (type === 'chart') {
    switch (chartType) {
      case 'pie':
        return PieChart;
      case 'line':
      case 'area':
        return TrendingUp;
      default:
        return BarChart3;
    }
  }
  return BarChart3;
};

/**
 * Get variant based on priority and data type
 */
const getVariantFromPriority = (priority?: string): 'default' | 'primary' | 'success' | 'warning' | 'danger' => {
  switch (priority) {
    case 'high':
      return 'danger';
    case 'medium':
      return 'warning';
    case 'low':
      return 'success';
    default:
      return 'default';
  }
};

// ===========================
// Main Component
// ===========================

const CaseDataDisplay: React.FC<CaseDataDisplayProps> = ({
  caseData,
  isLoading = false,
  error = null,
  onRefresh,
  onDataPointClick,
  className,
  maxHeight = '85vh',
  showSearch = true,
  showMetrics = true,
}) => {
  // ===========================
  // State Management
  // ===========================

  const [searchTerm, setSearchTerm] = useState('');
  const [expandedPanels, setExpandedPanels] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<'priority' | 'type' | 'name'>('priority');
  const [filterType, setFilterType] = useState<'all' | 'chart' | 'table'>('all');

  // ===========================
  // Computed Values
  // ===========================

  // Filter and sort data points based on search and filters
  const filteredDataPoints = useMemo(() => {
    if (!caseData.dataPoints) return [];

    const entries = Object.entries(caseData.dataPoints);

    // Apply search filter
    const searchFiltered = entries.filter(([key, dataPoint]) => {
      if (!searchTerm) return true;
      const searchLower = searchTerm.toLowerCase();
      return (
        key.toLowerCase().includes(searchLower) ||
        dataPoint.title.toLowerCase().includes(searchLower) ||
        dataPoint.description?.toLowerCase().includes(searchLower) ||
        dataPoint.category?.toLowerCase().includes(searchLower)
      );
    });

    // Apply type filter
    const typeFiltered = searchFiltered.filter(([, dataPoint]) => {
      if (filterType === 'all') return true;
      return dataPoint.type === filterType;
    });

    // Apply sorting
    return typeFiltered.sort(([keyA, dataPointA], [keyB, dataPointB]) => {
      switch (sortBy) {
        case 'priority':
          const priorityOrder = { high: 3, medium: 2, low: 1 };
          const priorityA = priorityOrder[dataPointA.priority || 'medium'];
          const priorityB = priorityOrder[dataPointB.priority || 'medium'];
          return priorityB - priorityA;

        case 'type':
          return dataPointA.type.localeCompare(dataPointB.type);

        case 'name':
        default:
          return dataPointA.title.localeCompare(dataPointB.title);
      }
    });
  }, [caseData.dataPoints, searchTerm, filterType, sortBy]);

  // Calculate metrics for display
  const metrics = useMemo(() => {
    if (!caseData.dataPoints) return { total: 0, charts: 0, tables: 0 };

    const dataPoints = Object.values(caseData.dataPoints);
    return {
      total: dataPoints.length,
      charts: dataPoints.filter(dp => dp.type === 'chart').length,
      tables: dataPoints.filter(dp => dp.type === 'table').length,
    };
  }, [caseData.dataPoints]);

  // ===========================
  // Event Handlers
  // ===========================

  const handlePanelToggle = useCallback((panelKey: string, isCollapsed: boolean) => {
    setExpandedPanels(prev => {
      const newSet = new Set(prev);
      if (isCollapsed) {
        newSet.delete(panelKey);
      } else {
        newSet.add(panelKey);
      }
      return newSet;
    });
  }, []);

  const handleDataPointClick = useCallback((key: string, dataPoint: CaseDataPoint) => {
    onDataPointClick?.(key, dataPoint);
  }, [onDataPointClick]);

  // ===========================
  // Error and Loading States
  // ===========================

  if (error) {
    return (
      <div className={cn("p-6", className)}>
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {error}
            {onRefresh && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRefresh}
                className="ml-2"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Retry
              </Button>
            )}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={cn("p-6 space-y-6", className)}>
        <div className="space-y-3">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-96" />
        </div>

        <div className="grid gap-6">
          {Array.from({ length: 3 }).map((_, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="border rounded-xl p-6 bg-white/50"
            >
              <div className="flex items-center gap-3 mb-4">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-5 w-48" />
                  <Skeleton className="h-3 w-32" />
                </div>
              </div>
              <Skeleton className="h-48 w-full rounded-lg" />
            </motion.div>
          ))}
        </div>

        <div className="text-center">
          <Loader2 className="h-6 w-6 animate-spin mx-auto text-blue-500" />
          <p className="text-sm text-gray-500 mt-2">Loading case data...</p>
        </div>
      </div>
    );
  }

  // ===========================
  // Main Render
  // ===========================

  return (
    <div
      className={cn("flex flex-col", className)}
      style={{ maxHeight }}
    >
      {/* Header Section */}
      <div className="flex-shrink-0 p-6 pb-4 border-b bg-white/80 backdrop-blur-sm">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {caseData.title}
            </h2>
            {caseData.company && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Badge variant="outline">{caseData.company}</Badge>
                {caseData.industry && <Badge variant="outline">{caseData.industry}</Badge>}
                {caseData.difficulty && (
                  <Badge
                    variant={
                      caseData.difficulty === 'Hard' ? 'destructive' :
                      caseData.difficulty === 'Medium' ? 'secondary' : 'default'
                    }
                  >
                    {caseData.difficulty}
                  </Badge>
                )}
              </div>
            )}
          </div>

          {onRefresh && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              className="flex-shrink-0"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Refresh
            </Button>
          )}
        </div>

        {/* Metrics Row */}
        {showMetrics && (
          <div className="flex items-center gap-4 mb-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full" />
              <span className="text-sm font-medium text-gray-700">
                {metrics.total} Total
              </span>
            </div>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-3 w-3 text-green-500" />
              <span className="text-sm text-gray-600">
                {metrics.charts} Charts
              </span>
            </div>
            <div className="flex items-center gap-2">
              <TableIcon className="h-3 w-3 text-orange-500" />
              <span className="text-sm text-gray-600">
                {metrics.tables} Tables
              </span>
            </div>
          </div>
        )}

        {/* Search and Filters */}
        {showSearch && (
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search data points..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="px-3 py-2 border border-gray-200 rounded-md text-sm bg-white"
            >
              <option value="all">All Types</option>
              <option value="chart">Charts</option>
              <option value="table">Tables</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-2 border border-gray-200 rounded-md text-sm bg-white"
            >
              <option value="priority">Priority</option>
              <option value="type">Type</option>
              <option value="name">Name</option>
            </select>
          </div>
        )}
      </div>

      {/* Data Points Grid */}
      <div className="flex-1 overflow-y-auto p-6 pt-4">
        {filteredDataPoints.length === 0 ? (
          <div className="text-center py-12">
            <BarChart3 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No data points found
            </h3>
            <p className="text-gray-500">
              {searchTerm
                ? `No data points match "${searchTerm}"
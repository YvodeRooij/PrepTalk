import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { creditManager } from '@/lib/credits/manager';

// 🧪 A/B TEST SETUP FOR PROMPT LATENCY INVESTIGATION
//
// CURRENT STATUS: Testing LONG prompt (line ~118) - Short test completed successfully
//
// TO SWITCH BACK TO LONG PROMPT:
// 1. Comment out lines 118-122 (short prompt + logging)
// 2. Uncomment lines 105-116 (long prompt)
// 3. Check console logs for prompt length comparison
//
// HYPOTHESIS: Long detailed prompts (~2000+ chars) may cause ElevenLabs latency
// TEST: Short prompt (~200 chars) vs Long prompt (~2000 chars)

export async function POST(request: NextRequest) {
  try {
    // Authentication (following your curriculum generation pattern)
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    let userId: string;

    // Development: Use your real user ID for testing
    if (process.env.NODE_ENV === 'development') {
      userId = '6a3ba98b-8b91-4ba0-b517-8afe6a5787ee';
      console.log('🧪 Using your real user ID for testing:', userId);
    } else if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    } else {
      userId = user.id;
    }

    const { curriculumId, roundNumber } = await request.json();

    // Skip credit checks in development
    let balance = null;
    if (process.env.NODE_ENV !== 'development') {
      const hasCredits = await creditManager.canUseCredits(userId, 1);
      balance = await creditManager.getBalance(userId);

      if (!hasCredits) {
        return NextResponse.json({ error: 'Insufficient credits' }, { status: 402 });
      }
    }

    // Fetch curriculum round data with all the rich context
    const { data: roundData, error: roundError } = await supabase
      .from('curriculum_rounds')
      .select(`
        *,
        curricula!inner(
          id,
          role_intelligence,
          unified_context,
          user_personalization,
          cv_integration,
          discovery_metadata,
          generation_metadata,
          cv_analysis_id
        )
      `)
      .eq('curriculum_id', curriculumId)
      .eq('round_number', roundNumber)
      .single();

    if (roundError || !roundData) {
      return NextResponse.json(
        { error: 'Curriculum round not found' },
        { status: 404 }
      );
    }

    // Fetch linked CV analysis data
    let cvAnalysisData = null;
    if (roundData.curricula.cv_analysis_id) {
      console.log('🔍 Fetching CV analysis for ID:', roundData.curricula.cv_analysis_id);

      // Use service role for CV data access to bypass RLS
      const serviceSupabase = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      const { data: cvData, error: cvError } = await serviceSupabase
        .from('cv_analyses')
        .select('analysis')
        .eq('id', roundData.curricula.cv_analysis_id)
        .single();

      console.log('🔍 CV fetch result:', {
        cvError,
        hasData: !!cvData,
        cvDataKeys: cvData ? Object.keys(cvData) : [],
        analysisKeys: cvData?.analysis ? Object.keys(cvData.analysis) : []
      });

      if (!cvError && cvData) {
        cvAnalysisData = cvData.analysis;
        console.log('🔍 CV analysis data set:', {
          hasPersonalInfo: !!cvAnalysisData?.personalInfo,
          hasFullName: !!cvAnalysisData?.personalInfo?.fullName,
          fullName: cvAnalysisData?.personalInfo?.fullName,
          hasSummary: !!cvAnalysisData?.summary,
          hasExperience: !!cvAnalysisData?.experience
        });
      }
    } else {
      console.log('🔍 No cv_analysis_id found in curriculum');
    }

    // 🧪 A/B TEST: Long vs Short Prompt for Latency Analysis
    // Build system prompt using curriculum data

    // LONG PROMPT (currently active - switched back for latency testing)
    const systemPrompt = buildInterviewPrompt(
      roundData.interviewer_persona,
      roundData.topics_to_cover,
      roundData.candidate_prep_guide,
      roundData.curricula.role_intelligence,
      roundData.curricula.unified_context,
      roundData.curricula.user_personalization,
      roundData.curricula.cv_integration,
      roundData.curricula.discovery_metadata,
      cvAnalysisData // Pass the actual CV analysis data
    );

    // SHORT PROMPT (now commented out after successful latency test)
    // const systemPrompt = buildShortInterviewPrompt(
    //   roundData.interviewer_persona,
    //   cvAnalysisData
    // );

    console.log('🧪 [A/B TEST] Using LONG prompt version for latency comparison');
    console.log('🧪 [A/B TEST] Prompt length:', systemPrompt.length, 'characters');

    // 🔍 CURRICULUM INTELLIGENCE ANALYSIS - What data do we actually have?
    console.log('🔍 [CURRICULUM DATA] Round-specific data available:');
    console.log('🔍 [ROUND] Round type:', roundData.round_type);
    console.log('🔍 [ROUND] Duration:', roundData.duration_minutes, 'minutes');
    console.log('🔍 [PERSONA] Interviewer persona:', JSON.stringify(roundData.interviewer_persona, null, 2));
    console.log('🔍 [TOPICS] Topics to cover:', JSON.stringify(roundData.topics_to_cover, null, 2));
    console.log('🔍 [PREP] Candidate prep guide:', JSON.stringify(roundData.candidate_prep_guide, null, 2));

    console.log('🔍 [CURRICULUM] Curriculum-level intelligence:');
    console.log('🔍 [UNIFIED] Unified context keys:', roundData.curricula.unified_context ? Object.keys(roundData.curricula.unified_context) : 'null');
    console.log('🔍 [UNIFIED] Unified context:', JSON.stringify(roundData.curricula.unified_context, null, 2));
    console.log('🔍 [PERSONALIZATION] User personalization keys:', roundData.curricula.user_personalization ? Object.keys(roundData.curricula.user_personalization) : 'null');
    console.log('🔍 [PERSONALIZATION] User personalization:', JSON.stringify(roundData.curricula.user_personalization, null, 2));
    console.log('🔍 [ROLE_INTEL] Role intelligence keys:', roundData.curricula.role_intelligence ? Object.keys(roundData.curricula.role_intelligence) : 'null');
    console.log('🔍 [ROLE_INTEL] Role intelligence:', JSON.stringify(roundData.curricula.role_intelligence, null, 2));

    const firstMessage = generateOpeningMessage(roundData.interviewer_persona);

    // Return the interview configuration
    return NextResponse.json({
      systemPrompt,
      firstMessage,
      roundMetadata: {
        persona: roundData.interviewer_persona,
        questions: roundData.topics_to_cover,
        prepGuide: roundData.candidate_prep_guide,
        roundType: roundData.round_type,
        duration: roundData.duration_minutes
      },
      remainingCredits: process.env.NODE_ENV === 'development' ? 999 : (balance?.total_available || 0)
    });

  } catch (error) {
    console.error('Voice prompt generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate interview prompt' },
      { status: 500 }
    );
  }
}

// 🧪 SHORT INTERVIEW PROMPT FOR A/B TESTING (Latency Optimized)
// Minimal prompt to test if long prompts cause latency issues
function buildShortInterviewPrompt(
  persona: any,
  cvAnalysis?: any
): string {
  const candidateName = cvAnalysis?.personalInfo?.fullName || 'candidate';
  const role = persona?.role || 'interviewer';
  const experience = cvAnalysis?.summary?.yearsOfExperience || 'some';

  return `You are a ${role} conducting a professional interview. The candidate is ${candidateName} with ${experience} years of experience. Be conversational, ask relevant questions about their background, and help them showcase their strengths. Start with a warm greeting.`;
}

// 🎭 BUILD INTERVIEW PROMPT FROM CURRICULUM DATA (ORIGINAL - Currently commented out for A/B testing)
// Enhanced version with layered context for natural conversation flow
function buildInterviewPrompt(
  persona: any,
  questions: any[],
  prepGuide: any,
  roleIntelligence: any,
  unifiedContext: any,
  userPersonalization: any,
  cvIntegration?: any,
  discoveryMetadata?: any,
  cvAnalysis?: any
): string {


  const systemPrompt = `PERSONALITY: You are an experienced ${persona?.role || 'interviewer'} with ${persona?.tenure_years || 3} years in this role. Your personality traits: ${persona?.personality_traits?.join(', ') || persona?.personality || 'Professional, thoughtful, and encouraging'}. Your communication style: ${persona?.communication_style || 'conversational and supportive'}.

ENVIRONMENT: Professional ${persona?.round_type?.replace('_', ' ') || 'behavioral'} interview setting for a ${persona?.goal || 'role assessment'}.

TONE: ${persona?.communication_style || 'Conversational and supportive'}, naturally informed about the candidate's background, encouraging and professional.

GOAL: Guide this conversation to help the candidate showcase their best qualities for this specific role. Use your knowledge of their background to ask relevant, targeted questions that demonstrate your awareness without explicitly mentioning their CV or resume.

KNOWLEDGE BASE: You are naturally aware that this candidate has:
${cvAnalysis?.personalInfo?.fullName ? `- Name: ${cvAnalysis.personalInfo.fullName}` : ''}
${cvAnalysis?.summary?.summary ? `- Background: ${cvAnalysis.summary.summary}` : ''}
${cvAnalysis?.summary?.currentRole ? `- Current role: ${cvAnalysis.summary.currentRole}` : ''}
${cvAnalysis?.summary?.yearsOfExperience ? `- Experience: ${cvAnalysis.summary.yearsOfExperience} years` : ''}
${cvAnalysis?.skills?.technical?.length ? `- Technical skills: ${cvAnalysis.skills.technical.slice(0, 8).join(', ')}` : ''}
${cvAnalysis?.skills?.soft?.length ? `- Soft skills: ${cvAnalysis.skills.soft.join(', ')}` : ''}
${cvAnalysis?.experience?.length ? `- Recent companies: ${cvAnalysis.experience.slice(0, 3).map(exp => `${exp.position} at ${exp.company}`).join(', ')}` : ''}
- Coaching approach needed: ${unifiedContext?.personalizedApproach || 'Professional and supportive guidance'}
- Ways to build their confidence: ${unifiedContext?.confidenceBuilders?.join(', ') || 'Encourage them to share achievements confidently'}
- How to help them shine: ${unifiedContext?.strengthAmplifiers?.join(', ') || 'Help them leverage their unique background'}

COMPANY INTELLIGENCE: When they mention the company or role, you can naturally reference:
${roleIntelligence?.strategic_advantages?.length ? `- Strategic advantages: ${roleIntelligence.strategic_advantages.slice(0, 3).join(', ')}` : ''}
${roleIntelligence?.recent_role_developments?.length ? `- Recent developments: ${roleIntelligence.recent_role_developments.slice(0, 2).join(', ')}` : ''}
- Competitive positioning: ${roleIntelligence?.competitive_positioning || 'Strong market position'}
- Integration strategy: ${unifiedContext?.ciIntegrationStrategy || 'Weave company research naturally into conversation about motivation and fit'}

GUARDRAILS:
• DO naturally reference their CV/resume when relevant - this is normal in real interviews
• You can say things like "I see from your CV that you worked at [company]" or "Your background in [field] is interesting"
• DO ask specific questions about experiences listed on their resume
• DO acknowledge their background explicitly when it's relevant to the conversation
• DO guide them toward topics where they can showcase their strengths
• DO use your knowledge to make the conversation relevant and personalized

CONVERSATION BEHAVIOR:
• Reference their CV directly when relevant: "I see you worked at [company] - tell me about that experience"
• Ask specific questions about their listed experiences: "On your resume you mentioned [project] - walk me through that"
• When they discuss skills → Ask for examples from their actual work history
• When they seem uncertain → Reference specific achievements from their CV to build confidence
• When they mention the company → Naturally weave in relevant company intelligence
• Use their background to ask targeted, relevant questions that help them shine

Begin with a warm greeting and directly reference something from their background that's relevant to this role. For example: "Hi! I've had a chance to review your CV and I'm particularly interested in your experience at [company] - let's start there."`;

  return systemPrompt;
}

// 🎯 LAYER 1: IMMEDIATE AWARENESS - Always accessible context
function buildImmediateAwareness(userPersonalization: any, unifiedContext: any): string {
  const candidateSummary = buildCandidateSummary(userPersonalization);
  const keyStrengths = extractKeyStrengths(userPersonalization, unifiedContext);
  const conversationHooks = extractConversationHooks(userPersonalization);

  return `
CANDIDATE OVERVIEW:
${candidateSummary}

KEY STRENGTHS TO EXPLORE:
${keyStrengths}

NATURAL CONVERSATION HOOKS:
${conversationHooks}

PERSONALIZED APPROACH:
${unifiedContext?.personalizedApproach || 'Professional and supportive approach tailored to candidate background'}`;
}

// 🧠 LAYER 2: CONVERSATIONAL MEMORY - Context for specific topics
function buildConversationalMemory(userPersonalization: any, roleIntelligence: any): string {
  return `
WHEN DISCUSSING EXPERIENCE:
${buildExperienceContext(userPersonalization)}

WHEN DISCUSSING SKILLS:
${buildSkillsContext(userPersonalization)}

WHEN DISCUSSING COMPANY/ROLE:
${buildCompanyContext(roleIntelligence)}

WHEN EXPLORING MOTIVATION:
${buildMotivationContext(userPersonalization, roleIntelligence)}`;
}

// 💡 LAYER 3: COACHING INTELLIGENCE - Strategic guidance
function buildCoachingIntelligence(unifiedContext: any, persona: any): string {
  return `
STRENGTH AMPLIFICATION OPPORTUNITIES:
${unifiedContext?.strengthAmplifiers?.map((s: string) => `• ${s}`).join('\n') || '• Help candidate leverage their unique background'}

CONFIDENCE BUILDING STRATEGIES:
${unifiedContext?.confidenceBuilders?.map((c: string) => `• ${c}`).join('\n') || '• Encourage candidate to share their achievements confidently'}

GAP BRIDGING APPROACH:
${unifiedContext?.gapBridges?.map((g: string) => `• ${g}`).join('\n') || '• Focus on transferable skills and growth mindset'}

INTERVIEW ADAPTATION:
Adjust style based on: ${persona?.round_type?.replace('_', ' ') || 'behavioral assessment'} focus and candidate comfort level`;
}

// 🔄 Natural conversation trigger patterns
function buildNaturalTriggers(): string {
  return `
IF candidate mentions "previous role" → Reference their actual experience naturally
IF candidate mentions "skills" → Connect to specific technologies/frameworks they've used
IF candidate mentions "company" → Weave in competitive advantages and recent developments
IF candidate seems nervous → Use confidence builders and strength-based questions
IF candidate shows company knowledge → Acknowledge and build on their research
IF candidate discusses challenges → Connect to role requirements and growth opportunities`;
}

// Helper functions for building context layers
function buildCandidateSummary(userPersonalization: any): string {
  if (!userPersonalization) return "Professional candidate with diverse background";

  const summary = userPersonalization.cv_summary || '';
  const experience = userPersonalization.relevant_experience?.slice(0, 2)?.join(', ') || '';
  const currentRole = userPersonalization.current_role || '';

  return `${currentRole ? `Currently: ${currentRole}. ` : ''}${summary}${experience ? ` Recent experience includes: ${experience}.` : ''}`.trim();
}

function buildExperienceContext(userPersonalization: any): string {
  if (!userPersonalization?.relevant_experience) return "General professional experience";

  return userPersonalization.relevant_experience
    .slice(0, 3)
    .map((exp: string) => `• ${exp}`)
    .join('\n');
}

function buildSkillsContext(userPersonalization: any): string {
  const technical = userPersonalization?.skills_highlighted?.slice(0, 5)?.join(', ') || '';
  const frameworks = userPersonalization?.frameworks_used?.slice(0, 3)?.join(', ') || '';

  return `Technical: ${technical}${frameworks ? `\nFrameworks: ${frameworks}` : ''}`;
}

function buildCompanyContext(roleIntelligence: any): string {
  if (!roleIntelligence) return "Strong company with growth opportunities";

  return `
Strategic Advantages: ${roleIntelligence.strategic_advantages?.slice(0, 3)?.join(', ') || 'Strong market position'}
Recent Developments: ${roleIntelligence.recent_role_developments?.slice(0, 2)?.join(', ') || 'Continued growth and innovation'}
Competitive Position: ${roleIntelligence.competitive_positioning || 'Industry leader with strong culture'}`;
}

function buildMotivationContext(userPersonalization: any, roleIntelligence: any): string {
  const userMotivation = userPersonalization?.motivation_factors?.join(', ') || '';
  const companyFit = roleIntelligence?.culture_highlights?.join(', ') || '';

  return `User interests: ${userMotivation || 'Professional growth and impact'}
Company culture: ${companyFit || 'Innovation and collaboration'}`;
}

function extractKeyStrengths(userPersonalization: any, unifiedContext: any): string {
  const cvStrengths = userPersonalization?.key_strengths?.slice(0, 3) || [];
  const amplifiers = unifiedContext?.strengthAmplifiers?.slice(0, 2) || [];

  const combined = [...cvStrengths, ...amplifiers].slice(0, 4);
  return combined.map((s: string) => `• ${s}`).join('\n') || '• Strong analytical and problem-solving abilities';
}

function extractConversationHooks(userPersonalization: any): string {
  const hooks = [];

  if (userPersonalization?.recent_projects?.length) {
    hooks.push(`Recent project: ${userPersonalization.recent_projects[0]}`);
  }

  if (userPersonalization?.career_highlights?.length) {
    hooks.push(`Achievement: ${userPersonalization.career_highlights[0]}`);
  }

  if (userPersonalization?.learning_interests?.length) {
    hooks.push(`Learning focus: ${userPersonalization.learning_interests[0]}`);
  }

  return hooks.slice(0, 3).map(hook => `• ${hook}`).join('\n') || '• Professional development and growth mindset';
}

function generateOpeningMessage(persona: any): string {
  const role = persona?.role || 'interviewer';

  return `Hi there! I'm your ${role} for today's interview. Thank you so much for taking the time to speak with me. I'm really looking forward to learning more about your background and discussing this opportunity together. How are you feeling today?`;
}
import { NextResponse } from 'next/server';
import { getRandomVoiceForRound } from '@/lib/voice/voicePool';

// ElevenLabs speech interview endpoint
export async function GET(request: Request) {
  try {
    // Extract voice selection parameters from URL
    const url = new URL(request.url);
    const curriculumId = url.searchParams.get('curriculumId');
    const roundNumber = url.searchParams.get('roundNumber');

    // Select voice: random if no params, deterministic if params provided
    const agentId = (curriculumId && roundNumber)
      ? getRandomVoiceForRound(curriculumId, parseInt(roundNumber))
      : process.env.ELEVENLABS_AGENT_ID || 'agent_7701k58syf61ep1rfzkgbrczmcmr';

    const apiKey = process.env.ELEVENLABS_API_KEY;

    if (!apiKey) {
      throw new Error('ELEVENLABS_API_KEY not configured');
    }

    console.log(`🎲 [VOICE SELECTION] Using agent: ${agentId} for curriculum:${curriculumId} round:${roundNumber}`);

    // Get signed URL from ElevenLabs API
    const response = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${agentId}`,
      {
        method: 'GET',
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`ElevenLabs API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    // Return the signed WebSocket URL
    return NextResponse.json({
      signedUrl: data.signed_url
    });

  } catch (error) {
    console.error('Failed to create ElevenLabs session:', error);
    return NextResponse.json(
      { error: 'Failed to create speech interview session' },
      { status: 500 }
    );
  }
}
import { NextResponse } from 'next/server';
import { ElevenLabs } from '@elevenlabs/elevenlabs-js';

export async function GET() {
  try {
    // Initialize ElevenLabs client
    const elevenlabs = new ElevenLabs({
      apiKey: process.env.ELEVENLABS_API_KEY!,
    });

    // Create a conversation session using the agent
    const conversation = await elevenlabs.conversationalAI.createConversation({
      agent_id: process.env.ELEVENLABS_AGENT_ID!,
    });

    // Return the conversation details
    return NextResponse.json({
      conversationId: conversation.conversation_id,
      signedUrl: conversation.signed_url
    });

  } catch (error) {
    console.error('Failed to create ElevenLabs session:', error);
    return NextResponse.json(
      { error: 'Failed to create voice session' },
      { status: 500 }
    );
  }
}
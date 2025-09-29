/**
 * Bias-Free Voice Pool System
 *
 * Provides random voice selection with no cultural, gender, or demographic bias.
 * Each interview round gets a completely random voice from a diverse pool.
 */

// Diverse pool of conversational AI agents for interviews
// Mix of professional male and female voices for bias-free interviews
const VOICE_POOL = [
  // Diverse professional voices for bias-free interviews
  'agent_4601k6a3nbvnf9wsc3qee1h9h61x', // James - male voice
  'agent_3801k6a3q57jeg6bed6ynqd1krwq',  // Juni - (gender-neutral name, could be male/female)
  'agent_5401k6a3t2z5e2ftbssa3qxtkj06',  // Jessica - female voice
  'agent_7701k58syf61ep1rfzkgbrczmcmr',  // Original agent (fallback)

  // Space for additional agents as you create them:
  // 'agent_bella_professional_female',     // Future: Bella voice
  // 'agent_antoni_professional_male',      // Future: Antoni voice
  // 'agent_josh_confident_male',           // Future: Josh voice
  // 'agent_elli_engaging_female',          // Future: Elli voice
];

/**
 * Get a random voice ID for an interview round
 * Uses curriculumId + roundNumber as seed for consistency within same round
 */
export function getRandomVoiceForRound(curriculumId: string, roundNumber: number): string {
  // Create deterministic randomness based on curriculum + round
  // This ensures same curriculum/round combo always gets same voice
  const seed = `${curriculumId}-${roundNumber}`;
  const hash = simpleHash(seed);
  const index = hash % VOICE_POOL.length;

  return VOICE_POOL[index];
}

/**
 * Get a completely random voice (for testing)
 */
export function getRandomVoice(): string {
  const randomIndex = Math.floor(Math.random() * VOICE_POOL.length);
  return VOICE_POOL[randomIndex];
}

/**
 * Simple hash function for deterministic randomness
 */
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Add a new agent to the voice pool
 */
export function addAgentToPool(agentId: string): void {
  if (!VOICE_POOL.includes(agentId)) {
    VOICE_POOL.push(agentId);
    console.log(`✅ Added new agent to voice pool: ${agentId}`);
  }
}

/**
 * Quick setup function to add multiple agents at once
 * Call this after creating your agents in ElevenLabs dashboard
 */
export function setupDiverseVoicePool(agentIds: string[]): void {
  console.log('🎭 Setting up diverse voice pool...');
  agentIds.forEach(agentId => addAgentToPool(agentId));
  console.log(`✅ Voice pool now has ${getVoicePoolSize()} diverse voices`);
}

/**
 * Get total number of voices available
 */
export function getVoicePoolSize(): number {
  return VOICE_POOL.length;
}
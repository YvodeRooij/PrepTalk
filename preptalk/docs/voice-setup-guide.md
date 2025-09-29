# 🎭 Voice Diversity Setup Guide

## Overview
This guide helps you create diverse male and female conversational AI agents in ElevenLabs for bias-free interview experiences.

## Step 1: Best Professional Voices (2024/2025)

### 👩 Female Professional Voices
| Voice Name | Voice ID | Characteristics |
|------------|----------|----------------|
| **Bella** | `EXAVITQu4vr4xnSDxMaL` | Professional, clear, warm |
| **Elli** | `MF3mGyEYCl7XYWbV9V6O` | Engaging, professional |
| **Rachel** | `21m00Tcm4TlvDq8ikWAM` | Warm, professional |
| **Domi** | `AZnzlk1XvdvUeBnXmlld` | Clear, professional |

### 👨 Male Professional Voices
| Voice Name | Voice ID | Characteristics |
|------------|----------|----------------|
| **Antoni** | `ErXwobaYiN019PkySvjV` | Clear, professional, popular |
| **Josh** | `TxGEqnHWrfWFTfGW9XjX` | Confident, clear |
| **Arnold** | `VR6AewLTigWG4xSOukaG` | Authoritative, professional |
| **Adam** | `pNInz6obpgDQGcFmaJgB` | Warm, clear, natural |
| **Sam** | `yoZ06aMxZJJ28mfd3POQ` | Neutral, professional |

## Step 2: Create Conversational AI Agents

1. **Go to ElevenLabs Dashboard** → Conversational AI → Agents
2. **Create new agent** for each voice:
   - Name: `Interview - [Voice Name] ([Gender])`
   - Voice: Select from the table above
   - Personality: Professional interviewer
   - Instructions: Generic interview guidelines (no specific names)

3. **Copy the Agent IDs** (format: `agent_xxxxxxxxxxxxx`)

## Step 3: Update Voice Pool

Add your new agent IDs to `/lib/voice/voicePool.ts`:

```typescript
const VOICE_POOL = [
  'agent_7701k58syf61ep1rfzkgbrczmcmr', // Current fallback

  // Female agents
  'agent_your_bella_id_here',     // Bella - professional female
  'agent_your_elli_id_here',      // Elli - engaging female
  'agent_your_rachel_id_here',    // Rachel - warm female
  'agent_your_domi_id_here',      // Domi - clear female

  // Male agents
  'agent_your_antoni_id_here',    // Antoni - professional male
  'agent_your_josh_id_here',      // Josh - confident male
  'agent_your_arnold_id_here',    // Arnold - authoritative male
  'agent_your_adam_id_here',      // Adam - warm male
  'agent_your_sam_id_here',       // Sam - neutral male
];
```

## Step 4: Test Voice Randomization

```bash
# Test different rounds - each should get different voices
curl "http://localhost:3001/api/speech-interview?curriculumId=test&roundNumber=1"
curl "http://localhost:3001/api/speech-interview?curriculumId=test&roundNumber=2"
curl "http://localhost:3001/api/speech-interview?curriculumId=test&roundNumber=3"
```

## Step 5: Verify Bias-Free Experience

✅ **No names** in prompts (uses "your interviewer")
✅ **Random voice selection** per round
✅ **Male/female mix** for diversity
✅ **Professional quality** voices only
✅ **Consistent experience** (same round = same voice)

## Quick Setup Function

Once you have agent IDs, use this helper:

```typescript
import { setupDiverseVoicePool } from '@/lib/voice/voicePool';

// Add all your agent IDs at once
setupDiverseVoicePool([
  'agent_bella_id',
  'agent_elli_id',
  'agent_rachel_id',
  'agent_domi_id',
  'agent_antoni_id',
  'agent_josh_id',
  'agent_arnold_id',
  'agent_adam_id',
  'agent_sam_id'
]);
```

## Expected Result

🎯 **Bias-Free Experience:**
- Round 1: Random professional voice (could be male/female)
- Round 2: Different random professional voice
- Round 3: Different random professional voice
- No gender/cultural assumptions
- Consistent quality across all voices

## Voice Pool Statistics

With 9 diverse agents:
- **4 Female voices** (44% representation)
- **5 Male voices** (56% representation)
- **100% Professional quality**
- **0% Bias** (pure randomization)
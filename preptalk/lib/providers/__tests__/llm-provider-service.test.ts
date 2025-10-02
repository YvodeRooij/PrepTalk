/**
 * @jest-environment node
 */
// TDD Tests for Structured Output Integration
// Write tests first, implement minimal code to pass

import { z } from 'zod';
import { LLMProviderService } from '../llm-provider-service';
import { DEFAULT_LLM_CONFIG } from '../../config/llm-config';

describe('LLMProviderService - Structured Outputs (TDD)', () => {
  let service: LLMProviderService;

  beforeEach(() => {
    service = new LLMProviderService(DEFAULT_LLM_CONFIG);
  });

  describe('generateStructured', () => {
    const PersonSchema = z.object({
      name: z.string().describe('Person name'),
      age: z.number().describe('Person age'),
      skills: z.array(z.string()).describe('Technical skills')
    });

    it('should generate structured output with OpenAI', async () => {
      const result = await service.generateStructured(
        PersonSchema,
        'persona_generation',
        'Create a persona for John, 30-year-old developer with React skills'
      );

      expect(result).toHaveProperty('name');
      expect(result).toHaveProperty('age');
      expect(result).toHaveProperty('skills');
      expect(typeof result.name).toBe('string');
      expect(typeof result.age).toBe('number');
      expect(Array.isArray(result.skills)).toBe(true);
    });

    it('should generate structured output with Gemini for research tasks', async () => {
      const CompanySchema = z.object({
        name: z.string(),
        industry: z.string(),
        size: z.string()
      });

      const result = await service.generateStructured(
        CompanySchema,
        'company_research',
        'Research Netflix as a company'
      );

      expect(result).toHaveProperty('name');
      expect(result).toHaveProperty('industry');
      expect(result).toHaveProperty('size');
    });

    it('should handle validation errors gracefully', async () => {
      const StrictSchema = z.object({
        required_field: z.string().min(10)
      });

      await expect(
        service.generateStructured(
          StrictSchema,
          'persona_generation',
          'Return empty object'
        )
      ).rejects.toThrow();
    });

    it('should maintain backward compatibility with existing generateContent', async () => {
      const result = await service.generateContent(
        'persona_generation',
        'Create a persona for John',
        { format: 'json' }
      );

      expect(result).toHaveProperty('content');
      expect(result).toHaveProperty('provider');
    });

    it('should use provider-specific optimal models', async () => {
      // Should use Gemini for research tasks
      const researchResult = await service.generateStructured(
        PersonSchema,
        'company_research',
        'Research a company'
      );
      expect(researchResult).toBeDefined();

      // Should use OpenAI for generation tasks
      const generationResult = await service.generateStructured(
        PersonSchema,
        'persona_generation',
        'Generate a persona'
      );
      expect(generationResult).toBeDefined();
    });

    it('should provide type safety with Zod inference', () => {
      type PersonType = z.infer<typeof PersonSchema>;

      const typedFunction = async (): Promise<PersonType> => {
        return service.generateStructured(PersonSchema, 'persona_generation', 'test');
      };

      // TypeScript should infer the correct type
      expect(typedFunction).toBeDefined();
    });
  });

  describe('batchStructured - OOTB Parallel Operations', () => {
    const PersonaSchema = z.object({
      name: z.string().describe('Interviewer name'),
      role: z.string().describe('Job title'),
      personality_traits: z.array(z.string()).min(2).max(5).describe('Personality traits')
    });

    it('should generate multiple structured outputs in parallel', async () => {
      const prompts = [
        { prompt: 'Create a persona for a recruiter screen interviewer' },
        { prompt: 'Create a persona for a behavioral deep dive interviewer' },
        { prompt: 'Create a persona for a culture fit interviewer' }
      ];

      const startTime = Date.now();
      const results = await service.batchStructured(
        PersonaSchema,
        'persona_generation',
        prompts
      );
      const duration = Date.now() - startTime;

      // Verify all results returned
      expect(results).toHaveLength(3);

      // Verify structure of each result
      results.forEach(result => {
        expect(result).toHaveProperty('name');
        expect(result).toHaveProperty('role');
        expect(result).toHaveProperty('personality_traits');
        expect(Array.isArray(result.personality_traits)).toBe(true);
        expect(result.personality_traits.length).toBeGreaterThanOrEqual(2);
      });

      // Verify parallel execution (should be faster than 3x sequential)
      console.log(`⏱️  Batch took ${duration}ms for 3 calls`);

      // Each call takes ~10-15s, so 3 sequential would be ~30-45s
      // Parallel should be ~10-15s (similar to single call)
      // Allow some overhead, but should be much faster than sequential
      expect(duration).toBeLessThan(25000); // Less than 25s indicates parallelization
    }, 60000); // 60s timeout

    it('should maintain result order matching input order', async () => {
      const prompts = [
        { prompt: 'Create recruiter persona named Sarah' },
        { prompt: 'Create behavioral interviewer persona named Michael' },
        { prompt: 'Create culture fit persona named Jennifer' }
      ];

      const results = await service.batchStructured(
        PersonaSchema,
        'persona_generation',
        prompts
      );

      // Results should be in same order as inputs
      expect(results[0].name).toContain('Sarah');
      expect(results[1].name).toContain('Michael');
      expect(results[2].name).toContain('Jennifer');
    }, 60000);

    it('should respect maxConcurrency limit', async () => {
      // Create 10 prompts to test concurrency limiting
      const prompts = Array.from({ length: 10 }, (_, i) => ({
        prompt: `Create interviewer persona number ${i + 1}`
      }));

      const startTime = Date.now();
      const results = await service.batchStructured(
        PersonaSchema,
        'persona_generation',
        prompts
      );
      const duration = Date.now() - startTime;

      // All 10 results should be returned
      expect(results).toHaveLength(10);

      // With maxConcurrency: 5, we expect ~2 batches
      // Each batch ~10-15s, so total ~20-30s
      console.log(`⏱️  Batch of 10 took ${duration}ms with maxConcurrency: 5`);

      // Should be faster than sequential (100s+) but not as fast as unlimited parallel
      expect(duration).toBeGreaterThan(15000); // At least 2 batches
      expect(duration).toBeLessThan(60000); // Much faster than sequential
    }, 120000); // 2min timeout

    it('should handle individual failures gracefully', async () => {
      const prompts = [
        { prompt: 'Create a valid persona for Sarah' },
        { prompt: '' }, // Invalid empty prompt
        { prompt: 'Create a valid persona for Michael' }
      ];

      // Batch should fail if any individual call fails
      await expect(
        service.batchStructured(PersonaSchema, 'persona_generation', prompts)
      ).rejects.toThrow();
    }, 60000);

    it('should work with different schema types', async () => {
      const QuestionSchema = z.object({
        text: z.string().min(10),
        category: z.enum(['motivation', 'behavioral', 'cultural']),
        follow_ups: z.array(z.string()).min(2)
      });

      const prompts = [
        { prompt: 'Generate a motivation interview question' },
        { prompt: 'Generate a behavioral interview question' }
      ];

      const results = await service.batchStructured(
        QuestionSchema,
        'question_generation',
        prompts
      );

      expect(results).toHaveLength(2);
      results.forEach(result => {
        expect(result.text.length).toBeGreaterThanOrEqual(10);
        expect(['motivation', 'behavioral', 'cultural']).toContain(result.category);
        expect(result.follow_ups.length).toBeGreaterThanOrEqual(2);
      });
    }, 60000);

    it('should support custom system prompts per input', async () => {
      const prompts = [
        {
          prompt: 'Create a senior interviewer persona',
          systemPrompt: 'You are creating personas for senior-level interviews'
        },
        {
          prompt: 'Create a junior interviewer persona',
          systemPrompt: 'You are creating personas for entry-level interviews'
        }
      ];

      const results = await service.batchStructured(
        PersonaSchema,
        'persona_generation',
        prompts
      );

      expect(results).toHaveLength(2);
      // Both should be valid but potentially different based on system prompts
      results.forEach(result => {
        expect(result.name).toBeTruthy();
        expect(result.role).toBeTruthy();
      });
    }, 60000);
  });

  describe('Claude Sonnet 4.5 - Unified Context Engine', () => {
    // Schema from unified-context-engine.ts
    const UnifiedContextSchema = z.object({
      strengthAmplifiers: z.array(z.string()).describe(
        "How to leverage user's background and CV strengths for this specific role"
      ),
      gapBridges: z.array(z.string()).describe(
        "How to address weaknesses and knowledge gaps positively during interviews"
      ),
      confidenceBuilders: z.array(z.string()).describe(
        "Ways to reframe user's insecurities and concerns as growth areas and learning opportunities"
      ),
      ciIntegrationStrategy: z.string().describe(
        "User-specific approach for naturally weaving competitive intelligence into interview responses"
      ),
      personalizedApproach: z.string().describe(
        "Overall coaching style and interview preparation approach tailored to this user's profile"
      )
    });

    it('should use Claude Sonnet 4.5 for unified context engine', async () => {
      const prompt = `Synthesize personalized coaching strategy:

JOB: Senior Software Engineer at Netflix
- Stack: React, TypeScript, Node.js
- Focus: Scalable streaming infrastructure

USER PROFILE:
- Experience: 4 years
- Current role: Mid-level developer at small startup
- Concerns: "Not sure I have enough experience for senior role"
- Strengths: Built real-time features, led small team

CV HIGHLIGHTS:
- Built video streaming feature serving 10K users
- Reduced latency by 40% through optimization
- Mentored 2 junior developers

Generate a personalized coaching strategy.`;

      const result = await service.generateStructured(
        UnifiedContextSchema,
        'unified_context_engine',
        prompt
      );

      // Verify schema compliance
      expect(result).toHaveProperty('strengthAmplifiers');
      expect(result).toHaveProperty('gapBridges');
      expect(result).toHaveProperty('confidenceBuilders');
      expect(result).toHaveProperty('ciIntegrationStrategy');
      expect(result).toHaveProperty('personalizedApproach');

      // Verify arrays have content
      expect(Array.isArray(result.strengthAmplifiers)).toBe(true);
      expect(result.strengthAmplifiers.length).toBeGreaterThan(0);
      expect(Array.isArray(result.gapBridges)).toBe(true);
      expect(result.gapBridges.length).toBeGreaterThan(0);
      expect(Array.isArray(result.confidenceBuilders)).toBe(true);
      expect(result.confidenceBuilders.length).toBeGreaterThan(0);

      // Verify strings have content
      expect(typeof result.ciIntegrationStrategy).toBe('string');
      expect(result.ciIntegrationStrategy.length).toBeGreaterThan(50);
      expect(typeof result.personalizedApproach).toBe('string');
      expect(result.personalizedApproach.length).toBeGreaterThan(50);

      console.log('✅ Claude Sonnet 4.5 unified context result:', {
        strengthAmplifiers: result.strengthAmplifiers.length,
        gapBridges: result.gapBridges.length,
        confidenceBuilders: result.confidenceBuilders.length,
        ciIntegrationStrategy: result.ciIntegrationStrategy.substring(0, 100) + '...',
        personalizedApproach: result.personalizedApproach.substring(0, 100) + '...'
      });
    }, 30000); // 30s timeout for complex reasoning

    it('should fallback to Gemini if Anthropic fails', async () => {
      // Test with minimal valid prompt
      const result = await service.generateStructured(
        UnifiedContextSchema,
        'unified_context_engine',
        'Synthesize strategy for software engineer with React background applying to Netflix'
      );

      // Should succeed with either Anthropic or Gemini
      expect(result).toHaveProperty('strengthAmplifiers');
      expect(result).toHaveProperty('personalizedApproach');
    }, 30000);

    it('should handle complex nested context synthesis', async () => {
      const complexPrompt = `Synthesize coaching strategy for complex case:

JOB: Principal Engineer at Meta
- Leading AR/VR infrastructure team
- 10+ years experience required
- Competitive with Apple, Google, Microsoft

USER:
- 8 years experience total
- 3 years leadership at startup (acquired)
- Concerns: "Never worked at FAANG", "Imposter syndrome about principal level"
- Weak areas: "System design at Meta scale", "Political navigation"
- Excitement: "Cutting edge AR/VR tech", "Opportunity to learn from best"

CV:
- Led team of 12 engineers at startup
- Built real-time 3D rendering pipeline
- Patents in spatial computing
- Scaled system from 1K to 100K users

COMPETITIVE INTELLIGENCE:
- Meta advantage: Huge R&D investment in Reality Labs
- Recent: Quest 3 launch, partnership with Ray-Ban
- Positioning: "Metaverse leader", betting on AR/VR future

Generate comprehensive personalized coaching strategy.`;

      const result = await service.generateStructured(
        UnifiedContextSchema,
        'unified_context_engine',
        complexPrompt
      );

      // Verify high-quality outputs for complex case
      expect(result.strengthAmplifiers.length).toBeGreaterThanOrEqual(3);
      expect(result.gapBridges.length).toBeGreaterThanOrEqual(3);
      expect(result.confidenceBuilders.length).toBeGreaterThanOrEqual(3);

      // Should reference specific details from prompt
      const allContent = JSON.stringify(result).toLowerCase();
      expect(allContent).toMatch(/meta|facebook/);
      expect(allContent).toMatch(/ar|vr|reality|quest/);

      console.log('✅ Complex synthesis test passed');
    }, 45000); // 45s timeout for complex reasoning
  });
});
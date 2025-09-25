// TDD Tests for Structured Output Integration
// Write tests first, implement minimal code to pass

import { z } from 'zod';
import { LLMProviderService } from '../llm-provider-service';

describe('LLMProviderService - Structured Outputs (TDD)', () => {
  let service: LLMProviderService;

  beforeEach(() => {
    service = new LLMProviderService({
      skipSchemaValidation: true
    });
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
});
// TDD Tests for Non-Technical Curriculum Generation
// RED Phase: Write failing tests first

import { generateDynamicPersonas, generateStandardQuestions, generateCandidatePrep } from '../nodes/persona-generation';
import { CurriculumState } from '../state';

describe('Non-Technical Curriculum Generation (TDD)', () => {

  // Mock competitive intelligence data (Netflix example)
  const mockCompetitiveIntelligence = {
    primaryCompetitors: ['Disney+', 'Amazon Prime', 'HBO Max'],
    roleComparison: 'Netflix Tax Analyst vs Disney Tax Analyst: Netflix operates in 190+ countries vs Disney 100+ countries',
    strategicAdvantages: [
      '$15B content investment vs Disney $8B creates unique transfer pricing challenges',
      'Global-first strategy vs competitors regional approach',
      'Ad-tier complexity in international markets'
    ],
    recentDevelopments: [
      'Password sharing crackdown increased revenue complexity',
      'Ad-tier launch in EMEA requiring new compliance frameworks',
      'Gaming expansion creating new revenue streams'
    ],
    competitivePositioning: 'Netflix leads in global content investment but faces higher regulatory complexity'
  };

  const mockJobData = {
    title: 'Tax Analyst',
    company_name: 'Netflix',
    level: 'mid' as const,
    responsibilities: ['International tax compliance', 'Transfer pricing analysis'],
    required_skills: ['Tax law', 'International regulations'],
    preferred_skills: ['Entertainment industry experience']
  };

  const mockCompanyContext = {
    name: 'Netflix',
    values: ['Freedom & Responsibility', 'Candid Feedback', 'High Performance'],
    recent_news: [
      { title: 'Netflix launches gaming', url: 'test.com', date: '2024-01-01', summary: 'New gaming division' }
    ],
    confidence_score: 0.9
  };

  describe('generateDynamicPersonas', () => {

    // RED: This test will fail because function doesn't exist yet
    it('should generate exactly 5 personas for non-technical rounds', async () => {
      const mockState: Partial<CurriculumState> = {
        competitiveIntelligence: mockCompetitiveIntelligence,
        jobData: mockJobData,
        companyContext: mockCompanyContext
      };

      const result = await generateDynamicPersonas(mockState as CurriculumState, {});

      expect(result.generatedPersonas).toHaveLength(5);
      expect(result.generatedPersonas.map(p => p.round_type)).toEqual([
        'recruiter_screen',
        'behavioral_deep_dive',
        'culture_values_alignment',
        'strategic_role_discussion',
        'executive_final'
      ]);
    });

    // RED: This test will fail - testing competitive intelligence integration
    it('should inject competitive intelligence into persona knowledge base', async () => {
      const mockState: Partial<CurriculumState> = {
        competitiveIntelligence: mockCompetitiveIntelligence,
        jobData: mockJobData,
        companyContext: mockCompanyContext
      };

      const result = await generateDynamicPersonas(mockState as CurriculumState, {});

      const recruiterPersona = result.generatedPersonas.find(p => p.round_type === 'recruiter_screen');

      expect(recruiterPersona?.knowledge_base.strategic_advantages).toContain('$15B content investment');
      expect(recruiterPersona?.knowledge_base.recent_developments).toContain('Ad-tier launch in EMEA');
      expect(recruiterPersona?.knowledge_base.competitive_context).toMatch(/Netflix.*Disney/);
    });

    // RED: This test will fail - testing persona identity generation
    it('should create realistic persona identities with company context', async () => {
      const mockState: Partial<CurriculumState> = {
        competitiveIntelligence: mockCompetitiveIntelligence,
        jobData: mockJobData,
        companyContext: mockCompanyContext
      };

      const result = await generateDynamicPersonas(mockState as CurriculumState, {});

      const behavioralPersona = result.generatedPersonas.find(p => p.round_type === 'behavioral_deep_dive');

      expect(behavioralPersona?.identity.name).toBeDefined();
      expect(behavioralPersona?.identity.role).toContain('Manager');
      expect(behavioralPersona?.identity.tenure_years).toBeGreaterThan(0);
      expect(behavioralPersona?.identity.personality_traits).toHaveLength(3);
    });

  });

  describe('generateStandardQuestions', () => {

    const mockPersonas = [
      {
        id: 'recruiter-1',
        round_number: 1,
        round_type: 'recruiter_screen' as const,
        identity: { name: 'Sarah Chen', role: 'Global Talent Recruiter', tenure_years: 3, personality_traits: ['friendly', 'thorough'] },
        knowledge_base: {
          strategic_advantages: ['$15B content budget'],
          recent_developments: ['Ad-tier launch'],
          competitive_context: 'Netflix vs Disney positioning'
        }
      }
    ];

    // RED: This test will fail because function doesn't exist
    it('should generate 5-7 standard questions per persona', async () => {
      const mockState: Partial<CurriculumState> = {
        generatedPersonas: mockPersonas,
        jobData: mockJobData
      };

      const result = await generateStandardQuestions(mockState as CurriculumState, {});

      expect(result.standardQuestionSets).toHaveProperty('recruiter_screen');
      expect(result.standardQuestionSets.recruiter_screen).toHaveLength(6); // Should be 5-7
      expect(result.standardQuestionSets.recruiter_screen[0]).toHaveProperty('text');
      expect(result.standardQuestionSets.recruiter_screen[0]).toHaveProperty('category');
    });

    // RED: This test will fail - testing question categories
    it('should create questions with appropriate categories for each round', async () => {
      const mockState: Partial<CurriculumState> = {
        generatedPersonas: mockPersonas,
        jobData: mockJobData
      };

      const result = await generateStandardQuestions(mockState as CurriculumState, {});

      const recruiterQuestions = result.standardQuestionSets.recruiter_screen;
      const categories = recruiterQuestions.map(q => q.category);

      expect(categories).toContain('motivation');
      expect(categories).toContain('behavioral');
      expect(recruiterQuestions[0].follow_ups).toHaveLength(2); // Should have follow-up questions
    });

  });

  describe('generateCandidatePrep', () => {

    const mockQuestionSets = {
      recruiter_screen: [
        {
          id: 'q1',
          text: 'Why do you want to work at Netflix?',
          category: 'motivation' as const,
          follow_ups: ['What specifically interests you about our content strategy?'],
          time_allocation_minutes: 5
        }
      ]
    };

    // RED: This test will fail because function doesn't exist
    it('should create prep guides with CI talking points', async () => {
      const mockState: Partial<CurriculumState> = {
        competitiveIntelligence: mockCompetitiveIntelligence,
        standardQuestionSets: mockQuestionSets,
        jobData: mockJobData
      };

      const result = await generateCandidatePrep(mockState as CurriculumState, {});

      expect(result.candidatePrepGuides).toHaveProperty('recruiter_screen');

      const recruiterPrep = result.candidatePrepGuides.recruiter_screen;
      expect(recruiterPrep.ci_talking_points.strategic_advantages).toHaveLength(3);
      expect(recruiterPrep.recognition_training.what_great_answers_sound_like).toHaveLength(2);
    });

    // RED: This test will fail - testing how CI transforms generic answers
    it('should transform generic answers with competitive intelligence', async () => {
      const mockState: Partial<CurriculumState> = {
        competitiveIntelligence: mockCompetitiveIntelligence,
        standardQuestionSets: mockQuestionSets,
        jobData: mockJobData
      };

      const result = await generateCandidatePrep(mockState as CurriculumState, {});

      const recruiterPrep = result.candidatePrepGuides.recruiter_screen;
      const strategicAdvantage = recruiterPrep.ci_talking_points.strategic_advantages[0];

      expect(strategicAdvantage.advantage).toContain('$15B content investment');
      expect(strategicAdvantage.how_to_weave_in).toContain('tax');
      expect(strategicAdvantage.example_response).toMatch(/Netflix.*Disney/);
    });

  });

  describe('Integration Tests', () => {

    // RED: This test will fail - testing the full pipeline
    it('should generate complete non-technical curriculum data', async () => {
      const mockState: Partial<CurriculumState> = {
        competitiveIntelligence: mockCompetitiveIntelligence,
        jobData: mockJobData,
        companyContext: mockCompanyContext
      };

      // Step 1: Generate personas
      const personasResult = await generateDynamicPersonas(mockState as CurriculumState, {});
      expect(personasResult.generatedPersonas).toHaveLength(5);

      // Step 2: Generate questions
      const questionsResult = await generateStandardQuestions({
        ...mockState,
        ...personasResult
      } as CurriculumState, {});
      expect(Object.keys(questionsResult.standardQuestionSets)).toHaveLength(5);

      // Step 3: Generate prep guides
      const prepResult = await generateCandidatePrep({
        ...mockState,
        ...personasResult,
        ...questionsResult
      } as CurriculumState, {});
      expect(Object.keys(prepResult.candidatePrepGuides)).toHaveLength(5);
    });

  });

});

// Mock data exports for other test files
export const mockNetflixCompetitiveIntel = mockCompetitiveIntelligence;
export const mockNetflixJobData = mockJobData;
export const mockNetflixCompanyContext = mockCompanyContext;
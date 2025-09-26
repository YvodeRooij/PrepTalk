// Mistral Pixtral OCR Service - Multimodal CV/Resume Analysis
// Processes PDFs and images to extract structured career data

import { CVAnalysisSchema, CVInsightsSchema, type CVAnalysis, type CVInsights } from '../schemas/cv-analysis';
import { LLMProviderService } from '../providers/llm-provider-service';

// Mistral API Configuration
const MISTRAL_API_URL = 'https://api.mistral.ai/v1/chat/completions';
const PIXTRAL_MODEL = 'pixtral-12b-2024-09-04'; // Mistral's multimodal model

export interface PixtralProcessingOptions {
  includeInsights?: boolean;
  targetRole?: string;
  extractionDetail?: 'basic' | 'detailed' | 'comprehensive';
  language?: string;
}

export class MistralPixtralService {
  private apiKey: string;
  private llmService?: LLMProviderService;

  constructor(apiKey?: string, llmService?: LLMProviderService) {
    this.apiKey = apiKey || process.env.MISTRAL_API_KEY || '';
    this.llmService = llmService;

    if (!this.apiKey) {
      console.warn('Mistral API key not configured - CV analysis will use fallback text extraction');
    }
  }

  /**
   * Process CV file (PDF or image) using Mistral Pixtral OCR
   */
  async processCVFile(
    fileBuffer: Buffer,
    mimeType: string,
    options: PixtralProcessingOptions = {}
  ): Promise<CVAnalysis> {
    try {
      // Convert file to base64 for Pixtral processing
      const base64File = fileBuffer.toString('base64');
      const dataUri = `data:${mimeType};base64,${base64File}`;

      // Prepare extraction prompt
      const extractionPrompt = this.buildExtractionPrompt(options);

      // Call Mistral Pixtral API
      const response = await this.callPixtralAPI(dataUri, extractionPrompt);

      // Parse and validate response
      const extractedData = this.parsePixtralResponse(response);

      // Validate with Zod schema
      const validatedCV = CVAnalysisSchema.parse(extractedData);

      return validatedCV;
    } catch (error) {
      console.error('Pixtral OCR processing failed:', error);

      // Fallback to structured output generation if available
      if (this.llmService) {
        return this.fallbackTextExtraction(fileBuffer, mimeType, options);
      }

      throw new Error(`CV processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate insights from CV analysis
   */
  async generateCVInsights(
    cvAnalysis: CVAnalysis,
    targetRole?: string
  ): Promise<CVInsights> {
    if (!this.llmService) {
      throw new Error('LLM service required for insights generation');
    }

    const insightsPrompt = `Analyze this CV data and generate career insights:

CV Summary:
- Name: ${cvAnalysis.personalInfo.fullName}
- Experience: ${cvAnalysis.experience.length} roles
- Current Role: ${cvAnalysis.summary.currentRole || 'Not specified'}
- Years of Experience: ${cvAnalysis.summary.yearsOfExperience || 'Unknown'}
- Target Role: ${targetRole || cvAnalysis.summary.targetRole || 'Not specified'}

Experience:
${cvAnalysis.experience.map(exp =>
  `- ${exp.position} at ${exp.company} (${exp.duration || 'Unknown duration'})`
).join('\n')}

Skills:
- Technical: ${cvAnalysis.skills.technical.join(', ')}
- Soft: ${cvAnalysis.skills.soft.join(', ')}

Generate insights including:
1. Experience level classification
2. Career progression analysis
3. Skills depth analysis
4. Interview readiness assessment
5. Personalized question topics based on background`;

    const insights = await this.llmService.generateStructured(
      CVInsightsSchema,
      'quality_evaluation',
      insightsPrompt
    );

    return insights;
  }

  /**
   * Build extraction prompt for Pixtral
   */
  private buildExtractionPrompt(options: PixtralProcessingOptions): string {
    const detailLevel = options.extractionDetail || 'comprehensive';

    return `Analyze this CV/resume document and extract structured information.

${options.targetRole ? `Target Role Context: ${options.targetRole}` : ''}

Extract the following information in a structured format:

1. Personal Information:
   - Full name, email, phone, location
   - LinkedIn, GitHub, portfolio URLs

2. Professional Summary:
   - Headline/title
   - Summary text
   - Years of experience
   - Current and target roles

3. Work Experience (for each role):
   - Company name
   - Position/title
   - Start and end dates
   - Location
   - Key responsibilities and achievements
   - Technologies/skills used

4. Education:
   - Institution names
   - Degrees and fields of study
   - Graduation dates
   - GPA and achievements

5. Skills:
   - Technical skills
   - Soft skills
   - Programming languages
   - Frameworks and tools
   - Categorized skill groups

6. Certifications:
   - Certification names
   - Issuing organizations
   - Dates obtained

7. Projects:
   - Project names and descriptions
   - Technologies used
   - Outcomes and results

8. Achievements and Awards

Return the extracted data as a JSON object matching this structure exactly.
Be thorough in extraction - ${detailLevel === 'comprehensive' ? 'include all details' : 'focus on key information'}.
If information is not present, use null or empty arrays as appropriate.`;
  }

  /**
   * Call Mistral Pixtral API
   */
  private async callPixtralAPI(dataUri: string, prompt: string): Promise<any> {
    const response = await fetch(MISTRAL_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: PIXTRAL_MODEL,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: prompt
              },
              {
                type: 'image_url',
                image_url: {
                  url: dataUri
                }
              }
            ]
          }
        ],
        temperature: 0.1, // Low temperature for accurate extraction
        max_tokens: 4000,
        response_format: { type: 'json_object' }
      })
    });

    if (!response.ok) {
      throw new Error(`Mistral API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || '{}';
  }

  /**
   * Parse Pixtral API response
   */
  private parsePixtralResponse(response: string): any {
    try {
      const parsed = typeof response === 'string' ? JSON.parse(response) : response;

      // Add metadata
      parsed.metadata = {
        extractionDate: new Date().toISOString(),
        documentType: 'PDF',
        confidence: 0.9, // Pixtral typically has high accuracy
        processingModel: PIXTRAL_MODEL
      };

      return parsed;
    } catch (error) {
      console.error('Failed to parse Pixtral response:', error);
      throw new Error('Invalid response from OCR service');
    }
  }

  /**
   * Fallback text extraction using LLM service
   */
  private async fallbackTextExtraction(
    fileBuffer: Buffer,
    mimeType: string,
    options: PixtralProcessingOptions
  ): Promise<CVAnalysis> {
    if (!this.llmService) {
      throw new Error('No fallback extraction available');
    }

    // For fallback, we'd need a text extraction library
    // This is a placeholder for when Pixtral isn't available
    console.log('Using fallback text extraction (limited functionality)');

    // Create minimal CV structure
    const minimalCV: CVAnalysis = {
      personalInfo: {
        fullName: 'Unknown User'
      },
      summary: {},
      experience: [],
      education: [],
      skills: {
        technical: [],
        soft: []
      },
      metadata: {
        extractionDate: new Date().toISOString(),
        documentType: mimeType.includes('pdf') ? 'PDF' : 'Image',
        confidence: 0.3,
        processingModel: 'fallback',
        warnings: ['Pixtral OCR unavailable - using limited extraction']
      }
    };

    return minimalCV;
  }

  /**
   * Extract text content from CV for search/matching
   */
  async extractSearchableText(cvAnalysis: CVAnalysis): Promise<string> {
    const sections = [
      cvAnalysis.personalInfo.fullName,
      cvAnalysis.summary.headline,
      cvAnalysis.summary.summary,
      ...cvAnalysis.experience.map(exp =>
        `${exp.position} ${exp.company} ${exp.responsibilities.join(' ')}`
      ),
      ...cvAnalysis.education.map(edu =>
        `${edu.institution} ${edu.degree} ${edu.field}`
      ),
      cvAnalysis.skills.technical.join(' '),
      cvAnalysis.skills.soft.join(' '),
      ...(cvAnalysis.projects?.map(proj =>
        `${proj.name} ${proj.description}`
      ) || []),
      ...(cvAnalysis.achievements || [])
    ];

    return sections.filter(Boolean).join(' ');
  }

  /**
   * Match CV to job requirements
   */
  async matchCVToJob(
    cvAnalysis: CVAnalysis,
    jobRequirements: {
      requiredSkills: string[];
      preferredSkills: string[];
      experienceLevel: string;
      responsibilities: string[];
    }
  ): Promise<{
    overallMatch: number;
    skillsMatch: number;
    experienceMatch: number;
    gaps: string[];
    strengths: string[];
  }> {
    const allCVSkills = [
      ...cvAnalysis.skills.technical,
      ...cvAnalysis.skills.soft,
      ...(cvAnalysis.skills.languages || []),
      ...(cvAnalysis.skills.frameworks || []),
      ...(cvAnalysis.skills.tools || [])
    ].map(s => s.toLowerCase());

    // Calculate skills match
    const requiredMatches = jobRequirements.requiredSkills
      .filter(skill => allCVSkills.some(cvSkill =>
        cvSkill.includes(skill.toLowerCase()) ||
        skill.toLowerCase().includes(cvSkill)
      ));

    const preferredMatches = jobRequirements.preferredSkills
      .filter(skill => allCVSkills.some(cvSkill =>
        cvSkill.includes(skill.toLowerCase()) ||
        skill.toLowerCase().includes(cvSkill)
      ));

    const skillsMatch = (
      (requiredMatches.length / (jobRequirements.requiredSkills.length || 1)) * 0.7 +
      (preferredMatches.length / (jobRequirements.preferredSkills.length || 1)) * 0.3
    ) * 100;

    // Calculate experience match
    const cvYears = cvAnalysis.summary.yearsOfExperience || 0;
    const requiredYears = parseInt(jobRequirements.experienceLevel) || 3;
    const experienceMatch = Math.min(100, (cvYears / requiredYears) * 100);

    // Identify gaps
    const gaps = jobRequirements.requiredSkills
      .filter(skill => !requiredMatches.includes(skill));

    // Identify strengths
    const strengths = [
      ...requiredMatches,
      ...preferredMatches.slice(0, 3)
    ];

    const overallMatch = (skillsMatch * 0.6 + experienceMatch * 0.4);

    return {
      overallMatch: Math.round(overallMatch),
      skillsMatch: Math.round(skillsMatch),
      experienceMatch: Math.round(experienceMatch),
      gaps,
      strengths: [...new Set(strengths)]
    };
  }
}

// Export singleton instance
export const pixtralService = new MistralPixtralService();
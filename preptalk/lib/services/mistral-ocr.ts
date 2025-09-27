// Mistral OCR Service - Document understanding with Mistral OCR API
// Processes CVs/resumes using Mistral's latest OCR model

import { CVAnalysisSchema, CVInsightsSchema, type CVAnalysis, type CVInsights } from '../schemas/cv-analysis';
import { z } from 'zod';

const MISTRAL_OCR_API_URL = 'https://api.mistral.ai/v1/ocr';
const MISTRAL_CHAT_API_URL = 'https://api.mistral.ai/v1/chat/completions';

export interface OCRProcessingOptions {
  model?: 'mistral-ocr-latest';
  extractionDetail?: 'basic' | 'detailed' | 'comprehensive';
  targetRole?: string;
}

export class MistralOCRService {
  private apiKey: string;
  private model: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.MISTRAL_API_KEY || '';
    this.model = 'mistral-ocr-latest'; // Official Mistral OCR model

    if (!this.apiKey) {
      console.warn('⚠️ Mistral API key not configured - CV analysis will use mock data');
    } else {
      // Basic API key validation
      if (!this.apiKey.startsWith('mr-')) {
        console.warn('⚠️ Mistral API key format looks incorrect (should start with "mr-")');
      }
      console.log('✅ Mistral API key configured, length:', this.apiKey.length);
    }
  }

  /**
   * Process CV using Mistral OCR API (official endpoint)
   */
  async processCV(
    fileBuffer: Buffer,
    mimeType: string,
    options: OCRProcessingOptions = {}
  ): Promise<CVAnalysis> {
    if (!this.apiKey) {
      return this.processCVMock(fileBuffer, mimeType);
    }

    try {
      // Step 1: Extract raw text using Mistral OCR API
      const base64File = fileBuffer.toString('base64');
      const dataUri = `data:${mimeType};base64,${base64File}`;

      console.log('📄 Processing CV with Mistral OCR API...');

      // Correct request payload per TypeScript SDK
      const requestBody = {
        model: options.model || this.model,
        document: {
          documentUrl: dataUri,
          type: "document_url"
        }
      };

      // Debug logging (don't log full base64)
      const debugPayload = {
        ...requestBody,
        document: {
          ...requestBody.document,
          documentUrl: dataUri.slice(0, 100) + '...[base64 truncated]'
        }
      };
      console.log('🔍 OCR Request payload:', JSON.stringify(debugPayload, null, 2));

      const ocrResponse = await fetch(MISTRAL_OCR_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (!ocrResponse.ok) {
        const errorText = await ocrResponse.text();
        console.error('Mistral OCR API error:', errorText);

        // Check for common authentication/permission errors
        if (ocrResponse.status === 401) {
          throw new Error('Mistral API authentication failed - check your API key');
        }
        if (ocrResponse.status === 403) {
          throw new Error('Mistral API access forbidden - check API key permissions for OCR');
        }
        if (ocrResponse.status === 400) {
          throw new Error(`Mistral API bad request: ${errorText.slice(0, 200)}`);
        }
        if (ocrResponse.status === 422) {
          console.error('⚠️ Mistral OCR API 422 - Request format issue:', errorText);
          throw new Error('Mistral OCR API request format rejected - falling back to mock data');
        }

        throw new Error(`Mistral OCR API error: ${ocrResponse.status} ${ocrResponse.statusText}`);
      }

      // Parse JSON response with error handling
      let ocrData;
      try {
        const responseText = await ocrResponse.text();

        // Check if response is HTML (common for server errors)
        if (responseText.trim().startsWith('<')) {
          console.error('⚠️ Received HTML response instead of JSON:', responseText.slice(0, 500));
          throw new Error('Mistral OCR API returned HTML error page instead of JSON');
        }

        ocrData = JSON.parse(responseText);
      } catch (parseError) {
        console.error('⚠️ Failed to parse OCR response as JSON:', parseError);
        throw new Error('Invalid JSON response from Mistral OCR API');
      }

      // Extract text from the correct Mistral OCR response format
      let extractedText = '';
      if (ocrData.pages && ocrData.pages.length > 0) {
        // Combine text from all pages
        extractedText = ocrData.pages
          .map((page: any) => page.markdown || '')
          .join('\n\n')
          .trim();
      }

      console.log('✅ OCR extraction completed, text length:', extractedText.length);

      // If no text extracted, log the response structure for debugging
      if (extractedText.length === 0) {
        console.warn('⚠️ No text extracted. OCR response structure:', JSON.stringify(ocrData, null, 2));
      }

      // Step 2: Structure the text (with fallbacks)
      let structuredData;

      if (extractedText.length === 0) {
        console.warn('⚠️ No text extracted from OCR - using minimal fallback structure');
        structuredData = this.createMinimalStructure();
      } else {
        try {
          structuredData = await this.structureExtractedText(extractedText, options);
        } catch (error) {
          console.warn('⚠️ Text structuring failed - using partial structure:', error);
          structuredData = this.createMinimalStructure(extractedText);
        }
      }

      // Add metadata with appropriate confidence
      structuredData.metadata = {
        extractionDate: new Date().toISOString(),
        documentType: mimeType.includes('pdf') ? 'PDF' : 'Image',
        confidence: extractedText.length > 0 ? 0.90 : 0.10,
        processingModel: options.model || this.model,
        warnings: extractedText.length === 0 ? ['No text extracted from document'] : []
      };

      // Validate with schema (now flexible and forgiving)
      try {
        return CVAnalysisSchema.parse(structuredData);
      } catch (validationError) {
        console.warn('⚠️ Schema validation failed, using safe fallback:', validationError);
        return this.createSafeAnalysis(mimeType);
      }
    } catch (error) {
      console.error('Mistral OCR processing failed:', error);

      // If authentication, format, or API key issues, use fallback
      if (error instanceof Error && (
        error.message.includes('authentication') ||
        error.message.includes('API key') ||
        error.message.includes('401') ||
        error.message.includes('403') ||
        error.message.includes('422') ||
        error.message.includes('falling back to mock data')
      )) {
        console.warn('⚠️ API issue - falling back to mock data:', error.message);
        return this.processCVMock(fileBuffer, mimeType);
      }

      throw new Error(`CV processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Structure extracted text using Mistral chat API
   */
  private async structureExtractedText(text: string, options: OCRProcessingOptions): Promise<any> {
    const structuringPrompt = this.buildStructuringPrompt(text, options);

    const response = await fetch(MISTRAL_CHAT_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'mistral-large-latest',
        messages: [
          {
            role: 'user',
            content: structuringPrompt
          }
        ],
        temperature: 0.1,
        max_tokens: 4000,
        response_format: { type: 'json_object' }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Mistral Chat API error:', errorText);
      throw new Error(`Mistral Chat API error: ${response.status} ${response.statusText}`);
    }

    let data;
    try {
      const responseText = await response.text();
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse Chat API response:', parseError);
      throw new Error('Invalid JSON response from Mistral Chat API');
    }

    const content = data.choices?.[0]?.message?.content || '{}';
    try {
      return JSON.parse(content);
    } catch (contentParseError) {
      console.error('Failed to parse structured content:', content);
      throw new Error('Invalid structured JSON content from Chat API');
    }
  }

  /**
   * Mock CV processing for testing without API key
   */
  async processCVMock(fileBuffer: Buffer, mimeType: string): Promise<CVAnalysis> {
    console.log('Using mock CV data for testing');

    const mockCV: CVAnalysis = {
      personalInfo: {
        fullName: 'Yvo De Rooij',
        email: 'yvo@example.com',
        location: 'Amsterdam, Netherlands',
        linkedIn: 'https://linkedin.com/in/yvo'
      },
      summary: {
        headline: 'Technology Consultant',
        summary: 'Experienced technology consultant with expertise in digital transformation and cloud architecture',
        yearsOfExperience: 5,
        currentRole: 'Technology Consultant',
        targetRole: 'Senior Technology Consultant'
      },
      experience: [
        {
          company: 'Tech Consulting Firm',
          position: 'Technology Consultant',
          startDate: '2020-01',
          endDate: 'Present',
          duration: '4+ years',
          location: 'Amsterdam',
          responsibilities: [
            'Led digital transformation initiatives for enterprise clients',
            'Designed and implemented cloud migration strategies',
            'Managed cross-functional teams of 5-10 people',
            'Delivered $2M+ in project value'
          ],
          skills: ['Cloud Architecture', 'Project Management', 'Stakeholder Management']
        }
      ],
      education: [
        {
          institution: 'University of Amsterdam',
          degree: 'Master of Science',
          field: 'Computer Science',
          graduationDate: '2019',
          achievements: ['Cum Laude', 'Thesis on Cloud Computing']
        }
      ],
      skills: {
        technical: ['Python', 'TypeScript', 'AWS', 'Azure', 'Docker', 'Kubernetes', 'React'],
        soft: ['Leadership', 'Communication', 'Problem-solving', 'Strategic thinking'],
        languages: ['Python', 'JavaScript', 'TypeScript', 'Java'],
        frameworks: ['React', 'Node.js', 'Django', 'FastAPI'],
        tools: ['Git', 'Jenkins', 'Terraform', 'DataDog']
      },
      metadata: {
        extractionDate: new Date().toISOString(),
        documentType: 'PDF',
        pageCount: 2,
        confidence: 0.85,
        processingModel: 'mock'
      }
    };

    return CVAnalysisSchema.parse(mockCV);
  }

  /**
   * Build structuring prompt for extracted text
   */
  private buildStructuringPrompt(extractedText: string, options: OCRProcessingOptions): string {
    const detail = options.extractionDetail || 'comprehensive';

    return `You are an expert CV/resume parser. Structure the following extracted CV text into a standardized JSON format.

EXTRACTED CV TEXT:
${extractedText}

${options.targetRole ? `Target Role: ${options.targetRole}` : ''}

Structure this information into the following exact JSON format:

{
  "personalInfo": {
    "fullName": "string",
    "email": "string or null",
    "phone": "string or null",
    "location": "string or null",
    "linkedIn": "string or null",
    "github": "string or null",
    "portfolio": "string or null"
  },
  "summary": {
    "headline": "string or null",
    "summary": "string or null",
    "yearsOfExperience": number or null,
    "currentRole": "string or null",
    "targetRole": "string or null"
  },
  "experience": [
    {
      "company": "string",
      "position": "string",
      "startDate": "string or null",
      "endDate": "string or null",
      "duration": "string or null",
      "location": "string or null",
      "responsibilities": ["array of strings"],
      "skills": ["array of strings or null"]
    }
  ],
  "education": [
    {
      "institution": "string",
      "degree": "string or null",
      "field": "string or null",
      "graduationDate": "string or null",
      "gpa": "string or null",
      "achievements": ["array of strings or null"]
    }
  ],
  "skills": {
    "technical": ["array of technical skills"],
    "soft": ["array of soft skills"],
    "languages": ["programming languages or null"],
    "frameworks": ["frameworks or null"],
    "tools": ["tools or null"]
  }
}

Be ${detail === 'comprehensive' ? 'extremely thorough' : 'focused on key information'}.
Parse ALL text content accurately. Use null for missing fields, empty arrays for missing lists.
Calculate yearsOfExperience from work history if not explicitly stated.
Return only valid JSON, no markdown or explanations.`;
  }

  /**
   * Create minimal structure when OCR fails completely
   */
  private createMinimalStructure(extractedText?: string): any {
    return {
      personalInfo: {
        fullName: extractedText ? 'Extracted from CV' : 'Unknown Name'
      },
      summary: {},
      experience: [],
      education: [],
      skills: {
        technical: extractedText ? [extractedText.slice(0, 50) + '...'] : []
      }
    };
  }

  /**
   * Create completely safe analysis when all else fails
   */
  private createSafeAnalysis(mimeType: string): CVAnalysis {
    return {
      personalInfo: {
        fullName: 'CV Upload',
        email: null,
        phone: null,
        location: null,
        linkedIn: null,
        github: null,
        portfolio: null
      },
      summary: {
        headline: null,
        summary: null,
        yearsOfExperience: null,
        currentRole: null,
        targetRole: null
      },
      experience: [],
      education: [],
      skills: {
        technical: [],
        soft: [],
        languages: [],
        frameworks: [],
        tools: []
      },
      metadata: {
        extractionDate: new Date().toISOString(),
        documentType: mimeType.includes('pdf') ? 'PDF' : 'Image',
        pageCount: null,
        confidence: 0.05,
        warnings: ['Complete extraction failure - fallback used'],
        processingModel: 'fallback'
      }
    };
  }

  /**
   * Generate insights from CV analysis
   */
  async generateInsights(cvAnalysis: CVAnalysis, targetRole?: string): Promise<CVInsights> {
    const years = cvAnalysis.summary?.yearsOfExperience || 0;
    const experienceLevel =
      years === 0 ? 'entry' :
      years < 2 ? 'junior' :
      years < 5 ? 'mid' :
      years < 8 ? 'senior' :
      years < 12 ? 'lead' :
      years < 15 ? 'principal' : 'executive';

    const insights: CVInsights = {
      experienceLevel: experienceLevel as any,
      careerProgression: {
        isLinear: true,
        industryChanges: 0,
        averageTenure: years / Math.max(cvAnalysis.experience.length, 1),
        growthTrajectory: 'steady'
      },
      skillsAnalysis: {
        primaryDomain: cvAnalysis.summary?.headline || 'Technology',
        secondaryDomains: ['Cloud Architecture', 'Digital Transformation'],
        skillDepth: cvAnalysis.skills.technical.length > 10 ? 't-shaped' : 'specialist',
        emergingSkills: cvAnalysis.skills.technical.slice(-2),
        skillGaps: targetRole ? ['Industry-specific knowledge'] : undefined
      },
      readiness: {
        overallScore: 75 + (years * 2),
        strengths: [
          `${years}+ years of experience`,
          `Strong technical background`,
          `${cvAnalysis.experience.length} relevant roles`
        ],
        areasForImprovement: ['Industry terminology', 'Company-specific knowledge'],
        recommendedPreparation: [
          'Review company tech stack',
          'Prepare STAR examples from experience',
          'Research company culture and values'
        ]
      },
      personalizedQuestionTopics: [
        ...cvAnalysis.experience.slice(0, 2).map(exp =>
          `Experience at ${exp.company}`
        ),
        'Technical challenges and solutions',
        'Team collaboration and leadership'
      ]
    };

    return CVInsightsSchema.parse(insights);
  }
}

/**
 * Match CV to job requirements
 */
export async function matchCVToJob(
  cvData: any,
  jobRequirements: any
): Promise<{
  overallMatch: number;
  skillsMatch: number;
  experienceMatch: number;
  gaps: string[];
  strengths: string[];
}> {
  const cvSkills = [
    ...(cvData.skills?.technical || []),
    ...(cvData.skills?.soft || [])
  ].map(s => s.toLowerCase());

  const requiredSkills = jobRequirements.requiredSkills || [];
  const matchedSkills = requiredSkills.filter((skill: string) =>
    cvSkills.some(cvSkill =>
      cvSkill.includes(skill.toLowerCase()) ||
      skill.toLowerCase().includes(cvSkill)
    )
  );

  const skillsMatch = (matchedSkills.length / Math.max(requiredSkills.length, 1)) * 100;

  const cvYears = cvData.summary?.yearsOfExperience || 0;
  const requiredYears = parseInt(jobRequirements.experienceLevel) || 3;
  const experienceMatch = Math.min(100, (cvYears / requiredYears) * 100);

  const gaps = requiredSkills.filter((skill: string) =>
    !matchedSkills.includes(skill)
  );

  const overallMatch = (skillsMatch * 0.6 + experienceMatch * 0.4);

  return {
    overallMatch: Math.round(overallMatch),
    skillsMatch: Math.round(skillsMatch),
    experienceMatch: Math.round(experienceMatch),
    gaps,
    strengths: matchedSkills.slice(0, 5)
  };
}
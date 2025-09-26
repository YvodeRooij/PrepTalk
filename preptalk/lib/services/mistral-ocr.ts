// Mistral OCR Service - Document understanding with Mistral OCR API
// Processes CVs/resumes using Mistral's latest OCR model

import { CVAnalysisSchema, CVInsightsSchema, type CVAnalysis, type CVInsights } from '../schemas/cv-analysis';
import { z } from 'zod';

const MISTRAL_API_URL = 'https://api.mistral.ai/v1/chat/completions';

export interface OCRProcessingOptions {
  model?: 'mistral-ocr-2505' | 'pixtral-large-2411' | 'pixtral-12b';
  extractionDetail?: 'basic' | 'detailed' | 'comprehensive';
  targetRole?: string;
}

export class MistralOCRService {
  private apiKey: string;
  private model: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.MISTRAL_API_KEY || '';
    this.model = 'mistral-ocr-2505'; // Latest OCR model

    if (!this.apiKey) {
      console.warn('⚠️  Mistral API key not configured - CV analysis will use mock data');
    }
  }

  /**
   * Process CV using Mistral OCR API
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
      const base64File = fileBuffer.toString('base64');
      const dataUri = `data:${mimeType};base64,${base64File}`;

      const response = await fetch(MISTRAL_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: options.model || this.model,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: this.buildExtractionPrompt(options)
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
          temperature: 0.1,
          max_tokens: 4000,
          response_format: { type: 'json_object' }
        })
      });

      if (!response.ok) {
        throw new Error(`Mistral API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content || '{}';
      const parsed = JSON.parse(content);

      // Add metadata
      parsed.metadata = {
        extractionDate: new Date().toISOString(),
        documentType: mimeType.includes('pdf') ? 'PDF' : 'Image',
        confidence: 0.95,
        processingModel: options.model || this.model
      };

      // Validate with schema
      return CVAnalysisSchema.parse(parsed);
    } catch (error) {
      console.error('Mistral OCR processing failed:', error);
      throw new Error(`CV processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
   * Build extraction prompt for Mistral OCR
   */
  private buildExtractionPrompt(options: OCRProcessingOptions): string {
    const detail = options.extractionDetail || 'comprehensive';

    return `Extract structured information from this CV/resume document.

${options.targetRole ? `Target Role: ${options.targetRole}` : ''}

Extract ALL information in a structured JSON format with these exact fields:

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
Extract ALL text content accurately. Use null for missing fields, empty arrays for missing lists.
Calculate yearsOfExperience from work history if not explicitly stated.`;
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
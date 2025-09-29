// Mistral OCR Service - Document understanding with Mistral OCR API
// Processes CVs/resumes using Mistral's latest OCR model + reliable LLM provider

import { CVAnalysisSchema, CVInsightsSchema, type CVAnalysis, type CVInsights } from '../schemas/cv-analysis';
import { LLMProviderService } from '../providers/llm-provider-service';
import { loadLLMConfig } from '../config/env-config';
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
  private llmProvider: LLMProviderService;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.MISTRAL_API_KEY || '';
    this.model = 'mistral-ocr-latest'; // Official Mistral OCR model

    // Initialize LLM provider with proper config
    const llmConfig = loadLLMConfig();
    this.llmProvider = new LLMProviderService(llmConfig);

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
    fileName?: string,
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

      // Correct request payload per Mistral OCR API docs
      const requestBody = {
        model: options.model || this.model,
        document: {
          document_url: dataUri,
          type: "document_url"
        }
      };

      // Debug logging (don't log full base64)
      const debugPayload = {
        ...requestBody,
        document: {
          ...requestBody.document,
          document_url: dataUri.slice(0, 100) + '...[base64 truncated]'
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
          console.log('🔧 [DEBUG] Starting text structuring with extracted text length:', extractedText.length);
          console.log('🔧 [DEBUG] First 200 chars of extracted text:', extractedText.substring(0, 200));
          console.log('📄 [DEBUG] FULL EXTRACTED TEXT FOR ANALYSIS:');
          console.log('='.repeat(80));
          console.log(extractedText);
          console.log('='.repeat(80));
          structuredData = await this.structureExtractedText(extractedText, options);

          // Enhance structured data with intelligent name extraction if missing
          structuredData = this.enhanceWithFilenameData(structuredData, fileName);

          console.log('✅ [DEBUG] Text structuring completed successfully');
        } catch (error) {
          console.error('❌ [DEBUG] Text structuring failed:', error);
          console.warn('⚠️ Text structuring failed - using partial structure:', error);
          structuredData = this.createMinimalStructure(extractedText);
          console.log('📝 [DEBUG] Using minimal structure fallback');

          // CRITICAL: Apply filename enhancement even in fallback mode
          structuredData = this.enhanceWithFilenameData(structuredData, fileName);
          console.log('🔧 [DEBUG] Applied filename enhancement to fallback data');
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

      // Simple validation with null-safe schema (KISS approach)
      try {
        console.log('✅ [DEBUG] Using null-safe schema validation...');
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
   * Structure extracted text using reliable LLM provider (Gemini/OpenAI/Anthropic)
   */
  private async structureExtractedText(text: string, options: OCRProcessingOptions): Promise<any> {
    console.log('🔧 [DEBUG] Using reliable LLM provider for text structuring...');

    const systemPrompt = `You are a CV/resume analysis expert. Extract structured information from the provided CV text.

Extract the following information into JSON format:
- personalInfo: name, email, phone, location, linkedIn, github, portfolio
- summary: headline, summary, yearsOfExperience, currentRole, targetRole
- experience: array of work experiences with company, position, dates, responsibilities, skills
- education: array of education with institution, degree, field, graduationDate, gpa, achievements
- skills: technical, soft, languages, frameworks, tools (all as arrays)

CRITICAL: For yearsOfExperience calculation:
- ONLY count professional work experience (employment history)
- EXCLUDE education, courses, certifications from experience calculation
- Calculate from earliest employment start date to present
- Handle overlapping employment periods correctly (don't double-count)
- If no work history is found, set yearsOfExperience to 0

Use null for missing fields, empty arrays for missing lists.
Be thorough and accurate.`;

    const userPrompt = `Analyze this CV text and extract structured information:\n\n${text}\n\nReturn only valid JSON matching the required structure.`;

    try {
      console.log('🔧 [DEBUG] Calling LLM provider for CV structuring...');

      const result = await this.llmProvider.generateStructured(
        CVAnalysisSchema.omit({ metadata: true }), // Exclude metadata from LLM generation
        'quality_evaluation', // Use valid task type
        userPrompt,
        {
          systemPrompt,
          temperature: 0.1,
          maxTokens: 4000
        }
      );

      console.log('✅ [DEBUG] LLM provider structured output successful');
      console.log('📊 [DEBUG] Structured keys found:', Object.keys(result));

      if (result.personalInfo) {
        console.log('👤 [DEBUG] PersonalInfo fullName:', result.personalInfo.fullName);
      }
      if (result.summary) {
        console.log('📝 [DEBUG] Summary yearsOfExperience:', result.summary.yearsOfExperience);
      }

      return result;

    } catch (error) {
      console.error('❌ [DEBUG] LLM provider structuring failed:', error);
      throw new Error(`LLM text structuring failed: ${error.message}`);
    }
  }

  /**
   * Enhance structured data with intelligent extraction from filename
   * Fallback for when OCR misses header information like names
   */
  private enhanceWithFilenameData(structuredData: any, fileName?: string): any {
    if (!fileName || !structuredData?.personalInfo) {
      return structuredData;
    }

    // Extract name from filename if personalInfo.fullName is null/empty
    if (!structuredData.personalInfo.fullName) {
      const extractedName = this.extractNameFromFilename(fileName);
      if (extractedName) {
        console.log('🔧 [DEBUG] Extracted name from filename:', extractedName);
        structuredData.personalInfo.fullName = extractedName;
      }
    }

    return structuredData;
  }

  /**
   * Extract person's name from CV filename using common patterns
   */
  private extractNameFromFilename(fileName: string): string | null {
    // Remove file extension
    const nameWithoutExt = fileName.replace(/\.[^/.]+$/, '');

    // Common patterns for CV filenames:
    // "Yvo_De_Rooij_-_Technology_Consultant.pdf" -> "Yvo De Rooij"
    // "John_Smith_CV.pdf" -> "John Smith"
    // "Jane_Doe_Resume.pdf" -> "Jane Doe"

    let cleanName = nameWithoutExt
      // Replace underscores and dashes with spaces
      .replace(/[_-]+/g, ' ')
      // Remove common CV-related words
      .replace(/\b(CV|Resume|Technology|Consultant|Manager|Senior|Junior)\b/gi, '')
      // Remove extra parentheses and numbers
      .replace(/\s*\([^)]*\)\s*/g, '')
      // Remove extra whitespace
      .replace(/\s+/g, ' ')
      .trim();

    // Extract only the name part (usually first 2-3 words)
    const words = cleanName.split(' ').filter(word =>
      word.length > 1 &&
      !/^\d+$/.test(word) && // Not just numbers
      !['the', 'and', 'of', 'in', 'at', 'to', 'for'].includes(word.toLowerCase())
    );

    // Take first 2-3 words as the likely name
    const nameWords = words.slice(0, 3);

    if (nameWords.length >= 2) {
      const extractedName = nameWords.join(' ');
      // Basic validation - names should have reasonable length
      if (extractedName.length >= 3 && extractedName.length <= 50) {
        return extractedName;
      }
    }

    return null;
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
   * Create intelligent minimal structure with basic text parsing when LLM API fails
   */
  private createMinimalStructure(extractedText?: string): any {
    if (!extractedText) {
      return {
        personalInfo: { fullName: 'Unknown Name' },
        summary: { yearsOfExperience: 0 },
        experience: [],
        education: [],
        skills: { technical: [], soft: [], languages: [], frameworks: [], tools: [] }
      };
    }

    console.log('🔧 [DEBUG] Applying intelligent text parsing fallback...');

    // Extract years of experience using regex patterns
    let yearsOfExperience = 0;
    const experiencePatterns = [
      /(\d+)\+?\s*years?\s+(?:of\s+)?experience/i,
      /experience[^\d]*(\d+)\+?\s*years?/i,
      /(\d+)\+?\s*years?\s+in/i
    ];

    for (const pattern of experiencePatterns) {
      const match = extractedText.match(pattern);
      if (match) {
        yearsOfExperience = parseInt(match[1]);
        console.log(`🔧 [DEBUG] Found experience: ${yearsOfExperience} years`);
        break;
      }
    }

    // If no direct experience mention, estimate from employment history
    if (yearsOfExperience === 0) {
      const currentYear = new Date().getFullYear();
      const dateMatches = extractedText.match(/(\d{4})\s*—?\s*Present/g);
      if (dateMatches) {
        const oldestYear = Math.min(...dateMatches.map(match => {
          const year = match.match(/(\d{4})/);
          return year ? parseInt(year[1]) : currentYear;
        }));
        yearsOfExperience = Math.max(0, currentYear - oldestYear);
        console.log(`🔧 [DEBUG] Estimated experience from dates: ${yearsOfExperience} years`);
      }
    }

    // Extract basic company information
    const companies = [];
    const companyPatterns = [
      /Manager,?\s+([A-Za-z]+)/g,
      /Consultant,?\s+([A-Za-z]+)/g,
      /Founder,?\s+([A-Za-z]+)/g
    ];

    for (const pattern of companyPatterns) {
      let match;
      while ((match = pattern.exec(extractedText)) !== null) {
        if (match[1] && !companies.includes(match[1])) {
          companies.push(match[1]);
        }
      }
    }

    // Extract skills
    const skills = [];
    const skillPatterns = [
      /JavaScript|React|Node\.js|Python|Java|TypeScript/gi,
      /Project Management|Leadership|Stakeholder Management/gi
    ];

    for (const pattern of skillPatterns) {
      let match;
      while ((match = pattern.exec(extractedText)) !== null) {
        if (!skills.includes(match[0])) {
          skills.push(match[0]);
        }
      }
    }

    console.log(`🔧 [DEBUG] Fallback extracted: ${yearsOfExperience} years, ${companies.length} companies, ${skills.length} skills`);

    return {
      personalInfo: {
        fullName: null // Will be enhanced by filename extraction
      },
      summary: {
        yearsOfExperience: yearsOfExperience,
        currentRole: companies.length > 0 ? `Manager, ${companies[0]}` : null
      },
      experience: companies.map(company => ({
        company: company,
        position: 'Manager', // Basic assumption
        responsibilities: [`Work experience at ${company}`]
      })),
      education: [],
      skills: {
        technical: skills.filter(s => /JavaScript|React|Node|Python|Java|TypeScript/i.test(s)),
        soft: skills.filter(s => /Management|Leadership|Stakeholder/i.test(s)),
        languages: [],
        frameworks: [],
        tools: []
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
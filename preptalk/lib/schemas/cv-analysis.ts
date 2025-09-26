// CV Analysis Schemas - Structured data extraction from resumes
// Uses Zod for validation of Mistral OCR output

import { z } from 'zod';

// Work Experience Schema
export const WorkExperienceSchema = z.object({
  company: z.string().describe('Company name'),
  position: z.string().describe('Job title/position'),
  startDate: z.string().optional().describe('Start date (any format)'),
  endDate: z.string().optional().describe('End date or "Present"'),
  duration: z.string().optional().describe('Duration in years/months'),
  location: z.string().optional().describe('Work location'),
  responsibilities: z.array(z.string()).describe('Key responsibilities and achievements'),
  skills: z.array(z.string()).optional().describe('Skills used in this role')
});

// Education Schema
export const EducationSchema = z.object({
  institution: z.string().describe('School/University name'),
  degree: z.string().optional().describe('Degree type (BS, MS, PhD, etc)'),
  field: z.string().optional().describe('Field of study/major'),
  graduationDate: z.string().optional().describe('Graduation date'),
  gpa: z.string().optional().describe('GPA if mentioned'),
  achievements: z.array(z.string()).optional().describe('Academic achievements')
});

// Complete CV Analysis Schema
export const CVAnalysisSchema = z.object({
  // Basic Information
  personalInfo: z.object({
    fullName: z.string().describe('Full name'),
    email: z.string().optional().describe('Email address'),
    phone: z.string().optional().describe('Phone number'),
    location: z.string().optional().describe('Location/City'),
    linkedIn: z.string().optional().describe('LinkedIn URL'),
    github: z.string().optional().describe('GitHub URL'),
    portfolio: z.string().optional().describe('Portfolio/Website URL')
  }).describe('Personal contact information'),

  // Professional Summary
  summary: z.object({
    headline: z.string().optional().describe('Professional headline/title'),
    summary: z.string().optional().describe('Professional summary/objective'),
    yearsOfExperience: z.number().optional().describe('Total years of experience'),
    currentRole: z.string().optional().describe('Current job title'),
    targetRole: z.string().optional().describe('Target/desired role if mentioned')
  }).describe('Professional summary'),

  // Experience
  experience: z.array(WorkExperienceSchema).describe('Work experience history'),

  // Education
  education: z.array(EducationSchema).describe('Educational background'),

  // Skills
  skills: z.object({
    technical: z.array(z.string()).describe('Technical skills'),
    soft: z.array(z.string()).describe('Soft skills'),
    languages: z.array(z.string()).optional().describe('Programming languages'),
    frameworks: z.array(z.string()).optional().describe('Frameworks and libraries'),
    tools: z.array(z.string()).optional().describe('Tools and platforms')
  }).describe('Skills breakdown'),

  // Analysis Metadata
  metadata: z.object({
    extractionDate: z.string().describe('When CV was analyzed'),
    documentType: z.string().describe('PDF, DOCX, Image, etc'),
    pageCount: z.number().optional().describe('Number of pages'),
    confidence: z.number().min(0).max(1).describe('Overall extraction confidence'),
    warnings: z.array(z.string()).optional().describe('Any extraction warnings'),
    processingModel: z.string().describe('Model used for extraction')
  }).describe('Extraction metadata')
});

// CV Insights Schema (generated from CV analysis)
export const CVInsightsSchema = z.object({
  experienceLevel: z.enum(['entry', 'junior', 'mid', 'senior', 'lead', 'principal', 'executive'])
    .describe('Calculated experience level'),

  careerProgression: z.object({
    isLinear: z.boolean().describe('Whether career progression is linear'),
    industryChanges: z.number().describe('Number of industry changes'),
    averageTenure: z.number().describe('Average years per company'),
    growthTrajectory: z.enum(['rapid', 'steady', 'varied', 'lateral'])
      .describe('Career growth pattern')
  }).describe('Career progression analysis'),

  skillsAnalysis: z.object({
    primaryDomain: z.string().describe('Primary skill domain'),
    secondaryDomains: z.array(z.string()).describe('Secondary skill domains'),
    skillDepth: z.enum(['specialist', 'generalist', 't-shaped'])
      .describe('Skill depth profile'),
    emergingSkills: z.array(z.string()).describe('Recently acquired skills'),
    skillGaps: z.array(z.string()).optional().describe('Potential skill gaps for target role')
  }).describe('Skills analysis'),

  readiness: z.object({
    overallScore: z.number().min(0).max(100).describe('Overall readiness score'),
    strengths: z.array(z.string()).describe('Key strengths'),
    areasForImprovement: z.array(z.string()).describe('Areas to improve'),
    recommendedPreparation: z.array(z.string()).describe('Preparation recommendations')
  }).describe('Interview readiness assessment'),

  personalizedQuestionTopics: z.array(z.string())
    .describe('Suggested interview question topics based on CV')
});

// Type exports
export type CVAnalysis = z.infer<typeof CVAnalysisSchema>;
export type CVInsights = z.infer<typeof CVInsightsSchema>;
export type WorkExperience = z.infer<typeof WorkExperienceSchema>;
export type Education = z.infer<typeof EducationSchema>;
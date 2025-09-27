// CV Analysis Schemas - Structured data extraction from resumes
// Uses Zod for validation of Mistral OCR output

import { z } from 'zod';

// Work Experience Schema - Flexible and forgiving
export const WorkExperienceSchema = z.object({
  company: z.string().default('Unknown Company').describe('Company name'),
  position: z.string().default('Unknown Position').describe('Job title/position'),
  startDate: z.string().nullish().describe('Start date (any format)'),
  endDate: z.string().nullish().describe('End date or "Present"'),
  duration: z.string().nullish().describe('Duration in years/months'),
  location: z.string().nullish().describe('Work location'),
  responsibilities: z.array(z.string()).default([]).describe('Key responsibilities and achievements'),
  skills: z.array(z.string()).default([]).describe('Skills used in this role')
});

// Education Schema - Flexible and forgiving
export const EducationSchema = z.object({
  institution: z.string().default('Unknown Institution').describe('School/University name'),
  degree: z.string().nullish().describe('Degree type (BS, MS, PhD, etc)'),
  field: z.string().nullish().describe('Field of study/major'),
  graduationDate: z.string().nullish().describe('Graduation date'),
  gpa: z.string().nullish().describe('GPA if mentioned'),
  achievements: z.array(z.string()).default([]).describe('Academic achievements')
});

// Complete CV Analysis Schema
export const CVAnalysisSchema = z.object({
  // Basic Information - Flexible and forgiving
  personalInfo: z.object({
    fullName: z.string().default('Unknown Name').describe('Full name'),
    email: z.string().nullish().describe('Email address'),
    phone: z.string().nullish().describe('Phone number'),
    location: z.string().nullish().describe('Location/City'),
    linkedIn: z.string().nullish().describe('LinkedIn URL'),
    github: z.string().nullish().describe('GitHub URL'),
    portfolio: z.string().nullish().describe('Portfolio/Website URL')
  }).describe('Personal contact information'),

  // Professional Summary - Flexible and forgiving
  summary: z.object({
    headline: z.string().nullish().describe('Professional headline/title'),
    summary: z.string().nullish().describe('Professional summary/objective'),
    yearsOfExperience: z.number().nullish().describe('Total years of experience'),
    currentRole: z.string().nullish().describe('Current job title'),
    targetRole: z.string().nullish().describe('Target/desired role if mentioned')
  }).describe('Professional summary'),

  // Experience - Always an array, empty if none found
  experience: z.array(WorkExperienceSchema).default([]).describe('Work experience history'),

  // Education - Always an array, empty if none found
  education: z.array(EducationSchema).default([]).describe('Educational background'),

  // Skills - Flexible with defaults
  skills: z.object({
    technical: z.array(z.string()).default([]).describe('Technical skills'),
    soft: z.array(z.string()).default([]).describe('Soft skills'),
    languages: z.array(z.string()).default([]).describe('Programming languages'),
    frameworks: z.array(z.string()).default([]).describe('Frameworks and libraries'),
    tools: z.array(z.string()).default([]).describe('Tools and platforms')
  }).describe('Skills breakdown'),

  // Analysis Metadata - Flexible with sensible defaults
  metadata: z.object({
    extractionDate: z.string().default(() => new Date().toISOString()).describe('When CV was analyzed'),
    documentType: z.string().default('Unknown').describe('PDF, DOCX, Image, etc'),
    pageCount: z.number().nullish().describe('Number of pages'),
    confidence: z.number().min(0).max(1).default(0.5).describe('Overall extraction confidence'),
    warnings: z.array(z.string()).default([]).describe('Any extraction warnings'),
    processingModel: z.string().default('unknown').describe('Model used for extraction')
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
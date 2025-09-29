// API Route: CV Analysis with Mistral Pixtral OCR
// Processes uploaded CVs and extracts structured data

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { MistralOCRService } from '@/lib/services/mistral-ocr';
import { CVAnalysisSchema, CVInsightsSchema } from '@/lib/schemas/cv-analysis';

// Extend timeout for CV analysis with complex documents
export const maxDuration = 300; // 5 minutes for CV processing

export async function POST(request: NextRequest) {
  try {
    // Get form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const userId = formData.get('userId') as string;
    const fileUrl = formData.get('fileUrl') as string;

    if (!file || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create Supabase client for database operations
    // Use service role in development to bypass RLS
    const supabase = process.env.NODE_ENV === 'development' && userId === '6a3ba98b-8b91-4ba0-b517-8afe6a5787ee'
      ? createSupabaseClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        )
      : await createClient();

    // Development: Allow testing with your real user ID
    let authenticatedUserId: string;

    if (process.env.NODE_ENV === 'development' && userId === '6a3ba98b-8b91-4ba0-b517-8afe6a5787ee') {
      authenticatedUserId = userId;
      console.log('🧪 Using your real user ID for CV analysis:', userId);
    } else {
      // Verify user authentication in production
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user || user.id !== userId) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }
      authenticatedUserId = user.id;
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Initialize Mistral OCR service
    const ocrService = new MistralOCRService(process.env.MISTRAL_API_KEY);

    // Process CV with Mistral OCR
    console.log(`Processing CV for user ${userId}: ${file.name}`);

    const cvAnalysis = await ocrService.processCV(
      buffer,
      file.type,
      file.name, // Pass filename for intelligent name extraction
      {
        extractionDetail: 'comprehensive'
      }
    );

    // Validate extracted data
    const validatedAnalysis = CVAnalysisSchema.parse(cvAnalysis);

    // Generate insights
    const targetRole = formData.get('targetRole') as string | undefined;
    let insights = null;

    try {
      insights = await ocrService.generateInsights(
        validatedAnalysis,
        targetRole
      );
    } catch (error) {
      console.error('Failed to generate insights:', error);
      // Continue without insights
    }

    // 🚀 FIX: Create CV analysis record in cv_analyses table
    console.log('💾 Attempting to save CV analysis to database...');
    const { data: cvAnalysisRecord, error: cvAnalysisError } = await supabase
      .from('cv_analyses')
      .insert({
        user_id: userId,
        file_path: fileUrl || `uploads/${userId}/${file.name}`,
        file_name: file.name,
        mime_type: file.type,
        file_size: file.size,
        analysis: validatedAnalysis,
        insights: insights,
        // match_score: parseFloat(validatedAnalysis.metadata.confidence) || 0.5,  // TODO: Fix column type from INTEGER to DECIMAL
        processing_model: 'mistral-large-2407',
        processing_status: 'completed',
        processed_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select('id')
      .single();

    if (cvAnalysisError) {
      console.error('❌ Failed to create CV analysis record:', cvAnalysisError);
      // Continue without cv_analysis_id - don't fail the entire operation
    } else {
      console.log('✅ CV analysis saved to database with ID:', cvAnalysisRecord?.id);
    }

    const cvAnalysisId = cvAnalysisRecord?.id;

    // Store analysis results in user profile (keep existing functionality)
    console.log('👤 Attempting to update user profile...');
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({
        resume_url: fileUrl,
        full_name: validatedAnalysis.personalInfo.fullName,
        current_job_role: validatedAnalysis.summary.currentRole,
        target_role: validatedAnalysis.summary.targetRole || targetRole,
        experience_level: determineExperienceLevel(validatedAnalysis),
        years_of_experience: validatedAnalysis.summary.yearsOfExperience,
        headline: validatedAnalysis.summary.headline,
        bio: validatedAnalysis.summary.summary,
        location: validatedAnalysis.personalInfo.location,
        linkedin_url: validatedAnalysis.personalInfo.linkedIn,
        github_url: validatedAnalysis.personalInfo.github,
        portfolio_url: validatedAnalysis.personalInfo.portfolio,
        metadata: {
          cvAnalysis: validatedAnalysis,
          cvInsights: insights,
          cvAnalysisId: cvAnalysisId, // 🔗 Link to cv_analyses record
          lastAnalyzed: new Date().toISOString(),
          extractionConfidence: parseFloat(validatedAnalysis.metadata.confidence) || 0.5
        },
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId);

    if (updateError) {
      console.error('❌ Failed to update user profile:', updateError);
      // Continue even if update fails - we still have the analysis
    } else {
      console.log('✅ User profile updated successfully');
    }

    // Log usage for analytics
    await logCVAnalysisUsage(supabase, userId, {
      fileName: file.name,
      fileSize: file.size,
      processingTime: Date.now(),
      confidence: validatedAnalysis.metadata.confidence
    });

    // Return analysis results
    console.log('🎉 CV analysis completed successfully');
    return NextResponse.json({
      ...validatedAnalysis,
      insights,
      cv_analysis_id: cvAnalysisId, // 🔗 Include CV analysis ID for curriculum linking
      message: 'CV analyzed successfully'
    });

  } catch (error) {
    console.error('CV analysis error:', error);

    // Check for specific error types
    if (error instanceof Error) {
      if (error.message.includes('rate limit')) {
        return NextResponse.json(
          { error: 'Rate limit exceeded. Please try again later.' },
          { status: 429 }
        );
      }

      if (error.message.includes('API key')) {
        return NextResponse.json(
          { error: 'CV analysis service not configured' },
          { status: 503 }
        );
      }

      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to analyze CV' },
      { status: 500 }
    );
  }
}

/**
 * Determine experience level from CV analysis
 */
function determineExperienceLevel(cvAnalysis: any): string {
  const years = cvAnalysis.summary.yearsOfExperience || 0;
  const roleCount = cvAnalysis.experience?.length || 0;

  if (years === 0 && roleCount === 0) return 'entry';
  if (years < 2) return 'junior';
  if (years < 5) return 'mid';
  if (years < 8) return 'senior';
  if (years < 12) return 'lead';
  if (years < 15) return 'principal';
  return 'executive';
}

/**
 * Log CV analysis usage for analytics
 */
async function logCVAnalysisUsage(
  supabase: any,
  userId: string,
  details: any
) {
  try {
    await supabase
      .from('audit_logs')
      .insert({
        user_id: userId,
        action: 'cv_analysis',
        entity_type: 'cv',
        new_values: details,
        success: true,
        created_at: new Date().toISOString()
      });
  } catch (error) {
    console.error('Failed to log CV analysis:', error);
    // Don't fail the request if logging fails
  }
}
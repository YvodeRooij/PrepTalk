-- Create CV storage bucket for user resumes
-- This migration creates a storage bucket for CV/resume files

-- Insert the storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, avif_autodetection)
VALUES ('cvs', 'cvs', true, false)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for CV storage
-- Allow authenticated users to upload their own CVs
CREATE POLICY "Users can upload their own CVs"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'cvs' AND
  (auth.uid())::text = (storage.foldername(name))[1]
);

-- Allow authenticated users to update their own CVs
CREATE POLICY "Users can update their own CVs"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'cvs' AND
  (auth.uid())::text = (storage.foldername(name))[1]
);

-- Allow authenticated users to delete their own CVs
CREATE POLICY "Users can delete their own CVs"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'cvs' AND
  (auth.uid())::text = (storage.foldername(name))[1]
);

-- Allow public read access to CVs (optional - remove if CVs should be private)
CREATE POLICY "Public can view CVs"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'cvs');

-- Create table to store CV analysis results
CREATE TABLE IF NOT EXISTS public.cv_analyses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size INTEGER,

  -- Analysis results
  analysis JSONB,
  insights JSONB,
  match_score INTEGER,

  -- Processing metadata
  processing_model TEXT,
  processing_status TEXT DEFAULT 'pending',
  processed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX idx_cv_analyses_user_id ON public.cv_analyses(user_id);
CREATE INDEX idx_cv_analyses_processing_status ON public.cv_analyses(processing_status);

-- RLS for cv_analyses table
ALTER TABLE public.cv_analyses ENABLE ROW LEVEL SECURITY;

-- Users can only view their own CV analyses
CREATE POLICY "Users can view own CV analyses"
ON public.cv_analyses
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Users can insert their own CV analyses
CREATE POLICY "Users can insert own CV analyses"
ON public.cv_analyses
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can update their own CV analyses
CREATE POLICY "Users can update own CV analyses"
ON public.cv_analyses
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Users can delete their own CV analyses
CREATE POLICY "Users can delete own CV analyses"
ON public.cv_analyses
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER update_cv_analyses_updated_at
BEFORE UPDATE ON public.cv_analyses
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
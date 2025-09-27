'use client';

import React, { useState, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { CVAnalysis } from '@/lib/schemas/cv-analysis';

interface CVUploadProps {
  userId: string;
  onUploadComplete?: (analysis: CVAnalysis) => void;
  onUploadError?: (error: string) => void;
  className?: string;
}

export function CVUpload({ userId, onUploadComplete, onUploadError, className }: CVUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [cvAnalysis, setCvAnalysis] = useState<CVAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  const handleFile = async (file: File) => {
    // Validate file type
    const validTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
    if (!validTypes.includes(file.type)) {
      const errorMsg = 'Please upload a PDF or image file (PNG, JPG)';
      setError(errorMsg);
      onUploadError?.(errorMsg);
      return;
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      const errorMsg = 'File size must be less than 10MB';
      setError(errorMsg);
      onUploadError?.(errorMsg);
      return;
    }

    setIsUploading(true);
    setError(null);
    setUploadProgress(10);

    try {
      // Step 1: Upload to Supabase Storage
      const fileName = `${userId}/${Date.now()}_${file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('cvs')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;
      setUploadProgress(40);

      // Step 2: Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('cvs')
        .getPublicUrl(fileName);

      setUploadProgress(50);

      // Step 3: Process with Mistral Pixtral OCR
      const formData = new FormData();
      formData.append('file', file);
      formData.append('userId', userId);
      formData.append('fileUrl', publicUrl);

      const response = await fetch('/api/cv/analyze', {
        method: 'POST',
        body: formData
      });

      setUploadProgress(80);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'CV analysis failed');
      }

      const analysis: CVAnalysis = await response.json();
      setUploadProgress(100);

      setCvAnalysis(analysis);
      onUploadComplete?.(analysis);

      setTimeout(() => {
        setUploadProgress(0);
        setIsUploading(false);
      }, 1000);

    } catch (err) {
      console.error('CV upload error:', err);
      const errorMsg = err instanceof Error ? err.message : 'Upload failed';
      setError(errorMsg);
      onUploadError?.(errorMsg);
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFile(files[0]);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  return (
    <div className={className}>
      <div
        className={`
          relative border-2 border-dashed rounded-lg p-8
          transition-all duration-200 cursor-pointer
          ${isDragging
            ? 'border-blue-500 bg-blue-50 scale-105'
            : 'border-gray-300 hover:border-gray-400'
          }
          ${isUploading ? 'pointer-events-none opacity-70' : ''}
        `}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => !isUploading && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".pdf,.png,.jpg,.jpeg"
          onChange={handleFileSelect}
          disabled={isUploading}
        />

        <div className="text-center">
          {isUploading ? (
            <>
              <div className="mb-4">
                <svg className="mx-auto h-12 w-12 animate-spin text-blue-500" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
              </div>
              <p className="text-sm text-gray-600">Processing your CV...</p>
              <div className="mt-4 w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </>
          ) : cvAnalysis ? (
            <>
              <svg className="mx-auto h-12 w-12 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="mt-2 text-sm text-gray-600">CV analyzed successfully!</p>
              <p className="mt-1 text-xs text-gray-500">{cvAnalysis.personalInfo.fullName}</p>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setCvAnalysis(null);
                  fileInputRef.current?.click();
                }}
                className="mt-4 text-sm text-blue-600 hover:text-blue-700"
              >
                Upload a different CV
              </button>
            </>
          ) : (
            <>
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
              <p className="mt-2 text-sm text-gray-600">
                {isDragging
                  ? 'Drop your CV here'
                  : 'Click to upload or drag and drop your CV'
                }
              </p>
              <p className="mt-1 text-xs text-gray-500">PDF, PNG, JPG up to 10MB</p>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {cvAnalysis && !isUploading && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-semibold text-gray-900 mb-3">Extracted Information</h3>
          <div className="space-y-2 text-sm">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-gray-500">Experience:</span>
                <span className="ml-2 text-gray-900">
                  {cvAnalysis.summary.yearsOfExperience || 0} years
                </span>
              </div>
              <div>
                <span className="text-gray-500">Current Role:</span>
                <span className="ml-2 text-gray-900">
                  {cvAnalysis.summary.currentRole || 'Not specified'}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Skills:</span>
                <span className="ml-2 text-gray-900">
                  {cvAnalysis.skills.technical.length} technical
                </span>
              </div>
              <div>
                <span className="text-gray-500">Education:</span>
                <span className="ml-2 text-gray-900">
                  {cvAnalysis.education.length} degree(s)
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
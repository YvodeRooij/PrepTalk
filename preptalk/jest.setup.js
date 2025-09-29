// Jest Setup for PrepTalk Tests

import '@testing-library/jest-dom'

// Mock Next.js modules
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/test-path',
}))

// Mock Supabase client
jest.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: {
          id: 'mock-cv-id',
          analysis: {
            personalInfo: { fullName: 'Mock User' },
            summary: { yearsOfExperience: 3 }
          },
          insights: { experienceLevel: 'mid' }
        },
        error: null
      }),
      insert: jest.fn().mockResolvedValue({ data: { id: 'new-id' }, error: null })
    })),
    storage: {
      from: jest.fn(() => ({
        upload: jest.fn().mockResolvedValue({ data: { path: 'mock-path' }, error: null }),
        getPublicUrl: jest.fn().mockReturnValue({ data: { publicUrl: 'mock-url' } })
      }))
    }
  })
}))

// Mock environment variables
process.env.MISTRAL_API_KEY = 'mock-mistral-key'
process.env.GOOGLE_API_KEY = 'mock-google-key'
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://mock.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'mock-anon-key'

// Global test utilities
global.mockFetch = (mockResponse) => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: jest.fn().mockResolvedValue(mockResponse),
    status: 200
  })
}

// Reset mocks before each test
beforeEach(() => {
  jest.clearAllMocks()
})
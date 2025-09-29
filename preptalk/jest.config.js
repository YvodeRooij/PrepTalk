// Jest Configuration for PrepTalk CV Pipeline Tests

const nextJest = require('next/jest')

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files
  dir: './',
})

// Add any custom config to be passed to Jest
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  testMatch: [
    '<rootDir>/tests/**/*.test.{js,ts,tsx}',
    '<rootDir>/lib/**/*.test.{js,ts,tsx}',
    '<rootDir>/app/**/*.test.{js,ts,tsx}'
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  collectCoverageFrom: [
    'lib/services/mistral-ocr.ts',
    'lib/schemas/cv-analysis.ts',
    'app/api/cv/analyze/route.ts',
    'app/api/curriculum/generate/route.ts',
    'components/research/job-input-form.tsx',
    'app/(dashboard)/curriculum/page.tsx'
  ],
  coverageReporters: ['text', 'lcov', 'html'],
  verbose: true,
  testTimeout: 30000 // 30 seconds for integration tests
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig)
#!/bin/bash
# Save this as: create-files.sh
# Run with: bash create-files.sh

# Root config files
cat > middleware.ts << 'EOF'
// middleware.ts - Runs on every request (keep lightweight!)
// Only refreshes Supabase auth session, NO rate limiting here
export { auth as middleware } from '@/lib/auth/middleware'

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
EOF

cat > .env.local << 'EOF'
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key

# AI APIs
OPENAI_API_KEY=
ELEVENLABS_API_KEY=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
EOF

# App folder pages
echo "// Login page with Supabase Auth" > app/\(auth\)/login/page.tsx
echo "// Signup page with email verification" > app/\(auth\)/signup/page.tsx
echo "// Password reset flow" > app/\(auth\)/reset-password/page.tsx
echo "// Auth layout - redirects if already logged in" > app/\(auth\)/layout.tsx

echo "// Dashboard home - shows credits prominently" > app/\(dashboard\)/page.tsx
echo "// Protected dashboard layout with sidebar" > app/\(dashboard\)/layout.tsx
echo "// User profile management" > app/\(dashboard\)/profile/page.tsx
echo "// Credit balance and history" > app/\(dashboard\)/credits/page.tsx
echo "// Purchase more credits" > app/\(dashboard\)/credits/purchase/page.tsx
echo "// List of interview sessions" > app/\(dashboard\)/interviews/page.tsx
echo "// Start new interview (checks credits)" > app/\(dashboard\)/interviews/start/page.tsx
echo "// Individual session details" > "app/\(dashboard\)/interviews/\[sessionId\]/page.tsx"
echo "// Practice interview interface" > "app/\(dashboard\)/interviews/\[sessionId\]/practice/page.tsx"
echo "// Analysis results" > "app/\(dashboard\)/interviews/\[sessionId\]/results/page.tsx"
echo "// New interview setup" > app/\(dashboard\)/interviews/new/page.tsx
echo "// View all curricula" > app/\(dashboard\)/curriculum/page.tsx
echo "// Specific curriculum details" > "app/\(dashboard\)/curriculum/\[curriculumId\]/page.tsx"

# API Routes
echo "export async function GET() { return Response.json({ status: 'ok' }) }" > app/api/health/route.ts
echo "// Supabase auth callback handler" > app/api/auth/callback/route.ts
echo "// Signout handler" > app/api/auth/signout/route.ts

echo "// GET: Check credit balance" > app/api/credits/balance/route.ts
echo "// POST: Use a credit atomically" > app/api/credits/use/route.ts
echo "// POST: Purchase credits" > app/api/credits/purchase/route.ts
echo "// GET: Transaction history" > app/api/credits/history/route.ts

echo "// POST: Use credit & start interview" > app/api/interviews/start/route.ts
echo "// GET/PATCH: Session management" > "app/api/interviews/\[sessionId\]/route.ts"
echo "// POST: Mark session complete" > "app/api/interviews/\[sessionId\]/complete/route.ts"
echo "// POST: End interview early" > "app/api/interviews/\[sessionId\]/end/route.ts"
echo "// POST: Save transcript" > app/api/interviews/transcript/route.ts

echo "// POST: Research job/company" > app/api/research/route.ts
echo "// GET: Fetch research results" > "app/api/research/\[jobId\]/route.ts"

echo "// POST: Generate curriculum (uses credit)" > app/api/curriculum/generate/route.ts
echo "// GET: Fetch curriculum" > "app/api/curriculum/\[curriculumId\]/route.ts"

echo "// POST: Analyze performance" > app/api/analysis/route.ts
echo "// GET: Fetch analysis" > "app/api/analysis/\[analysisId\]/route.ts"

echo "// Stripe webhook handler" > app/api/webhooks/stripe/route.ts
echo "// ElevenLabs webhook" > app/api/webhooks/elevenlabs/route.ts
echo "// Cron job endpoint" > app/api/webhooks/cron/route.ts

echo "// GET: Subscription tiers" > app/api/tiers/route.ts

# Component files
echo "// Shadcn UI button component" > components/ui/button.tsx
echo "// Shadcn UI card component" > components/ui/card.tsx

echo "// Sign in/out button" > components/auth/auth-button.tsx
echo "// Reusable auth form" > components/auth/auth-form.tsx
echo "// User dropdown menu" > components/auth/user-nav.tsx

echo "// Shows current credit balance" > components/credits/credit-display.tsx
echo "// Low credit warnings" > components/credits/credit-alert.tsx
echo "// Transaction history table" > components/credits/credit-history.tsx
echo "// Buy credits modal" > components/credits/purchase-modal.tsx

echo "// ElevenLabs voice interface" > components/interview/voice-interface.tsx
echo "// Interview timer display" > components/interview/session-timer.tsx
echo "// Start button with credit check" > components/interview/start-interview-button.tsx
echo "// Current question display" > components/interview/question-display.tsx
echo "// Round progress bar" > components/interview/progress-bar.tsx

echo "// Curriculum preview card" > components/curriculum/curriculum-card.tsx
echo "// Round details display" > components/curriculum/round-details.tsx
echo "// User progress tracker" > components/curriculum/progress-tracker.tsx

echo "// Job URL/details input form" > components/research/job-input-form.tsx
echo "// Research progress indicator" > components/research/research-status.tsx
echo "// Company info preview card" > components/research/company-preview.tsx

echo "// Reusable loading spinner" > components/shared/loading-spinner.tsx
echo "// Error boundary wrapper" > components/shared/error-boundary.tsx
echo "// Empty state component" > components/shared/empty-state.tsx

# Library files
echo "// Browser Supabase client for Client Components" > lib/supabase/client.ts
echo "// Server Supabase client for Server Components/Routes" > lib/supabase/server.ts
echo "// Middleware Supabase client (lightweight)" > lib/supabase/middleware.ts
echo "// Admin client with service role key" > lib/supabase/admin.ts
echo "// TypeScript types from database" > lib/supabase/types.ts

echo "// Server actions for auth" > lib/auth/actions.ts
echo "// React hooks for auth" > lib/auth/hooks.ts
echo "// Route protection guards" > lib/auth/guards.ts
echo "// Session management helpers" > lib/auth/session.ts
echo "// Middleware auth refresh" > lib/auth/middleware.ts

echo "// Custom error classes" > lib/api/errors.ts
echo "// Standardized API responses" > lib/api/response.ts
echo "// HOCs for route protection" > lib/api/protection.ts

echo "// Subscription tier definitions" > lib/tiers/config.ts
echo "// Rate limits per tier" > lib/tiers/limits.ts
echo "// Tier validation functions" > lib/tiers/checker.ts

echo "// Credit operations manager" > lib/credits/manager.ts
echo "// Credit validation functions" > lib/credits/validators.ts
echo "// Credit system types" > lib/credits/types.ts
echo "// Credit packages/tiers" > lib/credits/constants.ts

echo "// Main curriculum generator" > lib/agents/curriculum/index.ts
echo "// Requirements parser" > lib/agents/curriculum/parser.ts
echo "// Company/role researcher" > lib/agents/curriculum/researcher.ts
echo "// Curriculum structurer" > lib/agents/curriculum/structurer.ts
echo "// Curriculum types" > lib/agents/curriculum/types.ts

echo "// Main performance analyzer" > lib/agents/analysis/index.ts
echo "// Performance evaluator" > lib/agents/analysis/evaluator.ts
echo "// Feedback generator" > lib/agents/analysis/feedback-generator.ts
echo "// Analysis types" > lib/agents/analysis/types.ts

echo "// User-related queries" > lib/database/queries/users.ts
echo "// Company queries" > lib/database/queries/companies.ts
echo "// Job queries" > lib/database/queries/jobs.ts
echo "// Curriculum queries" > lib/database/queries/curricula.ts
echo "// Session queries" > lib/database/queries/sessions.ts
echo "// Credit queries" > lib/database/queries/credits.ts
echo "// Transaction queries" > lib/database/queries/transactions.ts
echo "// Zod schemas for validation" > lib/database/schema.ts

echo "// Job posting scraper" > lib/scraping/job-scraper.ts
echo "// Company info gatherer" > lib/scraping/company-intel.ts
echo "// HTML/text parsers" > lib/scraping/parsers.ts

echo "// ElevenLabs integration" > lib/voice/elevenlabs.ts
echo "// Transcript processing" > lib/voice/transcription.ts
echo "// Voice-related types" > lib/voice/types.ts

echo "// Stripe integration" > lib/payments/stripe.ts
echo "// Subscription management" > lib/payments/subscription.ts
echo "// Usage tracking" > lib/payments/usage.ts

echo "// App-wide constants" > lib/utils/constants.ts
echo "// Utility functions" > lib/utils/helpers.ts
echo "// Input validation schemas" > lib/utils/validation.ts

# Hooks
echo "// Current user hook" > hooks/use-user.ts
echo "// Subscription status hook" > hooks/use-subscription.ts
echo "// Interview session hook" > hooks/use-interview.ts
echo "// Curriculum data hook" > hooks/use-curriculum.ts
echo "// Credit balance hook" > hooks/use-credits.ts
echo "// Check if can start interview" > hooks/use-can-start-interview.ts

# Types
echo "// Database types from Supabase" > types/database.ts
echo "// API request/response types" > types/api.ts
echo "// Application-specific types" > types/app.ts
echo "// Credit system types" > types/credits.ts

# Config
echo "// Site metadata and config" > config/site.ts
echo "// Subscription tiers config" > config/tiers.ts

# Supabase Edge Functions
echo "// Monthly credit reset function" > supabase/functions/reset-monthly-credits/index.ts
echo "// Process Stripe payments" > supabase/functions/process-stripe-webhook/index.ts
echo "// Heavy analysis processing" > supabase/functions/analyze-heavy/index.ts

echo "✅ All files created with boilerplate comments!"
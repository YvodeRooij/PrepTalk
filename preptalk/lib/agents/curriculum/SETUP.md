# Curriculum Agent Setup Guide

## 🚀 Quick Setup

### 1. Set Environment Variables

Add to your `.env.local`:
```bash
# Required for Curriculum Agent
GOOGLE_AI_API_KEY=your-gemini-api-key
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Optional
NODE_ENV=development
```

### 2. Run Database Setup

Copy the SQL from `schema-functions.sql` and run in Supabase SQL Editor:

```sql
-- This creates functions for runtime schema validation
-- Run the entire contents of schema-functions.sql
```

### 3. Verify Database Tables

The agent expects these tables to exist:
- `curricula` - Main curriculum records
- `curriculum_rounds` - Individual interview rounds
- `jobs` - Job postings
- `user_profiles` - User credit balances
- `credit_transactions` - Credit usage history

If tables are missing, the schema validator will provide CREATE TABLE statements.

## 📋 Testing

### Local Testing

```bash
# Run the test script
npx tsx lib/agents/curriculum/test.ts

# Or with environment variables
GOOGLE_AI_API_KEY=xxx npx tsx lib/agents/curriculum/test.ts
```

### API Testing

```bash
# Test endpoint status
curl http://localhost:3000/api/curriculum/generate

# Generate curriculum (requires auth)
curl -X POST http://localhost:3000/api/curriculum/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "input": "Software Engineer at Google"
  }'
```

## 🎯 Usage Examples

### 1. With Job URL
```javascript
const response = await fetch('/api/curriculum/generate', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    input: 'https://careers.google.com/jobs/results/12345'
  })
});
```

### 2. With Job Description
```javascript
const response = await fetch('/api/curriculum/generate', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    input: 'Senior React Developer at Spotify in Amsterdam'
  })
});
```

### 3. With Options
```javascript
const response = await fetch('/api/curriculum/generate', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    input: 'KLM flight attendant',
    options: {
      skipSchemaValidation: true,  // Skip DB validation
      forceSchemaValidation: true  // Force revalidation
    }
  })
});
```

## 📊 Response Format

### Success Response
```json
{
  "success": true,
  "curriculum_id": "uuid",
  "credits_used": 10,
  "remaining_credits": 90,
  "generation_time": 45.2,
  "curriculum": {
    "id": "uuid",
    "title": "Software Engineer at Google",
    "overview": "Comprehensive preparation curriculum...",
    "total_rounds": 5,
    "difficulty_level": "advanced",
    "quality_score": 85,
    "rounds": [
      {
        "round_number": 1,
        "round_type": "phone_screen",
        "title": "Initial Phone Screen",
        "duration_minutes": 30,
        "interviewer_persona": {...},
        "topics_to_cover": [...],
        "evaluation_criteria": [...],
        "sample_questions": [...]
      }
    ],
    "created_at": "2025-01-01T00:00:00Z"
  }
}
```

### Error Responses

#### Insufficient Credits (402)
```json
{
  "error": "Insufficient credits",
  "required": 10,
  "available": 5
}
```

#### Schema Validation Failed (503)
```json
{
  "error": "Database schema mismatch",
  "details": "The database schema needs to be updated. Please contact support.",
  "technical": "Missing column 'quality_score' in table 'curricula'"
}
```

## 🔧 Troubleshooting

### Schema Validation Errors

If you see schema validation errors:

1. **Check the console output** - It will show missing tables/columns
2. **Run suggested SQL** - The validator provides CREATE TABLE/ALTER TABLE statements
3. **Or skip validation** in development:
   ```javascript
   const agent = createCurriculumAgent(url, key, apiKey, {
     skipSchemaValidation: true
   });
   ```

### Common Issues

| Issue | Solution |
|-------|----------|
| "Missing GOOGLE_AI_API_KEY" | Add Gemini API key to .env.local |
| "Schema validation failed" | Run schema-functions.sql in Supabase |
| "Table 'curricula' does not exist" | Check database migrations |
| "Insufficient credits" | Add credits to user profile |
| "Generation timeout" | Increase timeout (can take 30-60s) |

### Debug Mode

Set `NODE_ENV=development` for:
- Detailed error messages
- Schema validation warnings (not failures)
- Request/response logging

## 🏗️ Architecture

```
User Input (URL or Text)
    ↓
Discovery Phase
- Classify input type
- Find relevant sources
- Fetch & validate data
    ↓
Research Phase
- Parse job details
- Analyze role patterns
    ↓
Generation Phase
- Design structure
- Generate rounds
- Evaluate quality
    ↓
Persistence Phase
- Save to database
- Return curriculum ID
```

## 📝 Credits System

- **Curriculum Generation**: 10 credits
- **Credits are deducted** after successful generation
- **Transaction recorded** in credit_transactions table
- **Insufficient credits** returns 402 status

## 🔐 Security

- Authentication via Clerk
- Service role key for database writes
- Input validation and sanitization
- Schema validation prevents SQL injection
- Rate limiting (if configured)

## 📈 Performance

- Generation time: 30-60 seconds typical
- Caches schema validation for 5 minutes
- Parallel source fetching
- Quality refinement loop (max 2 iterations)

## 🚦 Next Steps

1. **Deploy to production** - Ensure all env vars are set
2. **Monitor performance** - Track generation times
3. **Adjust credit costs** - Based on actual API usage
4. **Add rate limiting** - Prevent abuse
5. **Set up monitoring** - Track errors and usage
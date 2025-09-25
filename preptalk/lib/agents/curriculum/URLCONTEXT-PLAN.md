# URL Context Implementation Plan

## Current Issues
1. **Wrong API**: Using `fileData.fileUri` (for uploaded files) instead of `url_context` tool
2. **Wrong format**: Building custom tool objects instead of using the official format
3. **No URL validation**: Not checking if URLs are accessible before sending

## Correct Implementation

### 1. Fix the URL Context Helper
```typescript
// CORRECT: URL context as a tool
function buildUrlContextRequest(urls: string[], prompt: string) {
  // URLs must be in the prompt text
  const urlList = urls.map(url => `- ${url}`).join('\n');
  const enhancedPrompt = `${prompt}\n\nAnalyze these URLs:\n${urlList}`;

  return {
    contents: [{
      role: 'user',
      parts: [{ text: enhancedPrompt }]
    }],
    tools: [{ url_context: {} }]  // Enable URL context tool
  };
}
```

### 2. Update parseJob Function
```typescript
export async function parseJob(state: CurriculumState): Promise<Partial<CurriculumState>> {
  const model = getGenAI().getGenerativeModel({
    model: 'gemini-2.5-flash',
    // Remove responseMimeType when using tools
  });

  const jobUrl = bestSource.url;

  if (jobUrl && jobUrl.startsWith('http')) {
    // Use URL context tool
    const prompt = `Extract job details from this posting: ${jobUrl}

    Return as JSON:
    {
      "title": "...",
      "company_name": "...",
      // etc
    }`;

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      tools: [{ url_context: {} }]
    });
  } else {
    // Fallback to structured data
    const prompt = `Extract job details from: ${JSON.stringify(bestSource.data)}`;
    const result = await model.generateContent(prompt);
  }
}
```

### 3. URL Validation
```typescript
async function isUrlAccessible(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok && !response.url.includes('login');
  } catch {
    return false;
  }
}
```

## Limitations to Document

### Supported URLs
- Public websites without authentication
- Static content (HTML, JSON, XML, CSS, JS)
- PDFs and images
- Maximum 20 URLs per request
- Maximum 34MB per URL

### NOT Supported
- Paywalled content
- Login-required pages (LinkedIn jobs, most job boards)
- YouTube videos
- Google Workspace files
- Dynamic JavaScript-rendered content

## Migration Steps

1. **Update helpers** - Create proper URL context request builders
2. **Fix parseJob** - Use url_context tool correctly
3. **Fix analyzeRole** - Same pattern as parseJob
4. **Update tests** - Test with actually accessible URLs
5. **Document limitations** - Be clear about what works/doesn't

## Fallback Strategy

Since most job sites require login or block crawlers:
1. **Primary**: User provides job description text
2. **Secondary**: Try URL context (might work for some sites)
3. **Tertiary**: Use structured data from our database

## Test URLs That Should Work
```typescript
const workingUrls = [
  'https://example.com/public-page.html',
  'https://raw.githubusercontent.com/user/repo/main/file.md',
  'https://en.wikipedia.org/wiki/Topic',
  // Most job sites WON'T work due to auth/crawling restrictions
];
```

## Next Steps
1. Implement correct URL context tool usage
2. Add URL accessibility checker
3. Update documentation with realistic expectations
4. Consider implementing proper web scraping as primary solution
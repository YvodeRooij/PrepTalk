# Enhanced Research Strategy with Google Search Grounding

## Current vs Enhanced Research

### Current (Limited)
```
User: "Netflix Tax Analyst URL"
→ Extract job details from URL
→ Generate basic curriculum
```

### Enhanced (Comprehensive)
```
User: "Netflix Tax Analyst URL"
→ Extract job details from URL
→ Search for Netflix culture & values
→ Find recent Netflix news & changes
→ Research Netflix interview process
→ Look up tax analyst salary ranges
→ Find candidate interview experiences
→ Research Netflix tax team structure
→ Generate comprehensive curriculum
```

## Google Search Integration Plan

### 1. Company Research Queries
```javascript
const companyQueries = [
  `${company} company culture 2024 2025`,
  `${company} recent news layoffs hiring`,
  `${company} interview process ${role}`,
  `${company} glassdoor reviews recent`,
  `${company} employee experiences reddit blind`,
  `${company} ${department} team structure`
];
```

### 2. Role-Specific Research
```javascript
const roleQueries = [
  `${role} interview questions ${company}`,
  `${role} salary ${location} 2024 2025`,
  `${role} skills requirements trends`,
  `${company} ${role} job expectations`,
  `${role} interview preparation guide`,
  `${role} technical assessment examples`
];
```

### 3. Market Intelligence
```javascript
const marketQueries = [
  `${role} market demand ${location}`,
  `${company} competitors ${role} comparison`,
  `${industry} trends affecting ${role}`,
  `${role} career progression ${company}`
];
```

## Implementation Strategy

### Enhanced Discovery Node
```typescript
async function enhancedDiscovery(state: CurriculumState) {
  // Step 1: Extract basic job info (current)
  const jobData = await parseJob(state);

  // Step 2: Generate comprehensive search queries
  const searchQueries = buildSearchQueries(jobData);

  // Step 3: Execute searches with URL context
  const searchResults = await searchWithUrlContext(searchQueries);

  // Step 4: Synthesize comprehensive company intelligence
  return synthesizeIntelligence(jobData, searchResults);
}

async function searchWithUrlContext(queries: string[]) {
  const model = getGenAI().getGenerativeModel({
    model: 'gemini-2.5-flash',
  });

  return await model.generateContent({
    contents: [{
      role: 'user',
      parts: [{ text: queries.join('\n') }]
    }],
    tools: [
      { googleSearch: {} },
      { urlContext: {} }
    ]
  });
}
```

## Research Categories

### 1. Company Intelligence
- **Culture & Values**: Real employee experiences, not marketing
- **Recent Changes**: Layoffs, acquisitions, strategy pivots
- **Leadership**: New executives, team changes
- **Financial Health**: Growth, challenges, market position

### 2. Interview Intelligence
- **Process**: Number of rounds, typical flow
- **Experiences**: Recent candidate feedback
- **Questions**: Actual questions asked
- **Difficulty**: Pass rates, preparation time needed

### 3. Role Intelligence
- **Market Data**: Salary ranges, demand
- **Skills Evolution**: Trending requirements
- **Career Path**: Progression opportunities
- **Day-to-Day**: Actual responsibilities vs job description

### 4. Competitive Intelligence
- **Benchmarking**: Similar roles elsewhere
- **Differentiation**: What makes this role unique
- **Alternatives**: Other companies, roles to compare

## Enhanced Curriculum Output

### Before (Basic)
```
- 4 interview rounds
- Focus on tax compliance
- Basic behavioral questions
```

### After (Comprehensive)
```
- 4 rounds based on recent Netflix interview data
- Tax compliance + Netflix's international expansion focus
- Cultural fit questions specific to Netflix values
- Recent company challenges affecting tax strategy
- Salary negotiation data ($X-Y range in Amsterdam)
- Specific technical questions from recent candidates
- Team dynamics and reporting structure insights
```

## User Experience Impact

### Research Quality
- **10x more comprehensive** company intelligence
- **Real-time insights** vs static job description
- **Competitive context** for salary negotiation
- **Actual interview experiences** from recent candidates

### Curriculum Relevance
- **Current events** affecting the company/role
- **Specific preparation** based on recent interview patterns
- **Realistic expectations** from actual employee feedback
- **Strategic insights** beyond basic job requirements

## Implementation Priority

1. **Phase 1**: Basic Google Search integration
2. **Phase 2**: URL context + search combination
3. **Phase 3**: Intelligence synthesis and ranking
4. **Phase 4**: Real-time updates and caching

This transforms our curriculum agent from a basic job parser into a comprehensive intelligence platform for interview preparation.
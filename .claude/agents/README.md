# PrepTalk Subagents - Team Guide

This directory contains 7 specialized AI subagents designed to help PrepTalk reach Release Candidate (RC) status. Each agent has a focused role based on 2025 industry best practices for multi-agent systems.

## Quick Start

### Invoking Subagents

You can invoke subagents directly from Claude Code:

```
@tester Please write E2E tests for the curriculum generation flow

@system-architect Should we use Redis or Upstash for caching?

@coder Implement background job processing for curriculum generation

@code-reviewer Review the changes in lib/providers/llm-provider-service.ts

@security-reviewer Audit the API routes for authentication vulnerabilities

@tech-lead What are the critical blockers for RC? Create an action plan.

@ux-reviewer Review the dashboard page for usability issues
```

## The Team

### 1. 🧪 Tester (`tester.md`)
**Role**: Autonomous testing specialist for E2E validation, test generation, and quality assurance

**When to use**:
- Writing new tests (unit, integration, E2E)
- Debugging test failures
- Verifying bug fixes
- Checking test coverage
- Running performance benchmarks

**Tools**: Read, Write, Edit, Bash, Glob, Grep

**Example**:
```
@tester Write E2E test to verify that:
1. Gemini url_context fetches real job data
2. OpenAI structured parsing works
3. Curriculum is saved to database
4. Dashboard displays the curriculum
```

---

### 2. 🏗️ System Architect (`system-architect.md`)
**Role**: Enterprise architecture specialist for system design, scalability, and technical decision-making

**When to use**:
- Designing new features
- Making technology choices
- Optimizing performance
- Reviewing architecture decisions
- Planning scalability

**Tools**: Read, Glob, Grep, WebSearch, WebFetch

**Example**:
```
@system-architect We need to handle curriculum generation in the background to avoid API timeouts.

Should we use:
1. BullMQ + Redis
2. Inngest (serverless)
3. Vercel Queue

Consider cost, complexity, and our current stack.
```

---

### 3. 💻 Coder (`coder.md`)
**Role**: Implementation specialist for feature development, bug fixes, and code optimization

**When to use**:
- Implementing new features
- Fixing bugs
- Refactoring code
- Writing integration code
- Optimizing performance

**Tools**: Read, Write, Edit, Bash, Glob, Grep

**Example**:
```
@coder Fix the issue where Anthropic provider isn't being called for unified_context_engine.

Investigation shows:
- Config specifies 'anthropic' provider
- Logs show "Fallback to gemini"
- Anthropic balance hasn't changed

Debug and fix the provider initialization.
```

---

### 4. 👀 Code Reviewer (`code-reviewer.md`)
**Role**: Code quality specialist focused on best practices, maintainability, and technical excellence

**When to use**:
- Reviewing pull requests
- Checking code quality
- Validating best practices
- Identifying technical debt
- Ensuring consistency

**Tools**: Read, Glob, Grep

**Example**:
```
@code-reviewer Review the two-step grounding implementation in:
- lib/providers/llm-provider-service.ts
- lib/agents/curriculum/nodes/discovery.ts

Check for:
- Error handling completeness
- Type safety
- Performance considerations
- Maintainability
```

---

### 5. 🔒 Security Reviewer (`security-reviewer.md`)
**Role**: Security specialist focused on defensive patterns, vulnerability prevention, and secure coding

**When to use**:
- Security audits
- Vulnerability assessment
- Auth/authorization review
- API security checks
- Compliance verification

**Tools**: Read, Glob, Grep, WebSearch

**Example**:
```
@security-reviewer Audit the curriculum generation API route:
- Authentication checks
- Input validation
- RLS policy enforcement
- API key security
- Error message information leakage
```

---

### 6. 👔 Tech Lead (`tech-lead.md`)
**Role**: Technical leadership and coordination specialist. Orchestrates team efforts and drives toward RC

**When to use**:
- Overall project coordination
- Technical decision making
- Priority setting
- Blocker resolution
- Release planning

**Tools**: Read, Write, Bash, Glob, Grep, Task, WebSearch

**Example**:
```
@tech-lead We have 3 critical issues blocking RC:
1. Anthropic not being called
2. Prep guide generation taking 15+ minutes
3. Incomplete test coverage

Create an action plan to resolve these and coordinate the team.
```

---

### 7. 🎨 UX Reviewer (`ux-reviewer.md`)
**Role**: User experience specialist focused on usability, accessibility, and interface design

**When to use**:
- UI/UX reviews
- Accessibility audits
- Usability testing
- Mobile responsiveness
- User flow optimization

**Tools**: Read, Glob, Grep, WebSearch

**Example**:
```
@ux-reviewer Review the curriculum creation flow:
1. Job URL input page
2. Generation progress page (45-60s wait)
3. Curriculum preview/edit page
4. Dashboard display

Check for:
- Clear feedback during long wait
- Error handling UX
- Mobile responsiveness
- Accessibility (WCAG 2.2 AA)
```

## Multi-Agent Workflows

### Feature Development
```
@tech-lead → @system-architect → @coder → @tester → @code-reviewer → @security-reviewer
```

### Bug Fix
```
@tester → @tech-lead → @coder → @tester → @code-reviewer
```

### Architecture Decision
```
@tech-lead → @system-architect → [Team Discussion] → @tech-lead
```

### Security Audit
```
@tech-lead → @security-reviewer → @coder (fixes) → @security-reviewer → @tech-lead
```

## Best Practices

### 1. Use the Right Agent for the Task
Don't ask the Coder to make architecture decisions - that's the System Architect's role.

### 2. Provide Context
Give agents relevant information:
- File paths
- Error messages
- Expected vs actual behavior
- Related PRs/issues

### 3. Be Specific
❌ Bad: "@coder fix the bug"
✅ Good: "@coder Fix the 503 timeout issue in llm-provider-service.ts line 250"

### 4. Coordinate Complex Tasks
For large features, start with Tech Lead to create a plan, then delegate to specialists.

### 5. Verify Results
Always check agent output:
- Run tests after code changes
- Review architectural recommendations
- Validate security fixes

## Current Priority Tasks (RC Blockers)

### Critical
1. **Fix Anthropic Provider** - Assign to @coder + @tester
2. **Optimize Prep Guide Generation** - Assign to @system-architect + @coder
3. **Complete E2E Tests** - Assign to @tester
4. **Verify Gemini url_context in Production** - Assign to @tester + @tech-lead

### High
5. **Add Background Job Processing** - Assign to @system-architect (design)
6. **Implement Caching Layer** - Assign to @system-architect + @coder
7. **Security Audit** - Assign to @security-reviewer
8. **UX Review** - Assign to @ux-reviewer

## RC Progress Tracking

Current Status: **40% Complete**

**Criteria Met** (6/15):
- ✅ LangGraph workflow working
- ✅ Two-step grounding functional
- ✅ Database schema complete
- ✅ Dashboard displaying data
- ✅ Fail-fast error handling
- ✅ RLS policies configured

**Critical Blockers** (4):
- ❌ Anthropic provider initialization
- ❌ Prep guide generation optimization
- ❌ E2E tests comprehensive
- ❌ Gemini production verification

**Estimated Time to RC**: 2-3 weeks

## Agent Capabilities Summary

| Agent | Model | Tools | Implementation | Testing | Architecture | Security | UX |
|-------|-------|-------|---------------|---------|--------------|----------|-----|
| Tester | Sonnet | 7 + MultiEdit | - | ⭐⭐⭐ | - | - | - |
| System Architect | **Opus** | 5 | - | - | ⭐⭐⭐ | ⭐ | ⭐ |
| Coder | Sonnet | 7 + MultiEdit | ⭐⭐⭐ | ⭐ | - | - | - |
| Code Reviewer | Sonnet | 3 (read-only) | ⭐ | ⭐ | ⭐ | ⭐ | ⭐ |
| Security Reviewer | **Opus** | 4 | - | ⭐ | ⭐ | ⭐⭐⭐ | - |
| Tech Lead | **Opus** | 5 (no Write/Bash) | ⭐ | ⭐ | ⭐⭐ | ⭐ | ⭐ |
| UX Reviewer | Sonnet | 4 | - | - | - | - | ⭐⭐⭐ |

**Model Strategy**: Opus (43%) for critical reasoning, Sonnet (57%) for balanced work

## Research-Backed Approach

These subagents follow 2025 industry best practices:

**Multi-Agent Architecture** (Microsoft, Google, OpenAI)
- Single, focused responsibilities
- Clear boundaries and interaction patterns
- Microservices-inspired design

**Agentic AI Trends** (Gartner, InfoQ, 2025)
- 33% of enterprise apps will use agentic AI by 2028
- 43% already use multi-agent systems
- Autonomous testing and code review standard practice

**Production-Ready Patterns** (Claude Docs, Best Practices)
- YAML frontmatter for configuration
- Precise system prompts
- Minimal tool access (principle of least privilege)
- Stateless, composable agents

## Support

Need help with subagents?
- Check individual agent files for detailed capabilities
- Review examples in this README
- Ask Tech Lead for coordination help

Remember: **These agents are here to help you ship PrepTalk to RC. Use them liberally!**
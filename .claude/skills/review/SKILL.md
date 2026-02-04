---
name: review
description: Perform a comprehensive code review with security, accessibility, and compliance checklists
allowed-tools:
  - Read
  - Glob
  - Grep
  - Bash
argument-hint: "[file|pattern|--security|--a11y|--compliance]"
user-invocable: true
context: fork
agent: general-purpose
---

# Code Review Skill

Perform a comprehensive code review focusing on security, accessibility, performance, and compliance.

## Files to Review
!`git diff --staged --name-only 2>/dev/null || git diff --name-only HEAD~1 2>/dev/null`

## Instructions

1. **Identify files to review:**
   - If `$ARGUMENTS` provided, review that file/pattern
   - Otherwise, review staged changes or recent commit (shown above)

2. **Read and analyze the code:**
   - Read each file completely
   - Understand the context and purpose
   - Check against project conventions in CLAUDE.md

3. **Run through checklists based on flags:**
   - `--security`: Focus on security only
   - `--a11y`: Focus on accessibility only
   - `--compliance`: Focus on compliance only
   - No flag: Run all checklists

## Security Checklist

- [ ] **Input Validation:** All user input validated with Zod schemas
- [ ] **No Secrets:** No API keys, passwords, or tokens in code
- [ ] **Rate Limiting:** Auth operations check rate limiter
- [ ] **Audit Logging:** Security events logged via auditLogger
- [ ] **SQL Injection:** Using parameterized queries only
- [ ] **XSS Prevention:** HTML sanitized with DOMPurify
- [ ] **Auth Checks:** Protected routes verify session
- [ ] **RBAC:** Permission checks for sensitive operations
- [ ] **RLS Policies:** New tables have Row-Level Security

## Accessibility Checklist (WCAG 2.1 AA)

- [ ] **ARIA Labels:** Interactive elements have accessible names
- [ ] **Keyboard Nav:** All functionality accessible via keyboard
- [ ] **Focus Indicators:** Visible focus states (ring-2)
- [ ] **Color Contrast:** Text meets 4.5:1 ratio minimum
- [ ] **Error Messages:** Connected with aria-describedby
- [ ] **Form Labels:** All inputs have associated labels
- [ ] **Semantic HTML:** Proper heading hierarchy, landmarks
- [ ] **Screen Reader:** Content makes sense when read aloud

## Performance Checklist

- [ ] **React.memo:** Route pages wrapped with memo
- [ ] **Memoization:** Expensive calculations use useMemo/useCallback
- [ ] **Code Splitting:** Large components lazy loaded
- [ ] **Image Optimization:** Images properly sized and formatted
- [ ] **Bundle Impact:** No unnecessarily large dependencies added
- [ ] **Query Optimization:** Database queries have proper indexes
- [ ] **Caching:** Appropriate staleTime for React Query

## Compliance Checklist

### TCPA (SMS)
- [ ] Prior written consent obtained and recorded
- [ ] Opt-out (STOP) honored immediately
- [ ] Delivery time within 8 AM - 9 PM recipient timezone
- [ ] Company identification included

### CAN-SPAM (Email)
- [ ] Clear sender identification
- [ ] Physical postal address included
- [ ] Unsubscribe mechanism present
- [ ] Honest subject line

### GDPR (Data)
- [ ] Consent tracked with timestamp
- [ ] Data export functionality
- [ ] Data deletion capability
- [ ] Audit trail maintained

### SOC 2
- [ ] Audit logging for all data access
- [ ] Authentication events logged
- [ ] Session management secure
- [ ] Data encrypted in transit (TLS)

## Code Quality Checklist

- [ ] **TypeScript:** No `any` types, proper interfaces
- [ ] **Naming:** Follows project conventions
- [ ] **Error Handling:** Try-catch with proper error types
- [ ] **Tests:** New code has corresponding tests
- [ ] **Documentation:** Complex logic has comments
- [ ] **Imports:** Ordered correctly (React → libs → internal)

## Output Format

```markdown
# Code Review: [filename]

## Summary
[Brief description of what the code does]

## Security
[Findings with file:line references]

## Accessibility
[Findings with file:line references]

## Performance
[Findings with file:line references]

## Compliance
[Findings with file:line references]

## Code Quality
[Findings with file:line references]

## Recommendations
1. [Priority 1 - Must fix]
2. [Priority 2 - Should fix]
3. [Priority 3 - Consider]

## Verdict
[ ] Approved
[ ] Approved with suggestions
[ ] Changes requested
```

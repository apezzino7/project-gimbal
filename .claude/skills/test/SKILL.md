---
name: test
description: Run relevant tests based on changed files and show coverage
allowed-tools:
  - Bash
  - Read
  - Glob
  - Grep
argument-hint: "[all|coverage|e2e|pattern]"
user-invocable: true
context: fork
agent: general-purpose
---

# Smart Test Runner Skill

Run tests intelligently based on what has changed.

## Current Changes
!`git diff --name-only HEAD 2>/dev/null | grep -E '\.(ts|tsx)$' | head -20`

## Instructions

1. **Parse arguments:**
   - Empty: Run tests for changed files
   - `all`: Run all tests
   - `coverage`: Run with full coverage report
   - `e2e`: Run Cypress E2E tests
   - `<pattern>`: Run tests matching pattern

2. **Detect changed files:**
   ```bash
   git diff HEAD --name-only | grep -E '\.(ts|tsx)$'
   ```

3. **Map changed files to test files:**

   | Source Pattern | Test Pattern |
   |---------------|--------------|
   | `src/utils/validation.ts` | `src/utils/__tests__/validation.test.ts` |
   | `src/hooks/useAuth.ts` | `src/hooks/__tests__/useAuth.test.ts` |
   | `src/components/Toast.tsx` | `src/components/__tests__/Toast.test.tsx` |
   | `src/pages/LoginPage.tsx` | `cypress/e2e/login.cy.ts` |

4. **Check if test files exist:**
   ```bash
   ls src/utils/__tests__/validation.test.ts 2>/dev/null
   ```

5. **Run related unit tests:**
   ```bash
   # Run specific test files
   npx vitest run src/utils/__tests__/validation.test.ts --reporter=verbose

   # Or run tests matching a pattern
   npx vitest run --reporter=verbose -t "validation"
   ```

6. **Show coverage for changed files:**
   ```bash
   npx vitest run --coverage --reporter=verbose
   ```

7. **If page components changed, suggest E2E:**
   ```bash
   npx cypress run --spec "cypress/e2e/login.cy.ts"
   ```

8. **Report results:**
   - Number of tests run
   - Pass/fail status
   - Coverage percentage for changed files
   - Missing test files (suggest creating them)

## Coverage Targets

- Overall: 70% minimum
- Critical paths (auth, security): 90% minimum
- New code: 80% minimum

Report if coverage falls below targets.

## Missing Tests

If a source file has no corresponding test file, output:

```
Missing test files detected:
- src/utils/newUtil.ts → Create: src/utils/__tests__/newUtil.test.ts

Would you like me to create test file templates?
```

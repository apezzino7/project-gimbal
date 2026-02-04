---
name: commit
description: Create a conventional commit with proper scope based on changed files
allowed-tools:
  - Bash
  - Read
  - Glob
argument-hint: "[optional message override]"
user-invocable: true
---

# Smart Commit Skill

Create a well-formatted conventional commit for staged changes.

## Current Git State
!`git status --short 2>/dev/null`

## Staged Changes
!`git diff --staged --stat 2>/dev/null`

## Instructions

1. **Check for staged changes:**
   If no changes are staged (empty output above), inform the user to stage files first.

2. **Analyze the changes:**
   ```bash
   git diff --staged
   ```

3. **Check for secrets/credentials:**
   Look for patterns that might indicate secrets:
   - API keys, tokens, passwords
   - .env files
   - Private keys
   - Connection strings

   If found, STOP and warn the user. Do NOT commit.

4. **Determine commit type:**
   - `feat`: New feature or capability
   - `fix`: Bug fix
   - `refactor`: Code change that neither fixes nor adds
   - `docs`: Documentation only
   - `test`: Adding or updating tests
   - `chore`: Build, config, dependencies
   - `style`: Formatting, missing semicolons
   - `perf`: Performance improvement

5. **Determine scope from changed files:**
   - `src/components/` → `components`
   - `src/pages/` → `pages`
   - `src/hooks/` → `hooks`
   - `src/services/` → `services`
   - `src/stores/` → `stores`
   - `src/utils/` → `utils`
   - `supabase/` → `db`
   - `src/**/campaign*/` → `campaigns`
   - `src/**/auth*/` → `auth`
   - `.claude/` → `claude`
   - Multiple areas → use most significant or omit scope

6. **Generate commit message:**
   Format: `type(scope): description`

   Rules:
   - Lowercase description, no period at end
   - Max 72 characters for first line
   - Use imperative mood ("add" not "added")
   - Focus on WHY not WHAT

7. **Create the commit:**
   ```bash
   git commit -m "$(cat <<'EOF'
   type(scope): brief description

   - Detail 1
   - Detail 2

   Co-Authored-By: Claude <noreply@anthropic.com>
   EOF
   )"
   ```

8. **Show result:**
   ```bash
   git log -1 --oneline
   ```

## Examples

**Single component change:**
```
feat(components): add Toast notification system
```

**Multiple files in same area:**
```
fix(auth): resolve session expiration handling

- Fix token refresh timing
- Add proper cleanup on logout
- Update audit logging
```

**Cross-cutting change:**
```
refactor: improve error handling across services

- Add custom error classes
- Standardize error responses
- Update error boundaries
```

## Arguments

`$ARGUMENTS` - Optional commit message override. If provided, use this message instead of generating one.

# Unit Tests for src/tools -- Plan

## Approach

1. **Enable coverage**: Remove `src/tools/**` from vitest.config.ts `coverage.exclude`
2. **deprecation-parser.ts**: Write comprehensive spec covering all branches (valid format, missing reason, missing REMOVE_AFTER prefix, invalid date, missing human reason, grace period within/beyond 24h)
3. **override.ts**: Write spec covering parseCodeOwners (empty, comments, multiple owners, @ stripping, inline comments), loadReviewsFromEnv (inline JSON, file, invalid), evaluateOverride (no owners, no reviews, matching/non-matching reviewers, phrase detection, state filtering), performOverrideEvaluation (sync path), performOverrideEvaluationAsync (async with fetch fallback)
4. **override-fetch.ts**: Write spec with global fetch mock covering success, missing env vars, API error, malformed response

## File layout

- `src/tools/schema/deprecation-parser.spec.ts`
- `src/tools/schema/override.spec.ts`
- `src/tools/schema/override-fetch.spec.ts`

## Risk assessment

- Low risk: all files are pure utility functions with no NestJS DI dependencies
- override-fetch.ts uses global `fetch` and `process.env` -- both easily mocked in Vitest
- override.ts uses `fs.existsSync`/`readFileSync` and `process.env` -- mock via vi.mock

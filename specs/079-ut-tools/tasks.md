# Unit Tests for src/tools -- Tasks

## Task 1: Remove coverage exclusion
- [ ] Remove `'src/tools/**'` from vitest.config.ts `coverage.exclude`

## Task 2: Write deprecation-parser.spec.ts
- [ ] Test: valid format returns parsed result
- [ ] Test: undefined/empty input returns error
- [ ] Test: missing pipe separator returns error
- [ ] Test: missing REMOVE_AFTER prefix returns error
- [ ] Test: invalid date format returns error
- [ ] Test: invalid date value returns error
- [ ] Test: missing human reason returns error
- [ ] Test: multiple pipe segments joined as human reason
- [ ] Test: grace period within 24h returns warning
- [ ] Test: grace period expired returns error

## Task 3: Write override.spec.ts
- [ ] Test parseCodeOwners: file not found returns empty
- [ ] Test parseCodeOwners: comment lines skipped
- [ ] Test parseCodeOwners: owners extracted, @ stripped
- [ ] Test parseCodeOwners: inline comments stripped
- [ ] Test parseCodeOwners: deduplication
- [ ] Test loadReviewsFromEnv: inline JSON
- [ ] Test loadReviewsFromEnv: file JSON
- [ ] Test loadReviewsFromEnv: invalid JSON
- [ ] Test loadReviewsFromEnv: no env vars returns empty
- [ ] Test evaluateOverride: no owners
- [ ] Test evaluateOverride: no reviews
- [ ] Test evaluateOverride: matching owner with phrase and APPROVED state
- [ ] Test evaluateOverride: non-owner with phrase rejected
- [ ] Test evaluateOverride: owner without phrase rejected
- [ ] Test evaluateOverride: owner with phrase but non-APPROVED state rejected
- [ ] Test performOverrideEvaluation: sync path with no reviews
- [ ] Test performOverrideEvaluationAsync: falls back to fetchGitHubReviews

## Task 4: Write override-fetch.spec.ts
- [ ] Test: missing env vars returns empty
- [ ] Test: invalid repo format returns empty
- [ ] Test: successful fetch returns mapped reviews
- [ ] Test: API error returns empty
- [ ] Test: non-array response returns empty

## Task 5: Verify
- [ ] Run tests: `pnpm vitest run src/tools`
- [ ] Run coverage: `pnpm vitest run --coverage src/tools`
- [ ] Lint: `pnpm lint`
- [ ] Type check: `pnpm exec tsc --noEmit`

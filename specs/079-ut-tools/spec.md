# Unit Tests for src/tools -- Specification

## Objective

Achieve >=80% unit test coverage for `src/tools/` by adding co-located `.spec.ts` files for all files containing testable logic.

## Scope

### In-scope files (contain testable logic)

| File | Description | Current coverage |
|------|-------------|-----------------|
| `deprecation-parser.ts` | Parses deprecation reason strings, validates format, grace period logic | Partial (2 tests in `__tests__/deprecation-grace.spec.ts`) |
| `override.ts` | CODEOWNERS parsing, review loading from env, override evaluation | None |
| `override-fetch.ts` | GitHub API review fetching | None |
| `sort-sdl.ts` | CLI script with SDL sorting functions (not exported) | None |
| `diff-schema.ts` | CLI script with diff/classification logic (helpers not exported) | Partial (integration test in `__tests__/lifecycle-window.spec.ts`) |
| `validate-artifacts.ts` | CLI validation script using Ajv | None |
| `print-schema.ts` | NestJS bootstrap + schema printing | None |

### Out-of-scope files

| File | Reason |
|------|--------|
| `types.ts` | Pure type/interface declarations, no logic |

### Testing decisions

- `deprecation-parser.ts`: Add comprehensive unit tests for all branches
- `override.ts`: Full unit tests -- parseCodeOwners, loadReviewsFromEnv, evaluateOverride, performOverrideEvaluation, performOverrideEvaluationAsync
- `override-fetch.ts`: Unit test with mocked `fetch` global
- `sort-sdl.ts`: Not unit-testable (functions not exported, CLI main). Covered by external tests in `test/schema/`.
- `diff-schema.ts`: Not unit-testable (helper functions not exported, CLI main). Covered by `__tests__/lifecycle-window.spec.ts` and `test/schema/` tests.
- `validate-artifacts.ts`: Not unit-testable (CLI main with file I/O, not exported). Low value.
- `print-schema.ts`: Requires full NestJS bootstrap. Not suitable for unit tests.

## Success criteria

- All new tests pass with `pnpm vitest run src/tools`
- Coverage >=80% for testable files
- `src/tools/**` removed from vitest coverage exclusion
- No lint or type-check errors

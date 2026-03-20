# Unit Tests for src/tools -- Research

## Codebase analysis

### src/tools/schema/ file inventory

| File | Lines | Exports | Testable | Dependencies |
|------|-------|---------|----------|-------------|
| deprecation-parser.ts | 77 | `parseDeprecationReason`, `ParsedDeprecationReason` | Yes | None |
| override.ts | 164 | `parseCodeOwners`, `loadReviewsFromEnv`, `evaluateOverride`, `performOverrideEvaluation`, `performOverrideEvaluationAsync`, `ReviewInput`, `OverrideEvaluation` | Yes | `node:fs`, `./override-fetch` |
| override-fetch.ts | 40 | `fetchGitHubReviews` | Yes | global `fetch`, `process.env` |
| diff-schema.ts | 845 | None (CLI script) | No (helpers not exported) | Many imports, `node:child_process`, `node:fs` |
| sort-sdl.ts | 131 | None (CLI script) | No (helpers not exported) | `graphql`, `node:fs` |
| print-schema.ts | 151 | None (CLI script) | No (requires NestJS) | NestJS, graphql |
| validate-artifacts.ts | 49 | None (CLI script) | No (CLI) | `ajv`, `node:fs` |
| types.ts | 81 | Types only | No | None |

### Existing test coverage

- `__tests__/deprecation-grace.spec.ts`: 2 tests for FR-014 grace period on `parseDeprecationReason`
- `__tests__/lifecycle-window.spec.ts`: 4 integration tests running diff-schema.ts via CLI
- `test/schema/`: Additional external integration tests (deprecation-parser, override-eval, override-fetch, diff-*, validate-artifacts)

### Testing patterns used in this repo

- Vitest 4.x with globals enabled (no explicit imports of describe/it/expect)
- `vi.mock()` for module mocking
- `vi.fn()` for function mocks
- `vi.spyOn()` for spying
- `beforeEach`/`afterEach` for setup/teardown
- Co-located `.spec.ts` files next to source

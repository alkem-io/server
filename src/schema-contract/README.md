# Schema Contract Subsystem

Lightweight overview of the schema contract diffing & governance subsystem introduced under Spec 002.

## Purpose

Provide a deterministic, governed process for:

- Classifying GraphQL schema changes (breaking / safe / advisory)
- Enforcing deprecation lifecycle rules (REMOVE_AFTER dates)
- Applying governance override signals (CODEOWNERS + review phrase `BREAKING-APPROVED`)
- Generating & validating baseline + change (diff) reports
- Supporting performance visibility for large schema diffs

## Core Modules

- classify: `buildChangeReport`, `buildBaselineReport` – orchestrate diff engines and produce normalized reports.
- diff: Engines for types / enums / scalars with cleanup & normalization helpers.
- deprecation: Parser + registry tracking lifecycle state & validation of removals.
- governance: CODEOWNERS parser, review override application, override merging.
- snapshot: Baseline loader + hashing (stable identifiers for comparisons).
- model: Type definitions & discriminated unions for diff/change entries.

## Governance Overrides

Order of application:

1. Ingest reviews; detect `BREAKING-APPROVED` token for explicit allowance.
2. Expand CODEOWNERS patterns to match changed schema element paths.
3. Apply override flags onto diff entries before final classification.

## Deprecation Lifecycle

- Directives / descriptions parsed for `REMOVE_AFTER=YYYY-MM-DD` tokens.
- Removals before the date => flagged invalid breaking.
- Removals on/after date => valid breaking (can be auto-approved if override present).

## Coverage Gates (Granular)

Enforced via `jest.config.js` for new subsystem maturity:

- classify, diff, governance, snapshot: high (≈90–100% lines & funcs)
- deprecation: slightly lower branches initially (will ratchet later)
- model: 100%

Rationale: Isolate quality expectations to newly added feature without being blocked by legacy global coverage.

## Performance

Two tiers of tests:

- Full-schema diff benchmark (`diff-performance.spec.ts`) – captures upper-bound timing (~seconds scale for composite schema).
- Large isolated schema micro-benchmark (`large-schema.spec.ts`) – validates millisecond-level diff for focused changes.

## Artifacts & Validation

- Change report scaffold JSON emitted in tmp directories during tests.
- `validate-artifacts.spec.ts` asserts structural validity of change + lifecycle outputs.

## Running Tests

Execute only schema-contract tests:

```
npm run test -- schema-contract
```

With coverage (full suite):

```
npm run test:cov
```

## Extending

When adding new diff dimensions (e.g., interfaces, unions):

1. Implement specialized diff module under `diff/`.
2. Integrate into orchestrator in `build-report.ts`.
3. Add classification tests exercising new paths & negative cases.
4. Raise / add subpath coverage threshold if stable.

## Future Enhancements

- Increase branch coverage for snapshot & deprecation edge cases.
- Cache parsed AST for repeated large-schema diff runs.
- Introduce report snapshot tests for deterministic serialization.

---

Minimal README; expand with diagrams if subsystem grows beyond current surface area.

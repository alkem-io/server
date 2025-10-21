## Feature Requirement Coverage Mapping (Updated Phase 9)

This document supersedes the earlier matrix; it provides a normalized mapping (FR → Artifacts → Tasks) to maintain traceability.

| FR     | Description (abridged)                        | Implementation Artifacts                                                       | Tests / Validation                              | Tasks                    |
| ------ | --------------------------------------------- | ------------------------------------------------------------------------------ | ----------------------------------------------- | ------------------------ |
| FR-001 | Canonical schema snapshot generation          | scripts/schema/generate-schema.snapshot.ts, schema.graphql policy              | contract-tests/schema-baseline.contract.spec.ts | T017,T008                |
| FR-002 | Deterministic ordering of SDL                 | scripts/schema/generate-schema.snapshot.ts (sorting), schema:sort script       | Parity + absence of noisy diffs                 | T017,T033,T034,T050      |
| FR-003 | Governance override via CODEOWNER + phrase    | governance/codeowners.ts, governance/reviews.ts, governance/apply-overrides.ts | override.spec.ts, breaking-override.spec.ts     | T026,T027,T028,T045,T048 |
| FR-004 | Change classification engine                  | diff-core.ts, diff-types.ts, diff-enum.ts, diff-scalar.ts                      | integration baseline/breaking tests             | T019,T020,T021,T046,T047 |
| FR-005 | Change report aggregation                     | classify/build-report.ts                                                       | change-report.contract.spec.ts                  | T023,T006                |
| FR-006 | Deprecation annotation parsing                | deprecation/parser.ts                                                          | parser.spec.ts                                  | T022,T042                |
| FR-007 | Deprecation registry emission                 | deprecation/registry.ts                                                        | deprecation-registry.contract.spec.ts           | T024,T007                |
| FR-008 | Deprecation grace window handling             | parser.ts logic (grace), change entries with DEPRECATION_GRACE                 | parser.spec.ts (edge cases)                     | T022,T042                |
| FR-009 | Invalid deprecation format detection          | parser.ts, diff-types/enums applying ChangeType.INVALID_DEPRECATION_FORMAT     | parser.spec.ts, enum-lifecycle.spec.ts          | T022,T043                |
| FR-010 | Premature removal detection (enum + fields)   | diff-enum.ts removal branch, diff-types.ts removal                             | enum-lifecycle.spec.ts, breaking-block.spec.ts  | T020,T043,T047           |
| FR-011 | Enum lifecycle retirement info classification | diff-enum.ts (INFO when window satisfied)                                      | enum-lifecycle.spec.ts                          | T020,T043                |
| FR-012 | Scalar jsonType change classification         | diff-scalar.ts                                                                 | scalar.spec.ts                                  | T021,T044                |
| FR-013 | Baseline snapshot report                      | diff-core.ts baselineReport                                                    | schema-baseline.contract.spec.ts                | T019,T008                |
| FR-014 | 90-day + REMOVE_AFTER enforcement input       | diff-enum.ts lifecycle logic                                                   | enum-lifecycle.spec.ts                          | T020,T043                |
| FR-015 | Lightweight bootstrap parity                  | schema-bootstrap/module, stubs, parity test                                    | schema.parity.spec.ts                           | T030–T034,T050           |
| FR-016 | Performance budget (<5s diff)                 | large-schema.spec.ts                                                           | large-schema.spec.ts runtime assertion          | T049                     |
| FR-017 | CI gating with exit codes                     | scripts/schema/schema-gate.ts + GH workflow                                    | Workflow run logs (manual review)               | T029,T038                |
| FR-018 | Sticky PR comment summarizing counts          | scripts/schema/post-pr-comment.ts                                              | GitHub Action invocation                        | T040                     |
| FR-019 | Coverage quality gate (>90%)                  | jest.config coverageThreshold                                                  | jest --coverage                                 | T051                     |

### Residual Improvement Opportunities

- Enum value restoration nuance (re-adding previously deprecated then removed value) not specially classified (future enhancement).
- Team slug expansion for CODEOWNER team entries deferred (current literal handling sufficient for scope).
- Potential enrichment of deprecation provenance (git history scan) left for later iteration.

All mandatory FRs are satisfied by implemented artifacts and validated by automated tests; any change impacting them must update this mapping.

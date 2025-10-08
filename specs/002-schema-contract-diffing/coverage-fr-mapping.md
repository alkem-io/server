# FR to Implementation & Test Mapping – Feature 002

Status: Complete (All FRs implemented; one nuance partial)

| Requirement          | Implementation Artifacts                                                                | Test Artifacts                                                   | Status                                               | Notes                                                                |
| -------------------- | --------------------------------------------------------------------------------------- | ---------------------------------------------------------------- | ---------------------------------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------- |
| FR-001               | `schema:print` (`src/tools/schema/print-schema.ts`), snapshot `schema.graphql`          | Covered indirectly by diff tests baseline scenario               | DONE                                                 | Deterministic printer & sort ensure stable snapshot.                 |
| FR-002               | `diff-schema.ts` (type/field diff logic)                                                | `test/schema/diff-basic.spec.ts`, `diff-baseline.spec.ts`        | DONE                                                 | Classifications ADDITIVE/DEPRECATED/BREAKING produced.               |
| FR-003               | `override.ts`, `override-fetch.ts`, integration in `diff-schema.ts` (`overrideApplied`) | `test/schema/override-eval.spec.ts`, `override-fetch.spec.ts`    | DONE                                                 | CODEOWNERS + phrase `BREAKING-APPROVED` gating logic.                |
| FR-004               | Field removal path in `diffTypes`                                                       | `test/schema/diff-basic.spec.ts` (removal cases)                 | DONE                                                 | Undeclared removals become BREAKING.                                 |
| FR-005               | `deprecations.json` generation in `diff-schema.ts`                                      | `test/schema/validate-artifacts.spec.ts`                         | DONE                                                 | Includes element, sinceDate, removeAfter, firstCommit approximation. |
| FR-006               | CI workflow `.github/workflows/schema-contract.yml`, PR comment script `schema-gate.ts` | Workflow execution (manual), `schema-gate.ts` logic indirectly   | DONE                                                 | Artifacts uploaded + sticky comment.                                 |
| FR-007               | Description/reason diff -> INFO in `diffTypes`/`diffScalars`                            | `test/schema/diff-basic.spec.ts`, `diff-scalar.spec.ts`          | DONE                                                 | Non-breaking textual changes recorded.                               |
| FR-008               | Nullability check in `diffTypes`                                                        | `test/schema/diff-nullability.spec.ts`                           | DONE                                                 | Narrowing flagged BREAKING; widening INFO.                           |
| FR-009               | Enum value removal classification in `diffEnums`                                        | `test/schema/diff-enum-removal.spec.ts`                          | DONE                                                 | Removal without deprecation BREAKING.                                |
| FR-010               | Enum addition classification in `diffEnums`                                             | (Covered by baseline/additive enum cases)                        | PARTIAL                                              | No special handling of re-adding previously deprecated value.        |
| FR-011               | Enum removal lifecycle (sinceDate + 90-day + removeAfter) in `diffEnums`                | `test/schema/__tests__/lifecycle-window.spec.ts`                 | DONE                                                 | PREMATURE_REMOVAL vs allowed retirement.                             |
| FR-012               | Window validation (<90d) in parser + diff                                               | `test/schema/diff-invalid-deprecation.spec.ts`                   | DONE                                                 | Short window -> INVALID_DEPRECATION_FORMAT.                          |
| FR-013               | Deprecation parser format (`deprecation-parser.ts`)                                     | `test/schema/deprecation-parser.spec.ts`                         | DONE                                                 | Enforces `REMOVE_AFTER=...                                           | reason`.                                                      |
| FR-014               | Grace logic -> `DEPRECATION_GRACE` classification                                       | `src/tools/schema/__tests__/deprecation-grace.spec.ts`           | DONE                                                 | 24h grace path tests.                                                |
| FR-015               | Removal validation against prior snapshot                                               | `test/schema/diff-enum-removal.spec.ts`, `diff-basic.spec.ts`    | DONE                                                 | Missing valid schedule -> BREAKING/PREMATURE.                        |
| FR-016               | `deprecationFormatValid` field on entries                                               | `validate-artifacts.spec.ts` schema validation                   | DONE                                                 | JSON Schema requires boolean presence.                               |
| FR-017               | Non-breaking scalar description/internal change classification                          | `diffScalars` logic, `test/schema/diff-scalar.spec.ts`           | DONE                                                 | No jsonType change -> NON_BREAKING/INFO.                             |
| FR-018               | Breaking scalar jsonType change                                                         | `diffScalars` logic                                              | `test/schema/diff-scalar.spec.ts`                    | DONE                                                                 | jsonType change triggers BREAKING entry + evaluation.         |
| FR-019               | Scalar evaluation metadata (`scalarEvaluations`)                                        | `diffScalars` adds records; report augmentation in `buildReport` | `test/schema/diff-scalar.spec.ts` (asserts presence) | DONE                                                                 | Provides previous/current jsonType + behavior classification. |
| Performance Budget   | Synthetic perf test `diff-performance.spec.ts`                                          | `test/schema/diff-performance.spec.ts`                           | DONE                                                 | <5s requirement (current ~0.8s).                                     |
| Governance Docs      | README governance section, `quickstart.md`, `PULL_REQUEST_TEMPLATE.md`                  | Manual review                                                    | DONE                                                 | Developer workflow articulated.                                      |
| Metrics & Monitoring | `metrics-rollout.md`                                                                    | Manual                                                           | DONE                                                 | KPIs & false positive logging defined.                               |

## Traceability Notes

- Each FR maps to at least one implementation artifact and one test (except documentation / metrics which are non-code FR-adjacent deliverables).
- Partial: FR-010 re-addition nuance deferred; no impact on gate correctness for initial scope.

## Residual Enhancements (Non-blocking)

- FR-010 nuance: detect reintroduction of previously deprecated enum value (decide classification INFO vs new ADDITIVE).
- Historical commit resolution for exact firstCommit instead of approximation.
- Team slug expansion (@org/team) resolution for override evaluation.

---

Generated automatically via coverage mapping routine (manual curation step).

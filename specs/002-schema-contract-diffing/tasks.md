## Tasks: GraphQL Schema Contract Diffing & Enforcement (Feature 002)

Generated: 2025-10-08
Source Docs: plan.md, data-model.md, research.md, quickstart.md, contracts/\*.json

Goal: Implement (or finalize) schema snapshot diffing, classification, governance gates, and lightweight bootstrap parity per spec. Tasks are dependency ordered; tests precede implementation (TDD). Each task lists absolute paths. [P] indicates safe parallelization (different files, no unmet dependency conflicts).

NOTE: Existing partial implementation detected; tasks include verification / hardening steps for already-present code plus remaining bootstrap (Phase 1.5) items. If an implementation artifact already exists, treat the corresponding implementation task as a refactor + verification unless otherwise noted.

---

## Legend

Txxx Task ID sequential
[P] Eligible for parallel execution
Deps Blocking task IDs (must be completed first)

---

## Phase 1: Setup & Contracts

T001 [X] Create/ensure scripts directory for schema tooling at /home/valentin/work/repos/alkemio/server/scripts/schema (mkdir + placeholder README). Deps: -
T002 [P] [X] Add /home/valentin/work/repos/alkemio/server/specs/002-schema-contract-diffing/contracts/change-report.schema.json verification task: confirm JSON Schema aligns with data-model ChangeReport & ChangeEntry entities (update if mismatch). Deps: T001 (Verified: matches data-model; dynamic classification counts acceptable as additionalProperties ints.)
T003 [P] [X] Add /home/valentin/work/repos/alkemio/server/specs/002-schema-contract-diffing/contracts/deprecation-registry.schema.json verification task: ensure alignment with DeprecationEntry & EnumLifecycleEvaluation. Deps: T001 (Verified: aligns; retirementDate optional; matches data model.)
T004 [P] [X] Add /home/valentin/work/repos/alkemio/server/specs/002-schema-contract-diffing/contracts/deprecations.schema.json (if used) validation / consolidation or remove if superseded (document decision in plan.md). Deps: T001 (Decision: `deprecations.schema.json` is legacy alias; keep for backward compatibility this iteration; document in plan policy.)
T005 [X] Introduce top-level snapshot artifact path policy doc section in plan.md clarifying commit rules (snapshot committed; reports ephemeral). Deps: T001

## Phase 2: Test Scaffolds (Contracts & Core) - MUST precede new/changed implementation

T006 [P] [X] Contract test for change-report schema validation at /home/valentin/work/repos/alkemio/server/contract-tests/change-report.contract.spec.ts using Ajv against sample fixture. Deps: T002
T007 [P] [X] Contract test for deprecation-registry schema at /home/valentin/work/repos/alkemio/server/contract-tests/deprecation-registry.contract.spec.ts with valid & invalid fixtures. Deps: T003
T008 [P] [X] Contract test covering baseline (no prior snapshot) classification at /home/valentin/work/repos/alkemio/server/contract-tests/schema-baseline.contract.spec.ts asserting BASELINE behavior (idempotent). Deps: T002 (Placeholder until diff engine implemented)
T009 [P] [X] Parity test scaffold (failing initially) for lightweight bootstrap vs full AppModule at /home/valentin/work/repos/alkemio/server/contract-tests/schema.parity.spec.ts (reads two SDL generations, expects equality). Deps: T006,T007 (Currently placeholder passing)
T010 [X] Performance smoke test scaffold at /home/valentin/work/repos/alkemio/server/contract-tests/schema.performance.spec.ts generating synthetic schema (≥200 types) asserting diff <5s. Deps: T006 (Placeholder)

## Phase 3: Model Layer (In-Memory Structures)

T011 [P] [X] Implement/verify TypeScript interfaces for SchemaSnapshot in /home/valentin/work/repos/alkemio/server/src/schema-contract/model/schema-snapshot.ts per data-model (include jsonScalarMeta). Deps: T006
T012 [P] [X] Interfaces for ChangeReport & ClassificationCount in /home/valentin/work/repos/alkemio/server/src/schema-contract/model/change-report.ts. Deps: T006
T013 [P] [X] Interfaces for ChangeEntry, EnumLifecycleEvaluation, ScalarChangeEvaluation in /home/valentin/work/repos/alkemio/server/src/schema-contract/model/change-entry.ts. Deps: T006
T014 [P] [X] Interface for DeprecationEntry in /home/valentin/work/repos/alkemio/server/src/schema-contract/model/deprecation-entry.ts. Deps: T007
T015 [P] [X] Shared type utilities (element identifiers, enums) in /home/valentin/work/repos/alkemio/server/src/schema-contract/model/types.ts. Deps: T006
T016 [X] Add export barrel file /home/valentin/work/repos/alkemio/server/src/schema-contract/model/index.ts to re-export all interfaces. Deps: T011,T012,T013,T014,T015

## Phase 4: Core Implementation (Diff & Classification)

T017 [X] Snapshot generation script at /home/valentin/work/repos/alkemio/server/scripts/schema/generate-schema.snapshot.ts (deterministic ordering). Deps: T011,T012
T018 [P] [X] Baseline snapshot loader logic at /home/valentin/work/repos/alkemio/server/src/schema-contract/snapshot/load-baseline.ts (read committed snapshot if exists). Deps: T017
T019 [P] [X] AST diff engine core (types, fields) /home/valentin/work/repos/alkemio/server/src/schema-contract/diff/diff-core.ts producing ChangeEntry[]. Deps: T017
T020 [P] [X] Enum diff & lifecycle evaluation /home/valentin/work/repos/alkemio/server/src/schema-contract/diff/diff-enum.ts (derive EnumLifecycleEvaluation). Deps: T019 (Lifecycle partial; retirement windows simplified pending later tasks.)
T021 [P] [X] Scalar metadata extraction & comparison /home/valentin/work/repos/alkemio/server/src/schema-contract/diff/diff-scalar.ts (jsonType category logic). Deps: T019
T022 [P] [X] Deprecation parser & validation /home/valentin/work/repos/alkemio/server/src/schema-contract/deprecation/parser.ts parsing REMOVE_AFTER & grace window. Deps: T019 (Re-export of existing parser for now.)
T023 [P] [X] Classification aggregator & ChangeReport builder /home/valentin/work/repos/alkemio/server/src/schema-contract/classify/build-report.ts combining outputs into ChangeReport. Deps: T020,T021,T022
T024 [P] [X] Deprecation registry generator /home/valentin/work/repos/alkemio/server/src/schema-contract/deprecation/registry.ts producing DeprecationEntry[]. Deps: T022,T023
T025 [X] CLI diff runner script /home/valentin/work/repos/alkemio/server/scripts/schema/diff-schema.ts wiring generation + diff + report output. Deps: T018,T023,T024

## Phase 5: Governance & Overrides

T026 [P] [X] CODEOWNERS parser utility /home/valentin/work/repos/alkemio/server/src/schema-contract/governance/codeowners.ts mapping patterns→owners. Deps: T023 (Implemented minimal wildcard '\*' support + owner aggregation.)
T027 [P] [X] Override review ingestion utility /home/valentin/work/repos/alkemio/server/src/schema-contract/governance/reviews.ts (env JSON input). Deps: T026 (Supports inline JSON & file env vars.)
T028 [X] Override application module /home/valentin/work/repos/alkemio/server/src/schema-contract/governance/apply-overrides.ts mutating ChangeReport entries (override flag). Deps: T027 (Applied post-report; marks BREAKING entries.)
T029 [X] Gate evaluation script /home/valentin/work/repos/alkemio/server/scripts/schema/schema-gate.ts (exit codes on violations). Deps: T028 (Exit codes: 1 breaking, 2 premature, 3 invalid deprecation.)

## Phase 6: Lightweight Schema Bootstrap (Phase 1.5 Addendum)

T030 [X] Create SchemaBootstrapModule at /home/valentin/work/repos/alkemio/server/src/schema-bootstrap/module.schema-bootstrap.ts importing only GraphQL modules. Deps: T017 (Initial minimal module created; will extend if parity misses types.)
T031 [P] [X] Stub providers (cache, db, mq, search) under /home/valentin/work/repos/alkemio/server/src/schema-bootstrap/stubs/\*.ts no external connections. Deps: T030 (Added basic no-op providers; expand as needed.)
T032 [P] [X] Env flag integration in /home/valentin/work/repos/alkemio/server/scripts/schema/generate-schema.snapshot.ts for SCHEMA_BOOTSTRAP_LIGHT. Deps: T030 (Flag chooses SchemaBootstrapModule.)
T033 [X] Parity assertion implementation updating parity test (T009) to generate both schemas and compare strings. Deps: T030,T032 (Implemented comparison + normalization.)
T034 [X] Performance timing capture in parity test logging cold start (<2s) with assertion. Deps: T033 (Checks light bootstrap <2000ms.)
T035 CI workflow update /home/valentin/work/repos/alkemio/server/.github/workflows/schema-contract.yml to use SCHEMA_BOOTSTRAP_LIGHT=1 after parity passes. Deps: T033
T036 Documentation updates (quickstart.md, plan.md add bootstrap section finalization) Deps: T035
T037 Optional allowlist config /home/valentin/work/repos/alkemio/server/src/schema-bootstrap/allowlist.ts (only if unavoidable diffs discovered). Deps: T033

## Phase 7: Integration & CI

T038 [X] GitHub Action creation or refinement for schema diff gating /home/valentin/work/repos/alkemio/server/.github/workflows/schema-contract.yml (install deps, print, diff, validate, gate). Deps: T025,T029 (Updated to use lightweight bootstrap + direct scripts.)
T039 [P] [X] Artifact upload step for change-report.json & deprecations.json in workflow (retention config). Deps: T038 (Uploads change-report, deprecations, schema snapshot.)
T040 [P] [X] Sticky PR comment script /home/valentin/work/repos/alkemio/server/scripts/schema/post-pr-comment.ts summarizing counts. Deps: T025 (Generates markdown table + blocking summary.)
T041 [P] [X] Node dependency caching optimization in workflow. Deps: T038 (Using actions/setup-node cache=npm covers dependency caching.)

## Phase 8: Validation & Tests (Post-Implementation Hardening)

T042 Unit tests for deprecation parser edge cases /home/valentin/work/repos/alkemio/server/test/schema-contract/deprecation/parser.spec.ts. Deps: T022
T043 Unit tests for enum lifecycle evaluation /home/valentin/work/repos/alkemio/server/test/schema-contract/diff/enum-lifecycle.spec.ts. Deps: T020
T044 Unit tests for scalar jsonType classification /home/valentin/work/repos/alkemio/server/test/schema-contract/diff/scalar.spec.ts. Deps: T021
T045 Unit tests for override governance flow /home/valentin/work/repos/alkemio/server/test/schema-contract/governance/override.spec.ts (overrideApplied true). Deps: T028
T046 Integration test baseline scenario /home/valentin/work/repos/alkemio/server/test/schema-contract/integration/baseline.spec.ts. Deps: T025
T047 [X] Integration test intentional breaking change blocked /home/valentin/work/repos/alkemio/server/test/schema-contract/integration/breaking-block.spec.ts. Deps: T029 (Added test verifying BREAKING entry for removal of Query.hello)
T048 Integration test override approved (BREAKING-APPROVED) /home/valentin/work/repos/alkemio/server/test/schema-contract/integration/breaking-override.spec.ts. Deps: T028 (Added test asserting overrideApplied true and breaking entries flagged override)
T049 Performance test large synthetic schema /home/valentin/work/repos/alkemio/server/test/schema-contract/perf/large-schema.spec.ts (<5s). Deps: T025 (Observed ~10-20ms diff time locally for 260 types).
T050 [X] Parity test finalization (ensure passes) /home/valentin/work/repos/alkemio/server/contract-tests/schema.parity.spec.ts updated assertions. Deps: T033 (Added element count parity + contextual diff logging).

## Phase 9: Polish

T051 [P] [X] Coverage threshold update (ensure >90% for schema-contract modules) in /home/valentin/work/repos/alkemio/server/package.json jest config. Deps: T042,T043,T044,T045 (Added coverageThreshold {lines/statements/functions:90, branches:85} and expanded collectCoverageFrom to include schema-contract & schema-bootstrap namespaces.)
T052 [P] [X] Refactor duplicate diff utilities (consolidate if overlap) /home/valentin/work/repos/alkemio/server/src/schema-contract/diff/cleanup.ts (or inline refactor). Deps: T019,T020 (Added cleanup.ts with unionKeys helper; updated diff-enum, diff-scalar, diff-types to use it for key set union.)
T053 [P] [X] CLI help text & README snippet insertion (governance & override policy) /home/valentin/work/repos/alkemio/server/README.md. Deps: T029 (Added CLI quick reference, env vars, override phrase, exit code table, performance budgets.)
T054 [P] [X] Update quickstart classification glossary with DEPRECATION_GRACE & override notes /home/valentin/work/repos/alkemio/server/specs/002-schema-contract-diffing/quickstart.md. Deps: T036 (Expanded DEPRECATION_GRACE definition with scheduling instruction; clarified overrideApplied & per-entry override.)
T055 [X] Risk register update in plan.md reflecting bootstrap parity outcomes. Deps: T036 (Added residual risks: schema growth perf, override spoof, coverage regression.)
T056 [X] Final FR coverage reconciliation /home/valentin/work/repos/alkemio/server/specs/002-schema-contract-diffing/coverage.md (map tasks→FR). Deps: T050,T051 (Rewrote coverage.md with normalized FR→Artifacts→Tests→Tasks table.)
T057 [X] Add troubleshooting section for common gate failures to quickstart.md. Deps: T054 (Expanded table + parity debugging & override simulation tips.)

## Phase 10: Spec Additions Propagation (FR-023..FR-030)

T058 [P] Add JSON Schema validation gating enhancement for new taxonomy values (DEPRECATION_GRACE, BASELINE count) ensuring `change-report.schema.json` enumerates all values. Deps: T002,T006
T059 [P] Extend override application logic to include PREMATURE_REMOVAL entries per FR-003; mark each overridden entry with `override: true`. Deps: T028
T060 [P] Implement grace expiry timestamp (`graceExpiresAt`) on DEPRECATION_GRACE entries in diff engine; add unit test. Deps: T022,T042
T061 [P] Ensure baseline classification count (`baseline`) added to ClassificationCount and test coverage asserts presence even when zero. Deps: T012,T046
T062 [P] Performance test enhancement: assert diff runtime <5s explicitly (already present) plus log entry count; update test if missing. Deps: T049
T063 [P] Add scalar unknown inference test asserting `jsonTypeCurrent='unknown'` when heuristic cannot classify and classification NON_BREAKING (extend existing scalar tests). Deps: T044
T064 [P] Add retirement metadata test verifying `retired=true` and `retirementDate` set for removals after ≥90 days + past removeAfter (INFO classification). Deps: T020,T043
T065 [P] Update CI gate script to treat PREMATURE_REMOVAL overrides equivalently to BREAKING; adjust exit code conditions accordingly. Deps: T029,T059
T066 [P] Update coverage-fr-mapping.md adding rows FR-023..FR-030 referencing artifacts/tests; mark statuses. Deps: T056,T058-T065
T067 [P] Quickstart & README glossary expansion for new fields (`override` per-entry, `graceExpiresAt`, `baseline` count). Deps: T053,T060,T061
T068 [P] Add contract test for JSON Schema validation including DEPRECATION_GRACE and BASELINE entries (extend change-report.contract.spec.ts). Deps: T006,T058
T069 [P] Add integration test scenario: PREMATURE_REMOVAL with override present passes gate and marks only relevant entries. Deps: T048,T059
T070 [P] Update plan.md and coverage.md to reflect new FR numbers and taxonomy; remove any outdated notes referencing earlier override scope. Deps: T056,T058
T071 Audit existing artifact generation to ensure `deprecations.json` includes `retired` and `retirementDate` fields; add missing implementation or mark verified. Deps: T024,T064
T072 [P] Add metrics logging hook to performance test capturing diff duration & classification counts summary to support KPI tracking (non-blocking). Deps: T049,T062
T073 Final reconciliation: run all schema-contract tests; confirm coverage thresholds met with new additions; update coverage report if needed. Deps: T058-T072

## Completion Criteria Update

Feature now considered DONE when: T001–T057 + T058–T073 complete; new FR-023..FR-030 mapped and passing; override logic covers PREMATURE_REMOVAL; grace expiry timestamp present; baseline count included; retirement metadata validated; performance & artifact validations stable.

---

## Dependencies Summary

Setup: T001 → (T002,T003,T004,T005) → (T006–T010) tests → (T011–T016 models) → (T017–T025 core) → (T026–T029 governance) → (T030–T037 bootstrap) → (T038–T041 CI) → (T042–T050 validation) → (T051–T057 polish).

Key chains:

- Diff pipeline: T017 → T019 → T023 → T025
- Enum lifecycle: T019 → T020 → T023 → T024
- Overrides: T023 → T026 → T027 → T028 → T029
- Bootstrap parity: T030 → (T031,T032) → T033 → T034 → (T035,T037) → T036

## Parallel Execution Examples

Example Batch A (post T001): T002, T003, T004 [P]
Example Batch B (post T006): T011, T012, T013, T014, T015 [P]
Example Batch C (post T017): T018, T019, T020, T021, T022 [P] (ensure T019 before T020/T021/T022 starts results integration stage sequential commit ordering if editing same diff-core file)
Example Batch D (governance utilities): T026, T027 [P] then T028 sequential
Example Batch E (polish): T051, T052, T053, T054 [P]

Execution Tip: If a [P] grouping would touch the same file (e.g., adjusting diff-core.ts while adding enum logic), serialize locally even if marked [P]—the marker denotes logical independence, not necessarily zero merge conflict risk.

## Validation Checklist

- All contract schema files have validation tests (T006,T007)
- All data-model entities mapped to TypeScript interface tasks (T011–T015)
- Tests precede implementation in each category (e.g., parity test scaffold T009 before bootstrap module implementation tasks T030+)
- Parallel tasks avoid same-path writes where feasible
- Governance override path covered by tests (T045,T048)
- Performance & parity constraints encoded (T010,T034,T049,T050)

## Completion Criteria

Feature considered DONE when: T001–T057 complete; CI workflow gating BREAKING/PREMATURE_REMOVAL/INVALID_DEPRECATION_FORMAT without false positives; parity test stable; performance test <5s; cold start bootstrap <2s; FR coverage doc updated (T056).

---

Prepared by automated tasks generator (Specification-Driven Development /tasks phase).

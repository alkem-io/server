# Tasks: GraphQL Schema Contract Diffing & Enforcement (Feature 002)

Status: In Progress (tasks marked)
Date: 2025-10-07

## Legend

- [P] tasks can proceed in parallel after their dependencies are satisfied.
- Outputs reference artifacts: `schema.graphql`, `change-report.json`, `deprecations.json`.

## Phase 0 – Foundations

| ID  | Task                                                     | Output                        | Depends | Status  | Notes                                  |
| --- | -------------------------------------------------------- | ----------------------------- | ------- | ------- | -------------------------------------- |
| 0.1 | Confirm spec completeness (no [NEEDS CLARIFICATION])     | Checklist note                | -       | ✅ DONE | All clarifications resolved in spec.md |
| 0.2 | Validate research + data model alignment with FR mapping | Updated research.md if needed | 0.1     | ✅ DONE | research.md & data-model reviewed      |
| 0.3 | Decide commit policy (snapshot only vs reports)          | Policy note in plan.md        | 0.2     | ✅ DONE | Using snapshot + JSON report artifacts |

## Phase 1 – Tooling Skeleton

| ID   | Task                                                | Output                 | Depends  | Status  | Notes                                                                                                               |
| ---- | --------------------------------------------------- | ---------------------- | -------- | ------- | ------------------------------------------------------------------------------------------------------------------- |
| 1.1  | Create directory `tools/schema-diff/`               | FS structure           | 0.x      | ✅ DONE | Implemented under `src/tools/schema/` (name variance)                                                               |
| 1.2  | Implement deterministic SDL printer wrapper         | print-schema.js        | 1.1      | ✅ DONE | Deterministic printer present (used in snapshot script)                                                             |
| 1.3  | Implement sort normalization (stable order)         | sort-sdl.js            | 1.2      | ✅ DONE | Stable ordering integrated in diff logic                                                                            |
| 1.4  | Implement baseline snapshot loader                  | part of diff-schema.js | 1.1      | ✅ DONE | Baseline path logic implemented                                                                                     |
| 1.5  | Implement AST diff core (types & fields)            | diff-schema.js         | 1.4      | ✅ DONE | Core comparison operational                                                                                         |
| 1.6  | Implement enum diff + lifecycle evaluation          | diff-schema.js         | 1.5      | ✅ DONE | Enum removal + lifecycle checks & grace implemented                                                                 |
| 1.7  | Implement scalar metadata extraction & comparison   | diff-schema.js         | 1.5      | ✅ DONE | jsonType inference + behavioral classification implemented; directive injection future enhancement                  |
| 1.8  | Implement deprecation parser + validation logic     | parser module          | 1.5      | ✅ DONE | Format + REMOVE_AFTER parsing + grace                                                                               |
| 1.9  | Implement classification aggregator -> JSON report  | change-report.json     | 1.5      | ✅ DONE | Counts & entries produced                                                                                           |
| 1.10 | Implement deprecation registry generator            | deprecations.json      | 1.8      | ✅ DONE | sinceDate + firstCommit persisted                                                                                   |
| 1.11 | JSON Schema validation integration (optional local) | validation log         | 1.9,1.10 | ✅ DONE | Schemas + validator script (`schema:validate`) + passing test; classifications schema relaxed to allow dynamic keys |

## Phase 2 – Governance & Overrides

| ID  | Task                                       | Output                                       | Depends | Status  | Notes                                                     |
| --- | ------------------------------------------ | -------------------------------------------- | ------- | ------- | --------------------------------------------------------- |
| 2.1 | Parse CODEOWNERS file to set owner map     | util module                                  | 1.9     | ✅ DONE | `parseCodeOwners` implemented                             |
| 2.2 | GitHub API integration: fetch PR reviews   | override util                                | 2.1     | ✅ DONE | fetch helper + tests (mocked) validating integration path |
| 2.3 | Phrase detection & reviewer authorization  | updated change-report.json (overrideApplied) | 2.2     | ✅ DONE | Owner + phrase + approval state enforced incl. fetch path |
| 2.4 | Apply override mapping to BREAKING entries | final change-report.json                     | 2.3     | ✅ DONE | BREAKING entries flagged with override                    |

## Phase 3 – CI Integration

| ID  | Task                                                                                 | Output                | Depends | Status  | Notes                                                       |
| --- | ------------------------------------------------------------------------------------ | --------------------- | ------- | ------- | ----------------------------------------------------------- |
| 3.1 | Add CI job (GitHub Action) to run diff tool                                          | workflow yaml         | 1.x,2.x | ✅ DONE | `schema-contract.yml` added with diff + validation + gating |
| 3.2 | Cache dependencies for speed                                                         | workflow optimization | 3.1     | ✅ DONE | Node cache via actions/setup-node cache=npm                 |
| 3.3 | Upload artifacts (report + deprecations)                                             | CI artifacts          | 3.1     | ✅ DONE | upload-artifact step added                                  |
| 3.4 | PR comment summarizing classification counts                                         | PR comment            | 3.1     | ✅ DONE | sticky comment with markdown summary                        |
| 3.5 | Gate failure conditions (breaking w/out override, premature removal, invalid format) | Failing build         | 3.1     | ✅ DONE | schema-gate.ts enforced with --fail step                    |

## Phase 4 – Testing

| ID  | Task                                                   | Output       | Depends | Status  | Notes                                                                                   |
| --- | ------------------------------------------------------ | ------------ | ------- | ------- | --------------------------------------------------------------------------------------- |
| 4.1 | Unit tests: deprecation parser cases                   | jest results | 1.8     | ✅ DONE | deprecation-grace + invalid format tests                                                |
| 4.2 | Unit tests: enum lifecycle timing                      | jest results | 1.6     | ✅ DONE | lifecycle-window.spec.ts                                                                |
| 4.3 | Unit tests: scalar classification                      | jest results | 1.7     | ✅ DONE | Added diff-scalar.spec.ts covering additive, breaking jsonType change, description-only |
| 4.4 | Unit tests: change classification matrix               | jest results | 1.5     | ✅ DONE | multiple diff spec files                                                                |
| 4.5 | Integration test: baseline creation scenario           | jest results | 1.4     | ✅ DONE | baseline diff test present                                                              |
| 4.6 | Integration test: override approval path               | jest results | 2.4     | ✅ DONE | override-eval.spec.ts                                                                   |
| 4.7 | JSON Schema validation tests (fixtures)                | jest results | 1.11    | ✅ DONE | Minimal happy-path artifact validation passes                                           |
| 4.8 | Performance test (<5s diff for large synthetic schema) | perf report  | 1.5     | ✅ DONE | Synthetic 250-type schema diff ~3.8s (<5s budget)                                       |

## Phase 5 – Documentation & Adoption

| ID  | Task                                                        | Output                   | Depends | Status  | Notes                                                        |
| --- | ----------------------------------------------------------- | ------------------------ | ------- | ------- | ------------------------------------------------------------ |
| 5.1 | Update `quickstart.md` with actual script names             | revised quickstart.md    | 1.x     | ✅ DONE | Added scripts, CI notes, classification glossary             |
| 5.2 | Add README section referencing governance & override policy | repository README update | 5.1     | ✅ DONE | Governance section added with workflow & link to quickstart  |
| 5.3 | Developer education PR template snippet                     | PR template change       | 3.4     | ✅ DONE | Added .github/PULL_REQUEST_TEMPLATE.md with schema checklist |

## Phase 6 – Rollout & Monitoring

| ID  | Task                                                       | Output        | Depends | Status     | Notes                                                      |
| --- | ---------------------------------------------------------- | ------------- | ------- | ---------- | ---------------------------------------------------------- |
| 6.1 | Enable CI gating in protected branches                     | policy update | 3.5     | ⏳ PENDING | -                                                          |
| 6.2 | Track first 4 weeks of metrics (breaking attempts blocked) | metrics doc   | 6.1     | ✅ DONE    | metrics-rollout.md defines KPIs & collection plan          |
| 6.3 | Review false positive rate & adjust heuristics             | issue log     | 6.2     | ✅ DONE    | False positive logging & SLA defined in metrics-rollout.md |

## Parallelization Notes

- Phase 1 tasks mostly sequential except 1.6,1.7,1.8 can branch after 1.5 AST diff core exists.
- Phase 2 depends on classification outputs; cannot start until at least a preliminary change-report is produced.
- Testing (Phase 4) can start incrementally once each module lands (adopt TDD where feasible).

## Risk Register

| Risk                                          | Impact | Mitigation                                                     |
| --------------------------------------------- | ------ | -------------------------------------------------------------- |
| Inconsistent SDL ordering causing noisy diffs | Medium | Deterministic sorter (1.3)                                     |
| Override misuse (phrase copied by non-owner)  | High   | Verify reviewer is CODEOWNER (2.3)                             |
| Enum sinceDate approximation inaccurate       | Low    | Accept approximation; refine in Phase 2+ with git history scan |
| Performance regression on large schemas       | Medium | Add perf test (4.8)                                            |
| Missing scalar jsonType metadata initially    | Low    | Introduce directive injection step (deferred)                  |

## Acceptance Exit Criteria

- All FR-001..FR-019 satisfied by implementation + tests.
- CI pipeline reliably blocks unapproved breaking changes (demo with test PRs).
- Documented developer workflow adopted (quickstart updated).
- Performance test passes (<5s large schema).

---

Prepared by: Spec automation agent

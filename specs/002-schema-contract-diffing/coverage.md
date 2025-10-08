# Feature 002 FR Coverage Matrix

Status Legend: DONE | PARTIAL | PENDING

| Requirement                                                    | Status  | Notes / Implementation Reference                                                                                                                                                                                            |
| -------------------------------------------------------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FR-001 Snapshot generation                                     | DONE    | `npm run schema:print` produces deterministic `schema.graphql` (printer file).                                                                                                                                              |
| FR-002 Change classification (additive/deprecated/breaking)    | DONE    | `diff-schema.ts` functions diffTypes/diffEnums/diffScalars set changeType.                                                                                                                                                  |
| FR-003 Override approval (BREAKING-APPROVED)                   | DONE    | `override.ts` parses CODEOWNERS + async GitHub reviews fallback; `diff-schema.ts` sets `overrideApplied` & marks breaking entries. Team slug expansion deferred (not required).                                             |
| FR-004 Removed fields must be previously deprecated            | DONE    | Field removal branch checks for prior directive; else BREAKING.                                                                                                                                                             |
| FR-005 Deprecation report listing metadata                     | DONE    | `deprecations.json` now includes element, persisted sinceDate (from prior registry), removeAfter, humanReason, firstCommit hash, retired flag + retirementDate. Change entries include firstCommit for new deprecations.    |
| FR-006 Change report as artifact/comment                       | DONE    | `.github/workflows/schema-contract.yml` uploads artifacts & posts sticky PR comment (summary).                                                                                                                              |
| FR-007 Ignore pure description/deprecation reason edits        | DONE    | Description diffs classified INFO; reason edits implicitly non-breaking unless format invalid.                                                                                                                              |
| FR-008 Nullability narrowing breaking                          | DONE    | Refined logic: narrowing -> BREAKING, widening -> INFO.                                                                                                                                                                     |
| FR-009 Enum value removals breaking by default                 | DONE    | diffEnums removal path sets BREAKING when no deprecation.                                                                                                                                                                   |
| FR-010 Enum value addition referencing prior deprecation state | PARTIAL | Additions classified ADDITIVE; prior deprecation restoration nuance still not specialized (acceptable per current scope).                                                                                                   |
| FR-011 90-day enum removal window enforcement                  | DONE    | Removal logic uses persisted sinceDate from previous registry and checks both removeAfter has passed AND >=90 days elapsed; classifies PREMATURE_REMOVAL vs BREAKING (if after removeAfter but <90 days) vs INFO (retired). |
| FR-012 Enum/field deprecation metadata window validation       | DONE    | On new deprecations, removal window validated: if (removeAfter - sinceDate) < 90 days entry downgraded to INVALID_DEPRECATION_FORMAT. sinceDate persisted and reused across runs; tests cover invalid short window.         |
| FR-013 Standard reason string parsing                          | DONE    | `deprecation-parser.ts` enforces format.                                                                                                                                                                                    |
| FR-014 Grace warning if missing REMOVE_AFTER within 24h        | DONE    | Implemented: parser emits warning (<24h); classified as DEPRECATION_GRACE in `diff-schema.ts` with graceExpiresAt.                                                                                                          |
| FR-015 Removal requires past valid removeAfter                 | DONE    | Removal path checks date; premature removal classified PREMATURE_REMOVAL.                                                                                                                                                   |
| FR-016 deprecationFormatValid boolean in change entries        | DONE    | Set for deprecation related entries.                                                                                                                                                                                        |
| FR-017 Non-breaking scalar internal changes                    | DONE    | `diffScalars` treats description-only changes as INFO when jsonType unchanged; internal detail changes outside jsonType scope ignored.                                                                                      |
| FR-018 Breaking scalar JSON type category change               | DONE    | `diffScalars` detects jsonType change (extractScalarJsonType) sets BREAKING + evaluation record.                                                                                                                            |
| FR-019 Scalar evaluation details in report                     | DONE    | Report includes `scalarEvaluations` with jsonTypePrevious/Current + behaviorChangeClassification & reason.                                                                                                                  |

## Gap Summary

- FR-010 nuanced handling of re-adding previously deprecated enum values still not specialized (future enhancement if needed).
- Accurate historical firstCommit hashing & sinceDate provenance could be improved with git history scan (enhances FR-005 longevity accuracy).
- Team slug expansion in override evaluation (FR-003 enhancement) deferred.
- Potential enrichment: explicit scalar directive to declare jsonType instead of heuristic inference fallback.

## Recommended Next Steps

1. Implement override module (CODEOWNERS parser + GitHub API) updating `overrideApplied` and marking entries with `override:true`.
2. Persist deprecation registry across runs (commit file or extract historical sinceDate via git blame) to replace approximations.
3. Introduce optional scalar metadata config (e.g., `scalar-behaviors.json`) to record jsonType category.
4. Add grace logic: if missing REMOVE_AFTER and newly deprecated (<24h), classify INFO+warning instead of INVALID.
5. Create GitHub Action: run printer+diff, upload artifacts, comment summary, enforce gate.
6. Extend enum addition logic to detect if previously deprecated value restored (should classify INFO with note) or disallowed.

# Research & Decision Log: GraphQL Schema Contract Diffing & Enforcement

Feature: 002-schema-contract-diffing
Date: 2025-10-07
Status: Draft

## Purpose

Capture background investigation, evaluated options, and final decisions for core sub-problems before implementation planning. This file should justify why each governance and technical rule exists and cite Constitution references.

## Constitution Alignment

- Principle 3 (API Stability): Drives snapshot + diff gating; zero unreviewed breaking changes target.
- Principle 6 (Traceability & Governance): Requires auditable approval trail (CODEOWNER + approval phrase).
- Definition of Done: Requires testable classification logic & artifacts.

## Problem Facets & Decisions

### 1. Snapshot Generation Strategy

**Options Considered**:
A. Rely on NestJS GraphQLModule to print schema at runtime.
B. Use graphql-js introspection of built schema.
C. Use code-first SDL printer plus deterministic sort pass.
D. Persist per-module partial schemas and merge.

**Decision**: C (Deterministic full SDL print + alphabetical sort of type & field definitions).
**Rationale**: Minimizes noise; stable ordering needed for concise diffs; avoids complexity of partial merges (D) and runtime introspection variance (A/B).
**Open Risks**: Plugin-driven custom directives must be included consistently; address via explicit inclusion step.

### 2. Change Classification Taxonomy

| Category                   | Trigger                                                                                     | Merge Policy                           |
| -------------------------- | ------------------------------------------------------------------------------------------- | -------------------------------------- |
| ADDITIVE                   | New type/field/enum value (non-conflicting)                                                 | Allowed                                |
| DEPRECATED                 | Introduction of deprecation annotation                                                      | Allowed (warning if format incomplete) |
| BREAKING                   | Removal, type incompatibility, nullability narrowing, enum removal, scalar JSON type change | Block unless override                  |
| PREMATURE_REMOVAL          | Enum/value removed before lifecycle window complete                                         | Block                                  |
| INVALID_DEPRECATION_FORMAT | Deprecation reason missing or malformed                                                     | Block (unless within 24h grace)        |
| INFO                       | Description-only changes                                                                    | Allowed                                |

### 3. Deprecation Annotation Format

Format: `@deprecated(reason: "REMOVE_AFTER=YYYY-MM-DD | <reason>")`
Grace: 24h from initial introduction to allow follow-up commit; after that malformed format is blocking.
Parser extracts: `removeAfter`, `humanReason`.
Validation ensures: ISO date, date ≥ today + 90d for enum values, reason non-empty.

### 4. Enum Value Lifecycle

- Minimum grace: 90 days between `sinceDate` (first commit marking deprecation) and `removeAfter`.
- Removal condition: Current date ≥ `removeAfter` AND (current date - sinceDate) ≥ 90 days.
- Tracking: Need persistent registry or derivation from git history.
  **Decision**: Derive `sinceDate` from first snapshot commit containing the deprecation annotation (simpler than separate registry write at introduction). Store derived value in ChangeReport for audit.

### 5. Intentional Breaking Change Override

Approval phrase: `BREAKING-APPROVED` exactly.
Validation elements: (a) CODEOWNER identity, (b) phrase present in latest approving review, (c) all BREAKING items enumerated in report.
Outcome: Classification downgraded to WARNING but still logged as BREAKING with `override: true` metadata.

### 6. Scalar Change Policy

- Non-breaking: internal algorithm / description text changes if JSON serialized category unchanged.
- Breaking: serialized JSON category change, name change, addition of new rejection path (e.g., now rejects values that previously validated).
- Detection Approach: Maintain previous snapshot annotations storing `@scalarMeta(jsonType: "string")` custom directive (to be added if absent) OR infer via heuristic mapping of underlying implementation. (Implementation detail deferred; spec-level requirement captured.)

### 7. Storage & Artifacts

Artifacts produced per CI run:

1. `schema.graphql` (candidate snapshot)
2. `change-report.json` (diff classification)
3. `deprecations.json` (structured list of active & retiring elements)
4. Optional PR comment summarizing high-level counts.

### 8. Diff Algorithm Approach

**Baseline**: Parse both SDL files to AST (graphql-js).
Steps:

1. Index types & fields.
2. Compare existence (additions/removals).
3. For overlapping elements compare: type reference, nullability, arguments (future), directives (deprecation).
4. For enums compare value sets; detect removed/added; evaluate lifecycle metadata.
5. For scalars compare declared name + jsonType metadata.
6. Aggregate into `ChangeReport` entries with classification.

### 9. Git Integration Needs

- Access last committed snapshot on base branch (e.g., develop) for comparison.
- If absent: initial baseline creation (no diff entries, classification = INITIAL_BASELINE).
- Need commit hash references for each changed element to support traceability (optional Phase 2 extension).

### 10. Performance Considerations

Target: Diff execution < 5s for schemas up to 2000 types.
Approach: Single-pass maps keyed by fully-qualified element path (Type.field). Graph complexity small; O(n) relative to elements.

### 11. Failure Modes & Handling

| Failure                                            | Handling                                  |
| -------------------------------------------------- | ----------------------------------------- |
| Missing prior snapshot                             | Treat as baseline creation (non-blocking) |
| Malformed deprecation format after grace           | Block merge (INVALID_DEPRECATION_FORMAT)  |
| Override phrase present but reviewer not CODEOWNER | Block (report reason)                     |
| Clock skew in CI vs reality                        | Use UTC and compare dates strictly        |
| Large diff noise from ordering                     | Deterministic sort step prevents          |

### 12. Open Questions (Deferred)

- Should we version snapshots (e.g., keep historical beyond last)? (Deferred Phase 2)
- Automatic backfill for legacy deprecations lacking REMOVE_AFTER? (Potential migration script)

## Decision Summary Table

| Topic              | Decision                                     | Rationale                 |
| ------------------ | -------------------------------------------- | ------------------------- | ---------------- |
| Snapshot method    | Deterministic SDL + sort                     | Stable diffs              |
| Deprecation format | `REMOVE_AFTER=YYYY-MM-DD                     | reason`                   | Encodes schedule |
| Enum lifecycle     | 90-day minimum grace                         | Predictability            |
| Override phrase    | `BREAKING-APPROVED`                          | Explicit audit token      |
| Scalar policy      | JSON type category boundary defines breaking | Minimizes false positives |
| Baseline handling  | First run creates snapshot only              | Avoid spurious failures   |

## References

- Constitution principle 3 & 6
- GraphQL Spec: Deprecation directive semantics
- Internal feature spec `spec.md` FR-001..FR-019

---

Prepared by: Spec automation agent

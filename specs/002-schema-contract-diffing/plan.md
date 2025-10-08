# Implementation Plan: GraphQL Schema Contract Diffing & Enforcement

**Branch**: `002-schema-contract-diffing` | **Date**: 2025-10-07 | **Spec**: `./spec.md`
**Input**: Feature specification from `/specs/002-schema-contract-diffing/spec.md`

## Execution Flow (/plan command scope)

```
1. Load feature spec from Input path
2. Fill Technical Context (list unknowns & assumptions)
3. Constitution Check (principles 3,6, governance enforcement) initial pass
4. Phase 0 scope (research unknown policies)
5. Phase 1 design outline (contracts, data model for snapshot & diff artifacts)
6. Re-evaluate Constitution Check (predict compliance)
7. STOP (ready for /tasks)
```

## Summary

Automate generation, storage, and comparison of a canonical GraphQL schema snapshot to classify changes (ADDITIVE / DEPRECATED / BREAKING); block unapproved breaking changes and formalize a deprecation lifecycle with reporting.

## Technical Context

**Language/Version**: TypeScript (NestJS GraphQL)
**Primary Dependencies**: `@nestjs/graphql`, `graphql` (existing); (Decision: self-authored diff per research.md; external diff lib deferred)
**Storage**: Git-tracked snapshot file (`schema.graphql`) + optional JSON change report artifact
**Testing**: Jest (contract tests referencing snapshot)
**Target Platform**: Linux server CI environment
**Project Type**: Single backend service
**Performance Goals**: Diff execution ≤ 5s per run on typical schema size [ASSUMPTION]
**Constraints**: Must not require running full database migrations just to emit schema (use existing build context)
**Scale/Scope**: Single schema; multi-module contributions

**Unknowns / NEEDS CLARIFICATION**: (All previously open points resolved in spec Clarifications; retained here for historical trace)

- Override mechanism → CODEOWNER review phrase `BREAKING-APPROVED`.
- Enum deprecation lifecycle → 90-day minimum grace with REMOVE_AFTER date.
- Scalar internal change classification → Non-name, non-JSON-type changes NON_BREAKING.
- Annotation format → `REMOVE_AFTER=YYYY-MM-DD | reason`.
  No outstanding clarifications remain.

## Constitution Check

Principle Mapping:

- Principle 3 (Schema as Stable Contract): Direct alignment — feature enforces deprecation + diff discipline.
- Principle 6 (Testing): Contract (snapshot) tests defend invariants → compliant.
- Engineering Workflow #2: "Every schema-affecting PR MUST regenerate and diff" → operationalizes via CI gate.
- Governance: Provides automated enforcement artifact.

Initial Gate Assessment (Original → Updated):
| Gate | Status (Initial) | Status (Current) | Notes |
| ---- | ---------------- | ---------------- | ----- |
| Schema stability enforcement | PASS (planned) | PASS (designed) | Diff approach & snapshot hashing defined |
| Deprecation lifecycle tracking | PARTIAL | PASS (policy locked) | Enum lifecycle + annotation format decided |
| Test presence (contract) | PASS (planned) | PASS (planned) | Contract test placeholder remains |
| Governance override path | UNKNOWN | PASS (defined) | CODEOWNER + phrase approval workflow |
| No unjustified violations | PASS | PASS | None introduced |

Potential Deviations / Risks:

- If adopting external diff tool adds build time > budget (performance risk) → may need caching.
- Absence of existing deprecation metadata standard (need to define annotation convention).

## Project Structure

### Documentation (this feature)

```
specs/002-schema-contract-diffing/
├── spec.md
├── plan.md   <-- (this file)
├── research.md (Phase 0)
├── data-model.md (Phase 1)
├── quickstart.md (Phase 1)
├── contracts/ (Phase 1 - diff report schema, deprecation registry schema)
└── tasks.md (Phase 2 - generated later)
```

### Source Code (anticipated additions)

```
/scripts/schema/
  generate-schema.snapshot.ts        # invokes existing Nest GraphQL factory (Phase 1 design) [NO IMPLEMENTATION YET]
  diff-schema.ts                     # logic to classify changes (placeholder name)
  validate-deprecations.ts           # checks removal policy compliance

/.github/workflows/
  schema-contract.yml                # CI workflow invoking scripts (design placeholder)

/contract-tests/
  schema.contract.spec.ts            # snapshot vs generated comparison
```

**Structure Decision**: Extend existing backend with a scripts folder + contract test folder; minimal intrusion.

## Phase 0: Outline & Research

Research Targets (All Completed → see `research.md`):

1. Tool selection → self-authored deterministic AST diff.
2. Deprecation metadata standard → unified reason string with REMOVE_AFTER token.
3. Override governance → CODEOWNER + `BREAKING-APPROVED` phrase (no label required).
4. Enum lifecycle semantics → 90-day minimum + removal date check.
5. Scalar change classification → JSON type category boundary defines breaking.

Output (research.md) Sections:

- Decision: Tooling
- Decision: Annotation Format
- Decision: Override Workflow
- Decision: Enum Policy
- Decision: Scalar Policy
  Each with rationale & alternatives.

## Phase 1: Design & Contracts

Planned Artifacts (Created Unless Noted):

- data-model.md ✅
- contracts/ (`change-report.schema.json`, `deprecation-registry.schema.json`) ✅
- quickstart.md ✅
- research.md ✅
- tasks.md ✅
- contract tests (pending implementation phase) ⏳

Design Considerations:

- Determinism: Sorting type definitions & AST printing normalization.
- Hashing: SHA256 of canonical schema text to detect meaningful changes.
- Classification Rules Table (to include in data-model).

Re-evaluated Constitution Check (Predictive): All gates expected PASS once override workflow & annotation format decided.

## Phase 2: Task Planning Approach (Preview)

- Extract tasks per artifact (scripts, contracts, tests, workflow).
- Parallelizable: JSON schemas, quickstart doc, contract test scaffolding.
- Sequential: Research → data model → diff logic, then contract test enablement.

## Phase 3+: Future Implementation

Out of scope for /plan; will implement via tasks.md after /tasks command.

## Complexity Tracking

| Violation  | Why Needed | Simpler Alternative Rejected Because |
| ---------- | ---------- | ------------------------------------ |
| (none yet) |            |                                      |

## Progress Tracking

**Phase Status**:

**Gate Status**:

## Open Questions (Consolidated)

**FR Coverage Reference**

Detailed live mapping of FR-001..FR-019 to implementation status is maintained in `coverage.md` within this feature directory. This document MUST be updated alongside any change impacting requirement satisfaction.

## Assumptions

- Generating schema does not require a live DB connection beyond metadata reflection.
- CI environment has NodeJS & can install diff tool quickly (<10s).
- Current schema size manageable for AST diff approach < 5s.

## Success Metrics

- 0 unapproved BREAKING changes merged per quarter.
- <5% of schema-changing PRs require override.
- Diff step adds <10% to CI duration (baseline).
- Complete deprecation registry accuracy (no orphaned deprecated fields) = 100%.

## Out of Scope

- Runtime schema introspection endpoints.
- Automatic client SDK regeneration.
- Versioned multi-schema management.

---

_Based on Constitution v1.0.0 - See `/memory/constitution.md`_

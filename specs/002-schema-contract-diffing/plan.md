# Implementation Plan: GraphQL Schema Contract Diffing & Enforcement

**Branch**: `002-schema-contract-diffing` | **Date**: 2025-10-07 | **Spec**: `./spec.md`
Automate generation, storage, and comparison of a canonical GraphQL schema snapshot to classify changes using a comprehensive taxonomy (ADDITIVE / DEPRECATED / DEPRECATION_GRACE / INVALID_DEPRECATION_FORMAT / BREAKING / PREMATURE_REMOVAL / INFO / BASELINE); block unapproved BREAKING or PREMATURE_REMOVAL changes and formalize a deprecation lifecycle with reporting & retirement metadata.

Override mechanism → CODEOWNER review phrase `BREAKING-APPROVED` (applies to BREAKING & PREMATURE_REMOVAL entries; per-entry `override: true`).

Enum deprecation lifecycle → 90-day minimum window + REMOVE_AFTER date; valid retirement emits INFO + `retired=true` & `retirementDate` in registry.

1. Load feature spec from Input path
   Scalar internal change classification → Non-name, non-JSON-type changes NON_BREAKING (INFO entry for description only). Unknown inference defaults to `jsonType=unknown` NON_BREAKING.
2. Constitution Check (principles 3,6, governance enforcement) initial pass
   Annotation format → `REMOVE_AFTER=YYYY-MM-DD | reason` with 24h grace (`DEPRECATION_GRACE` + `graceExpiresAt`) before escalation to INVALID_DEPRECATION_FORMAT.
3. Phase 1 design outline (contracts, data model for snapshot & diff artifacts)
   Governance override path | UNKNOWN | PASS (defined) | CODEOWNER + phrase approval workflow (BREAKING & PREMATURE_REMOVAL supported) |
4. STOP (ready for /tasks)
   Deprecation lifecycle tracking | PARTIAL | PASS (policy locked) | Enum lifecycle + annotation format + retirement metadata decided |

- Classification Rules Table (extended taxonomy) to include in data-model & spec.

Automate generation, storage, and comparison of a canonical GraphQL schema snapshot to classify changes (ADDITIVE / DEPRECATED / BREAKING); block unapproved breaking changes and formalize a deprecation lifecycle with reporting.

- <5% of schema-changing PRs require override (sum of BREAKING + PREMATURE_REMOVAL overrides).

## Technical Context

- `change-report.json` (diff classification) stored under `tmp/` or CI workspace and uploaded as workflow artifact only; contains per-entry `override`, optional `graceExpiresAt`, and scalar evaluations.
- `deprecations.json` / `deprecation-registry.json` generated and uploaded (legacy `deprecations.schema.json` retained as backward-compatible schema reference; new pipeline prefers `deprecation-registry.schema.json`) including `retired` + `retirementDate` for elements past lifecycle window & removed.
  **Storage**: Git-tracked snapshot file (`schema.graphql`) + optional JSON change report artifact
  **Testing**: Jest (contract tests referencing snapshot)
  **Target Platform**: Linux server CI environment
- BREAKING or PREMATURE_REMOVAL classifications require override phrase validation before merge; snapshot update must reflect the approved change once validated and entries will be marked `override: true`.

## Extended Functional Requirements (FR-023 .. FR-030)

| FR     | Summary                                                                                    |
| ------ | ------------------------------------------------------------------------------------------ |
| FR-023 | JSON Schema validation MUST pass for `change-report.json` & `deprecations.json` (CI gate). |
| FR-024 | Per-entry override flag set for each BREAKING or PREMATURE_REMOVAL entry when approved.    |
| FR-025 | Baseline scenario emits BASELINE entry & sets classifications.baseline=1.                  |
| FR-026 | Synthetic large diff completes <5s (performance budget).                                   |
| FR-027 | Unknown scalar jsonType inference falls back to `unknown` NON_BREAKING evaluation.         |
| FR-028 | Grace period classification DEPRECATION_GRACE (<24h unscheduled) with `graceExpiresAt`.    |
| FR-029 | Retirement metadata captured (`retired=true`, `retirementDate`) for compliant removals.    |
| FR-030 | ClassificationCount includes `baseline` key always (0 unless baseline).                    |

Tracking: coverage-fr-mapping.md extended with implementation & test artifacts for these FRs.
**Performance Goals**: Diff execution ≤ 5s per run on typical schema size [ASSUMPTION]
**Constraints**: Must not require running full database migrations just to emit schema (use existing build context)
**Additional Constraint (Lightweight Bootstrap)**: New lightweight module MUST avoid establishing any network connections; if a module requires infra, provide an in-memory stub.
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
  schema.parity.spec.ts              # compares AppModule vs SchemaBootstrapModule SDL

src/schema-bootstrap/
  module.schema-bootstrap.ts         # Lightweight GraphQL-only assembly
  stubs/                             # No-op providers for cache/db/mq/search
```

**Structure Decision**: Extend existing backend with a scripts folder + contract test folder; minimal intrusion.

## Implementation Artifacts (Post-Plan Update 2025-10-08)

A lightweight developer-facing overview now lives at `src/schema-contract/README.md` (added after initial planning). It consolidates:

- Subsystem purpose & module breakdown (classify, diff, deprecation, governance, snapshot, model)
- Governance override order of operations
- Deprecation lifecycle rules & REMOVE_AFTER semantics
- Granular coverage gate rationale (scoped thresholds vs legacy code)
- Performance test categories (full-schema vs large isolated schema)
- Extension guidance & future enhancements

This plan references that README as the canonical quickstart / day-2 operations guide. Architectural intent and governance rationale remain here; operational details and commands can evolve in the README without rewriting historical planning context.

## Architecture Overview (ASCII Diagrams)

### 1. Classification & Reporting Flow

```
┌────────────────┐      ┌──────────────────────┐
│ Baseline SDL   │      │ Current Generated SDL│
└───────┬────────┘      └──────────┬───────────┘
      │ hash (sha256)                     │
      v                                   v
┌────────────────┐                    ┌───────────────┐
│ Baseline Hash  │                    │ Current AST    │
└────────┬───────┘                    └──────┬─────────┘
      │                                   │
      │                 ┌─────────────────▼────────────────┐
      │                 │   Diff Engines (types/enums/...)  │
      │                 └───────────────┬──────────────────┘
      │                               Raw Change Entries
      │                                   │
      │                        ┌──────────▼──────────┐
      │                        │ Governance Overrides │ (CODEOWNERS + reviews)
      │                        └──────────┬──────────┘
      │                                   │ annotated entries
      │                        ┌──────────▼──────────┐
      │                        │ Deprecation Checks  │ (REMOVE_AFTER validation)
      │                        └──────────┬──────────┘
      │                                   │ classified entries
      │                        ┌──────────▼───────────┐
      └──────────────────────▶ │ Final Change Report   │
                       └──────────────────────┘
```

Key Guarantees:

- Deterministic ordering & hashing ensures stable baselines.
- Governance applied before lifecycle validation so approved removals are contextualized.
- Deprecation stage can reclassify potential breaking removals into policy-compliant transitions.

### 2. Governance Override Evaluation Sequence

```
Raw Change
  │
  ▼
Extract Element Path
  │
  ▼
Match CODEOWNERS Patterns
  │  (expands to responsible owners)
  ▼
Collect PR Reviews
  │
  ├─► Validate Reviewer ∈ Owners
  │
  └─► Scan Review Body for token `BREAKING-APPROVED`
         │
         ▼
    Set override flags (approvedBreaking=true)
         │
         ▼
    Annotate Change Entry (governance metadata)
```

Decision Rules:

- Token ignored if author not in resolved owner set.
- Multiple tokens collapse to single flag; no additive effect.
- Absence of matching owner review keeps change in pending/blocked state if BREAKING.

### 3. Deprecation Removal Decision Tree

```
           ┌──────────────┐
           │ Field Removed│
           └───────┬──────┘
                │Yes
                v
           Has REMOVE_AFTER? ── No ──► INVALID BREAKING (policy violation)
                │Yes
                v
          Current Date ≥ REMOVE_AFTER? ── No ──► EARLY REMOVAL (invalid)
                │Yes
                v
      Override Approved? (if BREAKING semantics) ── No ──► BLOCKED BREAKING
                │Yes
                v
            VALID BREAKING (allowed)
```

Additional Paths:

- If not removed & annotated: tracked in registry; warning classification until removal window reached.
- Past REMOVE_AFTER but not removed: emits overdue notification classification.

### 4. Coverage Gate Strategy (Conceptual Matrix)

```
Module       Lines  Funcs  Branches  Rationale
-----------  -----  -----  --------  -----------------------------
classify     High   High   High      Orchestrator core logic
diff         High   High   High      Critical change semantics
governance   High   High   Medium+   Pattern/review parsing
deprecation  High   High   Moderate  Date/edge cases iterative
snapshot     High   High   Low*      I/O error paths gated later
model        100%   100%   100%      Simple type defs
```

\*Low branch threshold intentionally accepted due to limited conditional complexity (file existence guards) – future work will add synthetic error-path tests to raise it.

## Diagram Sources (PlantUML)

Corresponding editable PlantUML sources have been added under `specs/002-schema-contract-diffing/diagrams/`:

| Concept                         | File                             |
| ------------------------------- | -------------------------------- |
| Classification & Reporting Flow | `classification-flow.puml`       |
| Governance Overrides Sequence   | `governance-overrides.puml`      |
| Deprecation Decision Tree       | `deprecation-decision-tree.puml` |
| Coverage Gate Matrix            | `coverage-matrix.puml`           |

### Rendering Instructions

Local (requires Java + PlantUML jar or docker):

Option 1 (Docker):

```
docker run --rm -v $(pwd)/specs/002-schema-contract-diffing/diagrams:/diagrams plantuml/plantuml -tpng /diagrams/*.puml
```

Option 2 (CLI with jar):

```
plantuml -tpng specs/002-schema-contract-diffing/diagrams/*.puml
```

Outputs (`.png`) will sit alongside the `.puml` files and can be attached to PRs or embedded in downstream docs. Keep ASCII versions in this plan for diff readability in Git.

Change Policy:

1. Update ASCII + `.puml` together to avoid drift.
2. For purely cosmetic diagram changes, no README update required.
3. Any semantic pipeline or rule change must update README + plan rationale sections.

## README / Plan Synchronization Policy

To prevent documentation drift:

1. Governance / lifecycle rule changes MUST update both this plan (rationale) and the README (practical guidance).
2. Coverage threshold adjustments: update README (summary) + commit rationale delta here.
3. New diff dimension (e.g., interfaces) requires: data-model update, diagram extension (Classification Flow), README Extension section example.

Audit Hook (manual for now): During PR review, reviewer checks that any changes under `src/schema-contract/` touching rules also modify either this plan or README.

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
- Lightweight bootstrap parity: enforce identical type system without external infra.

Re-evaluated Constitution Check (Predictive): All gates expected PASS once override workflow & annotation format decided. Lightweight bootstrap strengthens Principle 6 (faster deterministic contract tests) and reduces external coupling.

## Phase 1.5: Lightweight Schema Bootstrap (New)

Goals:

1. Implement `SchemaBootstrapModule` importing only modules that declare GraphQL schema elements.
2. Provide stub providers: cache (Map-based), TypeORM DataSource mock (returns minimal metadata APIs), messaging/search no-ops.
3. Env flag `SCHEMA_BOOTSTRAP_LIGHT=1` toggles usage in `print-schema.ts`.
4. Add SDL parity test comparing `AppModule` vs `SchemaBootstrapModule` (expect exact string equality); failing diff breaks build.

Success Metrics:

- Cold bootstrap < 2s in CI environment.
- No connection attempts (assert absence of common ECONNREFUSED patterns in logs during test).
- Zero schema diff.

Fallback Plan:

- If a module cannot be cleanly stubbed, isolate its GraphQL types into a new `*-graphql.module.ts` imported by both full and lightweight assemblies.

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

## Risk Register (Extended)

| Risk                                          | Impact | Mitigation                                                                    |
| --------------------------------------------- | ------ | ----------------------------------------------------------------------------- |
| Inconsistent SDL ordering causing noisy diffs | Medium | Deterministic sorter                                                          |
| Override misuse (phrase copied by non-owner)  | High   | Verify reviewer is CODEOWNER                                                  |
| Enum sinceDate approximation inaccurate       | Low    | Accept approximation; refine later                                            |
| Performance regression on large schemas       | Medium | Perf test; profile bottlenecks                                                |
| Missing scalar jsonType metadata initially    | Low    | Add directive injection step (deferred)                                       |
| Lightweight module drifts from full schema    | Medium | Parity test enforcing zero diff                                               |
| Hidden side-effect in required module         | Medium | Refactor into side-effect vs schema export submodules                         |
| Stubs accidentally used in production         | Low    | Env gating & distinct import path                                             |
| Future schema growth inflates diff time       | Low    | Current perf test (~10–20ms for 260 types) leaves ample headroom (<5s budget) |
| Override phrase spoof attempt                 | Low    | CODEOWNERS reviewer validation + explicit reviewer token check                |
| Coverage regression below 90%                 | Medium | Jest coverageThreshold gate added (T051)                                      |

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

## Snapshot & Artifact Path Policy (Added for T005)

Authoritative committed snapshot:

- Path: `schema.graphql` at repository root (future relocation to `contracts/` considered but deferred for discoverability).
- Must be committed with any schema-affecting PR after running the diff script.
- Deterministic generation required; any non-functional reordering constitutes a failing pre-commit check (to be enforced via future lint hook, outside this feature scope).

Ephemeral artifacts (NOT committed):

- `change-report.json` (diff classification) stored under `tmp/` or CI workspace and uploaded as workflow artifact only.
- `deprecations.json` / `deprecation-registry.json` generated and uploaded (legacy `deprecations.schema.json` retained as backward-compatible schema reference; new pipeline prefers `deprecation-registry.schema.json`).

Backward Compatibility Note:

- Both `deprecation-registry.schema.json` and legacy `deprecations.schema.json` schemas are present; generation script will produce only the new format name, while tests will accept legacy input if encountered (migration grace period).

Governance:

- A PR introducing a modified snapshot without corresponding `change-report.json` CI artifact is non-compliant.
- BREAKING classification requires override phrase validation before merge; snapshot update must reflect the approved breaking change once validated.

## Out of Scope

- Runtime schema introspection endpoints.
- Automatic client SDK regeneration.
- Versioned multi-schema management.

---

_Based on Constitution v1.0.0 - See `/memory/constitution.md`_

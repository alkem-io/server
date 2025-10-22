# Feature Specification: GraphQL Schema Contract Diffing & Enforcement

**Feature Branch**: `002-schema-contract-diffing`
**Created**: 2025-10-07
**Status**: Draft
**Input**: User description: "Introduce automated schema snapshot generation and breaking change detection to enforce contract stability per constitution principle 3."

## Execution Flow (main)

```
1. Parse user description from Input
2. Extract key concepts: schema snapshot, breaking change detection, deprecation lifecycle, enforcement gates
3. Mark ambiguities
4. Define user scenarios (product & dev experience)
5. Generate functional requirements (testable)
6. Identify key entities (SchemaSnapshot, ChangeReport)
7. Run checklist
8. Return: SUCCESS
```

---

## ⚡ Quick Guidelines

(Refer to template – retained for completeness)

## User Scenarios & Testing _(mandatory)_

### Primary User Story

As a platform maintainer, I want automated detection of breaking GraphQL schema changes so that we prevent accidental contract regressions and follow a consistent deprecation policy.

### Acceptance Scenarios

1. **Given** an updated schema with only additive, non-breaking changes, **When** CI runs the schema diff gate, **Then** the build passes and generates an updated snapshot.
2. **Given** a field removal without prior deprecation period, **When** CI runs the diff gate, **Then** the build fails with a report referencing the violating field.
3. **Given** a deprecated field whose removal date has arrived, **When** the field is removed, **Then** CI passes and logs a successful retirement entry.
4. **Given** a schema change that alters a field type incompatibly (e.g., Int→String), **When** the diff gate executes, **Then** it fails with change classification = BREAKING.
5. **Given** a PR containing intentional breaking changes with required codeowner approval phrase, **When** CI runs, **Then** build emits a WARNING classification and allows merge only if the approval review contains the phrase `BREAKING-APPROVED` from an authorized CODEOWNER.
6. **Given** an enum value marked deprecated fewer than 90 days ago, **When** a PR attempts to remove it, **Then** CI fails with classification = PREMATURE_REMOVAL.
7. **Given** an enum value deprecated ≥90 days with a past removal date, **When** it is removed, **Then** CI passes and logs a retirement entry in the deprecation report.
8. **Given** a newly added deprecation without a `REMOVE_AFTER=` schedule and introduced <24h ago, **When** CI evaluates it, **Then** it is classified as DEPRECATION_GRACE and the gate passes with a warning.
9. **Given** a newly added deprecation without a valid schedule and introduced ≥24h ago, **When** CI evaluates it, **Then** it is classified as INVALID_DEPRECATION_FORMAT and the gate fails.
10. **Given** the first run with no prior snapshot, **When** CI executes diff, **Then** it produces a BASELINE classification entry and passes.
11. **Given** a premature removal classification accompanied by a valid CODEOWNER override phrase, **When** CI evaluates, **Then** the gate passes and marks only those removal entries with `override: true` and sets `overrideApplied=true` at report level.
12. **Given** a scalar whose JSON type category changes (string→number), **When** diff runs, **Then** it emits a BREAKING entry and scalar evaluation with `behaviorChangeClassification=BREAKING`.
13. **Given** a scalar whose description changes but JSON type category is stable, **When** diff runs, **Then** it emits an INFO entry and scalar evaluation with `behaviorChangeClassification=NON_BREAKING`.
14. **Given** a large synthetic schema (≥180 object types) with moderate churn, **When** diff runs in CI, **Then** it completes <5s and performance test passes.
15. **Given** generated artifacts `change-report.json` and `deprecations.json`, **When** validation runs, **Then** correctly structured documents pass JSON Schema validation and malformed ones (e.g., missing required fields) fail.

### Edge Cases

- Snapshot file missing (first run) → treat as baseline creation.
- Field deprecation annotation missing removal date → validation warning.
- Custom scalar validation change:
  - Relaxation (broadens accepted inputs without narrowing prior accepted set) → ADDITIVE (non-breaking) classification.
  - Tightening (rejects inputs previously accepted) → BREAKING classification.
- Deprecation reason string malformed (missing REMOVE_AFTER= prefix) → validation error classification = INVALID_DEPRECATION_FORMAT.
- Custom scalar description wording change without altering name or serialized JSON type → NON_BREAKING (documented informational note).
- Custom scalar serialization JSON type change (e.g., string→number) → BREAKING.
- Removal after `removeAfter` date but before 90-day minimum window elapsed → BREAKING (lifecycle metadata incomplete).
- Removal after `removeAfter` date and ≥90 days window elapsed → INFO retirement entry (not BREAKING).
- Unknown scalar JSON type (heuristic cannot infer) → reported as `jsonType=unknown`, evaluation classification NON_BREAKING unless removed or changed later.
- Override applies to BREAKING and PREMATURE_REMOVAL entries only; other classifications remain unaffected.
- Classification counts always include `baseline` key (0 unless BASELINE scenario).

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST generate a deterministic `schema.graphql` snapshot on each schema-affecting PR.
- **FR-002**: System MUST compare current build schema to last committed snapshot and classify changes among the full taxonomy: ADDITIVE | DEPRECATED | DEPRECATION_GRACE | INVALID_DEPRECATION_FORMAT | BREAKING | PREMATURE_REMOVAL | INFO | BASELINE.
- **FR-003**: A PR introducing BREAKING or PREMATURE_REMOVAL classifications MUST fail CI unless a CODEOWNER review includes the exact approval phrase `BREAKING-APPROVED` (case sensitive) in the review body; CI MUST verify reviewer is in CODEOWNERS set and mark overridden entries with `override: true`.
- **FR-004**: Removed fields MUST have been previously marked with `@deprecated` and an associated removal date not in the future.
- **FR-005**: Deprecation report MUST list: field name, first deprecation commit reference, planned removal date.
- **FR-006**: Change report MUST be attached as build artifact or comment.
- **FR-007**: System MUST ignore pure description or deprecation reason text edits (non-breaking) but record them.
- **FR-008**: System MUST detect type narrowing (nullable→non-nullable) as BREAKING.
- **FR-009**: System MUST treat enum value removals as BREAKING.
- **FR-010**: System MUST allow additive enum value additions (ADDITIVE classification) but flag if a value was previously soft-deprecated (include prior deprecation metadata in change report) and not yet removed.
- **FR-011**: Enum value removal MUST only occur ≥90 days after its deprecation `sinceDate` AND only if current date >= declared `removeAfter` date; otherwise classify as BREAKING (if no prior deprecation) or PREMATURE_REMOVAL (if deprecation window incomplete).
- **FR-012**: Deprecation metadata for enum values MUST include `sinceDate` (ISO8601) and `removeAfter` (ISO8601) with `removeAfter - sinceDate >= 90 days`.
- **FR-013**: Field and enum value deprecations MUST encode removal schedule using a single standard reason string format: `REMOVE_AFTER=YYYY-MM-DD | <human readable reason>` inside the `@deprecated(reason: "...")` directive.
- **FR-014**: Parsing MUST treat absence of `REMOVE_AFTER=` token as a WARNING if added within last 24h of deprecation (grace) else ERROR blocking merge.
- **FR-015**: Removal attempt MUST verify the prior snapshot contained the element with a valid `REMOVE_AFTER` entry whose date is in the past; else classify removal as BREAKING.
- **FR-016**: Change report MUST include a `deprecationFormatValid` boolean for each deprecated element.
- **FR-017**: Custom scalar implementation or description text changes MUST be classified NON_BREAKING provided: (a) scalar name unchanged, (b) serialized JSON type category unchanged (string|number|boolean|object|array), (c) no new validation rejection path added.
- **FR-018**: A change to the serialized JSON type category of a custom scalar MUST be classified BREAKING.
- **FR-019**: Change report MUST include for each custom scalar: `jsonTypePrevious`, `jsonTypeCurrent`, `behaviorChangeClassification` (NON_BREAKING|BREAKING) plus `reason`.
- **FR-019a**: Custom scalar validation relaxations MUST be classified NON_BREAKING; validation tightenings (removing previously valid inputs) MUST be classified BREAKING. The diff engine MUST verify relaxation vs tightening by set difference heuristics (implemented via representative sample tests or explicit developer annotation fallback if automatic detection is infeasible).
- **FR-020**: A dedicated lightweight `SchemaBootstrapModule` MUST exist that imports only the minimal Nest modules required to construct the GraphQL schema (domain GraphQL types & scalars) and explicitly excludes external infrastructure integrations (Redis cache store, TypeORM DB connection, RabbitMQ, Elasticsearch, external HTTP integrations) so that schema generation can run in CI without provisioning those services.
- **FR-021**: The schema printing script MUST use `SchemaBootstrapModule` instead of the full `AppModule` when an environment variable `SCHEMA_BOOTSTRAP_LIGHT=1` is set; defaulting to `AppModule` otherwise for parity in local dev.
- **FR-022**: The lightweight bootstrap MUST complete within < 2s cold start in CI (target measured after implementation) and MUST NOT attempt network connections to excluded services (verified by absence of connection error logs & by mocking env to unreachable hosts in a contract test).
- **FR-023**: Generated artifacts `change-report.json` and `deprecations.json` MUST validate against committed JSON Schemas (`change-report.schema.json`, `deprecations.schema.json`) and CI MUST fail on validation errors.
- **FR-024**: When an override is applied, each BREAKING or PREMATURE_REMOVAL entry MUST include `override: true` while other entries remain unchanged; the presence of at least one overridden entry MUST set report-level `overrideApplied=true`.
- **FR-025**: First-run (no prior snapshot) MUST emit a BASELINE classification entry and set `classifications.baseline=1` with other counts 0.
- **FR-026**: Diff engine MUST complete against a synthetic large schema (<5s wall time) and emit performance metrics logged in test output.
- **FR-027**: Scalar evaluation MUST record `jsonTypeCurrent='unknown'` when inference fails and classify behavior NON_BREAKING unless removal/type change occurs.
- **FR-028**: Newly introduced deprecations lacking `REMOVE_AFTER` within a 24h grace MUST be classified DEPRECATION_GRACE (non-blocking) and include `graceExpiresAt` timestamp in the entry.
- **FR-029**: Deprecations registry entries MUST include `retired=true` and `retirementDate` when an element is removed after a valid window (≥90 days & past removeAfter).
- **FR-030**: Classification counts MUST include a `baseline` property (integer) even when zero.

### Non-Goals (Lightweight Bootstrap)

- Running migrations or initializing full persistence layers.
- Starting web sockets, subscriptions transports, or background schedulers.
- Instantiating modules whose only purpose is runtime side-effects (e.g., ingestion pipelines) when their exported GraphQL types are not required for schema construction. If a domain module currently couples side-effects with type definitions, refactoring tasks (see tasks.md) will isolate the type exports.

### Design Addition: Lightweight Schema Bootstrap

To reduce CI complexity (currently requiring Redis/MySQL/RabbitMQ just to emit SDL) we introduce `SchemaBootstrapModule`.

Key principles:

1. Pure schema assembly: Limit imports to modules that declare GraphQL object types, inputs, enums, interfaces, unions, custom scalars, or directives.
2. No external side-effects: Replace infrastructural providers (cache, db, message bus) with in-memory or no-op stubs where required by dependent modules.
3. Conditional activation: Controlled by `SCHEMA_BOOTSTRAP_LIGHT` env flag to avoid impacting existing runtime behavior.
4. Stable public contract: Resulting schema MUST be byte-for-byte identical to full app schema except for omissions strictly derived from excluded modules; any omission constitutes a test failure unless explicitly approved and documented in `coverage.md`.

Implementation outline (summary – detailed tasks in plan & tasks docs):

- Introduce `src/schema-bootstrap/module.schema-bootstrap.ts` exporting `SchemaBootstrapModule`.
- Extract GraphQL-only submodules from `AppModule` where needed (e.g., create `*GraphQLExportsModule` variants) to avoid importing heavy provider logic.
- Provide stub providers (e.g., `Cache` token, `DataSource` mock) returning inert objects sufficient for module wiring but never performing I/O.
- Adapt `print-schema.ts` to look for `SCHEMA_BOOTSTRAP_LIGHT` and bootstrap the chosen module.
- Add a contract test verifying equivalence of type system between full and light modules (except for an allowlist described in documentation if necessary).

Risks & Mitigations:

- Risk: Hidden side-effect initialization inside a required domain module → Mitigation: Introduce explicit `GraphQLExportsModule` pattern factoring side-effects into a sibling module not imported by `SchemaBootstrapModule`.
- Risk: Divergence in future schema evolution (forgotten to update light module) → Mitigation: Add test comparing printed SDL from both modules (Delta must be empty) gating PRs.

Open Question (tracked): Should we auto-generate `SchemaBootstrapModule` imports from a metadata tag? (Deferred – manual curation initially.)

### Key Entities

- **SchemaSnapshot**: Stored canonical SDL text + hash + timestamp.
- **ChangeReport**: Aggregates diff categories and impacted elements.
- **DeprecationEntry**: Field/type deprecation metadata (name, sinceDate, removalDate).
- **ScalarChangeEvaluation**: Per-scalar previous/current JSON type category + behavior classification.
- **DeprecationsRegistry Artifact (`deprecations.json`)**: Array of `DeprecationEntry` plus retirement status & timestamp.
- **ClassificationCount**: Includes keys additive, deprecated, breaking, prematureRemoval, invalidDeprecation, deprecationGrace, info, baseline.
  - All keys MUST be present even if zero; `baseline=1` only on first snapshot.

### Classification Taxonomy (Expanded)

| Classification             | Gate Behavior          | Override Eligible | Notes                                                              |
| -------------------------- | ---------------------- | ----------------- | ------------------------------------------------------------------ |
| ADDITIVE                   | Pass                   | No                | Safe expansion of contract                                         |
| DEPRECATED                 | Pass                   | No                | Properly scheduled deprecation introduced                          |
| DEPRECATION_GRACE          | Pass (Warn)            | No                | <24h missing schedule; must add `REMOVE_AFTER` before grace expiry |
| INVALID_DEPRECATION_FORMAT | Fail                   | No                | Schedule missing/invalid after grace period                        |
| BREAKING                   | Fail (unless override) | Yes               | Incompatible removal or type narrowing / scalar jsonType shift     |
| PREMATURE_REMOVAL          | Fail (unless override) | Yes               | Attempt before ≥90d & removeAfter date reached                     |
| INFO                       | Pass                   | No                | Benign descriptive or lifecycle retirement entry                   |
| BASELINE                   | Pass                   | No                | First snapshot initialization                                      |

## Review & Acceptance Checklist

### Content Quality

- [ ] No implementation details
- [ ] Focused on user/business impact (stability, trust)
- [ ] Non-technical stakeholder readable
- [ ] Mandatory sections complete

### Requirement Completeness

- [ ] No remaining [NEEDS CLARIFICATION]
- [ ] Requirements testable
- [ ] Success metrics measurable (0 unapproved breaking changes merged per quarter)
- [ ] Scope bounded (GraphQL schema only)
- [ ] Dependencies identified (CI pipeline, repository access)

## Execution Status

- [ ] User description parsed
- [ ] Key concepts extracted
- [ ] Ambiguities marked
- [ ] User scenarios defined
- [ ] Requirements generated
- [ ] Entities identified
- [ ] Review checklist passed

## Clarifications

### Session 2025-10-07

- Q: How should an intentional BREAKING schema change be formally approved so CI can allow it? → A: CODEOWNER review phrase `BREAKING-APPROVED` (Option D)
- Q: What enum deprecation lifecycle should we enforce before a value can be removed? → A: Time-based 90-day minimum grace period (Option B)
- Q: What annotation format should we standardize for field/enum deprecations to encode reason and removal timeline? → A: Dual fields in standard reason `REMOVE_AFTER=YYYY-MM-DD | reason` (Option D)
- Q: How should internal custom scalar implementation/detail changes be classified to avoid false BREAKING flags? → A: Treat all non-name, non-JSON-type changes as NON-BREAKING (Option A)

### Session 2025-10-08

- Q: Custom scalar whitelist / validation change policy? → A: Validation relaxations ADDITIVE; tightenings BREAKING (Option C)

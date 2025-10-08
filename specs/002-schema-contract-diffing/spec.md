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

### Edge Cases

- Snapshot file missing (first run) → treat as baseline creation.
- Field deprecation annotation missing removal date → validation warning.
- Custom scalar validation change:
  - Relaxation (broadens accepted inputs without narrowing prior accepted set) → ADDITIVE (non-breaking) classification.
  - Tightening (rejects inputs previously accepted) → BREAKING classification.
- Deprecation reason string malformed (missing REMOVE_AFTER= prefix) → validation error classification = INVALID_DEPRECATION_FORMAT.
- Custom scalar description wording change without altering name or serialized JSON type → NON_BREAKING (documented informational note).
- Custom scalar serialization JSON type change (e.g., string→number) → BREAKING.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST generate a deterministic `schema.graphql` snapshot on each schema-affecting PR.
- **FR-002**: System MUST compare current build schema to last committed snapshot and classify changes as ADDITIVE / DEPRECATED / BREAKING.
- **FR-003**: A PR introducing BREAKING changes MUST fail CI unless a CODEOWNER review includes the exact approval phrase `BREAKING-APPROVED` (case sensitive) in the review body; CI MUST verify reviewer is in CODEOWNERS set.
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
- **FR-019a**: Custom scalar validation relaxations MUST be classified ADDITIVE; validation tightenings (removing previously valid inputs) MUST be classified BREAKING. The diff engine MUST verify relaxation vs tightening by set difference heuristics (implemented via representative sample tests or explicit developer annotation fallback if automatic detection is infeasible).
- **FR-020**: A dedicated lightweight `SchemaBootstrapModule` MUST exist that imports only the minimal Nest modules required to construct the GraphQL schema (domain GraphQL types & scalars) and explicitly excludes external infrastructure integrations (Redis cache store, TypeORM DB connection, RabbitMQ, Elasticsearch, external HTTP integrations) so that schema generation can run in CI without provisioning those services.
- **FR-021**: The schema printing script MUST use `SchemaBootstrapModule` instead of the full `AppModule` when an environment variable `SCHEMA_BOOTSTRAP_LIGHT=1` is set; defaulting to `AppModule` otherwise for parity in local dev.
- **FR-022**: The lightweight bootstrap MUST complete within < 2s cold start in CI (target measured after implementation) and MUST NOT attempt network connections to excluded services (verified by absence of connection error logs & by mocking env to unreachable hosts in a contract test).

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

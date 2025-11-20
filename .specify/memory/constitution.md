<!-- Implements constitution & agents.md. Does not introduce new governance. -->

<!--
Sync Impact Report
Version change: 1.0.0 → 2.0.0 (re-balanced observability + testing principles)
Modified principles: 5. Observability & Operational Readiness (clarified signal expectations), 6. Code Quality with Pragmatic Testing (risk-based guidance)
Added sections: (none)
Removed sections: (none)
Templates requiring updates:
 - .specify/templates/plan-template.md (Constitution Check alignment) ✅
 - .specify/templates/tasks-template.md (testing guidance note) ✅
 - .specify/templates/spec-template.md (no changes required) ✅
Deferred TODOs: None
-->

# Alkemio Server Engineering Constitution

See also [`agents.md`](../../agents.md) and [`copilot-instructions.md`](../../.github/copilot-instructions.md) for operational guidance derived from this document.

## Core Principles

### 1. Domain-Centric Design First

All core business logic MUST reside in clearly defined domain modules (under `src/domain`). Application services orchestrate domain objects; they MUST NOT embed business rules. Entities, value objects, aggregates, events, and repositories follow explicit contracts. Cross-domain coupling MUST occur only through published domain events or anti-corruption layers. Any PR introducing logic in controllers or resolvers that belongs to the domain MUST refactor before merge.

### 2. Modular NestJS Boundaries

Each feature set MUST map to a NestJS module with a single, testable purpose. Modules expose only necessary providers; internal helpers remain private. Circular dependencies are forbidden—violations require redesign. Shared utilities live in `src/library` (pure, side‑effect free),`src/common` (infrastructure + cross-cutting concerns) or `src/core` (core application flows like authentication, authorization, middlewares, pagination, filtering, exception handling). Adding a new module requires: purpose statement, public providers list, and dependency justification.

### 3. GraphQL Schema as Stable Contract

The GraphQL schema is a public contract. Breaking field removals or type changes REQUIRE deprecation (mark with `@deprecated` and a removal date) and MINOR or MAJOR version review. All mutations MUST validate inputs at DTO layer and surface typed domain errors mapped to GraphQL error codes. Pagination follows the documented pattern (cursor or offset as per `docs/Pagination.md`). No resolver may perform ad-hoc data shaping already represented in the domain model.

### 4. Explicit Data & Event Flow

State changes MUST propagate through domain services emitting events (synchronous in-process or queued for async delivery). Side effects (notifications, indexing, metrics) subscribe to those events—never embedded inline with core logic. Direct repository calls from controllers/resolvers are forbidden. Every write path MUST have: validation → authorization → domain operation → event emission → persistence.

### 5. Observability & Operational Readiness

Every new module MUST define structured log contexts and describe the operational signals we actively consume. Instrument only what our observability stack ingests today—do not add orphaned Prometheus metrics or unused dashboards. Health indicators are required only when the module exposes an externally consumed surface; otherwise document why a lightweight runtime check or log hook suffices. Logs use contextual IDs (request, correlation, entity). Silent failure paths are forbidden. Feature flags and license checks MUST log decision points at debug level. Performance-sensitive queries require an inline comment explaining the chosen optimization.

Exception messages are immutable identifiers: never interpolate dynamic data directly into the `message`. Place contextual variables into the exception `details` payload so they remain queryable without leaking runtime specifics into user-facing strings.

### 6. Code Quality with Pragmatic Testing

Tests exist to defend domain invariants and observable behaviors that matter. Use a risk-based approach: add unit or integration tests when they deliver real signal, skip trivial pass-through coverage, and call out deliberate omissions in the PR when automation is unnecessary. Snapshot or superficial tests are discouraged unless asserting schema output. 100% coverage is NOT required; tests MUST stay maintainable and purposeful. Placeholder or “future we’ll fix it” tests are forbidden.

### 7. API Consistency & Evolution Discipline

Naming conventions: mutations = imperative (`createSpace`), queries = descriptive (`spaceById`), inputs end with `Input`, payload types end with `Result` or domain entity name. Errors map to a constrained set of codes. Pagination and filtering semantics MUST reuse shared input types where feasible. Changes to shared enums or scalar behaviors REQUIRE impact note in PR description.

### 8. Secure-by-Design Integration

All externally sourced input (GraphQL args, headers, file uploads) MUST traverse centralized validation & authorization layers. Secrets and credentials never logged. License and entitlement checks occur before executing mutations that create or expand paid resources. Any new external service integration MUST include timeout, retry policy, and circuit-breaker rationale.

### 9. Container & Deployment Determinism

Container images MUST be reproducible: explicit base image tags, no implicit latest pulls at runtime. Build outputs are immutable (no writes to application layer after start). Environment-dependent toggles are provided via config service; dynamic logic may NOT read from process.env directly outside configuration bootstrap. Runtime feature changes rely on database/config services—not redeploys.

### 10. Simplicity & Incremental Hardening

Prefer the simplest viable implementation that satisfies domain constraints. Architectural escalation (caching layers, CQRS, custom infra) requires a written rationale referencing observed constraints—not speculative scale. Remove obsolete code paths within one MINOR release after deprecation window passes.

## Architecture Standards

1. Directory Layout:
   - `src/domain/*`: pure domain logic & repositories
   - `src/services/*`: application service orchestration & API layer helpers
   - `src/platform/*` & `src/platform-admin/*`: platform-scoped modules
   - `src/common/*`: cross-cutting, lacking depth (exceptions, utils, constants, enums)
   - `src/core/*`: core, cross-cutting, abstractions (auth, error-handling, microservices, pagination, filtering)
   - `src/library/*`: isolated reusable utilities (no Nest DI reliance)
2. GraphQL schema generation MUST be deterministic and committed when changed. The committed `schema-baseline.graphql` artifact is maintained by the post-merge `schema-baseline` automation, which raises a signed pull request when differences are detected; manual edits require documented rationale and a follow-up automation run.
3. Migrations MUST be idempotent and tested on a snapshot before prod promotion.
4. Feature flags & licensing decisions centralize in dedicated services—not scattered conditionals.
5. Storage aggregators & external service clients implement narrow interfaces consumed by domain services.

## Engineering Workflow

1. PRs MUST state: domain impact, schema changes (if any), migration presence, deprecation notices.
2. Every schema-affecting PR MUST regenerate and diff the schema artifact.
3. New domain aggregate: provide invariants list & persistence mapping notes.
4. Rollbacks: any migration altering data shape requires reverse strategy documented inline.
5. Incident learnings → create or refine a principle or add an Architecture Standard line within 5 business days.

## Governance

Amendments require: proposal PR referencing impacted principles, rationale, and version bump classification. Semantic versioning of this constitution:

- MAJOR: Removal or redefinition of a principle.
- MINOR: Addition of a new principle or architecture standard.
- PATCH: Clarifications without behavioral change.

Compliance Review:

- Constitution Check section in planning MUST reference any intentional deviations.
- Unjustified violations block merge.
- Deprecated items tracked until removal executed.

Enforcement:

- Automated lint / CI may enforce schema stability, module boundaries, and logging context presence.
- Manual review ensures domain purity & testing adequacy.

**Version**: 2.0.0 | **Ratified**: 2025-10-04 | **Last Amended**: 2025-11-11

````markdown
# Implementation Plan: Identity Resolve Agent ID

**Branch**: `018-identity-resolve-agent-id` | **Date**: 2025-11-20 | **Spec**: `specs/018-identity-resolve-agent-id/spec.md`
**Input**: Feature specification from `/specs/018-identity-resolve-agent-id/spec.md`

## Summary

Extend the internal endpoint `/rest/internal/identity/resolve` so that, in addition to the existing `userId`, it also returns the corresponding `agentId` for the same person. The change must be non-breaking for current internal consumers, preserve existing authorization behaviour, and define a clear error path when a user has no associated agent (no identifiers returned).

## Technical Context

**Language/Version**: TypeScript 5.x on Node.js 20 (NestJS server)
**Primary Dependencies**: NestJS, existing REST controller stack, identity resolution services already used by `/rest/internal/identity/resolve`
**Storage**: Existing application database and identity stores (no new storage required)
**Testing**: Jest-based unit and integration tests (`pnpm test:ci` and targeted specs)
**Target Platform**: Linux container runtime as per existing server deployment
**Project Type**: Backend web API (single NestJS server project)
**Performance Goals**: Maintain current latency for `/rest/internal/identity/resolve`; additional agent lookup should not introduce user-visible regression.
**Constraints**: Change must be backward-compatible for existing internal consumers while safely exposing `agentId` to authorized callers only.
**Scale/Scope**: Single internal endpoint change with limited surface area; expected to serve current production traffic profile without separate scaling.

## Constitution Check

- **Principle 1**: Business rules remain in `IdentityResolveService` and supporting domain services; controllers and DTOs only orchestrate IO.
- **Principle 5**: Reuses existing `LogContext.AUTH` logging for traceability; no new metrics introduced.
- **Principle 6**: Targeted integration tests cover both success and `NO_AGENT_FOR_USER` paths, providing sufficient automated signal.

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
└── tasks.md
```

### Source Code (repository root)

```text
src/
├── domain/
├── services/
├── common/
├── core/
└── library/

test/
├── unit/
├── functional/
└── contract/
```

**Structure Decision**: Use existing monolithic NestJS server layout under `src/` and `test/`; this feature updates the REST endpoint module and related tests without introducing new top-level projects.

## Complexity Tracking

No governance deviations were required for this feature.

````
# Implementation Plan: Identity Resolve Agent ID

**Branch**: `018-identity-resolve-agent-id` | **Date**: 2025-11-20 | **Spec**: specs/018-identity-resolve-agent-id/spec.md
**Input**: Feature specification from `/specs/018-identity-resolve-agent-id/spec.md`

## Summary

Extend the internal endpoint `/rest/internal/identity/resolve` so that, in addition to the existing `userId`, it also returns the corresponding `agentId` for the same person. The change must be non-breaking for current internal consumers, preserve existing authorization behaviour, and define a clear error path when a user has no associated agent (no identifiers returned).

## Technical Context

**Language/Version**: TypeScript 5.x on Node.js 20 (NestJS server)
**Primary Dependencies**: NestJS, existing REST controller stack, identity resolution services already used by `/rest/internal/identity/resolve`
**Storage**: Existing application database and identity stores (no new storage required)
**Testing**: Jest-based unit and integration tests (`pnpm test:ci` and targeted specs)
**Target Platform**: Linux container runtime as per existing server deployment
**Project Type**: Backend web API (single NestJS server project)
**Performance Goals**: Maintain current latency for `/rest/internal/identity/resolve`; additional agent lookup should not introduce user-visible regression.
**Constraints**: Change must be backward-compatible for existing internal consumers while safely exposing `agentId` to authorized callers only.
**Scale/Scope**: Single internal endpoint change with limited surface area; expected to serve current production traffic profile without separate scaling.

## Constitution Check

- **Principle 1**: Business rules remain in `IdentityResolveService` and supporting domain services; controllers and DTOs only orchestrate IO.
- **Principle 5**: Reuses existing `LogContext.AUTH` logging for traceability; no new metrics introduced.
- **Principle 6**: Targeted integration tests cover both success and `NO_AGENT_FOR_USER` paths, providing sufficient automated signal.

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
src/
├── domain/
├── services/
├── common/
├── core/
└── library/

test/
├── unit/
├── functional/
└── contract/
```

**Structure Decision**: Use existing monolithic NestJS server layout under `src/` and `test/`; this feature will update the existing REST endpoint module and related tests without introducing new top-level projects.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation                  | Why Needed         | Simpler Alternative Rejected Because |
| -------------------------- | ------------------ | ------------------------------------ |
| [e.g., 4th project]        | [current need]     | [why 3 projects insufficient]        |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient]  |

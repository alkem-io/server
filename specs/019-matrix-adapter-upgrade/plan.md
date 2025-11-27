# Implementation Plan: Upgrade Matrix Adapter to 0.7.0 & Use ActorID

**Branch**: `019-matrix-adapter-upgrade` | **Date**: 2025-11-26 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/019-matrix-adapter-upgrade/spec.md`

## Summary

Upgrade `@alkemio/matrix-adapter-lib` to version 0.7.0 and refactor the `CommunicationAdapter` and related services to use `AgentID` (ActorID) instead of `communicationID`. Remove the obsolete `communicationID` field from `User`, `VirtualContributor`, `Organization`, and `AgentInfo` entities and database tables.

## Technical Context

**Language/Version**: TypeScript 5.3 / Node.js 20.15.1
**Primary Dependencies**: `@alkemio/matrix-adapter-lib` (Target: 0.7.0), NestJS, TypeORM
**Storage**: MySQL 8.0 (Schema change: drop columns)
**Testing**: Jest (Integration tests for communication)
**Target Platform**: Linux server (Docker)
**Project Type**: Backend Server
**Performance Goals**: N/A (Refactoring)
**Constraints**: Must preserve existing communication capabilities.
**Scale/Scope**: Affects core communication flows and user/contributor entities.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- **Principle 1 (Domain-Centric)**: Changes are focused on domain entities (`User`, `VC`, `Org`) and infrastructure adapters (`CommunicationAdapter`). Business logic remains in domain.
- **Principle 5 (Observability)**: Existing logs in `CommunicationAdapter` should be updated to log `AgentID` instead of `communicationID`.
- **Principle 6 (Testing)**: Existing integration tests must pass. No new tests needed if coverage is sufficient, but verification of `AgentID` usage is key.

## Project Structure

### Documentation (this feature)

```text
specs/019-matrix-adapter-upgrade/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (Empty, no API changes)
└── tasks.md             # Phase 2 output
```

### Source Code (repository root)

```text
src/
├── domain/
│   ├── community/
│   │   ├── user/
│   │   ├── virtual-contributor/
│   │   ├── organization/
│   │   └── contributor/
├── services/
│   ├── adapters/
│   │   └── communication-adapter/
│   └── infrastructure/
│       └── entity-resolver/
└── core/
    └── authentication.agent.info/
```

**Structure Decision**: Standard Alkemio Server structure.

## Phases

### Phase 1: Library Upgrade & Code Refactoring

1.  **Upgrade Dependency**: Update `package.json` to use `@alkemio/matrix-adapter-lib@0.7.0`.
2.  **Refactor Entities**: Remove `communicationID` from `ContributorBase` and `AgentInfo`.
3.  **Refactor Adapter**: Update `CommunicationAdapter` to use `AgentID` for all calls.
4.  **Refactor Resolver**: Update `IdentityResolverService` to handle `AgentID` or remove `communicationID` logic.
5.  **Fix Compilation**: Fix all build errors resulting from field removal.

### Phase 2: Database Migration

1.  **Generate Migration**: Create a migration to drop `communicationID` columns.
2.  **Verify**: Ensure migration runs successfully and schema is updated.

### Phase 3: Verification

1.  **Run Tests**: Execute `pnpm test:ci` to ensure no regressions.
2.  **Manual Check**: Verify communication flows (if possible locally) or rely on integration tests.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
| :--- | :--- | :--- |
| None | N/A | N/A |

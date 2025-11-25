# Implementation Plan: Drop User Communication ID

**Branch**: `020-drop-user-communication-id` | **Date**: 2025-11-24 | **Spec**: [spec.md](./spec.md)
**Status**: Completed
**Input**: Feature specification from `/specs/020-drop-user-communication-id/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Drop the redundant `communicationId` field from `User`, `VirtualContributor`, and `Organization` entities (via `ContributorBase`) and the `AgentInfo` class. Refactor the system to use `agentId` for all communication-related lookups and registration with the Matrix adapter. This simplifies the data model and removes technical debt.

## Technical Context

**Language/Version**: TypeScript 5.3, Node.js 20.15.1
**Primary Dependencies**: NestJS, TypeORM, Matrix Adapter (implied)
**Storage**: MySQL 8.0 (via TypeORM)
**Testing**: Jest (Unit, Integration)
**Target Platform**: Linux server (Dockerized)
**Project Type**: Backend Server (NestJS)
**Performance Goals**: N/A (Refactoring)
**Constraints**: Zero downtime migration preferred (though schema change might require brief lock), backward compatibility for external systems (none identified).
**Scale/Scope**: Affects core user/contributor entities.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- **Principle 1 (Domain-Centric)**: ✅ Refactoring domain entities (`User`, `VirtualContributor`, `Organization`) to remove a redundant field. Logic remains in domain/services.
- **Principle 5 (Observability)**: ✅ No new signals required, but logging contexts should reflect `agentId` usage where `communicationId` was used.
- **Principle 6 (Pragmatic Testing)**: ✅ Tests will be updated to verify the removal of the field and ensure regressions are prevented in communication flows.

## Project Structure

### Documentation (this feature)

```text
specs/020-drop-user-communication-id/
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
│   ├── community/
│   │   ├── user/
│   │   ├── virtual-contributor/
│   │   ├── organization/
│   │   └── contributor/
│   └── communication/
├── services/
│   ├── infrastructure/
│   │   └── entity-resolver/
│   └── adapters/
│       └── matrix/ (or communication adapter)
└── core/
    └── authentication.agent.info/
```

**Structure Decision**: Standard NestJS module structure, modifying existing domain entities and services.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation                  | Why Needed         | Simpler Alternative Rejected Because |
| -------------------------- | ------------------ | ------------------------------------ |
| None                       |                    |                                      |

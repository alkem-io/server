# Implementation Plan: Room Handling During Cross-Space Moves

**Branch**: `084-move-room-handling` | **Date**: 2026-03-30 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/084-move-room-handling/spec.md`

## Summary

When an L1 subspace is moved across L0 boundaries, the communication layer must: (1) preserve all callout and post discussion rooms with their full message history, (2) revoke all community members' room memberships in the moved subtree, (3) recreate the community "updates" room empty. This is a companion to `083-cross-space-moves` and operates as a post-community-clearing side effect.

The technical approach leverages the existing AMQP RPC communication adapter with its batch membership operations. Room entities survive the move automatically (they follow their parent callout/post entities). The primary new work is orchestrating membership revocation across all rooms in the subtree and recreating updates rooms.

## Technical Context

**Language/Version**: TypeScript 5.3 / Node.js 22 LTS (Volta 22.21.1)
**Primary Dependencies**: NestJS 10, TypeORM 0.3 (custom fork), Apollo Server 4, `@golevelup/nestjs-rabbitmq`, `@alkemio/matrix-adapter-lib`
**Storage**: PostgreSQL 17.5 (room metadata: id, type, messagesCount, vcData), Matrix/Synapse (message content, reactions, threads — via Go Matrix Adapter over AMQP RPC)
**Testing**: Vitest 4.x (unit + integration)
**Target Platform**: Linux server (Docker/Kubernetes, Hetzner)
**Project Type**: Single NestJS monolith (~3k TypeScript files)
**Performance Goals**: Batch membership revocation across potentially hundreds of rooms and members without exceeding the 10s AMQP RPC timeout. Operations fire-and-forget to avoid blocking the move transaction.
**Constraints**: Non-blocking async communication with Matrix adapter (FR-008). Fire-and-forget error handling pattern. Matrix adapter unavailability must not block the database move.
**Scale/Scope**: Affects `src/domain/communication/` and integration with 083's move orchestration. No new GraphQL surface area. ~200-300 LOC estimated.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| # | Principle | Status | Notes |
|---|-----------|--------|-------|
| 1 | Domain-Centric Design | PASS | New service lives in `src/domain/communication/`. Business logic stays in domain layer. |
| 2 | Modular NestJS Boundaries | PASS | New service in CommunicationModule; no circular dependencies. |
| 3 | GraphQL Schema as Stable Contract | N/A | No new GraphQL mutations or queries. Room handling is internal to the move operation. |
| 4 | Explicit Data & Event Flow | PASS | Room operations are post-community-clearing side effects, fired after the DB transaction commits. |
| 5 | Observability & Operational Readiness | PASS | Structured logging with `LogContext.COMMUNICATION`. Error swallowing follows existing fire-and-forget pattern. |
| 6 | Code Quality with Pragmatic Testing | PASS | Unit tests for the new orchestration service. Integration tests deferred to 083's end-to-end move tests. |
| 7 | API Consistency & Evolution | N/A | No public API changes. |
| 8 | Secure-by-Design Integration | PASS | Membership revocation is a security operation — ensures access control consistency post-move. |
| 9 | Container & Deployment Determinism | N/A | No container or deployment changes. |
| 10 | Simplicity & Incremental Hardening | PASS | Reuses existing adapter batch APIs. No new abstractions. Single new service method. |

**No violations. No complexity tracking needed.**

### Post-Design Re-evaluation (after Phase 1)

All gates remain PASS. Design artifacts confirm:
- No new entities or migrations (Principle 1, 3 — no schema impact)
- Single new NestJS module with 5 injected dependencies (Principle 2 — clean boundaries)
- Fire-and-forget pattern with structured logging matches existing `CommunityCommunicationService` (Principle 4, 5)
- One service, ~200-300 LOC, reuses all existing adapter methods (Principle 10 — simplest viable implementation)
- Open question (R-006): Verify `batchAddSpaceMember` usage in community join flow. If not called, may need minor addition to standard membership path for FR-010–FR-013 compliance.

## Project Structure

### Documentation (this feature)

```text
specs/084-move-room-handling/
├── plan.md              # This file
├── research.md          # Phase 0: Resolved unknowns
├── data-model.md        # Phase 1: Entity impact analysis
├── quickstart.md        # Phase 1: Development guide
├── contracts/           # Phase 1: Internal service interface
│   └── internal-api.md  # Service contract for 083 integration
└── tasks.md             # Phase 2 output (via /speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── domain/
│   └── communication/
│       ├── communication/
│       │   └── communication.service.ts          # Modified: add deleteCommunication + createCommunication orchestration
│       ├── room/
│       │   └── room.service.ts                    # Existing: createRoom, deleteRoom (unchanged)
│       └── space-move-rooms/                      # NEW: Move room handling module
│           ├── space.move.rooms.module.ts
│           ├── space.move.rooms.service.ts         # Orchestrates room operations during moves
│           └── space.move.rooms.service.spec.ts    # Unit tests
└── services/
    └── adapters/
        └── communication-adapter/
            └── communication.adapter.ts            # Existing: batchRemoveMember, deleteRoom, createRoom (unchanged)
```

**Structure Decision**: New `space-move-rooms` module under `src/domain/communication/` following the existing domain module pattern. Minimal footprint — one service file plus tests.

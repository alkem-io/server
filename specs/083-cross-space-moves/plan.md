# Implementation Plan: Cross-Space Moves

**Branch**: `083-cross-space-moves` | **Date**: 2026-03-30 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/083-cross-space-moves/spec.md`
**Dependency**: `084-move-room-handling` (implemented) — `SpaceMoveRoomsService.handleRoomsDuringMove()`

## Summary

Two new GraphQL mutations (`moveSpaceL1ToSpaceL0`, `moveSpaceL1ToSpaceL2`) allow platform admins to move L1 subspaces across L0 boundaries. Both reuse the existing conversion service's structural update pattern (re-parent, clear community, update auth chain) and add cross-L0 concerns: nameID collision validation, Account re-association, innovation flow tagset synchronization, cache invalidation, and fire-and-forget room handling via 084's `SpaceMoveRoomsService`. A companion frontend change extends the admin Conversions & Transfers page with a "Move" toggle option.

## Technical Context

**Language/Version**: TypeScript 5.3 / Node.js 22 LTS (Volta pins 22.21.1)
**Primary Dependencies**: NestJS 10, TypeORM 0.3 (custom fork), Apollo Server 4, `@golevelup/nestjs-rabbitmq`
**Storage**: PostgreSQL 17.5 (space hierarchy, community, authorization); Matrix/Synapse (rooms, memberships)
**Testing**: Vitest 4.x — unit (`*.spec.ts`), integration (`*.it-spec.ts`)
**Target Platform**: Linux server (Docker/k8s), web client (React)
**Project Type**: Cross-service (server + client-web)
**Performance Goals**: Move operation < 10s wall-clock for typical L1 with ≤ 50 callouts, ≤ 5 L2 children
**Constraints**: Single DB transaction for all structural changes; fire-and-forget for Matrix side effects
**Scale/Scope**: ~8-10 files modified/created server-side; ~5 files modified client-side

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle | Status | Notes |
|-----------|--------|-------|
| 1. Domain-Centric Design | PASS | Move logic lives in domain service layer; resolvers only orchestrate |
| 2. Modular NestJS Boundaries | PASS | New service in existing ConversionModule or dedicated MoveModule; SpaceMoveRoomsModule already exported |
| 3. GraphQL Schema as Stable Contract | PASS | Two new mutations with dedicated Input types; no breaking changes |
| 4. Explicit Data & Event Flow | PASS | Validation → authorization → domain operation → event emission → persistence. Room handling via fire-and-forget post-commit |
| 5. Observability & Operational Readiness | PASS | Structured logging with LogContext.CONVERSION; no new metrics needed |
| 6. Code Quality with Pragmatic Testing | PASS | Unit tests for new service methods; integration test for full move flow |
| 7. API Consistency & Evolution | PASS | Imperative mutation names (`moveSpaceL1ToSpaceL0`); Input suffix on DTOs |
| 8. Secure-by-Design Integration | PASS | Platform admin authorization check; no new external inputs beyond existing UUID args |
| 9. Container & Deployment Determinism | PASS | No new env vars or runtime dependencies |
| 10. Simplicity & Incremental Hardening | PASS | Reuses existing conversion patterns; no new infrastructure |

**Deviations**: None. The design follows existing conversion service patterns closely.

**Post-design re-check (2026-03-31)**: All gates confirmed PASS after Phase 1 artifacts (data-model.md, contracts/, quickstart.md) were reviewed. No new violations introduced. Stale admin-preservation references in research.md §6 and quickstart.md corrected to align with spec revision 2026-03-31 (ALL roles cleared for cross-L0 moves regardless of type).

## Project Structure

### Documentation (this feature)

```text
specs/083-cross-space-moves/
├── plan.md                         # This file
├── research.md                     # Phase 0: codebase research findings
├── data-model.md                   # Phase 1: entity impact analysis
├── quickstart.md                   # Phase 1: implementation quickstart
├── contracts/                      # Phase 1: API contracts
│   ├── move-space-l1-to-l0.md      #   moveSpaceL1ToSpaceL0 mutation
│   └── move-space-l1-to-l2.md      #   moveSpaceL1ToSpaceL2 mutation
├── checklists/
│   └── requirements.md             # Pre-existing checklist
└── tasks.md                        # Phase 2: /speckit.tasks output
```

### Source Code (repository root)

```text
# Server (backend)
src/services/api/conversion/
├── conversion.service.ts            # Extended: two new move methods
├── conversion.resolver.mutations.ts # Extended: two new mutation resolvers
├── dto/
│   ├── move.dto.space.l1.to.space.l0.input.ts   # NEW
│   └── move.dto.space.l1.to.space.l2.input.ts   # NEW
└── conversion.module.ts             # Import SpaceMoveRoomsModule

src/services/infrastructure/naming/
└── naming.service.ts                # Existing: getReservedNameIDsInLevelZeroSpace()

src/domain/space/space/
├── space.service.ts                 # Existing: getAccountForLevelZeroSpaceOrFail()
└── space.service.authorization.ts   # Existing: applyAuthorizationPolicy()

src/domain/collaboration/callout-transfer/
└── callout.transfer.service.ts      # Reference: classification sync + cache patterns

src/domain/communication/space-move-rooms/
└── space.move.rooms.service.ts      # 084 dependency: handleRoomsDuringMove()

# Tests
src/services/api/conversion/
└── conversion.service.move.spec.ts  # NEW: unit tests for move methods
test/functional/integration/
└── conversion/
    └── move-space-cross-l0.it-spec.ts  # NEW: integration tests
```

**Structure Decision**: Extend the existing `ConversionService` and `ConversionResolverMutations` rather than creating a separate MoveService. Rationale: the move operations share 80%+ of the structural update logic (re-parent, clear community, update roleSet, apply auth) with existing conversions. Keeping them together avoids duplicating helper methods and maintains a single entry point for all space reorganization operations.

## Complexity Tracking

No constitution violations — table intentionally empty.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|-----------|--------------------------------------|
| Principle 1: Move business rules in `src/services/api/conversion/` instead of `src/domain/` | Move operations share 80%+ of structural update logic with existing conversions already in the services layer | Separate domain service would duplicate helper methods and split the single entry point for all space reorganization operations |

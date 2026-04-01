# Implementation Plan: Cross-Space Moves

**Branch**: `083-cross-space-moves` | **Date**: 2026-04-01 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/083-cross-space-moves/spec.md`
**Dependency**: `084-move-room-handling` (implemented) — `SpaceMoveRoomsService.handleRoomsDuringMove()`

## Summary

Two new GraphQL mutations (`moveSpaceL1ToSpaceL0`, `moveSpaceL1ToSpaceL2`) allow platform admins to move L1 subspaces across L0 boundaries. Both reuse the existing conversion service's structural update pattern (re-parent, clear community, update auth chain) and add cross-L0 concerns: nameID collision validation, Account re-association, innovation flow tagset synchronization, cache invalidation, and fire-and-forget room handling via 084's `SpaceMoveRoomsService`. An optional post-move auto-invite mechanism (P3) sends invitations to former community members who overlap with the target L0's community. A companion frontend change extends the admin Conversions & Transfers page with a "Move" toggle option.

## Technical Context

**Language/Version**: TypeScript 5.3 / Node.js 22 LTS (Volta pins 22.21.1)
**Primary Dependencies**: NestJS 10, TypeORM 0.3 (custom fork), Apollo Server 4, `@golevelup/nestjs-rabbitmq`
**Storage**: PostgreSQL 17.5 (space hierarchy, community, authorization); Matrix/Synapse (rooms, memberships)
**Testing**: Vitest 4.x — unit (`*.spec.ts`), integration (`*.it-spec.ts`)
**Target Platform**: Linux server (Docker/k8s), web client (React)
**Project Type**: Cross-service (server + client-web)
**Performance Goals**: Move operation < 10s wall-clock for typical L1 with ≤ 50 callouts, ≤ 5 L2 children (design target; spec SC-007 allows up to 60s end-to-end including admin UI interaction)
**Constraints**: Single DB transaction for all structural changes; fire-and-forget for Matrix side effects
**Scale/Scope**: ~8-10 files modified/created server-side; ~5 files modified client-side

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle | Status | Notes |
|-----------|--------|-------|
| 1. Domain-Centric Design | DEVIATION | Move business rules in `src/services/api/conversion/` — shares 80%+ logic with existing conversions. See Complexity Tracking |
| 2. Modular NestJS Boundaries | PASS | New methods in existing ConversionModule; SpaceMoveRoomsModule already exported |
| 3. GraphQL Schema as Stable Contract | PASS | Two new mutations with dedicated Input types; no breaking changes |
| 4. Explicit Data & Event Flow | DEVIATION | Side effects (cache, rooms) via direct service calls — existing conversion pattern. See Complexity Tracking |
| 5. Observability & Operational Readiness | PASS | Structured logging with LogContext.CONVERSION; no new metrics needed |
| 6. Code Quality with Pragmatic Testing | PASS | Unit tests for new service methods; integration test for full move flow |
| 7. API Consistency & Evolution | PASS | Imperative mutation names (`moveSpaceL1ToSpaceL0`); Input suffix on DTOs |
| 8. Secure-by-Design Integration | PASS | Platform admin authorization check; no new external inputs beyond existing UUID args |
| 9. Container & Deployment Determinism | PASS | No new env vars or runtime dependencies |
| 10. Simplicity & Incremental Hardening | PASS | Reuses existing conversion patterns; no new infrastructure |

**Post-design re-check (2026-04-01)**: All gates confirmed after full `/speckit.analyze` pass. Two documented deviations (Principles 1 and 4) follow pre-existing conversion service patterns — separate refactoring initiative would be needed to address them globally.

## Project Structure

### Documentation (this feature)

```text
specs/083-cross-space-moves/
├── plan.md                         # This file
├── research.md                     # Phase 0: codebase research findings (15 topics)
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
├── conversion.service.ts            # Extended: two new move methods + shared helpers
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

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|-----------|--------------------------------------|
| Principle 1: Move business rules in `src/services/api/conversion/` instead of `src/domain/` | Move operations share 80%+ of structural update logic with existing conversions already in the services layer | Separate domain service would duplicate helper methods and split the single entry point for all space reorganization operations |
| Principle 4: Side effects (cache, rooms) via direct service calls instead of domain events | Existing conversion patterns use direct service calls; introducing events for one operation would create inconsistency | Event-driven side effects would require refactoring all conversion operations — separate initiative |

## Phase 0: Research

Complete. See [research.md](./research.md) for all 15 resolved topics:

| # | Topic | Decision |
|---|-------|----------|
| 1 | Conversion service pattern | Extend `ConversionService` with two new methods (80%+ code reuse) |
| 2 | Same-L0 constraint | Existing `convertSpaceL1ToSpaceL2` unchanged; new mutation handles cross-L0 |
| 3 | levelZeroSpaceID propagation | Bulk UPDATE via QueryBuilder for all descendants |
| 4 | Account re-association | Implicit via updated `levelZeroSpaceID` → L0 → Account; license propagation explicit |
| 5 | Authorization chain reset | Reuse existing `applyAuthorizationPolicy()` recursive propagation |
| 6 | Community membership clearing | Clear ALL roles including admins for BOTH cross-L0 moves |
| 7 | Innovation flow tagset sync | Reuse `ClassificationService.updateTagsetTemplateOnSelectTagset()` per callout |
| 8 | NameID collision validation | Application-level via `NamingService.getReservedNameIDsInLevelZeroSpace()` |
| 9 | URL cache invalidation | Revoke space profile caches; 1s TTL self-heals non-space entity caches |
| 10 | Sort order | Set moved space to position 0 (first); shift existing children up by 1 |
| 11 | SpaceMoveRoomsService (084) | Fire-and-forget post-commit; never throws |
| 12 | Self-move detection | Compare `levelZeroSpaceID` values before executing |
| 13 | Depth overflow (L1→L2) | Reject if source L1 has any L2 children |
| 14 | Transaction boundary | TypeORM cascade saves + QueryBuilder bulk update on same connection |
| 15 | Frontend integration | Extend existing Conversions & Transfers admin page with "Move" toggle |

## Phase 1: Design Artifacts

Complete. Generated artifacts:

- **[data-model.md](./data-model.md)**: Entity impact analysis — 7 entities modified during move (Space, AuthorizationPolicy, RoleSet, Role, Credential, StorageAggregator, Tagset), 8 entities preserved unchanged. Full state transition diagrams for both mutations.
- **[contracts/move-space-l1-to-l0.md](./contracts/move-space-l1-to-l0.md)**: `moveSpaceL1ToSpaceL0` mutation — Input type with optional auto-invite fields, 4 validation rules, 8 transactional + 3 post-commit side effects, sequence diagram, DTO definition.
- **[contracts/move-space-l1-to-l2.md](./contracts/move-space-l1-to-l2.md)**: `moveSpaceL1ToSpaceL2` mutation — Input type with optional auto-invite fields, 5 validation rules, 9 transactional + 3 post-commit side effects, comparison table vs existing `convertSpaceL1ToSpaceL2`.
- **[quickstart.md](./quickstart.md)**: Implementation quickstart — architecture diagram, 7-step implementation order, key reference files, debugging tips, manual testing procedure.

## Next Step

Run `/speckit.tasks` to generate the task breakdown from these design artifacts.

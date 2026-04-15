# Implementation Plan: Matrix Space Lifecycle Management

**Branch**: `082-matrix-space-lifecycle` | **Date**: 2026-03-25 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/082-matrix-space-lifecycle/spec.md`

## Summary

Wire existing `CommunicationAdapter` Matrix space methods (`createSpace`, `updateSpace`, `deleteSpace`, `setParent`) into Alkemio space lifecycle operations. These adapter methods exist but are currently uncalled from domain logic. Additionally, extend the adapter's `createSpace`/`updateSpace`/`createRoom` signatures to support `avatarUrl` and `joinRule` parameters, migrate `updateRoom` from `isPublic` to `joinRule`, and add an idempotent admin GQL mutation for backfilling existing spaces.

## Technical Context

**Language/Version**: TypeScript 5.3, Node.js 22 LTS (Volta 22.21.1)
**Primary Dependencies**: NestJS 10, TypeORM 0.3, Apollo Server 4, `@alkemio/matrix-adapter-lib`, `@golevelup/nestjs-rabbitmq`
**Storage**: PostgreSQL 17.5 (no schema changes needed — Go adapter manages Matrix ID mapping)
**Testing**: Vitest 4.x
**Target Platform**: Linux server (Docker)
**Project Type**: Single NestJS server
**Performance Goals**: Matrix space operations must not block primary Alkemio operations (graceful degradation on adapter failure)
**Constraints**: Adapter communication via AMQP RPC with 10s timeout; adapter may be disabled
**Scale/Scope**: ~15 files modified, ~400-600 LOC added. 1 new GQL mutation, 0 new DB entities.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle | Status | Notes |
|-----------|--------|-------|
| 1. Domain-Centric Design | PASS | Matrix space operations called from domain services (SpaceService, RoomService), not resolvers |
| 2. Modular NestJS Boundaries | PASS | No new modules needed. Extends existing CommunicationAdapter and domain services |
| 3. GraphQL Schema as Stable Contract | PASS | 1 additive mutation only (non-breaking). Follows `adminCommunication*` naming pattern |
| 4. Explicit Data & Event Flow | PASS | Operations follow validation → authorization → domain operation → side effect pattern. Matrix calls are side effects of domain operations |
| 5. Observability & Operational Readiness | PASS | Adapter already logs all RPC calls with context. Graceful degradation pattern maintained |
| 6. Code Quality with Pragmatic Testing | PASS | Unit tests for new service logic. Mock adapter in tests (existing pattern) |
| 7. API Consistency & Evolution | PASS | Mutation naming follows imperative convention, admin prefix for admin-only |
| 8. Secure-by-Design Integration | PASS | Admin mutation requires platform admin auth. Adapter has timeout + error handling |
| 9. Container & Deployment Determinism | PASS | No container changes. Feature is controlled by existing communications enable/disable config |
| 10. Simplicity & Incremental Hardening | PASS | Direct service calls, no event infrastructure. Uses existing adapter methods. No new abstractions |

**Post-Phase 1 Re-check**: No violations. Design remains simple — extending existing adapter methods and adding calls at lifecycle hook points.

## Project Structure

### Documentation (this feature)

```text
specs/082-matrix-space-lifecycle/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0: research findings
├── data-model.md        # Phase 1: entity/hierarchy mapping
├── quickstart.md        # Phase 1: implementation guide
├── contracts/           # Phase 1: GraphQL schema changes
│   └── graphql-schema-changes.md
├── checklists/
│   └── requirements.md  # Spec quality checklist
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── services/adapters/communication-adapter/
│   └── communication.adapter.ts          # Extend createSpace/updateSpace signatures
├── domain/space/space/
│   └── space.service.ts                  # Add Matrix space create/delete/relocate calls
├── domain/space/space.about/
│   └── space.about.service.ts            # Add Matrix space name update call
├── domain/communication/communication/
│   └── communication.service.ts          # Thread spaceID for room anchoring
├── domain/communication/room/
│   └── room.service.ts                   # Pass parentContextId to adapter
├── platform/forum/
│   └── forum.service.ts                  # Forum/category Matrix space hierarchy
├── platform/forum-discussion/
│   └── discussion.service.ts             # Discussion room anchoring + public visibility
└── platform-admin/ or services/api/
    └── admin.communication.resolver.ts   # New admin sync mutation (TBD exact location)
```

### Infrastructure (Synapse & Docker)

```text
.build/synapse/
├── modules/alkemio_room_control.py  # Extended: sync filtering via io.alkemio.visibility
├── homeserver.yaml                   # Updated: registration_shared_secret, room_list_publication_rules
└── alkemio.matrix.host.log.config    # Updated: alkemio_room_control logger at DEBUG

.env.docker                           # Renamed: SYNAPSE_SHARED_SECRET → SYNAPSE_SERVER_SHARED_SECRET
quickstart-services.yml               # Updated: adapter image → latest, added SYNAPSE_SERVER_SHARED_SECRET
```

**Structure Decision**: This is primarily an integration feature within the existing NestJS server, with supporting Synapse infrastructure changes. No new NestJS modules or entities. Server-side modifications extend existing services. Synapse-side changes extend the existing `AlkemioRoomControl` module and homeserver configuration.

## Implementation Approach

### Phase 1: Adapter Extensions (Server-Side Only)
The `@alkemio/matrix-adapter-lib` (updated to `0.0.0-develop` @ commit 4fc8544) uses `join_rule: JoinRule` exclusively — `is_public` has been removed entirely. All request types already support `avatar_url` and `join_rule`. We just need to wire them through from the server's `CommunicationAdapter`.

**Add new parameters:**
1. Extend `CommunicationAdapter.createSpace()` to pass `avatarUrl?` and `joinRule?`
2. Extend `CommunicationAdapter.updateSpace()` to pass `avatarUrl?` and `joinRule?`
3. Extend `CommunicationAdapter.createRoom()` to pass `joinRule?`

**Migrate existing method (breaking change):**
4. Migrate `CommunicationAdapter.updateRoom()`: replace `isPublic?: boolean` → `joinRule?: JoinRule`, update payload from `is_public` → `join_rule`
5. Update all callers of `updateRoom(isPublic)` to use `joinRule` instead

Use `JoinRulePublic` for forum/category spaces and forum rooms; `JoinRuleInvite` for Alkemio space containers.

### Phase 2: Space Lifecycle Hooks
4. **Space creation**: After space entity save in `SpaceService.createSpace()`, call `adapter.createSpace(space.id, displayName, parentSpace?.id, avatarUrl)`
5. **Space deletion**: Before entity deletion in `SpaceService.deleteSpaceOrFail()`, call `adapter.deleteSpace(space.id)`
6. **Space name update**: In `SpaceAboutService.updateSpaceAbout()`, call `adapter.updateSpace(spaceId, newName)`
7. **Space avatar update**: In visual update handlers, call `adapter.updateSpace(spaceId, undefined, undefined, avatarUrl)`
8. **Space relocation**: In `SpaceService.addSubspaceToSpace()` or new relocate method, call `adapter.setParent(subspace.id, true, newParent.id)`

### Phase 3: Room Anchoring
9. Thread `spaceID` through Communication → Room creation chain
10. Populate `Communication.spaceID` properly (currently empty string)
11. Pass `parentContextId` to `adapter.createRoom()` using the owning space's ID

### Phase 4: Forum Hierarchy
12. On discussion creation, ensure forum Matrix space exists
13. Ensure category Matrix space exists (deterministic UUID v5 from `${forum.id}:category:${categoryName}` via `uuid` package)
14. Anchor discussion room under category Matrix space
15. Set discussion rooms as public (`createRoom(..., joinRule: JoinRulePublic)`)
16. Set forum/category Matrix spaces as public (`createSpace(..., joinRule: JoinRulePublic)`)

### Phase 5: Admin Sync Mutation
17. New `adminCommunicationSyncSpaceHierarchy` mutation
18. Iterate all spaces (L0 → L1 → L2), create missing Matrix spaces, anchor rooms
19. Handle forum hierarchies
20. Idempotent: use `adapter.getSpace()` to check existence before creation

### Phase 6: Synapse Infrastructure — Room Visibility & Configuration
21. **Room visibility filtering**: Extend `AlkemioRoomControl` module in `.build/synapse/modules/alkemio_room_control.py` to monkey-patch `SyncHandler.get_sync_result_builder`. Filter rooms with `io.alkemio.visibility` state event `{"visible": false}` from `/sync` for non-bot users
22. **Room directory control**: Add `room_list_publication_rules` to `.build/synapse/homeserver.yaml` — only AppService bot can publish rooms to the directory
23. **Registration shared secret**: Enable `registration_shared_secret` in `homeserver.yaml` for adapter user registration
24. **Adapter environment**: Rename `SYNAPSE_SHARED_SECRET` → `SYNAPSE_SERVER_SHARED_SECRET` in `.env.docker`, pass to adapter in `quickstart-services.yml`, bump adapter image to `latest`
25. **Module logging**: Add `alkemio_room_control` logger at DEBUG level in `.build/synapse/alkemio.matrix.host.log.config`

## Dependencies

| Dependency | Type | Status |
|-----------|------|--------|
| `@alkemio/matrix-adapter-lib` `0.0.0-develop` @ 4fc8544 | External package | Updated — uses `join_rule` exclusively, `is_public` removed. Supports `avatar_url` and `join_rule` on all request types |
| Go Matrix Adapter | External service | Ready — handles `avatar_url` and `join_rule`. Image bumped to `latest` |
| CommunicationAdapter (server) | Internal | Needs: add `avatarUrl`/`joinRule` to `createSpace`/`updateSpace`/`createRoom`; migrate `updateRoom` from `isPublic` to `joinRule` |
| AlkemioRoomControl Synapse module | Infrastructure | Extended — sync filtering via `io.alkemio.visibility` state event |
| Synapse homeserver config | Infrastructure | Updated — `registration_shared_secret`, `room_list_publication_rules` |

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| ~~Adapter lib types not updated in time~~ | ~~N/A~~ | Resolved: lib v0.8.5 already supports all needed fields |
| Matrix space creation fails for some spaces during sync | Partial hierarchy | Sync mutation logs failures per-space, continues processing remaining spaces |
| Performance of full sync on large deployments | Slow admin mutation | Process spaces sequentially by level; could add pagination/batching later if needed |

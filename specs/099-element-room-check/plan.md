# Implementation Plan: Server-Side Synchronous Room-Check for Element-Initiated Conversations

**Branch**: `099-element-room-check` | **Date**: 2026-05-20 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/099-element-room-check/spec.md`

## Summary

Add two new RabbitMQ RPC handlers on the `alkemio-matrix-adapter` queue — `communication.room.check` and `communication.room.info` — that let `matrix-adapter-go` synchronously consult the server before any Matrix room is created from Element, and then look up the registered membership during reconciliation. The check handler validates actors, enforces per-non-creator-member inbound-messaging consent, deduplicates direct conversations, filters consent-denying members out of groups, atomically persists `Conversation` + `Room` (with the server-assigned UUID) + `ConversationMembership` rows, fires the existing `conversationCreated` subscription via `MessagingService.publishConversationCreatedEvents`, and returns `{ allow: true, alkemio_room_id }` or `{ allow: false, reason }`. The info handler returns the type + member list for an assigned UUID, with displayName resolved via a new shared `profile.displayName || nameID` helper that also replaces four legacy displayName formulas (one of which leaks user email into Matrix). No GraphQL surface changes. No DB schema changes.

Architectural shape (justified in Phase 0):
- The check entrypoint is a thin wrapper around the existing `MessagingService.createConversation` creation pipeline, **not** a parallel domain method. Differentiators: optional pre-assigned room id, consent gate, group member filtering, Result-shaped return.
- The two new RPC handlers live in a new lightweight controller `MatrixRoomCheckController` under `src/services/adapters/communication-adapter/` (sibling of the existing event service), using `@RabbitRPC` from `@golevelup/nestjs-rabbitmq` — NOT NestJS `@MessagePattern + Transport.RMQ`. The latter would create a competing consumer on the matrix-adapter queue and steal messages from the existing `@RabbitSubscribe` handlers in `CommunicationAdapterEventService` (see `main.ts:110-112`). The `WhiteboardIntegrationController` `@MessagePattern` precedent is on a different queue family without competing subscribers. Full rationale in `research.md` R-001.
- The displayName helper is a small pure function in `src/domain/actor/actor.matrix.display.name.ts` reused by all four legacy sync sites + the new room.info path. Email-as-fallback is removed permanently.

## Technical Context

**Language/Version**: TypeScript 5.3 on Node.js 22 LTS (Volta-pinned 22.21.1).
**Primary Dependencies**: NestJS 10, `@golevelup/nestjs-rabbitmq` (existing — provides `@RabbitSubscribe` for the event service and `@RabbitRPC` for the two new RPC handlers), TypeORM 0.3 (custom fork `pkg.pr.new/antst/typeorm`), Apollo Server 4 / GraphQL 16 (the `conversationCreated` subscription already exists — not modified). `@alkemio/matrix-adapter-lib` `0.8.16` (released matrix-adapter-go v0.8.16) exposes `MatrixAdapterEventType.COMMUNICATION_ROOM_CHECK` / `COMMUNICATION_ROOM_INFO` constants and the `CheckRoomRequest` / `CheckRoomResponse` / `GetRoomInfoRequest` / `GetRoomInfoResponse` / `RoomInfoMember` interfaces. We use the lib interfaces directly as `@RabbitRPC` payload types — same pattern as the existing `CommunicationAdapterEventService.onMessageReceived` (typed with `MessageReceivedPayload` from the lib). No server-local wrapper DTOs.
**Storage**: PostgreSQL 17.5. **No schema migration required** — reuses existing `conversation`, `room`, `conversation_membership` tables. `Room.type` enum already contains `CONVERSATION_DIRECT` and `CONVERSATION_GROUP`.
**Testing**: Vitest 4.x. Unit tests in `*.spec.ts` alongside each touched service/controller. Integration test under `test/functional/integration/` exercises the RabbitMQ RPC round-trip.
**Target Platform**: Linux containers on Kubernetes (current acceptance/dev clusters run 8 server replicas).
**Project Type**: Single backend project; standard `src/` layout per CLAUDE.md.
**Performance Goals**: p95 ≤ 1 s end-to-end check processing time on the server side (per SC-001), well under the adapter's 3 s wire timeout.
**Constraints**: Safe across 8 concurrent server replicas (PG PK uniqueness on `room.id` is the serialization point). Exception messages stay static; dynamic data goes in `details` (per Constitution §5). No new external service integration. Email/PII MUST NOT appear in any Matrix-side payload (FR-018).
**Scale/Scope**: Steady-state RPC volume dominated by user interaction frequency — low single-digit checks/sec upper bound. Total LOC budget: ≈400 LOC across handler, domain refactor, helper, displayName-call-site updates, and tests.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle | Compliance | Notes |
|---|---|---|
| **1. Domain-Centric Design First** | ✅ | All business rules (validation, consent, dedup, member filtering, transactional persistence, subscription fan-out) live in `MessagingService` (domain layer). The new `MatrixRoomCheckController` and the displayName helper are thin orchestrators / value-objects; they contain no business logic. FR-016 codifies the no-parallel-method rule. |
| **2. Modular NestJS Boundaries** | ✅ | Reuses `CommunicationAdapterModule`, `MessagingModule`, `ConversationModule`, `RoomModule`. One new controller in the existing adapter module. The `actor.matrix.display.name.ts` helper is a side-effect-free pure function placed in `src/domain/actor/`. No circular deps. |
| **3. GraphQL Schema as Stable Contract** | ✅ | No GraphQL surface added or changed. The existing `conversationCreated` subscription is fired from the same publisher (`MessagingService.publishConversationCreatedEvents`) as today. |
| **4. Explicit Data & Event Flow** | ✅ | Flow: RabbitMQ RPC → controller parses → domain method → validation → consent/dedup → transactional persistence → subscription publish → reply. No resolver-level repo calls. |
| **5. Observability & Operational Readiness** | ✅ | Structured logs at `LogContext.COMMUNICATION_CONVERSATION` with fields `alkemio_room_id`, `is_direct`, `creator_actor_id`, `member_count`, `reason` (where applicable). All exception messages stay static literals; dynamic ids go in `details`. No silent failure path: all rejection branches log at `verbose`/`warn`/`error` appropriately. |
| **6. Code Quality with Pragmatic Testing** | ✅ | Risk-based test matrix in `data-model.md` covers: consent variants (DM denied, group all-denied, group subset-denied, group all-consenting), dedup, malformed payloads, unknown actor, room.info hit/miss, happy paths, the displayName helper formula across actor-type fixtures, and a single end-to-end RabbitMQ RPC integration test. No snapshot/trivial pass-through tests. |
| **7. API Consistency & Evolution Discipline** | ✅ | No GraphQL changes. Routing-key names follow the existing `communication.<resource>.<action>` convention. |
| **8. Secure-by-Design Integration** | ✅ | Inbound RPC is on the trusted internal `alkemio-matrix-adapter` queue. Consent is enforced per-member at processing time (not at adapter adoption). The PII privacy fix (FR-018) is a net improvement: ELIMINATES the existing email leak in `user.service.ts:232`, normalises four formerly inconsistent displayName formulas, and prevents reintroduction. |
| **9. Container & Deployment Determinism** | ✅ | No infra changes. Rollout order: bump `@alkemio/matrix-adapter-lib` (if needed for routing-key constants) → server deploy → adapter deploy. The two new RPC handlers are additive on the existing queue; no migration. |
| **10. Simplicity & Incremental Hardening** | ✅ | The check entrypoint is a small wrapper around `MessagingService.createConversation`, not a duplicate pipeline. Three call sites of the displayName helper are existing code being switched to use the helper — a small DRY win, not a refactor blast radius. |

**No violations.** Complexity Tracking table below is empty.

## Project Structure

### Documentation (this feature)

```text
specs/099-element-room-check/
├── plan.md                           # This file
├── research.md                       # Phase 0 — design decisions
├── data-model.md                     # Phase 1 — entity touchpoints (no schema changes); test matrix
├── quickstart.md                     # Phase 1 — local-test runbook (RabbitMQ RPC publish + observe)
├── contracts/
│   ├── room-check-rabbitmq.md        # Phase 1 — wire contract mirroring adapter's `room-check-rabbitmq.md` byte-for-byte
│   └── room-info-rabbitmq.md         # Phase 1 — wire contract mirroring adapter's `room-info-rabbitmq.md` byte-for-byte
├── checklists/
│   └── requirements.md               # Existing spec-quality checklist
└── tasks.md                          # Phase 2 output (NOT created by /speckit.plan)
```

### Source Code (repository root)

Files touched / introduced by this feature:

```text
src/
├── domain/
│   ├── actor/
│   │   ├── actor.matrix.display.name.ts          # NEW: pure helper, formula `profile.displayName || nameID`
│   │   └── actor.matrix.display.name.spec.ts     # NEW: tests for the helper across User, VC, Org, Space, Account fixtures
│   ├── communication/
│   │   ├── conversation/
│   │   │   └── conversation.service.ts           # (no change) reuse existing findConversationByRoomId / findConversationBetweenActors
│   │   ├── messaging/
│   │   │   ├── messaging.service.ts              # MOD: +createConversationFromExternal(input) wrapper; +shared private helpers extracted from createConversation
│   │   │   ├── messaging.service.spec.ts         # MOD: +tests for consent gate, member filtering, dedup-on-element-path, room.info data source
│   │   │   └── types/
│   │   │       ├── check.result.ts               # NEW: CheckResult discriminated union type
│   │   │       └── messaging.rejection.reasons.ts # NEW: canonical rejection-reason string constants
│   │   └── room/
│   │       └── room.service.ts                   # MOD: +createRoomFromExternal({ id, type }) — id-supplied variant, skips adapter call
│   └── community/
│       ├── user/
│       │   └── user.service.ts                   # MOD: line 232-233 replaced by call to actor.matrix.display.name helper (FR-018 fix)
│       └── virtual-contributor/
│           └── virtual.contributor.service.ts    # MOD: line 201-202 replaced by helper (FR-018)
├── platform-admin/
│   └── domain/communication/
│       └── admin.communication.space.sync.service.ts # MOD: lines 506 (Users) + 520 (VCs) replaced by helper (FR-018)
└── services/
    └── adapters/
        └── communication-adapter/
            ├── communication.adapter.module.ts   # MOD: +register MatrixRoomCheckController; wire `MessagingService` dep
            ├── matrix.room.check.controller.ts   # NEW: @RabbitRPC handlers for room.check and room.info; payload types imported from @alkemio/matrix-adapter-lib (same pattern as onMessageReceived)
            └── matrix.room.check.controller.spec.ts # NEW: handler tests (wire-level: payload→result translation)

test/
└── functional/integration/
    └── element-room-check/
        └── element.room.check.it-spec.ts         # NEW: end-to-end RabbitMQ RPC test (happy path)
```

**Structure Decision**: Standard single-project layout per CLAUDE.md. The controller uses `@RabbitRPC` from `@golevelup/nestjs-rabbitmq` (the matrix-adapter queue already has `@RabbitSubscribe` consumers from `CommunicationAdapterEventService`; mixing in a NestJS `@MessagePattern + Transport.RMQ` listener would create a competing consumer and steal messages — see `research.md` R-001). The displayName helper lives in `src/domain/actor/` since it operates on Actor-shaped data (User and VC are both Actors via NameableEntity).

Footprint summary:
- 1 new controller + spec (services/adapters); payload types imported from `@alkemio/matrix-adapter-lib` — no server-local wrapper DTOs (matches existing `CommunicationAdapterEventService.onMessageReceived` precedent)
- 1 new helper + spec (domain/actor)
- 1 new wrapper method + 2 new types files (domain/communication/messaging)
- 1 new method on RoomService (domain/communication/room)
- 4 displayName call-site refactors (FR-018) — one-line replacements
- 1 new integration test (test/functional/integration)

Total: ~300 LOC of new code + ~30 LOC of replaced call-site one-liners (down from ~400 LOC after the DRY simplification of dropping wrapper DTOs).

## Phase 0 — Research Outputs (resolved decisions)

The Phase 0 research items are written to `research.md`. Each is grounded in either the existing codebase or the adapter contract.

- **R-001 RPC handler shape**: `@RabbitRPC` from `@golevelup/nestjs-rabbitmq` on a new lightweight controller. NestJS `@MessagePattern + Transport.RMQ` was the initial plan but would create a competing consumer on the matrix-adapter queue and steal messages from the existing `@RabbitSubscribe` handlers in `CommunicationAdapterEventService` — see research.md R-001 for the full rationale and the cross-reference to `main.ts:110-112`.
- **R-002 Routing key constants and DTO interfaces**: `@alkemio/matrix-adapter-lib` pinned at `0.8.16` (released matrix-adapter-go v0.8.16) exposes `MatrixAdapterEventType.COMMUNICATION_ROOM_CHECK`, `MatrixAdapterEventType.COMMUNICATION_ROOM_INFO`, and the five wire interfaces (`CheckRoomRequest`, `CheckRoomResponse`, `GetRoomInfoRequest`, `GetRoomInfoResponse`, `RoomInfoMember`). The server uses these interfaces directly as `@RabbitRPC` payload types — matching the existing precedent of `onMessageReceived(payload: MessageReceivedPayload)` in `CommunicationAdapterEventService`. No server-local wrapper DTOs and no `class-validator` decorators (the codebase's `dto/` folder under communication-adapter has zero validator decorators — the existing convention is to validate at the domain boundary, which the plan does in T027).
- **R-003 `CheckResult` discriminated union**: `{ kind: 'accepted'; alkemioRoomId: string } | { kind: 'rejected'; reason: MessagingRejectionReason }`. The controller translates the union to the wire-level `{ allow: boolean, ... }` envelope. One-line conversion at the controller boundary.
- **R-004 DRY refactor shape**: Extract three private helpers on `MessagingService` — `normalizeMembers(...)`, `validateMembershipCount(type, normalized)`, `persistConversationCore(...)` — and have both `createConversation` (existing) and the new `createConversationFromExternal` call them. Consent gate + filtering + result-shape translation are only in the new wrapper.
- **R-005 Multi-replica concurrency**: PG PK uniqueness on `room.id` + a single transaction inside `persistConversationCore`. Re-probe via `findConversationByRoomId` inside the catch block on `UniqueViolation`.
- **R-006 displayName helper signature**: `getMatrixDisplayName(actor: IActor): string` returning `actor.profile?.displayName?.trim() || actor.nameID`. Pure function, no DI.
- **R-007 Adapter-version backward compat**: None needed — both the old DM webhook and the deleted `097-dm-from-element` async topics are not in use anywhere; rolling forward is a clean cutover.
- **R-008 Rejection reason canonicalisation**: Use a `MessagingRejectionReason` enum-of-strings (server-internal) mapped to the exact human-readable strings the adapter spec example shows.

## Phase 1 — Design & Contracts

Outputs:

- `data-model.md` — touchpoints on Conversation, Room, ConversationMembership (no schema changes); payload→entity mapping; partial-rejection arithmetic table; risk-based test matrix.
- `contracts/room-check-rabbitmq.md` — mirrors adapter contract byte-for-byte; cross-referenced at the top.
- `contracts/room-info-rabbitmq.md` — same.
- `quickstart.md` — five hand-driven RabbitMQ RPC scenarios for local verification.

### Constitution re-check (post-design)

| Principle | Status after Phase 1 |
|---|---|
| 1–10 | Unchanged — all ✅ |

### Agent context update

Run `.specify/scripts/bash/update-agent-context.sh claude` after Phase 1 artefacts are written.

## Complexity Tracking

_No constitution violations. Section intentionally empty._

| Violation | Why Needed | Simpler Alternative Rejected Because |
|---|---|---|
| _(none)_ | | |

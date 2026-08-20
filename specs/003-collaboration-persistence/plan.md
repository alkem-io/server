# Implementation Plan: Collaboration Persistence, Lifecycle & AuthZ (server slice)

**Branch**: `feat/003-unify-collab-yjs` | **Date**: 2026-06-18 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/003-collaboration-persistence/spec.md`
**Workspace epic**: `../agents-hq/specs/003-unify-collab-yjs/` (WS-E)

> **Repo-local plan.** Owns the server's **architecture and phased rollout** — the
> unified persistence consumer, the `content_pointer`/`blob_store` schema change,
> the delete-cascade lifecycle emitter, the authZ-eval verification, and the
> migration read access — and how each maps onto server's existing NestJS modules.
> The cross-repo architecture + frozen contracts live in the epic's `plan.md` and
> `contracts/`. **Implemented — the code is delivered in this PR; the prior gates
> are resolved (see spec.md ✅ Implementation status).**

## Summary

The Alkemio `server` is the **storage-contract owner** for the unified
collaboration-service (epic line 51) and the **migration owner** (WS-E). Today the
two legacy collab services *call into* server's `@MessagePattern` handlers to
`save`/`fetch` memo (`bytea`) and whiteboard (`text`) content stored **inline** in
the main DB, and server decides `read`/`update-content` access in-process. This
slice evolves that into:

1. A **metadata/index** model — add `content_pointer` + `blob_store` columns to
   `Memo`/`Whiteboard`; serve a **unified `collaboration-save`/`collaboration-fetch`**
   request/reply contract carrying `{id, contentType, version, contentPointer,
   blobStore}` (+ `authorizationPolicyId`); store the inline blob only when
   `blob_store = 'inline'`, else just metadata + pointer.
2. A **transactional lifecycle outbox** — record `document.deleted {id}` in the
   `collaboration_lifecycle_outbox` table in the SAME transaction as the leaf-row
   removal at the `MemoService.deleteMemo` / `WhiteboardService.deleteWhiteboard`
   cascade points, and drain it out-of-band with a `SchedulerRegistry` dispatcher
   that publishes a confirmed persistent message to a dedicated durable **quorum**
   queue (`alkemio-collaboration-lifecycle`) via a new `COLLABORATION_LIFECYCLE_SERVICE`
   client — at-least-once — so the collab service releases the room and purges live
   collab state (no orphans). `document.deleted` is the only lifecycle event produced.
3. An **authZ-eval verification** — confirm the *separate*
   authorization-evaluation-service decides `read`/`update-content` for collab
   documents addressed by the parent-entity `AuthorizationPolicy.id`, and surface
   that policy id in the metadata index. No new auth endpoint in server.
4. **Migration read access** — a one-pass read of all legacy memo/whiteboard
   content (+ policy id) for the one-time in-place migration.

Everything is **config/contract-gated**: the unified wire shape is finalized
jointly with the collab Wave-2 adapter; the schema lands behind reversible TypeORM
migrations; the legacy dialects retire only at cutover.

## Technical Context

**Language/Version**: TypeScript (NestJS) — server's existing stack.
**Primary Dependencies**: NestJS microservices `Transport.RMQ` (amqp, via
`amqp-connection-manager`'s confirm channel for publisher confirms), TypeORM +
PostgreSQL, `@nestjs/schedule` `SchedulerRegistry` (the outbox dispatcher sweep),
Winston logging, GraphQL. No new runtime framework — reuse `clientProxyFactory`
(extended with a `{durable, persistent, queueArguments}` options object),
`@MessagePattern`/`@EventPattern`, the `MessagingQueue` enum, a TypeORM outbox
entity, and the TypeORM migration tooling.
**Storage**: main PostgreSQL DB. The metadata/index is **columns on the existing
`Memo`/`Whiteboard` entities** (not a new table in v1); the inline blob is the
existing content column. Offloaded blobs (collab-side) are referenced by
`content_pointer` + `blob_store`.
**Testing**: Vitest (server's runner) + the integration test harness; risk-based
per server constitution §6, reconciled to the epic's ≥95% on touched code (spec
Assumptions).
**Target Platform**: server's existing container.
**Project Type**: NestJS modular monolith (this slice touches the
`collaborative-document-integration`, `whiteboard-integration`, `memo`, `whiteboard`,
`callout-*`, and `microservices` modules + a migration).
**Constraints**: idempotent + reversible migrations; structured RMQ replies (no
exception leaks); preserve today's manual-ack semantics; **no bespoke bus
abstraction** (reuse the factory); the auth-eval-service stays a separate repo.
**Scale/Scope**: all existing memos + whiteboards (migration one-pass); live
save/fetch debounced by the collab service (server sees throttled writes).

## Constitution Check

*GATE: server constitution = `.specify/memory/constitution.md` (v2.0.0). This slice
is checked against server's own principles, not the Go fleet constitution (which
governs the collab-service / y-crdt).*

| Principle | Status | Notes |
|-----------|--------|-------|
| 1. Domain-Centric Design First | PASS | The index columns live on the existing `Memo`/`Whiteboard` domain entities; the persistence consumer + lifecycle emitter sit in the integration/domain services, not in a leaky cross-cutting layer. |
| 2. Modular NestJS Boundaries | PASS | New work maps to existing modules: unified consumer → the (renamed/merged) collab-integration module; lifecycle emitter → memo/whiteboard services + a new outbound client provider in `MicroservicesModule`; no circular deps introduced. |
| 3. GraphQL Schema as Stable Contract | PASS | No GraphQL schema change — this is persistence/bus-internal. The new columns are not exposed as API fields (or are nullable+internal if surfaced). |
| 4. Explicit Data & Event Flow | PASS | `document.deleted` is an explicit, named event recorded in the `collaboration_lifecycle_outbox` table and published on a dedicated, declared lifecycle queue; the unified `save`/`fetch` is an explicit `@MessagePattern` contract. Flow is traceable end to end — enqueue (in-transaction) → dispatcher publish → collab consume (contracts/lifecycle-events.md, persistence-ports.md). |
| 5. Observability & Operational Readiness | PASS | Reuse Winston structured logging on the handlers/emitter; the migration read logs progress/failures (whiteboard decompression flagged, not dropped). |
| 6. Code Quality with Pragmatic Testing | PASS (with tension) | Risk-based tests on the consumer/emitter/migration. **Tension:** epic mandates ≥95% on touched code; server constitution says 100% not required — resolved by applying ≥95% to the *diff* (spec Assumptions). Flag for antst. |
| 7. API Consistency & Evolution Discipline | PASS | Unified contract replaces two legacy dialects cleanly at cutover (no parallel forever); migration is reversible. |
| 8. Secure-by-Design Integration | PASS | AuthZ decisions stay centralized (auth-eval-service reads the canonical policy rows); server does not duplicate or weaken the authZ model; the `/internal/*` trust boundary is in-cluster as today. |
| 9. Container & Deployment Determinism | PASS | No runtime `process.env` reads added outside config bootstrap; the new queue/client are config-driven via the existing rabbitmq config + `MessagingQueue` enum. |
| 10. Simplicity & Incremental Hardening | PASS | v1 keeps the blob inline (no premature file-service offload from server); columns are additive + nullable; legacy retired only at cutover. No speculative abstraction. |
| Architecture Standards (migrations idempotent + tested) | PASS | The `content_pointer`/`blob_store` migration is reversible, back-fills existing rows to `inline`, and is tested on a snapshot (SC-003). |
| Engineering Workflow (PR states migration presence + reverse strategy) | PASS | The implementation PR states the migration, its back-fill, and its down(). |

**No gate failures.** On the **coverage philosophy tension** (§6 vs epic ≥95%):
this slice targets **≥95% on the touched collaboration-persistence diff** (DEC-7),
verified locally via the repo's `test:coverage` run. This is a slice-scoped target
on the changed code, not a repo-wide CI threshold change — the repo's existing
coverage configuration is left unmodified.

## Architecture

### Current state (what we're evolving)

```text
   legacy collaborative-document-service ──(RMQ: collaboration-document-save/fetch/info/who)──►  server
   legacy whiteboard-collaboration-service ──(RMQ: save/fetch/info/who on alkemio-whiteboards)──►  server
                                                                                                    │
   @MessagePattern handlers (CollaborativeDocumentIntegrationController / WhiteboardIntegrationController)
                                                                                                    │
        ┌──────────────────────────────────────────────────────────────────────────────────────────┘
        ▼
   MemoService.saveContent / fetch (memo.content: bytea)         AuthorizationService.isAccessGranted
   WhiteboardService.updateWhiteboardContent / fetch (text)         (in-process, entity.authorization)
        │
   main DB (inline blob + index, one and the same row)
```

### Target state (server slice)

```text
   unified collaboration-service ──(RMQ: collaboration-save/collaboration-fetch, index payload)──►  server
                                                                                                    │
   unified @MessagePattern handler set (collaboration-save / collaboration-fetch)                   │
        │                                                                                            │
        ├─ save:  upsert index row (version++, content_pointer, blob_store);                        │
        │         if blob_store == inline → write content column; else metadata only                │
        ├─ fetch: return {id, contentType, version, contentPointer, blobStore,                       │
        │         authorizationPolicyId} (+ inline blob base64 when inline)                          │
        ▼
   main DB:  Memo/Whiteboard rows + (new) content_pointer, blob_store columns
        │
   delete cascade:  CalloutContribution.delete / CalloutFraming.delete
                      → MemoService.deleteMemo / WhiteboardService.deleteWhiteboard
                          → [ manager.transaction: remove leaf row + INSERT collaboration_lifecycle_outbox row (document.deleted {id}) ]
   lifecycle dispatch:  CollaborationLifecycleDispatcherService (SchedulerRegistry sweep)
                          → claim one row (FOR UPDATE SKIP LOCKED) → confirmed persistent publish
                              ──(RMQ quorum queue alkemio-collaboration-lifecycle, COLLABORATION_LIFECYCLE_SERVICE)──► collab service
        │
   authZ:  collab service ──(h2c POST /internal/auth/evaluate {actorId, read|update-content, policyId})──►
                  authorization-evaluation-service (separate repo) ──reads policy/credential rows──► server's DB
        │
   migration (one-time):  server CLI/read path → {id, contentType, content, authorizationPolicyId} → collab v2 decoder
```

### How each obligation maps to server's modules

| Obligation | Server module / file (anchor) | Change |
|---|---|---|
| `content_pointer` + `blob_store` columns | `src/domain/common/memo/memo.entity.ts`, `src/domain/common/whiteboard/whiteboard.entity.ts` | add 2 nullable columns each + a migration |
| Unified `save`/`fetch` consumer | `src/services/collaborative-document-integration/*` + `src/services/whiteboard-integration/*` (merge/rename toward a unified collaboration-integration module) | new `@MessagePattern` set; route by `contentType`; store index + (inline) blob |
| Metadata index incl. `authorizationPolicyId` | the integration service(s) reading `entity.authorizationId` | include in the `fetch` reply |
| `document.deleted` transactional enqueue | `src/domain/common/memo/memo.service.ts` (`deleteMemo`), `src/domain/common/whiteboard/whiteboard.service.ts` (`deleteWhiteboard`), `src/domain/common/collaboration-metadata/collaboration.lifecycle.service.ts` | wrap `{ leaf remove + outbox-row insert }` in one `manager.transaction` — the cascade (profile/bucket/auth, incl. an external file-service blob delete) runs BEFORE the transaction |
| Lifecycle outbox table + dispatcher | `src/domain/common/collaboration-metadata/collaboration.lifecycle.outbox.entity.ts`, `…/collaboration.lifecycle.dispatcher.service.ts`, `src/migrations/1785810000000-CollaborationLifecycleOutbox.ts` | new TypeORM entity + migration (3 partial indexes); a `SchedulerRegistry` single-flight sweep that claims one row (`FOR UPDATE SKIP LOCKED`, `claimVersion` fence), publishes confirmed-persistent, marks delivered on confirm, backs off failures, prunes delivered rows |
| Dedicated lifecycle client + quorum queue | `src/core/microservices/microservices.module.ts`, `client.proxy.factory.ts`, `src/common/constants/providers.ts`, `src/common/enums/messaging.queue.ts` | add a `COLLABORATION_LIFECYCLE_SERVICE` provider (durable + persistent + `{ 'x-queue-type': 'quorum' }`) on the new `COLLABORATION_LIFECYCLE` queue (`alkemio-collaboration-lifecycle`) — NOT `COLLABORATION_SERVICE` (the server's own responder) |
| authZ-eval verification | (cross-repo) `authorization-evaluation-service` + server's persisted policy rows | a verification test asserting parity with `isAccessGranted`; no server code |
| Migration read access | a new NestJS standalone CLI command (or guarded read) over `Memo`/`Whiteboard` repos | one-pass reader yielding content + policy id |
| Migrations + codegen | `src/migrations/` (timestamp-named, `migration:generate`/`run`/`revert`) | reversible migration; tested on snapshot |

### Delete-cascade enqueue point (grounded)

The cascade is: `CalloutService.deleteCallout` →
`CalloutFramingService.delete` / `CalloutContributionService.delete` →
`MemoService.deleteMemo` / `WhiteboardService.deleteWhiteboard`. Each leaf method
first runs the profile/bucket/authorization cascade (which includes an external
file-service HTTP blob delete that CANNOT join a DB transaction), then wraps
`{ leaf-row removal + a `collaboration_lifecycle_outbox` row insert }` in one
`manager.transaction` — so the `document.deleted {id}` record commits atomically
with the removal (or neither commits). The **single correct enqueue point** is
inside `deleteMemo`/`deleteWhiteboard` (every cascade path — framing, contribution,
direct — passes through this one leaf and records one row). Enqueuing higher (in the
callout services) would miss direct deletes and risk double-enqueue. **Decision:
enqueue in the two leaf delete methods, inside the removal transaction.**

**Saga boundary (stated honestly, out of scope):** the external
profile/bucket/file-service cascade runs BEFORE the transaction, so a crash after
that cascade but before remove+enqueue can leave a surviving aggregate with missing
storage and no event — pre-existing delete-saga debt. This slice closes only the
DB-remove → publish window; it is not a deletion saga.

### AuthZ: why no new code in server

The authorization-evaluation-service (separate Go repo) already evaluates
`{actorId, privilege, authorizationPolicyId}` by reading server's
`authorizationPolicy`/`credential` tables directly
(`engine.go: FetchPolicyByUUID/FetchCredentialsByUUID`). Server already persists
the policy row via `AuthorizableEntity.authorization` (`cascade: true`). So the
server slice's authZ work is **(a)** carry the `authorizationPolicyId` in the
metadata index (FR-005) and **(b)** verify decision parity with in-process
`isAccessGranted` (FR-008) — **not** building an evaluate endpoint. This pins
OPEN-1 and confirms the collab `authzeval` adapter (`read`/`update-content`,
policy-id-from-metadata) is correct.

## Phased rollout

- **Phase 1 — persistence (blocked on OPEN-1/3 + collab contract freeze).**
  T001 schema columns + migration; T002 unified `save`/`fetch` consumer with the
  metadata/blob split + `authorizationPolicyId` in the fetch reply. Lands only once
  the unified wire shape is agreed with the collab Wave-2 adapter.
- **Phase 2 — lifecycle + authZ verification.** T003 transactional `document.deleted`
  outbox (in-transaction enqueue at the cascade leaves) + the out-of-band dispatcher
  publishing to the dedicated quorum lifecycle queue; T004 authZ-eval parity
  verification + policy-id surfacing.
- **Phase 3 — migration.** T005 one-pass migration read access for legacy memo/
  whiteboard content; T006 migrations finalized + codegen + coverage gate.

Phases 2 and 3 can largely proceed in parallel once Phase 1's schema lands; the
lifecycle outbox + dispatcher (Phase 2) is independent of the consumer rewrite. The authZ verification
(T004) can be done **first** as a read-only investigation (it needs no schema) and
in fact already grounds OPEN-1 in this spec.

## Project Structure

### Documentation (this feature)

```text
specs/003-collaboration-persistence/
├── plan.md            # This file
├── spec.md            # Server user stories, FRs, SCs, OPENs
├── research.md        # Current-state findings (file anchors) + decisions
├── data-model.md      # TypeORM column changes + unified message schema
├── quickstart.md      # How to run/test the touched paths
├── tasks.md           # Fine-grained tasks mapping to server T001–T006
└── checklists/
    └── requirements.md # Spec-quality checklist
```

### Source code (touched areas — no change made by this spec)

```text
src/domain/common/memo/{memo.entity.ts, memo.service.ts}                  # +columns, +transactional enqueue on delete
src/domain/common/whiteboard/{whiteboard.entity.ts, whiteboard.service.ts} # +columns, +transactional enqueue on delete
src/domain/common/collaboration-metadata/collaboration.lifecycle.service.ts        # enqueueDocumentDeleted(manager, id)
src/domain/common/collaboration-metadata/collaboration.lifecycle.outbox.entity.ts  # outbox TypeORM entity
src/domain/common/collaboration-metadata/collaboration.lifecycle.dispatcher.service.ts # SchedulerRegistry sweep dispatcher
src/domain/common/collaboration-metadata/collaboration.lifecycle.event.pattern.ts  # DELETED = 'document.deleted' (only)
src/services/collaborative-document-integration/*                          # unified consumer (memo side)
src/services/whiteboard-integration/*                                      # unified consumer (whiteboard side)
src/domain/collaboration/callout-contribution/callout.contribution.service.ts # cascade caller (no change)
src/domain/collaboration/callout-framing/callout.framing.service.ts        # cascade caller (no change)
src/core/microservices/{microservices.module.ts, client.proxy.factory.ts}  # +COLLABORATION_LIFECYCLE_SERVICE client + options object
src/common/constants/providers.ts                                          # +COLLABORATION_LIFECYCLE_SERVICE token
src/common/enums/messaging.queue.ts                                        # +COLLABORATION_LIFECYCLE quorum queue
src/migrations/<ts>-AddContentPointerAndBlobStore.ts                       # persistence-columns migration
src/migrations/1785810000000-CollaborationLifecycleOutbox.ts               # outbox table migration
src/<cli or migration runner>                                              # migration read path (T005)
```

**Structure Decision**: stay within server's existing modular layout — extend the
two integration modules into one unified collaboration-integration consumer; add
the in-transaction enqueue to the leaf domain services and the outbox entity +
dispatcher to the `collaboration-metadata` domain module; register one new outbound
`COLLABORATION_LIFECYCLE_SERVICE` client in `MicroservicesModule`. No new
architectural pattern; reuse the `@MessagePattern`/`clientProxyFactory`/`MessagingQueue`
conventions and the `SchedulerRegistry` sweep pattern already used by
`ConversationDigestSweepService`.

## Complexity Tracking

*No constitution violations to justify.* Two notable decisions, both justified:
- **Index-on-entity, not a new table (v1).** Adding columns to `Memo`/`Whiteboard`
  is simpler than a separate metadata table and keeps the inline blob co-located
  (constitution §10, incremental). A separate `CollaborationMetadata` table is the
  forward path if a version timeline (FR-025) materializes — noted, not built.
- **Server stays the persistence *responder*** (not a new caller) — minimizes
  change and matches "server owns the store" (OPEN-3). The only new *outbound*
  client is `COLLABORATION_LIFECYCLE_SERVICE` for the lifecycle event
  (server→collab), which is genuinely server-originated. It publishes from a
  **transactional outbox** rather than inline so a crash between the DB delete and
  the broker publish cannot lose the event (at-least-once; idempotent downstream) —
  a durability property an inline fire-and-forget publish could not give.

The real risk is **cross-repo contract drift** (the unified wire shape) — mitigated
by gating implementation on the collab Wave-2 freeze (spec ⚠️).

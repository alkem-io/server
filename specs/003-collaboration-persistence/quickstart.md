# Quickstart — Collaboration Persistence (server slice)

> **Lifecycle amendment (006, 2026-08-24).** The transactional lifecycle outbox
> and dispatcher recorded below are preserved as implementation history and are
> **SUPERSEDED**. Current behavior confirms a persistent `document.deleted {id}`
> publish before changing owner state; collaboration-service installs a five-minute
> tombstone and close/evicts. There is no `collaboration_lifecycle_outbox` table or
> scheduler in the shipping design. Do not execute the historical outbox runbook.


How to build, run, and test the touched paths. The module is the Alkemio `server`
(NestJS/TypeORM/GraphQL). **The slice is implemented in this PR — the commands below
describe the workflow against the delivered code.**

## Build / lint / test

```bash
pnpm install
pnpm run build          # tsc / nest build
pnpm run lint           # eslint — clean (constitution Code Quality)
pnpm run test           # vitest unit tests
pnpm run test:it        # integration tests (the harness that exercises RMQ handlers + DB)
```

## Migrations (the schema change)

```bash
# generate after editing memo.entity.ts / whiteboard.entity.ts
pnpm run migration:generate -- src/migrations/AddContentPointerAndBlobStore
# hand-edit the generated file to add the back-fill (content_pointer = id, blob_store = 'inline')
pnpm run migration:run        # apply
pnpm run migration:show       # verify applied
pnpm run migration:revert     # down() — must cleanly drop the 4 columns (SC-003)
pnpm run migration:validate   # schema matches entities
```

The migration adds `content_pointer` + `blob_store` to `memo` and `whiteboard`,
back-fills existing rows to `inline` + self-pointer, and reverts cleanly.

## Exercise the unified persistence contract

> Direction: the collaboration-service (caller) sends `collaboration-save` /
> `collaboration-fetch` to server (responder) over RabbitMQ. Locally, drive it via
> the integration test harness or a small RMQ client.

```text
# save (inline memo)
pattern: collaboration-save
payload: { id, contentType: "memo", version, contentPointer: id, blobStore: "inline", snapshotBase64 }
expect:  { data: { success: true } }   # index row upserted (version++), content column written

# save (offloaded whiteboard)
pattern: collaboration-save
payload: { id, contentType: "whiteboard", version, contentPointer: "<file-svc-id>", blobStore: "file-service" }
expect:  { data: { success: true } }   # index only; content column NOT written

# fetch
pattern: collaboration-fetch
payload: { id }
expect:  { data: { id, contentType, version, contentPointer, blobStore, authorizationPolicyId, snapshotBase64? } }
```

## Verify the lifecycle event (transactional outbox)

```text
# delete a memo/whiteboard (directly, or via deleting its parent Callout contribution/framing)
# assert (enqueue): one row lands in collaboration_lifecycle_outbox in the SAME
#   transaction as the leaf-row removal — both commit or neither does; no row on a
#   failed delete.
SELECT "documentId", "eventType", "status"
  FROM "collaboration_lifecycle_outbox"
 WHERE "documentId" = '<deleted-id>';
# → one row, eventType = 'document.deleted', status = 'pending'

# assert (delivery): the dispatcher sweep (~every 5s) publishes a confirmed
#   persistent document.deleted { id } to the dedicated quorum queue
#   alkemio-collaboration-lifecycle, then flips the row to 'delivered' (deliveredAt set).
```
`MemoService.deleteMemo` / `WhiteboardService.deleteWhiteboard` call
`CollaborationLifecycleService.enqueueDocumentDeleted(manager, id)` inside the
removal transaction. Verification is on the enqueue (the outbox row) and on the
`CollaborationLifecycleDispatcherService` delivery, NOT on an inline client `emit` —
there is none. Delivery is at-least-once; the downstream Purge is idempotent, so a
redelivery is harmless.

## Operational rollout — lifecycle queue cutover (classic → quorum)

The lifecycle event moves onto a NEW dedicated durable **quorum** queue
`alkemio-collaboration-lifecycle` (declaration args
`{ 'x-queue-type': 'quorum', 'x-delivery-limit': -1 }`). This is a **deployment
prerequisite**, not a DB migration — the producer (server) and consumer (collab
service) MUST assert byte-equivalent declarations, and the broker version must be
met, or the topology silently misbehaves.

**Broker standard: RabbitMQ 4.0.5** (production parity; the one-way standard
across server quickstart, devcontainer, dev-orchestration, and infra-ops). Two
version-sensitive behaviours the topology depends on:
- On 3.9 a quorum queue silently *accepts* but never *expires* TTL / dead-letter
  arguments, so the consumer-owned retry tiers never fire (≥ 3.13.2 fixes this).
- On **RabbitMQ 4.0+** a quorum queue defaults `delivery-limit` to **20** (3.x was
  unlimited), and Q1 has **no DLX**, so the deliberate unconfirmed-transfer
  channel-close redelivery path would hit 20 and the broker would **drop a
  `document.deleted`**. Q1 therefore declares **`x-delivery-limit = -1`**
  (unlimited). Proven on real 4.0.5: the shipped Q1 vanished at 21 deliveries; the
  `-1` Q1 retained 25/25. (Q1 carries no TTL/DLX otherwise — those live on the
  consumer-owned retry/DLQ queues.)

The server producer encodes `x-delivery-limit` as `int32(-1)` (amqplib typed
field-table trapdoor `{ '!': 'int32', value: -1 }`, AMQP type `I`), byte-equivalent
to collab-service's Go `int32(-1)`. NOTE: a real 4.0.5 gate showed RabbitMQ compares
`x-delivery-limit` by **value**, not field width (int8/16/32/64 all equivalent) — the
typed width is convention/future-proofing, not a `PRECONDITION_FAILED` requirement.
Upgrade **local dev-orchestration RabbitMQ** and verify per environment before cutover.

**Cutover procedure (per environment):**

```bash
# 1. Inspect the existing queue: type, depth, unacked, consumers.
rabbitmqctl list_queues name type messages messages_unacknowledged consumers \
  | grep -E 'collaboration-lifecycle|alkemio-collaboration' || true

# 2. Stop BOTH producers (server) and consumers (collab service) for the lifecycle queue.

# 3a. If the queue is EMPTY (depth 0, no unacked): delete the classic queue, then let
#     the CONSUMER declare the quorum queue FIRST, then start the producer.
rabbitmqctl delete_queue alkemio-collaboration-lifecycle    # only if empty
#     (bring up collab-service → it declares the quorum queue → then start server)

# 3b. If the queue is NON-EMPTY: DO NOT delete it. Drain / export / reconcile the
#     backlog first (a classic→quorum switch cannot be done in place), then repeat.
```

Producer and consumer declarations MUST be literally equivalent (`durable: true` +
`{ 'x-queue-type': 'quorum', 'x-delivery-limit': -1 }` and nothing else) — whichever
declares an inequivalent set (wrong value or a missing/extra arg) second fails
`PRECONDITION_FAILED`.

## Verify the authZ-eval path (OPEN-1 confirmation)

> The authorization-evaluation-service is a **separate** repo
> (`authorization-evaluation-service`). Run it pointed at server's DB.

```bash
# pick a memo with a known parent authorizationPolicyId P and an actor A
curl -s http://localhost:6060/internal/auth/evaluate \
  -H 'content-type: application/json' \
  -d '{"actorId":"<A>","privilege":"read","authorizationPolicyId":"<P>"}'
# expect { "allowed": <same as server in-process isAccessGranted(A, entity.authorization, READ)> }

curl -s http://localhost:6060/internal/auth/evaluate \
  -H 'content-type: application/json' \
  -d '{"actorId":"<A>","privilege":"update-content","authorizationPolicyId":"<P>"}'
# expect { "allowed": <same as in-process UPDATE_CONTENT check> }
```
The parity test (server-side, FR-008) asserts the auth-eval decision equals
`AuthorizationService.isAccessGranted` for the same actor/privilege/policy — proving
the path covers collab documents and pinning `read` / `update-content`.

## Run the migration read (one-time)

```bash
# the dedicated read path (server CLI standalone or guarded internal read) yields,
# for every memo + whiteboard: { id, contentType, content, authorizationPolicyId }
pnpm run cli -- collab:migration-export        # (name TBD; see tasks T005)
# the migration job (WS-E / collab v2 decoder) consumes this to seed the unified service
```

## Key tests (to be written — TDD)

| Behavior | Test (intended) |
|---|---|
| Schema migration up/down clean + back-fill | migration snapshot test |
| Unified save/fetch round-trip (inline memo) | `collaboration-save`/`-fetch` integration test |
| Offloaded save writes index only | DB-assertion test (content column empty) |
| `fetch` carries `authorizationPolicyId` | fetch-reply assertion |
| `document.deleted` enqueued atomically on delete | outbox-row assertion in `deleteMemo`/`deleteWhiteboard` (row present on success, absent on a failed delete) |
| dispatcher delivers the outbox row | dispatcher test: claim → confirmed publish → `delivered`; failure → backoff/retry (at-least-once) |
| authZ-eval parity with in-process check | cross-service parity test (read + update-content) |
| Migration read returns 100% of rows | migration-export completeness test |

The cross-repo migration round-trip (legacy blob → unified service → identical
render) is verified jointly with the collaboration-service's round-trip test (epic
SC-003) — it is not a server-only test.

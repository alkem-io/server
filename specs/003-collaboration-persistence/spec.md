# Feature Specification: Collaboration Persistence, Lifecycle & AuthZ (server slice)

**Feature Branch**: `feat/003-unify-collab-yjs`
**Created**: 2026-06-18
**Status**: Draft (spec/design only — implementation blocked, see Assumptions & Dependencies)
**Workspace epic**: `../agents-hq/specs/003-unify-collab-yjs/` (WS-E — persistence + lifecycle integration)
**Backlog Story**: https://github.com/alkem-io/alkemio/issues/1909 (#1909)
**Input**: The `server` slice of the epic — realize epic **US3** (persistence/lifecycle) and **US4** (migration) at the Alkemio `server`: own the metadata/index store for the unified collaboration-service, repoint the `save`/`fetch` persistence contract, emit the document delete-cascade lifecycle event, verify the authorization-evaluation path covers collaboration documents, and provide read access to legacy persisted content for the one-time migration.

> **Repo-local sub-spec (WS-E, server slice).** This is the `server` repo's own
> SpecKit spec — the same `sub_spec` treatment `y-crdt`, `excalidraw-fork`, and
> `collaboration-service` received. The **workspace epic** owns the cross-repo
> *why*, the frozen contracts (`contracts/{persistence-ports,lifecycle-events}.md`),
> the data-model conventions, and the rollout sequencing. **This document owns the
> server's internals**: how the NestJS/TypeORM/GraphQL backend stores the
> metadata/index, repoints the persistence RPC, emits lifecycle events, exposes
> authorization, and serves the migration — its user stories at the server
> boundary, its functional requirements, measurable success criteria, and task
> breakdown. It does NOT re-specify the collaboration-service internals (that is
> `collaboration-service/specs/001-collaboration-server/`) or the CRDT core
> (`y-crdt`). Where the epic says "server MUST …", this spec says *how server does
> it and in which phase*.

---

## ⚠️ Implementation status — SPEC/DESIGN ONLY

This sub-spec is authored ahead of implementation. **No code is changed by this
spec.** Implementation MUST NOT start until both of the following are true:

1. **The clarify answers below are resolved** — chiefly OPEN-1 (the
   `authorizationPolicyId` source + read/collaborate privilege strings) and OPEN-3
   (the unified RabbitMQ contract direction: server-as-consumer vs server-as-server).
2. **The collaboration-service Wave-2 adapter finalizes the wire contract.** The
   unified `collaboration-save`/`collaboration-fetch` index-only contract is being
   built *right now* by the collab-service's Wave-2 `rabbitmq` metastore adapter
   (its tasks.md T005.1). This server slice is the **other half** of that contract.
   The two MUST be agreed before either ships. The collab side records this as its
   **OPEN-3 cross-repo dependency**; this spec is the server-side resolution of it.

Both gates are restated in **Assumptions & Dependencies** and the **OPEN** section.

---

## Clarifications

### Inherited from the epic (Sessions 2026-06-17 / 2026-06-18)

The epic's clarifications are authoritative and not re-litigated here. The
server-relevant resolutions this spec builds on:

- **Metadata/blob split** — a small queryable index (id, content-type, version,
  content pointer, blob-store kind, owner ref, timestamps) lives in the main DB
  (server-owned); the encoded `Y.Doc` snapshot is a blob in a pluggable BlobStore
  (inline default = today's column; optional file-service/S3/local on the collab
  side). **Server owns the index, not necessarily the blob** (epic FR-022, R7;
  `contracts/persistence-ports.md`).
- **Full v2 `Y.Doc` snapshot, debounced** — fits the existing `save`/`fetch`
  request/reply contract; not an append-only log (epic R7, FR-010).
- **Owner-driven + lazy materialization** — `server` owns document identity; a
  collab document exists iff its parent Alkemio entity (Callout framing /
  contribution) does; deletion **cascades via a `server` event** that purges the
  metadata + blob; the collab service lazily materializes the room on first
  connect. **No orphans** (epic FR-023; `contracts/lifecycle-events.md`).
- **AuthN at handshake / AuthZ delegated** — the collab service authenticates the
  Alkemio token at the WS handshake and delegates per-document read/collaborate
  decisions to the **authorization-evaluation-service** (a *separate* Go service),
  not to server's in-process `AuthorizationService` (epic FR-021, R13).
- **One-time in-place migration** — legacy memo blobs (Yjs v1/v2) decoded by the
  Go core's v2 decoder; whiteboard Excalidraw-JSON snapshots transformed into
  `Y.Doc`s; server provides **read access** to the legacy persisted content for the
  migration job (epic FR-006, US4; WS-E).
- **Forward-compatible with versioning** — the persistence contract abstracts a
  *version* (the metadata row already carries `version`); v1 serves latest-only
  (epic FR-025).

### Session 2026-06-18 (server-level — current-state findings)

Resolved by reading server's actual code (file anchors in `research.md`), and
recorded so implementation does not re-discover them:

- **Q: Does server today *call out* to the legacy collab services to save/fetch,
  or do the legacy services call *into* server?** → **A: The legacy services call
  INTO server.** Server is the **consumer/responder** of the persistence RPC, not
  the publisher. The collaborative-document-service and whiteboard-collaboration-service
  send `save`/`fetch`/`info`/`who` over RabbitMQ; server hosts `@MessagePattern`
  handlers that load/store the content from the main DB and reply. See
  `CollaborativeDocumentIntegrationController` and `WhiteboardIntegrationController`.
  **This inverts the naive reading of T001/T002** — server does not "repoint a
  client to the unified service"; instead the *unified* collaboration-service
  becomes the new caller of server's (extended, unified) `save`/`fetch` handlers.
- **Q: Where does the content blob live today?** → **A: Inline in the main DB.**
  `Memo.content` is a `bytea` column (the Yjs v2 binary state, base64 on the wire);
  `Whiteboard.content` is a `text` column (Excalidraw JSON, gzip-compressed via
  entity hooks). Both inherit `authorizationId` (FK to `AuthorizationPolicy`) from
  `AuthorizableEntity`. This is the `inline` BlobStore today.
- **Q: How does server decide read vs. update for a collab document today?** →
  **A: `AuthorizationPrivilege.READ` for read, `AuthorizationPrivilege.UPDATE_CONTENT`
  for collaborate** — checked in-process via `AuthorizationService.isAccessGranted`
  against the entity's loaded `authorization` policy (the legacy `info` handler).
  The `ContentUpdatePolicy` (`OWNER`/`ADMINS`/`CONTRIBUTORS`) is baked into the
  policy as privilege rules (`UPDATE`/`CONTRIBUTE` → `UPDATE_CONTENT`), so the
  collaborator check is always `UPDATE_CONTENT`.
- **Q: Does server expose an `/internal/auth/evaluate` endpoint?** → **A: No —
  that endpoint lives in a *separate* repo, `authorization-evaluation-service`** (a
  Go service). It reads `authorizationPolicy` + `credential` rows **directly from
  server's database** and evaluates `{actorId, privilege, authorizationPolicyId}`
  → `{allowed, reason}`. Server's only obligation is that the policy row the collab
  service references **exists and is current in the DB** — which it already is
  (`AuthorizableEntity.authorization` is persisted with `cascade: true`).

### OPEN — decisions needed (with recommendations)

> Each is grounded in server's real code (`research.md`). **OPEN-1 and OPEN-3 are
> blocking for implementation** (and feed the in-flight collab-service adapter).
> OPEN-2/OPEN-4 are refinements. The full grounding + recommendation is in
> `## Clarifications → OPEN` at the end of this document.

- **OPEN-1 (authZ mapping — T004): the `authorizationPolicyId` is the collab
  document's parent entity's `AuthorizationPolicy.id`; privileges are `read` /
  `update-content`.** *Confirmed against code* — but needs antst's sign-off because
  it pins the in-flight collab `authzeval` adapter. **The collab adapter's current
  assumption (`read` / `update-content`, policy-id carried in metadata) is
  CORRECT.** See OPEN-1.
- **OPEN-3 (unified RabbitMQ contract — T001/T002): adopt new index-only patterns
  `collaboration-save` / `collaboration-fetch` with payload
  `{id, contentType, version, contentPointer, blobStore}`, replacing the two legacy
  dialects.** *Direction needs confirming* — does the collab service call server
  (server stays responder, new unified handlers) or does server call the collab
  service? See OPEN-3.
- **OPEN-2 (blob offload boundary — T002): for v1, keep the blob inline in the main
  DB (`blob_store = 'inline'`, `content_pointer = <row id>`); the collab service's
  optional file-service/S3 offload is its concern, not server's.** See OPEN-2.
- **OPEN-4 (migration access shape — T005): expose legacy content read via a
  dedicated read-only migration path (RPC or a guarded read API), not by reusing
  the live `fetch` handler, so the one-time job can stream all rows.** See OPEN-4.

---

## User Scenarios & Testing *(mandatory)*

These are the epic's **US3** (persistence/lifecycle) and **US4** (migration)
realized **at the server boundary**. Each is independently testable against
server's test stack (Vitest + the integration test harness).

### User Story 1 - Unified metadata/index persistence at the server (Priority: P1) — Phase 1

The server stores the **metadata/index** for a collaboration document (id,
content-type, version, content pointer, blob-store kind) and serves the unified
`save`/`fetch` request/reply contract the collaboration-service uses. Where the
blob is offloaded the server stores only metadata + a pointer; where it is inline
(v1 default) the server continues to hold the encoded snapshot in the existing
content column, with the pointer = the row id.

**Why this priority**: This is the storage-contract-owner obligation (epic line
51). Without it the unified collaboration-service has nowhere to persist.

**Independent Test**: A `save` carrying `{id, contentType, version, contentPointer,
blobStore}` upserts the index row and (inline) the blob; a subsequent `fetch`
returns the same metadata + content. A `save` with `blobStore != 'inline'` stores
only metadata + pointer and `fetch` returns the pointer (no inline blob).

**Acceptance Scenarios**:

1. **Given** a unified `save` for a memo with `blobStore = 'inline'`, **When** it
   is processed, **Then** the memo's index row is upserted (version bumped) and the
   v2 snapshot is stored in the existing `content` column, with `content_pointer` =
   the memo id and `blob_store` = `inline`.
2. **Given** a unified `save` for a whiteboard with `blobStore = 'file-service'`
   and a `contentPointer`, **When** it is processed, **Then** the index row stores
   `content_pointer` + `blob_store` and the inline `content` column is **not**
   written (or cleared), and `fetch` returns metadata + pointer only.
3. **Given** a `fetch` for an id with no index row, **When** it is processed,
   **Then** the reply is a structured `not_found` (no exception leaks).

---

### User Story 2 - Document delete cascade emits a lifecycle event (Priority: P1) — Phase 2

When a memo or whiteboard is deleted (because its parent Callout framing or
contribution is removed), the server emits a `document.deleted` lifecycle event on
the bus so the collaboration-service disconnects clients, releases the room, and
purges the metadata + blob — leaving **no orphan**.

**Why this priority**: The owner-driven lifecycle invariant (epic FR-023). Without
it, deleting a Callout leaves a live collab room and an orphaned snapshot.

**Independent Test**: Deleting a memo/whiteboard (directly, or via its parent
contribution/framing) publishes a `document.deleted {id}` event exactly once; the
event is idempotent (re-emit on an absent doc is a no-op downstream).

**Acceptance Scenarios**:

1. **Given** a memo attached to a Callout contribution, **When** the contribution
   is deleted, **Then** `MemoService.deleteMemo` runs and a `document.deleted {id}`
   event is published before/at the point the row is removed.
2. **Given** a whiteboard attached to a Callout framing, **When** the framing is
   deleted, **Then** `WhiteboardService.deleteWhiteboard` runs and a
   `document.deleted {id}` event is published.
3. *(Optional)* **Given** a new memo/whiteboard is created, **When** it is
   persisted, **Then** an optional `document.created {id, contentType, ownerRef}`
   event may pre-register metadata (otherwise the row is created lazily on first save).

---

### User Story 3 - Authorization evaluation covers collaboration documents (Priority: P1) — Phase 2 (verification)

The authorization-evaluation-service can decide `read` and `update-content` for a
memo/whiteboard, addressed by the document's parent-entity `authorizationPolicyId`,
because server persists that policy row in the DB (which the auth-eval-service
reads directly). The server's responsibility is to **guarantee the policy row
exists, is current, and that its id is discoverable** from the document id.

**Why this priority**: This is the authZ correctness path for the unified service
and it confirms/corrects the in-flight collab `authzeval` adapter (OPEN-1).

**Independent Test**: For a memo/whiteboard with a known parent-entity policy id,
`POST /internal/auth/evaluate {actorId, "read", policyId}` returns the same
decision server's in-process `isAccessGranted(actorCtx, entity.authorization,
READ)` returns; likewise for `"update-content"`. A reader is allowed `read`, denied
`update-content`; a collaborator is allowed both.

**Acceptance Scenarios**:

1. **Given** a memo whose parent entity has `AuthorizationPolicy.id = P`, **When**
   the collab service evaluates `{actorId, "read", P}`, **Then** the
   auth-eval-service returns the same `allowed` as server's in-process read check.
2. **Given** the same memo, **When** the collab service evaluates `{actorId,
   "update-content", P}`, **Then** the result matches server's in-process
   `UPDATE_CONTENT` check (honoring `ContentUpdatePolicy` privilege rules).
3. **Given** the document id, **When** the collab service needs the policy id,
   **Then** the metadata index returned by `fetch`/`Load` carries
   `authorizationPolicyId` so the collab service never re-derives Alkemio's authZ.

---

### User Story 4 - Legacy content is readable for the one-time migration (Priority: P2) — Phase 3

The server provides read access to all existing persisted memo (Yjs v1/v2 `bytea`)
and whiteboard (Excalidraw JSON `text`, compressed) content so the one-time
in-place migration job can stream it through the new stack — without data loss and
without users re-creating anything.

**Why this priority**: A migration that loses content is unacceptable (epic SC-003
= 100% migrated, identical render). Secondary to the live persistence/lifecycle
path because migration runs once, after the new stack is validated.

**Independent Test**: A migration read returns, for every memo, its raw v2 binary
state (base64) and, for every whiteboard, its decompressed Excalidraw JSON, keyed
by id with its content-type and parent `authorizationPolicyId`, in a form the
migration job can iterate over completely.

**Acceptance Scenarios**:

1. **Given** N persisted memos, **When** the migration reads them, **Then** it
   receives N records of `{id, contentType: memo, v2BinaryBase64,
   authorizationPolicyId}` with the same bytes server stores in `Memo.content`.
2. **Given** M persisted whiteboards, **When** the migration reads them, **Then**
   it receives M records of `{id, contentType: whiteboard, excalidrawJson,
   authorizationPolicyId}` with the decompressed content.
3. **Given** the migration completes, **When** each migrated doc is opened on the
   unified service, **Then** it loads identically to its pre-migration state
   (verified jointly with the collab service's round-trip test).

---

### Edge Cases

- **`fetch` for an absent id** → structured `not_found` reply, no exception leak
  (mirror today's `FetchErrorCodes.NOT_FOUND`).
- **`save` for an absent id** → structured `not_found` (today's behavior — server
  does not lazily create the row on save; creation is via the create path / optional
  `document.created`). *Confirm whether the unified contract should lazily upsert.*
- **Delete during an active collab session** → the `document.deleted` event must
  still fire; the collab service disconnects clients and purges (its edge case).
  Server emits regardless of session state.
- **Blob offloaded but pointer dangling** → if `blob_store != 'inline'` and the
  pointer cannot be resolved by the collab service, that is the collab service's
  `save-error`; server's index row is still authoritative for metadata.
- **Migration of a memo with NULL `content`** (never-edited) → migration emits an
  empty/seed `Y.Doc` record, not a failure.
- **Whiteboard decompression failure** (corrupt legacy blob) → the migration record
  is flagged, not silently dropped; surfaced for manual review.
- **Concurrent live edit during migration** → out of scope at the server slice; the
  big-bang cutover (WS-E) freezes writes during the in-place batch.

## Requirements *(mandatory)*

Server-level functional requirements. Each traces to one or more epic FRs and to
tasks in `tasks.md`. **[Phase N]** marks the phase that delivers it.

### Functional Requirements

- **FR-001** [Phase 1]: The server MUST extend the `Memo` and `Whiteboard`
  persistence rows with **`content_pointer`** (nullable varchar/uuid) and
  **`blob_store`** (nullable varchar enum: `inline`|`file-service`|`s3`|`local`)
  columns, defaulting existing rows to `blob_store = 'inline'`, `content_pointer =
  <row id>` (epic FR-022; `contracts/persistence-ports.md`).
- **FR-002** [Phase 1]: The server MUST expose a **unified `save`/`fetch`
  request/reply contract** carrying the index payload `{id, contentType, version,
  contentPointer, blobStore}` (plus `authorizationPolicyId` per FR-005), replacing
  the two legacy dialects (`collaboration-document-save`/`-fetch` and `save`/`fetch`)
  with one (epic FR-010/FR-022; OPEN-3).
- **FR-003** [Phase 1]: On a unified `save` with `blobStore = 'inline'`, the server
  MUST store the encoded snapshot in the existing content column AND the index row;
  on `save` with `blobStore != 'inline'`, the server MUST store **only** metadata +
  pointer and MUST NOT write the inline content column (epic FR-022, T002).
- **FR-004** [Phase 1]: The server MUST bump the metadata `version` on each `save`
  (forward-compatible with a future version timeline, epic FR-025) and return
  structured `not_found`/`internal_error` replies (never leak exceptions), keeping
  the existing manual-ack RabbitMQ semantics.
- **FR-005** [Phase 1/2]: The server MUST make the document's parent-entity
  **`authorizationPolicyId`** (the `AuthorizationPolicy.id` carried on the `Memo`/
  `Whiteboard` via `authorizationId`) **available in the metadata index** returned
  on `fetch`/`Load`, so the collaboration-service's `authzeval` adapter can evaluate
  against it without re-deriving Alkemio's authZ model (epic FR-021; OPEN-1).
- **FR-006** [Phase 2]: The server MUST **emit a `document.deleted {id}` lifecycle
  event** on the bus whenever a `Memo` or `Whiteboard` is deleted — at the cascade
  points `MemoService.deleteMemo` and `WhiteboardService.deleteWhiteboard` (which
  fire when a parent Callout framing/contribution is removed) — idempotently, so the
  collaboration-service releases the room and purges metadata + blob with no orphan
  (epic FR-012/FR-023; `contracts/lifecycle-events.md`).
- **FR-007** [Phase 2, optional]: The server MAY emit `document.created {id,
  contentType, ownerRef}` on memo/whiteboard creation (pre-register metadata) and
  `document.access_changed {id}` when the parent entity's authorization is
  recomputed, so the collab service can re-evaluate connected clients (epic FR-023;
  `contracts/lifecycle-events.md`).
- **FR-008** [Phase 2, verification]: The server MUST **verify and document** that
  the authorization-evaluation-service correctly decides `read` and `update-content`
  for collaboration documents addressed by the parent-entity `authorizationPolicyId`
  — i.e. that the policy row is persisted, current, and that its decision matches
  server's in-process `isAccessGranted` for the same actor/privilege/policy (epic
  FR-021; OPEN-1). *This is a verification + contract-pinning obligation, not new
  auth code in server.*
- **FR-009** [Phase 3]: The server MUST provide **read access to legacy persisted
  content** for the one-time migration: every memo's raw v2 binary state and every
  whiteboard's decompressed Excalidraw JSON, keyed by id with content-type and
  `authorizationPolicyId`, iterable in full by the migration job (epic FR-006, US4).
- **FR-010** [Phase 1/3]: The server MUST deliver the schema change as **idempotent,
  reversible TypeORM migrations** (constitution Architecture Standards §3, Workflow
  §4) plus any codegen, and MUST keep the touched code covered by **meaningful,
  risk-based tests** per server constitution §6 (see the coverage tension in
  Assumptions).
- **FR-011** [Phase 1]: The new persistence consumer and the lifecycle emitter MUST
  follow server's existing conventions — `@MessagePattern`/`@EventPattern` handlers,
  the `clientProxyFactory` outbound client, the `MessagingQueue` enum, manual ack —
  and MUST NOT introduce a bespoke bus abstraction (constitution §2/§4).

### Key Entities *(server view; details in `data-model.md`)*

- **Memo** — `bytea content` (Yjs v2 state) + (new) `content_pointer`, `blob_store`;
  `authorizationId` FK; `contentUpdatePolicy`. The memo-side collab document.
- **Whiteboard** — `text content` (Excalidraw JSON, compressed) + (new)
  `content_pointer`, `blob_store`; `authorizationId` FK; `contentUpdatePolicy`. The
  whiteboard-side collab document.
- **AuthorizationPolicy** — the per-entity policy whose `id` is the
  `authorizationPolicyId` the auth-eval-service evaluates; persisted via
  `AuthorizableEntity.authorization` (`authorizationId` FK).
- **CollaborationMetadata (index)** — the unified index projection over Memo/
  Whiteboard: `{id, contentType, version, contentPointer, blobStore,
  authorizationPolicyId, ownerRef, timestamps}`. *Conceptual — realized as columns
  on the existing entities, not a new table, in v1.*
- **Unified Save/Fetch message** — the request/reply payloads of the unified
  persistence contract (`data-model.md`).
- **LifecycleEvent** — `document.deleted` (+ optional `document.created`/
  `document.access_changed`) emitted on the bus.

## Success Criteria *(mandatory)*

Server-level, directly testable in this repo (Vitest + integration harness) or
jointly with the collab service's round-trip. Each traces to an epic SC.

- **SC-001** [Phase 1]: A unified `save`/`fetch` round-trip for an inline memo and
  an inline whiteboard returns **byte-identical** content and the upserted index row
  (version bumped) — proving the unified contract preserves today's behavior (epic
  SC-007 supporting).
- **SC-002** [Phase 1]: A `save` with `blob_store != 'inline'` writes **only**
  metadata + pointer (the inline content column is empty/untouched), verified by a
  DB assertion — proving the metadata/blob split (epic SC-012 supporting).
- **SC-003** [Phase 1]: The TypeORM migration adding `content_pointer`/`blob_store`
  **applies and reverts cleanly** on a schema snapshot, with existing rows
  back-filled to `inline` + self-pointer (constitution Architecture §3).
- **SC-004** [Phase 2]: Deleting a memo or whiteboard (directly or via parent
  contribution/framing) emits **exactly one** `document.deleted {id}` event,
  verified by a spy on the outbound client — no event on a failed delete (epic
  FR-012/FR-023).
- **SC-005** [Phase 2]: For a memo/whiteboard with policy id `P` and a given actor,
  `POST /internal/auth/evaluate {actorId, "read"|"update-content", P}` returns the
  **same decision** as server's in-process `isAccessGranted` — proving the
  auth-eval path covers collab documents and pinning the privilege strings (epic
  FR-021; SC-008 supporting).
- **SC-006** [Phase 3]: The migration read returns **100%** of persisted memos and
  whiteboards with their content and `authorizationPolicyId`, iterable without gaps
  — proving no-document-left-behind for the one-time migration (epic SC-003).
- **SC-007** [Phase 1/3]: All touched code carries **meaningful, risk-based tests**
  (server constitution §6); the touched-code coverage target is reconciled with the
  epic's ≥95% in Assumptions (see the coverage tension). `npm run lint` is clean.

## Assumptions & Dependencies

- **BLOCKED on the collab Wave-2 wire contract.** The unified `save`/`fetch`
  patterns + payload (FR-002) are the **other half** of the collaboration-service's
  in-flight `rabbitmq` metastore adapter (its T005.1 / OPEN-3). Implementation MUST
  wait until that contract is frozen with the collab worker. This spec proposes the
  shape; the two repos must agree before either ships.
- **BLOCKED on clarify answers** — OPEN-1 (authZ mapping, restated below — the
  recommended answer is confirmed from code but needs antst's sign-off because it
  pins the collab adapter) and OPEN-3 (the contract direction).
- **The authorization-evaluation-service is a separate repo**
  (`/Users/antst/work/alkemio/authorization-evaluation-service`), not part of
  server. It reads server's `authorizationPolicy` + `credential` tables directly.
  Server's only obligation is the policy row's existence/currency (already
  guaranteed) — **server does not host `/internal/auth/evaluate`.** No new auth
  endpoint is built in server.
- **Server is the responder, not the caller.** Today the legacy collab services
  call into server's `@MessagePattern` handlers. The natural unified design keeps
  server as the **responder** of the new unified `save`/`fetch` and the **emitter**
  of lifecycle events. The unified collaboration-service becomes the new caller.
  (OPEN-3 confirms the direction.)
- **Coverage tension (epic ≥95% vs server constitution risk-based).** The epic
  FR-015/SC-010 mandate **≥95%** unit coverage on touched code; server's own
  constitution §6 explicitly says **"100% coverage is NOT required"** and prefers
  risk-based testing. This sub-spec **defers to the epic's ≥95% on the *touched*
  collaboration-persistence code** (the schema, the consumer, the emitter, the
  migration reader) while honoring server's risk-based philosophy elsewhere. Flag
  for antst if the ≥95% gate should be CI-enforced repo-wide or scoped to the diff.
- **Migration job ownership.** The one-time migration *job/runner* is WS-E and may
  live as a server CLI command or a separate runner; this slice owns **read access**
  to the legacy content (FR-009), not the transform (that is the collab Go core's v2
  decoder + the whiteboard-JSON→`Y.Doc` seeding).
- **Out of scope (server slice)** — the collab-service internals (rooms, sync,
  presence, limits); the CRDT core + v2 decoder (WS-A); the client bindings
  (WS-B/D); the big-bang cutover orchestration + rollback window (WS-E ops); the
  blob offload to file-service/S3 (the collab BlobStore's concern — server stays
  `inline` for v1).

## Clarifications → OPEN (decisions needed, with recommendations)

Grounded by reading server's real code (file anchors in `research.md`).

### OPEN-1 — authZ mapping: `authorizationPolicyId` source + privilege strings (BLOCKING, T004) ⭐

**This is the one antst flagged as critical — it confirms/corrects the in-flight
collaboration-service `authzeval` adapter.**

**Found in code (confirmed, not guessed):**
- Every `Memo` and `Whiteboard` extends `AuthorizableEntity`
  (`src/domain/common/entity/authorizable-entity/authorizable.entity.ts`), which
  holds a `@OneToOne` `authorization?: AuthorizationPolicy` with the FK column
  **`authorizationId`** (`@JoinColumn()`, `cascade: true`, `onDelete: 'SET NULL'`).
- `AuthorizationPolicy` (`src/domain/common/authorization-policy/authorization.policy.entity.ts`)
  extends `BaseAlkemioEntity`, whose `id` is a generated UUID. **That `id` IS the
  `authorizationPolicyId`.** Confirmed: the separate `authorization-evaluation-service`
  fetches policies by exactly this uuid (`FetchPolicyByUUID(policyID uuid.UUID)`,
  `internal/evaluator/engine.go`) directly from server's DB.
- The legacy `info` handlers decide access with **`AuthorizationPrivilege.READ`**
  (`'read'`) for read and **`AuthorizationPrivilege.UPDATE_CONTENT`**
  (`'update-content'`) for collaborate/edit —
  `collaborative-document-integration.service.ts` (`info`, lines 83–102) and
  `whiteboard.integration.service.ts` (`info`, the `READ` then `UPDATE_CONTENT`
  checks). `ContentUpdatePolicy` (`OWNER`/`ADMINS`/`CONTRIBUTORS`) is compiled into
  the policy as privilege rules mapping `UPDATE`/`CONTRIBUTE` → `UPDATE_CONTENT`
  (`memo.service.authorization.ts`, `whiteboard.service.authorization.ts`), so the
  collaborator check is **always `update-content`**, never `contribute` directly.
- The auth-eval-service's privilege whitelist
  (`authorization-evaluation-service/internal/service/validation.go`) includes both
  `read` and `update-content` (and `contribute`, `update`), so both strings are
  valid on the wire. Request shape: `{actorId, privilege, authorizationPolicyId}` →
  `{allowed, reason, error?}` (`internal/service/types.go`).

**Decision (recommended — needs antst's confirm because it pins the collab adapter):**
- The collaboration-service evaluates a document with
  `evaluate(actorId, "read" | "update-content", authorizationPolicyId)`.
- The `authorizationPolicyId` is the document's parent-entity
  `AuthorizationPolicy.id` (= the `Memo`/`Whiteboard`'s `authorizationId` FK value).
- **Server carries this `authorizationPolicyId` in the metadata index** returned on
  `fetch`/`Load` (FR-005) so the collab service learns it from persistence, never
  re-deriving authZ.
- **The collab `authzeval` adapter's current assumption is CORRECT** (`read` /
  `update-content`, policy-id from metadata). **No correction needed** — confirm and
  proceed.

**Residual question for antst:** is the policy id the **entity's own** policy
(`Memo.authorizationId`) sufficient, or must the collab service evaluate against a
**parent** policy (e.g. the Callout/Contribution) for inherited rules? Server's
in-process check uses the **entity's own** `authorization` (which already inherits
the parent's rules at authorization-reset time), so the entity policy id is
correct — **confirm there is no scenario where the entity policy is stale relative
to the parent.**

### OPEN-2 — blob offload boundary (T002)

**Found in code:** the blob is inline today — `Memo.content` (`bytea`),
`Whiteboard.content` (`text`, gzip via entity hooks). `save`/`fetch` read/write
these columns directly (`MemoService.saveContent`/`fetch`; `WhiteboardService.updateWhiteboardContent`).

**Genuinely unknown:** whether v1 should offload any blob from server's DB to
file-service, or keep everything inline. The `persistence-ports.md` BlobStore is a
**collab-service** port (default `inline`); server is only the MetadataStore.

**Recommendation:** **Keep the blob inline in server's DB for v1** (`blob_store =
'inline'`, `content_pointer = <row id>`). The collab service's optional
file-service/S3 offload is *its* BlobStore adapter — when it offloads, it sends
`blobStore != 'inline'` + a `contentPointer` and server stores only the index
(FR-003). Server does not itself call file-service. Confirm: is there any case
where *server* (not the collab service) must offload to file-service? If not, this
is settled.

### OPEN-3 — unified RabbitMQ contract: direction + shape (BLOCKING, T001/T002)

**Found in code:** server is the **responder** — `@MessagePattern` handlers for
`collaboration-document-{save,fetch,info,who}` (memo) on queue
`collaboration-document-service`, and `{save,fetch,info,who}` (whiteboard) on queue
`alkemio-whiteboards`; the legacy services are the **callers**. Server also hosts
outbound `clientProxyFactory` clients (notifications, matrix-adapter, auth-reset)
that `emit`/`send` — so server *can* be a caller too. Memo save payload =
`{documentId, binaryStateInBase64}`; whiteboard = `{whiteboardId, content}`.

**Genuinely unknown:** for the unified service, does **(a)** the collaboration-service
**call into** server (server keeps responder role; we add one unified
`@MessagePattern` set `collaboration-save`/`collaboration-fetch` and retire the two
legacy dialects), or **(b)** server **calls** the collaboration-service (server
becomes a caller via a new outbound client)? The epic says "server owns the
metadata/index store" (line 51) — implying server is the **store**, i.e. the
**responder** (a). The collab service's persistence-ports.md frames its
`MetadataStore` Alkemio adapter as "the existing `server` RabbitMQ save/fetch
pattern" — also implying server is the responder.

**Recommendation (a):** **Server stays the responder.** Add a unified
`@MessagePattern` handler set on a single queue (reuse/rename
`collaboration-document-service` → a collab queue, or keep both during cutover),
patterns **`collaboration-save`** / **`collaboration-fetch`**, payload
**`{id, contentType, version, contentPointer, blobStore}`** (+ `authorizationPolicyId`
on fetch reply, + the v2 blob base64 when `blobStore = 'inline'`). Retire the two
legacy dialects at cutover (constitution §10 / epic FR-012, no-legacy). **This is a
cross-repo contract with the collaboration-service — confirm the direction and the
exact payload/queue with the collab worker before implementing.** This resolves the
collab side's OPEN-3.

### OPEN-4 — migration content-read shape (T005)

**Found in code:** the live `fetch` handler returns **one** document's content per
RPC and is authorization/error-shaped for the live path. A one-time migration needs
to stream **all** rows.

**Genuinely unknown:** the migration job's preferred access — a batch RPC, a
guarded internal read API, or a direct DB read from a server-hosted CLI command.

**Recommendation:** Expose a **dedicated read-only migration path** — a server CLI
command (NestJS standalone) or a guarded internal endpoint — that iterates
`Memo`/`Whiteboard` rows and yields `{id, contentType, content (v2 base64 / decompressed
JSON), authorizationPolicyId}`, rather than overloading the live `fetch`. Keeps the
live contract clean and lets the one-time job run in one pass. Confirm the runner
location (server CLI vs separate migration runner) with whoever owns WS-E cutover.

## Phase map (server delivery)

| Phase | Scope | Tasks | Status |
|---|---|---|---|
| 1 | Schema (`content_pointer`/`blob_store`) + unified `save`/`fetch` consumer + metadata index (incl. `authorizationPolicyId`) + migration | T001, T002, T006 | Forward (blocked on OPEN-1/3 + collab contract) |
| 2 | Lifecycle: `document.deleted` emitter (+ optional created/access_changed); authZ-eval verification | T003, T004 | Forward (blocked on OPEN-1) |
| 3 | Migration read access for legacy memo/whiteboard content; migrations + codegen; coverage | T005, T006 | Forward |

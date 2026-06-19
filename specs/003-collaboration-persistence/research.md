# Research — Collaboration Persistence, Lifecycle & AuthZ (server slice, Phase 0)

Grounds every OPEN and FR in server's **actual current code**, then records the
design decisions (**Decision · Rationale · Alternatives**). The workspace
`research.md` (`../agents-hq/specs/003-unify-collab-yjs/research.md`) is the source
of truth for cross-repo decisions; this file records how the *server* realizes them
and the server-only choices.

All file paths are relative to the repo root unless noted.

---

## Current-state findings (with anchors)

### CS-1 — Server is the *responder* of the persistence RPC, not the caller

The legacy collab services **call into** server; server hosts the handlers and
replies. This is the single most important framing correction.

- **Memo (collaborative-document-service):** queue
  `collaboration-document-service` (`src/common/enums/messaging.queue.ts:34`,
  `COLLABORATION_DOCUMENT_SERVICE = 'collaboration-document-service'`). Patterns in
  `src/services/collaborative-document-integration/types/message.pattern.enum.ts`:
  `WHO='collaboration-document-who'`, `INFO='collaboration-document-info'`,
  `HEALTH_CHECK='collaboration-document-health-check'`,
  `SAVE='collaboration-document-save'`, `FETCH='collaboration-document-fetch'`.
  Event pattern `MEMO_CONTRIBUTION='collaboration-memo-contribution'`. Handlers:
  `src/services/collaborative-document-integration/collaborative-document-integration.controller.ts`
  (`@MessagePattern`/`@EventPattern`). Service:
  `…/collaborative-document-integration.service.ts`.
  - `save({documentId, binaryStateInBase64})` → `MemoService.saveContent(documentId,
    Buffer.from(b64,'base64'))` → writes `memo.content` (bytea). Returns
    `SaveOutputData` (`{success}` | `{error, code}`).
  - `fetch({documentId})` → reads `memo.content`, returns
    `{contentBase64 | undefined}` | `{error, code}`.
- **Whiteboard (whiteboard-collaboration-service):** queue `alkemio-whiteboards`
  (`messaging.queue.ts:30`, `WHITEBOARDS='alkemio-whiteboards'`). Patterns in
  `src/services/whiteboard-integration/types/message.pattern.ts`: `WHO='who'`,
  `INFO='info'`, `SAVE='save'`, `FETCH='fetch'`. Events
  (`…/types/event.pattern.ts`): `CONTRIBUTION='contribution'`,
  `CONTENT_MODIFIED='contentModified'`, `HEALTH_CHECK='health-check'`. Handlers:
  `src/services/whiteboard-integration/whiteboard.integration.controller.ts`.
  Service: `…/whiteboard.integration.service.ts`.
  - `save({whiteboardId, content})` → `WhiteboardService.updateWhiteboardContent` →
    writes `whiteboard.content` (text, JSON). `fetch({whiteboardId})` →
    `{content}` | `{error}`.
- **Connection setup:** `connectMicroservice(...)` for each queue in `src/main.ts`
  (transport `Transport.RMQ`, `queueOptions.durable=true`, `noAck:false` = manual
  ack via `src/services/util/ack.ts`). Outbound clients are built by
  `src/core/microservices/client.proxy.factory.ts` (`clientProxyFactory(queue)`,
  `noAck:true`) and registered in
  `src/core/microservices/microservices.module.ts` (`NOTIFICATIONS_SERVICE`,
  `MATRIX_ADAPTER_SERVICE`, `AUTH_RESET_SERVICE` — tokens in
  `src/common/constants/providers.ts`).

**Implication:** the unified contract most naturally keeps server as the
**responder** of `collaboration-save`/`collaboration-fetch`, with the unified
collaboration-service as the new caller (OPEN-3, decision DEC-3). The *only*
server-originated outbound message is the lifecycle `document.deleted` (DEC-4).

### CS-2 — The blob lives inline in the main DB today

- **Memo:** `src/domain/common/memo/memo.entity.ts` — `@Column('bytea', {nullable:
  true}) content?: Buffer`. Holds the Yjs v2 binary state
  (`Y.encodeStateAsUpdateV2`), base64 on the wire. Save:
  `MemoService.saveContent` (`memo.service.ts:151`) sets `memo.content = content`
  then `save`. Create seeds from markdown via `markdownToYjsV2State`
  (`memo.service.ts:51`).
- **Whiteboard:** `src/domain/common/whiteboard/whiteboard.entity.ts` —
  `@Column('text', {nullable: false}) content!: string` (Excalidraw JSON),
  **gzip-compressed** by `@BeforeInsert`/`@BeforeUpdate` (`compressText`) and
  decompressed by `@AfterLoad` (`decompressText`). Save:
  `WhiteboardService.updateWhiteboardContent` (`whiteboard.service.ts:~260`,
  `whiteboard.content = JSON.stringify(newContentWithFiles)`).
- Both extend `NameableEntity → AuthorizableEntity → BaseAlkemioEntity` — so each
  row already has `id` (uuid), `version` (int, TypeORM `@VersionColumn`),
  `createdDate`/`updatedDate`, and `authorizationId` (FK).
- Baseline migration: `src/migrations/1764590884532-baseline.ts` (memo table line
  ~57, whiteboard table line ~63) — confirms `content bytea` / `content text NOT
  NULL` + `authorizationId uuid`.

**Implication:** v1 keeps the blob inline; the new columns make the *offloaded*
case (collab BlobStore = file-service/s3) representable without moving server's
default behavior (DEC-1, DEC-2).

### CS-3 — AuthZ: privileges, policy id, and the in-process check

- **Privilege enum:** `src/common/enums/authorization.privilege.ts`. Exact wire
  values relevant here: `READ='read'`, `UPDATE='update'`, `UPDATE_CONTENT='update-content'`,
  `CONTRIBUTE='contribute'`, `CREATE='create'`, `DELETE='delete'`.
- **Entity → policy link:** `AuthorizableEntity`
  (`src/domain/common/entity/authorizable-entity/authorizable.entity.ts`) —
  `@OneToOne(() => AuthorizationPolicy, {eager:true, cascade:true, onDelete:'SET
  NULL'}) @JoinColumn() authorization?`. FK column = **`authorizationId`** (default
  `@JoinColumn()` name). `AuthorizationPolicy`
  (`src/domain/common/authorization-policy/authorization.policy.entity.ts`) extends
  `BaseAlkemioEntity` → `id` is a generated UUID. **`AuthorizationPolicy.id` IS the
  `authorizationPolicyId`.**
- **Read vs collaborate, in-process:** the `info` handlers compute access with —
  - read: `AuthorizationPrivilege.READ`
    (`collaborative-document-integration.service.ts:83-87`;
    `whiteboard.integration.service.ts` `info` READ check),
  - collaborate/edit: `AuthorizationPrivilege.UPDATE_CONTENT`
    (`collaborative-document-integration.service.ts:98-102`;
    `whiteboard.integration.service.ts` `UPDATE_CONTENT` check) —
  both via `AuthorizationService.isAccessGranted(actorContext, entity.authorization,
  privilege)` (`src/core/authorization/authorization.service.ts`).
- **ContentUpdatePolicy → privilege rules:** `whiteboard.service.authorization.ts`
  (and `memo.service.authorization.ts`) compile `ContentUpdatePolicy`:
  `OWNER` → credential rule granting `UPDATE_CONTENT` to `createdBy`; `ADMINS` →
  privilege rule `UPDATE` ⇒ `UPDATE_CONTENT`; `CONTRIBUTORS` → privilege rule
  `CONTRIBUTE` ⇒ `UPDATE_CONTENT`. So the collaborator check is **always
  `update-content`** — `contribute`/`update` are *source* privileges, not what the
  collab service should send.

### CS-4 — The authorization-evaluation-service is a SEPARATE repo

- Located in the `authorization-evaluation-service` repo (Go),
  **not** inside server. Server hosts **no** `/internal/auth/evaluate` endpoint.
- It evaluates by reading server's DB directly: `Engine.Evaluate(ctx, actorID,
  policyID uuid.UUID, privilege string)` (`internal/evaluator/engine.go:68`) calls
  `FetchPolicyByUUID(policyID)` and `FetchCredentialsByUUID(actorID)` and runs the
  credential-rule then privilege-rule algorithm (a direct port of server's TS
  `isAccessGrantedForCredentials`).
- HTTP contract: `POST /internal/auth/evaluate` (h2c)
  (`internal/httpserver/handler.go:21`). Request `EvaluationRequest`
  (`internal/service/types.go`): `{actorId?:string, privilege:string,
  authorizationPolicyId:string}`. Response `EvaluationResponse`: `{allowed:bool,
  reason:string, error?:{code, dependency?, retryAfterMs?}}`.
- Privilege whitelist (`internal/service/validation.go:9`) includes `read`,
  `update`, `update-content`, `contribute` (and many more) — so both `read` and
  `update-content` are valid wire values. No auth on the endpoint (in-cluster trust).

**Implication:** server's authZ obligation is to (a) surface
`authorizationPolicyId` in the metadata index and (b) ensure the policy row is
persisted/current (it is, via `cascade:true`). No evaluate endpoint is built in
server. This **confirms** the collab `authzeval` adapter assumption (DEC-5).

### CS-5 — Delete cascade points

- Leaf deletes (hard delete via `repository.remove`, also delete profile +
  authorization):
  - `MemoService.deleteMemo(memoID)` (`memo.service.ts:105-133`).
  - `WhiteboardService.deleteWhiteboard(whiteboardID)` (`whiteboard.service.ts:159-189`).
- Cascade callers:
  - `CalloutContributionService.delete` (`…/callout-contribution/callout.contribution.service.ts:220-264`)
    → `whiteboardService.deleteWhiteboard` / `memoService.deleteMemo` when the
    contribution carries one.
  - `CalloutFramingService.delete` (`…/callout-framing/callout.framing.service.ts:608-669`)
    → same.
  - `CalloutService.deleteCallout` (`…/callout/callout.service.ts:485-527`) →
    framing + each contribution.

**Implication:** emit `document.deleted` inside the two **leaf** delete methods so
every cascade path emits exactly once and direct deletes are covered (DEC-4).

### CS-6 — Outbound bus + in-process event bus

- Outbound RMQ: inject a `ClientProxy` token (e.g. `@Inject(NOTIFICATIONS_SERVICE)`)
  and `client.emit(pattern, payload)` (fire-and-forget) or `.send()` (RPC) — e.g.
  `src/services/adapters/notification-external-adapter/notification.external.adapter.ts`
  (`notificationsClient.emit(event, payload)`). Provider registered in
  `microservices.module.ts` via `clientProxyFactory(MessagingQueue.X)`.
- In-process domain events: `@nestjs/cqrs` `EventBus` +
  `src/services/infrastructure/event-bus/publisher.ts` (publishes to a RabbitMQ
  `event-bus` exchange keyed by event class name). Available if `document.deleted`
  should be published as a domain event handled by a publisher, rather than emitted
  inline.

**Implication:** the lifecycle emitter has two clean options (DEC-4 picks
fire-and-forget `emit` via a dedicated `COLLABORATION_SERVICE` client for an
explicit, named contract; the CQRS path is the alternative).

### CS-7 — TypeORM migration workflow

- Migrations dir `src/migrations/` (timestamp-prefixed, e.g.
  `1764590884532-baseline.ts`). CLI config `src/config/typeorm.cli.config.ts`
  (`migrations: src/migrations/*.ts`, table `migrations_typeorm`,
  `synchronize:false`). Scripts: `migration:generate`/`run`/`revert`/`show`/`validate`.
  Datasource init `src/config/migration.create.config.ts` (applies a UUID-column-type
  fix).

**Implication:** the `content_pointer`/`blob_store` change ships as one generated,
hand-reviewed, reversible migration with a back-fill (DEC-1).

### CS-8 — Server constitution coverage philosophy

- `.specify/memory/constitution.md` (v2.0.0) §6: *"100% coverage is NOT required …
  risk-based approach."* This **conflicts** with epic FR-015/SC-010 (≥95% on
  touched code). Resolved by DEC-7.

---

## Decisions

### DEC-1 — Index columns on the existing entities (not a new table) for v1
- **Decision**: add `content_pointer` (nullable varchar/uuid) + `blob_store`
  (nullable varchar enum) to `Memo` and `Whiteboard`; one reversible TypeORM
  migration back-fills existing rows to `blob_store='inline'`,
  `content_pointer=<id>`.
- **Rationale**: minimal, co-located with the inline blob, no join; matches the
  metadata/blob split contract without a schema upheaval (constitution §10).
- **Alternatives**: a dedicated `collaboration_metadata` table — cleaner for a
  future version timeline (FR-025) but premature for v1 (adds a join + a sync
  obligation). Recorded as the forward path if versioning lands.

### DEC-2 — Keep the blob inline in server's DB for v1
- **Decision**: server's BlobStore role stays `inline`; it never itself offloads to
  file-service/S3. Offload is the collab BlobStore's concern — when it offloads, it
  sends `blobStore != 'inline'` + a pointer and server stores only the index.
- **Rationale**: smallest change; preserves today's behavior; the offload capability
  is fully realized on the collab side (`persistence-ports.md` BlobStore). (OPEN-2.)
- **Alternatives**: server offloads to file-service on save — rejected for v1
  (duplicates the collab BlobStore, adds a file-service dependency to server's
  hot path).

### DEC-3 — Unified `collaboration-save`/`collaboration-fetch`; server stays responder
- **Decision**: one unified `@MessagePattern` set replaces the two legacy dialects;
  payload `{id, contentType, version, contentPointer, blobStore}` (+
  `authorizationPolicyId` and inline blob on fetch reply); server is the
  **responder**, the unified collaboration-service is the caller. Legacy dialects
  retire at cutover (constitution §7/§10; epic FR-012).
- **Rationale**: "server owns the metadata/index store" (epic line 51) ⇒ server is
  the store ⇒ responder. One contract avoids baking two legacy dialects forward.
- **Alternatives**: (a) server *calls* the collab service — rejected (inverts
  ownership, needs a new outbound RPC client + the collab service to host the
  store). (b) Keep two content-type-routed dialects — rejected (no-legacy). **This
  is the cross-repo contract the collab side flags as its OPEN-3 — must be confirmed
  jointly.**

### DEC-4 — Emit `document.deleted` at the two leaf delete methods, via a dedicated outbound client
- **Decision**: emit `document.deleted {id}` (fire-and-forget `emit`) inside
  `MemoService.deleteMemo` and `WhiteboardService.deleteWhiteboard`, through a new
  `COLLABORATION_SERVICE` `clientProxyFactory` client on a new `MessagingQueue`
  entry. Idempotent downstream.
- **Rationale**: the leaf methods are the single choke point every cascade path
  passes through — exactly-once, covers direct deletes; reuses server's outbound
  client convention; an explicit named contract (vs an implicit CQRS event name).
- **Alternatives**: emit in the callout services — rejected (misses direct deletes,
  risks double-emit). Publish a CQRS domain event via `event-bus/publisher.ts` —
  viable alternative; rejected for v1 in favor of an explicit, contract-named queue
  the collab service subscribes to directly (`contracts/lifecycle-events.md`).

### DEC-5 — AuthZ: surface `authorizationPolicyId`; verify parity; no evaluate endpoint
- **Decision**: carry the document's parent-entity `AuthorizationPolicy.id` (=
  `authorizationId`) in the metadata index returned on fetch; the collab
  `authzeval` adapter evaluates `{actorId, "read"|"update-content", policyId}`
  against the separate auth-eval-service. Server adds a **verification test**
  asserting the auth-eval decision matches in-process `isAccessGranted`, not a new
  endpoint.
- **Rationale**: the auth-eval-service already reads the canonical policy rows
  (CS-4); duplicating the model in server or the collab service violates DRY
  (constitution §8). The policy row is already persisted (`cascade:true`).
- **Alternatives**: server hosts a new `/internal/auth/evaluate` — rejected (the
  separate service already does this). The collab service derives authZ itself —
  rejected (duplicates Alkemio's model). **This confirms the collab adapter's
  `read`/`update-content` + policy-id-from-metadata assumption is correct** (OPEN-1).

### DEC-6 — Migration read via a dedicated one-pass path
- **Decision**: a server NestJS standalone CLI command (or guarded internal read)
  iterates `Memo`/`Whiteboard` repos, yielding `{id, contentType, content (v2
  base64 / decompressed JSON), authorizationPolicyId}` for the one-time migration —
  separate from the live `fetch`.
- **Rationale**: the live `fetch` is per-document + auth/error-shaped; a batch read
  keeps the live contract clean and lets the one-time job run in one pass.
- **Alternatives**: overload `fetch` with a "list all" mode — rejected (pollutes the
  live contract). Direct external DB read by the migration job — rejected (bypasses
  the decompression/encoding logic that lives in server's entities/services). (OPEN-4.)

### DEC-7 — Coverage: ≥95% on touched code, risk-based elsewhere
- **Decision**: apply the epic's **≥95% on the touched collaboration-persistence
  diff** (schema, consumer, emitter, migration reader); keep server's risk-based
  philosophy (constitution §6) for everything else. Flag to antst whether the gate
  is CI-enforced repo-wide or scoped to the diff.
- **Rationale**: honors both the epic gate (FR-015) and server's stated philosophy;
  the touched code is integration-critical and warrants the higher bar.
- **Alternatives**: repo-wide ≥95% — rejected (contradicts server constitution §6,
  large unrelated surface). Pure risk-based — rejected (under-delivers the epic gate
  on integration-critical code).

## Encoding summary (what crosses which boundary)

| Boundary | Encoding |
|---|---|
| Unified `save` (collab → server) | `{id, contentType, version, contentPointer, blobStore}` (+ inline v2 base64 when `blobStore='inline'`) |
| Unified `fetch` reply (server → collab) | `{id, contentType, version, contentPointer, blobStore, authorizationPolicyId}` (+ inline v2 base64 when inline) |
| Lifecycle (server → collab) | `document.deleted {id}` (+ optional `document.created {id, contentType, ownerRef}`, `document.access_changed {id}`) |
| AuthZ (collab → auth-eval-service, separate repo) | `POST /internal/auth/evaluate {actorId, "read"\|"update-content", authorizationPolicyId}` → `{allowed, reason}` |
| Inline blob at rest (server DB) | memo: `bytea` (Yjs v2); whiteboard: gzip-compressed Excalidraw JSON `text` |
| Migration read (server → migration job) | `{id, contentType, content (v2 base64 / decompressed JSON), authorizationPolicyId}` per row |

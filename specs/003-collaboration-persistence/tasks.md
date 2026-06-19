# Tasks: Collaboration Persistence, Lifecycle & AuthZ (server slice, WS-E)

**Input**: Design documents in `specs/003-collaboration-persistence/`
**Prerequisites**: spec.md, plan.md, research.md, data-model.md
**Tests**: Test-first where it adds signal (server constitution §6); ≥95% on the
touched collaboration-persistence diff (DEC-7).

> **Maps to the epic's server tasks** (`../agents-hq/specs/003-unify-collab-yjs/tasks/server.md`,
> T001–T006). Each milestone task below carries the epic id it realizes. Task ids
> here (S-T001…) are the fine-grained server breakdown.
>
> **✅ IMPLEMENTED — PR open for review.** The blocking gates (OPEN-1 + OPEN-3)
> are resolved and the collaboration-service Wave-2 `rabbitmq` adapter has frozen
> the unified wire contract (collab tasks.md T005.1), so the server slice is built:
> metadata/index persistence, lifecycle emit, authZ routing, the migration read
> path, migrations and tests all land in this PR. Task statuses below reflect the
> delivered state.

## Format: `[ID] [P?] [Phase] (epic-task) Description`
- **[P]**: parallelizable (different files, no ordering dependency).
- Paths relative to the repo root.

---

## Phase 1 — Metadata/index persistence (epic T001/T002) — ✅ IMPLEMENTED (OPEN-3 frozen)

> **Contract freeze (S-T002.0 / OPEN-3): RESOLVED.** Implemented against the
> **frozen** collab-service contract `collaboration-service/.../contracts/unified-metadata-rmq.md`
> + `internal/adapter/outbound/metastore/rabbitmq/contract.go`. Server is the
> **RESPONDER**. Key correction vs the original data-model proposal: **the blob
> NEVER crosses the unified bus** (no `snapshotBase64` on save/fetch) — the collab
> service owns the blob in its own BlobStore even for `inline`. Server is a pure
> metadata/index store on the unified path. Replies are flat objects
> (`{success}` / `{found, contentType, …}`), NOT the legacy `{event, data}` wrapper.

### S-T001 — Schema: `content_pointer` + `blob_store` columns (epic T001 → FR-001)
- [x] **S-T001.1** [P] [P1] (FR-001) Added `contentPointer` (nullable
  `varchar(512)`) + `blobStore` (nullable `varchar(128)` enum) to
  `src/domain/common/memo/memo.entity.ts` + `src/domain/common/whiteboard/whiteboard.entity.ts`
  and the `IMemo`/`IWhiteboard` interfaces (internal, no `@Field` — not on the
  GraphQL schema). `contentPointer` is `MID_TEXT_LENGTH` (512) to hold S3 keys /
  paths, not just UUIDs.
- [x] **S-T001.2** [P1] (FR-001/FR-010) Wrote the reversible migration
  `src/migrations/1781802081405-AddContentPointerAndBlobStore.ts`: adds 4 columns,
  back-fills existing rows (`contentPointer = id`, `blobStore = 'inline'`), `down()`
  drops them. Hand-written (no live DB in the worktree for `migration:generate`),
  matches the baseline migration's quoting/column-name conventions.
- [x] **S-T001.3** [P1] (FR-010 → SC-003) Defined `BlobStoreKind`
  (`inline|file-service|s3|local`) in `src/common/enums/blob.store.kind.ts`. NOTE:
  the up/down + back-fill snapshot test (SC-003) needs the
  `.scripts/migrations/run_validate_migration.sh` harness against a live DB — NOT
  runnable in this worktree; flagged for the PR's migration-validate CI step.

### S-T002 — Unified `collaboration-save`/`collaboration-fetch` consumer (epic T001/T002)
- [x] **S-T002.0** [P1] **(GATE)** Froze the unified wire contract against the
  collab-service's already-implemented `contract.go` (the canonical source). Server
  = RESPONDER. Patterns: `collaboration-save`/`-fetch`/`-delete`/`-info` (RPC) +
  `collaboration-contribution` (event). **Blob never crosses the bus.** Shapes
  recorded in `inputs/` + `outputs/`, mirroring the Go structs field-for-field.
- [x] **S-T002.1** [P1] (FR-002/FR-011) Added `MessagingQueue.COLLABORATION_SERVICE`
  (`alkemio-collaboration`) to `src/common/enums/messaging.queue.ts` and connected it
  in `src/main.ts` via `connectMicroservice`. Kept the legacy queues for coexistence
  (new queue added alongside, not a rename, so legacy + unified run in parallel until
  cutover).
- [x] **S-T002.2** [P1] (FR-002/FR-003/FR-004/FR-005) Implemented the unified
  handlers in a **new** `src/services/collaboration-integration/` module
  (controller + service), routing by `contentType`. Chose a new additive module
  over merging the two legacy ones (cleaner coexistence; legacy retired wholesale at
  cutover). Handlers: `save`/`fetch`/`delete`/`info` (`@MessagePattern`) +
  `contribution` (`@EventPattern`), manual ack (FR-011).
  - save (FR-003): index-only upsert (`contentPointer` + `blobStore`), version
    bumped explicitly per save (FR-004); unknown `blobStore` → structured error.
    The blob is NOT written here (frozen-contract correction — it never crosses the
    bus).
  - fetch (FR-005): returns `{found, contentType, version, contentPointer,
    blobStore, authorizationPolicyId}`; structured `{found:false}` /
    `{found:false,error}` (no exception leaks, FR-004).
- [x] **S-T002.3** [P1] (FR-003) Added index-only domain methods
  `MemoService.getCollaborationMetadata` / `saveCollaborationMetadata` /
  `deleteCollaborationMetadata` and the `WhiteboardService` equivalents (index-only
  query-builder writes that bypass the whiteboard compression hook). The inline blob
  stays on the **legacy** save path during coexistence — the unified path is
  index-only by contract.
- [x] **S-T002.4** [P1] (FR-002/FR-003/FR-005 → SC-001/SC-002) Tests: memo +
  whiteboard save routes by `contentType` (SC-001); offloaded save forwards only the
  index update, never the blob (SC-002); `fetch` carries `authorizationPolicyId`
  (FR-005); structured not-found / error replies. Unit-level (mocked repos); the
  byte-identical round-trip is a cross-repo joint test with the collab service.
- [x] **S-T002.5** [P1] (FR-002) Legacy-dialect retirement plan documented inline:
  the two legacy modules (`collaborative-document-integration`,
  `whiteboard-integration`) + their queues (`collaboration-document-service`,
  `alkemio-whiteboards`) are RETAINED for coexistence and removed at the big-bang
  cutover (WS-E), NOT in this PR. The unified module is the target.

---

## Phase 2 — Lifecycle events + authZ verification (epic T003/T004)

### S-T003 — `document.deleted` lifecycle emitter (epic T003 → FR-006/FR-007/FR-011)
- [x] **S-T003.1** [P2] (FR-006/FR-011) Added the `COLLABORATION_SERVICE` provider
  token (`src/common/constants/providers.ts`), the `MessagingQueue` entry, and
  registered the outbound client in
  `src/core/microservices/microservices.module.ts` via
  `clientProxyFactory(MessagingQueue.COLLABORATION_SERVICE)` (+ exported it; +
  stubbed it in the schema-bootstrap microservices stub).
- [x] **S-T003.2** [P2] (FR-006) Emit `document.deleted { id }` (fire-and-forget)
  inside `MemoService.deleteMemo` + `WhiteboardService.deleteWhiteboard`, AFTER the
  `repository.remove` (so a thrown delete does not emit). Encapsulated in a
  `CollaborationLifecycleService` (domain layer,
  `src/domain/common/collaboration-metadata/`) so the named contract lives in one
  place; the client is `@Optional()` (no-op + log when unwired, e.g. bootstrap).
- [x] **S-T003.3** [P] [P2] (FR-007) *(optional)* Implemented
  `emitDocumentCreated` / `emitDocumentAccessChanged` on the lifecycle service
  (available + tested), but NOT yet wired into create / authorization-reset call
  sites — left as the optional follow-up the spec marks (the row is created lazily
  on first save; access re-eval is a Wave-3 concern).
- [x] **S-T003.4** [P2] (FR-006 → SC-004) Tests: a lifecycle-service spy asserts
  `emitDocumentDeleted(id)` fires exactly once on a successful `deleteMemo` /
  `deleteWhiteboard`, and **not** when the delete throws before removal. The
  lifecycle service itself is tested directly (emit shape, fire-and-forget
  swallow, no-op without a client). Cascade paths (framing/contribution) reach the
  same leaf, so the single emission point covers them.

### S-T004 — AuthZ-eval verification + policy-id surfacing (epic T004 → FR-005/FR-008)
- [x] **S-T004.1** [P2] (FR-008) **(read-only investigation — DONE as spec
  grounding)** Confirmed: `authorizationPolicyId` = `Memo`/`Whiteboard`
  `authorizationId` (`AuthorizationPolicy.id`); read = `read`, collaborate =
  `update-content`; the separate auth-eval-service reads the policy row from server's
  DB (CS-3/CS-4, OPEN-1). **The collab `authzeval` adapter assumption is CORRECT.**
- [x] **S-T004.2** [P2] (FR-005) The unified `fetch` reply carries
  `authorizationPolicyId`, sourced from `entity.authorization?.id` in the
  domain-level `getCollaborationMetadata`. Explicitly asserted in the service +
  domain specs. `info` uses the same privilege strings (`READ` / `UPDATE_CONTENT`).
- [x] **S-T004.3** [P2] (FR-008 → SC-005) The parity test is **cross-repo** — it
  asserts the separate Go auth-eval-service's HTTP decision matches server's
  in-process `isAccessGranted`. CANNOT be a server-only unit test (the eval logic is
  in another repo + needs a live DB). Server-side, the `info` handler's in-process
  decision is unit-tested (read=READ, collaborate=UPDATE_CONTENT); the HTTP parity is
  flagged as a joint integration test (see Report cross-repo flags). **No server
  evaluate endpoint built (correct per DEC-5).**
- [x] **S-T004.4** [P2] (FR-008) OPEN-1 residual: server's in-process check uses the
  **entity's own** `authorization` policy (which inherits parent rules at
  authorization-reset time), so the entity policy id is the correct one to surface —
  consistent with code. The remaining "is the entity policy ever stale vs parent"
  question is a runtime/authorization-reset concern flagged for antst, not a code
  change here.

---

## Phase 3 — Migration read access + finalization (epic T005/T006)

### S-T005 — Legacy content read for the one-time migration (epic T005 → FR-009)
- [x] **S-T005.1** [P3] (FR-009) Implemented `CollaborationMigrationService`
  (`src/services/collaboration-integration/migration/`) — a one-pass, **batched
  async-generator** read over the `Memo` + `Whiteboard` repos yielding
  `{id, contentType, content, authorizationPolicyId, flagged?}`. Memo `content` as
  v2 base64; whiteboard `content` decompressed manually from the RAW column (via
  query builder, bypassing the `@AfterLoad` hook) so a corrupt blob doesn't abort
  the batch. Exposed as a service (the runner/CLI is WS-E, OPEN-4).
- [x] **S-T005.2** [P3] (FR-009) Edge cases handled + tested: memo with NULL
  `content` → `content: undefined` (not a failure); whiteboard decompression
  failure → `flagged: true` + `flagReason`, never dropped; empty whiteboard →
  `content: ''`.
- [x] **S-T005.3** [P3] (FR-009 → SC-006) Tests: full iteration without gaps,
  pagination across batches + empty-page termination, null policy id, corrupt blob
  flagging. Unit-level over mocked repos (100% lines / 95.7% branch).
- [x] **S-T005.4** [P3] (FR-009) Runner location: left as a **service** (not a
  committed CLI) — the runner + the cutover write-freeze are WS-E's responsibility
  (OPEN-4). Flagged for the WS-E owner in the Report.

### S-T006 — Migrations, codegen, coverage (epic T006 → FR-010)
- [x] **S-T006.1** [P3] (FR-010) One reversible TypeORM migration
  (`1781802081405-AddContentPointerAndBlobStore.ts`), idempotent + back-fill +
  `down()`. No sqlc (correct — that's the Go collab service). `migration:validate`
  (the DB snapshot harness, SC-003) requires a live PostgreSQL — flagged to run in
  CI / locally; not runnable in this worktree.
- [x] **S-T006.2** [P3] (FR-010 → SC-007) Touched collaboration code at **100%
  line** coverage (≥94.7% branch; remaining branches are defensive
  `e?.message ?? JSON.stringify(e)` fallbacks). `tsc --noEmit` + `biome check src/`
  clean; `pnpm build` green. **FLAG for antst:** the ≥95% gate is applied to the
  *touched diff*, not CI-enforced repo-wide (server constitution §6 is risk-based);
  confirm whether to CI-enforce it scoped to the diff.

---

## Dependencies & execution order

- **Phase 1** — S-T001 (schema) can land first; **S-T002 is gated on S-T002.0**
  (OPEN-3 + the collab Wave-2 contract freeze).
- **Phase 2** — S-T003 (emitter) is independent of Phase 1 and can proceed in
  parallel once the outbound client is registered. S-T004 (authZ) is read-only
  investigation now; its parity test depends on S-T002 surfacing the policy id.
- **Phase 3** — S-T005 (migration read) depends on the schema (S-T001) for the
  `blobStore` field but not on the consumer rewrite. S-T006 closes out migrations +
  coverage across all phases.
- **Cross-repo:** the migration round-trip (epic SC-003) and the authZ parity
  (SC-005) are joint with the collaboration-service and the auth-eval-service.
- **External gate:** production-trusting the migrated content depends on the collab
  Go core's **v2 decoder** (WS-A) — a workspace gate, not a server task.

## Counts

| Phase | Epic tasks | Server milestone tasks | Fine-grained sub-tasks | Status |
|---|---|---|---|---|
| 1 (persistence) | T001, T002 | S-T001, S-T002 | 8 | ✅ Implemented (contract frozen) |
| 2 (lifecycle + authZ) | T003, T004 | S-T003, S-T004 | 8 | ✅ Implemented (authZ parity = cross-repo test) |
| 3 (migration + finalize) | T005, T006 | S-T005, S-T006 | 6 | ✅ Implemented (read service; runner = WS-E) |
| **Total** | 6 | 6 | 22 | ✅ Implemented — in review (PR open) |

**Deferred to other owners / CI (not server code gaps):**
- SC-003 migration up/down snapshot test → `migration:validate` harness needs a live
  DB (CI / local), not runnable in the worktree.
- SC-005 authZ HTTP parity → cross-repo integration test (the eval logic is in the
  separate Go `authorization-evaluation-service`).
- The migration **runner** + cutover **write-freeze** → WS-E (this slice owns the
  read service only).
- Legacy-dialect **removal** → the big-bang cutover, not this PR (coexistence now).

## Notes

- The epic's `tasks/server.md` T006 says "sqlc regen" — that is a **Go**-ism; **server
  is TypeScript/TypeORM**, so the equivalent is `migration:generate`/`validate`.
  Flagged so the implementer does not chase a non-existent sqlc setup in server.
- The naive reading of epic T001/T002 ("repoint save/fetch to the unified service")
  is **inverted by CS-1**: server is the *responder*, so the work is to host the
  *new unified handlers* and have the collab service call them — not to repoint a
  server-side client. Captured in DEC-3 / OPEN-3.

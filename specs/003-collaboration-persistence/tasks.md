# Tasks: Collaboration Persistence, Lifecycle & AuthZ (server slice, WS-E)

**Input**: Design documents in `specs/003-collaboration-persistence/`
**Prerequisites**: spec.md, plan.md, research.md, data-model.md
**Tests**: Test-first where it adds signal (server constitution §6); ≥95% on the
touched collaboration-persistence diff (DEC-7).

> **Maps to the epic's server tasks** (`../agents-hq/specs/003-unify-collab-yjs/tasks/server.md`,
> T001–T006). Each milestone task below carries the epic id it realizes. Task ids
> here (S-T001…) are the fine-grained server breakdown.
>
> **⛔ BLOCKED — do not start implementation** until (a) OPEN-1 + OPEN-3 are
> answered and (b) the collaboration-service Wave-2 `rabbitmq` adapter freezes the
> unified wire contract (collab tasks.md T005.1). See spec.md ⚠️. T004 (authZ-eval
> verification, read-only) and the OPEN grounding are the exceptions — already done
> as investigation in this spec.

## Format: `[ID] [P?] [Phase] (epic-task) Description`
- **[P]**: parallelizable (different files, no ordering dependency).
- Paths relative to `/Users/antst/work/alkemio/server`.

---

## Phase 1 — Metadata/index persistence (epic T001/T002) — ⛔ blocked on OPEN-3 + collab freeze

### S-T001 — Schema: `content_pointer` + `blob_store` columns (epic T001 → FR-001)
- [ ] **S-T001.1** [P] [P1] (FR-001) Add `contentPointer` (nullable varchar) +
  `blobStore` (nullable varchar enum) to `src/domain/common/memo/memo.entity.ts` and
  `src/domain/common/whiteboard/whiteboard.entity.ts`; update `IMemo`/`IWhiteboard`
  interfaces if surfaced. (data-model.md Entity changes.)
- [ ] **S-T001.2** [P1] (FR-001/FR-010) Generate + hand-edit the reversible
  migration `src/migrations/<ts>-AddContentPointerAndBlobStore.ts`: add 4 columns,
  back-fill existing rows (`content_pointer = id`, `blob_store = 'inline'`), `down()`
  drops them. (`pnpm run migration:generate`.)
- [ ] **S-T001.3** [P1] (FR-010 → SC-003) Migration snapshot test: up applies +
  back-fills, down reverts cleanly. Define the `BlobStoreKind` enum
  (`inline|file-service|s3|local`) in `src/common/enums/`.

### S-T002 — Unified `collaboration-save`/`collaboration-fetch` consumer (epic T001/T002)
- [ ] **S-T002.0** [P1] **(GATE)** Freeze the unified wire contract with the
  collab-service worker (patterns, payload, queue, direction) — resolves OPEN-3.
  Record the agreed shape here before writing handlers.
- [ ] **S-T002.1** [P1] (FR-002/FR-011) Add the collaboration queue to
  `src/common/enums/messaging.queue.ts` and connect it in `src/main.ts`
  (`connectMicroservice`), reusing/renaming `collaboration-document-service` per the
  agreed contract.
- [ ] **S-T002.2** [P1] (FR-002/FR-003/FR-004/FR-005) Implement the unified
  `@MessagePattern` handlers (`collaboration-save`, `collaboration-fetch`) in a
  unified collaboration-integration controller/service (merge/rename
  `collaborative-document-integration` + `whiteboard-integration`), routing by
  `contentType`:
  - save (FR-003): upsert index row (version++, FR-004); if `blobStore == 'inline'`
    write the content column from `snapshotBase64`, else store metadata + pointer
    only and do **not** write the inline blob.
  - fetch (FR-005): return `{id, contentType, version, contentPointer, blobStore,
    authorizationPolicyId, snapshotBase64?}`; `not_found`/`internal_error`
    structured replies (no exception leaks, FR-004); preserve manual-ack (FR-011).
- [ ] **S-T002.3** [P1] (FR-003) Reuse `MemoService.saveContent`/`fetch` and
  `WhiteboardService.updateWhiteboardContent`/`fetch` under the hood for the inline
  path; add the index-only path for offloaded blobs.
- [ ] **S-T002.4** [P1] (FR-002/FR-003/FR-005 → SC-001/SC-002) Tests: inline memo +
  inline whiteboard round-trip (byte-identical, version bumped, SC-001); offloaded
  save writes index only (DB assertion, SC-002); `fetch` carries
  `authorizationPolicyId`.
- [ ] **S-T002.5** [P1] (FR-002) Plan the **legacy-dialect retirement** at cutover (remove
  `collaboration-document-{save,fetch}` + whiteboard `save`/`fetch` once the unified
  contract is live; keep `info`/`who`/`contribution` per OPEN-1/OPEN-4 follow-up).
  Document, do not delete yet (cutover is WS-E).

---

## Phase 2 — Lifecycle events + authZ verification (epic T003/T004)

### S-T003 — `document.deleted` lifecycle emitter (epic T003 → FR-006/FR-007/FR-011)
- [ ] **S-T003.1** [P2] (FR-006/FR-011) Add a `COLLABORATION_SERVICE` provider token
  (`src/common/constants/providers.ts`), a `MessagingQueue` entry, and register the
  outbound client in `src/core/microservices/microservices.module.ts` via
  `clientProxyFactory(MessagingQueue.COLLABORATION_SERVICE)`.
- [ ] **S-T003.2** [P2] (FR-006) Emit `document.deleted { id }` (fire-and-forget
  `emit`) inside `MemoService.deleteMemo` (`memo.service.ts:105`) and
  `WhiteboardService.deleteWhiteboard` (`whiteboard.service.ts:159`) — at the
  cascade leaf so every path (framing/contribution/direct) emits exactly once
  (DEC-4; contracts/lifecycle-events.md).
- [ ] **S-T003.3** [P] [P2] (FR-007) *(optional)* Emit `document.created { id,
  contentType, ownerRef }` on memo/whiteboard creation and `document.access_changed
  { id }` when the entity's authorization is recomputed.
- [ ] **S-T003.4** [P2] (FR-006 → SC-004) Tests: a `ClientProxy` spy asserts
  `emit('document.deleted', {id})` fires exactly once on delete (via direct delete
  and via parent contribution/framing delete), and **not** on a failed delete.

### S-T004 — AuthZ-eval verification + policy-id surfacing (epic T004 → FR-005/FR-008)
- [ ] **S-T004.1** [P2] (FR-008) **(read-only investigation — DONE as spec
  grounding)** Confirm: `authorizationPolicyId` = `Memo`/`Whiteboard`
  `authorizationId` (`AuthorizationPolicy.id`); read = `read`, collaborate =
  `update-content`; the separate auth-eval-service reads the policy row from server's
  DB (CS-3/CS-4, OPEN-1). **Result: the collab `authzeval` adapter assumption is
  CORRECT.**
- [ ] **S-T004.2** [P2] (FR-005) Ensure the unified `fetch` reply carries
  `authorizationPolicyId` — covered by S-T002.2; add an explicit assertion.
- [ ] **S-T004.3** [P2] (FR-008 → SC-005) Parity verification test: for a
  memo/whiteboard with policy id `P` and actor `A`, assert the auth-eval-service
  decision for `{A, "read", P}` and `{A, "update-content", P}` matches server's
  in-process `AuthorizationService.isAccessGranted(actorCtx, entity.authorization,
  READ | UPDATE_CONTENT)`. (May live as a cross-service integration test.)
- [ ] **S-T004.4** [P2] (FR-008) Resolve the OPEN-1 residual with antst: confirm the
  **entity's own** policy id is sufficient (no stale-vs-parent scenario).

---

## Phase 3 — Migration read access + finalization (epic T005/T006)

### S-T005 — Legacy content read for the one-time migration (epic T005 → FR-009)
- [ ] **S-T005.1** [P3] (FR-009) Implement a dedicated one-pass read path (NestJS
  standalone CLI command, or a guarded internal read) iterating `Memo` +
  `Whiteboard` repos, yielding `{id, contentType, content, authorizationPolicyId}` —
  memo `content` as v2 base64 (`Memo.content.toString('base64')`), whiteboard
  `content` as decompressed Excalidraw JSON (`@AfterLoad` already decompresses)
  (DEC-6).
- [ ] **S-T005.2** [P3] (FR-009) Handle edge cases: memo with NULL `content` →
  seed/empty record (not a failure); whiteboard decompression failure → flagged for
  review, not dropped (spec Edge Cases).
- [ ] **S-T005.3** [P3] (FR-009 → SC-006) Test: the read returns **100%** of
  persisted memos + whiteboards with content + policy id, iterable without gaps.
- [ ] **S-T005.4** [P3] (FR-009) Confirm the runner location (server CLI vs separate
  migration runner) + the cutover write-freeze responsibility with the WS-E owner
  (OPEN-4).

### S-T006 — Migrations, codegen, coverage (epic T006 → FR-010)
- [ ] **S-T006.1** [P3] (FR-010) Finalize all TypeORM migrations (idempotent,
  reversible, snapshot-tested) and any codegen (note: server uses TypeORM, not sqlc
  — the epic's "sqlc regen" applies to the Go collab service, **not** server;
  server's equivalent is `migration:generate` + `migration:validate`).
- [ ] **S-T006.2** [P3] (FR-010 → SC-007) Bring the touched collaboration-persistence
  diff to **≥95%** coverage (DEC-7); `pnpm run lint` clean; flag to antst whether the
  gate is CI-enforced repo-wide or scoped to the diff.

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
| 1 (persistence) | T001, T002 | S-T001, S-T002 | 8 | Blocked (OPEN-3 + collab freeze) |
| 2 (lifecycle + authZ) | T003, T004 | S-T003, S-T004 | 8 | Forward (S-T004.1 done as grounding) |
| 3 (migration + finalize) | T005, T006 | S-T005, S-T006 | 6 | Forward |
| **Total** | 6 | 6 | 22 | spec/design complete; impl gated |

## Notes

- The epic's `tasks/server.md` T006 says "sqlc regen" — that is a **Go**-ism; **server
  is TypeScript/TypeORM**, so the equivalent is `migration:generate`/`validate`.
  Flagged so the implementer does not chase a non-existent sqlc setup in server.
- The naive reading of epic T001/T002 ("repoint save/fetch to the unified service")
  is **inverted by CS-1**: server is the *responder*, so the work is to host the
  *new unified handlers* and have the collab service call them — not to repoint a
  server-side client. Captured in DEC-3 / OPEN-3.

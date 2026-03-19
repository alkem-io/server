# Tasks: Authorization Reset Performance Optimization

**Input**: Design documents from `/specs/042-auth-reset-optimization/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/batch-payload.md, quickstart.md

**Tests**: Not explicitly requested — omitted per spec. Add test tasks if TDD approach is desired.

**Organization**: Tasks grouped by user story (5 stories). Stories 2, 3, 4 are fully independent. Story 5 depends on Story 1.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)

---

## Phase 1: Setup (Configuration)

**Purpose**: Add batch size configuration required by Story 1

- [X] T001 [P] Add `batch_size: ${AUTHORIZATION_BATCH_SIZE}:50` to authorization section in `alkemio.yml`
- [X] T002 [P] Add `batch_size: number` to the authorization config type in `src/types/alkemio.config.ts`

---

## Phase 2: Foundational (Payload Interface)

**Purpose**: Extend the shared message payload interface. MUST complete before Story 1 and Story 5.

- [X] T003 Add optional `ids?: string[]` field to `AuthResetEventPayload` in `src/services/auth-reset/auth-reset.payload.interface.ts`

**Checkpoint**: Configuration and interface ready — user story implementation can begin.

---

## Phase 3: User Story 1 — Batch Authorization Reset Messaging (Priority: P1) 🎯 MVP

**Goal**: Consolidate per-entity RabbitMQ messages into batch messages (default 50 IDs per message), reducing ~4,400 messages to ~90.

**Independent Test**: Trigger `publishAuthorizationResetAllUsers()` and verify message count equals `ceil(totalUsers / batchSize)`. Handler must produce identical authorization policy state.

**Depends on**: Phase 1 (config), Phase 2 (payload interface)

### Implementation for User Story 1

- [X] T004 [US1] Implement batch chunking in all `publishAuthorizationResetAll*` and `publishLicenseResetAll*` methods in `src/services/auth-reset/publisher/auth-reset.service.ts` — read `authorization.batch_size` from config, chunk entity ID arrays, emit one message per chunk with `ids: batch` and `id: batch[0]`
- [X] T005 [US1] Modify all subscriber handler methods to resolve `payload.ids ?? [payload.id]` and iterate with per-entity try/catch, in-process retry (up to 5), and error logging in `src/services/auth-reset/subscriber/auth-reset.controller.ts`

**Checkpoint**: Full auth reset emits batched messages. Handler processes batches with per-entity error isolation. Policy state is identical to pre-optimization.

---

## Phase 4: User Story 2 — Split Deep Nested Profile Query (Priority: P2)

**Goal**: Replace the single deep LEFT JOIN (profile → references → tagsets → visuals → storageBucket → documents → document.tagset, all with authorization) with 3 focused queries to eliminate cartesian product explosion.

**Independent Test**: Reset authorization on a profile with many child entities and verify all authorization policies match the single-query outcome.

**Depends on**: None (independent of other stories)

### Implementation for User Story 2

- [X] T006 [US2] Split the single deep-join `getProfileOrFail()` call into 3 focused queries in `applyAuthorizationPolicy()` method in `src/domain/common/profile/profile.service.authorization.ts`: (1) profile + authorization, (2) references + tagsets + visuals with authorization, (3) storageBucket + documents + document.tagset with authorization — skip queries for empty relation types

**Checkpoint**: Profile authorization loading uses separate queries. No cartesian product. Policy state identical.

---

## Phase 5: User Story 3 — Add Missing Database Indexes (Priority: P3)

**Goal**: Add indexes on `visual.mediaGalleryId` and `document.tagsetId` FK columns to eliminate sequential scans during auth reset cascade.

**Independent Test**: Run `EXPLAIN ANALYZE` on queries filtering by these columns before/after migration — verify index scans replace sequential scans.

**Depends on**: None (independent of other stories)

### Implementation for User Story 3

- [X] T007 [P] [US3] Add `@Index('IDX_visual_mediaGalleryId', ['mediaGallery'])` decorator to entity class in `src/domain/common/visual/visual.entity.ts`
- [X] T008 [P] [US3] Add `@Index('IDX_document_tagsetId', ['tagset'])` decorator to entity class in `src/domain/storage/document/document.entity.ts`
- [X] T009 [US3] Generate migration via `pnpm run migration:generate -n AddIndexVisualMediaGalleryIdDocumentTagsetId` in `src/migrations/`, verify UP creates both indexes and DOWN drops them

**Checkpoint**: Migration applied. Both FK columns use index scans. Reversible.

---

## Phase 6: User Story 4 — Eliminate Redundant saveAll() Cascades (Priority: P4)

**Goal**: Remove intermediate `saveAll()` calls from document and storage-bucket authorization services so policies are persisted once at the top-level handler.

**Independent Test**: Reset authorization on a user and verify `saveAll()` is called once (at controller level), not at intermediate cascade levels. Policy state identical.

**Depends on**: None (independent of other stories)

### Implementation for User Story 4

- [X] T010 [P] [US4] Remove `saveAll()` call (line ~47) from `applyAuthorizationPolicy()` in `src/domain/storage/document/document.service.authorization.ts` — return collected `updatedAuthorizations` instead of persisting internally and returning `[]`
- [X] T011 [P] [US4] Remove `saveAll()` call (line ~60) from `applyAuthorizationPolicy()` in `src/domain/storage/storage-bucket/storage.bucket.service.authorization.ts` — return collected `updatedAuthorizations` instead of persisting internally and returning `[]`

**Checkpoint**: No intermediate `saveAll()` calls. Top-level handler persists all policies in one batch. Policy state identical.

---

## Phase 7: User Story 5 — Bulk UPDATE for Authorization Policies (Priority: P5)

**Goal**: Add a `bulkUpdate()` method that uses TypeORM QueryBuilder CASE-based UPDATE to persist authorization policies in a single SQL statement per batch, replacing per-entity UPSERTs.

**Independent Test**: Reset authorization for a batch of 50 users and verify the number of UPDATE statements is proportional to batch count, not individual policy count.

**Depends on**: Story 1 (Phase 3) — requires batching infrastructure

### Implementation for User Story 5

- [X] T012 [US5] Add `bulkUpdate(policies: IAuthorizationPolicy[]): Promise<void>` method to `src/domain/common/authorization-policy/authorization.policy.service.ts` — use TypeORM QueryBuilder `UPDATE authorization_policy SET credentialRules = CASE id WHEN ... END, privilegeRules = CASE id WHEN ... END WHERE id IN (...)`, fall back to chunked `save()` for errors
- [X] T013 [US5] Integrate `bulkUpdate()` into batch handler in `src/services/auth-reset/subscriber/auth-reset.controller.ts` — call `bulkUpdate()` instead of `saveAll()` when processing batch payloads

**Checkpoint**: Batch auth reset uses bulk UPDATE. Fewer DB statements. Policy state identical.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: End-to-end validation and backward compatibility verification

- [ ] T014 Run full auth reset cycle per quickstart.md — verify message count reduction (~95%), wall-clock improvement (≥60%), identical policy state (SC-005), and that peak heap memory during profile authorization loading does not exceed the pre-optimization baseline (SC-004, compare via `process.memoryUsage().heapUsed` snapshots before/after the split query change)
- [ ] T015 Verify backward compatibility during simulated rolling deploy — old-format messages (single `id`) handled correctly by new subscriber
- [ ] T016 Verify batch handler idempotency (FR-009) — trigger authorization reset for a batch of users, then immediately trigger the same batch again. Verify that all authorization policies are identical after both runs and no duplicate side effects (e.g., no extra DB writes beyond the expected reset updates)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: No dependencies — can run in parallel with Phase 1
- **Story 1 (Phase 3)**: Depends on Phase 1 + Phase 2
- **Story 2 (Phase 4)**: Independent — can start after Phase 2 or in parallel
- **Story 3 (Phase 5)**: Fully independent — can start immediately
- **Story 4 (Phase 6)**: Fully independent — can start immediately
- **Story 5 (Phase 7)**: Depends on Story 1 (Phase 3) completion
- **Polish (Phase 8)**: Depends on all stories being complete

### User Story Dependencies

```
Story 3 (Indexes)     ─── fully independent, start anytime
Story 4 (saveAll)     ─── fully independent, start anytime
Story 2 (Split Query) ─── fully independent, start anytime
Story 1 (Batching)    ─── depends on Phase 1 + 2
Story 5 (Bulk UPDATE) ─── depends on Story 1
```

### Recommended Sequence (single developer)

Low risk → high risk: **3 → 4 → 2 → 1 → 5**

### Parallel Opportunities

```bash
# Phase 1 — both config tasks in parallel:
Task T001: alkemio.yml config
Task T002: TypeScript config type

# Phase 5 (Story 3) — entity decorators in parallel:
Task T007: visual entity index decorator
Task T008: document entity index decorator

# Phase 6 (Story 4) — service refactors in parallel:
Task T010: document authorization service
Task T011: storage-bucket authorization service

# Independent stories in parallel (multi-developer):
Story 3 (T007-T009) || Story 4 (T010-T011) || Story 2 (T006)
```

---

## Implementation Strategy

### MVP First (Story 1 Only)

1. Complete Phase 1: Setup (T001-T002)
2. Complete Phase 2: Foundational (T003)
3. Complete Phase 3: Story 1 — Batch Messaging (T004-T005)
4. **STOP and VALIDATE**: Trigger full auth reset, verify ~95% message reduction
5. Deploy if ready — this alone delivers the largest performance gain

### Incremental Delivery

1. Stories 3 + 4 → Low-risk database/service improvements → Deploy
2. Story 2 → Split query for profiles → Deploy
3. Story 1 → Batch messaging (biggest impact) → Deploy (MVP!)
4. Story 5 → Bulk UPDATE (requires Story 1) → Deploy
5. Each story adds performance value independently

### Parallel Team Strategy

With multiple developers after Phase 1+2 complete:
- **Developer A**: Story 1 (Batch Messaging) → Story 5 (Bulk UPDATE)
- **Developer B**: Story 3 (Indexes) → Story 4 (saveAll) → Story 2 (Split Query)

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks
- [Story] label maps task to specific user story for traceability
- Each story is independently deployable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Total: 16 tasks across 5 stories + setup + polish

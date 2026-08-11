# Tasks: Opening a Collabora document waits ~8 s on analytics

**Input**: Design documents from `specs/110-collabora-editor-url-latency/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md — all present

**Tests**: Included. The spec requires them (SC-002 and SC-005 are both verified by test, and each user story defines an independent test), so they are not optional here.

**Organization**: Grouped by user story. US1 and US2 are both P1 and both independently shippable; US1 alone fixes the reported defect, which makes it the MVP.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel — different files, no dependency on an incomplete task
- **[Story]**: US1, US2, US3 as numbered in spec.md
- Paths are repository-relative from the worktree root

## The four sites

Referenced throughout. Site numbering matches spec.md and contracts/.

| Site | File | Method | Reporter call |
|---|---|---|---|
| 1 | `src/domain/collaboration/collabora-document/collabora.document.resolver.queries.ts` | `collaboraEditorUrl` | `collaboraDocumentOpened` |
| 2 | `src/domain/collaboration/collabora-document/collabora.document.resolver.mutations.ts` | `replaceCollaboraDocument` | `calloutCollaboraDocumentReplaced` |
| 3 | `src/domain/collaboration/callout/callout.resolver.mutations.ts` | `importCollaboraDocument` | `calloutCollaboraDocumentUploaded` |
| 4 | `src/services/collaborative-document-integration/collaborative-document-integration.service.ts` | contribution event consumer | inline `report(...)` |

**Site 4 keeps its `await`.** Its message is acknowledged only when the handler returns, so detaching would acknowledge before the work finished and lose the event on failure with no redelivery. It receives the cheaper lookup and nothing else — and T017 pins that with a test, because the other three sites will read as an argument for consistency to whoever comes next.

---

## Phase 1: Setup

**Purpose**: Establish a known-good baseline before changing anything. The worktree and its `.env` files already exist.

- [ ] T001 Run `pnpm lint` and `pnpm vitest run` from the worktree root and record that both are green, so any later failure is attributable to this work
- [ ] T002 Record the current mock setup for `getCommunityForCollaboraDocumentOrFail` and `getLevelZeroSpaceIdForCommunity` in `src/domain/collaboration/collabora-document/collabora.document.resolver.queries.spec.ts`, `src/domain/collaboration/collabora-document/collabora.document.resolver.mutations.spec.ts`, `src/domain/collaboration/callout/callout.resolver.mutations.spec.ts` and `src/services/collaborative-document-integration/collaborative-document-integration.service.spec.ts`, so no existing assertion is silently dropped when the mocks are repointed in US2

---

## Phase 2: Foundational

**No foundational work is required.** Nothing must land before the user stories can start: no new module, no migration, no shared entity, no framework change. Inventing a phase here would be ceremony, so this phase is deliberately empty.

The only cross-story coupling is that US1 and US2 edit the same three resolver files. That is a sequencing note, handled in Dependencies below — not a blocking prerequisite.

---

## Phase 3: User Story 1 — Opening a document is not delayed by analytics (P1) 🎯 MVP

**Goal**: The three user-facing paths return as soon as their real work is done. Analytics runs afterwards, on its own time, and can neither delay a response nor take the process down when it fails.

**Independent test**: Two stubs per site. A never-settling analytics promise — the resolver still returns. A rejecting one — the response is unaffected and nothing escapes as an unhandled rejection.

**Delivers on its own**: yes. This alone removes the ~7.95 s the user waits, even before the query gets cheaper.

### Tests (write first — the never-settling case fails by timing out)

- [ ] T003 [P] [US1] In `src/domain/collaboration/collabora-document/collabora.document.resolver.queries.spec.ts`, add two tests for `collaboraEditorUrl`: one asserting it resolves while analytics is stubbed with a never-settling promise, one asserting it resolves unaffected when analytics is stubbed to reject and that the rejection does not escape
- [ ] T004 [P] [US1] Add the same pair for `replaceCollaboraDocument` in `src/domain/collaboration/collabora-document/collabora.document.resolver.mutations.spec.ts`
- [ ] T005 [P] [US1] Add the same pair for `importCollaboraDocument` in `src/domain/collaboration/callout/callout.resolver.mutations.spec.ts`
- [ ] T006 [US1] Run the six new tests in `src/domain/collaboration/collabora-document/collabora.document.resolver.queries.spec.ts`, `src/domain/collaboration/collabora-document/collabora.document.resolver.mutations.spec.ts` and `src/domain/collaboration/callout/callout.resolver.mutations.spec.ts` against the current code and confirm each fails — the never-settling ones by timing out. A passing test here would mean it cannot detect the defect

### Implementation

- [ ] T007 [P] [US1] In `src/domain/collaboration/collabora-document/collabora.document.resolver.queries.ts`, move the analytics block of `collaboraEditorUrl` into a private async method that owns the existing `try`/`catch` and `logger.error`, and invoke it with `void` immediately before the return. The `try`/`catch` must sit inside the method, not around the call, so a rejection is structurally impossible rather than conventionally avoided
- [ ] T008 [P] [US1] Apply the same extraction to `replaceCollaboraDocument` in `src/domain/collaboration/collabora-document/collabora.document.resolver.mutations.ts`
- [ ] T009 [P] [US1] Apply the same extraction to `importCollaboraDocument` in `src/domain/collaboration/callout/callout.resolver.mutations.ts`
- [ ] T010 [US1] Verify `src/services/collaborative-document-integration/collaborative-document-integration.service.ts` is untouched by this phase — site 4 must still await its analytics

**Checkpoint**: T003–T005 pass. Users stop waiting, and a failing analytics call can no longer take the process with it. The expensive query still runs, in the background, which is what US2 removes.

---

## Phase 4: User Story 2 — Attributing a document to its space is cheap (P1)

**Goal**: Every path that reports a Collabora analytics event resolves the owning level-zero space through indexed lookups instead of a join across the callout graph. The expensive method is deleted.

**Independent test**: Call the new lookup for a framing-hosted document and a contribution-hosted document and assert the correct id; assert `EntityNotFoundException` when the document has no owning callout.

**Delivers on its own**: yes — it removes the cost platform-wide, including from the background consumer, independently of whether US1 has landed.

### Tests

- [ ] T011 [US2] Add tests to `src/services/infrastructure/entity-resolver/community.resolver.service.spec.ts` covering the three real branches of the new lookup: contribution-hosted document, framing-hosted document, and no owning callout raising `EntityNotFoundException`. This is net-new coverage — the method being replaced has none. Do not add a both-attachments case; the domain forbids that state and a test for it would be coverage padding

### Implementation

- [ ] T012 [US2] Add `getLevelZeroSpaceIdForCollaboraDocument(collaboraDocumentID: string): Promise<string>` to `src/services/infrastructure/entity-resolver/community.resolver.service.ts`, resolving the owning callout's `calloutsSetId` from the document's unique-indexed foreign key and then delegating to the existing `getLevelZeroSpaceIdForCalloutsSet`. Probe the contribution path first. Put the document id in the `EntityNotFoundException` `details`, never in the message. Include the inline comment the constitution requires of performance-sensitive queries, explaining why the traversal starts at the leaf — without naming any spec, feature, or issue identifier. The task is not done without that comment
- [ ] T013 [P] [US2] Migrate site 1 in `src/domain/collaboration/collabora-document/collabora.document.resolver.queries.ts` to the single new call, leaving the surrounding `try`/`catch` and `logger.error` exactly as they are
- [ ] T014 [P] [US2] Migrate site 2 in `src/domain/collaboration/collabora-document/collabora.document.resolver.mutations.ts` the same way
- [ ] T015 [P] [US2] Migrate site 3 in `src/domain/collaboration/callout/callout.resolver.mutations.ts` the same way
- [ ] T016 [P] [US2] Migrate site 4 in `src/services/collaborative-document-integration/collaborative-document-integration.service.ts` to the new lookup, keeping the `await` in place
- [ ] T017 [US2] Add a test to `src/services/collaborative-document-integration/collaborative-document-integration.service.spec.ts` asserting the analytics report completes before the handler's promise resolves, so a later refactor cannot quietly detach site 4 and start acknowledging messages before their work is done
- [ ] T018 [US2] Repoint the mocks recorded in T002 to the new method in `src/domain/collaboration/collabora-document/collabora.document.resolver.queries.spec.ts`, `src/domain/collaboration/collabora-document/collabora.document.resolver.mutations.spec.ts`, `src/domain/collaboration/callout/callout.resolver.mutations.spec.ts` and `src/services/collaborative-document-integration/collaborative-document-integration.service.spec.ts`, preserving every existing assertion — including the `toHaveBeenCalledWith({ id, name, space }, actorContext)` reporter assertions that satisfy SC-005
- [ ] T019 [US2] Delete `getCommunityForCollaboraDocumentOrFail` from `src/services/infrastructure/entity-resolver/community.resolver.service.ts`. Leave `getLevelZeroSpaceIdForCommunity` in place — room events, whiteboard integration and community service still call it

**Checkpoint**: the expensive query no longer exists anywhere in the codebase.

---

## Phase 5: User Story 3 — The document row is read once (P3)

**Goal**: `collaboraEditorUrl` loads the `CollaboraDocument` once instead of twice.

**Independent test**: Spy on the document fetch during one `collaboraEditorUrl` call; assert exactly one invocation.

**Delivers on its own**: yes, though it is worth ~7.4 ms — it is here because leaving a duplicate read in a hot path after a latency investigation is indefensible, not because it moves the number.

### Tests

- [ ] T020 [US3] Add a test to `src/domain/collaboration/collabora-document/collabora.document.resolver.queries.spec.ts` asserting `getCollaboraDocumentOrFail` is called exactly once per `collaboraEditorUrl` query

### Implementation

- [ ] T021 [US3] In `src/domain/collaboration/collabora-document/collabora.document.resolver.queries.ts`, load the `CollaboraDocument` once with both the `profile` and `document` relations
- [ ] T022 [US3] Change `getEditorUrl` in `src/domain/collaboration/collabora-document/collabora.document.service.ts` to take what the resolver already holds instead of re-fetching the row, keeping its `RelationshipNotFoundException` guard for a missing backing document
- [ ] T023 [US3] Update `src/domain/collaboration/collabora-document/collabora.document.service.spec.ts` for the new `getEditorUrl` signature

---

## Phase 6: Polish — pre-merge

**Everything in this phase must be complete before the PR merges.**

- [ ] T024 Run `pnpm lint` and `pnpm vitest run`; both clean. Confirm FR-010 at the same time: the diff contains no file under `src/migrations/`, no entity change, and no `schema.graphql` change
- [ ] T025 Verify SC-004 by running the two greps in `specs/110-collabora-editor-url-latency/quickstart.md` — no match for `getCommunityForCollaboraDocumentOrFail`, no Collabora call site still pairing `getLevelZeroSpaceIdForCommunity`
- [ ] T026 Confirm no comment added by this work contains a spec, feature, or issue identifier, and note in the PR description that code comments were touched
- [ ] T027 Fill the pre-merge rows (SC-002, SC-004, SC-005) of the results table in `specs/110-collabora-editor-url-latency/quickstart.md` with what actually happened, recording failures as failures rather than rewording the criterion
- [ ] T028 Write the PR description: domain impact, no schema change, no migration, the recorded Principle 4 deviation from `plan.md`, and a link to the wopi-service#29 investigation comment

---

## Phase 7: Post-deploy

**These cannot be completed before merge** — SC-001 and SC-003 are only observable against production data. They are tracked here so the work is not treated as finished when the PR lands.

- [ ] T029 After deploy, run the SC-001 and SC-003 checks in `specs/110-collabora-editor-url-latency/quickstart.md` against production APM and fill the remaining rows of its results table
- [ ] T030 Once SC-001 is confirmed, close `alkem-io/wopi-service#29` with a link to the merged PR

---

## Dependencies

```text
Phase 1 (Setup)
      │
      ├──────────────┬──────────────┐
      ▼              ▼              ▼
   US1 (P1)       US2 (P1)       US3 (P3)
   detach         cheap lookup   single fetch
      │              │              │
      └──────────────┴──────────────┘
                     ▼
         Phase 6 (pre-merge polish)
                     ▼
                  merge
                     ▼
         Phase 7 (post-deploy)
```

**Story independence**: all three are independently implementable and independently testable. None requires another to be correct.

**File-level coupling** (sequencing, not dependency): US1 and US2 both edit sites 1, 2 and 3; US1 and US3 both edit site 1. If run out of order or concurrently, expect conflicts in those files. Recommended order is US1 → US2 → US3, which is also priority order and puts the user-visible fix first.

**Within US1**: T003–T005 are parallel, then T006 gates, then T007–T009 are parallel.
**Within US2**: T011 → T012, then T013–T016 in parallel, then T017, then T018, then T019.
**Within US3**: strictly sequential — T020 → T021 → T022 → T023.

## Parallel execution examples

**US1 tests** — three different spec files, no shared state:

```text
T003  collabora.document.resolver.queries.spec.ts
T004  collabora.document.resolver.mutations.spec.ts
T005  callout.resolver.mutations.spec.ts
```

**US2 call-site migrations** — four different files, each a mechanical two-calls-to-one replacement, all depending only on T012:

```text
T013  collabora.document.resolver.queries.ts
T014  collabora.document.resolver.mutations.ts
T015  callout.resolver.mutations.ts
T016  collaborative-document-integration.service.ts
```

## Implementation strategy

**MVP is US1 alone.** Three extractions plus six tests. It fixes the reported defect completely from the user's point of view, and it reverts in one commit. If anything about the lookup replacement turns out to be harder than the research suggests, US1 can ship without it.

**US2 is what stops the platform paying for the mistake** — it removes the ~8 s query from the background consumer too, where no amount of detaching would have helped.

**US3 is opportunistic.** It is in scope because the resolver is already open, not because it matters on its own.

Ship as one PR if all three land cleanly. If US2 stalls, ship US1 first rather than holding the user-facing fix behind it.

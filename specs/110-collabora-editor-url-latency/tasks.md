---
description: "Implementation tasks for removing Collabora editor URL analytics latency"
---

# Tasks: Opening a Collabora document waits ~8 s on analytics

**Input**: Design documents from `specs/110-collabora-editor-url-latency/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/`, `quickstart.md`

**Tests**: Required by SC-002, SC-003, SC-005, SC-006, and the User Story 3 single-fetch acceptance scenario. Tests are written before their corresponding implementation tasks.

**Organization**: Tasks are grouped by user story. The leaf-first ownership lookup is shared foundation because both P1 stories depend on it: the lifecycle subscriber uses it for sites 1–3 and the direct RabbitMQ-backed background consumer uses it at site 4.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel in a different file after its stated prerequisites
- **[Story]**: Maps the task to US1, US2, or US3 from `spec.md`
- All paths are repository-relative

## Runtime flow map

| Site | Final flow | Preserved analytics contract |
|---|---|---|
| 1 — editor URL | `collaboraEditorUrl` calls `CollaboraDocumentEventsService.publishOpened` | subscriber calls `collaboraDocumentOpened` |
| 2 — replacement | replace mutation calls `CollaboraDocumentEventsService.publishReplaced` | subscriber calls `calloutCollaboraDocumentReplaced` |
| 3 — import | `importCollaboraDocument` calls `CollaboraDocumentEventsService.publishUploaded` | subscriber calls `calloutCollaboraDocumentUploaded` |
| 4 — window events | existing RabbitMQ consumer remains direct and awaited | existing contribution/view aggregate reporter and full payload stay unchanged |

Sites 1–3 use synchronous in-process `EventEmitter2.emit`; no RabbitMQ route, outbox, retry, or durable lifecycle delivery is added. Site 4 already receives cross-process events through RabbitMQ and does not republish them as lifecycle events. Its controller acknowledges before invoking the service, so these tasks make no deferred-acknowledgement or redelivery claim.

---

## Phase 1: Setup and source-state baseline

**Purpose**: Establish the executable baseline and reconcile the two possible starting trees: this feature branch may predate PR #6354, or Release 71 suppression may already be present.

- [X] T001 Run the `pnpm lint` and `pnpm vitest run` scripts from `package.json`; record outcomes and whether PR #6354's commented blocks, site-4 early return, and disabled assertions are present in `specs/110-collabora-editor-url-latency/quickstart.md`
- [X] T002 Inventory the executable pre-hotfix reporter contracts and every hotfix-suppressed assertion in `src/domain/collaboration/collabora-document/collabora.document.resolver.queries.spec.ts`, `src/domain/collaboration/collabora-document/collabora.document.resolver.mutations.spec.ts`, `src/domain/collaboration/callout/callout.resolver.mutations.spec.ts`, and `src/services/collaborative-document-integration/collaborative-document-integration.service.spec.ts`; record the baseline in `specs/110-collabora-editor-url-latency/quickstart.md`

**Checkpoint**: The implementation starting state and the five analytics record contracts to restore are explicit.

---

## Phase 2: Foundational leaf-first ownership lookup

**Purpose**: Provide the bounded lookup required by the US1 lifecycle subscriber and the US2 direct background consumer before either analytics path is migrated.

**⚠️ CRITICAL**: Write and fail T003–T005 before implementing T006. Do not introduce the subscriber against `getCommunityForCollaboraDocumentOrFail` even temporarily.

- [X] T003 Add failing contribution-hosted, framing-hosted, unattached-document, and downstream-space-not-found cases for `getLevelZeroSpaceIdForCollaboraDocument` in `src/services/infrastructure/entity-resolver/community.resolver.service.spec.ts`
- [X] T004 Extend `src/services/infrastructure/entity-resolver/community.resolver.service.spec.ts` with failing query-shape and statement-count assertions: contribution first, each probe anchored on `collaboraDocumentId`, two statements on contribution, at most three on framing fallback, and no space-first relation-tree query
- [X] T005 Extend `src/services/infrastructure/entity-resolver/community.resolver.service.spec.ts` with failing exception assertions proving both not-found routes expose `EntityNotFoundException` with the exact static message `Unable to find Space for CollaboraDocument` and place `collaboraDocumentId` plus any resolved `calloutsSetId` in `details`
- [X] T006 Implement `getLevelZeroSpaceIdForCollaboraDocument(collaboraDocumentID)` in `src/services/infrastructure/entity-resolver/community.resolver.service.ts` using a contribution-first raw scalar query, a framing fallback, and delegation to `getLevelZeroSpaceIdForCalloutsSet`; translate delegated failures to the exact static message `Unable to find Space for CollaboraDocument` and add the constitution-required leaf-first performance comment without spec, PR, or issue identifiers

**Checkpoint**: The new lookup satisfies the internal contract and can be used without issuing the 7,917 ms space-first query.

---

## Phase 3: User Story 1 — opening and equivalent user operations do not wait for analytics (Priority: P1) 🎯

**Goal**: Sites 1–3 synchronously publish typed Collabora lifecycle events after successful primary work; a singleton subscriber performs lookup and reporting independently of the response and exposes reliable lookup timing.

**Independent Test**: Resolve `collaboraEditorUrl` with the real domain publisher and an in-process listener that returns a never-settling promise. The query still returns the editor URL, publishes exactly one typed `CollaboraDocumentOpened`, and never waits for analytics. Publisher and subscriber specs separately prove the immutable minimal actor snapshot, all three reporter mappings, structured timing, and contained failure behavior.

### Tests for User Story 1

> **Write these tests first and confirm their new assertions fail before implementation.**

- [X] T007 [P] [US1] Create `src/domain/collaboration/collabora-document/events/collabora.document.events.service.spec.ts` with a real `EventEmitter2`: cover `publishOpened`, `publishReplaced`, and `publishUploaded`; prove immediate `undefined` return with a never-settling listener; spy that `emit` is used and `emitAsync` is not; and assert a fresh frozen event containing a fresh frozen exact `{ actorID, isAnonymous, guestName }` snapshot that excludes credentials/session/delegation fields and survives mutation of the input `ActorContext`
- [X] T008 [P] [US1] Create `src/domain/collaboration/collabora-document/events/collabora.document.analytics.event.handler.spec.ts` covering opened→`collaboraDocumentOpened`, replaced→`calloutCollaboraDocumentReplaced`, and uploaded→`calloutCollaboraDocumentUploaded`; assert one lookup, exact `{ id, name, space }` plus unchanged minimal attribution, contained lookup and synchronous reporter failures, and exactly one structured INFO timing record on both success and failure with stable message, event constant, document id, outcome, and non-negative numeric `durationMs` fields without any APM transaction mock
- [X] T009 [P] [US1] Replace inline-reporter expectations with failing domain-publication coverage in `src/domain/collaboration/collabora-document/collabora.document.resolver.queries.spec.ts`: use the real publisher plus a pending listener for the non-blocking open test, assert exact document values/live authorized context, exactly one publication, and no publication when authorization or editor-URL resolution fails
- [X] T010 [P] [US1] Restore any hotfix-commented replacement assertion and add failing `publishReplaced` coverage in `src/domain/collaboration/collabora-document/collabora.document.resolver.mutations.spec.ts`: assert exactly one call with the preserved document id/display name and the same live authorized context; prove it occurs only after replacement persistence and any optional rename attempt complete; prove authorization or replacement failure emits nothing; and prove a caught optional-rename failure still publishes the successful replacement with the preserved post-swap values
- [X] T011 [P] [US1] Restore any hotfix-skipped upload assertion and add failing `publishUploaded` coverage in `src/domain/collaboration/callout/callout.resolver.mutations.spec.ts`: assert exactly one call with the persisted CollaboraDocument id/display name and the same live authorized context; prove it occurs only after contribution and authorization-policy persistence complete; and prove authorization, import, contribution-save, or authorization-policy-save failure emits nothing

### Event contract and handler implementation

- [X] T012 [US1] Add the three centralized names `collabora.document.opened`, `collabora.document.replaced`, and `collabora.document.uploaded`; the readonly `CollaboraDocumentActorAttribution`; and distinct frozen `CollaboraDocumentOpened`, `CollaboraDocumentReplaced`, and `CollaboraDocumentUploaded` event classes in `src/domain/collaboration/collabora-document/events/collabora.document.analytics.events.ts`
- [X] T013 [P] [US1] Implement `CollaboraDocumentEventsService` with void `publishOpened`, `publishReplaced`, and `publishUploaded` methods in `src/domain/collaboration/collabora-document/events/collabora.document.events.service.ts`; centrally copy exactly `actorID`, `isAnonymous`, and `guestName`, freeze the snapshot/envelope, call synchronous `EventEmitter2.emit`, discard its boolean result, and retain no reference to the input `ActorContext`
- [X] T014 [P] [US1] Implement singleton `CollaboraDocumentAnalyticsEventHandler` in `src/domain/collaboration/collabora-document/events/collabora.document.analytics.event.handler.ts` with one `@OnEvent` method per lifecycle constant and one shared async reporting path that uses `getLevelZeroSpaceIdForCollaboraDocument`, maps the reporter method, catches/logs every failure, and measures only the lookup with `performance.now()` from `node:perf_hooks`; on success and failure emit exactly one `logger.log` record under `LogContext.COLLABORATION` with message `Collabora document analytics space lookup completed`, `eventName`, `collaboraDocumentId`, `outcome`, and `durationMs`
- [X] T015 [US1] Register both providers and export only `CollaboraDocumentEventsService` from `src/domain/collaboration/collabora-document/collabora.document.module.ts`; reuse the existing `ContributionReporterModule` and `EntityResolverModule` imports and introduce no module cycle

### User-facing publisher integration

- [X] T016 [P] [US1] Inject `CollaboraDocumentEventsService` into `src/domain/collaboration/collabora-document/collabora.document.resolver.queries.ts`; after editor URL resolution call `publishOpened` exactly once with id, `profile.displayName ?? id`, and the live authorized context, without awaiting or performing ownership attribution inline
- [X] T017 [P] [US1] Inject `CollaboraDocumentEventsService` into `src/domain/collaboration/collabora-document/collabora.document.resolver.mutations.ts`; after swap and optional rename processing call `publishReplaced` exactly once with the preserved document values and live authorized context, replacing any inline or hotfix-commented analytics block
- [X] T018 [P] [US1] Inject the exported `CollaboraDocumentEventsService` into `src/domain/collaboration/callout/callout.resolver.mutations.ts`; after persistence and authorization-policy application call `publishUploaded` exactly once with the preserved document values and live authorized context, replacing any inline or hotfix-commented analytics block
- [X] T019 [US1] Remove only now-unused direct analytics/ownership imports and constructor injections from `src/domain/collaboration/collabora-document/collabora.document.resolver.queries.ts`, `src/domain/collaboration/collabora-document/collabora.document.resolver.mutations.ts`, and `src/domain/collaboration/callout/callout.resolver.mutations.ts`; retain Callout resolver dependencies used by unrelated operations and retain the Collabora module imports required by the handler
- [X] T020 [US1] Run the five US1 specs at `src/domain/collaboration/collabora-document/events/collabora.document.events.service.spec.ts`, `src/domain/collaboration/collabora-document/events/collabora.document.analytics.event.handler.spec.ts`, `src/domain/collaboration/collabora-document/collabora.document.resolver.queries.spec.ts`, `src/domain/collaboration/collabora-document/collabora.document.resolver.mutations.spec.ts`, and `src/domain/collaboration/callout/callout.resolver.mutations.spec.ts`; record the SC-002 outcome in `specs/110-collabora-editor-url-latency/quickstart.md`

**Checkpoint**: Sites 1–3 publish typed in-process events, never retain the full `ActorContext`, and cannot wait on attribution or reporting.

---

## Phase 4: User Story 2 — every Collabora analytics attribution is cheap (Priority: P1)

**Goal**: The lifecycle subscriber and site 4 use the leaf-first lookup; site 4's two aggregate analytics contracts are active and unchanged; the old wide lookup and all Collabora uses of the two-call pair are deleted.

**Independent Test**: Run the ownership lookup specs for contribution and framing documents and the site-4 contribution/view suites. The lookup returns the correct level-zero id within the bounded query contract, and both aggregate reporter calls preserve their complete pre-hotfix payloads.

### Tests for User Story 2

- [X] T021 [P] [US2] Restore any skipped `officeDocumentContributions` and `officeDocumentViews` suites and update `src/services/collaborative-document-integration/collaborative-document-integration.service.spec.ts` to fail until site 4 calls `getLevelZeroSpaceIdForCollaboraDocument` once while preserving the exact aggregate reporter methods, full `{ id, name, space, writeActors, readonlyActors, alkemio }` payloads, direct awaited completion order, and existing catch-and-log behavior

### Direct consumer migration and dead-code removal

- [X] T022 [US2] Migrate site 4 in `src/services/collaborative-document-integration/collaborative-document-integration.service.ts` to `getLevelZeroSpaceIdForCollaboraDocument`; if PR #6354 is present remove its early return and replace the suppressed body, keep the direct awaited flow, and do not add lifecycle-event publication or RabbitMQ acknowledgement/redelivery claims
- [X] T023 [US2] Delete `getCommunityForCollaboraDocumentOrFail` from `src/services/infrastructure/entity-resolver/community.resolver.service.ts` after T016–T018 and T022 have removed every caller; keep `getLevelZeroSpaceIdForCommunity` for unrelated consumers and remove obsolete old-pair mocks from `src/domain/collaboration/collabora-document/collabora.document.resolver.queries.spec.ts`, `src/domain/collaboration/collabora-document/collabora.document.resolver.mutations.spec.ts`, `src/domain/collaboration/callout/callout.resolver.mutations.spec.ts`, and `src/services/collaborative-document-integration/collaborative-document-integration.service.spec.ts`
- [X] T024 [US2] Use `rg` to prove no `getCommunityForCollaboraDocumentOrFail` symbol or Collabora two-call pair remains under `src/`, and that outside its definition in `src/services/infrastructure/entity-resolver/community.resolver.service.ts` and specs, `getLevelZeroSpaceIdForCollaboraDocument` is called only by `src/domain/collaboration/collabora-document/events/collabora.document.analytics.event.handler.ts` and `src/services/collaborative-document-integration/collaborative-document-integration.service.ts`; record SC-004 in `specs/110-collabora-editor-url-latency/quickstart.md`
- [X] T025 [US2] Run `src/services/infrastructure/entity-resolver/community.resolver.service.spec.ts`, `src/domain/collaboration/collabora-document/events/collabora.document.analytics.event.handler.spec.ts`, and `src/services/collaborative-document-integration/collaborative-document-integration.service.spec.ts`; record the query-contract part of SC-003 and the site-4 part of SC-005/SC-006 in `specs/110-collabora-editor-url-latency/quickstart.md`

**Checkpoint**: All four Collabora attribution paths are leaf-first, the old relation-tree method is gone, and open/replace/upload/contribution/view analytics are active through their intended contracts.

---

## Phase 5: User Story 3 — fetch the CollaboraDocument once (Priority: P3)

**Goal**: `collaboraEditorUrl` reuses its authorized `CollaboraDocument` for token issuance instead of loading the same row again.

**Independent Test**: Spy on `getCollaboraDocumentOrFail` during one `collaboraEditorUrl` request and assert exactly one call while the editor URL result and missing-backing-document exception behavior remain unchanged.

### Tests for User Story 3

- [X] T026 [P] [US3] Add a failing one-fetch assertion to `src/domain/collaboration/collabora-document/collabora.document.resolver.queries.spec.ts`, including the expected single relation load for both `profile` and `document` and the already-loaded document passed to `getEditorUrl`
- [X] T027 [P] [US3] Update `src/domain/collaboration/collabora-document/collabora.document.service.spec.ts` first for the new `getEditorUrl` input contract, WOPI token issuance from the supplied backing-document id, and the preserved static `RelationshipNotFoundException` when `document` is absent

### Single-fetch implementation

- [X] T028 [P] [US3] Change `src/domain/collaboration/collabora-document/collabora.document.resolver.queries.ts` to fetch `profile` and `document` in the one authorized load and pass that loaded `CollaboraDocument` to `getEditorUrl`
- [X] T029 [P] [US3] Change `getEditorUrl` in `src/domain/collaboration/collabora-document/collabora.document.service.ts` to accept the loaded document, remove its internal `getCollaboraDocumentOrFail`, and preserve token arguments, return shape, and missing-relationship exception details
- [X] T030 [US3] Run `src/domain/collaboration/collabora-document/collabora.document.resolver.queries.spec.ts` and `src/domain/collaboration/collabora-document/collabora.document.service.spec.ts`; verify the single-fetch acceptance scenario and record any failure in `specs/110-collabora-editor-url-latency/quickstart.md`

**Checkpoint**: The hot GraphQL path performs one CollaboraDocument read and still returns the same editor URL contract.

---

## Phase 6: Polish, pre-merge gates, deployment verification, and issue closure

**Purpose**: Reconcile all source states, prove the final tree, publish accurate review context, and execute the two distinct production acceptance/closure paths.

- [X] T031 Remove all remaining PR #6354 suppression residue from `src/domain/collaboration/collabora-document/`, `src/domain/collaboration/callout/callout.resolver.mutations.ts`, and `src/services/collaborative-document-integration/`: no commented analytics body/assertion, site-4 early return, temporary hotfix explanation, analytics-specific `it.skip`, or analytics-specific `describe.skip` may remain
- [X] T032 Execute every pre-merge command in `specs/110-collabora-editor-url-latency/quickstart.md` and fill actual outcomes for SC-002, the pre-merge part of SC-003, SC-004, SC-005, and SC-006; preserve the SC-003 production-evidence link in its results row and do not convert failures or zero evidence into passes
- [X] T033 Run `pnpm lint` and `pnpm vitest run` from `package.json`; inspect the final diff and record in `specs/110-collabora-editor-url-latency/quickstart.md` that no file under `src/migrations/`, entity mapping, `schema.graphql`, RabbitMQ configuration, or dependency manifest changed and that no new code comment contains a spec, feature, PR, or issue identifier
- [X] T034 Update https://github.com/alkem-io/server/pull/6350 using the final design in `specs/110-collabora-editor-url-latency/plan.md` and `specs/110-collabora-editor-url-latency/research.md`: replace private-detachment and deferred-ack claims with the typed publisher/subscriber flow and actual ack-before-service behavior; document domain impact, the minimal frozen actor snapshot, post-persistence write-outcome publication, structured timing log, leaf-first lookup, hotfix restoration, site-4 distinction, test evidence, split issue-closure ownership, and the mandatory declarations `Schema changes: none`, `Migrations: none`, and `Deprecations: none`; explicitly propose Constitution `2.0.0 → 3.0.0` as a MAJOR amendment, identify Principle 4 and new Architecture Standard 6 as impacted, and explain that the amendment makes committed-state event ordering safe and records the incident's leaf-first-query rule
- [ ] T035 After the proper-fix PR merges, close https://github.com/alkem-io/server/issues/6356 with the merged PR link and record the closure in `specs/110-collabora-editor-url-latency/quickstart.md`; do not wait for SC-001 or SC-003
- [ ] T036 [P] Observe SC-001 after deployment using the two `CollaboraEditorUrl` APM queries defined in `specs/110-collabora-editor-url-latency/quickstart.md`: use `event.outcome: success` for sample count and p95, use the separate all-outcomes query for every transaction above five seconds, and use all successful samples after seven days if traffic never reaches 100; record the complete result in `specs/110-collabora-editor-url-latency/evidence/sc-001-production.md`; leave SC-001 unverified and wopi-service#29 open when the successful count is zero; for any exclusion record a linked incident/change identifier, exact interval, excluded count, independent same-interval platform evidence, and success-only p95 before and after exclusion
- [ ] T037 [P] Observe SC-003 after deployment using the stable structured timing-log query in `specs/110-collabora-editor-url-latency/quickstart.md`; review the first 20 samples or all 1–19 available in seven days, record count/max/p95 by event/outcome in `specs/110-collabora-editor-url-latency/evidence/sc-003-production.md`, require every `durationMs` below 100 ms, and leave SC-003 unverified when the count is zero
- [ ] T038 After T036 passes, close https://github.com/alkem-io/wopi-service/issues/29 with the merged PR and production SC-001 evidence, and record the closure in `specs/110-collabora-editor-url-latency/evidence/sc-001-production.md`; SC-003 does not gate this closure

**Checkpoint**: All pre-merge criteria have evidence, production criteria remain honest about sample counts, server#6356 closes at merge, and wopi-service#29 closes only after the user-facing latency recovers.

---

## Dependencies and execution order

### Phase dependencies

- **Phase 1 — Setup**: Starts immediately.
- **Phase 2 — Foundation**: Depends on Phase 1 and blocks the lifecycle handler and site-4 migration.
- **Phase 3 — US1**: Depends on T006. T007–T011 are written first; T012–T015 establish the event boundary; T016–T018 migrate the three callers.
- **Phase 4 — US2**: T021 can be written after T006 and in parallel with US1. T022 depends on T006 and T021. T023 depends on T016–T018 and T022 because every old-method caller must be gone before deletion.
- **Phase 5 — US3**: Functionally independent after Phase 1, but starts after T020 because US1 and US3 edit and validate the same query resolver and spec.
- **Phase 6 — Gates and follow-up**: T031–T034 depend on all implementation phases. T035 depends on merge. T036 and T037 depend on deployment, update separate production-evidence files, and can run independently. T038 depends on a passing T036 only and does not wait for T037.

### Dependency graph

```text
T001 → T002
          │
          ▼
   T003 → T004 → T005 → T006
          │               │
          │               ├───────────────┐
          ▼               ▼               ▼
      T007–T020 (US1)  T021→T022 (US2)  T026–T030 (US3 after T020)
          │               │
          └───────┬───────┘
                  ▼
             T023→T024→T025
                  │
                  ▼
             T031→T032→T033→T034
                              │
                            merge
                              │
                     ┌────────┴────────┐
                     ▼                 ▼
                   T035             deploy
                                       │
                                  ┌────┴────┐
                                  ▼         ▼
                                T036      T037
                                  │
                                  ▼
                                T038
```

### User-story dependencies

- **US1 (P1)**: Independently proves that user-facing operations return without awaiting analytics once the shared lookup exists. Its three caller migrations also remove old-method consumers needed for US2 dead-code deletion.
- **US2 (P1)**: The lookup contract is shared foundation. Its site-4 implementation is independent of US1, but SC-004 completion waits for US1 to migrate sites 1–3 before the obsolete method can be deleted.
- **US3 (P3)**: Behaviorally independent, but sequenced after T020 to avoid conflicting edits and validation in the same query resolver/spec files.

---

## Parallel execution examples

### User Story 1

After T006, write the five independent spec files together:

```text
T007 publisher-service contract spec
T008 analytics-handler contract/timing spec
T009 editor-URL resolver publication spec
T010 replacement resolver publication spec
T011 import resolver publication spec
```

After T012, implement T013 and T014 in parallel. After T015, migrate the three distinct caller files with T016, T017, and T018 in parallel.

### User Story 2

T021 can proceed in the integration-service spec while US1 caller work is underway. After T006 and T021, T022 migrates the distinct site-4 source file; T023 waits until both site 4 and all three US1 callers have stopped using the old method.

### User Story 3

After T020, write T026 and T027 in parallel in the resolver and service spec files. Then implement T028 and T029 in parallel in their corresponding source files before the combined T030 check.

### Post-deploy

After deployment, T036 reads APM transaction data and writes `evidence/sc-001-production.md`, while T037 reads the structured application-log timing signal and writes `evidence/sc-003-production.md`. The observations and evidence writes can proceed in parallel because the files are distinct. Only a passing T036 gates T038, so SC-003 does not delay WOPI issue closure.

---

## Implementation strategy

### MVP scope

The safe MVP is **Phase 1 + Phase 2 + US1**, which removes analytics from the three user-response paths without ever wiring the new subscriber to the old wide query. In practice, ship **US1 and US2 together**: both are P1, US2 removes the database cost platform-wide, restores site-4 aggregates, and enables deletion of the defective lookup.

### Incremental delivery

1. Establish the baseline and implement the tested leaf-first lookup.
2. Add the typed publisher/subscriber boundary and migrate all three user-facing operations.
3. Restore and migrate site 4, then delete the old lookup and prove no two-call pair remains.
4. Remove the duplicate document fetch.
5. Run the full pre-merge quickstart and quality gates, then update PR #6350 with the actual design and evidence.
6. At merge close server#6356; after deployment evaluate SC-001 and SC-003 independently; close wopi-service#29 only after SC-001 passes.

### Commit discipline

- Keep tests before implementation within each story.
- Commit after each task or coherent task group, with signed commits as required by `spec.md`.
- Do not create intermediate code that revives PR #6354's suppressed wide lookup.
- Do not add a migration, schema change, RabbitMQ route, dependency, retry/outbox layer, or full `ActorContext` event payload.

---

## Notes

- `[P]` means different files and no dependency on an incomplete task at that point.
- Publisher tests, not each caller test, own projection/copy/freeze/no-extra-field coverage.
- Handler tests own event-to-reporter mapping, structured timing, and failure containment without relying on a live APM transaction.
- `getLevelZeroSpaceIdForCommunity` remains for unrelated callers; only `getCommunityForCollaboraDocumentOrFail` is deleted.
- Site 4 remains a direct awaited background flow and preserves its aggregate payload; it is not one of the three lifecycle events.
- Zero production timing records leave SC-003 unverified. SC-003 gates feature acceptance but neither issue closure.

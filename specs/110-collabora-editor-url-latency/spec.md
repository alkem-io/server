# Feature Specification: Opening a Collabora document waits ~8 s on analytics

**Feature Branch**: `fix/110-collabora-editor-url-latency`

**Created**: 2026-08-10

**Status**: Clarified (4 clarification iterations, 9 questions)

**Input**: alkem-io/wopi-service#29 — "Loading of collabra docs takes a long time". Reported against wopi-service; root-caused to this repo. The temporary release mitigation is alkem-io/server#6356 / PR #6354; this feature is the proper follow-up that restores the suppressed analytics safely.

## Context

Opening a Collabora document issues one GraphQL query, `collaboraEditorUrl`. In production it takes 5–8 seconds, which the reporter described as making "browsing / looking through files painful". wopi-service is not involved: it answers its part of the request in 27 ms.

### Evidence

Production APM (`traces-apm-services`, `transaction.name.text: CollaboraEditorUrl`), 90 days to 2026-08-10:

- Flat below one second from 11 May until 26 June 2026.
- Steps to ~5 s between **12:00 and 12:30 on 26 June 2026**, then runs 2–8 s, decaying to 1–3 s by early August.
- Filtered to `transaction.duration.us > 5_000_000`, the series *begins* on 26 June — **zero** `CollaboraEditorUrl` transactions exceeded 5 s in the 46 days before it.
- Control transaction `CalloutsOnCalloutsSetUsingClassification` (same page, same rollout) is flat at ~0.4–0.6 s across the same boundary, so this was not a platform-wide deploy effect.

Span waterfall for trace `c4a6bf41dcec6ceba4aa3bb5c94889d4` (2026-07-25, `alkemio-server` 0.159.0, 8,000 ms, HTTP 200):

| Span | Duration | What it is |
|---|---|---|
| `SELECT FROM (` + `SELECT FROM "collabora_document"` | 6.0 ms | resolver's document fetch |
| `SELECT FROM (` + `SELECT FROM "actor"` | 6.5 ms | actor name resolution |
| `SELECT FROM (` + `SELECT FROM "collabora_document"` | 7.4 ms | **second fetch of the same row**, inside `getEditorUrl` |
| `POST alkemio-wopi-service:8080` | **27 ms** | WOPI token issuance |
| **`SELECT FROM (`** | **7,917 ms** | **`getCommunityForCollaboraDocumentOrFail`** |
| `SELECT FROM "space"` | 9.8 ms | `getLevelZeroSpaceIdForCommunity` |
| `space` / `actor` / `user` | ~10 ms | contribution reporter's own lookups |
| `Elasticsearch: POST /contribution-events/_doc` | 51 ms | the analytics write |

**The editor URL — everything the user asked for — is resolved in ~47 ms. The remaining ~7.95 s is analytics, awaited before the response is sent.**

### Root cause

alkem-io/server#6187 (merged 2026-06-23, first released in v0.155.1, rolled out 2026-06-26) added a `COLLABORA_DOCUMENT_OPENED` record to `collaboraEditorUrl`. Before that PR the resolver body was a single delegation to `getEditorUrl`.

To attribute the record to a space it calls `CommunityResolverService.getCommunityForCollaboraDocumentOrFail` (`src/services/infrastructure/entity-resolver/community.resolver.service.ts:408`) — a TypeORM `findOne(Space)` whose `where` is an array of two five-level-deep relation paths:

- `space → collaboration → calloutsSet → callouts → contributions → collaboraDocument`
- `space → collaboration → calloutsSet → callouts → framing → collaboraDocument`

TypeORM expands both into full relation trees, joins the entire callout graph, filters only at the leaf, and hydrates `Space` + `Community` entities. That is the 7,917 ms span; the unnamed `SELECT FROM (` is its distinct-ids subquery wrapper.

Before the temporary Release 71 suppression, the same two-call pattern existed at four sites (and remains visible on this feature branch until it is replaced):

| # | Site | On a user response path? |
|---|---|---|
| 1 | `collabora.document.resolver.queries.ts:86` — `collaboraEditorUrl` | yes — the reported defect |
| 2 | `collabora.document.resolver.mutations.ts:165` — replace document | yes |
| 3 | `callout.resolver.mutations.ts:618` — `importCollaboraDocument` | yes |
| 4 | `collaborative-document-integration.service.ts:354` — contribution event consumer | no (RabbitMQ) |

Site 4 is not user-facing, but without the temporary suppression it runs the same ~8 s query on every Collabora contribution event.

Two independent defects in the underlying implementation combine:

| # | Defect |
|---|---|
| **D1** | User-facing resolvers perform analytics attribution inline and `await` it before returning, so any cost inside that side effect is charged to the user. |
| **D2** | The space lookup behind that analytics costs ~8 s. |

Either is worth fixing alone. D1 is why users feel D2; D2 is why the platform pays for it four times over.

### Temporary Release 71 mitigation

PR #6354 merged to `release/71` on 2026-08-12 as an emergency mitigation. It comments out all four analytics blocks, adds an early return to the site-4 background flow, and skips or comments the affected reporter assertions. This removes the production latency immediately but temporarily suppresses lifecycle open/replace/upload records and office-document contribution/view aggregates.

That hotfix is not the desired implementation. When its changes reach this feature's base, this work MUST replace the commented blocks and early return with the domain-event and leaf-first-lookup design below, restore the disabled contract coverage, and remove every temporary comment. It MUST NOT simply uncomment the old wide lookup.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Opening a document is not delayed by analytics (Priority: P1)

A member opens a Collabora document from a callout. The editor URL is returned as soon as it is available. The operation asks a Collabora domain event publisher to emit a lifecycle event, and an in-process subscriber records the open independently of the response. Where the Release 71 mitigation suppresses the record, this restores it without restoring the latency defect.

**Why this priority**: This is the reported defect. It is the difference between a document that opens and a document a user assumes is broken.

**Independent Test**: Resolve `collaboraEditorUrl` with a real in-process event listener that never settles; the query still returns the editor URL and the expected typed lifecycle event was published.

**Acceptance Scenarios**:

1. **Given** a Collabora document the actor may read, **When** `collaboraEditorUrl` is queried, **Then** the response is returned without waiting for the lifecycle-event subscriber.
2. **Given** analytics attribution is slow or failing, **When** `collaboraEditorUrl` is queried, **Then** the response time and content are unaffected and the subscriber logs the failure without surfacing it to the caller.
3. **Given** a successful open, **When** the editor URL is ready, **Then** the Collabora domain event publisher emits one `CollaboraDocumentOpened` event and its subscriber invokes the existing `COLLABORA_DOCUMENT_OPENED` reporter with the same values as before the temporary suppression.

---

### User Story 2 - Attributing a document to its space is cheap (Priority: P1)

Every path that reports a Collabora analytics event resolves the owning level-zero space through indexed lookups instead of a join across the platform's callout graph.

**Why this priority**: Removes the cost rather than hiding it. Without this, three user-facing paths merely stop waiting on an 8-second query that still loads the database, and the background consumer keeps paying it in full.

**Independent Test**: Call the new lookup for a framing-hosted document and a contribution-hosted document; assert the correct level-zero space id, leaf-first generated query shapes, and bounded statement counts.

**Acceptance Scenarios**:

1. **Given** a CollaboraDocument attached to a callout's framing, **When** the level-zero space is resolved, **Then** the correct id is returned.
2. **Given** a CollaboraDocument attached to a callout contribution, **When** the level-zero space is resolved, **Then** the correct id is returned.
3. **Given** a CollaboraDocument with no owning space (template or knowledge base), **When** the level-zero space is resolved, **Then** an `EntityNotFoundException` is raised as today; the lifecycle subscriber catches and logs the failure for sites 1–3, site 4 retains its existing catch-and-log path, and no user-facing operation fails because attribution did.

---

### User Story 3 - The document row is read once (Priority: P3)

`collaboraEditorUrl` loads the `CollaboraDocument` a single time instead of twice.

**Why this priority**: Measured at ~7.4 ms — real but minor. It is free to remove while the resolver is open, and leaving a duplicate read in the hot path after a latency investigation is not defensible.

**Independent Test**: Spy on the document fetch during one `collaboraEditorUrl` call and assert it is invoked once.

**Acceptance Scenarios**:

1. **Given** a `collaboraEditorUrl` query, **When** it completes, **Then** the `CollaboraDocument` has been fetched exactly once.

---

### Edge Cases

- **Document with no owning space** — templates and knowledge-base documents have no `Space` ancestor. The lookup must raise `EntityNotFoundException` as before; the lifecycle subscriber catches and logs it for sites 1–3, site 4 retains its existing catch-and-log path, and the user must be unaffected.
- **Event subscriber rejects** — a failure inside lifecycle-event handling must not become an unhandled promise rejection. Error handling lives inside the subscriber, not in the publishing resolver.
- **Process ends before the write lands** — a pod terminating between response and analytics write loses that record. Acceptable: the event is already documented as best-effort and is already dropped on any error.
- **Concurrent opens of the same document** — no shared state is introduced; each open publishes its own event.
- **Implementation starts from the Release 71 hotfix** — commented analytics blocks, the site-4 early return, and skipped assertions are transitional code. They are replaced or restored by this feature and must not survive in the final diff.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: `collaboraEditorUrl` MUST return its result as soon as the editor URL is available. It MUST delegate publication of a typed `CollaboraDocumentOpened` event to a Collabora domain event publisher and MUST NOT perform or await analytics attribution inline.
- **FR-002**: The replace-document mutation and `importCollaboraDocument` MUST likewise delegate typed `CollaboraDocumentReplaced` and `CollaboraDocumentUploaded` publication to the domain event publisher instead of performing analytics attribution inline. These write outcomes MUST be published only after their required persistence succeeds. Site 4 remains a direct background-consumer flow and receives only the cheaper lookup; it does not republish the external event as a lifecycle event.
- **FR-003**: One Collabora domain event publisher MUST own synchronous `EventEmitter2.emit` calls, and one singleton in-process subscriber MUST handle the three lifecycle event types. Each event MUST carry an immutable copied actor-attribution snapshot containing only `actorID`, `isAnonymous`, and `guestName`; it MUST NOT retain the complete request `ActorContext`, credentials, or session metadata. The subscriber MUST own lookup, reporter dispatch, and error handling so a failure is logged and cannot surface as an unhandled rejection or an error to the publisher. Publishing remains best-effort and non-durable.
- **FR-004**: A single method MUST resolve a level-zero space id directly from a CollaboraDocument id. Its first statement MUST start at the uniquely indexed `callout_contribution.collaboraDocumentId`, falling back to the uniquely indexed `callout_framing.collaboraDocumentId`, and return the owning callout's `calloutsSetId`. It then delegates to the existing `getLevelZeroSpaceIdForCalloutsSet`. The common contribution path therefore uses two statements and the framing fallback at most three; no statement may start at `space` and join across the complete callout graph. The two attachment paths are mutually exclusive (see Key Entities), so probe order is a cost choice only.
- **FR-005**: The lifecycle-event subscriber and site 4 MUST use the new lookup in place of the `getCommunityForCollaboraDocumentOrFail` + `getLevelZeroSpaceIdForCommunity` pair. Sites 1–3 MUST have no direct dependency on that pair after publishing their event.
- **FR-006**: `getCommunityForCollaboraDocumentOrFail` MUST be removed once it has no callers. `getLevelZeroSpaceIdForCommunity` MUST remain — it has unrelated callers in room events, whiteboard integration, and community service.
- **FR-007**: The lookup MUST preserve today's not-found type (`EntityNotFoundException`). Whether no attachment exists or downstream callouts-set resolution fails, it MUST expose the static message `Unable to find Space for CollaboraDocument` and put the document id and available contextual ids in `details`; it MUST NOT leak a delegated exception whose message interpolates an id.
- **FR-008**: `collaboraEditorUrl` MUST fetch the `CollaboraDocument` exactly once per request.
- **FR-009**: Analytics records MUST retain their pre-hotfix contracts. For sites 1–3, the subscriber MUST invoke the same lifecycle reporter method with the same `{ id, name, space }` and effective actor attribution as before the temporary suppression. For site 4, the existing contribution-window and view-window aggregate reporter methods and their full `{ id, name, space, writeActors, readonlyActors, alkemio }` payloads MUST be restored unchanged. This work changes when and how cheaply records are produced, never their event type or data.
- **FR-010**: No database schema change, no migration, and no GraphQL schema change.
- **FR-011**: The proper fix MUST fully supersede the Release 71 mitigation: sites 1–3 MUST publish their lifecycle events, site 4 MUST resume its contribution/view aggregate reporting with the cheap lookup, affected tests MUST run rather than remain skipped or commented out, and no temporary hotfix block, early return, or explanatory comment MAY remain.

### Key Entities

No persisted entity changes. The lookup path uses existing columns only: `callout_framing.collaboraDocumentId` and `callout_contribution.collaboraDocumentId` (both `@OneToOne` + `@JoinColumn`, therefore unique-indexed), then reads the matched callout's `calloutsSetId` and reuses the existing callouts-set-to-space lookup. The event payload is transient and contains the CollaboraDocument id, display name, and an immutable copied actor-attribution snapshot limited to `actorID`, `isAnonymous`, and `guestName`.

**Attachment invariant**: a CollaboraDocument is attached through exactly one of those two paths — it is either a callout's framing document or a callout contribution, never both. The lookup may therefore treat the first match as authoritative.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In the first post-deploy window containing at least 100 `CollaboraEditorUrl` transactions whose Elastic APM `event.outcome` is `success` (or all such samples collected during seven days if traffic is lower), the 95th percentile is below one second. Zero successful samples do not pass: SC-001 remains unverified, and wopi-service#29 remains open, until at least one is captured. Separately, an all-outcomes query MUST show no `CollaboraEditorUrl` transaction above five seconds outside a documented platform incident. An outlier may be excluded only when the result records a linked incident or change identifier, the exact affected interval, the number of excluded transactions, and independent evidence that the control transaction or another platform signal was affected during that same interval; the success-only p95 is still reported both before and after exclusions.
- **SC-002**: Tests prove that each of the three user-facing sites delegates exactly once to the Collabora domain event publisher with expected document data and live authorized context, emits nothing when authorization or the primary operation fails, and, for replace and upload, publishes only after required persistence succeeds. Publisher tests prove the emitted event owns a fresh, frozen `{ actorID, isAnonymous, guestName }` snapshot containing no other `ActorContext` fields, and that synchronous `emit` does not delay the caller even with a real pending listener. Subscriber tests prove all three event-to-reporter mappings and that a rejecting lookup is timed, logged, and contained without an unhandled rejection.
- **SC-003**: Query-shape tests prove that the replacement starts from a uniquely indexed document foreign key, never issues the removed space-first relation query, uses two statements on the contribution path and at most three on the framing path, and preserves the static not-found contract. The implementation MUST expose each lifecycle-handler lookup duration through an APM span or another structured timing signal already consumed by the operational stack. Review the first 20 post-deploy samples, or every sample available within seven days if fewer than 20 occur; each lookup MUST remain below 100 ms. Zero observable samples do not pass this criterion: SC-003 remains unverified until at least one production sample is captured.
- **SC-004**: `getCommunityForCollaboraDocumentOrFail` no longer exists in the codebase, and no call site issues the two-call pair.
- **SC-005**: At sites 1–3, the subscriber invokes the same lifecycle reporter method with the same `{ id, name, space }` and effective actor attribution as before. At site 4, the contribution-window and view-window aggregate reporter methods receive the same `{ id, name, space, writeActors, readonlyActors, alkemio }` payloads as before. Per-record values generated inside the reporter, such as timestamps and Elasticsearch document ids, are excluded. All five record contracts across the four attribution sites are verified by unit tests.
- **SC-006**: All analytics suppression introduced by PR #6354 is gone: the three lifecycle publisher tests and both site-4 aggregate suites execute, the site-4 reporting body is reachable, and the affected source/spec files contain no temporary-hotfix comments or commented-out analytics assertions.

**When each criterion is checked.** SC-002, SC-004, SC-005, SC-006, and the query-shape portion of SC-003 are pre-merge gates. After deploy, SC-001 is confirmed from production APM and the latency portion of SC-003 from the configured structured handler-timing signal. A development database is sufficient to verify query construction but too small to reproduce the old multi-second runtime, so no production-sized rehearsal is required before merging. Close server#6356 when the proper fix merges; close wopi-service#29 only after SC-001 passes. SC-003 remains a feature acceptance criterion but does not gate either issue-closure point.

## Assumptions

- The application already configures `EventEmitterModule` globally. The lifecycle subscriber, `ContributionReporterService`, and `CommunityResolverService` are singleton-scoped, so event handling after the response holds no request-scoped dependency.
- The `collaboraDocument` foreign keys on `callout_framing` and `callout_contribution` are unique-indexed by virtue of being `@OneToOne` + `@JoinColumn`. The replacement uses those leaf predicates to select at most one owning row; it does not assume PostgreSQL automatically indexes every referencing foreign-key column.
- Losing an occasional analytics record to a pod restart is acceptable; the event is already best-effort and already discarded on any error.
- In-process lifecycle handling is deliberately **not** concurrency-limited. This is accepted because each event performs bounded lookups and invokes a reporter that already writes asynchronously. Revisit if lookup latency, Elasticsearch rejections, or process memory correlate with bursts of document events.
- The 26 June 12:00–12:30 rollout carried v0.155.x. This was not confirmed against `infrastructure-operations` history (no access at time of writing) and is not load-bearing: the span waterfall attributes the latency directly, independent of which release introduced it.
- Release 71 may be merged or rebased into the implementation branch before source work begins. Either starting state is acceptable; the final-state requirements are identical and include removal of all PR #6354 suppression residue.

## Out of Scope

- **wopi-service.** Measured at 27 ms in the slow trace. Issue #29 is commented with the finding and closes only after this repo's merged fix passes SC-001.
- **The late-July to early-August decay** from ~8 s to ~1–3 s in the APM average. Unexplained. This work should flatten the line regardless; understanding the decay is a separate question.
- **wopi-service internals** — the two sequential authorization evaluations, the 12-hour discovery cache cliff, the file-service `/meta` hop. All bounded by that 27 ms span; revisit only if post-fix traces justify it.
- **`importCollaboraDocument` having no client caller.** Confirmed during investigation: `client-web` contains no operation invoking it. Unrelated to this defect, worth its own issue.
- **A contractual latency SLA.** SC-001 and SC-003 define acceptance thresholds for this regression; they do not establish a permanent customer-facing service-level agreement.
- **Durable lifecycle-event delivery.** The selected event mechanism is in-process and best-effort, matching current analytics semantics. An outbox or RabbitMQ-backed analytics pipeline would change delivery, retry, and idempotency guarantees and is a separate feature.
- **Maintaining the temporary Release 71 suppression.** PR #6354 is an emergency deployment measure only. This feature removes its suppression while keeping the latency fix.

## Clarifications

### Session 2026-08-11

- Q: When a CollaboraDocument is reachable from both a callout framing and a callout contribution, which one determines the level-zero space? → A: Cannot occur — a document is attached either as callout framing or as a contribution, never both.
- Q: Moving analytics off the response path removes the natural cap of one unit per in-flight request. Should concurrent event handling be limited? → A: No limit; record the reasoning and the signal that would trigger revisiting.
- Q: SC-001 is only observable in production. What is required before merging? → A: Merge on the trace evidence plus tests proving the resolver no longer waits; confirm in APM after deploy. No production-sized rehearsal.
- Q: Should the RabbitMQ contribution-event consumer also move behind the new lifecycle event? → A: No — it remains a direct background flow and keeps awaiting its service work. The controller already acknowledges before invoking the service, so this choice does not alter acknowledgement or redelivery semantics. It gets the cheaper lookup only.
- Q: SC-005 said the analytics record must be "byte-identical", which no record can be. What is actually checked? → A: Sites 1–3 keep the same lifecycle reporter method, `{ id, name, space }`, and effective actor attribution. Site 4 separately keeps its contribution-window and view-window aggregate reporter methods and their full aggregate payloads. Generated timestamps and Elasticsearch document ids are excluded.

### Session 2026-08-12

- Q: Should user-facing analytics remain detached inline or move behind a domain event? → A: Use the preferred domain-event design: publish typed in-process Collabora lifecycle events and handle analytics in a subscriber.
- Q: If the asynchronous analytics handler produces no observable database spans during the seven-day production window, how should SC-003 be evaluated? → A: Add explicit handler/lookup timing instrumentation; zero samples leave SC-003 unverified.
- Q: What actor information should each in-process lifecycle event carry for asynchronous analytics processing? → A: An immutable copy of `actorID`, `isAnonymous`, and `guestName` only.
- Q: When may the two tracking issues be closed if user-facing latency is fixed but handler-level timing has not yet produced an observable production sample? → A: Close server#6356 after merge and wopi-service#29 after SC-001 passes; SC-003 does not gate issue closure.

## Implementation Constraints

- No spec, feature, or issue identifiers in code comments (repo convention). The PR description carries that traceability.
- All commits signed.
- `pnpm lint` (tsc + Biome) and `pnpm vitest run` clean before review.

# Feature Specification: Opening a Collabora document waits ~8 s on analytics

**Feature Branch**: `fix/110-collabora-editor-url-latency`

**Created**: 2026-08-10

**Status**: Clarified (2 clarification iterations, 5 questions)

**Input**: alkem-io/wopi-service#29 — "Loading of collabra docs takes a long time". Reported against wopi-service; root-caused to this repo.

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

The same two-call pattern exists at four sites:

| # | Site | On a user response path? |
|---|---|---|
| 1 | `collabora.document.resolver.queries.ts:86` — `collaboraEditorUrl` | yes — the reported defect |
| 2 | `collabora.document.resolver.mutations.ts:165` — replace document | yes |
| 3 | `callout.resolver.mutations.ts:618` — `importCollaboraDocument` | yes |
| 4 | `collaborative-document-integration.service.ts:354` — contribution event consumer | no (RabbitMQ) |

Site 4 is not user-facing, but runs the same ~8 s query on every Collabora contribution event.

Two independent defects combine:

| # | Defect |
|---|---|
| **D1** | Analytics is `await`ed before the response returns, so any cost inside it is charged to the user. |
| **D2** | The space lookup behind that analytics costs ~8 s. |

Either is worth fixing alone. D1 is why users feel D2; D2 is why the platform pays for it four times over.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Opening a document is not delayed by analytics (Priority: P1)

A member opens a Collabora document from a callout. The editor URL is returned as soon as it is available, and the platform records the open afterwards, on its own time.

**Why this priority**: This is the reported defect. It is the difference between a document that opens and a document a user assumes is broken.

**Independent Test**: Resolve `collaboraEditorUrl` with the analytics dependency stubbed to a promise that never settles; the query still returns the editor URL.

**Acceptance Scenarios**:

1. **Given** a Collabora document the actor may read, **When** `collaboraEditorUrl` is queried, **Then** the response is returned without waiting for any analytics work to finish.
2. **Given** analytics reporting is slow or failing, **When** `collaboraEditorUrl` is queried, **Then** the response time and content are unaffected and the failure is logged, not surfaced.
3. **Given** a successful open, **When** the response has been sent, **Then** a `COLLABORA_DOCUMENT_OPENED` record is still written, carrying the same fields as today.

---

### User Story 2 - Attributing a document to its space is cheap (Priority: P1)

Every path that reports a Collabora analytics event resolves the owning level-zero space through indexed lookups instead of a join across the platform's callout graph.

**Why this priority**: Removes the cost rather than hiding it. Without this, three user-facing paths merely stop waiting on an 8-second query that still loads the database, and the background consumer keeps paying it in full.

**Independent Test**: Call the new lookup for a framing-hosted document and a contribution-hosted document; assert the correct level-zero space id and that only indexed single-row lookups are issued.

**Acceptance Scenarios**:

1. **Given** a CollaboraDocument attached to a callout's framing, **When** the level-zero space is resolved, **Then** the correct id is returned.
2. **Given** a CollaboraDocument attached to a callout contribution, **When** the level-zero space is resolved, **Then** the correct id is returned.
3. **Given** a CollaboraDocument with no owning space (template or knowledge base), **When** the level-zero space is resolved, **Then** an `EntityNotFoundException` is raised, exactly as today, and every caller's existing catch-and-log path is unchanged.

---

### User Story 3 - The document row is read once (Priority: P3)

`collaboraEditorUrl` loads the `CollaboraDocument` a single time instead of twice.

**Why this priority**: Measured at ~7.4 ms — real but minor. It is free to remove while the resolver is open, and leaving a duplicate read in the hot path after a latency investigation is not defensible.

**Independent Test**: Spy on the document fetch during one `collaboraEditorUrl` call and assert it is invoked once.

**Acceptance Scenarios**:

1. **Given** a `collaboraEditorUrl` query, **When** it completes, **Then** the `CollaboraDocument` has been fetched exactly once.

---

### Edge Cases

- **Document with no owning space** — templates and knowledge-base documents have no `Space` ancestor. The lookup must raise `EntityNotFoundException` as before; every call site already catches and logs it, and the user must be unaffected.
- **Detached work rejects** — a failure inside the detached analytics must not become an unhandled promise rejection. Error handling lives inside the detached unit, not at the call site.
- **Process ends before the write lands** — a pod terminating between response and analytics write loses that record. Acceptable: the event is already documented as best-effort and is already dropped on any error.
- **Concurrent opens of the same document** — no shared state is introduced; the detached work is per-request.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: `collaboraEditorUrl` MUST return its result as soon as the editor URL is available. No analytics work may be awaited before the response is sent.
- **FR-002**: The replace-document mutation and `importCollaboraDocument` MUST likewise not await analytics before returning. The RabbitMQ contribution-event consumer (site 4) MUST keep awaiting its analytics: no caller is waiting on it, and the message is acknowledged only once the handler completes — detaching would acknowledge before the work finished, losing the event on failure with no redelivery. Site 4 receives the cheaper lookup and nothing else.
- **FR-003**: Each detached analytics unit MUST contain its own error handling, so a failure is logged and cannot surface as an unhandled rejection or an error to the caller.
- **FR-004**: A single method MUST resolve a level-zero space id directly from a CollaboraDocument id, traversing only indexed foreign-key hops: `callout_framing.collaboraDocumentId` / `callout_contribution.collaboraDocumentId` → `callout` → `callouts_set` → `collaboration` → `space.levelZeroSpaceID`. It MAY issue more than one statement (e.g. a framing lookup falling back to a contribution lookup) provided every hop is an indexed single-row lookup and no statement joins across the callout graph. The two attachment paths are mutually exclusive (see Key Entities), so probe order is a cost choice only: the first match is authoritative, and no precedence rule or reconciliation between the paths is required.
- **FR-005**: All four sites listed in Context MUST use that lookup in place of the `getCommunityForCollaboraDocumentOrFail` + `getLevelZeroSpaceIdForCommunity` pair.
- **FR-006**: `getCommunityForCollaboraDocumentOrFail` MUST be removed once it has no callers. `getLevelZeroSpaceIdForCommunity` MUST remain — it has unrelated callers in room events, whiteboard integration, and community service.
- **FR-007**: The lookup MUST preserve today's not-found behaviour (`EntityNotFoundException`) so no call site's error handling changes.
- **FR-008**: `collaboraEditorUrl` MUST fetch the `CollaboraDocument` exactly once per request.
- **FR-009**: Analytics records MUST be unchanged — same event types, same fields, same values, same best-effort semantics. This work changes *when* and *how cheaply* they are produced, never *what*.
- **FR-010**: No database schema change, no migration, and no GraphQL schema change.

### Key Entities

No entity changes. The lookup path uses existing columns only: `callout_framing.collaboraDocumentId` and `callout_contribution.collaboraDocumentId` (both `@OneToOne` + `@JoinColumn`, therefore unique-indexed), `callout.calloutsSetId`, `collaboration.calloutsSetId`, `space.collaborationId`, `space.levelZeroSpaceID`.

**Attachment invariant**: a CollaboraDocument is attached through exactly one of those two paths — it is either a callout's framing document or a callout contribution, never both. The lookup may therefore treat the first match as authoritative.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In production APM, the `CollaboraEditorUrl` transaction returns to its pre-26-June-2026 band (below one second), and the `> 5,000,000 µs` filter yields no results in normal operation — the same query that showed zero hits before 26 June.
- **SC-002**: Tests prove two things at each of the three user-facing sites, rather than comments asserting them: the response resolves while analytics is still pending, and a *rejecting* analytics unit neither fails the response nor escapes as an unhandled rejection. The second half is what defends FR-003 — an unhandled rejection terminates the process by default, so it cannot rest on code review alone.
- **SC-003**: In a post-fix trace, the database spans attributable to the level-zero space lookup total **tens of milliseconds, not seconds** — against the 7,917 ms the replaced query cost and the 9.8 ms the comparable `getLevelZeroSpaceIdForCommunity` query cost in the same trace (see Context). Both figures are recorded rather than referenced live: this work stops calling `getLevelZeroSpaceIdForCommunity` at these sites, so its span is absent from post-fix traces and cannot serve as an in-trace comparator.
- **SC-004**: `getCommunityForCollaboraDocumentOrFail` no longer exists in the codebase, and no call site issues the two-call pair.
- **SC-005**: At every changed site, the contribution reporter is invoked with the same method (therefore the same event type) and the same arguments as before this change — the `{ id, name, space }` contribution details plus the acting actor context. Values generated per record, such as timestamps and the Elasticsearch document id, are excluded from the comparison. Verified by unit tests on the reporter call.

No numeric latency target is defined. The pre-regression APM baseline is the target, and it is a real measurement rather than an invented one.

**When each criterion is checked.** SC-002, SC-004 and SC-005 are pre-merge gates — verifiable in the repository and its test suite. SC-001 and SC-003 can only be observed against production data: a development or acceptance database holds too few callouts for the old query to be slow, so re-measuring there would show both the old and new lookups finishing in milliseconds and would prove nothing. They are confirmed after deploy, from the same APM chart and filters used in Context. No production-sized rehearsal is required before merging — the span waterfall in Context is the measurement.

## Assumptions

- `ContributionReporterService` and `CommunityResolverService` are singleton-scoped (verified — neither declares `Scope.REQUEST`), so analytics executing after the response returns holds no request-scoped dependency.
- The `collaboraDocument` foreign keys on `callout_framing` and `callout_contribution` are unique-indexed by virtue of being `@OneToOne` + `@JoinColumn`, making the leaf-first traversal index-driven at every hop.
- Losing an occasional analytics record to a pod restart is acceptable; the event is already best-effort and already discarded on any error.
- Detached analytics work is deliberately **not** concurrency-limited. Awaiting it used to cap it at one unit per in-flight request; detaching removes that cap. This is accepted because each unit is a few indexed lookups plus one Elasticsearch write (~70 ms in the measured trace) and the number in flight can never exceed the rate at which documents are being opened. Building a limiter would be machinery for a load profile no evidence supports. Revisit if Elasticsearch write latency or rejections start correlating with bursts of document opens, or if the detached work grows beyond its current shape.
- The 26 June 12:00–12:30 rollout carried v0.155.x. This was not confirmed against `infrastructure-operations` history (no access at time of writing) and is not load-bearing: the span waterfall attributes the latency directly, independent of which release introduced it.

## Out of Scope

- **wopi-service.** Measured at 27 ms in the slow trace. Issue #29 is commented with the finding and should be closed against this repo's fix.
- **The late-July to early-August decay** from ~8 s to ~1–3 s in the APM average. Unexplained. This work should flatten the line regardless; understanding the decay is a separate question.
- **wopi-service internals** — the two sequential authorization evaluations, the 12-hour discovery cache cliff, the file-service `/meta` hop. All bounded by that 27 ms span; revisit only if post-fix traces justify it.
- **`importCollaboraDocument` having no client caller.** Confirmed during investigation: `client-web` contains no operation invoking it. Unrelated to this defect, worth its own issue.
- **Any numeric latency SLA.** Deliberately excluded per SC-001.

## Clarifications

### Session 2026-08-11

- Q: When a CollaboraDocument is reachable from both a callout framing and a callout contribution, which one determines the level-zero space? → A: Cannot occur — a document is attached either as callout framing or as a contribution, never both.
- Q: Detaching analytics removes the natural cap of one unit per in-flight request. Should concurrent detached work be limited? → A: No limit; record the reasoning and the signal that would trigger revisiting.
- Q: SC-001 is only observable in production. What is required before merging? → A: Merge on the trace evidence plus tests proving the resolver no longer waits; confirm in APM after deploy. No production-sized rehearsal.
- Q: Should the RabbitMQ contribution-event consumer also stop awaiting its analytics? → A: No — it keeps awaiting. Nobody waits on it, and detaching would acknowledge the message before the work completed, losing the event on failure. It gets the cheaper lookup only.
- Q: SC-005 said the analytics record must be "byte-identical", which no record can be. What is actually checked? → A: The reporter is called with the same method and the same `{ id, name, space }` + actor context; per-record values such as timestamps are excluded. Verified by unit test.

## Implementation Constraints

- No spec, feature, or issue identifiers in code comments (repo convention). The PR description carries that traceability.
- All commits signed.
- `pnpm lint` (tsc + Biome) and `pnpm vitest run` clean before review.

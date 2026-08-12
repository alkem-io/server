# Phase 0 Research: collaboraEditorUrl latency

After four clarification iterations (nine answered questions) and repository research, every implementation-affecting choice below is resolved.

---

## R1 — What exactly makes the current lookup cost 7,917 ms

**Decision**: Treat `findOne(Space, { where: [deepPathA, deepPathB] })` as the defect itself, amplified by production data volume.

**Rationale**: `getCommunityForCollaboraDocumentOrFail` asks TypeORM to find a `Space` by a predicate five relations away, twice, OR'd:

```text
space → collaboration → calloutsSet → callouts → contributions → collaboraDocument
space → collaboration → calloutsSet → callouts → framing       → collaboraDocument
```

TypeORM expands each path into a full relation tree, emits a distinct-ids subquery wrapper (the unnamed `SELECT FROM (` span in APM), joins the platform's entire callout graph, applies the only selective predicate at the leaf, and finally hydrates `Space` plus `Community` entities of which one column is ever read. Starting from the far end of the graph and filtering last is what costs the time; the same logical question answered leaf-first is a unique-index seek.

The neighbouring `SELECT FROM "space"` span in the same trace — `getLevelZeroSpaceIdForCommunity`, a two-join `findOne` — runs in 9.8 ms against the same database at the same moment. That is the control: the database is fine, the query shape is not.

**Alternatives considered**: Adding an index. Rejected — both selective leaf columns are already uniquely indexed, and the replacement can anchor on them. PostgreSQL does not automatically index every referencing foreign key, so this decision does not rely on that broader claim. Tuning the query planner or adding a hint was also rejected: TypeORM emits the wide relation shape from the query definition, so the fix belongs there rather than below it.

---

## R2 — Shape of the replacement lookup

**Decision**: Two steps. First resolve the owning callout's `calloutsSetId` from the document by a direct query against the owning table, then delegate to the existing `getLevelZeroSpaceIdForCalloutsSet`.

**Rationale**: `getLevelZeroSpaceIdForCalloutsSet(calloutsSetID)` already exists in the same class, is already tested, and already does the `calloutsSet → collaboration → space` half correctly and cheaply. Reimplementing that half would duplicate logic the repo already owns. Only the document → callout half is new.

For the new half, the document's foreign key lives on the owning row and is unique-indexed:

- framing-hosted: `callout_framing.collaboraDocumentId` → the owning `callout` via `callout.framingId`
- contribution-hosted: `callout_contribution.collaboraDocumentId` → the owning callout via `callout_contribution.calloutId`

Neither entity declares its foreign key as a property (TypeORM manages the columns implicitly), so reading the id without hydrating entities needs either a `relations` load or a query builder selecting the raw column. Prefer the query builder: it returns a single scalar and makes the index seek obvious to a reader.

Because a document is attached through exactly one of the two paths (spec, Key Entities), the two probes are independent and the first match is authoritative. Probe the contribution path first — it is the ordinary attachment. The common path costs two statements: one leaf-first probe for `calloutsSetId`, then `getLevelZeroSpaceIdForCalloutsSet`. The framing path costs at most three: a missed contribution probe, a framing probe, then the delegated lookup. Each probe starts from a unique `collaboraDocumentId` predicate and joins only far enough to read the owning callout's `calloutsSetId`.

Both an unattached document and a downstream callouts-set resolution failure are translated to `EntityNotFoundException` with the exact static message `Unable to find Space for CollaboraDocument`. The document id and any resolved `calloutsSetId` are carried only in `details`.

**Alternatives considered**:

- *One query from `Space` down through explicit joins.* Rejected — the same start-wide-filter-late shape that caused the defect, relying on the planner to reverse it. Being right by accident is not being right.
- *One query starting at the leaf and joining all the way up to `space`.* Viable and defensible, but it re-implements the second half rather than reusing a tested method, for a saving of one indexed lookup. Rejected on Principle 10.
- *Keeping the OR, moved down to `Callout`.* Cheaper than today (two joins rather than five), but still an OR across two relation paths when the invariant says only one can ever match. Rejected as needless.

---

## R3 — How user-facing analytics leaves the response path

**Decision**: Add a Collabora domain event publisher service that emits three typed in-process events with the application's existing global `EventEmitter2`: `CollaboraDocumentOpened`, `CollaboraDocumentReplaced`, and `CollaboraDocumentUploaded`. A singleton subscriber registered in `CollaboraDocumentModule` owns space attribution, reporter dispatch, and error handling.

**Rationale**: The constitution requires side effects such as analytics to subscribe to domain events rather than remain embedded in resolvers. The application already configures `EventEmitterModule.forRoot({ global: true })`, and already uses `EventEmitter2` plus `@OnEvent` for internal domain events. `emit` returns synchronously and does not await an async subscriber, so slow attribution cannot delay the GraphQL response. The subscriber catches and logs its own failures, giving best-effort semantics without an unhandled rejection.

The event carries only stable values already available after the main operation: CollaboraDocument id, display name, and a dedicated actor-attribution snapshot. `CollaboraDocumentEventsService` receives the live `ActorContext`, immediately projects a fresh exact `{ actorID, isAnonymous, guestName }` object, and shallow-freezes both that value and the event envelope. All retained fields are primitives, so a shallow freeze is sufficient. The full request object, credentials, authentication/session timestamps, and delegation metadata never cross the event boundary. The subscriber and its dependencies are singleton-scoped.

The contribution reporter itself already returns `void` and starts its Elasticsearch work asynchronously. The response-path cost being moved is the ownership lookup and reporter dispatch; the design does not claim that the resolver currently awaits the Elasticsearch write.

The open outcome is published after the editor URL resolves. Replacement and upload outcomes are published only after their required persistence succeeds, because the subscriber resolves ownership from committed state. This matches Constitution v3.0.0 Principle 4. Delivery remains best-effort: possible loss is accepted, and subscriber failure cannot turn an already-committed primary operation into a caller-visible failure.

**Alternatives considered**:

- A private `async` method invoked with `void`. Rejected because it would fix latency while retaining the analytics side effect inline, contrary to Constitution Principle 4.
- The CQRS/RabbitMQ event bus. Rejected because this feature preserves current best-effort in-process delivery; the configured infrastructure bus publishes externally and would add retry, routing, and idempotency semantics beyond this regression fix.
- `setImmediate` / `process.nextTick`. Rejected because it is merely scheduling, not a domain-event boundary.
- Leaving the lookup awaited and relying solely on its lower cost. Viable as an emergency hotfix, but rejected because a later subscriber dependency could put latency back on the response path.
- Passing the full `ActorContext`. Rejected because the reporter reads only `actorID`, `isAnonymous`, and `guestName`; retaining credentials and session/delegation metadata after the request is unnecessary. Having each caller construct the snapshot was also rejected because it would duplicate a security-sensitive projection at three sites.

---

## R4 — How the event boundary is tested

**Decision**: At each user-facing site, assert exactly one call to the Collabora event publisher with the correct document values and live actor context, and no call when authorization or primary work fails. For replacement and upload, also assert publication happens only after all required persistence succeeds. In the publisher service spec, use a real `EventEmitter2` listener that returns a never-settling promise and assert publication still returns synchronously. Assert that the received event owns a frozen, copied attribution object with exactly `actorID`, `isAnonymous`, and `guestName`, retains its primitive values after the input context is mutated, and uses `emit`, never `emitAsync`. Test the subscriber independently for all three reporter mappings, structured timing on success and failure, and contained lookup or synchronous reporter failures.

**Rationale**: Resolver/service tests prove each operation requests the right domain event. A real pending listener proves synchronous `emit` does not wait; explicit spies prove `emitAsync` is not used. Merely switching to `void emitAsync(...)` would also return immediately, so a timeout-only regression test is insufficient. Publisher tests own projection/copy/freeze coverage rather than duplicating it across callers. Subscriber tests establish the other half of the contract: event data is translated to the same reporter method and arguments, timing is always observable, and a rejection is logged rather than escaping.

The current code already tests successful reporter calls and swallowed lookup failures. Those assertions move to the subscriber spec instead of being discarded; the resolver specs retain authorization and return-value coverage plus event-publication assertions.

**Alternatives considered**: Fake timers. Rejected because no clock governs the behavior. Tests that mock `emit` alone are retained only for exact payload assertions, not as proof of non-blocking behavior.

---

## R5 — Removing `getCommunityForCollaboraDocumentOrFail`

**Decision**: Delete it once the four call sites migrate. Keep `getLevelZeroSpaceIdForCommunity`.

**Rationale**: All four callers are migrating in this change, so the method becomes dead. The repo's standing rule is not to keep code "just in case". `getLevelZeroSpaceIdForCommunity` is a different matter — it has unrelated live callers in room events, whiteboard integration and community service, and is not implicated in this defect.

**Alternatives considered**: Deprecating rather than deleting. Rejected — a deprecation window exists to protect external consumers, and this is a private internal method with a known, empty caller set after the change.

---

## R6 — Why no rehearsal before merge

**Decision**: Merge on the recorded trace plus unit tests; confirm SC-001 in APM and SC-003 through the structured lifecycle-handler timing records after deploy.

**Rationale**: Settled during clarification and repeated here because it shapes the task list. A development or acceptance database has too few callouts for the old query to be slow, so a before/after measurement there would show both versions completing in milliseconds. That is not evidence — it is a result that looks like success regardless of whether the fix works. The production span waterfall already attributes 7,917 ms to the named query; re-measuring on small data would weaken the evidence, not strengthen it.

**Alternatives considered**: Restoring a production-sized snapshot to measure locally. Not rejected on merit — it would be genuine evidence — but rejected as a merge gate, since the diagnosis is already attributed and the change is revertible in one commit.

---

## R7 — RabbitMQ consumer completion and acknowledgement

**Decision**: Site 4 remains a direct, awaited service flow and adopts only the cheaper lookup. It does not publish one of the new lifecycle events.

**Rationale**: Site 4 consumes external Collabora window events and produces aggregate analytics with actor sets, not the single-actor lifecycle records produced by sites 1–3. Re-emitting it through the lifecycle subscriber would conflate two contracts. Keeping the service method awaited also preserves its existing completion semantics and keeps its internal steps ordered.

The controller calls `ack(context)` before invoking the integration service. Therefore awaiting site 4 does **not** defer acknowledgement and does not provide redelivery on analytics failure. The earlier acknowledgement rationale was incorrect and is intentionally not used to justify this decision.

---

## R8 — Reconciliation with the Release 71 emergency mitigation

**Decision**: Treat PR #6354 as a temporary source-state variant, not as a change to the desired behavior. Replace its three commented user-facing analytics blocks with domain-event publication, remove the site-4 early return and restore that body with the leaf-first lookup, convert the disabled assertions into the event/subscriber and aggregate contract tests in this plan, and remove every temporary explanatory comment.

**Rationale**: The hotfix deliberately trades analytics completeness for immediate latency relief. It suppresses open, replace, upload, contribution-window, and view-window records, while this feature promises to retain those records without blocking users or issuing the wide query. Leaving any hotfix suppression in place would satisfy latency checks while violating FR-009 and masking missing analytics behind skipped tests.

The implementation branch currently predates the hotfix, while the release branch contains it. The exact conflict direction depends on when Release 71 is merged back, but the required final tree is unambiguous. Conflict resolution must implement the event publisher/subscriber and cheap lookup directly; it must never revive `getCommunityForCollaboraDocumentOrFail` by merely uncommenting the old blocks.

**Alternatives considered**: Keep analytics disabled permanently. Rejected because it changes product behavior and contradicts the proper-fix direction recorded in server#6356 and the PR #6350 review discussion. Re-enable the hotfix blocks first and refactor them afterwards. Rejected because it creates an avoidable intermediate state that reinstates the production defect.

---

## R9 — Reliable timing for an asynchronous lifecycle handler

**Decision**: Measure only `getLevelZeroSpaceIdForCollaboraDocument` inside `CollaboraDocumentAnalyticsEventHandler` with monotonic `performance.now()`. In a `finally`-equivalent path, emit exactly one INFO-level structured Winston record for every attempted lookup, including failures, under `LogContext.COLLABORATION`:

```text
message: "Collabora document analytics space lookup completed"
eventName: <centralized lifecycle event name>
collaboraDocumentId: <document id>
outcome: "success" | "failure"
durationMs: <non-negative number>
```

Keep the existing error record as the diagnostic failure signal; the timing record is the stable performance sample. Tests assert one timing record on success and failure, stable fields, and a numeric non-negative duration without asserting wall-clock precision.

**Rationale**: Production Winston uses structured JSON and is already collected into the operational Elastic/Kibana logging stack. The signal therefore remains searchable even when the asynchronous handler outlives the GraphQL transaction. The existing `@InstrumentService` implementation starts a span only when `apmAgent.currentTransaction` exists, labels it as GraphQL work, and does not end its span on rejection; it cannot guarantee one sample per background lookup. A stable structured record is the smallest reliable mechanism satisfying SC-003 without a new dependency or dashboard. Review the first 20 records, or all 1–19 within seven days. Zero records leave SC-003 unverified.

**Alternatives considered**: `@InstrumentService` or `apmAgent.startSpan` were rejected because both depend on a current transaction. Starting a new root APM transaction per event was rejected because it adds sampling and context-management concerns merely to record one duration. The deprecated `Profiling` decorator was rejected because it is verbose-only and generic. Raw stdout was rejected because it bypasses the normal application logger.

---

## R10 — Closure signals for the two tracking issues

**Decision**: Close server#6356 when the proper-fix PR merges, because that issue tracks replacement of the temporary Release 71 suppression. Close wopi-service#29 only after SC-001 confirms the reported user-facing latency has recovered. SC-003 remains required for feature acceptance but gates neither issue closure.

**Rationale**: The two issues represent different completion signals: server#6356 is an implementation follow-up, while wopi-service#29 is the observed user problem. Keeping those signals separate avoids leaving the release-hotfix tracker open during a production observation window or closing the original report before latency is verified.

**Alternatives considered**: Closing both only after SC-001 and SC-003 was rejected because handler observability is not the reported WOPI symptom. Closing both immediately at merge was rejected because the user-facing regression still requires production confirmation.

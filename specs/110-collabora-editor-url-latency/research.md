# Phase 0 Research: collaboraEditorUrl latency

No `NEEDS CLARIFICATION` markers remained after two clarification passes. The open questions here are about *shape*, not about intent, and each was resolved by reading the existing code rather than by guessing.

---

## R1 — What exactly makes the current lookup cost 7,917 ms

**Decision**: Treat `findOne(Space, { where: [deepPathA, deepPathB] })` as the defect itself, not the data volume.

**Rationale**: `getCommunityForCollaboraDocumentOrFail` asks TypeORM to find a `Space` by a predicate five relations away, twice, OR'd:

```text
space → collaboration → calloutsSet → callouts → contributions → collaboraDocument
space → collaboration → calloutsSet → callouts → framing       → collaboraDocument
```

TypeORM expands each path into a full relation tree, emits a distinct-ids subquery wrapper (the unnamed `SELECT FROM (` span in APM), joins the platform's entire callout graph, applies the only selective predicate at the leaf, and finally hydrates `Space` plus `Community` entities of which one column is ever read. Starting from the far end of the graph and filtering last is what costs the time; the same logical question answered leaf-first is a unique-index seek.

The neighbouring `SELECT FROM "space"` span in the same trace — `getLevelZeroSpaceIdForCommunity`, a two-join `findOne` — runs in 9.8 ms against the same database at the same moment. That is the control: the database is fine, the query shape is not.

**Alternatives considered**: Adding an index. Rejected — every hop is already indexed; the problem is join order and breadth, not a missing index. Tuning the query planner or adding a hint. Rejected — TypeORM emits this shape from the relation tree, so the fix belongs at the query definition, not below it.

---

## R2 — Shape of the replacement lookup

**Decision**: Two steps. First resolve the owning callout's `calloutsSetId` from the document by a direct query against the owning table, then delegate to the existing `getLevelZeroSpaceIdForCalloutsSet`.

**Rationale**: `getLevelZeroSpaceIdForCalloutsSet(calloutsSetID)` already exists in the same class, is already tested, and already does the `calloutsSet → collaboration → space` half correctly and cheaply. Reimplementing that half would duplicate logic the repo already owns. Only the document → callout half is new.

For the new half, the document's foreign key lives on the owning row and is unique-indexed:

- framing-hosted: `callout_framing.collaboraDocumentId` → the owning `callout` via `callout.framingId`
- contribution-hosted: `callout_contribution.collaboraDocumentId` → the owning callout via `callout_contribution.calloutId`

Neither entity declares its foreign key as a property (TypeORM manages the columns implicitly), so reading the id without hydrating entities needs either a `relations` load or a query builder selecting the raw column. Prefer the query builder: it returns a single scalar and makes the index seek obvious to a reader.

Because a document is attached through exactly one of the two paths (spec, Key Entities), the two probes are independent and the first match is authoritative. Probe the contribution path first — it is the ordinary attachment — so the common case costs one statement. Worst case is three statements total, each a single-row indexed lookup.

**Alternatives considered**:

- *One query from `Space` down through explicit joins.* Rejected — the same start-wide-filter-late shape that caused the defect, relying on the planner to reverse it. Being right by accident is not being right.
- *One query starting at the leaf and joining all the way up to `space`.* Viable and defensible, but it re-implements the second half rather than reusing a tested method, for a saving of one indexed lookup. Rejected on Principle 10.
- *Keeping the OR, moved down to `Callout`.* Cheaper than today (two joins rather than five), but still an OR across two relation paths when the invariant says only one can ever match. Rejected as needless.

---

## R3 — How the detachment is expressed

**Decision**: Extract each analytics block into a private `async` method that contains the existing `try`/`catch`, and invoke it with `void` immediately before the return.

**Rationale**: The error handling must live inside the detached unit, not at the call site — a `void`-ed promise whose body can reject becomes an unhandled rejection, and Node's default for those is fatal. Moving the existing `try`/`catch` inside the method makes rejection structurally impossible rather than conventionally avoided. `void` (rather than a bare call) is the explicit, lintable way to say "deliberately not awaited"; Biome and reviewers both read it that way.

Both services involved are singleton-scoped — neither `ContributionReporterService` nor `CommunityResolverService` declares `Scope.REQUEST` — so nothing the detached method holds expires when the request ends. The actor context is a plain value already in hand.

**Alternatives considered**:

- `setImmediate` / `process.nextTick` scheduling. Rejected — adds a scheduling hop and makes the work harder to await in a test, buying nothing over `void`.
- `@nestjs/event-emitter` in-process events. Rejected here for the same reason as the queued-event route in Complexity Tracking: it is a redesign of the analytics path, not a latency fix.
- Leaving the `await` and relying solely on the cheaper query. Rejected — it would leave ~70 ms of reporter lookups and the Elasticsearch write on the response path, and would leave the next expensive thing anyone adds to that block charged straight to the user.

---

## R4 — How the "does not wait" behaviour is tested

**Decision**: Stub the analytics dependency with a promise that never settles, and assert the resolver's promise resolves anyway.

**Rationale**: This is the only formulation that fails if someone reintroduces the `await`. Asserting call order, or that a mock was called, passes equally well in both the fixed and the broken version — which makes it a test that cannot detect the bug it exists to prevent. A never-settling stub inverts that: with `await` restored, the test times out.

The three specs already mock `communityResolverService.getCommunityForCollaboraDocumentOrFail` and `getLevelZeroSpaceIdForCommunity`, so each needs its mocks repointed at the new method regardless; adding the never-settles case is a small extension of work already required.

**Alternatives considered**: Fake timers. Rejected — introduces timing coupling into a test whose point is that there is no timing coupling, and `docs/testing-flakiness.md` calls out exactly this class of test as one the project has already paid for.

---

## R5 — Removing `getCommunityForCollaboraDocumentOrFail`

**Decision**: Delete it once the four call sites migrate. Keep `getLevelZeroSpaceIdForCommunity`.

**Rationale**: All four callers are migrating in this change, so the method becomes dead. The repo's standing rule is not to keep code "just in case". `getLevelZeroSpaceIdForCommunity` is a different matter — it has unrelated live callers in room events, whiteboard integration and community service, and is not implicated in this defect.

**Alternatives considered**: Deprecating rather than deleting. Rejected — a deprecation window exists to protect external consumers, and this is a private internal method with a known, empty caller set after the change.

---

## R6 — Why no rehearsal before merge

**Decision**: Merge on the recorded trace plus unit tests; confirm in APM after deploy.

**Rationale**: Settled during clarification and repeated here because it shapes the task list. A development or acceptance database has too few callouts for the old query to be slow, so a before/after measurement there would show both versions completing in milliseconds. That is not evidence — it is a result that looks like success regardless of whether the fix works. The production span waterfall already attributes 7,917 ms to the named query; re-measuring on small data would weaken the evidence, not strengthen it.

**Alternatives considered**: Restoring a production-sized snapshot to measure locally. Not rejected on merit — it would be genuine evidence — but rejected as a merge gate, since the diagnosis is already attributed and the change is revertible in one commit.

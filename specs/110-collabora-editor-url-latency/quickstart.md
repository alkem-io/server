# Quickstart: verifying the collaboraEditorUrl fix

SC-002, SC-004, SC-005, and SC-006 are fully checkable before merge. SC-003 is split between a pre-merge query-contract check and a post-deploy latency check; SC-001 is production-only. This file records how each is verified and, once run, what it showed.

## Implementation baseline

Captured before feature source changes on 2026-08-12:

- `pnpm lint` failed during type checking because the existing install did not provide declared OIDC, Redis, office-parser, and MCP packages/types; it also reported a pre-existing inference error in `space.service.spec.ts`.
- `pnpm vitest run` likewise failed during module loading: 232 files passed, 452 files failed to load, four files were skipped, and 2,024 executed tests passed. The dominant failures were the same missing declared packages, before feature assertions ran.
- `pnpm install --no-lockfile` initially refreshed only `node_modules` from the existing `package.json` so targeted feature tests could execute. Before final verification, `pnpm install --frozen-lockfile` restored the exact committed dependency graph; no dependency manifest or lockfile was changed.
- This branch predates the Release 71 suppression: the three user-facing analytics blocks and the site-4 body are executable, there is no site-4 early return, and no affected analytics assertion or contribution/view suite is skipped or commented out.

The five executable pre-hotfix record contracts to preserve are:

| Site | Existing reporter | Existing asserted data |
|---|---|---|
| Editor URL | `collaboraDocumentOpened` | `{ id, name, space }` plus opening actor context |
| Replacement | `calloutCollaboraDocumentReplaced` | `{ id, name, space }` plus replacing actor context |
| Import | `calloutCollaboraDocumentUploaded` | `{ id, name, space }` plus uploading actor context |
| Contribution window | `officeDocumentContribution` | `{ id, name, space, writeActors, readonlyActors, alkemio }` |
| View window | `officeDocumentView` | `{ id, name, space, writeActors, readonlyActors, alkemio }` |

## Before merge

### SC-002 — lifecycle events do not delay responses

```bash
pnpm vitest run src/domain/collaboration/collabora-document/collabora.document.resolver.queries.spec.ts
pnpm vitest run src/domain/collaboration/collabora-document/collabora.document.resolver.mutations.spec.ts
pnpm vitest run src/domain/collaboration/callout/callout.resolver.mutations.spec.ts
pnpm vitest run src/domain/collaboration/collabora-document/events/collabora.document.events.service.spec.ts
pnpm vitest run src/domain/collaboration/collabora-document/events/collabora.document.analytics.event.handler.spec.ts
```

At each user-facing site, assert exactly one call to `CollaboraDocumentEventsService` with the correct document values and live authorized context, and no publication when authorization or primary work fails. For replacement and upload, assert the publisher is invoked only after required persistence succeeds. In the publisher service spec, register a real listener that returns a promise that never settles. Publication must still return `undefined` synchronously and exactly one correctly typed event must be observed. Assert that the event owns a frozen, copied attribution object with exactly `actorID`, `isAnonymous`, and `guestName`; populate the input context with credentials and session/delegation fields, mutate it after publication, and prove none of those fields or mutations crossed the boundary. Spy on EventEmitter2 to prove `emit` is called and `emitAsync` is not—a timeout-only test would miss `void emitAsync(...)`.

The handler spec checks all three event-to-reporter mappings and exact `{ id, name, space }` plus minimal attribution arguments. A rejecting lookup and a synchronous reporter failure must be logged and contained. Caller resolver tests assert that authorization or primary-operation failure emits no event; the publisher spec owns only event construction and emission semantics.

### SC-004 — the expensive lookup is gone

```bash
grep -rn "getCommunityForCollaboraDocumentOrFail" src/ ; echo "exit: $?"
```

Expect no matches (exit 1). Then confirm nothing still issues the two-call pair:

```bash
grep -rn "getLevelZeroSpaceIdForCommunity" src/ | grep -i collabora ; echo "exit: $?"
```

Expect no matches. `getLevelZeroSpaceIdForCommunity` itself should still appear elsewhere — room events, whiteboard integration, community service — those callers are unrelated and must survive. Then confirm user-facing publishers contain no direct ownership lookup:

```bash
grep -n "getLevelZeroSpaceIdForCollaboraDocument" \
  src/domain/collaboration/collabora-document/collabora.document.resolver.queries.ts \
  src/domain/collaboration/collabora-document/collabora.document.resolver.mutations.ts \
  src/domain/collaboration/callout/callout.resolver.mutations.ts
```

Expect no matches; the lookup belongs in the subscriber and site 4 only.

### SC-005 — analytics records are unchanged

The event-handler spec asserts that sites 1–3 map to the same reporter methods and `{ id, name, space }` plus effective attribution from the exact `{ actorID, isAnonymous, guestName }` snapshot. The collaborative-document integration spec separately asserts that site 4 keeps both its contribution-window and view-window aggregate reporter methods and their full `{ id, name, space, writeActors, readonlyActors, alkemio }` payloads. Together these are five record contracts across four attribution sites. Timestamps and generated ids are excluded.

### SC-006 — the Release 71 suppression is fully superseded

If PR #6354 is present in the implementation base, verify that its temporary state has not survived:

```bash
rg -n "TEMP hotfix|proper fix.*leaf-first|collabora-editor-url-latency follow-up" \
  src/domain/collaboration/collabora-document \
  src/domain/collaboration/callout/callout.resolver.mutations.ts \
  src/services/collaborative-document-integration
```

Expect no matches. Then verify the specifically disabled suites are not skipped:

```bash
rg -n "it\.skip.*COLLABORA_DOCUMENT_(OPENED|UPLOADED)|describe\.skip\('officeDocument(Contributions|Views)" \
  src/domain/collaboration/collabora-document/collabora.document.resolver.queries.spec.ts \
  src/domain/collaboration/callout/callout.resolver.mutations.spec.ts \
  src/services/collaborative-document-integration/collaborative-document-integration.service.spec.ts
```

Expect no matches. Review the replace-document happy-path assertion as well: it must execute, not remain commented out. Finally, the targeted SC-002 and SC-005 tests must show that open, replace, upload, contribution-window, and view-window analytics are all active through the new paths.

### SC-003 — query shape and exception contract

```bash
pnpm vitest run src/services/infrastructure/entity-resolver/community.resolver.service.spec.ts
pnpm vitest run src/domain/collaboration/collabora-document/events/collabora.document.analytics.event.handler.spec.ts
```

Verify both generated owner probes begin at a `collaboraDocumentId` predicate, the contribution path uses two statements, the framing path uses no more than three, and neither path builds the removed space-first OR relation tree. Both unattached and downstream-not-found cases must yield `EntityNotFoundException` with the exact static message `Unable to find Space for CollaboraDocument`, with `collaboraDocumentId` and any resolved `calloutsSetId` in `details`. An unexpected downstream database error must be rethrown unchanged.

The handler spec must also prove that every lookup attempt emits exactly one INFO-level `logger.log` record under `LogContext.COLLABORATION`, on success and failure, with:

```text
message: Collabora document analytics space lookup completed
eventName: <opened|replaced|uploaded event-name constant>
collaboraDocumentId: <event document id>
outcome: success | failure
durationMs: <non-negative number>
```

Do not mock or require an APM transaction in this test. The purpose is to prove the timing signal survives outside request tracing.

### Gates

```bash
pnpm lint          # tsc --noEmit + biome check
pnpm vitest run
```

Both clean before review. Note the pre-commit hook already runs tsc, Biome and the full suite, so a successful commit means these have passed.

FR-010 is confirmed at the same moment: the diff must contain no file under `src/migrations/`, no entity change, and no `schema.graphql` change. If any appears, something has been misunderstood — this feature reads existing columns and adds no surface.

## After deploy

### SC-001 — the transaction returns to its pre-regression band

In Kibana, data view `traces-apm-services`, use this success-only query for the SC-001 sample count and p95:

```text
transaction.name.text: CollaboraEditorUrl and event.outcome: success
```

Observe the first window containing 100 successful transactions after deploy. If fewer than 100 occur within seven days, use all successful samples and record the lower sample count. Expect p95 below one second, matching the pre-regression band. If zero successful samples occur within seven days, SC-001 is **unverified**, not passed; keep wopi-service#29 open and continue collecting until at least one successful sample exists.

Then run the sharper all-outcomes check — the one that showed zero results for the 46 days before the regression. Do not add the success predicate to this query:

```text
transaction.name.text: CollaboraEditorUrl and transaction.duration.us > 5000000
```

Expect no results in that window unless a separately documented platform incident explains them. An exclusion is valid only when the result records a linked incident or change identifier, the exact affected interval, the number of excluded `CollaboraEditorUrl` transactions, and independent evidence that `CalloutsOnCalloutsSetUsingClassification` or another platform signal was affected in the same interval. Report the success-only p95 both before and after exclusions; an undocumented or weakly correlated outlier fails SC-001.

Keep `CalloutsOnCalloutsSetUsingClassification` as the control. It was flat across the regression and should stay flat across the fix; if both move together, something environmental is in play and the reading is not about this change.

### SC-003 — the replacement lookup is cheap in production

In Kibana Discover, use the production application-log data view and search for the stable structured record:

```text
message: "Collabora document analytics space lookup completed" and context: "collaboration"
```

Review the first 20 post-deploy records. If only 1–19 appear within seven days, review all of them and record the reduced count. Every `durationMs` must be below 100 ms; group by `eventName` and inspect `outcome` so failed lookups remain represented. If zero records appear, SC-003 is **unverified**, not passed—investigate logging/ingestion and keep collecting until at least one production sample exists.

Correlated `pg` spans may be used as optional diagnostic detail, but they are not the acceptance signal: the subscriber can outlive the completed GraphQL transaction and existing service instrumentation emits no span without a current transaction. Compare timing records against the recorded figures below, not against a live neighboring span. This work stops calling `getLevelZeroSpaceIdForCommunity` at these sites, so its 9.8 ms span is absent after the fix.

For reference, the pre-fix waterfall (trace `c4a6bf41dcec6ceba4aa3bb5c94889d4`, 2026-07-25, `alkemio-server` 0.159.0, 8,000 ms):

| Span | Duration |
|---|---|
| document fetch + identity + `POST alkemio-wopi-service:8080` | ~47 ms |
| `SELECT FROM (` — the lookup being replaced | **7,917 ms** |
| `SELECT FROM "space"` | 9.8 ms |
| reporter lookups + Elasticsearch write | ~61 ms |

## Results

*Filled in as each check runs. Record what happened, including failures — a criterion that failed is recorded as failed, not reworded.*

Production observations are written to separate evidence files so SC-001 and SC-003 can be evaluated independently and in parallel without concurrent edits to this document.

| Criterion | When | Result |
|---|---|---|
| SC-002 | pre-merge | **Pass (2026-08-12):** the five targeted US1 files passed, 52 tests total in the final tree. The real publisher returned synchronously with a never-settling listener; all three mappings, minimal frozen attribution, persistence ordering, and failure containment assertions passed. |
| SC-004 | pre-merge | **Pass (2026-08-12):** `rg` found no obsolete wide-lookup symbol or Collabora two-call pair. Outside the resolver definition/specs, the new lookup has exactly two callers: the lifecycle handler and the direct window consumer. |
| SC-005 | pre-merge | **Pass (2026-08-12):** handler and direct-consumer specs preserve all five reporter contracts, including the complete contribution/view aggregate payloads and awaited site-4 order. |
| SC-006 | pre-merge | **Pass (2026-08-12):** suppression-residue and disabled-suite searches returned no matches; open, replace, upload, contribution-window, and view-window contracts all execute in the passing suite. |
| SC-001 | post-deploy | [production evidence](./evidence/sc-001-production.md) |
| SC-003 | pre-merge + post-deploy | **Pre-merge pass (2026-08-13):** 96 targeted tests passed across lookup, handler, and direct consumer; query shape/count, exception details, infrastructure-error preservation, and success/failure timing records are covered. [Production evidence](./evidence/sc-003-production.md) remains pending deployment. |

The single-fetch acceptance scenario also passed on 2026-08-12: 27 resolver/service tests proved one relation load for `profile` and `document`, WOPI token issuance from the supplied backing document, and the unchanged missing-relationship error.

Final gates on 2026-08-13: `pnpm lint` passed, and `pnpm vitest run` passed 700 files / 8,031 tests with six files / seven tests skipped for unrelated existing suites. `git diff --check` passed. The final source diff changes no file under `src/migrations/`, no entity mapping, `schema.graphql`, RabbitMQ configuration, dependency manifest, or lockfile. No new code comment contains a spec, feature, PR, or issue identifier.

## Follow-up

Close [server#6356](https://github.com/alkem-io/server/issues/6356) with the proper-fix PR when it merges. Close [wopi-service#29](https://github.com/alkem-io/wopi-service/issues/29) only after SC-001 passes, linking the merged PR and production result. The investigation comment on the WOPI issue already explains why the fix landed in a different repository from the report. SC-003 remains required for feature acceptance but gates neither closure.

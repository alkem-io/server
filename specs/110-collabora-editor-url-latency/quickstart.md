# Quickstart: verifying the collaboraEditorUrl fix

Two of the five success criteria are checkable before merge; two can only be seen against production data; one is a code check. This file records how each is verified and, once run, what it showed.

## Before merge

### SC-002 — the response does not wait on analytics

```bash
pnpm vitest run src/domain/collaboration/collabora-document/collabora.document.resolver.queries.spec.ts
pnpm vitest run src/domain/collaboration/collabora-document/collabora.document.resolver.mutations.spec.ts
pnpm vitest run src/domain/collaboration/callout/callout.resolver.mutations.spec.ts
```

Two tests per site. The first stubs the analytics dependency with a promise that never settles and asserts the resolver resolves anyway. Sanity-check it the way any never-failing test should be checked: restore the `await`, confirm the test times out, then remove it again. A test for this that still passes with the `await` in place is not testing anything.

The second stubs analytics to **reject** and asserts the response is unaffected and nothing escapes. This is the one that defends FR-003: an unhandled rejection terminates the Node process by default, so "the `try`/`catch` is inside the method" needs to be a tested fact rather than a reviewed intention.

### SC-004 — the expensive lookup is gone

```bash
grep -rn "getCommunityForCollaboraDocumentOrFail" src/ ; echo "exit: $?"
```

Expect no matches (exit 1). Then confirm nothing still issues the two-call pair:

```bash
grep -rn "getLevelZeroSpaceIdForCommunity" src/ | grep -i collabora ; echo "exit: $?"
```

Expect no matches. `getLevelZeroSpaceIdForCommunity` itself should still appear elsewhere — room events, whiteboard integration, community service — those callers are unrelated and must survive.

### SC-005 — analytics records are unchanged

Covered by the same three spec files: each asserts the reporter is called with the same method and the same `{ id, name, space }` plus actor context as before. Timestamps and generated ids are excluded.

### Gates

```bash
pnpm lint          # tsc --noEmit + biome check
pnpm vitest run
```

Both clean before review. Note the pre-commit hook already runs tsc, Biome and the full suite, so a successful commit means these have passed.

FR-010 is confirmed at the same moment: the diff must contain no file under `src/migrations/`, no entity change, and no `schema.graphql` change. If any appears, something has been misunderstood — this feature reads existing columns and adds no surface.

## After deploy

### SC-001 — the transaction returns to its pre-regression band

In Kibana, data view `traces-apm-services`:

```text
transaction.name.text: CollaboraEditorUrl
```

Chart the median of `transaction.duration.us` over a window spanning the deploy. Expect the line to drop from its current 1–3 s band to below one second, matching the level it held from 11 May to 26 June 2026.

Then the sharper check — the one that showed zero results for the 46 days before the regression:

```text
transaction.name.text: CollaboraEditorUrl and transaction.duration.us > 5000000
```

Expect no results after the deploy under normal operation.

Keep `CalloutsOnCalloutsSetUsingClassification` as the control. It was flat across the regression and should stay flat across the fix; if both move together, something environmental is in play and the reading is not about this change.

### SC-003 — the replacement lookup is cheap

Take any post-deploy `CollaboraEditorUrl` trace:

1. APM → Services → `alkemio-server` → Transactions → `CollaboraEditorUrl`
2. Open a trace sample and read the waterfall.

Expect the `SELECT` spans attributable to the level-zero space lookup to total tens of milliseconds rather than seconds, and to sit *after* the response-shaping work rather than inside it.

Compare against the two recorded figures below, not against a live neighbouring span: this work stops calling `getLevelZeroSpaceIdForCommunity` at these sites, so the 9.8 ms `SELECT FROM "space"` span is gone from post-fix traces and cannot be used as an in-trace comparator.

For reference, the pre-fix waterfall (trace `c4a6bf41dcec6ceba4aa3bb5c94889d4`, 2026-07-25, `alkemio-server` 0.159.0, 8,000 ms):

| Span | Duration |
|---|---|
| document fetch + identity + `POST alkemio-wopi-service:8080` | ~47 ms |
| `SELECT FROM (` — the lookup being replaced | **7,917 ms** |
| `SELECT FROM "space"` | 9.8 ms |
| reporter lookups + Elasticsearch write | ~61 ms |

## Results

*Filled in as each check runs. Record what happened, including failures — a criterion that failed is recorded as failed, not reworded.*

| Criterion | When | Result |
|---|---|---|
| SC-002 | pre-merge | _pending_ |
| SC-004 | pre-merge | _pending_ |
| SC-005 | pre-merge | _pending_ |
| SC-001 | post-deploy | _pending_ |
| SC-003 | post-deploy | _pending_ |

## Follow-up

Once SC-001 is confirmed, close [wopi-service#29](https://github.com/alkem-io/wopi-service/issues/29) with a link to the merged PR. The investigation comment already there explains why the fix landed in a different repository from the report.

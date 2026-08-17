# Phase 1 Data Model: collaboraEditorUrl latency

**No persisted entity changes. No migration. No DDL.** This work reads existing columns and introduces transient lifecycle-event payloads. This document pins the traversal the new lookup depends on, the invariant that makes it safe, and the event data that crosses the new in-process boundary.

## Entities touched (read-only)

| Entity | Table | What this work reads |
|---|---|---|
| `CalloutFraming` | `callout_framing` | `id`, `collaboraDocumentId` |
| `CalloutContribution` | `callout_contribution` | `id`, `calloutId`, `collaboraDocumentId` |
| `Callout` | `callout` | `id`, `framingId`, `calloutsSetId` |
| `Collaboration` | `collaboration` | `id`, `calloutsSetId` |
| `Space` | `space` | `id`, `collaborationId`, `levelZeroSpaceID` |
| `CollaboraDocument` | `collabora_document` | `id` (the input; the row itself is never loaded by the lookup) |

## Relationships used

```text
                    ┌─ callout_framing.collaboraDocumentId ──┐
collabora_document ─┤                                        ├─→ callout
                    └─ callout_contribution.collaboraDocumentId ─┘
                         (via callout_contribution.calloutId)

callout.calloutsSetId → callouts_set ← collaboration.calloutsSetId
                                              ↑
                                     space.collaborationId
                                              ↓
                                     space.levelZeroSpaceID
```

Both `collaboraDocumentId` columns are declared `@OneToOne` + `@JoinColumn`, which TypeORM materialises as a **unique** constraint and supporting unique index. Each document-to-callout probe starts with one of those selective predicates and returns at most one owner. This does not assume that PostgreSQL automatically indexes every referencing foreign-key column; it does not.

The `callout.framingId` direction matters: `Callout` owns the framing foreign key (`@OneToOne(...) @JoinColumn()` on `Callout.framing`), while `CalloutFraming.callout` is the inverse side and holds no column. So the framing probe goes `callout_framing → callout` by matching `callout.framingId`, not the other way round.

## Invariant the lookup relies on

**A CollaboraDocument is attached through exactly one path** — it is either a callout's framing document or a callout contribution, never both.

Consequences, all load-bearing:

1. The two probes are independent; the first match is authoritative.
2. No precedence rule is needed, and none should be invented.
3. Probe order is a cost choice only. Contribution first, because that is the ordinary attachment: two statements on a match, at most three when framing fallback is required.
4. There is no reconciliation case to handle, and no test for one — a test asserting behaviour for a state the domain forbids would be coverage padding, which the constitution names as forbidden.

This invariant is not enforced by a database constraint. It is a domain property, confirmed with the spec author during clarification. It is written here because the lookup's correctness depends on it, and because a future change that made both attachments possible would silently make the attribution arbitrary.

## Not-found case

A CollaboraDocument that is reachable from neither path has no owning space — templates and knowledge-base documents are the real examples. The lookup raises `EntityNotFoundException`, preserving the type returned by the method it replaces. The lifecycle subscriber and site 4 catch and log it, so no user-visible behavior depends on it.

Per the repo's exception standard, both not-found paths expose the exact static message `Unable to find Space for CollaboraDocument`. The document id and any resolved `calloutsSetId` go in `details`, including when `getLevelZeroSpaceIdForCalloutsSet` reports no space; the delegated not-found method's dynamic message must not escape. Unexpected infrastructure failures propagate unchanged instead of being misclassified as missing ownership.

## Transient lifecycle events

Sites 1–3 publish one of three typed events after their primary work succeeds:

| Event | Meaning | Payload |
|---|---|---|
| `CollaboraDocumentOpened` | An actor requested an editor URL | document `id`, resolved display `name`, `actorAttribution` |
| `CollaboraDocumentReplaced` | An actor replaced the backing file | document `id`, resolved display `name`, `actorAttribution` |
| `CollaboraDocumentUploaded` | An actor imported a document contribution | document `id`, resolved display `name`, `actorAttribution` |

`actorAttribution` is a dedicated transient value with exactly three own fields:

| Field | Type | Rule |
|---|---|---|
| `actorID` | `string` | Copied from the authorized request context; may retain the existing empty-string default. |
| `isAnonymous` | `boolean` | Copied exactly so anonymous attribution remains unchanged. |
| `guestName` | `string \| undefined` | The key is retained even when undefined so the snapshot shape is stable. |

The publisher constructs and shallow-freezes a fresh attribution object, then constructs and freezes the event envelope. Because every retained value is primitive, no deeper copy is required. The payload contains no entities, request-scoped services, credentials, authentication/session timestamps, delegation metadata, or reference to the original `ActorContext`. It is not stored and has no schema or migration impact. The subscriber resolves `space` at handling time and maps the event to the existing reporter method.

## Operational timing record

For each lifecycle event, the subscriber creates one transient structured record around only the level-zero-space lookup. It is not a domain entity and is never persisted by application code.

| Field | Type | Rule |
|---|---|---|
| `message` | string constant | `Collabora document analytics space lookup completed` |
| `eventName` | lifecycle event-name constant | Identifies opened, replaced, or uploaded. |
| `collaboraDocumentId` | string | Same document id carried by the event. |
| `outcome` | `success \| failure` | Records whether the lookup resolved. |
| `durationMs` | non-negative number | Monotonic elapsed time from `performance.now()`. |

The normal failure log remains separate and carries diagnostic error information. The timing record contains no actor attribution.

## State transitions

No persisted entity changes state. The observable sequence becomes: primary operation succeeds → publisher copies/freezes actor attribution and emits a typed lifecycle event → subscriber times and resolves the owning level-zero space → subscriber writes the timing record → subscriber invokes the existing reporter. A failed lookup instead writes a failure timing record plus the existing error log and stops without reporting. Event delivery remains in-process, best-effort, and non-durable.

# Phase 1 Data Model: collaboraEditorUrl latency

**No entity changes. No migration. No DDL.** This work reads existing columns through existing indexes. This document exists to pin the traversal the new lookup depends on, and the invariant that makes it safe.

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

Both `collaboraDocumentId` columns are declared `@OneToOne` + `@JoinColumn`, which TypeORM materialises as a **unique** constraint, hence a unique index. Every hop above is therefore a single-row index seek, not a scan.

The `callout.framingId` direction matters: `Callout` owns the framing foreign key (`@OneToOne(...) @JoinColumn()` on `Callout.framing`), while `CalloutFraming.callout` is the inverse side and holds no column. So the framing probe goes `callout_framing → callout` by matching `callout.framingId`, not the other way round.

## Invariant the lookup relies on

**A CollaboraDocument is attached through exactly one path** — it is either a callout's framing document or a callout contribution, never both.

Consequences, all load-bearing:

1. The two probes are independent; the first match is authoritative.
2. No precedence rule is needed, and none should be invented.
3. Probe order is a cost choice only. Contribution first, because that is the ordinary attachment.
4. There is no reconciliation case to handle, and no test for one — a test asserting behaviour for a state the domain forbids would be coverage padding, which the constitution names as forbidden.

This invariant is not enforced by a database constraint. It is a domain property, confirmed with the spec author during clarification. It is written here because the lookup's correctness depends on it, and because a future change that made both attachments possible would silently make the attribution arbitrary.

## Not-found case

A CollaboraDocument that is reachable from neither path has no owning space — templates and knowledge-base documents are the real examples. The lookup raises `EntityNotFoundException`, exactly as the method it replaces did. This is not an error path this work introduces or changes: all four call sites already catch it and log, and no user-visible behaviour depends on it.

Per the repo's exception standard, the document id goes in the exception's `details` payload, never interpolated into the message.

## State transitions

None. The lookup is a pure read; no entity changes state anywhere in this feature.

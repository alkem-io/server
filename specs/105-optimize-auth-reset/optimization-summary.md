# Optimization Summary: Space Authorization Reset

A stakeholder-facing overview of **what is being optimized** and the **rough data-loading improvement** to expect for a large space.

> Status: the per-entity changes are final (from code analysis). The numbers in the "Expected improvement" table are **illustrative order-of-magnitude estimates** until task T018/T023 replace them with measured figures.

## The core insight

During an authorization reset, the code walks every entity in a space and recomputes its access policy. Investigation found that **every child authorization service re-fetches its own entity by ID and ignores the data its parent already loaded.** So the parent loads were hydrating enormous object graphs (every contribution, document, message room, calendar event, template's inner structure) purely to read an `id` and hand off — then the child loaded it all again.

The optimization removes that waste in two ways, with **no change to the resulting access rules**:

1. **Drop** relations that are never read during policy computation.
2. **Load id-only** (`select: { id }`) for relations that are only iterated to get child IDs (the child re-fetches its own data anyway).
3. **Keep** the small set of relations whose content genuinely drives access (credential chains, states, document owner/tags).

## What was optimized, per entity

| Entity / service | Dropped (never read) | Reduced to id-only (child re-fetches) | Kept (genuinely needed) |
|---|---|---|---|
| **Space** | nested `collaboration.authorization`, `storageAggregator.directStorage.authorization`, `license.authorization` | collaboration, about.profile, profile, storageAggregator, templatesManager, license, subspaces | `authorization.parentAuthorizationPolicy`, `parentSpace.community.roleSet`, `parentSpace.parentSpace`, `community.roleSet`, `account` |
| **Callout** ⭐ | **`contributionDefaults`** (entirely unused) | contributions, classification, framing (+its profiles/whiteboard/memo) | `comments` room (auth-only, **no messages**); `calloutsSet→…→community.roleSet` (DRAFT-callout admin credentials) |
| **CalloutsSet** | — | callouts | — |
| **Contribution** | — (already optimized via `select`) | optional: pass `post.id` not full object | existing minimal `select` projections |
| **Community** | — | communication.updates, groups | roleSet |
| **Storage Aggregator** ⭐ | **`directStorage.documents.tagset`** (duplicate enumeration of all documents) | directStorage | — (documents + tagset are loaded once, legitimately, by the bucket/document services) |
| **Template** (L0) ⭐ | `callout.framing.profile`, `callout.framing.whiteboard.profile`, `callout.framing.memo`, `callout.contributionDefaults`, `whiteboard`, `contentSpace.authorization`, `communityGuidelines.profile` | callout, contentSpace, profile, communityGuidelines | — |
| **Templates Manager / Set** | redundant `.authorization` on templateDefaults & templatesSet | templateDefaults, templatesSet, templates | — |
| **Timeline / Calendar** | — | calendar, calendar.events | — |
| **Innovation Flow** | — | profile | states (iterated & mutated) |

⭐ = highest-impact reductions.

## Where the big wins are

For a large space the dominant memory cost was holding, all at once, a single hydrated object tree containing:

- **Every contribution fully loaded twice** — once in the callout-level `contributions: true` (with its post/whiteboard/profile/comments graph) and again when each contribution service re-fetched itself. The callout-level copy is now id-only.
- **Every stored document + tagset enumerated at the aggregator** *and* again at the bucket. The aggregator copy is dropped.
- **Every template's inner callout framing/whiteboard/profile graph** (L0 spaces) — dropped; only IDs are needed.
- **Unused `contributionDefaults`** on every callout — dropped.

## Expected improvement for a large space (rough, illustrative)

Illustrative "large space": ~500 spaces in the hierarchy, ~30 callouts/space (~15,000 callouts), ~40 contributions/callout (~600,000 contributions), ~80 documents/space (~40,000 documents), ~40 calendar events/space (~20,000 events), ~60 L0 templates.

This estimates **rows pulled into the heavy in-memory object graph** (the thing that drives peak memory / OOM), not total query count.

| Source | Before (rows hydrated, heavy) | After | Rough reduction |
|---|---|---|---|
| Contributions at callout level (full graph, then re-fetched) | ~600k full contributions **+** their post/profile/comments/whiteboard rows (≈1–2M rows) | ~600k **id-only** scalars | ~10–20× lighter for this segment |
| `contributionDefaults` (per callout) | ~15k rows | 0 (dropped) | eliminated |
| Callout `framing` profiles | ~45k rows | id-only | ~large |
| Storage documents + tagsets at aggregator | ~80k rows (duplicate of bucket load) | 0 at aggregator (dropped) | eliminated |
| Template inner framing/whiteboard/profile graph | ~hundreds–thousands | 0 (dropped) | eliminated |
| Calendar events at timeline | ~20k full | id-only | ~large |
| Credential chains (roleSet, states, etc.) | small | unchanged (kept) | — |

**Headline (illustrative):** the peak hydrated object graph shrinks from **~millions of fully-loaded rows held simultaneously** to **~hundreds of thousands of id-level references**, roughly a **5–20× reduction in data volume hydrated at peak** — enough to move the largest spaces from "fails with out-of-memory" to "completes within the container memory limit, under 5 minutes."

**Caveats:**
- These are order-of-magnitude estimates to set expectations, **not** a benchmark. Real figures come from the before/after measurement in tasks T018 (single large space) and T023 (scaling comparison).
- The change primarily reduces **peak memory and redundant hydration**, which is the OOM driver. Total query *count* is not the focus (each visited entity is still re-fetched once by its own service); if wall-clock time remains a problem after this, batching out the N+1 re-fetch is the deferred next lever (research.md).
- Access rules are unchanged and are pinned by the permanent equivalence regression test (FR-011).

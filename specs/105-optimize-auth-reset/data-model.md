# Phase 1 Data Model: Optimize Space Authorization Reset

**No database schema changes. No migrations.** This feature only changes *how much* of the existing model is loaded into memory during an authorization reset. This document specifies, per entity/service, the **minimal relation set** that each `applyAuthorizationPolicy` is permitted to load. It is the data contract that implementation and the equivalence test enforce.

Notation per relation:
- **load(content)** — load the relation; its content is read during policy computation.
- **load(id-only)** — load with `select: { id: true }` + `loadEagerRelations: false`; only `.id` is consumed (child re-fetches its own data).
- **drop** — must NOT be loaded.
- **auth-only** — load `select: { id: true, authorization: { ... } }`; only the policy is read.

Every entity below also loads its own `authorization` (the policy being recomputed). That is implied and omitted from the tables.

## Space (`space.service.authorization.ts`)

| Relation | Required load | Reason | Status |
|---|---|---|---|
| `authorization.parentAuthorizationPolicy` | load(content) | inheritance source | keep |
| `parentSpace.community.roleSet` | load(content) | parent admin credential rules | keep |
| `parentSpace.parentSpace` | load(content) | L2 ancestor logic | keep |
| `community.roleSet` | load(content) | space member credential rules (read directly, lines 187/481/504) | keep |
| `account` | load(content) | `account.id` used in credential rule | keep |
| `subspaces` | load(rows) | recursion target; re-fetched per subspace | already minimal |
| `collaboration` | `collaboration: true` | collaboration service re-fetches by id | ✅ TRIMMED (dropped nested `.authorization`) |
| `about.profile` | load(rows) | about service re-fetches by id; profile only in guard | already minimal |
| `profile` | load(rows) | profile service re-fetches by id | already minimal |
| `storageAggregator` | `storageAggregator: true` | aggregator service re-fetches by id | ✅ TRIMMED (dropped `.authorization` + `directStorage.authorization`) |
| `templatesManager` | load(rows) | passed by id; re-fetches | already minimal |
| `license` (+ `.authorization`) | **load(content) — KEEP** | ⚠️ CORRECTION: license service CONSUMES `license.authorization` (`license.service.authorization.ts:11-26`, takes the object, does NOT re-fetch). Do NOT trim. | keep |

## Community (`community.service.authorization.ts`)

| Relation | Required load | Reason |
|---|---|---|
| `roleSet` | load(content) | credential rules |
| `communication.updates` | load(id-only) | child re-fetches |
| `groups` | load(id-only) | iterated for ids; child re-fetches |

## Collaboration (`collaboration.service.authorization.ts`)

Delegates to CalloutsSet, InnovationFlow, Timeline, License — all id-only (children re-fetch). Keep only what its own body reads.

## CalloutsSet (`callouts.set.service.authorization.ts`)

| Relation | Required load | Reason |
|---|---|---|
| `callouts` | load(id-only) | iterated for ids; Callout service re-fetches |

## Callout (`callout.service.authorization.ts`)

| Relation | Required load | Reason |
|---|---|---|
| `comments` (Room) | auth-only | only `comments.authorization` read; **no messages** |
| `calloutsSet → collaboration → space → community → roleSet` | load(content) | **credential derivation for DRAFT callouts — must keep** |
| `contributions` | load(id-only) | iterated for ids; child re-fetches |
| `classification` | load(id-only) | only id passed |
| `framing` (+ profile/whiteboard.profile/memo.profile) | load(id-only) | framing child re-fetches by id |
| `contributionDefaults` | **keep (id-only)** | ⚠️ CORRECTION: it IS read — the init guard at `callout.service.authorization.ts:82` throws if absent. Do NOT drop; at most reduce to id-only. |

## Callout Contribution (`callout.contribution.service.authorization.ts`)

Already minimal via `select`. Retain current projections:
- `post` → `{ id, createdBy, authorization, profile{id}, comments{id, authorization} }` (auth-only on comments room)
- `whiteboard`, `memo`, `collaboraDocument` → `{ id }`
- `link` → `{ id, authorization, profile{id} }`

Optional cleanup: pass `post.id` instead of the full `post` object to PostAuthorizationService (harmless either way).

## Storage Aggregator (`storage.aggregator.service.authorization.ts`)

| Relation | Required load | Reason |
|---|---|---|
| `directStorage` | **keep** | passed to StorageBucket service |
| `directStorage.documents.tagset` | **KEEP — do NOT drop** | ⚠️ CORRECTION: the StorageBucket auth service does **not** re-fetch. It reads `storageBucket.documents` from the passed object (`storage.bucket.service.authorization.ts:26,51`) and passes each full document (with tagset) to the Document service, which reads `tagset`/`createdBy`. Dropping this load throws `RelationshipNotFoundException`. |

> The earlier "every child re-fetches" assumption is FALSE for the storage subtree. The aggregator is the loader for the whole bucket→document→tagset chain. This subtree is **out of scope** for trimming unless the bucket service is refactored to re-fetch.

## Templates Manager / Set / Template (L0 spaces only)

| Service | Relation | Required load | Reason |
|---|---|---|---|
| TemplatesManager | `templateDefaults` | load(id-only) | child re-fetches |
| TemplatesManager | `templateDefaults.authorization` | drop | unused here |
| TemplatesManager | `templatesSet` | load(id-only) | child re-fetches |
| TemplatesManager | `templatesSet.authorization` | drop | unused here |
| TemplatesSet | `templates` | load(id-only) | iterated for ids; child re-fetches |
| Template | `profile` | load(id-only) | child re-fetches |
| Template | `communityGuidelines` | load(id-only) | child re-fetches |
| Template | `communityGuidelines.profile` | **drop** | never read |
| Template | `callout` | load(id-only) | only `callout.id` passed |
| Template | `callout.framing.profile` / `framing.whiteboard.profile` / `framing.memo` / `contributionDefaults` | **drop** | never read |
| Template | `whiteboard` | **drop** | only id used |
| Template | `contentSpace` | load(id-only) | only id passed |
| Template | `contentSpace.authorization` | **drop** | never read |

## Innovation Flow (`innovation.flow.service.authorization.ts`)

| Relation | Required load | Reason |
|---|---|---|
| `states` | load(content) | iterated; `state.authorization` mutated |
| `profile` | load(id-only) | child re-fetches |

## Timeline / Calendar

| Service | Relation | Required load | Reason |
|---|---|---|---|
| Timeline | `calendar` | load(id-only) | Calendar service re-fetches |
| Calendar | `events` | load(id-only) | iterated for ids; Event service re-fetches |

## Invariants the equivalence test must hold

- For every entity above, the computed `authorization` (its credential rules + privilege rules, after recompute) MUST equal the policy produced by the pre-optimization load, given identical input state.
- Coverage invariant: every entity type listed above is still visited and saved (no entity silently skipped because its parent stopped loading it) — id-only loads preserve iteration; drops apply only to relations never iterated for delegation.

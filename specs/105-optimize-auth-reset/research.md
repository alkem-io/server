# Phase 0 Research: Optimize Space Authorization Reset

This document consolidates a code-level investigation of every authorization service touched by a space reset, the data each loads, and what is actually consumed. All NEEDS CLARIFICATION items from the plan's Technical Context are resolved here.

## Decision 1 — Optimization strategy: trim loads to id-only + drop unread relations

**Decision**: Reduce each `applyAuthorizationPolicy` TypeORM load to: (a) the entity's own `authorization` (+ `parentAuthorizationPolicy` where read), (b) relations whose *content* is genuinely read during policy computation, and (c) `select: { id: true }` (with `loadEagerRelations: false`) for relations that are only iterated to obtain child IDs for delegation. Drop relations never read.

**Rationale**: The dominant finding (below) is that **every child authorization service re-fetches its entity by ID and ignores the pre-loaded relations passed by its parent.** The parent's deep relation trees therefore hydrate large object graphs purely to read `.id`. Trimming to id-only/needed-only:
- preserves computed policies exactly (children re-fetch their own data → behavior identical, satisfies FR-004/SC-002);
- collapses the peak in-memory object graph (addresses OOM, SC-003);
- is the simplest viable change (Constitution Principle 10) with no schema/API impact.

**Alternatives considered**:
- *Batch-load children to remove the N+1 re-fetch.* Would further cut wall-clock time but is a larger, riskier re-architecture of the cascade and is speculative until trimming is measured. **Deferred** — revisit only if SC-004 (<5 min) is not met after trimming.
- *Add a feature flag / dual loading path.* Rejected per clarification (replace outright; equivalence test de-risks; avoids dual-path debt and Principle 9 env-toggle concerns).
- *Add `select` projections everywhere including credential chains.* Unnecessary; the credential-deriving chains are small and genuinely needed — leave them as relation loads.

## Decision 2 — Equivalence verification mechanism

**Decision**: Add a permanent automated regression check (Vitest) that computes authorization policies for a representative space fixture covering all in-scope entity types, serializes the resulting policies (credential rules + privilege rules per entity), and asserts equality against a captured baseline. Run before/after the trim to prove zero diff.

**Rationale**: FR-011 / clarification requires permanent protection against silent access drift on a security-sensitive path. Risk-based testing (Principle 6) justifies one high-signal test over many superficial ones.

**Alternatives considered**: one-time manual validation (rejected — no guard against future drift); manual spot-check (rejected — lowest assurance).

## Decision 3 — Inline optimization comments

**Decision**: Each trimmed load gets a short inline comment stating what is intentionally not loaded and why (e.g. `// auth-only: child re-fetches; do not hydrate contributions content`).

**Rationale**: Constitution Principle 5 mandates an inline comment explaining the chosen optimization on performance-sensitive queries. Also prevents a future contributor from "helpfully" re-adding the heavy relations.

---

## Per-service load analysis (evidence)

Legend: **KEEP** = content read, load required · **ID-ONLY** = only `.id` used (child re-fetches) → `select: { id: true }` · **DROP** = never read.

### Space — `src/domain/space/space/space.service.authorization.ts`

| Loaded relation | Verdict | Notes |
|---|---|---|
| `authorization.parentAuthorizationPolicy` | KEEP | stored/inherited |
| `parentSpace.community.roleSet` | KEEP | parent admin credential rules |
| `parentSpace.parentSpace` | KEEP | L2 parent logic |
| `community.roleSet` | KEEP | space member credential rules |
| `account` | KEEP | `account.id` used in credential rule |
| `subspaces` | ID-ONLY | iterated for IDs; each subspace re-fetched in recursion |
| `collaboration` (+`.authorization`) | ID-ONLY / DROP `.authorization` | child re-fetches; `.authorization` never read here |
| `about.profile` | ID-ONLY | child re-fetches |
| `profile` | ID-ONLY | child re-fetches |
| `storageAggregator` (+`directStorage.authorization`) | ID-ONLY / DROP nested auth | child re-fetches |
| `templatesManager` | ID-ONLY | child re-fetches |
| `license` (+`.authorization`) | ID-ONLY / DROP `.authorization` | child re-fetches |

### Callout — `src/domain/collaboration/callout/callout.service.authorization.ts`

| Loaded relation | Verdict | Notes |
|---|---|---|
| `authorization` | KEEP | core self-policy |
| `comments` (Room) | KEEP (auth-only) | only `comments.authorization` read; Room **messages never loaded/needed** (confirmed in `room.service.authorization.ts`) — load `select: { id, authorization }` |
| `calloutsSet→collaboration→space→community→roleSet` | **KEEP** | **critical**: `getCredentialsForRoleWithParents(space.community.roleSet, ADMIN)` derives DRAFT-callout admin credentials — genuine policy input, not just inheritance |
| `contributions` | ID-ONLY | full objects loaded, only `.id` passed to child which re-fetches |
| `classification` | ID-ONLY | only `.id` passed |
| `framing{profile,whiteboard.profile,memo.profile}` | ID-ONLY | child framing service **re-fetches by id**, ignores passed object & profiles |
| `contributionDefaults` | **DROP** | never accessed anywhere in the method body |

### Callout Contribution — `callout-contribution/callout.contribution.service.authorization.ts`

Already well-optimized with `select` projections (`post.profile → {id}`, `post.comments → {id, authorization}`, `whiteboard/memo/collaboraDocument → {id}`). Only minor redundancy: the full `post` object is passed to PostAuthorizationService which re-fetches by id — harmless, optional cleanup. **No heavy content is loaded here.**

### Community — `community/community.service.authorization.ts`

| Loaded relation | Verdict |
|---|---|
| `roleSet` | KEEP (credential rules) |
| `communication.updates` | ID-ONLY (child re-fetches) |
| `groups` | ID-ONLY (iterated for IDs; child re-fetches) |

### Storage Aggregator — `storage/storage-aggregator/storage.aggregator.service.authorization.ts`

| Loaded relation | Verdict |
|---|---|
| `authorization` | KEEP |
| `directStorage` | ID-ONLY (child StorageBucket service re-fetches) |
| `directStorage.documents.tagset` | **DROP** | documents+tagsets enumerated here but never read at aggregator level; StorageBucket re-fetches its own documents |

> Note: `document.service.authorization.ts` legitimately reads `tagset` and `createdBy` — those stay, loaded by the Document service itself, not the aggregator.

### Templates (L0 only) — biggest cleanup

`templates-manager` / `templates-set`: drop redundant `.authorization` on `templateDefaults`/`templatesSet` (children re-fetch).

`template/template.service.authorization.ts` — **major waste**, all of the following are loaded but only `.id` is passed to children that re-fetch:
- `callout.framing.profile`, `callout.framing.whiteboard.profile`, `callout.framing.memo`, `callout.contributionDefaults` → **DROP** (load `callout` as `{ id }`)
- `whiteboard` (entire relation) → **DROP** (only id used)
- `contentSpace.authorization` → **DROP**
- `communityGuidelines.profile` → **DROP** (deeply nested, never read)
- `profile` → ID-ONLY

### Timeline / Calendar — `timeline/{timeline,calendar}/*.service.authorization.ts`

| Loaded relation | Verdict |
|---|---|
| `calendar` | ID-ONLY (Calendar service re-fetches) |
| `calendar.events` | KEEP at Calendar level (iterated, passed to Event service) — but Event service re-fetches, so calendar can pass `events` as `{ id }` |

### Innovation Flow — `collaboration/innovation-flow/innovation.flow.service.authorization.ts`

| Loaded relation | Verdict |
|---|---|
| `states` | KEEP (iterated, `state.authorization` mutated directly) |
| `profile` | ID-ONLY (child re-fetches) |

---

## ⚠️ Corrections found during implementation (reading real code)

Two claims above were proven WRONG when verified against the actual source during `/speckit-implement`. The "every child re-fetches" premise is **not universal** — verify per service before trimming.

1. **`callout.contributionDefaults` is NOT "never accessed"** — it is read by the initialization guard `callout.service.authorization.ts:82` (`!callout.contributionDefaults` throws). Do not drop; at most id-only.
2. **Storage `documents.tagset` is NOT waste** — the StorageBucket auth service does not re-fetch; it consumes `storageBucket.documents` from the object the aggregator loaded (`storage.bucket.service.authorization.ts:26,51-54`) and passes full documents to the Document service. Dropping the aggregator load breaks the cascade. Storage subtree is out of scope for trimming.

**Verified-safe trims applied** (child positively confirmed to re-fetch by id):
- Callout `framing` deep-load → `framing: true` (framing service re-fetches by id, `callout.framing.service.authorization.ts:36`).
- Template `callout` deep-load → `callout: true` (callout service re-fetches by id).
- Template `contentSpace.authorization` → `contentSpace: true` (content-space service re-fetches by id).

## Cross-cutting findings

1. **Re-fetch pattern is COMMON BUT NOT UNIVERSAL**: most child auth services call `getXOrFail(input.id, { relations })` internally (so id-only trimming is safe), **but storage is a counterexample** (bucket/document services consume the parent-loaded objects). Each service must be individually verified before trimming.
2. **No existing "load authorizations only" helper**: the common persistence path is `AuthorizationPolicyService.save()/saveAll()`. There is no shared id+authorization projection helper today; per-service `select`/`relations` trimming is the established mechanism (the Contribution service already does it well — use it as the reference pattern).
3. **Rooms are pure policy containers in the auth context** — never load messages/members.
4. **Genuinely-needed deep chain**: `callout … space.community.roleSet` for credential derivation — must be retained.

## Open items deferred to planning/implementation

- Whether to also pass `.id` only (not the full object) into child services where the parent currently passes the whole entity. Low value (children re-fetch regardless) — optional cleanup, not required for the memory win.
- Batched child loading to cut N+1 re-fetch time — deferred; only pursue if <5 min target (SC-004) is missed after trimming.

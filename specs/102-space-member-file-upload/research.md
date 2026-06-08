# Phase 0 Research: Space Member File Upload for Callout Creation

This feature is authorization-only. Research focused on how the platform's
credential-based authorization computes write access to a Space's shared storage, how
the analogous "members may create callouts/subspaces" capability is already granted,
and where a gated grant should be injected so it is correctly scoped.

## Which storage bucket is the Space's shared storage for callout creation

- **Decision**: The Space-level bucket that stages new callout content is the **Space
  profile's storage bucket**, reached via `space → profile → storageBucket`
  (`space.profile.storageBucket`). The member file-upload grant targets *this* bucket
  and no other.
- **Rationale**: The Space profile's storage bucket is the Space's own document store.
  It is the semantically correct "Space storage" for content that belongs to the Space
  before a callout exists. Granting upload here keeps the capability tightly scoped to
  one bucket the Space owns directly.
- **Correction of an earlier assumption** *(this supersedes the first implementation)*:
  - The first cut granted upload on the **storage aggregator's `directStorage`**
    bucket (`space.storageAggregator.directStorage`). That bucket is **not** the
    create-callout upload target for spaces — only the platform and account storage
    configs use `directStorageBucket`. Grant removed.
  - The client's `SpaceStorageConfig` query currently resolves the upload target to
    the **About profile's** bucket (`space.about.profile.storageBucket`). That is the
    *wrong* bucket — uploading Space-level callout content into the About (description)
    storage makes no semantic sense. The server grant is therefore **not** placed on
    the About profile; the client must be corrected to point at
    `space.profile.storageBucket`. *(Client change tracked separately.)*

## How storage upload is authorized today

- **Decision**: Keep the existing upload authorization check unchanged; widen *who
  satisfies it* by adjusting the computed authorization policy on the Space's shared
  storage.
- **Rationale**: The file-upload mutation authorizes against a `FILE_UPLOAD`
  capability on the *target* storage. That capability is derived, by an existing
  privilege-mapping rule on every storage bucket, from holding the "contribute" or
  "update" capability on that same bucket. A Space's shared storage inherits its
  cascading rules from the Space's authorization policy, where members are granted
  read-level visibility but not contribute/update — hence no file-upload. Granting
  the capability through the standard policy computation keeps the single,
  centralized authorization check as the only enforcement point (Constitution
  Principle 8).
- **Alternatives considered**:
  - *Special-case the upload mutation for "temporary" uploads* — rejected: couples
    the storage resolver to callout-creation semantics, splits enforcement into a
    second code path, and the spec explicitly wants the ability for non-temporary
    uploads too.
  - *Grant members contribute/update broadly on the Space* — rejected: over-broad;
    would cascade unrelated write capabilities across the whole Space subtree.

## Which capability to grant

- **Decision**: Grant the **file-upload** capability directly to the eligible actors
  on the Space's shared storage (not the broader "contribute" capability).
- **Rationale**: It is the minimal, self-documenting expression of the intent ("allow
  file upload to members"). It does not depend on the bucket's contribute→upload
  mapping remaining as-is, and it introduces no other capability on the storage.
- **Alternatives considered**: granting "contribute" (which maps to file-upload via
  the existing bucket rule) — functionally equivalent today, but less explicit and
  semantically broader than required.

## Which actors receive the grant

- **Decision**: The same actor set that may create callouts — Space members, plus
  parent-space members where the Space's configuration extends membership rights to
  them. Reuse the existing helper the Space authorization service already uses to
  derive that set for the "members may create subspaces" grant.
- **Rationale**: Keeps "may create a callout" and "may upload the callout's files"
  consistent (FR-004). Reusing the established helper avoids divergence and matches
  the proven subspace-creation pattern.
- **Alternatives considered**: members-only (ignores inherited membership) — rejected
  as it would re-introduce the same mid-flow failure for inherited members.

## Where and when to inject the grant (scoping)

- **Decision**: Compute the gated rule in the **Space authorization service** (which
  owns the Space settings and member criteria) and pass it as a cascading credential
  rule into the **Space profile authorization** step
  (`profileAuthorizationService.applyAuthorizationPolicy(space.profile.id, …, rules)`),
  so it reaches `space.profile.storageBucket`. Gate strictly on the "members may
  create callouts" setting.
- **Rationale**: Each Space (including each subspace) computes its own authorization
  from its own settings and owns its own profile storage, so injecting at this point
  yields correct per-Space scoping (FR-005) with no leakage across spaces. The Space
  profile authorization reset only touches that Space's own profile subtree, whose
  only `FILE_UPLOAD`-relevant node is its storage bucket, so the cascade stays scoped
  to exactly the target bucket. The `profileAuthorizationService` already accepts a
  `credentialRulesFromParent` argument, so no service signature change is needed.
- **Alternatives considered**:
  - *Pass the rule into the storage-aggregator authorization step* (the first
    implementation) — rejected: lands on `directStorage`, which the create-callout
    flow does not use for spaces.
  - *Pass the rule into the Space About authorization step* — rejected: lands on
    `space.about.profile.storageBucket`, the About/description storage, which is not
    the correct home for Space-level callout content.
  - *Append the rule to the Space's top-level policy with cascade* — rejected:
    cascades everywhere in the Space subtree, not just the Space profile storage.

## Effectivity / rollout

- **Decision**: Rely on the platform's existing authorization-reset mechanism; the
  grant becomes effective for a Space when its authorization is next recomputed.
- **Rationale**: Consistent with how every other policy change propagates; no bespoke
  migration or backfill. Document in quickstart that existing spaces need a reset to
  pick up the change (FR-008, SC-004).
- **Alternatives considered**: a one-off data migration to rewrite policies —
  rejected as unnecessary and contrary to the reset-driven design.

## Open questions

None. The single design decision (which actors receive the grant) is resolved by
tying it to the existing setting and reusing the established subspace-creation
criteria helper.

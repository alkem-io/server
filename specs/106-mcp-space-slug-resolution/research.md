# Research — MCP space slug resolution (retrospec)

## D1 — Accept nameIDs in the tool rather than surfacing UUIDs in listings

**Decision**: make `create_whiteboard_in_space` (and `analyze_contributions`)
resolve top-level nameIDs, instead of first fixing `list_whiteboards` to return
space UUIDs.

**Rationale**: the identifiers the model actually holds are slugs — whiteboard
URLs embed them, and profile display names often equal them. Accepting the slug
fixes every current and future prompt path at the resolution seam; populating
`context.spaceId` in listings helps only clients that read that field. (Both are
worth having; the listing fix is tracked in the assistant hardening epics.) The
incident proved the model behaves correctly given the data it has — the platform
refused its own identifier.

**Alternative rejected**: *prompt the assistant to always search for the UUID
first* — prompt-level patches for a contract-level gap; other MCP clients
(external, #1912/workspace#008) share the same tool surface.

## D2 — nameID resolution is top-level (L0) only

**Decision**: a non-UUID resolves via `getSpaceByNameIdOrFail` (L0-scoped);
subspaces require their UUID.

**Rationale**: `space` nameIDs have **no global unique index** — uniqueness is
app-enforced per level-zero scope (see the actor/space migration comments), so
two parents can each own a subspace `my-challenge`. A bare subspace slug is
genuinely ambiguous; resolving "first match" would be a correctness bug worse
than refusal. Verified during review (finding REFUTED as a defect precisely
because the restriction is deliberate and documented in schema + description +
error).

## D3 — Policy lives on SpaceLookupService, not in tools

**Decision**: `getSpaceByIdOrNameIdOrFail` on `SpaceLookupService` is the single
home; tools call it.

**Rationale**: review found the same UUID-only failure in a sibling tool with a
*silent-empty* failure mode — proof the policy drifts when inlined per-tool.
`getSpacesById` already resolved the id-or-nameID union for arrays but without
the L0-only-slug rule, so a new dedicated method (not reuse of `getSpacesById`)
keeps the level semantics explicit.

**Convention note**: `isUUID` from class-validator (used by user-lookup,
virtual-contributor-lookup, storage-aggregator resolver) replaces the initial
`uuid.validate` import — verified behaviorally identical for all realistic
inputs (nameIDs ≤ 25 chars can never parse as 36-char UUIDs); pure consistency.

## D4 — Options-merge hardening in the same PR

**Decision**: fix `getSpaceByNameIdOrFail` / `getSubspaceByNameIdInLevelZeroSpace`
to spread caller options **before** the identifying `where` constraints.

**Rationale**: the PR made `getSpaceByNameIdOrFail` a production dependency of a
model-facing path; review showed a caller-supplied `options.where` would have
silently replaced the `{nameID, level}` filter (returning an arbitrary space).
Latent today (the new call passes only `relations`) — but the safe order is what
the sibling `getSpace` already used, so the inconsistency was a trap with no
upside.

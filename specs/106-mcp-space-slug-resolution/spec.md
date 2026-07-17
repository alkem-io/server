# Feature Specification: MCP tools resolve spaces by nameID (URL slug), not only UUID

**Feature Branch**: `fix/mcp-create-whiteboard-accepts-nameid`

**Created**: 2026-07-03

**Status**: Backfilled (retroactive) — shipped, then spec'd (PR #6218 → `release/65`, merged `9228428d5`)

**Input**: "The assistant asked a user which space to create a whiteboard in, the user answered, the
user approved the confirmation — and the write failed with `Space not found: zimbabve`. `zimbabve`
was the space's real nameID: the model passed the only identifier it could obtain (listings and
whiteboard URLs carry the slug, and `list_whiteboards` returns no space UUID), but the tool resolved
UUID-only, despite its own description saying 'resolve the space id from a name'."

> **⚠️ Retroactive backfill.** Written **after** the fix shipped (live acceptance failure,
> 2026-07-02). Single-repo (server only) — one PR, so **not** a workspace vertical spec; the
> sibling cross-repo work of the same incident window is `workspace#008-external-mcp-access`.
> Landed on `release/65`; reaches `develop` via the release merge-back.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - "Create a whiteboard in space X" works with the identifier the model has (Priority: P1)

A user asks an MCP client (the assistant) to create a whiteboard in a space they name. The model
resolves the space from what the platform gave it — usually the URL slug — and the creation
succeeds. The user never sees a "not found" error for a space that plainly exists.

**Why this priority**: The failure fired **after** the user approved the write — the worst moment:
trust in the confirmation gate is spent on an error. And the documented happy path ("resolve it from
a name") was impossible: no tool output carries the space UUID.

**Independent Test**: Call `create_whiteboard_in_space` with a top-level space's nameID (slug) as
`spaceId` → the whiteboard is created in that space; with the space UUID → identical behavior.

**Acceptance Scenarios**:

1. **Given** a top-level space with nameID `my-space`, **When** the tool is called with
   `spaceId: "my-space"`, **Then** the whiteboard-framing callout is created on that space's
   CalloutsSet.
2. **Given** a space UUID (any level, including subspaces), **When** the tool is called with it,
   **Then** behavior is unchanged from before this fix.
3. **Given** an unresolvable value, **When** the tool is called, **Then** the error names exactly
   what is accepted (UUID any level; top-level nameID; subspaces require UUID).

---

### User Story 2 - `analyze_contributions` never silently returns an empty set for a slug (Priority: P1)

A model scopes a contribution analysis to a space (`scope: "space:{id}"`) using a slug. It gets
either real results (slug resolved) or an explicit error naming what's accepted — never a silent
empty result set that reads as "this space has no contributions".

**Why this priority**: Surfaced by the review of the P1 fix: the same UUID-only matching existed
here, but **worse** — a slug produced no error at all, just an empty result. A silently-wrong
analysis is more damaging than a refused one.

**Independent Test**: Call `analyze_contributions` with `scope: "space:<slug>"` of a contributing
space → results are returned; with an unresolvable value → an explicit guidance error.

**Acceptance Scenarios**:

1. **Given** a top-level space slug in the scope, **When** the analysis runs, **Then** it resolves
   to the space's UUID and returns that space's contributions.
2. **Given** an unresolvable scope value, **When** the analysis runs, **Then** an explicit
   "Space not found … Pass a space/subspace UUID, or a top-level space nameID" error is returned —
   never an empty success.

---

### User Story 3 - One home for the id-or-nameID policy (Priority: P2)

The next tool (or resolver) that accepts a model-supplied space identifier calls one shared lookup
method and inherits the policy — UUID any level, nameID top-level-only — instead of re-deriving the
branch and drifting.

**Why this priority**: Two tools already diverged (one refused slugs, one silently returned
nothing). Policy drift across a growing MCP tool surface is the root disease; the per-tool fixes
are symptoms.

**Independent Test**: `SpaceLookupService.getSpaceByIdOrNameIdOrFail` routes a UUID to the by-id
lookup and anything else to the top-level nameID lookup; both consuming tools call it.

**Acceptance Scenarios**:

1. **Given** a UUID, **When** the shared resolver runs, **Then** it resolves by id (any level) and
   the nameID path is not consulted.
2. **Given** a non-UUID, **When** the shared resolver runs, **Then** it resolves as a top-level
   nameID or throws the standard not-found.

---

### Edge Cases

- **Subspace slugs are deliberately NOT resolvable**: space nameIDs are only unique within their
  level-zero space (no global unique index — uniqueness is enforced by app logic per L0 scope), so a
  bare subspace slug is genuinely ambiguous. Subspaces require the UUID; every description/error
  says so.
- **A nameID can never collide with a UUID**: nameIDs are `[a-zA-Z0-9-]`, max 25 chars; UUIDs are 36
  chars — the dispatch is unambiguous.
- **Caller-supplied lookup options can't weaken the filter**: the nameID lookups merge caller
  options *before* the `nameID`/`level` constraints, so a passed `where` can never clobber the
  guard (hardened in the same PR for `getSpaceByNameIdOrFail` and
  `getSubspaceByNameIdInLevelZeroSpace`).
- **Authorization unchanged**: resolution only locates the space/CalloutsSet; the mutation path
  (`createCalloutOnCalloutsSet`) still enforces `CREATE_CALLOUT` exactly as GraphQL does.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: `create_whiteboard_in_space` MUST accept a space/subspace UUID **or** a top-level
  space nameID as `spaceId`, and its schema/description MUST state exactly that.
- **FR-002**: `analyze_contributions` MUST resolve a `space:{id}` scope through the same policy and
  MUST return an explicit error (never a silent empty set) when the value is unresolvable.
- **FR-003**: The id-or-nameID policy MUST live in a single shared lookup method
  (`SpaceLookupService.getSpaceByIdOrNameIdOrFail`), consumed by every model-facing tool that takes
  a space identifier.
- **FR-004**: UUID detection MUST use the codebase-standard validator (`isUUID`, class-validator) —
  one convention across all id-or-nameID branches.
- **FR-005**: Not-found errors on model-facing tools MUST name what is accepted so the model can
  self-correct instead of dead-ending.
- **FR-006**: nameID lookups MUST be robust to caller-supplied find options (options merged before
  the identifying `where` constraints).

### Success Criteria

- **SC-001**: The live acceptance failure ("Space not found: zimbabve" after user approval) cannot
  recur: that exact input now creates the whiteboard.
- **SC-002**: A slug-scoped `analyze_contributions` returns either real results or an explicit
  error — 0 silent-empty responses for unresolvable scopes.
- **SC-003**: Full suite green (178 passed incl. new lookup routing, where-safety, and tool
  resolution specs); biome + tsc clean.

## Assumptions

- `list_whiteboards` still does not populate its declared `context.spaceId`; slug resolution makes
  the identifiers the model *does* have work. Populating the UUID is a follow-up (assistant
  hardening epics #1948–#1952 scope).
- Making subspace slugs resolvable would require a parent-space parameter or path-based resolution —
  out of scope; UUID covers subspaces.

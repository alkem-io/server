# Tasks: MCP space slug resolution (retrospec — all complete)

**PR**: #6218 → `release/65` (merged `9228428d5`, 2026-07-03). Two commits: the
scoped fix, then the review pass (multi-agent /review findings applied pre-merge).

## US1 — create_whiteboard_in_space accepts UUID or top-level nameID

- [X] T001 [US1] Route `spaceId` through the shared resolver in
  `src/services/mcp-server/tools/create-whiteboard-in-space.tool.ts`
  (`getSpaceByIdOrNameIdOrFail` with the CalloutsSet relations) (FR-001, FR-003).
- [X] T002 [US1] Update the tool description + `spaceId` schema description
  (UUID any level / top-level nameID / subspaces need UUID) and the not-found
  error to name what's accepted (FR-001, FR-005).
- [X] T003 [US1] New spec `create-whiteboard-in-space.tool.spec.ts`: UUID and
  slug both resolve via the shared method; unresolvable → guidance error, no
  mutation call.

## US2 — analyze_contributions resolves slugs, never silent-empty

- [X] T004 [US2] Inject `SpaceLookupService` into
  `src/services/mcp-server/tools/contributions-analyze.tool.ts`; resolve the
  `space:` scope id-or-nameID to the UUID before querying; unresolvable →
  explicit guidance error (FR-002, FR-005).
- [X] T005 [US2] Extend the `scope` schema description to state a top-level
  nameID / URL slug is accepted.

## US3 — one home for the policy

- [X] T006 [US3] Add `SpaceLookupService.getSpaceByIdOrNameIdOrFail` in
  `src/domain/space/space.lookup/space.lookup.service.ts` — `isUUID`
  (class-validator, the codebase convention) → `getSpaceOrFail`; else
  `getSpaceByNameIdOrFail` (L0-only, documented why: subspace nameIDs are not
  globally unique) (FR-003, FR-004).
- [X] T007 [US3] Harden `getSpaceByNameIdOrFail` +
  `getSubspaceByNameIdInLevelZeroSpace`: merge caller options BEFORE the
  identifying `where` constraints so a caller-supplied `where` can never clobber
  the nameID/level guard; drop the dead doubled `if (!space)` (FR-006).
- [X] T008 [US3] Lookup-service specs: UUID→by-id routing, non-UUID→nameID
  routing, where-clause safety (`space.lookup.service.spec.ts`).

## Exit gates

- [X] G01 `pnpm vitest run src/services/mcp-server src/domain/space/space.lookup`
  — 178 passed (19 files)
- [X] G02 biome + `tsc --noEmit` clean
- [X] G03 Multi-agent `/review` (8 finder angles → 1-vote verify): 2 CONFIRMED +
  4 PLAUSIBLE findings, all applied pre-merge (US2 and US3 exist because of it)
- [X] G04 Team-merged to `release/65`; develop receives it via release merge-back

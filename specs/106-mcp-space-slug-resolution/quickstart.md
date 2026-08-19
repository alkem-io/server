# Quickstart — MCP space slug resolution (spec 106)

## What it does

Model-facing MCP tools that take a space identifier now accept a **top-level
space nameID (URL slug)** as well as a UUID; the id-or-nameID policy lives in
one shared resolver. No config, no env, no schema/migration changes (the MCP
tool *descriptions* changed — an LLM-facing contract, not a wire contract).

## How to verify

```bash
# Against a running host with an mcp_ key (session established):
# 1. Slug create — previously "Space not found":
tools/call create_whiteboard_in_space {"spaceId":"<top-level-slug>","displayName":"Test"}
#    → created:true, callout + whiteboard ids, URL.
# 2. UUID create — unchanged behavior (works for subspaces too).
# 3. Slug analysis — previously a SILENT EMPTY result:
tools/call analyze_contributions {"scope":"space:<top-level-slug>"}
#    → real results; an unresolvable value → explicit guidance error.

# Unit level:
pnpm vitest run src/services/mcp-server src/domain/space/space.lookup   # 178 passed
```

## Files changed (PR #6218, merged 9228428d5 → release/65)

| File | Change |
|------|--------|
| `src/domain/space/space.lookup/space.lookup.service.ts` | + `getSpaceByIdOrNameIdOrFail` (isUUID dispatch, L0-only slugs); options-merge hardening on both nameID lookups; dead double-check removed |
| `src/domain/space/space.lookup/space.lookup.service.spec.ts` | routing + where-safety specs |
| `src/services/mcp-server/tools/create-whiteboard-in-space.tool.ts` | shared resolver; schema/description/error name what's accepted |
| `src/services/mcp-server/tools/create-whiteboard-in-space.tool.spec.ts` | new — resolution behavior |
| `src/services/mcp-server/tools/contributions-analyze.tool.ts` | `space:` scope resolves id-or-nameID; explicit error replaces silent-empty |

# Tasks: MCP Content Search + Tool-Call Hardening

**Input**: Design documents from `/specs/102-mcp-content-search-hardening/`
**Status**: Implemented (retrospec) — all tasks complete (`[X]`); code shipped in
commits `600207fe2` and `f219e2351` on branch `mcp-server`.

## Format: `[ID] [P?] [Story] Description`

All paths are under `src/services/mcp-server/`.

---

## Phase 1: Foundational (single-source registration)

**Purpose**: Collapse the duplicate registry so tools have one source of truth —
prerequisite for both stories.

- [X] T001 [US2] Add `MCP_TOOL` and `MCP_RESOURCE_PROVIDER` DI tokens in `dto/mcp.types.ts`
- [X] T002 [US2] Rewrite `tools/tool.registry.ts` to inject `@Inject(MCP_TOOL) McpTool[]` and index by name (dedupe with warning); drop manual `register()`
- [X] T003 [US2] Rewrite `resources/resource.registry.ts` to inject `@Inject(MCP_RESOURCE_PROVIDER) McpResourceProvider[]`; drop manual `register()`
- [X] T004 [US2] In `mcp-server.module.ts`, define single `TOOL_PROVIDERS` / `RESOURCE_PROVIDERS` arrays, spread into providers, and feed `useFactory` aggregators bound to the tokens; remove the constructor + `onModuleInit` wiring
- [X] T005 [US2] In `mcp-server.service.ts`, remove the duplicate `tools`/`resourceProviders` maps and `register*` methods; delegate `getTool*`/`getResource*` to the registries

---

## Phase 2: User Story 1 — Content search (P1)

- [X] T010 [US1] Add `search_content` tool in `tools/search-content.tool.ts`: delegate to `SearchService.search({terms, filters}, actorContext)` across all `SearchCategory` values
- [X] T011 [US1] Flatten the multi-category result set and map each hit to `{type, id (actionable entity id), displayName, score, spaceId, calloutId, uri}`, ordered by score
- [X] T012 [US1] Cap terms (≤5) and clamp `limit` (1–25); reject empty/whitespace query; return a graceful `isError` result when search throws (ES unavailable)
- [X] T013 [US1] Wire `SearchModule` + `SearchContentTool` into `mcp-server.module.ts` (via `TOOL_PROVIDERS`)
- [X] T014 [US1] Correct the tool description + JSDoc: indexed surface = profile text, post bodies, memo content, and whiteboard scene (Excalidraw) text

---

## Phase 3: User Story 2 — Validation + scope enforcement (P2)

- [X] T020 [US2] Add `mcp-tool-args.validator.ts` (`McpToolArgsValidator`): ajv, compiled-validator cache per tool, validates args against the tool's `inputSchema`, returns a specific error string
- [X] T021 [US2] Add pure `auth/mcp-scope.ts` (`scopeViolation(scopes, required)`): no-scopes → allow; `spaceIds` → fail closed; require `read`/`tools` operation
- [X] T022 [US2] In `mcp-server.service.ts` `tools/call` handler: enforce `scopeViolation(..., 'tools')` then validate args before `execute`
- [X] T023 [US2] In `mcp-server.service.ts` `resources/read` handler: enforce `scopeViolation(..., 'read')`
- [X] T024 [US2] Thread API-key scopes: `auth/mcp-api-key.strategy.ts` stashes `validatedKey.scopes` on the request; `mcp-server.controller.ts` forwards them to `handleRequest`; service stores them per `McpSession` and reads via closure (updated on re-auth)

---

## Phase 4: Tests & verification

- [X] T030 [P] [US2] Unit tests for `scopeViolation` in `auth/mcp-scope.spec.ts` (allow/deny/empty-ops/multi-entry/spaceIds-fail-closed)
- [X] T031 [P] [US2] Unit tests for `McpToolArgsValidator` in `mcp-tool-args.validator.spec.ts` (valid/missing-required/wrong-type/undefined-args/cache)
- [X] T032 [US1][US2] Verify via local MCP handshake: `tools/list` (9 tools), invalid-args rejection, authorized call, ES-disabled graceful degradation
- [X] T033 [US1][US2] `pnpm lint` (tsc + biome) clean; full Vitest suite green (pre-commit gate)

---

## Dependencies

- Phase 1 (single registry) precedes Phases 2–3 (both rely on the registry the
  service delegates to).
- US1 and US2 are otherwise independent and were delivered together.

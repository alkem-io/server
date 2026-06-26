# Tasks: MCP Server (foundation)

**Input**: Design documents from `/specs/101-mcp-server/`
**Status**: Implemented (retrospec) — all tasks complete (`[X]`); code shipped on
branch `mcp-server` (commits `a185f7066`, `0c9a1d6d6`, `daaa90b10`, `eedfd2c00`).
All paths under `src/services/mcp-server/` unless noted.

## Format: `[ID] [P?] [Story] Description`

---

## Phase 1: Foundational — host, transport, framework

- [X] T001 Create the `McpServerModule` (NestJS) wiring controller, service, auth, registries, tools, resources — `mcp-server.module.ts`
- [X] T002 [US1] Implement the host service with the MCP SDK: register `tools/list`, `tools/call`, `resources/list`, `resources/read` handlers — `mcp-server.service.ts`
- [X] T003 [US1] Per-session isolation: one `McpServer` + `StreamableHTTPServerTransport` per session keyed by `mcp-session-id`; capture identity by closure (commit `daaa90b10`) — `mcp-server.service.ts`
- [X] T004 [US1] Expose the HTTP endpoint `@Controller('/rest/mcp')` handling all MCP methods — `mcp-server.controller.ts`
- [X] T005 Define the framework contracts: `McpTool`, `McpToolDefinition`, `McpToolResult`, `McpResourceProvider`, `McpResourceDefinition`, `McpApiKeyScope`, `MCP_CONSTANTS` — `dto/mcp.types.ts`
- [X] T006 Define MCP config shape + defaults (`enabled` off, `api_key_enabled` on, SSE, rate limit, response cap) — `mcp-server.config.ts` + `@src/types/alkemio.config`
- [X] T007 Tool & resource registries — `tools/tool.registry.ts`, `resources/resource.registry.ts` (later hardened in spec 102)

---

## Phase 2: User Story 2 — authentication & API keys (P1)

- [X] T010 [US2] `McpApiKey` entity (table `mcp_api_key`): hashed key, name, userId, scopes jsonb, expiry, last-used, isActive — `auth/mcp-api-key.entity.ts`
- [X] T011 [US2] Database migration creating `mcp_api_key` — `src/migrations/*`
- [X] T012 [US2] `McpApiKeyService`: generate (`mcp_<base64url>`), hash (sha256), create (plaintext once), validate (hash + active + expiry), updateLastUsed, revoke (soft), list — `auth/mcp-api-key.service.ts`
- [X] T013 [US2] Passport strategy resolving a valid key to the owner's `ActorContext`; anonymous fallback when disabled/absent/invalid — `auth/mcp-api-key.strategy.ts`
- [X] T014 [US2] Multi-strategy guard: MCP API key → Ory JWT → Ory API token → anonymous — `auth/mcp-auth.guard.ts`
- [X] T015 [US2] API-key management REST endpoints (create / list / revoke) under `/rest/mcp/api-keys` — `mcp-server.controller.ts`

---

## Phase 3: User Story 1 — read tools (P1)

- [X] T020 [P] [US1] `list_whiteboards` — discover accessible whiteboards — `tools/whiteboard-list.tool.ts`
- [X] T021 [P] [US1] `analyze_whiteboard` — summary/elements/text/structure/semantic over Excalidraw scene — `tools/whiteboard-analyze.tool.ts`
- [X] T022 [P] [US1] `analyze_contributions` — own / callout / space scope, READ-filtered — `tools/contributions-analyze.tool.ts`
- [X] T023 [P] [US1] `community_activity_summary` — activity across member spaces — `tools/community-activity-summary.tool.ts` (+ `.spec`)
- [X] T024 [P] [US1] `navigate_templates` — list/search/details across innovation packs — `tools/template-navigator.tool.ts` (+ `.spec`)

---

## Phase 4: User Story 3 — write tools (P2)

- [X] T030 [US3] `create_whiteboard` — create a whiteboard contribution on a callout (enforces CONTRIBUTE) — `tools/create-whiteboard.tool.ts`
- [X] T031 [US3] `update_whiteboard_content` — replace a whiteboard's scene (enforces UPDATE_CONTENT; notes RT-collab overwrite caveat) — `tools/update-whiteboard-content.tool.ts`

---

## Phase 5: User Story 4 — resources (P2)

- [X] T040 [P] [US4] Whiteboard resource provider — `alkemio://whiteboards/{id}` — `resources/whiteboard.resource.ts`
- [X] T041 [P] [US4] Callout resource provider — `alkemio://callouts/{id}` (embeds whiteboard URIs) — `resources/callout.resource.ts`
- [X] T042 [P] [US4] Space resource provider — `alkemio://spaces/{id}` (embeds subspace URIs) — `resources/space.resource.ts`

---

## Phase 6: User Story 5 — safe operation (P3)

- [X] T050 [US5] Master `mcp.enabled` switch (default off) enforced before handling any request — `mcp-server.service.ts`
- [X] T051 [US5] `analyze_audit_log` — PLATFORM_ADMIN-gated, email-redacting security audit tool — `tools/audit-log-analyze.tool.ts` (+ `.spec`) (commit `0c9a1d6d6`)
- [X] T052 [US5] Rate-limit + response-cap config defaults — `mcp-server.config.ts`

---

## Known follow-ups (tracked in research.md, not part of this foundation)

- [X] R1 Enforce resource-read authorization in the `resources/read` path — `McpServerService.readResource()` checks `getAuthorizationPolicy` via `isAccessGranted(READ)` (+ `mcp-server.service.spec.ts`)
- [ ] R2 Route direct-repository read tools through domain services
- [ ] R4 Confirm rate-limit / response-cap enforcement on every tool path

(These are open items surfaced by the retrospec — left unchecked deliberately.)

## Dependencies

- Phase 1 (host + framework) precedes everything.
- Phase 2 (auth) precedes any non-anonymous use.
- Phases 3–6 are independent capability slices on top of 1–2.

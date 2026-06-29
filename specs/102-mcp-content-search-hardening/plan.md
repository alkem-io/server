# Implementation Plan: MCP Content Search + Tool-Call Hardening

**Branch**: `mcp-server` | **Date**: 2026-05-31 | **Spec**: [spec.md](./spec.md)
**Status**: Implemented (retrospec)

## Summary

Two cohesive improvements to the in-process MCP server (`src/services/mcp-server`):

1. **Content search tool** (`search_content`) — delegates to the platform
   `SearchService` (Elasticsearch-backed, ACL-scoped via `ActorContext`),
   flattens the multi-category result set, and maps each hit to an actionable
   `{type, id, displayName, score, spaceId, calloutId, uri}`. The tool's
   description reflects what `SearchIngestService` actually indexes: profile
   text, post bodies, memo content, and whiteboard Excalidraw scene text.

2. **Tool-call hardening** —
   - **Single-source registry**: `McpServerService` no longer keeps its own
     tool/resource maps or `register*` methods; it delegates to `ToolRegistry` /
     `ResourceRegistry`. Tools are declared once in a `TOOL_PROVIDERS` array
     that is both spread into module providers and fed to a `useFactory`
     aggregator (`MCP_TOOL` / `MCP_RESOURCE_PROVIDER` tokens) which the
     registries inject. (NestJS has no Angular-style multi-provider.)
   - **Input validation**: `McpToolArgsValidator` (ajv, compiled-validator cache
     per tool) validates `tools/call` arguments against the tool's declared JSON
     Schema before execution.
   - **Scope enforcement**: pure `scopeViolation(scopes, required)` gates the
     dispatcher — `tools/call` requires `tools`, resource reads require `read`,
     `spaceIds` fails closed. Scopes are threaded
     strategy → request → controller → per-session and read by closure in the
     SDK handlers.

## Technical Context

- **Language/Runtime**: TypeScript 5.3 / Node.js 22 (NestJS 10).
- **MCP**: `@modelcontextprotocol/sdk` (Streamable HTTP transport, per-session
  `McpServer`).
- **Validation**: `ajv` ^8 (already a dependency).
- **Search**: platform `SearchService` + `SearchIngestService` (Elasticsearch).
- **Auth**: `McpAuthGuard` (MCP API key → Ory JWT → Ory API token), `ActorContext`.
- **Testing**: Vitest. New unit specs for the pure scope function and the
  validator.

## Affected repo

- `server` only (single-repo). Hosted at `/rest/mcp`. No GraphQL schema change,
  no migration.

## Constitution Check

| Principle | Verdict | Notes |
|-----------|---------|-------|
| 1. Domain-Centric Design First | PASS | `search_content` embeds no business logic — it delegates to `SearchService`; tools are thin adapters. |
| 2. Modular NestJS Boundaries | PASS | One MCP module; the duplicate registry was collapsed to a single source of truth; no circular deps; aggregator via DI. |
| 3. GraphQL Schema as Stable Contract | N/A | No GraphQL surface changed. |
| 4. Explicit Data & Event Flow | PASS | Read-only search delegates to the domain service; no ad-hoc data shaping beyond presentation mapping; no resolver-level writes. |
| 5. Observability & Operational Readiness | PASS | Tool calls, scope denials, and search failures log with `LogContext.MCP_SERVER`; ES-absent path is a clear error, not a silent failure. |
| 6. Code Quality with Pragmatic Testing | PASS | Pure units (`scopeViolation`, `McpToolArgsValidator`) extracted and unit-tested; no superficial/placeholder tests. |
| 7. API Consistency & Evolution Discipline | N/A | No GraphQL naming surface; MCP tool naming is snake_case per MCP convention. |
| 8. Secure-by-Design Integration | PASS | All tool input traverses centralized ajv validation; authorization via key scopes + `ActorContext` ACL; `spaceIds` fails closed; no secrets logged. |
| 9. Container & Deployment Determinism | N/A | No image/config-bootstrap change. |
| 10. Simplicity & Incremental Hardening | PASS | Removed duplicated registration paths; added the minimal validation/scope seams; deferred (not faked) per-space enforcement. |

No deviations to track.

## Project Structure (files changed)

```
src/services/mcp-server/
├── dto/mcp.types.ts                      # + MCP_TOOL / MCP_RESOURCE_PROVIDER tokens
├── mcp-server.module.ts                  # TOOL_PROVIDERS/RESOURCE_PROVIDERS + useFactory aggregators
├── mcp-server.service.ts                 # delegate to registries; validation + scope in dispatcher; scopes per session
├── mcp-server.controller.ts              # forward API-key scopes to the service
├── mcp-tool-args.validator.ts            # NEW — ajv validator (cached per tool)
├── mcp-tool-args.validator.spec.ts       # NEW — unit tests
├── auth/
│   ├── mcp-scope.ts                       # NEW — pure scopeViolation()
│   ├── mcp-scope.spec.ts                  # NEW — unit tests
│   └── mcp-api-key.strategy.ts            # stash validated key scopes on the request
├── resources/resource.registry.ts        # inject MCP_RESOURCE_PROVIDER[]; single source of truth
└── tools/
    ├── tool.registry.ts                   # inject MCP_TOOL[]; single source of truth
    └── search-content.tool.ts             # NEW — search_content tool
```

## Verification performed

- `pnpm lint` (tsc --noEmit + biome over 2948 files): clean.
- Full Vitest suite green (pre-commit gate); MCP specs: scope (7) + validator (5)
  + existing tool specs pass.
- Live: MCP handshake → `tools/list` (9 tools) → invalid args rejected →
  authorized call passes → ES-disabled degrades gracefully.

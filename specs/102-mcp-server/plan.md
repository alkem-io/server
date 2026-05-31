# Implementation Plan: MCP Server (foundation)

**Branch**: `mcp-server` | **Date**: 2026-05-31 | **Spec**: [spec.md](./spec.md)
**Status**: Implemented (retrospec)

## Summary

An in-process NestJS module (`src/services/mcp-server`) that exposes the platform
as an MCP surface at `/rest/mcp`: a per-session Streamable-HTTP host, a
multi-strategy auth layer (dedicated hashed API keys + Ory fallback), a
pluggable tool/resource framework, and an initial capability set (8 tools + 3
resource providers). Decisions and rationale are in [research.md](./research.md);
the one new entity is in [data-model.md](./data-model.md).

## Technical Context

- **Language/Runtime**: TypeScript 5.3 / Node.js 22, NestJS 10.
- **MCP**: `@modelcontextprotocol/sdk` — `StreamableHTTPServerTransport`
  (`enableJsonResponse: true`), one `McpServer` per session keyed on
  `mcp-session-id`.
- **Auth**: Passport custom strategy + `McpAuthGuard` (MCP key → Ory JWT → Ory
  API token → anonymous); `ActorContext` for the resolved identity.
- **Persistence**: TypeORM; one new table `mcp_api_key` (+ migration).
- **Domain reuse**: `WhiteboardService`, `CalloutResolverMutations`,
  `Space/Collaboration/Template/Activity` services, `AuthorizationService`,
  `PlatformAuthorizationPolicyService`, plus some direct repositories.
- **Config**: `mcp.*` keys (enabled off by default; api-key toggle; SSE; rate
  limit; response cap).

## Affected repo

- `server` only (single-repo, in-process host). No GraphQL schema change. One
  additive DB migration (`mcp_api_key`).

## Constitution Check

| Principle | Verdict | Notes |
|-----------|---------|-------|
| 1. Domain-Centric Design First | PARTIAL | Most tools delegate to domain services; some read tools query repositories/`EntityManager` directly and `create_whiteboard` calls the resolver-mutations layer (research.md R2/R3). No business logic embedded in the host. |
| 2. Modular NestJS Boundaries | PASS | Single cohesive `McpServerModule`; no circular deps. (Registration duplication that existed here was resolved in spec 101.) |
| 3. GraphQL Schema as Stable Contract | N/A | No GraphQL surface changed. |
| 4. Explicit Data & Event Flow | PARTIAL | Reads go through services/repositories; the one write reuses the existing mutation path (so validation→authz→op holds). Direct-repo reads noted (R2). |
| 5. Observability & Operational Readiness | PASS | `LogContext.MCP_SERVER` throughout; auth outcomes, tool calls, session lifecycle logged; disabled-state and not-found are explicit, not silent. |
| 6. Code Quality with Pragmatic Testing | PASS | Unit specs for several tools; risk-based. (Scope/arg-validation tests added in 101.) |
| 7. API Consistency & Evolution Discipline | N/A | MCP tool names follow MCP snake_case convention; no GraphQL naming surface. |
| 8. Secure-by-Design Integration | PARTIAL | Strong: hashed keys, scopes, expiry, revocation; admin gate + PII redaction on the audit tool; secrets never logged; default-off. Gap: resource-read authorization may not be enforced at read time (research.md R1) — must be closed to fully satisfy this principle for resources. |
| 9. Container & Deployment Determinism | N/A | No image/bootstrap change; config via config service. |
| 10. Simplicity & Incremental Hardening | PASS | Small pluggable units; surface ships disabled and bounded; deferred (not faked) per-space scoping. |

## Complexity Tracking / deviations

| Item | Why it exists | Follow-up |
|------|---------------|-----------|
| R1: resource-read authz not enforced in read path | Providers expose `getAuthorizationPolicy` but the dispatcher doesn't evaluate it | Enforce policy (or have `read()` check `ActorContext`) — closes Secure-by-Design for resources |
| R2: direct repository/`EntityManager` reads in some tools | Expedient data access for analysis tools | Route through domain services |
| R3: `create_whiteboard` → `CalloutResolverMutations` | Reuse the proven mutation + its permission checks | Consider a domain-service entry point |

## Project Structure (files)

```
src/services/mcp-server/
├── mcp-server.module.ts            # module wiring
├── mcp-server.service.ts           # host: per-session McpServer + transport; request handlers
├── mcp-server.controller.ts        # /rest/mcp endpoint + /rest/mcp/api-keys management
├── mcp-server.config.ts            # config shape + defaults
├── dto/mcp.types.ts                # McpTool / McpResourceProvider / definitions / scope / constants
├── auth/
│   ├── mcp-api-key.entity.ts        # mcp_api_key entity
│   ├── mcp-api-key.service.ts       # generate/hash/validate/revoke/list
│   ├── mcp-api-key.strategy.ts      # key → ActorContext (owner)
│   └── mcp-auth.guard.ts            # MCP key → Ory JWT → Ory token → anonymous
├── tools/
│   ├── tool.registry.ts
│   ├── whiteboard-list.tool.ts      ├── whiteboard-analyze.tool.ts
│   ├── create-whiteboard.tool.ts    ├── update-whiteboard-content.tool.ts
│   ├── contributions-analyze.tool.ts ├── community-activity-summary.tool.ts (+spec)
│   ├── template-navigator.tool.ts (+spec)  └── audit-log-analyze.tool.ts (+spec)
└── resources/
    ├── resource.registry.ts
    └── whiteboard.resource.ts / callout.resource.ts / space.resource.ts
+ src/migrations/*  # create mcp_api_key
```

## Relationship to other specs

- **101** (`specs/101-mcp-content-search-hardening/`) — the increment on this
  foundation: `search_content` + single-source registry + arg validation +
  scope enforcement.
- **workspace 004** (`004-web-ai-assistant`) — a dedicated agent service as the
  MCP *client* of this surface, fronting the web client.

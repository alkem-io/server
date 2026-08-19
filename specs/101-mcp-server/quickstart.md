# Quickstart: MCP Server

What it is, how to turn it on, and how to verify it — for the foundation
documented in this spec. Hosted in-process by `server` at `/rest/mcp`.

## Enable it

The surface ships **disabled**. Enable via config (env-backed `alkemio.yml`):

| Config | Default | Purpose |
|--------|---------|---------|
| `mcp.enabled` | `false` | Master switch — all requests refused when off. |
| `mcp.api_key_enabled` | `true` | Allow MCP API-key auth (Ory JWT/token still work regardless). |
| `mcp.sse.heartbeat_interval_ms` | `30000` | SSE keepalive. |
| `mcp.sse.connection_timeout_ms` | `300000` | SSE idle timeout. |
| `mcp.rate_limit.requests_per_minute` | `100` | Per-key request budget. |
| `mcp.resources.max_response_items` | `100` | Response item cap. |

Elasticsearch must be configured for `search_content` (the 102 increment); the
rest of the surface works without it.

## Mint an API key (acts as you)

As an authenticated platform user:

```
POST /rest/mcp/api-keys      { "name": "...", "scopes": [{ "operations": ["read","tools"] }], "expiresInDays": 30 }
GET  /rest/mcp/api-keys      # list your keys (no plaintext)
DELETE /rest/mcp/api-keys/:id  # revoke (soft)
```

The plaintext `apiKey` (`mcp_…`) is returned **once** on creation — store it; it
is irrecoverable. Default scope if omitted: `read` only.

## Connect (MCP Streamable-HTTP handshake)

1. `initialize` (no session header) → response carries an `mcp-session-id` header.
2. Subsequent calls send `mcp-session-id: <id>`.

Auth on every call via any one of: `X-MCP-API-Key: mcp_…`, `Authorization:
Bearer mcp_…`, `?apiKey=mcp_…`, or a normal platform session token.

```bash
# initialize → capture session id
curl -sD - -o /dev/null -X POST $URL/rest/mcp \
  -H 'Content-Type: application/json' -H 'Accept: application/json, text/event-stream' \
  -H 'X-MCP-API-Key: mcp_…' \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"x","version":"0"}}}'

# list tools / call a tool (reuse the session id)
… "method":"tools/list" …
… "method":"tools/call","params":{"name":"analyze_whiteboard","arguments":{"whiteboardId":"<id>"}} …

# read a resource
… "method":"resources/read","params":{"uri":"alkemio://spaces/<id>"} …
```

## Capability surface (foundation)

**Tools** — read: `list_whiteboards`, `analyze_whiteboard`, `analyze_contributions`,
`community_activity_summary`, `navigate_templates`, `analyze_audit_log`
(platform-admin only); write: `create_whiteboard`, `update_whiteboard_content`.
(`search_content` is added by spec 102.)

**Resources** — `alkemio://whiteboards/{id}`, `alkemio://callouts/{id}`,
`alkemio://spaces/{id}`.

## Verify

- Disabled by default: with `mcp.enabled=false`, any request is refused.
- Identity: a key acts as its owner; a revoked/expired key authenticates as
  anonymous.
- Permissions: tools/resources only return what the identity may read; writes
  need contribute/update permission.
- Admin gate: `analyze_audit_log` returns nothing to non-admins and redacts
  emails to domain.

## Files (foundation)

| Area | Files |
|------|-------|
| Host/transport/session | `mcp-server.module.ts`, `mcp-server.service.ts`, `mcp-server.controller.ts` |
| Framework + config | `dto/mcp.types.ts`, `mcp-server.config.ts`, `tools/tool.registry.ts`, `resources/resource.registry.ts` |
| Auth | `auth/mcp-api-key.entity.ts`, `auth/mcp-api-key.service.ts`, `auth/mcp-api-key.strategy.ts`, `auth/mcp-auth.guard.ts`, migration |
| Tools | `tools/{whiteboard-list,whiteboard-analyze,create-whiteboard,update-whiteboard-content,contributions-analyze,community-activity-summary,template-navigator,audit-log-analyze}.tool.ts` |
| Resources | `resources/{whiteboard,callout,space}.resource.ts` |

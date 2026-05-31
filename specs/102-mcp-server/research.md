# Research & Decisions: MCP Server (foundation)

Retrospective decision record reconstructed from the implementation on the
`mcp-server` branch. Each entry: decision → rationale → alternatives considered.

## D1 — Expose platform capabilities via MCP (Model Context Protocol)

**Decision**: Provide an MCP endpoint so AI agents invoke platform capabilities
as curated, described, schema-validated *tools* (and read entities as
*resources*).

**Rationale**: MCP is the emerging agent↔tool standard; it gives an LLM a small,
self-describing, LLM-shaped surface rather than the full GraphQL API. Tool
definitions carry JSON-Schema input contracts the model can consume directly.

**Alternatives**: (a) Let agents call GraphQL directly — rejected: too large and
un-curated for an LLM, and not tool-shaped. (b) A bespoke REST "AI API" —
rejected: reinvents MCP without ecosystem compatibility (Claude Desktop, etc.).

## D2 — Host the MCP server in-process in the platform `server`

**Decision**: Implement the host as a NestJS module (`src/services/mcp-server`)
inside the existing server, exposed at `/rest/mcp`.

**Rationale**: Tools/resources need the domain services, authorization, and
`ActorContext` that already live in the server. In-process reuse avoids a
network hop and a parallel auth stack.

**Alternatives**: A standalone MCP service — rejected for the host (it would have
to re-reach the server for everything). Note the *clients* are separate
(external agents; the planned `assistant-service`); only the host is in-process.

## D3 — Streamable-HTTP transport with a per-session server instance

**Decision**: Use the MCP SDK `StreamableHTTPServerTransport` with
`enableJsonResponse: true`; create a dedicated `McpServer` + transport per
client session, keyed by the `mcp-session-id` header; capture the session's
identity by closure in the request handlers.

**Rationale**: The SDK `Server` binds to exactly one transport, so a shared
server breaks the moment a second session initializes. Per-session instances
also prevent identity bleed: concurrent users can never read each other's
`ActorContext`. (This was a deliberate fix — commit `daaa90b10`, "per-session
McpServer + ActorContext".) JSON responses keep the HTTP interaction simple for
stateless-style clients.

**Alternatives**: A single shared server — rejected (transport binding + identity
bleed). Pure SSE streaming — JSON responses chosen for simpler request/response.

## D4 — Dedicated, hashed, scoped API keys + platform-session fallback

**Decision**: Authenticate via `McpAuthGuard`, trying in order: MCP API key →
Ory JWT → Ory API token, falling back to anonymous. API keys are random
(`mcp_<base64url(32 bytes)>`), stored only as SHA-256 hashes, user-owned,
scoped, optionally expiring, soft-revocable, with last-used tracking. A
validated key resolves to an `ActorContext` for the **key's owning user** (no
shared service account).

**Rationale**: Agents need a credential that is least-privilege, revocable, and
never exposes the user's real login. Hashing means a DB leak doesn't expose
usable keys. Acting as the owner means existing ACLs apply unchanged. Accepting
platform sessions lets a logged-in caller use the surface without minting a key.

**Alternatives**: Reuse only Ory tokens — kept as a fallback, but dedicated keys
add scoping, expiry, and revocation independent of the user's session. A shared
service identity — rejected (breaks per-user ACL and auditability).

## D5 — Pluggable tool & resource framework

**Decision**: A `McpTool` interface (`getDefinition()` + `execute(args,
actorContext)`) and a `McpResourceProvider` interface (`getResourceDefinitions`,
`matches`, `getAuthorizationPolicy`, `read`), each collected by a registry the
host reads from.

**Rationale**: New capabilities are added as small, independently-testable units
without touching the transport/session core.

**Note**: The original registration wiring was duplicated (a separate map in the
host *and* a registry) and required manual `register()` calls — this was
**hardened in the 101 increment** (single source of truth via a DI aggregator).

## D6 — Reuse platform authorization via `ActorContext`

**Decision**: Tools receive the session `ActorContext` and check the same
privileges the platform uses (`READ`, `CONTRIBUTE`, `UPDATE_CONTENT`,
`PLATFORM_ADMIN`) before reading/acting.

**Rationale**: One authorization model; no parallel permission logic to drift.

## D7 — Safety configuration

**Decision**: Config gates — `mcp.enabled` (master switch, **default off**),
`mcp.api_key_enabled` (default on), SSE heartbeat/timeout, per-key
`rate_limit.requests_per_minute` (100), `resources.max_response_items` (100).

**Rationale**: A new external surface ships disabled by default and bounded by
rate/size limits.

## D8 — Sensitive tools gated + PII-redacting

**Decision**: `analyze_audit_log` hard-requires `PLATFORM_ADMIN` and redacts
email addresses to domain only.

**Rationale**: Security audit data is admin-only and must not leak PII into an
LLM context.

---

## Known gaps / risks surfaced by this retrospec

These are honest observations from reading the code; they are **not** changes
made here, but should be tracked.

- **R1 — Resource read authorization may not be enforced at read time.** Each
  resource provider exposes `getAuthorizationPolicy(uri)`, but the host's
  `resources/read` handler appears to call `provider.read(uri, actorContext)`
  **without** evaluating that policy, and the providers' `read()` do not use the
  passed `ActorContext`. If the underlying `get*OrFail` lookups don't enforce
  read access, resources could be readable beyond the identity's permissions.
  **Action**: verify and, if confirmed, enforce the authorization policy in the
  read path (this directly backs FR-005/FR-009/SC-005 for resources).
- **R2 — Some read tools query repositories/`EntityManager` directly** (e.g.
  contributions analysis, template navigation, whiteboard listing) rather than
  going through domain services — a mild deviation from the domain-centric /
  explicit-data-flow principles. They do filter by `READ` authorization, so it
  is a structure concern, not (by itself) a security one.
- **R3 — `create_whiteboard` calls the resolver-mutations layer**
  (`CalloutResolverMutations`) from a tool. It correctly inherits the mutation's
  permission checks, but couples the tool to the API layer rather than a domain
  service.
- **R4 — Rate limiting / response caps are configured but enforcement coverage
  is unverified** in this retrospec; confirm they are applied on every tool path.

## References

- 101 increment (search + dispatch hardening): `specs/101-mcp-content-search-hardening/`
- Forward client feature: workspace `specs/004-web-ai-assistant/`

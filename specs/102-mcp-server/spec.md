# Feature Specification: MCP Server (platform tool & resource surface)

**Feature Branch**: `mcp-server`

**Created**: 2026-05-31

**Status**: Implemented (retrospec)

**Input**: Retrospec from existing code (commits `a185f7066`, `0c9a1d6d6`, `daaa90b10`, `eedfd2c00`)

> **Retrospec — foundation.** This documents the MCP server *foundation*: the
> in-process host, its authentication, the tool/resource framework, and the
> initial capability set. The later content-search tool and dispatch hardening
> are the increment on top — see `specs/101-mcp-content-search-hardening/`.
> Single-repo (`server`); hosted at `/rest/mcp`.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Expose platform capabilities to AI agents as tools (Priority: P1)

An external AI agent (e.g. Claude Desktop) or an internal client connects to the
platform's MCP endpoint, lists the available tools, and calls them to read and
reason over platform content — analyse a whiteboard, summarise contributions in
a space, review recent community activity, discover templates — always limited
to what the connecting identity is allowed to see.

**Why this priority**: The tool surface is the reason the MCP server exists; it
turns platform capabilities into something an LLM agent can invoke.

**Independent Test**: Connect as an authenticated identity, `tools/list`, then
call a read tool (e.g. `analyze_whiteboard`) against an entity the identity can
read; confirm a useful structured result and that unreadable entities are denied.

**Acceptance Scenarios**:

1. **Given** an authenticated connection, **When** the client lists tools, **Then** it receives the available tools with names, descriptions, and input schemas.
2. **Given** a readable entity, **When** the client calls a read tool on it, **Then** it receives a structured result.
3. **Given** an entity the identity cannot read, **When** a tool is called on it, **Then** the call is denied and the entity's content is not revealed.

---

### User Story 2 - Grant agents scoped, revocable access without sharing credentials (Priority: P1)

An operator issues an API key so an agent can act as a specific user, without
sharing that user's login. Keys can be scoped, given an expiry, listed, and
revoked. A connection may alternatively authenticate with an existing platform
session.

**Why this priority**: Without a safe credential model the tool surface cannot be
exposed at all. Keys must be least-privilege, revocable, and never reveal the
user's real credentials.

**Independent Test**: Create a key for a user; use it to authenticate and act as
that user (within their permissions); revoke it; confirm it no longer works.

**Acceptance Scenarios**:

1. **Given** an authenticated user, **When** they create an API key, **Then** the plaintext key is returned exactly once and never retrievable again.
2. **Given** a valid key, **When** used to connect, **Then** the agent acts with the key owner's permissions.
3. **Given** a revoked or expired key, **When** used, **Then** the connection is treated as unauthenticated.
4. **Given** no key, **When** a valid platform session token is presented, **Then** the connection authenticates as that user.

---

### User Story 3 - Let agents act on the user's behalf (Priority: P2)

Beyond reading, an agent can create a whiteboard on a callout or replace a
whiteboard's content — but only where the acting identity has permission to do
so, using the same authorization the platform enforces everywhere else.

**Why this priority**: Acting is high value but mutating; it must reuse the
platform's existing permission checks, not a parallel path.

**Acceptance Scenarios**:

1. **Given** an identity with contribute permission on a callout, **When** the agent creates a whiteboard there, **Then** it is persisted and its id/URI returned.
2. **Given** an identity lacking update permission on a whiteboard, **When** the agent tries to replace its content, **Then** the action is refused.

---

### User Story 4 - Read platform entities as addressable resources (Priority: P2)

An agent can fetch a whiteboard, callout, or space directly by a stable
`alkemio://` URI and receive a structured, navigable representation (including
links to related entities), scoped to what it may read.

**Acceptance Scenarios**:

1. **Given** a known entity URI the identity can read, **When** the agent reads it, **Then** it receives a structured representation with cross-references to related entities.
2. **Given** an unknown or unreadable URI, **When** read, **Then** an explicit not-found/denied error is returned.

---

### User Story 5 - Operate the surface safely (Priority: P3)

An operator can disable the entire surface with a single switch, relies on
per-key rate limits and response-size caps, and trusts that sensitive
capabilities (security audit log) are restricted to platform admins and redact
personal data.

**Acceptance Scenarios**:

1. **Given** the MCP server is disabled by config, **When** any request arrives, **Then** it is refused.
2. **Given** a non-admin identity, **When** it calls the audit-log tool, **Then** it is refused with no data returned.
3. **Given** the audit-log tool returns results, **When** serialized, **Then** email addresses are redacted to domain only.

### Edge Cases

- Concurrent sessions from different users MUST NOT see each other's identity or results.
- A client presenting an unknown session id (after restart/expiry) is told to reinitialize.
- A tool/resource not found returns an explicit error.
- Search/analysis backends unavailable → clear error, never a hang (see also 101).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The platform MUST expose an MCP endpoint that lets authenticated clients list and invoke tools and list and read resources.
- **FR-002**: Each client session MUST be isolated — its identity and results MUST NOT leak to concurrent sessions.
- **FR-003**: The surface MUST authenticate via (a) a platform-issued MCP API key or (b) an existing platform session; unauthenticated connections are treated as anonymous and see only public data.
- **FR-004**: API keys MUST be storable only as one-way hashes (never plaintext), MUST support scopes, optional expiry, listing, and revocation, and MUST identify the owning user.
- **FR-005**: Every tool and resource access MUST be limited to what the acting identity is authorized to read or do, reusing the platform's authorization.
- **FR-006**: The initial read tools MUST include: analyse a whiteboard, list whiteboards, analyse contributions (own/callout/space), summarise community activity, navigate templates.
- **FR-007**: The mutating tools (create whiteboard on a callout; replace whiteboard content) MUST enforce the same contribute/update permissions as the platform's normal paths.
- **FR-008**: The security audit-log tool MUST require platform-admin privilege and MUST redact personal data (emails to domain only).
- **FR-009**: Resources MUST be addressable by stable `alkemio://{type}/{id}` URIs (whiteboards, callouts, spaces) and return structured representations with cross-references.
- **FR-010**: The entire surface MUST be disableable by configuration (a master switch), with API-key auth independently toggleable.
- **FR-011**: The system MUST log tool/resource invocations and auth outcomes with MCP context; sensitive credentials MUST never be logged.
- **FR-012**: Per-key rate limiting and response-size caps MUST be configurable to bound cost and payload size.

### Key Entities

- **MCP API key**: a hashed, user-owned credential with scopes, optional expiry, active flag, and last-used metadata. (See `data-model.md`.)
- **Tool**: a named capability with a JSON-Schema input contract and an execute behavior, run under an identity.
- **Resource**: a platform entity addressable by `alkemio://` URI, with an authorization policy and a structured read representation.
- **Session**: a per-client connection carrying its own identity (and API-key scopes).

## Success Criteria *(mandatory)*

- **SC-001**: An authenticated client can list tools and successfully call a read tool against authorized content on first connection.
- **SC-002**: Concurrent sessions from different users never observe each other's identity or data (verified).
- **SC-003**: A revoked or expired API key authenticates as anonymous 100% of the time.
- **SC-004**: Plaintext API keys are never stored or retrievable after creation (only one-way hashes persisted).
- **SC-005**: No tool or resource returns content the acting identity is unauthorized to read (zero leaks in testing).
- **SC-006**: Mutating tools succeed only where the identity has the corresponding platform permission.
- **SC-007**: The audit-log tool returns nothing to non-admins and never emits un-redacted email addresses.
- **SC-008**: Disabling the surface by config refuses all requests.

## Assumptions

- The MCP server is hosted **in-process** by the platform `server` (not a separate deployable), so it reuses domain services, authorization, and `ActorContext` directly.
- Transport is HTTP with per-session state (the MCP Streamable-HTTP transport); see `research.md` for why.
- Identity is the key owner (for API keys) or the session subject (for platform tokens); there is no shared service identity for user-initiated actions.
- Elasticsearch-backed capabilities degrade gracefully when ES is absent (detailed in the 101 increment).

## Out of Scope

- The content-search tool and the dispatch hardening (single-source registry, input validation, scope enforcement) — covered by `specs/101-mcp-content-search-hardening/`.
- A browser/SPA client of this surface — covered by the workspace feature `004-web-ai-assistant` (a dedicated agent service is the MCP client).
- Per-space (`spaceIds`) key-scope enforcement (declared, not yet enforced).

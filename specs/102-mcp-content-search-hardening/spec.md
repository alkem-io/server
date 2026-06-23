# Feature Specification: MCP Content Search + Tool-Call Hardening

**Feature Branch**: `mcp-server`

**Created**: 2026-05-31

**Status**: Implemented (retrospec)

**Input**: Retrospec from existing code changes (commits `600207fe2`, `f219e2351`)

> **Retrospec.** This spec was reconstructed from code that already shipped on
> the `mcp-server` branch. It documents two cohesive improvements to the MCP
> server: a content-search tool, and hardening of how tool calls are registered,
> validated, and authorized. Single-repo (`server`); not a workspace vertical.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Find platform content by description (Priority: P1)

An MCP client (an AI agent, Claude Desktop, or the future assistant-service)
needs to turn a human description ("the last retrospective whiteboard", "the
onboarding post in space X") into a concrete entity it can then act on. It calls
a single search tool with free-text terms and gets back matching entities — with
their type, id, a human-readable name, a relevance score, and a navigable URI —
limited to what the calling actor is allowed to read.

**Why this priority**: Discovery is the precondition for almost every other tool
(analyze/update a whiteboard, summarise a callout). Without it, an agent cannot
reliably resolve "which entity" from natural language.

**Independent Test**: Authenticate as a user, call the search tool with terms
that match content the user can read, and confirm the right entity id/type is
returned and that content the user cannot read never appears.

**Acceptance Scenarios**:

1. **Given** an authenticated MCP client, **When** it searches for terms present in a readable entity's text, **Then** the matching entity is returned with its id, type, displayName, score, and URI.
2. **Given** content the actor is not authorized to read, **When** the client searches for it, **Then** it is not returned.
3. **Given** the search backend is not configured/available, **When** a search is issued, **Then** the client receives a clear error rather than a hang or a silent empty result.
4. **Given** a query, **When** results span multiple categories (spaces, callouts, contributions, framing, actors), **Then** they are merged and ordered by relevance.

---

### User Story 2 - Safe, predictable, least-privilege tool calls (Priority: P2)

An integrator wiring an MCP client to the platform needs tool calls to be
trustworthy: malformed arguments are rejected before anything runs, and an API
key only does what it is scoped for. A read-only key can browse but not invoke
tools; a tools-scoped key can act; a key restricted to particular spaces is
refused rather than silently granted platform-wide reach.

**Why this priority**: It makes the tool surface safe to expose to autonomous
agents and to issue keys for, without per-tool bespoke checks.

**Independent Test**: Call a tool with missing/wrong-typed arguments and confirm
rejection before execution; call a tool with a `read`-only key and confirm it is
denied; with a `read,tools` key and confirm it proceeds; with a `spaceIds`-scoped
key and confirm it fails closed.

**Acceptance Scenarios**:

1. **Given** a tool call missing a required argument, **When** it is dispatched, **Then** it is rejected with a clear validation error and the tool never executes.
2. **Given** an API key scoped to `read` only, **When** it calls a tool, **Then** the call is denied with an explanatory message.
3. **Given** an API key scoped with `tools`, **When** it calls a tool, **Then** the call proceeds (subject to the actor's ACL).
4. **Given** an API key declaring `spaceIds`, **When** it calls a tool, **Then** the call fails closed (space-scoped keys are not yet enforceable).
5. **Given** a caller authenticated by platform session rather than an MCP key, **When** it calls a tool, **Then** no key-scope restriction applies and the actor's ACL governs.

---

### Edge Cases

- Search backend unavailable → clear error result (`isError`), not a hang.
- Empty/whitespace query → rejected with a helpful message.
- Tool name not found → explicit error.
- A duplicate tool name at registration → ignored with a warning (first wins), never silently shadowing.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: An MCP client MUST be able to full-text search the platform with free-text terms and receive matching entities (spaces, subspaces, callouts, posts, whiteboards, memos, users, organizations), each with type, actionable entity id, display name, relevance score, and a navigable URI where applicable.
- **FR-002**: Search results MUST be limited to what the calling actor is authorized to read.
- **FR-003**: Search MUST cover indexed profile text (name/description/tags), post bodies, memo content, and whiteboard scene text; when the search backend is unavailable it MUST return a clear error, never hang or fail silently.
- **FR-004**: Every tool call's arguments MUST be validated against that tool's declared input schema before the tool executes; invalid calls MUST be rejected with a specific error.
- **FR-005**: MCP API-key scopes MUST be enforced — tool calls require the `tools` operation, resource reads require `read`, and keys declaring `spaceIds` MUST fail closed; callers without an MCP key are governed by their existing ACL only.
- **FR-006**: The available tools MUST be sourced from a single registry (one source of truth); registering a tool MUST be a single declaration with no duplicate wiring.
- **FR-007**: Tool invocations and scope/validation denials MUST be logged with MCP context.

### Key Entities

- **Search result match**: type, entity id (the actionable Alkemio id, not the index doc id), display name, score, spaceId/calloutId context, URI.
- **Tool definition**: name, description, JSON-Schema input contract (used both to advertise the tool and to validate calls).
- **API-key scope**: allowed `operations` (`read` | `tools`) and optional `spaceIds`.

## Success Criteria *(mandatory)*

- **SC-001**: An MCP client can resolve a content description to the correct entity id with a single search call.
- **SC-002**: Search results never include content the calling actor is not authorized to read. ACL-scoping is delegated to the platform `SearchService` (which filters by access / returns only public results for anonymous callers); it is *not* independently re-tested at the MCP boundary — verified by manual probe per the Story 1 Independent Test, not by an automated MCP-layer test.
- **SC-003**: 100% of tool calls with missing/invalid arguments are rejected before the tool runs.
- **SC-004**: A `read`-only key cannot invoke any tool; a `read,tools` key can. The scope gate (`scopeViolation`) is covered by unit tests; the end-to-end key behavior is verified by manual probe (no automated key-scoped integration test).
- **SC-005**: Adding a new tool requires exactly one registration edit (no second registry or list to keep in sync).
- **SC-006**: When the search backend is unavailable, the client receives a clear error 100% of the time (no hangs, no silent empties).

## Assumptions

- Elasticsearch is the search backend; when it is absent the tool returns a clear error and the rest of the MCP surface keeps working.
- Identity is an `ActorContext` derived either from an MCP API key (→ its owner user) or a forwarded platform (Ory) token; tool execution and search both honor it.
- Per-space (`spaceIds`) key scoping is intentionally deferred; such keys fail closed rather than receive un-narrowed access.
- The MCP server is hosted in-process by the platform server and exposed at `/rest/mcp`.

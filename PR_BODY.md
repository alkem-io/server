# feat(004-web-ai-assistant): virtual-assistant actor, on-behalf-of delegation, per-tool capability gate & system-invoked actor auth

Implements the **server** slice of the cross-repo feature `workspace#004-web-ai-assistant`
(Web-Client AI Assistant). Server is the **co-lead / rollout leader** for this feature: this PR
is **first** in the rollout order and unblocks `assistant-service` and `client-web`.

> Cross-repo spec: `agents-hq/specs/004-web-ai-assistant/` — `spec.md`, `plan.md`, and the
> frozen contracts `contracts/auth-identity-flow.md`, `contracts/assistant-authority.md`,
> `contracts/assistant-mcp-client.md`.

## Branch base (important)

Per research D16, `feat/004-web-ai-assistant` is branched off the server **`mcp-server`**
integration branch (specs 101/102) so the MCP host is present: the per-tool capability gate
lives in the MCP host while the actor / settings live in the main domain model — they ship as
**one** server PR. If `mcp-server` has not yet merged to `develop`, this PR should target
`mcp-server` (or be sequenced after it); otherwise it targets `develop`.

## What this PR adds

### The `virtual-assistant` platform actor (FR-016) — _foundational_
- New `VIRTUAL_ASSISTANT` actor type; a CTI `@ChildEntity` of `Actor` (`virtual_assistant`
  table) mirroring `VirtualContributor` **minus** knowledgeBase / aiPersona /
  community-membership / store — a pure internal actor (no Kratos identity) with its own
  `nameID` / `profile` / `authorization` / `credentials`, plus a JSONB `capabilityGrant`.
- Service (singleton resolve / get / set-grant), authorization service (GLOBAL admins manage,
  registered users read), GraphQL interface + field resolver.
- Migration creates the table **and seeds** the singleton actor (`nameID = virtual-assistant`)
  with a **read-only** default `capabilityGrant` + a `GLOBAL_REGISTERED` credential.
- `ActorContextService.buildForActor` resolves the seeded actor (verified by unit test) — no
  new context builder (it already handles any actor type, research D10).

### User-initiated delegation (Flow A — US1) (FR-002/FR-016/SC-003/SC-010)
- `ActorContext.delegationContext` ( `{ assistantActorId, onBehalfOfUserId }` ) carries the
  acting assistant actor for **attribution** alongside the authorized-as user.
- New `mcp-delegation` auth strategy + `McpAuthGuard` wiring: a delegated call presents the
  assistant **actor credential** (`mcp_api_key`) as `Authorization` **plus** the on-behalf-of
  user JWT in the **`X-Alkemio-On-Behalf-Of`** header. The host validates **both**, then builds
  a **delegated ActorContext** that authorizes entities **as the user** via the **same
  `AuthorizationService` as GraphQL** (⇒ `effective ⊆ user privileges` by construction) and
  stamps the assistant actor for attribution. Anonymous fallback unchanged for non-assistant
  callers.
- Attribution stamped into MCP tool/resource execution logging (`assistantActorId` +
  `onBehalfOfUserId`), alongside existing `mcp-session-id` join keys (FR-010 v1 — **no** new
  `X-Correlation-Id`).

### Per-user assistant authority + the per-tool capability gate (US4) (FR-006/FR-018/SC-009)
- New `assistant` JSONB group on `UserSettings` (`enabledCapabilities: [{capability, enabled}]`)
  with GraphQL `UserSettingsAssistant` / `AssistantCapabilityToggle(+Input)` types; folded into
  the existing `updateUserSettings` mutation (no parallel mutation); migration column.
- **Read-only defaults** in `getDefaultUserSettings()`: all `READ` enabled, all `WRITE_*`
  disabled; absence ⇒ disabled (so a new content-changing capability defaults disabled for
  existing users). Derived from the **shared frozen `kind` classification map**
  (`assistant-authority.md` §1), with the fail-safe **unknown ⇒ WRITE**.
- `platformCapabilities: [AssistantCapability!]!` query, sourced **dynamically** from the MCP
  tool registry (never a hardcoded enum); `kind` from the shared map. A **classification-parity
  test (T023a)** pins the assigned `kind` to the canonical frozen map (the server half of the
  two-sided guard against drift from assistant-service's `classify.py`).
- The **per-tool capability gate** at MCP tool dispatch: a delegated call refuses a tool not in
  the user's `enabledCapabilities` → `capability_disabled`. Layered **on top of** the
  per-entity `AuthorizationService` check, re-evaluated at action time ⇒ effective authority =
  `user privileges ∩ enabled capabilities`.

### Delegated writes are authorization- + gate-enforced (US2) (FR-012)
- Tests confirm `create_whiteboard` / `update_whiteboard_content` run under the delegated
  ActorContext via the same `AuthorizationService` as GraphQL (permitted succeeds; unpermitted
  refused and never executes), and that the capability gate covers both write tools.
- Documented (NOT v1): a compare-and-set / `If-Match` parameter on `update_whiteboard_content`
  to close the FR-014 destructive TOCTOU window is recorded as an optional later server slice.

### System-invoked mode (Flow B) (FR-017a/FR-019)
- The MCP api-key auth seam is **generalized off the hardcoded User UUID + `buildForUser`** to
  an `actorId` + `buildForActor`: `McpApiKey` gains a nullable `actorId` column (and `userId`
  relaxed to nullable; bind to exactly one), migration `McpApiKeyActorBound`. An actor-bound key
  builds the actor's context and stamps system-invoked attribution
  ( `{ assistantActorId, onBehalfOfUserId: null }` ).
- `McpAuthGuard` recognizes the actor path: an assistant actor key with **no** on-behalf-of
  header no-ops delegation and resolves via the api-key strategy (`buildForActor`).
- Admin per-capability grant mutation `updateAssistantActorCapabilities(grantData)`
  (**PLATFORM_ADMIN**-gated), persisting `capabilityGrant` (default read-only).
- The capability gate is extended for actor calls: `onBehalfOfUserId === null` ⇒ gate against
  the actor's admin `capabilityGrant` (FR-019), independent of any user grant.

## GraphQL schema

Additive only (no breaking changes — `schema:diff` reports no BREAKING): `VirtualAssistant`,
`AssistantCapability` / `AssistantCapabilityKind`, `AssistantCapabilityToggle(+Input)`,
`UserSettingsAssistant`, `UpdateUserSettingsAssistantInput`, `UserSettings.assistant`,
`GrantAssistantActorCapabilitiesInput`, the `platformCapabilities` query, and the
`updateAssistantActorCapabilities` mutation. `schema.graphql` regenerated so **client-web can
codegen against it**.

## Migrations

`AddVirtualAssistantActorType` → `VirtualAssistant` (table + singleton seed) →
`UserSettingsAssistant` (column) → `McpApiKeyActorBound` (actorId column, additive/idempotent).
All forward DDL, ordered last after the prior 004 migrations.

## Tests & gates

- New/updated specs: virtual-assistant `buildForActor`; MCP delegation (user-scoped +
  attributed, SC-003/SC-010); capability gate (user + actor grant, FR-018/FR-019/SC-009);
  classification + parity (T023a); read-only defaults; delegated-write authorization + gate
  (US2); system-invoked actor auth + admin-grant gating (T031).
- `tsc --noEmit` clean; Biome clean on touched files; the app bootstraps (schema print
  succeeds), confirming DI wiring.
- The only failing test in the repo, `src/tools/schema/__tests__/lifecycle-window.spec.ts`, is
  a **pre-existing, date-dependent** schema-deprecation-window test, failing on the clean
  committed tree before this slice and unrelated to it.

## Notes for reviewers

- The user-privilege bound is **structural** — the gate is an _additional_ per-tool check, never
  a re-implementation of authorization.
- `mcp.enabled` stays env-flagged (default false); the flip per env is owned by the ops/dev
  slices, not this PR.
- The host `mcp.rate_limit` is intentionally unenforced (assistant-service owns budgets).
- The actor-bound `mcp_api_key` **value** is a secret provisioned by ops — never seeded here;
  the migration is schema-only.

Closes the server slice of `workspace#004-web-ai-assistant`.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

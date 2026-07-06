# Tasks: Bootstrap the virtual-assistant MCP API key

**Feature**: `105-bootstrap-assistant-mcp-key` | **Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

> **⚠️ Retroactive backfill.** The code already shipped (PR #6203); tasks are recorded as **done
> (`[X]`)** to reflect the implemented work. The one open item is a doc follow-up in another repo.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: independent of the other tasks in its group (different file / no ordering dependency).
- **[US#]**: the user story the task serves.

## Phase 1: Setup

No new setup — the feature reuses existing surfaces (`BootstrapService`, `McpApiKeyService`, the
`mcp_api_key` entity, `VirtualAssistantService`, the `ASSISTANT_MCP_API_KEY` secret).

## Phase 2: Foundational (blocking prerequisite for all stories)

- [X] **T001** Add `McpApiKeyService.ensureActorKeyFromPlaintext(actorId, plaintext, scopes, name?)` —
  hash the plaintext, create-if-absent / reactivate-if-inactive, and deactivate other active
  actor-bound keys whose hash differs (rotation). Never generates a key.
  → `src/services/mcp-server/auth/mcp-api-key.service.ts` (FR-001, FR-002, FR-003, FR-004, FR-005)

## Phase 3: User Story 1 — Fresh deploy yields a working delegated session (P1) 🎯 MVP

- [X] **T002** [US1] Add `BootstrapService.ensureAssistantMcpApiKey()` and call it from `bootstrap()`:
  read `process.env.ASSISTANT_MCP_API_KEY` (skip+warn if unset), resolve the `virtual-assistant`
  singleton via `getSingletonOrFail()` (skip+warn if absent), then call T001 with
  `[{ operations: ['read', 'tools'] }]`. → `src/core/bootstrap/bootstrap.service.ts` (FR-001, FR-006)
- [X] **T003** [US1] DI wiring: import `VirtualAssistantModule`, provide `McpApiKeyService`, register
  `McpApiKey` via `TypeOrmModule.forFeature`. → `src/core/bootstrap/bootstrap.module.ts`
- [X] **T004** [P] [US1] Unit test: creates an actor-bound row with `keyHash = SHA-256(plaintext)`,
  `userId` null, `[read,tools]`, active. → `src/services/mcp-server/auth/mcp-api-key.service.spec.ts`
- [X] **T005** [US1] Regression: confirm `bootstrap.service.spec.ts` still passes with the two new
  constructor deps (auto-mocked via `useMocker`). → `src/core/bootstrap/bootstrap.service.spec.ts`

## Phase 4: User Story 2 — Idempotent re-run (P2)

- [X] **T006** [P] [US2] Unit tests: no write when an active correctly-bound key already exists;
  reactivate a matching-but-inactive key (no duplicate).
  → `src/services/mcp-server/auth/mcp-api-key.service.spec.ts` (FR-004)

## Phase 5: User Story 3 — Clean rotation (P3)

- [X] **T007** [P] [US3] Unit test: a stale active actor key (different hash) is deactivated and the
  new key is created. → `src/services/mcp-server/auth/mcp-api-key.service.spec.ts` (FR-005)

## Phase 6: Polish & docs

- [X] **T008** [P] Validate: biome + tsc clean; `mcp-api-key` + `bootstrap` suites green; full
  pre-commit suite green on the code commit.
- [X] **T009** [P] Retrofit the SDD artifact set (this directory): spec.md, plan.md, research.md,
  data-model.md, contracts/, quickstart.md, tasks.md.
- [X] **T010** [P] Automated coverage for the FR-006 skip path — `bootstrap.service.spec.ts` asserts
  `ensureAssistantMcpApiKey` skips (no key write) when the secret is unset / the actor is absent, and
  ensures the `[read, tools]` key when both are present. → `src/core/bootstrap/bootstrap.service.spec.ts` (FR-006)

## Deferred (cross-repo follow-up — not in PR #6203)

- [X] **T011** [P] Deploy-runbook note in the **workspace** repo (agents-hq, commit 6e86462)
  `specs/004-web-ai-assistant/contracts/config-and-secrets.md`: "set a real `ASSISTANT_MCP_API_KEY`
  per cluster; the server bootstraps the matching `mcp_api_key` row." Maps to **issue #1937
  acceptance criterion #4** (the runbook item). Tracked separately because it lives in another repo.

## Dependencies

- **T001** (foundational ensure method) blocks **T002** (bootstrap step) and the tests **T004/T006/T007**.
- **T003** (DI) is required for **T002** to resolve at runtime.
- **T002 + T003** together deliver US1 (the MVP); US2 and US3 are properties of **T001** verified by
  **T006 / T007** (no extra production code).

## Mapping (traceability)

| Story | FRs | Tasks | Validation |
|---|---|---|---|
| US1 (fresh deploy) | FR-001, FR-002, FR-003, FR-006 | T001–T005, **T010** | quickstart Scenario A, D; T004 + T010 (unit) |
| US2 (idempotent) | FR-004 | T001, T006 | quickstart Scenario B; T006 (unit) |
| US3 (rotation) | FR-005 | T001, T007 | quickstart Scenario C; T007 (unit) |

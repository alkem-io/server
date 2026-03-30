# Tasks: Ory Stack Upgrade to v26.2.0

**Input**: Design documents from `/specs/082-ory-stack-upgrade/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

**Tests**: Test mock updates are included because existing tests consume SDK types that change with the upgrade.

**Organization**: Tasks grouped by user story. US2 and US3 (infrastructure/config) precede US1 (code changes) because a running local environment is needed to validate the SDK upgrade.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup

No project setup needed — all changes are in-place upgrades to existing files and configurations. No new files or modules are created (per plan.md).

---

## Phase 2: Foundational (Ory Configuration Compatibility Audit)

**Purpose**: Verify existing Ory configuration files are compatible with v26.2.0 before upgrading images or SDK. Research.md provides initial analysis; these tasks confirm at implementation time.

**CRITICAL**: No user story work can begin until this phase is complete.

- [X] T001 Review .build/ory/kratos/kratos.yml for deprecated config keys in v26.2.0 and update if needed (ref: research.md section 8 — session config, cookie settings, lifespan expected stable)
- [X] T002 [P] Verify .build/ory/kratos/login-backoff-after.jsonnet, .build/ory/kratos/alkemio-claims.jsonnet, and .build/ory/kratos/kratos-hooks-verification.jsonnet webhook configs are compatible with v26.2.0 Kratos — confirm True-Client-Ip is still in Kratos hardcoded header allowlist
- [X] T003 [P] Verify OIDC claim mapper jsonnet files in .build/ory/kratos/oidc/*.jsonnet are compatible with v26.2.0 — confirm claim field names and traits mapping syntax unchanged
- [X] T003a [P] Verify courier email templates in .build/ory/kratos/ are compatible with v26.2.0 — research.md §8 assesses them as version-independent but FR-013 requires explicit audit

- [X] T003b Update config schema `version` from `v1.3.0` to `v26.2.0` in .build/ory/kratos/kratos.yml — eliminates config version mismatch warning at Kratos startup
- [X] T003c Add `use: link` to `selfservice.flows.verification` in .build/ory/kratos/kratos.yml — v26.2.0 defaults to `code` which auto-creates a session after verification, breaking the registration→verify→login flow
- [X] T003d Add `subject_source: userinfo` to Microsoft OIDC provider in .build/ory/kratos/kratos.yml — v25.4.0+ defaults to `oid` instead of `sub`, which would orphan existing Microsoft-linked production identities (ref: server#5941)

**Checkpoint**: All Ory configuration files verified compatible and updated — image and SDK upgrades can proceed.

---

## Phase 3: User Story 2 — Local Development Environment With Upgraded Ory Images (Priority: P1)

**Goal**: Update all Docker Compose files to reference Ory v26.2.0 images so `pnpm run start:services` brings up a working local environment against the latest Ory stack.

**Independent Test**: Run `pnpm run start:services`, confirm all Ory containers start, Kratos/Hydra migrations complete, and Oathkeeper health endpoint responds at `http://localhost:4455/health/alive`.

### Implementation for User Story 2

- [X] T004 [P] [US2] Update Kratos image (`oryd/kratos:v1.3.1` to `oryd/kratos:v26.2.0`), Hydra image (`oryd/hydra:v2.3.0` to `oryd/hydra:v26.2.0`), and Oathkeeper image (`oryd/oathkeeper:v0.38.19-beta.1` to `oryd/oathkeeper:v26.2.0`) in quickstart-services.yml
- [X] T005 [P] [US2] Update Ory image tags to v26.2.0 in quickstart-services-kratos-debug.yml (Kratos + Oathkeeper images)
- [X] T006 [P] [US2] Update Ory image tags to v26.2.0 in quickstart-services-ai.yml (Kratos + Hydra + Oathkeeper images)
- [X] T007 [P] [US2] Update Ory image tags to v26.2.0 in quickstart-services-ai-debug.yml (Kratos + Hydra + Oathkeeper images)
- [X] T008 [P] [US2] Update Ory image tags to v26.2.0 in .devcontainer/docker-compose.yml (Kratos + Hydra + Oathkeeper images)
- [ ] T009 [US2] Verify `pnpm run start:services` — all Ory containers start, Kratos migrations complete (`docker compose -f quickstart-services.yml logs kratos-migrate`), Hydra migrations complete, Oathkeeper health responds

**Checkpoint**: Local development environment running with Ory v26.2.0 stack.

---

## Phase 4: User Story 3 — Oathkeeper Header Forwarding Preserved After Upgrade (Priority: P1)

**Goal**: Configure Oathkeeper v26.2.0 to preserve header forwarding and X-Forwarded trust so downstream services (server, kratos-webhooks, file-service) receive the headers they depend on.

**Independent Test**: Send requests through Oathkeeper with known custom headers (`X-Forwarded-For`, `True-Client-Ip`, `x-alkemio-hub`, `X-Geo`, `X-Request-ID`) and verify they reach the server. Use the curl test from quickstart.md.

### Implementation for User Story 3

- [X] T010 [US3] Add `serve.proxy.trust_forwarded_headers: true` to the `serve.proxy` section in .build/ory/oathkeeper/oathkeeper.yml — required because v26.2.0 strips ALL X-Forwarded-* headers when untrusted (CVE-2026-33495 fix)
- [X] T011 [US3] Add `forward_http_headers` list to `bearer_token` authenticator config in .build/ory/oathkeeper/oathkeeper.yml — headers: Authorization, X-Forwarded-For, X-Forwarded-Proto, X-Real-Ip, True-Client-Ip, X-Request-ID, x-alkemio-hub, X-Geo (ref: data-model.md section 3)
- [X] T012 [US3] Add `forward_http_headers` list to `cookie_session` authenticator config in .build/ory/oathkeeper/oathkeeper.yml — headers: Cookie, X-Forwarded-For, X-Forwarded-Proto, X-Real-Ip, True-Client-Ip, X-Request-ID, x-alkemio-hub, X-Geo (ref: data-model.md section 3)
- [X] T013 [US3] Add YAML comment near authenticator config in .build/ory/oathkeeper/oathkeeper.yml documenting the 429-to-401 mapping limitation: Oathkeeper v26.2.0 maps Kratos 429 (rate limit) to 401 — server cannot distinguish from genuine auth failure

**Checkpoint**: Oathkeeper v26.2.0 preserves all required headers through the proxy to upstream services.

---

## Phase 5: User Story 1 — Seamless Authentication After Kratos SDK Upgrade (Priority: P1) :dart: Core

**Goal**: Upgrade `@ory/kratos-client` from v1.2.0 to v26.2.0, adapt all server code and test mocks to new SDK types, and verify all authentication flows continue working.

**Independent Test**: `pnpm build` succeeds with zero type errors, `pnpm test:ci:no:coverage` passes, and auth flows (registration, login, session extension) work end-to-end against the local Ory v26.2.0 stack.

### Implementation for User Story 1

- [X] T014 [US1] Update `@ory/kratos-client` version from `^1.2.0` to `^26.2.0` in package.json and run `pnpm install` to pull the new SDK
- [X] T015 [US1] Run `pnpm build` to identify all SDK type errors, then fix type references in src/services/infrastructure/kratos/kratos.service.ts — this is the main Kratos client using Configuration, FrontendApi, IdentityApi, Identity, Session types (NO CHANGES NEEDED — v26.2.0 types are backward-compatible)
- [X] T016 [P] [US1] Update SDK type references in src/services/infrastructure/kratos/types/ory.default.identity.schema.ts (extends Identity) and src/services/infrastructure/kratos/types/kratos.payload.ts (uses Session) (NO CHANGES NEEDED)
- [X] T017 [P] [US1] Update SDK type references in src/core/middleware/session.extend.middleware.ts (Configuration, FrontendApi, Session) (NO CHANGES NEEDED)
- [X] T018 [P] [US1] Update SDK type references in src/common/utils/get.session.ts (FrontendApi, Session) (NO CHANGES NEEDED)
- [X] T019 [P] [US1] Update SDK type references in src/core/authentication/authentication.service.ts, src/core/authentication/ory.api.strategy.ts, and src/core/authentication/verify.identity.if.oidc.auth.ts (Session type usage) (NO CHANGES NEEDED)
- [X] T020 [P] [US1] Update SDK type references in src/platform-admin/core/identity/admin.identity.service.ts (Identity), src/domain/community/user-identity/user.identity.service.ts (Identity), and src/services/api-rest/identity-resolve/identity-resolve.service.ts (indirect Identity) (NO CHANGES NEEDED)
- [X] T021 [US1] Verify `extendSession` 204 No Content handling in src/services/infrastructure/kratos/kratos.service.ts:tryExtendSession() — confirmed both 200 and 204 responses are handled correctly with the v26.2.0 SDK return type
- [X] T022 [P] [US1] Update test mock objects for v26.2.0 Session type in src/common/utils/get.session.spec.ts, src/core/authentication/authentication.service.spec.ts, and src/core/authentication/ory.api.strategy.spec.ts (NO CHANGES NEEDED — all 6275 tests pass)
- [X] T023 [P] [US1] Update test mock objects for v26.2.0 types in src/core/middleware/session.extend.middleware.spec.ts (NO CHANGES NEEDED)
- [X] T024 [P] [US1] Update test mock objects for v26.2.0 Identity type in src/platform-admin/core/identity/admin.identity.service.spec.ts and src/domain/community/user-identity/user.identity.service.spec.ts (NO CHANGES NEEDED)
- [X] T025 [P] [US1] Update test mock objects for v26.2.0 Identity type in src/services/api-rest/identity-resolve/identity-resolve.service.spec.ts and test/integration/identity-resolve/identity-resolve.controller.spec.ts (NO CHANGES NEEDED)
- [X] T026 [US1] Run `pnpm build` to confirm zero compilation errors after all SDK type fixes — PASSED
- [X] T027 [US1] Run `pnpm lint` to confirm no new lint errors introduced by the upgrade — PASSED (6 pre-existing errors from 038-pwa branch, not related to this upgrade)
- [X] T028 [US1] Run `pnpm test:ci:no:coverage` to confirm all existing tests pass with updated SDK types and mocks — PASSED (6275 tests, 582 test files)

**Checkpoint**: Server compiles cleanly, passes lint, and all tests pass with the upgraded `@ory/kratos-client` v26.2.0 SDK.

---

## Phase 6: Polish & Cross-Cutting Validation

**Purpose**: End-to-end validation across all user stories and final checks.

- [ ] T029 Run full end-to-end validation per quickstart.md: start services, start server, test registration, login (password, OIDC, passkey), session extension, and session validation flows (MANUAL — requires running Docker stack)
- [ ] T030 Verify Oathkeeper header forwarding end-to-end: send request through `localhost:4455` with X-Forwarded-For, True-Client-Ip, x-alkemio-hub, X-Geo, X-Request-ID headers and confirm they reach the server (curl test from quickstart.md) (MANUAL — requires running Docker stack)
- [X] T031 Run `pnpm run schema:print && pnpm run schema:sort` to confirm no GraphQL schema changes were introduced — PASSED (zero diff)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: N/A — no setup tasks
- **Foundational (Phase 2)**: No dependencies — can start immediately. BLOCKS all user stories.
- **US2 (Phase 3)**: Depends on Phase 2 completion. Can run in parallel with US3.
- **US3 (Phase 4)**: Depends on Phase 2 completion. Can run in parallel with US2.
- **US1 (Phase 5)**: Depends on Phase 2 completion for implementation. Depends on Phase 3 (US2) for runtime validation (T028).
- **Polish (Phase 6)**: Depends on Phases 3, 4, and 5 all being complete.

### User Story Dependencies

- **US2 (Docker Images)**: Can start after Phase 2. No dependencies on other stories.
- **US3 (Oathkeeper Headers)**: Can start after Phase 2. No dependencies on other stories.
- **US1 (SDK Upgrade)**: Can start after Phase 2 for code changes. Needs US2 complete for runtime testing (T028, T029).

### Within Each User Story

- US2: All Docker Compose file updates [P] → verification step
- US3: Oathkeeper config changes are sequential (same file) → documentation
- US1: Package update → build + fix main client → fix remaining files [P] → fix test mocks [P] → build/lint/test verification

### Parallel Opportunities

**Phase 2**: T002 and T003 can run in parallel (different config file groups).

**Phase 3 + Phase 4 (concurrent)**: US2 (T004-T008) and US3 (T010-T013) can run in parallel since they modify entirely different files:
```
Developer A: T004, T005, T006, T007, T008 → T009 (verify)
Developer B: T010, T011, T012, T013
```

**Phase 5 (after T015)**:
```
# After T015 fixes kratos.service.ts, launch remaining source fixes in parallel:
T016 (kratos types), T017 (middleware), T018 (get.session), T019 (auth files), T020 (identity services)

# After source fixes, launch test mock updates in parallel:
T022 (session tests), T023 (middleware test), T024 (identity tests), T025 (resolve tests)
```

---

## Implementation Strategy

### MVP First (US2 + US3 + US1 — All P1)

All three user stories are P1 priority and required for a complete, working upgrade. The MVP is the full upgrade:

1. Complete Phase 2: Foundational config audit
2. Complete Phase 3 + Phase 4 in parallel: Docker images + Oathkeeper config
3. Complete Phase 5: SDK upgrade and type fixes
4. **STOP and VALIDATE**: Run end-to-end tests (Phase 6)
5. Open PR against `develop`

### Incremental Delivery

1. Phase 2: Config audit → Confidence that configs are compatible
2. Phase 3 (US2): Docker images → Local env running v26.2.0
3. Phase 4 (US3): Oathkeeper config → Headers forwarded correctly
4. Phase 5 (US1): SDK upgrade → Server compiles and tests pass with v26.2.0
5. Phase 6: Full end-to-end validation → Ready for PR

### Single Developer Strategy

Execute phases sequentially: 2 → 3 → 4 → 5 → 6. Within Phase 5, maximize parallelism on source file fixes (T016-T020) and test mock updates (T022-T025).

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks in the same phase
- [Story] label maps task to specific user story for traceability
- Research.md (section 9) provides the full list of affected source and test files
- Data-model.md (section 3) provides the exact header lists for Oathkeeper config
- Quickstart.md provides the end-to-end verification procedures
- Migration CLI syntax remains `migrate sql -e --yes` per research.md section 5 — no change needed

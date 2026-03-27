# Implementation Plan: Ory Stack Upgrade to v26.2.0

**Branch**: `082-ory-stack-upgrade` | **Date**: 2026-03-26 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/082-ory-stack-upgrade/spec.md`

## Summary

Upgrade the Ory authentication stack from Kratos v1.3.1/Hydra v2.3.0/Oathkeeper v0.38.19-beta.1 to v26.2.0 across Docker images, Kratos client SDK (`@ory/kratos-client` v1.2.0 → v26.2.0), and Oathkeeper proxy configuration. Key changes: handle `extendSession` 204 responses, configure explicit header forwarding in Oathkeeper (security CVE fixes), and adapt all SDK type references to v26.2.0.

## Technical Context

**Language/Version**: TypeScript 5.3, Node.js 22 LTS (Volta pins 22.21.1)
**Primary Dependencies**: `@ory/kratos-client ^26.2.0` (upgrade from ^1.2.0), NestJS 10, TypeORM 0.3, Apollo Server 4
**Storage**: PostgreSQL 17.5 (Kratos manages its own schema via `migrate sql`)
**Testing**: Vitest 4.x (unit), functional integration/e2e tests
**Target Platform**: Linux server (Docker Compose for local dev)
**Project Type**: Single NestJS monolith
**Performance Goals**: No degradation from current auth flow latency
**Constraints**: Zero breaking changes to the GraphQL API contract; all existing auth flows must continue working
**Scale/Scope**: ~20 source files + ~10 test files affected by SDK type changes; 5 Docker Compose files; 2 Ory config files

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle | Status | Notes |
|-----------|--------|-------|
| 1. Domain-Centric Design | PASS | Kratos integration is in `services/infrastructure/kratos/` — no domain logic changes. |
| 2. Modular NestJS Boundaries | PASS | Changes scoped to existing `KratosModule`, `AuthenticationModule`, middleware. No new modules. |
| 3. GraphQL Schema as Stable Contract | PASS | No GraphQL schema changes. `extendSession` 204 is absorbed server-side. |
| 4. Explicit Data & Event Flow | PASS | No changes to event flow or write paths. |
| 5. Observability & Operational Readiness | PASS | Logging contexts unchanged. 429→401 mapping documented for operators. |
| 6. Code Quality with Pragmatic Testing | PASS | Existing unit tests updated for new SDK types. No new test files needed unless SDK behavior changes. |
| 7. API Consistency & Evolution | PASS | No new GraphQL surface area. |
| 8. Secure-by-Design Integration | PASS | Oathkeeper CVE fixes improve security. `trust_forwarded_headers` enabled for trusted reverse proxy (Traefik). |
| 9. Container & Deployment Determinism | PASS | Explicit image tags (`v26.2.0`), no `latest` pulls. |
| 10. Simplicity & Incremental Hardening | PASS | Minimal-scope upgrade, no architectural changes. |

**Gate Result**: ALL PASS — no violations, no justifications needed.

## Project Structure

### Documentation (this feature)

```text
specs/082-ory-stack-upgrade/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0 research output
├── data-model.md        # Phase 1: SDK type mapping & config changes
├── quickstart.md        # Phase 1: Verification guide
├── contracts/           # Phase 1: N/A (no API contract changes)
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
# SDK type changes (server source)
src/
├── services/infrastructure/kratos/
│   ├── kratos.service.ts              # Main Kratos client — all API calls
│   ├── kratos.module.ts               # Module exports (no change expected)
│   └── types/
│       ├── ory.default.identity.schema.ts  # Extends SDK Identity type
│       ├── kratos.payload.ts               # Uses SDK Session type
│       ├── ory.traits.ts                   # Identity traits (no SDK import)
│       └── session.invalid.enum.ts         # Session validation reasons
├── core/
│   ├── middleware/session.extend.middleware.ts  # Session extension via FrontendApi
│   └── authentication/
│       ├── authentication.service.ts       # Session extension orchestration
│       ├── ory.api.strategy.ts             # Passport strategy for API auth
│       └── verify.identity.if.oidc.auth.ts # OIDC identity verification
├── common/utils/get.session.ts             # Session retrieval helper
├── platform-admin/core/identity/admin.identity.service.ts  # Admin identity ops
├── domain/community/user-identity/user.identity.service.ts # User identity resolution
└── services/api-rest/identity-resolve/identity-resolve.service.ts

# Docker Compose files
quickstart-services.yml
quickstart-services-kratos-debug.yml
quickstart-services-ai.yml
quickstart-services-ai-debug.yml
.devcontainer/docker-compose.yml

# Ory configuration
.build/ory/oathkeeper/oathkeeper.yml        # Proxy config — trust + forward headers
.build/ory/oathkeeper/access-rules.yml       # Access rules (no changes expected)
.build/ory/kratos/kratos.yml                 # Kratos config — audit for v26.2.0
.build/ory/kratos/identity.schema.json       # Identity schema (no changes expected)
.build/ory/kratos/alkemio-claims.jsonnet     # Post-login/registration hook
.build/ory/kratos/kratos-hooks-verification.jsonnet  # Verification hook
.build/ory/kratos/login-backoff-after.jsonnet # Login backoff reset (True-Client-Ip)
.build/ory/kratos/oidc/*.jsonnet             # OIDC provider claim mappers

# package.json
package.json                                 # @ory/kratos-client version bump
```

**Structure Decision**: No new files or modules created. All changes are in-place upgrades to existing files.

## Implementation Phases

### Phase A: Docker Image & Configuration Upgrade

**Scope**: Update Docker Compose files and Oathkeeper/Kratos configuration. No server code changes.

**Steps**:
1. Update all 5 Docker Compose files:
   - Kratos: `oryd/kratos:v1.3.1` → `oryd/kratos:v26.2.0`
   - Hydra: `oryd/hydra:v2.3.0` → `oryd/hydra:v26.2.0`
   - Oathkeeper: `oryd/oathkeeper:v0.38.19-beta.1` → `oryd/oathkeeper:v26.2.0`
2. Update `.build/ory/oathkeeper/oathkeeper.yml`:
   - Add `serve.proxy.trust_forwarded_headers: true`
   - Add `forward_http_headers` to `bearer_token` authenticator (Authorization + custom headers)
   - Add `forward_http_headers` to `cookie_session` authenticator (Cookie + custom headers)
3. Audit `.build/ory/kratos/kratos.yml` for deprecated config keys.
4. Verify Kratos webhook configs (jsonnet files) work with v26.2.0.

**Verification**: `pnpm run start:services` → all containers start, Kratos migrations complete, Oathkeeper serves proxy.

### Phase B: SDK Upgrade & Type Fixes

**Scope**: Upgrade `@ory/kratos-client` to v26.2.0 and fix all compilation errors.

**Steps**:
1. Update `package.json`: `"@ory/kratos-client": "^26.2.0"`
2. Run `pnpm install`
3. Run `pnpm build` to identify type errors
4. Fix each type error in the affected files (see Source Code tree above)
5. Verify `extendSession` 204 handling in `kratos.service.ts:tryExtendSession()`
6. Verify no reliance on `x-total-count` header (confirmed: none exists)

**Verification**: `pnpm build` succeeds with zero type errors. `pnpm lint` passes.

### Phase C: Test Updates & Validation

**Scope**: Update unit tests for new SDK types, run full test suite, perform end-to-end validation.

**Steps**:
1. Update mock objects in test files to match v26.2.0 type shapes
2. Run `pnpm test:ci` — all tests pass
3. Start local services (`pnpm run start:services`) and perform manual validation:
   - Registration flow
   - Login flow (password)
   - Session extension
   - Session listing
   - Identity management (admin)
4. Verify Oathkeeper header forwarding:
   - Send request with `X-Forwarded-For`, `True-Client-Ip`, `x-alkemio-hub`, `X-Geo`
   - Confirm headers reach the server through Oathkeeper

**Verification**: All tests pass. Manual auth flows work end-to-end.

## Complexity Tracking

No constitution violations — table not applicable.

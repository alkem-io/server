# Research: Ory Stack Upgrade to v26.2.0

**Date**: 2026-03-26 | **Branch**: `082-ory-stack-upgrade`

## 1. SDK Package Migration (@ory/kratos-client v1.2.0 → v26.2.0)

### Decision
Upgrade `@ory/kratos-client` from `^1.2.0` to `^26.2.0` in `package.json`. The package name remains the same — Ory did not consolidate into `@ory/client` for self-hosted Kratos usage.

### Rationale
- `@ory/kratos-client@26.2.0` is published on npm and aligns with the unified Ory versioning scheme (YY.Q.patch) introduced in late 2025.
- The `FrontendApi` and `IdentityApi` class structure introduced in SDK v1.x is preserved in v26.2.0. No fundamental API class restructuring is required.
- The `@ory/client` unified package is intended for Ory Network (managed cloud); self-hosted deployments continue to use per-component SDKs.

### Alternatives Considered
- **@ory/client (unified SDK)**: Rejected — designed for Ory Network, not self-hosted Kratos.
- **@ory/client-fetch (fetch-based SDK)**: Rejected — introduces a different HTTP client (fetch vs axios), increasing migration scope.

---

## 2. extendSession Response Change (200 → 204 No Content)

### Decision
Handle `extendSession` returning HTTP 204 No Content with no response body. The current code in `kratos.service.ts:tryExtendSession()` already partially handles this (checks for 200 or 204), but the SDK types for the return value may change.

### Rationale
- Introduced in Kratos v1.3.0 as a feature flag, now the default behavior in v26.2.0.
- The 204 response eliminates an expensive session read-after-write, improving performance.
- The server's `extendSession()` method returns `Promise<void>` — it does not use the session body from the response, so the functional impact is minimal.
- No client-facing GraphQL contract change needed; the server absorbs the 204 internally and returns a success boolean.

### Alternatives Considered
- **Re-fetching the session after extend**: Rejected — defeats the performance improvement of 204.

### Code Impact
- `src/services/infrastructure/kratos/kratos.service.ts` — Verify `tryExtendSession()` handles 204 correctly. The current implementation already checks for status 200 or 204. Verify the SDK v26.2.0 `IdentityApi.extendSession()` return type accommodates 204.
- `src/core/middleware/session.extend.middleware.ts` — Uses `FrontendApi.toSession()` for cookie refresh, not `extendSession()`. No change needed.

---

## 3. x-total-count Header Removal

### Decision
Remove any reliance on the `x-total-count` HTTP response header from Kratos API responses.

### Rationale
- The `x-total-count` header was removed from Kratos session/identity listing endpoints to eliminate expensive COUNT(*) queries.
- The new pagination model uses keyset pagination: the last page is detected when the number of returned items is less than the page size.

### Code Impact
- The current codebase does NOT extract or use the `x-total-count` header from Kratos responses. The `listIdentitySessions()` and `listIdentities()` calls in `kratos.service.ts` return paginated data but total count is not utilized.
- **Risk: LOW** — No code changes needed for this specific item, but the SDK types for paginated responses may change.

---

## 4. Docker Image Tags (Unified Versioning)

### Decision
Update all Docker Compose files to use the Ory unified version tags:
- Kratos: `oryd/kratos:v1.3.1` → `oryd/kratos:v26.2.0`
- Hydra: `oryd/hydra:v2.3.0` → `oryd/hydra:v26.2.0`
- Oathkeeper: `oryd/oathkeeper:v0.38.19-beta.1` → `oryd/oathkeeper:v26.2.0`

### Rationale
- Starting October 2025, all Ory components use a shared versioning number (YY.Q.patch). v26.2.0 means 2026, Q2, first release.
- Unified versioning ensures cross-component compatibility.
- All three images are confirmed available on Docker Hub.

### Files to Update (5 Docker Compose files)
1. `quickstart-services.yml`
2. `quickstart-services-kratos-debug.yml`
3. `quickstart-services-ai.yml`
4. `quickstart-services-ai-debug.yml`
5. `.devcontainer/docker-compose.yml`

---

## 5. Migration CLI Syntax

### Decision
Keep the existing `migrate sql -e --yes` syntax. The official Kratos quickstart.yml (v26.2.0) still uses this exact syntax.

### Rationale
- The Ory CLI now supports `migrate sql up|down|status` subcommands for finer control, but the legacy `migrate sql -e --yes` syntax remains functional and is used in the official quickstart.
- Changing to `migrate sql up` would require verifying flag compatibility (`-e`, `--yes`) with the new subcommand.
- The spec's FR-005 references `migrate sql up` as the new syntax. Research shows this is an available but not mandatory change. **Recommendation**: Keep existing syntax unless it breaks at runtime, which the official quickstart confirms it does not.

### Alternatives Considered
- **Switch to `migrate sql up -e --yes`**: Possible but unnecessary — official quickstart uses the existing syntax.

---

## 6. Oathkeeper Security Fixes & Header Handling

### Decision
Configure `serve.proxy.trust_forwarded_headers: true` and add `forward_http_headers` to both `bearer_token` and `cookie_session` authenticators.

### Rationale
Three CVEs were fixed in Oathkeeper v26.2.0:
- **CVE-2026-33495 (Moderate)**: `X-Forwarded-Proto` was always considered during rule matching regardless of `trust_forwarded_headers` setting. Fixed.
- **CVE-2026-33494 (Critical)**: Path traversal authorization bypass via un-normalized request paths. Fixed.
- **CVE-2026-33496 (High)**: Cache key confusion in `oauth2_introspection` authenticator. Fixed (not used by Alkemio).

**Breaking header behavior**: When `trust_forwarded_headers` is `false` (default), v26.2.0 now strips ALL `X-Forwarded-*` and `Forwarded` headers. Previously only `X-Forwarded`, `X-Forwarded-Host`, and `X-Forwarded-Proto` were removed. This means upgrading without enabling trust will silently break header forwarding.

**forward_http_headers**: The `cookie_session` and `bearer_token` authenticators only forward Cookie/Authorization headers by default. Custom headers must be explicitly listed in `forward_http_headers` to reach the `check_session_url` (Kratos `/sessions/whoami`).

### Configuration Changes Required
```yaml
# .build/ory/oathkeeper/oathkeeper.yml
serve:
  proxy:
    trust_forwarded_headers: true  # NEW — trust Traefik's X-Forwarded-* headers

authenticators:
  bearer_token:
    config:
      forward_http_headers:  # NEW — explicitly forward headers to Kratos whoami
        - Authorization
        - X-Forwarded-For
        - X-Forwarded-Proto
        - X-Real-Ip
        - True-Client-Ip
        - X-Request-ID
        - x-alkemio-hub
        - X-Geo
  cookie_session:
    config:
      forward_http_headers:  # NEW — explicitly forward headers to Kratos whoami
        - Cookie
        - X-Forwarded-For
        - X-Forwarded-Proto
        - X-Real-Ip
        - True-Client-Ip
        - X-Request-ID
        - x-alkemio-hub
        - X-Geo
```

### 429 → 401 Mapping
Oathkeeper v26.2.0 maps Kratos 429 (rate limit) responses to 401 at the authenticator level (commit `12cc3da`). The server receives a 401 and cannot distinguish it from a genuine authentication failure. This is a documented Oathkeeper limitation and should be noted for operators.

---

## 7. Oathkeeper Access Rules Compatibility

### Decision
Existing access rules in `.build/ory/oathkeeper/access-rules.yml` remain structurally compatible. No changes needed to rule matching, authorizers, or mutators.

### Rationale
- The `id_token` mutator, `allow` authorizer, and authenticator chain (`bearer_token` + `cookie_session` + `noop`) are unchanged.
- Path traversal fix (CVE-2026-33494) normalizes paths internally; existing rules do not use path traversal patterns.
- The `preserve_host: true` and `preserve_path: true` settings continue to work as before.

---

## 8. Kratos Configuration Compatibility

### Decision
Audit all Kratos configuration files in `.build/ory/kratos/` for v26.2.0 compatibility. Two config changes are required; all other config is compatible.

### Required Changes

1. **Config schema `version`**: Update `version: v1.3.0` → `version: v26.2.0`. Kratos v26.2.0 logs a warning when the config version doesn't match the binary version. While it still starts, the mismatch can cause new default behaviors to be applied inconsistently.

2. **Verification method `use: link`**: Kratos v26.2.0 changes the default verification method from `link` to `code`. The `code` method **auto-creates a session** after successful email verification. This breaks the registration → verify → login flow because the user is redirected to `/login` with an active session, causing Kratos to return 400 `session_already_available`. Fix: explicitly set `selfservice.flows.verification.use: link` to preserve the v1.3.1 behavior (no auto-session after verification).

### Rationale
- **kratos.yml**: Session configuration (`lifespan`, `earliest_possible_extend`, cookie settings) is structurally stable across versions.
- **identity.schema.json**: JSON Schema format is version-independent. No changes needed.
- **Jsonnet webhooks**: The webhook hook syntax and Jsonnet payload mappers should work. The `login-backoff-after.jsonnet` references `True-Client-Ip` which is in Kratos's hardcoded header allowlist — verified present in v26.2.0.
- **OIDC mappers**: The `oidc/*.jsonnet` claim mappers use standard Jsonnet → traits mapping. Verified compatible.
- **Courier templates**: HTML/plaintext templates are version-independent. Verified compatible.

3. **Microsoft OIDC `subject_source: userinfo`**: Kratos v25.4.0+ changed the default subject identifier for the Microsoft OIDC provider from `sub` (via userinfo) to `oid`. Existing production identities were linked using `sub`. Without pinning `subject_source: userinfo`, upgraded Kratos would look up by `oid` and fail to match existing identities, causing login failures or duplicate accounts. Fix: add `subject_source: userinfo` to the Microsoft provider config. (Ref: server#5941)

### Verification Performed
1. `pnpm run start:services` with v26.2.0 images — Kratos starts, migrations complete.
2. `True-Client-Ip` confirmed in Kratos v26.2.0's hardcoded header allowlist (login-backoff webhook works).
3. Verification flow with `use: link` confirmed working — no auto-session, redirect to `/login` succeeds.
4. Microsoft OIDC login tested locally — works with `subject_source: userinfo`.

---

## 9. SDK Type Changes Assessment

### Decision
Upgrade the SDK and fix compilation errors. The API surface (FrontendApi, IdentityApi) is structurally stable, but type definitions for Session, Identity, and related objects may have field additions/changes.

### Rationale
- Between v1.2.0 and v26.2.0, the following are likely type changes:
  - Session: potential new fields, possibly renamed fields for passkey/WebAuthn support
  - Identity: potential metadata schema changes, credential type additions
  - Pagination: new keyset pagination token fields
  - Error responses: potentially different error shapes for batch operations
- The server uses `Session` and `Identity` types extensively. The upgrade approach should be:
  1. Update `package.json` to `@ory/kratos-client@^26.2.0`
  2. Run `pnpm install`
  3. Run `pnpm build` to find all type errors
  4. Fix each compilation error, updating type usage throughout

### Files Consuming SDK Types (Full List)
| File | Types Used |
|------|-----------|
| `src/services/infrastructure/kratos/kratos.service.ts` | `Configuration`, `FrontendApi`, `Identity`, `IdentityApi`, `Session` |
| `src/services/infrastructure/kratos/types/ory.default.identity.schema.ts` | `Identity` |
| `src/services/infrastructure/kratos/types/kratos.payload.ts` | `Session` |
| `src/core/middleware/session.extend.middleware.ts` | `Configuration`, `FrontendApi`, `Session` |
| `src/common/utils/get.session.ts` | `FrontendApi`, `Session` |
| `src/core/authentication/authentication.service.ts` | `Session` |
| `src/core/authentication/ory.api.strategy.ts` | `Session` |
| `src/core/authentication/verify.identity.if.oidc.auth.ts` | `Session` (indirect) |
| `src/platform-admin/core/identity/admin.identity.service.ts` | `Identity` |
| `src/domain/community/user-identity/user.identity.service.ts` | `Identity` |
| `src/services/api-rest/identity-resolve/identity-resolve.service.ts` | (indirect) |

### Test Files Consuming SDK Types
| File | Types Used |
|------|-----------|
| `src/common/utils/get.session.spec.ts` | `FrontendApi`, `Session` |
| `src/core/authentication/authentication.service.spec.ts` | `Session` |
| `src/core/authentication/ory.api.strategy.spec.ts` | `Session` |
| `src/core/middleware/session.extend.middleware.spec.ts` | (indirect) |
| `src/platform-admin/core/identity/admin.identity.service.spec.ts` | `Identity` |
| `src/domain/community/user-identity/user.identity.service.spec.ts` | `Identity` |
| `src/services/api-rest/identity-resolve/identity-resolve.service.spec.ts` | `Identity` |
| `test/integration/identity-resolve/identity-resolve.controller.spec.ts` | `Identity` |

---

## 10. Risk Assessment

| Risk | Severity | Mitigation | Status |
|------|----------|------------|--------|
| SDK type changes break compilation | Medium | Fix incrementally guided by `pnpm build` errors | **Resolved** — v26.2.0 types are fully backward-compatible, zero code changes needed |
| Oathkeeper silently strips headers | High | Set `trust_forwarded_headers: true` before upgrading | **Resolved** — config applied, headers verified forwarded |
| 429→401 mapping confuses error handling | Low | Document for operators; server already treats 401 as auth failure | **Documented** in oathkeeper.yml comment |
| Kratos DB migration failure | Medium | Test migration on local dev DB first; backup before prod | **Resolved** — migrations complete successfully |
| OIDC flows break due to claim mapping changes | Medium | Test all three providers (LinkedIn, Microsoft, GitHub) | Pending production verification |
| True-Client-Ip removed from Kratos allowlist | Low | Verify at implementation time; fallback exists in backoff hook | **Resolved** — still in allowlist |
| Verification auto-session breaks login flow | **High** | Set `verification.use: link` in kratos.yml | **Resolved** — discovered during testing, v26.2.0 defaults verification to `code` which auto-creates sessions |
| Config version mismatch causes unexpected defaults | Medium | Update `version` in kratos.yml from `v1.3.0` to `v26.2.0` | **Resolved** |
| Microsoft OIDC subject remapping orphans existing identities | **High** | Pin `subject_source: userinfo` on Microsoft provider in kratos.yml | **Resolved** — v25.4.0+ defaults to `oid` instead of `sub`; not visible in fresh dev environments, only affects production data |

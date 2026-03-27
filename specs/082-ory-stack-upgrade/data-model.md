# Data Model: Ory Stack Upgrade to v26.2.0

**Date**: 2026-03-26 | **Branch**: `082-ory-stack-upgrade`

This feature does not introduce new database entities or GraphQL types. The "data model" changes are:
1. SDK type mapping changes (`@ory/kratos-client` v1.2.0 → v26.2.0)
2. Configuration schema changes (Oathkeeper proxy & authenticator config)

---

## 1. SDK Type Mapping: @ory/kratos-client

### Package Change

| Field | Before | After |
|-------|--------|-------|
| Package | `@ory/kratos-client` | `@ory/kratos-client` (unchanged) |
| Version | `^1.2.0` | `^26.2.0` |

### Core Types Used by the Server

#### `Session` (from `@ory/kratos-client`)

Used in: `KratosPayload`, `KratosService`, `AuthenticationService`, `OryApiStrategy`, `SessionExtendMiddleware`, `getSession()` utility.

| Field | v1.2.0 | v26.2.0 | Impact |
|-------|--------|---------|--------|
| `id` | `string` | `string` | None |
| `active` | `boolean?` | `boolean?` | None |
| `expires_at` | `string?` | `string?` | None |
| `authenticated_at` | `string?` | `string?` | None |
| `issued_at` | `string?` | `string?` | None |
| `identity` | `Identity` | `Identity` | See Identity changes |
| `authenticator_assurance_level` | `AuthenticatorAssuranceLevel?` | `AuthenticatorAssuranceLevel?` | None |
| `authentication_methods` | `SessionAuthenticationMethod[]?` | `SessionAuthenticationMethod[]?` | None |
| `devices` | `SessionDevice[]?` | `SessionDevice[]?` | None |
| `tokenized` | N/A | `string?` | New field — not used by server |

**Risk**: LOW — Session type is structurally stable. New fields are additive and optional. The server accesses only `id`, `active`, `expires_at`, `authenticated_at`, `identity`.

#### `Identity` (from `@ory/kratos-client`)

Used in: `OryDefaultIdentitySchema` (extends), `KratosService`, `AdminIdentityService`, `UserIdentityService`.

| Field | v1.2.0 | v26.2.0 | Impact |
|-------|--------|---------|--------|
| `id` | `string` | `string` | None |
| `schema_id` | `string` | `string` | None |
| `schema_url` | `string` | `string` | None |
| `state` | `IdentityState?` | `IdentityState?` | None |
| `state_changed_at` | `string?` | `string?` | None |
| `traits` | `any` | `any` | None |
| `verifiable_addresses` | `VerifiableIdentityAddress[]?` | `VerifiableIdentityAddress[]?` | None |
| `recovery_addresses` | `RecoveryIdentityAddress[]?` | `RecoveryIdentityAddress[]?` | None |
| `metadata_public` | `any?` | `any?` | None |
| `metadata_admin` | `any?` | `any?` | None |
| `credentials` | `{ [key: string]: IdentityCredentials }?` | `{ [key: string]: IdentityCredentials }?` | None |
| `created_at` | `string?` | `string?` | None |
| `updated_at` | `string?` | `string?` | None |
| `organization_id` | N/A | `string?` | New field — not used by server |

**Risk**: LOW — Identity type is structurally stable. `OryDefaultIdentitySchema` extends it with specific field types that should remain compatible.

#### `FrontendApi` Methods

| Method | v1.2.0 Signature | v26.2.0 Signature | Impact |
|--------|-----------------|-------------------|--------|
| `createNativeLoginFlow()` | `(requestParameters?) → Promise<AxiosResponse<LoginFlow>>` | Same | None |
| `updateLoginFlow(params)` | `({ flow, updateLoginFlowBody }) → Promise<AxiosResponse<SuccessfulNativeLogin>>` | Same | None |
| `toSession(params)` | `({ cookie?, xSessionToken? }) → Promise<AxiosResponse<Session>>` | Same | None |

**Risk**: LOW — Method signatures stable between v1.x and v26.2.0.

#### `IdentityApi` Methods

| Method | v1.2.0 Signature | v26.2.0 Signature | Impact |
|--------|-----------------|-------------------|--------|
| `extendSession({ id })` | Returns `AxiosResponse<Session>` (200) | Returns `AxiosResponse<Session>` (200) or empty (204) | **MEDIUM** — must handle both |
| `listIdentities(params)` | Returns `AxiosResponse<Identity[]>` | Same | None |
| `getIdentity({ id })` | Returns `AxiosResponse<Identity>` | Same | None |
| `deleteIdentity({ id })` | Returns `AxiosResponse<void>` | Same | None |
| `patchIdentity({ id, jsonPatch })` | Returns `AxiosResponse<Identity>` | Same | None |
| `listIdentitySessions({ id, active? })` | Returns `AxiosResponse<Session[]>` | Same, but no `x-total-count` header | **LOW** — header not used |

#### `Configuration` Class

| Field | v1.2.0 | v26.2.0 | Impact |
|-------|--------|---------|--------|
| `basePath` | `string?` | `string?` | None |
| Constructor params | `{ basePath }` | `{ basePath }` | None |

**Risk**: NONE — Configuration class is structurally identical.

---

## 2. Server Type Extensions

### `OryDefaultIdentitySchema` (extends `Identity`)

**File**: `src/services/infrastructure/kratos/types/ory.default.identity.schema.ts`

No changes needed — this interface extends `Identity` and adds specific field types. All overridden fields (`created_at`, `id`, `metadata_public`, `recovery_addresses`, etc.) are compatible with the base `Identity` type in v26.2.0.

### `KratosPayload`

**File**: `src/services/infrastructure/kratos/types/kratos.payload.ts`

No changes needed — uses `Session` type for the `session` field. The JWT payload structure is determined by the Oathkeeper `id_token` mutator claims template, not by the SDK.

### `OryTraits`

**File**: `src/services/infrastructure/kratos/types/ory.traits.ts`

No changes needed — this is a custom interface matching the Alkemio identity schema, not an SDK type.

---

## 3. Oathkeeper Configuration Schema Changes

### New: `serve.proxy.trust_forwarded_headers`

```yaml
# .build/ory/oathkeeper/oathkeeper.yml
serve:
  proxy:
    trust_forwarded_headers: true  # NEW in v26.2.0
```

| Setting | Default | Required Value | Reason |
|---------|---------|---------------|--------|
| `trust_forwarded_headers` | `false` | `true` | Traefik injects X-Forwarded-* headers that must reach upstream services. v26.2.0 strips ALL X-Forwarded-* when untrusted (previously only some). |

### New: `forward_http_headers` on Authenticators

The `cookie_session` and `bearer_token` authenticators in v26.2.0 only forward Cookie/Authorization headers to `check_session_url` by default. Custom headers must be explicitly listed.

#### bearer_token Authenticator

```yaml
# Before (v0.38.19-beta.1)
bearer_token:
  enabled: true
  config:
    check_session_url: http://kratos:4433/sessions/whoami
    preserve_path: true
    extra_from: "@this"
    subject_from: "identity.id"
    token_from:
      header: Authorization

# After (v26.2.0)
bearer_token:
  enabled: true
  config:
    check_session_url: http://kratos:4433/sessions/whoami
    preserve_path: true
    extra_from: "@this"
    subject_from: "identity.id"
    token_from:
      header: Authorization
    forward_http_headers:           # NEW
      - Authorization
      - X-Forwarded-For
      - X-Forwarded-Proto
      - X-Real-Ip
      - True-Client-Ip
      - X-Request-ID
      - x-alkemio-hub
      - X-Geo
```

#### cookie_session Authenticator

```yaml
# Before (v0.38.19-beta.1)
cookie_session:
  enabled: true
  config:
    check_session_url: http://kratos:4433/sessions/whoami
    preserve_path: true
    extra_from: "@this"
    subject_from: "identity.id"
    only:
      - ory_kratos_session

# After (v26.2.0)
cookie_session:
  enabled: true
  config:
    check_session_url: http://kratos:4433/sessions/whoami
    preserve_path: true
    extra_from: "@this"
    subject_from: "identity.id"
    only:
      - ory_kratos_session
    forward_http_headers:           # NEW
      - Cookie
      - X-Forwarded-For
      - X-Forwarded-Proto
      - X-Real-Ip
      - True-Client-Ip
      - X-Request-ID
      - x-alkemio-hub
      - X-Geo
```

### Headers Inventory

| Header | Source | Consumer | Purpose |
|--------|--------|----------|---------|
| `X-Forwarded-For` | Traefik | Server, kratos-webhooks | Client IP for audit logs, rate limiting |
| `X-Forwarded-Proto` | Traefik | Server | HTTPS detection |
| `X-Real-Ip` | Traefik | Server | Alternative client IP |
| `True-Client-Ip` | kratos-hooks proxy | Kratos webhooks | Client IP for login backoff (in Kratos hardcoded allowlist) |
| `X-Request-ID` | Traefik / Server | Server | Request correlation |
| `x-alkemio-hub` | Client | Server | Innovation Hub resolution |
| `X-Geo` | Traefik / CDN | Server | Geolocation |

---

## 4. Docker Image Tag Mapping

| Component | Before | After |
|-----------|--------|-------|
| Kratos | `oryd/kratos:v1.3.1` | `oryd/kratos:v26.2.0` |
| Hydra | `oryd/hydra:v2.3.0` | `oryd/hydra:v26.2.0` |
| Oathkeeper | `oryd/oathkeeper:v0.38.19-beta.1` | `oryd/oathkeeper:v26.2.0` |

Files affected: `quickstart-services.yml`, `quickstart-services-kratos-debug.yml`, `quickstart-services-ai.yml`, `quickstart-services-ai-debug.yml`, `.devcontainer/docker-compose.yml`.

---

## 5. No Database Schema Changes

This feature does not modify any Alkemio database entities or migrations. Kratos manages its own database schema internally via `migrate sql -e --yes` at container startup. The Kratos migration from v1.3.1 → v26.2.0 is handled automatically by the Kratos container.

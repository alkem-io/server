# Environment Variables Reference: Synapse-Kratos-Hydra OIDC Authentication

**Feature**: 013-synapse-kratos-oidc
**Date**: 2025-10-21
**Purpose**: Comprehensive reference for all environment variables used in OIDC authentication flow

---

## Table of Contents

1. [Overview](#overview)
2. [Variable Organization Strategy](#variable-organization-strategy)
3. [Shared Secrets (.env.docker)](#shared-secrets-envdocker)
4. [Service-Specific Variables](#service-specific-variables)
5. [NestJS OIDC Controller Variables](#nestjs-oidc-controller-variables)
6. [URL Construction Patterns](#url-construction-patterns)
7. [Environment-Specific Overrides](#environment-specific-overrides)

---

## Overview

This document defines all environment variables required for the Synapse-Kratos-Hydra OIDC integration. Variables are organized following the NFR-004 pattern: **shared secrets in `.env.docker`**, **service-specific URLs composed in service definitions** using component variables.

**Architecture**: Synapse (OIDC Client) → Ory Hydra (OAuth2/OIDC Server) → alkemio-server (NestJS OIDC Controllers) → Ory Kratos (Identity Provider)

---

## Variable Organization Strategy

### Principle: Component-Based Configuration

Following the existing Kratos pattern (see `quickstart-services.yml` line 66), we compose complex values (URLs, DSNs) from reusable components:

```yaml
# ✅ GOOD: Compose DSN from components
environment:
  - DSN=postgres://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/hydra?sslmode=disable
# ❌ BAD: Hardcode full DSN in .env.docker
# HYDRA_DSN=postgres://synapse:synapse@postgres:5432/hydra?sslmode=disable
```

**Benefits**:

- **Flexibility**: Easy to override individual components (e.g., change database host in K8s)
- **Security**: Passwords in single place (`.env.docker`), not duplicated across DSNs
- **Maintainability**: Update POSTGRES_PASSWORD once, all DSNs reflect change
- **Deployment portability**: Same config works for Docker Compose and K8s with different overrides

### Variable Categories

| Category                    | Storage Location                             | Example                                                             |
| --------------------------- | -------------------------------------------- | ------------------------------------------------------------------- |
| **Shared Secrets**          | `.env.docker`                                | `HYDRA_SYSTEM_SECRET`, `SYNAPSE_OIDC_CLIENT_SECRET`                 |
| **Component Values**        | `.env.docker`                                | `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_MULTIPLE_DATABASES` |
| **Simple Config**           | `.env.docker`                                | `SYNAPSE_OIDC_CLIENT_ID`                                            |
| **Composed URLs/DSNs**      | Service definition (quickstart-services.yml) | `DSN=postgres://${POSTGRES_USER}:...`                               |
| **Service-Specific**        | Service definition                           | `URLS_SELF_ISSUER`, `URLS_LOGIN`, `URLS_CONSENT`                    |
| **alkemio-server (NestJS)** | `alkemio.yml` or service definition          | `OIDC_WEB_BASE_URL`, `OIDC_API_PUBLIC_BASE_PATH`                    |

---

## Shared Secrets (.env.docker)

These variables MUST be defined in `.env.docker` and kept secure (not committed to git).

### Hydra Secrets

| Variable              | Type   | Example       | Purpose                            | Generation             |
| --------------------- | ------ | ------------- | ---------------------------------- | ---------------------- |
| `HYDRA_SYSTEM_SECRET` | Secret | `d6fbf37a...` | System secret for Hydra encryption | `openssl rand -hex 32` |

### Synapse OIDC Client Credentials

| Variable                     | Type   | Example          | Purpose                          | Generation                |
| ---------------------------- | ------ | ---------------- | -------------------------------- | ------------------------- |
| `SYNAPSE_OIDC_CLIENT_ID`     | Config | `synapse-client` | OAuth2 client ID for Synapse     | Manually set              |
| `SYNAPSE_OIDC_CLIENT_SECRET` | Secret | `Ihky1jTs...`    | OAuth2 client secret for Synapse | `openssl rand -base64 32` |

### Database Component Values

| Variable                      | Type   | Example         | Purpose                     | Notes                   |
| ----------------------------- | ------ | --------------- | --------------------------- | ----------------------- |
| `POSTGRES_USER`               | Config | `synapse`       | PostgreSQL username         | Used in DSN composition |
| `POSTGRES_PASSWORD`           | Secret | `synapse`       | PostgreSQL password         | Used in DSN composition |
| `POSTGRES_MULTIPLE_DATABASES` | Config | `synapse,hydra` | Databases to create on init | Comma-separated list    |

### Why These Are in .env.docker

- **Secrets**: Must be generated securely and kept out of version control
- **Component Values**: Reused across multiple service DSNs (DRY principle)
- **Simple Config**: Shared between services (e.g., `SYNAPSE_OIDC_CLIENT_ID` used by Synapse and Hydra client registration)

---

## Service-Specific Variables

These variables are defined **inline in service definitions** in `quickstart-services.yml`, composed from component values.

### Hydra Service Environment

**File**: `quickstart-services.yml` → `services.hydra.environment`

| Variable                          | Value Pattern                                                                          | Example               | Purpose                                 |
| --------------------------------- | -------------------------------------------------------------------------------------- | --------------------- | --------------------------------------- |
| `DSN`                             | `postgres://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/hydra?sslmode=disable` | Full DSN              | Hydra database connection               |
| `SECRETS_SYSTEM`                  | `${HYDRA_SYSTEM_SECRET}`                                                               | From .env.docker      | Hydra encryption key                    |
| `URLS_SELF_ISSUER`                | `http://localhost/`                                                                    | Public issuer URL     | OIDC issuer identifier (via Traefik)    |
| `URLS_LOGIN`                      | `http://localhost/api/public/rest/oidc/login`                                          | Login challenge URL   | Where Hydra redirects for login         |
| `URLS_CONSENT`                    | `http://localhost/api/public/rest/oidc/consent`                                        | Consent challenge URL | Where Hydra redirects for consent       |
| `URLS_SELF_PUBLIC`                | `http://hydra:4444/`                                                                   | Internal public URL   | Hydra's own public API (Docker network) |
| `URLS_SELF_ADMIN`                 | `http://hydra:4445/`                                                                   | Internal admin URL    | Hydra's own admin API (Docker network)  |
| `SERVE_PUBLIC_CORS_ENABLED`       | `true`                                                                                 | CORS flag             | Enable CORS for public API              |
| `SERVE_ADMIN_CORS_ENABLED`        | `true`                                                                                 | CORS flag             | Enable CORS for admin API               |
| `OAUTH2_ALLOWED_TOP_LEVEL_CLAIMS` | `email,email_verified,given_name,family_name`                                          | Claims list           | Claims passed to OIDC clients           |
| `LOG_LEVEL`                       | `debug`                                                                                | Log level             | Hydra logging verbosity                 |

**Why Inline**:

- **Service-specific**: Only Hydra needs these exact values
- **Composed from components**: DSN uses ${POSTGRES_USER}, ${POSTGRES_PASSWORD}
- **Environment-aware**: Different for Docker Compose vs K8s (e.g., `localhost` → actual domain in prod)

### Synapse Service Environment (OIDC-Specific)

**File**: `quickstart-services.yml` → `services.synapse.environment`

| Variable                     | Value Pattern                   | Example          | Purpose                          |
| ---------------------------- | ------------------------------- | ---------------- | -------------------------------- |
| `SYNAPSE_OIDC_CLIENT_ID`     | `${SYNAPSE_OIDC_CLIENT_ID}`     | `synapse-client` | OAuth2 client ID for Synapse     |
| `SYNAPSE_OIDC_CLIENT_SECRET` | `${SYNAPSE_OIDC_CLIENT_SECRET}` | Base64 secret    | OAuth2 client secret for Synapse |

**Note**: These reference `.env.docker` values. Additional OIDC config is in `.build/synapse/homeserver.yaml` (issuer URL, scopes, attribute mappings).

### Hydra Client Registration (hydra-client-setup service)

**File**: `quickstart-services.yml` → `services.hydra-client-setup.environment`

| Variable                     | Value Pattern                   | Example          | Purpose                   |
| ---------------------------- | ------------------------------- | ---------------- | ------------------------- |
| `SYNAPSE_OIDC_CLIENT_ID`     | `${SYNAPSE_OIDC_CLIENT_ID}`     | `synapse-client` | Client ID to register     |
| `SYNAPSE_OIDC_CLIENT_SECRET` | `${SYNAPSE_OIDC_CLIENT_SECRET}` | Base64 secret    | Client secret to register |

---

## NestJS OIDC Controller Variables

These variables configure the **alkemio-server NestJS OIDC controllers** (`src/services/api/oidc/`). They can be defined in:

1. **alkemio.yml** (config file) with environment variable fallbacks
2. **Environment variables** (Docker Compose service definition, K8s ConfigMap)
3. **Direct .env.docker** (for quickstart simplicity)

### Required Variables for OidcConfig

**File**: `src/services/api/oidc/oidc.config.ts`

| Variable                               | Type | Example (Quickstart)    | Purpose                                     | Fallback               |
| -------------------------------------- | ---- | ----------------------- | ------------------------------------------- | ---------------------- |
| `OIDC_WEB_BASE_URL`                    | URL  | `http://localhost:3000` | Public web base URL (Traefik entrypoint)    | `ALKEMIO_WEB_BASE_URL` |
| `OIDC_API_PUBLIC_BASE_PATH`            | Path | `/api/public/rest`      | Public REST API base path                   | None (required)        |
| `OIDC_KRATOS_PUBLIC_BASE_PATH`         | Path | `/ory/kratos/public`    | Kratos public API path (via Traefik)        | None (required)        |
| `OIDC_HYDRA_PUBLIC_INTERNAL_BASE_URL`  | URL  | `http://hydra:4444`     | Hydra public URL (internal Docker network)  | None (required)        |
| `OIDC_KRATOS_PUBLIC_INTERNAL_BASE_URL` | URL  | `http://kratos:4433`    | Kratos public URL (internal Docker network) | None (required)        |

### Variable Descriptions

#### OIDC_WEB_BASE_URL (ALKEMIO_WEB_BASE_URL)

**Purpose**: The public base URL for the Alkemio platform accessible from the browser.

**Usage in OIDC flow**:

- Constructing return URLs after Kratos login: `${OIDC_WEB_BASE_URL}/api/public/rest/oidc/login?login_challenge=...`
- Constructing Kratos login URL: `${OIDC_WEB_BASE_URL}/ory/kratos/public/self-service/login/browser`
- Rewriting internal redirect URLs to public URLs

**Environment-specific values**:

- **Quickstart (Docker Compose)**: `http://localhost:3000` (Traefik web entrypoint)
- **Development (K8s)**: `https://dev.alkem.io`
- **Production (K8s)**: `https://alkem.io`

**Fallback**: Can use existing `ALKEMIO_WEB_BASE_URL` from alkemio.yml (`hosting.endpoint_cluster`)

#### OIDC_API_PUBLIC_BASE_PATH

**Purpose**: The path prefix for public REST API endpoints where OIDC controllers are mounted.

**Usage in OIDC flow**:

- Constructing full login endpoint: `${OIDC_WEB_BASE_URL}${OIDC_API_PUBLIC_BASE_PATH}/oidc/login`
- Constructing full consent endpoint: `${OIDC_WEB_BASE_URL}${OIDC_API_PUBLIC_BASE_PATH}/oidc/consent`

**Environment-specific values**:

- **All environments**: `/api/public/rest` (consistent across Docker Compose and K8s)

**Fallback**: Can use existing `PATH_API_PUBLIC_REST` from alkemio.yml (`hosting.path_api_public_rest`)

#### OIDC_KRATOS_PUBLIC_BASE_PATH

**Purpose**: The path prefix for Kratos public API accessible through Traefik.

**Usage in OIDC flow**:

- Constructing Kratos login URL: `${OIDC_WEB_BASE_URL}${OIDC_KRATOS_PUBLIC_BASE_PATH}/self-service/login/browser`
- Constructing Kratos whoami URL: `${OIDC_WEB_BASE_URL}${OIDC_KRATOS_PUBLIC_BASE_PATH}/sessions/whoami`

**Environment-specific values**:

- **Quickstart (Docker Compose)**: `/ory/kratos/public` (Traefik routing)
- **K8s**: Same, but base URL changes to actual domain

**Note**: This is NOT the same as `AUTH_ORY_KRATOS_PUBLIC_BASE_URL` in alkemio.yml, which includes the full URL (not just path).

#### OIDC_HYDRA_PUBLIC_INTERNAL_BASE_URL

**Purpose**: Internal Docker network URL for Hydra's public API. Used by OIDC controllers for redirect URL rewriting.

**Usage in OIDC flow**:

- Rewriting redirect URLs: When Hydra Admin API returns `redirect_to: "http://hydra:4444/oauth2/auth?..."`, rewrite to `http://localhost:3000/oauth2/auth?...`

**Environment-specific values**:

- **Quickstart (Docker Compose)**: `http://hydra:4444` (Docker Compose service name)
- **K8s**: `http://hydra-service:4444` (K8s service name)

**Why needed**: Hydra's internal redirects use Docker/K8s service names, which are not accessible from browsers. OIDC controllers rewrite these to public URLs.

#### OIDC_KRATOS_PUBLIC_INTERNAL_BASE_URL

**Purpose**: Internal Docker network URL for Kratos's public API. Used by OIDC controllers for redirect URL rewriting.

**Usage in OIDC flow**:

- Rewriting redirect URLs: When Kratos returns `redirect_to: "http://kratos:4433/self-service/login?..."`, rewrite to `http://localhost:3000/ory/kratos/public/self-service/login?...`

**Environment-specific values**:

- **Quickstart (Docker Compose)**: `http://kratos:4433` (Docker Compose service name)
- **K8s**: `http://kratos-public:4433` (K8s service name)

**Why needed**: Similar to Hydra, Kratos uses internal service names in redirects that browsers cannot access.

### Where to Define These Variables

**Option 1: Direct in .env.docker (Quickstart simplicity)**

```bash
# OIDC Controller Configuration
OIDC_WEB_BASE_URL=http://localhost:3000
OIDC_API_PUBLIC_BASE_PATH=/api/public/rest
OIDC_KRATOS_PUBLIC_BASE_PATH=/ory/kratos/public
OIDC_HYDRA_PUBLIC_INTERNAL_BASE_URL=http://hydra:4444
OIDC_KRATOS_PUBLIC_INTERNAL_BASE_URL=http://kratos:4433
```

**Option 2: alkemio.yml with environment variable overrides**

```yaml
# In alkemio.yml (new section)
oidc:
  web_base_url: ${OIDC_WEB_BASE_URL}:http://localhost:3000
  api_public_base_path: ${OIDC_API_PUBLIC_BASE_PATH}:/api/public/rest
  kratos_public_base_path: ${OIDC_KRATOS_PUBLIC_BASE_PATH}:/ory/kratos/public
  hydra_public_internal_base_url: ${OIDC_HYDRA_PUBLIC_INTERNAL_BASE_URL}:http://hydra:4444
  kratos_public_internal_base_url: ${OIDC_KRATOS_PUBLIC_INTERNAL_BASE_URL}:http://kratos:4433
```

**Option 3: K8s ConfigMap**

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: alkemio-server-oidc-config
data:
  OIDC_WEB_BASE_URL: 'https://dev.alkem.io'
  OIDC_API_PUBLIC_BASE_PATH: '/api/public/rest'
  OIDC_KRATOS_PUBLIC_BASE_PATH: '/ory/kratos/public'
  OIDC_HYDRA_PUBLIC_INTERNAL_BASE_URL: 'http://hydra-service:4444'
  OIDC_KRATOS_PUBLIC_INTERNAL_BASE_URL: 'http://kratos-public:4433'
```

**Recommendation for Quickstart**: Use **Option 1** (direct in .env.docker) for simplicity. Production deployments should use **Option 3** (K8s ConfigMap).

---

## URL Construction Patterns

### Authentication Flow URL Composition

The OIDC controllers construct URLs dynamically using the configured base URLs and paths:

| Target                    | Construction Pattern                                                                           | Example Result                                                                     |
| ------------------------- | ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| **Kratos Login**          | `${OIDC_WEB_BASE_URL}${OIDC_KRATOS_PUBLIC_BASE_PATH}/self-service/login/browser?return_to=...` | `http://localhost:3000/ory/kratos/public/self-service/login/browser?return_to=...` |
| **OIDC Login Callback**   | `${OIDC_WEB_BASE_URL}${OIDC_API_PUBLIC_BASE_PATH}/oidc/login?login_challenge=...`              | `http://localhost:3000/api/public/rest/oidc/login?login_challenge=...`             |
| **OIDC Consent Callback** | `${OIDC_WEB_BASE_URL}${OIDC_API_PUBLIC_BASE_PATH}/oidc/consent?consent_challenge=...`          | `http://localhost:3000/api/public/rest/oidc/consent?consent_challenge=...`         |
| **Kratos Whoami**         | `${OIDC_WEB_BASE_URL}${OIDC_KRATOS_PUBLIC_BASE_PATH}/sessions/whoami`                          | `http://localhost:3000/ory/kratos/public/sessions/whoami`                          |

### Redirect URL Rewriting

When Hydra or Kratos return redirect URLs with internal service names, the OIDC controller rewrites them:

| Internal URL (from Hydra/Kratos)            | Public URL (rewritten)                                           |
| ------------------------------------------- | ---------------------------------------------------------------- |
| `http://hydra:4444/oauth2/auth?...`         | `http://localhost:3000/oauth2/auth?...`                          |
| `http://kratos:4433/self-service/login?...` | `http://localhost:3000/ory/kratos/public/self-service/login?...` |

**Implementation**: See `OidcController.rewriteRedirectUrl()` method.

---

## Environment-Specific Overrides

### Quickstart (Docker Compose)

**File**: `.env.docker`

```bash
# Component values
POSTGRES_USER=synapse
POSTGRES_PASSWORD=synapse
POSTGRES_MULTIPLE_DATABASES=synapse,hydra

# Secrets
HYDRA_SYSTEM_SECRET=<generated>
SYNAPSE_OIDC_CLIENT_SECRET=<generated>
SYNAPSE_OIDC_CLIENT_ID=synapse-client

# OIDC Controller Config
OIDC_WEB_BASE_URL=http://localhost:3000
OIDC_API_PUBLIC_BASE_PATH=/api/public/rest
OIDC_KRATOS_PUBLIC_BASE_PATH=/ory/kratos/public
OIDC_HYDRA_PUBLIC_INTERNAL_BASE_URL=http://hydra:4444
OIDC_KRATOS_PUBLIC_INTERNAL_BASE_URL=http://kratos:4433
```

### Development (K8s)

**K8s ConfigMap**: `alkemio-server-oidc-config`

```yaml
OIDC_WEB_BASE_URL: 'https://dev.alkem.io'
OIDC_API_PUBLIC_BASE_PATH: '/api/public/rest'
OIDC_KRATOS_PUBLIC_BASE_PATH: '/ory/kratos/public'
OIDC_HYDRA_PUBLIC_INTERNAL_BASE_URL: 'http://hydra-service:4444'
OIDC_KRATOS_PUBLIC_INTERNAL_BASE_URL: 'http://kratos-public:4433'
```

**K8s Secret**: `postgres-credentials`

```yaml
POSTGRES_USER: 'synapse'
POSTGRES_PASSWORD: '<base64-encoded>'
```

### Production (K8s)

**K8s ConfigMap**: `alkemio-server-oidc-config`

```yaml
OIDC_WEB_BASE_URL: 'https://alkem.io'
OIDC_API_PUBLIC_BASE_PATH: '/api/public/rest'
OIDC_KRATOS_PUBLIC_BASE_PATH: '/ory/kratos/public'
OIDC_HYDRA_PUBLIC_INTERNAL_BASE_URL: 'http://hydra-service.alkemio-production.svc.cluster.local:4444'
OIDC_KRATOS_PUBLIC_INTERNAL_BASE_URL: 'http://kratos-public.alkemio-production.svc.cluster.local:4433'
```

**K8s Secret**: `hydra-secrets`

```yaml
HYDRA_SYSTEM_SECRET: '<base64-encoded>'
```

---

## Summary Checklist

### Variables in .env.docker (Quickstart)

- [x] `HYDRA_SYSTEM_SECRET` (secret, 32-byte hex)
- [x] `SYNAPSE_OIDC_CLIENT_ID` (config, `synapse-client`)
- [x] `SYNAPSE_OIDC_CLIENT_SECRET` (secret, base64)
- [x] `POSTGRES_USER` (config, `synapse`)
- [x] `POSTGRES_PASSWORD` (secret, `synapse`)
- [x] `POSTGRES_MULTIPLE_DATABASES` (config, `synapse,hydra`)
- [ ] `OIDC_WEB_BASE_URL` (config, `http://localhost:3000`) - **TO BE ADDED**
- [ ] `OIDC_API_PUBLIC_BASE_PATH` (config, `/api/public/rest`) - **TO BE ADDED**
- [ ] `OIDC_KRATOS_PUBLIC_BASE_PATH` (config, `/ory/kratos/public`) - **TO BE ADDED**
- [ ] `OIDC_HYDRA_PUBLIC_INTERNAL_BASE_URL` (config, `http://hydra:4444`) - **TO BE ADDED**
- [ ] `OIDC_KRATOS_PUBLIC_INTERNAL_BASE_URL` (config, `http://kratos:4433`) - **TO BE ADDED**

### Variables in quickstart-services.yml (Hydra service)

- [x] `DSN` (composed from POSTGRES_USER, POSTGRES_PASSWORD)
- [x] `SECRETS_SYSTEM` (from HYDRA_SYSTEM_SECRET)
- [x] `URLS_SELF_ISSUER` (inline, `http://localhost/`)
- [x] `URLS_LOGIN` (inline, `http://localhost/api/public/rest/oidc/login`)
- [x] `URLS_CONSENT` (inline, `http://localhost/api/public/rest/oidc/consent`)
- [x] `URLS_SELF_PUBLIC` (inline, `http://hydra:4444/`)
- [x] `URLS_SELF_ADMIN` (inline, `http://hydra:4445/`)

### Variables NOT Hardcoded Anywhere

- ❌ Full DSN strings in .env.docker (composed in service definitions)
- ❌ Hardcoded URLs in NestJS controllers (all from OidcConfig)
- ❌ Database hostnames/ports in .env.docker (use Docker Compose service names)

---

## Migration from Hardcoded Values

### Before (Hardcoded)

```typescript
// ❌ BAD: Hardcoded in controller
const kratosLoginUrl = `http://localhost:3000/ory/kratos/public/self-service/login/browser`;
```

### After (Environment-Based)

```typescript
// ✅ GOOD: Composed from config
const kratosLoginUrl = `${this.oidcConfig.getWebBaseUrl()}${this.oidcConfig.getKratosPublicBasePath()}/self-service/login/browser`;
```

**Status**: OIDC controller already uses `OidcConfig` service ✅. Need to add missing variables to `.env.docker`.

---

## Next Steps

1. **Add missing OIDC\_\* variables to `.env.docker`** (Task continuation)
2. **Verify no hardcoded URLs remain in OIDC controller** (audit complete, all use OidcConfig ✅)
3. **Update quickstart.md** to document all environment variables
4. **Update tasks.md** to mark environment variable organization complete
5. **Test environment variable overrides** in different deployment scenarios

---

**Last Updated**: 2025-10-21
**Maintainer**: Alkemio Development Team
**Related Files**:

- `.env.docker` (secrets and component values)
- `quickstart-services.yml` (service-specific composed values)
- `src/services/api/oidc/oidc.config.ts` (NestJS OIDC config)
- `alkemio.yml` (alkemio-server configuration)

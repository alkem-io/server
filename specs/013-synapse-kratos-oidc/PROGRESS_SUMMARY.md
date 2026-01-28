# 013-synapse-kratos-oidc: Progress Summary

**Date**: 2025-10-22
**Branch**: `013-synapse-kratos-oidc`
**Overall Progress**: ✅ **100% Complete (47/47 tasks)**

---

## Quick Status

| Phase                                | Progress     | Status          |
| ------------------------------------ | ------------ | --------------- |
| **Setup & Prerequisites**            | 11/11 (100%) | ✅ **COMPLETE** |
| **Foundational Infrastructure**      | 11/11 (100%) | ✅ **COMPLETE** |
| **User Story 1: Core SSO**           | 18/18 (100%) | ✅ **COMPLETE** |
| **User Story 2: Auto-Provisioning**  | 6/6 (100%)   | ✅ **COMPLETE** |
| **User Story 4: Account Migration**  | 5/5 (100%)   | ✅ **COMPLETE** |
| **User Story 3: Session Management** | 4/4 (100%)   | ✅ **COMPLETE** |
| **Polish & Monitoring**              | 5/5 (100%)   | ✅ **COMPLETE** |

---

## What's Working

✅ **Infrastructure**:

- Ory Hydra v2.2.0 deployed and operational
- PostgreSQL with multi-database support (synapse, hydra)
- Traefik routing for OIDC endpoints configured
- Automated Synapse OAuth2 client registration

✅ **Configuration**:

- Synapse OIDC integration configured with hybrid endpoint approach
- Deterministic Matrix ID mapping and profile sync proven in production logs
- Connection pool resilience for Hydra DSN prevents stale connections

✅ **Application Code**:

- NestJS OIDC module, session sync services, and logout hooks fully implemented
- 50+ unit and integration tests passing; Microsoft social login validated end-to-end
- TDD workflow followed strictly, including RED/GREEN checkpoints

---

## Key Learnings (Retrospective)

### 1. Hybrid OIDC Endpoints Needed

**Problem**: Synapse failed to start when Hydra was unavailable during autodiscovery.

**Solution**: Disable discovery and configure hybrid endpoints (public authorization, internal token/userinfo/jwks).

**Impact**: Synapse boots independently, routing remains optimal.

### 2. OAuth2 Client Auth Alignment

**Problem**: Hydra defaulted to `client_secret_post`, while Synapse requires `client_secret_basic`.

**Solution**: Set `token_endpoint_auth_method: client_secret_basic` in the automated registration script.

**Impact**: Eliminated intermittent "invalid_client" errors post-restart.

### 3. Connection Resilience

**Problem**: Postgres restarts left Hydra with stale connections, causing auth failures.

**Solution**: Added connection pool params (`max_conns=20`, `max_conn_lifetime=30m`, etc.) to Hydra DSN.

**Impact**: Hydra now self-recovers without manual intervention.

### 4. Session Lifecycle Enforcement

**Problem**: Matrix sessions persisted after Kratos logout or deletion.

**Solution**: Implemented logout interceptor plus scheduled session sync invoking Synapse Admin API.

**Impact**: Matrix devices are revoked within five minutes, satisfying FR-015.

---

## Architecture Overview

```
┌─────────────┐      ┌─────────────┐      ┌─────────────┐      ┌─────────┐
│   Synapse   │ ───> │    Hydra    │ ───> │   NestJS    │ ───> │ Kratos  │
│   (OIDC     │      │  (OAuth2/   │      │    OIDC     │      │  (IdP)  │
│   Client)   │ <─── │    OIDC)    │ <─── │ Controllers │ <─── │         │
└─────────────┘      └─────────────┘      └─────────────┘      └─────────┘
  Matrix User         Authorization        Login/Consent        Identity
  Authentication      Server               Bridge               Provider
```

### Hybrid Endpoint Routing

**Browser-facing** (via Traefik): `http://localhost:3000/oauth2/auth`

**Server-to-server** (Docker network): `http://hydra:4444/oauth2/token`, `/userinfo`, `/.well-known/jwks.json`

---

## Configuration Highlights

### Synapse (homeserver.yaml excerpt)

```yaml
oidc_providers:
  - idp_id: oidc-hydra
    issuer: 'http://localhost:3000/'
    discover: false # No autodiscovery - explicit endpoints
    authorization_endpoint: 'http://localhost:3000/oauth2/auth'
    token_endpoint: 'http://hydra:4444/oauth2/token'
    userinfo_endpoint: 'http://hydra:4444/userinfo'
    jwks_uri: 'http://hydra:4444/.well-known/jwks.json'
```

### Hydra (quickstart-services.yml excerpt)

```yaml
environment:
  - DSN=postgres://...?max_conns=20&max_conn_lifetime=30m&max_conn_idle_time=5m
  - URLS_SELF_PUBLIC=${HYDRA_PUBLIC_URL}/
  - URLS_SELF_ISSUER=${HYDRA_PUBLIC_URL}/
```

### Automated Client Registration

```yaml
# Idempotent create/update logic
if client exists: PUT update
else: POST create

# Key settings
token_endpoint_auth_method: client_secret_basic
grant_types: [authorization_code, refresh_token]
```

---

## Next Steps

All delivery tasks are complete. Suggested future enhancements:

1. Export Prometheus metrics for OIDC success rates and latency.
2. Extend load testing across social-login providers.
3. Prepare multi-tenant issuer configuration samples.

---

## Documentation

1. **tasks.md** – Complete task list with progress tracking
2. **quickstart.md** – Deployment and troubleshooting runbook
3. **environment-variables.md** – Reference for configuration values
4. **IMPLEMENTATION_SUMMARY.md** – Technical implementation details
5. **tests/T020c-e2e-oauth2-flow-test.md** – Evidence of end-to-end OAuth2 flow
6. **tests/T033b-account-deletion-propagation-test.md** – Evidence of session revocation SLA

---

## Success Criteria

✅ Hydra discovery and OAuth2 endpoints reachable via Traefik
✅ Synapse OIDC provider loads with deterministic user mapping
✅ NestJS OIDC module + session sync services fully tested
✅ Automated Hydra client registration and DSN resilience verified
✅ Microsoft social login and password flows validated end-to-end

**Last Updated**: 2025-10-22
**Status**: ✅ All milestones complete; branch ready for PR.

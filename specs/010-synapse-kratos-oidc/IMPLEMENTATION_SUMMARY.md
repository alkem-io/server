# Synapse–Kratos–Hydra OIDC: Implementation Summary

**Feature**: 010-synapse-kratos-oidc  \\
**Branch**: `010-synapse-kratos-oidc`  \\
**Last updated**: 2025-10-22  \\
**Status**: ✅ Delivery complete; ready for PR merge.

## Scope in One Page
- **Goal achieved**: Synapse now trusts Hydra for OIDC, with NestJS controllers brokering login and consent to Kratos identities.
- **Environment**: Docker-compose stack provisions Hydra migrate/serve containers, Synapse homeserver, Kratos, Traefik, Postgres; secrets defined in `.env.docker`.
- **Application code**: New `OidcModule` (controllers + service + DTOs + config) handles Hydra Admin API, Kratos session checks, consent automation, and structured logging.
- **Session sync**: Logout interceptor plus interval sync ensure Matrix devices are revoked within five minutes of Kratos logout or deletion.
- **Documentation**: `docs/Developing.md`, `docs/Running.md`, `docs/authentication/authentication_flow.md`, and `specs/010-synapse-kratos-oidc/quickstart.md` refreshed with Hydra/Synapse flow, troubleshooting and env guidance.

## Architecture Snapshot
```
Element / Matrix Client
        │  (OIDC auth)
        ▼
Synapse homeserver ──► Hydra public endpoints (/.well-known, /oauth2/*)
                                   │
                                   ▼
Alkemio server OIDC controllers ──► Hydra admin API ──► Kratos identity
```
- Public browser traffic enters Hydra via Traefik on `http://localhost:3000`; backend calls remain on Docker hostnames (`hydra:4444`, `kratos:4433`).
- Synapse maps Matrix IDs deterministically from Kratos email localparts and syncs display name/email on each login.

## Deliverables
- **Infrastructure**: Postgres multi-db init script, Hydra migration + runtime services, Traefik routing, Synapse OIDC configuration (`build/synapse/homeserver.yaml`), idempotent Hydra client bootstrap.
- **Application**: `src/services/api/oidc/*` controllers/services/config with typed DTOs, consent auto-accept, Kratos session verification, structured logging context, session synchronization services.
- **Testing**: >50 unit/integration specs covering login, consent, Hydra API error paths, session sync; documented manual Microsoft social login and full OAuth2 flow in `tests/T020c-e2e-oauth2-flow-test.md`.
- **Operations**: Troubleshooting catalogue, env variable reference, and health-check commands consolidated in `specs/010-synapse-kratos-oidc/quickstart.md`.

## Evidence
- `pnpm test -- src/services/api/oidc` passes with statement coverage ≥80% for controllers/service/config; session-sync specs pass.
- Manual verification captures Synapse/Hydra logs, Postgres `user_external_ids` entries, and Microsoft social login walkthrough.
- Token refresh (300s), Kratos outage handling (FR-014 messaging), and account deletion propagation (FR-015) validated and logged.

## Operational Notes
- Secrets required: `HYDRA_SYSTEM_SECRET`, `SYNAPSE_OIDC_CLIENT_ID`, `SYNAPSE_OIDC_CLIENT_SECRET`, `POSTGRES_MULTIPLE_DATABASES`; all stored in `.env.docker` and ignored by git.
- Regenerate Synapse configuration volume after edits with `docker compose down -v synapse-data` followed by `pnpm run start:services`.
- `hydra-client-setup` sidecar safely re-registers the Synapse client; reruns are idempotent.
- Health checks: `curl http://localhost:3000/.well-known/openid-configuration`, `docker logs alkemio_dev_synapse | grep oidc-hydra`.

## Follow-up Opportunities
1. Export Prometheus metrics for auth success rate and latency once observability stack is ready.
2. Prepare multi-tenant issuer overrides for future deployments.
3. Run synthetic load against Hydra/Synapse to benchmark concurrent social logins.

## Summary

This delivery wires Synapse authentication through Hydra and Kratos using a thoroughly tested NestJS OIDC bridge, automated provisioning, and documented operational playbooks. The branch is ready to merge.

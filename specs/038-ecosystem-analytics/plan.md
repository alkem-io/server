# Implementation Plan: Ecosystem Analytics Docker Compose Integration

**Branch**: `038-ecosystem-analytics` | **Date**: 2026-03-04 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/038-ecosystem-analytics/spec.md`

## Summary

Add the ecosystem analytics service to the local development Docker Compose stack (`quickstart-services.yml`) with Traefik routing at `/analytics`, stripping the prefix before forwarding to the service's BFF on port 4000. The service uses the Scaleway-hosted container image and authenticates via the existing Kratos identity service.

## Technical Context

**Language/Version**: N/A (infrastructure-only change — Docker Compose YAML + Traefik config)
**Primary Dependencies**: Docker Compose, Traefik v2.9.6, ecosystem-analytics container image
**Storage**: N/A (service connects to Alkemio server via GraphQL, no own database)
**Testing**: Manual verification — start services, confirm routing, confirm health endpoint
**Target Platform**: Local development environment (Docker Compose)
**Project Type**: Infrastructure configuration
**Performance Goals**: N/A (no performance-sensitive changes)
**Constraints**: Must not conflict with existing service ports; must use existing `alkemio_dev_net` network
**Scale/Scope**: 2 files modified (`quickstart-services.yml`, `.build/traefik/http.yml`)

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle | Status | Notes |
| --------- | ------ | ----- |
| 1. Domain-Centric Design | N/A | No domain logic changes |
| 2. Modular NestJS Boundaries | N/A | No NestJS module changes |
| 3. GraphQL Schema as Contract | N/A | No schema changes |
| 4. Explicit Data & Event Flow | N/A | No state changes or events |
| 5. Observability & Readiness | Pass | Health check endpoint configured at `/api/health` |
| 6. Code Quality with Testing | Pass | Manual verification appropriate for infra config |
| 7. API Consistency | N/A | No API changes |
| 8. Secure-by-Design | Pass | Service uses existing Kratos auth; no new secrets exposed |
| 9. Container Determinism | Deviation | Using `latest` tag per user decision; acceptable for local dev, can be pinned later |
| 10. Simplicity | Pass | Minimal config additions, follows existing patterns |

**Gate result**: PASS (one accepted deviation on Principle 9 documented in clarifications)

## Project Structure

### Documentation (this feature)

```text
specs/038-ecosystem-analytics/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── spec.md              # Feature specification
├── checklists/
│   └── requirements.md  # Spec quality checklist
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
# Files modified (no new source files created)
quickstart-services.yml          # Add ecosystem-analytics service definition
.build/traefik/http.yml          # Add service, middleware, and router entries
```

**Structure Decision**: Infrastructure-only change. No source code directories affected. Two existing configuration files are modified following established patterns from other services in the stack.

## Design

### Docker Compose Service Definition

Add to `quickstart-services.yml` after the `kratos-hooks` service:

- **Service name**: `ecosystem-analytics`
- **Container name**: `alkemio_dev_ecosystem_analytics`
- **Hostname**: `ecosystem-analytics`
- **Image**: `rg.nl-ams.scw.cloud/alkemio/ecosystem-analytics:latest`
- **Dependencies**: `kratos` (service_started)
- **Network**: `alkemio_dev_net`
- **Ports**: `4000` (internal only, not exposed to host — routed via Traefik)
- **Restart**: `unless-stopped`
- **Extra hosts**: `host.docker.internal:host-gateway` (for reaching the Alkemio server running on the host)
- **Environment variables**:
  - `ALKEMIO_SERVER_URL=http://host.docker.internal:4000` — Alkemio server base URL
  - `ALKEMIO_GRAPHQL_ENDPOINT=http://host.docker.internal:4000/graphql` — GraphQL endpoint
  - `ALKEMIO_KRATOS_PUBLIC_URL=http://kratos:4433` — Kratos within Docker network

### Traefik Routing Configuration

Add to `.build/traefik/http.yml`:

1. **Service** (`ecosystem-analytics`):
   ```yaml
   ecosystem-analytics:
     loadBalancer:
       servers:
         - url: 'http://ecosystem-analytics:4000/'
   ```

2. **Middleware** (`strip-analytics-prefix`):
   ```yaml
   strip-analytics-prefix:
     stripPrefix:
       prefixes:
         - /analytics
       forceSlash: false
   ```

3. **Router** (`ecosystem-analytics`):
   ```yaml
   ecosystem-analytics:
     rule: 'PathPrefix(`/analytics`)'
     service: 'ecosystem-analytics'
     middlewares:
       - strip-analytics-prefix
     entryPoints:
       - 'web'
     priority: 120
   ```

   Priority 120 ensures the `/analytics` route is matched before the catch-all `alkemiowebroute` (default priority) but after more specific routes like `/oidc` (130) and kratos-login-backoff (200).

## Complexity Tracking

No constitution violations requiring justification. The `latest` tag deviation on Principle 9 is accepted per user decision and documented in clarifications.

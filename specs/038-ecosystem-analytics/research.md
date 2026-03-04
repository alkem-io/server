# Research: Ecosystem Analytics Docker Compose Integration

**Feature**: 038-ecosystem-analytics
**Date**: 2026-03-04

## R1: Container Image Location & Configuration

**Decision**: Use `rg.nl-ams.scw.cloud/alkemio/ecosystem-analytics:latest` from the Scaleway container registry.

**Rationale**: This is the same registry used in the Kubernetes production deployment. No image exists on Docker Hub or GitHub Container Registry. The K8s deployment manifest confirms port 4000, health endpoint at `/api/health`, and the three required environment variables.

**Alternatives considered**:
- Docker Hub (`alkemio/ecosystem-analytics`) — no image published
- GitHub Container Registry (`ghcr.io/alkem-io/ecosystem-analytics`) — no image published
- Local build from source — adds complexity and build time; unnecessary when a pre-built image exists

## R2: Traefik Routing Pattern

**Decision**: Route `/analytics` path prefix through the existing `web` entry point (port 80 / host port 3000), stripping the prefix before forwarding to the service.

**Rationale**: Follows the same pattern used by other services in the stack (e.g., `kratos-public` strips `/ory/kratos/public`, `file-service` is accessed via `/api/private/rest/storage`). The analytics app expects requests at its root path, not under a prefix. Priority 120 avoids conflicts with existing routes.

**Alternatives considered**:
- Dedicated entry point (separate host port) — would not satisfy the "same cluster entry point" requirement
- Keep prefix (no stripping) — would require the analytics app to be aware of the `/analytics` prefix, which it is not designed for

## R3: Port Conflict Analysis

**Decision**: The analytics service uses port 4000 internally within Docker, which does not conflict with other services.

**Rationale**: Port 4000 is used by the Alkemio server on the host, but within the Docker network services are addressed by hostname, not port. The analytics service is at `ecosystem-analytics:4000` while the Alkemio server is at `host.docker.internal:4000`. No host port mapping is needed for the analytics service since all access goes through Traefik.

**Alternatives considered**:
- Remap to a different internal port — unnecessary since Docker network isolation prevents conflicts

## R4: Authentication Flow

**Decision**: The analytics service handles its own Kratos authentication directly (not via Oathkeeper).

**Rationale**: The ecosystem-analytics app has built-in auth endpoints (`POST /api/auth/login`, `/me`) that communicate directly with Kratos. Routing through Oathkeeper would require additional access rules and would duplicate auth handling. The service is pointed at `http://kratos:4433` within the Docker network.

**Alternatives considered**:
- Route through Oathkeeper — would add complexity and the analytics app already handles auth internally

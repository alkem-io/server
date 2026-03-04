# Tasks: Ecosystem Analytics Docker Compose Integration

**Input**: Design documents from `/specs/038-ecosystem-analytics/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md

**Tests**: No automated tests — manual verification is appropriate for infrastructure config changes.

**Organization**: Tasks are grouped by user story. US1 and US2 are both P1 but US2 depends on US1 (routing requires the service to exist). US3 (auth) is P2 and depends on both.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: User Story 1 - Start Ecosystem Analytics with Local Dev Stack (Priority: P1) 🎯 MVP

**Goal**: Add the ecosystem-analytics service to `quickstart-services.yml` so it starts with `pnpm run start:services`.

**Independent Test**: Run `pnpm run start:services`, then `docker ps | grep ecosystem` to confirm the container is running. Check health with `curl http://ecosystem-analytics:4000/api/health` from within the Docker network.

### Implementation for User Story 1

- [x] T001 [US1] Add ecosystem-analytics service definition to quickstart-services.yml (after kratos-hooks service): image `rg.nl-ams.scw.cloud/alkemio/ecosystem-analytics:latest`, container_name `alkemio_dev_ecosystem_analytics`, hostname `ecosystem-analytics`, depends_on kratos (service_started), network `alkemio_dev_net`, extra_hosts `host.docker.internal:host-gateway`, restart `unless-stopped`, port 4000 (internal), env vars `ALKEMIO_SERVER_URL=http://host.docker.internal:4000`, `ALKEMIO_GRAPHQL_ENDPOINT=http://host.docker.internal:4000/graphql`, `ALKEMIO_KRATOS_PUBLIC_URL=http://kratos:4433`

**Checkpoint**: `docker compose -f quickstart-services.yml up ecosystem-analytics` starts the container successfully.

---

## Phase 2: User Story 2 - Access Ecosystem Analytics via Cluster Entry Point (Priority: P1)

**Goal**: Configure Traefik to route `/analytics` requests to the ecosystem-analytics service, stripping the prefix.

**Independent Test**: With services running, navigate to `http://localhost:3000/analytics` and verify the analytics UI loads. Test API with `curl http://localhost:3000/analytics/api/health`.

### Implementation for User Story 2

- [x] T002 [P] [US2] Add ecosystem-analytics service entry under `http.services` in .build/traefik/http.yml — loadBalancer with server url `http://ecosystem-analytics:4000/`
- [x] T003 [P] [US2] Add strip-analytics-prefix middleware under `http.middlewares` in .build/traefik/http.yml — stripPrefix with `/analytics`, forceSlash false
- [x] T004 [US2] Add ecosystem-analytics router under `http.routers` in .build/traefik/http.yml — rule `PathPrefix(\`/analytics\`)`, service `ecosystem-analytics`, middleware `strip-analytics-prefix`, entryPoint `web`, priority 120

**Checkpoint**: `curl http://localhost:3000/analytics/api/health` returns a healthy response.

---

## Phase 3: User Story 3 - Ecosystem Analytics Authenticates via Kratos (Priority: P2)

**Goal**: Verify authentication works end-to-end with the existing Kratos identity service.

**Independent Test**: Log in via Kratos at `http://localhost:3000/ory/kratos/public/self-service/login`, then access `http://localhost:3000/analytics` and verify authenticated content is shown.

### Implementation for User Story 3

- [x] T005 [US3] Verify Kratos auth integration works by confirming `ALKEMIO_KRATOS_PUBLIC_URL` env var in quickstart-services.yml points to `http://kratos:4433` and the analytics service can reach Kratos within the Docker network — no additional config changes expected; this is a validation task

**Checkpoint**: Authenticated users see analytics content; unauthenticated users are prompted to log in.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (US1)**: No dependencies — can start immediately
- **Phase 2 (US2)**: Depends on US1 (service must exist in compose for Traefik to route to it)
- **Phase 3 (US3)**: Depends on US1 and US2 (service must be running and routable to test auth)

### Parallel Opportunities

- T002 and T003 can run in parallel (different sections of the same file, no dependencies)
- T004 depends on T002 and T003 (router references both the service and middleware)

---

## Implementation Strategy

### MVP First (User Story 1 + 2)

1. Complete T001: Service definition in compose file
2. Complete T002, T003 in parallel: Traefik service + middleware
3. Complete T004: Traefik router
4. **STOP and VALIDATE**: `curl http://localhost:3000/analytics/api/health`
5. Complete T005: Verify auth flow

### Summary

| Metric | Value |
| ------ | ----- |
| Total tasks | 5 |
| US1 tasks | 1 |
| US2 tasks | 3 |
| US3 tasks | 1 |
| Parallel opportunities | T002 + T003 |
| Files modified | 2 (`quickstart-services.yml`, `.build/traefik/http.yml`) |

---

## Notes

- [P] tasks = different sections, no dependencies
- [Story] label maps task to specific user story for traceability
- All changes are to existing config files — no new files created
- Commit after each phase to maintain clean history

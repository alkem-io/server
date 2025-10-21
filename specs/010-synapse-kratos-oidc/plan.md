# Implementation Plan: Synapse-Kratos-Hydra OIDC Authentication

**Branch**: `010-synapse-kratos-oidc` | **Date**: 2025-10-20 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/010-synapse-kratos-oidc/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Enable Matrix users to authenticate into the Synapse homeserver using their Kratos identity via OIDC, eliminating the need for separate Matrix passwords. This involves deploying Ory Hydra as the OAuth2/OIDC server, implementing custom NestJS REST controllers in alkemio-server to bridge Hydra and Kratos, configuring Synapse as an OIDC client, and enabling automatic account provisioning and profile synchronization.

**Technical Approach**: Infrastructure deployment (Hydra + PostgreSQL multi-database) + configuration (Synapse homeserver.yaml) + NestJS backend development (REST controllers at `/api/public/rest/oidc/*` for login/consent challenge handling). **CRITICAL**: This is NOT a configuration-only feature - it requires custom TypeScript/NestJS development following TDD principles.

**Architecture Clarification**: The login/consent flow is implemented in the **alkemio-server NestJS backend** as REST endpoints (NOT a separate frontend UI application). This backend already serves REST APIs at `/api/public/rest/*` and will be extended with OIDC endpoints. Hydra redirects users to these backend REST endpoints, which check Kratos session state via cookies and accept/reject OAuth2 challenges by calling the Hydra Admin API.

## Technical Context

**Language/Version**: TypeScript 5.x/NestJS 10.x (alkemio-server backend), Configuration (YAML), Docker Compose
**Primary Dependencies**:

- Synapse v1.132.0 (Matrix homeserver)
- **Ory Hydra v2.2.0 (OAuth2/OIDC server) - REQUIRED** (Kratos cannot act as OIDC provider alone)
- Ory Kratos v1.3.1 (Identity management - existing)
- PostgreSQL 17.5 (Synapse + Hydra databases - multi-database setup)
- MySQL 8.3.0 (Kratos database - existing)
- NestJS (alkemio-server - for OIDC REST controllers)
- Axios/HTTP client (for Hydra Admin API calls)

**Storage**:

- Synapse: PostgreSQL database `synapse` for Matrix data
- **Hydra: PostgreSQL database `hydra` for OAuth2 tokens/clients** (new)
- Kratos: MySQL database for identity data (existing)
- Configuration files: `.build/synapse/homeserver.yaml`, `.env.docker`, `.build/postgres/init-multiple-databases.sh`

**Testing**:

- Unit tests (TDD): Jest tests for OidcController and HydraAdminService (T017-T019)
- Integration tests: REST endpoint validation (T019a-T019b, T020c)
- Manual E2E testing with Matrix clients (Element Web required, Element Desktop optional)
- OIDC flow validation: Synapse → Hydra → NestJS controllers → Kratos → NestJS → Hydra → Synapse
- Hydra Admin API contract validation (curl/Postman)
- Account linking verification (PostgreSQL queries)
- Session management testing (logout, expiry)

**Target Platform**: Docker Compose deployment (`quickstart-services.yml`)

**Project Type**: **Infrastructure/Configuration + NestJS Backend Application** (requires custom TypeScript/NestJS controllers)

**Performance Goals**:

- Authentication flow completes within 10 seconds end-to-end
- OIDC flow with cached session: <1 second
- Support 100% of existing Kratos users (all authentication methods)
- Hydra token operations: <100ms

**Constraints**:

- **CRITICAL**: Requires custom NestJS REST controllers to bridge Hydra OAuth2 challenges and Kratos authentication
- **CRITICAL**: Ory Hydra is REQUIRED - Kratos cannot act as OIDC provider alone (lacks OAuth2 authorization server)
- Hydra database must be PostgreSQL (consolidated with Synapse for operational simplicity)
- Must maintain compatibility with existing Matrix password authentication (dual auth support)
- Must support existing Kratos session lifespan (48h) without configuration changes
- Hydra Admin API (port 4445) must NOT be exposed to browser clients (security requirement). **Dev-only exception**: In the quickstart Docker Compose setup, Hydra Admin is exposed via Traefik under `/hydra/admin` on the `web` entrypoint to allow the host-based alkemio-server to communicate with Hydra Admin through `HYDRA_ADMIN_URL=http://localhost:3000/hydra`. This is strictly for development. Production deployments MUST restrict Hydra Admin to private networks/entrypoints or internal service-to-service access.
- NestJS controllers MUST follow TDD (constitution requirement for application code)

**Scale/Scope**:

- Single Synapse homeserver instance
- Single Hydra instance (OAuth2/OIDC server)
- Single Kratos instance (identity provider - existing)
- **New**: NestJS OIDC controllers in alkemio-server (`src/services/api/oidc/`)
- Support for ~1000 concurrent users (quickstart environment)
- 4 user stories (1 P1, 2 P2, 1 P3)

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

**Constitution Compliance Analysis**:

This feature is **HYBRID**: Infrastructure/configuration (Synapse, Hydra, Docker) + custom application code (NestJS OIDC controllers in alkemio-server).

**Applicable Principles**:

✅ **I. Test-Driven Development** (for NestJS controllers and services):
- Unit tests MUST be written before implementation (T017-T019)
- Integration tests follow implementation to validate end-to-end flow (T020a-T020b)
- Red-Green-Refactor cycle enforced for all TypeScript code

✅ **II. Comprehensive Testing Coverage** (for NestJS code + infrastructure):
- Unit tests for OidcController and HydraAdminService
- Integration tests for REST endpoints
- Manual E2E testing with real Matrix clients
- Contract validation for Hydra Admin API interactions

✅ **III. Architectural Consistency**:
- NestJS REST controllers follow existing patterns in `src/services/api/`
- Service layer (HydraAdminService) handles business logic and external API calls
- Controllers delegate to services (no business logic in controllers)

✅ **IV. Type Safety & Code Quality** (for TypeScript code):
- Strict TypeScript for all NestJS controllers and services
- ESLint compliance for all application code
- Explicit types for Hydra/Kratos API responses
- Path aliases used for imports

✅ **VI. Observability & Maintainability**:
- OIDC controllers use Nest Logger integrated with the global Winston logger to produce JSON-structured logs
- Authentication flow logs include required context (challenge IDs, user IDs, timestamps, error codes) and severity levels (INFO/ERROR/DEBUG)
- Documentation provided (quickstart.md, research.md, data-model.md)
- Configuration version-controlled

**Non-Applicable Principles** (with justification):

- None. This feature introduces backend controllers, so architectural consistency, TDD, type safety, and observability all apply.

**Gate Status**: ✅ **PASS** - Constitution principles respected within applicable scope (infrastructure uses integration testing exception; application code uses TDD).

## Project Structure

### Documentation (this feature)

```
specs/010-synapse-kratos-oidc/
├── plan.md              # This file (/speckit.plan command output)
├── spec.md              # Feature specification (complete)
├── tasks.md             # Task breakdown (pre-existing, detailed)
├── research.md          # Phase 0 output: Architecture decisions, Hydra requirement, NestJS backend rationale
├── data-model.md        # Phase 1 output: N/A for Alkemio server (external service data models documented)
├── quickstart.md        # Phase 1 output: Deployment guide with step-by-step instructions
└── contracts/           # Phase 1 output: API specifications
    ├── login-consent-api.yaml     # OpenAPI spec for NestJS /api/public/rest/oidc/* endpoints
    └── hydra-admin-api.yaml       # Contract for Hydra Admin API interactions
```

### Source Code (repository root)

**Alkemio Server Repository** (this repo):
```
.build/
├── postgres/
│   └── init-multiple-databases.sh    # PostgreSQL multi-database init script (NEW)
├── synapse/
│   └── homeserver.yaml                # OIDC configuration added (MODIFIED)
└── ory/
    └── (existing Kratos config)

src/services/api/oidc/                  # NestJS OIDC controllers (NEW)
├── oidc.controller.ts                  # Login/consent challenge handlers
├── oidc.controller.spec.ts             # Unit tests (TDD)
├── oidc.integration.spec.ts            # Integration tests
├── oidc.service.ts                     # Hydra Admin API client service
├── oidc.service.spec.ts                # Service unit tests (TDD)
├── oidc.module.ts                      # NestJS module definition
└── dto/                                # Data transfer objects
    ├── login-challenge.dto.ts
    ├── consent-challenge.dto.ts
    └── hydra-response.dto.ts

quickstart-services.yml                 # Hydra services added (MODIFIED)
.env.docker                             # Hydra/Synapse secrets (NEW, gitignored)
```

**Structure Decision**: This is a **hybrid implementation** spanning infrastructure (Docker Compose, Traefik, service configuration) and NestJS application code (REST controllers in `src/services/api/oidc/`). All code resides in the alkemio-server repository. The NestJS controllers handle Hydra's login/consent challenges by checking Kratos session state and calling the Hydra Admin API to accept/reject authentication flows.

## Complexity Tracking

_This section documents departures from standard architecture that require justification._

| Violation                  | Why Needed         | Simpler Alternative Rejected Because |
| -------------------------- | ------------------ | ------------------------------------ |
| Additional OAuth2 server (Hydra) | Kratos cannot act as OIDC provider alone - lacks OAuth2 authorization server capabilities | Using Kratos directly: Rejected because Kratos does not implement OAuth2 `/authorize`, `/token`, `/userinfo` endpoints required by OIDC clients like Synapse |
| Custom NestJS REST controllers | Hydra requires external login/consent providers to bridge identity systems | Ory reference UI: Rejected due to poor UX, no Alkemio branding, separate deployment complexity; Standalone Express.js: Rejected due to deployment overhead |
| PostgreSQL multi-database | Consolidate Hydra + Synapse databases | Separate PostgreSQL instance for Hydra: Rejected to reduce operational overhead, backup complexity |
| REST endpoints in alkemio-server | Backend must handle OAuth2 flows without exposing Admin API to browsers | Frontend-only solution: Rejected because Hydra Admin API (port 4445) cannot be exposed to browser clients for security reasons |
| Traefik routing for Hydra (T007a/T007b) | Enables OIDC discovery and OAuth2 endpoints accessible via same-origin requests, contributes to FR-001 (Synapse OIDC client config) | Direct port exposure: Rejected to maintain consistent routing architecture and avoid CORS complications |

**Justification Summary**: Each complexity addition is **necessary and minimal**. Hydra is architecturally required (Kratos limitation). Custom NestJS controllers provide security (Admin API isolation) and leverage existing infrastructure. Multi-database PostgreSQL reduces operational complexity. Backend implementation follows NestJS architectural patterns. Traefik routing ensures OIDC standards compliance.

---

## Phase Completion Status

- [x] **Phase 0: Research** - Complete
  - Architecture decision: Hydra required (Kratos limitation documented)
  - Login/consent approach: NestJS REST controllers in alkemio-server (Option A)
  - Database architecture: PostgreSQL multi-database
  - Security & session management: 48h alignment
  - Identity mapping: Email-based Matrix User IDs
  - OIDC claims mapping: Kratos traits → Hydra ID token
  - Testing strategy: TDD for controllers + manual integration with Element Web

- [x] **Phase 1: Design & Contracts** - Complete
  - Data model: N/A for Alkemio server (external service models documented)
  - API contracts: OpenAPI specs for NestJS REST endpoints and Hydra Admin API
  - Deployment guide: Comprehensive quickstart.md with troubleshooting
  - Agent context: Ready for update (next step)

- [ ] **Phase 2: Task Breakdown** - Deferred to `/speckit.tasks` command
  - Detailed task breakdown already exists in `tasks.md` (pre-generated)
  - Execution order and dependencies documented
  - MVP scope defined (User Story 1)

---

## Implementation Roadmap

### MVP Scope (User Story 1 - P1)
**Goal**: Core SSO authentication working end-to-end

**Deliverables**:
1. Hydra deployed and configured in Docker Compose
2. PostgreSQL multi-database setup (synapse, hydra)
3. Synapse OIDC configuration enabled
4. NestJS OIDC controllers implemented in alkemio-server (`src/services/api/oidc/`)
5. Synapse OAuth2 client registered in Hydra
6. End-to-end OIDC flow validated with Element Web

**Independent Test**: User can authenticate to Matrix via Kratos credentials and send messages

**Estimated Effort**: 8-12 hours (infrastructure: 3h, NestJS TDD development: 4h, testing: 3h, troubleshooting: 2h)

### Post-MVP (User Stories 2, 4, 3)

**User Story 2 (P2)**: Auto-provisioning for new users
- Effort: 2 hours (configuration already in US1, just validation)

**User Story 4 (P2)**: Account migration for existing users
- Effort: 3 hours (test account linking, verify data preservation)

**User Story 3 (P3)**: Session management synchronization
- Effort: 2 hours (test logout/expiry flows)

**Total Estimated Effort**: 15-19 hours across all user stories

---

## Risk Assessment

### High Risk
1. **Hydra Admin API accessibility from frontend**: Frontend must reach Hydra Admin API (port 4445)
   - **Mitigation**: Test connectivity early, configure Docker networking correctly

2. **Cookie domain mismatch**: Kratos session cookie must be readable by frontend
   - **Mitigation**: Ensure frontend and Kratos on same domain or configure CORS/SameSite

3. **Claims injection complexity**: User claims from Kratos must reach Synapse via Hydra
   - **Mitigation**: Follow documented pattern in quickstart.md, validate with logs

### Medium Risk
1. **PostgreSQL migration failures**: Multi-database init script may have issues
   - **Mitigation**: Test script separately before full deployment

2. **Session lifetime misalignment**: Kratos/Hydra/Synapse sessions out of sync
   - **Mitigation**: Explicitly configure all session lifetimes to 48h

### Low Risk
1. **Matrix User ID collisions**: Email-based usernames may collide
   - **Mitigation**: Synapse auto-appends numeric suffix (built-in handling)

---

## Success Criteria

**Technical Success**:
- [x] Research complete with all architectural decisions documented
- [x] Contracts defined for all API interactions
- [x] Deployment guide provides step-by-step instructions
- [ ] MVP deployed and tested (deferred to implementation phase)
- [ ] All user stories validated (deferred to implementation phase)

**Acceptance Criteria** (from spec.md):
- [ ] User can authenticate to Matrix via Kratos OIDC (US1)
- [ ] New users auto-provisioned (US2)
- [ ] Existing users can link accounts (US4)
- [ ] Sessions synchronized with Kratos (US3)
- [ ] Authentication flow <10 seconds end-to-end

**Documentation Success**:
- [x] Architecture decisions clearly documented (research.md)
- [x] API contracts defined (OpenAPI specs)
- [x] Deployment procedures comprehensive (quickstart.md)
- [x] Troubleshooting guide included (quickstart.md)

---

## Next Steps

**Command Execution Complete**: `/speckit.plan` has finished Phase 0 (Research) and Phase 1 (Design & Contracts).

**Generated Artifacts**:
- `/Users/antst/work/alkemio/server/specs/010-synapse-kratos-oidc/research.md`
- `/Users/antst/work/alkemio/server/specs/010-synapse-kratos-oidc/data-model.md`
- `/Users/antst/work/alkemio/server/specs/010-synapse-kratos-oidc/quickstart.md`
- `/Users/antst/work/alkemio/server/specs/010-synapse-kratos-oidc/contracts/login-consent-api.yaml`
- `/Users/antst/work/alkemio/server/specs/010-synapse-kratos-oidc/contracts/hydra-admin-api.yaml`

**Proceed To**:
1. Update agent context (run `.specify/scripts/bash/update-agent-context.sh`)
2. Begin implementation following `tasks.md` (T001-T035)
3. Start with MVP scope (User Story 1: T001-T021)

## Development-only Exception and Networking Model

In this quickstart developer environment, the alkemio-server (NestJS) and the web client run on the host machine, while supporting services (Traefik, Hydra, Kratos, Synapse, Postgres, etc.) run inside Docker. To enable seamless communication:

- Traefik defines services for host apps using the special hostname `host.docker.internal`:
  - `alkemio-server` → `http://host.docker.internal:4000/`
  - `alkemio-web-client` → `http://host.docker.internal:3001/`
- Hydra public OIDC endpoints are routed on the `web` entrypoint:
  - Router `hydra-public`: `PathPrefix("/.well-known/") || PathPrefix("/oauth2/")` → Hydra at `http://hydra:4444/`
- Dev-only admin exposure:
  - Router `hydra-admin-web`: `PathPrefix("/hydra/admin")` with middleware `strip-hydra-admin-prefix` → Hydra Admin at `http://hydra:4445/`
  - This allows the host-based alkemio-server to call admin endpoints via `HYDRA_ADMIN_URL=http://localhost:3000/hydra` (Traefik on port 3000 forwards to Hydra Admin after stripping the `/hydra` prefix).

Security Position:
- The `hydra-admin-web` router is a deliberate convenience for local development only. It MUST be removed or locked down for production (e.g., dedicated admin entrypoint, private network, or service-to-service only). A separate production deployment feature will address this.

Operational Notes:
- The Docker Compose file publishes Traefik on port 3000 (`- 3000:80`), forwarding requests to services and routers declared in `.build/traefik/http.yml`.
- Host processes (server and web client) call container services via `http://localhost:3000/...` which Traefik maps to the appropriate internal services; container services can, in turn, reach the host processes via `host.docker.internal`.

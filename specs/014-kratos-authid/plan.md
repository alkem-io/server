# Implementation Plan: Store Kratos Identity on Users

**Branch**: `014-kratos-authid` | **Date**: 2025-11-08 | **Spec**: [`spec.md`](./spec.md)
**Input**: Feature specification from `/specs/014-kratos-authid/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Add a persistent `authId` link between Alkemio users and their Kratos identities, backfill legacy data via a TypeORM migration, ensure all future onboarding paths store the identifier, and expose a private REST endpoint that resolves or provisions an Alkemio user when given a Kratos identity identifier.

## Technical Context

**Language/Version**: TypeScript 5.3 on Node.js 20.15.1 (Volta pinned)
**Primary Dependencies**: NestJS 10, TypeORM 0.3, class-validator/transformer, existing Kratos client integration
**Storage**: MySQL 8 accessed through TypeORM repositories and migrations
**Testing**: Jest (pnpm test:ci) with unit specs in-domain modules and Nest integration tests for REST endpoints
**Target Platform**: Containerised Linux (Docker/Kubernetes deployments)
**Project Type**: Backend service (NestJS monolith)
**Performance Goals**: Identity resolution REST endpoint ≤1s p95 for lookups, ≤3s p99 when provisioning; migration completes within maintenance window without timeouts
**Constraints**: Must reuse existing domain services for user creation, emit domain events, keep the identity resolution endpoint scoped to internal network access with no per-request authentication (temporary Principle 8 exception logged for follow-up), and pipe migration through the established TypeORM workflow validated during Phase 0 research
**Scale/Scope**: Tens of thousands of users today; endpoint must tolerate bursty automated calls from internal services

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

1. **Domain-Centric Design (Principle 1)** – All new identity linkage rules must live in `src/domain/community/user` services/entities; REST layer remains orchestration. _Status: Compliant (data-model keeps logic in domain services and reuses existing aggregates)._
2. **Modular NestJS Boundaries (Principle 2)** – Introduce/extend a dedicated Nest module (likely within `services/api-rest`) without circular dependencies. _Status: Compliant (Phase 1 plan defines isolated `identity-resolution` module)._
3. **Explicit Data & Event Flow (Principle 4)** – Endpoint-triggered provisioning must call domain services, persist via repositories, and emit existing events. _Status: Compliant (design reuses `RegistrationService.registerNewUser`)._
4. **Observability & Operational Readiness (Principle 5)** – Migration and endpoint need structured logs/metrics for failures; endpoint errors must be actionable. _Status: Planned compliance (logging and metrics called out for implementation)._
5. **Code Quality & Testing (Principle 6)** – Provide unit tests for new domain logic and integration tests for REST endpoint plus migration validation. _Status: Compliant (Phase 1 deliverables enumerate test suites and migration validation harness)._
6. **Secure-by-Design Integration (Principle 8)** – Private endpoint must remain isolated to the internal network and avoid leaking sensitive identifiers in logs. _Status: Non-compliant (temporary exception to centralized auth approved for this feature; follow-up task required to reinstate tokens)._
7. **Architecture Standards – Migrations (Std. 3)** – Migration must be idempotent, TypeORM-based, and validated with snapshot testing. _Status: Compliant (research confirms TypeORM CLI usage with validation script)._

_Re-check performed after Phase 1 design (2025-11-08); no gate violations identified._

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

<!--
  ACTION REQUIRED: Replace the placeholder tree below with the concrete layout
  for this feature. Delete unused options and expand the chosen structure with
  real paths (e.g., apps/admin, packages/something). The delivered plan must
  not include Option labels.
-->

```text
# [REMOVE IF UNUSED] Option 1: Single project (DEFAULT)
src/
├── models/
├── services/
└── lib/
**Structure Decision**: [Document the selected structure and reference the real
src/
├── domain/community/user/
│   ├── user.entity.ts
│   ├── user.service.ts
│   ├── user.repository.ts
│   └── __tests__/   (new unit specs for identity linkage rules)
├── domain/community/user-lookup/
│   └── user.lookup.service.ts
├── services/api-rest/
│   ├── identity-resolution/   (new module: controller, module, service, dto)
│   └── existing modules…
├── services/infrastructure/kratos/
│   └── kratos.client.ts (extend if additional calls required)
├── common/exceptions/user/
│   └── *.ts (extend with new exceptions if needed)
├── migrations/
│   └── 2025xxxx-add-user-authid.ts (TypeORM migration for column + backfill)
└── config/
  └── *.ts (update if new config keys required)

tests/
├── integration/
│   └── identity-resolution.e2e-spec.ts (Nest testing module exercising REST endpoint)
├── migration/
│   └── add-user-authid.migration.spec.ts (validates up/down on snapshot database)
└── utils/
  └── fixtures for Kratos identity responses

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
| ---------- | --------- | ------------------------------------- |
| Principle 8 (Secure-by-Design Integration) | Internal-only access without per-request auth on identity resolution endpoint | Pending service-token rollout; interim reliance on network isolation to unblock feature |

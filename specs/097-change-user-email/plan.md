# Implementation Plan: Platform Admin Change User Login Email (No Verification)

**Branch**: `097-change-user-email` | **Date**: 2026-05-13 | **Last Updated**: 2026-05-18 (smaller MVP — verification moved to 098) | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/097-change-user-email/spec.md`
**Companion spec**: `098-self-service-email-change` (depends on this audit foundation; introduces the verification machinery natively)

## Summary

Add a synchronous, two-side-atomic mutation for a platform admin to change another user's login email on their behalf (`adminUserEmailChange`). The admin is expected to have verified the subject's identity **out-of-band** (support call, ID check, prior account context); the platform does **not** send a confirmation message to the new mailbox and does **not** require the new mailbox to prove ownership before committing. The platform's only platform-side gate is the admin's authorization. On invocation, the mutation validates the new email (format + uniqueness across Alkemio and Kratos, case-insensitive), then commits the change on Kratos first (with bounded synchronous retry: 2–3 attempts, ~5–10 s) and then on the Alkemio `User.email` column (in the local transaction). The Kratos write also marks the new email as verified (FR-011) so the user is not prompted to re-verify. After commit, the platform invalidates every existing Kratos session for the user and sends a security-signal notification to the **old** address (masked new address; English only). On second-side failure the platform performs a compensating Kratos revert with the same retry budget; on revert exhaustion it transitions to drift-detected — writing a `drift_detected` audit entry (capturing the observed values on each side), emitting a Winston error log + APM `captureError` with marker `email_change_drift_detected`, and surfacing a distinct error to the admin who then reconciles via a dedicated `adminUserEmailChangeDriftResolve` mutation. Every step writes a row to a new `email_change_audit_entry` PostgreSQL table (retained indefinitely; the system of record). Admins read history via `platformAdmin.userEmailChangeAuditEntries` (paginated) and the most-recent entry via `platformAdmin.latestUserEmailChangeAuditEntry`. No `email_change_pending` entity in this spec (098 introduces it natively). No `activity-log` reuse, no application-level rate limiting, no localization (English only). The `email_change_initiator_role` enum carries both `self` and `platform_admin` values upfront so 098 requires no enum migration.

## Technical Context

**Language/Version**: TypeScript 5.3, Node.js 22 LTS (Volta pins 22.21.1)
**Primary Dependencies**: NestJS 10, TypeORM 0.3 (custom fork `pkg.pr.new/antst/typeorm`), Apollo Server 4, GraphQL 16, `@ory/kratos-client` ^26.2.0, `@nestjs/config`, Winston (via `nest-winston`), `@golevelup/nestjs-rabbitmq`, `elastic-apm-node`, `class-validator` (DTO validation)
**Storage**: PostgreSQL 17.5 — **one** new table introduced by this feature: `email_change_audit_entry` (append-only; indefinite retention). No `email_change_pending` table in this spec.
**Testing**: Vitest 4.x — unit specs (`*.spec.ts`) for the synchronous commit service, retry helper, masking utility, audit service, and resolver authorization; integration specs (`*.it-spec.ts`) for end-to-end commit / rollback / drift / drift-resolve flows against a real PostgreSQL instance and a mocked Kratos HTTP client
**Target Platform**: Linux server (Kubernetes via existing `build-deploy-k8s-*` workflows)
**Project Type**: Single project — NestJS GraphQL server (`src/`)
**Performance Goals**: The admin mutation resolves within p95 < 2 s under normal load; the 5–10 s commit-retry budget (FR-009) is a hard ceiling for the worst-case path, not a target
**Constraints**: No background / asynchronous reconciliation (FR-009, FR-009a). No application-level rate limiting (delegated to Oathkeeper / Kratos / upstream throttling). English only (FR-016a). No confirmation message to the new mailbox; no token; no client-web deep link (the verification flow that needs those is in 098). All side-writes observe bounded synchronous retry (2–3 attempts, ~5–10 s) per FR-009 / FR-009a / FR-016b / FR-017a.
**Scale/Scope**: Per-feature surface — 1 new entity (`email_change_audit_entry`), 2 new mutations (`adminUserEmailChange`, `adminUserEmailChangeDriftResolve`), 2 new query fields (`platformAdmin.userEmailChangeAuditEntries`, `platformAdmin.latestUserEmailChangeAuditEntry`), 3 new outbound notification events (`USER_EMAIL_CHANGE_SECURITY_SIGNAL` to OLD address, `USER_EMAIL_CHANGE_NEW_ADDRESS_NOTIFICATION` to NEW address, `USER_EMAIL_CHANGE_GLOBAL_ADMIN_NOTIFICATION` fanned out to all platform admins by the notifications-service per the existing Global-Role-Change pattern), 1 new audit-outcome enum (11 values — extended additively to 18 by spec 098), 1 new initiator-role enum (2 values; both shipped upfront), 1 new domain module under `src/domain/community/user-email-change/`. No unknowns remain — every NEEDS CLARIFICATION raised during planning has been resolved by the entries in spec.md §Clarifications (Sessions 2026-05-13 and 2026-05-18). The self-service mutation/query, the verification flow, the `email_change_pending` entity, the token machinery, the `userEmailChangeConfirm` root mutation, and the `USER_EMAIL_CHANGE_CONFIRMATION` notification event are all deferred to companion spec 098.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle | Compliance | How this feature satisfies it |
| --- | --- | --- |
| 1. Domain-Centric Design First | ✅ | The synchronous commit logic, retry, rollback, and drift-detection live in `UserEmailChangeService` under `src/domain/community/user-email-change/`. Resolvers under `platform-admin/` only orchestrate auth + delegation to the domain service. |
| 2. Modular NestJS Boundaries | ✅ | New module `UserEmailChangeModule` exposes the orchestration service and the single audit repository. Kratos extension methods live on the existing `KratosService` (no new client). No circular deps — module imports `UserModule`, `KratosModule`, `NotificationAdapterModule`. The companion 098 will import this module to add the verification surface on top. |
| 3. GraphQL Schema as Stable Contract | ✅ | Both mutations take a single `Input` DTO (FR-018). Naming is imperative (`adminUserEmailChange`, `adminUserEmailChangeDriftResolve`). Pagination on `userEmailChangeAuditEntries` follows `docs/Pagination.md` (cursor-based via `rowId`). The new types are additive — no breaking changes; schema baseline will diff cleanly. |
| 4. Explicit Data & Event Flow | ✅ | The flow is: DTO validation → authorization (`grantAccessOrFail` PLATFORM_ADMIN) → domain operation (`UserEmailChangeService.applyAdminEmailChange`) → Kratos write (with retry) → Alkemio write (in local txn) → audit-entry persistence → security-signal notification event → session invalidation. Side effects are explicit operations, not implicit hooks. |
| 5. Observability & Operational Readiness | ✅ | New log contexts reuse existing `LogContext.AUTH`, `LogContext.KRATOS`, `LogContext.NOTIFICATIONS`. The drift path emits a Winston `error` entry AND an `apm.captureError` call with marker `email_change_drift_detected` (per FR-009a). Exception `message` fields are immutable; dynamic data (user id, attempted email) goes into `details`. No new dashboards / Prometheus metrics — re-uses Elastic APM and Winston/log-based alerting. |
| 6. Code Quality with Pragmatic Testing | ✅ | Vitest specs target high-signal surfaces: synchronous commit happy path + every fault-injected branch (forward-fail / forward-fail + rollback-fail / drift-resolve outcomes), validation rejection paths, masking utility, retry helper, authorization decision points. Resolver-DTO pass-throughs are not separately tested (covered by integration). |
| 7. API Consistency & Evolution Discipline | ✅ | Mutations imperative; queries descriptive; inputs end with `Input`; result types end with the entity name or `Result` (e.g., `UserEmailChangeAuditEntry`, `UserEmailChangeResult`); pagination follows the shared cursor pattern. Errors map to a constrained set of codes (see contracts/). |
| 8. Secure-by-Design Integration | ✅ | All GraphQL inputs traverse `class-validator` DTOs. Authorization is enforced before any side effect. The audit query never returns email PII beyond the audited `old_email`/`new_email` columns and never returns the initiator/subject emails (only `{id, displayName}`). Email addresses are not logged. Kratos calls have explicit timeouts and the bounded synchronous retry policy (FR-009). |
| 9. Container & Deployment Determinism | ✅ | No new container, no new runtime config, no new env vars. No `process.env` reads outside `ConfigService`. Migrations are idempotent and rollback-documented. |
| 10. Simplicity & Incremental Hardening | ✅ | A compensating-action approach replaces a distributed-transaction or saga framework. No pending-row entity (drift state lives on the audit entry). No token machinery (no verification in this spec). No new ops-alert infrastructure (FR-009a clarification). No background reconciler. The drift-detected recovery is a manual admin op via a single mutation. |

**Gate result**: PASS — no violations. No Complexity Tracking entries.

## Project Structure

### Documentation (this feature)

```text
specs/097-change-user-email/
├── plan.md              # This file
├── research.md          # Phase 0 — research decisions
├── data-model.md        # Phase 1 — entity / table definitions
├── quickstart.md        # Phase 1 — end-to-end demo of the flow
└── contracts/
    └── graphql.md       # Phase 1 — GraphQL SDL fragments for new types, inputs, mutations, queries
```

### Source Code (repository root)

```text
src/
├── domain/community/user-email-change/                            # NEW domain module
│   ├── user.email.change.module.ts
│   ├── user.email.change.service.ts                               # orchestration / synchronous commit
│   ├── user.email.change.service.audit.ts                         # audit-entry write helper
│   ├── user.email.change.email.masking.util.ts                    # j***@e***.com masking helper
│   ├── user.email.change.retry.util.ts                            # bounded sync retry with backoff
│   ├── user.email.change.audit.entry.entity.ts                    # email_change_audit_entry row
│   ├── user.email.change.audit.entry.interface.ts                 # IUserEmailChangeAuditEntry
│   ├── user.email.change.audit.entry.repository.ts
│   ├── enums/
│   │   ├── user.email.change.audit.outcome.ts                     # 9 outcomes (see FR-014b)
│   │   └── user.email.change.initiator.role.ts                    # 'self' | 'platform_admin' (both shipped upfront for 098)
│   ├── dto/
│   │   ├── user.email.change.audit.entry.ts                       # GraphQL UserEmailChangeAuditEntry object
│   │   └── user.email.change.result.ts                            # GraphQL UserEmailChangeResult object (admin-change + drift-resolve return)
│   └── *.spec.ts                                                  # Vitest unit specs
│
├── platform-admin/domain/user/email-change/                       # NEW admin surface
│   ├── admin.user.email.change.resolver.mutations.ts              # adminUserEmailChange + adminUserEmailChangeDriftResolve
│   ├── admin.user.email.change.resolver.fields.ts                 # PlatformAdminQueryResults.userEmailChangeAuditEntries + .latestUserEmailChangeAuditEntry
│   ├── admin.user.email.change.module.ts
│   ├── dto/
│   │   ├── admin.user.email.change.dto.input.ts
│   │   └── admin.user.email.change.drift.resolve.dto.input.ts
│   └── *.spec.ts
│
├── services/infrastructure/kratos/
│   └── kratos.service.ts                                          # EXTEND with: findIdentityByEmail, updateIdentityEmailTrait, getIdentityEmailTrait, invalidateAllIdentitySessions
│
├── common/enums/
│   └── notification.event.ts                                      # EXTEND with: USER_EMAIL_CHANGE_SECURITY_SIGNAL, USER_EMAIL_CHANGE_NEW_ADDRESS_NOTIFICATION, USER_EMAIL_CHANGE_GLOBAL_ADMIN_NOTIFICATION
│
└── migrations/
    └── <timestamp>-CreateEmailChangeAuditEntry.ts                 # NEW migration: one table + indices + two enum types
```

**Structure Decision**: Single-project NestJS layout. The domain logic (synchronous commit, retry, rollback, drift, audit) is co-located under `src/domain/community/user-email-change/`. The admin GraphQL surface gets its own thin resolver folder that delegates to the domain service. Spec 098 will add sibling resolver folders for the `me`-shape and root-confirm surfaces, will introduce the `email_change_pending` entity in its own migration, and will extend `UserEmailChangeService` with `initiateSelf` and `confirm` methods. The Kratos extension methods are appended to the existing `KratosService` rather than creating a parallel client. There is no token utility in this spec (no token issued by this feature).

## Complexity Tracking

> No violations — section intentionally empty.

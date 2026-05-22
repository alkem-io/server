# Implementation Plan: Platform Admin Change User Login Email (No Verification)

**Branch**: `097-change-user-email` | **Date**: 2026-05-13 | **Last Updated**: 2026-05-18 (smaller MVP — verification moved to 098) | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/097-change-user-email/spec.md`
**Companion spec**: `098-self-service-email-change` (depends on this audit foundation; introduces the verification machinery natively)

## Summary

Add a synchronous, two-side-atomic mutation for a platform admin to change another user's login email on their behalf (`adminUserEmailChange`). The admin is expected to have verified the subject's identity **out-of-band** (support call, ID check, prior account context); the platform does **not** send a confirmation message to the new mailbox and does **not** require the new mailbox to prove ownership before committing. The platform's only platform-side gate is the admin's authorization. On invocation, the mutation validates the new email (format + uniqueness across Alkemio and Kratos, case-insensitive), then commits the change on Kratos first (with bounded synchronous retry: 2–3 attempts, ~5–10 s) and then on the Alkemio `User.email` column (a single `UserService.save` — no surrounding DB transaction; see research.md §R4). The Kratos write also marks the new email as verified (FR-011) so the user is not prompted to re-verify. After commit, the platform invalidates every existing Kratos session for the user and sends a security-signal notification to the **old** address (masked new address; English only). On second-side failure the platform performs a compensating Kratos revert with the same retry budget; on revert exhaustion it transitions to drift-detected — writing a `drift_detected` audit entry (capturing the observed values on each side), emitting a Winston error log + APM `captureError` with marker `email_change_drift_detected`, and surfacing a distinct error to the admin who then reconciles via a dedicated `adminUserEmailChangeDriftResolve` mutation. Every step writes a row to a new `platform_audit_entry` PostgreSQL table (designed as a genuinely platform-wide audit-log foundation — every typed column is cross-category, category-specific payload lives in a `details: jsonb` column under a documented per-category key convention; this feature writes rows with `category = 'email_change'` and stores `oldEmail` / `newEmail` under those JSONB keys; future ISO 27001 categories add their own discriminator values and their own JSONB key conventions without a DDL migration — see spec.md §FR-014a / §Clarifications Session 2026-05-19 and data-model.md §Details shape per category). Audit rows are retained indefinitely; the system of record. Admins read email-change history via `platformAdmin.userEmailChangeAuditEntries` (paginated, implicitly filtered to `category = 'email_change'`; the GraphQL `oldEmail` / `newEmail` fields project from `details.oldEmail` / `details.newEmail`) and the most-recent entry via `platformAdmin.latestUserEmailChangeAuditEntry`. No `email_change_pending` entity in this spec (098 introduces it natively). No `activity-log` reuse, no application-level rate limiting, no localization (English only). The `platform_audit_initiator_role` enum carries `self`, `platform_admin`, `system`, and `service` values upfront so neither 098 nor future ISO 27001 categories require an enum migration; the `platform_audit_outcome` enum is extended additively by 098 and by future categories.

## Technical Context

**Language/Version**: TypeScript 5.3, Node.js 22 LTS (Volta pins 22.21.1)
**Primary Dependencies**: NestJS 10, TypeORM 0.3 (custom fork `pkg.pr.new/antst/typeorm`), Apollo Server 4, GraphQL 16, `@ory/kratos-client` ^26.2.0, `@nestjs/config`, Winston (via `nest-winston`), `@golevelup/nestjs-rabbitmq`, `elastic-apm-node`, `class-validator` (DTO validation)
**Storage**: PostgreSQL 17.5 — **one** new table introduced by this feature: `platform_audit_entry` (append-only; indefinite retention; designed as a genuinely platform-wide audit-log foundation per spec.md §FR-014a / §Clarifications Session 2026-05-19 — every typed column is cross-category, with category-specific payload in `details: jsonb` under documented per-category keys; this spec's email-change rows store `oldEmail` / `newEmail` under those JSONB keys). No `email_change_pending` table in this spec.
**Testing**: Vitest 4.x — unit specs (`*.spec.ts`) for the synchronous commit service, retry helper, masking utility, audit service, and resolver authorization; integration specs (`*.it-spec.ts`) for end-to-end commit / rollback / drift / drift-resolve flows against a real PostgreSQL instance and a mocked Kratos HTTP client
**Target Platform**: Linux server (Kubernetes via existing `build-deploy-k8s-*` workflows)
**Project Type**: Single project — NestJS GraphQL server (`src/`)
**Performance Goals**: The admin mutation resolves within p95 < 2 s under normal load; the 5–10 s commit-retry budget (FR-009) is a hard ceiling for the worst-case path, not a target
**Constraints**: No background / asynchronous reconciliation (FR-009, FR-009a). No application-level rate limiting (delegated to Oathkeeper / Kratos / upstream throttling). English only (FR-016a). No confirmation message to the new mailbox; no token; no client-web deep link (the verification flow that needs those is in 098). All side-writes observe bounded synchronous retry (2–3 attempts, ~5–10 s) per FR-009 / FR-009a / FR-016b / FR-017a.
**Scale/Scope**: Per-feature surface — 1 new entity (`platform_audit_entry` — genuinely platform-wide audit foundation; the email-change feature is the first consumer), 2 new mutations (`adminUserEmailChange`, `adminUserEmailChangeDriftResolve`), 2 new query fields (`platformAdmin.userEmailChangeAuditEntries`, `platformAdmin.latestUserEmailChangeAuditEntry` — both implicitly filter `category = 'email_change'` and project `oldEmail` / `newEmail` from `details` JSONB), 4 new outbound notification events (`USER_EMAIL_CHANGE_SECURITY_SIGNAL` to OLD address, `USER_EMAIL_CHANGE_NEW_ADDRESS_NOTIFICATION` to NEW address, `USER_EMAIL_CHANGE_GLOBAL_ADMIN_NOTIFICATION` server-resolved fan-out to platform admins per the existing Global-Role-Change pattern, `USER_EMAIL_CHANGE_SPACE_ADMIN_NOTIFICATION` per-space fan-out — published once per space the subject belongs to — to that space's admins / leads), 3 new Postgres enums (`platform_audit_category` 1 value; `platform_audit_outcome` 11 initial values, extended additively within this feature to 13 — `commit_started`, `space_admin_notification_failed` — and further by spec 098 and per future ISO 27001 category; `platform_audit_initiator_role` 4 values shipped upfront — `self` / `platform_admin` / `system` / `service`), 1 new domain module under `src/domain/community/user-email-change/`. No unknowns remain — every NEEDS CLARIFICATION raised during planning has been resolved by the entries in spec.md §Clarifications (Sessions 2026-05-13, 2026-05-18, and 2026-05-19). The self-service mutation/query, the verification flow, the `email_change_pending` entity, the token machinery, the `userEmailChangeConfirm` root mutation, and the `USER_EMAIL_CHANGE_CONFIRMATION` notification event are all deferred to companion spec 098.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle | Compliance | How this feature satisfies it |
| --- | --- | --- |
| 1. Domain-Centric Design First | ✅ | The synchronous commit logic, retry, rollback, and drift-detection live in `UserEmailChangeService` under `src/domain/community/user-email-change/`. Resolvers under `platform-admin/` only orchestrate auth + delegation to the domain service. |
| 2. Modular NestJS Boundaries | ✅ | New module `UserEmailChangeModule` exposes the orchestration service and the single audit repository. Kratos extension methods live on the existing `KratosService` (no new client). No circular deps — module imports `UserModule`, `KratosModule`, `NotificationAdapterModule`. The companion 098 will import this module to add the verification surface on top. |
| 3. GraphQL Schema as Stable Contract | ✅ | Both mutations take a single `Input` DTO (FR-018). Naming is imperative (`adminUserEmailChange`, `adminUserEmailChangeDriftResolve`). Pagination on `userEmailChangeAuditEntries` follows `docs/Pagination.md` (cursor-based via `rowId`). The new types are additive — no breaking changes; schema baseline will diff cleanly. |
| 4. Explicit Data & Event Flow | ✅ | The flow is: DTO validation → authorization (`grantAccessOrFail` PLATFORM_ADMIN) → domain operation (`UserEmailChangeService.applyAdminEmailChange`) → Kratos write (with retry) → Alkemio write (single `UserService.save`, no DB transaction) → audit-entry persistence → security-signal notification event → session invalidation. Side effects are explicit operations, not implicit hooks. |
| 5. Observability & Operational Readiness | ✅ | New log contexts reuse existing `LogContext.AUTH`, `LogContext.KRATOS`, `LogContext.NOTIFICATIONS`. The drift path emits a Winston `error` entry AND an `apm.captureError` call with marker `email_change_drift_detected` (per FR-009a). Exception `message` fields are immutable; dynamic data (user id, attempted email) goes into `details`. No new dashboards / Prometheus metrics — re-uses Elastic APM and Winston/log-based alerting. |
| 6. Code Quality with Pragmatic Testing | ✅ | Vitest specs target high-signal surfaces: synchronous commit happy path + every fault-injected branch (forward-fail / forward-fail + rollback-fail / drift-resolve outcomes), validation rejection paths, masking utility, retry helper, authorization decision points. Resolver-DTO pass-throughs are not separately tested (covered by integration). |
| 7. API Consistency & Evolution Discipline | ✅ | Mutations imperative; queries descriptive; inputs end with `Input`; result types end with the entity name or `Result` (e.g., `UserEmailChangeAuditEntry`, `UserEmailChangeResult`); pagination follows the shared cursor pattern. Errors map to a constrained set of codes (see contracts/). |
| 8. Secure-by-Design Integration | ✅ | All GraphQL inputs traverse `class-validator` DTOs. Authorization is enforced before any side effect. The audit query never returns email PII beyond the audited `details.oldEmail` / `details.newEmail` JSONB keys (projected to the GraphQL `oldEmail` / `newEmail` fields) and never returns the initiator/subject emails (only `{id, displayName}`). Email addresses are not logged. Kratos calls have explicit timeouts and the bounded synchronous retry policy (FR-009). |
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
│   ├── platform.audit.entry.entity.ts                             # platform_audit_entry row (generic — see data-model.md)
│   ├── platform.audit.entry.interface.ts                          # IPlatformAuditEntry (generic — see data-model.md)
│   ├── platform.audit.entry.repository.ts                         # generic PlatformAuditEntryRepository (exposes email-change-scoped read methods)
│   ├── enums/
│   │   ├── platform.audit.category.ts                             # 'EMAIL_CHANGE' (single value initially; future ISO 27001 categories extend additively) — Postgres enum platform_audit_category
│   │   ├── platform.audit.outcome.ts                              # Cross-category Postgres enum platform_audit_outcome; 11 initial email_change values + commit_started + space_admin_notification_failed (13); extended additively per category
│   │   ├── platform.audit.initiator.role.ts                       # Cross-category Postgres enum platform_audit_initiator_role; 'self' | 'platform_admin' | 'system' | 'service' shipped upfront
│   │   ├── user.email.change.audit.outcome.ts                     # GraphQL feature-scoped enum exposing 12 email_change outcomes — the 13 minus the internal commit_started breadcrumb (FR-014b)
│   │   └── user.email.change.initiator.role.ts                    # GraphQL feature-scoped enum exposing 'self' | 'platform_admin' for the email_change projection
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
│   └── notification.event.ts                                      # EXTEND with: USER_EMAIL_CHANGE_SECURITY_SIGNAL, USER_EMAIL_CHANGE_NEW_ADDRESS_NOTIFICATION, USER_EMAIL_CHANGE_GLOBAL_ADMIN_NOTIFICATION, USER_EMAIL_CHANGE_SPACE_ADMIN_NOTIFICATION
│
├── types/
│   └── alkemio.config.ts                                          # EXTEND with: endpoints.client_web: string (for FR-016c login link in NEW-address notification)
│
└── migrations/
    └── <timestamp>-CreatePlatformAuditEntry.ts                    # NEW migration: one table (platform_audit_entry, including correlation_id + details: jsonb columns) + five indices (incl. partial on correlation_id) + three Postgres enum types (platform_audit_category, platform_audit_outcome, platform_audit_initiator_role)
                                                                   # PLUS 4 additive follow-up migrations: 2 `ALTER TYPE platform_audit_outcome ADD VALUE` (commit_started, space_admin_notification_failed) + 2 user_settings JSONB backfills (platform/space admin userEmailChanged) — see data-model.md §Migration plan
```

**Structure Decision**: Single-project NestJS layout. The domain logic (synchronous commit, retry, rollback, drift, audit) is co-located under `src/domain/community/user-email-change/`. The admin GraphQL surface gets its own thin resolver folder that delegates to the domain service. Spec 098 will add sibling resolver folders for the `me`-shape and root-confirm surfaces, will introduce the `email_change_pending` entity in its own migration, and will extend `UserEmailChangeService` with `initiateSelf` and `confirm` methods. The Kratos extension methods are appended to the existing `KratosService` rather than creating a parallel client. There is no token utility in this spec (no token issued by this feature).

## Complexity Tracking

> No violations — section intentionally empty.

# Implementation Plan: Change User Login Email With Ownership Verification

**Branch**: `097-change-user-email` | **Date**: 2026-05-13 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/097-change-user-email/spec.md`

## Summary

Add a verified, two-side-atomic flow for changing a user's login email — initiated by the user themselves (`meUserEmailChangeBegin`) or by a platform admin on the user's behalf (`adminUserEmailChangeBegin`), confirmed by clicking a 1-hour-TTL, single-use, ≥128-bit opaque token delivered by mail to the proposed new address (`userEmailChangeConfirm`, a root mutation callable without an Alkemio session). On confirm the system re-validates uniqueness, writes the new email to the Alkemio `User.email` column and to the Kratos identity `email` trait (marked verified), invalidates every existing Kratos session for the user, and emits a security-signal notification to the **old** address. All side-writes use a bounded synchronous retry (2–3 attempts, ~5–10 s budget); on terminal failure a compensating rollback restores the pre-change state, and if rollback itself exhausts its budget the pending change transitions to `drift_detected` and is reconciled by a dedicated `adminUserEmailChangeDriftResolve` mutation (no background reconciler). Every state transition writes a row to a new `email_change_audit_entry` PostgreSQL table (retained indefinitely; the system of record). Pending-change records are retained 30 days past terminal state. The subject user reads their active pending change via the `me` query; the admin reads outcome state via the `platformAdmin` query. No `activity-log` reuse, no application-level rate limiting, no localization (English only).

## Technical Context

**Language/Version**: TypeScript 5.3, Node.js 22 LTS (Volta pins 22.21.1)
**Primary Dependencies**: NestJS 10, TypeORM 0.3 (custom fork `pkg.pr.new/antst/typeorm`), Apollo Server 4, GraphQL 16, `@ory/kratos-client` ^26.2.0, `@nestjs/config`, Winston (via `nest-winston`), `@golevelup/nestjs-rabbitmq`, `elastic-apm-node`, Node `crypto` (token generation), `class-validator` (DTO validation)
**Storage**: PostgreSQL 17.5 — two new tables introduced by this feature: `email_change_pending` (one active row per user; 30-day retention past terminal state) and `email_change_audit_entry` (append-only; indefinite retention)
**Testing**: Vitest 4.x — unit specs (`*.spec.ts`) for the state-transition service, token utility, masking utility, and resolver authorization; integration specs (`*.it-spec.ts`) for end-to-end flow against a live Kratos test instance and a real PostgreSQL instance
**Target Platform**: Linux server (Kubernetes via existing `build-deploy-k8s-*` workflows)
**Project Type**: Single project — NestJS GraphQL server (`src/`)
**Performance Goals**: Initiation and confirmation mutations resolve within p95 < 2 s under normal load; the 5–10 s commit-retry budget (FR-009) is a hard ceiling for the worst-case path, not a target
**Constraints**: No background / asynchronous reconciliation (FR-009, FR-009a). No application-level rate limiting (delegated to Oathkeeper / Kratos / upstream throttling). English only (FR-016a). Confirmation link MUST target a client-web URL (FR-003a) — server adds no new HTTP route. Token persisted as plaintext (FR-007a) with ≥128-bit entropy (FR-007c) and 1-hour TTL (FR-007b). All side-writes observe bounded synchronous retry (2–3 attempts, ~5–10 s) per FR-009 / FR-009a / FR-016b / FR-017a.
**Scale/Scope**: Per-feature surface — 2 new entities, 4 new mutations (`meUserEmailChangeBegin`, `adminUserEmailChangeBegin`, `userEmailChangeConfirm`, `adminUserEmailChangeDriftResolve`), 3 new query fields (`me.pendingEmailChange`, `platformAdmin.userEmailChangeState`, `platformAdmin.userEmailChangeAuditEntries`), 2 new outbound notification events (`USER_EMAIL_CHANGE_CONFIRMATION`, `USER_EMAIL_CHANGE_SECURITY_SIGNAL`), 1 new audit-outcome enum, 1 new pending-state enum (7 values including `drift_detected`), 1 new domain module under `src/domain/community/user-email-change/`. No unknowns remain — every NEEDS CLARIFICATION raised during planning has been resolved by the 28 entries in spec.md §Clarifications.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle | Compliance | How this feature satisfies it |
| --- | --- | --- |
| 1. Domain-Centric Design First | ✅ | The state machine, retry logic, and rollback live in `UserEmailChangeService` under `src/domain/community/user-email-change/`. Resolvers under `me/` and `platform-admin/` only orchestrate auth + delegation to the domain service. |
| 2. Modular NestJS Boundaries | ✅ | New module `UserEmailChangeModule` exposes only the orchestration service and the two repositories. The Kratos extension methods live on the existing `KratosService` (no new client). No circular deps — module imports `UserModule`, `KratosModule`, `NotificationAdapterModule`. |
| 3. GraphQL Schema as Stable Contract | ✅ | All four mutations take a single `Input` DTO (FR-018). Naming is imperative (`me…Begin`, `adminUser…Begin/DriftResolve`, `…Confirm`). Pagination on `userEmailChangeAuditEntries` follows `docs/Pagination.md` (cursor-based via `rowId`). The new types are additive — no breaking changes; schema baseline will diff cleanly. |
| 4. Explicit Data & Event Flow | ✅ | The flow is: DTO validation → authorization (`grantAccessOrFail` for admin; current-user equality for self) → domain operation (`UserEmailChangeService`) → audit entry persistence → outbound notification event → state transition persistence. Side effects (mail send, Kratos write, session invalidation) are explicit operations, not implicit hooks. |
| 5. Observability & Operational Readiness | ✅ | New log contexts reuse existing `LogContext.AUTH`, `LogContext.KRATOS`, `LogContext.NOTIFICATIONS`. The `drift_detected` path emits a Winston `error` entry AND an `apm.captureError` call with marker `email_change_drift_detected` (per FR-009a clarification). Exception `message` fields are immutable; dynamic data (user id, attempted email) goes into `details`. No new dashboards / Prometheus metrics — re-uses Elastic APM and Winston/log-based alerting. |
| 6. Code Quality with Pragmatic Testing | ✅ | Vitest specs target high-signal surfaces: state-machine transitions, retry-and-rollback behavior under fault injection, token uniqueness / entropy, conflict re-check at confirm, authorization decision points, masking utility. Resolver-DTO pass-throughs are not separately tested (covered by integration). |
| 7. API Consistency & Evolution Discipline | ✅ | Mutations imperative; queries descriptive; inputs end with `Input`; result types end with the entity name (e.g., `UserEmailChangePending`, `UserEmailChangeState`, `UserEmailChangeAuditEntry`); pagination follows the shared cursor pattern. The new errors map to a constrained set of codes (see contracts/). |
| 8. Secure-by-Design Integration | ✅ | All GraphQL inputs traverse `class-validator` DTOs. Authorization is enforced before any side effect (initiation) and re-evaluated at confirm via token lookup, not session (per FR-018a). The confirmation token never appears in logs, exceptions, or audit entries (FR-007a). Email addresses are not logged. Kratos calls have explicit timeouts and the bounded synchronous retry policy (FR-009). |
| 9. Container & Deployment Determinism | ✅ | No new container, no new runtime config beyond `endpoints.client_web` (new typed config key in `AlkemioConfig`). Migrations are idempotent and rollback-documented. No `process.env` reads outside `ConfigService`. |
| 10. Simplicity & Incremental Hardening | ✅ | A compensating-action approach replaces a distributed-transaction or saga framework (FR-009 assumption). Token persisted as plaintext (FR-007a) — no separate hash column. No new ops-alert infrastructure (FR-009a clarification). No background reconciler. The `drift_detected` recovery is a manual admin op via a single mutation. |

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
│   ├── user.email.change.service.ts                               # orchestration / state machine
│   ├── user.email.change.service.audit.ts                         # audit-entry write helper
│   ├── user.email.change.token.util.ts                            # ≥128-bit token generator
│   ├── user.email.change.email.masking.util.ts                    # j***@e***.com masking helper
│   ├── pending.user.email.change.entity.ts                        # email_change_pending row
│   ├── pending.user.email.change.interface.ts                     # IPendingUserEmailChange
│   ├── pending.user.email.change.repository.ts
│   ├── user.email.change.audit.entry.entity.ts                    # email_change_audit_entry row
│   ├── user.email.change.audit.entry.interface.ts                 # IUserEmailChangeAuditEntry
│   ├── user.email.change.audit.entry.repository.ts
│   ├── enums/
│   │   ├── user.email.change.state.ts                             # 7 values (initiated, confirmed, committed, rolled_back, expired, superseded, drift_detected)
│   │   ├── user.email.change.audit.outcome.ts                     # final canonical set (see FR-014b)
│   │   └── user.email.change.initiator.role.ts                    # 'self' | 'platform_admin'
│   ├── dto/
│   │   ├── user.email.change.pending.ts                           # GraphQL UserEmailChangePending object
│   │   ├── user.email.change.state.ts                             # GraphQL UserEmailChangeState object
│   │   ├── user.email.change.audit.entry.ts                       # GraphQL UserEmailChangeAuditEntry object
│   │   └── user.email.change.result.ts                            # GraphQL UserEmailChangeResult object (confirm + drift-resolve return)
│   └── *.spec.ts                                                  # Vitest unit specs
│
├── services/api/me/email-change/                                  # NEW me-shape surface
│   ├── me.user.email.change.resolver.mutations.ts                 # meUserEmailChangeBegin
│   └── me.user.email.change.resolver.fields.ts                    # MeQueryResults.pendingEmailChange field
│
├── services/api/user-email-change/                                # NEW root-mutation surface
│   ├── user.email.change.resolver.mutations.ts                    # userEmailChangeConfirm (root, no session required)
│   ├── dto/
│   │   └── user.email.change.confirm.dto.input.ts
│   └── *.spec.ts
│
├── platform-admin/domain/user/email-change/                       # NEW admin surface
│   ├── admin.user.email.change.resolver.mutations.ts              # adminUserEmailChangeBegin + adminUserEmailChangeDriftResolve
│   ├── admin.user.email.change.resolver.fields.ts                 # PlatformAdminQueryResults.userEmailChangeState + .userEmailChangeAuditEntries
│   ├── admin.user.email.change.module.ts
│   ├── dto/
│   │   ├── admin.user.email.change.begin.dto.input.ts
│   │   └── admin.user.email.change.drift.resolve.dto.input.ts
│   └── *.spec.ts
│
├── services/infrastructure/kratos/
│   └── kratos.service.ts                                          # EXTEND with: updateIdentityEmailTrait, invalidateAllIdentitySessions, getIdentityEmailTrait
│
├── common/enums/
│   └── notification.event.ts                                      # EXTEND with: USER_EMAIL_CHANGE_CONFIRMATION, USER_EMAIL_CHANGE_SECURITY_SIGNAL
│
├── types/
│   └── alkemio.config.ts                                          # EXTEND with: endpoints.client_web: string
│
└── migrations/
    └── <timestamp>-CreateEmailChangePendingAndAuditEntry.ts       # NEW migration: two tables + indices
```

**Structure Decision**: Single-project NestJS layout. The domain logic (state machine, repositories, entities, audit) is co-located under `src/domain/community/user-email-change/` — consistent with how `user-settings/` sits as a sibling of `user/`. Each GraphQL surface (root, me, platform-admin) gets its own thin resolver folder that delegates to the domain service. The Kratos extension methods are appended to the existing `KratosService` rather than creating a parallel client — there is already a wrapper there, and forking it would violate Principle 10 (Simplicity).

## Complexity Tracking

> No violations — section intentionally empty.

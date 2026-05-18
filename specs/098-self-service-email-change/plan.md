# Implementation Plan: Self-Service Email Change With Ownership Verification

**Branch**: `098-self-service-email-change` | **Date**: 2026-05-18 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/098-self-service-email-change/spec.md`
**Foundational dependency**: `097-change-user-email` (audit foundation; MUST be merged first)

## Summary

Add the user-initiated self-service email-change surface AND the full platform-mediated email-ownership verification machinery on top of the admin audit foundation contracted in spec 097. Introduces a new `email_change_pending` PostgreSQL entity (in-flight verification rows; 30-day retention past terminal state; partial unique index enforcing one active pending change per subject), a token utility (≥128-bit base64url, 1-hour TTL, plaintext storage, single-use, supersession-aware), a multi-step state lifecycle (`initiated → confirmed → committed / rolled_back / expired / superseded / drift_detected`), three new mutations (`meUserEmailChangeBegin` under the `me` shape, `userEmailChangeConfirm` at the schema root and session-less per FR-018a — both new in this spec), one new query field (`me.pendingEmailChange`), and a new outbound notification event (`USER_EMAIL_CHANGE_CONFIRMATION` to the proposed new mailbox). 097's `adminUserEmailChangeDriftResolve` mutation is extended additively (per FR-009b-EXT) to also transition the associated pending row when drift involves a self-initiated change. All other foundational behaviour — two-side commit, retry, rollback, drift detection, security signal at old address, session invalidation, audit-entry writes, admin audit query — is reused from 097 unchanged. `endpoints.client_web` is introduced as a new typed config key for the confirmation deep-link host. The `email_change_audit_outcome` Postgres enum is EXTENDED additively with 7 new values for verification-flow outcomes.

## Technical Context

**Language/Version**: TypeScript 5.3, Node.js 22 LTS (Volta pins 22.21.1) — inherited from 097
**Primary Dependencies**: NestJS 10, TypeORM 0.3 (custom fork `pkg.pr.new/antst/typeorm`), Apollo Server 4, GraphQL 16, Node `crypto` (token generation — new in this spec), `class-validator` (DTO validation), Winston (via `nest-winston`), `elastic-apm-node` — all inherited from 097 except `crypto` which is a stdlib import
**Storage**: PostgreSQL 17.5 — **one** new table introduced by this spec (`email_change_pending`) and one new enum (`email_change_pending_state`, 7 values). The existing `email_change_audit_outcome` enum (097) is EXTENDED additively with 7 new values via `ALTER TYPE ... ADD VALUE ...` statements.
**Testing**: Vitest 4.x — unit specs for `initiateSelf`, `confirm` (every branch: happy, FR-004a re-check rejection, token guards, FR-019a atomic-init rollback), `getActivePendingForSubject` (every observable state); plus authorization checks on the `me`-shape resolver and the root confirm resolver. One integration spec covering the self-service end-to-end flow + one covering token-lifecycle adversarial cases + one covering the drift-resolve extension when a 098 pending row is present.
**Target Platform**: Linux server (Kubernetes via existing `build-deploy-k8s-*` workflows) — inherited
**Project Type**: Single project — NestJS GraphQL server (`src/`) — inherited
**Performance Goals**: Same p95 < 2 s envelope for the initiation mutation as the 097 admin path. The confirm mutation inherits 097's 5–10 s retry-budget ceiling for the worst-case commit path.
**Constraints**: All constraints from 097 apply unchanged. This spec adds: token persisted as plaintext (FR-007a); ≥128-bit entropy (FR-007c); URL-safe serialisation (FR-007c); 1-hour TTL (FR-007b); confirmation link MUST target a client-web URL — server adds no new HTTP route (FR-003a); confirm mutation is session-less (FR-018a); token is the sole authority for confirmation (FR-018a).
**Scale/Scope**: Per-feature surface — 1 new entity (`email_change_pending`), 2 new mutations (`meUserEmailChangeBegin`, `userEmailChangeConfirm`), 1 new query field (`me.pendingEmailChange`), 1 new pending-state Postgres enum (7 values), 7 additive values on the existing `email_change_audit_outcome` Postgres enum, 1 new outbound notification event (`USER_EMAIL_CHANGE_CONFIRMATION`), 1 new typed config key (`endpoints.client_web`), 1 new `me`-shape resolver folder and 1 new root-mutation resolver folder. The existing `UserEmailChangeService` (097) is extended with `initiateSelf`, `confirm`, `getActivePendingForSubject` methods; the existing `resolveDrift` method is extended to also transition the associated pending row (FR-009b-EXT).

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle | Compliance | How this feature satisfies it |
| --- | --- | --- |
| 1. Domain-Centric Design First | ✅ | New methods (`initiateSelf`, `confirm`, `getActivePendingForSubject`) added to the existing `UserEmailChangeService` from 097. The token utility is a pure function. Resolvers under `me/` and the root-mutation surface only orchestrate auth + delegation. |
| 2. Modular NestJS Boundaries | ✅ | New modules `MeUserEmailChangeApiModule` and `UserEmailChangeApiModule` (root) import the `UserEmailChangeModule` exported by 097. No circular deps; no duplication of foundation. |
| 3. GraphQL Schema as Stable Contract | ✅ | 2 new mutations (Input DTO each, imperative naming), 1 new query field on `MeQueryResults`, 1 new pending-state enum, 7 additive values on the existing audit-outcome enum, 2 new object types (`UserEmailChangePending`, `UserEmailChangeConfirmResult`). All additive; no breaking changes. Schema baseline diff is additions-only. |
| 4. Explicit Data & Event Flow | ✅ | Initiate flow: DTO validation → current-user check (caller is subject) → domain `initiateSelf` (validation pipeline → persist pending row + publish confirmation event as an atomic pair per FR-019a) → audit `initiated`. Confirm flow: token lookup (lifecycle guards) → FR-004a confirm-time uniqueness re-check → 097's two-side commit path (Kratos → Alkemio with retry → security signal → session invalidation) → audit committed. Every side effect is explicit. |
| 5. Observability & Operational Readiness | ✅ | Reuses 097's log contexts and APM markers. The confirm mutation MUST log the token-lifecycle guard outcome at info level (without the token value). No new dashboards / Prometheus metrics. |
| 6. Code Quality with Pragmatic Testing | ✅ | Unit specs target `initiateSelf` happy + supersession + FR-019a atomicity, `confirm` token guards (every adversarial branch) + FR-004a re-check + post-commit retries, `getActivePendingForSubject` mapping for all observable states, token utility (entropy / encoding / determinism), confirm-mutation session-less authorization. Integration specs target the self-service end-to-end, token adversarial cases, and the drift-resolve extension. |
| 7. API Consistency & Evolution Discipline | ✅ | Mutations imperative (`meUserEmailChangeBegin`, `userEmailChangeConfirm`); query descriptive (`pendingEmailChange`); inputs end with `Input`; result types end with the entity name or `Result`. Error codes follow 097's `EMAIL_CHANGE_*` family; 4 new codes added (`EMAIL_CHANGE_TOKEN_EXPIRED`, `EMAIL_CHANGE_TOKEN_USED`, `EMAIL_CHANGE_TOKEN_INVALID`, `EMAIL_CHANGE_MAIL_DELIVERY_FAILED`). |
| 8. Secure-by-Design Integration | ✅ | `class-validator` on all DTOs. Authorization for `meUserEmailChangeBegin` enforced by the resolver's `currentUser.id` binding (no `userID` argument). `userEmailChangeConfirm` is session-less by design (FR-018a) — token is the sole authority. The token never appears in logs, exceptions, or audit entries (FR-007a). `me.pendingEmailChange` returns null for any pending change not owned by the caller. |
| 9. Container & Deployment Determinism | ✅ | One new typed config key (`endpoints.client_web`) added to `AlkemioConfig`. No `process.env` reads outside `ConfigService`. Migration is idempotent and rollback-documented. |
| 10. Simplicity & Incremental Hardening | ✅ | Reuses 097's `UserEmailChangeService`, retry helper, masking utility, audit repository, Kratos extension methods, security-signal notification helper. Introduces only what is strictly needed for the verification flow: pending entity, token utility, the two new mutations, the me-query, and the additive enum extensions. No new ops-alert infrastructure, no background reconciler, no async pipelines. |

**Gate result**: PASS — no violations. No Complexity Tracking entries.

## Project Structure

### Documentation (this feature)

```text
specs/098-self-service-email-change/
├── plan.md              # This file
├── spec.md              # Feature spec
├── tasks.md             # Phased task list
├── research.md          # Phase 0 — research decisions (token, client_web URL, pending retention)
├── data-model.md        # Phase 1 — pending entity + enum extension
├── quickstart.md        # Phase 1 — end-to-end demo of the self-service flow
└── contracts/
    └── graphql.md       # Phase 1 — GraphQL SDL fragments for the verification surface
```

### Source Code (repository root)

```text
src/
├── domain/community/user-email-change/                            # OWNED BY 097 — extend in place
│   ├── user.email.change.service.ts                               # EXTEND: add initiateSelf, confirm, getActivePendingForSubject; extend resolveDrift to transition pending row
│   ├── user.email.change.module.ts                                # EXTEND: imports/providers for the new pending repository + token util
│   │
│   ├── pending.user.email.change.entity.ts                        # NEW — email_change_pending TypeORM entity
│   ├── pending.user.email.change.interface.ts                     # NEW — IPendingUserEmailChange
│   ├── pending.user.email.change.repository.ts                    # NEW
│   ├── user.email.change.token.util.ts                            # NEW — ≥128-bit base64url token generator
│   ├── enums/
│   │   └── user.email.change.state.ts                             # NEW — 7-value pending-state enum
│   └── dto/
│       ├── user.email.change.pending.ts                           # NEW — GraphQL UserEmailChangePending object
│       └── user.email.change.confirm.result.ts                    # NEW — GraphQL UserEmailChangeConfirmResult object
│
├── services/api/me/email-change/                                  # NEW me-shape surface
│   ├── me.user.email.change.api.module.ts                         # imports 097's UserEmailChangeModule + AuthorizationModule
│   ├── me.user.email.change.resolver.mutations.ts                 # meUserEmailChangeBegin
│   ├── me.user.email.change.resolver.fields.ts                    # MeQueryResults.pendingEmailChange field resolver
│   ├── dto/
│   │   └── me.user.email.change.begin.dto.input.ts                # MeUserEmailChangeBeginInput
│   └── *.spec.ts                                                  # Vitest unit specs
│
├── services/api/user-email-change/                                # NEW root-mutation surface
│   ├── user.email.change.api.module.ts                            # imports 097's UserEmailChangeModule
│   ├── user.email.change.resolver.mutations.ts                    # userEmailChangeConfirm (root, session-less)
│   ├── dto/
│   │   └── user.email.change.confirm.dto.input.ts                 # UserEmailChangeConfirmInput
│   └── *.spec.ts
│
├── platform-admin/domain/user/email-change/                       # OWNED BY 097 — extend in place
│   └── admin.user.email.change.resolver.mutations.ts              # the existing drift-resolve mutation invokes the extended resolveDrift method (FR-009b-EXT — no resolver change; pending-row transition lives in the service)
│
├── common/enums/
│   └── notification.event.ts                                      # EXTEND with: USER_EMAIL_CHANGE_CONFIRMATION
│
├── types/
│   └── alkemio.config.ts                                          # EXTEND with: endpoints.client_web: string
│
└── migrations/
    └── <timestamp>-CreateEmailChangePendingAndExtendAuditOutcomeEnum.ts   # NEW migration: 1 table + 1 new enum + 7 additive enum values + indices + FK constraints
```

**Structure Decision**: Single-project NestJS layout. The pending entity, the token utility, and the new method implementations all live alongside 097's existing domain module — extending in place rather than creating a parallel module is consistent with how the unified spec was originally envisioned and avoids cross-module circular dependencies. The two new GraphQL surfaces (`me/email-change/` and `user-email-change/` for the root confirm mutation) get their own resolver folders that delegate to the extended `UserEmailChangeService`. The Kratos extension methods are already on `KratosService` from 097's implementation — no further extension is needed. The drift-resolve mutation (097) is updated in-service-only to additionally transition the associated pending row; no resolver/contract change required.

## Complexity Tracking

> No violations — section intentionally empty.

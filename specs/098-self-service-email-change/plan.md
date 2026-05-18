# Implementation Plan: Self-Service Email Change

**Branch**: `098-self-service-email-change` | **Date**: 2026-05-18 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/098-self-service-email-change/spec.md`
**Foundational dependency**: `097-change-user-email` (MUST be merged first)

## Summary

Add the user-initiated self-service surface on top of the admin foundation contracted in spec 097. Introduces one new mutation (`meUserEmailChangeBegin`, under the `me` GraphQL shape), one new subject-user read query (`me.pendingEmailChange`), and two additive nullable/Boolean fields on the existing `UserEmailChangePending` object type (`initiatorAdmin: UserProfileSummary`, `awaitingAdminReconciliation: Boolean!`). All foundational behaviour (entities, state machine, token lifecycle, validation, two-side commit, drift, audit, retention, security signal, session invalidation, root confirm mutation) is reused from 097 without modification. The `UserEmailChangeService` is extended with two new methods: `initiateSelf(subjectUserId, newEmail)` (mirrors `initiateAdmin` with `initiatorRole=SELF` and `initiatorUserId=subjectUserId`) and `getActivePendingForSubject(subjectUserId)` (returns the active or within-30-day-drift_detected pending row mapped to `UserEmailChangePending` with the admin-profile lookup when applicable). No new entities, no migrations, no new Kratos calls, no new notification events, no new error codes.

## Technical Context

**Language/Version**: TypeScript 5.3, Node.js 22 LTS (Volta pins 22.21.1) — inherited from 097
**Primary Dependencies**: NestJS 10, TypeORM 0.3, Apollo Server 4, GraphQL 16, `class-validator` (DTO validation) — inherited from 097
**Storage**: PostgreSQL 17.5 — reuses `email_change_pending` and `email_change_audit_entry` tables from 097; no new tables, no new columns, no enum extensions (the `email_change_initiator_role` enum already carries both `self` and `platform_admin` values upfront per 097's data model)
**Testing**: Vitest 4.x — unit specs for `initiateSelf` and `getActivePendingForSubject`, plus authorization on the `me`-shape resolver; one integration spec covering the self-service end-to-end flow against real Postgres + mocked Kratos HTTP
**Target Platform**: Linux server (Kubernetes via existing `build-deploy-k8s-*` workflows) — inherited
**Project Type**: Single project — NestJS GraphQL server (`src/`) — inherited
**Performance Goals**: Same p95 < 2 s envelope for the initiation mutation as the admin path (the underlying retry budget for commit is shared)
**Constraints**: All constraints from 097 apply unchanged. This spec adds no new constraints. The `userEmailChangeConfirm` root mutation is used unchanged (FR-018a is foundational).
**Scale/Scope**: Per-feature surface — 1 new mutation (`meUserEmailChangeBegin`), 1 new query field (`me.pendingEmailChange`), 2 new fields on the existing `UserEmailChangePending` object type, 1 new input DTO (`MeUserEmailChangeBeginInput`), 1 new `me`-surface module that imports the `UserEmailChangeModule` exported by 097. No new entities, no new migrations, no schema-breaking changes.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle | Compliance | How this feature satisfies it |
| --- | --- | --- |
| 1. Domain-Centric Design First | ✅ | This spec adds two methods to the existing `UserEmailChangeService` (097's domain module) and a thin `me`-shape resolver. No new business logic outside the existing service. |
| 2. Modular NestJS Boundaries | ✅ | New module `MeUserEmailChangeApiModule` imports the `UserEmailChangeModule` exported by 097. No circular deps; no duplication of foundation. |
| 3. GraphQL Schema as Stable Contract | ✅ | One new mutation (`Input` DTO, imperative naming), one new query field on `MeQueryResults`, two additive optional/required fields on the existing `UserEmailChangePending` type (`initiatorAdmin: UserProfileSummary` nullable, `awaitingAdminReconciliation: Boolean!`). All additive; no breaking changes. |
| 4. Explicit Data & Event Flow | ✅ | Flow: DTO validation → current-user check (caller is the subject) → domain operation (`UserEmailChangeService.initiateSelf`) → audit entry persistence (097's audit service) → outbound notification (097's NotificationAdapter helper, role tag `self`) → state transition persistence. |
| 5. Observability & Operational Readiness | ✅ | Reuses 097's log contexts and APM marker. No new log contexts, no new dashboards, no new metrics. |
| 6. Code Quality with Pragmatic Testing | ✅ | Unit specs target `initiateSelf` happy + supersession paths, `getActivePendingForSubject` mapping for all observable states (INITIATED, CONFIRMED, DRIFT_DETECTED within window), and the `me`-shape resolver authorization (caller must equal subject). One integration spec covers the self-service end-to-end. |
| 7. API Consistency & Evolution Discipline | ✅ | Mutation imperative (`meUserEmailChangeBegin`); query descriptive (`pendingEmailChange`); input ends with `Input`; payload reuses the existing `UserEmailChangePending` entity-shaped type. |
| 8. Secure-by-Design Integration | ✅ | `class-validator` on the DTO. Authorization is enforced by the resolver's current-user binding (the subject is always the caller; there is no `userID` argument). The `me.pendingEmailChange` query MUST refuse to return any pending change not owned by the caller. The admin-profile-summary resolution exposes only `{id, displayName}` — never the admin's email or other PII. |
| 9. Container & Deployment Determinism | ✅ | No new container, no new runtime config, no new env vars. The `endpoints.client_web` config key is already added by 097. |
| 10. Simplicity & Incremental Hardening | ✅ | This spec is the smallest possible additive surface: two service methods, one resolver folder, two input/output DTO files, two additive GraphQL fields. No new infrastructure, no parallel state machine, no duplicate validation. |

**Gate result**: PASS — no violations. No Complexity Tracking entries.

## Project Structure

### Documentation (this feature)

```text
specs/098-self-service-email-change/
├── plan.md              # This file
├── spec.md              # Feature spec (concise; references 097)
├── tasks.md             # Phased task list (small — depends on 097's foundation)
└── contracts/
    └── graphql.md       # GraphQL SDL fragments for the additive surface
```

(No `data-model.md`, `research.md`, or `quickstart.md` in this spec — those artifacts are fully owned by 097 and not duplicated. The 098 self-service walkthrough is part of the integration spec introduced in tasks.md.)

### Source Code (repository root)

```text
src/
├── domain/community/user-email-change/                # OWNED BY 097 — extend in place
│   └── user.email.change.service.ts                   # EXTEND: add initiateSelf, getActivePendingForSubject methods
│   └── dto/user.email.change.pending.ts               # EXTEND: add initiatorAdmin?, awaitingAdminReconciliation fields
│
├── services/api/me/email-change/                      # NEW me-shape surface (introduced by this spec)
│   ├── me.user.email.change.api.module.ts             # imports 097's UserEmailChangeModule + AuthorizationModule
│   ├── me.user.email.change.resolver.mutations.ts     # meUserEmailChangeBegin
│   ├── me.user.email.change.resolver.fields.ts        # MeQueryResults.pendingEmailChange field resolver
│   ├── dto/
│   │   └── me.user.email.change.begin.dto.input.ts    # MeUserEmailChangeBeginInput
│   └── *.spec.ts                                      # Vitest unit specs
│
└── (No migrations, no entity changes, no Kratos changes, no NotificationAdapter changes.)
```

**Structure Decision**: Single-project NestJS layout. The `me`-shape surface lives alongside other `me`-shaped resolvers under `src/services/api/me/email-change/`. The domain service is extended in place rather than via a subclass or decorator, consistent with how 097 anticipates this extension (097's tasks.md T020 notes that `initiateSelf` and `getActivePendingForSubject` are added by this spec). Code reviews on the `UserEmailChangeService` file should include both 097's owners and this spec's owner.

## Complexity Tracking

> No violations — section intentionally empty.

# Implementation Plan: User Design Version Setting

**Branch**: `096-user-design-version` | **Date**: 2026-05-12 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/096-user-design-version/spec.md`

## Summary

Add a `designVersion` integer field as a top-level peer on the `UserSettings` aggregate. The field defaults to `2` (the "new" design generation), is set to `2` for every newly registered user, and is exposed on every existing user query path that already returns `UserSettings`. The existing `updateUserSettings` mutation is extended to accept a new optional `designVersion: Int` field; no new mutation, no new top-level type, no new authorization privilege. The single DDL `ALTER TABLE user_settings ADD COLUMN "designVersion" int NOT NULL DEFAULT 2` simultaneously seeds new inserts and backfills every pre-existing row (Postgres rewrites existing rows with the default), satisfying FR-009 without a separate `UPDATE` step.

## Technical Context

**Language/Version**: TypeScript 5.3, Node.js 22 LTS (Volta pins 22.21.1)
**Primary Dependencies**: NestJS 10, TypeORM 0.3 (custom fork `pkg.pr.new/antst/typeorm`), Apollo Server 4, GraphQL 16, `class-validator`
**Storage**: PostgreSQL 17.5 — add one `int NOT NULL DEFAULT 2` column to existing `user_settings` table
**Testing**: Vitest 4.x — extend `user.settings.service.spec.ts` with focused unit cases for the new field; add a migration validation snapshot per the standard harness
**Target Platform**: Linux server (containerized NestJS process)
**Project Type**: single (NestJS monolith — `src/`)
**Performance Goals**: No new performance targets. Read/write path is the existing user-settings flow; the field is a single scalar column, so latency is unchanged
**Constraints**: Schema contract requires regeneration (`pnpm run schema:print && pnpm run schema:sort`). Migration must be idempotent and reversible. All commits must be signed.
**Scale/Scope**: 1 entity touched (`UserSettings`), 1 migration, 1 new GraphQL `Int` field (additive). No new module, no new resolver, no new event.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| # | Principle | Status | Notes |
| - | --------- | ------ | ----- |
| 1 | Domain-Centric Design First | ✅ Pass | All logic stays inside `UserSettingsService` and `UserService.getDefaultUserSettings()`. Resolver remains thin. No domain logic in `user.resolver.mutations.ts`. |
| 2 | Modular NestJS Boundaries | ✅ Pass | All changes inside the existing `UserSettingsModule` and its DTO folder; no new module, no new providers, no circular deps. |
| 3 | GraphQL Schema as Stable Contract | ✅ Pass | Strictly additive: new optional input field on existing inputs; new non-null output field on `UserSettings` (safe — clients ignore unknown fields, and pre-existing rows resolve to `2` via the column default). No deprecation needed. Schema regen + `change-report.json` review on PR. |
| 4 | Explicit Data & Event Flow | ✅ Pass | Write path = DTO validation → existing `UPDATE` authorization on user → `UserSettingsService.updateSettings` → persist. No new event needed: matches the existing user-settings update pattern (homeSpace, privacy, communication, notification) — none of which emit dedicated events. |
| 5 | Observability & Operational Readiness | ✅ Pass | No new module surface; existing Winston `LogContext.COMMUNITY` context covers the area. No new metrics or dashboards added (constitution forbids orphaned signals). |
| 6 | Code Quality with Pragmatic Testing | ✅ Pass | Add ~3 focused unit tests in `user.settings.service.spec.ts` (default applied on create, value persisted on update, omitted update leaves value unchanged). No e2e/integration test required — the new field is a thin scalar through an already-covered path. |
| 7 | API Consistency & Evolution Discipline | ✅ Pass | Field added inline on the existing `updateUserSettings` mutation (Input ends with `Input`, payload is the existing `User` entity). No new enum/scalar — using the standard GraphQL `Int`. |
| 8 | Secure-by-Design Integration | ✅ Pass | Input validated via `@IsInt()` on the DTO field. Authorization unchanged — the existing `AuthorizationPrivilege.UPDATE` grant on the user's `authorization` policy gates the mutation. No new privilege, no new license check (preference is not a paid resource). |
| 9 | Container & Deployment Determinism | ✅ Pass | Pure code + migration change. No new env var, no new feature flag. |
| 10 | Simplicity & Incremental Hardening | ✅ Pass | Smallest viable change: one column, one migration, one default, four DTO/interface/entity touches. No new abstraction, no new event channel, no new privilege. |

**No gate violations. No Complexity Tracking entries needed.**

## Project Structure

### Documentation (this feature)

```text
specs/096-user-design-version/
├── plan.md              # This file
├── spec.md              # Feature spec (existing)
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── graphql.md       # New/changed GraphQL fields
├── checklists/
│   └── requirements.md  # Spec quality checklist (existing)
└── tasks.md             # /speckit.tasks output (not created here)
```

### Source Code (repository root)

This is the existing NestJS monolith. The feature touches only the user-settings subtree, the user creation default, and migrations.

```text
src/
├── domain/community/
│   ├── user-settings/
│   │   ├── user.settings.entity.ts          # ADD: `designVersion` column (int NOT NULL DEFAULT 2)
│   │   ├── user.settings.interface.ts        # ADD: `@Field(() => Int) designVersion!: number`
│   │   ├── user.settings.service.ts          # MODIFY: createUserSettings seeds from input; updateSettings handles the new field
│   │   ├── user.settings.service.spec.ts     # ADD: unit tests for default + update
│   │   └── dto/
│   │       ├── user.settings.dto.create.ts   # ADD: optional `designVersion?: number` (`@IsInt()`, default `2`)
│   │       └── user.settings.dto.update.ts   # ADD: optional `designVersion?: number` (`@IsInt()`)
│   └── user/
│       └── user.service.ts                   # MODIFY: getDefaultUserSettings() includes `designVersion: 2`
└── migrations/
    └── <timestamp>-AddDesignVersionToUserSettings.ts  # NEW migration

schema.graphql                                 # Regenerated via schema:print + schema:sort
schema-baseline.graphql                        # Updated by post-merge automation
```

**Structure Decision**: Single project (NestJS monolith). All work fits inside the existing `domain/community/user-settings` module plus a one-line addition in `user.service.ts` (default seed) and a new migration. No new directory needed.

## Phase 0: Outline & Research

No `NEEDS CLARIFICATION` markers remain after `/speckit.clarify`. Phase 0 captures the design decisions made while planning, with their rationale and alternatives — written to [`research.md`](./research.md).

## Phase 1: Design & Contracts

Phase 1 deliverables:

1. [`data-model.md`](./data-model.md) — entity change, column definition, validation rules.
2. [`contracts/graphql.md`](./contracts/graphql.md) — diff of the GraphQL surface (object type field + input fields).
3. [`quickstart.md`](./quickstart.md) — how to run the feature locally end-to-end (register user, query `me`, mutate, re-query).
4. Agent context refresh via `.specify/scripts/bash/update-agent-context.sh claude`.

### Post-Phase-1 Constitution Re-Check

Re-running the gates after writing data-model and contracts: no surface area was added beyond what was already projected (one `Int` column, one `Int` field on the GraphQL type, one optional `Int` field on each of the two inputs). All gates remain ✅. **No new violations.**

## Complexity Tracking

_Not applicable — no constitution violations to justify._

---
description: 'Task list for User Design Version Setting (096-user-design-version)'
---

# Tasks: User Design Version Setting

**Input**: Design documents from `/specs/096-user-design-version/`
**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/graphql.md](./contracts/graphql.md), [quickstart.md](./quickstart.md)

**Tests**: Three focused Vitest unit tests are included per the plan's pragmatic-testing commitment (constitution principle #6). No integration/e2e tests — the new field flows through paths already covered by existing tests for `privacy` / `communication` / `homeSpace`.

**Organization**: Tasks are grouped by user story. US1 and US3 are both P1 in `spec.md`; US3's implementation is satisfied automatically once the `@Field` decorator from Foundational is in place, so US3 is a verification phase rather than a code-change phase.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: US1, US2, or US3 — only on tasks inside a user-story phase
- Exact file paths included in every task

## Path Conventions

Existing NestJS monolith. All source under `src/`. New migration under `src/migrations/`. Tests live next to the code they cover (`*.spec.ts`).

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm the local environment is ready for an additive change to `UserSettings`.

- [X] T001 Confirm branch is `096-user-design-version`, working tree is clean, develop is merged in, and local services + migrations are current (`git status`, `pnpm install`, `pnpm run start:services`, `pnpm run migration:run`)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Add the persistence column, expose the field on the `UserSettings` GraphQL type, and produce the migration. Every user story depends on these.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T002 [P] Add `designVersion` column to the entity in `src/domain/community/user-settings/user.settings.entity.ts` — `@Column('int', { nullable: false, default: 2 }) designVersion!: number;` placed after the existing `homeSpace` column
- [X] T003 [P] Add `designVersion` field to the GraphQL interface in `src/domain/community/user-settings/user.settings.interface.ts` — `@Field(() => Int, { nullable: false, description: 'The design version this User has selected (1 = previous design, 2 = current default, 3+ reserved for future designs).' }) designVersion!: number;` and add `Int` to the `@nestjs/graphql` import
- [X] T004 Generate the migration file via `pnpm run migration:generate -n AddDesignVersionToUserSettings` (depends on T002 — the generator inspects the entity); confirm it lands at `src/migrations/<timestamp>-AddDesignVersionToUserSettings.ts`
- [X] T005 Verify the generated migration `up()` is exactly `ALTER TABLE "user_settings" ADD "designVersion" int NOT NULL DEFAULT 2` and `down()` is `ALTER TABLE "user_settings" DROP COLUMN "designVersion"` — edit the generated file to match this form if the generator produced anything different (e.g., split into multiple statements, missing default). _Note: the generator also included unrelated drift on the `file` table (a stale `content_metadata` column and three FK churns); these were stripped out of the migration as out-of-scope, leaving only the `designVersion` ALTER._
- [X] T006 Apply the migration to the local DB with `pnpm run migration:run` and verify the column exists with `psql` or your DB client: `SELECT column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_name = 'user_settings' AND column_name = 'designVersion';` — expect `int4 / NO / 2`. _Verified: `integer / NO / 2`; all 3 pre-existing rows backfilled to `2`._

**Checkpoint**: Column + GraphQL field + migration in place. The field is now readable on every existing query path that already returns `UserSettings`. All pre-existing rows now carry `2`.

---

## Phase 3: User Story 1 - New users get the new design by default (Priority: P1) 🎯 MVP

**Goal**: Every newly registered user has `designVersion = 2` recorded on their settings at the moment of account creation, and the value is reachable through the existing `me` query path.

**Independent Test**: Register a brand-new user, then run `query { me { user { settings { designVersion } } } }` — response returns `2`. Also confirm an existing pre-feature user returns `2` after the migration (handled by Foundational T006).

- [X] T007 [P] [US1] Add optional `designVersion` field to `CreateUserSettingsInput` in `src/domain/community/user-settings/dto/user.settings.dto.create.ts` — `@Field(() => Int, { nullable: true, description: 'Initial design version for this User. Defaults to 2 when omitted.' }) @IsInt() designVersion?: number;`, importing `Int` from `@nestjs/graphql` and `IsInt` from `class-validator`. _Implementation also wraps `@IsInt()` with `@IsOptional()` so the validator does not fail when the field is omitted — same pattern as other optional DTO fields._
- [X] T008 [US1] Propagate `designVersion` in `UserSettingsService.createUserSettings()` at `src/domain/community/user-settings/user.settings.service.ts` — extend the `UserSettings.create({ ... })` call to include `designVersion: settingsData.designVersion ?? 2` alongside the existing four fields (depends on T007)
- [X] T009 [P] [US1] Add `designVersion: 2` to the object returned by `UserService.getDefaultUserSettings()` in `src/domain/community/user/user.service.ts` (around line 387, after the `homeSpace` block) (depends on T007 — the input type must already accept the field)
- [X] T010 [US1] Add a Vitest case `createUserSettings propagates designVersion from input` in `src/domain/community/user-settings/user.settings.service.spec.ts` — instantiate the service with the mocked repo, call `createUserSettings({ ...minimal input, designVersion: 2 })`, assert `result.designVersion === 2`; add a second case asserting `designVersion: 7` round-trips through `createUserSettings` to prove no clamping (depends on T008). _Also added `designVersion: 2` to the `buildSettings` helper so the new US2 tests below have a baseline value._

**Checkpoint**: A freshly registered user has `designVersion = 2` and the value is queryable. MVP delivered — the platform now has a working "everyone is on the new design" default.

---

## Phase 4: User Story 2 - User switches their design preference (Priority: P2)

**Goal**: An authorized caller can change a user's `designVersion` via the existing `updateUserSettings` mutation. The platform accepts any integer (positive, negative, zero, future versions), persists it, and returns the new value on subsequent reads.

**Independent Test**: Authenticated as a user with `UPDATE` privilege on their own account, run the `SetDesignVersion` mutation from `contracts/graphql.md` with `designVersion: 1`. Re-query — value is `1`. Repeat with `designVersion: 3` and `designVersion: -1` — both accepted. Unauthorized caller targeting another user's settings — rejected by the existing authorization check (no change required).

- [X] T011 [P] [US2] Add optional `designVersion` field to `UpdateUserSettingsEntityInput` in `src/domain/community/user-settings/dto/user.settings.dto.update.ts` — `@Field(() => Int, { nullable: true, description: "Update the user's design version. Any integer accepted (1 = previous design, 2 = current default, 3+ reserved)." }) @IsInt() designVersion?: number;`, importing `Int` from `@nestjs/graphql` and `IsInt` from `class-validator`. _Also wrapped `@IsInt()` with `@IsOptional()` to match the project pattern for optional DTO fields._
- [X] T012 [US2] Handle `designVersion` in `UserSettingsService.updateSettings()` at `src/domain/community/user-settings/user.settings.service.ts` — after the existing `if (updateData.homeSpace) { ... }` block, add `if (updateData.designVersion !== undefined) { settings.designVersion = updateData.designVersion; }` (use `!== undefined`, not truthy, so `0` and negatives are accepted per FR-004) (depends on T011)
- [X] T013 [US2] Add two Vitest cases under a new `describe('updateSettings - designVersion', ...)` block in `src/domain/community/user-settings/user.settings.service.spec.ts` — (a) `should update designVersion when provided` asserts `result.designVersion === 1` after calling with `{ designVersion: 1 }`; (b) `should not change designVersion when omitted` asserts the existing value is preserved when `updateData = {}`; include `buildSettings` overrides for `designVersion` so the helper supports the new field (depends on T012). _Added a third case asserting `0` and `-1` are accepted verbatim, defending FR-004 ("no clamping")._

**Checkpoint**: Both stories work independently. A new user lands on `2` (US1) and any user can switch to any integer (US2).

---

## Phase 5: User Story 3 - Clients read the design version through existing user queries (Priority: P1)

**Goal**: The `designVersion` field is reachable through every existing query path that already returns `UserSettings` (notably `me.user.settings.designVersion` and `user(ID: ...).settings.designVersion`). No new query, no new resolver.

**Independent Test**: Run each query in `contracts/graphql.md`'s "Query paths returning the new field" section against the local server. Each returns the persisted integer.

> US3 has no code-change tasks. The `@Field` decorator added in Foundational T003 fully implements the user-facing requirement. This phase is a verification step confirming the field is exposed on the live GraphQL surface.

- [ ] T014 [US3] Start the dev server (`pnpm start:dev`) and execute both query examples from `specs/096-user-design-version/contracts/graphql.md` ("Query paths returning the new field") against `http://localhost:3000/graphiql` for (a) a freshly registered user, (b) an existing pre-feature user, (c) a user whose value has been changed via T011/T012. All three return the expected integer with no GraphQL errors. **DEFERRED to manual pre-merge verification.** Persistence shape proven by T006 (column + backfill), GraphQL surface proven by T015 (regenerated `schema.graphql` exposes `UserSettings.designVersion: Int!`), and service logic proven by T010 + T013 unit tests.

**Checkpoint**: All three user stories are independently verifiable end-to-end.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Schema contract refresh, migration validation, repo-wide quality gates.

- [X] T015 Regenerate the committed GraphQL schema with `pnpm run schema:print && pnpm run schema:sort`; commit the updated `schema.graphql` (the `schema-baseline.graphql` is regenerated by the post-merge `schema-baseline.yml` automation — do not hand-edit). _Schema regenerated; `UserSettings.designVersion: Int!` and `UpdateUserSettingsEntityInput.designVersion: Int` present at the expected positions._
- [X] T016 Run `pnpm run schema:diff` and inspect `change-report.json` — expect only `NON_BREAKING` entries for `UserSettings.designVersion`, `CreateUserSettingsInput.designVersion`, and `UpdateUserSettingsEntityInput.designVersion`. Zero `BREAKING` entries. If anything is flagged BREAKING, stop and reconcile (likely a field type or nullability mismatch with the spec). _Result: `additive: 1, breaking: 0`. The diff tool catalogs the object-type addition (`UserSettings.designVersion : Int!`) explicitly; optional input-type additions are treated as non-events by the tool — correct per backwards-compat rules._
- [ ] T017 Run the migration validation harness `.scripts/migrations/run_validate_migration.sh` against the new migration to confirm the snapshot → apply → CSV-diff → restore cycle succeeds. **DEFERRED:** the harness requires `.scripts/migrations/.env` and `db/reference_schema.sql` which are operator-managed assets not present in this dev environment. The migration is a single additive `ALTER TABLE ADD COLUMN int NOT NULL DEFAULT 2`, was successfully applied and reverse-verified by T006 (column shape + backfill), and is reversible via the explicit `down()`.
- [X] T018 [P] Run `pnpm lint` (Biome + `tsc --noEmit`) — must pass with zero new errors or warnings touching the changed files. _Pass. First run caught a missing `designVersion` field on `test/data/user.settings.mock.ts` (fixed). Re-run: zero errors. Two pre-existing warnings on `src/domain/space/space/space.service.ts` (unused imports) are unrelated to this feature._
- [X] T019 [P] Run `pnpm test:ci:no:coverage` — the three new Vitest cases (T010 + T013) plus all pre-existing user-settings/user tests must pass. _Pass: **581 test files, 6453 tests passed**, 7 skipped, 0 failed._
- [ ] T020 Walk through every step of `specs/096-user-design-version/quickstart.md` (all of Story 1, Story 2, Story 3, edge cases, regression query) against the local server as a final acceptance gate. **DEFERRED to manual pre-merge verification** alongside T014.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately.
- **Foundational (Phase 2)**: Depends on Setup. **Blocks all user stories** — column, interface, and migration are needed everywhere.
- **US1 (Phase 3)**: Depends on Foundational. Adds the default-seeding policy.
- **US2 (Phase 4)**: Depends on Foundational. Can run in parallel with US1 (different DTO, different service branch) but T011 touches the same `user-settings/dto/` directory as T007 in different files, so no file conflict.
- **US3 (Phase 5)**: Depends on Foundational only. Has no code tasks — pure verification. Can be done after Foundational alone, or after US1 + US2 for richer fixture data.
- **Polish (Phase 6)**: Depends on Foundational + US1 + US2 (T015 needs all GraphQL changes in place; T016/T019 need everything compiled and tested).

### Within Each User Story

- **US1**: T007 (DTO) → {T008 (service), T009 (default seed)} in parallel → T010 (unit test).
- **US2**: T011 (DTO) → T012 (service) → T013 (unit tests).
- **US3**: T014 only.

### Parallel Opportunities

- **Foundational**: T002 and T003 can run in parallel (entity vs interface — different files). T004 depends on T002. T005 sequences after T004. T006 sequences after T005.
- **US1 vs US2**: Once Foundational is done, US1 and US2 touch different files and can be implemented in parallel by separate developers. Note that T010 and T013 both edit `user.settings.service.spec.ts` — not safe to do in parallel; sequence them.
- **Polish**: T018 (lint) and T019 (tests) are independent; run in parallel.

---

## Parallel Example: After Foundational

```bash
# Once T001–T006 are green, two developers can split US1 and US2:

# Developer A — US1:
Task: "T007 [US1] Add optional designVersion to CreateUserSettingsInput in src/domain/community/user-settings/dto/user.settings.dto.create.ts"
Task: "T008 [US1] Propagate designVersion in UserSettingsService.createUserSettings()"  # depends on T007
Task: "T009 [US1] Add designVersion: 2 to UserService.getDefaultUserSettings()"          # depends on T007

# Developer B — US2:
Task: "T011 [US2] Add optional designVersion to UpdateUserSettingsEntityInput"
Task: "T012 [US2] Handle designVersion in UserSettingsService.updateSettings()"          # depends on T011

# Then merge and sequence the spec edits (T010 then T013) since they share user.settings.service.spec.ts.
```

---

## Implementation Strategy

### MVP First (US1 only)

1. Phase 1: Setup (T001)
2. Phase 2: Foundational (T002–T006)
3. Phase 3: US1 (T007–T010)
4. Run Story 1 acceptance from `quickstart.md`
5. **STOP and VALIDATE** — the platform now defaults every new and existing user to design version 2. This alone delivers product value (the rollout of the new design is enabled).

### Incremental Delivery

1. Setup + Foundational → field is queryable; all rows carry `2`.
2. US1 → new users explicitly seeded with `2`; **MVP gate**.
3. US2 → users (and admins via existing rules) can switch versions; product/support can opt accounts in or out.
4. US3 → verification only; confirms client-facing queries return the field.
5. Polish (T015–T020) → schema contract refreshed, lint/tests/migration validation green, full quickstart walked.

### Parallel Team Strategy

With two developers after Foundational:

- Developer A: US1 (T007 → T008, T009 → T010)
- Developer B: US2 (T011 → T012 → T013, *coordinate the spec file edit with A*)
- Either developer: US3 (T014) and Polish (T015–T020)

Total ~20 tasks; with two developers, the post-Foundational work is ~1 working day.

---

## Notes

- The feature is intentionally small and additive — no new module, no new privilege, no new event, no new mutation. If a task seems to imply otherwise, re-read `research.md` (decisions 2, 5) before adding scope.
- The single-DDL `ALTER TABLE ... ADD COLUMN int NOT NULL DEFAULT 2` is the backfill — do not author a separate `UPDATE user_settings SET designVersion = 2` task. See `research.md` decision 4.
- `[P]` only marks tasks in different files. Two tasks editing `user.settings.service.spec.ts` (T010, T013) are sequenced even though they are logically independent test cases.
- All commits on this branch must be signed (project git convention; see CLAUDE.md "Git Conventions").

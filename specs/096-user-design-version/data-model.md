# Phase 1 Data Model: User Design Version Setting

**Feature**: `096-user-design-version` | **Date**: 2026-05-12

## Affected Entity

### `UserSettings` (`src/domain/community/user-settings/user.settings.entity.ts`)

**Existing fields** (unchanged): `communication`, `privacy`, `notification`, `homeSpace`, plus everything inherited from `AuthorizableEntity` (`id`, `createdDate`, `updatedDate`, `authorization`, `version`).

**New field**:

| Property | Type | DB Column | DB Type | Nullable | Default | Notes |
| -------- | ---- | --------- | ------- | -------- | ------- | ----- |
| `designVersion` | `number` | `designVersion` | `int` | `NOT NULL` | `2` *(was `1` in Phase 1; flipped 2026-05-26)* | UI design generation for the user. `1` = legacy design generation (deprecated, scheduled for removal); `2` = current default design generation; `3+` reserved for future generations. Phase 3 (2026-06-17) flipped every persisted `1` row to `2` via `UPDATE`; `1` remains a valid but deprecated value pending full retirement. |

**TypeORM decorator**:

```ts
@Column('int', { nullable: false, default: DESIGN_VERSION_CURRENT_DEFAULT })
designVersion!: number;
```

`DESIGN_VERSION_CURRENT_DEFAULT` is exported from `user.settings.design.version.constants.ts` and resolves to `2` after the Phase 2 (2026-05-26) flip — Phase 1 shipped with `1`. The decorator mirrors the project convention used by `callout.entity.ts:91` (`@Column('int', { nullable: false })`) plus the explicit `default` value per the CLAUDE.md guideline: "Declare `default` in `@Column()` when the DB column has a DEFAULT".

### `IUserSettings` (`src/domain/community/user-settings/user.settings.interface.ts`)

**New GraphQL field**:

```ts
@Field(() => Int, {
  nullable: false,
  description: 'The design version this User has selected (1 = legacy design generation, deprecated and scheduled for removal; 2 = current default design generation; 3+ reserved for future generations).',
})
designVersion!: number;
```

Non-null on output because the column is `NOT NULL` with a default — every row always carries a value.

## Validation Rules

| Rule | Source | Enforcement Layer |
| ---- | ------ | ----------------- |
| Value must be an integer | FR-004, FR-005 | `class-validator` `@IsInt()` on the create + update DTO fields. Non-integers (string, decimal, boolean) rejected with a 400-class validation error before reaching the domain. |
| No min/max bound | FR-004 | No `@Min` / `@Max` decorators. Negative integers, zero, and arbitrarily large positive integers are all accepted. |
| Default = 2 | FR-002, FR-003 | DB column default + explicit seeding in `UserService.getDefaultUserSettings()`. Belt-and-braces — either layer alone would be sufficient. Phase 2 (2026-05-26) flipped the value from `1` to `2` via column-default DDL only; existing rows were preserved. Phase 3 (2026-06-17) ran a one-shot `UPDATE` to drain the remaining `designVersion = 1` rows onto `2`; non-`1` rows preserved verbatim. |
| Required on output | FR-008 | GraphQL field is `nullable: false`. |
| Optional on input | inherent to partial-update semantics | GraphQL field is `nullable: true` on both create and update inputs; omitting it leaves the existing value alone. |

## State Transitions

The field has no lifecycle states. It is a scalar preference that can be freely overwritten by any authorized update. No state machine.

## Identity & Uniqueness

Not applicable — `designVersion` is a per-row scalar with no uniqueness constraint.

## Volume & Scale

One `int` (4 bytes + Postgres overhead) added per `user_settings` row. At platform scale (thousands of users), total added storage is well under 1 MB. No indexing planned (not used in WHERE clauses).

## Migration

### Phase 1 (shipped 2026-05-13) — `1778596072652-AddDesignVersionToUserSettings.ts`

**Up**:

```sql
ALTER TABLE "user_settings"
  ADD "designVersion" int NOT NULL DEFAULT 1;
```

**Down**:

```sql
ALTER TABLE "user_settings"
  DROP COLUMN "designVersion";
```

The `NOT NULL DEFAULT 1` form atomically backfilled every pre-existing row to `1` as part of the `ADD COLUMN` (FR-009 satisfied by the DDL alone — no separate `UPDATE` needed).

### Phase 2 (shipped 2026-05-26) — `1779797470780-FlipUserSettingsDesignVersionDefaultToNew.ts`

**Up**:

```sql
ALTER TABLE "user_settings"
  ALTER COLUMN "designVersion" SET DEFAULT 2;
```

**Down**:

```sql
ALTER TABLE "user_settings"
  ALTER COLUMN "designVersion" SET DEFAULT 1;
```

**Critical invariant**: column-default DDL only. **No `UPDATE` statements anywhere.** Existing rows preserve whatever `designVersion` they have at the time of migration; only future inserts that omit the column are affected (they pick up `2`).

### Phase 3 (2026-06-17) — `1781800000000-BackfillUserSettingsDesignVersionLegacyToCurrentDefault.ts`

**Up**:

```sql
UPDATE "user_settings"
  SET "designVersion" = 2
  WHERE "designVersion" = 1;
```

**Down**: intentional no-op. Rationale below.

**Scope**: only rows currently holding the legacy value `1`. Rows holding any other integer (`0`, `-1`, `5`, `7`, …) are preserved verbatim — FR-004 still applies; this is the legacy-to-current-default flip, not a clamp. The column default is **not** changed (Phase 2 already set it to `2`).

**Why no symmetric down()**: a flip of `2 → 1` would not selectively restore the pre-migration distribution — we do not track which rows previously held `1`, and after Phase 3 the legitimate-`2` and back-filled-`2` rows are indistinguishable. Operators who must revert should restore a pre-migration database backup.

**Behavioral notes**:

- All three migrations are idempotent in the standard TypeORM sense (the migration registry tracks `up` execution).
- Phase 1 and Phase 2 are reversible via `migration:revert`; Phase 3 is not (the down() is a documented no-op).
- Run the standard migration validation harness on the Phase 2 migration: `.scripts/migrations/run_validate_migration.sh`. CSV diff for `user_settings` should be **identical row content**; only schema-metadata diff should be `column_default 1 → 2`.
- Phase 3 validation: the CSV diff for `user_settings` should show every row that previously held `1` now holding `2`; no other column changes; no row count change. Rows that previously held a non-`1` integer are preserved verbatim.

## Default Seeding (Service Layer)

`UserService.getDefaultUserSettings()` (line 276 of `src/domain/community/user/user.service.ts`) returns the `CreateUserSettingsInput` used for every newly registered user. Add `designVersion: 1` to the returned object, alongside the existing `homeSpace`, `privacy`, `communication`, and `notification` defaults. This explicit seeding makes FR-003 ("every new user gets `1`") visible at the registration call site, independent of the DB default.

`UserSettingsService.createUserSettings()` (line 27 of `src/domain/community/user-settings/user.settings.service.ts`) currently lists four fields explicitly in the `UserSettings.create({ ... })` call. Add `designVersion: settingsData.designVersion ?? 1` alongside, so callers that pass an explicit value win and callers that omit it still get `1`.

## Service Update Logic

`UserSettingsService.updateSettings()` (same file) currently has dedicated `if (updateData.<field>)` blocks for each sub-group. Add:

```ts
// Skip on both undefined (field omitted) and null (explicit clear is
// unsupported — the column is NOT NULL with a default of 2 since Phase 2).
if (updateData.designVersion != null) {
  settings.designVersion = updateData.designVersion;
}
```

(Use `!= null`, not `!== undefined`, so that:

- Omitted (`undefined`) is a no-op.
- Explicit `null` from the GraphQL input is a no-op — the column is `NOT NULL`, so assigning `null` would fail at `save()` time.
- Zero and negative integers are accepted per FR-004.)

The block sits at the top level of the function alongside the existing `if (updateData.privacy) { ... }` / `if (updateData.communication) { ... }` / `if (updateData.homeSpace) { ... }` blocks. Placement after the `homeSpace` block keeps the file ordering consistent with the entity field order.

## Backwards Compatibility

| Surface | Compatibility |
| ------- | ------------- |
| `UserSettings` GraphQL output | Strictly additive — new non-null field. Clients that don't query it are unaffected; clients that do query it always get a value (`2` for new rows after Phase 2; pre-Phase-2 rows retained whatever was persisted until Phase 3 flipped all `1` rows to `2`). |
| `UpdateUserSettingsEntityInput` | Strictly additive — new optional field. Existing callers continue to work unchanged. Description updated in Phase 3 (2026-06-17) to flag `1` as deprecated and scheduled for removal. |
| `CreateUserSettingsInput` | Strictly additive — new optional field. The internal `getDefaultUserSettings()` is the only producer, and it is updated in lockstep. Description updated in Phase 3 (2026-06-17) to flag `1` as deprecated and scheduled for removal. |
| Database | Phase 1 added `NOT NULL DEFAULT 1` column; Phase 2 flipped the column default to `2` via `ALTER COLUMN ... SET DEFAULT 2`; Phase 3 ran a one-shot `UPDATE` to flip all persisted `1` rows to `2` (non-`1` rows preserved verbatim). Phase 1 + Phase 2 are reversible via the down migrations; Phase 3 down() is a documented no-op (revert path is restore-from-backup). After Phase 3, no rows persist with `designVersion = 1` unless a user has explicitly opted back in via `updateUserSettings` since the backfill ran. The legacy value is on a decommission path; a future migration/PR will narrow the validator and drop the `1` value entirely (separate effort, breaking schema change). |
| Authorization | Unchanged. |
| Events | Unchanged (no new events). |

# Phase 1 Data Model: User Design Version Setting

**Feature**: `096-user-design-version` | **Date**: 2026-05-12

## Affected Entity

### `UserSettings` (`src/domain/community/user-settings/user.settings.entity.ts`)

**Existing fields** (unchanged): `communication`, `privacy`, `notification`, `homeSpace`, plus everything inherited from `AuthorizableEntity` (`id`, `createdDate`, `updatedDate`, `authorization`, `version`).

**New field**:

| Property | Type | DB Column | DB Type | Nullable | Default | Notes |
| -------- | ---- | --------- | ------- | -------- | ------- | ----- |
| `designVersion` | `number` | `designVersion` | `int` | `NOT NULL` | `2` *(was `1` in Phase 1; flipped 2026-05-26)* | UI design generation for the user. `1` = legacy design generation; `2` = current default design generation; `3+` reserved for future generations. |

**TypeORM decorator**:

```ts
@Column('int', { nullable: false, default: 1 })
designVersion!: number;
```

The decorator mirrors the project convention used by `callout.entity.ts:91` (`@Column('int', { nullable: false })`) plus the explicit `default` value per the CLAUDE.md guideline: "Declare `default` in `@Column()` when the DB column has a DEFAULT".

### `IUserSettings` (`src/domain/community/user-settings/user.settings.interface.ts`)

**New GraphQL field**:

```ts
@Field(() => Int, {
  nullable: false,
  description: 'The design version this User has selected (1 = current default design generation; 2 = new design, opt-in for now and expected to become the default in a subsequent release; 3+ reserved for future generations).',
})
designVersion!: number;
```

Non-null on output because the column is `NOT NULL` with a default — every row always carries a value.

## Validation Rules

| Rule | Source | Enforcement Layer |
| ---- | ------ | ----------------- |
| Value must be an integer | FR-004, FR-005 | `class-validator` `@IsInt()` on the create + update DTO fields. Non-integers (string, decimal, boolean) rejected with a 400-class validation error before reaching the domain. |
| No min/max bound | FR-004 | No `@Min` / `@Max` decorators. Negative integers, zero, and arbitrarily large positive integers are all accepted. |
| Default = 2 | FR-002, FR-003 | DB column default + explicit seeding in `UserService.getDefaultUserSettings()`. Belt-and-braces — either layer alone would be sufficient. Phase 2 (2026-05-26) flipped the value from `1` to `2` via column-default DDL only; existing rows were preserved. |
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

**Behavioral notes**:

- Both migrations are idempotent in the standard TypeORM sense (the migration registry tracks `up` execution) and reversible via `migration:revert`.
- Run the standard migration validation harness on the Phase 2 migration: `.scripts/migrations/run_validate_migration.sh`. CSV diff for `user_settings` should be **identical row content**; only schema-metadata diff should be `column_default 1 → 2`.

## Default Seeding (Service Layer)

`UserService.getDefaultUserSettings()` (line 276 of `src/domain/community/user/user.service.ts`) returns the `CreateUserSettingsInput` used for every newly registered user. Add `designVersion: 1` to the returned object, alongside the existing `homeSpace`, `privacy`, `communication`, and `notification` defaults. This explicit seeding makes FR-003 ("every new user gets `1`") visible at the registration call site, independent of the DB default.

`UserSettingsService.createUserSettings()` (line 27 of `src/domain/community/user-settings/user.settings.service.ts`) currently lists four fields explicitly in the `UserSettings.create({ ... })` call. Add `designVersion: settingsData.designVersion ?? 1` alongside, so callers that pass an explicit value win and callers that omit it still get `1`.

## Service Update Logic

`UserSettingsService.updateSettings()` (same file) currently has dedicated `if (updateData.<field>)` blocks for each sub-group. Add:

```ts
// Skip on both undefined (field omitted) and null (explicit clear is
// unsupported — the column is NOT NULL with a default of 1).
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
| `UserSettings` GraphQL output | Strictly additive — new non-null field. Clients that don't query it are unaffected; clients that do query it always get a value (default `1`). |
| `UpdateUserSettingsEntityInput` | Strictly additive — new optional field. Existing callers continue to work unchanged. |
| `CreateUserSettingsInput` | Strictly additive — new optional field. The internal `getDefaultUserSettings()` is the only producer, and it is updated in lockstep. |
| Database | Strictly additive — new `NOT NULL DEFAULT 1` column. No data loss, no existing column touched. Reversible via the down migration. |
| Authorization | Unchanged. |
| Events | Unchanged (no new events). |

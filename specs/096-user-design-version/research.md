# Phase 0 Research: User Design Version Setting

**Feature**: `096-user-design-version` | **Date**: 2026-05-12

No `NEEDS CLARIFICATION` markers were left in the spec after `/speckit.clarify`. This document captures the design decisions taken while planning, with rationale and alternatives considered, so subsequent phases (and the eventual reviewer) can audit them.

---

## Decision 1 — Column type and default

**Decision**: Add `designVersion` as a plain `int NOT NULL DEFAULT 2` column directly on the `user_settings` table.

**Rationale**:

- The spec accepts any integer (FR-004), so `int` covers the full required range; no enum.
- `NOT NULL DEFAULT 2` simultaneously satisfies FR-002 (default = 2), FR-003 (every new user gets 2), and FR-009 (existing rows surface 2 on first read), without needing a separate `UPDATE` backfill step. Postgres rewrites the row default into every existing row as part of the `ALTER TABLE … ADD COLUMN … NOT NULL DEFAULT 2` operation — there is no "lazy default" hazard here.
- All other `UserSettings` columns are JSONB blobs (`privacy`, `communication`, `notification`, `homeSpace`), which suits nested sub-objects. The design version is a single scalar; nesting it inside a one-field JSONB blob would be overstructure with no flexibility benefit. The clarification answer in `spec.md` (top-level field) is consistent with this.

**Alternatives considered**:

| Alternative | Why rejected |
| ----------- | ------------ |
| `smallint` | Trivially smaller, but the spec explicitly leaves future versions open-ended and the table is per-user (low row count); `int` is the conventional default and removes an upper bound. |
| New JSONB sub-object `interface: { designVersion: 2 }` | Premature structure for one field. If/when more UI preferences arrive, a follow-up migration can group them. |
| Postgres enum (`design_version_enum`) | Spec explicitly says "no restrictions" and "in the future we might move to 3, 4 etc." — an enum would force a migration on every new version. Rejected. |
| Backfill via separate `UPDATE` after `ADD COLUMN` (nullable) | The single-DDL `NOT NULL DEFAULT 2` form is atomic and idempotent; no reason to split it. |

---

## Decision 2 — GraphQL surface

**Decision**:

- Add `designVersion: Int!` as a top-level field on the `UserSettings` object type (peer of `privacy`, `communication`, `notification`, `homeSpace`).
- Add `designVersion: Int` (optional) to both `CreateUserSettingsInput` and `UpdateUserSettingsEntityInput`.
- Reuse the existing `updateUserSettings` mutation (defined on `UserResolverMutations`). No new mutation, no new payload type.

**Rationale**:

- Matches the clarification answer from `/speckit.clarify` Session 2026-05-12.
- Output field is non-null (`Int!`): the column is `NOT NULL DEFAULT 2`, so a value is always present on every read. Making it nullable would be a lie about the schema and would force every client to handle a case that cannot occur.
- Input fields are optional so partial updates remain partial (consistent with the rest of `UpdateUserSettingsEntityInput`).
- No new mutation, no new privilege — the existing `UPDATE` grant on `user.authorization` already gates `updateUserSettings` (see `src/domain/community/user/user.resolver.mutations.ts:62`).

**Alternatives considered**:

| Alternative | Why rejected |
| ----------- | ------------ |
| Dedicated `updateUserDesignVersion(userID, designVersion)` mutation | More surface area for no benefit. The existing partial-update mutation handles single-field updates fine. |
| `designVersion` on the top-level `User` type (sibling of `settings`) | Doesn't match the user's stated location ("extend userSettings") and would split user preferences across two types. |
| Custom scalar `DesignVersion` | Adds tooling friction (clients need scalar codegen) and gives no validation beyond `Int`. |
| Optional `Int` on output (`Int` not `Int!`) | Misrepresents the schema — the column is `NOT NULL`. |

---

## Decision 3 — Default seeding on user creation

**Decision**: Add `designVersion: 2` to `UserService.getDefaultUserSettings()` (in `src/domain/community/user/user.service.ts`), and have `UserSettingsService.createUserSettings()` propagate it from `CreateUserSettingsInput` to the entity.

**Rationale**:

- `UserService.getDefaultUserSettings()` is already the single source of truth for the initial `UserSettings` blob applied to every new user (called from the registration transaction at line 149). Adding the field there guarantees FR-003 (every new user gets 2) regardless of whether the column default fires.
- Even though the column default would already write 2 on insert when the field is omitted from the insert payload, TypeORM's `Repository.create(...)` passes explicit values for every entity field present in the create input. Setting it explicitly in the default makes the intent visible and survives any future change to TypeORM's insert behavior.

**Alternatives considered**:

| Alternative | Why rejected |
| ----------- | ------------ |
| Rely on the column default only (omit from `getDefaultUserSettings`) | Works today but couples FR-003 to TypeORM's omit-when-undefined behavior. Explicit is safer and matches how `homeSpace` is seeded (see `getDefaultUserSettings` line 383). |
| Hardcode `2` inside `UserSettingsService.createUserSettings` | Hides the default in the wrong layer; the user-creation flow should own the policy of "new users start at version 2". |

---

## Decision 4 — Existing-row backfill strategy

**Decision**: The `ALTER TABLE … ADD COLUMN "designVersion" int NOT NULL DEFAULT 2` statement is itself the backfill. No separate `UPDATE user_settings SET designVersion = 2` is needed.

**Rationale**:

- Postgres applies the `DEFAULT` to every existing row when a `NOT NULL DEFAULT` column is added in the same statement (Postgres ≥11 stores the default in the catalog for free, so the rewrite is also fast). FR-009 is satisfied without a second pass.
- The migration is fully reversible (`DROP COLUMN`) and idempotent in the standard TypeORM migration sense (the `up` only runs once via the migration registry).

**Alternatives considered**:

| Alternative | Why rejected |
| ----------- | ------------ |
| Two-step: `ADD COLUMN designVersion int NULL`, then `UPDATE ... SET ... WHERE designVersion IS NULL`, then `ALTER ... SET NOT NULL` | Standard pattern for very large tables to avoid long locks. `user_settings` is per-user and small; the single-statement form is fine here and simpler. |
| Lazy/read-time default via service-layer coalesce | Leaks "the column might be null" knowledge into the service. The column is `NOT NULL`, so this is unnecessary. |

---

## Decision 5 — Authorization and audit

**Decision**: No new privilege, no new audit category. The existing `AuthorizationPrivilege.UPDATE` grant on the user's `authorization` policy continues to gate the mutation, exactly as it does for `privacy`, `communication`, `notification`, and `homeSpace`.

**Rationale**:

- Matches the spec's FR-006 and FR-010 (which explicitly defer to "the same authorization rules" and "the same audit/logging behavior as other user-settings changes").
- Adding a new privilege would fragment user-settings authorization without a clear access-control distinction (the value is not security-sensitive — it is a UI preference).

**Alternatives considered**:

| Alternative | Why rejected |
| ----------- | ------------ |
| New `UPDATE_DESIGN_VERSION` privilege | No access-control reason to separate it from other user-settings updates. |
| Emit a `UserDesignVersionChangedEvent` for analytics | Constitution principle #5 forbids orphaned signals (metrics/dashboards without an active consumer). Product has not asked for adoption telemetry on this. If/when needed, add an event in a follow-up. |

---

## Decision 6 — Testing scope

**Decision**: Three focused unit tests in `user.settings.service.spec.ts`:

1. `createUserSettings` propagates `designVersion: 2` from the default input.
2. `updateSettings` writes the new value when `updateData.designVersion` is provided.
3. `updateSettings` leaves the existing value untouched when `updateData.designVersion` is omitted.

Plus the standard migration validation harness (`.scripts/migrations/run_validate_migration.sh`) snapshot run on the new migration.

**Rationale**: Constitution principle #6 (Pragmatic Testing) — the value flows through code paths already covered by existing tests for `privacy`/`communication`/`homeSpace`. Three small unit tests are enough to defend the new invariants. An e2e test would add cost without signal.

---

## Open items deferred to /speckit.tasks

None. All design decisions are made.

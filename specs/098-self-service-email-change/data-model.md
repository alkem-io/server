# Phase 1 — Data Model

**Feature**: 098-self-service-email-change
**Date**: 2026-05-18

This feature introduces **one** new PostgreSQL table (`email_change_pending`), **one** new enum type (`email_change_pending_state`), and ADDITIVELY EXTENDS the `email_change_audit_outcome` enum from 097 with 7 new values. No changes to existing tables — `user.email` is read/written through the existing column. The audit table (`email_change_audit_entry`) introduced by 097 is reused without schema changes.

---

## Length constants (existing, reused)

| Constant | Value | Usage in this feature |
| --- | --- | --- |
| `UUID_LENGTH` | 36 | `id`, `subject_user_id`, `initiator_user_id` |
| `MID_TEXT_LENGTH` | 512 | `old_email`, `new_email` (matches `user.email`) |
| `SMALL_TEXT_LENGTH` | 128 | `failure_reason` |

The token is a fixed 43–64 character base64url string (per FR-007c, R3) — declared as `varchar(64)` directly, not via a constant.

---

## New PostgreSQL enum

### `email_change_pending_state`

```sql
CREATE TYPE email_change_pending_state AS ENUM (
  'initiated',
  'confirmed',
  'committed',
  'rolled_back',
  'expired',
  'superseded',
  'drift_detected'
);
```

Seven values, per FR-021-EXT. `initiated` and `confirmed` are non-terminal; the rest are terminal.

---

## Additive extension to existing enum

The `email_change_audit_outcome` enum (created by 097 with 11 values: `committed`, `rolled_back`, `drift_detected`, `drift_resolved`, `drift_resolution_failed`, `security_signal_failed`, `new_address_notification_failed`, `global_admin_notification_failed`, `session_invalidation_failed`, `rejected_validation`, `rejected_conflict`) is extended by this spec with 7 additive values:

```sql
ALTER TYPE email_change_audit_outcome ADD VALUE IF NOT EXISTS 'initiated';
ALTER TYPE email_change_audit_outcome ADD VALUE IF NOT EXISTS 'initiation_failed';
ALTER TYPE email_change_audit_outcome ADD VALUE IF NOT EXISTS 'confirmed';
ALTER TYPE email_change_audit_outcome ADD VALUE IF NOT EXISTS 'expired';
ALTER TYPE email_change_audit_outcome ADD VALUE IF NOT EXISTS 'superseded';
ALTER TYPE email_change_audit_outcome ADD VALUE IF NOT EXISTS 'rejected_used_token';
ALTER TYPE email_change_audit_outcome ADD VALUE IF NOT EXISTS 'rejected_expired_token';
```

The `IF NOT EXISTS` clause and individual `ADD VALUE` statements are required by Postgres — enum modification cannot be batched in one statement. The additions are non-breaking; existing audit rows remain valid.

After this migration, the enum's full canonical set (18 values) is:
`committed`, `rolled_back`, `drift_detected`, `drift_resolved`, `drift_resolution_failed`, `security_signal_failed`, `new_address_notification_failed`, `global_admin_notification_failed`, `session_invalidation_failed`, `rejected_validation`, `rejected_conflict`, `initiated`, `initiation_failed`, `confirmed`, `expired`, `superseded`, `rejected_used_token`, `rejected_expired_token`.

The `email_change_initiator_role` Postgres enum already has both `self` and `platform_admin` values upfront (shipped by 097); no enum extension is needed for that one.

---

## Table 1 — `email_change_pending`

The in-flight pending-change record for self-initiated verification flows. **At most one row per user at a time with a non-terminal state**, enforced by a partial unique index. Terminal rows are retained 30 days (FR-020) and then deleted by a daily purge.

| Column | Type | Constraints | Source / Spec Reference |
| --- | --- | --- | --- |
| `id` | `uuid` | PK, default `uuid_generate_v4()` | Standard primary key |
| `created_date` | `timestamptz` | NOT NULL, default `now()` | Standard |
| `updated_date` | `timestamptz` | NOT NULL, default `now()` | Standard |
| `version` | `integer` | NOT NULL, default 1 | Standard (optimistic-locking compat) |
| `subject_user_id` | `uuid` | NOT NULL, FK → `user(id)` ON DELETE CASCADE | The user whose email is being changed |
| `initiator_user_id` | `uuid` | NOT NULL, FK → `user(id)` ON DELETE SET NULL | Always equals `subject_user_id` for rows persisted by this spec (the `initiator_role` for all rows is `self`) |
| `initiator_role` | `email_change_initiator_role` | NOT NULL | Inherited from 097; this spec only writes `self` |
| `old_email` | `varchar(512)` | NOT NULL | The email at the moment of initiation |
| `new_email` | `varchar(512)` | NOT NULL | The proposed new email, validated by 097's FR-004 / FR-005 / FR-006 |
| `token` | `varchar(64)` | NOT NULL | The confirmation token, plaintext per FR-007a |
| `issued_at` | `timestamptz` | NOT NULL | Token issue timestamp |
| `expiry_at` | `timestamptz` | NOT NULL | `issued_at + 1 hour` per FR-007b |
| `state` | `email_change_pending_state` | NOT NULL, default `'initiated'` | FR-021-EXT lifecycle state |
| `confirmed_at` | `timestamptz` | NULL | Set when state transitions to `confirmed` |
| `committed_at` | `timestamptz` | NULL | Set when state transitions to `committed` |
| `failure_reason` | `varchar(128)` | NULL | Set on terminal failure outcomes — short non-leaky code |

### Indices on `email_change_pending`

```sql
-- Primary key (implicit)
CREATE UNIQUE INDEX pk_email_change_pending ON email_change_pending (id);

-- At most one active pending change per user (enforces FR-019 / FR-007(d))
CREATE UNIQUE INDEX uq_email_change_pending_active_subject
  ON email_change_pending (subject_user_id)
  WHERE state IN ('initiated', 'confirmed');

-- Fast token lookup at confirm time
CREATE UNIQUE INDEX uq_email_change_pending_token
  ON email_change_pending (token);

-- Retention purge query
CREATE INDEX ix_email_change_pending_terminal_updated
  ON email_change_pending (state, updated_date)
  WHERE state IN ('rolled_back', 'expired', 'superseded', 'drift_detected', 'committed');
```

**Why the partial unique on `(subject_user_id) WHERE state IN ('initiated', 'confirmed')`**: This is the database-level mechanism enforcing FR-019 (idempotent re-initiation) and FR-007(d) (supersession). A second `initiated` row for the same user fails the unique constraint; the service-layer flow transitions the existing row to `superseded` and INSERTs the new one. Terminal-state rows do not occupy the slot, so a user with a `committed` pending change from yesterday can still start a fresh one today.

**Why the unique on `token`**: Defence in depth. Token entropy (FR-007c) makes a collision astronomically unlikely, but the unique index ensures we cannot accidentally issue duplicate tokens.

### State transitions (self-initiated flow)

```
          [start]
              │   meUserEmailChangeBegin
              ▼
        ┌──────────────┐  mail-send fails (FR-019a) → ROW DELETED, audit `initiation_failed`
        │  initiated   │──────────────────────────────────────────────────────────────┐
        └──────────────┘                                                              │
              │                                                                       │
              │  token expires (FR-007b) → lazy sweep on attempt OR daily purge       │
              │  state := expired                                                      │
              │  ──────────────────────────────────────────────────────► [expired]   │
              │                                                                       │
              │  new initiation for same user (FR-007d / FR-019)                      │
              │  state := superseded                                                   │
              │  ──────────────────────────────────────────────────────► [superseded]│
              │                                                                       │
              │  ADMIN invokes 097's adminUserEmailChange for same subject            │
              │  state := superseded                                                   │
              │  ──────────────────────────────────────────────────────► [superseded]│
              │                                                                       │
              │  userEmailChangeConfirm: FR-004a re-check FAILS                       │
              │  ─────────────────────────────────► audit `rejected_conflict`, no Δ  │
              │                                                                       │
              │  userEmailChangeConfirm: FR-004a re-check PASSES                      │
              ▼                                                                       │
        ┌──────────────┐                                                               │
        │  confirmed   │ (transient — held during 097's two-side commit transaction) │
        └──────────────┘                                                               │
              │                                                                       │
              │  forward commit succeeds within retry budget (097's FR-009)           │
              │  state := committed                                                    │
              │  ────────────────────────────────────────────────────► [committed]   │
              │                                                                       │
              │  forward commit fails AND rollback succeeds                          │
              │  state := rolled_back                                                  │
              │  ────────────────────────────────────────────────────► [rolled_back] │
              │                                                                       │
              │  forward commit fails AND rollback ALSO fails (both budgets out)      │
              │  state := drift_detected                                               │
              │  ──────────────────────────────────────────────────► [drift_detected] │
              │                                                                       │
              │  admin's adminUserEmailChangeDriftResolve (097, extended by 098)     │
              │  → if canonical = new_email: pending state := committed              │
              │  → if canonical = old_email: pending state := rolled_back            │
              │  (audit `drift_resolved` written; the original `drift_detected` audit │
              │   entry is unmodified)                                                │
              └───────────────────────────────────────────────────────────────────────┘
```

Terminal states: `committed`, `rolled_back`, `expired`, `superseded`, `drift_detected`. All five are subject to the 30-day retention window (FR-020). The `drift_detected` row is transitioned to `committed` or `rolled_back` by the extended drift-resolve mutation (FR-009b-EXT), so it spends only the time between drift detection and admin reconciliation in the `drift_detected` state — but if reconciliation never happens, the retention purge will eventually remove it after 30 days.

### Token leakage guard

The `token` column is NOT mirrored into `email_change_audit_entry`. This is enforced by the entity / service layer — there is simply no column to write it to. (FR-007a).

---

## TypeORM entity sketch

```typescript
@Entity({ name: 'email_change_pending' })
export class PendingUserEmailChange extends BaseAlkemioEntity implements IPendingUserEmailChange {
  @Column('uuid', { nullable: false })
  subjectUserId!: string;

  @Column('uuid', { nullable: false })
  initiatorUserId!: string;

  @Column({
    type: 'enum',
    enum: UserEmailChangeInitiatorRole,
    enumName: 'email_change_initiator_role',
    nullable: false,
  })
  initiatorRole!: UserEmailChangeInitiatorRole;

  @Column('varchar', { length: MID_TEXT_LENGTH, nullable: false })
  oldEmail!: string;

  @Column('varchar', { length: MID_TEXT_LENGTH, nullable: false })
  newEmail!: string;

  @Column('varchar', { length: 64, nullable: false })
  token!: string;

  @Column('timestamptz', { nullable: false })
  issuedAt!: Date;

  @Column('timestamptz', { nullable: false })
  expiryAt!: Date;

  @Column({
    type: 'enum',
    enum: UserEmailChangeState,
    enumName: 'email_change_pending_state',
    nullable: false,
    default: UserEmailChangeState.INITIATED,
  })
  state!: UserEmailChangeState;

  @Column('timestamptz', { nullable: true })
  confirmedAt?: Date;

  @Column('timestamptz', { nullable: true })
  committedAt?: Date;

  @Column('varchar', { length: SMALL_TEXT_LENGTH, nullable: true })
  failureReason?: string;
}
```

(Reuses `UserEmailChangeInitiatorRole` enum class introduced by 097.)

---

## Validation rules (entity-level + service-level)

| Rule | Enforced at | Spec reference |
| --- | --- | --- |
| `new_email` ≠ `old_email` (case-insensitive) | Service before insert | Inherited from 097's FR-005 |
| `new_email` matches RFC 5322 basic format | DTO via `@IsEmail()` | Inherited from 097's FR-004 |
| `new_email` is unique across `user` (case-insensitive) AND not registered as a Kratos identity | Service before mail-send (initiate) AND before commit (FR-004a) | 097's FR-004, this spec's FR-004a |
| `expiry_at` = `issued_at + 1 hour` | Service at insert | FR-007b |
| At most one non-terminal row per `subject_user_id` | Partial unique index | FR-019, FR-007(d) |
| Confirm: presented token must equal stored token AND `state = 'initiated'` AND `now() < expiry_at` | Service in confirm txn | FR-007(a)(b)(d), FR-008 |
| Audit entry MUST NOT contain the token | Entity has no `token` column | FR-007a |
| Failure-reason MUST NOT leak account-existence info | Service layer when constructing the value | Inherited from 097's FR-014 |

---

## Migration plan (single migration file)

File: `<timestamp>-CreateEmailChangePendingAndExtendAuditOutcomeEnum.ts`

Up:
1. `CREATE TYPE email_change_pending_state AS ENUM (...)` (7 values)
2. 7 × `ALTER TYPE email_change_audit_outcome ADD VALUE IF NOT EXISTS '...'` (additive extension)
3. `CREATE TABLE email_change_pending (...)` with all columns and constraints
4. Create the 4 indices listed above
5. Add FK constraints (`subject_user_id` → `user(id)` ON DELETE CASCADE, `initiator_user_id` → `user(id)` ON DELETE SET NULL)

Down (rollback):
1. Drop FK constraints
2. Drop the table
3. Drop the new pending-state enum
4. **NOTE**: Removing enum values from `email_change_audit_outcome` is NOT supported by Postgres in a generic backwards-compatible way. The down-migration leaves the additive values in place. This is acceptable because (a) the audit table will likely contain rows using the new values, and dropping them would corrupt data, and (b) reverting only the table drop is sufficient to roll back the feature.

The migration is **idempotent under the project's validation harness** (`.scripts/migrations/run_validate_migration.sh`) — the new table is empty, the enum extensions use `IF NOT EXISTS`, and the down-migration leaves no orphan data.

---

## Open questions

None. The data model is fully specified by spec.md + research.md.

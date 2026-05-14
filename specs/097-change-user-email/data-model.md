# Phase 1 — Data Model

**Feature**: 097-change-user-email
**Date**: 2026-05-13

This feature introduces two new PostgreSQL tables and three new enum types. No changes to existing tables — `user.email` and `user.authenticationID` are read and written through the existing columns. The Kratos identity is updated externally via the admin API (R1).

---

## Length constants (existing, reused)

| Constant | Value | Usage in this feature |
| --- | --- | --- |
| `UUID_LENGTH` | 36 | `id`, `subject_user_id`, `initiator_user_id`, `pending_change_id` |
| `MID_TEXT_LENGTH` | 512 | `old_email`, `new_email` (matches `user.email`) |
| `SMALL_TEXT_LENGTH` | 128 | `failure_reason` |

The token is a fixed 43–64 character base64url string (R3) — declared as `varchar(64)` directly, not via a constant.

---

## New PostgreSQL enums

### 1. `email_change_pending_state`

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

Seven values, per FR-021 + FR-009a. `initiated` and `confirmed` are non-terminal; the rest are terminal.

### 2. `email_change_audit_outcome`

```sql
CREATE TYPE email_change_audit_outcome AS ENUM (
  'initiated',
  'initiation_failed',
  'confirmed',
  'committed',
  'rolled_back',
  'expired',
  'superseded',
  'drift_detected',
  'drift_resolved',
  'drift_resolution_failed',
  'security_signal_failed',
  'session_invalidation_failed',
  'rejected_validation',
  'rejected_conflict',
  'rejected_used_token',
  'rejected_expired_token'
);
```

Sixteen values, per R10. Mirrors the seven pending-states (without the "drift_resolved" cousin which is audit-only) plus the operational failure outcomes (`*_failed`) and the confirm-time rejection outcomes (`rejected_*`).

### 3. `email_change_initiator_role`

```sql
CREATE TYPE email_change_initiator_role AS ENUM (
  'self',
  'platform_admin'
);
```

Two values, per FR-022 / FR-014b.

---

## Table 1 — `email_change_pending`

The in-flight pending-change record. **At most one row per user at a time with a non-terminal state**, enforced by a partial unique index. Terminal rows are retained 30 days (FR-020) and then deleted by the daily purge (R12).

| Column | Type | Constraints | Source / Spec Reference |
| --- | --- | --- | --- |
| `id` | `uuid` | PK, default `uuid_generate_v4()` | Standard primary key |
| `created_date` | `timestamptz` | NOT NULL, default `now()` | Standard |
| `updated_date` | `timestamptz` | NOT NULL, default `now()` | Standard |
| `version` | `integer` | NOT NULL, default 1 | Standard (optimistic-locking compat) |
| `subject_user_id` | `uuid` | NOT NULL, FK → `user(id)` ON DELETE CASCADE | The user whose email is being changed |
| `initiator_user_id` | `uuid` | NOT NULL, FK → `user(id)` ON DELETE SET NULL | The actor who initiated (self or admin); `SET NULL` preserves the record if the initiator is deleted |
| `initiator_role` | `email_change_initiator_role` | NOT NULL | FR-022 / FR-014b — `self` vs `platform_admin` |
| `old_email` | `varchar(512)` | NOT NULL | The email at the moment of initiation |
| `new_email` | `varchar(512)` | NOT NULL | The proposed new email, validated by FR-004 / FR-005 / FR-006 |
| `token` | `varchar(64)` | NOT NULL | The confirmation token, plaintext per FR-007a |
| `issued_at` | `timestamptz` | NOT NULL | Token issue timestamp |
| `expiry_at` | `timestamptz` | NOT NULL | `issued_at + 1 hour` per FR-007b |
| `state` | `email_change_pending_state` | NOT NULL, default `'initiated'` | FR-021 lifecycle state |
| `confirmed_at` | `timestamptz` | NULL | Set when state transitions to `confirmed` |
| `committed_at` | `timestamptz` | NULL | Set when state transitions to `committed` |
| `failure_reason` | `varchar(128)` | NULL | Set on `rolled_back` / `drift_detected` — short non-leaky reason code |

### Indices on `email_change_pending`

```sql
-- Primary key (implicit)
CREATE UNIQUE INDEX pk_email_change_pending ON email_change_pending (id);

-- At most one active pending change per user
CREATE UNIQUE INDEX uq_email_change_pending_active_subject
  ON email_change_pending (subject_user_id)
  WHERE state IN ('initiated', 'confirmed');

-- Fast token lookup at confirm time
CREATE UNIQUE INDEX uq_email_change_pending_token
  ON email_change_pending (token);

-- Retention sweep query
CREATE INDEX ix_email_change_pending_terminal_updated
  ON email_change_pending (state, updated_date)
  WHERE state IN ('rolled_back', 'expired', 'superseded', 'drift_detected', 'committed');
```

**Why the partial unique on `(subject_user_id) WHERE state IN ('initiated', 'confirmed')`**: This is the database-level mechanism enforcing FR-019 (idempotent re-initiation) and FR-007(d) (supersession). A second `initiated` row for the same user fails the unique constraint; the service-layer flow then transitions the existing row to `superseded` and INSERTs the new one (or simply UPDATEs in place — implementation choice). Terminal-state rows do not occupy the slot, so a user with a `committed` pending change from yesterday can still start a fresh one today.

**Why the unique on `token`**: Defence in depth. Token entropy (R3) makes a collision astronomically unlikely, but the unique index ensures we cannot accidentally issue duplicate tokens (e.g., a buggy regeneration path).

### State transitions

```
            FR-019(a)
              ↓
          [start]
              │   meUserEmailChangeBegin / adminUserEmailChangeBegin
              ▼
        ┌──────────────┐  mail-send fails (FR-019a) → ROW DELETED, audit `initiation_failed`
        │  initiated   │──────────────────────────────────────────────────────────────┐
        └──────────────┘                                                              │
              │                                                                        │
              │  token expires (FR-007b) → background sweep or lazy on attempt          │
              │  state := expired                                                       │
              │  ──────────────────────────────────────────────────────────► [expired] │
              │                                                                        │
              │  new initiation for same user (FR-007d)                                 │
              │  state := superseded                                                    │
              │  ───────────────────────────────────────────────────────► [superseded] │
              │                                                                        │
              │  userEmailChangeConfirm:                                                │
              │  uniqueness re-check (FR-004a) FAILS                                    │
              │  ─────────────────────────────────► audit `rejected_conflict`, no row Δ│
              │                                                                        │
              │  userEmailChangeConfirm: uniqueness re-check PASSES                     │
              ▼                                                                        │
        ┌──────────────┐                                                                │
        │  confirmed   │ (transient — held only during the commit transaction)         │
        └──────────────┘                                                                │
              │                                                                        │
              │  forward commit (Kratos→Alkemio) succeeds within retry budget          │
              │  state := committed                                                     │
              │  ────────────────────────────────────────────────────────► [committed] │
              │                                                                        │
              │  forward commit fails AND rollback succeeds                            │
              │  state := rolled_back                                                   │
              │  ───────────────────────────────────────────────────────► [rolled_back]│
              │                                                                        │
              │  forward commit fails AND rollback ALSO fails (both retry budgets out) │
              │  state := drift_detected                                                │
              │  ─────────────────────────────────────────────────────► [drift_detected]
              │                                                                        │
              │  adminUserEmailChangeDriftResolve aligns sides → audit `drift_resolved`│
              │  (row state STAYS drift_detected — forensic evidence per FR-009b)      │
              └────────────────────────────────────────────────────────────────────────┘
```

Terminal states are: `committed`, `rolled_back`, `expired`, `superseded`, `drift_detected`. All five are subject to the 30-day retention window (FR-020 + R12).

---

## Table 2 — `email_change_audit_entry`

Append-only audit log. **Never updated, never deleted by this feature** (FR-014a — indefinite retention; per-subject removal delegated to user-deletion workflow).

| Column | Type | Constraints | Source / Spec Reference |
| --- | --- | --- | --- |
| `id` | `uuid` | PK, default `uuid_generate_v4()` | Standard primary key |
| `row_id` | `int` | NOT NULL, GENERATED ALWAYS AS IDENTITY, unique | Pagination cursor key (per `docs/Pagination.md`) |
| `created_date` | `timestamptz` | NOT NULL, default `now()` | Standard; doubles as the audit "timestamp" exposed in FR-014b |
| `pending_change_id` | `uuid` | NULL, FK → `email_change_pending(id)` ON DELETE SET NULL | Joins the audit entry to its pending row when one exists; NULL for entries written before a pending row exists (validation rejects, FR-019a rollback) |
| `subject_user_id` | `uuid` | NOT NULL, FK → `user(id)` ON DELETE CASCADE | Required — every audit entry pertains to a subject user |
| `initiator_user_id` | `uuid` | NULL, FK → `user(id)` ON DELETE SET NULL | NULL allowed for early-rejection entries before the initiator identity is fully resolved (FR-014b sentinel case) |
| `initiator_role` | `email_change_initiator_role` | NOT NULL | Always present per FR-014b |
| `old_email` | `varchar(512)` | NULL | NULL only for entries that never had an old-email context (e.g., a validation reject with no prior pending row) |
| `new_email` | `varchar(512)` | NULL | NULL only when the proposed new email never made it past initial validation |
| `outcome` | `email_change_audit_outcome` | NOT NULL | The 16-value enum from R10 |
| `failure_reason` | `varchar(128)` | NULL | Non-leaky failure reason for the failure outcomes; FR-014 forbids account-enumeration content |

### Indices on `email_change_audit_entry`

```sql
CREATE UNIQUE INDEX pk_email_change_audit_entry ON email_change_audit_entry (id);
CREATE UNIQUE INDEX uq_email_change_audit_entry_rowid ON email_change_audit_entry (row_id);

-- The primary read pattern: "all audit entries for subject X, newest first" (FR-014b)
CREATE INDEX ix_email_change_audit_entry_subject_created
  ON email_change_audit_entry (subject_user_id, created_date DESC);

-- Cursor-based pagination per docs/Pagination.md
CREATE INDEX ix_email_change_audit_entry_subject_rowid
  ON email_change_audit_entry (subject_user_id, row_id);
```

### Token leakage guard

The `token` column from `email_change_pending` is **NOT** mirrored into `email_change_audit_entry`. This is enforced at the entity / service layer — there is simply no column to write it to. (FR-007a).

---

## TypeORM entity sketch

The TypeORM entities follow the project's existing patterns (see `callout.contribution.entity.ts` for the canonical style).

### `PendingUserEmailChange` (file: `pending.user.email.change.entity.ts`)

```typescript
@Entity({ name: 'email_change_pending' })
export class PendingUserEmailChange extends BaseAlkemioEntity implements IPendingUserEmailChange {
  @Column('uuid', { nullable: false })
  subjectUserId!: string;

  @Column('uuid', { nullable: true })
  initiatorUserId?: string;

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

### `UserEmailChangeAuditEntry` (file: `user.email.change.audit.entry.entity.ts`)

```typescript
@Entity({ name: 'email_change_audit_entry' })
export class UserEmailChangeAuditEntry extends BaseAlkemioEntity implements IUserEmailChangeAuditEntry {
  @Column({ unique: true, nullable: false })
  @Generated('increment')
  rowId!: number;

  @Column('uuid', { nullable: true })
  pendingChangeId?: string;

  @Column('uuid', { nullable: false })
  subjectUserId!: string;

  @Column('uuid', { nullable: true })
  initiatorUserId?: string;

  @Column({
    type: 'enum',
    enum: UserEmailChangeInitiatorRole,
    enumName: 'email_change_initiator_role',
    nullable: false,
  })
  initiatorRole!: UserEmailChangeInitiatorRole;

  @Column('varchar', { length: MID_TEXT_LENGTH, nullable: true })
  oldEmail?: string;

  @Column('varchar', { length: MID_TEXT_LENGTH, nullable: true })
  newEmail?: string;

  @Column({
    type: 'enum',
    enum: UserEmailChangeAuditOutcome,
    enumName: 'email_change_audit_outcome',
    nullable: false,
  })
  outcome!: UserEmailChangeAuditOutcome;

  @Column('varchar', { length: SMALL_TEXT_LENGTH, nullable: true })
  failureReason?: string;
}
```

(The exact base class — `BaseAlkemioEntity` vs `AuthorizableEntity` — is picked at implementation time based on what's idiomatic in this part of the tree. Neither table needs an authorization sub-tree, so `BaseAlkemioEntity` (id + createdDate + updatedDate + version) is the lighter choice.)

---

## Validation rules (entity-level + service-level)

| Rule | Enforced at | Spec reference |
| --- | --- | --- |
| `new_email` ≠ `old_email` (case-insensitive) | Service before insert | FR-005 |
| `new_email` matches RFC 5322 basic format | DTO via `@IsEmail()` | FR-004 |
| `new_email` is unique across `user` (case-insensitive) AND not registered as a Kratos identity | Service before mail-send (initiate) AND before commit (FR-004a) | FR-004, FR-004a |
| `expiry_at` = `issued_at + 1 hour` | Service at insert | FR-007b |
| At most one non-terminal row per `subject_user_id` | Partial unique index | FR-019, FR-007(d) |
| Confirm: presented token must equal stored token AND `state = 'initiated'` AND `now() < expiry_at` | Service in confirm txn | FR-007(a)(b)(d), FR-008 |
| Audit entry MUST NOT contain the token | Entity has no `token` column | FR-007a, FR-014b |
| Failure-reason MUST NOT leak account-existence info | Service layer when constructing the value | FR-014, FR-014a |

---

## Migration plan (single migration file)

File: `<timestamp>-CreateEmailChangePendingAndAuditEntry.ts`

Up:
1. `CREATE TYPE email_change_pending_state AS ENUM (...)`
2. `CREATE TYPE email_change_audit_outcome AS ENUM (...)`
3. `CREATE TYPE email_change_initiator_role AS ENUM (...)`
4. `CREATE TABLE email_change_pending (...)` with all columns and constraints
5. `CREATE TABLE email_change_audit_entry (...)` with all columns and constraints
6. Create the four indices listed above on `email_change_pending`
7. Create the three indices listed above on `email_change_audit_entry`
8. Add FK constraints (`subject_user_id` → `user(id)`, `initiator_user_id` → `user(id)`, `pending_change_id` → `email_change_pending(id)`)

Down (rollback):
1. Drop FK constraints
2. Drop both tables
3. Drop the three enum types

The migration is **idempotent under the project's validation harness** (`.scripts/migrations/run_validate_migration.sh`) — both tables are new, neither references existing data, no backfill is required, and the down-migration is a clean reverse.

---

## Open questions

None. The data model is fully specified by spec.md + research.md.

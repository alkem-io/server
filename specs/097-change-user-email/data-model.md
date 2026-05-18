# Phase 1 — Data Model

**Feature**: 097-change-user-email (Platform Admin, No Verification)
**Date**: 2026-05-13
**Last Updated**: 2026-05-18 (smaller MVP — `email_change_pending` entity moved to 098)

This feature introduces **one** new PostgreSQL table and **two** new enum types. No changes to existing tables — `user.email` and `user.authenticationID` are read and written through the existing columns. The Kratos identity is updated externally via the admin API (see research.md §R1).

The pending-change entity, the token machinery, the multi-step state lifecycle, and the related Postgres enums (`email_change_pending_state`) are deferred to companion spec 098, which introduces them natively as part of its verification flow.

---

## Length constants (existing, reused)

| Constant | Value | Usage in this feature |
| --- | --- | --- |
| `UUID_LENGTH` | 36 | `id`, `subject_user_id`, `initiator_user_id` |
| `MID_TEXT_LENGTH` | 512 | `old_email`, `new_email` (matches `user.email`) |
| `SMALL_TEXT_LENGTH` | 128 | `failure_reason` |

---

## New PostgreSQL enums

### 1. `email_change_audit_outcome`

```sql
CREATE TYPE email_change_audit_outcome AS ENUM (
  'committed',
  'rolled_back',
  'drift_detected',
  'drift_resolved',
  'drift_resolution_failed',
  'security_signal_failed',
  'new_address_notification_failed',
  'global_admin_notification_failed',
  'session_invalidation_failed',
  'rejected_validation',
  'rejected_conflict'
);
```

Eleven values, per FR-014. Companion spec 098 will EXTEND this enum (additively) with the verification-flow outcomes (`initiated`, `initiation_failed`, `confirmed`, `expired`, `superseded`, `rejected_used_token`, `rejected_expired_token`).

### 2. `email_change_initiator_role`

```sql
CREATE TYPE email_change_initiator_role AS ENUM (
  'self',
  'platform_admin'
);
```

Two values shipped upfront so that spec 098 requires no enum migration when it lands. This spec only writes `platform_admin`.

---

## Table 1 — `email_change_audit_entry`

Append-only audit log. **Never updated, never deleted by this feature** (FR-014a — indefinite retention; per-subject removal delegated to user-deletion workflow).

| Column | Type | Constraints | Source / Spec Reference |
| --- | --- | --- | --- |
| `id` | `uuid` | PK, default `uuid_generate_v4()` | Standard primary key |
| `row_id` | `int` | NOT NULL, GENERATED ALWAYS AS IDENTITY, unique | Pagination cursor key (per `docs/Pagination.md`) |
| `created_date` | `timestamptz` | NOT NULL, default `now()` | Standard; doubles as the audit "timestamp" exposed in FR-014b |
| `subject_user_id` | `uuid` | NOT NULL, FK → `user(id)` ON DELETE CASCADE | Required — every audit entry pertains to a subject user |
| `initiator_user_id` | `uuid` | NULL, FK → `user(id)` ON DELETE SET NULL | NULL allowed for early-rejection entries before the initiator's identity is fully resolved (FR-014b sentinel case) |
| `initiator_role` | `email_change_initiator_role` | NOT NULL | Always present per FR-014b. This spec writes `platform_admin` exclusively. |
| `old_email` | `varchar(512)` | NULL | The address on the Alkemio side at the moment of the audit-event. NULL only for entries that never had an old-email context (e.g., a validation reject with no read of the subject). |
| `new_email` | `varchar(512)` | NULL | The proposed new address. For `drift_detected` entries, this is also the address observed on the Kratos side (Kratos write succeeded, revert failed — see spec.md §Key Entities). NULL only when the proposed new email never made it past initial validation. |
| `outcome` | `email_change_audit_outcome` | NOT NULL | The 9-value enum above |
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

### Outcome semantics

| Outcome | Written when | `old_email` / `new_email` semantics |
| --- | --- | --- |
| `committed` | Two-side commit succeeded | `old_email` = pre-change Alkemio email; `new_email` = post-change Alkemio email (same on both sides) |
| `rolled_back` | Forward Kratos failed OR Alkemio failed and Kratos revert succeeded | Same as above; both sides reflect `old_email` at the end |
| `drift_detected` | Forward Kratos succeeded, Alkemio failed, Kratos revert exhausted | `old_email` = observed on Alkemio side (= original value); `new_email` = observed on Kratos side (= attempted new value) |
| `drift_resolved` | Admin drift-resolve succeeded | `old_email` = the old-side value mirrored from the originating `drift_detected` entry (preserves the pre-drift Alkemio observation as forensic context); `new_email` = the canonical email the admin selected. Reading the row alone tells you the direction the admin took: `new_email == originating drift.new_email` ⇒ "keep the change"; `new_email == originating drift.old_email` ⇒ "revert the change". No cross-reference to the drift_detected entry is needed to interpret the resolution. |
| `drift_resolution_failed` | Admin drift-resolve mutation exhausted its retry budget | Same as drift_detected — observed values |
| `security_signal_failed` | Post-commit mail to OLD address (FR-016) exhausted retry budget | Same as committed — old_email is the now-old (pre-change) address; new_email is the now-current address |
| `new_address_notification_failed` | Post-commit mail to NEW address (FR-016c) exhausted retry budget | Same as committed |
| `global_admin_notification_failed` | Post-commit global-admin fan-out publish (FR-016d) exhausted retry budget. Captures failure to PUBLISH to the notifications service; per-recipient downstream delivery is out of scope. | Same as committed |
| `session_invalidation_failed` | Post-commit `disableIdentitySessions` exhausted retry budget | Same as committed |
| `rejected_validation` | New email malformed (format / RFC) | `new_email` = the malformed attempted value if it's safe to store; otherwise NULL |
| `rejected_conflict` | New email already taken on Alkemio or Kratos side | `new_email` = the attempted value (which is also the conflict-holder's address — see anti-enumeration note below) |

### Anti-enumeration rule on `rejected_conflict`

For `rejected_conflict` entries, the `new_email` column DOES contain the conflicting address (since that's what the admin attempted), but the **GraphQL audit query (FR-014b) does NOT cross-reference it against the user/identity table**, and the `failure_reason` field MUST contain only a generic short code (e.g., `conflict`) — never anything like "address belongs to user X". The conflicting address being readable from the audit row is acceptable because the admin who triggered the rejection already typed that address.

### Token leakage guard

This feature does NOT issue a confirmation token (no platform-mediated verification). The `email_change_audit_entry` table has no `token` column. When companion spec 098 lands and adds the `email_change_pending` table with a `token` column, that token MUST NOT be mirrored into audit entries — this is enforced by 098's entity shape, not by service-layer discipline.

---

## TypeORM entity sketch

The TypeORM entity follows the project's existing patterns (see `callout.contribution.entity.ts` for the canonical style).

### `UserEmailChangeAuditEntry` (file: `user.email.change.audit.entry.entity.ts`)

```typescript
@Entity({ name: 'email_change_audit_entry' })
export class UserEmailChangeAuditEntry extends BaseAlkemioEntity implements IUserEmailChangeAuditEntry {
  @Column({ unique: true, nullable: false })
  @Generated('increment')
  rowId!: number;

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

The base class — `BaseAlkemioEntity` (id + createdDate + updatedDate + version) — is the lighter choice since this table needs no authorization sub-tree.

---

## Validation rules (entity-level + service-level)

| Rule | Enforced at | Spec reference |
| --- | --- | --- |
| `new_email` ≠ subject's current email (case-insensitive) | Service before commit | FR-005 |
| `new_email` matches RFC 5322 basic format | DTO via `@IsEmail()` | FR-004 |
| `new_email` is unique across `user` (case-insensitive) AND not registered as a Kratos identity | Service before commit | FR-004 |
| Subject user exists and is active | Service before commit | Edge case (subject deactivated/deleted) |
| Failure-reason MUST NOT leak account-existence info | Service layer when constructing the value | FR-014, FR-014a |

---

## Migration plan (single migration file)

File: `<timestamp>-CreateEmailChangeAuditEntry.ts`

Up:
1. `CREATE TYPE email_change_audit_outcome AS ENUM (...)` (9 values)
2. `CREATE TYPE email_change_initiator_role AS ENUM ('self', 'platform_admin')` (both values upfront — see assumptions)
3. `CREATE TABLE email_change_audit_entry (...)` with all columns and constraints
4. Create the three indices listed above
5. Add FK constraints (`subject_user_id` → `user(id)` ON DELETE CASCADE, `initiator_user_id` → `user(id)` ON DELETE SET NULL)

Down (rollback):
1. Drop FK constraints
2. Drop the table
3. Drop the two enum types

The migration is **idempotent under the project's validation harness** (`.scripts/migrations/run_validate_migration.sh`) — the table is new, references no existing data, no backfill is required, and the down-migration is a clean reverse.

When companion spec 098 lands, it will introduce a SECOND migration that adds the `email_change_pending` table, the `email_change_pending_state` enum, and ADDs (additively) new values to the `email_change_audit_outcome` enum (`initiated`, `initiation_failed`, `confirmed`, `expired`, `superseded`, `rejected_used_token`, `rejected_expired_token`). The enum extension is non-breaking; existing audit rows are unaffected.

---

## Open questions

None. The data model is fully specified by spec.md + research.md.

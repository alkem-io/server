# Phase 1 — Data Model

**Feature**: 097-change-user-email (Platform Admin, No Verification)
**Date**: 2026-05-13
**Last Updated**: 2026-05-18 (smaller MVP — `email_change_pending` entity moved to 098)

This feature introduces **one** new PostgreSQL table (`platform_audit_entry` — designed as a platform-wide audit-log foundation per spec.md §FR-014a / §Clarifications Session 2026-05-19) and **three** new enum types. No changes to existing tables — `user.email` and `user.authenticationID` are read and written through the existing columns. The Kratos identity is updated externally via the admin API (see research.md §R1).

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

### 1. `platform_audit_category`

```sql
CREATE TYPE platform_audit_category AS ENUM (
  'email_change'
);
```

Single value initially. Future ISO 27001 work extends this enum additively with categories like `authentication`, `access_control`, `data_privacy`, `configuration_change`. The category column on every audit row is what discriminates between feature audit-event vocabularies — the per-category outcome enums (like `email_change_audit_outcome` below) and the JSONB `details` column carry the category-specific data.

### 2. `email_change_audit_outcome`

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

Eleven values, per FR-014. This enum stays scoped to the `email_change` category. Companion spec 098 will EXTEND this enum (additively) with the verification-flow outcomes (`initiated`, `initiation_failed`, `confirmed`, `expired`, `superseded`, `rejected_used_token`, `rejected_expired_token`). Future audit categories (ISO 27001) introduce their own outcome enums (e.g., `authentication_audit_outcome`) or use string + `details` JSONB for unstructured outcomes.

### 3. `email_change_initiator_role`

```sql
CREATE TYPE email_change_initiator_role AS ENUM (
  'self',
  'platform_admin'
);
```

Two values shipped upfront so that spec 098 requires no enum migration when it lands. This spec only writes `platform_admin`.

---

## Table 1 — `platform_audit_entry`

Append-only platform-wide audit log. **Never updated, never deleted by this feature** (FR-014a — indefinite retention; per-subject removal delegated to user-deletion workflow). This spec's email-change events are the FIRST consumer; future ISO 27001 work adds further categories via additive `platform_audit_category` enum extensions plus the `details: jsonb` column for category-specific structured payload.

| Column | Type | Constraints | Source / Spec Reference |
| --- | --- | --- | --- |
| `id` | `uuid` | PK, default `uuid_generate_v4()` | Standard primary key |
| `row_id` | `int` | NOT NULL, GENERATED ALWAYS AS IDENTITY, unique | Pagination cursor key (per `docs/Pagination.md`) |
| `created_date` | `timestamptz` | NOT NULL, default `now()` | Standard; doubles as the audit "timestamp" exposed in FR-014b |
| `category` | `platform_audit_category` | NOT NULL | Discriminator for which audit-event vocabulary this row uses. This spec writes `email_change` exclusively. Future categories extend the enum. |
| `subject_user_id` | `uuid` | NOT NULL, FK → `user(id)` ON DELETE CASCADE | Required — every audit entry pertains to a subject user. For non-user-centric future categories (e.g., system-level configuration change), the convention will be to use a sentinel user representing the platform; this is a future-spec concern. |
| `initiator_user_id` | `uuid` | NULL, FK → `user(id)` ON DELETE SET NULL | NULL allowed for early-rejection entries before the initiator's identity is fully resolved (FR-014b sentinel case) |
| `initiator_role` | `email_change_initiator_role` | NOT NULL | Always present per FR-014b. This spec writes `platform_admin` exclusively. The column name keeps its `email_change_` prefix because the enum is scoped to email-change semantics; future categories may either reuse this enum (if applicable) or introduce their own role enum + column. |
| `old_email` | `varchar(512)` | NULL | The address on the Alkemio side at the moment of the audit-event (category `email_change`). NULL for other categories or for entries that never had an old-email context (e.g., a validation reject with no read of the subject). |
| `new_email` | `varchar(512)` | NULL | The proposed new address (category `email_change`). For `drift_detected` entries, this is also the address observed on the Kratos side (Kratos write succeeded, revert failed — see spec.md §Key Entities). NULL for other categories or when the proposed new email never made it past initial validation. |
| `outcome` | `email_change_audit_outcome` | NOT NULL | The 11-value enum above. The column uses the email-change outcome enum because that is the only category at the moment. When ISO 27001 categories land, this column either (a) migrates to `text` with per-category enums enforced in service code, or (b) splits into per-category outcome columns. Either migration is non-breaking for stored rows because category discriminates the interpretation. |
| `failure_reason` | `varchar(128)` | NULL | Non-leaky failure reason for the failure outcomes; FR-014 forbids account-enumeration content |
| `details` | `jsonb` | NULL | Category-specific structured payload that doesn't fit the typed columns. NULL for `email_change` rows in this spec (the typed columns are sufficient). Future categories (ISO 27001) use this for their unstructured payload (e.g., request IP, user-agent, before/after diffs for configuration changes). |

### Indices on `platform_audit_entry`

```sql
CREATE UNIQUE INDEX pk_platform_audit_entry ON platform_audit_entry (id);
CREATE UNIQUE INDEX uq_platform_audit_entry_rowid ON platform_audit_entry (row_id);

-- The primary read pattern: "all entries for subject X in category C, newest first" (FR-014b for email_change)
CREATE INDEX ix_platform_audit_entry_subject_category_created
  ON platform_audit_entry (subject_user_id, category, created_date DESC);

-- Cursor-based pagination per docs/Pagination.md, scoped by category for forward-compat
CREATE INDEX ix_platform_audit_entry_subject_category_rowid
  ON platform_audit_entry (subject_user_id, category, row_id);
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

This feature does NOT issue a confirmation token (no platform-mediated verification). The `platform_audit_entry` table has no `token` column. When companion spec 098 lands and adds the `email_change_pending` table with a `token` column, that token MUST NOT be mirrored into audit entries — this is enforced by 098's entity shape, not by service-layer discipline.

---

## TypeORM entity sketch

The TypeORM entity follows the project's existing patterns (see `callout.contribution.entity.ts` for the canonical style).

### `PlatformAuditEntry` (file: `platform.audit.entry.entity.ts`)

```typescript
@Entity({ name: 'platform_audit_entry' })
export class PlatformAuditEntry extends BaseAlkemioEntity implements IPlatformAuditEntry {
  @Column({ unique: true, nullable: false })
  @Generated('increment')
  rowId!: number;

  @Column({
    type: 'enum',
    enum: PlatformAuditCategory,
    enumName: 'platform_audit_category',
    nullable: false,
  })
  category!: PlatformAuditCategory;

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

  @Column('jsonb', { nullable: true })
  details?: Record<string, unknown>;
}
```

The base class — `BaseAlkemioEntity` (id + createdDate + updatedDate + version) — is the lighter choice since this table needs no authorization sub-tree. The entity name is generic (`PlatformAuditEntry`) but the typed columns still describe the email-change shape — future ISO 27001 categories either extend the typed columns additively or use the `details` JSONB column. The email-change feature's repository and service exposing this entity use email-change-specific method names (e.g., `findEmailChangeBySubjectPaged`) that implicitly filter `category = 'email_change'`.

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

File: `<timestamp>-CreatePlatformAuditEntry.ts`

Up:
1. `CREATE TYPE platform_audit_category AS ENUM ('email_change')` (single initial value; future ISO 27001 categories extend additively)
2. `CREATE TYPE email_change_audit_outcome AS ENUM (...)` (11 values — see §1 above)
3. `CREATE TYPE email_change_initiator_role AS ENUM ('self', 'platform_admin')` (both values upfront — see assumptions)
4. `CREATE TABLE platform_audit_entry (...)` with all columns (including `category`, `details: jsonb`) and constraints
5. Create the four indices listed above (PK, row_id, subject+category+created_date, subject+category+row_id)
6. Add FK constraints (`subject_user_id` → `user(id)` ON DELETE CASCADE, `initiator_user_id` → `user(id)` ON DELETE SET NULL)

Down (rollback):
1. Drop FK constraints
2. Drop the table
3. Drop the three enum types (in reverse-dependency order: `email_change_initiator_role`, `email_change_audit_outcome`, `platform_audit_category`)

The migration is **idempotent under the project's validation harness** (`.scripts/migrations/run_validate_migration.sh`) — the table is new, references no existing data, no backfill is required, and the down-migration is a clean reverse.

When companion spec 098 lands, it will introduce a SECOND migration that adds the `email_change_pending` table, the `email_change_pending_state` enum, and ADDs (additively) new values to the `email_change_audit_outcome` enum (`initiated`, `initiation_failed`, `confirmed`, `expired`, `superseded`, `rejected_used_token`, `rejected_expired_token`). The enum extension is non-breaking; existing audit rows are unaffected.

---

## Open questions

None. The data model is fully specified by spec.md + research.md.

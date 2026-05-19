# Phase 1 — Data Model

**Feature**: 097-change-user-email (Platform Admin, No Verification)
**Date**: 2026-05-13
**Last Updated**: 2026-05-19 (Path A — generic audit table; email-specific payload moved to `details` JSONB)

This feature introduces **one** new PostgreSQL table (`platform_audit_entry` — a genuinely platform-wide audit-log foundation per spec.md §FR-014a / §Clarifications Session 2026-05-19) and **three** new enum types. No changes to existing tables — `user.email` and `user.authenticationID` are read and written through the existing columns. The Kratos identity is updated externally via the admin API (see research.md §R1).

The pending-change entity, the token machinery, the multi-step state lifecycle, and the related Postgres enums (`email_change_pending_state`) are deferred to companion spec 098, which introduces them natively as part of its verification flow.

The audit table carries **only generic columns** — every typed column on the row has meaning for every audit category. Category-specific payload (e.g., the old/new email for an `email_change` row) lives in the `details: jsonb` column under a documented key convention. This keeps the table immediately reusable for ISO 27001 categories (`authentication`, `access_control`, `data_privacy`, `configuration_change`, …) without a DDL migration when each new category lands. See spec.md §Clarifications Session 2026-05-19 and research.md §R14 for the rationale.

---

## Length constants (existing, reused)

| Constant | Value | Usage in this feature |
| --- | --- | --- |
| `UUID_LENGTH` | 36 | `id`, `subject_user_id`, `initiator_user_id`, `correlation_id` |
| `MID_TEXT_LENGTH` | 512 | `details.oldEmail`, `details.newEmail` (matches `user.email`; enforced in service layer when writing the JSONB payload) |
| `SMALL_TEXT_LENGTH` | 128 | `failure_reason` |

---

## New PostgreSQL enums

### 1. `platform_audit_category`

```sql
CREATE TYPE platform_audit_category AS ENUM (
  'email_change'
);
```

Single value initially. Future ISO 27001 work extends this enum additively with categories like `authentication`, `access_control`, `data_privacy`, `configuration_change`. The category column on every audit row is what discriminates between feature audit-event vocabularies — the outcome values populated for that category and the JSONB `details` shape carry the category-specific data.

### 2. `platform_audit_outcome`

```sql
CREATE TYPE platform_audit_outcome AS ENUM (
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

Cross-category Postgres enum, populated initially with the 11 outcomes used by the `email_change` category (per FR-014). Each category occupies its own subset of values; the `category` column on the row is what tells the reader which subset applies. Future categories — and companion spec 098 — extend this enum additively via `ALTER TYPE platform_audit_outcome ADD VALUE 'foo'`, which is non-breaking and requires no table migration. Service-layer code is responsible for enforcing per-category outcome vocabularies (i.e., a `category = 'email_change'` row must not carry an outcome value introduced by `category = 'authentication'`).

Companion spec 098 will extend this enum additively with the verification-flow outcomes (`initiated`, `initiation_failed`, `confirmed`, `expired`, `superseded`, `rejected_used_token`, `rejected_expired_token`), all still under `category = 'email_change'`.

### 3. `platform_audit_initiator_role`

```sql
CREATE TYPE platform_audit_initiator_role AS ENUM (
  'self',
  'platform_admin',
  'system',
  'service'
);
```

Cross-category. This spec writes `platform_admin` exclusively. Spec 098 writes `self` as well. The `system` and `service` values are shipped upfront so future ISO 27001 categories that need to record non-human initiators (scheduled jobs, internal services) do not require an enum migration.

---

## Table 1 — `platform_audit_entry`

Append-only platform-wide audit log. **Never updated, never deleted by this feature** (FR-014a — indefinite retention; per-subject removal delegated to user-deletion workflow). This spec's email-change events are the FIRST consumer; future ISO 27001 work adds further categories via additive `platform_audit_category` enum extensions plus the `details: jsonb` column for category-specific structured payload.

| Column | Type | Constraints | Source / Spec Reference |
| --- | --- | --- | --- |
| `id` | `uuid` | PK, default `uuid_generate_v4()` | Standard primary key |
| `row_id` | `int` | NOT NULL, GENERATED ALWAYS AS IDENTITY, unique | Pagination cursor key (per `docs/Pagination.md`) |
| `created_date` | `timestamptz` | NOT NULL, default `now()` | Standard; doubles as the audit "timestamp" exposed in FR-014b |
| `category` | `platform_audit_category` | NOT NULL | Discriminator for which audit-event vocabulary this row uses. This spec writes `email_change` exclusively. Future categories extend the enum. |
| `subject_user_id` | `uuid` | NOT NULL | Required for every user-centric audit category. **No FK constraint** — the audit row references the user id by value but does NOT enforce referential integrity (see §Retention and user deletion). For non-user-centric future categories (e.g., system-level configuration change), the convention will be to use a sentinel user representing the platform; this is a future-spec concern. |
| `initiator_user_id` | `uuid` | NULL | NULL allowed for early-rejection entries before the initiator's identity is fully resolved (FR-014b sentinel case) and for `system` / `service` initiators that have no user record. **No FK constraint** (see §Retention and user deletion). |
| `initiator_role` | `platform_audit_initiator_role` | NOT NULL | Always present per FR-014b. This spec writes `platform_admin` exclusively. |
| `outcome` | `platform_audit_outcome` | NOT NULL | The cross-category outcome enum. Service code enforces per-category subsets (a `category = 'email_change'` row must only carry the 11 email-change outcomes listed below). |
| `failure_reason` | `varchar(128)` | NULL | Non-leaky failure reason for the failure outcomes; FR-014 forbids account-enumeration content |
| `correlation_id` | `uuid` | NULL | Groups audit rows that belong to the same logical operation / incident. See §Correlation semantics below. NULL allowed (e.g., early-rejection entries that never get a correlation handle, or single-row events with no chain). |
| `details` | `jsonb` | NULL | Category-specific structured payload. For `email_change`: `{ "oldEmail", "newEmail" }` plus optional `requestContext`. See §Details shape per category. NULL is permitted (e.g., rejection entries that recorded no payload), but the email-change category always populates `oldEmail` and/or `newEmail` when those values are known at the moment of audit. |

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

-- Correlation lookup: "all rows for this drift / incident", used by drift-resolve and ops forensics
CREATE INDEX ix_platform_audit_entry_correlation
  ON platform_audit_entry (correlation_id)
  WHERE correlation_id IS NOT NULL;
```

### Details shape per category

The `details` JSONB column follows a documented per-category convention. Service code is responsible for writing the documented keys; readers (e.g., the GraphQL projection layer in FR-014b) read by key. There is no JSON Schema enforcement at the DB level — this is intentional, to keep ISO 27001 categories free to evolve their payload without DDL.

**Category `email_change`** (this spec — keys all camelCase):

| Key | Type | When populated |
| --- | --- | --- |
| `oldEmail` | string | The address on the Alkemio side at the moment of the audit event (see §Outcome semantics for the per-outcome meaning). Omitted only when the audit row has no old-email context (e.g., a validation reject before reading the subject). |
| `newEmail` | string | The proposed / observed / committed new address (see §Outcome semantics). Omitted only when no new-email context is meaningful (e.g., session-invalidation failure on a row that already records the committed values). |
| `requestContext` | object | OPTIONAL. Reserved for future use; not populated by this spec. ISO 27001 categories will use `{ "ip", "userAgent", "requestId" }` under this key as the cross-category convention. Documented here so categories don't each invent their own shape. |

**Token leakage guard**: This feature does NOT issue a confirmation token. `details` MUST NOT contain a `token` field on any row this spec writes. When companion spec 098 lands and adds the `email_change_pending` table with a `token` column, that token MUST NOT be mirrored into `platform_audit_entry.details` — this is enforced by 098's entity shape and audit-service contract, not by service-layer discipline at write sites.

### Correlation semantics

`correlation_id` groups audit rows that describe one logical operation or incident.

- A single `applyAdminEmailChange` invocation generates ONE correlation id at the entry point, shared across every row that invocation produces (e.g., `committed` plus any of `security_signal_failed` / `new_address_notification_failed` / `global_admin_notification_failed` / `session_invalidation_failed`).
- A `drift_detected` row carries its own correlation id. The subsequent `drift_resolved` (or `drift_resolution_failed`) row, written by a different `resolveDrift` invocation, **reuses the same correlation id** so that forensic queries can reconstruct the entire drift incident with a single `WHERE correlation_id = ?` scan.
- A `rolled_back` row also shares the correlation id of the failed attempt.
- Rejection rows (`rejected_validation`, `rejected_conflict`) carry their own per-attempt correlation id; nothing chains to them.

The column is nullable to remain backward-compatible if ISO 27001 categories elect not to use it.

### Retention and user deletion

`platform_audit_entry` rows are append-only and retained indefinitely (FR-014a). The `subject_user_id` and `initiator_user_id` columns deliberately have **no FK constraint** to the `user` table — they are plain `uuid` columns that reference the user id by value. Audit rows therefore survive a user-record deletion as forensic evidence; the user-deletion workflow is responsible for explicitly deciding what to do with audit references to a deleted subject (pseudonymize, redact via a future column / JSONB field, or purge the entire audit row). This avoids two failure modes:

- Silent loss of audit history on `ON DELETE CASCADE` — would defeat the ISO 27001 audit-log purpose by removing exactly the rows an investigation needs after a deletion event.
- A user delete failing because of an FK from an immutable audit table — would make user deletion brittle and force operators to either disable the FK or violate audit immutability.

Future user-deletion / pseudonymization work is out of scope here (per FR-014a) — that workflow will own the decision per its own retention policy. The lack of FK is documented at the entity / migration level; service code MUST NOT rely on user-table integrity when reading audit rows.

### Outcome semantics (category `email_change`)

| Outcome | Written when | `details.oldEmail` / `details.newEmail` semantics |
| --- | --- | --- |
| `committed` | Two-side commit succeeded | `oldEmail` = pre-change Alkemio email; `newEmail` = post-change Alkemio email (same on both sides) |
| `rolled_back` | Forward Kratos failed OR Alkemio failed and Kratos revert succeeded | Same as above; both sides reflect `oldEmail` at the end |
| `drift_detected` | Forward Kratos succeeded, Alkemio failed, Kratos revert exhausted | `oldEmail` = observed on Alkemio side (= original value); `newEmail` = observed on Kratos side (= attempted new value) |
| `drift_resolved` | Admin drift-resolve succeeded | `oldEmail` = mirrored from the originating `drift_detected` row's `details.oldEmail` (preserves the pre-drift Alkemio observation as forensic context); `newEmail` = the canonical email the admin selected. Reading the row alone tells you the direction the admin took: `newEmail == originating-drift.newEmail` ⇒ "keep the change"; `newEmail == originating-drift.oldEmail` ⇒ "revert the change". `correlation_id` ties this row to the originating drift row; no cross-reference by value is needed. |
| `drift_resolution_failed` | Admin drift-resolve mutation exhausted its retry budget | Same as drift_detected — observed values |
| `security_signal_failed` | Post-commit mail to OLD address (FR-016) exhausted retry budget | Same as committed — `oldEmail` is the now-old (pre-change) address; `newEmail` is the now-current address |
| `new_address_notification_failed` | Post-commit mail to NEW address (FR-016c) exhausted retry budget | Same as committed |
| `global_admin_notification_failed` | Post-commit global-admin fan-out publish (FR-016d) exhausted retry budget. Captures failure to PUBLISH to the notifications service; per-recipient downstream delivery is out of scope. | Same as committed |
| `session_invalidation_failed` | Post-commit `disableIdentitySessions` exhausted retry budget | Same as committed |
| `rejected_validation` | New email malformed (format / RFC) or equals current | `newEmail` = the malformed / no-change attempted value if it's safe to store; otherwise omitted |
| `rejected_conflict` | New email already taken on Alkemio or Kratos side | `newEmail` = the attempted value (which is also the conflict-holder's address — see anti-enumeration note below) |

### Anti-enumeration rule on `rejected_conflict`

For `rejected_conflict` entries, `details.newEmail` DOES contain the conflicting address (since that's what the admin attempted), but the **GraphQL audit query (FR-014b) does NOT cross-reference it against the user/identity table**, and the `failure_reason` field MUST contain only a generic short code (e.g., `conflict`) — never anything like "address belongs to user X". The conflicting address being readable from the audit row is acceptable because the admin who triggered the rejection already typed that address.

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
    enum: PlatformAuditInitiatorRole,
    enumName: 'platform_audit_initiator_role',
    nullable: false,
  })
  initiatorRole!: PlatformAuditInitiatorRole;

  @Column({
    type: 'enum',
    enum: PlatformAuditOutcome,
    enumName: 'platform_audit_outcome',
    nullable: false,
  })
  outcome!: PlatformAuditOutcome;

  @Column('varchar', { length: SMALL_TEXT_LENGTH, nullable: true })
  failureReason?: string;

  @Column('uuid', { nullable: true })
  correlationId?: string;

  @Column('jsonb', { nullable: true })
  details?: PlatformAuditDetails;
}
```

`PlatformAuditDetails` is a discriminated union type defined in `platform.audit.entry.interface.ts`. For `category = 'email_change'` rows the service layer narrows to `EmailChangeAuditDetails` (`{ oldEmail?: string; newEmail?: string; requestContext?: AuditRequestContext }`). Future categories add their own narrow types under the same union.

The base class — `BaseAlkemioEntity` (id + createdDate + updatedDate + version) — is the lighter choice since this table needs no authorization sub-tree. The email-change feature's repository and service exposing this entity use email-change-specific method names (e.g., `findEmailChangeBySubjectPaged`) that implicitly filter `category = 'email_change'` and project `details.oldEmail` / `details.newEmail` into the GraphQL DTO's `oldEmail` / `newEmail` fields (FR-014b).

The GraphQL surface for this spec (`UserEmailChangeAuditEntry` and the two `platformAdmin` queries) is unchanged by the Path A storage shape — the projection layer reads `details.oldEmail` / `details.newEmail` from JSONB and exposes them as the same typed `oldEmail` / `newEmail` GraphQL fields the contract already specifies. See contracts/graphql.md §2 and §8.

---

## Validation rules (entity-level + service-level)

| Rule | Enforced at | Spec reference |
| --- | --- | --- |
| `details.newEmail` ≠ subject's current email (case-insensitive) | Service before commit | FR-005 |
| `details.newEmail` matches RFC 5322 basic format | DTO via `@IsEmail()` | FR-004 |
| `details.newEmail` is unique across `user` (case-insensitive) AND not registered as a Kratos identity | Service before commit | FR-004 |
| Subject user exists and is active | Service before commit | Edge case (subject deactivated/deleted) |
| Failure-reason MUST NOT leak account-existence info | Service layer when constructing the value | FR-014, FR-014a |
| `outcome` value belongs to the per-category subset implied by `category` | Service / audit-service layer when writing | FR-014, FR-014a |
| `details.oldEmail` / `details.newEmail` ≤ `MID_TEXT_LENGTH` (512 chars) | Service / audit-service layer when writing | Matches `user.email` |
| `details.token` MUST NOT be present for any row written by this spec | Audit-service layer | FR-014a token-leakage guard |

---

## Migration plan (single migration file)

File: `<timestamp>-CreatePlatformAuditEntry.ts`

Up:
1. `CREATE TYPE platform_audit_category AS ENUM ('email_change')` (single initial value; future ISO 27001 categories extend additively)
2. `CREATE TYPE platform_audit_outcome AS ENUM (...)` (11 initial values — see §2 above; future categories extend additively via `ALTER TYPE ... ADD VALUE`)
3. `CREATE TYPE platform_audit_initiator_role AS ENUM ('self', 'platform_admin', 'system', 'service')` (all four values upfront — see §3)
4. `CREATE TABLE platform_audit_entry (...)` with all columns (including `category`, `correlation_id`, `details: jsonb`) and constraints
5. Create the five indices listed above (PK, row_id, subject+category+created_date, subject+category+row_id, partial on correlation_id)
6. (No FK constraints — `subject_user_id` and `initiator_user_id` are plain `uuid` columns. See §Retention and user deletion for rationale.)

Down (rollback):
1. Drop the table
2. Drop the three enum types (in reverse-dependency order: `platform_audit_initiator_role`, `platform_audit_outcome`, `platform_audit_category`)

The migration is **idempotent under the project's validation harness** (`.scripts/migrations/run_validate_migration.sh`) — the table is new, references no existing data, no backfill is required, and the down-migration is a clean reverse.

When companion spec 098 lands, its migration will (a) introduce the `email_change_pending` table + `email_change_pending_state` enum and (b) ADD (additively) new values to the `platform_audit_outcome` enum (`initiated`, `initiation_failed`, `confirmed`, `expired`, `superseded`, `rejected_used_token`, `rejected_expired_token`). Both are non-breaking; existing audit rows are unaffected and the `platform_audit_entry` table itself is not altered.

---

## Open questions

None. The data model is fully specified by spec.md + research.md.

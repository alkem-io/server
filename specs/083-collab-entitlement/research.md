# Research: Office Documents Entitlement — Precedent Analysis

**Feature**: 083-collab-entitlement
**Approach**: Mirror the existing `SPACE_FLAG_MEMO_MULTI_USER` precedent verbatim. This document enumerates every file, line, and pattern that must be touched, based on a full repo scan for `SPACE_FLAG_MEMO_MULTI_USER` / `space-feature-memo-multi-user`.

## Decision 1 — Follow the memo multi-user precedent exactly

- **Decision**: Every file that currently references `SPACE_FLAG_MEMO_MULTI_USER` gets a parallel edit adding `SPACE_FLAG_OFFICE_DOCUMENTS` in the same style, position, and state (enabled/disabled, limit).
- **Rationale**: The memo multi-user flag is the most recent feature-flag entitlement of the same shape (boolean flag, L0-determined, cascading to Collaboration). Mirroring it guarantees behavioral parity with zero invention. It also matches the spec's explicit instruction ("similar to what is there for Memos / whiteboards").
- **Alternatives considered**:
  - *Introduce a generic "entitlement factory"* — rejected: premature abstraction, three similar lines are better than an abstraction (constitution principle 10).
  - *Seed via code instead of migration* — rejected: the existing platform license_policy row is only created by the seed migration; subsequent environments need a migration path to update its credentialRules jsonb column.

## Decision 2 — Migration strategy for updating `license_policy.credentialRules`

- **Decision**: The new migration performs two SQL operations:
  1. `UPDATE license_policy SET "credentialRules" = "credentialRules" || '[ <new rule> ]'::jsonb` — append the new rule without rewriting unrelated entries. Idempotency guard: check that no existing element has `credentialType = 'space-feature-office-documents'` before appending.
  2. `INSERT INTO license_plan (...)` — a single row insert for the `SPACE_FEATURE_OFFICE_DOCUMENTS` plan. Idempotency guard: `ON CONFLICT (name) DO NOTHING` (or an explicit existence check if no unique constraint exists — see research item 2a).
- **Rationale**: Jsonb concatenation is native PostgreSQL and atomic. The approach preserves existing rules, does not require reading+rewriting the whole array in Node, and the idempotency guard lets the migration be safely re-applied. The down migration uses a symmetrical jsonb filter to remove the single entry by `credentialType`, and a `DELETE FROM license_plan WHERE name = 'SPACE_FEATURE_OFFICE_DOCUMENTS'`.
- **Alternatives considered**:
  - *Read the column in JS, mutate, write back* — rejected: more code, more failure modes, non-atomic if interleaved with other migrations (unlikely but possible).
  - *Replace the entire `credentialRules` with a regenerated full list* — rejected: would conflict with any out-of-band additions made by ops in existing environments and is harder to roll back.

### Decision 2a — License plan uniqueness

- **Decision**: Before inserting the license_plan row, the migration performs an existence check (`SELECT 1 FROM license_plan WHERE name = 'SPACE_FEATURE_OFFICE_DOCUMENTS'`). If a row exists, the migration skips the insert (but still appends the credential rule if missing). The down migration removes the row unconditionally by name.
- **Rationale**: The `license_plan` table does not rely on unique constraints for `name` in all historical schemas; an explicit existence check is defensive and matches the style of the existing seed migration.

## Decision 3 — Keep bootstrap JSON in sync (resolved clarification)

- **Decision**: In the same change set, update `src/core/bootstrap/platform-template-definitions/license-plan/license-plans.json` to add an entry for `SPACE_FEATURE_OFFICE_DOCUMENTS` mirroring the existing `SPACE_FEATURE_MEMO_MULTI_USER` entry (type `space-feature-flag`, price 0, `requiresContactSupport: "1"`, `isFree: "1"`, `assignToNewOrganizationAccounts: "0"`, `assignToNewUserAccounts: "0"`, `enabled: "1"`, `trialEnabled: "0"`, sort order chosen to place it after `SPACE_FEATURE_SAVE_AS_TEMPLATE` at sortOrder 100).
- **Rationale**: Resolves the clarification answered in spec.md session 2026-04-08: fresh-bootstrap and migration-upgrade paths must converge to identical state; drift between the two is forbidden.

## Decision 4 — Sort order number

- **Decision**: `sortOrder = "100"` for the new license plan (immediately after `SPACE_FEATURE_SAVE_AS_TEMPLATE` at 90).
- **Rationale**: Matches the existing gap-of-10 convention used by sibling plans (60, 70, 80, 90). Purely cosmetic for admin-UI ordering; no behavioral impact.

## Decision 5 — Credential rule `name` field

- **Decision**: `'Space Office Documents'` — matches the style of `'Space Multi-User memo'` and `'Space Save As Template'`.
- **Rationale**: Purely a human-readable label on the CredentialRule object; never referenced programmatically. Chosen for consistency with the capitalization pattern used by existing rules.

## Decision 6 — Default state on Space and Collaboration license init

- **Decision**:
  - `collaboration.service.ts` → new entitlement added with `enabled: false, limit: 0`, matching the memo multi-user default there.
  - `space.service.ts` → new entitlement added with `enabled: true, limit: 0` (matching memo multi-user). Note: the `enabled: true` on Space init is the precedent; the entitlement is still effectively disabled until the credential rule assigns a `limit >= 1`. The license engine cares about `limit > 0` as the gate; the `enabled` flag here is a legacy/display field.
  - `template.content.space.service.ts` → `enabled: true, limit: 0`, matching the memo precedent.
- **Rationale**: Strict parity with the memo multi-user entitlement initialization. Diverging here would create inconsistency across the entitlement system and is not justified.

## File inventory — every reference to update

The repo-wide grep for `SPACE_FLAG_MEMO_MULTI_USER` returns 14 files. Each one gets a parallel edit for `SPACE_FLAG_OFFICE_DOCUMENTS`:

| # | File | Edit type | Notes |
|---|------|-----------|-------|
| 1 | `src/common/enums/license.entitlement.type.ts` | Add enum value | `SPACE_FLAG_OFFICE_DOCUMENTS = 'space-flag-office-documents'` |
| 2 | `src/common/enums/licensing.credential.based.credential.type.ts` | Add enum value | `SPACE_FEATURE_OFFICE_DOCUMENTS = 'space-feature-office-documents'` |
| 3 | `src/domain/collaboration/collaboration/collaboration.service.ts` | Add entitlement init | `{ type: SPACE_FLAG_OFFICE_DOCUMENTS, dataType: FLAG, limit: 0, enabled: false }` (around line 111) |
| 4 | `src/domain/collaboration/collaboration/collaboration.service.license.ts` | Add case to switch | In `extendLicensePolicy`, add `case SPACE_FLAG_OFFICE_DOCUMENTS:` falling through to `findAndCopyParentEntitlement` (line ~74) |
| 5 | `src/domain/space/space/space.service.ts` | Add entitlement init | `{ type: SPACE_FLAG_OFFICE_DOCUMENTS, dataType: FLAG, limit: 0, enabled: true }` (around line 355) |
| 6 | `src/domain/space/space/space.service.license.ts` | Add case to switch | In `extendLicensePolicy`, add `case SPACE_FLAG_OFFICE_DOCUMENTS:` calling `licenseEngineService.isEntitlementGranted` against the L0 agent (pattern from line 187) |
| 7 | `src/domain/template/template-content-space/template.content.space.service.ts` | Add entitlement init | `{ type: SPACE_FLAG_OFFICE_DOCUMENTS, dataType: FLAG, limit: 0, enabled: true }` (around line 308) |
| 8 | `src/domain/space/space/space.service.license.spec.ts` | Extend test fixtures | Add the new entitlement to expected default and expected-after-apply arrays in existing parameterized cases |
| 9 | `src/domain/collaboration/collaboration/collaboration.service.license.spec.ts` | Extend test fixtures | Same — extend existing parameterized cases with the new entitlement |
| 10 | `src/core/bootstrap/platform-template-definitions/license-plan/license-plans.json` | Add plan entry | Insert a new object after `SPACE_FEATURE_SAVE_AS_TEMPLATE` block, sortOrder 100 |
| 11 | `src/migrations/<timestamp>-add-office-documents-entitlement.ts` | **NEW FILE** | See Decision 2 for SQL pattern |
| 12 | `schema.graphql` | Regenerate | `pnpm run schema:print && pnpm run schema:sort` |
| 13 | `schema-lite.graphql` | Regenerate | Same command set |
| 14 | `schema-baseline.graphql` | **Do NOT edit manually** | Post-merge `schema-baseline` automation will open a PR to update this after merge to `develop` |

Note: `src/migrations/1764590884533-seed.ts` (the original seed) and `src/domain/common/memo/memo.service.ts` also match the grep but are **not** edited:

- The seed migration is historical and contains its own local enum copies; editing it would rewrite history and risk re-running on environments that already ran it. The new migration is the correct place.
- `memo.service.ts` consumes `SPACE_FLAG_MEMO_MULTI_USER` at runtime to gate the memo capability — that is the *consumer* side of the precedent, which is explicitly out of scope for this feature (FR-013).

## Unresolved items

None. All clarifications from `/speckit.clarify` resolved (see spec.md § Clarifications). No NEEDS CLARIFICATION markers in the Technical Context.

# Research: Drop `accountUpn` column and sanitize usage

**Feature**: `016-drop-account-upn`
**Date**: 2025-11-18

## Decisions

### 1. Scope of removal

- **Decision**: Only live schema and code paths will be updated; backups and historical exports containing `accountUpn` are out of scope.
- **Rationale**: The feature owner explicitly stated that backups/retention are out of scope and that the field should be dropped from live usage without looking back.
- **Alternatives considered**:
  - Extend scope to scrub `accountUpn` from backups and exports (rejected: larger operational change than requested).
  - Introduce a transitional deprecation period for `accountUpn` in live schema (rejected: field is already considered unused).

### 2. Replacement identifiers

- **Decision**: Where `accountUpn` is still referenced, use existing stable account identifiers (for example, internal account IDs or external identity IDs already present in the account model) rather than introducing new identifiers.
- **Rationale**: Reusing existing identifiers avoids expanding the data model and keeps changes minimal while preserving behavior.
- **Alternatives considered**:
  - Add a new synthetic identifier field solely to replace `accountUpn` (rejected: unnecessary complexity for a cleanup feature).
  - Map `accountUpn` to user-facing usernames or emails (rejected: may not align with existing domain invariants for account identity).

### 3. Validation approach

- **Decision**: Rely on repository-wide search plus automated tests (CI) and targeted manual checks of key account flows to validate that removal of `accountUpn` introduces no regressions.
- **Rationale**: Existing CI and test harness already cover critical auth/account flows; combining this with a systematic search provides high confidence without adding dedicated one-off tooling.
- **Alternatives considered**:
  - Build custom static analysis or migration dry-run tooling specific to `accountUpn` (rejected: overkill for a single-field cleanup).
  - Require full end-to-end test runs of all clients (rejected: out of scope for server-side schema/code cleanup).

## Usage inventory (2025-11-19)

| Area | Files / References | Classification | Resolution |
| ---- | ------------------ | ------------- | ---------- |
| Domain entity & interface | `src/domain/community/user/user.entity.ts`, `user.interface.ts` | Dead | Removed the column/field entirely; rely on existing `accountID`, `email`, and `authenticationID` for linkage. |
| DTOs / GraphQL inputs | `src/domain/community/user/dto/user.dto.create.ts`, `user.dto.update.ts`, `schema.graphql`, `schema-lite.graphql` | Dead | Dropped `accountUpn` from DTOs and GraphQL schema. Clients continue to pass `email` plus optional `nameID`/`phone`. |
| Domain services | `src/domain/community/user/user.service.ts` | Defensive (previously) | Creation/update logic now persists only `email` and `accountID`; no fallback assignment for `accountUpn` remains. |
| Bootstrap / seed logic | `src/core/bootstrap/bootstrap.service.ts` | Defensive (previously) | Bootstrap user creation now delegates to `UserService` without needing `accountUpn`, so no extra handling required. |
| Search ingest adapter | `src/services/api/search/ingest/search.ingest.service.ts` | Dead | Removed unused assignment of `accountUpn`; ingest payloads use stable IDs and `email`. |
| Persistence / migrations | `src/migrations/1764590889001-removeAccountUpn.ts` (new), historical migrations | Live | Latest migration drops the column + unique index. Historical migrations retain `accountUpn` references by design for rollbacks. |
| Tests & fixtures | `test/data/user.mock.ts`, shared fixtures | Dead | Fixtures updated to exclude `accountUpn`, ensuring schema expectations align with runtime. |
| Observability / scripts | Dashboards/log queries (manual check) | Not found | No log queries, dashboards, or docs reference `accountUpn`; no further work required per T021. |

**Replacement identifier summary**: All previously live `accountUpn` usages now lean on the existing stable identifiers: persistent joins use `accountID`, GraphQL exposure relies on `email` + `nameID`, and service-to-service lookups use `authenticationID` when available. No new identifiers were introduced.

## Migration strategy

1. Drop the unique index `IDX_c09b537a5d76200c622a0fd0b7` from the `user` table to release the constraint on `accountUpn`.
2. Remove the `accountUpn` column entirely from the `user` table.
3. **Rollback plan**: Re-introduce the column as nullable, backfill it from `email`, enforce `NOT NULL`, and recreate the unique index. These steps are codified in `src/migrations/1764590889001-removeAccountUpn.ts`.

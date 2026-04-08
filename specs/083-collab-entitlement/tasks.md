---
description: 'Task list for 083-collab-entitlement (Office Documents entitlement)'
---

# Tasks: Collaboration-Level "Office Documents" Entitlement

**Input**: Design documents from `/specs/083-collab-entitlement/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/graphql-schema-diff.md, quickstart.md

**Tests**: Unit test extensions are included because the affected services already have `*.license.spec.ts` suites that will break if the new enum value is not added to their parameterized fixtures. Treat them as part of the implementation, not speculative coverage.

**Organization**: Tasks are grouped by user story. The three user stories in spec.md are overlapping views of the same plumbing feature, so:

- **Foundational phase** delivers the enum additions every story depends on.
- **US1** delivers the functional wiring (service switches + cascade + tests) — the propagation path.
- **US2** delivers the seed mechanism (migration + bootstrap JSON) — the plan creation path.
- **US3** delivers the API surface (schema regeneration + diff validation).
- **Polish phase** runs the end-to-end quickstart (SC-008) and pre-merge housekeeping.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Every task includes exact absolute file paths

## Path Conventions

Single-project NestJS backend at repository root `/Users/neilsmyth/Documents/DevAlkemio/server/`. All paths below are relative to this root.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Ensure the local dev environment is ready to build and run migrations. The codebase already exists — no project initialization is required.

- [ ] T001 Verify local dev stack is runnable: from repo root run `pnpm install && pnpm run start:services && pnpm run migration:run` and confirm server starts with `pnpm start:dev` against an up-to-date schema

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Add the two new enum values. Every downstream edit (service switches, service init arrays, tests, migration, schema) fails to compile or fails at runtime without these.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T002 Add `SPACE_FLAG_OFFICE_DOCUMENTS = 'space-flag-office-documents'` to the `LicenseEntitlementType` enum in `src/common/enums/license.entitlement.type.ts`, placed immediately after `SPACE_FLAG_MEMO_MULTI_USER`
- [ ] T003 [P] Add `SPACE_FEATURE_OFFICE_DOCUMENTS = 'space-feature-office-documents'` to the `LicensingCredentialBasedCredentialType` enum in `src/common/enums/licensing.credential.based.credential.type.ts`, placed immediately after `SPACE_FEATURE_MEMO_MULTI_USER`

**Checkpoint**: TypeScript still compiles (`pnpm lint` passes `tsc --noEmit`). User story work can now begin.

---

## Phase 3: User Story 1 — Entitlement propagates from Space credential down to Collaboration (Priority: P1) 🎯 MVP

**Goal**: When a Space holds the `space-feature-office-documents` credential, the license-policy application writes `SPACE_FLAG_OFFICE_DOCUMENTS` as enabled on the Space license and cascades it into the contained Collaboration license, and every descendant sub-space / Collaboration in the hierarchy.

**Independent Test**: Manually assign the `space-feature-office-documents` credential to a test Space (via seed data or the License Issuer). Apply the license policy. Query the Space's license entitlements and the Collaboration's license entitlements through GraphiQL and verify `SPACE_FLAG_OFFICE_DOCUMENTS` reports `enabled: true, limit: 1` on both. Remove the credential, reapply, and verify it reports disabled again. Covers spec acceptance scenarios US1-1, US1-2, US1-3, US1-4.

### Implementation for User Story 1

- [ ] T004 [US1] Add `{ type: LicenseEntitlementType.SPACE_FLAG_OFFICE_DOCUMENTS, dataType: LicenseEntitlementDataType.FLAG, limit: 0, enabled: false }` to the default entitlements array in `src/domain/collaboration/collaboration/collaboration.service.ts` (immediately after the existing `SPACE_FLAG_MEMO_MULTI_USER` entry at line ~111)
- [ ] T005 [P] [US1] Add `{ type: LicenseEntitlementType.SPACE_FLAG_OFFICE_DOCUMENTS, dataType: LicenseEntitlementDataType.FLAG, limit: 0, enabled: true }` to the Space license default entitlements array in `src/domain/space/space/space.service.ts` (immediately after the existing `SPACE_FLAG_MEMO_MULTI_USER` entry at line ~355). Note: `enabled: true` matches the memo multi-user precedent at this call site; gating is driven by `limit > 0`.
- [ ] T006 [P] [US1] Add `{ type: LicenseEntitlementType.SPACE_FLAG_OFFICE_DOCUMENTS, dataType: LicenseEntitlementDataType.FLAG, limit: 0, enabled: true }` to the template default entitlements array in `src/domain/template/template-content-space/template.content.space.service.ts` (immediately after the existing `SPACE_FLAG_MEMO_MULTI_USER` entry at line ~308)
- [ ] T007 [US1] Add a `case LicenseEntitlementType.SPACE_FLAG_OFFICE_DOCUMENTS:` branch to the `extendLicensePolicy` switch in `src/domain/collaboration/collaboration/collaboration.service.license.ts` that falls through to `this.licenseService.findAndCopyParentEntitlement(entitlement, parentEntitlements)`, grouped with the existing `SPACE_FLAG_SAVE_AS_TEMPLATE` / `SPACE_FLAG_WHITEBOARD_MULTI_USER` / `SPACE_FLAG_MEMO_MULTI_USER` cases (around line 74)
- [ ] T008 [US1] Add a `case LicenseEntitlementType.SPACE_FLAG_OFFICE_DOCUMENTS:` branch to the `extendLicensePolicy` switch in `src/domain/space/space/space.service.license.ts` that calls `this.licenseEngineService.isEntitlementGranted(LicenseEntitlementType.SPACE_FLAG_OFFICE_DOCUMENTS, levelZeroSpaceAgent)` and, on true, sets `entitlement.limit = 1; entitlement.enabled = true;` — mirroring the memo multi-user case at line ~187
- [ ] T009 [P] [US1] Extend `src/domain/collaboration/collaboration/collaboration.service.license.spec.ts` to include `SPACE_FLAG_OFFICE_DOCUMENTS` in the existing expected-entitlements fixtures and in any parameterized "known entitlement type" coverage so the suite continues to assert no "unknown entitlement type" errors
- [ ] T010 [P] [US1] Extend `src/domain/space/space/space.service.license.spec.ts` to include `SPACE_FLAG_OFFICE_DOCUMENTS` in the existing expected-entitlements fixtures plus a case that verifies it propagates from the L0 agent when the credential is held and remains disabled when it is not
- [ ] T011 [US1] Run `pnpm test -- src/domain/collaboration/collaboration/collaboration.service.license.spec.ts` and `pnpm test -- src/domain/space/space/space.service.license.spec.ts` and confirm both pass

**Checkpoint**: The propagation path is wired end-to-end. A Space holding the credential will now report the entitlement enabled on both Space and Collaboration licenses. US1 is independently verifiable using manually-inserted credential data (independent of US2).

---

## Phase 4: User Story 2 — Seeded license plan available after migration (Priority: P1)

**Goal**: Running `pnpm run migration:run` on any existing environment results in (a) a new `license_plan` row for `SPACE_FEATURE_OFFICE_DOCUMENTS` and (b) a new `CredentialRule` entry appended to the single platform `license_policy.credentialRules` jsonb column, with identical state reachable via a fresh bootstrap.

**Independent Test**: On a database snapshot at the prior schema, run the new migration. Verify via SQL: `SELECT 1 FROM license_plan WHERE name = 'SPACE_FEATURE_OFFICE_DOCUMENTS'` returns one row, and `SELECT jsonb_path_query("credentialRules", '$[*] ? (@.credentialType == "space-feature-office-documents")') FROM license_policy` returns one entry. Run `pnpm run migration:revert` and verify both are gone. Run up again and verify parity (idempotent). Covers spec acceptance scenarios US2-1, US2-2, US2-3.

### Implementation for User Story 2

- [ ] T012 [US2] Create a new migration file at `src/migrations/<timestamp>-add-office-documents-entitlement.ts` following the TypeORM migration pattern used in existing migrations. The `up` method MUST: (1) check whether a `license_plan` row with `name = 'SPACE_FEATURE_OFFICE_DOCUMENTS'` exists and, if not, INSERT it with fields: `type = 'space-feature-flag'`, `licenseCredential = 'space-feature-office-documents'`, `enabled = true`, `sortOrder = 100`, `pricePerMonth = 0`, `isFree = true`, `trialEnabled = false`, `requiresPaymentMethod = false`, `requiresContactSupport = true`, `assignToNewOrganizationAccounts = false`, `assignToNewUserAccounts = false`, `licensingFrameworkId` looked up from the single existing `licensing_framework` row, `id = randomUUID()`, `createdDate / updatedDate = now()`, `version = 1`; (2) check whether the `license_policy.credentialRules` jsonb column already contains an element with `credentialType = 'space-feature-office-documents'` and, if not, append (via jsonb `||` concatenation) a new rule object `{ id: <new uuid>, credentialType: 'space-feature-office-documents', grantedEntitlements: [{ type: 'space-flag-office-documents', limit: 1 }], name: 'Space Office Documents' }`. Both operations MUST be idempotent on re-run.
- [ ] T013 [US2] Implement the `down` method of the same migration: DELETE the `license_plan` row by `name = 'SPACE_FEATURE_OFFICE_DOCUMENTS'` and remove the credential rule from `license_policy.credentialRules` using a jsonb filter on `credentialType = 'space-feature-office-documents'` (use `jsonb_path_query` or a `SELECT ... jsonb_agg(e) FROM jsonb_array_elements(...) e WHERE ...` pattern). Leave all other rules and plans untouched.
- [ ] T014 [P] [US2] Add a new entry to `src/core/bootstrap/platform-template-definitions/license-plan/license-plans.json` after the existing `SPACE_FEATURE_SAVE_AS_TEMPLATE` block with: `"name": "SPACE_FEATURE_OFFICE_DOCUMENTS"`, `"enabled": "1"`, `"sortOrder": "100"`, `"pricePerMonth": "0.00"`, `"isFree": "1"`, `"trialEnabled": "0"`, `"requiresPaymentMethod": "0"`, `"requiresContactSupport": "1"`, `"licenseCredential": "space-feature-office-documents"`, `"assignToNewOrganizationAccounts": "0"`, `"assignToNewUserAccounts": "0"`, `"type": "space-feature-flag"`. Keep formatting / indentation consistent with the surrounding entries.
- [ ] T015 [US2] Run `pnpm run migration:run` locally and verify via `psql` (or the `mcp__postgres-alkemio__query` tool if used): `SELECT name, "licenseCredential", "sortOrder" FROM license_plan WHERE name = 'SPACE_FEATURE_OFFICE_DOCUMENTS'` returns exactly one row; `SELECT jsonb_array_length("credentialRules") FROM license_policy` has incremented by one; `SELECT "credentialRules" FROM license_policy` contains the new entry
- [ ] T016 [US2] Run `pnpm run migration:revert` and verify the license_plan row AND the credential rule entry are both gone; then run `pnpm run migration:run` again and verify the state matches the post-T015 state (idempotency confirmed)
- [ ] T017 [US2] Run `pnpm run migration:validate` (invokes `.scripts/migrations/run_validate_migration.sh`) and confirm the migration passes the snapshot/diff harness

**Checkpoint**: The platform license policy and license_plan table are seeded with the new entitlement on both migration-upgrade and fresh-bootstrap paths. No environment drift is possible. US2 is independently testable (SQL verification) without executing the License Issuer admin flow.

---

## Phase 5: User Story 3 — New entitlement visible in GraphQL schema (Priority: P2)

**Goal**: The `LicenseEntitlementType` and `LicensingCredentialBasedCredentialType` GraphQL enums include the new members so API consumers can read the entitlement state on a Collaboration's license.

**Independent Test**: Run `pnpm run schema:print && pnpm run schema:sort` and confirm the regenerated `schema.graphql` / `schema-lite.graphql` contain `SPACE_FLAG_OFFICE_DOCUMENTS` and `SPACE_FEATURE_OFFICE_DOCUMENTS` as enum members. Run `pnpm run schema:diff` and confirm `change-report.json` classifies the change as additive-only (no BREAKING markers). Query via GraphiQL: `{ __type(name: "LicenseEntitlementType") { enumValues { name } } }` and verify the new member appears.

### Implementation for User Story 3

- [ ] T018 [US3] Regenerate the GraphQL schema artifacts by running `pnpm run schema:print && pnpm run schema:sort` from the repo root. This updates `schema.graphql` and `schema-lite.graphql` in-place.
- [ ] T019 [US3] Run `pnpm run schema:diff` and inspect the generated `change-report.json`. Confirm the only reported changes are the two additive enum value additions (`SPACE_FLAG_OFFICE_DOCUMENTS` on `LicenseEntitlementType`, `SPACE_FEATURE_OFFICE_DOCUMENTS` on `LicensingCredentialBasedCredentialType`) and that there are no BREAKING changes reported. Do NOT manually edit `schema-baseline.graphql` — the post-merge `schema-baseline.yml` automation handles that.
- [ ] T020 [US3] Run `pnpm run schema:validate` and confirm the new schema validates cleanly
- [ ] T021 [US3] Start the dev server (`pnpm start:dev`), open GraphiQL at `/graphiql`, and run the introspection query `{ __type(name: "LicenseEntitlementType") { enumValues { name } } }`. Confirm `SPACE_FLAG_OFFICE_DOCUMENTS` is in the returned list.

**Checkpoint**: API consumers (ecosystem-analytics BFF, web client, admin tooling) can now discover and read the new entitlement via the standard GraphQL surface. US3 is independently verifiable via schema diff alone.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: End-to-end validation (SC-008 Desired Outcome), lint, and pre-merge housekeeping.

- [ ] T022 Run `pnpm lint` from the repo root and confirm `tsc --noEmit` and `biome check` both pass with zero errors or new warnings
- [ ] T023 Run `pnpm test:ci:no:coverage` and confirm the full test suite passes with no regressions (SC-004: zero regressions on existing license-related suites)
- [ ] T024 Execute the three-phase end-to-end quickstart in `specs/083-collab-entitlement/quickstart.md` against a running local dev stack — Phase 1 (plan NOT assigned → entitlement disabled on Space + Collaboration), Phase 2 (plan assigned via License Issuer → entitlement enabled on Space + Collaboration + every descendant), Phase 3 (plan revoked → entitlement disabled again). This is the SC-008 Definition-of-Done check.
- [ ] T025 [P] Review PR description for the required sections per the constitution's Engineering Workflow rule 1: domain impact (licensing / collaboration / space), schema change (additive enum value — not breaking), migration presence (yes, new file + bootstrap JSON sync), deprecation notices (none). Ensure no BREAKING-APPROVED label is required.
- [ ] T026 [P] Verify no files under `src/migrations/1764590884533-seed.ts` were edited (the historical seed migration must remain untouched) and that `src/domain/common/memo/memo.service.ts` was not edited (consumer side is explicitly out of scope per FR-013)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 Setup**: No dependencies — can start immediately
- **Phase 2 Foundational**: Depends on Phase 1. **BLOCKS** every user story — no US work can begin until T002 and T003 are both merged into the working branch
- **Phase 3 US1**: Depends on Phase 2 complete
- **Phase 4 US2**: Depends on Phase 2 complete — can run **in parallel** with Phase 3 (different files entirely)
- **Phase 5 US3**: Depends on Phase 2 complete (needs the enum values in the TS source before schema regen can see them). Can run in parallel with Phases 3 and 4 once T002/T003 are in place.
- **Phase 6 Polish**: Depends on Phases 3, 4, and 5 all being complete. Quickstart (T024) specifically requires the migration from Phase 4 to have run locally.

### Within each User Story

- **US1**: T004 / T005 / T006 are edits to three different files, run in parallel. T007 and T008 are edits to two different license.ts files, can run in parallel with each other and with T004–T006. T009 and T010 are test file edits, parallel with each other. T011 (test run) depends on T004–T010. Order: (T004 || T005 || T006 || T007 || T008 || T009 || T010) → T011.
- **US2**: T012 and T013 are the same migration file, must be sequential (T012 then T013). T014 is the bootstrap JSON, parallel with T012/T013. T015 depends on T012–T014. T016 depends on T015. T017 depends on T016.
- **US3**: T018 → T019 → T020 → T021 (strictly sequential — each depends on the previous artifact).

### Parallel Opportunities

- **Within Phase 2**: T003 runs in parallel with T002 (different files, no dependency)
- **Within Phase 3 (US1)**: T004, T005, T006, T007, T008, T009, T010 all edit different files and can run in parallel. Only T011 (test run) must come last.
- **Within Phase 4 (US2)**: T014 runs in parallel with T012 (different files)
- **Across phases after T002+T003**: Phases 3, 4, and 5 can be worked by three developers in parallel; only T024 at the end reunites them
- **Within Phase 6**: T025 and T026 are reviews, parallel with each other

---

## Parallel Example: US1 implementation burst

After T002 and T003 are merged, a single developer (or a burst of parallel edits) can apply the following in one pass:

```text
Edit src/domain/collaboration/collaboration/collaboration.service.ts      # T004
Edit src/domain/space/space/space.service.ts                              # T005
Edit src/domain/template/template-content-space/template.content.space.service.ts  # T006
Edit src/domain/collaboration/collaboration/collaboration.service.license.ts       # T007
Edit src/domain/space/space/space.service.license.ts                      # T008
Edit src/domain/collaboration/collaboration/collaboration.service.license.spec.ts  # T009
Edit src/domain/space/space/space.service.license.spec.ts                 # T010
```

Then run T011 to verify. All seven edits are in different files with no interdependencies.

---

## Implementation Strategy

### MVP First (Phases 1 → 2 → 3)

1. T001 (env check) — 2 minutes
2. T002 + T003 (enum additions) — 5 minutes
3. T004 – T011 (US1 wiring + unit tests) — one focused editing session

**STOP and VALIDATE**: At this point the code compiles, unit tests pass, and manually-seeded credentials propagate correctly. US1 is the MVP. Technically deployable, but users cannot yet assign the plan via the admin UI.

### Incremental Delivery

4. T012 – T017 (US2 — migration + bootstrap JSON) — unlocks License Issuer assignment
5. T018 – T021 (US3 — schema regeneration) — unlocks API consumers
6. T022 – T026 (Polish — lint, full suite, quickstart, PR review)

Each of US1, US2, US3 delivers independently testable value. US1 alone is a valid MVP; US1+US2 is production-ready on the server side; US1+US2+US3 is the full deliverable ready for downstream clients to integrate.

### Parallel Team Strategy

With three developers after T002/T003 merge:

- **Dev A**: US1 (service wiring + tests)
- **Dev B**: US2 (migration + bootstrap JSON)
- **Dev C**: US3 (schema regen + validation)

All three converge for Phase 6 polish and the shared quickstart run. Total wall-clock time dominated by the slowest phase (likely US2 due to migration validation harness).

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks
- [Story] label (US1/US2/US3) maps each task to the story it delivers, for traceability to spec.md
- The entire feature is a "mirror the precedent" edit pattern — every task has a direct analogue in the existing `SPACE_FLAG_MEMO_MULTI_USER` code paths. When in doubt, grep the codebase for `SPACE_FLAG_MEMO_MULTI_USER` and copy the adjacent pattern verbatim, substituting `OFFICE_DOCUMENTS`.
- Do NOT edit `src/migrations/1764590884533-seed.ts` (historical) or `src/domain/common/memo/memo.service.ts` (out of scope — consumer side, FR-013).
- Do NOT manually edit `schema-baseline.graphql` — post-merge automation handles it.
- Commit after each logical group (Phase 2, then US1, then US2, then US3, then Polish). All commits must be signed per the project git conventions.

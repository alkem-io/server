# Tasks – Kratos Authentication ID Linking

## Phase 1 – Setup

- [X] T001 Install dependencies with `pnpm install`
- [X] T002 Verify local `.env` contains Kratos Admin API credentials required for backfill and REST flows
- [X] T003 Check out branch `014-kratos-authentication-id-linking`

## Phase 2 – Foundational Work

- [X] T004 Update `specs/014-kratos-authentication-id-linking/quickstart.md` with latest internal REST guidance (no code changes)
- [X] T005 Ensure logging enums cover `LogContext.AUTH` usage in `src/common/enums/logging.context.ts`

## Phase 3 – User Story 1 (P0) Persist Kratos IDs on new user creation

### Goal
Persist `authenticationID` on the user entity during onboarding and avoid duplicates when identities reappear.

### Independent Test Criteria
- Creating a new user through the registration flow stores the provided Kratos UUID in the database.
- Logging in with an identity whose email matches an existing user without `authenticationID` links that user instead of creating a duplicate.
- Attempting to link a Kratos UUID already assigned to another user results in an error and leaves state unchanged.

### Tasks
- [X] T006 [US1] Add `authenticationID` column to `src/domain/community/user/user.entity.ts` and interface
- [X] T007 [US1] Generate TypeORM migration adding nullable unique `authenticationID` column in `src/migrations`
- [X] T008 [US1] Update `src/domain/community/user/user.service.ts` to accept Kratos UUID when creating or linking users
- [X] T009 [US1] Adjust `src/services/api/registration/registration.service.ts` to pass Kratos UUID from agent info
- [X] T010 [P] [US1] Add unit tests in `test/unit/domain/community/user/user.service.spec.ts` covering link-or-create behavior

## Phase 4 – User Story 2 (P1) Backfill existing users

### Goal
Provide a platform-admin mutation that populates `authenticationID` for existing users by querying Kratos.

### Independent Test Criteria
- Running the mutation updates users lacking `authenticationID` when the identity exists in Kratos.
- Missing identities are logged without failing the mutation.
- Mutation is idempotent—rerunning after completion makes no additional changes.

### Tasks
- [X] T011 [US2] Create module scaffold under `src/platform-admin/domain/user/authentication-id-backfill`
- [X] T012 [US2] Implement service batching logic calling Kratos Admin API and updating users
- [X] T013 [US2] Wire GraphQL resolver per contract into `src/platform-admin/domain/user/authentication-id-backfill/`
- [X] T014 [US2][FR-007] Instrument backfill service with structured `LogContext.AUTH` progress and missing-identity logs
- [X] T015 [P] [US2] Add integration test in `test/integration/platform-admin/authentication-id-backfill.spec.ts`

## Phase 5 – User Story 3 (P1) Internal REST endpoint resolve/create

### Goal
Expose `/rest/internal/identity/resolve` that returns the Alkemio user ID for a Kratos identity, creating or linking users when needed.

### Independent Test Criteria
- POST request with known `authenticationId` returns the same user ID.
- POST request with Kratos identity email matching an existing user without `authenticationId` links that user and returns its ID.
- POST request with new Kratos identity creates a user via registration flow and returns new user ID.
- Requests with malformed `authenticationId` values are rejected with a client error and the attempt is logged.

### Tasks
- [X] T016 [US3] Create `src/services/api-rest/identity-resolve/identity-resolve.module.ts` and controller skeleton
- [X] T017 [US3] Implement controller method invoking user service and Kratos Admin API per contract
- [X] T018 [US3][FR-007] Add DTO validation and structured audit logging in `src/services/api-rest/identity-resolve`
- [X] T019 [P] [US3] Write integration tests in `test/integration/identity-resolve/identity-resolve.controller.spec.ts`

## Phase 6 – User Story 4 (P2) Nullify authenticationID on Kratos account removal

### Goal
Ensure existing mutations that delete Kratos accounts clear the `authenticationID` column.

### Independent Test Criteria
- Running `adminUserAccountDelete` sets the user’s `authenticationID` to `NULL`.
- Running `adminIdentityDeleteKratosIdentity` sets associated user’s `authenticationID` to `NULL`.

### Tasks
- [X] T020 [US4] Update `src/platform-admin/domain/user/admin.users.resolver.mutations.ts` to clear column post-delete
- [X] T021 [US4] Update `src/platform-admin/core/identity/admin.identity.service.ts` to clear column when deleting by ID/email
- [X] T022 [P] [US4] Add regression tests in `test/integration/platform-admin/admin-user-account-delete.spec.ts`

## Phase 7 – Polish & Cross-Cutting

- [X] T023 [FR-007] Verify new REST and backfill logs meet observability requirements (manual log review or targeted assertions)
- [X] T024 Run `pnpm lint` and `pnpm test:ci` ensuring schema artifacts updated as needed
- [X] T025 Prepare rollout notes summarizing migration, backfill mutation usage, and REST endpoint precautions in `specs/014-kratos-authentication-id-linking/quickstart.md`
- [X] T026 Ensure any new DTOs/interfaces created for this feature live in dedicated files and update imports accordingly

## Dependencies & Execution Order

```
US1 → (enables) US2, US3, US4
US2 ↘
	↘
US3 ----> Polish
US4 ↗
```

## Parallel Execution Opportunities

- T010, T015, T019, and T022 can run in parallel once corresponding implementation tasks finish because they live in separate test suites.
- Within US3, T016/T017 can proceed while T018 prepares validation utilities.
- US2 and US3 may progress concurrently after US1 completes, as they operate in distinct modules.
- T026 runs during polish after primary coding to ensure file boundaries remain compliant.

## Implementation Strategy (MVP First)

1. Deliver User Story 1 as MVP—database column, migration, and onboarding flow updates provide immediate value and unlock subsequent stories.
2. Implement User Story 2 to backfill production data before activating the REST endpoint.
3. Ship User Story 3 to support tooling needs once backfill is available.
4. Finalize User Story 4 and polish tasks to ensure clean unlinking and documentation.

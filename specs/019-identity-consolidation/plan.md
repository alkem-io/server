# Implementation Plan: Identity & Authentication Consolidation

**Branch**: `019-identity-consolidation`
**Spec**: [spec.md](spec.md)
**Consolidates**: `014`, `016`, `017`, `018`

## Phase 1: Database Schema Changes

- [x] **Migration**: Create consolidated migration `userIdentityCleanup`.
    -   Add `authenticationID` (UUID, unique, nullable).
    -   Drop `accountUpn`.
    -   Drop `communicationID` (cleanup from other refactors, included here for consistency if needed, or handled in 020).
    -   Remove `session_sync` tables (if any).

## Phase 2: Core Identity Logic

- [x] **User Entity**: Update `User` entity definition (add `authenticationID`, remove `accountUpn`).
- [x] **User Lookup**: Update `UserLookupService` to support lookup by `authenticationID`.
- [x] **Registration**: Update `RegistrationService` / `UserService` to persist `authenticationID` on creation.
- [x] **Link Service**: Implement `UserAuthenticationLinkService` to handle linking logic (check availability, link on login).

## Phase 3: Identity Resolution Endpoint

- [x] **DTOs**: Create `IdentityResolveRequestDto` and `IdentityResolveResponseDto`.
- [x] **Controller**: Implement `IdentityResolveController` at `/rest/internal/identity/resolve`.
- [x] **Service**: Implement `IdentityResolveService` to handle resolution, JIT provisioning, and Agent ID retrieval.
- [x] **Error Handling**: Ensure `NO_AGENT_FOR_USER` is returned when appropriate.

## Phase 4: Backfill & Admin Tools

- [x] **Backfill Service**: Implement `AdminAuthenticationIDBackfillService` to query Kratos and update users.
- [x] **Resolver**: Expose `adminBackfillAuthenticationIDs` mutation.
- [x] **Cleanup**: Ensure `adminUserAccountDelete` clears `authenticationID`.

## Phase 5: Removals

- [x] **Session Sync**: Delete `SessionSyncModule`, scheduler, and config.
- [x] **Cleanup**: Remove any dead code related to `accountUpn`.

## Verification

- [x] **Tests**: Verify `identity-resolve.controller.spec.ts` passes.
- [x] **Tests**: Verify `authentication-id-backfill.spec.ts` passes.
- [x] **Tests**: Verify `admin-user-account-delete.spec.ts` passes.

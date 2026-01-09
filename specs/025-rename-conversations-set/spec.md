# Feature Specification: Rename ConversationsSet to Messaging

**Feature Branch**: `025-rename-conversations-set`
**Created**: 2025-12-12
**Status**: Implemented
**Input**: User description: "I want to rename conversationsSet to messaging. In a current for it acts as container (and singlet) for the messaging."

## Summary

The `ConversationsSet` domain entity, database table, and GraphQL container have been renamed to `Messaging`. This change improves developer clarity by aligning the code with the domain concept of a messaging container. The API has been updated to expose `messaging` while maintaining backward compatibility for `conversationsSet` via deprecation.

## Changes Implemented

### Domain Model

- **Renamed Entity**: `ConversationsSet` -> `Messaging`
- **Renamed Service**: `ConversationsSetService` -> `MessagingService`
- **Renamed Module**: `ConversationsSetModule` -> `MessagingModule`
- **Renamed Directory**: `src/domain/communication/conversations-set` -> `src/domain/communication/messaging`

### Database

- **Migration**: `RenameConversationsSetToMessaging`
    - Renamed table `conversations_set` to `messaging`.
    - Renamed column `conversationsSetId` to `messagingId` in `conversation` table.
    - Updated `authorization_policy` type from `COMMUNICATION_CONVERSATIONS_SET` to `COMMUNICATION_MESSAGING`.

### GraphQL API

- **New Field**: `messaging` (Query/Mutation) added.
- **Deprecated Field**: `conversationsSet` marked as `@deprecated`.
- **New Type**: `Messaging` added.
- **Deprecated Type**: `ConversationsSet` marked as `@deprecated` (aliased to `Messaging`).

### Authorization

- **Policy Type**: `AuthorizationPolicyType.COMMUNICATION_CONVERSATIONS_SET` renamed to `AuthorizationPolicyType.COMMUNICATION_MESSAGING`.
- **CASL**: Permissions updated to use `messaging` resource identifier.

## Verification

- **Codebase Search**: `ConversationsSet` usage is restricted to deprecated API compatibility layers.
- **Schema Diff**: Confirmed `messaging` addition and `conversationsSet` deprecation/aliasing.
- **Tests**: Existing tests updated to use new terminology.

## Future Work

- Remove deprecated `conversationsSet` fields and types in a future major release.

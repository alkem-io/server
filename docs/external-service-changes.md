# External Service Changes Required

This document tracks breaking changes in Alkemio Server that require corresponding updates in external services.

---

## whiteboard-collaboration-service

Repository: https://github.com/alkem-io/whiteboard-collaboration-service

### WHO Response Change

**Before:**
```json
{ "id": "uuid", "email": "user@example.com" }
```

**After:**
```json
"uuid"
```

The `who()` endpoint now returns a plain string (actorId) instead of an object.

**Required changes:**
1. Update code that receives `who()` response to expect `string` instead of `{ id, email }`
2. Update logging to use the actorId string directly (no more email available)
3. Remove any `UserInfo` / `ActorInfo` type definitions

### Contribution Event Change

**Before:**
```json
{ "whiteboardId": "...", "users": [{ "id": "uuid", "email": "..." }] }
```

**After:**
```json
{ "whiteboardId": "...", "users": [{ "id": "uuid" }] }
```

**Required changes:**
1. Remove `email` field from contribution event payload
2. Update any code that reads `user.email` from contribution events

---

## collaborative-document-service

Repository: https://github.com/alkem-io/collaborative-document-service

### WHO Response Change

**Before:**
```json
{ "id": "uuid", "email": "user@example.com" }
```

**After:**
```json
"uuid"
```

The `who()` endpoint now returns a plain string (actorId) instead of an object.

**Required changes:**
1. Update code that receives `who()` response to expect `string` instead of `{ id, email }`
2. Update logging to use the actorId string directly (no more email available)
3. Remove any `UserInfo` / `ActorInfo` type definitions

### Contribution Event Change

**Before:**
```json
{ "memoId": "...", "users": [{ "id": "uuid", "email": "..." }] }
```

**After:**
```json
{ "memoId": "...", "users": [{ "id": "uuid" }] }
```

**Required changes:**
1. Remove `email` field from contribution event payload
2. Update any code that reads `user.email` from contribution events

---

## GraphQL API Breaking Changes

The following GraphQL schema changes were made as part of converging the "contributor" concept around "actor/actorId":

### Input Type Field Renames

**`AssignRoleOnRoleSetInput`:**
- `contributorID` → `actorId`

**`RemoveRoleOnRoleSetInput`:**
- `contributorID` → `actorId`

**`AssignPlatformRoleInput`:**
- `contributorID` → `actorId`

**`RemovePlatformRoleInput`:**
- `contributorID` → `actorId`

**`RolesContributorInput`:**
- `contributorID` → `actorId`

**`InviteForEntryRoleOnRoleSetInput`:**
- `invitedContributorIDs` → `invitedActorIds`

### Output Type Field Renames

**`CommunityInvitationForRoleResult`:**
- `contributorID` → `actorId`
- `contributorType` → `actorType`

### Type Renames

**`ContributorRolePolicy`** → **`ActorRolePolicy`**

### Enum Removals

**`RoleSetContributorType`** - REMOVED (use `ActorType` instead)

### Notification Payload Changes

**`NotificationInputCommunityNewMember`:**
- `contributorID` → `actorId`
- `contributorType` → `actorType`

**`InAppNotificationPayloadSpaceCommunityContributor`:**
- `contributorID` → `actorId`
- `contributorType` → `actorType`

### Database Migration

A migration is required to rename the `invitedContributorID` column to `invitedActorId` in the `invitation` table.

---

## Rationale

These changes were made to:
1. **Eliminate PII propagation** - Email addresses are no longer sent to external services
2. **Simplify the API** - Plain actorId string is simpler than wrapper objects
3. **Converge on actor pattern** - All identification uses actorId consistently
4. **Simplify type hierarchy** - `RoleSetContributorType` was a redundant subset of `ActorType`
5. **Consistent naming** - All actor references now use `actorId` instead of `contributorID`

The `alkemio` team detection (for Elasticsearch analytics) is now handled internally by `ContributionReporterService`, which looks up user email only when needed.

The Actor pattern means that User, Organization, VirtualContributor, Space, and Account all extend Actor. Since `contributor.id === actorId`, all references to `contributorID` should use `actorId` for consistency.

---

## GraphQL Interface Changes

### IContributor → IActor Merge

The `IContributor` GraphQL interface has been **removed** and merged into `IActor`.

**Before:**
- `IContributor` interface: User, Organization, VirtualContributor
- `IActor` interface: User, Organization, VirtualContributor, Space, Account (but not in GraphQL)

**After:**
- `IActor` interface: User, Organization, VirtualContributor, Space, Account (all exposed in GraphQL)
- `IContributor` interface: **REMOVED**

### Field Type Changes

All GraphQL fields that previously returned `IContributor` or `Contributor` now return `IActor` or `Actor`:

| Field Location | Old Return Type | New Return Type |
|----------------|-----------------|-----------------|
| `Application.contributor` | `Contributor` | `Actor` |
| `Invitation.contributor` | `Contributor` | `Actor` |
| `Message.sender` | `Contributor` | `Actor` |
| `MessageReaction.sender` | `Contributor` | `Actor` |
| `InAppNotification.receiver` | `Contributor` | `Actor` |
| `InAppNotification.triggeredBy` | `Contributor` | `Actor` |
| `ActivityLogEntryMemberJoined.contributor` | `Contributor` | `Actor` |
| `InnovationPack.provider` | `Contributor` | `Actor` |
| `InnovationHub.provider` | `Contributor` | `Actor` |
| `VirtualContributor.provider` | `Contributor` | `Actor` |
| `SpaceAbout.provider` | `Contributor` | `Actor` |
| `Account.host` | `Contributor` | `Actor` |

### IActor Interface Additions

The `IActor` interface now includes:

```graphql
interface Actor {
  id: UUID!
  type: ActorType!
  nameID: NameID          # Optional - Space/Account have it, User/Org/VC require it
  authorization: AuthorizationPolicy
  credentials: [Credential!]
  profile: Profile        # Optional - Space/Account have it, User/Org/VC require it
  createdDate: DateTime!
  updatedDate: DateTime!
}
```

### Client Migration

Clients querying `Contributor` fields should:
1. Update type references from `Contributor` to `Actor`
2. Update GraphQL queries to use `Actor` fragments
3. Handle that `nameID` and `profile` may be null (for Space/Account actors, though unlikely to appear in contributor contexts)

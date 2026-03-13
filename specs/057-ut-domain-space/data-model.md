# Data Model: src/domain/space

## Core Entities
- **Space** extends Actor (STI) -- id, nameID, level, visibility, settings (JSONB), sortOrder, pinned, levelZeroSpaceID, platformRolesAccess (JSONB)
- **SpaceAbout** -- profile, guidelines
- **Account** -- hosts spaces, has license plans

## Key Relationships
- Space -> parentSpace (self-referential)
- Space -> subspaces[] (one-to-many)
- Space -> community -> roleSet
- Space -> collaboration -> calloutsSet -> callouts[]
- Space -> about -> profile
- Space -> account (L0 only)
- Space -> license -> entitlements[]
- Space -> storageAggregator
- Space -> templatesManager (L0 only)

## Settings Structure (JSONB)
```typescript
{
  privacy: { mode: PUBLIC|PRIVATE, allowPlatformSupportAsAdmin: boolean },
  membership: { policy, trustedOrganizations[], allowSubspaceAdminsToInviteMembers },
  collaboration: { inheritMembershipRights, allowMembersToCreateSubspaces, allowMembersToCreateCallouts, allowEventsFromSubspaces, allowMembersToVideoCall, allowGuestContributions },
  sortMode: ALPHABETICAL
}
```

## Space Levels
- L0: Root space (has account, templatesManager)
- L1: First-level subspace
- L2: Second-level subspace (deepest allowed)

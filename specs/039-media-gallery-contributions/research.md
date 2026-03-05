# Research: Media Gallery Contribution Tracking

**Branch**: `039-media-gallery-contributions`
**Date**: 2026-03-04

## R1: Contribution Reporter Wiring Pattern

**Decision**: Follow the identical pattern used by `calloutMemoCreated` and `calloutWhiteboardCreated` in `callout.resolver.mutations.ts`.

**Rationale**: All existing contribution types use the same structure:
1. A type string constant in `CONTRIBUTION_TYPE`
2. A public method on `ContributionReporterService` that calls `createDocument()` with the type, contribution details, and author details
3. The caller (resolver mutation) obtains `levelZeroSpaceID` via `CommunityResolverService` and calls the reporter method fire-and-forget

**Alternatives considered**:
- RabbitMQ-based async reporting (like whiteboard/memo *ongoing* contributions) — rejected because media gallery uploads happen via GraphQL mutations, not external integration messages. The mutation-based pattern is simpler and sufficient.

## R2: Space ID Resolution from Media Gallery

**Decision**: Add a `getLevelZeroSpaceIdForMediaGallery(mediaGalleryID)` method to `CommunityResolverService` that traverses: `Space → Collaboration → CalloutsSet → Callout → CalloutFraming → MediaGallery`.

**Rationale**: The media gallery resolver mutation (`addVisualToMediaGallery`) does not have access to the callout or space context. A dedicated resolver method follows the pattern of `getCommunityFromWhiteboardOrFail` and `getCommunityForMemoOrFail` which traverse similar entity chains.

**Alternatives considered**:
- Pass space ID from the client in the mutation input — rejected because it violates the server-side resolution pattern and creates a trust boundary issue.
- Query the space via callout → calloutsSet directly in the resolver — rejected because space resolution logic should be centralized in `CommunityResolverService`.

## R3: Which Interactions to Track

**Decision**: Track only `addVisualToMediaGallery` mutation (visual creation/upload). Do not track visual deletion or gallery browsing.

**Rationale**: Consistent with other contribution types — `CALLOUT_POST_CREATED`, `CALLOUT_WHITEBOARD_CREATED`, `CALLOUT_MEMO_CREATED` all track creation events. Deletion and browsing are not tracked for any contribution type.

**Alternatives considered**:
- Track both creation and deletion — rejected because no other contribution type tracks deletion events.
- Track browsing/viewing — rejected because viewing is passive and no other type tracks passive reads.

## R4: Author Email Resolution

**Decision**: Use `actorContext.actorID` for both the author ID and email fields, consistent with the pattern in `callout.resolver.mutations.ts`.

**Rationale**: Existing callout contribution calls use `actorContext.actorID` for both fields. The `isFromAlkemioTeam` check in the reporter will handle the filtering.

**Alternatives considered**: None — must match existing pattern exactly.

## R5: Media Gallery Display Name

**Decision**: Use the parent callout framing's profile display name, formatted as `"Media Gallery of <callout display name>"`. The MediaGallery entity has no `displayName`, `nameID`, or `profile` field of its own.

**Rationale**: MediaGallery lacks a display name. The parent CalloutFraming has a profile with `displayName` which identifies the callout. Concatenating with a prefix provides a meaningful, human-readable contribution name.

**Resolution**: Query `CalloutFraming` where `mediaGallery.id = mediaGalleryID` with `profile` relation loaded, then use `calloutFraming.profile.displayName`. This is done in the resolver itself (`MediaGalleryResolverMutations.reportMediaGalleryContribution`) using `EntityManager.findOne(CalloutFraming, ...)`, not in `CommunityResolverService`. A fallback display name of `'Media Gallery'` is used when the `CalloutFraming` or its profile is not found.

**Alternatives considered**:
- Use the visual name — rejected because the contribution is about the gallery, not the individual visual.
- Use the media gallery UUID as the name — rejected because it's not human-readable on the Kibana dashboard.
- Use the media gallery's own profile — rejected because the entity has no profile relation.

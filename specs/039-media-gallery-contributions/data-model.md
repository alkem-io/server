# Data Model: Media Gallery Contribution Tracking

**Branch**: `039-media-gallery-contributions`
**Date**: 2026-03-04

## Overview

No new entities or database schema changes required. This feature adds a new event type to the existing Elasticsearch contribution document structure.

## Existing Entities (unchanged)

### MediaGallery (entity)
- `id`: UUID (PK)
- `visuals`: Visual[] (OneToMany, eager: false)
- `storageBucket`: StorageBucket (OneToOne)
- `createdBy`: UUID
- Location: `src/domain/common/media-gallery/media.gallery.entity.ts`
- Note: Has no `displayName`, `nameID`, or `profile`. The contribution name is derived from the parent CalloutFraming's profile: `"Media Gallery of " + calloutFraming.profile.displayName`.

### Visual (entity)
- `id`: UUID (PK)
- `name`: string
- `sortOrder`: number
- `mediaGallery`: MediaGallery (ManyToOne)
- Location: `src/domain/common/visual/visual.entity.ts`

### CalloutFraming → MediaGallery relationship
- `CalloutFraming.mediaGallery`: MediaGallery (OneToOne, JoinColumn)
- Location: `src/domain/collaboration/callout-framing/callout.framing.entity.ts`

## Elasticsearch Document (existing structure, no changes)

### ContributionDocument
```
{
  id: string              // Media gallery ID
  name: string            // "Media Gallery of <callout display name>" (from CalloutFraming.profile.displayName)
  author: string          // Actor ID
  type: ContributionType  // "MEDIA_GALLERY_CONTRIBUTION" (NEW value)
  '@timestamp': Date      // Event timestamp
  alkemio: boolean        // Is Alkemio team member
  environment: string     // Deployment environment
}
```

## Entity Traversal for Space Resolution

```
MediaGallery (by ID)
  ← CalloutFraming.mediaGallery (back-reference)
    ← Callout.framing (back-reference)
      → Callout.calloutsSet (ManyToOne)
        ← Collaboration.calloutsSet (back-reference)
          ← Space.collaboration (back-reference)
            → Space.levelZeroSpaceID
```

This traversal will be implemented as a TypeORM `entityManager.findOne(Space, { where: { ... } })` query in `CommunityResolverService`, following the exact pattern of `getLevelZeroSpaceIdForCalloutsSet`.

## Display Name Resolution (for contribution `name` field)

```
MediaGallery (by ID)
  ← CalloutFraming.mediaGallery (back-reference via FK callout_framing.mediaGalleryId)
    → CalloutFraming.profile (OneToOne, eager)
      → Profile.displayName
```

Result: `"Media Gallery of " + calloutFraming.profile.displayName` (falls back to `"Media Gallery"` if `CalloutFraming` or its profile is not found)

Note: MediaGallery has no inverse relation to CalloutFraming, so this requires a TypeORM query: `entityManager.findOne(CalloutFraming, { where: { mediaGallery: { id: mediaGalleryID } }, relations: { profile: true } })`. This resolution is done in the resolver (`MediaGalleryResolverMutations.reportMediaGalleryContribution`), not in `CommunityResolverService`.

## New Contribution Type Constant

Added to `CONTRIBUTION_TYPE` in `src/services/external/elasticsearch/types/contribution.type.ts`:

```
MEDIA_GALLERY_CONTRIBUTION: 'MEDIA_GALLERY_CONTRIBUTION'
```

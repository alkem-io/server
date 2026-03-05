# Quickstart: Media Gallery Contribution Tracking

**Branch**: `039-media-gallery-contributions`
**Date**: 2026-03-04

## Prerequisites

- Local dev environment running (`pnpm run start:services`)
- Elasticsearch and Kibana accessible
- Server running (`pnpm start:dev`)

## Implementation Checklist

### Step 1: Register the contribution type
- Add `MEDIA_GALLERY_CONTRIBUTION: 'MEDIA_GALLERY_CONTRIBUTION'` to `CONTRIBUTION_TYPE` in `src/services/external/elasticsearch/types/contribution.type.ts`

### Step 2: Add reporter method
- Add `mediaGalleryContribution(contribution, details)` method to `ContributionReporterService` in `src/services/external/elasticsearch/contribution-reporter/contribution.reporter.service.ts`
- Follow exact pattern of `memoContribution()` or `whiteboardContribution()`

### Step 3: Add space resolution method
- Add `getLevelZeroSpaceIdForMediaGallery(mediaGalleryID)` to `CommunityResolverService` in `src/services/infrastructure/entity-resolver/community.resolver.service.ts`
- Traverse: Space → Collaboration → CalloutsSet → Callout → CalloutFraming → MediaGallery

### Step 4: Wire into media gallery resolver
- Import `ContributionReporterModule` and `EntityResolverModule` in `MediaGalleryModule`
- Inject `ContributionReporterService`, `CommunityResolverService`, `EntityManager`, and `LoggerService` in `MediaGalleryResolverMutations`
- Add a private `reportMediaGalleryContribution()` helper with try-catch (fire-and-forget)
- Call reporter after successful visual creation in `addVisualToMediaGallery()`

### Step 5: Verify
1. Upload a visual to a media gallery via GraphQL mutation
2. Check Elasticsearch index for new `MEDIA_GALLERY_CONTRIBUTION` document
3. Verify Kibana dashboard shows the event

## Verification Commands

```bash
# Build
pnpm build

# Run tests
pnpm test:ci:no:coverage

# Lint
pnpm lint
```

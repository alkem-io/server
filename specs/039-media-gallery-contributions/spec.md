# Feature Specification: Media Gallery Contribution Tracking

**Feature Branch**: `039-media-gallery-contributions`
**Created**: 2026-03-04
**Status**: Implemented
**Input**: User description: "Add media gallery interactions to the Elasticsearch/Kibana contribution tracking dashboard. A new MEDIA_GALLERY_CONTRIBUTION type should be reported when users interact with media galleries (photo/video uploads within callouts)."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Track Media Gallery Uploads on Dashboard (Priority: P1)

As a platform administrator viewing the Kibana dashboard, I want to see media gallery contribution events so that I can monitor user engagement with photo/video content within callouts, just like I already see whiteboard edits and memo edits.

**Why this priority**: This is the core feature — without contribution events being reported, there is nothing to display on the dashboard. All other value depends on this.

**Independent Test**: Can be verified by uploading a visual (photo/video) to a media gallery within a callout and confirming the event appears in the Elasticsearch index with the correct type, author, and space metadata.

**Acceptance Scenarios**:

1. **Given** a user uploads a visual to a media gallery in a callout, **When** the upload completes successfully, **Then** a `MEDIA_GALLERY_CONTRIBUTION` event is recorded in the contribution index with the correct author, media gallery ID, display name, space, and timestamp.
2. **Given** a user uploads multiple visuals in a single session, **When** each upload completes, **Then** each upload generates its own contribution event.
3. **Given** the contribution reporting service is unavailable, **When** a media gallery contribution occurs, **Then** the failure is logged with the error stack trace and `CONTRIBUTION_REPORTER` log context, and the user's upload is not affected (fire-and-forget pattern, consistent with existing contribution types).

---

### User Story 2 - View Media Gallery Activity in Kibana (Priority: P2)

As a platform administrator, I want media gallery contributions to appear alongside existing contribution types (whiteboard edits, memo edits, post creation, etc.) in the Kibana dashboard so that I get a complete picture of user engagement across all content types.

**Why this priority**: The dashboard visibility depends on the events being reported correctly (P1). Once events flow, the Kibana dashboard will automatically pick them up since it queries the same index.

**Independent Test**: Can be verified by checking the Kibana dashboard filters and confirming `MEDIA_GALLERY_CONTRIBUTION` appears as a filterable contribution type alongside existing types.

**Acceptance Scenarios**:

1. **Given** media gallery contribution events exist in the contribution index, **When** an admin views the Kibana dashboard, **Then** the events are visible and filterable by the `MEDIA_GALLERY_CONTRIBUTION` type.
2. **Given** media gallery contributions are tracked, **When** the admin filters by a specific space, **Then** only media gallery contributions within that space are shown.

---

### Edge Cases

- What happens when a visual upload fails mid-way? The contribution should only be reported on successful upload completion.
- What happens when the media gallery has no associated space (orphaned entity)? The system handles this gracefully: `getLevelZeroSpaceIdForMediaGallery` throws `EntityNotFoundException`, which is caught by the try-catch wrapper in `reportMediaGalleryContribution`, logged as an error with `LogContext.CONTRIBUTION_REPORTER`, and the upload proceeds unaffected.
- What happens when the user's email is from the Alkemio team (`@alkem.io`)? The `alkemio` flag should be set to `true` in the contribution document, consistent with all other contribution types.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST report a `MEDIA_GALLERY_CONTRIBUTION` event to the contribution index when a user successfully uploads a visual to a media gallery within a callout.
- **FR-002**: The contribution event MUST include: media gallery ID (UUID), contribution name formatted as `"Media Gallery of <callout display name>"` (where `<callout display name>` is the parent callout framing's `profile.displayName`; falls back to `"Media Gallery"` if the callout framing is not found), author ID, associated level-zero space ID, and timestamp. Note: following the established pattern in `callout.resolver.mutations.ts`, `actorContext.actorID` is used for both the `id` and `email` author fields.
- **FR-003**: The `MEDIA_GALLERY_CONTRIBUTION` type MUST be registered in the contribution type definitions alongside existing types (WHITEBOARD_CONTRIBUTION, MEMO_CONTRIBUTION, etc.).
- **FR-004**: The contribution reporter service MUST expose a `mediaGalleryContribution` method following the same signature pattern as `whiteboardContribution` and `memoContribution` (accepting contribution details and actor context; author details are derived inside the reporter).
- **FR-005**: The contribution event MUST correctly flag whether the author is an Alkemio team member (using the existing `@alkem.io` email check).
- **FR-006**: The contribution reporting MUST follow the existing fire-and-forget pattern — failures to report MUST be logged but MUST NOT block or fail the user's upload operation.

### Key Entities

- **Media Gallery**: An entity containing a collection of visuals (photos/videos) associated with a callout. Key attributes: ID, associated space, storage bucket. Note: MediaGallery has no display name of its own; the contribution name is derived from the parent callout framing's profile display name (`"Media Gallery of <callout display name>"`).
- **Contribution Event**: A document representing a user interaction. Key attributes: type, entity ID, entity name, author, space, timestamp, environment, Alkemio team flag.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Every successful visual upload to a media gallery generates a corresponding contribution event visible in the Kibana dashboard within the standard ingestion latency.
- **SC-002**: Media gallery contribution events contain the same metadata fields (author, space, timestamp, Alkemio flag) as existing contribution types, enabling consistent filtering and aggregation.
- **SC-003**: The new contribution type integrates seamlessly with existing Kibana dashboard queries — no dashboard reconfiguration is needed beyond the new type appearing automatically.
- **SC-004**: Zero impact on upload performance — contribution reporting does not add observable latency to the user's visual upload experience.

## Assumptions

- The Kibana dashboard dynamically picks up new contribution types from the index without requiring manual dashboard reconfiguration.
- The media gallery entity is accessible through the existing entity/profile resolution patterns used by other contribution types.
- The wiring point for triggering the contribution report will follow the pattern used by callout mutations (e.g., calloutWhiteboardCreated, calloutMemoCreated) where the contribution is reported in the resolver after a successful mutation.
- Only visual uploads (new visuals added to the gallery) are tracked as contributions — viewing/browsing the gallery is not a reportable interaction.

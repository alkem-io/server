# Feature Specification: Callouts Tag Cloud with Filtering

**Feature Branch**: `012-callouts-tag-cloud`
**Created**: 2025-11-06
**Status**: Retroactive (code implemented, spec written after)
**Related Issue**: alkem-io/client-web#7100
**Input**: "Show tag cloud on knowledge base with filtering capability for callouts based on tags from framing and contributions"

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Discover All Tags in Knowledge Base (Priority: P1)

As a user browsing a knowledge base (CalloutsSet), I want to see all tags that are being used across callouts and their contributions so that I can quickly understand what topics are being discussed and which are most popular.

**Why this priority**: This is the foundation feature - users need to see available tags before they can filter by them. Delivers immediate value by providing topic discovery and popularity indicators.

**Independent Test**: Can be fully tested by querying the `tags` field on any CalloutsSet and verifying tags are returned sorted by frequency then alphabetically, delivering discoverability value.

**Acceptance Scenarios**:

1. **Given** a CalloutsSet with multiple callouts containing tags in their framing profiles, **When** I query the `tags` field, **Then** I receive a list of all unique tags sorted by frequency (most used first) then alphabetically
2. **Given** a CalloutsSet with callouts that have post contributions with tags, **When** I query the `tags` field, **Then** I receive tags from both callout framing and post contributions
3. **Given** a CalloutsSet where tag "innovation" appears 5 times and tag "sustainability" appears 3 times, **When** I query the `tags` field, **Then** "innovation" appears before "sustainability" in the results
4. **Given** a CalloutsSet where tags "apple" and "banana" both appear 2 times, **When** I query the `tags` field, **Then** "apple" appears before "banana" (alphabetical tie-breaker)
5. **Given** a CalloutsSet with no callouts or tags, **When** I query the `tags` field, **Then** I receive an empty array

---

### User Story 2 - Filter Tag Cloud by Classification (Priority: P2)

As a user viewing a knowledge base with different callout types (e.g., different workflow states), I want to filter the tag cloud to show only tags from callouts matching specific classifications so that I can see topic trends within a subset of content.

**Why this priority**: Enables advanced filtering for users who need to analyze tags within specific contexts (e.g., only from callouts in "KnowledgeBase" flow-state), but basic tag discovery works without this.

**Independent Test**: Can be tested independently by providing `classificationTagsets` arguments when querying `tags` field and verifying only tags from matching callouts in that classification are returned.

**Acceptance Scenarios**:

1. **Given** a CalloutsSet with callouts having different flowState classifications, **When** I query `tags` with `classificationTagsets` filtering for flowState "published", **Then** I receive only tags from callouts in the "published" state
2. **Given** a CalloutsSet where 5 callouts are "published" (with tag "research") and 3 are "draft" (with tag "planning"), **When** I query `tags` filtered by flowState "published", **Then** I receive "research" but not "planning"
3. **Given** empty or missing classification filter arguments, **When** I query `tags`, **Then** I receive tags from all callouts (no filtering applied)

---

### User Story 3 - Filter Callouts by Tags (Priority: P1)

As a user interested in specific topics, I want to filter callouts to show only those that contain at least one of my selected tags (either in the callout itself or its contributions) so that I can quickly find relevant collaboration tools.

**Why this priority**: This is the core user value proposition - enabling quick navigation to relevant content based on topics of interest. Essential for the knowledge base use case.

**Independent Test**: Can be fully tested by providing `withTags` argument when querying the `callouts` field and verifying only matching callouts are returned, delivering immediate filtering value.

**Acceptance Scenarios**:

1. **Given** a CalloutsSet with 10 callouts, 3 of which have tag "AI" in their framing, **When** I query `callouts(withTags: ["AI"])`, **Then** I receive only those 3 callouts
2. **Given** a callout with tag "blockchain" in its framing and another callout with tag "blockchain" in a post contribution, **When** I query `callouts(withTags: ["blockchain"])`, **Then** I receive both callouts
3. **Given** a callout with tags "AI" and "machine-learning", **When** I query `callouts(withTags: ["AI", "robotics"])`, **Then** the callout is included (matches at least one tag)
4. **Given** a callout with no matching tags, **When** I query with `withTags` filter, **Then** the callout is excluded from results
5. **Given** I have READ permission on only 5 out of 10 callouts, **When** I query `callouts(withTags: ["AI"])`, **Then** I receive only the matching callouts I have access to (authorization respected)

---

### User Story 4 - Combine Tag and Classification Filters (Priority: P3)

As a power user, I want to combine tag-based filtering with classification-based filtering when querying callouts so that I can perform precise searches (e.g., "show me callouts in Subspaces tab, that have a tag AI in any of the responses").

**Why this priority**: Advanced use case that enhances existing filtering capabilities. Users can still accomplish goals with either filter independently.

**Independent Test**: Can be tested independently by combining `withTags` and `classificationTagsets` arguments and verifying both filters are applied.

**Acceptance Scenarios**:

1. **Given** callouts with various tags and flowStates, **When** I query `callouts(withTags: ["AI"], classificationTagsets: [{name: "flowState", tags: ["published"]}])`, **Then** I receive only published callouts containing "AI" tag
2. **Given** a callout with tag "AI" but flowState "draft", **When** I filter by tag "AI" AND flowState "published", **Then** the callout is excluded (must match both filters)

---

### Edge Cases

- **Empty CalloutsSet**: When querying tags on a CalloutsSet with no callouts, return empty array
- **No matching tags**: When filtering callouts by tags that don't exist, return empty array
- **Authorization**: Users can only see tags from calloutsSets they have READ access to; tags from inaccessible callouts are excluded
- **Null/undefined tagsets**: Handle callouts or contributions with missing or null tagset arrays gracefully (skip them)
- **Case sensitivity**: Tag filtering uses case-insensitive matching for classification tagsets but preserves original case in returned tags
- **Performance with large datasets**: When a CalloutsSet has hundreds of callouts and thousands of tags, query optimization ensures tags are only loaded when needed
- **Duplicate tags**: When the same tag appears multiple times in different tagsets within the same callout/contribution, it's counted once per appearance for frequency sorting
- **Invalid classification tagsets**: When provided classification filter references non-existent tagset names, no callouts match (returns empty)

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST provide a GraphQL field `tags` on the `CalloutsSet` type that returns an array of strings
- **FR-002**: System MUST aggregate all tags from callout framing profile tagsets and post contribution profile tagsets within a CalloutsSet
- **FR-003**: System MUST return tags sorted by frequency (descending) as primary sort, then alphabetically (ascending) as secondary sort
- **FR-004**: System MUST support optional `classificationTagsets` filter on the `tags` field to include only tags from callouts matching specified classifications
- **FR-005**: System MUST provide a `withTags` argument on the `callouts` field to filter callouts by tags present in their framing or contributions
- **FR-006**: System MUST include a callout in results if it contains at least one of the specified tags (OR logic)
- **FR-007**: System MUST respect authorization rules - only include tags and callouts the requesting user has READ permission to access
- **FR-008**: System MUST handle missing or null tagsets gracefully without errors
- **FR-009**: System MUST perform case-insensitive matching when filtering by classification tagsets
- **FR-010**: System MUST optimize database queries to load tag-related data only when tag filtering is requested (conditional loading)
- **FR-011**: System MUST allow combining `withTags` filter with existing `classificationTagsets` filter on the `callouts` field

### Key Entities

- **CalloutsSet**: Container for callouts; now exposes aggregated tags from its callouts and contributions
  - New field: `tags([classificationTagsets])` - returns aggregated tag list
  - Modified field: `callouts(...)` - now accepts `withTags` argument

- **Callout**: Individual collaboration tool within a CalloutsSet
  - Has framing profile with tagsets
  - Has classification tagsets for categorization
  - Has contributions that may contain tags

- **Contribution**: Content items (posts, whiteboards, links) within callouts
  - Post contributions have profile tagsets that contribute to tag aggregation

- **Tagset**: Collection of tags with a name and type
  - Contains array of tag strings
  - Used for both classification (flowState, etc.) and content tagging

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Users can retrieve a complete list of tags used across all accessible callouts and their contributions in under 2 seconds for typical CalloutsSet sizes (< 100 callouts)
- **SC-002**: Tag frequency sorting accurately reflects usage - tags appearing 10 times appear before tags appearing 5 times in 100% of queries
- **SC-003**: Filtering callouts by tags reduces returned results to only matching callouts with 100% accuracy
- **SC-004**: Tag cloud query with classification filtering returns results in under 3 seconds for CalloutsSet with 200 callouts
- **SC-005**: Users can discover popular topics by viewing tags sorted by frequency, enabling faster content navigation
- **SC-006**: Combined tag and classification filtering reduces result set by expected percentage (measurable via query analytics)
- **SC-007**: Authorization is respected - users never see tags from callouts they cannot access
- **SC-008**: Performance optimization ensures tag-related data is only loaded when needed (measurable via query profiling)

## Assumptions _(optional)_

- Tags are stored in tagsets on profiles of callouts and contributions
- Only post contributions have tags that should be aggregated (whiteboards and links are excluded as noted in code comments)
- Tag matching for filtering is case-sensitive for tag values but case-insensitive for classification tagset names
- Frequency-based sorting is based on total appearances across all callouts/contributions, not unique callout count
- Users understand that clicking a tag from a post should show the full call for posts (UI behavior, not API behavior)

## Out of Scope _(optional)_

- Pagination of tag results (all tags returned in single response)
- Tag suggestions or autocomplete functionality
- Tag creation or management through this feature
- Historical tag trending (only current snapshot)
- Tag-based analytics or reporting beyond frequency counts
- Support for tags from whiteboard or link contributions (currently not available in domain model)
- Server-side limit on maximum number of tags returned
- Tag normalization or deduplication (case variations treated as different tags)
- Client-side UI implementation of tag cloud visualization (separate repository concern)

## Dependencies _(optional)_

- Existing tagset infrastructure on callouts and contributions
- Authorization system for READ permission checking
- TypeORM query optimization for conditional relation loading
- GraphQL resolver and DTO infrastructure

## Related Issues/Specs _(optional)_

- **Primary Issue**: alkem-io/client-web#7100 - "Show tag cloud on top of knowledge base"
- **Reference Implementation**: Space > Subspaces tag cloud feature (mentioned as similar existing functionality)
- **Design Reference**: https://www.figma.com/design/JECbXDfUPlv9SDiTnGbJx0/Tag-Cloud-Knowledge-Base

## Notes _(optional)_

- This specification was written retroactively after implementation to document the delivered capability
- Implementation includes performance optimization via conditional query loading (tags only loaded when `withTags` argument is present)
- The feature enables UI implementation of tag cloud similar to existing Space > Subspaces functionality
- Classification filtering allows future extensibility for workflow-based tag analysis
- Implementation notes in code indicate potential future support for whiteboard/link/memo tags pending domain model updates

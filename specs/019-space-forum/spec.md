# Feature Specification: Space Forum

**Feature Branch**: `019-space-forum`
**Created**: 2025-12-10
**Status**: Draft
**Input**: User description: "I want a forum in the Space setup so that users can have easy conversations. Use the existing features from the platform forum, but within a Space on the home page."

## User Scenarios & Testing _(mandatory)_

## Clarifications

### Session 2025-12-10

- Q: Can guests (non-Space-members) view discussions in a Space Forum? → A: Follows Space visibility - If Space is public, forum is viewable by guests; if private, forum is hidden from non-members.
- Q: What default discussion categories should be pre-configured for new Space Forums? → A: Space-focused defaults - Categories: "general", "ideas", "questions", "announcements".
- Q: What should be the default privacy setting for new discussions in a Space Forum? → A: Authenticated - Only logged-in users can view/comment (matches platform forum default).

## User Scenarios & Testing _(mandatory)_

<!--
  IMPORTANT: User stories should be PRIORITIZED as user journeys ordered by importance.
  Each user story/journey must be INDEPENDENTLY TESTABLE - meaning if you implement just ONE of them,
  you should still have a viable MVP (Minimum Viable Product) that delivers value.

  Assign priorities (P1, P2, P3, etc.) to each story, where P1 is the most critical.
  Think of each story as a standalone slice of functionality that can be:
  - Developed independently
  - Tested independently
  - Deployed independently
  - Demonstrated to users independently
-->

### User Story 1 - View Space Forum on Home Page (Priority: P1)

As a Space member, I want to see a forum section on the Space home page so that I can immediately access ongoing discussions without navigating away from the main Space view.

**Why this priority**: This is the foundational capability - the forum must be visible and accessible on the Space home page for users to engage with it.

**Independent Test**: Can be fully tested by a Space member navigating to the Space home page and seeing the forum section displaying discussion topics.

**Acceptance Scenarios**:

1. **Given** I am a member of a Space, **When** I navigate to the Space home page, **Then** I see a forum section displaying all discussions organized by category.
2. **Given** the forum contains discussions, **When** I view the forum on the home page, **Then** I see discussion titles, authors, last activity timestamps, and comment counts.
3. **Given** the forum has no discussions yet, **When** I view the forum on the home page, **Then** I see an empty state with guidance on how to start a discussion.

---

### User Story 2 - Create New Discussion Topic (Priority: P1)

As a Space member, I want to create a new discussion topic in the Space forum so that I can start conversations with other community members about topics relevant to our Space.

**Why this priority**: Creating discussions is equally critical as viewing - without this, the forum has no user-generated content and provides no value.

**Independent Test**: Can be fully tested by a Space member creating a discussion topic with a title and initial message, then confirming it appears in the forum listing.

**Acceptance Scenarios**:

1. **Given** I am a member of a Space with permission to create discussions, **When** I create a new discussion with a title and initial message, **Then** the discussion is saved and visible in the forum.
2. **Given** I am creating a discussion, **When** I submit without a title, **Then** I receive a validation error requiring a title.
3. **Given** I have created a discussion, **When** I view the forum, **Then** my discussion appears with my name as the author and the current time as creation date.

---

### User Story 3 - Comment on Discussion (Priority: P1)

As a Space member, I want to comment on existing discussions so that I can participate in conversations and share my thoughts with other members (mirroring the platform forum's comment functionality).

**Why this priority**: Comments are essential for conversations - a forum without comment capability is just a bulletin board, not a discussion space.

**Independent Test**: Can be fully tested by a Space member opening an existing discussion and posting a comment, then confirming the comment appears in the discussion thread.

**Acceptance Scenarios**:

1. **Given** I am viewing a discussion, **When** I submit a comment, **Then** my comment appears in the discussion thread with my name and timestamp.
2. **Given** a discussion has multiple comments, **When** I view the discussion, **Then** I see all comments in chronological order.
3. **Given** I submit an empty comment, **When** I try to post, **Then** I receive a validation error.

---

### User Story 4 - Categorize Discussions (Priority: P2)

As a Space member, I want to assign categories to discussions so that I can organize topics and help others find relevant conversations more easily.

**Why this priority**: Categories improve discoverability and organization but are not required for basic forum functionality.

**Independent Test**: Can be fully tested by creating a discussion with a category, then filtering or browsing by that category.

**Acceptance Scenarios**:

1. **Given** I am creating a discussion, **When** I select a category, **Then** the discussion is created with that category label.
2. **Given** the forum has discussions in multiple categories, **When** I filter by a specific category, **Then** I see only discussions in that category.
3. **Given** I am a Space Admin, **When** I manage forum settings, **Then** I can configure which categories are available for the Space forum.

---

### User Story 5 - Moderate Forum Content (Priority: P2)

As a Space Admin, I want to moderate forum discussions so that I can maintain a healthy and constructive conversation environment within the Space.

**Why this priority**: Moderation is important for community health but is secondary to core discussion functionality.

**Independent Test**: Can be fully tested by an Admin editing or removing inappropriate content and verifying the changes take effect.

**Acceptance Scenarios**:

1. **Given** I am a Space Admin, **When** I view any discussion, **Then** I have options to edit or remove the discussion.
2. **Given** I am a Space Admin, **When** I remove a discussion, **Then** the discussion is no longer visible in the forum.
3. **Given** I am a Space Admin, **When** I edit a discussion or reply, **Then** the content is updated and marked as edited.

---

### User Story 6 - Receive Discussion Notifications (Priority: P3)

As a Space member, I want to receive notifications about forum activity so that I stay informed about conversations I'm interested in without constantly checking the forum.

**Why this priority**: Notifications enhance engagement but are not required for the forum to function.

**Independent Test**: Can be fully tested by a user subscribing to a discussion, another user replying, and confirming the first user receives a notification.

**Acceptance Scenarios**:

1. **Given** I have started a discussion, **When** someone replies, **Then** I receive a notification.
2. **Given** I have replied to a discussion, **When** there are new replies after mine, **Then** I receive notifications for subsequent activity.
3. **Given** I want to stop receiving notifications, **When** I unsubscribe from a discussion, **Then** I no longer receive notifications for that discussion.

---

### Edge Cases

- What happens when a user tries to access a forum in a Space they are not a member of?
  - User should be denied access with an appropriate authorization error.
- What happens when a discussion author leaves the Space?
  - The discussion and replies should remain visible; authorship should still display the original author name.
- What happens when a Space is deleted?
  - All forum discussions within that Space should be deleted as part of the cascade.
- What happens when two users post at the same time?
  - Both posts should be saved successfully with accurate timestamps.
- What happens with very long discussion threads (hundreds of replies)?
  - The system should paginate replies to maintain performance.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST provide a Forum section visible on each Space home page.
- **FR-002**: System MUST allow authorized Space members to create new Discussions within the Space Forum (reusing existing Discussion creation flow).
- **FR-003**: System MUST allow authorized Space members to comment on existing Discussions (via the Discussion's Room).
- **FR-004**: System MUST display Discussions with author information, creation date, and last activity date.
- **FR-005**: System MUST display comment count for each Discussion in the forum listing.
- **FR-006**: System MUST support assigning categories to Discussions (using Forum's discussionCategories).
- **FR-007**: System MUST allow filtering Discussions by category.
- **FR-008**: System MUST allow Space Admins to configure available discussion categories for their Space Forum. Default categories for new Space Forums: "general", "ideas", "questions", "announcements".
- **FR-009**: System MUST allow Space Admins to edit or remove any Discussion.
- **FR-010**: System MUST allow Space Admins to delete comments.
- **FR-011**: System MUST allow Discussion authors to edit their own Discussions.
- **FR-012**: System MUST validate that Discussion titles (profile displayName) are not empty.
- **FR-013**: System MUST validate that comments are not empty.
- **FR-014**: System MUST send notifications to Discussion participants when new comments are posted.
- **FR-015**: System MUST paginate Discussion comments when the count exceeds a threshold.
- **FR-016**: System MUST enforce Space membership-based authorization for Forum access. Forum visibility follows Space visibility: public Spaces expose the forum to guests (read-only), private Spaces hide the forum from non-members.
- **FR-017**: System MUST cascade-delete the Forum and its Discussions when a Space is deleted.

### Key Entities

This feature reuses the existing Forum and Discussion patterns from the platform level:

- **Forum**: The existing Forum entity will be associated with a Space (in addition to the platform-level forum). Contains discussions and configurable discussion categories. Each Space has one Forum.
- **Discussion**: The existing Discussion entity (with profile, category, privacy, comments Room, createdBy). Discussions belong to a Forum and inherit the Forum's authorization context.
- **Room**: The existing Room entity for discussion comments (messages). Provides real-time messaging capabilities.

**Key Relationships**:
- Space → Forum (one-to-one): Each Space owns one Forum displayed on its home page.
- Forum → Discussion (one-to-many): A Forum contains multiple Discussions.
- Discussion → Room (one-to-one): Each Discussion has a comments Room for threaded conversation.

### Assumptions

- The feature reuses the existing `Forum`, `Discussion`, and `Room` entities from the platform forum implementation.
- Discussion categories for Space forums can be customized per Space (similar to platform forum categories but Space-specific).
- Privacy settings for discussions follow the existing `ForumDiscussionPrivacy` enum. Default privacy for new discussions is "authenticated" (only logged-in users can view/comment).
- The forum will be displayed as a section on the Space home page, not as a separate page.
- Authorization will integrate with existing Space role patterns - Space members can view/create, Space Admins can moderate.
- Notifications will integrate with the existing notification infrastructure used by the platform forum.
- The existing `DiscussionService`, `ForumService`, and `RoomService` will be extended or reused for Space-scoped forums.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Space members can create a new discussion topic in under 30 seconds.
- **SC-002**: Space members can view and navigate the forum with all discussions loading in under 2 seconds.
- **SC-003**: Discussion threads with up to 100 replies load in under 3 seconds.
- **SC-004**: 90% of Space members who visit the forum can successfully post a discussion or reply on their first attempt.
- **SC-005**: Space Admins can moderate (edit/remove) content in under 3 actions.
- **SC-006**: Discussion participants receive notifications within 1 minute of new activity.

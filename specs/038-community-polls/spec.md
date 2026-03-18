# Feature Specification: Community Polls & Voting

**Feature Branch**: `038-community-polls`
**Created**: 2026-02-28
**Status**: Draft
**Input**: User description: "Create polls to gather community input — opinions on decisions, preferences, or availability. Contributors vote single or multiple selections based on facilitator settings. Poll creators receive notifications on new votes. Everyone can see who voted for what. Voters can update their selections. Poll creators can edit poll options. Results remain in the configured option order."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Creating a Poll (Priority: P1)

Any user with permission to create a Post (Callout) in a space can add a poll to it. A poll is additional content attached to a Callout's Framing — the Callout's question or description serves as the poll prompt, and the poll options and voting settings are attached to that same Callout. The poll is immediately visible and open for voting to all space members once the Callout is created or updated.

**Why this priority**: Without poll creation, no other story is possible. This is the entry point for all poll-related value and is the minimum deliverable for an MVP.

**Independent Test**: Any user who can create a Callout in the space can add a poll with at least two options and configure `minResponses`/`maxResponses`. The poll is visible to members and accepting votes immediately.

**Acceptance Scenarios**:

1. **Given** a user with Callout creation rights is in a collaboration space, **When** they create a Callout (Post) and add a poll with at least two options and `minResponses = 1, maxResponses = 1`, **Then** the poll appears in the space visible to all members, ready to accept votes.
2. **Given** a user is adding a poll to a Callout, **When** they set `maxResponses = 0` (unlimited), **Then** members will be able to select more than one option when voting.
3. **Given** a user is adding a poll to a Callout, **When** they submit with fewer than two options, **Then** the system prevents submission and informs them that at least two options are required.
4. **Given** a Callout with a poll has been created, **When** any space member views the collaboration space, **Then** they can see the poll question, all options, and the response count settings.

---

### User Story 2 - Voting on a Poll (Priority: P2)

A community member wants to express their preference or availability by voting on a poll. In single-select mode they pick exactly one option; in multi-select mode they choose one or more options. Their selections are recorded immediately and reflected in the running results.

**Why this priority**: Voting is the core purpose of the feature — without it, polls have no value. This story delivers the primary interaction for the majority of users.

**Independent Test**: A member can open a poll, cast a vote within the poll's configured response count range, and see their vote reflected in the results immediately.

**Acceptance Scenarios**:

1. **Given** a member views an open poll with `maxResponses = 1`, **When** they select one option and submit their vote, **Then** their vote is recorded and the results update to reflect their selection.
2. **Given** a member views an open poll with `maxResponses = 0` (unlimited), **When** they select two or more options and submit, **Then** all selected options register their vote and the results update accordingly.
3. **Given** a member views an open poll with `maxResponses = 1`, **When** they attempt to submit more than one option, **Then** the system rejects the submission and informs them only one selection is allowed.
4. **Given** a member has not yet voted on a poll, **When** they view the poll, **Then** they can see the options and cast their vote.
5. **Given** a member attempts to vote on a poll without being a community member, **When** they try to submit a vote, **Then** the system rejects the action and informs them they must be a member to vote.

---

### User Story 3 - Viewing Results with Vote Transparency (Priority: P3)

A poll creator or community member wants to see how the community has voted, including which members voted for each option, while keeping options in the configured order.

**Why this priority**: Transparency and results are what make a poll actionable. Without visible results, the poll data cannot be used to inform decisions.

**Independent Test**: After votes are cast, any space member can view results with options returned in `sortOrder`; when the visibility gate is passed and `resultsDetail = FULL`, they can view the list of voters per option.

**Acceptance Scenarios**:

1. **Given** at least one vote has been cast on a poll, **When** any space member views the poll results, **Then** they see all options in `sortOrder` (ascending), with the vote count displayed for each option.
2. **Given** a poll has received votes, **When** a space member views an option's voter list and the visibility gate is passed, **Then** they can see the names (or identities) of all members who voted for that option.
3. **Given** two or more options have the same number of votes, **When** results are displayed, **Then** options still remain in `sortOrder` (ascending), without any vote-based reordering.
4. **Given** a poll has zero votes, **When** any member views it, **Then** all options are shown with zero counts and no voter list is shown.
5. **Given** a space member has not yet voted, **When** they view the results, **Then** they can still see the current results before casting their own vote.

---

### User Story 4 - Changing a Vote (Priority: P4)

A community member who has already voted wants to update their selections — for example, they changed their mind, realized they made a mistake, or availability changed for a date-scheduling poll.

**Why this priority**: Allowing vote changes reduces friction and ensures the data collected reflects the community's current thinking, not just their first impression.

**Independent Test**: A member who previously voted can open the poll, update their selections, and see the results adjust to reflect the new vote (old selections removed, new selections added).

**Acceptance Scenarios**:

1. **Given** a member has previously voted on a poll, **When** they view the poll again, **Then** they see their current selections clearly highlighted.
2. **Given** a member views a poll where they have voted, **When** they change their selections and submit, **Then** their previous vote is replaced by the new selection(s) and the results update accordingly.
3. **Given** a member in a poll with `maxResponses = 1` switches from option A to option B, **When** they submit the change, **Then** option A loses one vote, option B gains one vote, and the ranked results update.
4. **Given** a member in a poll with `maxResponses = 0` wants to change their selections, **When** they submit a new complete set of selections (e.g., previously voted A+B+C, now submitting B+C+D), **Then** their previous vote (A+B+C) is replaced entirely by the new vote (B+C+D), and the results update accordingly (A loses one vote, D gains one vote).
5. **Given** a member has voted on an open poll, **When** they click the remove vote button or invoke `removePollVote(pollID)`, **Then** their vote is entirely deleted, the poll options' vote counts decrement accordingly, their `myVote` status is cleared, and they are returned to the unvoted state with the ability to vote again.
6. **Given** a member has not voted on a poll, **When** they attempt to invoke `removePollVote(pollID)`, **Then** the system returns a validation error indicating they have no vote to remove and prevents the operation.
7. **Given** a poll is closed, **When** a member attempts to remove their vote via `removePollVote(pollID)`, **Then** the system returns a validation error indicating that votes cannot be removed from a closed poll.

---

### User Story 5 - Editing Poll Options (Priority: P5)

Any user with Callout edit permissions (the Callout creator, a space admin, or a facilitator) needs to update a poll after it has been published — adding a new option they forgot, correcting a typo in an existing option, or removing an option that is no longer valid.

**Why this priority**: Real-world polls are often refined after initial publication. Allowing edits avoids having to delete and recreate polls, preserving any votes already collected.

**Independent Test**: A user with Callout edit permissions can add a new option to a published poll, edit the text of an existing option, or remove an option, and all changes are immediately visible to all members.

**Acceptance Scenarios**:

1. **Given** a user with Callout edit permissions views a published poll, **When** they add a new option, **Then** the new option appears at the end of the option list and is immediately available for voting.
2. **Given** a user with Callout edit permissions edits the text of an existing option that has received votes, **When** they save the change, **Then** all members see the updated text, all votes containing that option are deleted entirely, and every affected voter receives a notification informing them their vote has been removed due to the option text change and inviting them to re-vote.
3. **Given** a user with Callout edit permissions removes an option that has received votes, **When** they confirm the removal, **Then** the option is deleted, all votes containing that option are deleted entirely, and every affected voter receives a notification informing them their vote has been removed and inviting them to re-vote.
4. **Given** a user with Callout edit permissions reorders poll options (e.g., moves option 3 to position 1), **When** they save, **Then** members see the new order; this does not affect vote counts.
5. **Given** a member without Callout edit permissions views a poll, **When** they inspect the poll, **Then** no edit controls are available to them.

---

### User Story 6 - Poll Activity Notifications: Creator Alerts (Priority: P6)

The Callout creator (the user who created the Callout containing the poll) wants to stay informed when community members vote, so they can monitor engagement and know when enough input has been gathered to make a decision.

**Why this priority**: Notifications close the feedback loop for Callout creators, ensuring they are aware of voting activity without having to manually check the poll repeatedly.

**Independent Test**: When a member casts a new vote on a poll, the Callout creator receives a notification identifying the poll and indicating a new vote was received.

**Acceptance Scenarios**:

1. **Given** a member casts a new vote on a poll, **When** the vote is recorded, **Then** the Callout creator receives a notification indicating a new vote was submitted on their poll.
2. **Given** a member updates (changes) their existing vote, **When** the change is recorded, **Then** the Callout creator receives a notification that a vote was updated on their poll.
3. **Given** a Callout creator has opted out of poll vote notifications in their notification preferences, **When** a vote is cast, **Then** no notification is sent to that creator.
4. **Given** the Callout creator votes on their own poll, **When** the vote is recorded, **Then** they do not receive a self-notification.

---

### User Story 6b - Poll Activity Notifications: Voter Alerts (Priority: P6)

Community members who have already voted on a poll want to stay informed about activity that affects their participation — whether someone else has voted, whether the poll has changed in a way that doesn't affect their vote, or whether an option they voted for has been removed or had its text changed (which deletes their vote entirely and invites them to re-vote).

**Why this priority**: Voters have an active stake in poll outcomes. Keeping them informed about activity on polls they participated in closes the feedback loop and prompts timely re-engagement when their vote is invalidated by option changes.

**Independent Test**: (a) After Member B votes, when Member C casts a vote, Member B receives a notification indicating new voting activity on a poll they participated in. (b) After Member B votes, when the poll creator adds a new option, Member B receives a notification that the poll was modified. (c) After Member B votes for Option A, when the poll creator changes Option A's text, Member B's vote is deleted and they receive a notification informing them their vote was removed and inviting them to re-vote.

**Acceptance Scenarios**:

1. **Given** Member B has voted on a poll, **When** Member C casts a vote on the same poll, **Then** Member B receives a notification indicating new voting activity on a poll they participated in (FR-020b: `collaborationPollVoteCastOnPollIVotedOn`). Member C does not receive a notification for their own vote.
2. **Given** Member B has voted on a poll, **When** the poll creator adds a new option or reorders existing options, **Then** Member B receives a notification informing them the poll has been updated (FR-020d: `collaborationPollModifiedOnPollIVotedOn`).
3. **Given** Member B has voted for Option A, **When** the poll creator edits the text of Option A, **Then** Member B's vote is deleted entirely and Member B receives a notification informing them their vote has been removed due to the option text change and inviting them to re-vote (FR-020c: `collaborationPollVoteAffectedByOptionChange`). Members who voted only for other options receive a poll-modified notification (FR-020d) instead.
4. **Given** Member B has voted for Option A, **When** the poll creator removes Option A, **Then** Member B's vote is deleted entirely and Member B receives a notification informing them their vote has been removed due to the option being removed and inviting them to re-vote (FR-020c: `collaborationPollVoteAffectedByOptionChange`). Members who voted only for other options receive a poll-modified notification (FR-020d) instead.
5. **Given** Member B has opted out of poll voter notifications in their notification preferences, **When** any of the above notification-triggering events occur, **Then** no notification is sent to Member B for those opted-out channels.

---

### User Story 7 - Real-Time Poll Subscriptions (Priority: P7)

A community member viewing a poll in their browser wants the poll display to update in real time when another member votes or when a facilitator modifies poll options — without requiring a manual page refresh.

**Why this priority**: Real-time updates close the feedback loop for active viewers, making polls feel collaborative and live. Without subscriptions, users must refresh manually and may miss activity, reducing engagement.

**Independent Test**: Member A opens a poll in their browser and subscribes via GraphQL subscription. Member B casts a vote. Member A's subscription receives the updated poll with new vote counts (respecting visibility settings). Separately: a facilitator adds an option to the poll; Member A's subscription receives the updated option list.

**Acceptance Scenarios**:

1. **Given** Member A is viewing a poll and subscribed to `pollVoteUpdated`, **When** Member B casts a vote, **Then** Member A receives the updated Poll object with new vote counts, percentages, and voter lists as permitted by the poll's `resultsVisibility` and `resultsDetail` settings.
2. **Given** Member A is viewing a poll with `resultsVisibility = HIDDEN` and has NOT voted, **When** Member B casts a vote, **Then** Member A's subscription does NOT fire — no event is received (vote events are suppressed for non-voters when visibility is HIDDEN).
3. **Given** Member A is viewing a poll with `resultsVisibility = HIDDEN` and HAS voted, **When** Member B casts a vote, **Then** Member A receives the updated Poll object with results visible (because they have voted, the visibility gate is passed).
4. **Given** Member A is viewing a poll with `resultsVisibility = TOTAL_ONLY` and has NOT voted, **When** Member B casts a vote, **Then** Member A receives the updated Poll with only `totalVotes` populated; per-option counts, percentages, and voters remain null.
5. **Given** Member A is subscribed to `pollOptionsChanged` on a poll, **When** the facilitator adds a new option, **Then** Member A receives the updated Poll with the new option in the options list.
6. **Given** Member A is subscribed to `pollOptionsChanged` on a poll, **When** the facilitator edits option text (which revokes affected votes), **Then** Member A receives the updated Poll with the new option text and updated vote data; if Member A's own vote was revoked, `myVote` is null.
7. **Given** Member A is subscribed to `pollOptionsChanged` on a poll, **When** the facilitator removes an option, **Then** Member A receives the updated Poll with the option removed from the list; if Member A's own vote was revoked, `myVote` is null.
8. **Given** Member A is subscribed to `pollOptionsChanged` on a poll, **When** the facilitator reorders options, **Then** Member A receives the updated Poll with options in the new `sortOrder`.
9. **Given** a user without READ access to the poll attempts to subscribe, **When** they send the subscription request, **Then** the server rejects the subscription with an authorization error.
10. **Given** Member A subscribes to a poll, **When** no events have occurred yet, **Then** no initial catch-up payload is sent — only future events are delivered (consistent with all other subscriptions in the platform).

---

### Edge Cases

- What happens if a poll option is removed while a member is in the process of voting? The system should prevent submission with the removed option and inform the member the option is no longer available, prompting them to review their selections.
- What happens if two members vote simultaneously on the last vote update, causing a visual race condition? The system should ensure the final displayed count is always consistent with the recorded votes.
- What happens if a poll creator deletes the entire poll? All votes associated with the poll are removed and voters are no longer shown the poll.
- What happens if a member's account is removed from the space after voting? Their vote remains in the results but their identity is displayed as "Former member" or anonymized.
- What happens if a member's account is deleted from the platform after voting? Their votes are removed from the poll results.
- What happens if a poll is created with duplicate option text? The system should warn the creator that two options have identical text (via a validation warning message returned in the GraphQL response) but allow creation at the creator's discretion.
- What happens in multi-select mode if a voter selects no options and submits? The system should require at least one selection before allowing submission.
- What happens if a member invokes `removePollVote` twice in rapid succession? The system should prevent the second removal with an appropriate error indicating no vote exists to remove.

---

## Requirements _(mandatory)_

### Functional Requirements

**Poll Lifecycle**

- **FR-001**: Any user with permission to create a Callout (Post) in a space MUST be able to add a poll to that Callout. A poll consists of an optional title (max 512 chars), a minimum of two selectable options (each option text max 512 chars), and response count settings stored in a `settings` object containing `minResponses` and `maxResponses`, and is attached to the Callout's Framing.
- **FR-002**: Poll creators MUST be able to configure how many options a voter may select by setting `settings.minResponses` (minimum selections required, must be ≥ 1) and `settings.maxResponses` (maximum selections allowed, must be ≥ 0 where 0 means unlimited). Typical configurations: single-choice (`minResponses = 1, maxResponses = 1`), open multi-choice (`minResponses = 1, maxResponses = 0`).
- **FR-003**: A newly created poll MUST be immediately visible and open for voting to all space members.
- **FR-004**: Any user with Callout edit permissions MUST be able to add new options to a published poll at any time.
- **FR-005**: Any user with Callout edit permissions MUST be able to edit the text of any existing poll option. When the text of an option is changed, all votes containing that option MUST be deleted entirely, and each affected voter MUST receive a notification informing them their vote has been removed due to the option text change and inviting them to re-vote.
- **FR-006**: Any user with Callout edit permissions MUST be able to remove a poll option; the system MUST prevent removal if the poll would have fewer than 2 remaining options (polls must always contain at least 2 options). When an option with existing votes is removed, all votes containing that option MUST be deleted entirely, and each affected voter MUST receive a notification informing them their vote has been removed and inviting them to re-vote.
- **FR-007**: Any user with Callout edit permissions MUST be able to reorder poll options; reordering does not affect vote counts and changes only option display order.

**Voting**

- **FR-008**: Any space member MUST be able to cast a vote on an open poll.
- **FR-009**: The system MUST enforce that the number of selected options in a vote submission is at least `settings.minResponses` and at most `settings.maxResponses` (or unlimited when `settings.maxResponses = 0`). Regardless of `maxResponses`, the absolute maximum number of selectable options per vote is 10 (enforced at the DTO validation layer).
- **FR-010**: The system MUST enforce at most one concurrent Vote record per member per Poll. A subsequent `castPollVote` call replaces the existing vote entirely (no historical records retained) per FR-012.
- **FR-011**: A voter MUST NOT be able to select the same option more than once in a single vote submission.
- **FR-012**: Voters MUST be able to update their vote at any time while the poll is open by submitting a complete new set of selected options. The system MUST replace the previous vote entirely (no partial modifications allowed), and MUST validate the new selection set against the poll's `settings.minResponses` and `settings.maxResponses` constraints.
- **FR-012a**: Voters MUST be able to remove their vote entirely from a poll at any time while the poll is open. The `removePollVote` mutation MUST fail with a validation error if the poll is closed (symmetric with the cast-vote guard). When a vote is removed, all selections associated with that vote MUST be deleted, poll results MUST be updated to decrement vote counts for each selected option, and the voter's `myVote` status MUST reflect no active vote. The `removePollVote(pollID: UUID!)` mutation MUST return the updated Poll object reflecting the vote removal, poll results visibility rules apply on the returned object.
- **FR-012b**: The `removePollVote` mutation MUST fail with a validation error if the invoking user has not voted on the specified poll. The error message MUST be user-friendly and indicate the user has no vote to remove.
- **FR-013**: Non-members of a space MUST NOT be able to cast votes on polls within that space.

**Results & Transparency**

- **FR-014**: Poll results visibility MUST be governed by the poll's `settings.resultsVisibility` setting: `HIDDEN` (results hidden until the viewer has voted), `TOTAL_ONLY` (only total vote count before voting), or `VISIBLE` (always visible, default).
- **FR-015**: Poll options MUST always be returned in `sortOrder ASC` (configured option order), regardless of result visibility or whether the viewer has voted. Vote counts, percentages, and voters are visibility/detail-gated independently from ordering.
- **FR-016**: The level of detail shown in results MUST be governed by the poll's `settings.resultsDetail` setting: `PERCENTAGE` (only percentage per option), `COUNT` (vote count per option, no voter identities), or `FULL` (counts + voter list, default).
- **FR-017**: When `resultsDetail = FULL` and the visibility gate is passed per `settings.resultsVisibility`, any space member MUST be able to view the list of members who voted for a specific option.
- **FR-018**: A member's current vote selections MUST be visually distinguishable from unselected options when they view a poll they have already voted on.
- **FR-019**: When a member’s account is deleted from the platform, all Poll votes authored by that member MUST be deleted so their votes no longer appear in poll results.

**Notifications**

- **FR-020**: The system MUST deliver notifications for four distinct poll-related events, each controlled by dedicated preference fields under `spaceNotificationChannels`:
- **FR-020a**: When a member casts or updates a vote on a poll, the Callout creator MUST receive a notification (except if the voter is the creator himself) indicating a vote was cast or updated on their poll. When a member removes their vote via `removePollVote`, the Callout creator does NOT receive a notification for the removal (only for cast/update events). Controlled by preference field `collaborationPollVoteCastOnOwnPoll`.
- **FR-020b**: When any member (excluding the member voting) casts or updates a vote on a poll where another member has previously voted, the recipient MUST receive a notification indicating new voting activity on a poll they participate in. When a member removes their vote, other voters on that poll do NOT receive a notification for the removal. When the Callout creator has also voted on the poll, they MUST NOT receive this notification for the same vote event where FR-020a was already dispatched to them — FR-020a takes precedence and FR-020b is suppressed for the creator on that event to prevent duplicate notifications. Controlled by preference field `collaborationPollVoteCastOnPollIVotedOn`.
- **FR-020c**: When a poll option that the recipient voted for is removed or has its text edited (both actions cause the vote to be deleted), the recipient MUST receive a notification informing them their vote has been removed and inviting them to re-vote. Controlled by preference field `collaborationPollVoteAffectedByOptionChange`.
- **FR-020d**: When a poll where the recipient has voted is modified in ways that do not affect the recipient's vote (options added, option text changed for options the recipient did not vote for, poll reordered, options removed where the recipient did not vote for the removed option, etc.), the recipient MUST receive a notification informing them the poll has been updated. Controlled by preference field `collaborationPollModifiedOnPollIVotedOn`. Note: When an option is removed, voters whose votes are affected (they voted for the removed option) receive `collaborationPollVoteAffectedByOptionChange` instead; voters whose votes are unaffected receive this notification.

**Visibility Settings**
- **FR-021**: Four new preference fields MUST be added under the existing `spaceNotificationChannels` setting to allow granular control over poll-related notifications. These fields are scoped to poll notifications only and do not create a new preference category outside the existing notification settings structure.
- **FR-021a**: A new preference field `collaborationPollVoteCastOnOwnPoll: IUserSettingsNotificationChannels!` MUST be added to control notifications when a member votes on a poll where the user is the Callout creator. Channels include in-app, email, or both.
- **FR-021b**: A new preference field `collaborationPollVoteCastOnPollIVotedOn: IUserSettingsNotificationChannels!` MUST be added to control notifications when any member (including the viewer) votes on a poll where the user has previously voted.
- **FR-021c**: A new preference field `collaborationPollModifiedOnPollIVotedOn: IUserSettingsNotificationChannels!` MUST be added to control notifications when a poll is modified in ways that do not affect the user's vote (option added, option text changed for options the user did not vote for, poll reordered, etc.) for a poll where the user has previously voted.
- **FR-021d**: A new preference field `collaborationPollVoteAffectedByOptionChange: IUserSettingsNotificationChannels!` MUST be added to control notifications when a poll option that the user voted for is removed or has its text edited, directly affecting the user's recorded vote by deleting it. This triggers a notification informing the user their vote has been removed and inviting them to re-vote.
- **FR-022 (revised)**: Callout creators MUST NOT receive a notification when they vote on their own poll (scoped to FR-021a).
- **FR-023**: The poll data model MUST support a "status" field (e.g., open, closed) per poll, to allow future poll closing without migration.
- **FR-024**: Poll creators MUST be able to configure a `settings.resultsDetail` setting at poll creation time, choosing from `PERCENTAGE` (only percentage per option), `COUNT` (vote count per option, no voter identities), or `FULL` (counts + voter list). The default MUST be `FULL`.
- **FR-025**: The entire `settings` object (containing `minResponses`, `maxResponses`, `resultsVisibility`, and `resultsDetail`) MUST be immutable after poll creation — any attempt to change any field within it after the poll exists MUST be rejected.
- **FR-026**: The server MUST expose a derived `canSeeDetailedResults` boolean on the Poll type so clients can determine with a single field check whether the visibility gate is passed for the current user.

- **FR-027**: The poll data model MUST support a "deadline" field per poll (even if auto-close by deadline is not implemented in this iteration), to avoid future breaking changes.

**Real-Time Subscriptions**

- **FR-028**: The system MUST expose a `pollVoteUpdated(pollID: UUID!)` GraphQL subscription that fires whenever a vote is cast or updated on the specified poll. The subscription return type MUST be `PollVoteUpdatedSubscriptionResult`, a wrapper object containing `pollEventType` and `poll` (the updated `Poll`). Authorization: the subscriber MUST have `READ` privilege on the poll.
- **FR-029**: The system MUST expose a `pollOptionsChanged(pollID: UUID!)` GraphQL subscription that fires whenever poll options are added, edited, removed, or reordered. The subscription return type MUST be `PollOptionsChangedSubscriptionResult`, a wrapper object containing `pollEventType` and `poll` (the updated `Poll`). Authorization: the subscriber MUST have `READ` privilege on the poll.
- **FR-030**: Subscription payloads MUST respect the poll's `resultsVisibility` and `resultsDetail` settings per subscriber. The existing field resolvers (which apply visibility/detail filtering based on the current user's context) MUST be reused — no separate filtering logic. Specifically:
  - When `resultsVisibility = HIDDEN` and the subscriber has NOT voted: vote events (`pollVoteUpdated`) MUST be suppressed entirely (the subscriber receives nothing); option change events (`pollOptionsChanged`) MUST deliver updated options only with no vote status data.
  - When `resultsVisibility = TOTAL_ONLY` and the subscriber has NOT voted: vote events deliver only `totalVotes`; option change events deliver updated options and `totalVotes`.
  - When `resultsVisibility = VISIBLE` or the subscriber HAS voted: events deliver data according to `resultsDetail` (PERCENTAGE, COUNT, or FULL).
  - When the subscriber's own vote is revoked by an option change, `myVote` MUST be null in the delivered payload.
- **FR-031**: Each internal PubSub subscription payload MUST include an `eventID` string (unique per event) for traceability, following the `BaseSubscriptionPayload` pattern used by all other subscriptions in the platform. The GraphQL subscription result types do not need to expose `eventID` and MUST include a `pollEventType` field indicating the event category (`POLL_VOTE_UPDATED` or `POLL_OPTIONS_CHANGED`) for client-side routing.

### Key Entities

- **Callout (Post)**: An existing collaboration artifact in a space. A poll is optional additional content attached to a Callout's Framing — a Callout may or may not have a poll.
- **Poll**: Additional content on a Callout's Framing. Holds an optional `title` (max 512 chars; defaults to an empty string when omitted), a `settings` object (JSONB) containing `minResponses` and `maxResponses` integers that define how many options a voter must/may select plus `resultsVisibility` and `resultsDetail` enums, status (open/closed), an ordered list of Poll Options, and a future-compatibility deadline field. A Callout Framing has at most one Poll.
- **Poll Option**: An individual selectable choice within a Poll. Has display text (max 512 chars) and an ordering value. Associated with zero or more Votes.
- **Vote**: A record of one space member's current selection(s) on a specific Poll. Belongs to exactly one member. References between `minResponses` and `maxResponses` Poll Options. Updated in place when the voter changes their selections — no historical vote records are retained. Records the timestamp of the last update. A member has at most one Vote per Poll. A change event is emitted on each update to support future subscription integration without requiring stored history.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A facilitator can create a new poll with at least two options and publish it in under 2 minutes, with no additional steps required before members can vote.
- **SC-002**: A community member can find, read, and cast their vote on an open poll in under 60 seconds.
- **SC-003**: 100% of votes are immediately reflected in the displayed results — no vote is lost or misattributed.
- **SC-004**: Poll results always display options in `sortOrder` order (ascending). Results reflect the current state at the time the poll is loaded, the page is refreshed, or a real-time subscription event is received. Subscribers viewing a poll receive live updates when votes are cast or options change, respecting the poll's `resultsVisibility` and `resultsDetail` settings.
- **SC-005**: Poll creators receive a notification within 60 seconds of a vote being cast on their poll.
- **SC-006**: A voter can successfully update their vote and see their previous selection removed and new selection recorded, all within a single interaction.
- **SC-006a**: A voter can successfully remove their vote and see their selections removed from the results and their vote status cleared, within a single interaction.
- **SC-007**: When `resultsDetail = FULL` and the visibility gate is passed, all space members can view the full voter list per option without additional permissions or steps.
- **SC-008**: Polls support a minimum of 20 options without degradation in display or voting performance.

## Assumptions

- A Poll is additional content on a Callout's Framing (Post). Any user with permission to create a Callout in the space can add a poll to it. Poll creation permissions are identical to Callout creation permissions for that space — no separate permission concept is introduced.
- "Vote multiple times" in the acceptance criteria means selecting multiple options in a single vote submission (when `settings.maxResponses > 1` or `settings.maxResponses = 0`), not submitting several independent votes on the same poll.
- Vote transparency (seeing who voted for what) depends on the poll's `settings.resultsDetail` setting: `FULL` shows voter identities, `COUNT` shows only vote counts, `PERCENTAGE` shows only percentages.
- Results availability before voting depends on `settings.resultsVisibility`: `VISIBLE` (default) shows everything, `TOTAL_ONLY` shows only the total vote count, `HIDDEN` shows nothing until the viewer votes.
- Both `resultsVisibility` and `resultsDetail` are set at creation time within the `settings` object and cannot be changed afterwards.
- A voter cannot submit a vote with zero selections; at least one option must be chosen.
- Deleting an entire poll also deletes all associated votes permanently.
- When a member leaves a space, their votes remain in the poll results but their displayed identity follows the platform's standard handling of former-member identities.
- When a member's account is deleted from the platform, their poll votes are removed from poll results.
- Poll option ordering in the creation form determines the display order, and results keep the same `sortOrder` ordering.
- The notification requirement ("poll creator notified on new vote") applies to both the initial vote and any subsequent vote update by the same voter.
- Polls are not time-limited in this iteration; they remain open indefinitely until manually closed (future feature).

## Clarifications

### Session 2026-03-02

- Q: How should poll results update after a new vote is cast — on-demand (manual refresh), background polling, or push subscription? → A: Results update on page load, manual refresh, and via real-time GraphQL subscriptions. Two subscriptions are exposed: `pollVoteUpdated` (fires on vote cast/update) and `pollOptionsChanged` (fires on option add/edit/remove/reorder). Subscription payloads respect the poll's visibility and detail settings per subscriber.
- Q: Who can create polls — facilitators/admins only, any member, or configurable? → A: Any user who can create a Callout (Post) in a space can add a poll to it. Polls are additional content on a Callout's Framing (Post), not a standalone entity; poll creation permissions follow existing callout creation permissions for the space.
- Q: Who can edit poll options — original creator only, or anyone with Callout edit permissions? → A: Poll editing follows parent Callout edit permissions. Anyone who can edit the Callout can edit its poll (consistent with existing Callout management).
- Q: Which notification channels deliver poll vote notifications? → A: Reuse the platform's existing notification channel infrastructure (in-app, email, or both per the user's existing notification preferences). No new channel is introduced.
- Q: Vote record pattern — in-place update or append-with-delete? → A: Single Vote record per member per Poll, updated in place when selections change. No vote history is retained. Change events may still be emitted for future subscription use without requiring stored history.

---

### Session 2026-03-11

- Q: Should subscriptions return the full Poll object or a lightweight payload? → A: Wrapper payloads containing the full updated `Poll` object plus event metadata (`pollEventType`). Specifically: `PollVoteUpdatedSubscriptionResult` and `PollOptionsChangedSubscriptionResult`, each with `pollEventType` and `poll`. The existing field resolvers already apply visibility/detail filtering per user context (via `@CurrentActor()`), so each subscriber automatically receives appropriately filtered poll data without reimplementing the visibility matrix.
- Q: Should we have one combined subscription or separate ones? → A: Two separate subscriptions (`pollVoteUpdated` and `pollOptionsChanged`) — different event frequencies (votes: high, options: low) and different client interests.
- Q: Should new subscribers receive catch-up with current state? → A: No, future events only — consistent with all other subscriptions in the platform (PubSub delivers only after subscription starts).
- Q: What logging level for subscription events? → A: Debug level (not verbose).
- Q: Should payloads include an event type field? → A: Yes, include `pollEventType` with values `POLL_VOTE_UPDATED` and `POLL_OPTIONS_CHANGED` — consistent with other subscriptions that include event context.

---

### Session 2026-03-18

- Q: Should users be able to completely remove their vote, or only update it? → A: Users should be able to remove their vote entirely via the `removePollVote(pollID)` mutation. This is distinct from updating the vote (which replaces it with a new selection set). Vote removal returns the user to the unvoted state and should fail with a validation error if the user has not voted. Vote removal does NOT trigger notifications to poll creators or other voters (unlike vote cast/update events).

---

## Future Scope (Out of Scope for This Iteration)

The following items were identified as future enhancements. The data model and architecture must not prevent these from being added later:

- **Poll closing**: Ability to manually close a poll, preventing further votes.
- **Poll deadline**: A date/time at which the poll automatically closes.
- **Creator-initiated close with notification**: Closing a poll and notifying all voters of the final result.

# Research: Community Polls & Voting

**Branch**: `038-community-polls` | **Date**: 2026-03-02

## 1. Poll Placement in the Entity Graph

**Decision**: Poll is a new `AuthorizableEntity` attached via `OneToOne` to `CalloutFraming` (same pattern as `Whiteboard`, `Memo`, `Link`, `MediaGallery`).

**Rationale**: The spec is explicit — "a poll is additional content attached to a Callout's Framing." The CalloutFraming already acts as a composition holder for optional framing content selected by type. The existing `CalloutFramingType` enum gains a new value `POLL`. This keeps the design symmetric with existing content types and avoids a standalone "Poll" aggregate that would require its own space-scoping logic.

**Alternatives considered**:
- Storing poll as JSONB on CalloutFraming — rejected: JSONB cannot be efficiently queried for vote counts, voter lists, or option ordering; referential integrity would be lost.
- Separate top-level Poll entity with its own `calloutsSet` relationship — rejected: over-engineered; poll lifecycle is entirely governed by its parent Callout.

---

## 2. Poll Options Storage

**Decision**: Poll options are stored in a dedicated `poll_option` table, one row per option, with `pollId` FK to `poll(id)` and a persisted `sortOrder`.

**Rationale**: This gives direct indexed lookup by `optionID`, removes the need for JSONB containment lookups, and makes ownership checks (`pollID` + `optionID`) explicit and cheap. It also aligns better with mutation symmetry (`add/update/remove/reorder`) and avoids ambiguity in service logic when validating cross-poll option IDs.

**Alternatives considered**:
- JSONB options on `poll` — rejected for this feature revision because direct option-level operations are first-class and should not require array scans.

---

## 3. Vote Storage Model

**Decision**: Single `PollVote` entity per (member, Poll) pair, updated in-place when the voter changes their selection. Selected option IDs remain stored as a `jsonb` column (`selectedOptionIds: string[]`) and reference `poll_option.id` values for the same poll.

**Rationale**: The spec mandates "no historical vote records retained" (FR-012) and "a member has at most one Vote per Poll." The in-place update model maps directly to a single-row upsert. A JSONB array of UUIDs handles multi-select naturally. Vote counts and voter lists for FR-016/FR-017 are computed by loading all `PollVote` rows for a poll (bounded by space membership, typically ≤500) and grouping by option ID in the service layer — no SQL aggregation join needed at this scale.

**Alternatives considered**:
- Append-with-soft-delete (retaining history) — rejected: explicitly out of scope.
- ManyToMany junction table (`poll_vote_selected_options`) — rejected: overkill for the scale; requires an extra table and join; vote aggregation is simple enough in-memory; no FK benefit that isn't already handled at the application level.
- OneToMany from PollVote to a PollVoteSelection entity — rejected: same over-engineering concern as junction table.

---

## 4. Results Ranking Strategy

**Decision**: Load `poll_option` rows for the poll and all `PollVote` rows for the same poll, compute per-option vote counts in memory by grouping on `selectedOptionIds`, then sort by count descending with ties broken by `poll_option.sortOrder` ascending. No SQL-level aggregation query.

**Rationale**: The in-memory approach is natural given that votes are already loaded as a flat list (bounded set). At the stated scale (≤20 options, ≤500 voters) this is trivially fast. No denormalized counter needed, no complex query, no risk of counter drift.

**Alternatives considered**:
- SQL COUNT with JSONB unnest per option — technically feasible but more complex than in-memory grouping at this scale; adds query complexity for no benefit.
- Denormalized `voteCount` on PollOption — rejected: keeping a separate counter in sync adds mutation complexity for no benefit.
- Redis-cached counts — rejected: over-engineering; deferred real-time updates make caching unnecessary.

---

## 5. Response Count Settings (`minResponses` / `maxResponses`)

**Decision**: Replace the `PollVotingMode` enum with two integer fields on `Poll`: `minResponses` (≥ 1) and `maxResponses` (≥ 0, where 0 means unlimited). Enforcement of the `[minResponses, maxResponses]` range happens at the domain service layer in `PollVoteService.castVote()`.

**Rationale**: Two integers are strictly more expressive than a binary enum and subsume all cases it covers: single-choice (`min=1, max=1`), open multi-choice (`min=1, max=0`), and future cases like "choose exactly 2" (`min=2, max=2`) or "choose 2 to 4" (`min=2, max=4`). Adding these future modes later would have required a migration to replace the enum; integers already accommodate them. The JSONB `selectedOptionIds` array is count-agnostic, so no schema change is needed when the range is configured differently. Enforcement at the service layer matches the project's "validation → authorization → domain operation" pattern.

**Validation rules**:
- `minResponses` must be ≥ 1 (at least one selection always required).
- `maxResponses` must be ≥ 0 (0 = unlimited).
- When `maxResponses > 0`, `maxResponses` must be ≥ `minResponses`.
- On `castVote`: `selectedOptionIds.length >= minResponses` AND (`maxResponses === 0` OR `selectedOptionIds.length <= maxResponses`).

**Alternatives considered**:
- Keeping `PollVotingMode` enum (SINGLE_SELECT / MULTI_SELECT) — rejected: doesn't support bounded multi-select (e.g., "choose up to 3") without a future migration; less expressive for no gain in simplicity.
- DB CHECK constraint on the JSONB array length — rejected: not enforceable on JSONB without a trigger; service-layer validation is consistent with the rest of the codebase.

---

## 6. Authorization Model for Polls

**Decision**:
- **Reading poll + results**: `READ` privilege on the Poll authorization policy (derived from CalloutFraming, which is derived from Callout).
- **Casting/updating a vote**: `CONTRIBUTE` privilege on the Poll authorization policy (only space members get `CONTRIBUTE`).
- **Adding/editing/removing/reordering options**: `UPDATE` privilege on the parent Callout's authorization policy (same as editing the Callout's framing).
- **Creating a poll on a Callout**: `UPDATE` privilege on the Callout (same as editing its framing).

**Rationale**: Follows the credential-based authorization model already in place. The `CONTRIBUTE` privilege on Callout already means "space member can contribute"; we propagate the same credential rule to the Poll's authorization policy. No new privilege type needed.

**Alternatives considered**:
- Separate `VOTE` privilege — rejected: over-engineered; reusing `CONTRIBUTE` is semantically consistent with "contributing to a callout."
- Checking membership directly in the service — rejected: bypasses the authorization framework; not consistent with how other permission checks work.

---

## 7. Notification Channels for Poll Events

**Decision**: Reuse the existing `NotificationSpaceAdapter` / `NotificationExternalAdapter` / `NotificationInAppAdapter` pipeline. Add four new `NotificationEvent` values and four new user preference fields (all under `IUserSettingsNotificationSpaceBase`):

| Event | Preference field | Recipient | Trigger |
|-------|-----------------|-----------|---------|
| `SPACE_COLLABORATION_POLL_VOTE_CAST_ON_OWN_POLL` | `collaborationPollVoteCastOnOwnPoll` | Callout creator (not the voter themselves) | `castPollVote` — both new votes and updates |
| `SPACE_COLLABORATION_POLL_VOTE_CAST_ON_POLL_I_VOTED_ON` | `collaborationPollVoteCastOnPollIVotedOn` | All prior voters on the poll (excluding the current voter) | `castPollVote` |
| `SPACE_COLLABORATION_POLL_MODIFIED_ON_POLL_I_VOTED_ON` | `collaborationPollModifiedOnPollIVotedOn` | All voters on the poll whose votes are not affected by the change | `addPollOption`, `reorderPollOptions`, `updatePollOption` (when editing an option the user did not vote for), `removePollOption` (when user did not vote for the removed option) |
| `SPACE_COLLABORATION_POLL_VOTE_AFFECTED_BY_OPTION_CHANGE` | `collaborationPollVoteAffectedByOptionChange` | Voters whose vote was deleted by the modification | `removePollOption`, `updatePollOption` (when editing an option the user voted for) |

**Rationale**: The spec requires all four notification types in this iteration. The pattern for "notify Callout creator on new contribution" already exists (`SPACE_COLLABORATION_CALLOUT_CONTRIBUTION`) and is a near-exact template for the first event; the remaining three follow the same infrastructure. No new channel or delivery mechanism is introduced.

**Alternatives considered**:
- Aggregate notifications (batch one notification per time window) — rejected: spec says notify per event.
- RabbitMQ async event for notification — rejected: existing callout contribution notifications are sent synchronously from the resolver; polls should be consistent.

---

## 8. Results Visibility & Detail Settings

**Decision**: Replace the `isAnonymous` (boolean) and `hideResultsUntilVoted` (boolean) future-compat fields with two enum settings on `Poll`: `resultsVisibility` (`PollResultsVisibility`: HIDDEN, TOTAL_ONLY, VISIBLE) and `resultsDetail` (`PollResultsDetail`: PERCENTAGE, COUNT, FULL). Both default to their most-transparent values (`VISIBLE`, `FULL`) and are **immutable after poll creation**.

**Rationale**: Two booleans (`isAnonymous`, `hideResultsUntilVoted`) are insufficient to express the desired matrix of visibility behaviors:
- `resultsVisibility` controls **when** results become visible (before or after voting).
- `resultsDetail` controls **how much** detail is shown (percentages only, counts, or full voter lists).

These two dimensions are orthogonal and compose cleanly. The old booleans map to specific enum values (`hideResultsUntilVoted: true` → `HIDDEN`; `isAnonymous: true` → `PERCENTAGE` or `COUNT`) but the enums are strictly more expressive. Since polls haven't shipped, there is no migration burden for the replacement.

Immutability after creation prevents ethically problematic scenarios (e.g., switching from `FULL` to `PERCENTAGE` after voters have already seen identities) and simplifies the implementation — no need for change-notification logic or voter consent flows.

**Server-side enforcement**: Field resolvers on `PollOption.voteCount`, `PollOption.votePercentage`, `PollOption.voters`, and `Poll.totalVotes` apply both settings to determine whether to return data or `null`. A derived `Poll.canSeeDetailedResults: Boolean!` field lets clients branch UI with a single check. This follows the existing pattern from `callout.resolver.fields.ts` where `publishedBy` returns null based on entity settings.

**Alternatives considered**:
- Keep `isAnonymous` + `hideResultsUntilVoted` as booleans — rejected: doesn't cover the "total-only" or "percentage-only" cases; would require adding more booleans later.
- Single combined enum (e.g., `PollTransparency: FULL / COUNTS_ONLY / PERCENTAGES_ONLY / HIDDEN_UNTIL_VOTED`) — rejected: conflates when vs. how-much; can't express "hidden until voted + percentage only after."
- Mutable settings with voter notification — rejected: complex consent flow for marginal value; immutability is simpler and more honest.

---

## 9. CalloutFramingType Enum Extension

**Decision**: Add `POLL = 'poll'` to the existing `CalloutFramingType` enum. The Callout's `type` field describes what framing content is present — adding POLL makes it consistent with existing discriminator usage.

**Rationale**: Allows clients to know whether a CalloutFraming has a poll without fetching the poll relation. Follows the established pattern (WHITEBOARD, LINK, MEMO, MEDIA_GALLERY, NONE).

**Alternatives considered**:
- Boolean `hasPoll` flag — rejected: redundant with the existing type discriminator; would diverge from the established pattern.
- Leaving type NONE and making poll fully optional — partially accepted: `poll` IS optional (nullable) on CalloutFraming, but `type` should still reflect the active content type to allow clients to conditionally fetch the poll field.

---

## 10. Module Boundaries

**Decision**: Three domain modules:
- `PollModule` — aggregate root, authorization service, resolver mutations, field resolvers
- `PollOptionModule` — option persistence and ordering operations
- `PollVoteModule` — vote cast/update service, imported by PollModule

`CalloutFramingModule` imports `PollModule`. `CalloutModule` imports `CalloutFramingModule` (already the case), so poll mutations on the Callout resolver flow through the framing service.

**Rationale**: With relational options, `PollOption` has a clear persistence lifecycle and deserves an explicit module boundary.

---

## 11. Handling Option Modifications (Removal & Text Edits) with Voter Notification

**Decision**:

**For option removal** (`PollService.removeOption()`):
1. Load all `PollVote` records where `selectedOptionIds` contains the target option ID.
2. Delete all identified votes entirely.
3. Delete the `poll_option` row for the target option.
4. Re-sequence `sortOrder` for remaining options in the poll.
5. For each voter whose vote was deleted, send a notification using `NotificationEvent.SPACE_COLLABORATION_POLL_VOTE_AFFECTED_BY_OPTION_CHANGE`, stating their vote has been removed and inviting them to re-vote.

**For option text edit** (`PollService.updateOption()`):
1. Load all `PollVote` records where `selectedOptionIds` contains the target option ID.
2. Delete all identified votes entirely.
3. Update the `poll_option` row's `text` field to the new value.
4. For each voter whose vote was deleted, send a notification using `NotificationEvent.SPACE_COLLABORATION_POLL_VOTE_AFFECTED_BY_OPTION_CHANGE`, stating their vote has been removed due to the option text change and inviting them to re-vote.

**Rationale**: Any modification to poll option content (removal or text change) represents a structural change to the poll that invalidates the voting context for anyone who selected that option. Deleting the full vote prevents partial states and ensures voters make conscious, complete choices under the new poll structure. Treating text edits the same as removal avoids ambiguity about "minor" vs "significant" edits—any text change requires voter re-confirmation. Using the existing notification infrastructure is consistent and avoids bespoke delivery logic.

**Alternative considered**: Preserve votes when editing option text for "minor" changes (typos) — rejected: adds complexity to distinguish edit severity, creates inconsistent experiences, and risks voters being bound to semantically different options than they originally selected.

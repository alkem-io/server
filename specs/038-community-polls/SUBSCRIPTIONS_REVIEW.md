# Summary: Subscription Implementation Proposal for Feature 038 Polls

## Context

The Community Polls feature (038) is fully implemented with mutations and notifications. This proposal adds **real-time subscriptions** so browsers watching a poll see live updates when votes are cast or options change.

## Key Findings from Code Review

### Current Subscription Architecture in Codebase

**Pattern identified from `callout.resolver.subscriptions.ts` and `virtual.contributor.resolver.subscriptions.ts`:**

```
PubSub Engine (graphql-subscriptions)
    ↓
[Subscription Resolver with filter + resolve]
    ↓
[Published from mutations via SubscriptionType enum]
    ↓
[Client receives via WebSocket]
```

**Infrastructure**:
- `SubscriptionType` enum in `src/common/enums/`
- `SubscriptionReadService` in `src/services/subscriptions/` - provides async iterators
- `TypedSubscription` decorator - handles filtering and type safety
- PubSub engines injected via NestJS DI (one per subscription type)

### Poll Implementation Status

✅ **Complete Features:**
- Mutations: `castPollVote`, `addPollOption`, `updatePollOption`, `removePollOption`, `reorderPollOptions`
- Notifications: 4 types (creator alerts + voter alerts) via synchronous adapter pattern
- Authorization: Proper privilege gating (CONTRIBUTE for voting, UPDATE for editing)
- Voting logic: Complete replacement semantics with min/max validation
- Results: Visibility and detail settings enforced

---

## Proposed Subscriptions (2 types)

### 1. `pollVoteUpdated` ✨ NEW
- **Fires**: When any user casts/updates a vote on the poll
- **Subscribers**: All users viewing that poll
- **Returns**: Full `Poll` object with updated vote counts
- **Authorization**: READ access to poll

### 2. `pollOptionsChanged` ✨ NEW
- **Fires**: When options are added/edited/removed/reordered
- **Subscribers**: All users viewing that poll
- **Returns**: Full `Poll` object with updated options
- **Authorization**: READ access to poll

---

## Implementation Roadmap

### Phase 1: Infrastructure (~15 mins)
- Add enum values to `SubscriptionType`
- Add PubSub engine providers
- Create DTO files (args + payloads)
- Update `SubscriptionReadService` with new methods

### Phase 2: Resolver (~20 mins)
- Create `poll.resolver.subscriptions.ts`
- Implement filter + resolve for both subscriptions
- Authorization checks before returning iterator

### Phase 3: Publishing (~15 mins)
- Update `poll.resolver.mutations.ts` to publish events
- Wire up all 5 mutation paths to correct subscription types

### Phase 4: Module & Schema (~10 mins)
- Register resolver in `poll.module.ts`
- Register PubSub engines via DI
- Regenerate schema artifacts

**Total Implementation Time**: ~60 minutes

---

## Specification Updates Needed

Once you approve this proposal, I will update:

1. **spec.md** - Add new user stories for subscription scenarios
2. **plan.md** - Add Phase X for subscriptions implementation
3. **data-model.md** - Document PubSub infrastructure (SubscriptionType, DTO structure)
4. **tasks.md** - Add granular tasks for each phase (T020-T030 approx)
5. **contracts/schema.graphql** - Will be auto-generated with new subscription types

---

## Design Rationale

**Why separate Vote + Options subscriptions?**
- Different event frequencies (votes: high, options: low)
- Different client interests (some only watch votes, some watch options)
- Matches codebase pattern (separate subscriptions per entity type)

**Why full Poll object?**
- Simpler for clients (consistent with query model)
- Respects existing visibility/detail filtering at field-resolver level
- No additional authorization complexity

**Why authorization before subscription?**
- Standard GraphQL security pattern
- Prevents subscription hijacking
- Matches existing virtual contributor subscription

---

## What We're NOT Doing (In This Phase)

❌ Real-time notifications (already handled via adapter pattern in mutations)
❌ Historical event playback
❌ Filtered payloads (full poll only)
❌ Auto-close subscriptions (clients disconnect as needed)

---

## Constitution Alignment ✅

All design decisions comply with:
- **Principle 1**: Domain logic unchanged (thin GraphQL layer)
- **Principle 2**: No new modules, subscription resolver joins poll module
- **Principle 3**: Additive to schema, no breaking changes
- **Principle 4**: Events published from mutations (explicit data flow)
- **Principle 7**: API naming follows convention (`pollVoteUpdated`, `pollOptionsChanged`)
- **Principle 8**: Authorization gates before subscription grants access

---

## Questions for You

Before I update the specs, please clarify:

1. **Subscription Scope**: Do both subscriptions return the full `Poll` with all vote details and option lists? Or should we send minimal payloads (e.g., vote count + option IDs only)?

Let's send the full poll, but have in mind that, depending on the poll settings, there are people that shouldn't receive the voting status (counts, voters etc...), until they have voted:

PollResultsVisibility: HIDDEN (no results until they have voted), TOTAL_ONLY (only the total number of votes until they have voted), VISIBLE (doesn't matter if they voted or not)
PollResultsDetail: PERCENTAGE (only percents of the selected options), COUNT (only the total count of votes to each option), FULL (full info, who voted what, counts and percents)
User has voted: YES, NO
Events:
  Votes: Someone (not myself) votes in the poll.
  Changes: Options changes (add, remove, sort, change the text of the options...). Note that some changes produce revocation of affected votes.

| ResultsVisibility | ResultsDetail | Voted | Event   | What the user should receive                                      |
|-------------------|---------------|-------|---------|-------------------------------------------------------------------|
| HIDDEN            | PERCENTAGE    | NO    | Votes   | Nothing, the subscription doesn't receive anything.               |
| HIDDEN            | PERCENTAGE    | NO    | Changes | Updated options only; no vote status.                             |
| HIDDEN            | COUNT         | NO    | Votes   | Nothing, the subscription doesn't receive anything.               |
| HIDDEN            | COUNT         | NO    | Changes | Updated options only; no vote status.                             |
| HIDDEN            | FULL          | NO    | Votes   | Nothing, the subscription doesn't receive anything.               |
| HIDDEN            | FULL          | NO    | Changes | Updated options only; no vote status.                             |
| TOTAL_ONLY        | PERCENTAGE    | NO    | Votes   | Only the total count of votes.                                    |
| TOTAL_ONLY        | PERCENTAGE    | NO    | Changes | Updated options and total count of votes after revoking affected. |
| TOTAL_ONLY        | COUNT         | NO    | Votes   | Only the total count of votes.                                    |
| TOTAL_ONLY        | COUNT         | NO    | Changes | Updated options and total count of votes after revoking affected. |
| TOTAL_ONLY        | FULL          | NO    | Votes   | Only the total count of votes.                                    |
| TOTAL_ONLY        | FULL          | NO    | Changes | Updated options and total count of votes after revoking affected. |
| VISIBLE           | PERCENTAGE    | NO    | Votes   | Allowed votes details: percents updated.                          |
| VISIBLE           | PERCENTAGE    | NO    | Changes | Updated options and percents of votes after revoking affected.    |
| VISIBLE           | COUNT         | NO    | Votes   | Allowed votes details: counts of votes updates.                   |
| VISIBLE           | COUNT         | NO    | Changes | Updated options and counts of votes after revoking affected votes.|
| VISIBLE           | FULL          | NO    | Votes   | All votes.                                                        |
| VISIBLE           | FULL          | NO    | Changes | Updated options and all votes after revoking affected votes.      |
(once voted, first column doesn't really matter and the behavior is the same as if ResultsVisibility = VISIBLE)
(if my vote is affected by options change and it gets revoked, I get also myVote set to undefined)
| XXXXXXX           | PERCENTAGE    | YES   | Votes   | Allowed votes details: percents updated.                          |
| XXXXXXX           | PERCENTAGE    | YES   | Changes | Updated options and percents of votes after revoking affected.    |
| XXXXXXX           | COUNT         | YES   | Votes   | Allowed votes details: counts of votes updates.                   |
| XXXXXXX           | COUNT         | YES   | Changes | Updated options and counts of votes after revoking affected votes.|
| XXXXXXX           | FULL          | YES   | Votes   | All votes.                                                        |
| XXXXXXX           | FULL          | YES   | Changes | Updated options and all votes after revoking affected votes.      |

Try to reuse the existing logic instead of reimplementing this table.


2. **Option Deletion Edge Case**: When an option is deleted, should subscribers see:
  Should be the same event "PollChanged" as an option changed name and receive the new set of options and details about the votes if available for this user & settings.
  if my vote is revoked, I get myVote set to undefined

3. **Historical Subscriptions**: Should a new subscriber receive the current poll state immediately (catch-up), or only future events?
The same behavior as other subscriptions, I think only future events is fine, but confirm this is the default behavior on other subs and apply the same, if different approaches ask again.

4. **Logging Level**: Verbose logging (matches virtual contributor) or Debug level?
debug logging

5. **Payload Structure**: Should we include an `eventType` field in the payload (e.g., "VOTE_CAST", "OPTION_ADDED") to help clients route differently?
The same behavior as other subscriptions, I think we do include eventType on others. In our case we have POLL_VOTE_UPDATED and POLL_OPTIONS_CHANGED

---

## Ready to Proceed?

✅ I've analyzed the codebase and prepared a complete proposal.
⏸️ **Awaiting your feedback** on the design before updating specs and implementing.

See `SUBSCRIPTIONS_PROPOSAL.md` for full technical details.

# Quickstart: Community Polls & Voting

**Branch**: `038-community-polls` | **Date**: 2026-03-02

This guide shows you how to exercise the Community Polls feature end-to-end using the local GraphQL playground (`http://localhost:3000/graphiql`) or the `/gql` skill.

---

## Prerequisites

- Server running locally (`pnpm start:dev`)
- A test space with at least two members (member A = poll creator, member B = voter)
- Authenticated sessions for both members (use `/non-interactive-login` for pipeline token or authenticate via Kratos)

---

## Step 1 — Create a Callout with a Poll

A poll is created together with its Callout by setting `framing.type = POLL` and providing `framing.poll` — the same pattern used for `WHITEBOARD`, `LINK`, and `MEMO` framing types. The Callout's framing `displayName`/`description` serve as the poll prompt.

```graphql
mutation CreateCalloutWithPoll($calloutsSetID: UUID!) {
  createCalloutOnCalloutsSet(calloutData: {
    calloutsSetID: $calloutsSetID
    nameID: "team-sync-poll"
    framing: {
      profile: {
        displayName: "Which day works for the team sync?"
        description: "Vote for your preferred day. You can change your vote at any time."
      }
      type: POLL
      poll: {
        title: "Which day works for the team sync?"
        # minResponses and maxResponses are optional; both default to 1
        # resultsVisibility and resultsDetail are optional; defaults shown:
        # resultsVisibility: VISIBLE
        # resultsDetail: FULL
        options: ["Monday", "Wednesday", "Friday"]
      }
    }
    settings: {
      visibility: PUBLISHED
      contribution: { enabled: false }
    }
  }) {
    id
    nameID
    framing {
      id
      type
      poll {
        id
        status
        settings {
          minResponses
          maxResponses
          resultsVisibility
          resultsDetail
        }
        totalVotes
        canSeeDetailedResults
        options {
          id
          text
          sortOrder
          voteCount
        }
      }
    }
  }
}
```

Verify: `framing.type` = `POLL`, `poll.settings.minResponses = 1`, `poll.settings.maxResponses = 1`, `poll.status` = `OPEN`, `poll.settings.resultsVisibility` = `VISIBLE`, `poll.settings.resultsDetail` = `FULL`, `totalVotes` = `0`, `canSeeDetailedResults` = `true`, three options each with `voteCount: 0`.

---

## Step 2 — Cast a Vote (as Member B)

```graphql
mutation CastVote($pollID: UUID!, $optionID: UUID!) {
  castPollVote(voteData: {
    pollID: $pollID
    selectedOptionIDs: [$optionID]
  }) {
    id
    options {
      id
      text
      voteCount
      voters { id profile { displayName } }
    }
    myVote {
      id
      selectedOptions { id text }
    }
  }
}
```

Verify: the selected option's `voteCount` increments to 1; `myVote.selectedOptions` shows the chosen option; Member B appears in `voters` for that option.

---

## Step 3 — Update a Vote (Change of Mind)

Call `castPollVote` again as Member B with a different `optionID`.
**Note**: When updating a vote, the entire new selection set must be provided—partial modifications are not supported.

```graphql
mutation UpdateVote($pollID: UUID!, $newOptionID: UUID!) {
  castPollVote(voteData: {
    pollID: $pollID
    selectedOptionIDs: [$newOptionID]  # Full replacement, not incremental
  }) {
    options {
      id
      text
      voteCount
    }
    myVote {
      selectedOptions { id text }
    }
  }
}
```

Verify: the old option loses one vote (`voteCount` returns to 0), the new option gains one vote. Member B appears only in the new option's `voters` list.

---

## Step 4 — View Results (as any space member)

```graphql
query ViewPoll($calloutID: UUID!) {
  lookup {
    callout(ID: $calloutID) {
      framing {
        profile { displayName description }
        poll {
          id
          settings {
            minResponses
            maxResponses
          }
          status
          options {
            id
            text
            voteCount
            voters { id profile { displayName } }
          }
          myVote {
            selectedOptions { id text }
          }
        }
      }
    }
  }
}
```

Verify: options are returned in descending `voteCount` order; ties preserve original `sortOrder`.

---

## Step 5 — Add a New Option (as poll creator / admin)

```graphql
mutation AddOption($pollID: UUID!) {
  addPollOption(optionData: {
    pollID: $pollID
    text: "Thursday"
  }) {
    id
    options {
      id
      text
      sortOrder
      voteCount
    }
  }
}
```

Verify: new option appears with `voteCount: 0` and `sortOrder` = 4 (after existing options).

---

## Step 6 — Edit an Option's Text (deletes affected votes)

First, ensure Member B has voted for an option. Then edit that option's text as the poll creator:

```graphql
mutation UpdateOptionText($pollID: UUID!, $optionID: UUID!) {
  updatePollOption(optionData: {
    pollID: $pollID
    optionID: $optionID
    text: "Monday (updated time)"
  }) {
    id
    options {
      id
      text
      voteCount
    }
  }
}
```

Verify:
- The option text is updated.
- All votes containing that option are deleted entirely.
- Each affected voter receives a notification stating "Your vote has been removed because an option text was changed. Please re-vote."
- The affected voters do NOT appear in the updated option's `voters` list.

---

## Step 7 — Remove an Option with Existing Votes

Continuing from the previous scenario, remove an option that has existing votes:

```graphql
mutation RemoveOption($pollID: UUID!, $optionID: UUID!) {
  removePollOption(optionData: {
    pollID: $pollID
    optionID: $optionID
  }) {
    id
    options {
      id
      text
      voteCount
    }
  }
}
```

Verify:
- The option is gone from the returned list.
- All votes containing that option are deleted entirely, regardless of their other selections.
- Each affected voter receives a notification stating "Your vote has been removed because an option was removed. Please re-vote."
- The Callout creator does NOT receive a notification for this admin action (only for new votes).

---

## Step 8 — Reorder Options

```graphql
mutation ReorderOptions($pollID: UUID!, $optionIDs: [UUID!]!) {
  reorderPollOptions(reorderData: {
    pollID: $pollID
    optionIDs: $optionIDs
  }) {
    id
    options {
      id
      text
      sortOrder
    }
  }
}
```

Verify: options are returned in the new order; `voteCount` values are unchanged.

---

## Notification Verification

After Step 2 (vote cast):
- **Callout creator** receives an in-app notification: "A new vote was cast on your poll."
- **Voter (Member B)** does NOT receive a self-notification.
- If Member B IS the Callout creator, no notification is sent at all.

After Step 6 (option text edited):
- **Affected voter (Member B)** receives a notification: "An option you voted for was changed. Your vote has been removed. Please re-vote."

After Step 7 (option removed):
- **Affected voter (Member B)** receives a notification: "An option you voted for was removed. Your vote has been removed. Please re-vote."

---

## Multi-Select Poll Example

```graphql
mutation CreateMultiSelectPoll($calloutsSetID: UUID!) {
  createCalloutOnCalloutsSet(calloutData: {
    calloutsSetID: $calloutsSetID
    nameID: "multi-poll-demo"
    framing: {
      profile: { displayName: "Which topics interest you?" }
      type: POLL
      poll: {
        title: "Which topics interest you?"
        settings: {
          minResponses: 1
          maxResponses: 0  # Explicitly set maxResponses to 0 for unlimited
        }
        options: ["Option A", "Option B", "Option C", "Option D"]
      }
    }
    settings: { visibility: PUBLISHED }
  }) {
    framing {
      poll {
        id
        settings { minResponses maxResponses }
      }
    }
  }
}

mutation CastMultiSelectVote($pollID: UUID!, $optionA: UUID!, $optionC: UUID!) {
  castPollVote(voteData: {
    pollID: $pollID
    selectedOptionIDs: [$optionA, $optionC]
  }) {
    options { text voteCount }
    myVote { selectedOptions { text } }
  }
}
```

Verify: `myVote.selectedOptions` contains both Option A and Option C; each has `voteCount: 1`.

---

## Error Cases to Verify

| Scenario | Expected Error |
|----------|---------------|
| Create poll with only 1 option | Validation error: minimum 2 options |
| Poll with `maxResponses = 1` and 2 option IDs submitted | Domain error: exceeds maxResponses |
| Poll with `minResponses = 2` and only 1 option ID submitted | Domain error: below minResponses |
| Vote with an option ID from a different poll | Not found / domain error |
| Non-member attempts to vote | Authorization error: CONTRIBUTE privilege required |
| Reorder with missing or extra option IDs | Domain error: option ID list must match exactly |

---

## Settings Verification

Query the poll and verify the visibility settings and derived fields:

```graphql
query CheckSettings($calloutID: UUID!) {
  lookup {
    callout(ID: $calloutID) {
      framing {
        poll {
          settings {
            minResponses           # e.g. 1
            maxResponses           # e.g. 1 or 0
            resultsVisibility      # VISIBLE (default)
            resultsDetail          # FULL (default)
          }
          status                 # OPEN
          totalVotes             # 0 (or current count)
          canSeeDetailedResults  # true (when VISIBLE)
          deadline               # null
        }
      }
    }
  }
}
```

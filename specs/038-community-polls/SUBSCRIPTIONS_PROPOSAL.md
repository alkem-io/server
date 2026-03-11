# Subscription Feature Proposal for Community Polls (Feature 038)

**Status**: READY FOR REVIEW  
**Date**: 2026-03-11  
**Proposed by**: AI Assistant

## Executive Summary

This document proposes adding real-time subscriptions to the Community Polls feature so that when users are viewing a poll, their browsers are subscribed to changes in votes and poll options (settings remain read-only). The proposal is based on:

1. **Current Implementation Review**: Analyzed the existing poll mutations (`castPollVote`, `addPollOption`, `updatePollOption`, `removePollOption`, `reorderPollOptions`)
2. **Subscription Pattern Study**: Reviewed how subscriptions are implemented in the codebase (e.g., `calloutPostCreated`, `virtualContributorUpdated`)
3. **Architecture Compliance**: Verified alignment with the constitution principles and existing patterns

---

## Current Implementation Snapshot

The poll feature is fully implemented with:
- **Mutations**: `castPollVote`, `addPollOption`, `updatePollOption`, `removePollOption`, `reorderPollOptions`
- **Notifications**: 4 types (creator vote alerts, voter activity, option changes, poll modifications) → **delivered via adapters**
- **Entity Model**: Poll, PollOption, PollVote with proper authorization
- **Voting Logic**: Enforces min/max response constraints, complete vote replacement
- **Results Visibility**: Governed by `resultsVisibility` and `resultsDetail` settings

---

## Subscription Architecture Overview

### How Subscriptions Work in This Codebase

From analyzing the callout subscriptions and virtual contributor updates:

```
┌─────────────────────────────────────────────────────┐
│ GraphQL Subscription Resolver (e.g., calloutPostCreated)
│ 1. Validates arguments (e.g., calloutID)
│ 2. Checks authorization (e.g., READ on callout)
│ 3. Returns asyncIterableIterator from PubSub engine
└─────────────────────────────────────────────────────┘
                           ↓
       ┌───────────────────────────────────────┐
       │ PubSubEngine (GraphQL subscriptions)  │
       │ - Filters events by subscription args │
       │ - Resolves payload to return type    │
       └───────────────────────────────────────┘
                           ↓
   ┌─────────────────────────────────────────────────┐
   │ Mutation resolvers publish events via PubSubEngine
   │ Example: when vote is cast → publish to PubSub  │
   └─────────────────────────────────────────────────┘
```

**Key Pattern Files**:
- `src/common/enums/subscription.type.ts` — SubscriptionType enum (add 3 new types)
- `src/services/subscriptions/subscription-service/` — Read service (add methods)
- `src/domain/collaboration/callout/callout.resolver.subscriptions.ts` — Example resolver
- `src/common/constants/providers.ts` — PubSub engine providers (add 3 new)

---

## Proposed Subscription Events

### 1. **Poll Vote Updated** (`pollVoteUpdated`)
**Fires when**: A user casts or updates their vote on a poll  
**Subscribers**: All users viewing that poll  
**Payload**: Updated poll with new vote counts and voter lists (respecting visibility settings)  
**Authorization**: READ on poll (same as viewing it)  

**GraphQL Signature**:
```graphql
type Subscription {
  pollVoteUpdated(pollID: UUID!): Poll!
}
```

**Use case**: User A is viewing a poll, User B votes → User A's UI updates with new vote counts in real-time

---

### 2. **Poll Options Changed** (`pollOptionsChanged`)
**Fires when**:
- New option added to poll
- Option text edited
- Option removed
- Options reordered

**Subscribers**: All users viewing that poll  
**Payload**: Updated poll with new option structure  
**Authorization**: READ on poll  

**GraphQL Signature**:
```graphql
type Subscription {
  pollOptionsChanged(pollID: UUID!): Poll!
}
```

**Use case**: User A is viewing a poll, facilitator adds a new option → User A sees new option appear immediately

---

## Technical Implementation Plan

### Phase 1: Add Infrastructure

#### 1.1 Enums and Constants

**File**: `src/common/enums/subscription.type.ts`
```typescript
export enum SubscriptionType {
  // ... existing types ...
  POLL_VOTE_UPDATED = 'pollVoteUpdated',
  POLL_OPTIONS_CHANGED = 'pollOptionsChanged',
}
```

**File**: `src/common/constants/providers.ts`
```typescript
export const SUBSCRIPTION_POLL_VOTE_UPDATED = Symbol('SUBSCRIPTION_POLL_VOTE_UPDATED');
export const SUBSCRIPTION_POLL_OPTIONS_CHANGED = Symbol('SUBSCRIPTION_POLL_OPTIONS_CHANGED');
```

#### 1.2 DTO Files

**File**: `src/domain/collaboration/poll/dto/poll.vote.updated.subscription.args.ts`
```typescript
import { UUID } from '@domain/common/scalars';
import { ArgsType, Field } from '@nestjs/graphql';

@ArgsType()
export class PollVoteUpdatedSubscriptionArgs {
  @Field(() => UUID, {
    description: 'The ID of the Poll to subscribe to.',
  })
  pollID!: string;
}
```

**File**: `src/domain/collaboration/poll/dto/poll.vote.updated.subscription.payload.ts`
```typescript
import { IPoll } from '../poll.interface';

export interface PollVoteUpdatedSubscriptionPayload {
  eventID: string;
  poll: IPoll;
}
```

**File**: `src/domain/collaboration/poll/dto/poll.options.changed.subscription.args.ts`
```typescript
// Similar to vote updated args
```

**File**: `src/domain/collaboration/poll/dto/poll.options.changed.subscription.payload.ts`
```typescript
// Similar to vote updated payload
```

#### 1.3 Update SubscriptionReadService

**File**: `src/services/subscriptions/subscription-service/subscription.read.service.ts`
```typescript
public subscribeToPollVoteUpdated() {
  return this.pollVoteUpdatedSubscription.asyncIterableIterator(
    SubscriptionType.POLL_VOTE_UPDATED
  );
}

public subscribeToPollOptionsChanged() {
  return this.pollOptionsChangedSubscription.asyncIterableIterator(
    SubscriptionType.POLL_OPTIONS_CHANGED
  );
}
```

### Phase 2: Create Subscription Resolver

**File**: `src/domain/collaboration/poll/poll.resolver.subscriptions.ts`

```typescript
import { AuthorizationPrivilege, LogContext } from '@common/enums';
import { TypedSubscription } from '@common/decorators/typed.subscription/typed.subscription.decorator';
import { UUID } from '@domain/common/scalars';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { Inject, LoggerService } from '@nestjs/common';
import { Args, Resolver } from '@nestjs/graphql';
import { SubscriptionReadService } from '@services/subscriptions/subscription-service';
import { PollVoteUpdatedSubscriptionPayload } from './dto/poll.vote.updated.subscription.payload';
import { PollVoteUpdatedSubscriptionArgs } from './dto/poll.vote.updated.subscription.args';
import { InstrumentResolver } from '@src/apm/decorators';
import { CurrentActor, UnableToSubscribeException } from '@src/common/decorators';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { IPoll } from './poll.interface';
import { PollService } from './poll.service';

@InstrumentResolver()
@Resolver()
export class PollResolverSubscriptions {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    private subscriptionService: SubscriptionReadService,
    private pollService: PollService,
    private authorizationService: AuthorizationService
  ) {}

  @TypedSubscription<PollVoteUpdatedSubscriptionPayload, PollVoteUpdatedSubscriptionArgs>(
    () => IPoll,
    {
      description: 'Receive updates when votes are cast or updated on a Poll.',
      resolve(this: PollResolverSubscriptions, payload) {
        return payload.poll;
      },
      async filter(this: PollResolverSubscriptions, payload, variables) {
        const isMatch = variables.pollID === payload.poll.id;
        this.logger.verbose?.(
          `[Filter Poll Vote Updated event ID '${payload.eventID}'; payload poll ID ${payload.poll.id}; variables poll ID ${variables.pollID} - match=${isMatch}`,
          LogContext.SUBSCRIPTIONS
        );
        return isMatch;
      },
    }
  )
  async pollVoteUpdated(
    @CurrentActor() actorContext: ActorContext,
    @Args({ nullable: false })
    { pollID }: PollVoteUpdatedSubscriptionArgs
  ): Promise<AsyncIterable<PollVoteUpdatedSubscriptionPayload>> {
    this.logger.verbose?.(
      `[User ${actorContext.actorID}] Subscribing to poll vote updates: ${pollID}`,
      LogContext.SUBSCRIPTIONS
    );

    const poll = await this.pollService.getPollOrFail(pollID);

    // Validate user can VIEW the poll (READ authorization)
    await this.authorizationService.grantAccessOrFail(
      actorContext,
      poll.authorization,
      AuthorizationPrivilege.READ,
      `subscription to poll vote updates: ${poll.id}`
    );

    return this.subscriptionService.subscribeToPollVoteUpdated();
  }

  @TypedSubscription<PollVoteUpdatedSubscriptionPayload, PollVoteUpdatedSubscriptionArgs>(
    () => IPoll,
    {
      description: 'Receive updates when poll options are added, edited, removed, or reordered.',
      resolve(this: PollResolverSubscriptions, payload) {
        return payload.poll;
      },
      async filter(this: PollResolverSubscriptions, payload, variables) {
        const isMatch = variables.pollID === payload.poll.id;
        this.logger.verbose?.(
          `[Filter Poll Options Changed event ID '${payload.eventID}'; payload poll ID ${payload.poll.id}; variables poll ID ${variables.pollID} - match=${isMatch}`,
          LogContext.SUBSCRIPTIONS
        );
        return isMatch;
      },
    }
  )
  async pollOptionsChanged(
    @CurrentActor() actorContext: ActorContext,
    @Args({ nullable: false })
    { pollID }: PollVoteUpdatedSubscriptionArgs // Reuses same args structure
  ): Promise<AsyncIterable<PollVoteUpdatedSubscriptionPayload>> {
    this.logger.verbose?.(
      `[User ${actorContext.actorID}] Subscribing to poll options updates: ${pollID}`,
      LogContext.SUBSCRIPTIONS
    );

    const poll = await this.pollService.getPollOrFail(pollID);

    // Validate user can VIEW the poll
    await this.authorizationService.grantAccessOrFail(
      actorContext,
      poll.authorization,
      AuthorizationPrivilege.READ,
      `subscription to poll options updates: ${poll.id}`
    );

    return this.subscriptionService.subscribeToPollOptionsChanged();
  }
}
```

### Phase 3: Update PubSub Publishing

**In mutation resolvers** (`src/domain/collaboration/poll/poll.resolver.mutations.ts`):

1. **After `castPollVote`**: Publish to `POLL_VOTE_UPDATED`
2. **After `addPollOption`**: Publish to `POLL_OPTIONS_CHANGED`
3. **After `updatePollOption`**: Publish to `POLL_OPTIONS_CHANGED`
4. **After `removePollOption`**: Publish to `POLL_OPTIONS_CHANGED`
5. **After `reorderPollOptions`**: Publish to `POLL_OPTIONS_CHANGED`

Example pattern (already used in callout mutations):
```typescript
await this.subscriptionPostCreated.publish(
  SubscriptionType.CALLOUT_POST_CREATED,
  { eventID, calloutID, post }
);
```

### Phase 4: Update Poll Module

**File**: `src/domain/collaboration/poll/poll.module.ts`
- Import `PollResolverSubscriptions`
- Add to providers list
- Register PubSub engines via dependency injection

### Phase 5: Schema Regeneration

Run the standard schema generation commands:
```bash
pnpm run schema:print
pnpm run schema:sort
pnpm run schema:diff
```

---

## Design Decisions

### 1. **Why Two Separate Subscriptions?**
- **Vote Updates** ← frequent, high-volume events
- **Options Changes** ← structural changes, lower volume, distinct handling
- Separation allows clients to subscribe independently; some clients might only care about votes

### 2. **Single Poll ID Argument**
Both subscriptions take `pollID` and return the full `Poll` object (filtered by ID in the filter function). This matches the `calloutPostCreated` pattern.

### 3. **Authorization: READ on Poll**
Users viewing a poll must have READ access; this is the minimal gate. The poll's `resultsVisibility` and `resultsDetail` settings control what data within the poll is exposed (already handled at the field resolver level).

### 4. **No Payload Intermediary Filtering**
Unlike `calloutPostCreated` (which can be noisy across many callouts), polls are typically viewed one at a time. The filter is simple: match by `pollID`.

### 5. **Fire-and-Forget Publishing**
Consistent with existing mutation patterns—publish events asynchronously, don't block mutation returns.

---

## Alignment with Constitution

| Principle | Status | Rationale |
|-----------|--------|-----------|
| **1. Domain-Centric Design** | ✅ PASS | Subscriptions are thin GraphQL layers; domain logic unchanged |
| **2. Modular NestJS Boundaries** | ✅ PASS | New resolver and DTOs stay within poll module; no new modules needed |
| **3. GraphQL Schema Stability** | ✅ PASS | New subscription types only; no breaking changes |
| **4. Explicit Data & Event Flow** | ✅ PASS | Events published from mutations; subscribers receive via PubSub (established pattern) |
| **5. Observability** | ✅ PASS | Verbose logging at subscription lifecycle events (matching virtual contributor pattern) |
| **6. Code Quality** | ✅ PASS | Pattern reuses proven codebase examples; minimal new code |
| **7. API Consistency** | ✅ PASS | Follows GraphQL naming: `pollVoteUpdated`, `pollOptionsChanged` |
| **8. Secure-by-Design** | ✅ PASS | Authorization gated before subscription; same READ privilege as viewing poll |

---

## Risk Assessment

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| **High subscription volume** | Low | Single poll typically viewed by one user; no broadcast storms expected |
| **Memory leaks from open subscriptions** | Low | GraphQL-subscriptions package handles cleanup; same as existing subscriptions |
| **Schema drift** | Very Low | Regeneration is automated; new types are additive |
| **Authorization bypass** | Very Low | Authorization check happens before iterator is returned |

---

## Files to Create/Modify

### Create (5 new files):
1. `src/domain/collaboration/poll/dto/poll.vote.updated.subscription.args.ts`
2. `src/domain/collaboration/poll/dto/poll.vote.updated.subscription.payload.ts`
3. `src/domain/collaboration/poll/dto/poll.options.changed.subscription.args.ts`
4. `src/domain/collaboration/poll/dto/poll.options.changed.subscription.payload.ts`
5. `src/domain/collaboration/poll/poll.resolver.subscriptions.ts`

### Modify (5 existing files):
1. `src/common/enums/subscription.type.ts` — Add 2 enum values
2. `src/common/constants/providers.ts` — Add 2 symbol providers
3. `src/services/subscriptions/subscription-service/subscription.read.service.ts` — Add 2 methods
4. `src/domain/collaboration/poll/poll.resolver.mutations.ts` — Add PubSub publishing
5. `src/domain/collaboration/poll/poll.module.ts` — Register new resolver and PubSub engines

---

## Next Steps After Approval

1. ✅ **You review this proposal and provide feedback**
2. Update specs files to document subscriptions:
   - Add to `spec.md` (new feature scenarios)
   - Update `plan.md` (new phase for subscriptions)
   - Update `data-model.md` (PubSub infrastructure notes)
   - Update `tasks.md` (new implementation tasks)
3. Implement code (create DTOs, resolver, update mutations with publishing)
4. Test end-to-end (manual WebSocket testing with GraphQL client)
5. Generate schema artifacts and verify

---

## Questions for Your Review

1. **Do you want both subscriptions separate, or combined into a single `pollUpdated` subscription?**
2. **Should we handle the case where a poll is deleted (send a special event)?**
3. **Is the two-second verbose logging acceptable, or should it be debug-level?**
4. **Should subscriptions respond with the full poll or a lightweight payload (e.g., just vote counts)?**

---

**Status**: ⏸️ AWAITING YOUR REVIEW

Please provide feedback on the architecture, design decisions, and any adjustments before I proceed with updating the specs files and implementing the code.

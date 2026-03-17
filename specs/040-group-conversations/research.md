# Research: Group Conversations & Unified Messaging API

**Feature**: 040-group-conversations
**Date**: 2026-03-04

## R1: Type Model — Room Type as Single Source of Truth

**Decision**: Do NOT add a `type` column to the Conversation entity. Instead, use the existing `Room.type` field as the single source of truth for direct vs group. Add `CONVERSATION_GROUP` to the `RoomType` enum. Remove the `CommunicationConversationType` enum entirely.

**Rationale**: The Room already has a 1:1 relationship with Conversation (eager-loaded). The Room type MUST distinguish DM vs group for the Matrix adapter anyway. Adding a type to Conversation would duplicate data with risk of inconsistency. The old `CommunicationConversationType` (USER_USER, USER_VC) is fully redundant — every code path that checks it already resolves to checking member actor types via `ActorType.VIRTUAL_CONTRIBUTOR`. Query filtering by room type is trivial via the 1:1 join on an indexed FK.

**Alternatives considered**:
- Persist type on Conversation + Room — rejected: data duplication, inconsistency risk, unnecessary migration.
- Keep CommunicationConversationType with DIRECT/GROUP values — rejected: still duplicates Room.type.
- Keep USER_USER/USER_VC distinction — rejected: redundant with actor type checks already in all code paths.

## R2: Unified `createConversation` Mutation Design

**Decision**: Refactor existing `createConversation` mutation to accept an explicit `type` parameter (DIRECT or GROUP) and a `memberIDs` list. The type maps directly to room type: DIRECT → `RoomType.CONVERSATION_DIRECT`, GROUP → `RoomType.CONVERSATION_GROUP`. For DIRECT, validate exactly 1 other member and preserve existing dedup logic. For GROUP, validate ≥1 other member and skip dedup.

**Rationale**: Spec clarification chose unified mutation with explicit type. Matrix DM rooms and group rooms are fundamentally different constructs — type cannot be inferred from member count since 2-member groups are valid.

**Alternatives considered**:
- Separate mutations (createDirectConversation / createGroupConversation) — rejected per spec clarification.
- Infer type from member count — rejected because 2-member groups are valid.

## R3: Members Field — Actor-Based Resolution

**Decision**: Add a `members` field on Conversation returning `[Actor]` (with actor type). Remove `user` and `virtualContributor` fields entirely (breaking change, no deprecation). Remove `_resolvedUser` and `_resolvedVirtualContributor` pre-computation fields from the Conversation interface.

**Rationale**: Spec clarification chose no backward compatibility. The codebase is actor-centric. The existing `ConversationMembershipsLoaderCreator` already batch-loads memberships with actor types. The `ContributorByAgentIdLoaderCreator` resolves actor IDs to full contributor entities. The members field leverages these existing loaders.

**Alternatives considered**:
- Deprecation period with old fields maintained — rejected per spec clarification ("frontend will adapt").
- Return raw ConversationMembership objects — rejected, frontend needs actor details.

## R4: Subscription Event Extension

**Decision**: Add `MEMBER_ADDED` and `MEMBER_REMOVED` to `ConversationEventType`. For group conversation events, publish a single event with all member agent IDs in `memberAgentIds` (existing filter mechanism). Remove personalized `_resolvedUser`/`_resolvedVirtualContributor` pre-computation — no longer needed since `members` field replaces individual member resolution.

**Rationale**: The existing subscription filter (`payload.memberAgentIds.includes(actorContext.actorID)`) already supports N members. Publishing a single event with all member IDs is simpler and more efficient than personalized per-member events for groups.

**Alternatives considered**:
- Personalized events per member (current pattern for USER_USER) — rejected for groups as it scales linearly with member count.
- Separate subscription for group events — rejected, unified subscription is simpler for frontend.

## R5: Room Creation for Groups

**Decision**: Create group rooms using `RoomType.CONVERSATION_GROUP`. The room display name uses a generated identifier (not member names, since naming is out of scope). The Matrix adapter maps `CONVERSATION_GROUP` to `RoomTypeCommunity` (group room) and `CONVERSATION_DIRECT` to `RoomTypeDirect` (DM room). The existing room creation pipeline (save DB → create Matrix room) needs no structural changes.

**Rationale**: Room type distinction is necessary for Matrix adapter to create the correct room type. The adapter already has the `mapRoomType` method that routes by room type.

**Alternatives considered**:
- Reuse `RoomType.CONVERSATION_DIRECT` for groups — rejected, Matrix DM and group rooms have fundamentally different semantics (can't add members to DM rooms).

## R6: MeConversationsResult — Flat List

**Decision**: Replace the categorized `MeConversationsResult` fields (`users`, `virtualContributors`, `virtualContributor(wellKnown:)`) with a single flat `conversations` field returning all conversations for the current actor. The client handles all categorization using member actor types (`Actor.type`) and room types (`Room.type`). For well-known VC identification, the client uses the existing `platform.wellKnownVirtualContributors` query (already exposed and cacheable).

**Rationale**: Client-web analysis revealed: (1) `virtualContributors` array is never queried by any client code, (2) `CommunicationConversationType` is generated but never used in client logic, (3) the client already handles message senders as Actors without ActorType branching. Server-side categorization was solving a problem the frontend doesn't have. The flat list aligns with the actor-centric model — conversations have members with types, the client decides how to display them. The `virtualContributor(wellKnown:)` shortcut is replaced by client-side cross-referencing of `platform.wellKnownVirtualContributors` mappings (platform config, fetched once, cached).

**Alternatives considered**:
- Categorized fields (users/virtualContributors/groups) — rejected: duplicates logic the client already has via actor types and room types. The `virtualContributors` field was dead code on the client.
- Flat list with optional filter parameter — rejected: adds server complexity for filtering the client can trivially do. No performance benefit for the expected conversation counts.
- Adding `wellKnown` field to IActor — rejected: pollutes a core type used everywhere for a niche use case (1 well-known VC). Platform config query already provides this.

## R7: Migration Strategy

**Decision**: Single migration that adds `conversation_group` to the `RoomType` database enum. No column additions, no backfill needed — all existing conversations already have `CONVERSATION_DIRECT` room type.

**Rationale**: This is the minimal migration. The `CommunicationConversationType` was never persisted (always inferred), so removing it requires no database changes. The only DB change is extending the RoomType enum.

**Alternatives considered**:
- No migration (use string column instead of enum) — rejected, RoomType is already a DB enum and should stay consistent.

## R8: CommunicationConversationType Removal — Impact Analysis

**Decision**: Remove the `CommunicationConversationType` enum entirely. Refactor all consumers.

**Affected code and replacements**:

| Current usage | Replacement |
|---|---|
| `inferConversationType()` in conversation.service.ts | **Delete** — no longer needed |
| `type` field resolver in conversation.resolver.fields.ts | **Remove** — no conversation-level type field in GraphQL |
| `getConversationsForAgent(typeFilter)` in messaging.service.ts | **Renamed** to `getConversationsForActor`. `typeFilter` removed entirely — returns flat list of all conversations for an actor. Client handles categorization. |
| `MeConversationsResult.users` / `.virtualContributors` resolvers | **Unchanged** — they already filter by actor type subquery, not by conversation type |
| `isUserVc` flag in subscription publishing | Check member actor types directly (already done in parallel code paths) |
| `conversationType === USER_USER` check for receiving user settings | Check `room.type === CONVERSATION_DIRECT` + no VC in members |

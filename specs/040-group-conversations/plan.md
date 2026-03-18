# Implementation Plan: Group Conversations & Unified Messaging API

**Branch**: `040-group-conversations` | **Date**: 2026-03-04 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/040-group-conversations/spec.md`

## Summary

Extend the conversation domain to support group conversations alongside existing direct conversations. The Room's `type` field (`CONVERSATION_DIRECT` / `CONVERSATION_GROUP`) is the single source of truth — no new column on Conversation, and the `CommunicationConversationType` enum is removed entirely (it was always redundant with member actor types). Changes include: adding `CONVERSATION_GROUP` to `RoomType`, unifying the `createConversation` mutation with an explicit type parameter, replacing per-role field resolvers (`user`/`virtualContributor`) with a unified `members` field returning actors, adding group membership management mutations (add/remove/leave), extending subscription events with MEMBER_ADDED/MEMBER_REMOVED/CONVERSATION_DELETED, and updating the conversation listing to include groups.

## Technical Context

**Language/Version**: TypeScript 5.3, Node.js 22 LTS (Volta pins 22.21.1)
**Primary Dependencies**: NestJS 10, TypeORM 0.3, Apollo Server 4, GraphQL 16
**Storage**: PostgreSQL 17.5 (conversation, conversation_membership, room tables)
**Testing**: Vitest 4.x
**Target Platform**: Linux server (Docker containers)
**Project Type**: Single NestJS monolith
**Performance Goals**: Same latency as existing direct conversations for group operations
**Constraints**: Matrix Synapse integration via RabbitMQ (group rooms vs DM rooms are distinct)
**Scale/Scope**: ~25 files modified, 2 migrations (enum value + avatarUrl column), 4 new DTOs, 1 new enum, 4 new mutations (add/remove/leave/update), enum removal + cleanup, event-driven refactoring for membership and room property changes

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle | Status | Notes |
|-----------|--------|-------|
| 1. Domain-Centric Design | ✅ Pass | All logic in `src/domain/communication/`. No business logic in resolvers. |
| 2. Modular NestJS Boundaries | ✅ Pass | Changes within existing communication module. No new module needed. |
| 3. GraphQL Schema as Stable Contract | ⚠️ Justified Deviation | BREAKING: removing `user`/`virtualContributor`/`type` fields from Conversation, removing `CommunicationConversationType` enum. Justified by spec clarification — coordinated change, frontend adapts simultaneously. Requires BREAKING-APPROVED on PR. |
| 4. Explicit Data & Event Flow | ✅ Pass | Membership and room property mutations follow fire-and-forget RPC pattern: mutation → auth → RPC to Matrix → return Boolean. Inbound Matrix events (via RabbitMQ) → DB persistence → auth re-application → subscription publish. |
| 5. Observability & Operational Readiness | ✅ Pass | New mutations use existing LogContext patterns. No new external surfaces requiring health checks. |
| 6. Code Quality with Pragmatic Testing | ✅ Pass | Unit tests for new service methods, validation logic. Risk-based — no snapshot tests. |
| 7. API Consistency & Evolution | ✅ Pass | Mutations: imperative (`createConversation`, `addConversationMember`). Inputs end with `Input`. |
| 8. Secure-by-Design | ✅ Pass | DTO validation on all new inputs. Auth checks via existing conversation authorization. |
| 9. Container & Deployment | ✅ Pass | No container changes. Migration is idempotent. |
| 10. Simplicity & Incremental Hardening | ✅ Pass | Simplifies by removing redundant enum. Extends existing patterns. No new abstractions. |

### Post-Design Re-check

Principle 3 deviation confirmed: Breaking schema changes are coordinated with frontend. The `members` field uses existing DataLoader patterns. Removing `CommunicationConversationType` simplifies the codebase (was always derivable from member actor types). Schema change requires `pnpm run schema:print && pnpm run schema:sort` and BREAKING-APPROVED review.

Principle 10 improved: Removing redundant `CommunicationConversationType` enum reduces concept count. Room type as single source of truth eliminates data duplication risk.

## Project Structure

### Documentation (this feature)

```text
specs/040-group-conversations/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── conversation.graphql
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── common/enums/
│   ├── communication.conversation.type.ts   # DELETE: enum removed entirely
│   ├── conversation.creation.type.ts        # NEW: ConversationCreationType (DIRECT, GROUP)
│   └── room.type.ts                         # MODIFY: add CONVERSATION_GROUP
├── domain/communication/
│   ├── conversation/
│   │   ├── conversation.entity.ts           # UNCHANGED (no type column)
│   │   ├── conversation.interface.ts        # MODIFY: add members, remove type/_resolved* fields
│   │   ├── conversation.service.ts          # MODIFY: remove inferConversationType, unified
│   │   │                                    #   createConversation(creator, members[], roomType),
│   │   │                                    #   addMember/removeMember (no separate leaveConversation)
│   │   ├── conversation.resolver.fields.ts  # MODIFY: remove type/user/vc resolvers, add members
│   │   ├── conversation.resolver.mutations.ts     # MODIFY: add/remove/leave/delete mutations,
│   │   │                                          #   removeMemberAndPublish shared helper
│   │   ├── conversation.resolver.subscription.ts  # MODIFY: extend event handling
│   │   └── dto/
│   │       ├── conversation.dto.create.ts         # MODIFY: type + memberIDs
│   │       ├── conversation.dto.add-member.ts     # NEW
│   │       ├── conversation.dto.remove-member.ts  # NEW
│   │       ├── conversation.dto.leave.ts          # NEW
│   │       └── subscription/
│   │           └── conversation.event.subscription.result.ts  # MODIFY: add event types
│   └── messaging/
│       ├── messaging.service.ts              # MODIFY: unified createConversation (DIRECT dedup + GROUP in one path), getConversationsForActor (flat, no typeFilter), createConversationWithWellKnownVC
│       └── messaging.resolver.mutations.ts   # MODIFY: unified createConversation mutation (membership mutations are on conversation.resolver.mutations.ts)
├── services/
│   ├── api/me/
│   │   ├── me.conversations.resolver.fields.ts  # MODIFY: replace categorized resolvers with single flat `conversations` resolver
│   │   └── dto/me.conversations.result.ts       # MODIFY: replace users/virtualContributors/virtualContributor(wellKnown:) with flat `conversations` field
│   ├── adapters/communication-adapter/
│   │   └── communication.adapter.ts              # MODIFY: map CONVERSATION_GROUP → RoomTypeCommunity
│   ├── event-handlers/internal/message-inbox/
│   │   ├── message.inbox.service.ts              # MODIFY: event-driven membership + room property handling
│   │   ├── message.inbox.module.ts               # MODIFY: add ActorModule, AuthorizationPolicyModule
│   │   └── room.updated.event.ts                 # NEW: room updated event DTO
│   └── subscriptions/
│       └── subscription-service/dto/
│           └── conversation.event.subscription.payload.ts  # MODIFY: add membership + update events
└── migrations/
    ├── <timestamp>-AddConversationGroupRoomType.ts  # NEW (enum value only)
    └── <timestamp>-AddAvatarUrlToRoom.ts            # NEW (avatarUrl column on room)
```

**Structure Decision**: Existing NestJS monolith structure. All changes within the `src/domain/communication/` domain module and related API/subscription layers. Net reduction in code complexity: removing `CommunicationConversationType` enum and `inferConversationType` method, replacing 2 field resolvers (user, virtualContributor) with 1 (members).

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|-----------|--------------------------------------|
| Breaking schema change (Principle 3) | Coordinated backend+frontend release. Old `user`/`virtualContributor`/`type` fields are redundant with the new `members` field and room type. | Deprecation period adds 6+ months of dual-path maintenance for fields the only frontend consumer will update simultaneously. |

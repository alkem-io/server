# Quickstart: Group Conversations & Unified Messaging API

**Feature**: 040-group-conversations

## Prerequisites

- Node.js 22+ (Volta manages this)
- pnpm 10.17.1+
- Docker Compose (for services)
- Running services: `pnpm run start:services`
- Migrations applied: `pnpm run migration:run`

## Development Flow

```bash
# 1. Install dependencies
pnpm install

# 2. Start services (PostgreSQL, RabbitMQ, Redis, Kratos, etc.)
pnpm run start:services

# 3. Run migrations (adds CONVERSATION_GROUP room type enum value)
pnpm run migration:run

# 4. Start dev server
pnpm start:dev

# 5. Access GraphQL playground
open http://localhost:3000/graphiql
```

## Key Files to Modify

| Area | Files |
|------|-------|
| **Enum (delete)** | `src/common/enums/communication.conversation.type.ts` — removed entirely |
| **Enum (modify)** | `src/common/enums/room.type.ts` — add `CONVERSATION_GROUP` |
| **Service** | `src/domain/communication/conversation/conversation.service.ts` |
| **Service** | `src/domain/communication/messaging/messaging.service.ts` |
| **DTOs** | `src/domain/communication/conversation/dto/conversation.dto.create.ts` |
| **DTOs (new)** | `src/domain/communication/conversation/dto/conversation.dto.add-member.ts` |
| **DTOs (new)** | `src/domain/communication/conversation/dto/conversation.dto.remove-member.ts` |
| **DTOs (new)** | `src/domain/communication/conversation/dto/conversation.dto.leave.ts` |
| **Field Resolver** | `src/domain/communication/conversation/conversation.resolver.fields.ts` |
| **Mutation Resolver** | `src/domain/communication/messaging/messaging.resolver.mutations.ts` |
| **Subscription** | `src/domain/communication/conversation/conversation.resolver.subscription.ts` |
| **Subscription DTO** | `src/domain/communication/conversation/dto/subscription/conversation.event.subscription.result.ts` |
| **Subscription Payload** | `src/services/subscriptions/subscription-service/dto/conversation.event.subscription.payload.ts` |
| **Me Resolver** | `src/services/api/me/me.conversations.resolver.fields.ts` — replace categorized resolvers with flat `conversations` |
| **Me DTO** | `src/services/api/me/dto/me.conversations.result.ts` — flat `conversations` field replaces users/virtualContributors |
| **Adapter** | `src/services/adapters/communication-adapter/communication.adapter.ts` |
| **Adapter Events** | `src/services/adapters/communication-adapter/communication.adapter.event.service.ts` |
| **Event Handler** | `src/services/event-handlers/internal/message-inbox/message.inbox.service.ts` — event-driven membership + room updates |
| **Event Handler Module** | `src/services/event-handlers/internal/message-inbox/message.inbox.module.ts` |
| **Interface** | `src/domain/communication/conversation/conversation.interface.ts` |
| **Migration** | `src/migrations/<timestamp>-AddConversationGroupRoomType.ts` |
| **Migration** | `src/migrations/<timestamp>-AddAvatarUrlToRoom.ts` |

## Testing

```bash
# Run all tests
pnpm test:ci:no:coverage

# Run specific conversation tests
pnpm test -- src/domain/communication/conversation

# Regenerate and verify schema
pnpm run schema:print && pnpm run schema:sort
```

## GraphQL Examples

### Create Group Conversation
```graphql
mutation {
  createConversation(conversationData: {
    type: GROUP
    memberIDs: ["user-uuid-1", "user-uuid-2"]
  }) {
    id
    members { id type }
    room { id }
  }
}
```

### Create Direct Conversation
```graphql
mutation {
  createConversation(conversationData: {
    type: DIRECT
    memberIDs: ["other-user-uuid"]
  }) {
    id
    members { id type }
    room { id }
  }
}
```

### Add Member to Group
```graphql
mutation {
  addConversationMember(memberData: {
    conversationID: "conversation-uuid"
    memberID: "user-uuid-3"
  })
}
# Returns: true (RPC sent). Actual change arrives via MEMBER_ADDED subscription event.
```

### Update Group Conversation
```graphql
mutation {
  updateConversation(updateData: {
    conversationID: "conversation-uuid"
    displayName: "New Group Name"
    avatarUrl: "https://example.com/avatar.png"
  })
}
# Returns: true (RPC sent). Actual change arrives via CONVERSATION_UPDATED subscription event.
```

### Remove Member / Leave
```graphql
mutation {
  removeConversationMember(memberData: {
    conversationID: "conversation-uuid"
    memberID: "user-uuid-3"
  })
}
# Returns: true (RPC sent). Actual change arrives via MEMBER_REMOVED subscription event.

mutation {
  leaveConversation(leaveData: {
    conversationID: "conversation-uuid"
  })
}
# Returns: true (RPC sent).
```

### Query My Conversations
```graphql
query {
  me {
    conversations {
      conversations {
        id
        members { id type profile { displayName } }
        room { id type }
      }
    }
  }
}
```

### Find Guidance VC Conversation (client-side)
```graphql
# Step 1: Get well-known VC mapping (cached platform config)
query { platform { wellKnownVirtualContributors { mappings { wellKnown virtualContributorID } } } }

# Step 2: Client filters me.conversations.conversations by matching member ID
```

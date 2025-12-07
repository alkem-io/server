# GraphQL Contract: Conversation Architecture Refactor

**Date**: 2025-12-05
**Feature**: Conversation Architecture Refactor
**Status**: Schema Backward Compatible

## Summary

This document describes the GraphQL schema changes (or lack thereof) for the conversation architecture refactor. **Key principle**: The external GraphQL API remains backward compatible; internal implementation changes are transparent to API consumers.

## Schema Changes

### ✅ No Breaking Changes

The GraphQL schema for `Conversation`, `User`, `VirtualContributor`, and related types **remains unchanged**. All modifications are internal implementation details hidden behind field resolvers.

## Conversation Type (UNCHANGED)

```graphql
"""
A conversation between agents (users and/or virtual contributors).
Type is inferred from member agents dynamically.
"""
type Conversation {
  """
  The unique identifier for this Conversation.
  """
  id: UUID!

  """
  The type of this conversation (USER_USER or USER_VC).
  Computed dynamically based on member agent types.
  """
  type: CommunicationConversationType!

  """
  The user participating in this Conversation (for USER_USER conversations).
  Resolved via membership pivot table.
  Returns null for USER_VC conversations where this agent is the VC.
  """
  user: User

  """
  The virtual contributor participating in this Conversation (for USER_VC conversations).
  Resolved via membership pivot table.
  Returns null for USER_USER conversations.
  """
  virtualContributor: VirtualContributor

  """
  The Matrix room for this Conversation.
  """
  room: Room

  """
  Authorization policy for this conversation.
  Access is derived from membership in the conversation.
  """
  authorization: Authorization

  """
  When this conversation was created.
  """
  createdDate: DateTime!

  """
  When this conversation was last updated.
  """
  updatedDate: DateTime!
}

"""
The type of a conversation.
"""
enum CommunicationConversationType {
  """
  Conversation between two users.
  """
  USER_USER

  """
  Conversation between a user and a virtual contributor.
  """
  USER_VC
}
```

## Implementation Notes

### Field Resolver Changes (Internal Only)

#### `Conversation.type`
**Before**: Read from `conversation.type` column
**After**: Compute dynamically from member agent types

```typescript
@ResolveField('type', () => CommunicationConversationType)
async type(@Parent() conversation: IConversation): Promise<CommunicationConversationType> {
  // Query memberships and determine type from agent types
  const members = await this.conversationService.getConversationMembers(conversation.id);
  const agentTypes = await this.agentService.getAgentTypes(members.map(m => m.agentId));

  return agentTypes.some(t => t === 'VIRTUAL_CONTRIBUTOR')
    ? CommunicationConversationType.USER_VC
    : CommunicationConversationType.USER_USER;
}
```

#### `Conversation.user`
**Before**: Lookup user via `conversation.userID` foreign key
**After**: Query membership pivot table and resolve agent→user relationship

```typescript
@ResolveField('user', () => IUser, { nullable: true })
async user(@Parent() conversation: IConversation): Promise<IUser | null> {
  const memberships = await this.conversationService.getConversationMembers(conversation.id);

  for (const membership of memberships) {
    const agent = await this.agentService.getAgent(membership.agentId);
    if (agent.user) {
      return agent.user;
    }
  }

  return null;
}
```

#### `Conversation.virtualContributor`
**Before**: Lookup VC via `conversation.virtualContributorID` foreign key
**After**: Query membership pivot table and resolve agent→virtualContributor relationship

```typescript
@ResolveField('virtualContributor', () => IVirtualContributor, { nullable: true })
async virtualContributor(@Parent() conversation: IConversation): Promise<IVirtualContributor | null> {
  const memberships = await this.conversationService.getConversationMembers(conversation.id);

  for (const membership of memberships) {
    const agent = await this.agentService.getAgent(membership.agentId);
    if (agent.virtualContributor) {
      return agent.virtualContributor;
    }
  }

  return null;
}
```

### Performance Optimization

**DataLoader Pattern**: Batch agent/user/VC lookups across multiple conversations in a single GraphQL query to prevent N+1 problems.

```typescript
// Example DataLoader setup
const agentLoader = new DataLoader<string, IAgent>(async (agentIds) => {
  const agents = await this.agentRepository.findByIds(agentIds, {
    relations: { user: true, virtualContributor: true }
  });

  return agentIds.map(id => agents.find(a => a.id === id));
});
```

## User Type (UNCHANGED)

```graphql
"""
A user in the Alkemio platform.
"""
type User {
  id: UUID!
  firstName: String!
  lastName: String!
  email: String!

  """
  Agent for this user (used for conversation membership).
  """
  agent: Agent!

  """
  Profile information.
  """
  profile: Profile!

  # NOTE: conversationsSet field REMOVED from schema (was never publicly exposed)
  # User conversations accessed via platform.conversations or me.conversations queries

  # ... other existing fields
}
```

**Migration Note**: The `conversationsSet` field was never part of the public GraphQL schema (only internal database relationship), so its removal has no API impact.

## VirtualContributor Type (MINOR ADDITION)

```graphql
"""
A virtual contributor (AI agent) in the Alkemio platform.
"""
type VirtualContributor {
  id: UUID!

  """
  Agent for this virtual contributor (used for conversation membership).
  """
  agent: Agent!

  """
  Profile information.
  """
  profile: Profile!

  """
  Well-known virtual contributor identifier (if this is a platform-provided VC).
  NEW: Moved from Conversation to VirtualContributor entity.
  """
  wellKnownVirtualContributor: VirtualContributorWellKnown

  # ... other existing fields
}

"""
Well-known virtual contributor types provided by the platform.
"""
enum VirtualContributorWellKnown {
  """
  Platform guidance engine.
  """
  GUIDANCE_ENGINE

  """
  Platform expert assistant.
  """
  EXPERT_ASSISTANT

  # ... other well-known VCs
}
```

**Change**: `wellKnownVirtualContributor` field **added** to `VirtualContributor` type (was previously only on `Conversation`). This is **non-breaking** (additive change).

## Query Changes (NONE)

All existing queries remain unchanged:

```graphql
type Query {
  """
  Get conversations for the current user.
  """
  me: Me!
}

type Me {
  """
  Conversations for the current user.
  """
  conversations: MeConversationsResult!
}

type MeConversationsResult {
  """
  Conversations between users.
  """
  users: [Conversation!]!

  """
  Conversations with virtual contributors.
  """
  virtualContributors: [Conversation!]!

  """
  Get a specific conversation with a well-known virtual contributor.
  """
  virtualContributor(wellKnown: VirtualContributorWellKnown!): Conversation
}
```

**Implementation Change**: Resolvers now query the platform conversation set and filter by membership instead of querying user-owned conversation sets.

```typescript
// Example resolver update
@ResolveField(() => [IConversation])
async users(@CurrentUser() agentInfo: AgentInfo): Promise<IConversation[]> {
  // Before: query user's conversation set
  // const user = await this.userService.getUser(agentInfo.userID, { relations: { conversationsSet: true } });
  // return this.conversationsSetService.getConversations(user.conversationsSet.id);

  // After: query platform set filtered by agent membership
  const platformSet = await this.conversationsSetService.getPlatformConversationsSet();
  const userAgent = await this.agentService.getAgentForUser(agentInfo.userID);

  return this.conversationsSetService.getConversationsForAgent(
    platformSet.id,
    userAgent.id,
    CommunicationConversationType.USER_USER // filter for user-to-user only
  );
}
```

## Mutation Changes (NONE)

All existing mutations remain unchanged:

```graphql
type Mutation {
  """
  Create a new conversation.
  """
  createConversation(input: CreateConversationInput!): Conversation!

  """
  Send a message in a conversation.
  """
  sendMessage(input: SendMessageInput!): Message!

  # ... other conversation mutations
}

input CreateConversationInput {
  """
  Type of conversation to create.
  """
  type: CommunicationConversationType!

  """
  User ID for USER_USER conversations (the other user).
  """
  userID: UUID

  """
  Virtual contributor ID for USER_VC conversations.
  """
  virtualContributorID: UUID

  """
  Well-known virtual contributor for USER_VC conversations.
  """
  wellKnownVirtualContributor: VirtualContributorWellKnown
}
```

**Implementation Change**: Mutation resolvers now create ConversationMembership records in the pivot table instead of setting foreign key fields on Conversation.

```typescript
// Example mutation update
@Mutation(() => IConversation)
async createConversation(
  @Args('input') input: CreateConversationInput,
  @CurrentUser() agentInfo: AgentInfo
): Promise<IConversation> {
  // Resolve agents
  const currentUserAgent = await this.agentService.getAgentForUser(agentInfo.userID);
  const otherAgent = input.userID
    ? await this.agentService.getAgentForUser(input.userID)
    : await this.agentService.getAgentForVirtualContributor(input.virtualContributorID);

  // Create conversation with memberships
  const conversation = await this.conversationService.createConversation({
    type: input.type,
    agentIds: [currentUserAgent.id, otherAgent.id] // NEW: pass agent IDs for membership
  });

  return conversation;
}
```

## Authorization Changes (INTERNAL)

Authorization logic updates are internal only. The GraphQL schema's `Authorization` type remains unchanged.

**Implementation Change**: Authorization checks now query membership instead of checking foreign key fields.

```typescript
// Before
async canReadConversation(conversation: IConversation, agentInfo: AgentInfo): Promise<boolean> {
  return conversation.userID === agentInfo.userID ||
         (await this.virtualContributorService.getVC(conversation.virtualContributorID)).ownerId === agentInfo.userID;
}

// After
async canReadConversation(conversation: IConversation, agentInfo: AgentInfo): Promise<boolean> {
  const userAgent = await this.agentService.getAgentForUser(agentInfo.userID);
  const isMember = await this.conversationMembershipRepository.exists({
    where: { conversationId: conversation.id, agentId: userAgent.id }
  });

  return isMember; // Membership automatically grants read privilege
}
```

## Subscription Changes (NONE)

If conversation subscriptions exist, they remain unchanged:

```graphql
type Subscription {
  """
  Subscribe to new messages in a conversation.
  """
  messageReceived(conversationID: UUID!): Message!
}
```

## Error Codes (UNCHANGED)

All existing error codes remain the same:
- `ENTITY_NOT_FOUND`: Conversation or agent not found
- `UNAUTHORIZED`: User not authorized to access conversation
- `VALIDATION_ERROR`: Invalid input (e.g., missing required fields)

## Testing Contract Validation

### Schema Compatibility Tests
```typescript
describe('Conversation GraphQL Schema', () => {
  it('should maintain backward compatible Conversation type fields', () => {
    const schema = buildSchema();
    const conversationType = schema.getType('Conversation') as GraphQLObjectType;

    expect(conversationType.getFields()).toHaveProperty('id');
    expect(conversationType.getFields()).toHaveProperty('type');
    expect(conversationType.getFields()).toHaveProperty('user');
    expect(conversationType.getFields()).toHaveProperty('virtualContributor');
    expect(conversationType.getFields()).toHaveProperty('room');
  });

  it('should resolve Conversation.type correctly', async () => {
    const conversation = await createTestConversation(userAgent1, userAgent2);
    const result = await queryConversation(conversation.id, '{ type }');

    expect(result.data.type).toBe('USER_USER');
  });

  it('should resolve Conversation.user correctly', async () => {
    const conversation = await createTestConversation(userAgent1, userAgent2);
    const result = await queryConversation(conversation.id, '{ user { id } }');

    expect(result.data.user.id).toBeDefined();
  });
});
```

### Performance Tests
```typescript
describe('Conversation Query Performance', () => {
  it('should not have N+1 query problem when loading multiple conversations', async () => {
    const conversations = await createTestConversations(10);

    const queryCount = await measureQueries(async () => {
      await graphqlQuery(`
        query {
          me {
            conversations {
              users {
                id
                type
                user { id }
                virtualContributor { id }
              }
            }
          }
        }
      `);
    });

    // Should use DataLoader batching
    expect(queryCount).toBeLessThan(10); // Not 1 + N queries
  });
});
```

## Summary

**Breaking Changes**: ❌ None
**Additive Changes**: ✅ `VirtualContributor.wellKnownVirtualContributor` field (non-breaking)
**Internal Changes**: ✅ All field resolver implementations updated for pivot table
**Performance**: ✅ DataLoader pattern prevents N+1 queries
**Authorization**: ✅ Membership-based checks remain transparent to API consumers

The GraphQL API contract remains stable and backward compatible. All changes are internal implementation details that improve data model normalization and eliminate redundant state without affecting API consumers.

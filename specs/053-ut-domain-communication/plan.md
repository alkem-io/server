# Plan: Unit Tests for src/domain/communication

## Strategy
Prioritize files with lowest coverage and highest statement count to maximize coverage gain per test file.

## Implementation Order
1. **CommunicationService** (8.57% -> ~90%): createCommunication, save, getUpdates, getCommunicationOrFail, removeCommunication, addContributorToCommunications, getRoomIds, getCommunicationIDsUsed, removeActorFromCommunications
2. **CommunicationAuthorizationService** (0% -> ~90%): applyAuthorizationPolicy
3. **CommunicationResolverMutations** (36% -> ~90%): sendMessageToUsers, sendMessageToOrganization, sendMessageToCommunityLeads
4. **RoomAuthorizationService** (0% -> ~90%): applyAuthorizationPolicy, allowContributorsToCreateMessages, allowContributorsToReplyReactToMessages, allowAdminsToComment, extendAuthorizationPolicyForMessageSender, extendAuthorizationPolicyForReactionSender
5. **RoomServiceEvents** (0% -> ~80%): All process* methods
6. **RoomDataLoader** (0% -> ~90%): loadLastMessage, loadUnreadCount
7. **ConversationAuthorizationService** (0% -> ~90%): applyAuthorizationPolicy
8. **MessagingResolverMutations** (0% -> ~80%): createConversation
9. **MessagingService** uncovered methods (~62% -> ~90%): createMessaging, save, publishConversationCreatedEvents, getConversationWithWellKnownVC, getConversationsForAgent
10. **MessageResolverFields** (11% -> ~90%): sender resolver
11. **MessageReactionResolverFields** (0% -> ~90%): sender resolver

## Test Infrastructure
- NestJS Test.createTestingModule
- MockWinstonProvider, defaultMockerFactory, repositoryProviderMockFactory
- Vitest 4.x (vi.fn, vi.spyOn, describe/it/expect globals)
- @golevelup/ts-vitest createMock for class-based DI tokens

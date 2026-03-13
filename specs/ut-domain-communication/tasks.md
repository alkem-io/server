# Tasks: Unit Tests for src/domain/communication

## Task 1: Expand CommunicationService tests
- File: `src/domain/communication/communication/communication.service.spec.ts`
- Methods: createCommunication, save, getUpdates, getCommunicationOrFail, removeCommunication, addContributorToCommunications, getRoomIds, getCommunicationIDsUsed, removeActorFromCommunications

## Task 2: Create CommunicationAuthorizationService tests
- File: `src/domain/communication/communication/communication.service.authorization.spec.ts`
- Methods: applyAuthorizationPolicy

## Task 3: Expand CommunicationResolverMutations tests
- File: `src/domain/communication/communication/communication.resolver.mutations.spec.ts`
- Methods: sendMessageToUsers, sendMessageToOrganization, sendMessageToCommunityLeads

## Task 4: Create RoomAuthorizationService tests
- File: `src/domain/communication/room/room.service.authorization.spec.ts`
- Methods: applyAuthorizationPolicy, allowContributorsToCreateMessages, allowContributorsToReplyReactToMessages, allowAdminsToComment, extendAuthorizationPolicyForMessageSender, extendAuthorizationPolicyForReactionSender

## Task 5: Create RoomServiceEvents tests
- File: `src/domain/communication/room/room.service.events.spec.ts`
- Methods: processNotificationCommentReply, processNotificationCalloutComment, processNotificationPostContributionComment, processNotificationForumDiscussionComment, processNotificationCalendarEventComment, processActivityPostComment, processActivityMessageRemoved, processActivityUpdateSent, processNotificationUpdateSent, processActivityCalloutCommentCreated

## Task 6: Create RoomDataLoader tests
- File: `src/domain/communication/room/room.data.loader.spec.ts`
- Methods: loadLastMessage, loadUnreadCount

## Task 7: Create ConversationAuthorizationService tests
- File: `src/domain/communication/conversation/conversation.service.authorization.spec.ts`
- Methods: applyAuthorizationPolicy

## Task 8: Create MessagingResolverMutations tests
- File: `src/domain/communication/messaging/messaging.resolver.mutations.spec.ts`
- Methods: createConversation

## Task 9: Expand MessagingService tests
- File: `src/domain/communication/messaging/messaging.service.spec.ts`
- Methods: createMessaging, save, getConversationWithWellKnownVC

## Task 10: Create MessageResolverFields tests
- File: `src/domain/communication/message/message.resolver.fields.spec.ts`
- Methods: sender

## Task 11: Create MessageReactionResolverFields tests
- File: `src/domain/communication/message.reaction/message.reaction.resolver.fields.spec.ts`
- Methods: sender

## Task 12: Verify coverage >= 80% and lint passes

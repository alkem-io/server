export const COMMUNICATION_PLATFORM_SPACEID = 'platform';

// 034-messaging-notifications (sec-server-10): the platform previously had
// no enforced cap on group-conversation membership, so a single message to
// a large group could fan out notifications to an unbounded number of
// recipients. Enforced both at conversation-creation time
// (CreateConversationInput.memberIDs) and at subsequent membership growth
// (ConversationService.addMember) so a group can never be grown past this
// bound piecemeal. Deliberately the same numeric value as
// NOTIFICATION_RECIPIENTS_USER_IDS_MAX (notification-recipients DTO) — both
// bounds exist to keep a single conversation-message event's fan-out
// tractable.
export const CONVERSATION_GROUP_MEMBER_COUNT_MAX = 100;

import { BaseEventPayload } from '@alkemio/notifications-lib';

/**
 * 034-messaging-notifications (contract C-2/C-3, data-model.md §3).
 *
 * INLINE BRIDGE (temporary — server/CLAUDE.md's documented precedent):
 * `@alkemio/notifications-lib` 0.19.0 will export this same shape from
 * `@alkemio/notifications-lib/dist/dto/user/notification.event.payload.user.conversation.message.direct`
 * once the notifications-repo wave publishes it. Until then the server
 * declares it locally so wave 1 can ship independently. Contract C-3's
 * mechanical pre-merge check (T020) swaps this file's usages for the lib
 * import and bumps the `@alkemio/notifications-lib` pin from 0.18.0 to
 * 0.19.0 — do not merge the server PR before that swap.
 *
 * NO message-content field exists on this DTO (FR-008, by construction) —
 * only sender display name, conversation identity, and the deep-link URL.
 */
export interface NotificationEventPayloadUserConversationMessageDirect
  extends BaseEventPayload {
  sender: { displayName: string };
  conversation: { id: string; url: string };
}

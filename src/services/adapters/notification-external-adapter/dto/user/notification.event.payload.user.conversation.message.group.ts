import { BaseEventPayload } from '@alkemio/notifications-lib';

/**
 * 034-messaging-notifications (contract C-2/C-3, data-model.md §3).
 *
 * INLINE BRIDGE (temporary) — see the sibling `...direct.ts` file's header
 * comment for the full rationale and the pre-merge swap (T020, contract
 * C-3).
 *
 * NO message-content field exists on this DTO (FR-008). Adds
 * `conversation.displayName` over the direct variant, since group email/push
 * copy names the conversation.
 */
export interface NotificationEventPayloadUserConversationMessageGroup
  extends BaseEventPayload {
  sender: { displayName: string };
  conversation: { id: string; url: string; displayName: string };
}

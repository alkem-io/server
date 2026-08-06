import { BaseEventPayload } from '@alkemio/notifications-lib';
import { ConversationDigestEntryPayload } from './notification.event.payload.user.conversation.message.direct';

/**
 * 034-messaging-notifications (contract C-2/C-3, data-model.md §3).
 *
 * INLINE BRIDGE (temporary) — see the sibling `...direct.ts` file's header
 * comment for the full rationale and the pre-merge swap (contract C-3).
 *
 * REVISED for Operator Ruling R4 / D-22: a per-recipient GROUP digest.
 *
 * Note what is deliberately ABSENT: there is no sender-identity field. The
 * group digest names CONVERSATIONS, not people (FR-018a) — both because that
 * is the useful summary and because naming a sender per conversation would
 * imply "who said what", which the digest cannot honestly report.
 */
export interface NotificationEventPayloadUserConversationMessageGroup
  extends BaseEventPayload {
  /** One entry per group conversation with unread messages. Never empty. */
  conversations: ConversationDigestEntryPayload[];
  /** Sum of `conversations[].count`. */
  totalCount: number;
}

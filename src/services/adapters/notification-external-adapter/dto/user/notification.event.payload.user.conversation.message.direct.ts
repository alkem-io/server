import { BaseEventPayload } from '@alkemio/notifications-lib';

/**
 * 034-messaging-notifications (contract C-2/C-3, data-model.md §3).
 *
 * INLINE BRIDGE (temporary — server/CLAUDE.md's documented precedent):
 * `@alkemio/notifications-lib` 0.19.0 will export these same shapes from
 * `@alkemio/notifications-lib/dist/dto/user/notification.event.payload.user.conversation.message.direct`
 * once the notifications-repo wave publishes it. Until then the server
 * declares them locally so wave 1 can ship independently. Contract C-3's
 * mechanical pre-merge check swaps this file's usages for the lib import and
 * bumps the `@alkemio/notifications-lib` pin from 0.18.0 to 0.19.0 — do not
 * merge the server PR before that swap.
 *
 * REVISED for Operator Ruling R4 / D-22: the event is now a per-recipient
 * DIGEST, not a single-message notification. It carries aggregate counts read
 * from the fire-time unread signal, never message text.
 */

/** One row of a messaging digest. Shared by both digest DTOs. */
export interface ConversationDigestEntryPayload {
  /** Direct: the counterpart's display name. Group: the conversation's. */
  displayName: string;
  /** Unread messages for THIS recipient in that conversation, at dispatch time. */
  count: number;
  /** Deep link to that specific conversation (contract C-6). */
  url: string;
}

/**
 * Invariants (asserted on both sides of the wire):
 *  - NO message-content field exists (FR-008, by construction).
 *  - `recipients` has EXACTLY ONE entry — the digest is per recipient, so an
 *    event with 0 or >1 recipients is a contract violation.
 *  - `senders` is NEVER empty — a track that finds nothing unread emits
 *    nothing at all (FR-018).
 *  - `totalCount === sum(senders[].count)` and `totalCount >= 1`.
 *  - `triggeredBy.email === ''` — sender PII never rides the durable queue.
 *    Templates MUST NOT render `triggeredBy`; the digest names counterparts
 *    via `senders[]`.
 */
export interface NotificationEventPayloadUserConversationMessageDirect
  extends BaseEventPayload {
  /** One entry per 1:1 counterpart with unread messages. Never empty. */
  senders: ConversationDigestEntryPayload[];
  /** Sum of `senders[].count` — precomputed for copy, never recomputed in a template. */
  totalCount: number;
}

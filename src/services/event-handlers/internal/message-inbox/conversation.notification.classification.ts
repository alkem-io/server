import { LogContext } from '@common/enums';
import { RoomType } from '@common/enums/room.type';

export type ConversationMessageKind = 'DIRECT' | 'GROUP';

/**
 * 034-messaging-notifications — Operator Ruling 2 / FR-007.
 *
 * Classifies a conversation-room message for notification purposes:
 *  - Typed rooms (`CONVERSATION_DIRECT` / `CONVERSATION_GROUP`) classify by
 *    their stored type — zero ambiguity, zero cost.
 *  - Legacy `CONVERSATION` rooms (predating direct/group typing) classify
 *    DYNAMICALLY by current member count:
 *      exactly 2   → DIRECT
 *      more than 2 → GROUP
 *      fewer than 2 → no recipients (caller skips — `null`)
 *      unavailable (member list could not be resolved) → GROUP, via an
 *        EXPLICIT case (never a `default:` fallthrough), logged.
 *
 * Only ever called for rooms already known to be conversation rooms
 * (`isConversationRoom(room)` guards the call site in
 * `message.inbox.service.ts`) — any other `RoomType` reaching here is a
 * caller error, logged and treated as "skip" rather than guessed at.
 */
export function classifyConversationMessage(
  roomType: RoomType,
  memberActorIds: string[] | undefined | null,
  logger?: {
    warn: (message: string, context: string) => void;
    error: (message: string, context: string) => void;
  }
): ConversationMessageKind | null {
  if (roomType === RoomType.CONVERSATION_DIRECT) {
    return 'DIRECT';
  }
  if (roomType === RoomType.CONVERSATION_GROUP) {
    return 'GROUP';
  }
  if (roomType === RoomType.CONVERSATION) {
    // Legacy untyped conversation room — classify dynamically by member
    // count (Ruling 2).
    if (memberActorIds == null) {
      // Explicit "member list unavailable" case — never a silent default.
      logger?.warn(
        'Legacy conversation room: member list unavailable at notify time — classifying as GROUP (explicit fallback rule)',
        LogContext.COMMUNICATION_CONVERSATION
      );
      return 'GROUP';
    }
    if (memberActorIds.length === 2) {
      return 'DIRECT';
    }
    if (memberActorIds.length > 2) {
      return 'GROUP';
    }
    // Fewer than 2 members (0 or 1) — no recipients possible, skip.
    return null;
  }

  // Any other RoomType reaching this function is a caller error — the
  // upstream guard (isConversationRoom) should have prevented it. Log and
  // skip rather than guess.
  logger?.error(
    `classifyConversationMessage called with a non-conversation room type: ${roomType}`,
    LogContext.COMMUNICATION_CONVERSATION
  );
  return null;
}

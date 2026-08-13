import { ensureMaxLength } from './string.util';

/**
 * 034-messaging-notifications (sec-server-4, corr-server-5).
 *
 * `room.displayName` and a user's `profile.displayName` are caller-supplied
 * free text (any conversation member may rename a group via `updateConversation`,
 * gated only on CONTRIBUTE) — NOT trusted platform copy, despite comments
 * elsewhere in this feature that (incorrectly) call them "trusted fields".
 * Both land verbatim in email subject/body and push-notification titles sent
 * from the platform's own domain/app, so they are sanitized here before use:
 *
 *  - control characters and newlines stripped (mail-header/rendering safety
 *    for any downstream template that does not itself normalize them),
 *  - length-clamped to keep a hostile long string out of a subject line/OS
 *    notification title.
 *
 * This does not make the string "safe HTML" — the notifications-service
 * templates are still responsible for autoescaping on render. It only bounds
 * the blast radius of control characters and unbounded length.
 */
const NOTIFICATION_COPY_MAX_LENGTH = 100;

export function sanitizeNotificationCopyText(value: string): string {
  // biome-ignore lint/suspicious/noControlCharactersInRegex: intentional — this IS the control-character strip.
  const stripped = value.replace(/[\x00-\x1F\x7F]+/g, ' ').trim();
  return ensureMaxLength(stripped, NOTIFICATION_COPY_MAX_LENGTH);
}

// corr-server-5: the internal placeholder substituted by
// `ConversationService.createConversationRoom` for an unnamed group
// (`group-conversation-${memberCount}-members`) must never surface as
// user-facing notification copy.
const GROUP_DISPLAY_NAME_PLACEHOLDER_PATTERN =
  /^group-conversation-\d+-members$/;

export const GROUP_CONVERSATION_DISPLAY_NAME_FALLBACK = 'a group chat';

/**
 * Normalizes a conversation room's `displayName` for use in user-facing
 * notification copy (push title/body, group email `conversation.displayName`):
 * falls back to a neutral label when the name is empty (legacy/direct-shaped
 * rooms) or is the internal "unnamed group" placeholder, and otherwise
 * sanitizes + length-clamps it (sec-server-4).
 */
export function getGroupDisplayNameForNotificationCopy(
  displayName: string | undefined | null
): string {
  // Sanitize FIRST, then decide: a name made up only of control characters
  // (e.g. '\n', '\x00') is truthy before sanitization but empty after it, so
  // testing the raw value would let a blank group name through instead of
  // falling back to the neutral label.
  const normalized = sanitizeNotificationCopyText(displayName ?? '');
  if (!normalized || GROUP_DISPLAY_NAME_PLACEHOLDER_PATTERN.test(normalized)) {
    return GROUP_CONVERSATION_DISPLAY_NAME_FALLBACK;
  }
  return normalized;
}

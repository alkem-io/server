import { sanitizeNotificationCopyText } from '@common/utils/notification.copy.util';
import { DigestKind, digestPushTag } from './conversation.digest.track';

/**
 * 034-messaging-notifications — data-model §3 / §9.2.
 *
 * One row of a messaging digest. Shared by the email wire payload and the
 * push copy. Carries NO message text (FR-008 by construction) and no sender
 * email (FR-009).
 */
export interface ConversationDigestEntry {
  /** Direct: the counterpart's display name. Group: the conversation's. */
  displayName: string;
  /** Unread messages for THIS recipient in that conversation, at dispatch time. */
  count: number;
  /** Deep link to that specific conversation. */
  url: string;
}

export interface DigestPushCopy {
  title: string;
  body: string;
  url: string;
  tag: string;
}

/** `totalCount === sum(entries[].count)` — an invariant of both wire DTOs. */
export const digestTotalCount = (
  entries: readonly ConversationDigestEntry[]
): number => entries.reduce((total, entry) => total + entry.count, 0);

const messageWord = (count: number): string =>
  count === 1 ? 'message' : 'messages';

/**
 * Push copy, data-model §9.2. PURE — the caller supplies the fallback URL for
 * the multi-entry case, because "the chat surface" is a URL-generator
 * concern, not a copy concern.
 *
 * | case              | title           | body                                  |
 * |-------------------|-----------------|---------------------------------------|
 * | direct, 1 entry   | {displayName}   | sent you {N} message(s)               |
 * | direct, M entries | New messages    | {total} messages from {M} people      |
 * | group,  1 entry   | {displayName}   | {N} new message(s)                    |
 * | group,  M entries | New messages    | {total} messages in {M} conversations |
 *
 * Both title and body pass through `sanitizeNotificationCopyText` before
 * reaching the OS (D-15 / sec-server-4): display names remain user-controlled
 * free text and land verbatim in a notification title. Entry display names
 * are expected to have been normalized by the caller already
 * (`getGroupDisplayNameForNotificationCopy` for groups); sanitizing the
 * assembled string again is cheap and makes this function safe on its own.
 */
export const buildDigestPushCopy = (
  kind: DigestKind,
  entries: readonly ConversationDigestEntry[],
  chatSurfaceUrl: string
): DigestPushCopy => {
  if (entries.length === 0) {
    // A contract violation, not an "empty digest": a track that finds nothing
    // unread emits nothing at all (FR-018). Callers must never reach here.
    throw new Error('Cannot build push copy for an empty digest');
  }

  const total = digestTotalCount(entries);
  const tag = digestPushTag(kind);

  if (entries.length === 1) {
    const [entry] = entries;
    return {
      title: sanitizeNotificationCopyText(entry.displayName),
      body: sanitizeNotificationCopyText(
        kind === 'direct'
          ? `sent you ${entry.count} ${messageWord(entry.count)}`
          : `${entry.count} new ${messageWord(entry.count)}`
      ),
      // Single entry -> that conversation. Multiple -> the chat surface,
      // never a guess at which one the recipient meant.
      url: entry.url,
      tag,
    };
  }

  return {
    title: 'New messages',
    body: sanitizeNotificationCopyText(
      kind === 'direct'
        ? `${total} messages from ${entries.length} people`
        : `${total} messages in ${entries.length} conversations`
    ),
    url: chatSurfaceUrl,
    tag,
  };
};

import { NotificationEvent } from '@common/enums/notification.event';
import { ConversationMessageKind } from './conversation.notification.classification';

/**
 * 034-messaging-notifications — Operator Ruling R4 / FR-011a / FR-011b.
 *
 * A "track" is the unit of debouncing: one per (recipient, channel,
 * conversation kind), so exactly FOUR per recipient. A fast channel is never
 * held hostage by a slow one, and direct traffic is never held hostage by
 * group traffic.
 *
 * Everything in this file is PURE — no Redis, no Nest, no clock. The Redis
 * structures that use these keys live in
 * `conversation.digest.scheduler.service.ts`; this module owns only the key
 * grammar and the fire-time arithmetic, which is where FR-011b lives and is
 * therefore exhaustively unit-tested.
 */

export type DigestChannel = 'email' | 'push';
export type DigestKind = 'direct' | 'group';

export const DIGEST_CHANNELS: readonly DigestChannel[] = ['email', 'push'];
export const DIGEST_KINDS: readonly DigestKind[] = ['direct', 'group'];

export interface DigestTrack {
  channel: DigestChannel;
  kind: DigestKind;
  /** The RECIPIENT's user id — never the sender's. */
  userId: string;
}

/** The due ZSET: member = track key, score = fire-at (ms epoch). */
export const DIGEST_DUE_KEY = 'msg:notif:digest:due';

/**
 * `{channel}:{kind}:{userId}` (data-model §5). The user id is a UUID, which
 * contains no `:`, so the first two segments are unambiguous.
 */
export const digestTrackKey = (track: DigestTrack): string =>
  `${track.channel}:${track.kind}:${track.userId}`;

/**
 * Inverse of `digestTrackKey`. Returns null for anything that is not a
 * well-formed track key — a claimed member that fails to parse is a corrupt
 * or foreign ZSET entry and must be dropped, never guessed at.
 */
export const parseDigestTrack = (trackKey: string): DigestTrack | null => {
  const segments = trackKey.split(':');
  if (segments.length < 3) {
    return null;
  }
  const [channel, kind, ...rest] = segments;
  const userId = rest.join(':');
  if (!DIGEST_CHANNELS.includes(channel as DigestChannel)) {
    return null;
  }
  if (!DIGEST_KINDS.includes(kind as DigestKind)) {
    return null;
  }
  if (userId.length === 0) {
    return null;
  }
  return {
    channel: channel as DigestChannel,
    kind: kind as DigestKind,
    userId,
  };
};

/** Which conversations to EXAMINE at flush. A hint only (FR-022). */
export const digestPendingKey = (trackKey: string): string =>
  `msg:notif:digest:pending:${trackKey}`;

/** First un-notified message on this track — the FR-011b cap anchor. */
export const digestFirstKey = (trackKey: string): string =>
  `msg:notif:digest:first:${trackKey}`;

/**
 * Bounded dispatch-retry counter (data-model §5.4). Survives `readAndClear`
 * — it is cleared only when the track reaches a terminal outcome (dispatched,
 * or deliberately not dispatched), so a repeatedly failing dispatch cannot
 * re-arm forever.
 */
export const digestAttemptsKey = (trackKey: string): string =>
  `msg:notif:digest:attempts:${trackKey}`;

/**
 * FR-011b — the effective fire time.
 *
 *   min(now + quietPeriod, firstUnNotifiedMessage + maxDelay)
 *
 * The left term is the debounce: every new message pushes the fire time out
 * by another quiet period. The right term is the CAP, anchored to the first
 * un-notified message on this track. Without the cap a continuously active
 * conversation resets the timer indefinitely and the recipient is never
 * notified — the busiest conversations would be the quietest notifiers,
 * which is precisely backwards (D-20).
 */
export const computeFireAt = (
  nowMs: number,
  firstAtMs: number,
  quietMs: number,
  maxDelayMs: number
): number => Math.min(nowMs + quietMs, firstAtMs + maxDelayMs);

/** Arrival-path classification (`'DIRECT'`/`'GROUP'`) → track kind. */
export const digestKindFromMessageKind = (
  kind: ConversationMessageKind
): DigestKind => (kind === 'DIRECT' ? 'direct' : 'group');

/**
 * Ruling R1 — each kind is its OWN wire event (own DTO, own handler, own
 * template). Never a single event with an `isGroup` flag.
 */
export const notificationEventForDigestKind = (
  kind: DigestKind
): NotificationEvent =>
  kind === 'direct'
    ? NotificationEvent.USER_CONVERSATION_MESSAGE_DIRECT
    : NotificationEvent.USER_CONVERSATION_MESSAGE_GROUP;

/**
 * FR-024 — stable per (recipient-visible) track, so a newer digest REPLACES
 * the previous unattended toast instead of stacking. Deliberately carries no
 * timestamp and no recipient id: the browser scopes notifications to the
 * subscription already, and a per-dispatch component would make collapsing
 * impossible (which is exactly what the pre-R4 `${eventType}-${Date.now()}`
 * got wrong).
 */
export const digestPushTag = (kind: DigestKind): string =>
  `messaging-digest-${kind}`;

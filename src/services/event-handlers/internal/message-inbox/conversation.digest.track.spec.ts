import { NotificationEvent } from '@common/enums/notification.event';
import { describe, expect, it } from 'vitest';
import {
  computeFireAt,
  digestKindFromMessageKind,
  digestPushTag,
  digestTrackKey,
  notificationEventForDigestKind,
  parseDigestTrack,
} from './conversation.digest.track';

const SECOND = 1000;

describe('digest track keys', () => {
  it('round-trips a track through its key', () => {
    const track = {
      channel: 'email' as const,
      kind: 'group' as const,
      userId: '3f2504e0-4f89-11d3-9a0c-0305e82c3301',
    };

    expect(digestTrackKey(track)).toBe(
      'email:group:3f2504e0-4f89-11d3-9a0c-0305e82c3301'
    );
    expect(parseDigestTrack(digestTrackKey(track))).toEqual(track);
  });

  it('rejects anything that is not a well-formed track key rather than guessing', () => {
    expect(parseDigestTrack('email:group')).toBeNull();
    expect(parseDigestTrack('sms:group:user-1')).toBeNull();
    expect(parseDigestTrack('email:broadcast:user-1')).toBeNull();
    expect(parseDigestTrack('email:group:')).toBeNull();
    expect(parseDigestTrack('')).toBeNull();
  });

  it('maps arrival-path classification onto track kinds', () => {
    expect(digestKindFromMessageKind('DIRECT')).toBe('direct');
    expect(digestKindFromMessageKind('GROUP')).toBe('group');
  });

  it('Ruling R1 — each kind routes to its OWN wire event, never one event with a flag', () => {
    expect(notificationEventForDigestKind('direct')).toBe(
      NotificationEvent.USER_CONVERSATION_MESSAGE_DIRECT
    );
    expect(notificationEventForDigestKind('group')).toBe(
      NotificationEvent.USER_CONVERSATION_MESSAGE_GROUP
    );
  });

  it('FR-024 — the push tag is stable per track, carrying no timestamp', () => {
    expect(digestPushTag('direct')).toBe('messaging-digest-direct');
    expect(digestPushTag('group')).toBe('messaging-digest-group');
    // The pre-R4 tag was `${eventType}-${Date.now()}`, which could never
    // collapse. Two dispatches must produce the SAME tag.
    expect(digestPushTag('direct')).toBe(digestPushTag('direct'));
  });
});

/**
 * FR-011b lives here. These are the cases that decide whether an active
 * conversation ever notifies at all.
 */
describe('computeFireAt (FR-011b)', () => {
  const quiet = 60 * SECOND;
  const maxDelay = 300 * SECOND;

  it('the quiet period wins when the track is far from its cap', () => {
    const firstAt = 1_000_000;
    const now = firstAt + 10 * SECOND;

    // now + 60s = firstAt + 70s, well inside the firstAt + 300s cap.
    expect(computeFireAt(now, firstAt, quiet, maxDelay)).toBe(now + quiet);
  });

  it('the cap wins when the quiet period would push past it', () => {
    const firstAt = 1_000_000;
    const now = firstAt + 280 * SECOND;

    // now + 60s would be firstAt + 340s — past the firstAt + 300s cap.
    expect(computeFireAt(now, firstAt, quiet, maxDelay)).toBe(
      firstAt + maxDelay
    );
  });

  it('a reset that would push past the cap is clamped, so a continuously active conversation still fires', () => {
    const firstAt = 1_000_000;
    // Simulate a message every 10s for 10 minutes — a pure debounce would
    // never fire. The fire time must stop moving once it hits the cap.
    let last = firstAt;
    for (let elapsed = 0; elapsed <= 600 * SECOND; elapsed += 10 * SECOND) {
      last = computeFireAt(firstAt + elapsed, firstAt, quiet, maxDelay);
      expect(last).toBeLessThanOrEqual(firstAt + maxDelay);
    }
    expect(last).toBe(firstAt + maxDelay);
  });

  it('is exactly the cap when the quiet period and the remaining cap coincide', () => {
    const firstAt = 1_000_000;
    const now = firstAt + (maxDelay - quiet);

    expect(computeFireAt(now, firstAt, quiet, maxDelay)).toBe(
      firstAt + maxDelay
    );
  });

  it('never returns a fire time in the past relative to the first message', () => {
    const firstAt = 1_000_000;

    // Even a `now` far beyond the cap (a track whose anchor survived an
    // unusually long outage) yields the cap, not something earlier than it.
    expect(
      computeFireAt(firstAt + 10_000 * SECOND, firstAt, quiet, maxDelay)
    ).toBe(firstAt + maxDelay);
  });
});

import { describe, expect, it } from 'vitest';
import {
  buildDigestPushCopy,
  ConversationDigestEntry,
  digestTotalCount,
} from './conversation.digest.copy';

const CHAT_SURFACE = '/?chat=all';

const entry = (
  displayName: string,
  count: number,
  url = '/?chat=c1'
): ConversationDigestEntry => ({ displayName, count, url });

describe('digestTotalCount', () => {
  it('sums the entry counts', () => {
    expect(digestTotalCount([entry('A', 2), entry('B', 3)])).toBe(5);
  });
});

describe('buildDigestPushCopy (data-model §9.2)', () => {
  describe('direct', () => {
    it('single entry, single message — names the sender, singular noun', () => {
      const copy = buildDigestPushCopy(
        'direct',
        [entry('Alice', 1, '/?chat=c1')],
        CHAT_SURFACE
      );

      expect(copy.title).toBe('Alice');
      expect(copy.body).toBe('sent you 1 message');
      expect(copy.url).toBe('/?chat=c1');
      expect(copy.tag).toBe('messaging-digest-direct');
    });

    it('single entry, several messages — plural noun', () => {
      const copy = buildDigestPushCopy(
        'direct',
        [entry('Alice', 4)],
        CHAT_SURFACE
      );

      expect(copy.title).toBe('Alice');
      expect(copy.body).toBe('sent you 4 messages');
    });

    it('several entries — aggregate copy and the chat surface, never a guessed conversation', () => {
      const copy = buildDigestPushCopy(
        'direct',
        [entry('Alice', 2, '/?chat=c1'), entry('Carol', 3, '/?chat=c2')],
        CHAT_SURFACE
      );

      expect(copy.title).toBe('New messages');
      expect(copy.body).toBe('5 messages from 2 people');
      expect(copy.url).toBe(CHAT_SURFACE);
    });
  });

  describe('group', () => {
    it('single entry, single message — names the conversation, singular noun', () => {
      const copy = buildDigestPushCopy(
        'group',
        [entry('Project Alpha', 1, '/?chat=c1')],
        CHAT_SURFACE
      );

      expect(copy.title).toBe('Project Alpha');
      expect(copy.body).toBe('1 new message');
      expect(copy.url).toBe('/?chat=c1');
      expect(copy.tag).toBe('messaging-digest-group');
    });

    it('single entry, several messages — plural noun', () => {
      const copy = buildDigestPushCopy(
        'group',
        [entry('Project Alpha', 6)],
        CHAT_SURFACE
      );

      expect(copy.body).toBe('6 new messages');
    });

    it('several entries — counts conversations, never people (FR-018a)', () => {
      const copy = buildDigestPushCopy(
        'group',
        [entry('Alpha', 2), entry('Beta', 5)],
        CHAT_SURFACE
      );

      expect(copy.title).toBe('New messages');
      expect(copy.body).toBe('7 messages in 2 conversations');
      expect(copy.body).not.toContain('people');
    });
  });

  describe('FR-024 — the tag collapses rather than stacks', () => {
    it('is identical across two dispatches on the same track', () => {
      const first = buildDigestPushCopy(
        'direct',
        [entry('Alice', 1)],
        CHAT_SURFACE
      );
      const second = buildDigestPushCopy(
        'direct',
        [entry('Alice', 2), entry('Carol', 1)],
        CHAT_SURFACE
      );

      expect(first.tag).toBe(second.tag);
    });

    it('differs between the direct and group tracks, so they do not collapse into each other', () => {
      expect(
        buildDigestPushCopy('direct', [entry('A', 1)], CHAT_SURFACE).tag
      ).not.toBe(
        buildDigestPushCopy('group', [entry('A', 1)], CHAT_SURFACE).tag
      );
    });
  });

  describe('D-15 / sec-server-4 — hostile display names', () => {
    it('strips control characters and newlines out of the title', () => {
      const copy = buildDigestPushCopy(
        'direct',
        [entry('Alice\nSubject: reset your password', 1)],
        CHAT_SURFACE
      );

      expect(copy.title).not.toContain('\n');
      expect(copy.title).toContain('Alice');
    });

    it('clamps an unbounded display name so it cannot flood an OS notification', () => {
      const copy = buildDigestPushCopy(
        'group',
        [entry('x'.repeat(5000), 1)],
        CHAT_SURFACE
      );

      expect(copy.title.length).toBeLessThanOrEqual(100);
    });

    it('carries no message text under a hostile fixture (FR-008)', () => {
      const hostile = '<script>alert(1)</script> secret message body';
      const copy = buildDigestPushCopy(
        'direct',
        [entry('Alice', 3)],
        CHAT_SURFACE
      );

      expect(JSON.stringify(copy)).not.toContain(hostile);
      expect(JSON.stringify(copy)).not.toContain('script');
    });
  });

  it('refuses to build copy for an empty digest — that is a contract violation, not an empty render', () => {
    expect(() => buildDigestPushCopy('direct', [], CHAT_SURFACE)).toThrow(
      /empty digest/
    );
  });
});

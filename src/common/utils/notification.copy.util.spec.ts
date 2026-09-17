import { describe, expect, it } from 'vitest';
import {
  GROUP_CONVERSATION_DISPLAY_NAME_FALLBACK,
  getGroupDisplayNameForNotificationCopy,
  sanitizeNotificationCopyText,
} from './notification.copy.util';

describe('sanitizeNotificationCopyText (sec-server-4)', () => {
  it('passes clean short text through unchanged', () => {
    expect(sanitizeNotificationCopyText('Team Chat')).toBe('Team Chat');
  });

  it('strips newlines and control characters', () => {
    const result = sanitizeNotificationCopyText(
      'Alkemio Security\nSubject: verify your account\r\n'
    );
    expect(result).not.toContain('\n');
    expect(result).not.toContain('\r');
  });

  it('clamps to the max length', () => {
    const result = sanitizeNotificationCopyText('x'.repeat(500));
    expect(result.length).toBeLessThanOrEqual(100);
  });
});

describe('getGroupDisplayNameForNotificationCopy (corr-server-5)', () => {
  it('returns the neutral fallback for the internal unnamed-group placeholder', () => {
    expect(
      getGroupDisplayNameForNotificationCopy('group-conversation-3-members')
    ).toBe(GROUP_CONVERSATION_DISPLAY_NAME_FALLBACK);
    expect(
      getGroupDisplayNameForNotificationCopy('group-conversation-12-members')
    ).toBe(GROUP_CONVERSATION_DISPLAY_NAME_FALLBACK);
  });

  it('returns the neutral fallback for an empty or whitespace-only name', () => {
    expect(getGroupDisplayNameForNotificationCopy('')).toBe(
      GROUP_CONVERSATION_DISPLAY_NAME_FALLBACK
    );
    expect(getGroupDisplayNameForNotificationCopy('   ')).toBe(
      GROUP_CONVERSATION_DISPLAY_NAME_FALLBACK
    );
    expect(getGroupDisplayNameForNotificationCopy(undefined)).toBe(
      GROUP_CONVERSATION_DISPLAY_NAME_FALLBACK
    );
    expect(getGroupDisplayNameForNotificationCopy(null)).toBe(
      GROUP_CONVERSATION_DISPLAY_NAME_FALLBACK
    );
  });

  it('returns the neutral fallback for a control-character-only name', () => {
    // Truthy before sanitization, empty after it — the fallback must be
    // decided on the sanitized value, not the raw one.
    expect(getGroupDisplayNameForNotificationCopy('\n')).toBe(
      GROUP_CONVERSATION_DISPLAY_NAME_FALLBACK
    );
    expect(getGroupDisplayNameForNotificationCopy('\x00')).toBe(
      GROUP_CONVERSATION_DISPLAY_NAME_FALLBACK
    );
    expect(getGroupDisplayNameForNotificationCopy('\t \r\n')).toBe(
      GROUP_CONVERSATION_DISPLAY_NAME_FALLBACK
    );
  });

  it('passes through a real, user-chosen name (sanitized)', () => {
    expect(getGroupDisplayNameForNotificationCopy('Team Chat')).toBe(
      'Team Chat'
    );
  });

  it('does not fall back for a name that merely contains the placeholder substring', () => {
    // Only an exact match of the placeholder pattern falls back — a real
    // group named e.g. "group-conversation-3-members-planning" is left alone.
    expect(
      getGroupDisplayNameForNotificationCopy(
        'group-conversation-3-members-planning'
      )
    ).toBe('group-conversation-3-members-planning');
  });

  it('sanitizes control characters out of a real name', () => {
    const result = getGroupDisplayNameForNotificationCopy(
      'Alkemio Security\nverify your account'
    );
    expect(result).not.toContain('\n');
  });
});

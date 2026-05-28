import { describe, expect, it } from 'vitest';
import { maskEmail } from './user.email.change.email.masking.util';

describe('maskEmail', () => {
  it('masks a normal address keeping first chars and TLD', () => {
    expect(maskEmail('valentin.yanakiev@gmail.com')).toBe('v***@g***.com');
  });

  it('masks a single-char local-part address', () => {
    expect(maskEmail('j@e.io')).toBe('j***@e***.io');
  });

  it('masks an address with no TLD gracefully', () => {
    expect(maskEmail('a@b')).toBe('a***@b***');
  });

  it('uses the LAST dot in the domain as the TLD boundary', () => {
    expect(maskEmail('alice@mail.corp.example.org')).toBe('a***@m***.org');
  });

  it('returns the empty string when given an empty string', () => {
    expect(maskEmail('')).toBe('');
  });

  it('returns a defensive fallback when no @ is present', () => {
    expect(maskEmail('not-an-email')).toBe('n***');
  });
});

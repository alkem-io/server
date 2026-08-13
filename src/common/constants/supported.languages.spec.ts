import { describe, expect, it } from 'vitest';
import {
  isSupportedInterfaceLanguage,
  parseSupportedEligibleLanguages,
  resolveSupportedDefaultLanguage,
  SUPPORTED_INTERFACE_LANGUAGES,
} from './supported.languages';

describe('isSupportedInterfaceLanguage', () => {
  it('should return true for every member of SUPPORTED_INTERFACE_LANGUAGES', () => {
    for (const lang of SUPPORTED_INTERFACE_LANGUAGES) {
      expect(isSupportedInterfaceLanguage(lang)).toBe(true);
    }
  });

  it('should return false for a non-supported code', () => {
    expect(isSupportedInterfaceLanguage('xx')).toBe(false);
  });

  it('should return false for an empty string', () => {
    expect(isSupportedInterfaceLanguage('')).toBe(false);
  });

  it('should be case-sensitive (uppercase EN is not supported)', () => {
    expect(isSupportedInterfaceLanguage('EN')).toBe(false);
  });
});

describe('parseSupportedEligibleLanguages', () => {
  it('should parse a single supported language', () => {
    expect(parseSupportedEligibleLanguages('nl')).toEqual(['nl']);
  });

  it('should parse multiple supported languages', () => {
    expect(parseSupportedEligibleLanguages('nl,de,fr')).toEqual([
      'nl',
      'de',
      'fr',
    ]);
  });

  it('should trim whitespace from each entry', () => {
    expect(parseSupportedEligibleLanguages(' nl , de ')).toEqual(['nl', 'de']);
  });

  it('should drop entries not in SUPPORTED_INTERFACE_LANGUAGES', () => {
    expect(parseSupportedEligibleLanguages('nl,xx')).toEqual(['nl']);
  });

  it('should return [] when all entries are unsupported', () => {
    expect(parseSupportedEligibleLanguages('xx,yy')).toEqual([]);
  });

  it('should return [] for an empty string', () => {
    expect(parseSupportedEligibleLanguages('')).toEqual([]);
  });

  it('should return [] for undefined', () => {
    expect(parseSupportedEligibleLanguages(undefined)).toEqual([]);
  });

  it('should deduplicate repeated supported entries', () => {
    expect(parseSupportedEligibleLanguages('nl,nl,de')).toEqual(['nl', 'de']);
  });

  it('should drop empty segments from trailing commas', () => {
    expect(parseSupportedEligibleLanguages('nl,')).toEqual(['nl']);
  });
});

describe('resolveSupportedDefaultLanguage', () => {
  it('should return the raw value when it is supported', () => {
    expect(resolveSupportedDefaultLanguage('nl')).toBe('nl');
  });

  it('should return the fallback when raw is unsupported', () => {
    expect(resolveSupportedDefaultLanguage('xx')).toBe('en');
  });

  it('should return the fallback when raw is undefined', () => {
    expect(resolveSupportedDefaultLanguage(undefined)).toBe('en');
  });

  it('should use a custom fallback when provided', () => {
    expect(resolveSupportedDefaultLanguage('xx', 'nl')).toBe('nl');
  });

  it('should return supported raw value even when a custom fallback is provided', () => {
    expect(resolveSupportedDefaultLanguage('de', 'nl')).toBe('de');
  });
});

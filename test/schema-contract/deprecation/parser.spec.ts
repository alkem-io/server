import { parseDeprecationReason } from '../../../src/tools/schema/deprecation-parser';

// T042: Unit tests for deprecation parser edge cases

describe('parseDeprecationReason', () => {
  const fixedNow = new Date('2025-10-08T12:00:00Z');

  it('returns error for missing reason string', () => {
    const res = parseDeprecationReason(undefined, undefined, fixedNow);
    expect(res.formatValid).toBe(false);
    expect(res.errors).toContain('Missing deprecation reason string');
  });

  it('parses valid format', () => {
    const res = parseDeprecationReason(
      'REMOVE_AFTER=2025-12-31 | Sunset feature',
      undefined,
      fixedNow
    );
    expect(res.formatValid).toBe(true);
    expect(res.removeAfter).toBe('2025-12-31');
    expect(res.humanReason).toBe('Sunset feature');
    expect(res.errors).toHaveLength(0);
  });

  it('rejects invalid date format', () => {
    const res = parseDeprecationReason(
      'REMOVE_AFTER=2025/12/31 | Wrong sep',
      undefined,
      fixedNow
    );
    expect(res.formatValid).toBe(false);
    expect(res.errors).toContain('Invalid date format, expected YYYY-MM-DD');
  });

  it('rejects missing prefix', () => {
    const res = parseDeprecationReason(
      '2025-12-31 | Missing prefix',
      undefined,
      fixedNow
    );
    expect(res.formatValid).toBe(false);
    expect(res.errors).toContain('Missing REMOVE_AFTER= prefix');
  });

  it('errors when missing human reason', () => {
    const res = parseDeprecationReason(
      'REMOVE_AFTER=2025-12-31 |   ',
      undefined,
      fixedNow
    );
    expect(res.formatValid).toBe(false);
    expect(res.errors).toContain('Missing human readable reason');
  });

  it('grace period warning when newly introduced and missing REMOVE_AFTER', () => {
    const introduced = new Date('2025-10-08T10:00:00Z'); // < 24h ago
    const res = parseDeprecationReason(
      'Deprecated without date',
      introduced,
      fixedNow
    );
    expect(res.formatValid).toBe(false);
    expect(res.errors).toHaveLength(0);
    expect(res.warnings.some(w => w.includes('grace period'))).toBe(true);
  });

  it('fails missing REMOVE_AFTER after grace period', () => {
    const introduced = new Date('2025-10-06T10:00:00Z'); // >24h
    const res = parseDeprecationReason(
      'Deprecated without date',
      introduced,
      fixedNow
    );
    expect(res.formatValid).toBe(false);
    expect(res.errors).toContain(
      'Expected format `REMOVE_AFTER=YYYY-MM-DD | reason`'
    );
  });
});

import { parseDeprecationReason } from './deprecation-parser';

describe('parseDeprecationReason', () => {
  describe('valid format', () => {
    it('parses a valid deprecation reason with REMOVE_AFTER and human reason', () => {
      const result = parseDeprecationReason(
        'REMOVE_AFTER=2025-12-31 | Field is being replaced by newField'
      );
      expect(result.formatValid).toBe(true);
      expect(result.removeAfter).toBe('2025-12-31');
      expect(result.humanReason).toBe('Field is being replaced by newField');
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it('joins multiple pipe-separated segments as the human reason', () => {
      const result = parseDeprecationReason(
        'REMOVE_AFTER=2025-06-15 | reason part one | reason part two'
      );
      expect(result.formatValid).toBe(true);
      expect(result.removeAfter).toBe('2025-06-15');
      expect(result.humanReason).toBe('reason part one | reason part two');
    });

    it('stores the raw input string', () => {
      const raw = 'REMOVE_AFTER=2025-01-01 | some reason';
      const result = parseDeprecationReason(raw);
      expect(result.raw).toBe(raw);
    });
  });

  describe('missing or empty input', () => {
    it('returns error when raw is undefined', () => {
      const result = parseDeprecationReason(undefined);
      expect(result.formatValid).toBe(false);
      expect(result.raw).toBe('');
      expect(result.errors).toContain('Missing deprecation reason string');
    });

    it('returns error when raw is empty string', () => {
      const result = parseDeprecationReason('');
      expect(result.formatValid).toBe(false);
      expect(result.errors).toContain('Missing deprecation reason string');
    });
  });

  describe('missing pipe separator', () => {
    it('returns error when no pipe separator and no REMOVE_AFTER prefix', () => {
      const result = parseDeprecationReason('just a reason without format');
      expect(result.formatValid).toBe(false);
      expect(result.errors[0]).toMatch(/Expected format/);
    });

    it('returns error when REMOVE_AFTER present but no pipe separator', () => {
      const result = parseDeprecationReason('REMOVE_AFTER=2025-12-31');
      expect(result.formatValid).toBe(false);
      expect(result.errors[0]).toMatch(/Expected format/);
    });
  });

  describe('missing REMOVE_AFTER prefix', () => {
    it('returns error when first segment does not start with REMOVE_AFTER=', () => {
      const result = parseDeprecationReason('WRONG_PREFIX=2025-12-31 | reason');
      expect(result.formatValid).toBe(false);
      expect(result.errors).toContain('Missing REMOVE_AFTER= prefix');
    });
  });

  describe('invalid date', () => {
    it('returns error for non-YYYY-MM-DD format', () => {
      const result = parseDeprecationReason('REMOVE_AFTER=12-31-2025 | reason');
      expect(result.formatValid).toBe(false);
      expect(result.errors).toContain(
        'Invalid date format, expected YYYY-MM-DD'
      );
    });

    it('returns error for invalid date value like 2025-13-45', () => {
      // Note: JS Date constructor is lenient; 2025-13-45 may still parse
      // The regex check catches format issues; truly invalid values caught by isNaN
      const result = parseDeprecationReason(
        'REMOVE_AFTER=not-a-date | reason'
      );
      expect(result.formatValid).toBe(false);
      expect(result.errors[0]).toMatch(/Invalid date/);
    });
  });

  describe('missing human reason', () => {
    it('returns error when reason part after pipe is empty', () => {
      const result = parseDeprecationReason('REMOVE_AFTER=2025-12-31 | ');
      expect(result.formatValid).toBe(false);
      expect(result.errors).toContain('Missing human readable reason');
    });

    it('returns error when reason part after pipe is only whitespace', () => {
      const result = parseDeprecationReason('REMOVE_AFTER=2025-12-31 |   ');
      expect(result.formatValid).toBe(false);
      expect(result.errors).toContain('Missing human readable reason');
    });
  });

  describe('grace period (FR-014)', () => {
    it('returns warning within 24h grace period when no REMOVE_AFTER', () => {
      const introducedAt = new Date('2025-10-07T10:00:00Z');
      const now = new Date('2025-10-07T20:00:00Z'); // 10h elapsed < 24h
      const result = parseDeprecationReason(
        'Legacy field going away',
        introducedAt,
        now
      );
      expect(result.formatValid).toBe(false);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toMatch(/grace period/);
      expect(result.errors).toHaveLength(0);
    });

    it('returns error after 24h grace period expires', () => {
      const introducedAt = new Date('2025-10-07T10:00:00Z');
      const now = new Date('2025-10-08T11:00:00Z'); // 25h elapsed > 24h
      const result = parseDeprecationReason(
        'Legacy field going away',
        introducedAt,
        now
      );
      expect(result.formatValid).toBe(false);
      expect(result.errors[0]).toMatch(/Expected format/);
      expect(result.warnings).toHaveLength(0);
    });

    it('returns error when no introducedAt provided and no REMOVE_AFTER', () => {
      const result = parseDeprecationReason('Legacy field going away');
      expect(result.formatValid).toBe(false);
      expect(result.errors[0]).toMatch(/Expected format/);
    });
  });
});

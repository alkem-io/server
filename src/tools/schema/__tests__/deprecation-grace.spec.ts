import { parseDeprecationReason } from '../deprecation-parser';

describe('FR-014 deprecation grace period', () => {
  it('returns warning (grace) for newly added deprecation without REMOVE_AFTER within 24h', () => {
    const introducedAt = new Date('2025-10-07T10:00:00Z');
    const now = new Date('2025-10-07T15:59:59Z'); // < 24h elapsed
    const res = parseDeprecationReason(
      'Legacy field going away soon',
      introducedAt,
      now
    );
    expect(res.formatValid).toBe(false);
    expect(res.warnings).toHaveLength(1);
    expect(res.errors).toHaveLength(0);
  });

  it('returns error after grace window expires', () => {
    const introducedAt = new Date('2025-10-07T10:00:00Z');
    const now = new Date('2025-10-08T11:00:00Z'); // > 24h elapsed
    const res = parseDeprecationReason(
      'Legacy field going away soon',
      introducedAt,
      now
    );
    expect(res.formatValid).toBe(false);
    expect(res.warnings).toHaveLength(0);
    expect(res.errors).toHaveLength(1);
    expect(res.errors[0]).toMatch(/Expected format/);
  });
});

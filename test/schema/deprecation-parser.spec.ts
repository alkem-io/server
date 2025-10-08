import { parseDeprecationReason } from '../../src/tools/schema/deprecation-parser';

describe('parseDeprecationReason', () => {
  it('parses valid reason', () => {
    const r = parseDeprecationReason(
      'REMOVE_AFTER=2030-01-15 | cleanup old field'
    );
    expect(r.formatValid).toBe(true);
    expect(r.removeAfter).toBe('2030-01-15');
    expect(r.humanReason).toBe('cleanup old field');
  });

  it('flags invalid format', () => {
    const r = parseDeprecationReason('2030-01-15 cleanup old field');
    expect(r.formatValid).toBe(false);
    expect(r.errors.length).toBeGreaterThan(0);
  });
});

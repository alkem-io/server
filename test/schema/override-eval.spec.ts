import { evaluateOverride } from '../../src/tools/schema/override';

describe('override evaluation', () => {
  const owners = ['alice', 'org/team'];

  it('returns not applied when no reviews', () => {
    const res = evaluateOverride(owners, []);
    expect(res.applied).toBe(false);
  });

  it('rejects review without phrase', () => {
    const res = evaluateOverride(owners, [
      { reviewer: 'alice', body: 'Looks good', state: 'APPROVED' },
    ]);
    expect(res.applied).toBe(false);
  });

  it('rejects non-owner with phrase', () => {
    const res = evaluateOverride(owners, [
      { reviewer: 'bob', body: 'BREAKING-APPROVED', state: 'APPROVED' },
    ]);
    expect(res.applied).toBe(false);
  });

  it('accepts owner with phrase', () => {
    const res = evaluateOverride(owners, [
      {
        reviewer: 'alice',
        body: 'Risk accepted BREAKING-APPROVED',
        state: 'APPROVED',
      },
    ]);
    expect(res.applied).toBe(true);
    expect(res.reviewer).toBe('alice');
  });
});

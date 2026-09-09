import { describe, expect, it, vi } from 'vitest';
import { BackfillMemoSigningEntitlement1788947200100 } from '../1788947200100-BackfillMemoSigningEntitlement';

describe('BackfillMemoSigningEntitlement migration', () => {
  it('adds a disabled flag to existing space and collaboration licenses', async () => {
    const queryRunner = { query: vi.fn().mockResolvedValue(undefined) };

    await new BackfillMemoSigningEntitlement1788947200100().up(
      queryRunner as any
    );

    expect(queryRunner.query).toHaveBeenCalledTimes(2);
    expect(queryRunner.query.mock.calls.map(call => call[1])).toEqual([
      ['space-flag-memo-signing', 'flag', false, 'space'],
      ['space-flag-memo-signing', 'flag', false, 'collaboration'],
    ]);
    for (const [sql] of queryRunner.query.mock.calls) {
      expect(sql).toMatch(/INSERT INTO license_entitlement/);
      expect(sql).toMatch(/NOT EXISTS/);
    }
  });

  it('removes only the memo-signing entitlement', async () => {
    const queryRunner = { query: vi.fn().mockResolvedValue(undefined) };

    await new BackfillMemoSigningEntitlement1788947200100().down(
      queryRunner as any
    );

    expect(queryRunner.query).toHaveBeenCalledWith(
      expect.stringMatching(/DELETE FROM license_entitlement/),
      ['space-flag-memo-signing']
    );
  });
});

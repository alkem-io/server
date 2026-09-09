import { describe, expect, it, vi } from 'vitest';
import { AddMemoSigningEntitlement1788947200000 } from '../1788947200000-AddMemoSigningEntitlement';

describe('AddMemoSigningEntitlement migration', () => {
  it('adds the admin plan and policy rule once', async () => {
    const queryRunner = {
      query: vi
        .fn()
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ id: 'framework-1' }])
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce([{ id: 'policy-1', credentialRules: [] }])
        .mockResolvedValueOnce(undefined),
    };

    await new AddMemoSigningEntitlement1788947200000().up(
      queryRunner as any
    );

    expect(queryRunner.query).toHaveBeenCalledTimes(5);
    expect(queryRunner.query.mock.calls[2][0]).toMatch(
      /INSERT INTO license_plan/
    );
    expect(queryRunner.query.mock.calls[2][1]).toEqual([
      expect.any(String),
      'SPACE_FEATURE_MEMO_SIGNING',
      110,
      'space-feature-memo-signing',
      'framework-1',
    ]);
    expect(queryRunner.query.mock.calls[4][0]).toMatch(
      /UPDATE license_policy/
    );
    expect(JSON.parse(queryRunner.query.mock.calls[4][1][0])).toEqual([
      {
        id: expect.any(String),
        credentialType: 'space-feature-memo-signing',
        grantedEntitlements: [
          { type: 'space-flag-memo-signing', limit: 1 },
        ],
        name: 'Space Memo Signing',
      },
    ]);
  });

  it('does not duplicate an existing plan or policy rule', async () => {
    const queryRunner = {
      query: vi
        .fn()
        .mockResolvedValueOnce([{ id: 'plan-1' }])
        .mockResolvedValueOnce([
          {
            id: 'policy-1',
            credentialRules: [
              { credentialType: 'space-feature-memo-signing' },
            ],
          },
        ]),
    };

    await new AddMemoSigningEntitlement1788947200000().up(
      queryRunner as any
    );

    expect(queryRunner.query).toHaveBeenCalledTimes(2);
  });

  it('removes only the memo-signing plan and policy rule', async () => {
    const queryRunner = {
      query: vi
        .fn()
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce([
          {
            id: 'policy-1',
            credentialRules: [
              { credentialType: 'space-feature-save-as-template' },
              { credentialType: 'space-feature-memo-signing' },
            ],
          },
        ])
        .mockResolvedValueOnce(undefined),
    };

    await new AddMemoSigningEntitlement1788947200000().down(
      queryRunner as any
    );

    expect(queryRunner.query.mock.calls[0]).toEqual([
      expect.stringMatching(/DELETE FROM license_plan/),
      ['SPACE_FEATURE_MEMO_SIGNING'],
    ]);
    expect(JSON.parse(queryRunner.query.mock.calls[2][1][0])).toEqual([
      { credentialType: 'space-feature-save-as-template' },
    ]);
  });
});

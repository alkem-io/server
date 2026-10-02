import { describe, expect, it, vi } from 'vitest';
import { BackfillWhiteboardTemplateDefaultTagsets1790669200000 } from '../1790669200000-BackfillWhiteboardTemplateDefaultTagsets';

const migration = () =>
  new BackfillWhiteboardTemplateDefaultTagsets1790669200000();

const queryRunner = (
  results: Array<Record<string, string | number>> = [
    {
      candidateCount: 0,
      missingAuthorizationCount: 0,
      invalidDefaultTypeCount: 0,
      duplicateDefaultCount: 0,
    },
    { insertedCount: 0 },
    {
      remainingCandidateCount: 0,
      invalidDefaultTypeCount: 0,
      duplicateDefaultCount: 0,
    },
  ]
) => ({
  query: vi
    .fn()
    .mockResolvedValueOnce([results[0]])
    .mockResolvedValueOnce([results[1]])
    .mockResolvedValueOnce([results[2]]),
});

describe('BackfillWhiteboardTemplateDefaultTagsets migration', () => {
  it('exports the expected migration shape', () => {
    expect(typeof migration().up).toBe('function');
    expect(typeof migration().down).toBe('function');
  });

  it('selects every eligible Whiteboard Template profile without a production cardinality gate', async () => {
    const runner = queryRunner([
      {
        candidateCount: 3,
        missingAuthorizationCount: 0,
        invalidDefaultTypeCount: 0,
        duplicateDefaultCount: 0,
      },
      { insertedCount: 3 },
      {
        remainingCandidateCount: 0,
        invalidDefaultTypeCount: 0,
        duplicateDefaultCount: 0,
      },
    ]);

    await migration().up(runner as any);

    const sql = runner.query.mock.calls.map(([statement]) => statement).join('\n');
    expect(sql).toContain('FROM template t');
    expect(sql).toContain('JOIN whiteboard w ON w.id = t."whiteboardId"');
    expect(sql).toContain('JOIN profile p ON p.id = w."profileId"');
    expect(sql).toContain("t.type = 'whiteboard'");
    expect(sql).toContain("LOWER(existing.name) = 'default'");
    expect(sql).not.toContain("existing.type = 'freeform'");
    expect(sql).not.toMatch(/\b117\b/);
  });

  it.each([
    ['zero', 0],
    ['one', 1],
    ['multiple', 3],
  ])('emits auditable counts for a %s-cardinality run', async (_label, count) => {
    const runner = queryRunner([
      {
        candidateCount: count,
        missingAuthorizationCount: 0,
        invalidDefaultTypeCount: 0,
        duplicateDefaultCount: 0,
      },
      { insertedCount: count },
      {
        remainingCandidateCount: 0,
        invalidDefaultTypeCount: 0,
        duplicateDefaultCount: 0,
      },
    ]);
    const output = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    try {
      await migration().up(runner as any);
      expect(runner.query).toHaveBeenCalledTimes(3);
      expect(output.mock.calls.map(([message]) => JSON.parse(message))).toEqual([
        {
          migration: 'BackfillWhiteboardTemplateDefaultTagsets',
          phase: 'preflight',
          candidateCount: count,
          missingAuthorizationCount: 0,
          invalidDefaultTypeCount: 0,
          duplicateDefaultCount: 0,
        },
        {
          migration: 'BackfillWhiteboardTemplateDefaultTagsets',
          phase: 'insert',
          insertedCount: count,
        },
        {
          migration: 'BackfillWhiteboardTemplateDefaultTagsets',
          phase: 'postflight',
          remainingCandidateCount: 0,
          invalidDefaultTypeCount: 0,
          duplicateDefaultCount: 0,
        },
      ]);
    } finally {
      output.mockRestore();
    }
  });

  it('emits preflight counts and fails before insert for missing authorization', async () => {
    const runner = queryRunner([
      {
        candidateCount: 1,
        missingAuthorizationCount: 1,
        invalidDefaultTypeCount: 0,
        duplicateDefaultCount: 0,
      },
      { insertedCount: 1 },
      {
        remainingCandidateCount: 0,
        invalidDefaultTypeCount: 0,
        duplicateDefaultCount: 0,
      },
    ]);
    const output = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    try {
      await expect(migration().up(runner as any)).rejects.toThrow(
        'Whiteboard Template profile is missing its authorization policy'
      );
      expect(runner.query).toHaveBeenCalledTimes(1);
      expect(JSON.parse(output.mock.calls[0][0])).toMatchObject({
        phase: 'preflight',
        missingAuthorizationCount: 1,
      });
    } finally {
      output.mockRestore();
    }
  });

  it('rejects wrong-type or duplicate defaults before insert and a non-zero postflight remainder', async () => {
    const invalidTypeRunner = queryRunner([
      {
        candidateCount: 0,
        missingAuthorizationCount: 0,
        invalidDefaultTypeCount: 1,
        duplicateDefaultCount: 0,
      },
      { insertedCount: 0 },
      {
        remainingCandidateCount: 0,
        invalidDefaultTypeCount: 0,
        duplicateDefaultCount: 0,
      },
    ]);
    await expect(migration().up(invalidTypeRunner as any)).rejects.toThrow(
      'Whiteboard Template profile has a default tagset with an invalid type'
    );
    expect(invalidTypeRunner.query).toHaveBeenCalledTimes(1);

    const duplicateRunner = queryRunner([
      {
        candidateCount: 0,
        missingAuthorizationCount: 0,
        invalidDefaultTypeCount: 0,
        duplicateDefaultCount: 1,
      },
      { insertedCount: 0 },
      {
        remainingCandidateCount: 0,
        invalidDefaultTypeCount: 0,
        duplicateDefaultCount: 0,
      },
    ]);
    await expect(migration().up(duplicateRunner as any)).rejects.toThrow(
      'Whiteboard Template profile has duplicate default tagsets'
    );
    expect(duplicateRunner.query).toHaveBeenCalledTimes(1);

    const remainderRunner = queryRunner([
      {
        candidateCount: 1,
        missingAuthorizationCount: 0,
        invalidDefaultTypeCount: 0,
        duplicateDefaultCount: 0,
      },
      { insertedCount: 1 },
      {
        remainingCandidateCount: 1,
        invalidDefaultTypeCount: 0,
        duplicateDefaultCount: 0,
      },
    ]);
    await expect(migration().up(remainderRunner as any)).rejects.toThrow(
      'Whiteboard Template profile remains without a default freeform tagset'
    );
    expect(remainderRunner.query).toHaveBeenCalledTimes(3);

    const postflightInvalidTypeRunner = queryRunner([
      {
        candidateCount: 1,
        missingAuthorizationCount: 0,
        invalidDefaultTypeCount: 0,
        duplicateDefaultCount: 0,
      },
      { insertedCount: 1 },
      {
        remainingCandidateCount: 0,
        invalidDefaultTypeCount: 1,
        duplicateDefaultCount: 0,
      },
    ]);
    await expect(
      migration().up(postflightInvalidTypeRunner as any)
    ).rejects.toThrow(
      'Whiteboard Template profile has a default tagset with an invalid type after backfill'
    );
    expect(postflightInvalidTypeRunner.query).toHaveBeenCalledTimes(3);
  });

  it('creates one authorized empty default tagset by inheriting cascading profile rules', async () => {
    const runner = queryRunner();
    await migration().up(runner as any);
    const insert = runner.query.mock.calls[1][0] as string;

    expect(insert).toContain('INSERT INTO authorization_policy');
    expect(insert).toContain('jsonb_array_elements(profile_credential_rules)');
    expect(insert).toContain("rule ->> 'cascade'");
    expect(insert).toContain('INSERT INTO tagset');
    expect(insert).toContain('JOIN inserted_authorizations');
    expect(insert).toContain("'default'");
    expect(insert).toContain("'freeform'");
    expect(insert).toContain("''");
  });

  it('is idempotent when preflight has no remaining candidates', async () => {
    const runner = queryRunner();
    await migration().up(runner as any);
    const insert = runner.query.mock.calls[1][0] as string;

    expect(insert).toContain('NOT EXISTS');
    expect(insert).toContain('FROM inserted_tagsets');
  });

  it('leaves down non-destructive', async () => {
    const runner = queryRunner();
    await expect(migration().down(runner as any)).resolves.toBeUndefined();
    expect(runner.query).not.toHaveBeenCalled();
  });
});

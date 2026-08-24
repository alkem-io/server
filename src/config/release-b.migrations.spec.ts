import type { QueryRunner } from 'typeorm';
import { vi } from 'vitest';
import { DropLegacyMemoWhiteboardContent1787551200000 } from '../migrations/1787551200000-DropLegacyMemoWhiteboardContent';

type Counts = {
  memoUnmigrated: number;
  whiteboardUnmigrated: number;
};

const mockRunner = (counts: Counts) => {
  const query = vi.fn(async (statement: string) => {
    if (/SELECT[\s\S]+memoUnmigrated/.test(statement)) {
      return [counts];
    }
    return undefined;
  });
  return { runner: { query } as unknown as QueryRunner, query };
};

const statementsOf = (query: ReturnType<typeof vi.fn>): string[] =>
  query.mock.calls.map(call => String(call[0]));

describe('006 Release B legacy content-column drop', () => {
  it('locks both owner tables, proves zero NULL/blank pointers, then drops only the legacy content columns', async () => {
    const { runner, query } = mockRunner({
      memoUnmigrated: 0,
      whiteboardUnmigrated: 0,
    });

    await new DropLegacyMemoWhiteboardContent1787551200000().up(runner);

    const statements = statementsOf(query);
    expect(statements).toHaveLength(4);
    expect(statements[0]).toMatch(
      /LOCK TABLE "memo", "whiteboard" IN ACCESS EXCLUSIVE MODE/
    );
    expect(statements[1]).toMatch(
      /FROM "memo"[\s\S]+"contentPointer" IS NULL[\s\S]+btrim\("contentPointer"\) = ''/
    );
    expect(statements[1]).toMatch(
      /FROM "whiteboard"[\s\S]+"contentPointer" IS NULL[\s\S]+btrim\("contentPointer"\) = ''/
    );
    expect(statements.slice(2)).toEqual([
      `ALTER TABLE "memo" DROP COLUMN "content"`,
      `ALTER TABLE "whiteboard" DROP COLUMN "content"`,
    ]);
    expect(statements.some(s => /ALTER COLUMN "contentPointer"/i.test(s))).toBe(
      false
    );
  });

  it.each([
    {
      type: 'memo',
      counts: { memoUnmigrated: 1, whiteboardUnmigrated: 0 },
    },
    {
      type: 'whiteboard',
      counts: { memoUnmigrated: 0, whiteboardUnmigrated: 1 },
    },
  ] as const)('fails closed before either DROP when $type has an unmigrated row', async ({
    counts,
  }) => {
    const { runner, query } = mockRunner(counts);

    await expect(
      new DropLegacyMemoWhiteboardContent1787551200000().up(runner)
    ).rejects.toThrow(/refused.*NULL or blank contentPointer/i);

    expect(statementsOf(query)).toHaveLength(2);
    expect(
      statementsOf(query).some(s => /DROP COLUMN "content"/i.test(s))
    ).toBe(false);
  });

  it('fails closed when the preflight result is missing or malformed', async () => {
    const query = vi.fn(async () => []);
    const runner = { query } as unknown as QueryRunner;

    await expect(
      new DropLegacyMemoWhiteboardContent1787551200000().up(runner)
    ).rejects.toThrow(/invalid preflight result/i);
    expect(statementsOf(query)).toHaveLength(2);
  });

  it('has no dishonest down migration after destroying the legacy bytes', async () => {
    const { runner, query } = mockRunner({
      memoUnmigrated: 0,
      whiteboardUnmigrated: 0,
    });

    await expect(
      new DropLegacyMemoWhiteboardContent1787551200000().down(runner)
    ).rejects.toThrow(/irreversible.*backup/i);
    expect(query).not.toHaveBeenCalled();
  });
});

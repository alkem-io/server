import type { QueryRunner } from 'typeorm';
import { vi } from 'vitest';
import { AddContentPointer1781802081405 } from '../migrations/1781802081405-AddContentPointer';
import { DefaultLegacyWhiteboardContent1781950000000 } from '../migrations/1781950000000-DefaultLegacyWhiteboardContent';

// RED/pins for the 006 staged rollout — Release A migration shape. Lives in
// src/config/ (NOT src/migrations/) so the CLI migration glob and the
// "every migration file imports only typeorm/node-builtins" guard never pick it up.
//
// NOTE: these assert the emitted DDL statements (a committed characterization
// pin). The DISCRIMINATING behavioural proof that an INSERT omitting `content`
// fails before the default and succeeds after — while an explicit NULL still
// fails — is a runtime transcript against a throwaway table (the repo has no
// DB-backed test harness); see the Release A report's evidence path.

const mockRunner = () => {
  const query = vi.fn(async () => undefined);
  return { runner: { query } as unknown as QueryRunner, query };
};
const statementsOf = (query: ReturnType<typeof vi.fn>): string[] =>
  query.mock.calls.map(c => String(c[0]));

describe('006 Release A content migrations', () => {
  describe('AddContentPointer1781802081405', () => {
    it('adds NULLABLE contentPointer columns and runs NO fake-id back-fill', async () => {
      const { runner, query } = mockRunner();
      await new AddContentPointer1781802081405().up(runner);
      const statements = statementsOf(query);

      expect(
        statements.some(s => /ALTER TABLE "memo" ADD "contentPointer"/.test(s))
      ).toBe(true);
      expect(
        statements.some(s =>
          /ALTER TABLE "whiteboard" ADD "contentPointer"/.test(s)
        )
      ).toBe(true);
      // The fake `contentPointer = id` back-fill (F1) is removed: no UPDATE runs.
      expect(statements.some(s => /UPDATE/i.test(s))).toBe(false);
      expect(statements.some(s => /"contentPointer"\s*=\s*"id"/i.test(s))).toBe(
        false
      );
    });
  });

  describe('DefaultLegacyWhiteboardContent1781950000000 (DDL characterization pin)', () => {
    it("up() adds ONLY a DEFAULT '' to whiteboard.content and never touches NOT NULL", async () => {
      const { runner, query } = mockRunner();
      await new DefaultLegacyWhiteboardContent1781950000000().up(runner);
      expect(statementsOf(query)).toEqual([
        `ALTER TABLE "whiteboard" ALTER COLUMN "content" SET DEFAULT ''`,
      ]);
      expect(statementsOf(query).some(s => /NOT NULL/i.test(s))).toBe(false);
    });

    it('down() drops ONLY the default and never touches NOT NULL', async () => {
      const { runner, query } = mockRunner();
      await new DefaultLegacyWhiteboardContent1781950000000().down(runner);
      expect(statementsOf(query)).toEqual([
        `ALTER TABLE "whiteboard" ALTER COLUMN "content" DROP DEFAULT`,
      ]);
      expect(statementsOf(query).some(s => /NOT NULL/i.test(s))).toBe(false);
    });
  });

  it('Release A itself never drops the legacy content columns', async () => {
    const { runner, query } = mockRunner();
    await new AddContentPointer1781802081405().up(runner);
    await new DefaultLegacyWhiteboardContent1781950000000().up(runner);

    expect(
      statementsOf(query).some(s =>
        /ALTER TABLE "(?:memo|whiteboard)" DROP COLUMN "content"/i.test(s)
      )
    ).toBe(false);
  });
});

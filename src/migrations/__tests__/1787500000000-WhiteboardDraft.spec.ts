import { QueryRunner } from 'typeorm';
import { describe, expect, it, vi } from 'vitest';
import { WhiteboardDraft1787500000000 } from '../1787500000000-WhiteboardDraft';

describe('WhiteboardDraft1787500000000', () => {
  it('adds only a nullable expiry marker and a partial index', async () => {
    const queryRunner = { query: vi.fn() } as unknown as QueryRunner;

    await new WhiteboardDraft1787500000000().up(queryRunner);

    const sql = vi.mocked(queryRunner.query).mock.calls.flat().join('\n');
    expect(sql).toContain('ALTER TABLE "whiteboard" ADD "draftExpiresAt"');
    expect(sql).toContain('WHERE "draftExpiresAt" IS NOT NULL');
    expect(sql).not.toContain('CREATE TABLE');
  });

  it('refuses rollback while any live draft marker remains', async () => {
    const queryRunner = { query: vi.fn() } as unknown as QueryRunner;

    await new WhiteboardDraft1787500000000().down(queryRunner);

    const sql = vi.mocked(queryRunner.query).mock.calls.flat().join('\n');
    expect(sql).toContain('WHERE "draftExpiresAt" IS NOT NULL');
    expect(sql).toContain('Refusing to remove draftExpiresAt');
    expect(sql).toContain('DROP COLUMN "draftExpiresAt"');
  });
});

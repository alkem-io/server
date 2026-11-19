import { describe, expect, it } from 'vitest';
import { parseCollaborationMigrationCommand } from './collaboration-migration.cli';

const actorId = '11111111-1111-4111-8111-111111111111';
const memoId = '22222222-2222-4222-8222-222222222222';

describe('parseCollaborationMigrationCommand', () => {
  it('makes memo image repair a read-only dry run unless apply is explicit', () => {
    expect(
      parseCollaborationMigrationCommand([
        '--repair-memo-images',
        '--actor-id',
        actorId,
        '--memo-id',
        memoId,
      ])
    ).toEqual({
      mode: 'repair-memo-images',
      actorId,
      apply: false,
      memoIds: [memoId],
    });
    expect(
      parseCollaborationMigrationCommand([
        '--repair-memo-images',
        `--actor-id=${actorId}`,
        '--apply',
      ])
    ).toEqual({
      mode: 'repair-memo-images',
      actorId,
      apply: true,
      memoIds: [],
    });
  });

  it('rejects ambiguous modes, unknown flags, missing actors, and malformed ids', () => {
    expect(parseCollaborationMigrationCommand([])).toBeUndefined();
    expect(
      parseCollaborationMigrationCommand(['--migrate', '--verify'])
    ).toBeUndefined();
    expect(
      parseCollaborationMigrationCommand(['--repair-memo-images'])
    ).toBeUndefined();
    expect(
      parseCollaborationMigrationCommand([
        '--repair-memo-images',
        '--actor-id=not-a-uuid',
      ])
    ).toBeUndefined();
    expect(
      parseCollaborationMigrationCommand(['--verify', '--apply'])
    ).toBeUndefined();
  });
});

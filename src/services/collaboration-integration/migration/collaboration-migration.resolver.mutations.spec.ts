import { AuthorizationPrivilege } from '@common/enums';
import { ActorContext } from '@core/actor-context/actor.context';
import { describe, expect, it, vi } from 'vitest';
import { CollaborationMigrationResolverMutations } from './collaboration-migration.resolver.mutations';

const summary = {
  total: 3,
  migrated: 2,
  flagged: 1,
  failed: 0,
  flaggedDocuments: [{ id: 'bad', reason: 'bad content' }],
  failedDocuments: [],
  dryRun: false,
};

const createResolver = () => {
  const migration = {
    migrateMemos: vi.fn().mockResolvedValue(summary),
    migrateWhiteboards: vi.fn().mockResolvedValue(summary),
  };
  const authorization = { grantAccessOrFail: vi.fn() };
  const platformPolicy = { id: 'platform-policy' };
  const platformAuthorization = {
    getPlatformAuthorizationPolicy: vi.fn().mockResolvedValue(platformPolicy),
  };
  const audit = { recordOperation: vi.fn().mockResolvedValue(undefined) };
  const resolver = new CollaborationMigrationResolverMutations(
    migration as any,
    authorization as any,
    platformAuthorization as any,
    audit as any
  );
  const actor = { actorID: 'actor-1' } as ActorContext;
  return {
    resolver,
    migration,
    authorization,
    platformAuthorization,
    platformPolicy,
    audit,
    actor,
  };
};

describe('CollaborationMigrationResolverMutations', () => {
  it('migrates only memos and returns operator counters', async () => {
    const ctx = createResolver();

    await expect(
      ctx.resolver.migrateLegacyMemoContent(ctx.actor)
    ).resolves.toEqual({
      total: 3,
      migrated: 2,
      flagged: 1,
      failed: 0,
      flaggedDocuments: [{ id: 'bad', reason: 'bad content' }],
      failedDocuments: [],
    });
    expect(ctx.migration.migrateMemos).toHaveBeenCalledTimes(1);
    expect(ctx.migration.migrateWhiteboards).not.toHaveBeenCalled();
    expect(ctx.authorization.grantAccessOrFail).toHaveBeenCalledWith(
      ctx.actor,
      ctx.platformPolicy,
      AuthorizationPrivilege.PLATFORM_OPERATIONS_ADMIN,
      'migrateLegacyMemoContent'
    );
  });

  it('migrates only whiteboards and audits the result', async () => {
    const ctx = createResolver();

    await ctx.resolver.migrateLegacyWhiteboardContent(ctx.actor);

    expect(ctx.migration.migrateWhiteboards).toHaveBeenCalledTimes(1);
    expect(ctx.migration.migrateMemos).not.toHaveBeenCalled();
    expect(ctx.audit.recordOperation).toHaveBeenCalledWith({
      actorID: 'actor-1',
      action: 'migrateLegacyWhiteboardContent',
      outcome: 'success',
      target: {
        total: 3,
        migrated: 2,
        flagged: 1,
        failed: 0,
        flaggedDocuments: [{ id: 'bad', reason: 'bad content' }],
        failedDocuments: [],
      },
    });
  });

  it('does not start migration when platform-operations authorization fails', async () => {
    const ctx = createResolver();
    const denied = new Error('denied');
    ctx.authorization.grantAccessOrFail.mockImplementation(() => {
      throw denied;
    });

    await expect(ctx.resolver.migrateLegacyMemoContent(ctx.actor)).rejects.toBe(
      denied
    );
    expect(ctx.migration.migrateMemos).not.toHaveBeenCalled();
    expect(ctx.audit.recordOperation).toHaveBeenCalledWith({
      actorID: 'actor-1',
      action: 'migrateLegacyMemoContent',
      outcome: 'failure',
      error: denied,
    });
  });
});

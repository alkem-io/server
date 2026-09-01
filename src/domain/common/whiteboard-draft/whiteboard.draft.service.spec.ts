import { LogContext } from '@common/enums';
import { ActorContext } from '@core/actor-context/actor.context';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { Whiteboard } from '@domain/common/whiteboard/whiteboard.entity';
import { WhiteboardService } from '@domain/common/whiteboard/whiteboard.service';
import { WhiteboardAuthorizationService } from '@domain/common/whiteboard/whiteboard.service.authorization';
import { IStorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.interface';
import {
  DataSource,
  FindOperator,
  QueryRunner,
  Repository,
  SelectQueryBuilder,
} from 'typeorm';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { WhiteboardDraftService } from './whiteboard.draft.service';

class AdvisoryLockHarness {
  private readonly held = new Set<string>();
  private readonly waiters = new Map<string, Array<() => void>>();

  async acquire(key: string): Promise<void> {
    if (!this.held.has(key)) {
      this.held.add(key);
      return;
    }
    await new Promise<void>(resolve => {
      const waiters = this.waiters.get(key) ?? [];
      waiters.push(resolve);
      this.waiters.set(key, waiters);
    });
  }

  release(key: string): void {
    const next = this.waiters.get(key)?.shift();
    if (next) {
      next();
      return;
    }
    this.held.delete(key);
  }

  waiting(key: string): number {
    return this.waiters.get(key)?.length ?? 0;
  }
}

describe('WhiteboardDraftService', () => {
  const actorContext = {
    actorID: '6c0552d4-a1e6-4e52-b008-28c3fbd29e67',
  } as ActorContext;
  const parentAuthorization = { id: 'parent-auth' } as IAuthorizationPolicy;
  const draftID = 'draft-wb';
  let drafts: Map<string, Whiteboard>;
  let repository: Pick<Repository<Whiteboard>, 'find' | 'createQueryBuilder'>;
  // Chainable stand-in for the query builder findExpired() now drives.
  let expiredQueryBuilder: Record<
    'select' | 'where' | 'orderBy' | 'limit' | 'getRawMany',
    ReturnType<typeof vi.fn>
  >;
  let expiredRows: Array<{ id: string }>;
  let lockedRepository: Pick<Repository<Whiteboard>, 'findOne' | 'update'>;
  let whiteboardService: Pick<
    WhiteboardService,
    'createWhiteboard' | 'deleteWhiteboard'
  >;
  const whiteboardAuthorizationService = { applyAuthorizationPolicy: vi.fn() };
  const authorizationPolicyService = { saveAll: vi.fn() };
  const logger = { log: vi.fn(), error: vi.fn(), warn: vi.fn() };
  let lockHarness: AdvisoryLockHarness;
  let dataSource: Pick<DataSource, 'createQueryRunner'>;
  let service: WhiteboardDraftService;

  const futureDraft = (id = draftID): Whiteboard =>
    ({
      id,
      createdBy: actorContext.actorID,
      draftExpiresAt: new Date(Date.now() + 60_000),
    }) as Whiteboard;

  beforeEach(() => {
    vi.clearAllMocks();
    drafts = new Map();
    expiredRows = [];
    expiredQueryBuilder = {
      select: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      getRawMany: vi.fn(async () => expiredRows),
    };
    repository = {
      find: vi.fn(),
      createQueryBuilder: vi.fn(
        () => expiredQueryBuilder as unknown as SelectQueryBuilder<Whiteboard>
      ),
    };
    lockedRepository = {
      findOne: vi.fn(async options => {
        const where = options.where as {
          id: string;
          draftExpiresAt?: unknown;
        };
        const draft = drafts.get(where.id);
        if (!draft) return null;
        if (
          where.draftExpiresAt !== undefined &&
          (!draft.draftExpiresAt || draft.draftExpiresAt.getTime() > Date.now())
        ) {
          return null;
        }
        return draft;
      }),
      update: vi.fn(async (ids: string | string[], update) => {
        for (const id of Array.isArray(ids) ? ids : [ids]) {
          const draft = drafts.get(id);
          if (draft && update.draftExpiresAt !== undefined) {
            draft.draftExpiresAt = update.draftExpiresAt as Date;
          }
        }
        return { affected: 1, raw: [], generatedMaps: [] };
      }),
    };
    whiteboardService = {
      createWhiteboard: vi.fn(),
      deleteWhiteboard: vi.fn(async id => {
        drafts.delete(id);
        return {} as Whiteboard;
      }),
    };
    lockHarness = new AdvisoryLockHarness();
    dataSource = {
      createQueryRunner: vi.fn(() => {
        const runner = {
          connect: vi.fn(),
          release: vi.fn(),
          manager: {
            getRepository: vi.fn(() => lockedRepository),
          },
          query: vi.fn(async (sql: string, parameters: string[]) => {
            if (sql.startsWith('SET lock_timeout')) {
              return [];
            }
            const key = parameters[0];
            if (sql.includes('pg_advisory_unlock')) {
              lockHarness.release(key);
              return [{ pg_advisory_unlock: true }];
            }
            if (!sql.includes('pg_advisory_lock')) {
              throw new Error('expected PostgreSQL advisory lock query');
            }
            await lockHarness.acquire(key);
            return [{ pg_advisory_lock: null }];
          }),
        } as unknown as QueryRunner;
        return runner;
      }),
    };
    service = new WhiteboardDraftService(
      repository as Repository<Whiteboard>,
      whiteboardService as WhiteboardService,
      whiteboardAuthorizationService as unknown as WhiteboardAuthorizationService,
      authorizationPolicyService as unknown as AuthorizationPolicyService,
      dataSource as DataSource,
      logger
    );
    whiteboardAuthorizationService.applyAuthorizationPolicy.mockResolvedValue(
      []
    );
  });

  it('creates an ordinary Whiteboard with only a draft expiry marker', async () => {
    vi.mocked(whiteboardService.createWhiteboard).mockResolvedValue({
      id: 'wb-1',
    } as Whiteboard);

    const result = await service.materialize(
      {},
      {} as IStorageAggregator,
      parentAuthorization,
      actorContext
    );

    expect(whiteboardService.createWhiteboard).toHaveBeenCalledWith(
      expect.objectContaining({
        draftExpiresAt: expect.any(Date),
        profile: { displayName: 'Whiteboard draft' },
      }),
      expect.anything(),
      actorContext
    );
    expect(result).toBe('wb-1');
    expect(
      whiteboardAuthorizationService.applyAuthorizationPolicy
    ).toHaveBeenCalledWith('wb-1', parentAuthorization);
    expect(authorizationPolicyService.saveAll).toHaveBeenCalledWith([]);
  });

  it('deletes the draft when its authorization cannot be initialized', async () => {
    vi.mocked(whiteboardService.createWhiteboard).mockResolvedValue({
      id: 'wb-1',
    } as Whiteboard);
    whiteboardAuthorizationService.applyAuthorizationPolicy.mockRejectedValue(
      new Error('authorization failed')
    );

    await expect(
      service.materialize(
        {},
        {} as IStorageAggregator,
        parentAuthorization,
        actorContext
      )
    ).rejects.toThrow('authorization failed');

    expect(whiteboardService.deleteWhiteboard).toHaveBeenCalledWith('wb-1');
  });

  it('serializes concurrent final submissions so only one materializes', async () => {
    drafts.set(draftID, futureDraft());
    let materializations = 0;
    let allowFirstToFinish!: () => void;
    let firstStarted!: () => void;
    const firstStartedPromise = new Promise<void>(resolve => {
      firstStarted = resolve;
    });
    const finishFirstPromise = new Promise<void>(resolve => {
      allowFirstToFinish = resolve;
    });

    const finalize = async (): Promise<void> => {
      const consumption = await service.acquireForConsumption(
        [draftID],
        actorContext
      );
      try {
        materializations++;
        firstStarted();
        await finishFirstPromise;
        await consumption.complete();
      } finally {
        await consumption.release();
      }
    };

    const first = finalize();
    await firstStartedPromise;
    const second = finalize();
    await vi.waitFor(() => {
      expect(lockHarness.waiting(`whiteboard-draft:${draftID}`)).toBe(1);
    });
    expect(materializations).toBe(1);

    allowFirstToFinish();
    const results = await Promise.allSettled([first, second]);

    expect(results.map(result => result.status).sort()).toEqual([
      'fulfilled',
      'rejected',
    ]);
    expect(materializations).toBe(1);
    expect(whiteboardService.deleteWhiteboard).toHaveBeenCalledTimes(1);
  });

  it('expires a consumed draft before best-effort canonical deletion', async () => {
    drafts.set(draftID, futureDraft());
    vi.mocked(whiteboardService.deleteWhiteboard).mockRejectedValueOnce(
      new Error('file service unavailable')
    );

    const consumption = await service.acquireForConsumption(
      [draftID],
      actorContext
    );
    await expect(consumption.complete()).resolves.toBeUndefined();
    await consumption.release();

    expect(drafts.get(draftID)?.draftExpiresAt?.getTime()).toBe(0);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({
        message:
          'Consumed Whiteboard draft deletion failed; expiry sweep will retry',
        whiteboardID: draftID,
        error: 'file service unavailable',
      }),
      LogContext.WHITEBOARDS
    );
    await expect(
      service.acquireForConsumption([draftID], actorContext)
    ).rejects.toThrow('Whiteboard draft has expired');
  });

  it('marks a persisted final source consumed without deleting it yet', async () => {
    drafts.set(draftID, futureDraft());
    const consumption = await service.acquireForConsumption(
      [draftID],
      actorContext
    );

    await consumption.markConsumed();

    expect(drafts.get(draftID)?.draftExpiresAt?.getTime()).toBe(0);
    expect(whiteboardService.deleteWhiteboard).not.toHaveBeenCalled();
    await consumption.release();
    await expect(
      service.acquireForConsumption([draftID], actorContext)
    ).rejects.toThrow('Whiteboard draft has expired');
  });

  it('bounds a blocked advisory-lock acquisition and releases the runner', async () => {
    drafts.set(draftID, futureDraft());
    const runner = dataSource.createQueryRunner() as QueryRunner;
    vi.mocked(runner.query).mockImplementation(
      async (sql: string, _parameters?: string[]) => {
        if (sql.startsWith('SET lock_timeout')) return [];
        if (sql.includes('pg_advisory_lock')) {
          throw new Error('canceling statement due to lock timeout');
        }
        return [];
      }
    );
    vi.mocked(dataSource.createQueryRunner).mockReturnValueOnce(runner);

    await expect(
      service.acquireForConsumption([draftID], actorContext)
    ).rejects.toThrow('canceling statement due to lock timeout');

    expect(runner.query).toHaveBeenCalledWith("SET lock_timeout = '5000ms'");
    expect(runner.query).toHaveBeenCalledWith('SET lock_timeout = DEFAULT');
    expect(runner.release).toHaveBeenCalledOnce();
  });

  it('unlocks every acquired draft and clears the session after a keyed unlock fails', async () => {
    const firstID = 'draft-a';
    const secondID = 'draft-b';
    drafts.set(firstID, futureDraft(firstID));
    drafts.set(secondID, futureDraft(secondID));
    const consumption = await service.acquireForConsumption(
      [firstID, secondID],
      actorContext
    );
    const runner = vi.mocked(dataSource.createQueryRunner).mock.results[0]
      .value as QueryRunner;
    let keyedUnlocks = 0;
    vi.mocked(runner.query).mockImplementation(
      async (sql: string, parameters?: string[]) => {
        if (sql.startsWith('SET lock_timeout')) {
          return [];
        }
        if (sql.includes('pg_advisory_unlock_all')) {
          lockHarness.release(`whiteboard-draft:${firstID}`);
          lockHarness.release(`whiteboard-draft:${secondID}`);
          return [{ pg_advisory_unlock_all: null }];
        }
        if (sql.includes('pg_advisory_unlock')) {
          keyedUnlocks++;
          if (keyedUnlocks === 1) {
            throw new Error('keyed unlock failed');
          }
          lockHarness.release(parameters![0]);
          return [{ pg_advisory_unlock: true }];
        }
        await lockHarness.acquire(parameters![0]);
        return [{ pg_advisory_lock: null }];
      }
    );

    await expect(consumption.release()).resolves.toBeUndefined();

    expect(keyedUnlocks).toBe(2);
    expect(runner.query).toHaveBeenCalledWith(
      'SELECT pg_advisory_unlock_all()'
    );
    expect(runner.release).toHaveBeenCalledOnce();
  });

  it('makes discard wait until an in-flight source copy releases the draft', async () => {
    drafts.set(draftID, futureDraft());
    const consumption = await service.acquireForConsumption(
      [draftID],
      actorContext
    );

    const discard = service.discard(draftID, actorContext);
    await vi.waitFor(() => {
      expect(lockHarness.waiting(`whiteboard-draft:${draftID}`)).toBe(1);
    });
    expect(whiteboardService.deleteWhiteboard).not.toHaveBeenCalled();

    await consumption.release();
    await expect(discard).resolves.toBe(draftID);
    expect(whiteboardService.deleteWhiteboard).toHaveBeenCalledWith(draftID);
  });

  it("refuses to discard another actor's draft", async () => {
    drafts.set(draftID, {
      ...futureDraft(),
      createdBy: 'other-actor',
    } as Whiteboard);

    await expect(service.discard(draftID, actorContext)).rejects.toThrow(
      'Only the actor that created a Whiteboard draft may discard it'
    );
    expect(whiteboardService.deleteWhiteboard).not.toHaveBeenCalled();
  });

  it('deletes an unchanged expired draft through the canonical path', async () => {
    drafts.set(draftID, {
      ...futureDraft(),
      draftExpiresAt: new Date(Date.now() - 60_000),
    } as Whiteboard);

    await service.cleanupExpired(draftID);

    expect(whiteboardService.deleteWhiteboard).toHaveBeenCalledWith(draftID);
  });

  it.each([
    ['cleared', null],
    ['extended', 'future'],
  ])('does not delete a selected expiry candidate after its marker is %s', async (_label, marker) => {
    drafts.set(draftID, {
      ...futureDraft(),
      draftExpiresAt: new Date(Date.now() - 60_000),
    } as Whiteboard);
    expiredRows = [{ id: draftID }];

    await expect(service.findExpired(25)).resolves.toEqual([draftID]);
    drafts.get(draftID)!.draftExpiresAt =
      marker === null ? null : new Date(Date.now() + 60_000);

    await service.cleanupExpired(draftID);

    expect(whiteboardService.deleteWhiteboard).not.toHaveBeenCalled();
  });

  it('never deletes an ordinary Whiteboard through discard or expiry cleanup', async () => {
    drafts.set('ordinary-wb', {
      id: 'ordinary-wb',
      createdBy: actorContext.actorID,
      draftExpiresAt: null,
    } as Whiteboard);

    await expect(service.discard('ordinary-wb', actorContext)).resolves.toBe(
      'ordinary-wb'
    );
    await service.cleanupExpired('ordinary-wb');

    expect(whiteboardService.deleteWhiteboard).not.toHaveBeenCalled();
  });

  it('refuses an ordinary Whiteboard as a draft source', async () => {
    drafts.set('ordinary-wb', {
      id: 'ordinary-wb',
      createdBy: actorContext.actorID,
      draftExpiresAt: null,
    } as Whiteboard);

    await expect(
      service.acquireForConsumption(['ordinary-wb'], actorContext)
    ).rejects.toThrow('Whiteboard draft not found');
  });

  it('refuses a draft owned by another actor', async () => {
    drafts.set(draftID, {
      ...futureDraft(),
      createdBy: 'other-actor',
    } as Whiteboard);

    await expect(
      service.acquireForConsumption([draftID], actorContext)
    ).rejects.toThrow(
      'Only the actor that created a Whiteboard draft may consume it'
    );
  });

  it('refuses an expired draft as a final-create source', async () => {
    drafts.set(draftID, {
      ...futureDraft(),
      draftExpiresAt: new Date(Date.now() - 1),
    } as Whiteboard);

    await expect(
      service.acquireForConsumption([draftID], actorContext)
    ).rejects.toThrow('Whiteboard draft has expired');
  });

  it('periodic cleanup selects expired drafts via a flat, join-free id query', async () => {
    expiredRows = [{ id: 'expired-draft' }];

    await expect(service.findExpired(25)).resolves.toEqual(['expired-draft']);

    // Regression guard for the sweep crash (Postgres 42703
    // `column distinctAlias.Whiteboard_draftExpiresAt does not exist`):
    // findExpired must NOT use the eager-join `repository.find` path — that
    // wraps the paginated read in a distinctAlias subquery whose inner
    // projection omits the ORDER BY column. It must build a flat id-only query.
    expect(repository.find).not.toHaveBeenCalled();
    expect(repository.createQueryBuilder).toHaveBeenCalledWith('whiteboard');
    expect(expiredQueryBuilder.select).toHaveBeenCalledWith(
      'whiteboard.id',
      'id'
    );
    // Expiry predicate: draftExpiresAt <= now, the same LessThanOrEqual operator
    // cleanupExpired's locked re-read uses.
    const whereArg = vi.mocked(expiredQueryBuilder.where).mock
      .calls[0]?.[0] as {
      draftExpiresAt: FindOperator<Date>;
    };
    expect(whereArg.draftExpiresAt).toBeInstanceOf(FindOperator);
    expect(whereArg.draftExpiresAt.type).toBe('lessThanOrEqual');
    expect(whereArg.draftExpiresAt.value).toBeInstanceOf(Date);
    expect(expiredQueryBuilder.orderBy).toHaveBeenCalledWith(
      'whiteboard.draftExpiresAt',
      'ASC'
    );
    expect(expiredQueryBuilder.limit).toHaveBeenCalledWith(25);
  });
});

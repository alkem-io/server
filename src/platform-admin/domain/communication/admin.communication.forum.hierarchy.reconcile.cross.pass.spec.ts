import {
  SetChildrenRequest,
  SetChildrenResponse,
} from '@alkemio/matrix-adapter-lib';
import { ForumDiscussionCategory } from '@common/enums/forum.discussion.category';
import { TaskStatus } from '@domain/task/dto';
import { Test, TestingModule } from '@nestjs/testing';
import { Forum } from '@platform/forum/forum.entity';
import { CommunicationAdapter } from '@services/adapters/communication-adapter/communication.adapter';
import { MESSAGING_REDIS_CLIENT } from '@services/infrastructure/redis-client/messaging-redis.provider';
import { TaskService } from '@services/task';
import { PlatformOperationsAuditService } from '@src/platform-admin/platform-operations-audit/platform.operations.audit.service';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { repositoryProviderMockFactory } from '@test/utils/repository.provider.mock.factory';
import { type Mock } from 'vitest';
import { AdminCommunicationForumHierarchyReconcileService } from './admin.communication.forum.hierarchy.reconcile.service';

/**
 * Two reconcile passes, each correct in isolation, could between them leave a
 * room attached to no category at all — while both reported COMPLETED with
 * failed=0 and unconverged=0.
 *
 * The removal authorization a pass builds is a set of *historical*
 * observations: "this room was confirmed under category A". Another pass can
 * invalidate that confirmation before it is consumed. With the room moved
 * A -> B in the database between the two snapshots:
 *
 *   1. P (snapshot: A) confirms A, including its destructive visit to A
 *   2. Q (snapshot: B) establishes B                      edges: A, B
 *   3. Q removes A, authorized by its confirmation of B   edges: B
 *   4. Q finishes clean                                   edges: B
 *   5. P resumes at B and removes B, authorized by its
 *      earlier confirmation of A                          edges: NONE
 *
 * No concurrent Matrix write, timeout, failed request, ghost prune or pointer
 * repair is needed. `passInFlight` did not prevent it, because the two passes
 * run in different API replicas with their own flags.
 *
 * Ownership is now a Redis lease, so step 2 cannot happen while P holds it.
 * These tests pin that, and pin the ownership-loss path that fences a pass
 * which somehow kept running after its lease was taken over.
 */

const FORUM_ID = 'forum-1';
const ALL_CATEGORIES = Object.values(ForumDiscussionCategory);
const CATEGORY_A = ALL_CATEGORIES[0];
const CATEGORY_B = ALL_CATEGORIES[1];
const ROOM = 'room-1';

const response = (
  overrides: Partial<SetChildrenResponse> = {}
): SetChildrenResponse => ({
  success: true,
  error: undefined,
  added: [],
  removed: [],
  pruned_unknown: [],
  unknown_kept: [],
  unresolved: [],
  parent_pointers_repaired: [],
  parent_pointers_deferred: [],
  parent_pointers_unprocessable: [],
  converged: true,
  changed: false,
  dry_run: false,
  ...overrides,
});

/**
 * One Redis good enough for the lease: NX/PX set, and the compare-and-swap
 * Lua paths used by renew and release. Shared between both passes, exactly as
 * two API replicas share the real one.
 */
const makeSharedRedis = () => {
  const store = new Map<string, string>();
  return {
    store,
    set: vi.fn(
      async (
        key: string,
        value: string,
        _px: string,
        _ttl: number,
        nx?: string
      ) => {
        if (nx === 'NX' && store.has(key)) return null;
        store.set(key, value);
        return 'OK';
      }
    ),
    // Both RENEW and RELEASE are `if GET == owner then ... else 0`. Renew
    // keeps the key, release drops it; distinguishing them by argument count
    // is enough here.
    eval: vi.fn(async (lua: string, _n: number, key: string, owner: string) => {
      if (store.get(key) !== owner) return 0;
      if (lua.includes('DEL')) store.delete(key);
      return 1;
    }),
  };
};

const buildService = async (
  redis: unknown,
  discussions: Array<{ category: ForumDiscussionCategory; roomId: string }>
) => {
  const module: TestingModule = await Test.createTestingModule({
    providers: [
      AdminCommunicationForumHierarchyReconcileService,
      repositoryProviderMockFactory(Forum),
      { provide: MESSAGING_REDIS_CLIENT, useValue: redis },
    ],
  })
    .useMocker(defaultMockerFactory)
    .compile();

  const service = module.get(AdminCommunicationForumHierarchyReconcileService);
  const adapter = module.get(CommunicationAdapter);
  const taskService = module.get(TaskService) as any;
  const audit = module.get(PlatformOperationsAuditService) as any;
  const repo = (service as any).forumRepository;

  repo.find = vi.fn().mockResolvedValue([
    {
      id: FORUM_ID,
      discussionCategories: ALL_CATEGORIES,
      discussions: discussions.map(d => ({
        category: d.category,
        comments: { id: d.roomId },
      })),
    },
  ]);
  (adapter.setChildren as Mock).mockResolvedValue(response());

  return { service, adapter, taskService, audit };
};

describe('forum hierarchy reconcile — cross-pass safety', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('refuses the second pass while the first still holds ownership, so the interleaving cannot occur', async () => {
    const redis = makeSharedRedis();

    // P's snapshot: the room is in A. Q's snapshot: it has moved to B.
    const passP = await buildService(redis, [
      { category: CATEGORY_A, roomId: ROOM },
    ]);
    const passQ = await buildService(redis, [
      { category: CATEGORY_B, roomId: ROOM },
    ]);

    // Hold P inside its first destructive call — step 1 of the sequence.
    let releaseP: () => void = () => undefined;
    const pHeld = new Promise<void>(resolve => {
      releaseP = resolve;
    });
    let pIsHeld: () => void = () => undefined;
    const pReachedAdapter = new Promise<void>(resolve => {
      pIsHeld = resolve;
    });
    (passP.adapter.setChildren as Mock).mockImplementation(async () => {
      pIsHeld();
      await pHeld;
      return response();
    });

    const pRun = passP.service.reconcile('task-P', 'actor-1', {
      dryRun: false,
      pruneUnknown: false,
      repairRoomParentPointers: false,
      maxOperations: 1000,
    } as any);

    await pReachedAdapter;

    // Step 2: Q tries to start while P is mid-pass.
    await passQ.service.reconcile('task-Q', 'actor-1', {
      dryRun: false,
      pruneUnknown: false,
      repairRoomParentPointers: false,
      maxOperations: 1000,
    } as any);

    // Q must not have touched Matrix at all — no establish, and therefore no
    // confirmation it could use to authorize removing P's destination.
    expect(passQ.adapter.setChildren).not.toHaveBeenCalled();
    expect(passQ.taskService.completeWithError).toHaveBeenCalledWith(
      'task-Q',
      expect.stringContaining('already running')
    );

    releaseP();
    await pRun;

    // And P completed normally, still owning the pass throughout.
    expect(passP.taskService.complete).toHaveBeenCalledWith(
      'task-P',
      TaskStatus.COMPLETED
    );
  });

  it('releases ownership when the pass finishes, so the next pass can run', async () => {
    const redis = makeSharedRedis();
    const first = await buildService(redis, [
      { category: CATEGORY_A, roomId: ROOM },
    ]);

    await first.service.reconcile('task-1', 'actor-1', {
      dryRun: false,
      pruneUnknown: false,
      repairRoomParentPointers: false,
      maxOperations: 1000,
    } as any);

    expect(redis.store.size).toBe(0);

    const second = await buildService(redis, [
      { category: CATEGORY_B, roomId: ROOM },
    ]);
    await second.service.reconcile('task-2', 'actor-1', {
      dryRun: false,
      pruneUnknown: false,
      repairRoomParentPointers: false,
      maxOperations: 1000,
    } as any);

    expect(second.adapter.setChildren).toHaveBeenCalled();
    expect(second.taskService.completeWithError).not.toHaveBeenCalledWith(
      'task-2',
      expect.stringContaining('already running')
    );
  });

  it('releases ownership even when the pass throws', async () => {
    const redis = makeSharedRedis();
    const thrower = await buildService(redis, [
      { category: CATEGORY_A, roomId: ROOM },
    ]);
    (thrower.service as any).forumRepository.find = vi
      .fn()
      .mockRejectedValue(new Error('db down'));

    await thrower.service.reconcile('task-1', 'actor-1', {
      dryRun: false,
      pruneUnknown: false,
      repairRoomParentPointers: false,
      maxOperations: 1000,
    } as any);

    expect(redis.store.size).toBe(0);
  });

  describe('ownership loss mid-pass', () => {
    it('abandons before issuing any further removal', async () => {
      // A pass that somehow kept running after its lease was taken over must
      // not consume the authorizations it gathered under that lease: the new
      // owner may already have moved the rooms those confirmations describe.
      const redis = makeSharedRedis();
      const pass = await buildService(redis, [
        { category: CATEGORY_B, roomId: ROOM },
      ]);

      // Ownership is lost the moment the destructive sweep asks to renew.
      redis.eval.mockImplementation(async (lua: string) =>
        lua.includes('DEL') ? 1 : 0
      );

      await pass.service.reconcile('task-1', 'actor-1', {
        dryRun: false,
        pruneUnknown: false,
        repairRoomParentPointers: false,
        maxOperations: 1000,
      } as any);

      const destructive = (
        (pass.adapter.setChildren as Mock).mock.calls as [SetChildrenRequest][]
      ).filter(([r]) => r.apply_removals && !r.dry_run);
      expect(destructive).toHaveLength(0);

      expect(pass.taskService.completeWithError).toHaveBeenCalledWith(
        'task-1',
        expect.stringContaining('ownership-lost')
      );
    });

    it('does not block the harmless add-only phase', async () => {
      // Guard against over-correction: the add phase can only ever create an
      // edge the desired state asks for, so it is not gated on ownership.
      const redis = makeSharedRedis();
      const pass = await buildService(redis, [
        { category: CATEGORY_A, roomId: ROOM },
      ]);
      redis.eval.mockImplementation(async (lua: string) =>
        lua.includes('DEL') ? 1 : 0
      );

      await pass.service.reconcile('task-1', 'actor-1', {
        dryRun: false,
        pruneUnknown: false,
        repairRoomParentPointers: false,
        maxOperations: 1000,
      } as any);

      const addOnly = (
        (pass.adapter.setChildren as Mock).mock.calls as [SetChildrenRequest][]
      ).filter(([r]) => !r.apply_removals);
      expect(addOnly.length).toBeGreaterThan(0);
    });
  });

  it('stamps every request with an expiry no later than the lease, so a superseded pass is fenced at the adapter', async () => {
    // The adapter rejects an expired request before performing any read or
    // write. Because a new owner can only acquire after the previous lease
    // fully expired, every request the previous owner issued has expired too
    // — which is what removes the need for a hand-off protocol.
    const redis = makeSharedRedis();
    const pass = await buildService(redis, [
      { category: CATEGORY_A, roomId: ROOM },
    ]);

    const before = Date.now();
    await pass.service.reconcile('task-1', 'actor-1', {
      dryRun: false,
      pruneUnknown: false,
      repairRoomParentPointers: false,
      maxOperations: 1000,
    } as any);

    const calls = (pass.adapter.setChildren as Mock).mock.calls as [
      SetChildrenRequest,
    ][];
    expect(calls.length).toBeGreaterThan(0);
    for (const [request] of calls) {
      expect(request.expires_at_unix_ms).toBeDefined();
      // Bounded by the lease TTL rather than open-ended.
      expect(request.expires_at_unix_ms!).toBeGreaterThan(before);
      expect(request.expires_at_unix_ms!).toBeLessThanOrEqual(
        Date.now() + 60_000
      );
    }
  });
});

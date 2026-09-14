import {
  ErrCodeSpaceNotFound,
  SetChildrenRequest,
  SetChildrenResponse,
} from '@alkemio/matrix-adapter-lib';
import { ForumDiscussionCategory } from '@common/enums/forum.discussion.category';
import { getForumCategoryContextId } from '@constants/forum.constants';
import { TaskStatus } from '@domain/task/dto';
import { Test, TestingModule } from '@nestjs/testing';
import { Forum } from '@platform/forum/forum.entity';
import { CommunicationAdapter } from '@services/adapters/communication-adapter/communication.adapter';
import { TaskService } from '@services/task';
import { PlatformOperationsAuditService } from '@src/platform-admin/platform-operations-audit/platform.operations.audit.service';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { repositoryProviderMockFactory } from '@test/utils/repository.provider.mock.factory';
import { type Mock } from 'vitest';
import { AdminCommunicationForumHierarchyReconcileService } from './admin.communication.forum.hierarchy.reconcile.service';

/**
 * The reconcile pass used to authorize removals by omission: any child the
 * adapter found attached that was absent from the desired set it had just sent
 * became a removal candidate. That is unsound, because the desired set is a
 * snapshot read before the pass started, and "absent from the snapshot" is
 * true of two very different things — a room that genuinely moved away, and a
 * room that was created or recategorised while the pass was running.
 *
 * These are the two cases where that mattered, plus the completion contract
 * that let a pass report success with work outstanding.
 */

const FORUM_ID = 'forum-1';
const ALL_CATEGORIES = Object.values(ForumDiscussionCategory);
const CATEGORY_A = ALL_CATEGORIES[0];
const CATEGORY_B = ALL_CATEGORIES[1];

const contextIdFor = (category: ForumDiscussionCategory) =>
  getForumCategoryContextId(FORUM_ID, category);

const cleanResponse = (
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

const defaultInput = {
  dryRun: false,
  pruneUnknown: false,
  repairRoomParentPointers: false,
  maxOperations: 1000,
} as any;

describe('AdminCommunicationForumHierarchyReconcileService — removal authorization', () => {
  let service: AdminCommunicationForumHierarchyReconcileService;
  let communicationAdapter: CommunicationAdapter;
  let taskService: any;
  let platformOperationsAuditService: any;
  let forumRepository: any;

  const setForum = (
    discussions: Array<{ category: ForumDiscussionCategory; roomId: string }>
  ) => {
    forumRepository.find = vi.fn().mockResolvedValue([
      {
        id: FORUM_ID,
        discussionCategories: ALL_CATEGORIES,
        discussions: discussions.map(d => ({
          category: d.category,
          comments: { id: d.roomId },
        })),
      },
    ]);
  };

  /** Every request the pass issued for one parent, in call order. */
  const requestsFor = (parentContextId: string): SetChildrenRequest[] =>
    (
      (communicationAdapter.setChildren as Mock).mock.calls as [
        SetChildrenRequest,
      ][]
    )
      .map(([request]) => request)
      .filter(request => request.parent_context_id === parentContextId);

  beforeEach(async () => {
    vi.restoreAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminCommunicationForumHierarchyReconcileService,
        repositoryProviderMockFactory(Forum),
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(AdminCommunicationForumHierarchyReconcileService);
    communicationAdapter = module.get(CommunicationAdapter);
    taskService = module.get(TaskService) as any;
    platformOperationsAuditService = module.get(
      PlatformOperationsAuditService
    ) as any;
    forumRepository = (service as any).forumRepository;

    (communicationAdapter.setChildren as Mock).mockResolvedValue(
      cleanResponse()
    );
  });

  it('never authorizes removing a room that is where the database says it belongs', async () => {
    // room-1 is in category A and stays there. Nothing about this pass should
    // ever authorize category A to let go of it.
    setForum([{ category: CATEGORY_A, roomId: 'room-1' }]);

    await service.reconcile('task-1', 'actor-1', defaultInput);

    for (const request of requestsFor(contextIdFor(CATEGORY_A))) {
      expect(request.removable_child_context_ids ?? []).not.toContain('room-1');
    }
  });

  it('authorizes a moved room’s old category only after its new category was established', async () => {
    // room-1 now lives in category B. Category A may only be told it can let
    // go of room-1 once B has actually been confirmed to hold it.
    setForum([{ category: CATEGORY_B, roomId: 'room-1' }]);

    await service.reconcile('task-1', 'actor-1', defaultInput);

    const removalSweepForA = requestsFor(contextIdFor(CATEGORY_A)).filter(
      request => request.apply_removals
    );
    expect(removalSweepForA.length).toBeGreaterThan(0);
    for (const request of removalSweepForA) {
      expect(request.removable_child_context_ids ?? []).toContain('room-1');
    }
  });

  it('withholds the old category’s removal when the destination space does not exist', async () => {
    // The architect's reproduction: room-1 has moved to category B in the
    // database, but B has no Matrix space. Adding to B cannot succeed, so
    // removing room-1 from A would leave it attached to nothing at all.
    setForum([{ category: CATEGORY_B, roomId: 'room-1' }]);

    (communicationAdapter.setChildren as Mock).mockImplementation(
      async (request: SetChildrenRequest) =>
        request.parent_context_id === contextIdFor(CATEGORY_B)
          ? cleanResponse({
              success: false,
              error: { code: ErrCodeSpaceNotFound, message: 'space not found' },
              converged: false,
            })
          : cleanResponse()
    );

    await service.reconcile('task-1', 'actor-1', defaultInput);

    for (const request of requestsFor(contextIdFor(CATEGORY_A))) {
      expect(request.removable_child_context_ids ?? []).not.toContain('room-1');
    }

    // And the pass must say so rather than reporting a clean sweep: a
    // populated category with no space is incomplete work, not a natural skip.
    expect(taskService.complete).toHaveBeenCalledWith(
      'task-1',
      TaskStatus.ERRORED
    );
  });

  it('withholds the old category’s removal when the destination add failed outright', async () => {
    // Same shape, different cause: B exists but its write was rejected. The
    // response reports which ids did not resolve, not which writes failed, so
    // after a failure the pass cannot tell an established room from a refused
    // one — and must not guess in the direction that authorizes a removal.
    setForum([{ category: CATEGORY_B, roomId: 'room-1' }]);

    (communicationAdapter.setChildren as Mock).mockImplementation(
      async (request: SetChildrenRequest) =>
        request.parent_context_id === contextIdFor(CATEGORY_B)
          ? cleanResponse({
              success: false,
              error: { code: 'MATRIX_ERROR', message: 'write rejected' },
              converged: false,
            })
          : cleanResponse()
    );

    await service.reconcile('task-1', 'actor-1', defaultInput);

    for (const request of requestsFor(contextIdFor(CATEGORY_A))) {
      expect(request.removable_child_context_ids ?? []).not.toContain('room-1');
    }
  });

  it('withholds authorization for a room whose own id did not resolve', async () => {
    // The destination call succeeded overall, but this particular room was
    // reported unresolved — so it is not attached to B, and A must keep it.
    setForum([{ category: CATEGORY_B, roomId: 'room-1' }]);

    (communicationAdapter.setChildren as Mock).mockImplementation(
      async (request: SetChildrenRequest) =>
        request.parent_context_id === contextIdFor(CATEGORY_B)
          ? cleanResponse({ unresolved: ['room-1'], converged: false })
          : cleanResponse()
    );

    await service.reconcile('task-1', 'actor-1', defaultInput);

    for (const request of requestsFor(contextIdFor(CATEGORY_A))) {
      expect(request.removable_child_context_ids ?? []).not.toContain('room-1');
    }
  });

  it('sends an explicit authorization list on every sweep that may remove', async () => {
    // The negative assertions elsewhere in this file check that specific rooms
    // are absent from the list. That would also hold vacuously if the field
    // itself went missing and the adapter fell back to inferring removals from
    // the desired set — which is the exact behaviour being removed. This test
    // is the one that fails in that case.
    setForum([
      { category: CATEGORY_A, roomId: 'room-1' },
      { category: CATEGORY_B, roomId: 'room-2' },
    ]);

    await service.reconcile('task-1', 'actor-1', defaultInput);

    const removalSweeps = (
      (communicationAdapter.setChildren as Mock).mock.calls as [
        SetChildrenRequest,
      ][]
    )
      .map(([request]) => request)
      .filter(request => request.apply_removals);

    expect(removalSweeps.length).toBeGreaterThan(0);
    for (const request of removalSweeps) {
      expect(Array.isArray(request.removable_child_context_ids)).toBe(true);
    }
  });

  it('authorizes no removals at all on the forum-level call', async () => {
    // The forum's children are the category spaces, and every category space
    // that exists resolves and so stays desired. The only edges a removal
    // could reach there are children this pass knows nothing about — the class
    // that must be reported rather than deleted.
    setForum([{ category: CATEGORY_A, roomId: 'room-1' }]);

    await service.reconcile('task-1', 'actor-1', defaultInput);

    for (const request of requestsFor(FORUM_ID)) {
      expect(request.removable_child_context_ids ?? []).toEqual([]);
    }
  });

  it('stamps an operation id so the adapter’s log lines can be tied to this pass', async () => {
    setForum([{ category: CATEGORY_A, roomId: 'room-1' }]);

    await service.reconcile('task-1', 'actor-1', defaultInput);

    const calls = (communicationAdapter.setChildren as Mock).mock.calls as [
      SetChildrenRequest,
    ][];
    expect(calls.length).toBeGreaterThan(0);
    for (const [request] of calls) {
      expect(request.operation_id).toBe('task-1');
    }
  });

  describe('completion contract', () => {
    it('reports ERRORED when the adapter leaves a pointer repair outstanding', async () => {
      // Nothing failed. The hierarchy is still not converged, and a runbook
      // that stops on "no failures" would declare this finished.
      setForum([{ category: CATEGORY_A, roomId: 'room-1' }]);
      (communicationAdapter.setChildren as Mock).mockResolvedValue(
        cleanResponse({
          parent_pointers_deferred: ['!room-1:test'],
          converged: false,
        })
      );

      await service.reconcile('task-1', 'actor-1', defaultInput);

      expect(taskService.complete).toHaveBeenCalledWith(
        'task-1',
        TaskStatus.ERRORED
      );
      const [auditCall] =
        platformOperationsAuditService.recordOperation.mock.calls[0];
      expect(auditCall.target.failed).toBe(0);
      expect(auditCall.target.unconverged).toBeGreaterThan(0);
    });

    it('surfaces an unprocessable pointer repair separately from a deferred one', async () => {
      // A deferral clears itself on the next pass; this cannot, so the
      // operator needs to see it as configuration to change rather than work
      // to repeat.
      setForum([{ category: CATEGORY_A, roomId: 'room-1' }]);
      (communicationAdapter.setChildren as Mock).mockResolvedValue(
        cleanResponse({
          parent_pointers_unprocessable: ['!room-1:test'],
          converged: false,
        })
      );

      await service.reconcile('task-1', 'actor-1', defaultInput);

      const [auditCall] =
        platformOperationsAuditService.recordOperation.mock.calls[0];
      expect(auditCall.target.parentPointersUnprocessable).toBeGreaterThan(0);
      expect(auditCall.target.parentPointersDeferred).toBe(0);
    });

    it('still completes a dry run that reports drift', async () => {
      // Reporting drift is a dry run's entire purpose, so unconverged parents
      // are its expected result rather than a failure.
      setForum([{ category: CATEGORY_A, roomId: 'room-1' }]);
      (communicationAdapter.setChildren as Mock).mockResolvedValue(
        cleanResponse({
          unknown_kept: ['!ghost:test'],
          changed: true,
          dry_run: true,
          converged: false,
        })
      );

      await service.reconcile('task-1', 'actor-1', {
        ...defaultInput,
        dryRun: true,
      });

      expect(taskService.complete).toHaveBeenCalledWith(
        'task-1',
        TaskStatus.COMPLETED
      );
    });
  });

  describe('reentrancy', () => {
    it('refuses to start a second pass while one is still running', async () => {
      setForum([{ category: CATEGORY_A, roomId: 'room-1' }]);

      let releaseFirstPass: () => void = () => undefined;
      const firstPassBlocked = new Promise<void>(resolve => {
        releaseFirstPass = resolve;
      });
      (communicationAdapter.setChildren as Mock).mockImplementation(
        async () => {
          await firstPassBlocked;
          return cleanResponse();
        }
      );

      const firstPass = service.reconcile('task-1', 'actor-1', defaultInput);
      // Let the first pass reach its first adapter call before racing it.
      await Promise.resolve();
      await Promise.resolve();

      await service.reconcile('task-2', 'actor-1', defaultInput);

      expect(taskService.completeWithError).toHaveBeenCalledWith(
        'task-2',
        expect.stringContaining('already running')
      );

      releaseFirstPass();
      await firstPass;
    });

    it('releases the guard after a pass throws, so a later pass can still run', async () => {
      setForum([{ category: CATEGORY_A, roomId: 'room-1' }]);
      forumRepository.find = vi
        .fn()
        .mockRejectedValueOnce(new Error('db down'));

      await service.reconcile('task-1', 'actor-1', defaultInput);

      setForum([{ category: CATEGORY_A, roomId: 'room-1' }]);
      await service.reconcile('task-2', 'actor-1', defaultInput);

      expect(taskService.completeWithError).not.toHaveBeenCalledWith(
        'task-2',
        expect.stringContaining('already running')
      );
    });
  });
});

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

const FORUM_ID = 'forum-1';
const ALL_CATEGORIES = Object.values(ForumDiscussionCategory);

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
  changed: false,
  dry_run: false,
  ...overrides,
});

const spaceNotFoundResponse = (): SetChildrenResponse =>
  cleanResponse({
    success: false,
    error: { code: ErrCodeSpaceNotFound, message: 'space not found' },
  });

describe('AdminCommunicationForumHierarchyReconcileService', () => {
  let service: AdminCommunicationForumHierarchyReconcileService;
  let communicationAdapter: CommunicationAdapter;
  let taskService: Record<string, Mock>;
  let platformOperationsAuditService: Record<string, Mock>;
  let forumRepository: any;

  const defaultInput = {
    dryRun: true,
    pruneUnknown: false,
    repairRoomParentPointers: false,
    maxOperations: 200,
  };

  const oneDiscussionForum = (): Forum =>
    ({
      id: FORUM_ID,
      discussionCategories: ALL_CATEGORIES,
      discussions: [
        {
          category: ALL_CATEGORIES[0],
          comments: { id: 'room-1' },
        },
      ],
    }) as any;

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

    forumRepository.find = vi.fn().mockResolvedValue([oneDiscussionForum()]);
    (communicationAdapter.setChildren as Mock).mockResolvedValue(
      cleanResponse()
    );
  });

  describe('enumeration (FR-003)', () => {
    it('calls setChildren once per full category vocabulary member plus once for the forum-level parent, each with the derived uuidv5 context id', async () => {
      await service.reconcile('task-1', 'actor-1', defaultInput);

      const calls = (communicationAdapter.setChildren as Mock).mock.calls as [
        SetChildrenRequest,
      ][];
      expect(calls).toHaveLength(ALL_CATEGORIES.length + 1);

      for (const category of ALL_CATEGORIES) {
        const expectedContextId = getForumCategoryContextId(FORUM_ID, category);
        expect(
          calls.some(
            ([request]) => request.parent_context_id === expectedContextId
          )
        ).toBe(true);
      }

      const forumLevelCall = calls.find(
        ([request]) => request.parent_context_id === FORUM_ID
      );
      expect(forumLevelCall).toBeDefined();
      expect(forumLevelCall![0].children_are_spaces).toBe(true);
    });

    it('is generic over however many members the enum currently has — never assumes a fixed count from 060', async () => {
      // The assertion above already derives its expectation from
      // Object.values(ForumDiscussionCategory) rather than a literal number,
      // so this passes unchanged whether the enum carries 6 members (develop)
      // or more (a future merge of 060) — see plan.md base-branch note.
      await service.reconcile('task-1', 'actor-1', defaultInput);

      expect((communicationAdapter.setChildren as Mock).mock.calls.length).toBe(
        ALL_CATEGORIES.length + 1
      );
    });
  });

  describe('dry run (behavior row 2)', () => {
    it('issues zero write-mode calls and writes one audit row with dryRun:true and repaired:0', async () => {
      await service.reconcile('task-1', 'actor-1', defaultInput);

      const calls = (communicationAdapter.setChildren as Mock).mock.calls as [
        SetChildrenRequest,
      ][];
      for (const [request] of calls) {
        expect(request.dry_run).toBe(true);
      }

      expect(
        platformOperationsAuditService.recordOperation
      ).toHaveBeenCalledTimes(1);
      const [auditCall] =
        platformOperationsAuditService.recordOperation.mock.calls[0];
      expect(auditCall.target.dryRun).toBe(true);
      expect(auditCall.target.repaired).toBe(0);
      expect(auditCall.outcome).toBe('success');
    });

    it('completes the task on a clean pass', async () => {
      await service.reconcile('task-1', 'actor-1', defaultInput);

      expect(taskService.complete).toHaveBeenCalledWith(
        'task-1',
        TaskStatus.COMPLETED
      );
    });
  });

  describe('SPACE_NOT_FOUND (natural skip, US2-AS6)', () => {
    it('counts a retired category as scanned, never as failed, and excludes it from the forum-level desired set', async () => {
      const retiredCategory = ALL_CATEGORIES[ALL_CATEGORIES.length - 1];
      const retiredContextId = getForumCategoryContextId(
        FORUM_ID,
        retiredCategory
      );
      (communicationAdapter.setChildren as Mock).mockImplementation(
        async (request: SetChildrenRequest) =>
          request.parent_context_id === retiredContextId
            ? spaceNotFoundResponse()
            : cleanResponse()
      );

      await service.reconcile('task-1', 'actor-1', defaultInput);

      const [auditCall] =
        platformOperationsAuditService.recordOperation.mock.calls[0];
      expect(auditCall.target.scanned).toBe(ALL_CATEGORIES.length + 1);
      expect(auditCall.target.failed).toBe(0);

      const calls = (communicationAdapter.setChildren as Mock).mock.calls as [
        SetChildrenRequest,
      ][];
      const forumLevelCall = calls.find(
        ([request]) => request.parent_context_id === FORUM_ID
      )![0];
      expect(forumLevelCall.desired_child_context_ids).not.toContain(
        retiredContextId
      );
    });
  });

  describe('apply mode two-phase sweep (behavior row 3, FR-007)', () => {
    it('issues every add-only (phase A) call before any converge (phase B) call', async () => {
      const order: boolean[] = [];
      (communicationAdapter.setChildren as Mock).mockImplementation(
        async (request: SetChildrenRequest) => {
          order.push(request.apply_removals);
          return cleanResponse();
        }
      );

      await service.reconcile('task-1', 'actor-1', {
        ...defaultInput,
        dryRun: false,
      });

      const lastFalseIndex = order.lastIndexOf(false);
      const firstTrueIndex = order.indexOf(true);
      expect(lastFalseIndex).toBeGreaterThanOrEqual(0);
      expect(firstTrueIndex).toBeGreaterThan(lastFalseIndex);
      // Every parent (categories + forum) appears in both phases.
      expect(order.filter(v => v === false)).toHaveLength(
        ALL_CATEGORIES.length + 1
      );
      expect(order.filter(v => v === true)).toHaveLength(
        ALL_CATEGORIES.length + 1
      );
    });
  });

  describe('adapter disabled (behavior row 4)', () => {
    it('aborts immediately, never reports success, and completes the task with an error', async () => {
      (communicationAdapter.setChildren as Mock).mockResolvedValue({
        disabled: true,
      });

      await service.reconcile('task-1', 'actor-1', defaultInput);

      // Impossibility assertion: a disabled adapter must never be able to
      // produce a successful audit row (R-1).
      expect(
        platformOperationsAuditService.recordOperation
      ).toHaveBeenCalledTimes(1);
      const [auditCall] =
        platformOperationsAuditService.recordOperation.mock.calls[0];
      expect(auditCall.outcome).not.toBe('success');
      expect(auditCall.target.adapterDisabled).toBe(true);
      expect(auditCall.target.failed).toBe(ALL_CATEGORIES.length + 1);

      expect(taskService.completeWithError).toHaveBeenCalled();
      expect(taskService.complete).not.toHaveBeenCalled();

      // Aborted on the very first call — no further calls issued.
      expect(
        (communicationAdapter.setChildren as Mock).mock.calls
      ).toHaveLength(1);
    });
  });

  describe('circuit breaker (behavior row 5, R-2)', () => {
    it('aborts after 3 consecutive transport failures and never attempts the remaining parents', async () => {
      (communicationAdapter.setChildren as Mock).mockResolvedValue(undefined);

      await service.reconcile('task-1', 'actor-1', defaultInput);

      expect(
        (communicationAdapter.setChildren as Mock).mock.calls
      ).toHaveLength(3);

      const [auditCall] =
        platformOperationsAuditService.recordOperation.mock.calls[0];
      expect(auditCall.target.aborted).toBe('circuit-breaker');
      expect(auditCall.target.failed).toBe(ALL_CATEGORIES.length + 1);

      expect(taskService.completeWithError).toHaveBeenCalledWith(
        'task-1',
        expect.stringContaining('circuit-breaker')
      );
    });

    it('resets the consecutive-failure counter on a successful call', async () => {
      let call = 0;
      (communicationAdapter.setChildren as Mock).mockImplementation(
        async () => {
          call++;
          // Failure, success, failure, success, ... — never 3 failures IN A
          // ROW, so the breaker must not trip across the whole sweep.
          return call % 2 === 0 ? cleanResponse() : undefined;
        }
      );

      await service.reconcile('task-1', 'actor-1', defaultInput);

      const [auditCall] =
        platformOperationsAuditService.recordOperation.mock.calls[0];
      expect(auditCall.target.aborted).not.toBe('circuit-breaker');
    });
  });

  describe('budget exhaustion (behavior row 6, US2-AS7)', () => {
    it('stops issuing calls once the cumulative write budget is exceeded and reports an honest partial', async () => {
      (communicationAdapter.setChildren as Mock).mockResolvedValue(
        cleanResponse({ added: ['room-a', 'room-b'] })
      );

      await service.reconcile('task-1', 'actor-1', {
        ...defaultInput,
        dryRun: false,
        maxOperations: 1,
      });

      // The very first apply-mode call already reports 2 writes > budget 1,
      // so no further calls are issued.
      expect(
        (communicationAdapter.setChildren as Mock).mock.calls
      ).toHaveLength(1);

      const [auditCall] =
        platformOperationsAuditService.recordOperation.mock.calls[0];
      expect(auditCall.target.aborted).toBe('budget-exhausted');
      expect(auditCall.target.failed).toBe(ALL_CATEGORIES.length); // all but the one attempted
      expect(taskService.completeWithError).toHaveBeenCalledWith(
        'task-1',
        expect.stringContaining('budget-exhausted')
      );
    });

    it('is unbounded during a dry run — a huge write count never aborts a read-only pass', async () => {
      (communicationAdapter.setChildren as Mock).mockResolvedValue(
        cleanResponse({
          added: Array.from({ length: 10000 }, (_, i) => `r${i}`),
        })
      );

      await service.reconcile('task-1', 'actor-1', {
        ...defaultInput,
        dryRun: true,
        maxOperations: 1,
      });

      expect(
        (communicationAdapter.setChildren as Mock).mock.calls
      ).toHaveLength(ALL_CATEGORIES.length + 1);
      const [auditCall] =
        platformOperationsAuditService.recordOperation.mock.calls[0];
      expect(auditCall.target.aborted).toBeNull();
    });
  });

  describe('counts derive strictly from response arrays (behavior row 7, FR-011)', () => {
    it('sums drifted/repaired/unresolved/unknownKept/parentPointersDeferred from the fixture arrays, never from loop iterations', async () => {
      (communicationAdapter.setChildren as Mock).mockResolvedValue(
        cleanResponse({
          added: ['a1'],
          removed: ['a2', 'a3'],
          pruned_unknown: ['a4'],
          unknown_kept: ['a5', 'a6', 'a7'],
          unresolved: ['a8'],
          parent_pointers_deferred: ['a9', 'a10'],
        })
      );

      await service.reconcile('task-1', 'actor-1', {
        ...defaultInput,
        dryRun: false,
        maxOperations: 100000,
      });

      const parents = ALL_CATEGORIES.length + 1;
      const [auditCall] =
        platformOperationsAuditService.recordOperation.mock.calls[0];
      // Every parent is visited twice (phase A + phase B), and every call
      // returns the same fixture arrays.
      const perCallWrites = 1 + 2 + 1; // added+removed+pruned_unknown
      expect(auditCall.target.repaired).toBe(perCallWrites * parents * 2);
      expect(auditCall.target.unresolved).toBe(1 * parents * 2);
      expect(auditCall.target.unknownKept).toBe(3 * parents * 2);
      expect(auditCall.target.parentPointersDeferred).toBe(2 * parents * 2);
      expect(auditCall.target.drifted).toBe((1 + 2 + 1 + 3) * parents * 2);
    });

    it('reports repaired:0 on a dry run even though the response arrays are non-empty (would-be actions only)', async () => {
      (communicationAdapter.setChildren as Mock).mockResolvedValue(
        cleanResponse({ added: ['a1'], removed: ['a2'] })
      );

      await service.reconcile('task-1', 'actor-1', defaultInput);

      const [auditCall] =
        platformOperationsAuditService.recordOperation.mock.calls[0];
      expect(auditCall.target.repaired).toBe(0);
      expect(auditCall.target.drifted).toBeGreaterThan(0);
    });
  });

  describe('audit fail-open (behavior row 8)', () => {
    it('completes the task normally even when recordOperation throws', async () => {
      platformOperationsAuditService.recordOperation.mockImplementation(() => {
        throw new Error('audit store unreachable');
      });

      await service.reconcile('task-1', 'actor-1', defaultInput);

      expect(taskService.complete).toHaveBeenCalledWith(
        'task-1',
        TaskStatus.COMPLETED
      );
    });
  });

  describe('room-side parent-pointer repair opt-in (US5, RULING 2)', () => {
    it('passes sync_child_parent:false on every call by default', async () => {
      await service.reconcile('task-1', 'actor-1', defaultInput);

      const calls = (communicationAdapter.setChildren as Mock).mock.calls as [
        SetChildrenRequest,
      ][];
      for (const [request] of calls) {
        expect(request.sync_child_parent).toBe(false);
      }
    });

    it('passes sync_child_parent:true through on every call when repairRoomParentPointers is set', async () => {
      await service.reconcile('task-1', 'actor-1', {
        ...defaultInput,
        repairRoomParentPointers: true,
      });

      const calls = (communicationAdapter.setChildren as Mock).mock.calls as [
        SetChildrenRequest,
      ][];
      for (const [request] of calls) {
        expect(request.sync_child_parent).toBe(true);
      }
    });

    it('surfaces parent_pointers_deferred sums in the audit payload', async () => {
      (communicationAdapter.setChildren as Mock).mockResolvedValue(
        cleanResponse({ parent_pointers_deferred: ['x'] })
      );

      await service.reconcile('task-1', 'actor-1', {
        ...defaultInput,
        repairRoomParentPointers: true,
      });

      const [auditCall] =
        platformOperationsAuditService.recordOperation.mock.calls[0];
      expect(auditCall.target.parentPointersDeferred).toBe(
        ALL_CATEGORIES.length + 1
      );
    });
  });

  describe('forum-level call (US2-AS9, FR-021)', () => {
    it('desires only the categories that resolved this pass, and reads via the space alias namespace', async () => {
      const unresolvedCategory = ALL_CATEGORIES[0];
      const unresolvedContextId = getForumCategoryContextId(
        FORUM_ID,
        unresolvedCategory
      );
      (communicationAdapter.setChildren as Mock).mockImplementation(
        async (request: SetChildrenRequest) =>
          request.parent_context_id === unresolvedContextId
            ? spaceNotFoundResponse()
            : cleanResponse()
      );

      await service.reconcile('task-1', 'actor-1', defaultInput);

      const calls = (communicationAdapter.setChildren as Mock).mock.calls as [
        SetChildrenRequest,
      ][];
      const forumLevelCall = calls.find(
        ([request]) => request.parent_context_id === FORUM_ID
      )![0];

      expect(forumLevelCall.children_are_spaces).toBe(true);
      expect(forumLevelCall.desired_child_context_ids).not.toContain(
        unresolvedContextId
      );
      expect(forumLevelCall.desired_child_context_ids).toHaveLength(
        ALL_CATEGORIES.length - 1
      );
    });
  });

  describe('no forum found', () => {
    it('audits an empty pass and completes the task with an error rather than throwing', async () => {
      forumRepository.find = vi.fn().mockResolvedValue([]);

      await service.reconcile('task-1', 'actor-1', defaultInput);

      expect(communicationAdapter.setChildren).not.toHaveBeenCalled();
      expect(taskService.completeWithError).toHaveBeenCalled();
      const [auditCall] =
        platformOperationsAuditService.recordOperation.mock.calls[0];
      expect(auditCall.target.scanned).toBe(0);
    });
  });

  describe('no delete path (risk R-5, contract no-scheduler-no-delete)', () => {
    it('never calls any delete-shaped method on the communication adapter', async () => {
      await service.reconcile('task-1', 'actor-1', {
        ...defaultInput,
        dryRun: false,
      });

      expect((communicationAdapter as any).deleteSpace).not.toHaveBeenCalled();
      expect((communicationAdapter as any).deleteRoom).not.toHaveBeenCalled();
    });
  });
});

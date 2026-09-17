import { RepairReport } from '@alkemio/matrix-adapter-lib';
import { RoomType } from '@common/enums/room.type';
import { ValidationException } from '@common/exceptions';
import { ConversationService } from '@domain/communication/conversation/conversation.service';
import { Space } from '@domain/space/space/space.entity';
import { SpaceLookupService } from '@domain/space/space.lookup/space.lookup.service';
import { SpaceMembershipProjectionService } from '@domain/space/space-membership-projection/space.membership.projection.service';
import { TaskStatus } from '@domain/task/dto';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CommunicationAdapter } from '@services/adapters/communication-adapter/communication.adapter';
import { TaskService } from '@services/task';
import { PlatformOperationsAuditService } from '@src/platform-admin/platform-operations-audit/platform.operations.audit.service';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { repositoryProviderMockFactory } from '@test/utils/repository.provider.mock.factory';
import { type Mock } from 'vitest';
import { AdminCommunicationReconcileGovernanceService } from './admin.communication.reconcile.governance.service';
import { AdminCommunicationReconcileGovernanceInput } from './dto/admin.communication.dto.reconcile.governance';

const TASK_ID = 'task-1';
const ACTOR_ID = 'operator-1';

const conversationInput = (
  overrides: Partial<AdminCommunicationReconcileGovernanceInput> = {}
): AdminCommunicationReconcileGovernanceInput => ({
  conversationID: 'conv-1',
  dryRun: true,
  ladder: true,
  membership: true,
  force: false,
  maxOperations: 500,
  ...overrides,
});

const spaceInput = (
  overrides: Partial<AdminCommunicationReconcileGovernanceInput> = {}
): AdminCommunicationReconcileGovernanceInput => ({
  spaceID: 'space-1',
  dryRun: true,
  ladder: true,
  membership: true,
  force: false,
  maxOperations: 500,
  ...overrides,
});

const repairReport = (overrides: Partial<RepairReport> = {}): RepairReport => ({
  success: true,
  scanned: 1,
  repaired: 0,
  unresolved: [],
  failed: [],
  dry_run: true,
  writes: 0,
  budget_remaining: 100,
  ...overrides,
});

describe('AdminCommunicationReconcileGovernanceService', () => {
  let service: AdminCommunicationReconcileGovernanceService;
  let communicationAdapter: Record<string, Mock>;
  let spaceLookupService: Record<string, Mock>;
  let spaceMembershipProjectionService: Record<string, Mock>;
  let conversationService: Record<string, Mock>;
  let taskService: Record<string, Mock>;
  let platformOperationsAuditService: Record<string, Mock>;
  let spaceRepository: any;

  beforeEach(async () => {
    vi.restoreAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminCommunicationReconcileGovernanceService,
        repositoryProviderMockFactory(Space),
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(AdminCommunicationReconcileGovernanceService);
    communicationAdapter = module.get(CommunicationAdapter) as any;
    spaceLookupService = module.get(SpaceLookupService) as any;
    spaceMembershipProjectionService = module.get(
      SpaceMembershipProjectionService
    ) as any;
    conversationService = module.get(ConversationService) as any;
    taskService = module.get(TaskService) as any;
    platformOperationsAuditService = module.get(
      PlatformOperationsAuditService
    ) as any;
    spaceRepository = module.get(getRepositoryToken(Space));

    communicationAdapter.isEnabled.mockReturnValue(true);
    communicationAdapter.repairRoomGovernance.mockResolvedValue(repairReport());
    communicationAdapter.repairSpaceGovernance.mockResolvedValue(
      repairReport()
    );
    communicationAdapter.getSpace.mockResolvedValue({ children: [] });
    communicationAdapter.getRoomMembers.mockResolvedValue([]);
    communicationAdapter.batchAddMember.mockResolvedValue(true);
    communicationAdapter.batchRemoveMember.mockResolvedValue(true);

    conversationService.getConversationOrFail.mockResolvedValue({
      id: 'conv-1',
      room: { id: 'room-1', type: RoomType.CONVERSATION_DIRECT },
    });
    conversationService.getConversationMembers.mockResolvedValue([
      { actorID: 'member-1' },
    ]);

    spaceLookupService.getSpaceOrFail.mockResolvedValue({ id: 'space-1' });
    spaceLookupService.getAllDescendantSpaceIDs.mockResolvedValue([]);
    spaceRepository.find = vi
      .fn()
      .mockResolvedValue([
        { id: 'space-1', nameID: 'space-1', level: 0 } as any,
      ]);
    spaceMembershipProjectionService.elevatedMembers.mockResolvedValue(
      new Set()
    );
    spaceMembershipProjectionService.projectSpace.mockResolvedValue({
      scanned: 1,
      repaired: 0,
      unresolved: [],
      failed: [],
      dryRun: true,
      writes: 0,
      budgetRemaining: 500,
    });

    taskService.create.mockResolvedValue({ id: TASK_ID });
    taskService.complete.mockResolvedValue(undefined);
    taskService.completeWithError.mockResolvedValue(undefined);
    taskService.updateTaskResults.mockResolvedValue(undefined);
    platformOperationsAuditService.recordOperation.mockResolvedValue(undefined);
  });

  describe('validateScope', () => {
    it('rejects a request naming neither scope', () => {
      expect(() =>
        service.validateScope(conversationInput({ conversationID: undefined }))
      ).toThrow(ValidationException);
    });

    it('rejects a request naming both scopes', () => {
      expect(() =>
        service.validateScope(conversationInput({ spaceID: 'space-1' }))
      ).toThrow(ValidationException);
    });
  });

  describe('defaults are report-only', () => {
    it('a default (dryRun) conversation pass performs ZERO adapter writes and records exactly one audit row', async () => {
      // Drift on both sides: one extra room member, one missing.
      communicationAdapter.getRoomMembers.mockResolvedValue(['stray-1']);

      await service.reconcile(TASK_ID, ACTOR_ID, conversationInput());

      expect(communicationAdapter.repairRoomGovernance).toHaveBeenCalledWith(
        expect.objectContaining({
          alkemio_room_id: 'room-1',
          is_direct: true,
          dry_run: true,
        })
      );
      expect(communicationAdapter.batchRemoveMember).not.toHaveBeenCalled();
      expect(communicationAdapter.batchAddMember).not.toHaveBeenCalled();
      expect(communicationAdapter.createSpace).not.toHaveBeenCalled();

      expect(
        platformOperationsAuditService.recordOperation
      ).toHaveBeenCalledTimes(1);
      expect(
        platformOperationsAuditService.recordOperation
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'adminCommunicationReconcileGovernance',
          target: expect.objectContaining({
            taskId: TASK_ID,
            dryRun: true,
            // The two would-be membership writes are reported, not applied.
            budgetRemaining: 498,
          }),
        })
      );
      expect(taskService.complete).toHaveBeenCalledWith(
        TASK_ID,
        TaskStatus.COMPLETED
      );
    });
  });

  describe('budget', () => {
    it('exhaustion aborts with budget-exhausted and reports the remaining scope unresolved', async () => {
      conversationService.getConversationMembers.mockResolvedValue([
        { actorID: 'a' },
        { actorID: 'b' },
        { actorID: 'c' },
      ]);
      communicationAdapter.getRoomMembers.mockResolvedValue(['stray-1']);

      await service.reconcile(
        TASK_ID,
        ACTOR_ID,
        conversationInput({ dryRun: false, ladder: false, maxOperations: 1 })
      );

      // The one budgeted write went to the removal; all three adds remain.
      expect(communicationAdapter.batchRemoveMember).toHaveBeenCalledTimes(1);
      expect(communicationAdapter.batchAddMember).not.toHaveBeenCalled();
      expect(
        platformOperationsAuditService.recordOperation
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          target: expect.objectContaining({
            aborted: 'budget-exhausted',
            unresolved: 3,
            budgetRemaining: 0,
          }),
        })
      );
      expect(taskService.completeWithError).toHaveBeenCalledWith(
        TASK_ID,
        expect.stringContaining('budget-exhausted')
      );
      expect(taskService.complete).not.toHaveBeenCalled();
    });
  });

  describe('counts come from the adapter reports', () => {
    it('space-scope counts are the sums of the repair reports and the projection report', async () => {
      vi.spyOn(service as any, 'loadAnchoredRooms').mockResolvedValue(
        new Map([
          ['space-1', [{ roomId: 'room-updates', joinRule: 'restricted' }]],
        ])
      );
      communicationAdapter.repairSpaceGovernance.mockResolvedValue(
        repairReport({
          repaired: 2,
          writes: 2,
          unresolved: [{ id: 'x', reason: 'drift' }],
        })
      );
      communicationAdapter.repairRoomGovernance.mockResolvedValue(
        repairReport({
          repaired: 3,
          writes: 3,
          failed: [{ id: 'y', error: 'boom' }],
        })
      );
      spaceMembershipProjectionService.projectSpace.mockResolvedValue({
        scanned: 1,
        repaired: 5,
        unresolved: [],
        failed: [],
        dryRun: false,
        writes: 5,
        budgetRemaining: 490,
      });

      await service.reconcile(TASK_ID, ACTOR_ID, spaceInput({ dryRun: false }));

      expect(
        platformOperationsAuditService.recordOperation
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          target: expect.objectContaining({
            scanned: 1,
            repaired: 10, // 2 (space repair) + 5 (projection) + 3 (room repair)
            unresolved: 1,
            failed: 1,
            budgetRemaining: 490, // 500 - (2 + 5 + 3)
          }),
        })
      );
      expect(taskService.complete).toHaveBeenCalledWith(
        TASK_ID,
        TaskStatus.ERRORED
      );
    });
  });

  describe('audit is fail-open', () => {
    it('an audit-store throw never fails the pass', async () => {
      platformOperationsAuditService.recordOperation.mockRejectedValue(
        new Error('audit store down')
      );

      await expect(
        service.reconcile(TASK_ID, ACTOR_ID, conversationInput())
      ).resolves.toBeUndefined();

      expect(taskService.complete).toHaveBeenCalledWith(
        TASK_ID,
        TaskStatus.COMPLETED
      );
    });
  });

  describe('disabled adapter', () => {
    it('yields an honest failed pass with no reconciliation attempted', async () => {
      communicationAdapter.isEnabled.mockReturnValue(false);

      await service.reconcile(TASK_ID, ACTOR_ID, conversationInput());

      expect(communicationAdapter.repairRoomGovernance).not.toHaveBeenCalled();
      expect(conversationService.getConversationOrFail).not.toHaveBeenCalled();
      expect(
        platformOperationsAuditService.recordOperation
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          outcome: 'failure',
          target: expect.objectContaining({ adapterDisabled: true }),
        })
      );
      expect(taskService.completeWithError).toHaveBeenCalledWith(
        TASK_ID,
        expect.stringContaining('disabled')
      );
    });
  });

  describe('unexpected throw', () => {
    it('settles the task with an error and still writes the audit row', async () => {
      conversationService.getConversationOrFail.mockRejectedValue(
        new Error('db down')
      );

      await expect(
        service.reconcile(TASK_ID, ACTOR_ID, conversationInput())
      ).resolves.toBeUndefined();

      expect(
        platformOperationsAuditService.recordOperation
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          outcome: 'failure',
          target: expect.objectContaining({ failed: 1 }),
        })
      );
      expect(taskService.completeWithError).toHaveBeenCalledWith(
        TASK_ID,
        expect.stringContaining('db down')
      );
    });
  });
});

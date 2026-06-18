import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { SearchIngestService } from '@services/api/search/ingest/search.ingest.service';
import { TaskService } from '@services/task';
import { InAppNotificationAdminService } from '@src/platform-admin/in-app-notification/in.app.notification.admin.service';
import { vi } from 'vitest';
import { InternalAdminController } from './internal-admin.controller';

describe('InternalAdminController', () => {
  let controller: InternalAdminController;
  let inAppNotificationAdminService: InAppNotificationAdminService;
  let searchIngestService: SearchIngestService;
  let taskService: TaskService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InternalAdminController],
      providers: [
        {
          provide: InAppNotificationAdminService,
          useValue: {
            pruneInAppNotifications: vi.fn(),
          },
        },
        {
          provide: SearchIngestService,
          useValue: {
            ingestFromScratch: vi.fn(),
          },
        },
        {
          provide: TaskService,
          useValue: {
            create: vi.fn(),
            get: vi.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get(InternalAdminController);
    inAppNotificationAdminService = module.get(InAppNotificationAdminService);
    searchIngestService = module.get(SearchIngestService);
    taskService = module.get(TaskService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('pruneInAppNotifications (US1)', () => {
    const pruneResult = {
      removedCountOutsideRetentionPeriod: 3,
      removedCountExceedingUserLimit: 7,
    };

    it('calls pruneInAppNotifications exactly once and returns its result verbatim', async () => {
      vi.spyOn(
        inAppNotificationAdminService,
        'pruneInAppNotifications'
      ).mockResolvedValue(pruneResult as any);

      const result = await controller.pruneInAppNotifications();

      expect(
        inAppNotificationAdminService.pruneInAppNotifications
      ).toHaveBeenCalledTimes(1);
      expect(result).toEqual(pruneResult);
    });

    it('does not invoke any authorization step (no authz service injected)', () => {
      // The controller is constructed with exactly the three reused services and
      // nothing authorization-related. This guards FR-003 (no authz check).
      expect((controller as any).authorizationService).toBeUndefined();
      expect((controller as any).platformAuthorizationService).toBeUndefined();
      expect(
        (controller as any).platformAuthorizationPolicyService
      ).toBeUndefined();
    });

    it('propagates service errors (surface as 5xx)', async () => {
      vi.spyOn(
        inAppNotificationAdminService,
        'pruneInAppNotifications'
      ).mockRejectedValue(new Error('Prune failed'));

      await expect(controller.pruneInAppNotifications()).rejects.toThrow(
        'Prune failed'
      );
    });
  });

  describe('triggerSearchIngest (US2)', () => {
    const task = { id: 'task-abc-123' };

    it('creates a task then fires ingestFromScratch(task) and returns { taskId }', async () => {
      vi.spyOn(taskService, 'create').mockResolvedValue(task as any);
      const ingestSpy = vi
        .spyOn(searchIngestService, 'ingestFromScratch')
        .mockResolvedValue(undefined as any);

      const result = await controller.triggerSearchIngest();

      expect(taskService.create).toHaveBeenCalledTimes(1);
      expect(ingestSpy).toHaveBeenCalledTimes(1);
      expect(ingestSpy).toHaveBeenCalledWith(task);
      expect(result).toEqual({ taskId: task.id });
    });

    it('does not await ingestFromScratch (fire-and-forget)', async () => {
      vi.spyOn(taskService, 'create').mockResolvedValue(task as any);
      // A never-resolving ingest must not block the response.
      vi.spyOn(searchIngestService, 'ingestFromScratch').mockReturnValue(
        new Promise(() => {
          /* never resolves */
        }) as any
      );

      const result = await controller.triggerSearchIngest();

      expect(result).toEqual({ taskId: task.id });
    });
  });

  describe('getTaskStatus (US2)', () => {
    it('returns the projected task for a known id', async () => {
      const task = {
        id: 'task-abc-123',
        status: 'in-progress',
        itemsCount: 1200,
        itemsDone: 450,
        errors: [],
        // fields that must NOT leak into the projection:
        created: 1,
        start: 1,
        action: 'auth-reset',
        results: [],
      };
      vi.spyOn(taskService, 'get').mockResolvedValue(task as any);

      const result = await controller.getTaskStatus('task-abc-123');

      expect(taskService.get).toHaveBeenCalledWith('task-abc-123');
      expect(result).toEqual({
        id: 'task-abc-123',
        status: 'in-progress',
        itemsCount: 1200,
        itemsDone: 450,
        errors: [],
      });
    });

    it('throws NotFoundException (404) when the task is undefined / expired', async () => {
      vi.spyOn(taskService, 'get').mockResolvedValue(undefined as any);

      await expect(controller.getTaskStatus('unknown-id')).rejects.toThrow(
        NotFoundException
      );
    });
  });
});

import { AuthorizationPrivilege } from '@common/enums';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { Test, TestingModule } from '@nestjs/testing';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';
import { SearchIngestService } from '@services/api/search/ingest/search.ingest.service';
import { TaskService } from '@services/task';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mock, vi } from 'vitest';
import { AdminSearchIngestResolverMutations } from './admin.search.ingest.resolver.mutations';

describe('AdminSearchIngestResolverMutations', () => {
  let resolver: AdminSearchIngestResolverMutations;
  let authorizationService: Record<string, Mock>;
  let platformAuthorizationPolicyService: Record<string, Mock>;
  let searchIngestService: Record<string, Mock>;
  let taskService: Record<string, Mock>;

  const actorContext = { actorID: 'actor-1' } as any as ActorContext;

  beforeEach(async () => {
    vi.restoreAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [AdminSearchIngestResolverMutations, MockWinstonProvider],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    resolver = module.get(AdminSearchIngestResolverMutations);
    authorizationService = module.get(AuthorizationService) as any;
    platformAuthorizationPolicyService = module.get(
      PlatformAuthorizationPolicyService
    ) as any;
    searchIngestService = module.get(SearchIngestService) as any;
    taskService = module.get(TaskService) as any;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  describe('adminSearchIngestFromScratch', () => {
    it('should create task, check auth, start ingest, and return task id', async () => {
      const task = { id: 'task-1' };
      const platformPolicy = { id: 'platform-auth' };

      taskService.create.mockResolvedValue(task);
      platformAuthorizationPolicyService.getPlatformAuthorizationPolicy.mockResolvedValue(
        platformPolicy
      );

      const result = await resolver.adminSearchIngestFromScratch(actorContext);

      expect(taskService.create).toHaveBeenCalled();
      expect(authorizationService.grantAccessOrFail).toHaveBeenCalledWith(
        actorContext,
        platformPolicy,
        AuthorizationPrivilege.PLATFORM_ADMIN,
        expect.any(String)
      );
      expect(searchIngestService.ingestFromScratch).toHaveBeenCalledWith(task);
      expect(result).toBe('task-1');
    });

    it('should update task with error and rethrow when authorization fails', async () => {
      const task = { id: 'task-1' };
      const platformPolicy = { id: 'platform-auth' };
      const error = new Error('Unauthorized');

      taskService.create.mockResolvedValue(task);
      platformAuthorizationPolicyService.getPlatformAuthorizationPolicy.mockResolvedValue(
        platformPolicy
      );
      authorizationService.grantAccessOrFail.mockImplementation(() => {
        throw error;
      });

      await expect(
        resolver.adminSearchIngestFromScratch(actorContext)
      ).rejects.toThrow('Unauthorized');

      expect(taskService.updateTaskErrors).toHaveBeenCalledWith(
        'task-1',
        'Unauthorized'
      );
      expect(taskService.complete).toHaveBeenCalledWith(
        'task-1',
        expect.any(String)
      );
      expect(searchIngestService.ingestFromScratch).not.toHaveBeenCalled();
    });
  });
});

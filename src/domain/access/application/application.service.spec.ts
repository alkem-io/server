import {
  EntityNotFoundException,
  RelationshipNotFoundException,
} from '@common/exceptions';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { LifecycleService } from '@domain/common/lifecycle/lifecycle.service';
import { NVPService } from '@domain/common/nvp/nvp.service';
import { UserService } from '@domain/community/user/user.service';
import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { Mock, vi } from 'vitest';
import { RoleSetCacheService } from '../role-set/role.set.service.cache';
import { Application } from './application.entity';
import { IApplication } from './application.interface';
import { ApplicationService } from './application.service';
import { ApplicationLifecycleService } from './application.service.lifecycle';
import { mockDrizzleProvider } from '@test/utils/drizzle.mock.factory';
import { DRIZZLE } from '@config/drizzle/drizzle.constants';

describe('ApplicationService', () => {
  let service: ApplicationService;
  let userService: UserService;
  let lifecycleService: LifecycleService;
  let applicationLifecycleService: ApplicationLifecycleService;
  let nvpService: NVPService;
  let authorizationPolicyService: AuthorizationPolicyService;
  let roleSetCacheService: RoleSetCacheService;
  let db: any;

  beforeEach(async () => {
    // Mock static Application.create to avoid DataSource requirement
    vi.spyOn(Application, 'create').mockImplementation((input: any) => {
      const entity = new Application();
      Object.assign(entity, input);
      return entity as any;
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApplicationService,
        mockDrizzleProvider,
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get<ApplicationService>(ApplicationService);
    userService = module.get<UserService>(UserService);
    lifecycleService = module.get<LifecycleService>(LifecycleService);
    applicationLifecycleService = module.get<ApplicationLifecycleService>(
      ApplicationLifecycleService
    );
    nvpService = module.get<NVPService>(NVPService);
    authorizationPolicyService = module.get<AuthorizationPolicyService>(
      AuthorizationPolicyService
    );
    roleSetCacheService = module.get<RoleSetCacheService>(RoleSetCacheService);
    db = module.get(DRIZZLE);
  });

  describe('getApplicationOrFail', () => {
    it('should return application when it exists', async () => {
      const mockApplication = { id: 'app-1' } as Application;
      db.query.applications.findFirst.mockResolvedValueOnce(mockApplication);

      const result = await service.getApplicationOrFail('app-1');

      expect(result).toBe(mockApplication);
    });

    it('should throw EntityNotFoundException when application does not exist', async () => {

      await expect(
        service.getApplicationOrFail('non-existent-id')
      ).rejects.toThrow(EntityNotFoundException);
    });

    it('should merge provided options with the id filter', async () => {
      const mockApplication = { id: 'app-1' } as Application;
      db.query.applications.findFirst.mockResolvedValueOnce(mockApplication);

      await service.getApplicationOrFail('app-1', {
        with: { user: true },
      });

    });
  });

  describe('createApplication', () => {
    it('should create application with user, authorization policy, and lifecycle', async () => {
      const mockUser = { id: 'user-1' } as any;
      const mockLifecycle = { id: 'lifecycle-1' } as any;
      const applicationData = {
        userID: 'user-1',
        roleSetID: 'roleset-1',
        questions: [],
      };

      (userService.getUserOrFail as Mock).mockResolvedValue(mockUser);
      (lifecycleService.createLifecycle as Mock).mockResolvedValue(
        mockLifecycle
      );

      const result = await service.createApplication(applicationData);

      expect(userService.getUserOrFail).toHaveBeenCalledWith('user-1');
      expect(result.user).toBe(mockUser);
      expect(result.authorization).toBeDefined();
      expect(result.lifecycle).toBe(mockLifecycle);
    });
  });

  describe('deleteApplication', () => {
    it('should delete application with all related entities', async () => {
      const mockApplication = {
        id: 'app-1',
        questions: [{ id: 'q-1' }, { id: 'q-2' }],
        lifecycle: { id: 'lifecycle-1' },
        authorization: { id: 'auth-1' },
        user: { id: 'user-1' },
        roleSet: { id: 'roleset-1' },
      } as any;

      vi.spyOn(service, 'getApplicationOrFail').mockResolvedValue(
        mockApplication
      );
      (nvpService.removeNVP as Mock).mockResolvedValue(undefined as any);
      (lifecycleService.deleteLifecycle as Mock).mockResolvedValue(
        undefined as any
      );
      (authorizationPolicyService.delete as Mock).mockResolvedValue(
        undefined as any
      );
      (
        roleSetCacheService.deleteOpenApplicationFromCache as Mock
      ).mockResolvedValue(undefined);

      const result = await service.deleteApplication({ ID: 'app-1' });

      expect(nvpService.removeNVP).toHaveBeenCalledTimes(2);
      expect(nvpService.removeNVP).toHaveBeenCalledWith('q-1');
      expect(nvpService.removeNVP).toHaveBeenCalledWith('q-2');
      expect(lifecycleService.deleteLifecycle).toHaveBeenCalledWith(
        'lifecycle-1'
      );
      expect(authorizationPolicyService.delete).toHaveBeenCalledWith(
        mockApplication.authorization
      );
      expect(result.id).toBe('app-1');
    });

    it('should skip question removal when application has no questions', async () => {
      const mockApplication = {
        id: 'app-1',
        questions: undefined,
        lifecycle: { id: 'lifecycle-1' },
        authorization: { id: 'auth-1' },
        user: { id: 'user-1' },
        roleSet: { id: 'roleset-1' },
      } as any;

      vi.spyOn(service, 'getApplicationOrFail').mockResolvedValue(
        mockApplication
      );
      (lifecycleService.deleteLifecycle as Mock).mockResolvedValue(
        undefined as any
      );
      (authorizationPolicyService.delete as Mock).mockResolvedValue(
        undefined as any
      );
      (
        roleSetCacheService.deleteOpenApplicationFromCache as Mock
      ).mockResolvedValue(undefined);

      await service.deleteApplication({ ID: 'app-1' });

      expect(nvpService.removeNVP).not.toHaveBeenCalled();
    });

    it('should skip authorization policy deletion when authorization is undefined', async () => {
      const mockApplication = {
        id: 'app-1',
        questions: undefined,
        lifecycle: { id: 'lifecycle-1' },
        authorization: undefined,
        user: { id: 'user-1' },
        roleSet: { id: 'roleset-1' },
      } as any;

      vi.spyOn(service, 'getApplicationOrFail').mockResolvedValue(
        mockApplication
      );
      (lifecycleService.deleteLifecycle as Mock).mockResolvedValue(
        undefined as any
      );
      (
        roleSetCacheService.deleteOpenApplicationFromCache as Mock
      ).mockResolvedValue(undefined);

      await service.deleteApplication({ ID: 'app-1' });

      expect(authorizationPolicyService.delete).not.toHaveBeenCalled();
    });

    it('should skip cache invalidation when user or roleSet is not loaded', async () => {
      const mockApplication = {
        id: 'app-1',
        questions: undefined,
        lifecycle: { id: 'lifecycle-1' },
        authorization: undefined,
        user: undefined,
        roleSet: undefined,
      } as any;

      vi.spyOn(service, 'getApplicationOrFail').mockResolvedValue(
        mockApplication
      );
      (lifecycleService.deleteLifecycle as Mock).mockResolvedValue(
        undefined as any
      );

      await service.deleteApplication({ ID: 'app-1' });

      expect(
        roleSetCacheService.deleteOpenApplicationFromCache
      ).not.toHaveBeenCalled();
    });
  });

  describe('getContributor', () => {
    it('should return user when application has a loaded user relation', async () => {
      const mockUser = { id: 'user-1', email: 'user@test.com' } as any;
      const mockApplication = {
        id: 'app-1',
        user: mockUser,
      } as Application;

      vi.spyOn(service, 'getApplicationOrFail').mockResolvedValue(
        mockApplication
      );

      const result = await service.getContributor('app-1');

      expect(result).toBe(mockUser);
    });

    it('should throw RelationshipNotFoundException when user relation is not loaded', async () => {
      const mockApplication = {
        id: 'app-1',
        user: undefined,
      } as Application;

      vi.spyOn(service, 'getApplicationOrFail').mockResolvedValue(
        mockApplication
      );

      await expect(service.getContributor('app-1')).rejects.toThrow(
        RelationshipNotFoundException
      );
    });
  });

  describe('findApplicationsForUser', () => {
    it('should return all applications when no states filter is provided', async () => {
      const mockApplications = [
        { id: 'app-1' },
        { id: 'app-2' },
      ] as Application[];
      db.query.applications.findMany.mockResolvedValueOnce(mockApplications);

      const result = await service.findApplicationsForUser('user-1');

      expect(result).toEqual(mockApplications);
    });

    it('should filter applications by lifecycle state when states are provided', async () => {
      const mockApplications = [
        { id: 'app-1', lifecycle: { machineState: 'new' } },
        { id: 'app-2', lifecycle: { machineState: 'approved' } },
      ] as any[];
      db.query.applications.findMany.mockResolvedValueOnce(mockApplications);

      (applicationLifecycleService.getState as Mock)
        .mockReturnValueOnce('new')
        .mockReturnValueOnce('approved');

      const result = await service.findApplicationsForUser('user-1', ['new']);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('app-1');
    });

    it('should include lifecycle relation when states filter is provided', async () => {
      (applicationLifecycleService.getState as Mock).mockReturnValue('new');

      await service.findApplicationsForUser('user-1', ['new']);

    });

    it('should return empty array when no applications match the states filter', async () => {
      const mockApplications = [
        { id: 'app-1', lifecycle: { machineState: 'approved' } },
      ] as any[];

      (applicationLifecycleService.getState as Mock).mockReturnValue(
        'approved'
      );

      const result = await service.findApplicationsForUser('user-1', ['new']);

      expect(result).toHaveLength(0);
    });
  });

  describe('findExistingApplications', () => {
    it('should return existing applications when found', async () => {
      const mockApplications = [{ id: 'app-1' }] as Application[];
      db.query.applications.findMany.mockResolvedValueOnce(mockApplications);

      const result = await service.findExistingApplications(
        'user-1',
        'roleset-1'
      );

      expect(result).toEqual(mockApplications);
    });

    it('should return empty array when no applications found', async () => {

      const result = await service.findExistingApplications(
        'user-1',
        'roleset-1'
      );

      expect(result).toEqual([]);
    });
  });

  describe('getLifecycleState', () => {
    it('should return lifecycle state from the application lifecycle service', async () => {
      const mockApplication = {
        id: 'app-1',
        lifecycle: { id: 'lifecycle-1', machineState: 'new' },
      } as any;

      vi.spyOn(service, 'getApplicationOrFail').mockResolvedValue(
        mockApplication
      );
      (applicationLifecycleService.getState as Mock).mockReturnValue('new');

      const result = await service.getLifecycleState('app-1');

      expect(result).toBe('new');
      expect(applicationLifecycleService.getState).toHaveBeenCalledWith(
        mockApplication.lifecycle
      );
    });
  });

  describe('isFinalizedApplication', () => {
    it('should return true when application is in a final state', async () => {
      const mockApplication = {
        id: 'app-1',
        lifecycle: { id: 'lifecycle-1' },
      } as any;

      vi.spyOn(service, 'getApplicationOrFail').mockResolvedValue(
        mockApplication
      );
      (applicationLifecycleService.isFinalState as Mock).mockReturnValue(true);

      const result = await service.isFinalizedApplication('app-1');

      expect(result).toBe(true);
    });

    it('should return false when application is not in a final state', async () => {
      const mockApplication = {
        id: 'app-1',
        lifecycle: { id: 'lifecycle-1' },
      } as any;

      vi.spyOn(service, 'getApplicationOrFail').mockResolvedValue(
        mockApplication
      );
      (applicationLifecycleService.isFinalState as Mock).mockReturnValue(false);

      const result = await service.isFinalizedApplication('app-1');

      expect(result).toBe(false);
    });
  });

  describe('getQuestionsSorted', () => {
    it('should return questions sorted by sortOrder ascending', async () => {
      const mockApplication = {
        id: 'app-1',
        questions: [
          { id: 'q-3', sortOrder: 3, name: 'c', value: '' },
          { id: 'q-1', sortOrder: 1, name: 'a', value: '' },
          { id: 'q-2', sortOrder: 2, name: 'b', value: '' },
        ],
      } as unknown as IApplication;

      const result = await service.getQuestionsSorted(mockApplication);

      expect(result[0].sortOrder).toBe(1);
      expect(result[1].sortOrder).toBe(2);
      expect(result[2].sortOrder).toBe(3);
    });

    it('should throw RelationshipNotFoundException when questions are not loaded', async () => {
      const mockApplication = {
        id: 'app-1',
        questions: undefined,
      } as IApplication;

      await expect(service.getQuestionsSorted(mockApplication)).rejects.toThrow(
        RelationshipNotFoundException
      );
    });
  });
});

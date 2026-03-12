import { AUTH_RESET_SERVICE } from '@common/constants';
import { AlkemioErrorStatus } from '@common/enums';
import { BaseException } from '@common/exceptions/base.exception';
import { Account } from '@domain/space/account/account.entity';
import { ClientProxy } from '@nestjs/microservices';
import { Test, TestingModule } from '@nestjs/testing';
import { TaskService } from '@services/task/task.service';
import {
  MockAuthResetService,
  MockEntityManagerProvider,
  MockWinstonProvider,
} from '@test/mocks';
import { MockTaskService } from '@test/mocks/task.service.mock';
import { EntityManager } from 'typeorm';
import { type Mocked, vi } from 'vitest';
import { RESET_EVENT_TYPE } from '../reset.event.type';
import { AuthResetService } from './auth-reset.service';

describe('AuthResetService', () => {
  let service: AuthResetService;
  let authResetQueue: Mocked<ClientProxy>;
  let entityManager: Mocked<EntityManager>;
  let taskService: Mocked<TaskService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthResetService,
        MockAuthResetService,
        MockTaskService,
        MockEntityManagerProvider,
        MockWinstonProvider,
      ],
    }).compile();

    service = module.get<AuthResetService>(AuthResetService);
    authResetQueue = module.get(AUTH_RESET_SERVICE) as Mocked<ClientProxy>;
    entityManager = module.get(EntityManager) as Mocked<EntityManager>;
    taskService = module.get(TaskService) as Mocked<TaskService>;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('publishAuthorizationResetAllAccounts', () => {
    it('should emit an event for each account', async () => {
      const accounts = [{ id: 'acc-1' }, { id: 'acc-2' }];
      entityManager.find.mockResolvedValue(accounts);

      const result =
        await service.publishAuthorizationResetAllAccounts('task-123');

      expect(result).toBe('task-123');
      expect(entityManager.find).toHaveBeenCalledWith(Account, {
        select: { id: true },
      });
      expect(authResetQueue.emit).toHaveBeenCalledTimes(2);
      expect(authResetQueue.emit).toHaveBeenCalledWith(
        RESET_EVENT_TYPE.AUTHORIZATION_RESET_ACCOUNT,
        {
          id: 'acc-1',
          type: RESET_EVENT_TYPE.AUTHORIZATION_RESET_ACCOUNT,
          task: 'task-123',
        }
      );
      expect(authResetQueue.emit).toHaveBeenCalledWith(
        RESET_EVENT_TYPE.AUTHORIZATION_RESET_ACCOUNT,
        {
          id: 'acc-2',
          type: RESET_EVENT_TYPE.AUTHORIZATION_RESET_ACCOUNT,
          task: 'task-123',
        }
      );
    });

    it('should create a task when no taskId is provided', async () => {
      const accounts = [{ id: 'acc-1' }];
      entityManager.find.mockResolvedValue(accounts);
      taskService.create.mockResolvedValue({ id: 'new-task' } as any);

      const result = await service.publishAuthorizationResetAllAccounts();

      expect(taskService.create).toHaveBeenCalledWith(1);
      expect(result).toBe('new-task');
    });

    it('should handle empty accounts list', async () => {
      entityManager.find.mockResolvedValue([]);

      const result =
        await service.publishAuthorizationResetAllAccounts('task-x');

      expect(result).toBe('task-x');
      expect(authResetQueue.emit).not.toHaveBeenCalled();
    });
  });

  describe('publishLicenseResetAllAccounts', () => {
    it('should emit license reset event for each account', async () => {
      const accounts = [{ id: 'acc-1' }];
      entityManager.find.mockResolvedValue(accounts);

      const result = await service.publishLicenseResetAllAccounts('task-456');

      expect(result).toBe('task-456');
      expect(authResetQueue.emit).toHaveBeenCalledWith(
        RESET_EVENT_TYPE.LICENSE_RESET_ACCOUNT,
        {
          id: 'acc-1',
          type: RESET_EVENT_TYPE.LICENSE_RESET_ACCOUNT,
          task: 'task-456',
        }
      );
    });

    it('should create a task when no taskId is provided', async () => {
      entityManager.find.mockResolvedValue([{ id: 'a' }]);
      taskService.create.mockResolvedValue({ id: 'auto-task' } as any);

      await service.publishLicenseResetAllAccounts();

      expect(taskService.create).toHaveBeenCalledWith(1);
    });
  });

  describe('publishLicenseResetAllOrganizations', () => {
    it('should emit license reset event for each organization', async () => {
      const orgs = [{ id: 'org-1' }, { id: 'org-2' }];
      entityManager.find.mockResolvedValue(orgs);

      const result =
        await service.publishLicenseResetAllOrganizations('task-789');

      expect(result).toBe('task-789');
      expect(authResetQueue.emit).toHaveBeenCalledTimes(2);
      expect(authResetQueue.emit).toHaveBeenCalledWith(
        RESET_EVENT_TYPE.LICENSE_RESET_ORGANIZATION,
        {
          id: 'org-1',
          type: RESET_EVENT_TYPE.LICENSE_RESET_ORGANIZATION,
          task: 'task-789',
        }
      );
    });

    it('should create a task when no taskId is provided', async () => {
      entityManager.find.mockResolvedValue([]);
      taskService.create.mockResolvedValue({ id: 't' } as any);

      await service.publishLicenseResetAllOrganizations();

      expect(taskService.create).toHaveBeenCalledWith(0);
    });
  });

  describe('publishAuthorizationResetAllUsers', () => {
    it('should emit auth reset event for each user', async () => {
      const users = [{ id: 'user-1' }];
      entityManager.find.mockResolvedValue(users);

      const result = await service.publishAuthorizationResetAllUsers('task-u');

      expect(result).toBe('task-u');
      expect(authResetQueue.emit).toHaveBeenCalledWith(
        RESET_EVENT_TYPE.AUTHORIZATION_RESET_USER,
        {
          id: 'user-1',
          type: RESET_EVENT_TYPE.AUTHORIZATION_RESET_USER,
          task: 'task-u',
        }
      );
    });

    it('should create a task when no taskId is provided', async () => {
      entityManager.find.mockResolvedValue([{ id: 'u1' }, { id: 'u2' }]);
      taskService.create.mockResolvedValue({ id: 'auto' } as any);

      await service.publishAuthorizationResetAllUsers();

      expect(taskService.create).toHaveBeenCalledWith(2);
    });
  });

  describe('publishAuthorizationResetAllOrganizations', () => {
    it('should emit auth reset event for each organization', async () => {
      const orgs = [{ id: 'org-a' }];
      entityManager.find.mockResolvedValue(orgs);

      const result =
        await service.publishAuthorizationResetAllOrganizations('task-o');

      expect(result).toBe('task-o');
      expect(authResetQueue.emit).toHaveBeenCalledWith(
        RESET_EVENT_TYPE.AUTHORIZATION_RESET_ORGANIZATION,
        {
          id: 'org-a',
          type: RESET_EVENT_TYPE.AUTHORIZATION_RESET_ORGANIZATION,
          task: 'task-o',
        }
      );
    });
  });

  describe('publishAuthorizationResetPlatform', () => {
    it('should emit platform auth and license reset events', async () => {
      await service.publishAuthorizationResetPlatform();

      expect(authResetQueue.emit).toHaveBeenCalledTimes(2);
      expect(authResetQueue.emit).toHaveBeenCalledWith(
        RESET_EVENT_TYPE.AUTHORIZATION_RESET_PLATFORM,
        {}
      );
      expect(authResetQueue.emit).toHaveBeenCalledWith(
        RESET_EVENT_TYPE.LICENSE_RESET_PLATFORM,
        {}
      );
    });
  });

  describe('publishAuthorizationResetAiServer', () => {
    it('should emit AI server auth reset event', async () => {
      await service.publishAuthorizationResetAiServer();

      expect(authResetQueue.emit).toHaveBeenCalledTimes(1);
      expect(authResetQueue.emit).toHaveBeenCalledWith(
        RESET_EVENT_TYPE.AUTHORIZATION_RESET_AI_SERVER,
        {}
      );
    });
  });

  describe('publishResetAll', () => {
    beforeEach(() => {
      // All find calls return empty arrays by default
      entityManager.find.mockResolvedValue([]);
    });

    it('should use provided taskId and return it', async () => {
      const result = await service.publishResetAll('existing-task');

      expect(result).toBe('existing-task');
      expect(taskService.create).not.toHaveBeenCalled();
    });

    it('should create a task when no taskId is provided', async () => {
      taskService.create.mockResolvedValue({ id: 'created-task' } as any);

      const result = await service.publishResetAll();

      expect(taskService.create).toHaveBeenCalled();
      expect(result).toBe('created-task');
    });

    it('should call all publish methods', async () => {
      const spy1 = vi.spyOn(service, 'publishAuthorizationResetAllAccounts');
      const spy2 = vi.spyOn(
        service,
        'publishAuthorizationResetAllOrganizations'
      );
      const spy3 = vi.spyOn(service, 'publishAuthorizationResetAllUsers');
      const spy4 = vi.spyOn(service, 'publishAuthorizationResetPlatform');
      const spy5 = vi.spyOn(service, 'publishAuthorizationResetAiServer');
      const spy6 = vi.spyOn(service, 'publishLicenseResetAllAccounts');
      const spy7 = vi.spyOn(service, 'publishLicenseResetAllOrganizations');

      await service.publishResetAll('t1');

      expect(spy1).toHaveBeenCalledWith('t1');
      expect(spy2).toHaveBeenCalledWith('t1');
      expect(spy3).toHaveBeenCalledWith('t1');
      expect(spy4).toHaveBeenCalled();
      expect(spy5).toHaveBeenCalled();
      expect(spy6).toHaveBeenCalledWith('t1');
      expect(spy7).toHaveBeenCalledWith('t1');
    });

    it('should throw BaseException when a sub-method fails', async () => {
      entityManager.find.mockRejectedValue(new Error('DB down'));

      await expect(service.publishResetAll('t')).rejects.toThrow(BaseException);

      try {
        await service.publishResetAll('t');
      } catch (error) {
        expect(error).toBeInstanceOf(BaseException);
        expect((error as BaseException).code).toBe(
          AlkemioErrorStatus.AUTHORIZATION_RESET
        );
      }
    });
  });
});

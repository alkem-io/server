import { ValidationException } from '@common/exceptions';
import { InAppNotification } from '@platform/in-app-notification/in.app.notification.entity';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { repositoryProviderMockFactory } from '@test/utils/repository.provider.mock.factory';
import { type Mock, vi } from 'vitest';
import { Repository } from 'typeorm';
import { InAppNotificationAdminService } from './in.app.notification.admin.service';

describe('InAppNotificationAdminService', () => {
  let service: InAppNotificationAdminService;
  let repo: Repository<InAppNotification>;
  let configService: { get: Mock };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InAppNotificationAdminService,
        repositoryProviderMockFactory(InAppNotification),
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(InAppNotificationAdminService);
    repo = module.get<Repository<InAppNotification>>(
      getRepositoryToken(InAppNotification)
    );
    configService = module.get(ConfigService) as unknown as typeof configService;
  });

  describe('pruneInAppNotifications', () => {
    it('should throw ValidationException when retentionDays is zero', async () => {
      vi.mocked(configService.get)
        .mockReturnValueOnce(0)   // retentionDays
        .mockReturnValueOnce(100); // maxPerUser

      await expect(service.pruneInAppNotifications()).rejects.toThrow(
        ValidationException
      );
    });

    it('should throw ValidationException when retentionDays is negative', async () => {
      vi.mocked(configService.get)
        .mockReturnValueOnce(-5)  // retentionDays
        .mockReturnValueOnce(100); // maxPerUser

      await expect(service.pruneInAppNotifications()).rejects.toThrow(
        ValidationException
      );
    });

    it('should throw ValidationException when retentionDays is not an integer', async () => {
      vi.mocked(configService.get)
        .mockReturnValueOnce(2.5)  // retentionDays
        .mockReturnValueOnce(100); // maxPerUser

      await expect(service.pruneInAppNotifications()).rejects.toThrow(
        ValidationException
      );
    });

    it('should throw ValidationException when maxPerUser is zero', async () => {
      vi.mocked(configService.get)
        .mockReturnValueOnce(30)  // retentionDays
        .mockReturnValueOnce(0);  // maxPerUser

      await expect(service.pruneInAppNotifications()).rejects.toThrow(
        ValidationException
      );
    });

    it('should throw ValidationException when maxPerUser is negative', async () => {
      vi.mocked(configService.get)
        .mockReturnValueOnce(30)  // retentionDays
        .mockReturnValueOnce(-1); // maxPerUser

      await expect(service.pruneInAppNotifications()).rejects.toThrow(
        ValidationException
      );
    });

    it('should delete old notifications and return counts on valid config', async () => {
      vi.mocked(configService.get)
        .mockReturnValueOnce(30)  // retentionDays
        .mockReturnValueOnce(50); // maxPerUser

      vi.spyOn(repo, 'delete').mockResolvedValue({ affected: 5 } as any);

      // Mock the query builder chain for pruneExcessNotificationsPerUser
      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        addSelect: vi.fn().mockReturnThis(),
        groupBy: vi.fn().mockReturnThis(),
        having: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        getRawMany: vi.fn().mockResolvedValue([]),
        getMany: vi.fn().mockResolvedValue([]),
      };
      vi.spyOn(repo, 'createQueryBuilder').mockReturnValue(
        mockQueryBuilder as any
      );

      const result = await service.pruneInAppNotifications();

      expect(result.removedCountOutsideRetentionPeriod).toBe(5);
      expect(result.removedCountExceedingUserLimit).toBe(0);
    });

    it('should prune excess notifications per user and sum the total', async () => {
      vi.mocked(configService.get)
        .mockReturnValueOnce(30)  // retentionDays
        .mockReturnValueOnce(10); // maxPerUser

      // Step 1: delete old notifications
      vi.spyOn(repo, 'delete')
        .mockResolvedValueOnce({ affected: 2 } as any) // old ones
        .mockResolvedValueOnce({ affected: 3 } as any); // excess per user

      // Step 2: query builder for excess per user
      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        addSelect: vi.fn().mockReturnThis(),
        groupBy: vi.fn().mockReturnThis(),
        having: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        getRawMany: vi.fn().mockResolvedValue([
          { receiverID: 'user-1', count: '15' },
        ]),
        getMany: vi.fn().mockResolvedValue([
          { id: 'n-1' },
          { id: 'n-2' },
          { id: 'n-3' },
        ]),
      };
      vi.spyOn(repo, 'createQueryBuilder').mockReturnValue(
        mockQueryBuilder as any
      );

      const result = await service.pruneInAppNotifications();

      expect(result.removedCountOutsideRetentionPeriod).toBe(2);
      expect(result.removedCountExceedingUserLimit).toBe(3);
    });

    it('should rethrow when repo.delete throws during pruning', async () => {
      vi.mocked(configService.get)
        .mockReturnValueOnce(30)  // retentionDays
        .mockReturnValueOnce(50); // maxPerUser

      vi.spyOn(repo, 'delete').mockRejectedValue(new Error('db error'));

      await expect(service.pruneInAppNotifications()).rejects.toThrow(
        'db error'
      );
    });
  });
});

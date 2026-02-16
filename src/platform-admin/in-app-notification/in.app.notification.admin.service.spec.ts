import { ValidationException } from '@common/exceptions';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { InAppNotification } from '@platform/in-app-notification/in.app.notification.entity';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mock, vi } from 'vitest';
import { InAppNotificationAdminService } from './in.app.notification.admin.service';
import { mockDrizzleProvider } from '@test/utils/drizzle.mock.factory';
import { DRIZZLE } from '@config/drizzle/drizzle.constants';

describe('InAppNotificationAdminService', () => {
  let service: InAppNotificationAdminService;
  let configService: { get: Mock };
  let db: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InAppNotificationAdminService,
        mockDrizzleProvider,
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(InAppNotificationAdminService);
    db = module.get(DRIZZLE);
    configService = module.get(
      ConfigService
    ) as unknown as typeof configService;
  });

  describe('pruneInAppNotifications', () => {
    it('should throw ValidationException when retentionDays is zero', async () => {
      vi.mocked(configService.get)
        .mockReturnValueOnce(0) // retentionDays
        .mockReturnValueOnce(100); // maxPerUser

      await expect(service.pruneInAppNotifications()).rejects.toThrow(
        ValidationException
      );
    });

    it('should throw ValidationException when retentionDays is negative', async () => {
      vi.mocked(configService.get)
        .mockReturnValueOnce(-5) // retentionDays
        .mockReturnValueOnce(100); // maxPerUser

      await expect(service.pruneInAppNotifications()).rejects.toThrow(
        ValidationException
      );
    });

    it('should throw ValidationException when retentionDays is not an integer', async () => {
      vi.mocked(configService.get)
        .mockReturnValueOnce(2.5) // retentionDays
        .mockReturnValueOnce(100); // maxPerUser

      await expect(service.pruneInAppNotifications()).rejects.toThrow(
        ValidationException
      );
    });

    it('should throw ValidationException when maxPerUser is zero', async () => {
      vi.mocked(configService.get)
        .mockReturnValueOnce(30) // retentionDays
        .mockReturnValueOnce(0); // maxPerUser

      await expect(service.pruneInAppNotifications()).rejects.toThrow(
        ValidationException
      );
    });

    it('should throw ValidationException when maxPerUser is negative', async () => {
      vi.mocked(configService.get)
        .mockReturnValueOnce(30) // retentionDays
        .mockReturnValueOnce(-1); // maxPerUser

      await expect(service.pruneInAppNotifications()).rejects.toThrow(
        ValidationException
      );
    });

    it('should delete old notifications and return counts on valid config', async () => {
      vi.mocked(configService.get)
        .mockReturnValueOnce(30) // retentionDays
        .mockReturnValueOnce(50); // maxPerUser

      // Mock delete().where() for old notifications - returns 5 items
      db.where
        .mockResolvedValueOnce(new Array(5).fill({})) // delete old notifications
        .mockResolvedValueOnce([]); // select excess users (having is terminal, but it chains through where first... actually having is after groupBy)

      // Mock the select chain for excess users: select().from().groupBy().having()
      // having() is the terminal call, returns mock, Array.from resolves to []
      db.having.mockResolvedValueOnce([]);

      const result = await service.pruneInAppNotifications();

      expect(result.removedCountOutsideRetentionPeriod).toBe(5);
      expect(result.removedCountExceedingUserLimit).toBe(0);
    });

    it('should prune excess notifications per user and sum the total', async () => {
      vi.mocked(configService.get)
        .mockReturnValueOnce(30) // retentionDays
        .mockReturnValueOnce(10); // maxPerUser

      // Step 1: delete old notifications - where() resolves to 2 items
      db.where.mockResolvedValueOnce(new Array(2).fill({}));

      // Step 2: select excess users - having() resolves to users with excess
      db.having.mockResolvedValueOnce([
        { receiverID: 'user-1', count: 13 }, // 13 - 10 = 3 excess
      ]);

      // Step 3: findMany for oldest notifications of user-1
      db.query.inAppNotifications.findMany.mockResolvedValueOnce([
        { id: 'notif-1' },
        { id: 'notif-2' },
        { id: 'notif-3' },
      ]);

      // Step 4: delete excess notifications - where() resolves to 3 items
      db.where.mockResolvedValueOnce(new Array(3).fill({}));

      const result = await service.pruneInAppNotifications();

      expect(result.removedCountOutsideRetentionPeriod).toBe(2);
      expect(result.removedCountExceedingUserLimit).toBe(3);
    });

    it('should rethrow when repo.delete throws during pruning', async () => {
      vi.mocked(configService.get)
        .mockReturnValueOnce(30) // retentionDays
        .mockReturnValueOnce(50); // maxPerUser

      // Make where() reject to simulate db error during delete
      db.where.mockRejectedValueOnce(new Error('db error'));

      await expect(service.pruneInAppNotifications()).rejects.toThrow(
        'db error'
      );
    });
  });
});

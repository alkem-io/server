import { NotificationEvent } from '@common/enums/notification.event';
import { Test, TestingModule } from '@nestjs/testing';
import { NotificationRecipientsService } from '@services/api/notification-recipients/notification.recipients.service';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { vi } from 'vitest';
import { NotificationAdapter } from './notification.adapter';

describe('NotificationAdapter', () => {
  let adapter: NotificationAdapter;
  let recipientsService: NotificationRecipientsService;

  beforeEach(async () => {
    vi.restoreAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [NotificationAdapter],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    adapter = module.get<NotificationAdapter>(NotificationAdapter);
    recipientsService = module.get<NotificationRecipientsService>(
      NotificationRecipientsService
    );
  });

  it('should be defined', () => {
    expect(adapter).toBeDefined();
  });

  describe('getNotificationRecipients', () => {
    it('should delegate to notificationsRecipientsService.getRecipients', async () => {
      const mockResult = {
        emailRecipients: [],
        inAppRecipients: [],
      } as any;
      vi.mocked(recipientsService.getRecipients).mockResolvedValue(mockResult);

      const eventData = { triggeredBy: 'user-123' } as any;
      const result = await adapter.getNotificationRecipients(
        NotificationEvent.USER_MESSAGE,
        eventData,
        'space-id',
        'user-id',
        'org-id',
        'vc-id'
      );

      expect(result).toBe(mockResult);
      expect(recipientsService.getRecipients).toHaveBeenCalledWith({
        triggeredBy: 'user-123',
        eventType: NotificationEvent.USER_MESSAGE,
        spaceID: 'space-id',
        userID: 'user-id',
        organizationID: 'org-id',
        virtualContributorID: 'vc-id',
      });
    });

    it('should pass undefined for optional parameters', async () => {
      const mockResult = {
        emailRecipients: [],
        inAppRecipients: [],
      } as any;
      vi.mocked(recipientsService.getRecipients).mockResolvedValue(mockResult);

      const eventData = { triggeredBy: 'user-123' } as any;
      await adapter.getNotificationRecipients(
        NotificationEvent.USER_MESSAGE,
        eventData
      );

      expect(recipientsService.getRecipients).toHaveBeenCalledWith({
        triggeredBy: 'user-123',
        eventType: NotificationEvent.USER_MESSAGE,
        spaceID: undefined,
        userID: undefined,
        organizationID: undefined,
        virtualContributorID: undefined,
      });
    });
  });
});

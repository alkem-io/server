import { NotificationEvent } from '@common/enums/notification.event';
import { MessageDetailsService } from '@domain/communication/message.details/message.details.service';
import { Test, TestingModule } from '@nestjs/testing';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { vi } from 'vitest';
import { NotificationExternalAdapter } from '../notification-external-adapter/notification.external.adapter';
import { NotificationInAppAdapter } from '../notification-in-app-adapter/notification.in.app.adapter';
import { NotificationAdapter } from './notification.adapter';
import { NotificationOrganizationAdapter } from './notification.organization.adapter';

describe('NotificationOrganizationAdapter', () => {
  let adapter: NotificationOrganizationAdapter;
  let notificationAdapter: NotificationAdapter;
  let externalAdapter: NotificationExternalAdapter;
  let inAppAdapter: NotificationInAppAdapter;
  let messageDetailsService: MessageDetailsService;

  beforeEach(async () => {
    vi.restoreAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [NotificationOrganizationAdapter],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    adapter = module.get<NotificationOrganizationAdapter>(
      NotificationOrganizationAdapter
    );
    notificationAdapter = module.get<NotificationAdapter>(NotificationAdapter);
    externalAdapter = module.get<NotificationExternalAdapter>(
      NotificationExternalAdapter
    );
    inAppAdapter = module.get<NotificationInAppAdapter>(
      NotificationInAppAdapter
    );
    messageDetailsService = module.get<MessageDetailsService>(
      MessageDetailsService
    );
  });

  it('should be defined', () => {
    expect(adapter).toBeDefined();
  });

  describe('organizationMention', () => {
    const eventData = {
      triggeredBy: 'user-1',
      organizationID: 'org-1',
      roomID: 'room-1',
      messageID: 'msg-1',
    } as any;

    it('should send email notifications when email recipients exist', async () => {
      vi.mocked(
        notificationAdapter.getNotificationRecipients
      ).mockResolvedValue({
        emailRecipients: [{ id: 'user-2' }],
        inAppRecipients: [],
      } as any);
      vi.mocked(messageDetailsService.getMessageDetails).mockResolvedValue({
        message: 'test',
        parent: { url: '/url', displayName: 'Test' },
      } as any);
      vi.mocked(
        externalAdapter.buildOrganizationMentionNotificationPayload
      ).mockResolvedValue({} as any);

      await adapter.organizationMention(eventData);

      expect(
        externalAdapter.buildOrganizationMentionNotificationPayload
      ).toHaveBeenCalled();
      expect(externalAdapter.sendExternalNotifications).toHaveBeenCalled();
    });

    it('should skip email notifications when no email recipients', async () => {
      vi.mocked(
        notificationAdapter.getNotificationRecipients
      ).mockResolvedValue({
        emailRecipients: [],
        inAppRecipients: [{ id: 'user-2' }],
      } as any);
      vi.mocked(messageDetailsService.getMessageDetails).mockResolvedValue(
        {} as any
      );

      await adapter.organizationMention(eventData);

      expect(
        externalAdapter.buildOrganizationMentionNotificationPayload
      ).not.toHaveBeenCalled();
    });

    it('should send in-app notifications when in-app recipients exist', async () => {
      vi.mocked(
        notificationAdapter.getNotificationRecipients
      ).mockResolvedValue({
        emailRecipients: [],
        inAppRecipients: [{ id: 'user-2' }, { id: 'user-3' }],
      } as any);
      vi.mocked(messageDetailsService.getMessageDetails).mockResolvedValue(
        {} as any
      );

      await adapter.organizationMention(eventData);

      expect(inAppAdapter.sendInAppNotifications).toHaveBeenCalledWith(
        NotificationEvent.ORGANIZATION_ADMIN_MENTIONED,
        expect.any(String),
        'user-1',
        ['user-2', 'user-3'],
        expect.any(Object)
      );
    });

    it('should skip in-app notifications when no in-app recipients', async () => {
      vi.mocked(
        notificationAdapter.getNotificationRecipients
      ).mockResolvedValue({
        emailRecipients: [],
        inAppRecipients: [],
      } as any);
      vi.mocked(messageDetailsService.getMessageDetails).mockResolvedValue(
        {} as any
      );

      await adapter.organizationMention(eventData);

      expect(inAppAdapter.sendInAppNotifications).not.toHaveBeenCalled();
    });
  });

  describe('organizationSendMessage', () => {
    const eventData = {
      triggeredBy: 'user-1',
      organizationID: 'org-1',
      message: 'Hello org',
    } as any;

    it('should send email + in-app for recipients and sender', async () => {
      vi.mocked(
        notificationAdapter.getNotificationRecipients
      ).mockResolvedValue({
        emailRecipients: [{ id: 'user-2' }],
        inAppRecipients: [{ id: 'user-2' }],
      } as any);
      vi.mocked(
        externalAdapter.buildOrganizationMessageNotificationPayload
      ).mockResolvedValue({} as any);

      await adapter.organizationSendMessage(eventData);

      // Called twice: once for recipients, once for sender
      expect(
        notificationAdapter.getNotificationRecipients
      ).toHaveBeenCalledTimes(2);
      expect(externalAdapter.sendExternalNotifications).toHaveBeenCalled();
    });

    it('should skip email when no email recipients', async () => {
      vi.mocked(
        notificationAdapter.getNotificationRecipients
      ).mockResolvedValue({
        emailRecipients: [],
        inAppRecipients: [],
      } as any);

      await adapter.organizationSendMessage(eventData);

      expect(
        externalAdapter.buildOrganizationMessageNotificationPayload
      ).not.toHaveBeenCalled();
    });
  });
});

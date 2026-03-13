import { NotificationEvent } from '@common/enums/notification.event';
import { MessageDetailsService } from '@domain/communication/message.details/message.details.service';
import { Test, TestingModule } from '@nestjs/testing';
import { CommunityResolverService } from '@services/infrastructure/entity-resolver/community.resolver.service';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { vi } from 'vitest';
import { NotificationExternalAdapter } from '../notification-external-adapter/notification.external.adapter';
import { NotificationInAppAdapter } from '../notification-in-app-adapter/notification.in.app.adapter';
import { NotificationAdapter } from './notification.adapter';
import { NotificationUserAdapter } from './notification.user.adapter';

describe('NotificationUserAdapter', () => {
  let adapter: NotificationUserAdapter;
  let notificationAdapter: NotificationAdapter;
  let externalAdapter: NotificationExternalAdapter;
  let inAppAdapter: NotificationInAppAdapter;
  let messageDetailsService: MessageDetailsService;
  let communityResolverService: CommunityResolverService;

  const mockRecipients = (
    emailRecipients: any[] = [],
    inAppRecipients: any[] = []
  ) => {
    vi.mocked(notificationAdapter.getNotificationRecipients).mockResolvedValue({
      emailRecipients,
      inAppRecipients,
    } as any);
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationUserAdapter,
        {
          provide: WINSTON_MODULE_NEST_PROVIDER,
          useValue: {
            error: vi.fn(),
            warn: vi.fn(),
            verbose: vi.fn(),
          },
        },
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    adapter = module.get<NotificationUserAdapter>(NotificationUserAdapter);
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
    communityResolverService = module.get<CommunityResolverService>(
      CommunityResolverService
    );
  });

  it('should be defined', () => {
    expect(adapter).toBeDefined();
  });

  describe('userSignUpWelcome', () => {
    it('should send external and in-app notifications', async () => {
      mockRecipients([{ id: 'user-new' }], [{ id: 'user-new' }]);
      vi.mocked(
        externalAdapter.buildPlatformUserRegisteredNotificationPayload
      ).mockResolvedValue({} as any);

      await adapter.userSignUpWelcome({
        triggeredBy: 'user-new',
        userID: 'user-new',
      } as any);

      expect(externalAdapter.sendExternalNotifications).toHaveBeenCalled();
      expect(inAppAdapter.sendInAppNotifications).toHaveBeenCalledWith(
        NotificationEvent.USER_SIGN_UP_WELCOME,
        expect.any(String),
        'user-new',
        ['user-new'],
        expect.any(Object)
      );
    });

    it('should skip in-app when no in-app recipients', async () => {
      mockRecipients([{ id: 'user-new' }], []);
      vi.mocked(
        externalAdapter.buildPlatformUserRegisteredNotificationPayload
      ).mockResolvedValue({} as any);

      await adapter.userSignUpWelcome({
        triggeredBy: 'user-new',
        userID: 'user-new',
      } as any);

      expect(inAppAdapter.sendInAppNotifications).not.toHaveBeenCalled();
    });
  });

  describe('userMention', () => {
    it('should filter out sender from recipients', async () => {
      mockRecipients(
        [{ id: 'user-1' }, { id: 'user-2' }],
        [{ id: 'user-1' }, { id: 'user-2' }]
      );
      vi.mocked(messageDetailsService.getMessageDetails).mockResolvedValue({
        message: 'Hello @user-2',
        parent: { url: '/url', displayName: 'Context' },
      } as any);
      vi.mocked(
        externalAdapter.buildUserMentionNotificationPayload
      ).mockResolvedValue({} as any);

      await adapter.userMention({
        triggeredBy: 'user-1',
        userID: 'user-2',
        roomID: 'room-1',
        messageID: 'msg-1',
      } as any);

      // Email should exclude user-1 (sender)
      expect(
        externalAdapter.buildUserMentionNotificationPayload
      ).toHaveBeenCalledWith(
        expect.any(String),
        'user-1',
        [expect.objectContaining({ id: 'user-2' })],
        'user-2',
        expect.any(Object)
      );
    });

    it('should skip email when only sender in recipients', async () => {
      mockRecipients([{ id: 'user-1' }], [{ id: 'user-1' }]);
      vi.mocked(messageDetailsService.getMessageDetails).mockResolvedValue(
        {} as any
      );

      await adapter.userMention({
        triggeredBy: 'user-1',
        userID: 'user-1',
        roomID: 'room-1',
        messageID: 'msg-1',
      } as any);

      expect(
        externalAdapter.buildUserMentionNotificationPayload
      ).not.toHaveBeenCalled();
    });
  });

  describe('userToUserMessageDirect', () => {
    it('should send email and in-app notifications', async () => {
      mockRecipients([{ id: 'user-2' }], [{ id: 'user-2' }]);
      vi.mocked(
        externalAdapter.buildUserMessageSentNotificationPayload
      ).mockResolvedValue({} as any);

      await adapter.userToUserMessageDirect({
        triggeredBy: 'user-1',
        receiverID: 'user-2',
        message: 'Hello!',
      } as any);

      expect(externalAdapter.sendExternalNotifications).toHaveBeenCalled();
      expect(inAppAdapter.sendInAppNotifications).toHaveBeenCalled();
    });

    it('should skip email when no email recipients', async () => {
      mockRecipients([], [{ id: 'user-2' }]);

      await adapter.userToUserMessageDirect({
        triggeredBy: 'user-1',
        receiverID: 'user-2',
        message: 'Hello!',
      } as any);

      expect(
        externalAdapter.buildUserMessageSentNotificationPayload
      ).not.toHaveBeenCalled();
    });
  });

  describe('userCommentReply', () => {
    it('should send notifications for reply', async () => {
      mockRecipients([{ id: 'user-2' }], [{ id: 'user-2' }]);
      vi.mocked(messageDetailsService.getMessageDetails).mockResolvedValue({
        message: 'Reply text',
        parent: { url: '/url', displayName: 'Context' },
      } as any);
      vi.mocked(externalAdapter.buildUserCommentReplyPayload).mockResolvedValue(
        {} as any
      );

      await adapter.userCommentReply({
        triggeredBy: 'user-1',
        messageRepliedToOwnerID: 'user-2',
        roomId: 'room-1',
        messageID: 'msg-1',
      } as any);

      expect(externalAdapter.sendExternalNotifications).toHaveBeenCalled();
    });

    it('should filter out sender from reply recipients', async () => {
      mockRecipients([{ id: 'user-1' }], [{ id: 'user-1' }]);
      vi.mocked(messageDetailsService.getMessageDetails).mockResolvedValue(
        {} as any
      );

      await adapter.userCommentReply({
        triggeredBy: 'user-1',
        messageRepliedToOwnerID: 'user-1',
        roomId: 'room-1',
        messageID: 'msg-1',
      } as any);

      // Should filter out sender, so no email sent
      expect(
        externalAdapter.buildUserCommentReplyPayload
      ).not.toHaveBeenCalled();
    });

    it('should catch errors gracefully', async () => {
      mockRecipients([{ id: 'user-2' }], []);
      vi.mocked(messageDetailsService.getMessageDetails).mockResolvedValue(
        {} as any
      );
      vi.mocked(externalAdapter.buildUserCommentReplyPayload).mockRejectedValue(
        new Error('Build failed')
      );

      // Should not throw
      await expect(
        adapter.userCommentReply({
          triggeredBy: 'user-1',
          messageRepliedToOwnerID: 'user-2',
          roomId: 'room-1',
          messageID: 'msg-1',
        } as any)
      ).resolves.not.toThrow();
    });
  });

  describe('userSpaceCommunityInvitationCreated', () => {
    it('should send external and in-app notifications', async () => {
      vi.mocked(
        communityResolverService.getSpaceForCommunityOrFail
      ).mockResolvedValue({ id: 'space-1' } as any);
      mockRecipients([{ id: 'user-invited' }], [{ id: 'user-invited' }]);
      vi.mocked(
        externalAdapter.buildNotificationPayloadUserSpaceCommunityInvitation
      ).mockResolvedValue({} as any);

      await adapter.userSpaceCommunityInvitationCreated({
        triggeredBy: 'user-1',
        community: { id: 'community-1' },
        invitedContributorID: 'user-invited',
        invitationID: 'inv-1',
        welcomeMessage: 'Welcome!',
      } as any);

      expect(externalAdapter.sendExternalNotifications).toHaveBeenCalled();
      expect(inAppAdapter.sendInAppNotifications).toHaveBeenCalled();
    });
  });

  describe('userSpaceCommunityJoined', () => {
    it('should send external and in-app notifications', async () => {
      mockRecipients([{ id: 'new-member' }], [{ id: 'new-member' }]);
      vi.mocked(
        externalAdapter.buildSpaceCommunityNewMemberPayload
      ).mockResolvedValue({} as any);

      await adapter.userSpaceCommunityJoined(
        {
          triggeredBy: 'new-member',
          actorID: 'new-member',
          actorType: 'USER',
        } as any,
        { id: 'space-1' } as any
      );

      expect(externalAdapter.sendExternalNotifications).toHaveBeenCalled();
      expect(inAppAdapter.sendInAppNotifications).toHaveBeenCalled();
    });
  });

  describe('userSpaceCommunityApplicationDeclined', () => {
    it('should send notifications when recipients exist', async () => {
      mockRecipients([{ id: 'user-1' }], [{ id: 'user-1' }]);
      vi.mocked(
        externalAdapter.buildUserSpaceCommunityApplicationDeclinedPayload
      ).mockResolvedValue({} as any);

      await adapter.userSpaceCommunityApplicationDeclined(
        {
          triggeredBy: 'admin-1',
          userID: 'user-1',
          spaceID: 'space-1',
        } as any,
        { id: 'space-1' } as any
      );

      expect(externalAdapter.sendExternalNotifications).toHaveBeenCalled();
      expect(inAppAdapter.sendInAppNotifications).toHaveBeenCalled();
    });

    it('should skip email when no email recipients', async () => {
      mockRecipients([], []);

      await adapter.userSpaceCommunityApplicationDeclined(
        {
          triggeredBy: 'admin-1',
          userID: 'user-1',
          spaceID: 'space-1',
        } as any,
        { id: 'space-1' } as any
      );

      expect(
        externalAdapter.buildUserSpaceCommunityApplicationDeclinedPayload
      ).not.toHaveBeenCalled();
    });
  });
});

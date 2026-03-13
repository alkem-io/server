import { NotificationEvent } from '@common/enums/notification.event';
import { Test, TestingModule } from '@nestjs/testing';
import { CommunityResolverService } from '@services/infrastructure/entity-resolver/community.resolver.service';
import { UrlGeneratorService } from '@services/infrastructure/url-generator/url.generator.service';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { vi } from 'vitest';
import { NotificationExternalAdapter } from '../notification-external-adapter/notification.external.adapter';
import { NotificationInAppAdapter } from '../notification-in-app-adapter/notification.in.app.adapter';
import { NotificationAdapter } from './notification.adapter';
import { NotificationPlatformAdapter } from './notification.platform.adapter';

describe('NotificationPlatformAdapter', () => {
  let adapter: NotificationPlatformAdapter;
  let notificationAdapter: NotificationAdapter;
  let externalAdapter: NotificationExternalAdapter;
  let inAppAdapter: NotificationInAppAdapter;
  let communityResolverService: CommunityResolverService;
  let urlGeneratorService: UrlGeneratorService;

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
      providers: [NotificationPlatformAdapter],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    adapter = module.get<NotificationPlatformAdapter>(
      NotificationPlatformAdapter
    );
    notificationAdapter = module.get<NotificationAdapter>(NotificationAdapter);
    externalAdapter = module.get<NotificationExternalAdapter>(
      NotificationExternalAdapter
    );
    inAppAdapter = module.get<NotificationInAppAdapter>(
      NotificationInAppAdapter
    );
    communityResolverService = module.get<CommunityResolverService>(
      CommunityResolverService
    );
    urlGeneratorService = module.get<UrlGeneratorService>(UrlGeneratorService);
  });

  it('should be defined', () => {
    expect(adapter).toBeDefined();
  });

  describe('platformGlobalRoleChanged', () => {
    it('should send external and in-app notifications', async () => {
      mockRecipients([{ id: 'admin-1' }], [{ id: 'admin-1' }]);
      vi.mocked(
        externalAdapter.buildPlatformGlobalRoleChangedNotificationPayload
      ).mockResolvedValue({} as any);

      await adapter.platformGlobalRoleChanged({
        triggeredBy: 'user-1',
        userID: 'user-2',
        type: 'ASSIGN' as any,
        role: 'GLOBAL_ADMIN',
      } as any);

      expect(externalAdapter.sendExternalNotifications).toHaveBeenCalled();
      expect(inAppAdapter.sendInAppNotifications).toHaveBeenCalledWith(
        NotificationEvent.PLATFORM_ADMIN_GLOBAL_ROLE_CHANGED,
        expect.any(String),
        'user-1',
        ['admin-1'],
        expect.any(Object)
      );
    });

    it('should skip in-app when no in-app recipients', async () => {
      mockRecipients([{ id: 'admin-1' }], []);
      vi.mocked(
        externalAdapter.buildPlatformGlobalRoleChangedNotificationPayload
      ).mockResolvedValue({} as any);

      await adapter.platformGlobalRoleChanged({
        triggeredBy: 'user-1',
        userID: 'user-2',
        type: 'ASSIGN' as any,
        role: 'GLOBAL_ADMIN',
      } as any);

      expect(inAppAdapter.sendInAppNotifications).not.toHaveBeenCalled();
    });
  });

  describe('platformForumDiscussionComment', () => {
    it('should filter out the commenter from email recipients', async () => {
      mockRecipients(
        [{ id: 'user-1' }, { id: 'user-2' }, { id: 'user-3' }],
        [{ id: 'user-1' }, { id: 'user-2' }, { id: 'user-3' }]
      );
      vi.mocked(
        externalAdapter.buildPlatformForumCommentCreatedOnDiscussionPayload
      ).mockResolvedValue({} as any);
      vi.mocked(
        urlGeneratorService.getForumDiscussionUrlPath
      ).mockResolvedValue('/discussion/123');

      await adapter.platformForumDiscussionComment({
        triggeredBy: 'user-1',
        userID: 'user-1',
        discussion: {
          id: 'disc-1',
          profile: { displayName: 'Test', description: 'desc' },
          category: 'GENERAL',
          comments: { id: 'room-1' },
        },
        commentSent: { id: 'msg-1', message: 'A comment' },
      } as any);

      // Should exclude user-1 (the commenter) from email
      expect(
        externalAdapter.buildPlatformForumCommentCreatedOnDiscussionPayload
      ).toHaveBeenCalledWith(
        expect.any(String),
        'user-1',
        expect.arrayContaining([
          expect.objectContaining({ id: 'user-2' }),
          expect.objectContaining({ id: 'user-3' }),
        ]),
        expect.any(Object),
        expect.any(Object)
      );
    });

    it('should skip email when no recipients after filtering', async () => {
      mockRecipients([{ id: 'user-1' }], [{ id: 'user-1' }]);
      vi.mocked(
        urlGeneratorService.getForumDiscussionUrlPath
      ).mockResolvedValue('/discussion/123');

      await adapter.platformForumDiscussionComment({
        triggeredBy: 'user-1',
        userID: 'user-1',
        discussion: {
          id: 'disc-1',
          profile: { displayName: 'Test', description: 'desc' },
          category: 'GENERAL',
          comments: { id: 'room-1' },
        },
        commentSent: { id: 'msg-1', message: 'A comment' },
      } as any);

      expect(
        externalAdapter.buildPlatformForumCommentCreatedOnDiscussionPayload
      ).not.toHaveBeenCalled();
    });
  });

  describe('platformInvitationCreated', () => {
    it('should build and send external invitation notification', async () => {
      vi.mocked(
        communityResolverService.getSpaceForCommunityOrFail
      ).mockResolvedValue({ id: 'space-1' } as any);
      vi.mocked(
        externalAdapter.buildSpaceCommunityExternalInvitationCreatedNotificationPayload
      ).mockResolvedValue({} as any);

      await adapter.platformInvitationCreated({
        triggeredBy: 'user-1',
        community: { id: 'community-1' },
        invitedUserEmail: 'test@example.com',
        welcomeMessage: 'Welcome!',
      } as any);

      expect(
        externalAdapter.buildSpaceCommunityExternalInvitationCreatedNotificationPayload
      ).toHaveBeenCalledWith(
        NotificationEvent.SPACE_COMMUNITY_INVITATION_USER_PLATFORM,
        'user-1',
        'test@example.com',
        { id: 'space-1' },
        'Welcome!'
      );
      expect(externalAdapter.sendExternalNotifications).toHaveBeenCalled();
    });
  });

  describe('platformSpaceCreated', () => {
    it('should send external and in-app notifications', async () => {
      mockRecipients([{ id: 'admin-1' }], [{ id: 'admin-1' }]);
      vi.mocked(
        externalAdapter.buildPlatformSpaceCreatedPayload
      ).mockResolvedValue({} as any);

      await adapter.platformSpaceCreated({
        triggeredBy: 'user-1',
        space: { id: 'space-1' },
      } as any);

      expect(externalAdapter.sendExternalNotifications).toHaveBeenCalled();
      expect(inAppAdapter.sendInAppNotifications).toHaveBeenCalled();
    });
  });

  describe('platformUserProfileCreated', () => {
    it('should send admin notifications', async () => {
      mockRecipients([{ id: 'admin-1' }], [{ id: 'admin-1' }]);
      vi.mocked(
        externalAdapter.buildPlatformUserRegisteredNotificationPayload
      ).mockResolvedValue({} as any);

      await adapter.platformUserProfileCreated({
        triggeredBy: 'user-new',
        userID: 'user-new',
      } as any);

      expect(externalAdapter.sendExternalNotifications).toHaveBeenCalled();
      expect(inAppAdapter.sendInAppNotifications).toHaveBeenCalled();
    });
  });

  describe('platformUserRemoved', () => {
    it('should send external and in-app notifications', async () => {
      mockRecipients([{ id: 'admin-1' }], [{ id: 'admin-1' }]);
      vi.mocked(
        externalAdapter.buildPlatformUserRemovedNotificationPayload
      ).mockResolvedValue({} as any);

      await adapter.platformUserRemoved({
        triggeredBy: 'admin-1',
        user: {
          profile: { displayName: 'Test User' },
          email: 'test@example.com',
        },
      } as any);

      expect(externalAdapter.sendExternalNotifications).toHaveBeenCalled();
      expect(inAppAdapter.sendInAppNotifications).toHaveBeenCalled();
    });

    it('should skip in-app when no in-app recipients', async () => {
      mockRecipients([{ id: 'admin-1' }], []);
      vi.mocked(
        externalAdapter.buildPlatformUserRemovedNotificationPayload
      ).mockResolvedValue({} as any);

      await adapter.platformUserRemoved({
        triggeredBy: 'admin-1',
        user: {
          profile: { displayName: 'Test User' },
          email: 'test@example.com',
        },
      } as any);

      expect(inAppAdapter.sendInAppNotifications).not.toHaveBeenCalled();
    });
  });

  describe('platformForumDiscussionCreated', () => {
    it('should send external and in-app notifications', async () => {
      mockRecipients([{ id: 'user-2' }], [{ id: 'user-2' }]);
      vi.mocked(
        externalAdapter.buildPlatformForumDiscussionCreatedNotificationPayload
      ).mockResolvedValue({} as any);
      vi.mocked(
        urlGeneratorService.getForumDiscussionUrlPath
      ).mockResolvedValue('/discussion/123');

      await adapter.platformForumDiscussionCreated({
        triggeredBy: 'user-1',
        discussion: {
          id: 'disc-1',
          profile: { displayName: 'Test', description: 'desc' },
          category: 'GENERAL',
          comments: { id: 'room-1' },
        },
      } as any);

      expect(externalAdapter.sendExternalNotifications).toHaveBeenCalled();
      expect(inAppAdapter.sendInAppNotifications).toHaveBeenCalled();
    });
  });
});

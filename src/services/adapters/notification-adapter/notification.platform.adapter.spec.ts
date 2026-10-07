import { RoleChangeType } from '@alkemio/notifications-lib';
import { NotificationEvent } from '@common/enums/notification.event';
import { UserLookupService } from '@domain/community/user-lookup/user.lookup.service';
import { Test, TestingModule } from '@nestjs/testing';
import { CommunityResolverService } from '@services/infrastructure/entity-resolver/community.resolver.service';
import { UrlGeneratorService } from '@services/infrastructure/url-generator/url.generator.service';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { vi } from 'vitest';
import { NotificationExternalAdapter } from '../notification-external-adapter/notification.external.adapter';
import { NotificationInAppAdapter } from '../notification-in-app-adapter/notification.in.app.adapter';
import { NotificationPushAdapter } from '../notification-push-adapter/notification.push.adapter';
import { NotificationAdapter } from './notification.adapter';
import { NotificationPlatformAdapter } from './notification.platform.adapter';

describe('NotificationPlatformAdapter', () => {
  let adapter: NotificationPlatformAdapter;
  let notificationAdapter: NotificationAdapter;
  let externalAdapter: NotificationExternalAdapter;
  let inAppAdapter: NotificationInAppAdapter;
  let pushAdapter: NotificationPushAdapter;
  let userLookupService: UserLookupService;
  let communityResolverService: CommunityResolverService;
  let urlGeneratorService: UrlGeneratorService;

  const mockRecipients = (
    emailRecipients: any[] = [],
    inAppRecipients: any[] = []
  ) => {
    vi.mocked(notificationAdapter.getNotificationRecipients).mockResolvedValue({
      emailRecipients,
      inAppRecipients,
      pushRecipients: [],
    } as any);
  };

  beforeEach(async () => {
    vi.restoreAllMocks();

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
    pushAdapter = module.get<NotificationPushAdapter>(NotificationPushAdapter);
    userLookupService = module.get<UserLookupService>(UserLookupService);
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

    it('065: suppresses the notification entirely for a Feature-family role grant, on every channel', async () => {
      await adapter.platformGlobalRoleChanged({
        triggeredBy: 'user-1',
        userID: 'user-2',
        type: RoleChangeType.ADDED,
        role: 'feature-beta-tester',
      } as any);

      expect(
        notificationAdapter.getNotificationRecipients
      ).not.toHaveBeenCalled();
      expect(externalAdapter.sendExternalNotifications).not.toHaveBeenCalled();
      expect(inAppAdapter.sendInAppNotifications).not.toHaveBeenCalled();
    });

    it('065: still emits for a Platform-family role change', async () => {
      mockRecipients([{ id: 'admin-1' }], [{ id: 'admin-1' }]);
      vi.mocked(
        externalAdapter.buildPlatformGlobalRoleChangedNotificationPayload
      ).mockResolvedValue({} as any);

      await adapter.platformGlobalRoleChanged({
        triggeredBy: 'user-1',
        userID: 'user-2',
        type: RoleChangeType.ADDED,
        role: 'platform-resource-admin',
      } as any);

      expect(notificationAdapter.getNotificationRecipients).toHaveBeenCalled();
      expect(externalAdapter.sendExternalNotifications).toHaveBeenCalled();
    });

    it('065: still emits for a non-Feature slug it does not know (deny-list, not allow-list)', async () => {
      mockRecipients([{ id: 'admin-1' }], [{ id: 'admin-1' }]);
      vi.mocked(
        externalAdapter.buildPlatformGlobalRoleChangedNotificationPayload
      ).mockResolvedValue({} as any);

      await adapter.platformGlobalRoleChanged({
        triggeredBy: 'user-1',
        userID: 'user-2',
        type: RoleChangeType.ADDED,
        role: 'platform-role-added-later',
      } as any);

      expect(notificationAdapter.getNotificationRecipients).toHaveBeenCalled();
      expect(externalAdapter.sendExternalNotifications).toHaveBeenCalled();
    });

    it('065: sets changeType on the in-app payload from the event type', async () => {
      mockRecipients([{ id: 'admin-1' }], [{ id: 'admin-1' }]);
      vi.mocked(
        externalAdapter.buildPlatformGlobalRoleChangedNotificationPayload
      ).mockResolvedValue({} as any);

      await adapter.platformGlobalRoleChanged({
        triggeredBy: 'user-1',
        userID: 'user-2',
        type: RoleChangeType.REMOVED,
        role: 'platform-resource-admin',
      } as any);

      const inAppPayload = vi.mocked(inAppAdapter.sendInAppNotifications).mock
        .calls[0][4];
      expect(inAppPayload).toMatchObject({
        changeType: RoleChangeType.REMOVED,
      });
    });

    it('065: renders the push body with the human-readable role label, verbatim slug never leaking', async () => {
      vi.mocked(
        notificationAdapter.getNotificationRecipients
      ).mockResolvedValue({
        emailRecipients: [],
        inAppRecipients: [],
        pushRecipients: [{ id: 'admin-1' }],
      } as any);
      vi.mocked(
        externalAdapter.buildPlatformGlobalRoleChangedNotificationPayload
      ).mockResolvedValue({} as any);
      vi.mocked(userLookupService.getUserByIdOrFail).mockResolvedValue({
        profile: { displayName: 'Someone' },
      } as any);

      await adapter.platformGlobalRoleChanged({
        triggeredBy: 'user-1',
        userID: 'user-2',
        type: RoleChangeType.REMOVED,
        role: 'platform-resource-admin',
      } as any);

      const pushCall = vi.mocked(pushAdapter.sendPushNotifications).mock
        .calls[0];
      expect(pushCall[2].body).toContain('Platform Resource Admin');
      expect(pushCall[2].body).not.toContain('platform-resource-admin');
    });

    it('065: passes the resolved push list through unfiltered — resolution owns actor exclusion', async () => {
      const pushRecipients = [{ id: 'user-1' }, { id: 'admin-1' }];
      vi.mocked(
        notificationAdapter.getNotificationRecipients
      ).mockResolvedValue({
        emailRecipients: [],
        inAppRecipients: [],
        pushRecipients,
      } as any);
      vi.mocked(
        externalAdapter.buildPlatformGlobalRoleChangedNotificationPayload
      ).mockResolvedValue({} as any);
      vi.mocked(userLookupService.getUserByIdOrFail).mockResolvedValue({
        profile: { displayName: 'Someone' },
      } as any);

      await adapter.platformGlobalRoleChanged({
        triggeredBy: 'user-1',
        userID: 'user-2',
        type: RoleChangeType.ADDED,
        role: 'platform-resource-admin',
      } as any);

      expect(
        vi.mocked(pushAdapter.sendPushNotifications).mock.calls[0][0]
      ).toEqual(pushRecipients);
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
    it('065: passes the resolved push list through unfiltered — resolution owns actor exclusion', async () => {
      const pushRecipients = [{ id: 'admin-1' }, { id: 'admin-2' }];
      vi.mocked(
        notificationAdapter.getNotificationRecipients
      ).mockResolvedValue({
        emailRecipients: [],
        inAppRecipients: [],
        pushRecipients,
      } as any);
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

      expect(
        vi.mocked(pushAdapter.sendPushNotifications).mock.calls[0][0]
      ).toEqual(pushRecipients);
    });

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

    it('never carries the departed user displayName/email in the in-app payload', async () => {
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

      const inAppPayload = vi.mocked(inAppAdapter.sendInAppNotifications).mock
        .calls[0][4];
      expect(inAppPayload).not.toHaveProperty('userDisplayName');
      expect(inAppPayload).not.toHaveProperty('userEmail');
    });

    it('forwards a pre-resolved triggeredByPayload (self-deletion) to the external adapter', async () => {
      mockRecipients([{ id: 'admin-1' }], [{ id: 'admin-1' }]);
      vi.mocked(
        externalAdapter.buildPlatformUserRemovedNotificationPayload
      ).mockResolvedValue({} as any);
      const triggeredByPayload = { id: 'self-1' } as any;

      await adapter.platformUserRemoved({
        triggeredBy: 'self-1',
        user: {
          id: 'self-1',
          profile: { displayName: 'Departed User' },
          email: 'departed@example.com',
        },
        triggeredByPayload,
      } as any);

      expect(
        externalAdapter.buildPlatformUserRemovedNotificationPayload
      ).toHaveBeenCalledWith(
        expect.anything(),
        'self-1',
        expect.anything(),
        expect.anything(),
        triggeredByPayload
      );
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

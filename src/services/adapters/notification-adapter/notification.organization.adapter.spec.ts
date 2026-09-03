import { NotificationEvent } from '@common/enums/notification.event';
import { RoleSetService } from '@domain/access/role-set/role.set.service';
import { ActorLookupService } from '@domain/actor/actor-lookup/actor.lookup.service';
import { MessageDetailsService } from '@domain/communication/message.details/message.details.service';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { CommunityResolverService } from '@services/infrastructure/entity-resolver/community.resolver.service';
import { UrlGeneratorService } from '@services/infrastructure/url-generator/url.generator.service';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { vi } from 'vitest';
import { NotificationExternalAdapter } from '../notification-external-adapter/notification.external.adapter';
import { NotificationInAppAdapter } from '../notification-in-app-adapter/notification.in.app.adapter';
import { NotificationPushAdapter } from '../notification-push-adapter/notification.push.adapter';
import { NotificationAdapter } from './notification.adapter';
import { NotificationOrganizationAdapter } from './notification.organization.adapter';

describe('NotificationOrganizationAdapter', () => {
  let adapter: NotificationOrganizationAdapter;
  let notificationAdapter: NotificationAdapter;
  let externalAdapter: NotificationExternalAdapter;
  let inAppAdapter: NotificationInAppAdapter;
  let pushAdapter: NotificationPushAdapter;
  let messageDetailsService: MessageDetailsService;
  let communityResolverService: CommunityResolverService;
  let roleSetService: RoleSetService;
  let actorLookupService: ActorLookupService;
  let urlGeneratorService: UrlGeneratorService;
  let configService: ConfigService;

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
    pushAdapter = module.get<NotificationPushAdapter>(NotificationPushAdapter);
    messageDetailsService = module.get<MessageDetailsService>(
      MessageDetailsService
    );
    communityResolverService = module.get<CommunityResolverService>(
      CommunityResolverService
    );
    roleSetService = module.get<RoleSetService>(RoleSetService);
    actorLookupService = module.get<ActorLookupService>(ActorLookupService);
    urlGeneratorService = module.get<UrlGeneratorService>(UrlGeneratorService);
    configService = module.get<ConfigService>(ConfigService);
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
        pushRecipients: [],
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
        pushRecipients: [],
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
        pushRecipients: [],
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
        pushRecipients: [],
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
        pushRecipients: [],
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
        pushRecipients: [],
      } as any);

      await adapter.organizationSendMessage(eventData);

      expect(
        externalAdapter.buildOrganizationMessageNotificationPayload
      ).not.toHaveBeenCalled();
    });
  });

  describe('organizationSpaceCommunityInvitationCreated', () => {
    const baseEventData = {
      triggeredBy: 'inviter-1',
      community: { id: 'community-1' } as any,
      invitationID: 'inv-1',
      invitedContributorID: 'org-1',
      welcomeMessage: 'Welcome!',
      extraRoles: [],
      invitedToParent: false,
      organizationHasNoAdministrators: false,
    };

    const setUpCommonMocks = () => {
      vi.mocked(
        communityResolverService.getSpaceForCommunityOrFail
      ).mockResolvedValue({
        id: 'space-1',
        about: { profile: { displayName: 'My Space' } },
      } as any);
      vi.mocked(
        communityResolverService.getRoleSetIdForSpace
      ).mockResolvedValue('rs-1');
      vi.mocked(roleSetService.getSpacesToJoinOnAccept).mockResolvedValue([
        { id: 'space-1', about: { profile: { displayName: 'My Space' } } },
      ] as any);
    };

    it('zero-admin escalation: sends exactly one external notification with recipientEmail and empty recipients, no in-app, no push', async () => {
      setUpCommonMocks();
      vi.mocked(configService.get).mockReturnValue('support@alkem.io');
      vi.mocked(
        externalAdapter.buildOrganizationSpaceCommunityInvitationPayload
      ).mockResolvedValue({ recipientEmail: 'support@alkem.io' } as any);

      await adapter.organizationSpaceCommunityInvitationCreated({
        ...baseEventData,
        organizationHasNoAdministrators: true,
      } as any);

      expect(
        externalAdapter.buildOrganizationSpaceCommunityInvitationPayload
      ).toHaveBeenCalledWith(
        NotificationEvent.ORGANIZATION_ADMIN_SPACE_COMMUNITY_INVITATION,
        'inviter-1',
        [],
        'org-1',
        expect.objectContaining({ id: 'space-1' }),
        expect.any(Array),
        [],
        'Welcome!',
        'support@alkem.io'
      );
      expect(externalAdapter.sendExternalNotifications).toHaveBeenCalledTimes(
        1
      );
      expect(
        notificationAdapter.getNotificationRecipients
      ).not.toHaveBeenCalled();
      expect(inAppAdapter.sendInAppNotifications).not.toHaveBeenCalled();
      expect(pushAdapter.sendPushNotifications).not.toHaveBeenCalled();
    });

    it('normal path: sends email, in-app and push to the resolved recipients', async () => {
      setUpCommonMocks();
      vi.mocked(
        notificationAdapter.getNotificationRecipients
      ).mockResolvedValue({
        emailRecipients: [{ id: 'admin-1' }],
        inAppRecipients: [{ id: 'admin-1' }],
        pushRecipients: [{ id: 'admin-1' }],
      } as any);
      vi.mocked(
        externalAdapter.buildOrganizationSpaceCommunityInvitationPayload
      ).mockResolvedValue({} as any);
      vi.mocked(actorLookupService.getFullActorByIdOrFail).mockResolvedValue({
        id: 'org-1',
        nameID: 'acme',
        profile: { displayName: 'Acme' },
      } as any);
      vi.mocked(
        urlGeneratorService.getOrganizationSettingsInvitationsUrlPath
      ).mockReturnValue('/organization/acme/settings/invitations');

      await adapter.organizationSpaceCommunityInvitationCreated(
        baseEventData as any
      );

      expect(
        notificationAdapter.getNotificationRecipients
      ).toHaveBeenCalledWith(
        NotificationEvent.ORGANIZATION_ADMIN_SPACE_COMMUNITY_INVITATION,
        baseEventData,
        undefined,
        undefined,
        'org-1'
      );
      expect(externalAdapter.sendExternalNotifications).toHaveBeenCalled();
      expect(inAppAdapter.sendInAppNotifications).toHaveBeenCalledWith(
        NotificationEvent.ORGANIZATION_ADMIN_SPACE_COMMUNITY_INVITATION,
        expect.anything(),
        'inviter-1',
        ['admin-1'],
        expect.objectContaining({
          spaceID: 'space-1',
          invitationID: 'inv-1',
          organizationID: 'org-1',
        })
      );
      expect(pushAdapter.sendPushNotifications).toHaveBeenCalledWith(
        [{ id: 'admin-1' }],
        NotificationEvent.ORGANIZATION_ADMIN_SPACE_COMMUNITY_INVITATION,
        expect.objectContaining({
          url: '/organization/acme/settings/invitations',
        })
      );
      // Push title/body never carry the welcome message text.
      const pushCall = vi.mocked(pushAdapter.sendPushNotifications).mock
        .calls[0];
      expect(pushCall[2].title).not.toContain('Welcome!');
      expect(pushCall[2].body).not.toContain('Welcome!');
    });

    it('skips email when there are no email recipients', async () => {
      setUpCommonMocks();
      vi.mocked(
        notificationAdapter.getNotificationRecipients
      ).mockResolvedValue({
        emailRecipients: [],
        inAppRecipients: [],
        pushRecipients: [],
      } as any);

      await adapter.organizationSpaceCommunityInvitationCreated(
        baseEventData as any
      );

      expect(
        externalAdapter.buildOrganizationSpaceCommunityInvitationPayload
      ).not.toHaveBeenCalled();
      expect(externalAdapter.sendExternalNotifications).not.toHaveBeenCalled();
    });
  });
});

import { NotificationEvent } from '@common/enums/notification.event';
import { Test, TestingModule } from '@nestjs/testing';
import { CommunityResolverService } from '@services/infrastructure/entity-resolver/community.resolver.service';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { vi } from 'vitest';
import { NotificationExternalAdapter } from '../notification-external-adapter/notification.external.adapter';
import { NotificationInAppAdapter } from '../notification-in-app-adapter/notification.in.app.adapter';
import { NotificationAdapter } from './notification.adapter';
import { NotificationVirtualContributorAdapter } from './notification.virtual.contributor.adapter';

describe('NotificationVirtualContributorAdapter', () => {
  let adapter: NotificationVirtualContributorAdapter;
  let notificationAdapter: NotificationAdapter;
  let externalAdapter: NotificationExternalAdapter;
  let inAppAdapter: NotificationInAppAdapter;
  let communityResolverService: CommunityResolverService;

  beforeEach(async () => {
    vi.restoreAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [NotificationVirtualContributorAdapter],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    adapter = module.get<NotificationVirtualContributorAdapter>(
      NotificationVirtualContributorAdapter
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
  });

  it('should be defined', () => {
    expect(adapter).toBeDefined();
  });

  describe('spaceCommunityInvitationVirtualContributorCreated', () => {
    it('should send external and in-app notifications', async () => {
      vi.mocked(
        communityResolverService.getSpaceForCommunityOrFail
      ).mockResolvedValue({ id: 'space-1' } as any);
      vi.mocked(
        notificationAdapter.getNotificationRecipients
      ).mockResolvedValue({
        emailRecipients: [{ id: 'admin-1' }],
        inAppRecipients: [{ id: 'admin-1' }],
        pushRecipients: [],
      } as any);
      vi.mocked(
        externalAdapter.buildSpaceCommunityInvitationVirtualContributorCreatedNotificationPayload
      ).mockResolvedValue({} as any);

      await adapter.spaceCommunityInvitationVirtualContributorCreated({
        triggeredBy: 'user-1',
        community: { id: 'community-1' },
        invitedContributorID: 'vc-1',
        accountHost: { id: 'host-1' },
        welcomeMessage: 'Welcome!',
      } as any);

      expect(externalAdapter.sendExternalNotifications).toHaveBeenCalled();
      expect(inAppAdapter.sendInAppNotifications).toHaveBeenCalledWith(
        NotificationEvent.VIRTUAL_ADMIN_SPACE_COMMUNITY_INVITATION,
        expect.any(String),
        'user-1',
        ['admin-1'],
        expect.any(Object)
      );
    });

    it('should pass virtualContributorID to getNotificationRecipients', async () => {
      vi.mocked(
        communityResolverService.getSpaceForCommunityOrFail
      ).mockResolvedValue({ id: 'space-1' } as any);
      vi.mocked(
        notificationAdapter.getNotificationRecipients
      ).mockResolvedValue({
        emailRecipients: [],
        inAppRecipients: [],
        pushRecipients: [],
      } as any);
      vi.mocked(
        externalAdapter.buildSpaceCommunityInvitationVirtualContributorCreatedNotificationPayload
      ).mockResolvedValue({} as any);

      await adapter.spaceCommunityInvitationVirtualContributorCreated({
        triggeredBy: 'user-1',
        community: { id: 'community-1' },
        invitedContributorID: 'vc-1',
        accountHost: { id: 'host-1' },
      } as any);

      expect(
        notificationAdapter.getNotificationRecipients
      ).toHaveBeenCalledWith(
        NotificationEvent.VIRTUAL_ADMIN_SPACE_COMMUNITY_INVITATION,
        expect.any(Object),
        undefined,
        undefined,
        undefined,
        'vc-1'
      );
    });

    it('should skip in-app when no in-app recipients', async () => {
      vi.mocked(
        communityResolverService.getSpaceForCommunityOrFail
      ).mockResolvedValue({ id: 'space-1' } as any);
      vi.mocked(
        notificationAdapter.getNotificationRecipients
      ).mockResolvedValue({
        emailRecipients: [{ id: 'admin-1' }],
        inAppRecipients: [],
        pushRecipients: [],
      } as any);
      vi.mocked(
        externalAdapter.buildSpaceCommunityInvitationVirtualContributorCreatedNotificationPayload
      ).mockResolvedValue({} as any);

      await adapter.spaceCommunityInvitationVirtualContributorCreated({
        triggeredBy: 'user-1',
        community: { id: 'community-1' },
        invitedContributorID: 'vc-1',
        accountHost: { id: 'host-1' },
      } as any);

      expect(inAppAdapter.sendInAppNotifications).not.toHaveBeenCalled();
    });
  });
});

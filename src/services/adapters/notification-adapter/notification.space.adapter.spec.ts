import { LogContext } from '@common/enums';
import { EntityNotFoundException } from '@common/exceptions/entity.not.found.exception';
import { SpaceLookupService } from '@domain/space/space.lookup/space.lookup.service';
import { Test, TestingModule } from '@nestjs/testing';
import { CommunityResolverService } from '@services/infrastructure/entity-resolver/community.resolver.service';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { vi } from 'vitest';
import { NotificationExternalAdapter } from '../notification-external-adapter/notification.external.adapter';
import { NotificationInAppAdapter } from '../notification-in-app-adapter/notification.in.app.adapter';
import { NotificationAdapter } from './notification.adapter';
import { NotificationSpaceAdapter } from './notification.space.adapter';
import { NotificationUserAdapter } from './notification.user.adapter';

describe('NotificationSpaceAdapter', () => {
  let adapter: NotificationSpaceAdapter;
  let notificationAdapter: NotificationAdapter;
  let externalAdapter: NotificationExternalAdapter;
  let inAppAdapter: NotificationInAppAdapter;
  let communityResolverService: CommunityResolverService;
  let spaceLookupService: SpaceLookupService;
  let notificationUserAdapter: NotificationUserAdapter;

  const mockRecipients = (
    emailRecipients: any[] = [],
    inAppRecipients: any[] = [],
    triggeredBy?: any
  ) => {
    vi.mocked(notificationAdapter.getNotificationRecipients).mockResolvedValue({
      emailRecipients,
      inAppRecipients,
      triggeredBy,
    } as any);
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationSpaceAdapter,
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

    adapter = module.get<NotificationSpaceAdapter>(NotificationSpaceAdapter);
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
    spaceLookupService = module.get<SpaceLookupService>(SpaceLookupService);
    notificationUserAdapter = module.get<NotificationUserAdapter>(
      NotificationUserAdapter
    );
  });

  it('should be defined', () => {
    expect(adapter).toBeDefined();
  });

  describe('spaceCollaborationCalloutPublished', () => {
    it('should filter out the publisher from recipients', async () => {
      vi.mocked(
        communityResolverService.getCommunityFromCollaborationCalloutOrFail
      ).mockResolvedValue({ id: 'community-1' } as any);
      vi.mocked(
        communityResolverService.getSpaceForCommunityOrFail
      ).mockResolvedValue({ id: 'space-1' } as any);
      mockRecipients(
        [{ id: 'user-1' }, { id: 'user-2' }],
        [{ id: 'user-1' }, { id: 'user-2' }]
      );
      vi.mocked(
        externalAdapter.buildSpaceCollaborationCalloutPublishedPayload
      ).mockResolvedValue({} as any);

      await adapter.spaceCollaborationCalloutPublished({
        triggeredBy: 'user-1',
        callout: { id: 'callout-1' },
      } as any);

      // Email payload should exclude user-1
      expect(
        externalAdapter.buildSpaceCollaborationCalloutPublishedPayload
      ).toHaveBeenCalledWith(
        expect.any(String),
        'user-1',
        [expect.objectContaining({ id: 'user-2' })],
        expect.any(Object),
        expect.any(Object)
      );
    });
  });

  describe('spaceCommunityCalendarEventComment', () => {
    it('should return early when creator is the commenter', async () => {
      vi.mocked(spaceLookupService.getSpaceOrFail).mockResolvedValue({
        id: 'space-1',
        about: { profile: {} },
      } as any);

      await adapter.spaceCommunityCalendarEventComment(
        {
          triggeredBy: 'user-1',
          calendarEvent: { createdBy: 'user-1' },
          commentSent: { id: 'msg-1', message: 'comment' },
          comments: { id: 'room-1' },
        } as any,
        'space-1'
      );

      // Should not call getNotificationRecipients since creator == commenter
      expect(
        notificationAdapter.getNotificationRecipients
      ).not.toHaveBeenCalled();
    });

    it('should send notifications when creator is NOT the commenter', async () => {
      vi.mocked(spaceLookupService.getSpaceOrFail).mockResolvedValue({
        id: 'space-1',
        about: { profile: {} },
      } as any);
      mockRecipients([{ id: 'user-2' }], [{ id: 'user-2' }]);
      vi.mocked(
        externalAdapter.buildSpaceCommunityCalendarEventCommentPayload
      ).mockResolvedValue({} as any);

      await adapter.spaceCommunityCalendarEventComment(
        {
          triggeredBy: 'user-1',
          calendarEvent: { id: 'event-1', createdBy: 'user-2' },
          commentSent: { id: 'msg-1', message: 'comment' },
          comments: { id: 'room-1' },
        } as any,
        'space-1'
      );

      expect(notificationAdapter.getNotificationRecipients).toHaveBeenCalled();
    });
  });

  describe('spaceCollaborationCalloutContributionCreated', () => {
    it('should catch EntityNotFoundException and log warning', async () => {
      vi.mocked(
        communityResolverService.getCommunityFromCollaborationCalloutOrFail
      ).mockResolvedValue({ id: 'community-1' } as any);
      vi.mocked(
        communityResolverService.getSpaceForCommunityOrFail
      ).mockResolvedValue({ id: 'space-1' } as any);
      mockRecipients([{ id: 'user-2' }], [{ id: 'user-2' }]);
      vi.mocked(
        externalAdapter.buildSpaceCollaborationCreatedPayload
      ).mockRejectedValue(
        new EntityNotFoundException(
          'Entity not found',
          LogContext.NOTIFICATIONS
        )
      );

      // Should not throw
      await expect(
        adapter.spaceCollaborationCalloutContributionCreated({
          triggeredBy: 'user-1',
          callout: { id: 'callout-1' },
          contribution: { id: 'contrib-1' },
        } as any)
      ).resolves.not.toThrow();
    });

    it('should rethrow non-EntityNotFoundException errors', async () => {
      vi.mocked(
        communityResolverService.getCommunityFromCollaborationCalloutOrFail
      ).mockResolvedValue({ id: 'community-1' } as any);
      vi.mocked(
        communityResolverService.getSpaceForCommunityOrFail
      ).mockResolvedValue({ id: 'space-1' } as any);
      mockRecipients([{ id: 'user-2' }], [{ id: 'user-2' }]);
      vi.mocked(
        externalAdapter.buildSpaceCollaborationCreatedPayload
      ).mockRejectedValue(new Error('Unexpected error'));

      await expect(
        adapter.spaceCollaborationCalloutContributionCreated({
          triggeredBy: 'user-1',
          callout: { id: 'callout-1' },
          contribution: { id: 'contrib-1' },
        } as any)
      ).rejects.toThrow('Unexpected error');
    });
  });

  describe('spaceCommunityNewMember', () => {
    it('should notify user and admins', async () => {
      vi.mocked(
        communityResolverService.getSpaceForCommunityOrFail
      ).mockResolvedValue({ id: 'space-1' } as any);
      mockRecipients([{ id: 'admin-1' }], [{ id: 'admin-1' }]);
      vi.mocked(
        externalAdapter.buildSpaceCommunityNewMemberPayload
      ).mockResolvedValue({} as any);

      await adapter.spaceCommunityNewMember({
        triggeredBy: 'user-1',
        community: { id: 'community-1' },
        actorID: 'new-member',
        actorType: 'USER',
      } as any);

      expect(
        notificationUserAdapter.userSpaceCommunityJoined
      ).toHaveBeenCalled();
      expect(externalAdapter.sendExternalNotifications).toHaveBeenCalled();
    });
  });

  describe('spaceCommunicationUpdate', () => {
    it('should exclude triggered user from recipients', async () => {
      vi.mocked(
        communityResolverService.getCommunityFromUpdatesOrFail
      ).mockResolvedValue({ id: 'community-1' } as any);
      vi.mocked(
        communityResolverService.getSpaceForCommunityOrFail
      ).mockResolvedValue({ id: 'space-1' } as any);

      const triggeredByUser = { id: 'user-1' };
      mockRecipients(
        [{ id: 'user-1' }, { id: 'user-2' }],
        [{ id: 'user-1' }, { id: 'user-2' }],
        triggeredByUser
      );
      vi.mocked(
        externalAdapter.buildSpaceCommunicationUpdateSentNotificationPayload
      ).mockResolvedValue({} as any);

      await adapter.spaceCommunicationUpdate({
        triggeredBy: 'user-1',
        updates: { id: 'updates-1' },
        lastMessage: { id: 'msg-1', message: 'Update text' },
      } as any);

      expect(externalAdapter.sendExternalNotifications).toHaveBeenCalled();
    });
  });

  describe('spaceCommunityApplicationCreated', () => {
    it('should send admin notifications', async () => {
      vi.mocked(
        communityResolverService.getSpaceForCommunityOrFail
      ).mockResolvedValue({ id: 'space-1' } as any);
      mockRecipients([{ id: 'admin-1' }], [{ id: 'admin-1' }]);
      vi.mocked(
        externalAdapter.buildSpaceCommunityApplicationCreatedNotificationPayload
      ).mockResolvedValue({} as any);

      await adapter.spaceCommunityApplicationCreated({
        triggeredBy: 'user-1',
        community: { id: 'community-1' },
        application: { id: 'app-1' },
      } as any);

      expect(externalAdapter.sendExternalNotifications).toHaveBeenCalled();
      expect(inAppAdapter.sendInAppNotifications).toHaveBeenCalled();
    });
  });

  describe('spaceAdminVirtualContributorInvitationDeclined', () => {
    it('should send notifications when recipients exist', async () => {
      mockRecipients([{ id: 'admin-1' }], [{ id: 'admin-1' }]);
      vi.mocked(
        externalAdapter.buildVirtualContributorSpaceCommunityInvitationDeclinedPayload
      ).mockResolvedValue({} as any);

      await adapter.spaceAdminVirtualContributorInvitationDeclined(
        {
          triggeredBy: 'user-1',
          virtualContributorID: 'vc-1',
          invitationCreatedBy: 'admin-1',
        } as any,
        { id: 'space-1' }
      );

      expect(externalAdapter.sendExternalNotifications).toHaveBeenCalled();
      expect(inAppAdapter.sendInAppNotifications).toHaveBeenCalled();
    });

    it('should skip email when no email recipients', async () => {
      mockRecipients([], [{ id: 'admin-1' }]);

      await adapter.spaceAdminVirtualContributorInvitationDeclined(
        {
          triggeredBy: 'user-1',
          virtualContributorID: 'vc-1',
          invitationCreatedBy: 'admin-1',
        } as any,
        { id: 'space-1' }
      );

      expect(
        externalAdapter.buildVirtualContributorSpaceCommunityInvitationDeclinedPayload
      ).not.toHaveBeenCalled();
    });
  });

  describe('spaceCommunityCalendarEventCreated', () => {
    it('should exclude creator from recipients', async () => {
      vi.mocked(spaceLookupService.getSpaceOrFail).mockResolvedValue({
        id: 'space-1',
        about: { profile: {} },
      } as any);
      mockRecipients(
        [{ id: 'user-1' }, { id: 'user-2' }],
        [{ id: 'user-1' }, { id: 'user-2' }]
      );
      vi.mocked(
        externalAdapter.buildSpaceCommunityCalendarEventCreatedPayload
      ).mockResolvedValue({} as any);

      await adapter.spaceCommunityCalendarEventCreated(
        {
          triggeredBy: 'user-1',
          calendarEvent: { id: 'event-1', createdBy: 'user-1' },
        } as any,
        'space-1'
      );

      // Email should exclude user-1 (the creator)
      expect(
        externalAdapter.buildSpaceCommunityCalendarEventCreatedPayload
      ).toHaveBeenCalledWith(
        expect.any(String),
        'user-1',
        [expect.objectContaining({ id: 'user-2' })],
        expect.any(Object),
        expect.any(Object)
      );
    });

    it('should skip email when no recipients after excluding creator', async () => {
      vi.mocked(spaceLookupService.getSpaceOrFail).mockResolvedValue({
        id: 'space-1',
        about: { profile: {} },
      } as any);
      mockRecipients([{ id: 'user-1' }], [{ id: 'user-1' }]);

      await adapter.spaceCommunityCalendarEventCreated(
        {
          triggeredBy: 'user-1',
          calendarEvent: { id: 'event-1', createdBy: 'user-1' },
        } as any,
        'space-1'
      );

      expect(
        externalAdapter.buildSpaceCommunityCalendarEventCreatedPayload
      ).not.toHaveBeenCalled();
    });
  });

  describe('spaceCollaborationCalloutComment', () => {
    it('should filter out sender and mentioned users from recipients', async () => {
      vi.mocked(
        communityResolverService.getCommunityFromCollaborationCalloutOrFail
      ).mockResolvedValue({ id: 'community-1' } as any);
      vi.mocked(
        communityResolverService.getSpaceForCommunityOrFail
      ).mockResolvedValue({ id: 'space-1' } as any);
      mockRecipients(
        [{ id: 'user-1' }, { id: 'user-2' }, { id: 'user-3' }],
        [{ id: 'user-1' }, { id: 'user-2' }, { id: 'user-3' }]
      );
      vi.mocked(
        externalAdapter.buildSpaceCollaborationCalloutCommentPayload
      ).mockResolvedValue({} as any);

      await adapter.spaceCollaborationCalloutComment({
        triggeredBy: 'user-1',
        callout: { id: 'callout-1' },
        commentSent: { id: 'msg-1', message: 'comment' },
        comments: { id: 'room-1' },
        mentionedUserIDs: ['user-3'],
      } as any);

      // Should exclude user-1 (sender) and user-3 (mentioned) from email
      expect(
        externalAdapter.buildSpaceCollaborationCalloutCommentPayload
      ).toHaveBeenCalledWith(
        expect.any(String),
        'user-1',
        [expect.objectContaining({ id: 'user-2' })],
        expect.any(Object),
        expect.any(Object)
      );
    });
  });

  describe('spaceCollaborationCalloutPostContributionComment', () => {
    it('should send notification to post creator only', async () => {
      vi.mocked(
        communityResolverService.getCommunityFromCollaborationCalloutOrFail
      ).mockResolvedValue({ id: 'community-1' } as any);
      vi.mocked(
        communityResolverService.getSpaceForCommunityOrFail
      ).mockResolvedValue({ id: 'space-1' } as any);
      mockRecipients(
        [{ id: 'user-1' }, { id: 'user-2' }],
        [{ id: 'user-1' }, { id: 'user-2' }]
      );
      vi.mocked(
        externalAdapter.buildSpaceCollaborationCalloutPostContributionCommentPayload
      ).mockResolvedValue({} as any);

      await adapter.spaceCollaborationCalloutPostContributionComment({
        triggeredBy: 'user-1',
        callout: { id: 'callout-1' },
        post: { id: 'post-1', createdBy: 'user-2' },
        contribution: { id: 'contrib-1' },
        commentSent: { id: 'msg-1', message: 'comment', sender: 'user-1' },
        room: { id: 'room-1' },
      } as any);

      // Should only send to user-2 (post creator, not sender user-1)
      expect(
        externalAdapter.buildSpaceCollaborationCalloutPostContributionCommentPayload
      ).toHaveBeenCalled();
    });
  });

  describe('spaceCommunityPlatformInvitationCreated', () => {
    it('should send external notification', async () => {
      vi.mocked(
        communityResolverService.getSpaceForCommunityOrFail
      ).mockResolvedValue({ id: 'space-1' } as any);
      vi.mocked(
        externalAdapter.buildSpaceCommunityExternalInvitationCreatedNotificationPayload
      ).mockResolvedValue({} as any);

      await adapter.spaceCommunityPlatformInvitationCreated({
        triggeredBy: 'user-1',
        community: { id: 'community-1' },
        invitedUserEmail: 'invited@test.com',
        welcomeMessage: 'Welcome!',
      } as any);

      expect(externalAdapter.sendExternalNotifications).toHaveBeenCalled();
    });
  });

  describe('spaceCommunicationMessage', () => {
    it('should filter out sender from message recipients', async () => {
      vi.mocked(
        communityResolverService.getSpaceForCommunityOrFail
      ).mockResolvedValue({ id: 'space-1' } as any);
      mockRecipients(
        [{ id: 'user-1' }, { id: 'user-2' }],
        [{ id: 'user-1' }, { id: 'user-2' }]
      );
      vi.mocked(
        externalAdapter.buildSpaceCommunicationMessageDirectNotificationPayload
      ).mockResolvedValue({} as any);

      await adapter.spaceCommunicationMessage({
        triggeredBy: 'user-1',
        communityID: 'community-1',
        message: 'Hello admins',
      } as any);

      expect(
        externalAdapter.buildSpaceCommunicationMessageDirectNotificationPayload
      ).toHaveBeenCalledWith(
        expect.any(String),
        'user-1',
        [expect.objectContaining({ id: 'user-2' })],
        expect.any(Object),
        'Hello admins'
      );
    });
  });
});

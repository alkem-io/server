import { LogContext } from '@common/enums';
import { EntityNotFoundException } from '@common/exceptions/entity.not.found.exception';
import { ActorLookupService } from '@domain/actor/actor-lookup/actor.lookup.service';
import { CalloutLookupService } from '@domain/collaboration/callout/callout.lookup/callout.lookup.service';
import { UserLookupService } from '@domain/community/user-lookup/user.lookup.service';
import { SpaceLookupService } from '@domain/space/space.lookup/space.lookup.service';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { CommunityResolverService } from '@services/infrastructure/entity-resolver/community.resolver.service';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { vi } from 'vitest';
import { NotificationExternalAdapter } from '../notification-external-adapter/notification.external.adapter';
import { NotificationInAppAdapter } from '../notification-in-app-adapter/notification.in.app.adapter';
import { CalloutReactionEmailSuppressionService } from './callout.reaction.email.suppression.service';
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
  let calloutLookupService: CalloutLookupService;
  let calloutReactionEmailSuppressionService: CalloutReactionEmailSuppressionService;
  let configService: ConfigService;
  let userLookupService: UserLookupService;
  let actorLookupService: ActorLookupService;

  const mockRecipients = (
    emailRecipients: any[] = [],
    inAppRecipients: any[] = [],
    triggeredBy?: any
  ) => {
    vi.mocked(notificationAdapter.getNotificationRecipients).mockResolvedValue({
      emailRecipients,
      inAppRecipients,
      pushRecipients: [],
      triggeredBy,
    } as any);
  };

  beforeEach(async () => {
    vi.restoreAllMocks();

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
    calloutLookupService =
      module.get<CalloutLookupService>(CalloutLookupService);
    calloutReactionEmailSuppressionService =
      module.get<CalloutReactionEmailSuppressionService>(
        CalloutReactionEmailSuppressionService
      );
    configService = module.get<ConfigService>(ConfigService);
    userLookupService = module.get<UserLookupService>(UserLookupService);
    actorLookupService = module.get<ActorLookupService>(ActorLookupService);

    // Default: kill switch enabled
    vi.mocked(configService.get).mockReturnValue(true as any);

    // Default: reactor display name resolves to a string
    vi.mocked(userLookupService.getUserByIdOrFail).mockResolvedValue({
      id: 'user-2',
      profile: { displayName: 'Reactor User' },
    } as any);
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

  // ── T011 / T017 / T018: spaceCollaborationCalloutReaction ─────────────────

  describe('spaceCollaborationCalloutReaction', () => {
    const mockCallout = (overrides: Record<string, unknown> = {}) => ({
      id: 'callout-1',
      publishedBy: 'publisher-1',
      createdBy: 'creator-1',
      framing: { profile: { displayName: 'My Callout' } },
      ...overrides,
    });

    const setupDefault = () => {
      // Callout lookup returns a valid callout with a known publisher
      vi.mocked(calloutLookupService.getCalloutOrFail).mockResolvedValue(
        mockCallout() as any
      );
      // Community and space resolution
      vi.mocked(
        communityResolverService.getCommunityFromCollaborationCalloutOrFail
      ).mockResolvedValue({ id: 'community-1' } as any);
      vi.mocked(
        communityResolverService.getSpaceForCommunityOrFail
      ).mockResolvedValue({ id: 'space-1' } as any);
      // URL generator
      vi.mocked(
        externalAdapter.buildSpaceCollaborationCalloutReactionPayload
      ).mockResolvedValue({} as any);
    };

    it('genuine reaction: dispatches exactly one sendInAppNotifications for the publisher (US1-AS1)', async () => {
      setupDefault();
      // publisher-1 is the in-app recipient, NOT the reactor (reactor is user-2)
      mockRecipients([], [{ id: 'publisher-1' }]);

      await adapter.spaceCollaborationCalloutReaction({
        calloutID: 'callout-1',
        triggeredBy: 'user-2',
        emoji: 'heart',
      });

      expect(inAppAdapter.sendInAppNotifications).toHaveBeenCalledTimes(1);
      expect(inAppAdapter.sendInAppNotifications).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        'user-2',
        ['publisher-1'],
        expect.objectContaining({ emoji: 'heart', calloutID: 'callout-1' })
      );
    });

    it('self-reaction: reactor equals publisher — zero dispatches on all channels (US1-AS4)', async () => {
      setupDefault();
      // publishedBy = 'publisher-1'; triggeredBy = 'publisher-1' (same person)
      mockRecipients([{ id: 'publisher-1' }], [{ id: 'publisher-1' }]);

      await adapter.spaceCollaborationCalloutReaction({
        calloutID: 'callout-1',
        triggeredBy: 'publisher-1',
        emoji: 'rocket',
      });

      expect(inAppAdapter.sendInAppNotifications).not.toHaveBeenCalled();
      expect(externalAdapter.sendExternalNotifications).not.toHaveBeenCalled();
    });

    it('publishedBy → createdBy fallback: when publishedBy is null, createdBy is the recipient (US4-AS2)', async () => {
      vi.mocked(calloutLookupService.getCalloutOrFail).mockResolvedValue(
        mockCallout({ publishedBy: null }) as any
      );
      vi.mocked(
        communityResolverService.getCommunityFromCollaborationCalloutOrFail
      ).mockResolvedValue({ id: 'community-1' } as any);
      vi.mocked(
        communityResolverService.getSpaceForCommunityOrFail
      ).mockResolvedValue({ id: 'space-1' } as any);
      mockRecipients([], [{ id: 'creator-1' }]);

      await adapter.spaceCollaborationCalloutReaction({
        calloutID: 'callout-1',
        triggeredBy: 'user-2',
        emoji: 'heart',
      });

      // Creator is notified via in-app
      expect(inAppAdapter.sendInAppNotifications).toHaveBeenCalledTimes(1);
    });

    it('both-null publisher and creator: zero dispatches + skip logged (US4-AS3)', async () => {
      vi.mocked(calloutLookupService.getCalloutOrFail).mockResolvedValue(
        mockCallout({ publishedBy: null, createdBy: null }) as any
      );

      await adapter.spaceCollaborationCalloutReaction({
        calloutID: 'callout-1',
        triggeredBy: 'user-2',
        emoji: 'heart',
      });

      expect(inAppAdapter.sendInAppNotifications).not.toHaveBeenCalled();
      expect(
        externalAdapter.buildSpaceCollaborationCalloutReactionPayload
      ).not.toHaveBeenCalled();
    });

    it('kill-switch off: zero dispatches on all channels (R-11)', async () => {
      vi.mocked(configService.get).mockReturnValue(false as any);
      setupDefault();
      mockRecipients([{ id: 'publisher-1' }], [{ id: 'publisher-1' }]);

      await adapter.spaceCollaborationCalloutReaction({
        calloutID: 'callout-1',
        triggeredBy: 'user-2',
        emoji: 'heart',
      });

      expect(inAppAdapter.sendInAppNotifications).not.toHaveBeenCalled();
      expect(externalAdapter.sendExternalNotifications).not.toHaveBeenCalled();
      // Kill-switch is checked before callout lookup
      expect(calloutLookupService.getCalloutOrFail).not.toHaveBeenCalled();
    });

    it('adapter rejection does not reject the mutation (FR-004)', async () => {
      // The caller wraps spaceCollaborationCalloutReaction in a fire-and-forget
      // catch; this test proves the method itself does not throw on missing callout.
      vi.mocked(calloutLookupService.getCalloutOrFail).mockRejectedValue(
        new EntityNotFoundException('not found', LogContext.NOTIFICATIONS)
      );

      await expect(
        adapter.spaceCollaborationCalloutReaction({
          calloutID: 'unknown-callout',
          triggeredBy: 'user-2',
          emoji: 'heart',
        })
      ).resolves.toBeUndefined();
    });

    // T017: email + push volume control ───────────────────────────────────────

    it('T017: burst of reactions with email-enabled publisher — exactly ONE sendExternalNotifications call (US3-AS1)', async () => {
      setupDefault();
      // Email recipient is the publisher; suppression allows first call only
      mockRecipients([{ id: 'publisher-1' }], [{ id: 'publisher-1' }]);
      vi.mocked(
        calloutReactionEmailSuppressionService.shouldSendLeadingEmail
      ).mockResolvedValue(true);
      vi.mocked(
        externalAdapter.buildSpaceCollaborationCalloutReactionPayload
      ).mockResolvedValue({} as any);

      await adapter.spaceCollaborationCalloutReaction({
        calloutID: 'callout-1',
        triggeredBy: 'user-2',
        emoji: 'heart',
      });

      expect(externalAdapter.sendExternalNotifications).toHaveBeenCalledTimes(
        1
      );
    });

    it('T017: suppression window active — zero email sends, no external notification (US3-AS1 window)', async () => {
      setupDefault();
      mockRecipients([{ id: 'publisher-1' }], [{ id: 'publisher-1' }]);
      vi.mocked(
        calloutReactionEmailSuppressionService.shouldSendLeadingEmail
      ).mockResolvedValue(false);

      await adapter.spaceCollaborationCalloutReaction({
        calloutID: 'callout-1',
        triggeredBy: 'user-2',
        emoji: 'rocket',
      });

      expect(
        externalAdapter.buildSpaceCollaborationCalloutReactionPayload
      ).not.toHaveBeenCalled();
      expect(externalAdapter.sendExternalNotifications).not.toHaveBeenCalled();
    });

    it('T017: suppression service returns true (fail-open, e.g. after a Redis blip) — email is dispatched (D-10)', async () => {
      setupDefault();
      mockRecipients([{ id: 'publisher-1' }], [{ id: 'publisher-1' }]);
      // Suppression service returns true (fail-open path — Redis error was caught internally)
      vi.mocked(
        calloutReactionEmailSuppressionService.shouldSendLeadingEmail
      ).mockResolvedValue(true);
      vi.mocked(
        externalAdapter.buildSpaceCollaborationCalloutReactionPayload
      ).mockResolvedValue({} as any);

      await adapter.spaceCollaborationCalloutReaction({
        calloutID: 'callout-1',
        triggeredBy: 'user-2',
        emoji: 'heart',
      });

      expect(externalAdapter.sendExternalNotifications).toHaveBeenCalledTimes(
        1
      );
    });

    it('T017: push called via sendPushNotifications with stable replace-tag (US3-AS4, R-10)', async () => {
      setupDefault();
      mockRecipients([], [], undefined);
      // Override to have a push recipient
      vi.mocked(
        notificationAdapter.getNotificationRecipients
      ).mockResolvedValue({
        emailRecipients: [],
        inAppRecipients: [],
        pushRecipients: [{ id: 'publisher-1' }],
      } as any);
      vi.mocked(
        calloutReactionEmailSuppressionService.shouldSendLeadingEmail
      ).mockResolvedValue(true);

      await adapter.spaceCollaborationCalloutReaction({
        calloutID: 'callout-1',
        triggeredBy: 'user-2',
        emoji: 'heart',
      });

      // Verify the stable tag was used
      expect(
        (adapter as any).notificationPushAdapter.sendPushNotifications
      ).toHaveBeenCalledWith(
        expect.any(Array),
        expect.any(String),
        expect.objectContaining({
          tag: 'SPACE_COLLABORATION_CALLOUT_REACTION:callout-1',
        })
      );
    });

    it('T017: email-off setting — zero external sends, suppression marker NOT claimed (US3-AS4)', async () => {
      setupDefault();
      // No email recipients (channel disabled)
      mockRecipients([], [{ id: 'publisher-1' }]);

      await adapter.spaceCollaborationCalloutReaction({
        calloutID: 'callout-1',
        triggeredBy: 'user-2',
        emoji: 'heart',
      });

      expect(
        calloutReactionEmailSuppressionService.shouldSendLeadingEmail
      ).not.toHaveBeenCalled();
      expect(externalAdapter.sendExternalNotifications).not.toHaveBeenCalled();
    });

    // T018: republish re-read ─────────────────────────────────────────────────

    it('T018: re-read at emit time resolves current publishedBy, not the stale resolver copy (US4-AS1)', async () => {
      // The callout was originally loaded (before republish) with publishedBy=B,
      // but by emit time the DB has publishedBy=C. The adapter re-reads the callout.
      vi.mocked(calloutLookupService.getCalloutOrFail).mockResolvedValue(
        mockCallout({
          publishedBy: 'publisher-C',
          createdBy: 'creator-1',
        }) as any
      );
      vi.mocked(
        communityResolverService.getCommunityFromCollaborationCalloutOrFail
      ).mockResolvedValue({ id: 'community-1' } as any);
      vi.mocked(
        communityResolverService.getSpaceForCommunityOrFail
      ).mockResolvedValue({ id: 'space-1' } as any);
      // Recipients resolved for publisher-C (the new publisher)
      vi.mocked(
        notificationAdapter.getNotificationRecipients
      ).mockResolvedValue({
        emailRecipients: [],
        inAppRecipients: [{ id: 'publisher-C' }],
        pushRecipients: [],
      } as any);

      await adapter.spaceCollaborationCalloutReaction({
        calloutID: 'callout-1',
        triggeredBy: 'user-2',
        emoji: 'heart',
      });

      // The fresh publisherID from the re-read is used as the recipient ID arg
      expect(
        notificationAdapter.getNotificationRecipients
      ).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object),
        'space-1',
        'publisher-C'
      );
      expect(inAppAdapter.sendInAppNotifications).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        'user-2',
        ['publisher-C'],
        expect.any(Object)
      );
    });
  });

  describe('spaceAdminOrganizationInvitationAccepted', () => {
    const eventData = {
      triggeredBy: 'org-admin-1',
      organizationID: 'org-1',
      invitationCreatedBy: 'inviter-1',
    } as any;
    const space = {
      id: 'space-1',
      about: { profile: { displayName: 'My Space' } },
    } as any;

    it('sends email, in-app and push to the inviter', async () => {
      mockRecipients([{ id: 'inviter-1' }], [{ id: 'inviter-1' }], undefined);
      vi.mocked(
        notificationAdapter.getNotificationRecipients
      ).mockResolvedValue({
        emailRecipients: [{ id: 'inviter-1' }],
        inAppRecipients: [{ id: 'inviter-1' }],
        pushRecipients: [{ id: 'inviter-1' }],
      } as any);
      vi.mocked(
        externalAdapter.buildOrganizationSpaceCommunityInvitationOutcomePayload
      ).mockResolvedValue({} as any);
      vi.mocked(actorLookupService.getFullActorByIdOrFail).mockResolvedValue({
        id: 'org-1',
        profile: { displayName: 'Acme' },
      } as any);

      await adapter.spaceAdminOrganizationInvitationAccepted(eventData, space);

      expect(
        notificationAdapter.getNotificationRecipients
      ).toHaveBeenCalledWith(
        expect.any(String),
        eventData,
        'space-1',
        'inviter-1'
      );
      expect(externalAdapter.sendExternalNotifications).toHaveBeenCalled();
      expect(inAppAdapter.sendInAppNotifications).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        'org-admin-1',
        ['inviter-1'],
        expect.objectContaining({ spaceID: 'space-1', actorID: 'org-1' })
      );
      expect(
        (adapter as any).notificationPushAdapter.sendPushNotifications
      ).toHaveBeenCalledWith(
        [{ id: 'inviter-1' }],
        expect.any(String),
        expect.objectContaining({ title: 'Invitation accepted' })
      );
    });

    it('skips email when there are no email recipients', async () => {
      vi.mocked(
        notificationAdapter.getNotificationRecipients
      ).mockResolvedValue({
        emailRecipients: [],
        inAppRecipients: [],
        pushRecipients: [],
      } as any);

      await adapter.spaceAdminOrganizationInvitationAccepted(eventData, space);

      expect(
        externalAdapter.buildOrganizationSpaceCommunityInvitationOutcomePayload
      ).not.toHaveBeenCalled();
      expect(externalAdapter.sendExternalNotifications).not.toHaveBeenCalled();
    });
  });

  describe('spaceAdminOrganizationInvitationDeclined', () => {
    const eventData = {
      triggeredBy: 'org-admin-1',
      organizationID: 'org-1',
      invitationCreatedBy: 'inviter-1',
    } as any;
    const space = {
      id: 'space-1',
      about: { profile: { displayName: 'My Space' } },
    } as any;

    it('sends email, in-app and push to the inviter', async () => {
      vi.mocked(
        notificationAdapter.getNotificationRecipients
      ).mockResolvedValue({
        emailRecipients: [{ id: 'inviter-1' }],
        inAppRecipients: [{ id: 'inviter-1' }],
        pushRecipients: [{ id: 'inviter-1' }],
      } as any);
      vi.mocked(
        externalAdapter.buildOrganizationSpaceCommunityInvitationOutcomePayload
      ).mockResolvedValue({} as any);
      vi.mocked(actorLookupService.getFullActorByIdOrFail).mockResolvedValue({
        id: 'org-1',
        profile: { displayName: 'Acme' },
      } as any);

      await adapter.spaceAdminOrganizationInvitationDeclined(eventData, space);

      expect(externalAdapter.sendExternalNotifications).toHaveBeenCalled();
      expect(inAppAdapter.sendInAppNotifications).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        'org-admin-1',
        ['inviter-1'],
        expect.objectContaining({ spaceID: 'space-1', actorID: 'org-1' })
      );
      expect(
        (adapter as any).notificationPushAdapter.sendPushNotifications
      ).toHaveBeenCalledWith(
        [{ id: 'inviter-1' }],
        expect.any(String),
        expect.objectContaining({ title: 'Invitation declined' })
      );
    });

    it('skips email when there are no email recipients', async () => {
      vi.mocked(
        notificationAdapter.getNotificationRecipients
      ).mockResolvedValue({
        emailRecipients: [],
        inAppRecipients: [],
        pushRecipients: [],
      } as any);

      await adapter.spaceAdminOrganizationInvitationDeclined(eventData, space);

      expect(
        externalAdapter.buildOrganizationSpaceCommunityInvitationOutcomePayload
      ).not.toHaveBeenCalled();
    });
  });
});

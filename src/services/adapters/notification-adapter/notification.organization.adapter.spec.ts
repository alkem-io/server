import { CommunityMembershipOrigin } from '@common/enums/community.membership.origin';
import { NotificationEvent } from '@common/enums/notification.event';
import { RoleSetService } from '@domain/access/role-set/role.set.service';
import { ActorLookupService } from '@domain/actor/actor-lookup/actor.lookup.service';
import { MessageDetailsService } from '@domain/communication/message.details/message.details.service';
import { SpaceLookupService } from '@domain/space/space.lookup/space.lookup.service';
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
  let spaceLookupService: SpaceLookupService;

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
    spaceLookupService = module.get<SpaceLookupService>(SpaceLookupService);
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

  // These two flows are PRE-EXISTING and have nothing to do with feature 061.
  // They are asserted here because 061 deleted their push self-exclusion while
  // applying R34 (which is about the INVITATION dispatch only) and nothing
  // caught it: an organization admin who mentioned their own organization, or
  // sent it a message, started getting a push about their own action. R34's
  // "an invitation is a call to action" reasoning does not transfer to an FYI.
  describe('pre-existing flows keep excluding the actor from push (regression guard)', () => {
    const mockRecipientsWithPush = (ids: string[]) =>
      vi
        .mocked(notificationAdapter.getNotificationRecipients)
        .mockResolvedValue({
          emailRecipients: [],
          inAppRecipients: [],
          pushRecipients: ids.map(id => ({ id })),
        } as any);

    it('organizationMention: the actor who mentioned the organization gets no push', async () => {
      mockRecipientsWithPush(['mentioner-1', 'other-admin']);

      await adapter.organizationMention({
        triggeredBy: 'mentioner-1',
        organizationID: 'org-1',
        roomID: 'room-1',
        messageID: 'msg-1',
      } as any);

      expect(pushAdapter.sendPushNotifications).toHaveBeenCalledWith(
        [{ id: 'other-admin' }],
        NotificationEvent.ORGANIZATION_ADMIN_MENTIONED,
        expect.anything()
      );
    });

    it('organizationMention: sends no push at all when the actor is the only recipient', async () => {
      mockRecipientsWithPush(['mentioner-1']);

      await adapter.organizationMention({
        triggeredBy: 'mentioner-1',
        organizationID: 'org-1',
        roomID: 'room-1',
        messageID: 'msg-1',
      } as any);

      expect(pushAdapter.sendPushNotifications).not.toHaveBeenCalledWith(
        expect.anything(),
        NotificationEvent.ORGANIZATION_ADMIN_MENTIONED,
        expect.anything()
      );
    });

    it('organizationSendMessage: the sender gets no admin push (they get the sender event instead)', async () => {
      mockRecipientsWithPush(['sender-1', 'other-admin']);

      await adapter.organizationSendMessage({
        triggeredBy: 'sender-1',
        organizationID: 'org-1',
        message: 'hello',
      } as any);

      expect(pushAdapter.sendPushNotifications).toHaveBeenCalledWith(
        [{ id: 'other-admin' }],
        NotificationEvent.ORGANIZATION_ADMIN_MESSAGE,
        expect.anything()
      );
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

    it('does NOT filter the inviting admin out of push — an invitation is a call to action', async () => {
      // The Space admin who sent the invitation may also be the invited
      // organization's ONLY admin, in which case they are the one person who
      // can answer it. Filtering them from push alone was the exact
      // per-channel split R33 exists to eliminate, and filtering them from
      // all three would let the invitation rot unanswered.
      setUpCommonMocks();
      vi.mocked(
        notificationAdapter.getNotificationRecipients
      ).mockResolvedValue({
        emailRecipients: [{ id: 'inviter-1' }],
        inAppRecipients: [{ id: 'inviter-1' }],
        pushRecipients: [{ id: 'inviter-1' }],
      } as any);
      vi.mocked(
        externalAdapter.buildOrganizationSpaceCommunityInvitationPayload
      ).mockResolvedValue({} as any);
      vi.mocked(actorLookupService.getFullActorByIdOrFail).mockResolvedValue({
        id: 'org-1',
        nameID: 'acme',
        profile: { displayName: 'Acme' },
      } as any);

      await adapter.organizationSpaceCommunityInvitationCreated(
        baseEventData as any
      );

      expect(externalAdapter.sendExternalNotifications).toHaveBeenCalled();
      expect(inAppAdapter.sendInAppNotifications).toHaveBeenCalledWith(
        NotificationEvent.ORGANIZATION_ADMIN_SPACE_COMMUNITY_INVITATION,
        expect.anything(),
        'inviter-1',
        ['inviter-1'],
        expect.anything()
      );
      expect(pushAdapter.sendPushNotifications).toHaveBeenCalledWith(
        [{ id: 'inviter-1' }],
        NotificationEvent.ORGANIZATION_ADMIN_SPACE_COMMUNITY_INVITATION,
        expect.anything()
      );
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

  describe('organizationSpaceCommunityJoined', () => {
    // The accepting admin must be excluded on EVERY channel. This is the
    // "welcome" notice whose stated purpose is that the OTHER admins learn
    // no action is needed; an admin of both the organization and the Space
    // sits on this recipient set AND on the Space-side
    // SPACE_ADMIN_ORGANIZATION_COMMUNITY_INVITATION_ACCEPTED set, so leaving
    // them in produced the double notification the product brief ruled out
    // ("one for X accepted, immediately followed by X joined"). Push was
    // already filtered; email and in-app were not.
    const eventData = {
      triggeredBy: 'acceptor-1',
      organizationID: 'org-1',
      spaceID: 'space-1',
    } as any;

    beforeEach(() => {
      vi.mocked(spaceLookupService.getSpaceOrFail).mockResolvedValue({
        id: 'space-1',
        about: { profile: { displayName: 'My Space' } },
      } as any);
      vi.mocked(actorLookupService.getFullActorByIdOrFail).mockResolvedValue({
        id: 'org-1',
        nameID: 'acme',
        profile: { displayName: 'Acme' },
      } as any);
      vi.mocked(
        externalAdapter.buildActorSpaceCommunityInvitationOutcomePayload
      ).mockResolvedValue({} as any);
    });

    // The welcome resolves TWO recipient sets: its own (organization admins)
    // and the Space-side outcome's (Space admins), which it subtracts.
    const mockRecipients = (
      orgAdmins: string[],
      spaceAdmins: string[] = []
    ) => {
      vi.mocked(
        notificationAdapter.getNotificationRecipients
      ).mockImplementation(async (event: any) => {
        const ids =
          event ===
          NotificationEvent.SPACE_ADMIN_ORGANIZATION_COMMUNITY_INVITATION_ACCEPTED
            ? spaceAdmins
            : orgAdmins;
        const list = ids.map(id => ({ id }));
        return {
          emailRecipients: list,
          inAppRecipients: list,
          pushRecipients: list,
        } as any;
      });
    };

    it('excludes an admin of BOTH the Space and the organization — the Space-side outcome already tells them', async () => {
      // Alice admins the Space and Acme; Bob (Acme's other admin) accepts.
      // Bob is the acceptor. Alice is on BOTH sets, so without the second
      // exclusion she receives "Bob accepted the invitation of Acme" AND
      // "Acme is now a member... No further action is needed from you" for
      // one click — verbatim the pair the product brief rules out.
      mockRecipients(['acceptor-bob', 'alice', 'carol'], ['alice']);

      await adapter.organizationSpaceCommunityJoined({
        ...eventData,
        triggeredBy: 'acceptor-bob',
      });

      expect(
        externalAdapter.buildActorSpaceCommunityInvitationOutcomePayload
      ).toHaveBeenCalledWith(
        NotificationEvent.ORGANIZATION_ADMIN_SPACE_COMMUNITY_JOINED,
        'acceptor-bob',
        [{ id: 'carol' }],
        'org-1',
        expect.objectContaining({ id: 'space-1' })
      );
      expect(inAppAdapter.sendInAppNotifications).toHaveBeenCalledWith(
        NotificationEvent.ORGANIZATION_ADMIN_SPACE_COMMUNITY_JOINED,
        expect.anything(),
        'acceptor-bob',
        ['carol'],
        expect.anything()
      );
      expect(pushAdapter.sendPushNotifications).toHaveBeenCalledWith(
        [{ id: 'carol' }],
        NotificationEvent.ORGANIZATION_ADMIN_SPACE_COMMUNITY_JOINED,
        expect.anything()
      );
    });

    it('excludes the admin who accepted from email, in-app AND push', async () => {
      mockRecipients(['acceptor-1', 'other-admin']);

      await adapter.organizationSpaceCommunityJoined(eventData);

      expect(
        externalAdapter.buildActorSpaceCommunityInvitationOutcomePayload
      ).toHaveBeenCalledWith(
        NotificationEvent.ORGANIZATION_ADMIN_SPACE_COMMUNITY_JOINED,
        'acceptor-1',
        [{ id: 'other-admin' }],
        'org-1',
        expect.objectContaining({ id: 'space-1' })
      );
      expect(inAppAdapter.sendInAppNotifications).toHaveBeenCalledWith(
        NotificationEvent.ORGANIZATION_ADMIN_SPACE_COMMUNITY_JOINED,
        expect.anything(),
        'acceptor-1',
        ['other-admin'],
        expect.objectContaining({
          spaceID: 'space-1',
          actorID: 'org-1',
        })
      );
      expect(pushAdapter.sendPushNotifications).toHaveBeenCalledWith(
        [{ id: 'other-admin' }],
        NotificationEvent.ORGANIZATION_ADMIN_SPACE_COMMUNITY_JOINED,
        expect.anything()
      );
    });

    it("sends nothing at all when the acceptor is the organization's only admin", async () => {
      // The single-admin case is the whole reason the filter cannot be a
      // per-channel afterthought: there is no "other admin" to welcome, so
      // the acceptor would otherwise receive a welcome for a Space they
      // just joined by their own click.
      vi.mocked(
        notificationAdapter.getNotificationRecipients
      ).mockResolvedValue({
        emailRecipients: [{ id: 'acceptor-1' }],
        inAppRecipients: [{ id: 'acceptor-1' }],
        pushRecipients: [{ id: 'acceptor-1' }],
      } as any);

      await adapter.organizationSpaceCommunityJoined(eventData);

      expect(
        externalAdapter.buildActorSpaceCommunityInvitationOutcomePayload
      ).not.toHaveBeenCalled();
      expect(externalAdapter.sendExternalNotifications).not.toHaveBeenCalled();
      expect(inAppAdapter.sendInAppNotifications).not.toHaveBeenCalled();
      expect(pushAdapter.sendPushNotifications).not.toHaveBeenCalled();
    });
  });

  describe('organizationAdminAssociateInvitationAccepted / Declined', () => {
    // The outcome DTO (data-model.md §5) carries no welcomeMessage field at
    // all — there is nothing for the push builder to leak — so these specs
    // guard the shape (invitee excluded, no message-shaped text in the
    // title/body) rather than a message-text omission.
    const baseEventData = {
      triggeredBy: 'invitee-1',
      organizationID: 'org-1',
      invitationID: 'inv-1',
      inviteeID: 'invitee-1',
      extraRoles: [],
      extraRolesWithheld: [],
    } as any;

    const setUpCommonMocks = () => {
      vi.mocked(actorLookupService.getFullActorByIdOrFail).mockImplementation(
        async (id: string) => {
          if (id === 'invitee-1') {
            return { id, profile: { displayName: 'Jamie' } } as any;
          }
          return {
            id,
            nameID: 'acme',
            profile: { displayName: 'Acme' },
          } as any;
        }
      );
      vi.mocked(
        urlGeneratorService.getOrganizationSettingsAssociatesUrlPath
      ).mockReturnValue('/organization/acme/settings/community');
      vi.mocked(
        externalAdapter.buildOrganizationAssociateActorPayload
      ).mockResolvedValue({} as any);
    };

    it.each([
      ['organizationAdminAssociateInvitationAccepted' as const, 'accepted'],
      ['organizationAdminAssociateInvitationDeclined' as const, 'declined'],
    ])('%s: excludes the invitee and sends push to the other admins', async (method, outcome) => {
      setUpCommonMocks();
      vi.mocked(
        notificationAdapter.getNotificationRecipients
      ).mockResolvedValue({
        emailRecipients: [{ id: 'invitee-1' }, { id: 'other-admin' }],
        inAppRecipients: [{ id: 'invitee-1' }, { id: 'other-admin' }],
        pushRecipients: [{ id: 'invitee-1' }, { id: 'other-admin' }],
      } as any);

      await adapter[method](baseEventData);

      expect(pushAdapter.sendPushNotifications).toHaveBeenCalledWith(
        [{ id: 'other-admin' }],
        expect.any(String),
        expect.objectContaining({
          title: expect.stringContaining(outcome),
        })
      );
    });

    it('sends nothing when the invitee is the only admin', async () => {
      setUpCommonMocks();
      vi.mocked(
        notificationAdapter.getNotificationRecipients
      ).mockResolvedValue({
        emailRecipients: [{ id: 'invitee-1' }],
        inAppRecipients: [{ id: 'invitee-1' }],
        pushRecipients: [{ id: 'invitee-1' }],
      } as any);

      await adapter.organizationAdminAssociateInvitationAccepted(baseEventData);

      expect(pushAdapter.sendPushNotifications).not.toHaveBeenCalled();
      expect(externalAdapter.sendExternalNotifications).not.toHaveBeenCalled();
      expect(inAppAdapter.sendInAppNotifications).not.toHaveBeenCalled();
    });
  });

  describe('organizationAdminAssociateApplicationCreated', () => {
    const eventData = {
      triggeredBy: 'applicant-1',
      organizationID: 'org-1',
      applicationID: 'app-1',
      applicantID: 'applicant-1',
      applicationMessage: 'Please let me in — my confidential reason.',
      organizationHasNoAdministrators: false,
    } as any;

    const setUpCommonMocks = () => {
      vi.mocked(actorLookupService.getFullActorByIdOrFail).mockImplementation(
        async (id: string) => {
          if (id === 'applicant-1') {
            return { id, profile: { displayName: 'Jordan' } } as any;
          }
          return {
            id,
            nameID: 'acme',
            profile: { displayName: 'Acme' },
          } as any;
        }
      );
      vi.mocked(
        urlGeneratorService.getOrganizationSettingsAssociatesUrlPath
      ).mockReturnValue('/organization/acme/settings/community');
      vi.mocked(
        externalAdapter.buildOrganizationAssociateActorPayload
      ).mockResolvedValue({} as any);
    };

    it('push title/body never carry the application message text', async () => {
      setUpCommonMocks();
      vi.mocked(
        notificationAdapter.getNotificationRecipients
      ).mockResolvedValue({
        emailRecipients: [],
        inAppRecipients: [],
        pushRecipients: [{ id: 'admin-1' }],
      } as any);

      await adapter.organizationAdminAssociateApplicationCreated(eventData);

      const pushCall = vi.mocked(pushAdapter.sendPushNotifications).mock
        .calls[0];
      expect(pushCall[2].title).not.toContain('confidential reason');
      expect(pushCall[2].body).not.toContain('confidential reason');
    });

    it('excludes the applicant from push recipients', async () => {
      setUpCommonMocks();
      vi.mocked(
        notificationAdapter.getNotificationRecipients
      ).mockResolvedValue({
        emailRecipients: [],
        inAppRecipients: [],
        pushRecipients: [{ id: 'applicant-1' }],
      } as any);

      await adapter.organizationAdminAssociateApplicationCreated(eventData);

      expect(pushAdapter.sendPushNotifications).not.toHaveBeenCalled();
    });

    it('zero-admin escalation sends no push at all', async () => {
      setUpCommonMocks();
      vi.mocked(configService.get).mockReturnValue('support@alkem.io');
      vi.mocked(
        externalAdapter.buildOrganizationAssociateActorPayload
      ).mockResolvedValue({ recipientEmail: 'support@alkem.io' } as any);

      await adapter.organizationAdminAssociateApplicationCreated({
        ...eventData,
        organizationHasNoAdministrators: true,
      });

      expect(pushAdapter.sendPushNotifications).not.toHaveBeenCalled();
      expect(inAppAdapter.sendInAppNotifications).not.toHaveBeenCalled();
      expect(externalAdapter.sendExternalNotifications).toHaveBeenCalledTimes(
        1
      );
    });
  });

  describe('organizationAdminAssociateJoined', () => {
    // The joined DTO (data-model.md §5) carries no message field either —
    // these specs guard the suppress-on-non-DIRECT rule and the
    // triggeredBy+associateID exclusion that make the push safe to send.
    const eventData = {
      triggeredBy: 'admin-1',
      organizationID: 'org-1',
      associateID: 'associate-1',
      membershipOrigin: CommunityMembershipOrigin.DIRECT,
    } as any;

    const setUpCommonMocks = () => {
      vi.mocked(actorLookupService.getFullActorByIdOrFail).mockImplementation(
        async (id: string) => {
          if (id === 'associate-1') {
            return { id, profile: { displayName: 'Riley' } } as any;
          }
          return {
            id,
            nameID: 'acme',
            profile: { displayName: 'Acme' },
          } as any;
        }
      );
      vi.mocked(
        urlGeneratorService.getOrganizationSettingsAssociatesUrlPath
      ).mockReturnValue('/organization/acme/settings/community');
      vi.mocked(
        externalAdapter.buildOrganizationAssociateActorPayload
      ).mockResolvedValue({} as any);
    };

    it('excludes both the triggering admin and the new associate from push', async () => {
      setUpCommonMocks();
      vi.mocked(
        notificationAdapter.getNotificationRecipients
      ).mockResolvedValue({
        emailRecipients: [
          { id: 'admin-1' },
          { id: 'associate-1' },
          { id: 'other-admin' },
        ],
        inAppRecipients: [
          { id: 'admin-1' },
          { id: 'associate-1' },
          { id: 'other-admin' },
        ],
        pushRecipients: [
          { id: 'admin-1' },
          { id: 'associate-1' },
          { id: 'other-admin' },
        ],
      } as any);

      await adapter.organizationAdminAssociateJoined(eventData);

      expect(pushAdapter.sendPushNotifications).toHaveBeenCalledWith(
        [{ id: 'other-admin' }],
        expect.any(String),
        expect.anything()
      );
    });

    it('is suppressed entirely when membershipOrigin is not DIRECT', async () => {
      await adapter.organizationAdminAssociateJoined({
        ...eventData,
        membershipOrigin: CommunityMembershipOrigin.INVITATION,
      });

      expect(
        notificationAdapter.getNotificationRecipients
      ).not.toHaveBeenCalled();
      expect(pushAdapter.sendPushNotifications).not.toHaveBeenCalled();
      expect(externalAdapter.sendExternalNotifications).not.toHaveBeenCalled();
      expect(inAppAdapter.sendInAppNotifications).not.toHaveBeenCalled();
    });
  });
});
